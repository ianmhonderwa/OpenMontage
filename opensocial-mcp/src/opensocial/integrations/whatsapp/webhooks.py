"""Processing of verified WhatsApp webhook deliveries.

Signature verification happens at the HTTP layer (``X-Hub-Signature-256``) before this
module runs. Inbound text is stored as received and always surfaced to agents wrapped as
untrusted content.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from opensocial.core import audit
from opensocial.core.database import Account, AccountStatus, Conversation, Message, Platform
from opensocial.core.logging import get_logger
from opensocial.core.security import clean_text

log = get_logger(__name__)

SENSITIVE = re.compile(
    r"\b(lawyer|legal action|sue|court|refund|chargeback|fraud|scam|complaint|medical|emergency|"
    r"suicide|harm|threat|police|data (breach|leak)|unsubscribe|stop messaging|opt.?out)\b",
    re.IGNORECASE,
)
OPT_OUT = re.compile(r"^\s*(stop|unsubscribe|opt.?out)\s*$", re.IGNORECASE)


def _ts(value: Any) -> datetime:
    try:
        return datetime.fromtimestamp(int(value), UTC)
    except (TypeError, ValueError):
        return datetime.now(UTC)


def _message_text(msg: dict[str, Any]) -> str:
    kind = msg.get("type")
    if kind == "text":
        return str(msg.get("text", {}).get("body", ""))
    if kind == "button":
        return str(msg.get("button", {}).get("text", ""))
    if kind == "interactive":
        inter = msg.get("interactive", {})
        reply = inter.get("button_reply") or inter.get("list_reply") or {}
        return str(reply.get("title", ""))
    return f"[{kind} message]"


def process_payload(session: Session, payload: dict[str, Any]) -> dict[str, int]:
    counts = {"messages": 0, "statuses": 0, "ignored": 0}
    if payload.get("object") != "whatsapp_business_account":
        counts["ignored"] += 1
        return counts
    for entry in payload.get("entry", []) or []:
        for change in entry.get("changes", []) or []:
            value = change.get("value", {}) or {}
            phone_id = str(value.get("metadata", {}).get("phone_number_id", ""))
            accounts = list(
                session.scalars(
                    select(Account).where(
                        Account.platform == Platform.WHATSAPP,
                        Account.external_id == phone_id,
                        Account.status == AccountStatus.CONNECTED,
                    )
                )
            )
            if len(accounts) != 1:
                # Unknown or ambiguous number: never route data to a possibly wrong tenant.
                log.warning("whatsapp webhook for unrouted phone number", extra={"matches": len(accounts)})
                counts["ignored"] += 1
                continue
            account = accounts[0]
            names = {c.get("wa_id"): c.get("profile", {}).get("name", "") for c in value.get("contacts", []) or []}
            for msg in value.get("messages", []) or []:
                _store_inbound(session, account, msg, names)
                counts["messages"] += 1
            for status in value.get("statuses", []) or []:
                if _apply_status(session, account, status):
                    counts["statuses"] += 1
    return counts


def _store_inbound(session: Session, account: Account, msg: dict[str, Any], names: dict[str, str]) -> None:
    wa_id = str(msg.get("from", ""))[:32]
    if not wa_id.isdigit():
        return
    if session.scalar(select(Message).where(Message.wa_message_id == msg.get("id"))) is not None:
        return  # duplicate delivery
    conv = session.scalar(
        select(Conversation).where(Conversation.account_id == account.id, Conversation.customer_wa_id == wa_id)
    )
    if conv is None:
        conv = Conversation(owner_id=account.owner_id, account_id=account.id, customer_wa_id=wa_id)
        session.add(conv)
    conv.customer_name = clean_text(names.get(wa_id, conv.customer_name or ""), max_length=200)
    when = _ts(msg.get("timestamp"))
    conv.last_inbound_at = when
    text = clean_text(_message_text(msg), max_length=4096)
    if OPT_OUT.match(text):
        conv.opted_in = False
        conv.escalated = True
        conv.escalation_reason = "Customer opted out; no further messages may be sent."
    elif SENSITIVE.search(text) and not conv.escalated:
        conv.escalated = True
        conv.escalation_reason = "Automatic: message mentions a sensitive topic; human review required."
    session.add(
        Message(
            conversation=conv,
            direction="inbound",
            wa_message_id=msg.get("id"),
            msg_type=str(msg.get("type", "text")),
            body=text,
            status="received",
            ts=when,
        )
    )
    session.flush()
    audit.record(
        session,
        user_id=account.owner_id,
        actor="system",
        tool="whatsapp_webhook",
        operation="inbound_message",
        platform="whatsapp",
        account_id=account.id,
        outcome="success",
        details={"conversation_id": conv.id, "escalated": conv.escalated},
    )


def _apply_status(session: Session, account: Account, status: dict[str, Any]) -> bool:
    msg = session.scalar(
        select(Message)
        .join(Conversation)
        .where(Message.wa_message_id == status.get("id"), Conversation.account_id == account.id)
    )
    if msg is None:
        return False
    order = ["accepted", "sent", "delivered", "read"]
    new = str(status.get("status", ""))
    if new == "failed" or (new in order and (msg.status not in order or order.index(new) > order.index(msg.status))):
        msg.status = new
    return True
