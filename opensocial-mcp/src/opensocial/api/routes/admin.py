"""Security centre: identity, operating mode, audit history, emergency controls, users,
WhatsApp conversation controls and Kindle human-only statuses."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select

from opensocial import __version__
from opensocial.api.deps import admin, owner, principal, runtime
from opensocial.core import audit
from opensocial.core.database import ApiKey, Conversation, Mode, User, get_controls, utcnow
from opensocial.core.exceptions import NotFound
from opensocial.core.permissions import Principal, get_owned_account
from opensocial.core.runtime import Runtime

router = APIRouter(prefix="/api", tags=["security"])


@router.get("/health")
def health(rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    from opensocial.integrations.registry import INTEGRATION_MODULES, LOAD_ERRORS

    with rt.db.session() as session:
        controls = get_controls(session)
        state = {
            "publishing_disabled": controls.publishing_disabled,
            "messaging_disabled": controls.messaging_disabled,
            "shutdown": controls.shutdown,
        }
    return {
        "status": "ok",
        "version": __version__,
        "environment": rt.environment_label,
        "integrations": {name: ("error" if name in LOAD_ERRORS else "loaded") for name in INTEGRATION_MODULES},
        "controls": state,
    }


@router.get("/me")
def me(p: Principal = Depends(principal), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    with rt.db.session() as session:
        user = session.get(User, p.user_id)
        assert user is not None
        return {
            "user_id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "mode": user.mode.value,
            "role": p.role,
            "is_admin": user.is_admin,
            "suspended": user.suspended,
        }


class ModeIn(BaseModel):
    mode: Mode


@router.put("/me/mode")
def set_mode(body: ModeIn, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    """Revoking autonomy is immediate: switching to OBSERVER blocks every agent write at once."""
    with rt.db.session() as session:
        user = session.get(User, p.user_id)
        assert user is not None
        previous, user.mode = user.mode, body.mode
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="set_mode",
            outcome="success",
            details={"from": previous.value, "to": body.mode.value},
        )
        return {"mode": user.mode.value}


@router.get("/me/keys")
def keys(p: Principal = Depends(owner), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    with rt.db.session() as session:
        rows = session.scalars(select(ApiKey).where(ApiKey.user_id == p.user_id))
        return {
            "keys": [
                {
                    "key_id": k.id,
                    "role": k.role,
                    "label": k.label,
                    "revoked": k.revoked,
                    "created_at": k.created_at.isoformat() if k.created_at else None,
                    "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                }
                for k in rows
            ]
        }


@router.post("/me/keys/{key_id}/revoke")
def revoke_key(key_id: str, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    from opensocial.core.authentication import revoke_api_key

    with rt.db.session() as session:
        revoke_api_key(session, p, key_id)
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="revoke_key",
            outcome="success",
            details={"key_id": key_id},
        )
    return {"key_id": key_id, "revoked": True}


@router.get("/audit")
def audit_log(
    limit: int = 100,
    account_id: str | None = None,
    since: datetime | None = None,
    p: Principal = Depends(owner),
    rt: Runtime = Depends(runtime),
) -> dict[str, Any]:
    with rt.db.session() as session:
        return {
            "entries": [
                audit.to_dict(e)
                for e in audit.query(session, user_id=p.user_id, limit=limit, account_id=account_id, since=since)
            ]
        }


class ControlsIn(BaseModel):
    publishing_disabled: bool | None = None
    messaging_disabled: bool | None = None
    shutdown: bool | None = None


@router.get("/controls")
def get_controls_route(p: Principal = Depends(principal), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    with rt.db.session() as session:
        c = get_controls(session)
        return {
            "publishing_disabled": c.publishing_disabled,
            "messaging_disabled": c.messaging_disabled,
            "shutdown": c.shutdown,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }


@router.post("/controls")
def set_controls(body: ControlsIn, p: Principal = Depends(admin), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    with rt.db.session() as session:
        c = get_controls(session)
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(c, field, value)
        c.updated_by, c.updated_at = p.user_id, utcnow()
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="emergency_controls",
            outcome="success",
            details=body.model_dump(exclude_none=True),
        )
        return {
            "publishing_disabled": c.publishing_disabled,
            "messaging_disabled": c.messaging_disabled,
            "shutdown": c.shutdown,
        }


class SuspendIn(BaseModel):
    suspended: bool


@router.post("/users/{user_id}/suspend")
def suspend(
    user_id: str, body: SuspendIn, p: Principal = Depends(admin), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    with rt.db.session() as session:
        user = session.get(User, user_id)
        if user is None:
            raise NotFound("User not found.")
        user.suspended = body.suspended
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="suspend_user",
            outcome="success",
            details={"target": user_id, "suspended": body.suspended},
        )
        return {"user_id": user_id, "suspended": user.suspended}


class ConversationUpdate(BaseModel):
    opted_in: bool | None = None
    resolve_escalation: bool | None = None


@router.post("/whatsapp/{account_id}/conversations/{conversation_id}")
def update_conversation(
    account_id: str,
    conversation_id: str,
    body: ConversationUpdate,
    p: Principal = Depends(owner),
    rt: Runtime = Depends(runtime),
) -> dict[str, Any]:
    """Owner records opt-in (with evidence kept by the business) or resolves an escalation."""
    with rt.db.session() as session:
        account = get_owned_account(session, p, account_id)
        conv = session.scalar(
            select(Conversation).where(Conversation.id == conversation_id, Conversation.account_id == account.id)
        )
        if conv is None:
            raise NotFound("Conversation not found.")
        if body.opted_in is not None:
            conv.opted_in = body.opted_in
        if body.resolve_escalation:
            conv.escalated, conv.escalation_reason = False, ""
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="conversation_update",
            platform="whatsapp",
            account_id=account.id,
            outcome="success",
            details=body.model_dump(),
        )
        return {"conversation_id": conv.id, "opted_in": conv.opted_in, "escalated": conv.escalated}


class KindleStatus(BaseModel):
    status: str
    note: str = ""


@router.post("/kindle/projects/{project_id}/status")
async def kindle_status(
    project_id: str, body: KindleStatus, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    return await rt.execute(
        p,
        "kindle_update_status",
        {"project_id": project_id, **body.model_dump()},
        tool="api:kindle_update_status",
        actor="owner",
    )
