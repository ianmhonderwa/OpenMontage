"""Unified content engine: one original item, independently adapted per platform.

Adaptation is deterministic and conservative. It restructures the original message for each
platform's format and limits, applies only brand-configured hashtags and calls to action,
and never invents claims. The AI client is expected to refine the wording; every edit is
re-validated against platform limits and brand restrictions.
"""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from opensocial.core.database import ContentItem, ContentStatus, ContentVariant, Platform, utcnow
from opensocial.core.exceptions import NotFound, ValidationFailed
from opensocial.services import brand_manager

LIMITS: dict[str, dict[str, int]] = {
    "youtube": {"title": 100, "caption": 5000, "hashtags": 15},
    "tiktok": {"title": 0, "caption": 2200, "hashtags": 30},
    "instagram": {"title": 0, "caption": 2200, "hashtags": 30},
    "facebook": {"title": 0, "caption": 63206, "hashtags": 30},
}
DEFAULT_HASHTAGS = {"youtube": 3, "tiktok": 5, "instagram": 10, "facebook": 2}
PUBLISHABLE = {"youtube", "tiktok", "instagram", "facebook"}

TRANSITIONS: dict[ContentStatus, set[ContentStatus]] = {
    ContentStatus.IDEA: {ContentStatus.DRAFT, ContentStatus.ARCHIVED},
    ContentStatus.DRAFT: {ContentStatus.UNDER_REVIEW, ContentStatus.IDEA, ContentStatus.ARCHIVED},
    ContentStatus.UNDER_REVIEW: {ContentStatus.DRAFT, ContentStatus.APPROVED, ContentStatus.ARCHIVED},
    ContentStatus.APPROVED: {
        ContentStatus.SCHEDULED,
        ContentStatus.PUBLISHED,
        ContentStatus.DRAFT,
        ContentStatus.FAILED,
    },
    ContentStatus.SCHEDULED: {ContentStatus.PUBLISHED, ContentStatus.FAILED, ContentStatus.APPROVED},
    ContentStatus.PUBLISHED: {ContentStatus.ARCHIVED},
    ContentStatus.FAILED: {ContentStatus.DRAFT, ContentStatus.ARCHIVED},
    ContentStatus.ARCHIVED: {ContentStatus.DRAFT},
}
# Only the approval/publishing pipeline may set these (never the agent directly).
SYSTEM_ONLY = {ContentStatus.APPROVED, ContentStatus.SCHEDULED, ContentStatus.PUBLISHED, ContentStatus.FAILED}


def create_item(session: Session, owner_id: str, data: dict[str, Any]) -> ContentItem:
    title = str(data.get("title", "")).strip()
    if not title or len(title) > 300:
        raise ValidationFailed("title is required (max 300 characters).")
    if data.get("brand_id"):
        brand_manager.get(session, owner_id, data["brand_id"])
    if data.get("content_type", "text") not in {"text", "image", "video", "document", "carousel"}:
        raise ValidationFailed("content_type must be text, image, video, document or carousel.")
    item = ContentItem(
        owner_id=owner_id,
        title=title,
        body=str(data.get("body", ""))[:20000],
        content_type=data.get("content_type", "text"),
        media=list(data.get("media", []))[:20],
        tags=[str(t).lstrip("#") for t in data.get("tags", [])][:50],
        brand_id=data.get("brand_id"),
        notes=str(data.get("notes", ""))[:5000],
        status=ContentStatus.DRAFT if data.get("body") else ContentStatus.IDEA,
    )
    session.add(item)
    session.flush()
    return item


def get_item(session: Session, owner_id: str, item_id: str) -> ContentItem:
    item = session.scalar(select(ContentItem).where(ContentItem.id == item_id, ContentItem.owner_id == owner_id))
    if item is None:
        raise NotFound("Content item not found.")
    return item


def get_variant(session: Session, owner_id: str, variant_id: str) -> ContentVariant:
    variant = session.scalar(
        select(ContentVariant)
        .join(ContentItem)
        .where(ContentVariant.id == variant_id, ContentItem.owner_id == owner_id)
    )
    if variant is None:
        raise NotFound("Content variant not found.")
    return variant


def list_items(session: Session, owner_id: str, status: str | None = None) -> list[ContentItem]:
    stmt = select(ContentItem).where(ContentItem.owner_id == owner_id)
    if status:
        stmt = stmt.where(ContentItem.status == ContentStatus(status))
    return list(session.scalars(stmt.order_by(ContentItem.updated_at.desc()).limit(200)))


