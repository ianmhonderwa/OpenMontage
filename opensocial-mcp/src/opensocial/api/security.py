"""HTTP security middleware: secure headers, request-size limits and per-client rate limits."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from opensocial.core.exceptions import RateLimitExceeded
from opensocial.core.rate_limits import RateLimiter
from opensocial.core.security import hash_secret

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy": (
        "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; "
        "form-action 'self'"
    ),
}
MAX_BODY_BYTES = 2 * 1024 * 1024


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: object, *, per_minute: int, hsts: bool) -> None:
        super().__init__(app)  # type: ignore[arg-type]
        self.limiter = RateLimiter()
        self.per_minute = per_minute
        self.hsts = hsts

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
            return JSONResponse({"error": "payload_too_large"}, status_code=413)
        credential = request.headers.get("x-api-key") or request.headers.get("authorization") or ""
        client = hash_secret(credential)[:16] if credential else (request.client.host if request.client else "anon")
        try:
            self.limiter.check(f"api:{client}", capacity=self.per_minute, per_seconds=60)
        except RateLimitExceeded as exc:
            return JSONResponse(exc.to_dict(), status_code=429, headers={"Retry-After": "60"})
        response = await call_next(request)
        for key, value in SECURITY_HEADERS.items():
            response.headers.setdefault(key, value)
        if self.hsts:
            response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
        if request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response
