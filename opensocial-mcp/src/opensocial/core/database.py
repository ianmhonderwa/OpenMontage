"""SQLAlchemy 2.x persistence. SQLite for development/tests, PostgreSQL for production.

All queries use the ORM or bound parameters; no SQL is built from user input.
"""

from __future__ import annotations

import enum
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    event,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)


def utcnow() -> datetime:
    return datetime.now(UTC)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def as_utc(value: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; normalise to aware UTC."""
    if value is None:
        return None
    return value if value.tzinfo else value.replace(tzinfo=UTC)


class Base(DeclarativeBase):
    type_annotation_map = {dict[str, Any]: JSON, list[str]: JSON}


class Platform(enum.StrEnum):
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    WHATSAPP = "whatsapp"
    KINDLE = "kindle"


class Mode(enum.StrEnum):
    OBSERVER = "observer"
    ASSISTANT = "assistant"
    AUTHORISED_MANAGER = "authorised_manager"


class AccountStatus(enum.StrEnum):
    CONNECTED = "connected"
    EXPIRED = "expired"
    REVOKED = "revoked"
    DISCONNECTED = "disconnected"


class ApprovalStatus(enum.StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTED = "executed"
    FAILED = "failed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ContentStatus(enum.StrEnum):
    IDEA = "IDEA"
    DRAFT = "DRAFT"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    SCHEDULED = "SCHEDULED"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("usr"))
    email: Mapped[str] = mapped_column(String(320), unique=True)
    display_name: Mapped[str] = mapped_column(String(200), default="")
    mode: Mapped[Mode] = mapped_column(Enum(Mode, native_enum=False), default=Mode.OBSERVER)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    accounts: Mapped[list[Account]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class ApiKey(Base):
    """Agent keys are given to MCP servers; owner keys are for humans (dashboard/CLI).

    Only owner keys can approve operations, so an AI client holding an agent key can
    never approve its own requests.
    """

    __tablename__ = "api_keys"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("key"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16))  # "agent" | "owner"
    key_hash: Mapped[str] = mapped_column(String(64), unique=True)
    label: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (UniqueConstraint("owner_id", "platform", "external_id"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("acc"))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    platform: Mapped[Platform] = mapped_column(Enum(Platform, native_enum=False), index=True)
    external_id: Mapped[str] = mapped_column(String(200))
    display_name: Mapped[str] = mapped_column(String(300), default="")
    status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus, native_enum=False), default=AccountStatus.CONNECTED
    )
    granted_scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    auth_flow: Mapped[str] = mapped_column(String(50), default="oauth2")
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Autonomy (only honoured in AUTHORISED_MANAGER mode).
    autonomy_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    autonomous_kinds: Mapped[list[str]] = mapped_column(JSON, default=list)
    daily_action_limit: Mapped[int] = mapped_column(Integer, default=0)
    meta: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    owner: Mapped[User] = relationship(back_populates="accounts")
    credential: Mapped[Credential | None] = relationship(
        back_populates="account", cascade="all, delete-orphan", uselist=False
    )


class Credential(Base):
    """Encrypted platform tokens. Plaintext never touches the database."""

    __tablename__ = "credentials"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("crd"))
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), unique=True)
    access_token_enc: Mapped[str] = mapped_column(Text)
    refresh_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_type: Mapped[str] = mapped_column(String(30), default="Bearer")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    account: Mapped[Account] = relationship(back_populates="credential")


class OAuthState(Base):
    __tablename__ = "oauth_states"
    state_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    platform: Mapped[Platform] = mapped_column(Enum(Platform, native_enum=False))
    code_verifier_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    flow: Mapped[str] = mapped_column(String(50), default="oauth2")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used: Mapped[bool] = mapped_column(Boolean, default=False)


class ApprovalRequest(Base):
    __tablename__ = "approvals"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("apr"))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    account_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    platform: Mapped[str] = mapped_column(String(30))
    operation: Mapped[str] = mapped_column(String(100))
    kind: Mapped[str] = mapped_column(String(20))
    params: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    payload_digest: Mapped[str] = mapped_column(String(64))
    summary: Mapped[str] = mapped_column(Text, default="")
    requested_by: Mapped[str] = mapped_column(String(50), default="agent")
    status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, native_enum=False), default=ApprovalStatus.PENDING, index=True
    )
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decision_note: Mapped[str] = mapped_column(Text, default="")
    result: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    content_variant_id: Mapped[str | None] = mapped_column(String(64), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    user_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    actor: Mapped[str] = mapped_column(String(20), default="agent")  # agent|owner|system
    account_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    platform: Mapped[str | None] = mapped_column(String(30), nullable=True)
    tool: Mapped[str] = mapped_column(String(100))
    operation: Mapped[str] = mapped_column(String(100))
    kind: Mapped[str] = mapped_column(String(20), default="")
    approval_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    approval_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    outcome: Mapped[str] = mapped_column(String(30))  # success|denied|approval_required|failed
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class SystemControl(Base):
    """Global emergency switches (single row, id='global')."""

    __tablename__ = "system_controls"
    id: Mapped[str] = mapped_column(String(20), primary_key=True, default="global")
    publishing_disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    messaging_disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    shutdown: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BrandProfile(Base):
    __tablename__ = "brand_profiles"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("brd"))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ContentItem(Base):
    __tablename__ = "content_items"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("cnt"))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    brand_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text, default="")
    content_type: Mapped[str] = mapped_column(String(30), default="text")
    media: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[ContentStatus] = mapped_column(Enum(ContentStatus, native_enum=False), default=ContentStatus.IDEA)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    variants: Mapped[list[ContentVariant]] = relationship(back_populates="item", cascade="all, delete-orphan")


class ContentVariant(Base):
    __tablename__ = "content_variants"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("var"))
    item_id: Mapped[str] = mapped_column(ForeignKey("content_items.id", ondelete="CASCADE"), index=True)
    platform: Mapped[Platform] = mapped_column(Enum(Platform, native_enum=False))
    account_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    format: Mapped[str] = mapped_column(String(40), default="post")
    title: Mapped[str] = mapped_column(String(300), default="")
    caption: Mapped[str] = mapped_column(Text, default="")
    hashtags: Mapped[list[str]] = mapped_column(JSON, default=list)
    media: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    instructions: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[ContentStatus] = mapped_column(Enum(ContentStatus, native_enum=False), default=ContentStatus.DRAFT)
    validation: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    approval_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    item: Mapped[ContentItem] = relationship(back_populates="variants")


class MetricSnapshot(Base):
    """Platform metrics preserved under their original names and definitions."""

    __tablename__ = "metric_snapshots"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), index=True)
    account_id: Mapped[str] = mapped_column(String(64), index=True)
    platform: Mapped[str] = mapped_column(String(30))
    object_id: Mapped[str] = mapped_column(String(200), default="")
    metric: Mapped[str] = mapped_column(String(100))
    value: Mapped[float | None] = mapped_column(nullable=True)
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    source: Mapped[str] = mapped_column(String(200), default="")


class Conversation(Base):
    """WhatsApp customer conversation (one per business number + customer)."""

    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("account_id", "customer_wa_id"),)
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("cnv"))
    owner_id: Mapped[str] = mapped_column(String(64), index=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    customer_wa_id: Mapped[str] = mapped_column(String(32))
    customer_name: Mapped[str] = mapped_column(String(200), default="")
    opted_in: Mapped[bool] = mapped_column(Boolean, default=False)
    last_inbound_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    escalated: Mapped[bool] = mapped_column(Boolean, default=False)
    escalation_reason: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="open")

    messages: Mapped[list[Message]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("msg"))
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    direction: Mapped[str] = mapped_column(String(10))  # inbound | outbound | draft
    wa_message_id: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    msg_type: Mapped[str] = mapped_column(String(30), default="text")
    body: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="received")
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class WebhookReceipt(Base):
    """Idempotency/replay record for verified webhook deliveries."""

    __tablename__ = "webhook_receipts"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BookProject(Base):
    __tablename__ = "book_projects"
    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("bok"))
    owner_id: Mapped[str] = mapped_column(String(64), index=True)
    account_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str] = mapped_column(String(300))
    status: Mapped[str] = mapped_column(String(40), default="DRAFT")
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    versions: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    checks: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    history: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Database:
    def __init__(self, url: str) -> None:
        connect_args: dict[str, Any] = {}
        if url.startswith("sqlite"):
            connect_args["check_same_thread"] = False
        self.engine: Engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)
        if url.startswith("sqlite"):

            @event.listens_for(self.engine, "connect")
            def _fk_on(dbapi_conn: Any, _record: Any) -> None:
                cursor = dbapi_conn.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()

        self._factory = sessionmaker(bind=self.engine, expire_on_commit=False)

    def create_all(self) -> None:
        Base.metadata.create_all(self.engine)

    @contextmanager
    def session(self) -> Iterator[Session]:
        session = self._factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


def get_controls(session: Session) -> SystemControl:
    controls = session.get(SystemControl, "global")
    if controls is None:
        controls = SystemControl(id="global")
        session.add(controls)
        session.flush()
    return controls
