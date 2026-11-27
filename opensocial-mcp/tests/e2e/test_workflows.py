"""The six required end-to-end workflows, run against simulated platform APIs."""

import json
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from opensocial.api.app import create_app
from opensocial.core.database import ApprovalRequest, AuditLog, Platform
from opensocial.integrations.oauth import DiscoveredAccount, TokenSet, upsert_account
from opensocial.servers import core, instagram, kindle, whatsapp, youtube
from tests.conftest import APP_SECRET, call_tool
from tests.factories import make_docx, make_jpeg, make_mp4
from tests.integration.test_whatsapp import payload, signed


@pytest.fixture
def client(world):
    return TestClient(create_app(world.runtime))


def owner_h(world, who="alice"):
    return {"X-API-Key": world.keys[who]["owner"]}


async def test_workflow_1_youtube_publish_blocked_without_approval(world, client, media_root):
    """Connect a YouTube test account, read the channel, prepare an upload, request approval,
    verify publishing is blocked until the owner approves."""
    with world.runtime.db.session() as s:
        acc = upsert_account(
            s,
            world.runtime.cipher,
            owner_id=world.users["alice"],
            platform=Platform.YOUTUBE,
            discovered=DiscoveredAccount(external_id="UCtest", display_name="Test channel"),
            tokens=TokenSet(access_token="ya29.test-token-value-0000"),
            granted_scopes=[
                "https://www.googleapis.com/auth/youtube.readonly",
                "https://www.googleapis.com/auth/youtube.upload",
            ],
        ).id
    channel = await call_tool(youtube.server, "youtube_get_channel", {"account_id": acc})
    assert channel["channel"]["title"] == "Demo Channel"
    make_mp4(media_root / "lesson.mp4", seconds=45)
    args = {"account_id": acc, "file_path": "lesson.mp4", "title": "Lesson 1", "as_short": True}
    pending = await call_tool(youtube.server, "youtube_upload_video", args)
    assert pending["status"] == "approval_required"
    blocked = await call_tool(youtube.server, "youtube_upload_video", {**args, "approval_id": pending["approval_id"]})
    assert blocked["tool_error"]["error"] == "permission_denied"
    with world.runtime.db.session() as s:
        assert not s.scalars(
            select(AuditLog).where(AuditLog.tool == "youtube_upload_video", AuditLog.outcome == "success")
        ).all()
    r = client.post(f"/api/approvals/{pending['approval_id']}/approve", headers=owner_h(world), json={})
    assert r.json()["status"] == "approved"
    done = await call_tool(youtube.server, "youtube_upload_video", {**args, "approval_id": pending["approval_id"]})
    assert done["uploaded"] and done["environment"] == "demo-mock"


async def test_workflow_2_instagram_reel_validate_and_submit(world, monkeypatch, media_root):
    """Connect an eligible Instagram account, prepare a Reel, validate its media, submit for approval."""
    monkeypatch.setattr("opensocial.core.security._default_resolver", lambda h: ["93.184.216.34"])
    acc = world.accounts["alice"][Platform.INSTAGRAM]
    profile = await call_tool(instagram.server, "instagram_get_profile", {"account_id": acc})
    assert profile["profile"]["account_type"] == "BUSINESS"
    make_mp4(media_root / "reel.mp4", seconds=25)
    media = await call_tool(
        core.server, "opensocial_validate_media", {"file_path": "reel.mp4", "requirements": ["instagram:reel"]}
    )
    assert media["results"]["instagram:reel"]["valid"]
    prepared = await call_tool(
        instagram.server,
        "instagram_create_reel",
        {
            "account_id": acc,
            "video_url": "https://cdn.example.com/reel.mp4",
            "caption": "How flotation works #science",
            "local_file": "reel.mp4",
        },
    )
    plan = prepared["publish_plan"]
    submitted = await call_tool(
        instagram.server,
        "instagram_publish_media",
        {
            "account_id": acc,
            "media_type": plan["media_type"],
            "media_urls": plan["media_urls"],
            "caption": plan["caption"],
        },
    )
    assert submitted["status"] == "approval_required"
    assert submitted["approval"]["content"]["caption"] == "How flotation works #science"


