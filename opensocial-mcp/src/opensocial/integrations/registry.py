"""Registers OAuth providers and imports each integration's operations.

Each integration is imported independently; a failure in one is logged and the others
still load (one integration failing must not disable the others).
"""

from __future__ import annotations

import importlib
from typing import Any

import httpx

from opensocial.core.config import Settings
from opensocial.core.database import Platform
from opensocial.core.logging import get_logger
from opensocial.integrations.oauth import DiscoveredAccount, OAuthProvider, TokenSet, register_provider

log = get_logger(__name__)

INTEGRATION_MODULES = {
    "youtube": "opensocial.integrations.youtube.operations",
    "facebook": "opensocial.integrations.facebook.operations",
    "instagram": "opensocial.integrations.instagram.operations",
    "tiktok": "opensocial.integrations.tiktok.operations",
    "whatsapp": "opensocial.integrations.whatsapp.operations",
    "kindle": "opensocial.integrations.kindle.operations",
}
LOAD_ERRORS: dict[str, str] = {}


def load_integrations(names: list[str] | None = None) -> dict[str, str]:
    for name, module in INTEGRATION_MODULES.items():
        if names and name not in names:
            continue
        try:
            importlib.import_module(module)
        except Exception as exc:  # isolate failures per integration
            LOAD_ERRORS[name] = f"{type(exc).__name__}: {exc}"
            log.error("integration failed to load", extra={"integration": name})
    return LOAD_ERRORS


