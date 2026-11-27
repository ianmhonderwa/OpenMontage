"""Common analytics framework.

Metrics are stored under their original platform names, with source and collection time.
Missing values stay missing (None), and metrics are grouped per platform: a YouTube 'view'
and an Instagram 'view' are defined differently and are never summed together.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from opensocial.core.database import MetricSnapshot, utcnow

# Rough conceptual families, used only to *label* related metrics side by side; values are
# never combined across platforms.
FAMILIES = {
    "views": {"youtube:views", "tiktok:view_count", "instagram:views", "facebook:page_media_view"},
    "likes": {"youtube:likes", "tiktok:like_count", "instagram:likes"},
    "comments": {"youtube:comments", "tiktok:comment_count", "instagram:comments"},
    "shares": {"youtube:shares", "tiktok:share_count", "instagram:shares"},
    "reach": {"instagram:reach"},
    "watch_time": {"youtube:estimatedMinutesWatched"},
    "follower_change": {"youtube:subscribersGained", "youtube:subscribersLost"},
}


def record(
    session: Session,
    *,
    owner_id: str,
    account_id: str,
    platform: str,
    metrics: dict[str, Any],
    source: str,
    object_id: str = "",
    period_start: datetime | None = None,
    period_end: datetime | None = None,
) -> int:
    count = 0
    for name, value in metrics.items():
        numeric = float(value) if isinstance(value, int | float) and not isinstance(value, bool) else None
        session.add(
            MetricSnapshot(
                owner_id=owner_id,
                account_id=account_id,
                platform=platform,
                object_id=object_id,
                metric=name,
                value=numeric,
                period_start=period_start,
                period_end=period_end,
                source=source,
                collected_at=utcnow(),
            )
        )
        count += 1
    session.flush()
    return count


def record_from_result(
    session: Session, owner_id: str, account_id: str, platform: str, op: str, result: dict[str, Any]
) -> int:
    """Extract metrics from known read-operation results and persist them."""
    if op == "youtube_get_analytics":
        total = 0
        for row in result.get("rows", []):
            metrics = {k: v for k, v in row.items() if k not in {"day", "month", "video", "country"}}
            total += record(
                session,
                owner_id=owner_id,
                account_id=account_id,
                platform=platform,
                metrics=metrics,
                source=result.get("source", op),
                object_id=str(row.get("video", "")),
            )
        return total
    if op == "tiktok_get_analytics":
        return sum(
            record(
                session,
                owner_id=owner_id,
                account_id=account_id,
                platform=platform,
                metrics={k: v for k, v in r.items() if k.endswith("_count")},
                source=result.get("source", op),
                object_id=str(r.get("video_id")),
            )
            for r in result.get("videos", [])
        )
    if op in {"instagram_get_insights", "facebook_get_insights"}:
        total = 0
        for m in result.get("metrics", []):
            values = m.get("values")
            value = (
                values[-1].get("value")
                if isinstance(values, list) and values and isinstance(values[-1], dict)
                else values.get("value")
                if isinstance(values, dict)
                else None
            )
            total += record(
                session,
                owner_id=owner_id,
                account_id=account_id,
                platform=platform,
                metrics={m.get("name"): value},
                source=result.get("source", op),
                object_id=str(result.get("object_id", "")),
            )
        return total
    return 0


def summary(session: Session, owner_id: str, since: datetime | None = None) -> dict[str, Any]:
    stmt = select(MetricSnapshot).where(MetricSnapshot.owner_id == owner_id)
    if since:
        stmt = stmt.where(MetricSnapshot.collected_at >= since)
    latest: dict[tuple[str, str, str, str], MetricSnapshot] = {}
    for snap in session.scalars(stmt.order_by(MetricSnapshot.collected_at)):
        latest[(snap.platform, snap.account_id, snap.object_id, snap.metric)] = snap
    by_platform: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "metrics": defaultdict(lambda: {"value": 0.0, "objects": 0, "missing": 0}),
            "sources": set(),
            "last_collected": None,
        }
    )
    for (platform, _acc, _obj, metric), snap in latest.items():
        bucket = by_platform[platform]
        entry = bucket["metrics"][metric]
        if snap.value is None:
            entry["missing"] += 1
        else:
            entry["value"] += snap.value
            entry["objects"] += 1
        bucket["sources"].add(snap.source)
        ts = snap.collected_at.isoformat() if snap.collected_at else None
        if ts and (bucket["last_collected"] is None or ts > bucket["last_collected"]):
            bucket["last_collected"] = ts
    platforms = {
        p: {
            "metrics": {m: dict(v) for m, v in b["metrics"].items()},
            "sources": sorted(b["sources"]),
            "last_collected": b["last_collected"],
        }
        for p, b in by_platform.items()
    }
    families = {
        fam: sorted(
            k for k in keys if k.split(":")[0] in platforms and k.split(":")[1] in platforms[k.split(":")[0]]["metrics"]
        )
        for fam, keys in FAMILIES.items()
    }
    return {
        "platforms": platforms,
        "related_metric_families": {k: v for k, v in families.items() if v},
        "notes": [
            "Values are per platform under the platform's own metric definitions. Related families "
            "are shown for orientation only and are not summed across platforms."
        ],
    }