def set_item_status(session: Session, owner_id: str, item_id: str, status: str, *, system: bool = False) -> ContentItem:
    item = get_item(session, owner_id, item_id)
    target = ContentStatus(status)
    if target in SYSTEM_ONLY and not system:
        raise ValidationFailed(f"{target.value} is set by the approval and publishing pipeline, not directly.")
    if target not in TRANSITIONS[item.status]:
        raise ValidationFailed(f"Cannot move content from {item.status.value} to {target.value}.")
    item.status, item.updated_at = target, utcnow()
    return item


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]


def _hashtags(item: ContentItem, brand: dict[str, Any] | None, platform: str) -> list[str]:
    prefs = (brand or {}).get("platforms", {}).get(platform, {}) or {}
    limit = prefs.get("max_hashtags")
    limit = DEFAULT_HASHTAGS[platform] if limit is None else limit
    ordered: list[str] = []
    for tag in [*(brand or {}).get("hashtags", []), *item.tags]:
        tag = re.sub(r"\W", "", tag)
        if tag and tag.lower() not in {t.lower() for t in ordered}:
            ordered.append(tag)
    return ordered[:limit]


def _cta(brand: dict[str, Any] | None, platform: str) -> str:
    return ((brand or {}).get("platforms", {}).get(platform, {}) or {}).get("call_to_action") or ""


def adapt(
    item: ContentItem,
    platform: str,
    brand: dict[str, Any] | None,
    *,
    duration_seconds: float | None = None,
    vertical: bool | None = None,
) -> dict[str, Any]:
    sentences = _sentences(item.body) or [item.title]
    hook, rest = sentences[0], " ".join(sentences[1:])
    tags = _hashtags(item, brand, platform)
    cta = _cta(brand, platform)
    tag_line = " ".join(f"#{t}" for t in tags)
    is_video = item.content_type == "video"
    if platform == "youtube":
        short = bool(is_video and duration_seconds is not None and duration_seconds <= 180 and vertical)
        fmt = "short" if short else ("video" if is_video else "community_post")
        title = item.title[:100]
        desc_parts = [item.body.strip(), cta, tag_line + (" #Shorts" if short else "")]
        return {
            "format": fmt,
            "title": title,
            "caption": "\n\n".join(p for p in desc_parts if p).strip(),
            "hashtags": tags + (["Shorts"] if short else []),
            "notes": ["YouTube: keyword-rich title first; first lines of the description show above the fold."],
        }
    if platform == "tiktok":
        caption = " ".join(p for p in [hook, cta, tag_line] if p)
        return {
            "format": "video" if is_video else "photo",
            "title": "",
            "caption": caption[:2200],
            "hashtags": tags,
            "notes": ["TikTok: lead with the hook; the first seconds of the video carry the message."],
        }
    if platform == "instagram":
        body = " ".join(_sentences(rest)[:2])
        blocks = [hook, body, cta, tag_line]
        return {
            "format": "reel" if is_video else ("carousel" if item.content_type == "carousel" else "image"),
            "title": "",
            "caption": "\n\n".join(b for b in blocks if b)[:2200],
            "hashtags": tags,
            "notes": ["Instagram: short first line (it is truncated in the feed); hashtags at the end."],
        }
    if platform == "facebook":
        blocks = [item.body.strip() or item.title, cta, tag_line]
        return {
            "format": "video" if is_video else ("photo" if item.content_type == "image" else "text"),
            "title": "",
            "caption": "\n\n".join(b for b in blocks if b),
            "hashtags": tags,
            "notes": ["Facebook: full conversational text works; use few hashtags."],
        }
    raise ValidationFailed(f"Adaptation is not available for '{platform}'.")