async def _get(
    url: str,
    transport: httpx.AsyncBaseTransport | None,
    settings: Settings,
    *,
    token: str | None = None,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    async with httpx.AsyncClient(transport=transport, timeout=settings.http_timeout_seconds) as client:
        response = await client.get(url, params=params, headers=headers)
    response.raise_for_status()
    return response.json()


# ---------------------------------------------------------------- YouTube (Google OAuth)
async def _discover_youtube(tokens: TokenSet, transport: Any, settings: Settings) -> list[DiscoveredAccount]:
    body = await _get(
        "https://www.googleapis.com/youtube/v3/channels",
        transport,
        settings,
        token=tokens.access_token,
        params={"part": "snippet", "mine": "true"},
    )
    return [DiscoveredAccount(external_id=c["id"], display_name=c["snippet"]["title"]) for c in body.get("items", [])]


register_provider(
    OAuthProvider(
        key="youtube",
        platform=Platform.YOUTUBE,
        authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
        token_url="https://oauth2.googleapis.com/token",
        revoke_url="https://oauth2.googleapis.com/revoke",
        client_id_setting="google_client_id",
        client_secret_setting="google_client_secret",
        extra_authorize_params={"access_type": "offline", "prompt": "consent", "include_granted_scopes": "true"},
        scope_tiers={
            "read": [
                "https://www.googleapis.com/auth/youtube.readonly",
                "https://www.googleapis.com/auth/yt-analytics.readonly",
            ],
            "upload": ["https://www.googleapis.com/auth/youtube.upload"],
            "manage": ["https://www.googleapis.com/auth/youtube"],
            "comments": ["https://www.googleapis.com/auth/youtube.force-ssl"],
        },
        discover=_discover_youtube,
    )
)


# ---------------------------------------------------------------- TikTok (Login Kit)
async def _discover_tiktok(tokens: TokenSet, transport: Any, settings: Settings) -> list[DiscoveredAccount]:
    body = await _get(
        "https://open.tiktokapis.com/v2/user/info/",
        transport,
        settings,
        token=tokens.access_token,
        params={"fields": "open_id,display_name"},
    )
    user = body.get("data", {}).get("user", {})
    open_id = user.get("open_id") or tokens.extra.get("open_id")
    return (
        [DiscoveredAccount(external_id=open_id, display_name=user.get("display_name", "TikTok creator"))]
        if open_id
        else []
    )


register_provider(
    OAuthProvider(
        key="tiktok",
        platform=Platform.TIKTOK,
        authorize_url="https://www.tiktok.com/v2/auth/authorize/",
        token_url="https://open.tiktokapis.com/v2/oauth/token/",
        revoke_url="https://open.tiktokapis.com/v2/oauth/revoke/",
        client_id_setting="tiktok_client_key",
        client_secret_setting="tiktok_client_secret",
        client_id_param="client_key",
        scope_separator=",",
        use_pkce=False,
        scope_tiers={
            "read": ["user.info.basic", "user.info.profile", "user.info.stats", "video.list"],
            "draft": ["video.upload"],
            "publish": ["video.publish"],
        },
        discover=_discover_tiktok,
    )
)


# ---------------------------------------------------------------- Facebook Pages (Meta)
def _meta_urls(settings: Settings) -> tuple[str, str]:
    v = settings.meta_graph_version
    return f"https://www.facebook.com/{v}/dialog/oauth", f"https://graph.facebook.com/{v}/oauth/access_token"


async def _long_lived_facebook(tokens: TokenSet, transport: Any, settings: Settings) -> TokenSet:
    """Exchange for a long-lived user token so derived Page tokens do not expire."""
    client_id = settings.meta_app_id or "demo-client"
    secret = settings.meta_app_secret.get_secret_value() if settings.meta_app_secret else "demo-secret"
    body = await _get(
        _meta_urls(settings)[1],
        transport,
        settings,
        params={
            "grant_type": "fb_exchange_token",
            "client_id": client_id,
            "client_secret": secret,
            "fb_exchange_token": tokens.access_token,
        },
    )
    return TokenSet(access_token=body["access_token"], expires_in=body.get("expires_in"), scopes=tokens.scopes)


async def _discover_pages(tokens: TokenSet, transport: Any, settings: Settings) -> list[DiscoveredAccount]:
    body = await _get(
        f"https://graph.facebook.com/{settings.meta_graph_version}/me/accounts",
        transport,
        settings,
        token=tokens.access_token,
        params={"fields": "id,name,access_token,tasks"},
    )
    return [
        DiscoveredAccount(
            external_id=p["id"],
            display_name=p["name"],
            access_token=p.get("access_token"),
            meta={"tasks": p.get("tasks", [])},
        )
        for p in body.get("data", [])
    ]


async def _discover_ig_via_pages(tokens: TokenSet, transport: Any, settings: Settings) -> list[DiscoveredAccount]:
    body = await _get(
        f"https://graph.facebook.com/{settings.meta_graph_version}/me/accounts",
        transport,
        settings,
        token=tokens.access_token,
        params={"fields": "id,name,access_token,instagram_business_account{id,username}"},
    )
    found = []
    for page in body.get("data", []):
        ig = page.get("instagram_business_account")
        if ig:
            found.append(
                DiscoveredAccount(
                    external_id=ig["id"],
                    display_name=ig.get("username", page["name"]),
                    access_token=page.get("access_token"),
                    meta={"login": "facebook", "page_id": page["id"]},
                )
            )
    return found


class _MetaProvider(OAuthProvider):
    """Meta's dialog URLs embed the Graph API version, resolved at use time."""


def _register_meta(settings: Settings | None = None) -> None:
    from opensocial.core.config import get_settings

    s = settings or get_settings()
    dialog, token = _meta_urls(s)
    register_provider(
        OAuthProvider(
            key="facebook",
            platform=Platform.FACEBOOK,
            authorize_url=dialog,
            token_url=token,
            client_id_setting="meta_app_id",
            client_secret_setting="meta_app_secret",
            scope_separator=",",
            use_pkce=False,
            scope_tiers={
                "read": ["pages_show_list", "pages_read_engagement"],
                "insights": ["read_insights"],
                "publish": ["pages_manage_posts"],
                "engage": ["pages_manage_engagement", "pages_read_user_content"],
            },
            discover=_discover_pages,
            post_exchange=_long_lived_facebook,
        )
    )
    register_provider(
        OAuthProvider(
            key="instagram-facebook",
            platform=Platform.INSTAGRAM,
            authorize_url=dialog,
            token_url=token,
            client_id_setting="meta_app_id",
            client_secret_setting="meta_app_secret",
            scope_separator=",",
            use_pkce=False,
            scope_tiers={
                "read": ["instagram_basic", "pages_show_list", "pages_read_engagement"],
                "publish": ["instagram_content_publish"],
                "comments": ["instagram_manage_comments"],
                "insights": ["instagram_manage_insights"],
            },
            discover=_discover_ig_via_pages,
            post_exchange=_long_lived_facebook,
        )
    )


_register_meta()


# ---------------------------------------------------------------- Instagram Login
async def _long_lived_instagram(tokens: TokenSet, transport: Any, settings: Settings) -> TokenSet:
    secret = settings.instagram_app_secret.get_secret_value() if settings.instagram_app_secret else "demo-secret"
    body = await _get(
        "https://graph.instagram.com/access_token",
        transport,
        settings,
        params={"grant_type": "ig_exchange_token", "client_secret": secret, "access_token": tokens.access_token},
    )
    return TokenSet(
        access_token=body["access_token"], expires_in=body.get("expires_in"), scopes=tokens.scopes, extra=tokens.extra
    )


async def _discover_instagram(tokens: TokenSet, transport: Any, settings: Settings) -> list[DiscoveredAccount]:
    body = await _get(
        f"https://graph.instagram.com/{settings.meta_graph_version}/me",
        transport,
        settings,
        token=tokens.access_token,
        params={"fields": "user_id,username,account_type"},
    )
    if body.get("account_type") not in {"BUSINESS", "MEDIA_CREATOR", "CREATOR", None}:
        return []
    return [
        DiscoveredAccount(
            external_id=str(body.get("user_id") or body.get("id")),
            display_name=body.get("username", "Instagram account"),
            meta={"login": "instagram", "account_type": body.get("account_type")},
        )
    ]


register_provider(
    OAuthProvider(
        key="instagram",
        platform=Platform.INSTAGRAM,
        authorize_url="https://www.instagram.com/oauth/authorize",
        token_url="https://api.instagram.com/oauth/access_token",
        client_id_setting="instagram_app_id",
        client_secret_setting="instagram_app_secret",
        scope_separator=",",
        use_pkce=False,
        scope_tiers={
            "read": ["instagram_business_basic"],
            "publish": ["instagram_business_content_publish"],
            "comments": ["instagram_business_manage_comments"],
            "insights": ["instagram_business_manage_insights"],
        },
        discover=_discover_instagram,
        post_exchange=_long_lived_instagram,
    )
)
