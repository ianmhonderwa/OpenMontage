"""Instagram Graph API client.

* Instagram Login → host ``graph.instagram.com`` (``instagram_business_*`` permissions).
* Facebook Login → host ``graph.facebook.com`` (``instagram_*`` + Page permissions).

Reference: https://developers.facebook.com/docs/instagram-platform/content-publishing/
"""

from __future__ import annotations

import asyncio
from typing import Any

from opensocial.core.exceptions import PlatformError
from opensocial.integrations.facebook.client import MetaGraphClient

POLL_INTERVAL_SECONDS = 5.0
POLL_ATTEMPTS = 60


class InstagramClient(MetaGraphClient):
    platform = "instagram"

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.host = (
            "https://graph.instagram.com"
            if self.account_meta.get("login", "instagram") == "instagram"
            else "https://graph.facebook.com"
        )

    async def profile(self, ig_id: str) -> dict[str, Any]:
        fields = "id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website"
        if self.host.endswith("instagram.com"):
            fields += ",user_id,account_type"
        return await self.get(ig_id, fields=fields)

    async def media(self, ig_id: str, limit: int) -> dict[str, Any]:
        return await self.get(
            f"{ig_id}/media",
            limit=limit,
            fields=("id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count"),
        )

    async def create_container(self, ig_id: str, data: dict[str, Any]) -> str:
        body = await self.post(f"{ig_id}/media", data)
        if "id" not in body:
            raise PlatformError("Instagram did not return a container id.", platform=self.platform)
        return str(body["id"])

    async def container_status(self, container_id: str) -> dict[str, Any]:
        return await self.get(container_id, fields="id,status_code,status")

    async def wait_until_ready(self, container_id: str) -> dict[str, Any]:
        for _ in range(POLL_ATTEMPTS):
            status = await self.container_status(container_id)
            code = status.get("status_code")
            if code == "FINISHED":
                return status
            if code in {"ERROR", "EXPIRED"}:
                raise PlatformError(
                    f"Instagram media container {code}: {status.get('status', '')[:200]}", platform=self.platform
                )
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
        raise PlatformError("Instagram media processing did not finish in time; retry later.", platform=self.platform)

    async def publish(self, ig_id: str, creation_id: str) -> dict[str, Any]:
        return await self.post(f"{ig_id}/media_publish", {"creation_id": creation_id})

    async def publishing_limit(self, ig_id: str) -> dict[str, Any]:
        return await self.get(f"{ig_id}/content_publishing_limit", fields="config,quota_usage")

    async def comments(self, media_id: str, limit: int) -> dict[str, Any]:
        return await self.get(f"{media_id}/comments", fields="id,text,username,timestamp,like_count", limit=limit)

    async def reply(self, comment_id: str, message: str) -> dict[str, Any]:
        return await self.post(f"{comment_id}/replies", {"message": message})

    async def insights(self, object_id: str, metrics: list[str], period: str | None) -> dict[str, Any]:
        params: dict[str, Any] = {"metric": ",".join(metrics)}
        if period:
            params["period"] = period
        return await self.get(f"{object_id}/insights", **params)
