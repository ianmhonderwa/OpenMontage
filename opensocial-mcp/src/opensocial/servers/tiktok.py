"""OpenSocial TikTok MCP server (Login Kit, Display API, Content Posting API).

Direct posting needs TikTok's app audit; unaudited apps can only post privately
(SELF_ONLY). Draft upload sends the video to the creator's TikTok inbox to finish there.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import Field

from opensocial.core.database import Platform
from opensocial.core.exceptions import OpenSocialError
from opensocial.integrations.tiktok import operations as ops
from opensocial.servers.common import describe, get_runtime, main_for, new_server, run, tool_annotations, tool_error

server = new_server(
    "opensocial-tiktok",
    "OpenSocial TikTok",
    "Manage authorised TikTok creator accounts: read profile and videos, check posting "
    "permissions, upload drafts or direct-post videos with owner approval, and track status.",
    Platform.TIKTOK,
)

AccountId = Annotated[str, Field(description="OpenSocial account id (tiktok_list_accounts)")]
ApprovalId = Annotated[str | None, Field(None, description="Approval id, once the owner has approved")]
Privacy = Literal["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"]


def _t(op: str, text: str, name: str | None = None) -> dict[str, Any]:
    return {"name": name or op, "description": describe(op, text), "annotations": tool_annotations(op)}


@server.tool(**_t("tiktok_get_profile", "Get the authorised creator's profile."))
async def tiktok_get_profile(account_id: AccountId) -> dict[str, Any]:
    return await run("tiktok_get_profile", {}, account_id=account_id)


@server.tool(**_t("tiktok_list_videos", "List the creator's public videos with counts."))
async def tiktok_list_videos(
    account_id: AccountId, max_count: Annotated[int, Field(ge=1, le=20)] = 10, cursor: int | None = None
) -> dict[str, Any]:
    return await run("tiktok_list_videos", {"max_count": max_count, "cursor": cursor}, account_id=account_id)


@server.tool(
    **_t(
        "tiktok_get_creator_info",
        "Query the creator's current posting options (privacy levels, "
        "max duration, interaction settings). TikTok requires this before every direct post.",
    )
)
async def tiktok_get_creator_info(account_id: AccountId) -> dict[str, Any]:
    return await run("tiktok_get_creator_info", {}, account_id=account_id)


async def _post(
    op: str,
    mode: str,
    account_id: str,
    file_path: str,
    caption: str,
    privacy_level: str,
    disable_comment: bool,
    disable_duet: bool,
    disable_stitch: bool,
    brand_content_toggle: bool,
    brand_organic_toggle: bool,
    is_aigc: bool,
    approval_id: str | None,
) -> dict[str, Any]:
    try:
        params, _ = ops.build_post_params(
            get_runtime().settings,
            file_path=file_path,
            title=caption,
            privacy_level=privacy_level,
            disable_comment=disable_comment,
            disable_duet=disable_duet,
            disable_stitch=disable_stitch,
            brand_content_toggle=brand_content_toggle,
            brand_organic_toggle=brand_organic_toggle,
            is_aigc=is_aigc,
            mode=mode,
        )
    except OpenSocialError as exc:
        raise tool_error(exc) from exc
    return await run(op, params, account_id=account_id, approval_id=approval_id)


@server.tool(
    **_t(
        "tiktok_upload_draft",
        "Upload a local video to the creator's TikTok inbox as a draft "
        "(video.upload). The creator completes the post in the TikTok app.",
        name="tiktok_upload_video",
    )
)
async def tiktok_upload_video(
    account_id: AccountId,
    file_path: str,
    caption: Annotated[str, Field(max_length=2200)] = "",
    is_aigc: bool = False,
    approval_id: ApprovalId = None,
) -> dict[str, Any]:
    return await _post(
        "tiktok_upload_draft",
        "draft",
        account_id,
        file_path,
        caption,
        "SELF_ONLY",
        False,
        False,
        False,
        False,
        False,
        is_aigc,
        approval_id,
    )


@server.tool(
    **_t(
        "tiktok_publish_video",
        "Direct-post a local video (video.publish; requires TikTok app audit "
        "for non-private visibility). privacy_level must be one of the creator's current options. "
        "Set brand_content_toggle/brand_organic_toggle truthfully for promotional content.",
    )
)
async def tiktok_publish_video(
    account_id: AccountId,
    file_path: str,
    privacy_level: Privacy,
    caption: Annotated[str, Field(max_length=2200)] = "",
    disable_comment: bool = False,
    disable_duet: bool = False,
    disable_stitch: bool = False,
    brand_content_toggle: bool = False,
    brand_organic_toggle: bool = False,
    is_aigc: bool = False,
    approval_id: ApprovalId = None,
) -> dict[str, Any]:
    return await _post(
        "tiktok_publish_video",
        "direct",
        account_id,
        file_path,
        caption,
        privacy_level,
        disable_comment,
        disable_duet,
        disable_stitch,
        brand_content_toggle,
        brand_organic_toggle,
        is_aigc,
        approval_id,
    )


@server.tool(**_t("tiktok_get_video_status", "Fetch the processing/publishing status for a publish_id."))
async def tiktok_get_video_status(account_id: AccountId, publish_id: str) -> dict[str, Any]:
    return await run("tiktok_get_video_status", {"publish_id": publish_id}, account_id=account_id)


@server.tool(
    **_t(
        "tiktok_get_analytics",
        "Per-video lifetime public counters (views, likes, comments, shares) "
        "from the Display API. Not period analytics.",
    )
)
async def tiktok_get_analytics(account_id: AccountId, video_ids: list[str] | None = None) -> dict[str, Any]:
    return await run("tiktok_get_analytics", {"video_ids": video_ids or []}, account_id=account_id)


def main() -> None:
    main_for(server)


if __name__ == "__main__":
    main()
