"""Facebook Page operations."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from opensocial.core.database import Platform
from opensocial.core.exceptions import ValidationFailed
from opensocial.core.permissions import Kind
from opensocial.core.runtime import OperationContext, operation
from opensocial.core.security import validate_public_url
from opensocial.integrations.common import check_text, untrusted
from opensocial.integrations.facebook.client import FacebookPageClient

P = Platform.FACEBOOK
READ = ("pages_show_list", "pages_read_engagement")
PUBLISH = ("pages_manage_posts",)
ENGAGE = ("pages_manage_engagement",)
COMMENTS = ("pages_read_user_content|pages_read_engagement",)
INSIGHTS = ("read_insights",)
MAX_MESSAGE = 63206


def _client(ctx: OperationContext) -> FacebookPageClient:
    client = ctx.client(FacebookPageClient)
    client.version = ctx.settings.meta_graph_version
    return client


def _page_id(ctx: OperationContext) -> str:
    assert ctx.account is not None
    return ctx.account.external_id


def validate_schedule(value: str | None) -> int | None:
    """Pages accept scheduled_publish_time between 10 minutes and 30 days ahead (verify in
    the current Pages API docs); returns a UNIX timestamp."""
    if not value:
        return None
    try:
        when = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValidationFailed("scheduled_time must be ISO 8601, e.g. 2026-12-01T09:00:00Z.") from exc
    if when.tzinfo is None:
        raise ValidationFailed("scheduled_time must include a timezone.")
    now = datetime.now(UTC)
    if not now + timedelta(minutes=10) <= when <= now + timedelta(days=30):
        raise ValidationFailed("scheduled_time must be between 10 minutes and 30 days from now.")
    return int(when.timestamp())


@operation("facebook_get_page", P, Kind.READ, summary="Read Page information", scopes=READ)
async def get_page(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    page = await _client(ctx).page(_page_id(ctx))
    page["about"] = untrusted(page.get("about"), "facebook.page.about")
    return {"page": page}


@operation("facebook_list_posts", P, Kind.READ, summary="Read Page publishing history", scopes=READ)
async def list_posts(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await _client(ctx).posts(_page_id(ctx), min(max(int(params.get("limit", 10)), 1), 100))
    return {"posts": [{**p, "message": untrusted(p.get("message"), "facebook.post")} for p in body.get("data", [])]}


def _post_summary(p: dict[str, Any]) -> str:
    when = f" scheduled {p['scheduled_time']}" if p.get("scheduled_time") else ""
    return f"Publish Facebook Page {p.get('post_type', 'post')}{when}: {str(p.get('message', ''))[:100]}"


def build_post_params(
    *, message: str, link: str | None, post_type: str, media_url: str | None, scheduled_time: str | None
) -> dict[str, Any]:
    if post_type not in {"text", "link", "photo", "video"}:
        raise ValidationFailed("post_type must be text, link, photo or video.")
    message = check_text(message, field="message", max_length=MAX_MESSAGE, required=post_type in {"text", "link"})
    if link:
        validate_public_url(link, allowed_schemes=("https", "http"))
    if post_type in {"photo", "video"}:
        if not media_url:
            raise ValidationFailed("media_url (public HTTPS) is required for photo and video posts.")
        validate_public_url(media_url)
    validate_schedule(scheduled_time)
    return {
        "post_type": post_type,
        "message": message,
        "link": link,
        "media_url": media_url,
        "scheduled_time": scheduled_time,
    }


@operation("facebook_create_post", P, Kind.PUBLISH, summary=_post_summary, scopes=PUBLISH)
async def create_post(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    client, page = _client(ctx), _page_id(ctx)
    ts = validate_schedule(params.get("scheduled_time"))
    data: dict[str, Any] = {}
    if ts:
        data.update({"published": "false", "scheduled_publish_time": str(ts)})
    kind = params["post_type"]
    if kind in {"text", "link"}:
        data["message"] = params["message"]
        if params.get("link"):
            data["link"] = params["link"]
        body = await client.create_post(page, data)
    elif kind == "photo":
        data.update({"url": params["media_url"], "caption": params.get("message", "")})
        body = await client.create_photo(page, data)
    else:
        data.update({"file_url": params["media_url"], "description": params.get("message", "")})
        body = await client.create_video(page, data)
    return {"published": not ts, "scheduled": bool(ts), "post_id": body.get("post_id") or body.get("id")}


@operation(
    "facebook_update_post",
    P,
    Kind.EDIT,
    summary=lambda p: f"Edit Facebook post {p.get('post_id')}: {str(p.get('message', ''))[:100]}",
    scopes=PUBLISH,
)
async def update_post(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await _client(ctx).post(params["post_id"], {"message": params["message"]})
    return {"updated": bool(body.get("success", True)), "post_id": params["post_id"]}


@operation(
    "facebook_delete_post",
    P,
    Kind.DELETE,
    summary=lambda p: f"DELETE Facebook post {p.get('post_id')} (irreversible)",
    scopes=PUBLISH,
)
async def delete_post(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await _client(ctx).delete(params["post_id"])
    return {"deleted": bool(body.get("success", False)), "post_id": params["post_id"]}


@operation("facebook_get_comments", P, Kind.READ, summary="Read comments", scopes=COMMENTS)
async def get_comments(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await _client(ctx).comments(params["object_id"], min(max(int(params.get("limit", 25)), 1), 100))
    return {
        "comments": [
            {
                "comment_id": c.get("id"),
                "author": untrusted((c.get("from") or {}).get("name"), "facebook.comment.author"),
                "text": untrusted(c.get("message"), "facebook.comment"),
                "created_time": c.get("created_time"),
                "like_count": c.get("like_count"),
                "reply_count": c.get("comment_count"),
            }
            for c in body.get("data", [])
        ]
    }


@operation(
    "facebook_reply_comment",
    P,
    Kind.PUBLISH,
    summary=lambda p: f"Publicly reply to Facebook comment {p.get('comment_id')}: {str(p.get('message', ''))[:80]}",
    scopes=ENGAGE,
)
async def reply_comment(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    body = await _client(ctx).post(f"{params['comment_id']}/comments", {"message": params["message"]})
    return {"replied": True, "reply_id": body.get("id")}


@operation("facebook_get_insights", P, Kind.READ, summary="Read Page insights", scopes=INSIGHTS)
async def get_insights(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    metrics = params.get("metrics") or ["page_post_engagements"]
    if any(not m.replace("_", "").isalnum() for m in metrics):
        raise ValidationFailed("Metric names may only contain letters, digits and underscores.")
    period = params.get("period", "day")
    if period not in {"day", "week", "days_28", "lifetime"}:
        raise ValidationFailed("period must be day, week, days_28 or lifetime.")
    object_id = params.get("post_id") or _page_id(ctx)
    body = await _client(ctx).insights(object_id, metrics, period, params.get("since"), params.get("until"))
    return {
        "source": f"Meta Graph API {ctx.settings.meta_graph_version} insights",
        "metrics": [
            {
                "name": m.get("name"),
                "period": m.get("period"),
                "title": m.get("title"),
                "description": m.get("description"),
                "values": m.get("values", []),
            }
            for m in body.get("data", [])
        ],
        "notes": [
            "Meta deprecates and renames Page metrics regularly (e.g. impressions → media views "
            "in 2025–26). Missing metrics are omitted, never estimated."
        ],
    }
