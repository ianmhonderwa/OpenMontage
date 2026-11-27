"""Instagram operations. Publishing always builds a fresh container from the approved
content, waits for processing, then publishes, so what the owner approved is exactly what
goes live."""

from __future__ import annotations

import re
from typing import Any

from opensocial.core.database import Platform
from opensocial.core.exceptions import ValidationFailed
from opensocial.core.permissions import Kind
from opensocial.core.runtime import OperationContext, operation
from opensocial.core.security import validate_public_url
from opensocial.integrations.common import check_text, untrusted
from opensocial.integrations.instagram.client import InstagramClient

P = Platform.INSTAGRAM
BASIC = ("instagram_business_basic|instagram_basic",)
PUBLISH = ("instagram_business_content_publish|instagram_content_publish",)
COMMENTS = ("instagram_business_manage_comments|instagram_manage_comments",)
INSIGHTS = ("instagram_business_manage_insights|instagram_manage_insights",)

CAPTION_MAX = 2200
HASHTAG_MAX = 30
MENTION_MAX = 20
CAROUSEL_MAX = 10
MEDIA_TYPES = {"IMAGE", "REELS", "CAROUSEL", "STORIES"}


def validate_caption(caption: str) -> str:
    caption = check_text(caption, field="caption", max_length=CAPTION_MAX)
    if len(re.findall(r"(?<!\w)#\w+", caption)) > HASHTAG_MAX:
        raise ValidationFailed(f"Instagram allows at most {HASHTAG_MAX} hashtags per caption.")
    if len(re.findall(r"(?<!\w)@[\w.]+", caption)) > MENTION_MAX:
        raise ValidationFailed(f"Instagram allows at most {MENTION_MAX} @mentions per caption.")
    return caption


def build_publish_params(
    *,
    media_type: str,
    caption: str,
    media_urls: list[str],
    share_to_feed: bool = True,
    cover_url: str | None = None,
    alt_text: str | None = None,
) -> dict[str, Any]:
    media_type = media_type.upper()
    if media_type not in MEDIA_TYPES:
        raise ValidationFailed(f"media_type must be one of {sorted(MEDIA_TYPES)}.")
    if not media_urls:
        raise ValidationFailed("At least one public HTTPS media URL is required.")
    for url in media_urls + ([cover_url] if cover_url else []):
        validate_public_url(url)
    if media_type == "CAROUSEL" and not 2 <= len(media_urls) <= CAROUSEL_MAX:
        raise ValidationFailed(f"Carousels need 2–{CAROUSEL_MAX} items.")
    if media_type in {"IMAGE", "REELS", "STORIES"} and len(media_urls) != 1:
        raise ValidationFailed(f"{media_type} takes exactly one media URL.")
    return {
        "media_type": media_type,
        "caption": validate_caption(caption),
        "media_urls": media_urls,
        "share_to_feed": share_to_feed,
        "cover_url": cover_url,
        "alt_text": check_text(alt_text, field="alt_text", max_length=1000) or None,
    }


def _is_video(url: str) -> bool:
    return url.lower().split("?")[0].endswith((".mp4", ".mov"))


def _client(ctx: OperationContext) -> InstagramClient:
    client = ctx.client(InstagramClient)
    client.version = ctx.settings.meta_graph_version
    return client


def _ig(ctx: OperationContext) -> str:
    assert ctx.account is not None
    return ctx.account.external_id


