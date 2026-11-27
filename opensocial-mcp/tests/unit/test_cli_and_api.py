import json

import pytest
from fastapi.testclient import TestClient
from typer.testing import CliRunner

from opensocial.api.app import create_app
from opensocial.cli.main import app as cli
from opensocial.core.config import reset_settings_cache
from opensocial.core.database import Platform


@pytest.fixture
def cli_env(tmp_path, monkeypatch, settings):
    from opensocial.core.security import TokenCipher

    monkeypatch.setenv("OPENSOCIAL_DATABASE_URL", f"sqlite:///{tmp_path / 'cli.db'}")
    monkeypatch.setenv("OPENSOCIAL_ENCRYPTION_KEYS", TokenCipher.generate_key())
    monkeypatch.setenv("OPENSOCIAL_ENVIRONMENT", "test")
    monkeypatch.setenv("OPENSOCIAL_DEMO_MODE", "true")
    reset_settings_cache()
    yield monkeypatch
    reset_settings_cache()


def test_cli_lifecycle(cli_env):
    runner = CliRunner()
    assert runner.invoke(cli, ["version"]).output.strip() == "1.0.0"
    assert len(runner.invoke(cli, ["generate-key"]).output.strip()) == 44
    created = runner.invoke(cli, ["create-user", "--email", "cli@example.org", "--admin"])
    assert created.exit_code == 0, created.output
    owner = next(line.split(": ")[1].strip() for line in created.output.splitlines() if "OWNER key" in line)
    cli_env.setenv("OPENSOCIAL_OWNER_KEY_FOR_TESTS", owner)
    assert runner.invoke(cli, ["mode", "set", "assistant"]).exit_code == 0
    assert runner.invoke(cli, ["mode", "show"]).output.strip() == "assistant"
    seeded = runner.invoke(cli, ["demo", "seed", "--email", "demo@example.org"])
    assert seeded.exit_code == 0 and "demo-mock" in seeded.output
    health = json.loads(runner.invoke(cli, ["health"]).output)
    assert health["database"] == "ok" and health["encryption"] == "ok"
    url = runner.invoke(cli, ["connect", "youtube", "--tiers", "read,upload"])
    assert "accounts.google.com" in url.output
    assert runner.invoke(cli, ["controls", "--disable-publishing"]).exit_code == 0
    assert json.loads(runner.invoke(cli, ["controls", "--enable-publishing"]).output)["publishing_disabled"] is False
    assert json.loads(runner.invoke(cli, ["approvals", "list", "--status", "all"]).output) == []
    assert json.loads(runner.invoke(cli, ["accounts"]).output) == []
    duplicate = runner.invoke(cli, ["create-user", "--email", "cli@example.org"])
    assert duplicate.exit_code == 1


def test_cli_approve_flow(cli_env, tmp_path):
    runner = CliRunner()
    out = json.loads(runner.invoke(cli, ["demo", "seed"]).output)
    cli_env.setenv("OPENSOCIAL_OWNER_KEY_FOR_TESTS", out["owner_key"])
    from opensocial.cli.main import _runtime
    from opensocial.core.authentication import authenticate

    rt = _runtime()
    with rt.db.session() as s:
        agent = authenticate(s, out["agent_key"])
    fb = next(a["account_id"] for a in out["accounts"] if a["platform"] == "facebook")
    import asyncio

    pending = asyncio.run(
        rt.execute(
            agent,
            "facebook_create_post",
            {"post_type": "text", "message": "cli", "link": None, "media_url": None, "scheduled_time": None},
            account_id=fb,
        )
    )
    aid = pending["approval_id"]
    assert runner.invoke(cli, ["approvals", "show", aid]).exit_code == 0
    approved = runner.invoke(cli, ["approvals", "approve", aid, "--yes", "--execute"])
    assert approved.exit_code == 0 and '"published": true' in approved.output
    rejected = runner.invoke(cli, ["approvals", "reject", aid])
    assert rejected.exit_code == 1
    assert runner.invoke(cli, ["disconnect", fb]).exit_code == 0


def test_cli_agent_key_refused_for_owner_actions(cli_env):
    runner = CliRunner()
    out = json.loads(runner.invoke(cli, ["demo", "seed"]).output)
    cli_env.setenv("OPENSOCIAL_OWNER_KEY_FOR_TESTS", out["agent_key"])
    assert runner.invoke(cli, ["approvals", "list"]).exit_code != 0


def test_demo_seed_requires_demo_mode(cli_env):
    cli_env.setenv("OPENSOCIAL_DEMO_MODE", "false")
    reset_settings_cache()
    assert CliRunner().invoke(cli, ["demo", "seed"]).exit_code == 1


@pytest.fixture
def client(world):
    return TestClient(create_app(world.runtime))


