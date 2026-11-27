"""Unified publishing calendar across platforms and accounts."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from opensocial.core.database import ApprovalRequest, ApprovalStatus, ContentItem, ContentVariant, as_utc


def entries(session: Session, owner_id: str, start: datetime, end: datetime) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for v in session.scalars(
        select(ContentVariant)
        .join(ContentItem)
        .where(ContentItem.owner_id == owner_id, ContentVariant.scheduled_for.is_not(None))
    ):
        when = as_utc(v.scheduled_for)
        if when and start <= when <= end:
            out.append(
                {
                    "type": "content_variant",
                    "when": when.isoformat(),
                    "platform": v.platform.value,
                    "account_id": v.account_id,
                    "title": v.title or v.caption[:80],
                    "status": v.status.value,
                    "variant_id": v.id,
                    "approval_id": v.approval_id,
                }
            )
    seen = {e["approval_id"] for e in out if e.get("approval_id")}
    for a in session.scalars(
        select(ApprovalRequest).where(
            ApprovalRequest.owner_id == owner_id,
            ApprovalRequest.scheduled_for.is_not(None),
            ApprovalRequest.status.in_([ApprovalStatus.PENDING, ApprovalStatus.APPROVED, ApprovalStatus.EXECUTED]),
        )
    ):
        when = as_utc(a.scheduled_for)
        if a.id not in seen and when and start <= when <= end:
            out.append(
                {
                    "type": "approval",
                    "when": when.isoformat(),
                    "platform": a.platform,
                    "account_id": a.account_id,
                    "title": a.summary,
                    "status": a.status.value,
                    "approval_id": a.id,
                }
            )
    return sorted(out, key=lambda e: e["when"])
