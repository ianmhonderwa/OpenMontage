from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from opensocial.api.app import create_app
from opensocial.core.database import Account, Credential, Platform


@pytest.fixture
def client(world):
    return TestClient(create_app(world.runtime))


def _start(client, world, provider, tiers="read"):
    r = client.get(
        f"/api/oauth/{provider}/start", params={"tiers": tiers}, headers={"X-API-Key": world.keys["alice"]["owner"]}
    )
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.parametrize(
    "provider,platform",
    [
        ("youtube", Platform.YOUTUBE),
        ("tiktok", Platform.TIKTOK),
        ("facebook", Platform.FACEBOOK),
        ("instagram", Platform.INSTAGRAM),
        ("instagram-facebook", Platform.INSTAGRAM),
    ],
)
def test_full_oauth_flow_creates_encrypted_accounts(client, world, provider, platform):
    started = _start(client, world, provider)
    query = parse_qs(urlsplit(started["authorize_url"]).query)
    assert query["redirect_uri"][0] == f"https://opensocial.test/api/oauth/{provider}/callback"
    if provider == "youtube":
        assert query["code_challenge_method"] == ["S256"] and query["access_type"] == ["offline"]
    r = client.get(f"/api/oauth/{provider}/callback", params={"state": query["state"][0], "code": "demo-code"})
    assert r.status_code == 200, r.text
    with world.runtime.db.session() as s:
        accounts = list(
            s.scalars(select(Account).where(Account.owner_id == world.users["alice"], Account.auth_flow == provider))
        )
        assert accounts and all(a.platform == platform for a in accounts)
        for cred in s.scalars(select(Credential)):
            assert "demo" not in cred.access_token_enc and cred.access_token_enc.startswith("gAAAAA")
    replay = client.get(f"/api/oauth/{provider}/callback", params={"state": query["state"][0], "code": "demo-code"})
    assert replay.status_code == 400 and "already been used" in replay.text


def test_invalid_state_and_provider_error(client, world):
    assert client.get("/api/oauth/youtube/callback", params={"state": "forged", "code": "x"}).status_code == 400
    assert client.get("/api/oauth/youtube/callback", params={"code": "x"}).status_code == 400
    started = _start(client, world, "youtube")
    state = parse_qs(urlsplit(started["authorize_url"]).query)["state"][0]
    other = client.get("/api/oauth/tiktok/callback", params={"state": state, "code": "x"})
    assert other.status_code == 400
    started = _start(client, world, "youtube")
    state = parse_qs(urlsplit(started["authorize_url"]).query)["state"][0]
    denied = client.get("/api/oauth/youtube/callback", params={"state": state, "error": "access_denied"})
    assert denied.status_code == 400 and "declined" in denied.text


def test_expired_state(client, world):
    from datetime import timedelta

    from opensocial.core.database import OAuthState, utcnow

    started = _start(client, world, "youtube")
    state = parse_qs(urlsplit(started["authorize_url"]).query)["state"][0]
    with world.runtime.db.session() as s:
        for row in s.scalars(select(OAuthState)):
            row.expires_at = utcnow() - timedelta(minutes=1)
    r = client.get("/api/oauth/youtube/callback", params={"state": state, "code": "x"})
    assert r.status_code == 400 and "expired" in r.text


def test_least_privilege_tiers(client, world):
    read = _start(client, world, "youtube")["scopes"]
    assert read == [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
    ]
    upload = _start(client, world, "youtube", "read,upload")["scopes"]
    assert "https://www.googleapis.com/auth/youtube.upload" in upload
    bad = client.get(
        "/api/oauth/youtube/start", params={"tiers": "admin"}, headers={"X-API-Key": world.keys["alice"]["owner"]}
    )
    assert bad.status_code == 422


def test_agent_key_cannot_start_oauth(client, world):
    r = client.get("/api/oauth/youtube/start", headers={"X-API-Key": world.keys["alice"]["agent"]})
    assert r.status_code == 403
