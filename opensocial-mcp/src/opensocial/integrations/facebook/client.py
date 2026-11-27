"""Meta Graph API client (Facebook Pages). Reference:
https://developers.facebook.com/docs/pages-api and https://developers.facebook.com/docs/graph-api
"""

from __future__ import annotations

from typing import Any

from opensocial.core.exceptions import PlatformError, RateLimitExceeded
from opensocial.integrations.base import PlatformClient


class MetaGraphClient(PlatformClient):
    platform = "facebook"
    host = "https://graph.facebook.com"

    def __init__(self, *args: Any, version: str = "v26.0", **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.version = self.account_meta.get("graph_version") or version

    def url(self, path: str) -> str:
        return f"{self.host}/{self.version}/{path.lstrip('/')}"

    def _raise_for_body(self, body: dict[str, Any], status: int) -> None:
        err = body.get("error")
        if isinstance(err, dict):
            if err.get("code") in (4, 17, 32, 613) or err.get("error_subcode") == 2446079:
                raise RateLimitExceeded(f"{self.platform} rate limit: {err.get('message', '')[:200]}")
            raise PlatformError(
                f"{self.platform} API error: {err.get('message', '')[:300]}", platform=self.platform, status_code=status
            )

    async def get(self, path: str, **params: Any) -> dict[str, Any]:
        return await self.json("GET", self.url(path), params=params or None)

    async def post(self, path: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self.json("POST", self.url(path), data=data)

    async def delete(self, path: str) -> dict[str, Any]:
        return await self.json("DELETE", self.url(path))


class FacebookPageClient(MetaGraphClient):
    platform = "facebook"

    async def page(self, page_id: str) -> dict[str, Any]:
        return await self.get(
            page_id, fields="id,name,about,category,fan_count,followers_count,link,verification_status"
        )

    async def posts(self, page_id: str, limit: int) -> dict[str, Any]:
        return await self.get(
            f"{page_id}/posts", fields="id,message,created_time,permalink_url,status_type", limit=limit
        )

    async def create_post(self, page_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self.post(f"{page_id}/feed", data)

    async def create_photo(self, page_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self.post(f"{page_id}/photos", data)

    async def create_video(self, page_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return await self.post(f"{page_id}/videos", data)

    async def comments(self, object_id: str, limit: int) -> dict[str, Any]:
        return await self.get(
            f"{object_id}/comments",
            fields="id,message,from,created_time,like_count,comment_count",
            limit=limit,
            filter="toplevel",
        )

    async def insights(
        self, object_id: str, metrics: list[str], period: str, since: str | None, until: str | None
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"metric": ",".join(metrics), "period": period}
        if since:
            params["since"] = since
        if until:
            params["until"] = until
        return await self.get(f"{object_id}/insights", **params)
