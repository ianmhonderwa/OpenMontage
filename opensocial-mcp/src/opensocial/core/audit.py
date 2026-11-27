"""Append-only audit trail. Every entry is redacted before it is stored."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from opensocial.core.database import AuditLog
from opensocial.core.security import redact, redact_text


def record(
    session: Session,
    *,
    user_id: str | None,
    tool: str,
    operation: str,
    outcome: str,
    actor: str = "agent",
    account_id: str | None = None,
    platform: str | None = None,
    kind: str = "",
    approval_id: str | None = None,
    approval_status: str | None = None,
    failure_reason: str | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        actor=actor,
        account_id=account_id,
        platform=platform,
        tool=tool,
        operation=operation,
        kind=kind,
        approval_id=approval_id,
        approval_status=approval_status,
        outcome=outcome,
        failure_reason=redact_text(failure_reason)[:2000] if failure_reason else None,
        details=redact(details or {}),
    )
    session.add(entry)
    session.flush()
    return entry


def query(
    session: Session,
    *,
    user_id: str,
    limit: int = 100,
    account_id: str | None = None,
    since: datetime | None = None,
) -> list[AuditLog]:
    stmt = select(AuditLog).where(AuditLog.user_id == user_id)
    if account_id:
        stmt = stmt.where(AuditLog.account_id == account_id)
    if since:
        stmt = stmt.where(AuditLog.ts >= since)
    stmt = stmt.order_by(AuditLog.id.desc()).limit(min(max(limit, 1), 1000))
    return list(session.scalars(stmt))


def to_dict(entry: AuditLog) -> dict[str, Any]:
    return {
        "id": entry.id,
        "ts": entry.ts.isoformat() if entry.ts else None,
        "user_id": entry.user_id,
        "actor": entry.actor,
        "account_id": entry.account_id,
        "platform": entry.platform,
        "tool": entry.tool,
        "operation": entry.operation,
        "kind": entry.kind,
        "approval_id": entry.approval_id,
        "approval_status": entry.approval_status,
        "outcome": entry.outcome,
        "failure_reason": entry.failure_reason,
        "details": entry.details,
    }
