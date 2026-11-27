"""Thin async client for the official YouTube Data API v3 and Analytics API v2.

Reference: https://developers.google.com/youtube/v3/docs and
https://developers.google.com/youtube/analytics/reference/reports/query
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from opensocial.core.exceptions import PlatformError
from opensocial.integrations.base import PlatformClient

DATA_API = "https://www.googleapis.com/youtube/v3"
UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3/videos"
ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2/reports"
CHUNK = 8 * 1024 * 1024  # must be a multiple of 256 KiB


class YouTubeClient(PlatformClient):
    platform = "youtube"

    async def get_channel(self) -> dict[str, Any]:
        body = await self.json(
            "GET", f"{DATA_API}/channels", params={"part": "snippet,statistics,contentDetails,status", "mine": "true"}
        )
        items = body.get("items") or []
        if not items:
            raise PlatformError("No channel is associated with this authorisation.", platform=self.platform)
        return items[0]

    async def list_channels(self) -> list[dict[str, Any]]:
        body = await self.json("GET", f"{DATA_API}/channels", params={"part": "snippet,contentDetails", "mine": "true"})
        return list(body.get("items") or [])

    async def list_videos(self, max_results: int = 10, page_token: str | None = None) -> dict[str, Any]:
        channel = await self.get_channel()
        uploads = channel["contentDetails"]["relatedPlaylists"]["uploads"]
        params: dict[str, Any] = {"part": "contentDetails", "playlistId": uploads, "maxResults": max_results}
        if page_token:
            params["pageToken"] = page_token
        page = await self.json("GET", f"{DATA_API}/playlistItems", params=params)
        ids = [i["contentDetails"]["videoId"] for i in page.get("items", [])]
        videos = await self.get_videos(ids) if ids else []
        return {"videos": videos, "next_page_token": page.get("nextPageToken")}

    async def get_videos(self, ids: list[str]) -> list[dict[str, Any]]:
        body = await self.json(
            "GET",
            f"{DATA_API}/videos",
            params={"part": "snippet,statistics,status,contentDetails", "id": ",".join(ids[:50])},
        )
        return list(body.get("items") or [])

    async def upload_video(
        self, path: Path, *, snippet: dict[str, Any], status: dict[str, Any], content_type: str = "video/*"
    ) -> dict[str, Any]:
        """Resumable upload protocol: create a session, then PUT the bytes in chunks."""
        size = path.stat().st_size
        init = await self.request(
            "POST",
            UPLOAD_API,
            params={"uploadType": "resumable", "part": "snippet,status"},
            content=json.dumps({"snippet": snippet, "status": status}).encode(),
            headers={
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Length": str(size),
                "X-Upload-Content-Type": content_type,
            },
        )
        session_url = init.headers.get("location")
        if not session_url or not session_url.startswith("https://www.googleapis.com/"):
            raise PlatformError("YouTube did not return a valid upload session.", platform=self.platform)
        offset = 0
        with path.open("rb") as handle:
            while True:
                chunk = handle.read(CHUNK)
                end = offset + len(chunk) - 1
                response = await self.request(
                    "PUT",
                    session_url,
                    content=chunk,
                    headers={
                        "Content-Length": str(len(chunk)),
                        "Content-Range": f"bytes {offset}-{end}/{size}" if chunk else f"bytes */{size}",
                    },
                )
                offset += len(chunk)
                if response.status_code in (200, 201):
                    return response.json()
                if response.status_code != 308 or not chunk:
                    raise PlatformError(
                        "YouTube upload did not complete.", platform=self.platform, status_code=response.status_code
                    )

    async def update_video(
        self,
        video_id: str,
        *,
        title: str | None,
        description: str | None,
        tags: list[str] | None,
        category_id: str | None,
        privacy_status: str | None,
    ) -> dict[str, Any]:
        current = await self.get_videos([video_id])
        if not current:
            raise PlatformError("Video not found on this channel.", platform=self.platform, status_code=404)
        snippet = current[0]["snippet"]
        body: dict[str, Any] = {
            "id": video_id,
            "snippet": {
                "title": title if title is not None else snippet["title"],
                "description": description if description is not None else snippet.get("description", ""),
                "tags": tags if tags is not None else snippet.get("tags", []),
                "categoryId": category_id or snippet["categoryId"],
            },
        }
        parts = ["snippet"]
        if privacy_status:
            body["status"] = {"privacyStatus": privacy_status}
            parts.append("status")
        return await self.json("PUT", f"{DATA_API}/videos", params={"part": ",".join(parts)}, json=body)

    async def list_comment_threads(
        self, video_id: str, max_results: int = 20, page_token: str | None = None
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "part": "snippet",
            "videoId": video_id,
            "maxResults": max_results,
            "textFormat": "plainText",
            "order": "time",
        }
        if page_token:
            params["pageToken"] = page_token
        return await self.json("GET", f"{DATA_API}/commentThreads", params=params)

    async def reply_comment(self, parent_id: str, text: str) -> dict[str, Any]:
        return await self.json(
            "POST",
            f"{DATA_API}/comments",
            params={"part": "snippet"},
            json={"snippet": {"parentId": parent_id, "textOriginal": text}},
        )

    async def list_playlists(self, max_results: int = 25) -> dict[str, Any]:
        return await self.json(
            "GET",
            f"{DATA_API}/playlists",
            params={"part": "snippet,contentDetails,status", "mine": "true", "maxResults": max_results},
        )

    async def create_playlist(self, title: str, description: str, privacy_status: str) -> dict[str, Any]:
        return await self.json(
            "POST",
            f"{DATA_API}/playlists",
            params={"part": "snippet,status"},
            json={"snippet": {"title": title, "description": description}, "status": {"privacyStatus": privacy_status}},
        )

    async def add_to_playlist(self, playlist_id: str, video_id: str) -> dict[str, Any]:
        return await self.json(
            "POST",
            f"{DATA_API}/playlistItems",
            params={"part": "snippet"},
            json={"snippet": {"playlistId": playlist_id, "resourceId": {"kind": "youtube#video", "videoId": video_id}}},
        )

    async def analytics(
        self, *, start_date: str, end_date: str, metrics: list[str], dimensions: list[str] | None, filters: str | None
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "ids": "channel==MINE",
            "startDate": start_date,
            "endDate": end_date,
            "metrics": ",".join(metrics),
        }
        if dimensions:
            params["dimensions"] = ",".join(dimensions)
            if "day" in dimensions:
                params["sort"] = "day"
        if filters:
            params["filters"] = filters
        return await self.json("GET", ANALYTICS_API, params=params)
