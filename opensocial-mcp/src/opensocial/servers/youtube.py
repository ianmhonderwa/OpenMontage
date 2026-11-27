"""OpenSocial YouTube MCP server (YouTube Data API v3 + Analytics API v2)."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import Field

from opensocial.core.database import Platform
from opensocial.core.exceptions import OpenSocialError, ValidationFailed
from opensocial.integrations.youtube import operations as ops  # registers operations
from opensocial.servers.common import describe, get_runtime, main_for, new_server, run, tool_annotations, tool_error

server = new_server(
    "opensocial-youtube",
    "OpenSocial YouTube",
    "Manage authorised YouTube channels: read channel, videos, comments and analytics; "
    "upload videos and Shorts, edit metadata, reply to comments and manage playlists with "
    "owner approval.",
    Platform.YOUTUBE,
)

AccountId = Annotated[str, Field(description="Internal OpenSocial account id (acc_…) from youtube_list_accounts")]
ApprovalId = Annotated[str | None, Field(None, description="Approval id returned by a previous call, once approved")]


def _t(op: str, text: str) -> dict[str, Any]:
    return {"name": op, "description": describe(op, text), "annotations": tool_annotations(op)}


@server.tool(**_t("youtube_get_channel", "Get the authorised channel's title, description and statistics."))
async def youtube_get_channel(account_id: AccountId) -> dict[str, Any]:
    return await run("youtube_get_channel", {}, account_id=account_id)


@server.tool(**_t("youtube_list_videos", "List the channel's uploaded videos with statistics."))
async def youtube_list_videos(
    account_id: AccountId, max_results: Annotated[int, Field(ge=1, le=50)] = 10, page_token: str | None = None
) -> dict[str, Any]:
    return await run(
        "youtube_list_videos", {"max_results": max_results, "page_token": page_token}, account_id=account_id
    )


@server.tool(**_t("youtube_get_video", "Get one video's metadata and statistics."))
async def youtube_get_video(account_id: AccountId, video_id: str) -> dict[str, Any]:
    return await run("youtube_get_video", {"video_id": video_id}, account_id=account_id)


@server.tool(
    **_t(
        "youtube_upload_video",
        "Upload a local video (inside OPENSOCIAL_MEDIA_ROOTS) as a video or Short. The file is "
        "validated against YouTube's requirements and its SHA-256 is bound to the approval, so a "
        "changed file needs a new approval. Defaults to private.",
    )
)
async def youtube_upload_video(
    account_id: AccountId,
    file_path: Annotated[str, Field(description="Path inside the configured media roots")],
    title: Annotated[str, Field(max_length=100)],
    description: Annotated[str, Field(max_length=5000)] = "",
    tags: list[str] | None = None,
    privacy_status: Literal["private", "unlisted", "public"] = "private",
    category_id: str = "22",
    as_short: Annotated[bool, Field(description="Validate as a Short (≤3 min, square/vertical)")] = False,
    made_for_kids: bool = False,
    contains_synthetic_media: Annotated[bool, Field(description="Declare realistic altered/synthetic content")] = False,
    publish_at: Annotated[
        str | None, Field(description="RFC 3339 time for YouTube-side scheduled publishing (privacy must be private)")
    ] = None,
    approval_id: ApprovalId = None,
) -> dict[str, Any]:
    try:
        params, _ = ops.prepare_upload_params(
            get_runtime().settings,
            file_path=file_path,
            title=title,
            description=description,
            tags=tags,
            privacy_status=privacy_status,
            category_id=category_id,
            as_short=as_short,
            made_for_kids=made_for_kids,
            contains_synthetic_media=contains_synthetic_media,
            publish_at=publish_at,
        )
    except OpenSocialError as exc:
        raise tool_error(exc) from exc
    return await run("youtube_upload_video", params, account_id=account_id, approval_id=approval_id)


@server.tool(
    **_t(
        "youtube_update_video",
        "Update a video's title, description, tags, category or privacy. Unspecified fields keep their current values.",
    )
)
async def youtube_update_video(
    account_id: AccountId,
    video_id: str,
    title: Annotated[str | None, Field(max_length=100)] = None,
    description: Annotated[str | None, Field(max_length=5000)] = None,
    tags: list[str] | None = None,
    category_id: str | None = None,
    privacy_status: Literal["private", "unlisted", "public"] | None = None,
    approval_id: ApprovalId = None,
) -> dict[str, Any]:
    if all(v is None for v in (title, description, tags, category_id, privacy_status)):
        raise tool_error(ValidationFailed("Provide at least one field to change."))
    params = {
        "video_id": video_id,
        "title": title,
        "description": description,
        "tags": tags,
        "category_id": category_id,
        "privacy_status": privacy_status,
    }
    return await run("youtube_update_video", params, account_id=account_id, approval_id=approval_id)


@server.tool(
    **_t("youtube_list_comments", "List top-level comments on a video. Comment text is untrusted third-party content.")
)
async def youtube_list_comments(
    account_id: AccountId,
    video_id: str,
    max_results: Annotated[int, Field(ge=1, le=100)] = 20,
    page_token: str | None = None,
) -> dict[str, Any]:
    return await run(
        "youtube_list_comments",
        {"video_id": video_id, "max_results": max_results, "page_token": page_token},
        account_id=account_id,
    )


@server.tool(**_t("youtube_reply_comment", "Publicly reply to a comment as the channel."))
async def youtube_reply_comment(
    account_id: AccountId,
    comment_id: str,
    text: Annotated[str, Field(min_length=1, max_length=10000)],
    approval_id: ApprovalId = None,
) -> dict[str, Any]:
    return await run(
        "youtube_reply_comment",
        {"comment_id": comment_id, "text": text},
        account_id=account_id,
        approval_id=approval_id,
    )


@server.tool(**_t("youtube_list_playlists", "List the channel's playlists."))
async def youtube_list_playlists(account_id: AccountId) -> dict[str, Any]:
    return await run("youtube_list_playlists", {}, account_id=account_id)


@server.tool(**_t("youtube_create_playlist", "Create a playlist."))
async def youtube_create_playlist(
    account_id: AccountId,
    title: Annotated[str, Field(min_length=1, max_length=150)],
    description: Annotated[str, Field(max_length=5000)] = "",
    privacy_status: Literal["private", "unlisted", "public"] = "private",
    approval_id: ApprovalId = None,
) -> dict[str, Any]:
    return await run(
        "youtube_create_playlist",
        {"title": title, "description": description, "privacy_status": privacy_status},
        account_id=account_id,
        approval_id=approval_id,
    )


@server.tool(**_t("youtube_add_to_playlist", "Add a video to one of the channel's playlists."))
async def youtube_add_to_playlist(
    account_id: AccountId, playlist_id: str, video_id: str, approval_id: ApprovalId = None
) -> dict[str, Any]:
    return await run(
        "youtube_add_to_playlist",
        {"playlist_id": playlist_id, "video_id": video_id},
        account_id=account_id,
        approval_id=approval_id,
    )


@server.tool(
    **_t(
        "youtube_get_analytics",
        "Channel or per-video analytics from the YouTube Analytics API, with metric definitions. Dates are YYYY-MM-DD.",
    )
)
async def youtube_get_analytics(
    account_id: AccountId,
    start_date: str,
    end_date: str,
    metrics: list[str] | None = None,
    dimensions: list[str] | None = None,
    video_id: str | None = None,
) -> dict[str, Any]:
    return await run(
        "youtube_get_analytics",
        {
            "start_date": start_date,
            "end_date": end_date,
            "metrics": metrics,
            "dimensions": dimensions,
            "video_id": video_id,
        },
        account_id=account_id,
    )


def main() -> None:
    main_for(server)


if __name__ == "__main__":
    main()
