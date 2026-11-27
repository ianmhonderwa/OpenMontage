"""Approval queue (owner-only decisions)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from opensocial.api.deps import owner, principal, runtime
from opensocial.core import approvals, audit
from opensocial.core.database import ApprovalStatus
from opensocial.core.permissions import Principal
from opensocial.core.runtime import Runtime
from opensocial.services import publishing_manager

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


@router.get("")
def list_approvals(
    status: ApprovalStatus | None = None, p: Principal = Depends(principal), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    with rt.db.session() as session:
        return {"approvals": [approvals.to_dict(a) for a in approvals.list_for_owner(session, p, status)]}


@router.get("/{approval_id}")
def get_approval(approval_id: str, p: Principal = Depends(principal), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    with rt.db.session() as session:
        return approvals.to_dict(approvals.get_owned(session, p, approval_id))


class Decision(BaseModel):
    note: str = Field("", max_length=2000)
    scheduled_for: datetime | None = None
    execute_now: bool = False


@router.post("/{approval_id}/approve")
async def approve(
    approval_id: str, body: Decision, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    with rt.db.session() as session:
        approval = approvals.decide(
            session, p, approval_id, approve=True, note=body.note, scheduled_for=body.scheduled_for
        )
        publishing_manager.sync_after_decision(session, approval)
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="approve",
            account_id=approval.account_id,
            platform=approval.platform,
            approval_id=approval.id,
            approval_status=approval.status.value,
            outcome="success",
        )
        result = approvals.to_dict(approval)
    if body.execute_now and not body.scheduled_for:
        result["execution"] = await publishing_manager.execute_approved(rt, p, approval_id)
    return result


@router.post("/{approval_id}/reject")
def reject(
    approval_id: str, body: Decision, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    with rt.db.session() as session:
        approval = approvals.decide(session, p, approval_id, approve=False, note=body.note)
        publishing_manager.sync_after_decision(session, approval)
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="reject",
            account_id=approval.account_id,
            platform=approval.platform,
            approval_id=approval.id,
            approval_status=approval.status.value,
            outcome="success",
        )
        return approvals.to_dict(approval)


@router.post("/{approval_id}/execute")
async def execute(approval_id: str, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    return await publishing_manager.execute_approved(rt, p, approval_id)


@router.post("/{approval_id}/cancel")
def cancel(approval_id: str, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    with rt.db.session() as session:
        approval = approvals.cancel(session, p, approval_id)
        publishing_manager.sync_after_decision(session, approval)
        return approvals.to_dict(approval)
