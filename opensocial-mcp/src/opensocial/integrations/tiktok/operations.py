"""TikTok operations.

Direct Post requires the ``video.publish`` scope **and** TikTok's app audit. Until an app
passes the audit, TikTok restricts direct posts to private (SELF_ONLY) visibility. Draft
("inbox") upload uses ``video.upload``; the creator completes posting inside TikTok.
"""

from __future__ import annotations

from typing import Any

from opensocial.core.database import Platform
from opensocial.core.exceptions import ValidationFailed
from opensocial.core.permissions import Kind
from opensocial.core.runtime import OperationContext, operation
from opensocial.integrations.common import check_text, prepare_local_media, untrusted
from opensocial.integrations.tiktok.client import TikTokClient, chunk_plan

P = Platform.TIKTOK
PRIVACY_LEVELS = {"PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"}
TITLE_MAX = 2200


@operation("tiktok_get_profile", P, Kind.READ, summary="Read creator profile", scopes=("user.info.basic",))
async def get_profile(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    user = await ctx.client(TikTokClient).user_info()
    user["bio_description"] = untrusted(user.get("bio_description"), "tiktok.profile.bio")
    return {"profile": user, "notes": ["Statistics fields require the user.info.stats scope."]}


@operation("tiktok_list_videos", P, Kind.READ, summary="List creator videos", scopes=("video.list",))
async def list_videos(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    data = await ctx.client(TikTokClient).list_videos(
        min(max(int(params.get("max_count", 10)), 1), 20), params.get("cursor")
    )
    videos = [
        {
            **v,
            "title": untrusted(v.get("title"), "tiktok.video.title"),
            "video_description": untrusted(v.get("video_description"), "tiktok.video.description"),
        }
        for v in data.get("videos", [])
    ]
    return {"videos": videos, "cursor": data.get("cursor"), "has_more": data.get("has_more")}


@operation(
    "tiktok_get_creator_info", P, Kind.READ, summary="Query creator posting permissions", scopes=("video.publish",)
)
async def creator_info(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    return {"creator_info": await ctx.client(TikTokClient).creator_info()}


def build_post_params(
    settings: Any,
    *,
    file_path: str,
    title: str,
    privacy_level: str,
    disable_comment: bool,
    disable_duet: bool,
    disable_stitch: bool,
    brand_content_toggle: bool,
    brand_organic_toggle: bool,
    is_aigc: bool,
    mode: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    if mode not in {"direct", "draft"}:
        raise ValidationFailed("mode must be 'direct' (Direct Post) or 'draft' (send to TikTok inbox).")
    if mode == "direct" and privacy_level not in PRIVACY_LEVELS:
        raise ValidationFailed(f"privacy_level must be one of {sorted(PRIVACY_LEVELS)}.")
    title = check_text(title, field="caption", max_length=TITLE_MAX)
    _, validation, digest = prepare_local_media(settings, file_path, "tiktok:video")
    params = {
        "mode": mode,
        "file_path": file_path,
        "file_sha256": digest,
        "title": title,
        "privacy_level": privacy_level if mode == "direct" else None,
        "disable_comment": disable_comment,
        "disable_duet": disable_duet,
        "disable_stitch": disable_stitch,
        "brand_content_toggle": brand_content_toggle,
        "brand_organic_toggle": brand_organic_toggle,
        "is_aigc": is_aigc,
    }
    return params, validation


def _summary(p: dict[str, Any]) -> str:
    if p.get("mode") == "draft":
        return f"Send video to TikTok inbox as a draft: {str(p.get('title', ''))[:80]}"
    return f"Direct-post TikTok video ({p.get('privacy_level')}): {str(p.get('title', ''))[:80]}"


async def _upload(ctx: OperationContext, params: dict[str, Any], direct: bool) -> dict[str, Any]:
    client = ctx.client(TikTokClient)
    max_duration = None
    if direct:
        info = await client.creator_info()
        options = info.get("privacy_level_options") or []
        if params["privacy_level"] not in options:
            raise ValidationFailed(
                f"privacy_level {params['privacy_level']} is not available for this creator "
                f"(available: {options}). Unaudited apps can only post SELF_ONLY."
            )
        if info.get("comment_disabled") and not params["disable_comment"]:
            raise ValidationFailed("This creator has comments disabled; set disable_comment=true.")
        max_duration = info.get("max_video_post_duration_sec")
    path, validation, digest = prepare_local_media(
        ctx.settings, params["file_path"], "tiktok:video", max_duration=max_duration
    )
    if digest != params["file_sha256"]:
        raise ValidationFailed("The file changed after it was prepared/approved. Prepare it again.")
    size = path.stat().st_size
    chunk_size, chunks = chunk_plan(size)
    source = {"source": "FILE_UPLOAD", "video_size": size, "chunk_size": chunk_size, "total_chunk_count": chunks}
    if direct:
        post_info = {
            "title": params["title"],
            "privacy_level": params["privacy_level"],
            "disable_comment": params["disable_comment"],
            "disable_duet": params["disable_duet"],
            "disable_stitch": params["disable_stitch"],
            "brand_content_toggle": params["brand_content_toggle"],
            "brand_organic_toggle": params["brand_organic_toggle"],
            "is_aigc": params["is_aigc"],
        }
        data = await client.init_direct_post(post_info, source)
    else:
        data = await client.init_inbox_upload(source)
    await client.upload_file(data["upload_url"], path, chunk_size, chunks)
    return {
        "publish_id": data.get("publish_id"),
        "mode": "direct" if direct else "draft",
        "media_validation": validation,
        "next_step": "Check progress with tiktok_get_video_status."
        + ("" if direct else " The creator must open TikTok's inbox notification to finish posting."),
    }


@operation("tiktok_publish_video", P, Kind.PUBLISH, summary=_summary, scopes=("video.publish",))
async def publish_video(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    return await _upload(ctx, params, direct=True)


@operation("tiktok_upload_draft", P, Kind.EDIT, summary=_summary, scopes=("video.upload",))
async def upload_draft(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    return await _upload(ctx, params, direct=False)


@operation(
    "tiktok_get_video_status", P, Kind.READ, summary="Fetch publish status", scopes=("video.publish|video.upload",)
)
async def video_status(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    return {"status": await ctx.client(TikTokClient).publish_status(params["publish_id"])}


@operation("tiktok_get_analytics", P, Kind.READ, summary="Read per-video public metrics", scopes=("video.list",))
async def get_analytics(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    client = ctx.client(TikTokClient)
    ids = params.get("video_ids") or []
    videos = await client.query_videos(ids) if ids else (await client.list_videos(20, None)).get("videos", [])
    metrics = ["view_count", "like_count", "comment_count", "share_count"]
    rows: list[dict[str, Any]] = [
        {"video_id": v.get("id"), "create_time": v.get("create_time"), **{m: v.get(m) for m in metrics}} for v in videos
    ]
    totals: dict[str, int] = {m: sum(r[m] for r in rows if isinstance(r.get(m), int)) for m in metrics}
    return {
        "source": "TikTok Display API (video.list / video.query)",
        "videos": rows,
        "totals": totals,
        "notes": [
            "These are lifetime public counters per video, not period analytics. The Display "
            "API does not provide reach, watch time or follower growth over time."
        ],
    }
