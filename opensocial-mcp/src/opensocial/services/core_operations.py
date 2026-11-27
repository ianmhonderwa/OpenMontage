"""Cross-platform operations (content, brand, calendar, analytics, reports, media checks)
registered with the guarded runtime under the pseudo-platform 'core'."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from pydantic import ValidationError

from opensocial.core import approvals
from opensocial.core.database import ApprovalStatus
from opensocial.core.exceptions import ValidationFailed
from opensocial.core.media import REQUIREMENTS, inspect_media, validate_for
from opensocial.core.permissions import Kind
from opensocial.core.runtime import OperationContext, operation
from opensocial.core.security import resolve_media_path
from opensocial.services import analytics_manager, brand_manager, calendar_manager, content_manager, reporting_manager

CORE = "core"


def _parse_time(value: str | None, default: datetime) -> datetime:
    if not value:
        return default
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValidationFailed("Times must be ISO 8601.") from exc
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


@operation("opensocial_validate_media", CORE, Kind.ANALYSE, summary="Validate media", needs_account=False)
def validate_media(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    path = resolve_media_path(params["file_path"], ctx.settings.media_roots)
    info = inspect_media(path)
    keys = params.get("requirements") or [k for k, r in REQUIREMENTS.items() if info.kind in r.kinds]
    unknown = set(keys) - set(REQUIREMENTS)
    if unknown:
        raise ValidationFailed(f"Unknown requirements {sorted(unknown)}; available: {sorted(REQUIREMENTS)}")
    return {"media": info.to_dict(), "results": {k: validate_for(info, k) for k in keys}}


@operation("opensocial_save_brand", CORE, Kind.PREPARE, summary="Save brand profile", needs_account=False)
def save_brand(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    try:
        brand = brand_manager.save(ctx.session, ctx.principal.user_id, params["brand"], params.get("brand_id"))
    except ValidationError as exc:
        raise ValidationFailed("Invalid brand profile.", details={"errors": exc.errors(include_url=False)}) from exc
    return {"brand": brand_manager.to_dict(brand)}


@operation("opensocial_list_brands", CORE, Kind.READ, summary="List brand profiles", needs_account=False)
def list_brands(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    return {"brands": [brand_manager.to_dict(b) for b in brand_manager.list_for(ctx.session, ctx.principal.user_id)]}


@operation("opensocial_create_content", CORE, Kind.PREPARE, summary="Create content item", needs_account=False)
def create_content(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    return {"item": content_manager.item_dict(content_manager.create_item(ctx.session, ctx.principal.user_id, params))}


@operation("opensocial_list_content", CORE, Kind.READ, summary="List content", needs_account=False)
def list_content(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    items = content_manager.list_items(ctx.session, ctx.principal.user_id, params.get("status"))
    return {"items": [content_manager.item_dict(i, include_variants=False) for i in items]}


@operation("opensocial_get_content", CORE, Kind.READ, summary="Get content item", needs_account=False)
def get_content(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    return {
        "item": content_manager.item_dict(
            content_manager.get_item(ctx.session, ctx.principal.user_id, params["item_id"])
        )
    }


@operation("opensocial_adapt_content", CORE, Kind.PREPARE, summary="Adapt content per platform", needs_account=False)
def adapt_content(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    variants = content_manager.adapt_item(
        ctx.session,
        ctx.principal.user_id,
        params["item_id"],
        params["platforms"],
        accounts=params.get("accounts"),
        duration_seconds=params.get("duration_seconds"),
        vertical=params.get("vertical"),
    )
    return {
        "variants": [content_manager.variant_dict(v) for v in variants],
        "guidance": "Each variant is a starting point that preserves the original message. Refine wording per "
        "platform with opensocial_update_variant; edits are re-validated.",
    }


@operation("opensocial_update_variant", CORE, Kind.PREPARE, summary="Edit a platform variant", needs_account=False)
def update_variant(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    changes = {k: v for k, v in params.items() if k != "variant_id"}
    if changes.get("scheduled_for"):
        changes["scheduled_for"] = _parse_time(changes["scheduled_for"], datetime.now(UTC))
    variant = content_manager.update_variant(ctx.session, ctx.principal.user_id, params["variant_id"], changes)
    return {"variant": content_manager.variant_dict(variant)}


@operation("opensocial_set_content_status", CORE, Kind.PREPARE, summary="Change content status", needs_account=False)
def set_status(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    item = content_manager.set_item_status(ctx.session, ctx.principal.user_id, params["item_id"], params["status"])
    return {"item": content_manager.item_dict(item, include_variants=False)}


@operation("opensocial_get_calendar", CORE, Kind.READ, summary="Read calendar", needs_account=False)
def get_calendar(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(UTC)
    start = _parse_time(params.get("start"), now - timedelta(days=1))
    end = _parse_time(params.get("end"), now + timedelta(days=30))
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "entries": calendar_manager.entries(ctx.session, ctx.principal.user_id, start, end),
    }


@operation("opensocial_list_approvals", CORE, Kind.READ, summary="List approvals", needs_account=False)
def list_approvals(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    status = ApprovalStatus(params["status"]) if params.get("status") else None
    rows = approvals.list_for_owner(ctx.session, ctx.principal, status)
    return {"approvals": [approvals.to_dict(a) for a in rows]}


@operation("opensocial_analytics_summary", CORE, Kind.READ, summary="Analytics summary", needs_account=False)
def analytics_summary(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    since = _parse_time(params.get("since"), datetime.now(UTC) - timedelta(days=30))
    return analytics_manager.summary(ctx.session, ctx.principal.user_id, since=since)


@operation("opensocial_get_report", CORE, Kind.READ, summary="Build report", needs_account=False)
def get_report(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    if params.get("period") not in reporting_manager.PERIODS:
        raise ValidationFailed("period must be daily, weekly or monthly.")
    return reporting_manager.build(ctx.session, ctx.principal.user_id, params["period"])