def validate_variant(
    platform: str, title: str, caption: str, hashtags: list[str], brand: dict[str, Any] | None
) -> dict[str, Any]:
    limits = LIMITS[platform]
    errors: list[str] = []
    warnings: list[str] = []
    if limits["title"] and len(title) > limits["title"]:
        errors.append(f"Title exceeds {limits['title']} characters.")
    if platform == "youtube" and not title.strip():
        errors.append("YouTube requires a title.")
    if len(caption) > limits["caption"]:
        errors.append(f"Caption exceeds {limits['caption']} characters.")
    count = len(re.findall(r"(?<!\w)#\w+", caption))
    if count > limits["hashtags"]:
        errors.append(f"{count} hashtags exceed the {limits['hashtags']} limit.")
    terms = brand_manager.check_terms(f"{title} {caption}", brand)
    if terms["restricted_found"]:
        errors.append(f"Restricted brand terms used: {terms['restricted_found']}.")
    if platform == "youtube" and re.search(r"[<>]", title):
        errors.append("YouTube titles cannot contain '<' or '>'.")
    if not caption.strip() and platform != "youtube":
        warnings.append("Caption is empty.")
    return {"valid": not errors, "errors": errors, "warnings": warnings, "brand_terms": terms}


def adapt_item(
    session: Session,
    owner_id: str,
    item_id: str,
    platforms: list[str],
    *,
    accounts: dict[str, str] | None = None,
    duration_seconds: float | None = None,
    vertical: bool | None = None,
) -> list[ContentVariant]:
    item = get_item(session, owner_id, item_id)
    brand = brand_manager.to_dict(brand_manager.get(session, owner_id, item.brand_id)) if item.brand_id else None
    variants = []
    for platform in platforms:
        if platform not in PUBLISHABLE:
            raise ValidationFailed(f"Unsupported platform for adaptation: {platform}")
        draft = adapt(item, platform, brand, duration_seconds=duration_seconds, vertical=vertical)
        validation = validate_variant(platform, draft["title"], draft["caption"], draft["hashtags"], brand)
        variant = ContentVariant(
            item=item,
            platform=Platform(platform),
            account_id=(accounts or {}).get(platform),
            format=draft["format"],
            title=draft["title"],
            caption=draft["caption"],
            hashtags=draft["hashtags"],
            media=list(item.media),
            instructions="; ".join(draft["notes"]),
            validation=validation,
        )
        session.add(variant)
        variants.append(variant)
    if item.status == ContentStatus.IDEA:
        item.status = ContentStatus.DRAFT
    item.updated_at = utcnow()
    session.flush()
    return variants


def update_variant(session: Session, owner_id: str, variant_id: str, changes: dict[str, Any]) -> ContentVariant:
    variant = get_variant(session, owner_id, variant_id)
    if variant.status not in {ContentStatus.DRAFT, ContentStatus.FAILED}:
        raise ValidationFailed(f"Variant is {variant.status.value}; only drafts can be edited.")
    for key in ("title", "caption", "instructions", "format", "account_id"):
        if key in changes and changes[key] is not None:
            setattr(variant, key, str(changes[key]))
    if changes.get("hashtags") is not None:
        variant.hashtags = [str(h).lstrip("#") for h in changes["hashtags"]][:30]
    if changes.get("media") is not None:
        variant.media = list(changes["media"])[:20]
    if changes.get("scheduled_for") is not None:
        variant.scheduled_for = changes["scheduled_for"]
    item = variant.item
    brand = brand_manager.to_dict(brand_manager.get(session, owner_id, item.brand_id)) if item.brand_id else None
    variant.validation = validate_variant(
        variant.platform.value, variant.title, variant.caption, variant.hashtags, brand
    )
    variant.updated_at = utcnow()
    session.flush()
    return variant


def variant_dict(v: ContentVariant) -> dict[str, Any]:
    return {
        "variant_id": v.id,
        "item_id": v.item_id,
        "platform": v.platform.value,
        "account_id": v.account_id,
        "format": v.format,
        "title": v.title,
        "caption": v.caption,
        "hashtags": v.hashtags,
        "media": v.media,
        "instructions": v.instructions,
        "status": v.status.value,
        "validation": v.validation,
        "scheduled_for": v.scheduled_for.isoformat() if v.scheduled_for else None,
        "approval_id": v.approval_id,
        "external_id": v.external_id,
    }


def item_dict(item: ContentItem, include_variants: bool = True) -> dict[str, Any]:
    data = {
        "item_id": item.id,
        "title": item.title,
        "body": item.body,
        "content_type": item.content_type,
        "media": item.media,
        "tags": item.tags,
        "brand_id": item.brand_id,
        "status": item.status.value,
        "notes": item.notes,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }
    if include_variants:
        data["variants"] = [variant_dict(v) for v in item.variants]
    return data
