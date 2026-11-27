"""Meaningful, safe-to-display exceptions.

Every exception message is written so that it can be shown to the AI client and the user
without leaking credentials. Never put a token, secret or raw provider response body
into an exception message.
"""

from __future__ import annotations

from typing import Any


class OpenSocialError(Exception):
    """Base class. ``code`` is a stable machine-readable identifier."""

    code = "opensocial_error"
    http_status = 400

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> dict[str, Any]:
        return {"error": self.code, "message": self.message, **({"details": self.details} if self.details else {})}


class ConfigurationError(OpenSocialError):
    code = "configuration_error"
    http_status = 500


class AuthenticationError(OpenSocialError):
    code = "authentication_failed"
    http_status = 401


class PermissionDenied(OpenSocialError):
    code = "permission_denied"
    http_status = 403


class NotFound(OpenSocialError):
    """Also used for resources owned by another tenant, to avoid enumeration."""

    code = "not_found"
    http_status = 404


class ValidationFailed(OpenSocialError):
    code = "validation_failed"
    http_status = 422


class ApprovalRequired(OpenSocialError):
    code = "approval_required"
    http_status = 202


class EmergencyStop(OpenSocialError):
    code = "emergency_stop_active"
    http_status = 423


class RateLimitExceeded(OpenSocialError):
    code = "rate_limited"
    http_status = 429


class UnsupportedOperation(OpenSocialError):
    """The platform's official API does not support the requested operation."""

    code = "unsupported_by_platform"
    http_status = 501


class TokenExpired(OpenSocialError):
    code = "token_expired"
    http_status = 401


class PlatformError(OpenSocialError):
    """An upstream platform API returned an error. Message is sanitised."""

    code = "platform_error"
    http_status = 502

    def __init__(
        self,
        message: str,
        *,
        platform: str,
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message, details={"platform": platform, "status_code": status_code, **(details or {})})
        self.platform = platform
        self.status_code = status_code
