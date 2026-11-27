from datetime import UTC, datetime, timedelta

import pytest

from opensocial.core import approvals
from opensocial.core.database import ContentStatus, MetricSnapshot, Platform
from opensocial.core.exceptions import NotFound, ValidationFailed
from opensocial.core.scheduler import build_scheduler, run_due
from opensocial.services import analytics_manager, brand_manager, calendar_manager, content_manager, reporting_manager


def test_brand_validation_and_isolation(world):
    with world.runtime.db.session() as s:
        brand = brand_manager.save(s, world.users["alice"], {"name": "A", "colours": ["#112233"], "hashtags": ["#Go"]})
        assert brand_manager.to_dict(brand)["hashtags"] == ["Go"]
        with pytest.raises(NotFound):
            brand_manager.get(s, world.users["bob"], brand.id)
        updated = brand_manager.save(s, world.users["alice"], {"name": "A2"}, brand.id)
        assert updated.name == "A2"
    from pydantic import ValidationError

    with world.runtime.db.session() as s, pytest.raises(ValidationError):
        brand_manager.save(s, world.users["alice"], {"name": "B", "colours": ["red"]})
    assert brand_manager.check_terms("A guaranteed win", {"restricted_terms": ["guaranteed"]})["restricted_found"]


def test_content_status_transitions(world):
    with world.runtime.db.session() as s:
        item = content_manager.create_item(s, world.users["alice"], {"title": "Idea"})
        assert item.status == ContentStatus.IDEA
        content_manager.set_item_status(s, world.users["alice"], item.id, "DRAFT")
        with pytest.raises(ValidationFailed):
            content_manager.set_item_status(s, world.users["alice"], item.id, "PUBLISHED")
        with pytest.raises(ValidationFailed):
            content_manager.set_item_status(s, world.users["alice"], item.id, "SCHEDULED")
        content_manager.set_item_status(s, world.users["alice"], item.id, "ARCHIVED")
        with pytest.raises(ValidationFailed):
            content_manager.create_item(s, world.users["alice"], {"title": ""})
        with pytest.raises(ValidationFailed):
            content_manager.create_item(s, world.users["alice"], {"title": "x", "content_type": "hologram"})


def test_adaptation_respects_limits_and_long_video(world):
    with world.runtime.db.session() as s:
        item = content_manager.create_item(
            s,
            world.users["alice"],
            {
                "title": "T" * 150,
                "content_type": "video",
                "body": "First. Second. Third.",
                "tags": [f"t{i}" for i in range(40)],
            },
        )
        variants = content_manager.adapt_item(
            s, world.users["alice"], item.id, ["youtube", "instagram"], duration_seconds=600, vertical=False
        )
        yt, ig = variants
        assert len(yt.title) == 100 and yt.format == "video"
        assert len(ig.hashtags) == 10
        with pytest.raises(ValidationFailed):
            content_manager.adapt_item(s, world.users["alice"], item.id, ["kindle"])
        v = content_manager.update_variant(s, world.users["alice"], yt.id, {"title": ""})
        assert not v.validation["valid"]


def test_analytics_never_merges_platforms(world):
    with world.runtime.db.session() as s:
        analytics_manager.record(
            s,
            owner_id=world.users["alice"],
            account_id="a1",
            platform="youtube",
            metrics={"views": 100, "likes": None},
            source="test",
            object_id="v1",
        )
        analytics_manager.record(
            s,
            owner_id=world.users["alice"],
            account_id="a2",
            platform="instagram",
            metrics={"views": 50},
            source="test",
            object_id="m1",
        )
        summary = analytics_manager.summary(s, world.users["alice"])
        assert summary["platforms"]["youtube"]["metrics"]["views"]["value"] == 100
        assert summary["platforms"]["youtube"]["metrics"]["likes"]["missing"] == 1
        assert summary["platforms"]["instagram"]["metrics"]["views"]["value"] == 50
        assert "total" not in str(summary)
        assert summary["related_metric_families"]["views"] == ["instagram:views", "youtube:views"]
        report = reporting_manager.build(s, world.users["alice"], "weekly")
        assert report["top_content_by_metric"][0]["value"] == 100
        with pytest.raises(ValueError):
            reporting_manager.build(s, world.users["alice"], "hourly")
        assert s.query(MetricSnapshot).count() == 3


async def test_reads_record_metrics(world):
    acc = world.accounts["alice"][Platform.TIKTOK]
    await world.runtime.execute(world.agent("alice"), "tiktok_get_analytics", {"video_ids": []}, account_id=acc)
    with world.runtime.db.session() as s:
        assert (
            analytics_manager.summary(s, world.users["alice"])["platforms"]["tiktok"]["metrics"]["view_count"]["value"]
            == 2500
        )


async def test_scheduler_runs_only_due_approved(world):
    acc = world.accounts["alice"][Platform.FACEBOOK]
    future = datetime.now(UTC) + timedelta(hours=1)
    pending = await world.runtime.execute(
        world.agent("alice"),
        "facebook_create_post",
        {"post_type": "text", "message": "sched", "link": None, "media_url": None, "scheduled_time": None},
        account_id=acc,
        scheduled_for=future,
    )
    aid = pending["approval_id"]
    assert await run_due(world.runtime) == []
    with world.runtime.db.session() as s:
        approvals.decide(s, world.owner("alice"), aid, approve=True)
        entries = calendar_manager.entries(s, world.users["alice"], datetime.now(UTC), future + timedelta(hours=1))
        assert entries[0]["approval_id"] == aid
    from opensocial.core.exceptions import PermissionDenied

    with pytest.raises(PermissionDenied, match="scheduled"):
        await world.runtime.execute(
            world.agent("alice"),
            "facebook_create_post",
            {"post_type": "text", "message": "sched", "link": None, "media_url": None, "scheduled_time": None},
            account_id=acc,
            approval_id=aid,
        )
    with world.runtime.db.session() as s:
        s.get(approvals.ApprovalRequest, aid).scheduled_for = datetime.now(UTC) - timedelta(minutes=1)
    results = await run_due(world.runtime)
    assert results and results[0]["ok"]
    assert build_scheduler(world.runtime).get_job("run_due") is not None
