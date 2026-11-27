"""FastAPI dependencies: runtime, authentication and role checks."""

from __future__ import annotations

from fastapi import Header, Request

from opensocial.core.authentication import authenticate
from opensocial.core.database import User
from opensocial.core.exceptions import AuthenticationError, PermissionDenied
from opensocial.core.permissions import Principal
from opensocial.core.runtime import Runtime


def runtime(request: Request) -> Runtime:
    return request.app.state.runtime


def _key(x_api_key: str | None, authorization: str | None) -> str | None:
    if x_api_key:
        return x_api_key
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


def principal(
    request: Request, x_api_key: str | None = Header(None), authorization: str | None = Header(None)
) -> Principal:
    rt = runtime(request)
    with rt.db.session() as session:
        return authenticate(session, _key(x_api_key, authorization))


def owner(
    request: Request, x_api_key: str | None = Header(None), authorization: str | None = Header(None)
) -> Principal:
    p = principal(request, x_api_key, authorization)
    if not p.is_owner:
        raise PermissionDenied("This endpoint requires an owner key. Agent keys cannot perform owner actions.")
    return p


def admin(
    request: Request, x_api_key: str | None = Header(None), authorization: str | None = Header(None)
) -> Principal:
    p = owner(request, x_api_key, authorization)
    rt = runtime(request)
    with rt.db.session() as session:
        user = session.get(User, p.user_id)
        if user is None or not user.is_admin:
            raise PermissionDenied("Administrator privileges are required.")
    return p


__all__ = ["AuthenticationError", "admin", "owner", "principal", "runtime"]
