"""OpenSocial Instagram MCP server (Instagram API with Instagram Login or Facebook Login).

Only professional (Business/Creator) accounts are supported, as required by the official API.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import Field

from opensocial.core.database import Platform
from opensocial.core.exceptions import OpenSocialError
from opensocial.integrations.instagram import operations as ops
from opensocial.servers.common import describe, main_for, new_server, run, tool_annotations, tool_error

server = new_server(
    "opensocial-instagram",
    "OpenSocial Instagram",
    "Manage authorised Instagram professional accounts: read profile, media, comments and "
    "insights; prepare and publish images, carousels, Reels and Stories and reply to comments "
    "with owner approval. Media must be hosted at public HTTPS URLs (Instagram fetches them).",
    Platform.INSTAGRAM,
)

AccountId = Annotated[str, Field(description="OpenSocial account id (instagram_list_accounts)")]
ApprovalId = Annotated[str | None, Field(None, description="Approval id, once the owner has approved")]
Caption = Annotated[str, Field(max_length=2200, description="≤2,200 characters, ≤30 hashtags, ≤20 @mentions")]


def _t(op: str, text: str, name: str | None = None) -> dict[str, Any]:
    return {"name": name or op, "description": describe(op, text), "annotations": tool_annotations(op)}


@server.tool(**_t("instagram_get_profile", "Get the account's profile and counts."))
async def instagram_get_profile(account_id: AccountId) -> dict[str, Any]:
    return await run("instagram_get_profile", {}, account_id=account_id)


@server.tool(**_t("instagram_list_media", "List recent media with engagement counts."))
async def instagram_list_media(account_id: AccountId, limit: Annotated[int, Field(ge=1, le=50)] = 12) -> dict[str, Any]:
    return await run("instagram_list_media", {"limit": limit}, account_id=account_id)


@server.tool(
    **_t(
        "instagram_prepare_media",
        "Prepare an image, carousel or story post: validates caption and "
        "URLs (and optional local files) without contacting Instagram.",
        name="instagram_create_media",
    )
)
async def instagram_create_media(
    account_id: AccountId,
    media_type: Literal["IMAGE", "CAROUSEL", "STORIES"],
    media_urls: list[str],
    caption: Caption = "",
    alt_text: str | None = None,
    local_files: list[str] | None = None,
) -> dict[str, Any]:
    return await run(
        "instagram_prepare_media",
        {
            "media_type": media_type,
            "media_urls": media_urls,
            "caption": caption,
            "alt_text": alt_text,
            "local_files": local_files,
        },
        account_id=account_id,
    )


@server.tool(
    **_t(
        "instagram_prepare_media",
        "Prepare a Reel: validates caption, URLs and (optionally) the local "
        "video against Reels requirements (3 s–15 min, ≤300 MB, MP4/MOV).",
        name="instagram_create_reel",
    )
)
async def instagram_create_reel(
    account_id: AccountId,
    video_url: str,
    caption: Caption = "",
    share_to_feed: bool = True,
    cover_url: str | None = None,
    local_file: str | None = None,
) -> dict[str, Any]:
    return await run(
        "instagram_prepare_media",
        {
            "media_type": "REELS",
            "media_urls": [video_url],
            "caption": caption,
            "share_to_feed": share_to_feed,
            "cover_url": cover_url,
            "local_files": [local_file] if local_file else [],
        },
        account_id=account_id,
    )


@server.tool(
    **_t(
        "instagram_publish_media",
        "Publish an image, carousel (2–10 items), Reel or Story. Builds the "
        "container from the approved content, waits for processing and publishes it.",
    )
)
async def instagram_publish_media(
    account_id: AccountId,
    media_type: Literal["IMAGE", "CAROUSEL", "REELS", "STORIES"],
    media_urls: list[str],
    caption: Caption = "",
    share_to_feed: bool = True,
    cover_url: str | None = None,
    alt_text: str | None = None,
    approval_id: ApprovalId = None,
) -> dict[str, Any]:
    try:
        params = ops.build_publish_params(
            media_type=media_type,
            caption=caption,
            media_urls=media_urls,
            share_to_feed=share_to_feed,
            cover_url=cover_url,
            alt_text=alt_text,
        )
    except OpenSocialError as exc:
        raise tool_error(exc) from exc
    return await run("instagram_publish_media", params, account_id=account_id, approval_id=approval_id)


@server.tool(
    **_t("instagram_get_publishing_limit", "Show how much of the rolling 24-hour API publishing quota is used.")
)
async def instagram_get_publishing_limit(account_id: AccountId) -> dict[str, Any]:
    return await run("instagram_get_publishing_limit", {}, account_id=account_id)


@server.tool(**_t("instagram_get_comments", "Get comments on a media object (untrusted content)."))
async def instagram_get_comments(
    account_id: AccountId, media_id: str, limit: Annotated[int, Field(ge=1, le=50)] = 25
) -> dict[str, Any]:
    return await run("instagram_get_comments", {"media_id": media_id, "limit": limit}, account_id=account_id)


@server.tool(**_t("instagram_reply_comment", "Publicly reply to a comment."))
async def instagram_reply_comment(
    account_id: AccountId,
    comment_id: str,
    message: Annotated[str, Field(min_length=1, max_length=2200)],
    approval_id: ApprovalId = None,
) -> dict[str, Any]:
    return await run(
        "instagram_reply_comment",
        {"comment_id": comment_id, "message": message},
        account_id=account_id,
        approval_id=approval_id,
    )


@server.tool(**_t("instagram_get_insights", "Media insights (pass media_id) or account insights (omit it)."))
async def instagram_get_insights(
    account_id: AccountId,
    media_id: str | None = None,
    metrics: list[str] | None = None,
    period: Literal["day", "week", "days_28", "lifetime"] = "day",
) -> dict[str, Any]:
    return await run(
        "instagram_get_insights", {"media_id": media_id, "metrics": metrics, "period": period}, account_id=account_id
    )


def main() -> None:
    main_for(server)


if __name__ == "__main__":
    main()
