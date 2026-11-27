"""Error mapping against HTTP responses (respx), independent of the demo transport."""

import httpx
import pytest
import respx

from opensocial.core.database import Account, AccountStatus, Platform
from opensocial.core.exceptions import PlatformError, RateLimitExceeded, TokenExpired
from opensocial.core.runtime import Runtime
from opensocial.integrations.facebook.client import FacebookPageClient
from opensocial.integrations.tiktok.client import TikTokClient
from opensocial.integrations.youtube.client import YouTubeClient


@respx.mock
async def test_401_maps_to_token_expired_without_leaking_token():
    respx.get("https://www.googleapis.com/youtube/v3/channels").mock(
        return_value=httpx.Response(401, json={"error": {"message": "Invalid Credentials"}})
    )
    client = YouTubeClient("ya29.SECRETSECRETSECRET1234")
    with pytest.raises(TokenExpired) as exc:
        await client.get_channel()
    assert "SECRET" not in str(exc.value)


@respx.mock
async def test_429_and_5xx():
    route = respx.get("https://www.googleapis.com/youtube/v3/channels")
    route.mock(return_value=httpx.Response(429, json={"error": {"message": "quota"}}, headers={"retry-after": "30"}))
    with pytest.raises(RateLimitExceeded):
        await YouTubeClient("t").get_channel()
    route.mock(return_value=httpx.Response(503, text="down"))
    with pytest.raises(PlatformError) as exc:
        await YouTubeClient("t").get_channel()
    assert exc.value.status_code == 503


@respx.mock
async def test_timeouts_and_network_errors():
    respx.get("https://www.googleapis.com/youtube/v3/channels").mock(side_effect=httpx.ConnectTimeout("t"))
    with pytest.raises(PlatformError, match="timed out"):
        await YouTubeClient("t").get_channel()


@respx.mock
async def test_tiktok_errors_inside_200_body():
    respx.get("https://open.tiktokapis.com/v2/user/info/").mock(
        return_value=httpx.Response(
            200, json={"data": {}, "error": {"code": "scope_not_authorized", "message": "no scope"}}
        )
    )
    with pytest.raises(TokenExpired):
        await TikTokClient("t").user_info()
    respx.post("https://open.tiktokapis.com/v2/post/publish/creator_info/query/").mock(
        return_value=httpx.Response(
            200, json={"data": {}, "error": {"code": "spam_risk_too_many_posts", "message": "slow down"}}
        )
    )
    with pytest.raises(RateLimitExceeded):
        await TikTokClient("t").creator_info()


@respx.mock
async def test_meta_error_codes():
    respx.get(url__regex=r"https://graph.facebook.com/v26.0/page1.*").mock(
        return_value=httpx.Response(
            400, json={"error": {"message": "(#4) Application request limit reached", "code": 4}}
        )
    )
    with pytest.raises(PlatformError):
        await FacebookPageClient("t").page("page1")


@respx.mock
async def test_meta_rate_limit_body_code():
    respx.get(url__regex=r"https://graph.facebook.com/v26.0/page2.*").mock(
        return_value=httpx.Response(200, json={"error": {"message": "limit", "code": 17}})
    )
    with pytest.raises(RateLimitExceeded):
        await FacebookPageClient("t").page("page2")


async def test_expired_token_marks_account(world, settings):
    def failing(_platform):
        return httpx.MockTransport(lambda r: httpx.Response(401, json={"error": {"message": "expired"}}))

    rt = Runtime(settings, database=world.runtime.db, transport_factory=failing, cipher=world.runtime.cipher)
    acc = world.accounts["alice"][Platform.YOUTUBE]
    with pytest.raises(TokenExpired):
        await rt.execute(world.agent("alice"), "youtube_get_channel", {}, account_id=acc)
    with rt.db.session() as s:
        assert s.get(Account, acc).status == AccountStatus.EXPIRED
    from opensocial.core.exceptions import PermissionDenied

    with pytest.raises(PermissionDenied):
        await rt.execute(world.agent("alice"), "youtube_get_channel", {}, account_id=acc)


async def test_token_refresh_before_expiry(world):
    from datetime import timedelta

    from opensocial.core.database import utcnow

    acc = world.accounts["alice"][Platform.YOUTUBE]
    with world.runtime.db.session() as s:
        account = s.get(Account, acc)
        account.auth_flow = "youtube"
        account.token_expires_at = utcnow() + timedelta(seconds=30)
        account.credential.refresh_token_enc = world.runtime.cipher.encrypt("1//refresh")
    await world.runtime.execute(world.agent("alice"), "youtube_get_channel", {}, account_id=acc)
    with world.runtime.db.session() as s:
        account = s.get(Account, acc)
        assert world.runtime.cipher.decrypt(account.credential.access_token_enc).startswith("ya29.demo")
        assert account.token_expires_at.replace(tzinfo=None) > (utcnow() + timedelta(minutes=30)).replace(tzinfo=None)


async def test_one_integration_failure_does_not_affect_others(world, settings):
    def partial(platform):
        if platform == Platform.TIKTOK:
            return httpx.MockTransport(lambda r: httpx.Response(500, json={"error": {"message": "down"}}))
        from opensocial.integrations.mock import mock_transport

        return mock_transport(platform)

    rt = Runtime(settings, database=world.runtime.db, transport_factory=partial, cipher=world.runtime.cipher)
    with pytest.raises(PlatformError):
        await rt.execute(
            world.agent("alice"), "tiktok_get_profile", {}, account_id=world.accounts["alice"][Platform.TIKTOK]
        )
    ok = await rt.execute(
        world.agent("alice"), "youtube_get_channel", {}, account_id=world.accounts["alice"][Platform.YOUTUBE]
    )
    assert ok["channel"]["title"] == "Demo Channel"


def test_registry_isolates_import_failures(monkeypatch):
    from opensocial.integrations import registry

    monkeypatch.setitem(registry.INTEGRATION_MODULES, "broken", "opensocial.integrations.does_not_exist")
    errors = registry.load_integrations()
    assert "broken" in errors and "youtube" not in errors
    registry.LOAD_ERRORS.pop("broken", None)
