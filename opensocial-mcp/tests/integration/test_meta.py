from opensocial.core import approvals
from opensocial.core.database import Platform
from opensocial.servers import facebook, instagram
from tests.conftest import call_tool
from tests.factories import make_mp4


async def _approve_and_run(world, server, tool, args):
    first = await call_tool(server, tool, args)
    assert first.get("status") == "approval_required", first
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    return await call_tool(server, tool, {**args, "approval_id": first["approval_id"]})


async def test_facebook_reads(world):
    acc = world.accounts["alice"][Platform.FACEBOOK]
    page = await call_tool(facebook.server, "facebook_get_page", {"account_id": acc})
    assert page["page"]["name"] == "Demo Page"
    posts = await call_tool(facebook.server, "facebook_list_posts", {"account_id": acc})
    assert posts["posts"][0]["message"]["untrusted"]
    comments = await call_tool(facebook.server, "facebook_get_comments", {"account_id": acc, "object_id": "p1"})
    assert comments["comments"][0]["text"]["text"] == "Nice post"
    insights = await call_tool(facebook.server, "facebook_get_insights", {"account_id": acc})
    assert insights["metrics"][0]["name"] == "page_post_engagements"
    bad = await call_tool(facebook.server, "facebook_get_insights", {"account_id": acc, "metrics": ["x;drop"]})
    assert bad["tool_error"]["error"] == "validation_failed"


async def test_facebook_post_photo_edit_reply_delete(world, monkeypatch):
    monkeypatch.setattr("opensocial.core.security._default_resolver", lambda h: ["93.184.216.34"])
    acc = world.accounts["alice"][Platform.FACEBOOK]
    done = await _approve_and_run(
        world, facebook.server, "facebook_create_post", {"account_id": acc, "message": "Hello"}
    )
    assert done["published"] is True
    photo = await _approve_and_run(
        world,
        facebook.server,
        "facebook_create_post",
        {"account_id": acc, "post_type": "photo", "message": "pic", "media_url": "https://cdn.example.com/a.jpg"},
    )
    assert photo["post_id"]
    edit = await _approve_and_run(
        world, facebook.server, "facebook_update_post", {"account_id": acc, "post_id": "p1", "message": "edited"}
    )
    assert edit["updated"]
    reply = await _approve_and_run(
        world, facebook.server, "facebook_reply_comment", {"account_id": acc, "comment_id": "c1", "message": "Thanks"}
    )
    assert reply["replied"]
    deleted = await _approve_and_run(
        world, facebook.server, "facebook_delete_post", {"account_id": acc, "post_id": "p1"}
    )
    assert deleted["deleted"]


async def test_facebook_schedule_validation(world):
    acc = world.accounts["alice"][Platform.FACEBOOK]
    bad = await call_tool(
        facebook.server,
        "facebook_create_post",
        {"account_id": acc, "message": "x", "scheduled_time": "2020-01-01T00:00:00Z"},
    )
    assert bad["tool_error"]["error"] == "validation_failed"
    from datetime import UTC, datetime, timedelta

    when = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    scheduled = await _approve_and_run(
        world, facebook.server, "facebook_create_post", {"account_id": acc, "message": "later", "scheduled_time": when}
    )
    assert scheduled["scheduled"] is True and scheduled["published"] is False


async def test_instagram_profile_media_insights(world):
    acc = world.accounts["alice"][Platform.INSTAGRAM]
    profile = await call_tool(instagram.server, "instagram_get_profile", {"account_id": acc})
    assert profile["profile"]["username"] == "demo.ig"
    assert profile["login_type"] == "instagram"
    media = await call_tool(instagram.server, "instagram_list_media", {"account_id": acc})
    assert media["media"][0]["id"] == "ig_media_demo_1"
    limit = await call_tool(instagram.server, "instagram_get_publishing_limit", {"account_id": acc})
    assert limit["publishing_limit"][0]["config"]["quota_total"] == 100
    ins = await call_tool(instagram.server, "instagram_get_insights", {"account_id": acc, "media_id": "m1"})
    assert {m["name"] for m in ins["metrics"]} >= {"reach", "views"}
    bad = await call_tool(instagram.server, "instagram_get_insights", {"account_id": acc, "metrics": ["impressions_x"]})
    assert bad["tool_error"]["error"] == "validation_failed"
    comments = await call_tool(instagram.server, "instagram_get_comments", {"account_id": acc, "media_id": "m1"})
    assert comments["comments"][0]["text"]["untrusted"]


async def test_instagram_carousel_and_reel_publish(world, monkeypatch, media_root):
    monkeypatch.setattr("opensocial.core.security._default_resolver", lambda h: ["93.184.216.34"])
    acc = world.accounts["alice"][Platform.INSTAGRAM]
    make_mp4(media_root / "reel.mp4", seconds=20)
    prepared = await call_tool(
        instagram.server,
        "instagram_create_reel",
        {
            "account_id": acc,
            "video_url": "https://cdn.example.com/reel.mp4",
            "caption": "Reel #learn",
            "local_file": "reel.mp4",
        },
    )
    assert prepared["prepared"] and prepared["local_media_validation"][0]["valid"]
    carousel = await _approve_and_run(
        world,
        instagram.server,
        "instagram_publish_media",
        {
            "account_id": acc,
            "media_type": "CAROUSEL",
            "caption": "Two pics",
            "media_urls": ["https://cdn.example.com/1.jpg", "https://cdn.example.com/2.mp4"],
        },
    )
    assert carousel["published"] and carousel["media_id"] == "ig_media_demo_new"
    reply = await _approve_and_run(
        world,
        instagram.server,
        "instagram_reply_comment",
        {"account_id": acc, "comment_id": "c1", "message": "Thank you"},
    )
    assert reply["replied"]


async def test_instagram_caption_limits(world, monkeypatch):
    monkeypatch.setattr("opensocial.core.security._default_resolver", lambda h: ["93.184.216.34"])
    acc = world.accounts["alice"][Platform.INSTAGRAM]
    tags = " ".join(f"#t{i}" for i in range(31))
    bad = await call_tool(
        instagram.server,
        "instagram_publish_media",
        {"account_id": acc, "media_type": "IMAGE", "caption": tags, "media_urls": ["https://cdn.example.com/a.jpg"]},
    )
    assert bad["tool_error"]["error"] == "validation_failed"
    one = await call_tool(
        instagram.server,
        "instagram_create_media",
        {"account_id": acc, "media_type": "CAROUSEL", "media_urls": ["https://cdn.example.com/a.jpg"]},
    )
    assert one["tool_error"]["error"] == "validation_failed"
