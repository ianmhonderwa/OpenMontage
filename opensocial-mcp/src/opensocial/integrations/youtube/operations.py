"""YouTube operations registered with the guarded runtime."""

from __future__ import annotations

import re
from typing import Any

from opensocial.core.database import Platform
from opensocial.core.exceptions import ValidationFailed
from opensocial.core.permissions import Kind
from opensocial.core.runtime import OperationContext, operation
from opensocial.integrations.common import check_text, prepare_local_media, untrusted
from opensocial.integrations.youtube.client import YouTubeClient

P = Platform.YOUTUBE
S_READ = "https://www.googleapis.com/auth/youtube.readonly|https://www.googleapis.com/auth/youtube|https://www.googleapis.com/auth/youtube.force-ssl"
S_UPLOAD = "https://www.googleapis.com/auth/youtube.upload|https://www.googleapis.com/auth/youtube|https://www.googleapis.com/auth/youtube.force-ssl"
S_MANAGE = "https://www.googleapis.com/auth/youtube|https://www.googleapis.com/auth/youtube.force-ssl"
S_COMMENT = "https://www.googleapis.com/auth/youtube.force-ssl"
S_ANALYTICS = "https://www.googleapis.com/auth/yt-analytics.readonly"

PRIVACY = {"private", "unlisted", "public"}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ALLOWED_METRICS = {
    "views",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "averageViewPercentage",
    "likes",
    "dislikes",
    "comments",
    "shares",
    "subscribersGained",
    "subscribersLost",
    "videosAddedToPlaylists",
    "cardClickRate",
    "annotationClickThroughRate",
}
METRIC_DEFINITIONS = {
    "views": "Number of times videos were viewed (YouTube Analytics definition).",
    "estimatedMinutesWatched": "Minutes users watched the channel's videos.",
    "averageViewDuration": "Average length, in seconds, of video playbacks.",
    "likes": "Number of times users indicated they liked a video.",
    "comments": "Number of times users commented.",
    "shares": "Number of times users shared via the Share button.",
    "subscribersGained": "Number of times users subscribed.",
    "subscribersLost": "Number of times users unsubscribed.",
}


def _video_summary(v: dict[str, Any]) -> dict[str, Any]:
    snip, stats = v.get("snippet", {}), v.get("statistics", {})
    return {
        "video_id": v.get("id"),
        "title": snip.get("title"),
        "description": untrusted(snip.get("description"), "youtube.video.description"),
        "published_at": snip.get("publishedAt"),
        "privacy_status": v.get("status", {}).get("privacyStatus"),
        "duration": v.get("contentDetails", {}).get("duration"),
        "tags": snip.get("tags", []),
        "statistics": {k: int(val) for k, val in stats.items() if str(val).isdigit()},
    }


def _validate_tags(tags: list[str] | None) -> list[str]:
    tags = [check_text(t, field="tags", max_length=100) for t in (tags or []) if t.strip()]
    if sum(len(t) for t in tags) > 500:
        raise ValidationFailed("Combined tag length exceeds YouTube's 500-character limit.")
    return tags


