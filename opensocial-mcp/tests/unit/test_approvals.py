import pytest

from opensocial.core import approvals
from opensocial.core.database import ApprovalStatus
from opensocial.core.exceptions import NotFound, PermissionDenied, ValidationFailed


def _create(world, s, params=None):
    return approvals.create(
        s,
        world.agent("alice"),
        operation="facebook_create_post",
        kind="publish",
        platform="facebook",
        account_id="acc_x",
        params=params or {"message": "hi"},
        summary="post",
        ttl_hours=1,
    )


def test_agent_cannot_approve(world):
    with world.runtime.db.session() as s:
        a = _create(world, s)
        with pytest.raises(PermissionDenied):
            approvals.decide(s, world.agent("alice"), a.id, approve=True)


def test_owner_approves_and_consume_requires_identical_payload(world):
    with world.runtime.db.session() as s:
        a = _create(world, s)
        with pytest.raises(PermissionDenied):
            approvals.consume(
                s,
                world.agent("alice"),
                a.id,
                operation="facebook_create_post",
                account_id="acc_x",
                params={"message": "hi"},
            )
        approvals.decide(s, world.owner("alice"), a.id, approve=True)
        assert approvals.consume(
            s,
            world.agent("alice"),
            a.id,
            operation="facebook_create_post",
            account_id="acc_x",
            params={"message": "hi"},
        )
        with pytest.raises(PermissionDenied):
            approvals.consume(
                s,
                world.agent("alice"),
                a.id,
                operation="facebook_create_post",
                account_id="acc_x",
                params={"message": "hi!"},
            )
        with pytest.raises(PermissionDenied):
            approvals.consume(
                s,
                world.agent("alice"),
                a.id,
                operation="facebook_create_post",
                account_id="acc_y",
                params={"message": "hi"},
            )
        with pytest.raises(ValidationFailed):
            approvals.decide(s, world.owner("alice"), a.id, approve=False)


def test_duplicate_pending_requests_are_deduplicated(world):
    with world.runtime.db.session() as s:
        assert _create(world, s).id == _create(world, s).id
        assert _create(world, s).id != _create(world, s, {"message": "other"}).id


def test_other_tenant_cannot_see_or_decide(world):
    with world.runtime.db.session() as s:
        a = _create(world, s)
        with pytest.raises(NotFound):
            approvals.get_owned(s, world.owner("bob"), a.id)
        with pytest.raises(NotFound):
            approvals.decide(s, world.owner("bob"), a.id, approve=True)


def test_expiry(world):
    from datetime import timedelta

    from opensocial.core.database import utcnow

    with world.runtime.db.session() as s:
        a = _create(world, s)
        approvals.decide(s, world.owner("alice"), a.id, approve=True)
        a.expires_at = utcnow() - timedelta(seconds=1)
        with pytest.raises(PermissionDenied):
            approvals.consume(
                s,
                world.agent("alice"),
                a.id,
                operation="facebook_create_post",
                account_id="acc_x",
                params={"message": "hi"},
            )
        assert a.status == ApprovalStatus.EXPIRED


def test_cancel(world):
    with world.runtime.db.session() as s:
        a = _create(world, s)
        assert approvals.cancel(s, world.owner("alice"), a.id).status == ApprovalStatus.CANCELLED
