"""The guarded execution pipeline used by every MCP tool, API route and scheduled job.

    authenticate → load account (tenant check) → emergency controls → mode/scope policy
    → rate limit / quota → approval (create or verify) → execute → redact → audit

The same pipeline runs whatever the entry point, so permissions hold even if the
dashboard or MCP layer is bypassed.
"""

from __future__ import annotations

import inspect
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, TypeVar

import httpx
from sqlalchemy.orm import Session

from opensocial.core import approvals, audit
from opensocial.core.config import Settings, get_settings
from opensocial.core.database import (
    Account,
    AccountStatus,
    ApprovalStatus,
    Database,
    Platform,
    as_utc,
    utcnow,
)
from opensocial.core.exceptions import (
    ApprovalRequired,
    NotFound,
    OpenSocialError,
    PermissionDenied,
    TokenExpired,
    ValidationFailed,
)
from opensocial.core.logging import get_logger
from opensocial.core.permissions import Decision, Kind, Principal, evaluate, get_owned_account
from opensocial.core.rate_limits import DEFAULT_LIMITS, YOUTUBE_QUOTA_COST, limiter
from opensocial.core.security import TokenCipher, redact

log = get_logger(__name__)

ClientT = TypeVar("ClientT")
Executor = Callable[["OperationContext", dict[str, Any]], Awaitable[dict[str, Any]] | dict[str, Any]]


@dataclass(frozen=True)
class OperationSpec:
    name: str
    platform: Platform | str
    kind: Kind
    executor: Executor
    summary: Callable[[dict[str, Any]], str]
    scopes: frozenset[str] = frozenset()
    needs_account: bool = True
    description: str = ""


OPERATIONS: dict[str, OperationSpec] = {}


def register(spec: OperationSpec) -> OperationSpec:
    OPERATIONS[spec.name] = spec
    return spec


def operation(
    name: str,
    platform: Platform | str,
    kind: Kind,
    *,
    summary: Callable[[dict[str, Any]], str] | str,
    scopes: tuple[str, ...] = (),
    needs_account: bool = True,
) -> Callable[[Executor], Executor]:
    def decorator(fn: Executor) -> Executor:
        summariser = summary if callable(summary) else (lambda _p, s=summary: s)
        register(
            OperationSpec(
                name=name,
                platform=platform,
                kind=kind,
                executor=fn,
                summary=summariser,
                scopes=frozenset(scopes),
                needs_account=needs_account,
                description=(fn.__doc__ or "").strip(),
            )
        )
        return fn

    return decorator


TransportFactory = Callable[[Platform | str], httpx.AsyncBaseTransport]


def platform_name(platform: Platform | str) -> str:
    return platform.value if isinstance(platform, Platform) else platform


@dataclass
class OperationContext:
    runtime: Runtime
    session: Session
    principal: Principal
    account: Account | None
    spec: OperationSpec
    extras: dict[str, Any] = field(default_factory=dict)

    @property
    def settings(self) -> Settings:
        return self.runtime.settings

    def access_token(self) -> str:
        if self.account is None or self.account.credential is None:
            raise PermissionDenied("This account has no stored credentials. Reconnect it.")
        expires = as_utc(self.account.token_expires_at)
        if expires is not None and expires <= utcnow() and not self.account.credential.refresh_token_enc:
            self.account.status = AccountStatus.EXPIRED
            raise TokenExpired("The access token has expired. Reconnect the account.")
        return self.runtime.cipher.decrypt(self.account.credential.access_token_enc)

    def client(self, cls: Callable[..., ClientT]) -> ClientT:
        return cls(
            self.access_token(),
            transport=self.runtime.transport_for(self.spec.platform),
            timeout=self.settings.http_timeout_seconds,
            account_meta=dict(self.account.meta or {}) if self.account else {},
        )


