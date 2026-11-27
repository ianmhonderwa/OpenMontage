"""Turns approved content variants into platform operations and keeps statuses in sync."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.orm import Session

from opensocial.core.database import ApprovalRequest, ApprovalStatus, ContentStatus, ContentVariant, utcnow
from opensocial.core.exceptions import ValidationFailed
from opensocial.core.permissions import Principal
from opensocial.core.runtime import Runtime
from opensocial.services import content_manager


def build_operation(runtime: Runtime, variant: ContentVariant) -> tuple[str, dict[str, Any]]:
    """Map a variant to the exact platform operation and parameters it would run."""
    platform, media = variant.platform.value, variant.media or []
    settings = runtime.settings
    first = media[0] if media else {}
    if platform == "youtube":
        from opensocial.integrations.youtube.operations import prepare_upload_params

        if not first.get("file_path"):
            raise ValidationFailed("YouTube variants need a local video file (media[0].file_path).")
        params, _ = prepare_upload_params(
            settings,
            file_path=first["file_path"],
            title=variant.title,
            description=variant.caption,
            tags=variant.hashtags,
            privacy_status=first.get("privacy_status", "private"),
            category_id=str(first.get("category_id", "22")),
            as_short=variant.format == "short",
            made_for_kids=bool(first.get("made_for_kids", False)),
            contains_synthetic_media=bool(first.get("contains_synthetic_media", False)),
            publish_at=None,
        )
        return "youtube_upload_video", params
    if platform == "tiktok":
        from opensocial.integrations.tiktok.operations import build_post_params

        if not first.get("file_path"):
            raise ValidationFailed("TikTok variants need a local video file (media[0].file_path).")
        mode = first.get("mode", "draft")
        params, _ = build_post_params(
            settings,
            file_path=first["file_path"],
            title=variant.caption,
            privacy_level=first.get("privacy_level", "SELF_ONLY"),
            disable_comment=False,
            disable_duet=False,
            disable_stitch=False,
            brand_content_toggle=False,
            brand_organic_toggle=False,
            is_aigc=bool(first.get("is_aigc", False)),
            mode=mode,
        )
        return ("tiktok_publish_video" if mode == "direct" else "tiktok_upload_draft"), params
    if platform == "instagram":
        from opensocial.integrations.instagram.operations import build_publish_params

        urls = [m["url"] for m in media if m.get("url")]
        media_type = {"reel": "REELS", "carousel": "CAROUSEL", "image": "IMAGE", "story": "STORIES"}.get(
            variant.format, "IMAGE"
        )
        return "instagram_publish_media", build_publish_params(
            media_type=media_type, caption=variant.caption, media_urls=urls
        )
    if platform == "facebook":
        from opensocial.integrations.facebook.operations import build_post_params as fb_params

        post_type = variant.format if variant.format in {"photo", "video", "text", "link"} else "text"
        return "facebook_create_post", fb_params(
            message=variant.caption,
            link=first.get("link"),
            post_type=post_type,
            media_url=first.get("url"),
            scheduled_time=None,
        )
    raise ValidationFailed(f"Publishing variants for {platform} is not supported.")


async def submit_variant(
    runtime: Runtime, principal: Principal, variant_id: str, scheduled_for: datetime | None = None
) -> dict[str, Any]:
    with runtime.db.session() as session:
        variant = content_manager.get_variant(session, principal.user_id, variant_id)
        if not variant.account_id:
            raise ValidationFailed("Assign a target account_id to the variant first.")
        if not variant.validation.get("valid"):
            raise ValidationFailed("Variant has validation errors.", details={"validation": variant.validation})
        if variant.status not in {ContentStatus.DRAFT, ContentStatus.FAILED, ContentStatus.UNDER_REVIEW}:
            raise ValidationFailed(f"Variant is {variant.status.value}.")
        op, params = build_operation(runtime, variant)
        account_id = variant.account_id
    when = scheduled_for.astimezone(UTC) if scheduled_for else None
    result = await runtime.execute(
        principal,
        op,
        params,
        account_id=account_id,
        tool="opensocial_submit_variant",
        scheduled_for=when,
        content_variant_id=variant_id,
    )
    with runtime.db.session() as session:
        variant = content_manager.get_variant(session, principal.user_id, variant_id)
        if result.get("status") == "approval_required":
            variant.status = ContentStatus.UNDER_REVIEW
            variant.approval_id = result["approval_id"]
            variant.scheduled_for = when
            if variant.item.status in {ContentStatus.DRAFT, ContentStatus.IDEA}:
                variant.item.status = ContentStatus.UNDER_REVIEW
        else:
            _mark_published(variant, result)
    return result


def _mark_published(variant: ContentVariant, result: dict[str, Any]) -> None:
    variant.status = ContentStatus.PUBLISHED
    variant.external_id = (
        str(result.get("video_id") or result.get("media_id") or result.get("post_id") or result.get("publish_id") or "")
        or None
    )
    variant.updated_at = utcnow()
    item = variant.item
    if all(v.status == ContentStatus.PUBLISHED for v in item.variants):
        item.status = ContentStatus.PUBLISHED


def sync_after_decision(session: Session, approval: ApprovalRequest) -> None:
    if not approval.content_variant_id:
        return
    variant = session.get(ContentVariant, approval.content_variant_id)
    if variant is None:
        return
    if approval.status == ApprovalStatus.APPROVED:
        variant.status = ContentStatus.SCHEDULED if approval.scheduled_for else ContentStatus.APPROVED
    elif approval.status in {ApprovalStatus.REJECTED, ApprovalStatus.CANCELLED, ApprovalStatus.EXPIRED}:
        variant.status, variant.approval_id = ContentStatus.DRAFT, None
    elif approval.status == ApprovalStatus.FAILED:
        variant.status = ContentStatus.FAILED
    variant.updated_at = utcnow()


def mark_variant_published(session: Session, variant_id: str, result: dict[str, Any]) -> None:
    variant = session.get(ContentVariant, variant_id)
    if variant is not None:
        _mark_published(variant, result)


async def execute_approved(
    runtime: Runtime, owner: Principal, approval_id: str, *, actor: str = "owner", from_scheduler: bool = False
) -> dict[str, Any]:
    return await runtime.execute_approved(owner, approval_id, actor=actor, from_scheduler=from_scheduler)
