"""Scheduled execution of *approved* operations (APScheduler).

The scheduler never creates or approves anything. It only runs approval rows that an owner
has approved with a ``scheduled_for`` time that has arrived, re-checking every policy
(mode, emergency controls, scopes, content digest) at execution time.
"""

from __future__ import annotations

import asyncio
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from opensocial.core.database import ApprovalRequest, ApprovalStatus, as_utc, utcnow
from opensocial.core.exceptions import OpenSocialError
from opensocial.core.logging import get_logger
from opensocial.core.permissions import Principal
from opensocial.core.runtime import Runtime

log = get_logger(__name__)


async def run_due(runtime: Runtime) -> list[dict[str, Any]]:
    from opensocial.services.publishing_manager import execute_approved

    with runtime.db.session() as session:
        due = [
            (a.id, a.owner_id)
            for a in session.scalars(
                select(ApprovalRequest).where(
                    ApprovalRequest.status == ApprovalStatus.APPROVED, ApprovalRequest.scheduled_for.is_not(None)
                )
            )
            if (as_utc(a.scheduled_for) or utcnow()) <= utcnow()
        ]
        for approval in session.scalars(
            select(ApprovalRequest).where(ApprovalRequest.status.in_([ApprovalStatus.PENDING, ApprovalStatus.APPROVED]))
        ):
            if (as_utc(approval.expires_at) or utcnow()) <= utcnow():
                approval.status = ApprovalStatus.EXPIRED
    results = []
    for approval_id, owner_id in due:
        owner = Principal(user_id=owner_id, role="owner")
        try:
            result = await execute_approved(runtime, owner, approval_id, actor="system", from_scheduler=True)
            results.append({"approval_id": approval_id, "ok": True, "result": result})
        except OpenSocialError as exc:
            log.warning("scheduled execution failed", extra={"approval_id": approval_id, "error": exc.code})
            results.append({"approval_id": approval_id, "ok": False, "error": exc.to_dict()})
    return results


def build_scheduler(runtime: Runtime, interval_seconds: int = 60) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        run_due, "interval", seconds=interval_seconds, args=[runtime], id="run_due", max_instances=1, coalesce=True
    )
    return scheduler


async def serve(runtime: Runtime, interval_seconds: int = 60) -> None:  # pragma: no cover - long-running
    scheduler = build_scheduler(runtime, interval_seconds)
    scheduler.start()
    try:
        while True:
            await asyncio.sleep(3600)
    finally:
        scheduler.shutdown()
