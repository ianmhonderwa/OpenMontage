"""Operating modes, operation kinds and the central authorisation policy.

The policy is enforced in the backend for every MCP tool call, API call and scheduled
job. The dashboard is only a client: bypassing it does not bypass these checks.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from opensocial.core.database import (
    Account,
    AccountStatus,
    AuditLog,
    Mode,
    Platform,
    User,
    get_controls,
)
from opensocial.core.exceptions import EmergencyStop, NotFound, PermissionDenied


class Kind(enum.StrEnum):
    READ = "read"  # read remote data
    ANALYSE = "analyse"  # local computation only, no writes
    PREPARE = "prepare"  # create/edit local drafts
    EDIT = "edit"  # change existing remote content
    PUBLISH = "publish"  # create new public remote content (incl. public comment replies)
    MESSAGE = "message"  # send a private external message
    DELETE = "delete"  # destructive remote change


REMOTE_WRITE_KINDS = {Kind.EDIT, Kind.PUBLISH, Kind.MESSAGE, Kind.DELETE}


class Decision(enum.StrEnum):
    ALLOW = "allow"
    REQUIRE_APPROVAL = "require_approval"


@dataclass(frozen=True)
class Principal:
    user_id: str
    role: str  # "agent" | "owner"
    key_id: str | None = None

    @property
    def is_owner(self) -> bool:
        return self.role == "owner"


def get_user(session: Session, principal: Principal) -> User:
    user = session.get(User, principal.user_id)
    if user is None:
        raise NotFound("User not found.")
    return user


def get_owned_account(
    session: Session, principal: Principal, account_id: str, platform: Platform | None = None
) -> Account:
    """Tenant isolation: an account is only visible to its owner. Foreign accounts are
    reported as 'not found' so their existence is not disclosed."""
    account = session.scalar(select(Account).where(Account.id == account_id, Account.owner_id == principal.user_id))
    if account is None or (platform is not None and account.platform != platform):
        raise NotFound(f"Account '{account_id}' was not found for this user.")
    return account


def actions_today(session: Session, account_id: str, kinds: set[str]) -> int:
    since = datetime.now(UTC) - timedelta(hours=24)
    stmt = select(func.count(AuditLog.id)).where(
        AuditLog.account_id == account_id,
        AuditLog.kind.in_(kinds),
        AuditLog.outcome == "success",
        AuditLog.ts >= since,
    )
    return int(session.scalar(stmt) or 0)


def evaluate(
    session: Session,
    principal: Principal,
    kind: Kind,
    *,
    account: Account | None = None,
    required_scopes: frozenset[str] = frozenset(),
) -> Decision:
    """Return ALLOW or REQUIRE_APPROVAL, or raise PermissionDenied / EmergencyStop."""
    user = get_user(session, principal)
    controls = get_controls(session)

    if controls.shutdown:
        raise EmergencyStop("Emergency shutdown is active. All operations are suspended.")
    if user.suspended:
        raise PermissionDenied("This user is suspended. Contact the administrator.")
    if kind in {Kind.EDIT, Kind.PUBLISH, Kind.DELETE} and controls.publishing_disabled:
        raise EmergencyStop("Publishing is disabled system-wide (emergency control).")
    if kind == Kind.MESSAGE and controls.messaging_disabled:
        raise EmergencyStop("Outgoing messages are disabled system-wide (emergency control).")

    if account is not None and (kind in REMOTE_WRITE_KINDS | {Kind.READ} or required_scopes):
        if account.status != AccountStatus.CONNECTED and account.platform != Platform.KINDLE:
            raise PermissionDenied(f"Account is {account.status.value}. Reconnect it before using platform operations.")
        missing = missing_scopes(required_scopes, account.granted_scopes or [])
        if missing:
            raise PermissionDenied(
                "The account has not granted the permission(s) this operation needs.",
                details={"missing_scopes": missing},
            )

    if kind in {Kind.READ, Kind.ANALYSE}:
        return Decision.ALLOW
    if principal.is_owner:
        # The human owner acting through the dashboard/CLI: local drafts are allowed in any
        # mode; external actions still go through an explicit confirm (approval) step.
        return Decision.ALLOW if kind == Kind.PREPARE else Decision.REQUIRE_APPROVAL
    if user.mode == Mode.OBSERVER:
        raise PermissionDenied(
            f"OBSERVER mode does not allow '{kind.value}' operations. The account owner can "
            "switch to ASSISTANT mode with `opensocial mode set assistant`."
        )
    if kind == Kind.PREPARE:
        return Decision.ALLOW
    if kind == Kind.DELETE:
        return Decision.REQUIRE_APPROVAL  # destructive actions always need confirmation
    autonomous = (
        user.mode == Mode.AUTHORISED_MANAGER
        and account is not None
        and account.autonomy_enabled
        and kind.value in (account.autonomous_kinds or [])
        and account.daily_action_limit > 0
    )
    if autonomous and account is not None:
        used = actions_today(session, account.id, set(account.autonomous_kinds))
        if used < account.daily_action_limit:
            return Decision.ALLOW
    return Decision.REQUIRE_APPROVAL


def missing_scopes(required: frozenset[str], granted: list[str]) -> list[str]:
    """A required scope written as 'a|b' is satisfied by either a or b."""
    granted_set = set(granted)
    return sorted(s for s in required if not set(s.split("|")) & granted_set)
