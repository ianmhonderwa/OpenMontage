"""WhatsApp Business operations with messaging-policy safeguards:

* No cold outreach: free-form messages only to customers who messaged first, inside the
  24-hour customer-service window.
* Outside the window, only APPROVED templates, and only to contacts with recorded opt-in.
* Escalated conversations (sensitive topics, opt-outs, manual escalation) are blocked for
  the agent until a human resolves them.
* One recipient per call: there is no bulk-send tool.
"""

from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

from sqlalchemy import select

from opensocial.core.database import Conversation, Message, Platform, as_utc, utcnow
from opensocial.core.exceptions import NotFound, PermissionDenied, ValidationFailed
from opensocial.core.permissions import Kind
from opensocial.core.runtime import OperationContext, operation
from opensocial.integrations.common import check_text, untrusted
from opensocial.integrations.whatsapp.client import WhatsAppClient

P = Platform.WHATSAPP
MESSAGING = ("whatsapp_business_messaging",)
MANAGEMENT = ("whatsapp_business_management",)
WINDOW = timedelta(hours=24)
WA_ID = re.compile(r"^\d{6,15}$")


def _client(ctx: OperationContext) -> WhatsAppClient:
    client = ctx.client(WhatsAppClient)
    client.version = ctx.settings.meta_graph_version
    return client


def _conversation(ctx: OperationContext, conversation_id: str) -> Conversation:
    assert ctx.account is not None
    conv = ctx.session.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.account_id == ctx.account.id,
            Conversation.owner_id == ctx.principal.user_id,
        )
    )
    if conv is None:
        raise NotFound("Conversation not found for this account.")
    return conv


def _conv_dict(conv: Conversation, include_messages: bool = False, limit: int = 20) -> dict[str, Any]:
    last = as_utc(conv.last_inbound_at)
    data: dict[str, Any] = {
        "conversation_id": conv.id,
        "customer_wa_id": conv.customer_wa_id,
        "customer_name": untrusted(conv.customer_name, "whatsapp.contact.name"),
        "opted_in": conv.opted_in,
        "escalated": conv.escalated,
        "escalation_reason": conv.escalation_reason,
        "last_inbound_at": last.isoformat() if last else None,
        "service_window_open": bool(last and utcnow() - last < WINDOW),
    }
    if include_messages:
        msgs = sorted(conv.messages, key=lambda m: as_utc(m.ts) or utcnow())[-limit:]
        data["messages"] = [
            {
                "message_id": m.id,
                "direction": m.direction,
                "status": m.status,
                "type": m.msg_type,
                "ts": (as_utc(m.ts) or utcnow()).isoformat(),
                "body": untrusted(m.body, "whatsapp.customer_message") if m.direction == "inbound" else m.body,
            }
            for m in msgs
        ]
    return data


