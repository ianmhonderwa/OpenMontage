import pytest

from opensocial.core.database import Account, Mode, get_controls
from opensocial.core.exceptions import EmergencyStop, NotFound, PermissionDenied
from opensocial.core.permissions import Decision, Kind, evaluate, get_owned_account, missing_scopes


def _acc(world, name="alice", platform=None):
    from opensocial.core.database import Platform

    return world.accounts[name][platform or Platform.YOUTUBE]


def test_observer_blocks_writes_allows_reads(world):
    world.set_mode("alice", Mode.OBSERVER)
    with world.runtime.db.session() as s:
        account = s.get(Account, _acc(world))
        assert evaluate(s, world.agent("alice"), Kind.READ, account=account) == Decision.ALLOW
        assert evaluate(s, world.agent("alice"), Kind.ANALYSE) == Decision.ALLOW
        for kind in (Kind.PREPARE, Kind.PUBLISH, Kind.MESSAGE, Kind.DELETE, Kind.EDIT):
            with pytest.raises(PermissionDenied):
                evaluate(s, world.agent("alice"), kind, account=account)


def test_assistant_requires_approval(world):
    with world.runtime.db.session() as s:
        account = s.get(Account, _acc(world))
        assert evaluate(s, world.agent("alice"), Kind.PREPARE) == Decision.ALLOW
        assert evaluate(s, world.agent("alice"), Kind.PUBLISH, account=account) == Decision.REQUIRE_APPROVAL
        assert evaluate(s, world.agent("alice"), Kind.DELETE, account=account) == Decision.REQUIRE_APPROVAL


def test_manager_autonomy_limits_and_delete(world):
    world.set_mode("alice", Mode.AUTHORISED_MANAGER)
    with world.runtime.db.session() as s:
        account = s.get(Account, _acc(world))
        assert evaluate(s, world.agent("alice"), Kind.PUBLISH, account=account) == Decision.REQUIRE_APPROVAL
        account.autonomy_enabled, account.autonomous_kinds, account.daily_action_limit = True, ["publish"], 1
        assert evaluate(s, world.agent("alice"), Kind.PUBLISH, account=account) == Decision.ALLOW
        assert evaluate(s, world.agent("alice"), Kind.MESSAGE, account=account) == Decision.REQUIRE_APPROVAL
        assert evaluate(s, world.agent("alice"), Kind.DELETE, account=account) == Decision.REQUIRE_APPROVAL
        from opensocial.core import audit

        audit.record(
            s,
            user_id=world.users["alice"],
            tool="t",
            operation="o",
            kind="publish",
            account_id=account.id,
            outcome="success",
        )
        assert evaluate(s, world.agent("alice"), Kind.PUBLISH, account=account) == Decision.REQUIRE_APPROVAL


def test_emergency_controls(world):
    with world.runtime.db.session() as s:
        account = s.get(Account, _acc(world))
        controls = get_controls(s)
        controls.publishing_disabled = True
        with pytest.raises(EmergencyStop):
            evaluate(s, world.agent("alice"), Kind.PUBLISH, account=account)
        assert evaluate(s, world.agent("alice"), Kind.READ, account=account) == Decision.ALLOW
        controls.messaging_disabled = True
        with pytest.raises(EmergencyStop):
            evaluate(s, world.agent("alice"), Kind.MESSAGE, account=account)
        controls.shutdown = True
        with pytest.raises(EmergencyStop):
            evaluate(s, world.agent("alice"), Kind.READ, account=account)


def test_tenant_isolation_lookup(world):
    with world.runtime.db.session() as s, pytest.raises(NotFound):
        get_owned_account(s, world.agent("bob"), _acc(world, "alice"))


def test_scope_alternatives():
    assert missing_scopes(frozenset({"a|b", "c"}), ["b", "c"]) == []
    assert missing_scopes(frozenset({"a|b", "c"}), ["c"]) == ["a|b"]


def test_missing_scope_blocks(world):
    with world.runtime.db.session() as s:
        account = s.get(Account, _acc(world))
        account.granted_scopes = ["https://www.googleapis.com/auth/youtube.readonly"]
        with pytest.raises(PermissionDenied) as exc:
            evaluate(
                s,
                world.agent("alice"),
                Kind.PUBLISH,
                account=account,
                required_scopes=frozenset({"https://www.googleapis.com/auth/youtube.upload"}),
            )
        assert exc.value.details["missing_scopes"]