def test_api_overview_endpoints(client, world):
    h = {"X-API-Key": world.keys["alice"]["owner"]}
    assert client.get("/api/health").json()["integrations"]["youtube"] == "loaded"
    me = client.get("/api/me", headers=h).json()
    assert me["role"] == "owner" and me["is_admin"]
    assert len(client.get("/api/accounts", headers=h, params={"platform": "youtube"}).json()["accounts"]) == 1
    created = client.post("/api/content", headers=h, json={"title": "From dashboard", "body": "Hello. World."}).json()
    item_id = created["item"]["item_id"]
    adapted = client.post(
        f"/api/content/{item_id}/adapt",
        headers=h,
        json={"platforms": ["facebook"], "accounts": {"facebook": world.accounts["alice"][Platform.FACEBOOK]}},
    ).json()
    vid = adapted["variants"][0]["variant_id"]
    patched = client.patch(f"/api/variants/{vid}", headers=h, json={"caption": "Edited caption"}).json()
    assert patched["variant"]["caption"] == "Edited caption"
    submitted = client.post(f"/api/variants/{vid}/submit", headers=h, json={}).json()
    assert submitted["status"] == "approval_required"
    approvals_list = client.get("/api/approvals", headers=h, params={"status": "pending"}).json()["approvals"]
    assert approvals_list[0]["approval_id"] == submitted["approval_id"]
    executed = client.post(
        f"/api/approvals/{submitted['approval_id']}/approve", headers=h, json={"execute_now": True}
    ).json()
    assert executed["execution"]["published"]
    assert client.get("/api/content", headers=h).json()["items"][0]["status"] == "PUBLISHED"
    assert client.get("/api/calendar", headers=h).status_code == 200
    assert client.get("/api/analytics/summary", headers=h).status_code == 200
    assert client.get("/api/reports/daily", headers=h).json()["publishing_activity"]["successful_external_actions"] == 1
    assert client.get("/api/reports/yearly", headers=h).status_code == 422
    assert client.get("/api/audit", headers=h).json()["entries"]
    assert client.post("/api/brands", headers=h, json={"name": "Brand"}).status_code == 200
    assert client.get("/api/brands", headers=h).json()["brands"][0]["name"] == "Brand"
    op = client.post(
        "/api/operations/youtube_get_channel",
        headers=h,
        json={},
        params={"account_id": world.accounts["alice"][Platform.YOUTUBE]},
    ).json()
    assert op["channel"]["title"] == "Demo Channel"
    rej_item = client.post("/api/content", headers=h, json={"title": "Two", "body": "x"}).json()["item"]["item_id"]
    v2 = client.post(
        f"/api/content/{rej_item}/adapt",
        headers=h,
        json={"platforms": ["facebook"], "accounts": {"facebook": world.accounts["alice"][Platform.FACEBOOK]}},
    ).json()["variants"][0]["variant_id"]
    sub2 = client.post(f"/api/variants/{v2}/submit", headers=h, json={}).json()
    assert (
        client.post(f"/api/approvals/{sub2['approval_id']}/reject", headers=h, json={"note": "no"}).json()["status"]
        == "rejected"
    )
    assert client.post(f"/api/approvals/{sub2['approval_id']}/cancel", headers=h).status_code == 422


def test_api_autonomy_and_manager_mode(client, world):
    h = {"X-API-Key": world.keys["alice"]["owner"]}
    acc = world.accounts["alice"][Platform.FACEBOOK]
    assert (
        client.patch(
            f"/api/accounts/{acc}/autonomy", headers=h, json={"enabled": True, "kinds": ["delete"], "daily_limit": 1}
        ).status_code
        == 422
    )
    assert (
        client.patch(
            f"/api/accounts/{acc}/autonomy", headers=h, json={"enabled": True, "kinds": ["publish"], "daily_limit": 0}
        ).status_code
        == 422
    )
    ok = client.patch(
        f"/api/accounts/{acc}/autonomy", headers=h, json={"enabled": True, "kinds": ["publish"], "daily_limit": 1}
    )
    assert ok.json()["account"]["autonomy_enabled"]
    client.put("/api/me/mode", headers=h, json={"mode": "authorised_manager"})
    import asyncio

    params = {"post_type": "text", "message": "auto", "link": None, "media_url": None, "scheduled_time": None}
    first = asyncio.run(world.runtime.execute(world.agent("alice"), "facebook_create_post", params, account_id=acc))
    assert first["published"]
    second = asyncio.run(
        world.runtime.execute(
            world.agent("alice"), "facebook_create_post", {**params, "message": "auto 2"}, account_id=acc
        )
    )
    assert second["status"] == "approval_required"


def test_whatsapp_connect_and_conversation_controls(client, world):
    from tests.integration.test_whatsapp import payload, post

    h = {"X-API-Key": world.keys["alice"]["owner"]}
    created = client.post(
        "/api/accounts/whatsapp",
        headers=h,
        json={
            "phone_number_id": "300000000000001",
            "waba_id": "400000000000001",
            "access_token": "EAAwhatsapptoken000000000",
        },
    )
    assert created.status_code == 200 and "EAAwhatsapp" not in created.text
    post(client, payload(text="legal action now", wa_id="263770000009"))
    from sqlalchemy import select

    from opensocial.core.database import Conversation

    with world.runtime.db.session() as s:
        conv = s.scalar(select(Conversation).where(Conversation.customer_wa_id == "263770000009"))
        cid, acc = conv.id, conv.account_id
    r = client.post(
        f"/api/whatsapp/{acc}/conversations/{cid}", headers=h, json={"opted_in": True, "resolve_escalation": True}
    ).json()
    assert r == {"conversation_id": cid, "opted_in": True, "escalated": False}
    assert client.post("/api/accounts/kindle", headers=h).json()["account"]["platform"] == "kindle"


def test_kindle_human_status_via_api(client, world):
    import asyncio

    h = {"X-API-Key": world.keys["alice"]["owner"]}
    project = asyncio.run(world.runtime.execute(world.agent("alice"), "kindle_create_book_project", {"title": "B"}))
    pid = project["project"]["project_id"]
    r = client.post(f"/api/kindle/projects/{pid}/status", headers=h, json={"status": "SUBMITTED_MANUALLY"})
    assert r.json()["project"]["status"] == "SUBMITTED_MANUALLY"


def test_dashboard_served_when_built(world, tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>dashboard</html>")
    client = TestClient(create_app(world.runtime, dashboard_dir=dist))
    assert "dashboard" in client.get("/approvals").text
    assert client.get("/api/health").status_code == 200
