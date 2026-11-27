from opensocial.core import approvals
from opensocial.core.database import Platform
from opensocial.integrations.tiktok.client import chunk_plan
from opensocial.servers import tiktok
from tests.conftest import call_tool
from tests.factories import make_mp4


def test_chunk_plan():
    assert chunk_plan(1000) == (1000, 1)
    size = 100 * 1024 * 1024 + 5
    chunk, count = chunk_plan(size)
    assert chunk == 10 * 1024 * 1024 and count == 10


async def test_reads(world):
    acc = world.accounts["alice"][Platform.TIKTOK]
    profile = await call_tool(tiktok.server, "tiktok_get_profile", {"account_id": acc})
    assert profile["profile"]["display_name"] == "Demo Creator"
    videos = await call_tool(tiktok.server, "tiktok_list_videos", {"account_id": acc})
    assert len(videos["videos"]) == 2
    info = await call_tool(tiktok.server, "tiktok_get_creator_info", {"account_id": acc})
    assert info["creator_info"]["privacy_level_options"] == ["SELF_ONLY"]
    stats = await call_tool(tiktok.server, "tiktok_get_analytics", {"account_id": acc})
    assert stats["totals"]["view_count"] == 2500
    status = await call_tool(tiktok.server, "tiktok_get_video_status", {"account_id": acc, "publish_id": "p"})
    assert status["status"]["status"] == "PROCESSING_UPLOAD"


async def test_direct_post_respects_creator_privacy_options(world, media_root):
    acc = world.accounts["alice"][Platform.TIKTOK]
    make_mp4(media_root / "t.mp4", seconds=30)
    args = {"account_id": acc, "file_path": "t.mp4", "privacy_level": "PUBLIC_TO_EVERYONE", "caption": "hi #x"}
    first = await call_tool(tiktok.server, "tiktok_publish_video", args)
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    result = await call_tool(tiktok.server, "tiktok_publish_video", {**args, "approval_id": first["approval_id"]})
    assert result["tool_error"]["error"] == "validation_failed"
    assert "SELF_ONLY" in result["tool_error"]["message"]

    ok_args = {**args, "privacy_level": "SELF_ONLY"}
    first = await call_tool(tiktok.server, "tiktok_publish_video", ok_args)
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    done = await call_tool(tiktok.server, "tiktok_publish_video", {**ok_args, "approval_id": first["approval_id"]})
    assert done["publish_id"] == "v_pub_demo_1" and done["mode"] == "direct"


async def test_draft_upload(world, media_root):
    acc = world.accounts["alice"][Platform.TIKTOK]
    make_mp4(media_root / "d.mp4", seconds=30)
    args = {"account_id": acc, "file_path": "d.mp4", "caption": "draft"}
    first = await call_tool(tiktok.server, "tiktok_upload_video", args)
    assert first["status"] == "approval_required"
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    done = await call_tool(tiktok.server, "tiktok_upload_video", {**args, "approval_id": first["approval_id"]})
    assert done["mode"] == "draft"


async def test_duration_limit_from_creator_info(world, media_root):
    acc = world.accounts["alice"][Platform.TIKTOK]
    make_mp4(media_root / "long.mp4", seconds=900)
    args = {"account_id": acc, "file_path": "long.mp4", "privacy_level": "SELF_ONLY"}
    first = await call_tool(tiktok.server, "tiktok_publish_video", args)
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    result = await call_tool(tiktok.server, "tiktok_publish_video", {**args, "approval_id": first["approval_id"]})
    assert result["tool_error"]["error"] == "validation_failed"
