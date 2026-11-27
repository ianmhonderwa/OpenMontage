from opensocial.core import approvals
from opensocial.core.database import Platform
from opensocial.servers import youtube
from tests.conftest import call_tool
from tests.factories import make_mp4


async def test_reads(world):
    acc = world.accounts["alice"][Platform.YOUTUBE]
    channel = await call_tool(youtube.server, "youtube_get_channel", {"account_id": acc})
    assert channel["environment"] == "demo-mock"
    assert channel["channel"]["statistics"]["subscriberCount"] == 4200
    videos = await call_tool(youtube.server, "youtube_list_videos", {"account_id": acc})
    assert len(videos["videos"]) == 2
    assert videos["videos"][1]["description"]["suspicious"] is True
    comments = await call_tool(youtube.server, "youtube_list_comments", {"account_id": acc, "video_id": "vid_demo_1"})
    assert comments["comments"][0]["text"]["untrusted"] is True
    playlists = await call_tool(youtube.server, "youtube_list_playlists", {"account_id": acc})
    assert playlists["playlists"][0]["playlist_id"] == "PLdemo1"
    video = await call_tool(youtube.server, "youtube_get_video", {"account_id": acc, "video_id": "vid_demo_1"})
    assert video["video"]["video_id"] == "vid_demo_1"


async def test_analytics_and_validation(world):
    acc = world.accounts["alice"][Platform.YOUTUBE]
    report = await call_tool(
        youtube.server,
        "youtube_get_analytics",
        {"account_id": acc, "start_date": "2026-11-01", "end_date": "2026-11-07", "dimensions": ["day"]},
    )
    assert report["rows"][0]["day"] == "2026-11-01"
    assert "views" in report["metric_definitions"]
    bad = await call_tool(
        youtube.server,
        "youtube_get_analytics",
        {"account_id": acc, "start_date": "2026-11-07", "end_date": "2026-11-01"},
    )
    assert bad["tool_error"]["error"] == "validation_failed"
    bad_metric = await call_tool(
        youtube.server,
        "youtube_get_analytics",
        {"account_id": acc, "start_date": "2026-11-01", "end_date": "2026-11-02", "metrics": ["revenue_secret"]},
    )
    assert bad_metric["tool_error"]["error"] == "validation_failed"


async def test_upload_flow_with_approval(world, media_root):
    acc = world.accounts["alice"][Platform.YOUTUBE]
    make_mp4(media_root / "short.mp4", seconds=40)
    args = {
        "account_id": acc,
        "file_path": "short.mp4",
        "title": "My Short",
        "as_short": True,
        "description": "Learn fast",
        "tags": ["learn"],
    }
    first = await call_tool(youtube.server, "youtube_upload_video", args)
    assert first["status"] == "approval_required"
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    done = await call_tool(youtube.server, "youtube_upload_video", {**args, "approval_id": first["approval_id"]})
    assert done["uploaded"] is True and done["video_id"] == "vid_demo_new"
    again = await call_tool(youtube.server, "youtube_upload_video", {**args, "approval_id": first["approval_id"]})
    assert again["tool_error"]["error"] == "permission_denied"  # approvals are single-use


async def test_changed_file_invalidates_approval(world, media_root):
    acc = world.accounts["alice"][Platform.YOUTUBE]
    path = make_mp4(media_root / "v.mp4", seconds=40)
    args = {"account_id": acc, "file_path": "v.mp4", "title": "T"}
    first = await call_tool(youtube.server, "youtube_upload_video", args)
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
    make_mp4(path, seconds=41)
    result = await call_tool(youtube.server, "youtube_upload_video", {**args, "approval_id": first["approval_id"]})
    assert result["tool_error"]["error"] == "permission_denied"


async def test_upload_rejects_invalid_short(world, media_root):
    acc = world.accounts["alice"][Platform.YOUTUBE]
    make_mp4(media_root / "wide.mp4", width=1920, height=1080, seconds=40)
    result = await call_tool(
        youtube.server,
        "youtube_upload_video",
        {"account_id": acc, "file_path": "wide.mp4", "title": "x", "as_short": True},
    )
    assert result["tool_error"]["error"] == "validation_failed"
    sched = await call_tool(
        youtube.server,
        "youtube_upload_video",
        {
            "account_id": acc,
            "file_path": "wide.mp4",
            "title": "x",
            "privacy_status": "public",
            "publish_at": "2026-12-01T10:00:00Z",
        },
    )
    assert sched["tool_error"]["error"] == "validation_failed"


async def test_update_reply_and_playlists_need_approval(world):
    acc = world.accounts["alice"][Platform.YOUTUBE]
    for tool, args in [
        ("youtube_update_video", {"video_id": "vid_demo_1", "title": "New"}),
        ("youtube_reply_comment", {"comment_id": "cmt_demo_1", "text": "Thanks!"}),
        ("youtube_create_playlist", {"title": "New list"}),
        ("youtube_add_to_playlist", {"playlist_id": "PLdemo1", "video_id": "vid_demo_1"}),
    ]:
        first = await call_tool(youtube.server, tool, {"account_id": acc, **args})
        assert first["status"] == "approval_required", tool
        with world.runtime.db.session() as s:
            approvals.decide(s, world.owner("alice"), first["approval_id"], approve=True)
        done = await call_tool(youtube.server, tool, {"account_id": acc, **args, "approval_id": first["approval_id"]})
        assert "tool_error" not in done, (tool, done)
    empty = await call_tool(youtube.server, "youtube_update_video", {"account_id": acc, "video_id": "v"})
    assert empty["tool_error"]["error"] == "validation_failed"


async def test_list_accounts_and_whoami(world):
    accounts = await call_tool(youtube.server, "youtube_list_accounts", {})
    assert len(accounts["accounts"]) == 1
    assert "token" not in str(accounts).lower().replace("token_expires_at", "")
    who = await call_tool(youtube.server, "opensocial_whoami", {})
    assert who["mode"] == "assistant"
