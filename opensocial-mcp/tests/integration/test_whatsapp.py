import hashlib
import hmac
import json
import time

from fastapi.testclient import TestClient

from opensocial.api.app import create_app
from opensocial.core import approvals
from opensocial.core.database import Platform
from opensocial.servers import whatsapp
from tests.conftest import APP_SECRET, VERIFY_TOKEN, call_tool


def payload(text="Hello, where is my order?", wa_id="263771234567", msg_id=None, phone_id="100000000000001"):
    return {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "200000000000001",
                "changes": [
                    {
                        "field": "messages",
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {"phone_number_id": phone_id},
                            "contacts": [{"wa_id": wa_id, "profile": {"name": "Tendai"}}],
                            "messages": [
                                {
                                    "from": wa_id,
                                    "id": msg_id or f"wamid.{time.time_ns()}",
                                    "timestamp": str(int(time.time())),
                                    "type": "text",
                                    "text": {"body": text},
                                }
                            ],
                        },
                    }
                ],
            }
        ],
    }


def signed(body: bytes, secret=APP_SECRET) -> dict:
    return {
        "X-Hub-Signature-256": "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest(),
        "Content-Type": "application/json",
    }


def post(client, data, secret=APP_SECRET):
    body = json.dumps(data).encode()
    return client.post("/webhooks/whatsapp", content=body, headers=signed(body, secret))


def test_verify_handshake(world):
    client = TestClient(create_app(world.runtime))
    ok = client.get(
        "/webhooks/whatsapp", params={"hub.mode": "subscribe", "hub.verify_token": VERIFY_TOKEN, "hub.challenge": "123"}
    )
    assert ok.status_code == 200 and ok.text == "123"
    bad = client.get(
        "/webhooks/whatsapp", params={"hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "123"}
    )
    assert bad.status_code == 403


async def test_inbound_reply_flow(world):
    client = TestClient(create_app(world.runtime))
    assert post(client, payload()).json()["messages"] == 1
    acc = world.accounts["alice"][Platform.WHATSAPP]
    convs = await call_tool(whatsapp.server, "whatsapp_list_conversations", {"account_id": acc})
    conv = convs["conversations"][0]
    assert conv["service_window_open"] and not conv["escalated"]
    detail = await call_tool(
        whatsapp.server, "whatsapp_get_conversation", {"account_id": acc, "conversation_id": conv["conversation_id"]}
    )
    assert detail["conversation"]["messages"][0]["body"]["untrusted"]
    draft = await call_tool(
        whatsapp.server,
        "whatsapp_prepare_reply",
        {"account_id": acc, "conversation_id": conv["conversation_id"], "text": "It ships today."},
    )
    assert draft["can_send_free_form"]
    args = {"account_id": acc, "to": "+263 771234567", "text": "It ships today."}
    first = await call_tool(whatsapp.server, "whatsapp_send_message", args)
    assert first["status"] == "approval_required"
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    sent = await call_tool(whatsapp.server, "whatsapp_send_message", {**args, "approval_id": first["approval_id"]})
    assert sent["sent"] and sent["wa_message_id"] == "wamid.DEMO1"
    status_hook = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "metadata": {"phone_number_id": "100000000000001"},
                            "statuses": [{"id": "wamid.DEMO1", "status": "delivered"}],
                        }
                    }
                ]
            }
        ],
    }
    assert post(client, status_hook).json()["statuses"] == 1
    status = await call_tool(
        whatsapp.server, "whatsapp_get_message_status", {"account_id": acc, "message_id": sent["message_id"]}
    )
    assert status["status"] == "delivered"


