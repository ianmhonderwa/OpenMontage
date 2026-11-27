"""Principal authentication (API keys) and OAuth 2.0 state/PKCE handling."""

from __future__ import annotations

import base64
import hashlib
import secrets
from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from opensocial.core.database import ApiKey, OAuthState, Platform, User, as_utc, utcnow
from opensocial.core.exceptions import AuthenticationError, ValidationFailed
from opensocial.core.permissions import Principal
from opensocial.core.security import TokenCipher, generate_api_key, hash_secret

ROLES = {"agent": "osagent", "owner": "osowner"}


def create_user(session: Session, email: str, display_name: str = "", *, is_admin: bool = False) -> User:
    email = email.strip().lower()
    if "@" not in email or len(email) > 320:
        raise ValidationFailed("A valid e-mail address is required.")
    if session.scalar(select(User).where(User.email == email)) is not None:
        raise ValidationFailed("A user with that e-mail already exists.")
    user = User(email=email, display_name=display_name or email, is_admin=is_admin)
    session.add(user)
    session.flush()
    return user


def issue_api_key(session: Session, user: User, role: str, label: str = "") -> str:
    """Create a key and return the plaintext once. Only its hash is stored."""
    if role not in ROLES:
        raise ValidationFailed("Role must be 'agent' or 'owner'.")
    plaintext = generate_api_key(ROLES[role])
    session.add(ApiKey(user_id=user.id, role=role, key_hash=hash_secret(plaintext), label=label))
    session.flush()
    return plaintext


def authenticate(session: Session, api_key: str | None) -> Principal:
    if not api_key:
        raise AuthenticationError("An API key is required.")
    row = session.scalar(select(ApiKey).where(ApiKey.key_hash == hash_secret(api_key.strip())))
    if row is None or row.revoked:
        raise AuthenticationError("Invalid or revoked API key.")
    user = session.get(User, row.user_id)
    if user is None:
        raise AuthenticationError("Invalid or revoked API key.")
    row.last_used_at = utcnow()
    return Principal(user_id=user.id, role=row.role, key_id=row.id)


def revoke_api_key(session: Session, principal: Principal, key_id: str) -> None:
    row = session.scalar(select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == principal.user_id))
    if row is None:
        raise ValidationFailed("Key not found.")
    row.revoked = True


# --------------------------------------------------------------------------------------
# OAuth 2.0 state + PKCE (RFC 7636)
# --------------------------------------------------------------------------------------


@dataclass
class PendingAuth:
    state: str
    code_verifier: str | None
    code_challenge: str | None


def _pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)[:96]
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def begin_oauth(
    session: Session,
    cipher: TokenCipher,
    *,
    user_id: str,
    platform: Platform,
    scopes: list[str],
    use_pkce: bool,
    ttl_minutes: int,
    flow: str = "oauth2",
) -> PendingAuth:
    state = secrets.token_urlsafe(32)
    verifier, challenge = _pkce_pair() if use_pkce else (None, None)
    session.add(
        OAuthState(
            state_hash=hash_secret(state),
            user_id=user_id,
            platform=platform,
            code_verifier_enc=cipher.encrypt(verifier) if verifier else None,
            scopes=scopes,
            flow=flow,
            expires_at=utcnow() + timedelta(minutes=ttl_minutes),
        )
    )
    session.flush()
    return PendingAuth(state=state, code_verifier=verifier, code_challenge=challenge)


def complete_oauth(
    session: Session, cipher: TokenCipher, *, platform: Platform, state: str | None
) -> tuple[OAuthState, str | None]:
    """Validate the callback state: it must exist, match the platform, be unexpired and
    unused. It is consumed immediately (single use) to prevent replay."""
    if not state:
        raise AuthenticationError("OAuth callback is missing the state parameter.")
    row = session.get(OAuthState, hash_secret(state))
    if row is None or row.platform != platform:
        raise AuthenticationError("Invalid OAuth state. Start the connection again.")
    if row.used:
        raise AuthenticationError("This OAuth state has already been used.")
    expires = as_utc(row.expires_at)
    if expires is None or expires <= utcnow():
        raise AuthenticationError("The OAuth connection attempt expired. Start again.")
    row.used = True
    verifier = cipher.decrypt(row.code_verifier_enc) if row.code_verifier_enc else None
    session.flush()
    return row, verifier