class Runtime:
    def __init__(
        self,
        settings: Settings | None = None,
        *,
        database: Database | None = None,
        transport_factory: TransportFactory | None = None,
        cipher: TokenCipher | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.db = database or Database(self.settings.database_url)
        self._transport_factory = transport_factory
        self._cipher = cipher

    @property
    def cipher(self) -> TokenCipher:
        if self._cipher is None:
            keys = self.settings.encryption_keys.get_secret_value() if self.settings.encryption_keys else ""
            self._cipher = TokenCipher(keys.split(","))
        return self._cipher

    def transport_for(self, platform: Platform | str) -> httpx.AsyncBaseTransport | None:
        if self._transport_factory is not None:
            return self._transport_factory(platform)
        if self.settings.demo_mode:
            from opensocial.integrations.mock import mock_transport

            return mock_transport(platform)
        return None

    @property
    def environment_label(self) -> str:
        return "demo-mock" if self.settings.demo_mode else "live"

    # ----------------------------------------------------------------------------------

    async def execute(
        self,
        principal: Principal,
        op_name: str,
        params: dict[str, Any],
        *,
        account_id: str | None = None,
        approval_id: str | None = None,
        tool: str | None = None,
        actor: str = "agent",
        scheduled_for: datetime | None = None,
        content_variant_id: str | None = None,
        _from_scheduler: bool = False,
    ) -> dict[str, Any]:
        spec = OPERATIONS.get(op_name)
        if spec is None:
            raise NotFound(f"Unknown operation '{op_name}'.")
        tool_name = tool or op_name
        error: OpenSocialError | None = None
        result: dict[str, Any] = {}

        with self.db.session() as session:
            account: Account | None = None
            approval = None
            try:
                if spec.needs_account:
                    if not account_id:
                        raise ValidationFailed("account_id is required for this operation.")
                    account = get_owned_account(
                        session, principal, account_id, spec.platform if isinstance(spec.platform, Platform) else None
                    )
                decision = evaluate(session, principal, spec.kind, account=account, required_scopes=spec.scopes)
                self._rate_limit(principal, spec, account)

                if decision == Decision.REQUIRE_APPROVAL:
                    if approval_id is None:
                        approval = approvals.create(
                            session,
                            principal,
                            operation=spec.name,
                            kind=spec.kind.value,
                            platform=platform_name(spec.platform),
                            account_id=account.id if account else None,
                            params=params,
                            summary=spec.summary(params),
                            ttl_hours=self.settings.approval_ttl_hours,
                            scheduled_for=scheduled_for,
                            content_variant_id=content_variant_id,
                        )
                        audit.record(
                            session,
                            user_id=principal.user_id,
                            actor=actor,
                            tool=tool_name,
                            operation=spec.name,
                            kind=spec.kind.value,
                            account_id=account.id if account else None,
                            platform=platform_name(spec.platform),
                            approval_id=approval.id,
                            approval_status=approval.status.value,
                            outcome="approval_required",
                        )
                        result = {
                            "status": "approval_required",
                            "approval_id": approval.id,
                            "message": (
                                "This operation needs the account owner's approval. Nothing has "
                                "been published or sent. The owner can review it in the dashboard "
                                f"or run `opensocial approvals approve {approval.id}`; then call this "
                                "tool again with the same arguments and approval_id."
                            ),
                            "approval": approvals.to_dict(approval),
                        }
                        return self._finish(result)
                    approval = approvals.consume(
                        session,
                        principal,
                        approval_id,
                        operation=spec.name,
                        account_id=account.id if account else None,
                        params=params,
                    )
                    sched = as_utc(approval.scheduled_for)
                    if sched is not None and sched > utcnow() and not _from_scheduler:
                        raise PermissionDenied(
                            f"This approval is scheduled for {sched.isoformat()}; the scheduler will run it then."
                        )

                await self._refresh_if_needed(session, account)
                ctx = OperationContext(self, session, principal, account, spec)
                outcome = spec.executor(ctx, params)
                result = await outcome if inspect.isawaitable(outcome) else outcome
                result = redact(result)
                if account is not None and spec.kind == Kind.READ:
                    account.last_sync_at = utcnow()
                    from opensocial.services.analytics_manager import record_from_result

                    record_from_result(
                        session, principal.user_id, account.id, platform_name(spec.platform), spec.name, result
                    )
                if approval is not None:
                    approval.status = ApprovalStatus.EXECUTED
                    approval.result = result
                    if approval.content_variant_id:
                        from opensocial.services.publishing_manager import mark_variant_published

                        mark_variant_published(session, approval.content_variant_id, result)
                audit.record(
                    session,
                    user_id=principal.user_id,
                    actor=actor,
                    tool=tool_name,
                    operation=spec.name,
                    kind=spec.kind.value,
                    account_id=account.id if account else None,
                    platform=platform_name(spec.platform),
                    approval_id=approval.id if approval else None,
                    approval_status=approval.status.value if approval else None,
                    outcome="success",
                )
            except OpenSocialError as exc:
                error = exc
                if isinstance(exc, TokenExpired) and account is not None:
                    account.status = AccountStatus.EXPIRED
                if (
                    approval is not None
                    and approval.status == ApprovalStatus.APPROVED
                    and not isinstance(exc, PermissionDenied)
                ):
                    approval.status = ApprovalStatus.FAILED
                    approval.result = exc.to_dict()
                    if approval.content_variant_id:
                        from opensocial.services.publishing_manager import sync_after_decision

                        sync_after_decision(session, approval)
                outcome_label = "denied" if exc.http_status in (401, 403, 404, 423) else "failed"
                audit.record(
                    session,
                    user_id=principal.user_id,
                    actor=actor,
                    tool=tool_name,
                    operation=spec.name,
                    kind=spec.kind.value,
                    account_id=account.id if account else account_id,
                    platform=platform_name(spec.platform),
                    approval_id=approval_id,
                    approval_status=approval.status.value if approval else None,
                    outcome=outcome_label,
                    failure_reason=exc.message,
                )
        if error is not None:
            raise error
        return self._finish(result)

    async def _refresh_if_needed(self, session: Session, account: Account | None) -> None:
        if account is None or account.credential is None or not account.credential.refresh_token_enc:
            return
        expires = as_utc(account.token_expires_at)
        if expires is None or expires - utcnow() > timedelta(minutes=2):
            return
        from opensocial.integrations.oauth import refresh_access_token

        await refresh_access_token(session, self.cipher, self.settings, account, self.transport_for(account.platform))

    def _finish(self, result: dict[str, Any]) -> dict[str, Any]:
        return {"environment": self.environment_label, **result}

    def _rate_limit(self, principal: Principal, spec: OperationSpec, account: Account | None) -> None:
        capacity, per = DEFAULT_LIMITS[spec.kind.value]
        scope = account.id if account else principal.user_id
        limiter.check(f"{scope}:{spec.kind.value}", capacity=capacity, per_seconds=per)
        if spec.platform == Platform.YOUTUBE and spec.name in YOUTUBE_QUOTA_COST:
            limiter.check(
                f"{scope}:youtube_quota",
                capacity=10_000,
                per_seconds=86_400,
                cost=YOUTUBE_QUOTA_COST[spec.name],
            )

    async def execute_approved(
        self, owner: Principal, approval_id: str, *, actor: str = "owner", from_scheduler: bool = False
    ) -> dict[str, Any]:
        """Run an approved request on the owner's instruction (dashboard/CLI/scheduler)."""
        with self.db.session() as session:
            approval = approvals.get_owned(session, owner, approval_id)
            if approval.status != ApprovalStatus.APPROVED:
                raise ApprovalRequired(f"Approval is {approval.status.value}; it must be approved first.")
            op, params, account_id = approval.operation, dict(approval.params), approval.account_id
        return await self.execute(
            owner,
            op,
            params,
            account_id=account_id,
            approval_id=approval_id,
            tool=f"{actor}:execute_approved",
            actor=actor,
            _from_scheduler=from_scheduler,
        )
