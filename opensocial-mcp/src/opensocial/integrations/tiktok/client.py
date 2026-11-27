"""TikTok Open API v2 client.

References:
* Content Posting API — https://developers.tiktok.com/doc/content-posting-api-get-started
* Query Creator Info — https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info
* Media transfer guide — https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from opensocial.core.exceptions import PlatformError, RateLimitExceeded, TokenExpired
from opensocial.integrations.base import PlatformClient

API = "https://open.tiktokapis.com/v2"
USER_FIELDS = ",".join(
    [
        "open_id",
        "union_id",
        "avatar_url",
        "display_name",
        "bio_description",
        "profile_deep_link",
        "is_verified",
        "follower_count",
        "following_count",
        "likes_count",
        "video_count",
    ]
)
VIDEO_FIELDS = ",".join(
    [
        "id",
        "title",
        "video_description",
        "create_time",
        "cover_image_url",
        "share_url",
        "duration",
        "view_count",
        "like_count",
        "comment_count",
        "share_count",
    ]
)
SINGLE_CHUNK_MAX = 64 * 1024 * 1024
CHUNK_SIZE = 10 * 1024 * 1024


def chunk_plan(size: int) -> tuple[int, int]:
    """Return (chunk_size, total_chunk_count) following TikTok's media-transfer rules:
    files up to 64 MB may be sent whole; otherwise chunks of 5–64 MB where the final
    chunk absorbs the remainder."""
    if size <= 0:
        raise ValueError("empty file")
    if size <= SINGLE_CHUNK_MAX:
        return size, 1
    return CHUNK_SIZE, size // CHUNK_SIZE


class TikTokClient(PlatformClient):
    platform = "tiktok"

    def _raise_for_body(self, body: dict[str, Any], status: int) -> None:
        err = body.get("error") or {}
        code = err.get("code", "ok") if isinstance(err, dict) else "ok"
        if code in ("ok", "", None):
            return
        message = str(err.get("message", ""))[:300]
        if code in {"access_token_invalid", "scope_not_authorized"}:
            raise TokenExpired(f"TikTok: {code} – {message}. Reconnect the account with the needed scopes.")
        if code == "rate_limit_exceeded" or code == "spam_risk_too_many_posts":
            raise RateLimitExceeded(f"TikTok: {code} – {message}")
        raise PlatformError(f"TikTok API error {code}: {message}", platform=self.platform, status_code=status)

    async def user_info(self) -> dict[str, Any]:
        body = await self.json("GET", f"{API}/user/info/", params={"fields": USER_FIELDS})
        return body.get("data", {}).get("user", {})

    async def list_videos(self, max_count: int, cursor: int | None) -> dict[str, Any]:
        payload: dict[str, Any] = {"max_count": max_count}
        if cursor:
            payload["cursor"] = cursor
        body = await self.json("POST", f"{API}/video/list/", params={"fields": VIDEO_FIELDS}, json=payload)
        return body.get("data", {})

    async def query_videos(self, ids: list[str]) -> list[dict[str, Any]]:
        body = await self.json(
            "POST", f"{API}/video/query/", params={"fields": VIDEO_FIELDS}, json={"filters": {"video_ids": ids[:20]}}
        )
        return list(body.get("data", {}).get("videos", []))

    async def creator_info(self) -> dict[str, Any]:
        body = await self.json(
            "POST",
            f"{API}/post/publish/creator_info/query/",
            headers={"Content-Type": "application/json; charset=UTF-8"},
            json={},
        )
        return body.get("data", {})

    async def init_direct_post(self, post_info: dict[str, Any], source_info: dict[str, Any]) -> dict[str, Any]:
        body = await self.json(
            "POST", f"{API}/post/publish/video/init/", json={"post_info": post_info, "source_info": source_info}
        )
        return body.get("data", {})

    async def init_inbox_upload(self, source_info: dict[str, Any]) -> dict[str, Any]:
        body = await self.json("POST", f"{API}/post/publish/inbox/video/init/", json={"source_info": source_info})
        return body.get("data", {})

    async def upload_file(self, upload_url: str, path: Path, chunk_size: int, total_chunks: int) -> None:
        if not upload_url.startswith("https://") or ".tiktokapis.com" not in upload_url.split("/")[2]:
            raise PlatformError("Unexpected TikTok upload URL.", platform=self.platform)
        size = path.stat().st_size
        with path.open("rb") as handle:
            for index in range(total_chunks):
                start = index * chunk_size
                length = size - start if index == total_chunks - 1 else chunk_size
                handle.seek(start)
                data = handle.read(length)
                await self.request(
                    "PUT",
                    upload_url,
                    content=data,
                    authenticated=False,
                    headers={
                        "Content-Type": "video/mp4",
                        "Content-Length": str(len(data)),
                        "Content-Range": f"bytes {start}-{start + len(data) - 1}/{size}",
                    },
                )

    async def publish_status(self, publish_id: str) -> dict[str, Any]:
        body = await self.json("POST", f"{API}/post/publish/status/fetch/", json={"publish_id": publish_id})
        return body.get("data", {})
