"""Shared async HTTP client for official platform APIs.

* Tokens are sent in the Authorization header, never in URLs, so they cannot leak into
  access logs or exception messages.
* Error bodies are reduced to the platform's own error message and redacted.
* In demo mode an ``httpx.MockTransport`` replaces the network entirely.
"""

from __future__ import annotations

from typing import Any

import httpx

from opensocial.core.exceptions import PlatformError, RateLimitExceeded, TokenExpired
from opensocial.core.security import redact_text


class PlatformClient:
    platform = "generic"
    auth_header = "Authorization"
    auth_prefix = "Bearer "

    def __init__(
        self,
        access_token: str,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
        timeout: float = 30.0,
        account_meta: dict[str, Any] | None = None,
    ) -> None:
        self._token = access_token
        self._transport = transport
        self._timeout = timeout
        self.account_meta = account_meta or {}

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            transport=self._transport,
            timeout=self._timeout,
            follow_redirects=False,
            headers={"User-Agent": "opensocial-mcp/1.0 (+https://github.com/opensocial-mcp)"},
        )

    async def request(
        self,
        method: str,
        url: str,
        *,
        params: dict[str, Any] | None = None,
        json: Any = None,
        data: dict[str, Any] | None = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
        authenticated: bool = True,
    ) -> httpx.Response:
        merged = dict(headers or {})
        if authenticated:
            merged[self.auth_header] = f"{self.auth_prefix}{self._token}"
        async with self._client() as client:
            try:
                response = await client.request(
                    method, url, params=params, json=json, data=data, content=content, headers=merged
                )
            except httpx.TimeoutException as exc:
                raise PlatformError("The platform API timed out.", platform=self.platform) from exc
            except httpx.HTTPError as exc:
                raise PlatformError(
                    f"Could not reach the platform API ({type(exc).__name__}).", platform=self.platform
                ) from exc
        self._raise_for_status(response)
        return response

    async def json(self, method: str, url: str, **kwargs: Any) -> dict[str, Any]:
        response = await self.request(method, url, **kwargs)
        if not response.content:
            return {}
        try:
            body = response.json()
        except ValueError as exc:
            raise PlatformError("The platform returned a non-JSON response.", platform=self.platform) from exc
        if isinstance(body, dict):
            self._raise_for_body(body, response.status_code)
            return body
        return {"data": body}

    def _raise_for_body(self, body: dict[str, Any], status: int) -> None:
        """Some APIs (e.g. TikTok) report errors inside a 200 body. Override per platform."""

    @staticmethod
    def _extract_message(response: httpx.Response) -> str:
        try:
            body = response.json()
        except ValueError:
            return f"HTTP {response.status_code}"
        err = body.get("error") if isinstance(body, dict) else None
        if isinstance(err, dict):
            msg = err.get("message") or err.get("code") or ""
        elif isinstance(err, str):
            msg = body.get("error_description") or err
        else:
            msg = ""
        return redact_text(str(msg))[:500] or f"HTTP {response.status_code}"

    def _raise_for_status(self, response: httpx.Response) -> None:
        if response.status_code < 400:
            return
        message = self._extract_message(response)
        if response.status_code == 401:
            raise TokenExpired(
                f"{self.platform} rejected the access token ({message}). Reconnect the account.",
            )
        if response.status_code == 429:
            raise RateLimitExceeded(
                f"{self.platform} rate limit reached: {message}",
                details={"retry_after": response.headers.get("retry-after")},
            )
        raise PlatformError(
            f"{self.platform} API error: {message}",
            platform=self.platform,
            status_code=response.status_code,
        )