async def test_workflow_3_one_video_four_independent_versions(world, client, media_root):
    """Prepare one video for TikTok, YouTube, Instagram and Facebook: four independent versions."""
    brand = await call_tool(
        core.server,
        "opensocial_save_brand",
        {
            "brand": {
                "name": "Ore Academy",
                "tone_of_voice": "clear, practical",
                "hashtags": ["OreAcademy"],
                "restricted_terms": ["guaranteed"],
                "platforms": {
                    "tiktok": {"call_to_action": "Follow for part 2"},
                    "youtube": {"call_to_action": "Subscribe for weekly lessons"},
                },
            }
        },
    )
    item = (
        await call_tool(
            core.server,
            "opensocial_create_content",
            {
                "title": "Why grinding uses most mine energy",
                "content_type": "video",
                "brand_id": brand["brand"]["brand_id"],
                "body": "Grinding can use about half of a concentrator's energy. Here is why particle size matters. "
                "Finer grinding releases minerals but costs power.",
                "tags": ["mining", "metallurgy"],
                "media": [{"file_path": "clip.mp4"}],
            },
        )
    )["item"]
    accounts = {p: world.accounts["alice"][Platform(p)] for p in ("youtube", "tiktok", "instagram", "facebook")}
    variants = (
        await call_tool(
            core.server,
            "opensocial_adapt_content",
            {
                "item_id": item["item_id"],
                "platforms": list(accounts),
                "accounts": accounts,
                "duration_seconds": 45,
                "vertical": True,
            },
        )
    )["variants"]
    assert len(variants) == 4 and {v["platform"] for v in variants} == set(accounts)
    captions = [v["caption"] for v in variants]
    assert len(set(captions)) == 4, "captions must be platform-specific, not copies"
    by = {v["platform"]: v for v in variants}
    assert by["youtube"]["format"] == "short" and "#Shorts" in by["youtube"]["caption"]
    assert "Follow for part 2" in by["tiktok"]["caption"]
    assert "Subscribe" not in by["tiktok"]["caption"]
    assert all("Grinding" in c or "grinding" in c for c in captions)
    assert all(v["validation"]["valid"] for v in variants)
    bad = await call_tool(
        core.server,
        "opensocial_update_variant",
        {"variant_id": by["facebook"]["variant_id"], "caption": "Results guaranteed!"},
    )
    assert not bad["variant"]["validation"]["valid"]
    make_mp4(media_root / "clip.mp4", seconds=45)
    submitted = await call_tool(core.server, "opensocial_submit_variant", {"variant_id": by["tiktok"]["variant_id"]})
    assert submitted["status"] == "approval_required"
    item_after = (await call_tool(core.server, "opensocial_get_content", {"item_id": item["item_id"]}))["item"]
    assert {v["platform"]: v["status"] for v in item_after["variants"]}["tiktok"] == "UNDER_REVIEW"
    client.post(
        f"/api/approvals/{submitted['approval_id']}/approve", headers=owner_h(world), json={"execute_now": True}
    )
    item_after = (await call_tool(core.server, "opensocial_get_content", {"item_id": item["item_id"]}))["item"]
    assert {v["platform"]: v["status"] for v in item_after["variants"]}["tiktok"] == "PUBLISHED"


async def test_workflow_4_whatsapp_webhook_signature_and_authorisation(world, client):
    """Receive a mocked webhook, validate its signature, prepare a response, require authorisation."""
    body = json.dumps(payload(text="Do you deliver to Chinhoyi?", wa_id="263772222222")).encode()
    forged = client.post("/webhooks/whatsapp", content=body, headers=signed(body, "attacker"))
    assert forged.status_code == 401
    accepted = client.post("/webhooks/whatsapp", content=body, headers=signed(body, APP_SECRET))
    assert accepted.json()["messages"] == 1
    acc = world.accounts["alice"][Platform.WHATSAPP]
    conv = (await call_tool(whatsapp.server, "whatsapp_list_conversations", {"account_id": acc}))["conversations"][0]
    draft = await call_tool(
        whatsapp.server,
        "whatsapp_prepare_reply",
        {"account_id": acc, "conversation_id": conv["conversation_id"], "text": "Yes, we deliver to Chinhoyi."},
    )
    assert draft["can_send_free_form"]
    send = await call_tool(
        whatsapp.server,
        "whatsapp_send_message",
        {"account_id": acc, "to": "263772222222", "text": "Yes, we deliver to Chinhoyi."},
    )
    assert send["status"] == "approval_required"
    with world.runtime.db.session() as s:
        assert s.get(ApprovalRequest, send["approval_id"]).kind == "message"


