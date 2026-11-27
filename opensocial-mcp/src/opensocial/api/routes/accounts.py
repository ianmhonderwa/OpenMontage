"""Account management: list, connect (OAuth / WhatsApp token), disconnect, revoke, autonomy."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, SecretStr
from sqlalchemy import select

from opensocial.api.deps import owner, principal, runtime
from opensocial.core import audit
from opensocial.core.database import Account, AccountStatus, Platform
from opensocial.core.exceptions import OpenSocialError, ValidationFailed
from opensocial.core.permissions import Kind, Principal, get_owned_account
from opensocial.core.runtime import Runtime
from opensocial.integrations import oauth
from opensocial.servers.common import account_summary

router = APIRouter(prefix="/api", tags=["accounts"])


@router.get("/accounts")
def list_accounts(
    platform: Platform | None = None, p: Principal = Depends(principal), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    with rt.db.session() as session:
        stmt = select(Account).where(Account.owner_id == p.user_id)
        if platform:
            stmt = stmt.where(Account.platform == platform)
        return {"accounts": [account_summary(a) for a in session.scalars(stmt.order_by(Account.platform))]}


@router.get("/oauth/{provider}/start")
def oauth_start(
    provider: str,
    tiers: str = Query("read", description="Comma-separated permission tiers"),
    p: Principal = Depends(owner),
    rt: Runtime = Depends(runtime),
) -> dict[str, Any]:
    with rt.db.session() as session:
        return oauth.build_authorize_url(
            session,
            rt.cipher,
            rt.settings,
            user_id=p.user_id,
            provider_key=provider,
            tiers=[t.strip() for t in tiers.split(",") if t.strip()],
        )


@router.get("/oauth/{provider}/callback", response_class=HTMLResponse)
async def oauth_callback(
    provider: str,
    request: Request,
    state: str | None = None,
    code: str | None = None,
    error: str | None = None,
    rt: Runtime = Depends(runtime),
) -> HTMLResponse:
    """The single-use state value binds this callback to the owner who started it (CSRF defence)."""
    try:
        with rt.db.session() as session:
            accounts = await oauth.handle_callback(
                session,
                rt.cipher,
                rt.settings,
                provider_key=provider,
                state=state,
                code=code,
                error=error,
                transport=rt.transport_for(oauth.get_provider(provider).platform),
            )
            names = ", ".join(a.display_name for a in accounts)
        body = f"<h1>Connected</h1><p>Connected: {_esc(names)}. You can close this window.</p>"
        return HTMLResponse(body)
    except OpenSocialError as exc:
        return HTMLResponse(f"<h1>Connection failed</h1><p>{_esc(exc.message)}</p>", status_code=400)


def _esc(text: str) -> str:
    import html

    return html.escape(text)


class WhatsAppConnect(BaseModel):
    phone_number_id: str = Field(..., pattern=r"^\d{5,30}$")
    waba_id: str = Field(..., pattern=r"^\d{5,30}$")
    access_token: SecretStr
    scopes: list[str] = Field(default_factory=lambda: ["whatsapp_business_messaging", "whatsapp_business_management"])


@router.post("/accounts/whatsapp")
async def connect_whatsapp(
    body: WhatsAppConnect, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    """Register a WhatsApp Business phone number with a system-user token (Cloud API)."""
    from opensocial.integrations.whatsapp.client import WhatsAppClient

    client = WhatsAppClient(
        body.access_token.get_secret_value(),
        transport=rt.transport_for(Platform.WHATSAPP),
        version=rt.settings.meta_graph_version,
    )
    info = await client.phone_number(body.phone_number_id)
    with rt.db.session() as session:
        account = oauth.upsert_account(
            session,
            rt.cipher,
            owner_id=p.user_id,
            platform=Platform.WHATSAPP,
            discovered=oauth.DiscoveredAccount(
                external_id=body.phone_number_id,
                display_name=f"{info.get('verified_name', 'WhatsApp')} {info.get('display_phone_number', '')}".strip(),
                meta={"waba_id": body.waba_id, "quality_rating": info.get("quality_rating")},
            ),
            tokens=oauth.TokenSet(access_token=body.access_token.get_secret_value()),
            granted_scopes=body.scopes,
            auth_flow="system_user_token",
        )
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="connect",
            platform="whatsapp",
            account_id=account.id,
            outcome="success",
        )
        return {"account": account_summary(account)}


@router.post("/accounts/kindle")
def create_kindle_workflow(
    name: str = "Kindle publishing", p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    """A Kindle 'account' is a local workflow container; it holds no KDP credentials."""
    import uuid

    with rt.db.session() as session:
        account = Account(
            owner_id=p.user_id,
            platform=Platform.KINDLE,
            external_id=f"kdp-{uuid.uuid4().hex[:8]}",
            display_name=name[:200],
            auth_flow="none",
            granted_scopes=[],
        )
        session.add(account)
        session.flush()
        return {"account": account_summary(account)}


@router.post("/accounts/{account_id}/disconnect")
def disconnect(account_id: str, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    """Delete stored tokens locally. The account record and its audit history remain."""
    with rt.db.session() as session:
        account = get_owned_account(session, p, account_id)
        if account.credential is not None:
            session.delete(account.credential)
        account.status = AccountStatus.DISCONNECTED
        account.autonomy_enabled = False
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="disconnect",
            platform=account.platform.value,
            account_id=account.id,
            outcome="success",
        )
        return {"account_id": account.id, "status": account.status.value}


@router.post("/accounts/{account_id}/revoke")
async def revoke(account_id: str, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)) -> dict[str, Any]:
    """Revoke the grant at the platform where supported, then delete local tokens."""
    with rt.db.session() as session:
        account = get_owned_account(session, p, account_id)
        token = rt.cipher.decrypt(account.credential.access_token_enc) if account.credential else None
        flow = account.auth_flow
        platform = account.platform
    remote = False
    if token and flow in oauth.PROVIDERS:
        try:
            provider = oauth.get_provider(flow)
            remote = await oauth.revoke_remote(provider, token, rt.transport_for(platform), rt.settings)
        except OpenSocialError:
            remote = False
    with rt.db.session() as session:
        account = get_owned_account(session, p, account_id)
        if account.credential is not None:
            session.delete(account.credential)
        account.status = AccountStatus.REVOKED
        account.autonomy_enabled = False
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="revoke",
            platform=account.platform.value,
            account_id=account.id,
            outcome="success",
            details={"remote_revocation_confirmed": remote},
        )
    return {
        "account_id": account_id,
        "status": "revoked",
        "remote_revocation_confirmed": remote,
        "note": None if remote else "Also remove the app in the platform's own security settings to be sure.",
    }


class AutonomyUpdate(BaseModel):
    enabled: bool
    kinds: list[str] = Field(default_factory=list)
    daily_limit: int = Field(0, ge=0, le=100)


@router.patch("/accounts/{account_id}/autonomy")
def set_autonomy(
    account_id: str, body: AutonomyUpdate, p: Principal = Depends(owner), rt: Runtime = Depends(runtime)
) -> dict[str, Any]:
    allowed = {Kind.EDIT.value, Kind.PUBLISH.value, Kind.MESSAGE.value}
    if set(body.kinds) - allowed:
        raise ValidationFailed(f"Autonomy can only cover {sorted(allowed)}; deletion always needs approval.")
    if body.enabled and (not body.kinds or body.daily_limit < 1):
        raise ValidationFailed("Enabling autonomy needs at least one kind and a daily limit of 1 or more.")
    with rt.db.session() as session:
        account = get_owned_account(session, p, account_id)
        account.autonomy_enabled = body.enabled
        account.autonomous_kinds = body.kinds if body.enabled else []
        account.daily_action_limit = body.daily_limit if body.enabled else 0
        audit.record(
            session,
            user_id=p.user_id,
            actor="owner",
            tool="api",
            operation="set_autonomy",
            platform=account.platform.value,
            account_id=account.id,
            outcome="success",
            details=body.model_dump(),
        )
        return {"account": account_summary(account)}
