"""Daily, weekly and monthly reports built from stored metrics and the audit trail."""

from __future__ import annotations

from collections import Counter
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from opensocial.core.database import AuditLog, MetricSnapshot
from opensocial.services import analytics_manager

PERIODS = {"daily": timedelta(days=1), "weekly": timedelta(days=7), "monthly": timedelta(days=30)}


def build(session: Session, owner_id: str, period: str, *, now: datetime | None = None) -> dict[str, Any]:
    if period not in PERIODS:
        raise ValueError("period must be daily, weekly or monthly")
    end = now or datetime.now(UTC)
    start = end - PERIODS[period]
    activity = list(session.scalars(select(AuditLog).where(AuditLog.user_id == owner_id, AuditLog.ts >= start)))
    published = [a for a in activity if a.kind in {"publish", "edit", "message", "delete"} and a.outcome == "success"]
    per_platform = Counter(a.platform for a in published)
    outcomes = Counter(a.outcome for a in activity)
    top: list[dict[str, Any]] = []
    snaps = session.scalars(
        select(MetricSnapshot).where(
            MetricSnapshot.owner_id == owner_id, MetricSnapshot.collected_at >= start, MetricSnapshot.object_id != ""
        )
    )
    best: dict[tuple[str, str, str], float] = {}
    for s in snaps:
        if s.value is not None:
            key = (s.platform, s.object_id, s.metric)
            best[key] = max(best.get(key, 0.0), s.value)
    for (platform, obj, metric), value in sorted(best.items(), key=lambda kv: -kv[1])[:10]:
        top.append({"platform": platform, "object_id": obj, "metric": metric, "value": value})
    return {
        "report": period,
        "period_start": start.isoformat(),
        "period_end": end.isoformat(),
        "generated_at": datetime.now(UTC).isoformat(),
        "publishing_activity": {
            "successful_external_actions": len(published),
            "by_platform": dict(per_platform),
            "all_outcomes": dict(outcomes),
        },
        "performance": analytics_manager.summary(session, owner_id, since=start),
        "top_content_by_metric": top,
        "notes": [
            "Only metrics collected through authorised API reads during the period are included.",
            "Rankings compare objects within the same platform metric; do not compare across platforms.",
        ],
    }
