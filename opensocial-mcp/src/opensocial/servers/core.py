"""OpenSocial core MCP server: unified content, brand profiles, calendar, approvals status,
analytics, reports and media validation across all platforms."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import Field

from opensocial.core.exceptions import OpenSocialError, ValidationFailed
from opensocial.servers.common import (
    current_principal,
    describe,
    get_runtime,
    main_for,
    new_server,
    run,
    tool_annotations,
    tool_error,
)
from opensocial.services import core_operations as _ops  # noqa: F401  (registers operations)

server = new_server(
    "opensocial-core",
    "OpenSocial Core",
    "Plan content once and adapt it per platform, keep brand profiles, review the unified "
    "calendar and approval queue, and read analytics reports.",
    None,
)

Platforms = list[Literal["youtube", "tiktok", "instagram", "facebook"]]


def _t(op: str, text: str) -> dict[str, Any]:
    return {"name": op, "description": describe(op, text), "annotations": tool_annotations(op)}


@server.tool(
    **_t(
        "opensocial_validate_media",
        "Inspect a local media file and validate it against each platform's requirements independently.",
    )
)
async def opensocial_validate_media(file_path: str, requirements: list[str] | None = None) -> dict[str, Any]:
    return await run("opensocial_validate_media", {"file_path": file_path, "requirements": requirements})


@server.tool(
    **_t(
        "opensocial_save_brand",
        "Create or update a brand profile (name, audience, tone, terminology, "
        "hashtags, colours, per-platform calls to action). Brands are kept separate.",
    )
)
async def opensocial_save_brand(brand: dict[str, Any], brand_id: str | None = None) -> dict[str, Any]:
    return await run("opensocial_save_brand", {"brand": brand, "brand_id": brand_id})


@server.tool(**_t("opensocial_list_brands", "List brand profiles."))
async def opensocial_list_brands() -> dict[str, Any]:
    return await run("opensocial_list_brands", {})


@server.tool(**_t("opensocial_create_content", "Create an original content item (idea or draft)."))
async def opensocial_create_content(
    title: Annotated[str, Field(min_length=1, max_length=300)],
    body: str = "",
    content_type: Literal["text", "image", "video", "document", "carousel"] = "text",
    media: list[dict[str, Any]] | None = None,
    tags: list[str] | None = None,
    brand_id: str | None = None,
    notes: str = "",
) -> dict[str, Any]:
    return await run(
        "opensocial_create_content",
        {
            "title": title,
            "body": body,
            "content_type": content_type,
            "media": media or [],
            "tags": tags or [],
            "brand_id": brand_id,
            "notes": notes,
        },
    )


@server.tool(**_t("opensocial_list_content", "List content items, optionally by status."))
async def opensocial_list_content(status: str | None = None) -> dict[str, Any]:
    return await run("opensocial_list_content", {"status": status})


@server.tool(**_t("opensocial_get_content", "Get a content item with all platform variants."))
async def opensocial_get_content(item_id: str) -> dict[str, Any]:
    return await run("opensocial_get_content", {"item_id": item_id})


@server.tool(
    **_t(
        "opensocial_adapt_content",
        "Create independent platform variants of one item "
        "(e.g. YouTube Short title/description, TikTok caption, Instagram Reel caption, Facebook text).",
    )
)
async def opensocial_adapt_content(
    item_id: str,
    platforms: Platforms,
    accounts: Annotated[dict[str, str] | None, Field(description="Optional {platform: account_id} targets")] = None,
    duration_seconds: float | None = None,
    vertical: bool | None = None,
) -> dict[str, Any]:
    return await run(
        "opensocial_adapt_content",
        {
            "item_id": item_id,
            "platforms": platforms,
            "accounts": accounts,
            "duration_seconds": duration_seconds,
            "vertical": vertical,
        },
    )


@server.tool(
    **_t(
        "opensocial_update_variant",
        "Edit a draft variant; it is re-validated against platform limits and brand restrictions.",
    )
)
async def opensocial_update_variant(
    variant_id: str,
    title: str | None = None,
    caption: str | None = None,
    hashtags: list[str] | None = None,
    media: list[dict[str, Any]] | None = None,
    account_id: str | None = None,
    format: str | None = None,
    scheduled_for: str | None = None,
    instructions: str | None = None,
) -> dict[str, Any]:
    return await run(
        "opensocial_update_variant",
        {
            "variant_id": variant_id,
            "title": title,
            "caption": caption,
            "hashtags": hashtags,
            "media": media,
            "account_id": account_id,
            "format": format,
            "scheduled_for": scheduled_for,
            "instructions": instructions,
        },
    )


@server.tool(
    **_t(
        "opensocial_set_content_status",
        "Move an item between IDEA, DRAFT, UNDER_REVIEW and ARCHIVED. "
        "APPROVED/SCHEDULED/PUBLISHED/FAILED are set only by the approval pipeline.",
    )
)
async def opensocial_set_content_status(item_id: str, status: str) -> dict[str, Any]:
    return await run("opensocial_set_content_status", {"item_id": item_id, "status": status})


@server.tool(
    name="opensocial_submit_variant",
    description="Submit a validated variant for publishing on its target account. Creates an approval "
    "request (nothing is published until the owner approves). Optional scheduled_for "
    "(ISO 8601) lets the scheduler publish it after approval.",
)
async def opensocial_submit_variant(variant_id: str, scheduled_for: str | None = None) -> dict[str, Any]:
    from datetime import UTC, datetime

    from opensocial.services.publishing_manager import submit_variant

    runtime = get_runtime()
    try:
        when = None
        if scheduled_for:
            try:
                when = datetime.fromisoformat(scheduled_for.replace("Z", "+00:00"))
            except ValueError as exc:
                raise ValidationFailed("scheduled_for must be ISO 8601.") from exc
            when = when if when.tzinfo else when.replace(tzinfo=UTC)
        return await submit_variant(runtime, current_principal(runtime), variant_id, when)
    except OpenSocialError as exc:
        raise tool_error(exc) from exc


@server.tool(**_t("opensocial_get_calendar", "Unified publishing calendar across platforms and accounts."))
async def opensocial_get_calendar(start: str | None = None, end: str | None = None) -> dict[str, Any]:
    return await run("opensocial_get_calendar", {"start": start, "end": end})


@server.tool(**_t("opensocial_list_approvals", "List approval requests (read-only; approving is owner-only)."))
async def opensocial_list_approvals(
    status: Literal["pending", "approved", "rejected", "executed", "failed", "expired", "cancelled"] | None = None,
) -> dict[str, Any]:
    return await run("opensocial_list_approvals", {"status": status})


@server.tool(**_t("opensocial_analytics_summary", "Per-platform metrics collected so far, under original names."))
async def opensocial_analytics_summary(since: str | None = None) -> dict[str, Any]:
    return await run("opensocial_analytics_summary", {"since": since})


@server.tool(**_t("opensocial_get_report", "Daily, weekly or monthly report: activity, performance, top content."))
async def opensocial_get_report(period: Literal["daily", "weekly", "monthly"]) -> dict[str, Any]:
    return await run("opensocial_get_report", {"period": period})


def main() -> None:
    main_for(server)


if __name__ == "__main__":
    main()