@operation("instagram_get_profile", P, Kind.READ, summary="Read Instagram profile", scopes=BASIC)
async def get_profile(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    profile = await _client(ctx).profile(_ig(ctx))
    profile["biography"] = untrusted(profile.get("biography"), "instagram.profile.biography")
    return {
        "profile": profile,
        "login_type": (ctx.account.meta or {}).get("login", "instagram") if ctx.account else None,
    }


@operation("instagram_list_media", P, Kind.READ, summary="List recent media", scopes=BASIC)
async def list_media(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await _client(ctx).media(_ig(ctx), min(max(int(params.get("limit", 12)), 1), 50))
    return {
        "media": [
            {**m, "caption": untrusted(m.get("caption"), "instagram.media.caption")} for m in body.get("data", [])
        ]
    }


@operation("instagram_get_publishing_limit", P, Kind.READ, summary="Read publishing quota", scopes=PUBLISH)
async def publishing_limit(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await _client(ctx).publishing_limit(_ig(ctx))
    return {"publishing_limit": body.get("data", [])}


def _publish_summary(p: dict[str, Any]) -> str:
    count = len(p.get("media_urls", []))
    return f"Publish Instagram {p.get('media_type')} ({count} media): {str(p.get('caption', ''))[:100]}"


@operation("instagram_publish_media", P, Kind.PUBLISH, summary=_publish_summary, scopes=PUBLISH)
async def publish_media(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    client, ig = _client(ctx), _ig(ctx)
    media_type, urls = params["media_type"], params["media_urls"]
    if media_type == "CAROUSEL":
        children = []
        for url in urls:
            child = {"is_carousel_item": "true"}
            child.update({"media_type": "VIDEO", "video_url": url} if _is_video(url) else {"image_url": url})
            child_id = await client.create_container(ig, child)
            await client.wait_until_ready(child_id)
            children.append(child_id)
        data: dict[str, Any] = {"media_type": "CAROUSEL", "children": ",".join(children), "caption": params["caption"]}
    elif media_type == "REELS":
        data = {
            "media_type": "REELS",
            "video_url": urls[0],
            "caption": params["caption"],
            "share_to_feed": "true" if params.get("share_to_feed", True) else "false",
        }
        if params.get("cover_url"):
            data["cover_url"] = params["cover_url"]
    elif media_type == "STORIES":
        data = {"media_type": "STORIES", **({"video_url": urls[0]} if _is_video(urls[0]) else {"image_url": urls[0]})}
    else:
        data = {"image_url": urls[0], "caption": params["caption"]}
        if params.get("alt_text"):
            data["alt_text"] = params["alt_text"]
    container = await client.create_container(ig, data)
    await client.wait_until_ready(container)
    published = await client.publish(ig, container)
    return {"published": True, "media_id": published.get("id"), "container_id": container}


@operation("instagram_get_container_status", P, Kind.READ, summary="Check container status", scopes=BASIC)
async def container_status(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    return {"container": await _client(ctx).container_status(params["container_id"])}


@operation("instagram_get_comments", P, Kind.READ, summary="Read comments", scopes=COMMENTS)
async def get_comments(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await _client(ctx).comments(params["media_id"], min(max(int(params.get("limit", 25)), 1), 50))
    return {
        "comments": [
            {
                "comment_id": c.get("id"),
                "author": untrusted(c.get("username"), "instagram.comment.author"),
                "text": untrusted(c.get("text"), "instagram.comment"),
                "timestamp": c.get("timestamp"),
                "like_count": c.get("like_count"),
            }
            for c in body.get("data", [])
        ]
    }


@operation(
    "instagram_reply_comment",
    P,
    Kind.PUBLISH,
    summary=lambda p: f"Publicly reply to Instagram comment {p.get('comment_id')}: {str(p.get('message', ''))[:80]}",
    scopes=COMMENTS,
)
async def reply_comment(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await _client(ctx).reply(params["comment_id"], params["message"])
    return {"replied": True, "reply_id": body.get("id")}


MEDIA_METRICS = {
    "views",
    "reach",
    "likes",
    "comments",
    "shares",
    "saved",
    "total_interactions",
    "ig_reels_avg_watch_time",
    "ig_reels_video_view_total_time",
}
ACCOUNT_METRICS = {
    "reach",
    "views",
    "accounts_engaged",
    "total_interactions",
    "likes",
    "comments",
    "shares",
    "saves",
    "follows_and_unfollows",
    "profile_links_taps",
}


@operation("instagram_get_insights", P, Kind.READ, summary="Read insights", scopes=INSIGHTS)
async def get_insights(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    media_id = params.get("media_id")
    allowed = MEDIA_METRICS if media_id else ACCOUNT_METRICS
    metrics = params.get("metrics") or (
        ["views", "reach", "likes", "comments", "shares", "saved"]
        if media_id
        else ["reach", "views", "accounts_engaged"]
    )
    bad = set(metrics) - allowed
    if bad:
        raise ValidationFailed(f"Unsupported metrics for this object: {sorted(bad)}")
    body = await _client(ctx).insights(media_id or _ig(ctx), metrics, None if media_id else params.get("period", "day"))
    return {
        "source": f"Instagram Graph API {ctx.settings.meta_graph_version} insights",
        "object_id": media_id or _ig(ctx),
        "metrics": [
            {
                "name": m.get("name"),
                "period": m.get("period"),
                "title": m.get("title"),
                "description": m.get("description"),
                "values": m.get("values") or m.get("total_value"),
            }
            for m in body.get("data", [])
        ],
        "notes": ["Metrics are as defined by Meta; availability depends on media type and account."],
    }


@operation("instagram_prepare_media", P, Kind.PREPARE, summary="Prepare and validate Instagram media", scopes=PUBLISH)
def prepare_media(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    """Validate a planned post locally (caption limits, URLs, optional local file checks).
    Nothing is sent to Instagram until instagram_publish_media is approved."""
    from opensocial.integrations.common import prepare_local_media

    plan = build_publish_params(
        media_type=params["media_type"],
        caption=params.get("caption", ""),
        media_urls=params["media_urls"],
        share_to_feed=params.get("share_to_feed", True),
        cover_url=params.get("cover_url"),
        alt_text=params.get("alt_text"),
    )
    local = []
    requirement = "instagram:reel" if plan["media_type"] == "REELS" else "instagram:image"
    for path in params.get("local_files") or []:
        _, validation, _ = prepare_local_media(ctx.settings, path, requirement)
        local.append(validation)
    return {
        "prepared": True,
        "publish_plan": plan,
        "local_media_validation": local,
        "next_step": "Call instagram_publish_media with these exact values to request approval.",
    }
