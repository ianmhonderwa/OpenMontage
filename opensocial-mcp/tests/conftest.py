from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

from opensocial.core.authentication import create_user, issue_api_key
from opensocial.core.config import Settings
from opensocial.core.database import Mode, Platform, User
from opensocial.core.permissions import Principal
from opensocial.core.rate_limits import limiter
from opensocial.core.runtime import Runtime
from opensocial.core.security import TokenCipher
from opensocial.integrations.mock import mock_transport
from opensocial.integrations.oauth import DiscoveredAccount, TokenSet, upsert_account
from opensocial.integrations.registry import load_integrations
from opensocial.servers import common
from opensocial.services import core_operations  # noqa: F401

load_integrations()

KEY = TokenCipher.generate_key()
APP_SECRET = "test-app-secret"
VERIFY_TOKEN = "test-verify-token"

ALL_SCOPES = {
    Platform.YOUTUBE: [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.force-ssl",
    ],
    Platform.TIKTOK: ["user.info.basic", "video.list", "video.upload", "video.publish"],
    Platform.FACEBOOK: [
        "pages_show_list",
        "pages_read_engagement",
        "read_insights",
        "pages_manage_posts",
        "pages_manage_engagement",
    ],
    Platform.INSTAGRAM: [
        "instagram_business_basic",
        "instagram_business_content_publish",
        "instagram_business_manage_comments",
        "instagram_business_manage_insights",
    ],
    Platform.WHATSAPP: ["whatsapp_business_messaging", "whatsapp_business_management"],
}
EXTERNAL = {
    Platform.YOUTUBE: "UCdemo000000000000000001",
    Platform.TIKTOK: "demo-open-id",
    Platform.FACEBOOK: "page_demo_1",
    Platform.INSTAGRAM: "17841400000000001",
    Platform.WHATSAPP: "100000000000001",
}


@pytest.fixture(autouse=True)
def _reset_limits() -> Iterator[None]:
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture
def media_root(tmp_path: Path) -> Path:
    root = tmp_path / "media"
    root.mkdir()
    return root


@pytest.fixture
def settings(tmp_path: Path, media_root: Path) -> Settings:
    return Settings(
        environment="test",
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        encryption_keys=KEY,
        demo_mode=True,
        media_roots=[media_root],
        whatsapp_app_secret=APP_SECRET,
        whatsapp_verify_token=VERIFY_TOKEN,
        public_base_url="https://opensocial.test",
        api_rate_limit_per_minute=1000,
    )


@pytest.fixture
def runtime(settings: Settings) -> Runtime:
    rt = Runtime(settings, transport_factory=mock_transport)
    rt.db.create_all()
    return rt


class World:
    def __init__(self, runtime: Runtime) -> None:
        self.runtime = runtime
        self.keys: dict[str, dict[str, str]] = {}
        self.users: dict[str, str] = {}
        self.accounts: dict[str, dict[Platform, str]] = {}

    def add_user(self, name: str, mode: Mode = Mode.ASSISTANT, admin: bool = False) -> None:
        with self.runtime.db.session() as s:
            user = create_user(s, f"{name}@example.org", name, is_admin=admin)
            user.mode = mode
            self.keys[name] = {"owner": issue_api_key(s, user, "owner"), "agent": issue_api_key(s, user, "agent")}
            self.users[name] = user.id
            self.accounts[name] = {}
            for platform, scopes in ALL_SCOPES.items():
                meta: dict[str, Any] = {"login": "instagram"} if platform == Platform.INSTAGRAM else {}
                if platform == Platform.WHATSAPP:
                    meta = {"waba_id": "200000000000001"}
                ext = EXTERNAL[platform] if name == "alice" else f"{EXTERNAL[platform]}-{name}"
                acc = upsert_account(
                    s,
                    self.runtime.cipher,
                    owner_id=user.id,
                    platform=platform,
                    discovered=DiscoveredAccount(external_id=ext, display_name=f"{name} {platform}", meta=meta),
                    tokens=TokenSet(access_token=f"EAAsecret{name}{platform.value}token000000"),
                    granted_scopes=scopes,
                )
                self.accounts[name][platform] = acc.id

    def agent(self, name: str) -> Principal:
        return Principal(user_id=self.users[name], role="agent")

    def owner(self, name: str) -> Principal:
        return Principal(user_id=self.users[name], role="owner")

    def set_mode(self, name: str, mode: Mode) -> None:
        with self.runtime.db.session() as s:
            user = s.get(User, self.users[name])
            assert user is not None
            user.mode = mode

    def use_agent(self, name: str) -> None:
        from pydantic import SecretStr

        self.runtime.settings.api_key = SecretStr(self.keys[name]["agent"])


@pytest.fixture
def world(runtime: Runtime) -> Iterator[World]:
    w = World(runtime)
    w.add_user("alice", admin=True)
    w.add_user("bob")
    common.set_runtime(runtime)
    w.use_agent("alice")
    yield w
    common.set_runtime(None)


async def call_tool(server: Any, name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Call an MCP tool and decode its JSON result; tool errors are returned as {'tool_error': {...}}."""
    from mcp.server.mcpserver.exceptions import ToolError

    try:
        result = await server.call_tool(name, args)
    except ToolError as exc:
        text = str(exc)
        payload = text[text.index("{") :] if "{" in text else "{}"
        return {"tool_error": json.loads(payload), "raw": text}
    assert not result.is_error, result
    return json.loads(result.content[0].text)
