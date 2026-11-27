"""OAuth 2.0 provider definitions and the account-connection flow.

Scopes are split into *read* (default) and opt-in *publish/manage* tiers so users grant
least privilege. Scope names are the providers' published scope identifiers.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from opensocial.core import audit
from opensocial.core.authentication import begin_oauth, complete_oauth
from opensocial.core.config import Settings
from opensocial.core.database import Account, AccountStatus, Credential, Platform, utcnow
from opensocial.core.exceptions import AuthenticationError, ConfigurationError, PlatformError, ValidationFailed
from opensocial.core.security import TokenCipher, redact_text


@dataclass
class TokenSet:
    access_token: str
    refresh_token: str | None = None
    expires_in: int | None = None
    scopes: list[str] = field(default_factory=list)
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class DiscoveredAccount:
    external_id: str
    display_name: str
    access_token: str | None = None  # e.g. a Facebook Page token, if different
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass
class OAuthProvider:
    key: str
    platform: Platform
    authorize_url: str
    token_url: str
    scope_tiers: dict[str, list[str]]
    client_id_setting: str
    client_secret_setting: str
    use_pkce: bool = True
    scope_separator: str = " "
    client_id_param: str = "client_id"
    extra_authorize_params: dict[str, str] = field(default_factory=dict)
    revoke_url: str | None = None
    discover: (
        Callable[[TokenSet, httpx.AsyncBaseTransport | None, Settings], Awaitable[list[DiscoveredAccount]]] | None
    ) = None
    post_exchange: Callable[[TokenSet, httpx.AsyncBaseTransport | None, Settings], Awaitable[TokenSet]] | None = None

    def scopes_for(self, tiers: list[str]) -> list[str]:
        unknown = set(tiers) - set(self.scope_tiers)
        if unknown:
            raise ValidationFailed(
                f"Unknown permission tier(s): {sorted(unknown)}. Available: {sorted(self.scope_tiers)}"
            )
        scopes: list[str] = []
        for tier in ["read", *[t for t in tiers if t != "read"]]:
            for scope in self.scope_tiers.get(tier, []):
                if scope not in scopes:
                    scopes.append(scope)
        return scopes

    def credentials(self, settings: Settings) -> tuple[str, str]:
        client_id = getattr(settings, self.client_id_setting, None)
        secret = getattr(settings, self.client_secret_setting, None)
        if settings.demo_mode:
            return client_id or "demo-client", "demo-secret"
        if not client_id or secret is None:
            raise ConfigurationError(
                f"{self.platform.value} developer credentials are not configured "
                f"(OPENSOCIAL_{self.client_id_setting.upper()} / OPENSOCIAL_{self.client_secret_setting.upper()})."
            )
        return client_id, secret.get_secret_value()


PROVIDERS: dict[str, OAuthProvider] = {}


def register_provider(provider: OAuthProvider) -> None:
    PROVIDERS[provider.key] = provider


def get_provider(key: str) -> OAuthProvider:
    import opensocial.integrations.registry  # noqa: F401  (registers providers)

    if key not in PROVIDERS:
        raise ValidationFailed(f"'{key}' is not an OAuth connection flow. Available: {sorted(PROVIDERS)}")
    return PROVIDERS[key]


def build_authorize_url(
    session: Session,
    cipher: TokenCipher,
    settings: Settings,
    *,
    user_id: str,
    provider_key: str,
    tiers: list[str],
) -> dict[str, Any]:
    provider = get_provider(provider_key)
    client_id, _ = provider.credentials(settings)
    scopes = provider.scopes_for(tiers)
    pending = begin_oauth(
        session,
        cipher,
        user_id=user_id,
        platform=provider.platform,
        scopes=scopes,
        use_pkce=provider.use_pkce,
        ttl_minutes=settings.oauth_state_ttl_minutes,
        flow=provider.key,
    )
    params = {
        provider.client_id_param: client_id,
        "redirect_uri": settings.oauth_redirect_uri(provider.key),
        "response_type": "code",
        "scope": provider.scope_separator.join(scopes),
        "state": pending.state,
        **provider.extra_authorize_params,
    }
    if pending.code_challenge:
        params["code_challenge"] = pending.code_challenge
        params["code_challenge_method"] = "S256"
    return {"authorize_url": f"{provider.authorize_url}?{urlencode(params)}", "scopes": scopes}


async def exchange_code(
    provider: OAuthProvider,
    settings: Settings,
    code: str,
    verifier: str | None,
    transport: httpx.AsyncBaseTransport | None,
) -> TokenSet:
    client_id, secret = provider.credentials(settings)
    form = {
        provider.client_id_param: client_id,
        "client_secret": secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.oauth_redirect_uri(provider.key),
    }
    if verifier:
        form["code_verifier"] = verifier
    async with httpx.AsyncClient(transport=transport, timeout=settings.http_timeout_seconds) as client:
        try:
            response = await client.post(provider.token_url, data=form)
        except httpx.HTTPError as exc:
            raise PlatformError(
                "Token exchange failed: platform unreachable.", platform=provider.platform.value
            ) from exc
    if response.status_code >= 400:
        raise AuthenticationError(
            f"{provider.platform.value} rejected the authorisation code ({response.status_code})."
        )
    body = response.json()
    if "data" in body and isinstance(body["data"], list):  # Instagram short-lived token shape
        body = body["data"][0]
    if "access_token" not in body:
        raise AuthenticationError(redact_text(f"Token exchange returned no access token: {body.get('error', '')}"))
    raw_scope = body.get("scope") or body.get("permissions") or ""
    scopes = raw_scope if isinstance(raw_scope, list) else [s for s in str(raw_scope).replace(",", " ").split() if s]
    tokens = TokenSet(
        access_token=body["access_token"],
        refresh_token=body.get("refresh_token"),
        expires_in=body.get("expires_in"),
        scopes=scopes,
        extra={k: v for k, v in body.items() if k in {"open_id", "user_id", "token_type"}},
    )
    if provider.post_exchange:
        tokens = await provider.post_exchange(tokens, transport, settings)
    return tokens


async def handle_callback(
    session: Session,
    cipher: TokenCipher,
    settings: Settings,
    *,
    provider_key: str,
    state: str | None,
    code: str | None,
    error: str | None,
    transport: httpx.AsyncBaseTransport | None,
) -> list[Account]:
    provider = get_provider(provider_key)
    platform = provider.platform
    state_row, verifier = complete_oauth(session, cipher, platform=platform, state=state)
    if state_row.flow != provider.key:
        raise AuthenticationError("Invalid OAuth state for this connection flow.")
    if error:
        audit.record(
            session,
            user_id=state_row.user_id,
            actor="owner",
            tool="oauth_callback",
            operation="connect",
            platform=platform.value,
            outcome="denied",
            failure_reason=f"Provider returned error: {error[:100]}",
        )
        raise AuthenticationError("The authorisation was declined or failed at the provider.")
    if not code:
        raise AuthenticationError("OAuth callback is missing the authorisation code.")
    tokens = await exchange_code(provider, settings, code, verifier, transport)
    granted = tokens.scopes or list(state_row.scopes)
    discovered = await provider.discover(tokens, transport, settings) if provider.discover else []
    if not discovered:
        raise ValidationFailed("No eligible accounts were found for this authorisation.")
    accounts = [
        upsert_account(
            session,
            cipher,
            owner_id=state_row.user_id,
            platform=platform,
            discovered=d,
            tokens=tokens,
            granted_scopes=granted,
            auth_flow=provider.key,
        )
        for d in discovered
    ]
    audit.record(
        session,
        user_id=state_row.user_id,
        actor="owner",
        tool="oauth_callback",
        operation="connect",
        platform=platform.value,
        outcome="success",
        details={"accounts": [a.id for a in accounts], "scopes": granted},
    )
    return accounts


def upsert_account(
    session: Session,
    cipher: TokenCipher,
    *,
    owner_id: str,
    platform: Platform,
    discovered: DiscoveredAccount,
    tokens: TokenSet,
    granted_scopes: list[str],
    auth_flow: str = "oauth2",
) -> Account:
    account = session.scalar(
        select(Account).where(
            Account.owner_id == owner_id,
            Account.platform == platform,
            Account.external_id == discovered.external_id,
        )
    )
    if account is None:
        account = Account(owner_id=owner_id, platform=platform, external_id=discovered.external_id)
        session.add(account)
    account.display_name = discovered.display_name
    account.status = AccountStatus.CONNECTED
    account.granted_scopes = granted_scopes
    account.auth_flow = auth_flow
    account.connected_at = utcnow()
    account.meta = {**(account.meta or {}), **discovered.meta}
    account.token_expires_at = utcnow() + timedelta(seconds=int(tokens.expires_in)) if tokens.expires_in else None
    access = discovered.access_token or tokens.access_token
    if account.credential is None:
        account.credential = Credential(access_token_enc=cipher.encrypt(access))
    else:
        account.credential.access_token_enc = cipher.encrypt(access)
        account.credential.updated_at = utcnow()
    account.credential.refresh_token_enc = cipher.encrypt(tokens.refresh_token) if tokens.refresh_token else None
    session.flush()
    return account


async def refresh_access_token(
    session: Session,
    cipher: TokenCipher,
    settings: Settings,
    account: Account,
    transport: httpx.AsyncBaseTransport | None,
) -> None:
    provider = get_provider(account.auth_flow or account.platform.value)
    if account.credential is None or not account.credential.refresh_token_enc:
        raise AuthenticationError("No refresh token is stored; reconnect the account.")
    client_id, secret = provider.credentials(settings)
    form = {
        provider.client_id_param: client_id,
        "client_secret": secret,
        "grant_type": "refresh_token",
        "refresh_token": cipher.decrypt(account.credential.refresh_token_enc),
    }
    async with httpx.AsyncClient(transport=transport, timeout=settings.http_timeout_seconds) as client:
        response = await client.post(provider.token_url, data=form)
    if response.status_code >= 400 or "access_token" not in response.json():
        account.status = AccountStatus.EXPIRED
        raise AuthenticationError("Token refresh failed; reconnect the account.")
    body = response.json()
    account.credential.access_token_enc = cipher.encrypt(body["access_token"])
    if body.get("refresh_token"):  # rotation: providers may issue a new refresh token
        account.credential.refresh_token_enc = cipher.encrypt(body["refresh_token"])
    account.credential.updated_at = utcnow()
    if body.get("expires_in"):
        account.token_expires_at = utcnow() + timedelta(seconds=int(body["expires_in"]))
    account.status = AccountStatus.CONNECTED


async def revoke_remote(
    provider: OAuthProvider, token: str, transport: httpx.AsyncBaseTransport | None, settings: Settings
) -> bool:
    """Best-effort revocation at the provider. Returns True when the provider confirmed."""
    if not provider.revoke_url:
        return False
    async with httpx.AsyncClient(transport=transport, timeout=settings.http_timeout_seconds) as client:
        try:
            if provider.platform == Platform.YOUTUBE:
                response = await client.post(provider.revoke_url, data={"token": token})
            elif provider.platform == Platform.TIKTOK:
                client_id, secret = provider.credentials(settings)
                response = await client.post(
                    provider.revoke_url, data={"client_key": client_id, "client_secret": secret, "token": token}
                )
            else:
                response = await client.delete(provider.revoke_url, headers={"Authorization": f"Bearer {token}"})
        except httpx.HTTPError:
            return False
    return response.status_code < 400