async def test_workflow_5_kindle_manuscript_metadata_checklist(world, media_root):
    """Upload a test manuscript, validate it, generate metadata, produce a checklist."""
    from tests.integration.test_kindle import GOOD_META

    project = (await call_tool(kindle.server, "kindle_create_book_project", {"title": "Field Guide"}))["project"]
    pid = project["project_id"]
    make_docx(media_root / "manuscript.docx", chapters=5)
    make_jpeg(media_root / "cover.jpg", width=1600, height=2560)
    v = await call_tool(
        kindle.server, "kindle_validate_manuscript", {"file_path": "manuscript.docx", "project_id": pid}
    )
    assert v["validation"]["valid"]
    desc = await call_tool(
        kindle.server,
        "kindle_generate_description",
        {
            "hook": "Practical flotation, explained.",
            "synopsis": "A field guide. " * 40,
            "key_points": ["Tested methods"],
        },
    )
    meta = await call_tool(
        kindle.server,
        "kindle_prepare_metadata",
        {"project_id": pid, **{**GOOD_META, "description": desc["description_html"]}},
    )
    assert meta["validation"]["valid"], meta["validation"]
    cover = await call_tool(kindle.server, "kindle_check_cover", {"file_path": "cover.jpg", "project_id": pid})
    assert cover["cover_check"]["valid"]
    checklist = await call_tool(kindle.server, "kindle_create_publishing_checklist", {"project_id": pid})
    statuses = {c["step"]: c["status"] for c in checklist["checklist"]}
    assert statuses["Manuscript validated (DOCX/EPUB/KPF)"] == "done"
    assert any(s == "manual" for s in statuses.values())
    assert checklist["ready_for_manual_upload"] and "no public publishing API" in checklist["note"]
    ready = await call_tool(
        kindle.server, "kindle_update_status", {"project_id": pid, "status": "READY_FOR_MANUAL_UPLOAD"}
    )
    assert ready["project"]["status"] == "READY_FOR_MANUAL_UPLOAD"


async def test_workflow_6_cross_user_access_rejected(world, client):
    """Attempt to access another user's account; verify rejection on every surface."""
    for platform in (Platform.YOUTUBE, Platform.FACEBOOK, Platform.INSTAGRAM, Platform.TIKTOK, Platform.WHATSAPP):
        bob_acc = world.accounts["bob"][platform]
        server = {
            Platform.YOUTUBE: (youtube.server, "youtube_get_channel"),
            Platform.FACEBOOK: (
                __import__("opensocial.servers.facebook", fromlist=["server"]).server,
                "facebook_get_page",
            ),
            Platform.INSTAGRAM: (instagram.server, "instagram_get_profile"),
            Platform.TIKTOK: (
                __import__("opensocial.servers.tiktok", fromlist=["server"]).server,
                "tiktok_get_profile",
            ),
            Platform.WHATSAPP: (whatsapp.server, "whatsapp_list_conversations"),
        }[platform]
        result = await call_tool(server[0], server[1], {"account_id": bob_acc})
        assert result["tool_error"]["error"] == "not_found", platform
        assert client.post(f"/api/accounts/{bob_acc}/revoke", headers=owner_h(world)).status_code == 404
    with world.runtime.db.session() as s:
        denied = s.scalars(
            select(AuditLog).where(AuditLog.user_id == world.users["alice"], AuditLog.outcome == "denied")
        ).all()
        assert len(denied) >= 5
    time.sleep(0)