async def test_no_cold_messages_and_template_opt_in(world):
    acc = world.accounts["alice"][Platform.WHATSAPP]
    cold = await call_tool(
        whatsapp.server, "whatsapp_send_message", {"account_id": acc, "to": "263779999999", "text": "Buy now"}
    )
    first = cold
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    blocked = await call_tool(
        whatsapp.server,
        "whatsapp_send_message",
        {"account_id": acc, "to": "263779999999", "text": "Buy now", "approval_id": first["approval_id"]},
    )
    assert blocked["tool_error"]["error"] == "permission_denied"

    client = TestClient(create_app(world.runtime))
    post(client, payload(wa_id="263770000002"))
    args = {
        "account_id": acc,
        "to": "263770000002",
        "template_name": "order_update",
        "language": "en",
        "body_parameters": ["A123"],
    }
    first = await call_tool(whatsapp.server, "whatsapp_send_template", args)
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    no_opt_in = await call_tool(
        whatsapp.server, "whatsapp_send_template", {**args, "approval_id": first["approval_id"]}
    )
    assert "opt-in" in no_opt_in["tool_error"]["message"]

    from sqlalchemy import select

    from opensocial.core.database import Conversation

    with world.runtime.db.session() as s:
        s.scalar(select(Conversation).where(Conversation.customer_wa_id == "263770000002")).opted_in = True
    first = await call_tool(whatsapp.server, "whatsapp_send_template", args)
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    ok = await call_tool(whatsapp.server, "whatsapp_send_template", {**args, "approval_id": first["approval_id"]})
    assert ok["sent"]
    pending_tpl = {**args, "template_name": "promo_pending"}
    first = await call_tool(whatsapp.server, "whatsapp_send_template", pending_tpl)
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    unapproved = await call_tool(
        whatsapp.server, "whatsapp_send_template", {**pending_tpl, "approval_id": first["approval_id"]}
    )
    assert "APPROVED" in unapproved["tool_error"]["message"]


async def test_sensitive_message_escalates(world):
    client = TestClient(create_app(world.runtime))
    post(client, payload(text="I will take legal action unless I get a refund", wa_id="263770000003"))
    acc = world.accounts["alice"][Platform.WHATSAPP]
    convs = await call_tool(whatsapp.server, "whatsapp_list_conversations", {"account_id": acc, "escalated_only": True})
    assert convs["conversations"][0]["escalated"]
    first = await call_tool(
        whatsapp.server, "whatsapp_send_message", {"account_id": acc, "to": "263770000003", "text": "Sorry"}
    )
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    blocked = await call_tool(
        whatsapp.server,
        "whatsapp_send_message",
        {"account_id": acc, "to": "263770000003", "text": "Sorry", "approval_id": first["approval_id"]},
    )
    assert "escalated" in blocked["tool_error"]["message"]


async def test_opt_out_and_manual_escalation(world):
    client = TestClient(create_app(world.runtime))
    post(client, payload(text="STOP", wa_id="263770000004"))
    post(client, payload(text="hi", wa_id="263770000005"))
    acc = world.accounts["alice"][Platform.WHATSAPP]
    convs = {
        c["customer_wa_id"]: c
        for c in (await call_tool(whatsapp.server, "whatsapp_list_conversations", {"account_id": acc}))["conversations"]
    }
    assert convs["263770000004"]["escalated"] and not convs["263770000004"]["opted_in"]
    esc = await call_tool(
        whatsapp.server,
        "whatsapp_escalate_conversation",
        {"account_id": acc, "conversation_id": convs["263770000005"]["conversation_id"], "reason": "complex"},
    )
    assert esc["escalated"]


def test_webhook_rejects_forgery_replay_and_unknown_numbers(world):
    client = TestClient(create_app(world.runtime))
    data = payload(msg_id="wamid.fixed")
    assert post(client, data, secret="wrong-secret").status_code == 401
    body = json.dumps(data).encode()
    assert client.post("/webhooks/whatsapp", content=body).status_code == 401
    assert post(client, data).json()["messages"] == 1
    assert post(client, data).json()["status"] == "duplicate"
    unknown = post(client, payload(phone_id="999")).json()
    assert unknown["ignored"] == 1 and unknown["messages"] == 0


async def test_phone_and_templates(world):
    acc = world.accounts["alice"][Platform.WHATSAPP]
    phone = await call_tool(whatsapp.server, "whatsapp_get_phone_number", {"account_id": acc})
    assert phone["phone_number"]["quality_rating"] == "GREEN"
    templates = await call_tool(whatsapp.server, "whatsapp_list_templates", {"account_id": acc})
    assert {t["name"] for t in templates["templates"]} == {"order_update", "promo_pending"}
    bad = await call_tool(whatsapp.server, "whatsapp_send_message", {"account_id": acc, "to": "abc", "text": "x"})
    assert bad["tool_error"]["error"] == "validation_failed"