@operation("whatsapp_get_phone_number", P, Kind.READ, summary="Read business phone number", scopes=MANAGEMENT)
async def get_phone_number(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    assert ctx.account is not None
    return {"phone_number": await _client(ctx).phone_number(ctx.account.external_id)}


@operation("whatsapp_list_templates", P, Kind.READ, summary="List message templates", scopes=MANAGEMENT)
async def list_templates(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    assert ctx.account is not None
    waba = (ctx.account.meta or {}).get("waba_id")
    if not waba:
        raise ValidationFailed("This number has no WhatsApp Business Account id (waba_id) recorded.")
    body = await _client(ctx).templates(waba)
    return {
        "templates": [
            {k: t.get(k) for k in ("name", "status", "language", "category", "components")}
            for t in body.get("data", [])
        ]
    }


@operation("whatsapp_list_conversations", P, Kind.READ, summary="List customer conversations")
def list_conversations(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    assert ctx.account is not None
    stmt = select(Conversation).where(
        Conversation.account_id == ctx.account.id, Conversation.owner_id == ctx.principal.user_id
    )
    if params.get("escalated_only"):
        stmt = stmt.where(Conversation.escalated.is_(True))
    convs = list(ctx.session.scalars(stmt.order_by(Conversation.last_inbound_at.desc()).limit(100)))
    return {"conversations": [_conv_dict(c) for c in convs]}


@operation("whatsapp_get_conversation", P, Kind.READ, summary="Read a conversation")
def get_conversation(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    conv = _conversation(ctx, params["conversation_id"])
    return {"conversation": _conv_dict(conv, include_messages=True, limit=int(params.get("limit", 20)))}


@operation("whatsapp_prepare_reply", P, Kind.PREPARE, summary="Prepare a draft reply")
def prepare_reply(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    conv = _conversation(ctx, params["conversation_id"])
    text = check_text(params["text"], field="text", max_length=4096, required=True)
    draft = Message(conversation=conv, direction="draft", body=text, status="draft")
    ctx.session.add(draft)
    ctx.session.flush()
    window = _conv_dict(conv)["service_window_open"]
    return {
        "draft_id": draft.id,
        "conversation_id": conv.id,
        "text": text,
        "can_send_free_form": window and not conv.escalated,
        "requires_human": conv.escalated,
        "guidance": (
            "Conversation is escalated; a human must reply."
            if conv.escalated
            else "Inside the 24-hour window: send with whatsapp_send_message."
            if window
            else "Outside the 24-hour window: only an approved template may be sent, with opt-in."
        ),
    }


@operation("whatsapp_escalate_conversation", P, Kind.ANALYSE, summary="Escalate to a human")
def escalate(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    """Always permitted: escalating to a human can only reduce automation."""
    conv = _conversation(ctx, params["conversation_id"])
    conv.escalated = True
    conv.escalation_reason = check_text(params.get("reason", "Escalated by assistant"), field="reason", max_length=500)
    return {"escalated": True, "conversation_id": conv.id}


def _find_conversation_for(ctx: OperationContext, to: str) -> Conversation:
    assert ctx.account is not None
    conv = ctx.session.scalar(
        select(Conversation).where(
            Conversation.account_id == ctx.account.id,
            Conversation.customer_wa_id == to,
            Conversation.owner_id == ctx.principal.user_id,
        )
    )
    if conv is None:
        raise PermissionDenied(
            "No conversation exists with this number. Unsolicited outreach is not "
            "supported; the customer must contact the business first or opt in."
        )
    if conv.escalated:
        raise PermissionDenied(f"Conversation is escalated to a human: {conv.escalation_reason}")
    return conv


def _record_outbound(
    ctx: OperationContext, conv: Conversation, body: dict[str, Any], kind: str, text: str
) -> dict[str, Any]:
    wamid = (body.get("messages") or [{}])[0].get("id")
    msg = Message(
        conversation=conv, direction="outbound", wa_message_id=wamid, msg_type=kind, body=text, status="accepted"
    )
    ctx.session.add(msg)
    ctx.session.flush()
    return {"sent": True, "message_id": msg.id, "wa_message_id": wamid, "status": "accepted"}


@operation(
    "whatsapp_send_message",
    P,
    Kind.MESSAGE,
    summary=lambda p: f"Send WhatsApp message to +{p.get('to')}: {str(p.get('text', ''))[:100]}",
    scopes=MESSAGING,
)
async def send_message(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    assert ctx.account is not None
    conv = _find_conversation_for(ctx, params["to"])
    last = as_utc(conv.last_inbound_at)
    if not last or utcnow() - last >= WINDOW:
        raise PermissionDenied(
            "The 24-hour customer service window is closed. Use an approved template "
            "(whatsapp_send_template) for a contact who has opted in."
        )
    payload = {"to": params["to"], "type": "text", "text": {"body": params["text"], "preview_url": False}}
    body = await _client(ctx).send(ctx.account.external_id, payload)
    return _record_outbound(ctx, conv, body, "text", params["text"])


@operation(
    "whatsapp_send_template",
    P,
    Kind.MESSAGE,
    summary=lambda p: f"Send WhatsApp template '{p.get('template_name')}' ({p.get('language')}) to +{p.get('to')}",
    scopes=MESSAGING,
)
async def send_template(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    assert ctx.account is not None
    conv = _find_conversation_for(ctx, params["to"])
    if not conv.opted_in:
        raise PermissionDenied(
            "This contact has no recorded opt-in. The owner must record opt-in "
            "(dashboard or `opensocial whatsapp opt-in`) before templates can be sent."
        )
    client = _client(ctx)
    waba = (ctx.account.meta or {}).get("waba_id")
    if waba:
        templates = (await client.templates(waba)).get("data", [])
        match = [
            t for t in templates if t.get("name") == params["template_name"] and t.get("language") == params["language"]
        ]
        if not match or match[0].get("status") != "APPROVED":
            raise PermissionDenied("Template is not APPROVED for this language in WhatsApp Manager.")
    template: dict[str, Any] = {"name": params["template_name"], "language": {"code": params["language"]}}
    if params.get("body_parameters"):
        template["components"] = [
            {"type": "body", "parameters": [{"type": "text", "text": str(v)} for v in params["body_parameters"]]}
        ]
    body = await client.send(ctx.account.external_id, {"to": params["to"], "type": "template", "template": template})
    return _record_outbound(ctx, conv, body, "template", f"[template:{params['template_name']}]")


@operation("whatsapp_get_message_status", P, Kind.READ, summary="Read delivery status")
def message_status(ctx: OperationContext, params: dict[str, Any]) -> dict[str, Any]:
    assert ctx.account is not None
    msg = ctx.session.scalar(
        select(Message)
        .join(Conversation)
        .where(
            Message.id == params["message_id"],
            Conversation.account_id == ctx.account.id,
            Conversation.owner_id == ctx.principal.user_id,
        )
    )
    if msg is None:
        raise NotFound("Message not found for this account.")
    return {
        "message_id": msg.id,
        "wa_message_id": msg.wa_message_id,
        "status": msg.status,
        "notes": [
            "Statuses (sent/delivered/read/failed) arrive through verified webhooks; 'read' is "
            "only reported when the customer has read receipts enabled."
        ],
    }


def validate_recipient(to: str) -> str:
    to = to.strip().lstrip("+").replace(" ", "")
    if not WA_ID.match(to):
        raise ValidationFailed("Recipient must be an international number with digits only, e.g. 263771234567.")
    return to