@operation("youtube_get_channel", P, Kind.READ, summary="Read channel information", scopes=(S_READ,))
async def get_channel(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    ch = await ctx.client(YouTubeClient).get_channel()
    snip, stats = ch.get("snippet", {}), ch.get("statistics", {})
    return {
        "channel": {
            "channel_id": ch.get("id"),
            "title": snip.get("title"),
            "description": untrusted(snip.get("description"), "youtube.channel.description"),
            "custom_url": snip.get("customUrl"),
            "published_at": snip.get("publishedAt"),
            "statistics": {k: int(v) for k, v in stats.items() if str(v).isdigit()},
            "hidden_subscriber_count": stats.get("hiddenSubscriberCount"),
        }
    }


@operation("youtube_list_videos", P, Kind.READ, summary="List channel uploads", scopes=(S_READ,))
async def list_videos(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    max_results = min(max(int(params.get("max_results", 10)), 1), 50)
    page = await ctx.client(YouTubeClient).list_videos(max_results, params.get("page_token"))
    return {"videos": [_video_summary(v) for v in page["videos"]], "next_page_token": page["next_page_token"]}


@operation("youtube_get_video", P, Kind.READ, summary="Read one video", scopes=(S_READ,))
async def get_video(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    videos = await ctx.client(YouTubeClient).get_videos([params["video_id"]])
    if not videos:
        raise ValidationFailed("Video not found or not visible to this account.")
    return {"video": _video_summary(videos[0])}


def _upload_summary(p: dict[str, Any]) -> str:
    kind = "Short" if p.get("as_short") else "video"
    return f"Upload YouTube {kind} '{p.get('title')}' ({p.get('privacy_status')})"


@operation("youtube_upload_video", P, Kind.PUBLISH, summary=_upload_summary, scopes=(S_UPLOAD,))
async def upload_video(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    requirement = "youtube:short" if params.get("as_short") else "youtube:video"
    path, validation, digest = prepare_local_media(ctx.settings, params["file_path"], requirement)
    if digest != params.get("file_sha256"):
        raise ValidationFailed("The file changed after it was prepared/approved. Prepare it again.")
    snippet = {
        "title": params["title"],
        "description": params.get("description", ""),
        "tags": params.get("tags", []),
        "categoryId": params.get("category_id", "22"),
    }
    status = {
        "privacyStatus": params["privacy_status"],
        "selfDeclaredMadeForKids": bool(params.get("made_for_kids", False)),
        "containsSyntheticMedia": bool(params.get("contains_synthetic_media", False)),
    }
    if params.get("publish_at"):
        status["publishAt"] = params["publish_at"]
    video = await ctx.client(YouTubeClient).upload_video(path, snippet=snippet, status=status)
    return {
        "uploaded": True,
        "video_id": video.get("id"),
        "privacy_status": video.get("status", {}).get("privacyStatus"),
        "url": f"https://www.youtube.com/watch?v={video.get('id')}",
        "media_validation": validation,
    }


def prepare_upload_params(
    ctx_settings: Any,
    *,
    file_path: str,
    title: str,
    description: str,
    tags: list[str] | None,
    privacy_status: str,
    category_id: str,
    as_short: bool,
    made_for_kids: bool,
    contains_synthetic_media: bool,
    publish_at: str | None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Validate inputs and build the exact parameters an approval will be bound to."""
    title = check_text(title, field="title", max_length=100, required=True)
    description = check_text(description, field="description", max_length=5000)
    if privacy_status not in PRIVACY:
        raise ValidationFailed(f"privacy_status must be one of {sorted(PRIVACY)}.")
    if publish_at and privacy_status != "private":
        raise ValidationFailed("publish_at (scheduled publishing) requires privacy_status 'private'.")
    if not category_id.isdigit():
        raise ValidationFailed("category_id must be a numeric YouTube category id.")
    requirement = "youtube:short" if as_short else "youtube:video"
    _, validation, digest = prepare_local_media(ctx_settings, file_path, requirement)
    params = {
        "file_path": file_path,
        "file_sha256": digest,
        "title": title,
        "description": description,
        "tags": _validate_tags(tags),
        "privacy_status": privacy_status,
        "category_id": category_id,
        "as_short": as_short,
        "made_for_kids": made_for_kids,
        "contains_synthetic_media": contains_synthetic_media,
        "publish_at": publish_at,
    }
    return params, validation


@operation(
    "youtube_update_video",
    P,
    Kind.EDIT,
    summary=lambda p: f"Update metadata of video {p.get('video_id')}",
    scopes=(S_MANAGE,),
)
async def update_video(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    result = await ctx.client(YouTubeClient).update_video(
        params["video_id"],
        title=params.get("title"),
        description=params.get("description"),
        tags=params.get("tags"),
        category_id=params.get("category_id"),
        privacy_status=params.get("privacy_status"),
    )
    return {"updated": True, "video_id": result.get("id"), "title": result.get("snippet", {}).get("title")}


@operation("youtube_list_comments", P, Kind.READ, summary="Read comments", scopes=(S_READ,))
async def list_comments(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await ctx.client(YouTubeClient).list_comment_threads(
        params["video_id"], min(max(int(params.get("max_results", 20)), 1), 100), params.get("page_token")
    )
    comments = []
    for thread in body.get("items", []):
        top = thread["snippet"]["topLevelComment"]
        s = top["snippet"]
        comments.append(
            {
                "comment_id": top["id"],
                "thread_id": thread["id"],
                "author": untrusted(s.get("authorDisplayName"), "youtube.comment.author"),
                "text": untrusted(s.get("textDisplay") or s.get("textOriginal"), "youtube.comment"),
                "like_count": s.get("likeCount"),
                "published_at": s.get("publishedAt"),
                "reply_count": thread["snippet"].get("totalReplyCount", 0),
            }
        )
    return {"comments": comments, "next_page_token": body.get("nextPageToken")}


@operation(
    "youtube_reply_comment",
    P,
    Kind.PUBLISH,
    summary=lambda p: f"Publicly reply to comment {p.get('comment_id')}: {p.get('text', '')[:80]}",
    scopes=(S_COMMENT,),
)
async def reply_comment(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await ctx.client(YouTubeClient).reply_comment(params["comment_id"], params["text"])
    return {"replied": True, "reply_id": body.get("id")}


@operation("youtube_list_playlists", P, Kind.READ, summary="List playlists", scopes=(S_READ,))
async def list_playlists(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await ctx.client(YouTubeClient).list_playlists()
    return {
        "playlists": [
            {
                "playlist_id": p["id"],
                "title": p["snippet"]["title"],
                "item_count": p.get("contentDetails", {}).get("itemCount"),
                "privacy_status": p.get("status", {}).get("privacyStatus"),
            }
            for p in body.get("items", [])
        ]
    }


@operation(
    "youtube_create_playlist",
    P,
    Kind.PUBLISH,
    summary=lambda p: f"Create playlist '{p.get('title')}' ({p.get('privacy_status')})",
    scopes=(S_MANAGE,),
)
async def create_playlist(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await ctx.client(YouTubeClient).create_playlist(
        params["title"], params.get("description", ""), params["privacy_status"]
    )
    return {"created": True, "playlist_id": body.get("id")}


@operation(
    "youtube_add_to_playlist",
    P,
    Kind.EDIT,
    summary=lambda p: f"Add video {p.get('video_id')} to playlist {p.get('playlist_id')}",
    scopes=(S_MANAGE,),
)
async def add_to_playlist(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await ctx.client(YouTubeClient).add_to_playlist(params["playlist_id"], params["video_id"])
    return {"added": True, "playlist_item_id": body.get("id")}


@operation("youtube_get_analytics", P, Kind.READ, summary="Read channel analytics", scopes=(S_ANALYTICS,))
async def get_analytics(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    start, end = params["start_date"], params["end_date"]
    if not (DATE.match(start) and DATE.match(end)) or start > end:
        raise ValidationFailed("Dates must be YYYY-MM-DD and start_date <= end_date.")
    metrics = params.get("metrics") or [
        "views",
        "estimatedMinutesWatched",
        "likes",
        "comments",
        "shares",
        "subscribersGained",
        "subscribersLost",
    ]
    bad = set(metrics) - ALLOWED_METRICS
    if bad:
        raise ValidationFailed(f"Unsupported metrics: {sorted(bad)}")
    dims = params.get("dimensions")
    if dims and set(dims) - {"day", "month", "video", "country", "insightTrafficSourceType"}:
        raise ValidationFailed("Unsupported dimension.")
    filters = f"video=={params['video_id']}" if params.get("video_id") else None
    report = await ctx.client(YouTubeClient).analytics(
        start_date=start, end_date=end, metrics=metrics, dimensions=dims, filters=filters
    )
    headers = [h["name"] for h in report.get("columnHeaders", [])]
    rows = [dict(zip(headers, r, strict=False)) for r in report.get("rows", [])]
    return {
        "source": "YouTube Analytics API v2",
        "start_date": start,
        "end_date": end,
        "columns": headers,
        "rows": rows,
        "metric_definitions": {
            m: METRIC_DEFINITIONS.get(m, "See YouTube Analytics metric documentation.") for m in metrics
        },
        "notes": ["Values are as reported by YouTube; recent days may be incomplete."],
    }
