"""Human approval queue.

Approvals are bound to the exact operation, account and parameters through a SHA-256
digest. Only a principal with the *owner* role can approve; agent keys (held by MCP
servers) cannot. Text produced by an AI claiming that the user approved is never accepted
as authorisation: the only accepted evidence is an APPROVED row written by an owner.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from opensocial.core.database import ApprovalRequest, ApprovalStatus, as_utc, utcnow
from opensocial.core.exceptions import NotFound, PermissionDenied, ValidationFailed
from opensocial.core.permissions import Principal
from opensocial.core.security import canonical_digest, redact


def operation_digest(operation: str, account_id: str | None, params: dict[str, Any]) -> str:
    return canonical_digest({"operation": operation, "account_id": account_id, "params": params})


def create(
    session: Session,
    principal: Principal,
    *,
    operation: str,
    kind: str,
    platform: str,
    account_id: str | None,
    params: dict[str, Any],
    summary: str,
    ttl_hours: int,
    scheduled_for: datetime | None = None,
    content_variant_id: str | None = None,
) -> ApprovalRequest:
    digest = operation_digest(operation, account_id, params)
    existing = session.scalar(
        select(ApprovalRequest).where(
            ApprovalRequest.owner_id == principal.user_id,
            ApprovalRequest.payload_digest == digest,
            ApprovalRequest.status == ApprovalStatus.PENDING,
        )
    )
    if existing is not None and as_utc(existing.expires_at) > utcnow():  # type: ignore[operator]
        return existing
    approval = ApprovalRequest(
        owner_id=principal.user_id,
        account_id=account_id,
        platform=platform,
        operation=operation,
        kind=kind,
        params=params,
        payload_digest=digest,
        summary=summary,
        requested_by=principal.role,
        scheduled_for=scheduled_for,
        expires_at=utcnow() + timedelta(hours=ttl_hours),
        content_variant_id=content_variant_id,
    )
    session.add(approval)
    session.flush()
    return approval


def get_owned(session: Session, principal: Principal, approval_id: str) -> ApprovalRequest:
    approval = session.scalar(
        select(ApprovalRequest).where(ApprovalRequest.id == approval_id, ApprovalRequest.owner_id == principal.user_id)
    )
    if approval is None:
        raise NotFound(f"Approval '{approval_id}' was not found.")
    _expire_if_needed(approval)
    return approval


def _expire_if_needed(approval: ApprovalRequest) -> None:
    if approval.status in {ApprovalStatus.PENDING, ApprovalStatus.APPROVED}:
        expires = as_utc(approval.expires_at)
        if expires is not None and expires <= utcnow():
            approval.status = ApprovalStatus.EXPIRED


def decide(
    session: Session,
    principal: Principal,
    approval_id: str,
    *,
    approve: bool,
    note: str = "",
    scheduled_for: datetime | None = None,
) -> ApprovalRequest:
    if not principal.is_owner:
        raise PermissionDenied(
            "Only the account owner (owner key, dashboard or CLI) can approve or reject. "
            "AI agents cannot approve their own requests."
        )
    approval = get_owned(session, principal, approval_id)
    if approval.status != ApprovalStatus.PENDING:
        raise ValidationFailed(f"Approval is already {approval.status.value}.")
    approval.status = ApprovalStatus.APPROVED if approve else ApprovalStatus.REJECTED
    approval.decided_by = principal.user_id
    approval.decided_at = utcnow()
    approval.decision_note = note[:2000]
    if scheduled_for is not None:
        approval.scheduled_for = scheduled_for.astimezone(UTC)
    session.flush()
    return approval


def cancel(session: Session, principal: Principal, approval_id: str) -> ApprovalRequest:
    approval = get_owned(session, principal, approval_id)
    if approval.status not in {ApprovalStatus.PENDING, ApprovalStatus.APPROVED}:
        raise ValidationFailed(f"Approval is already {approval.status.value}.")
    approval.status = ApprovalStatus.CANCELLED
    session.flush()
    return approval


def consume(
    session: Session,
    principal: Principal,
    approval_id: str,
    *,
    operation: str,
    account_id: str | None,
    params: dict[str, Any],
) -> ApprovalRequest:
    """Validate that an APPROVED request matches exactly what is about to run."""
    approval = get_owned(session, principal, approval_id)
    if approval.status != ApprovalStatus.APPROVED:
        raise PermissionDenied(f"Approval '{approval_id}' is {approval.status.value}, not approved by the owner.")
    if approval.payload_digest != operation_digest(operation, account_id, params):
        raise PermissionDenied(
            "The approved content does not match this request. Any change to the content, "
            "target account or settings needs a new approval."
        )
    return approval


def list_for_owner(
    session: Session, principal: Principal, status: ApprovalStatus | None = None, limit: int = 100
) -> list[ApprovalRequest]:
    stmt = select(ApprovalRequest).where(ApprovalRequest.owner_id == principal.user_id)
    if status is not None:
        stmt = stmt.where(ApprovalRequest.status == status)
    rows = list(session.scalars(stmt.order_by(ApprovalRequest.created_at.desc()).limit(limit)))
    for row in rows:
        _expire_if_needed(row)
    return rows


def to_dict(approval: ApprovalRequest) -> dict[str, Any]:
    return {
        "approval_id": approval.id,
        "status": approval.status.value,
        "operation": approval.operation,
        "kind": approval.kind,
        "platform": approval.platform,
        "account_id": approval.account_id,
        "summary": approval.summary,
        "content": redact(approval.params),
        "scheduled_for": approval.scheduled_for.isoformat() if approval.scheduled_for else None,
        "requested_by": approval.requested_by,
        "decided_by": approval.decided_by,
        "decided_at": approval.decided_at.isoformat() if approval.decided_at else None,
        "created_at": approval.created_at.isoformat() if approval.created_at else None,
        "expires_at": approval.expires_at.isoformat() if approval.expires_at else None,
        "result": approval.result,
    }
