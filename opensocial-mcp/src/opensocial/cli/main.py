"""`opensocial` command-line interface.

Owner actions (approving, connecting accounts, emergency controls) prompt for the *owner*
key with hidden input. Never give your owner key to an AI agent: an agent with your owner
key could approve its own requests.
"""

from __future__ import annotations

import asyncio
import getpass
import json
import os
from typing import Any

import typer
from sqlalchemy import select

from opensocial import __version__
from opensocial.core import approvals
from opensocial.core.authentication import authenticate, create_user, issue_api_key
from opensocial.core.config import get_settings
from opensocial.core.database import Account, ApprovalStatus, Mode, Platform, User, get_controls
from opensocial.core.exceptions import OpenSocialError
from opensocial.core.permissions import Principal
from opensocial.core.runtime import Runtime
from opensocial.core.security import TokenCipher

app = typer.Typer(help="OpenSocial MCP management CLI", no_args_is_help=True)
approvals_app = typer.Typer(help="Review and decide approval requests", no_args_is_help=True)
mode_app = typer.Typer(help="Operating mode (observer / assistant / authorised_manager)", no_args_is_help=True)
demo_app = typer.Typer(help="Demo mode with simulated accounts", no_args_is_help=True)
app.add_typer(approvals_app, name="approvals")
app.add_typer(mode_app, name="mode")
app.add_typer(demo_app, name="demo")


def _runtime() -> Runtime:
    from opensocial.integrations.registry import load_integrations
    from opensocial.services import core_operations  # noqa: F401

    load_integrations()
    rt = Runtime(get_settings())
    rt.db.create_all()
    return rt


def _print(data: Any) -> None:
    typer.echo(json.dumps(data, indent=2, default=str))


def _owner(rt: Runtime) -> Principal:
    key = os.environ.get("OPENSOCIAL_OWNER_KEY_FOR_TESTS") if get_settings().environment == "test" else None
    key = key or getpass.getpass("Owner key (input hidden): ")
    with rt.db.session() as session:
        principal = authenticate(session, key)
    if not principal.is_owner:
        raise typer.BadParameter("That is an agent key. Owner actions need an owner key.")
    return principal


def _fail(exc: OpenSocialError) -> None:
    typer.secho(f"Error: {exc.message}", fg=typer.colors.RED, err=True)
    raise typer.Exit(code=1)


@app.command()
def version() -> None:
    """Show the installed version."""
    typer.echo(__version__)


@app.command("generate-key")
def generate_key() -> None:
    """Generate a Fernet key for OPENSOCIAL_ENCRYPTION_KEYS."""
    typer.echo(TokenCipher.generate_key())


@app.command("init-db")
def init_db() -> None:
    """Create database tables."""
    _runtime()
    typer.echo("Database initialised.")


@app.command("create-user")
def create_user_cmd(
    email: str = typer.Option(..., help="User e-mail"),
    name: str = "",
    admin: bool = typer.Option(False, help="Grant administrator rights"),
) -> None:
    """Create a user and print an owner key and an agent key (shown once)."""
    rt = _runtime()
    try:
        with rt.db.session() as session:
            user = create_user(session, email, name, is_admin=admin)
            owner_key = issue_api_key(session, user, "owner", "cli")
            agent_key = issue_api_key(session, user, "agent", "mcp")
            user_id = user.id
    except OpenSocialError as exc:
        _fail(exc)
    typer.echo(f"User created: {user_id} (mode: observer)")
    typer.secho(f"OWNER key (keep private; for you only): {owner_key}", fg=typer.colors.YELLOW)
    typer.secho(f"AGENT key (for MCP client config):        {agent_key}", fg=typer.colors.GREEN)
    typer.echo("These keys are shown once. Only their hashes are stored.")


@app.command("create-key")
def create_key(role: str = typer.Option("agent", help="agent or owner"), label: str = "") -> None:
    """Issue an additional key for the authenticated owner."""
    rt = _runtime()
    principal = _owner(rt)
    with rt.db.session() as session:
        user = session.get(User, principal.user_id)
        assert user is not None
        typer.echo(issue_api_key(session, user, role, label))


@mode_app.command("set")
def mode_set(mode: Mode) -> None:
    """Change the operating mode. 'observer' immediately revokes all agent autonomy."""
    rt = _runtime()
    principal = _owner(rt)
    with rt.db.session() as session:
        user = session.get(User, principal.user_id)
        assert user is not None
        user.mode = mode
    typer.echo(f"Mode set to {mode.value}.")


@mode_app.command("show")
def mode_show() -> None:
    rt = _runtime()
    principal = _owner(rt)
    with rt.db.session() as session:
        user = session.get(User, principal.user_id)
        typer.echo(user.mode.value if user else "unknown")


@approvals_app.command("list")
def approvals_list(status: str | None = typer.Option("pending", help="Status filter or 'all'")) -> None:
    rt = _runtime()
    principal = _owner(rt)
    with rt.db.session() as session:
        st = None if status in (None, "all") else ApprovalStatus(status)
        _print([approvals.to_dict(a) for a in approvals.list_for_owner(session, principal, st)])


@approvals_app.command("show")
def approvals_show(approval_id: str) -> None:
    rt = _runtime()
    principal = _owner(rt)
    with rt.db.session() as session:
        _print(approvals.to_dict(approvals.get_owned(session, principal, approval_id)))


@approvals_app.command("approve")
def approvals_approve(
    approval_id: str,
    execute: bool = typer.Option(False, help="Run it immediately"),
    note: str = "",
    yes: bool = typer.Option(False, "--yes", help="Skip the confirmation prompt"),
) -> None:
    """Approve exactly the content shown. Changing anything later invalidates the approval."""
    from opensocial.services import publishing_manager

    rt = _runtime()
    principal = _owner(rt)
    try:
        with rt.db.session() as session:
            approval = approvals.get_owned(session, principal, approval_id)
            _print(approvals.to_dict(approval))
            if not yes and not typer.confirm("Approve this exact operation?"):
                raise typer.Abort()
            approval = approvals.decide(session, principal, approval_id, approve=True, note=note)
            publishing_manager.sync_after_decision(session, approval)
        typer.echo("Approved.")
        if execute:
            _print(asyncio.run(publishing_manager.execute_approved(rt, principal, approval_id)))
    except OpenSocialError as exc:
        _fail(exc)


@approvals_app.command("reject")
def approvals_reject(approval_id: str, note: str = "") -> None:
    from opensocial.services import publishing_manager

    rt = _runtime()
    principal = _owner(rt)
    try:
        with rt.db.session() as session:
            approval = approvals.decide(session, principal, approval_id, approve=False, note=note)
            publishing_manager.sync_after_decision(session, approval)
        typer.echo("Rejected.")
    except OpenSocialError as exc:
        _fail(exc)


@approvals_app.command("execute")
def approvals_execute(approval_id: str) -> None:
    from opensocial.services import publishing_manager

    rt = _runtime()
    principal = _owner(rt)
    try:
        _print(asyncio.run(publishing_manager.execute_approved(rt, principal, approval_id)))
    except OpenSocialError as exc:
        _fail(exc)


@app.command()
def accounts() -> None:
    """List connected accounts."""
    from opensocial.servers.common import account_summary

    rt = _runtime()
    principal = _owner(rt)
    with rt.db.session() as session:
        _print(
            [account_summary(a) for a in session.scalars(select(Account).where(Account.owner_id == principal.user_id))]
        )


@app.command()
def connect(
    provider: str = typer.Argument(..., help="youtube | tiktok | facebook | instagram | instagram-facebook"),
    tiers: str = typer.Option("read", help="Comma-separated permission tiers, e.g. read,upload"),
) -> None:
    """Print the OAuth authorisation URL. Open it in a browser while the API server is running."""
    from opensocial.integrations import oauth

    rt = _runtime()
    principal = _owner(rt)
    try:
        with rt.db.session() as session:
            result = oauth.build_authorize_url(
                session,
                rt.cipher,
                rt.settings,
                user_id=principal.user_id,
                provider_key=provider,
                tiers=tiers.split(","),
            )
    except OpenSocialError as exc:
        _fail(exc)
    typer.echo(f"Requested scopes: {', '.join(result['scopes'])}")
    typer.echo(f"Open this URL within {rt.settings.oauth_state_ttl_minutes} minutes:\n{result['authorize_url']}")


@app.command()
def disconnect(account_id: str) -> None:
    """Delete an account's stored tokens."""
    from opensocial.core import audit
    from opensocial.core.database import AccountStatus
    from opensocial.core.permissions import get_owned_account

    rt = _runtime()
    principal = _owner(rt)
    with rt.db.session() as session:
        account = get_owned_account(session, principal, account_id)
        if account.credential is not None:
            session.delete(account.credential)
        account.status, account.autonomy_enabled = AccountStatus.DISCONNECTED, False
        audit.record(
            session,
            user_id=principal.user_id,
            actor="owner",
            tool="cli",
            operation="disconnect",
            account_id=account.id,
            platform=account.platform.value,
            outcome="success",
        )
    typer.echo("Disconnected.")


@app.command()
def controls(
    disable_publishing: bool | None = typer.Option(None, "--disable-publishing/--enable-publishing"),
    disable_messaging: bool | None = typer.Option(None, "--disable-messaging/--enable-messaging"),
    shutdown: bool | None = typer.Option(None, "--shutdown/--resume"),
) -> None:
    """Emergency controls (administrator only)."""
    rt = _runtime()
    principal = _owner(rt)
    with rt.db.session() as session:
        user = session.get(User, principal.user_id)
        if not user or not user.is_admin:
            typer.secho("Administrator privileges are required.", fg=typer.colors.RED, err=True)
            raise typer.Exit(1)
        c = get_controls(session)
        if disable_publishing is not None:
            c.publishing_disabled = disable_publishing
        if disable_messaging is not None:
            c.messaging_disabled = disable_messaging
        if shutdown is not None:
            c.shutdown = shutdown
        _print(
            {
                "publishing_disabled": c.publishing_disabled,
                "messaging_disabled": c.messaging_disabled,
                "shutdown": c.shutdown,
            }
        )


@app.command()
def serve(host: str = "127.0.0.1", port: int = 8080) -> None:
    """Run the management API, OAuth callbacks, webhooks and dashboard."""
    import uvicorn

    from opensocial.core.logging import configure_logging

    configure_logging()
    uvicorn.run("opensocial.api.app:app_factory", factory=True, host=host, port=port, proxy_headers=True)


@app.command()
def scheduler(interval: int = 60) -> None:
    """Run the scheduler that executes approved, scheduled operations."""
    from opensocial.core.logging import configure_logging
    from opensocial.core.scheduler import serve as serve_scheduler

    configure_logging()
    asyncio.run(serve_scheduler(_runtime(), interval))


@app.command()
def health() -> None:
    """Check configuration, database and integrations."""
    from opensocial.integrations.registry import LOAD_ERRORS

    s = get_settings()
    report: dict[str, Any] = {"version": __version__, "environment": s.environment, "demo_mode": s.demo_mode}
    try:
        rt = _runtime()
        with rt.db.session() as session:
            report["database"] = "ok"
            report["users"] = len(list(session.scalars(select(User.id))))
        rt.cipher  # noqa: B018 - validates the encryption key
        report["encryption"] = "ok"
    except OpenSocialError as exc:
        report["error"] = exc.message
    report["integration_errors"] = LOAD_ERRORS
    report["platform_credentials"] = {
        "youtube": bool(s.google_client_id),
        "tiktok": bool(s.tiktok_client_key),
        "facebook": bool(s.meta_app_id),
        "instagram": bool(s.instagram_app_id),
        "whatsapp_webhook": bool(s.whatsapp_app_secret),
    }
    _print(report)


@demo_app.command("seed")
def demo_seed(email: str = "demo@example.org") -> None:
    """Create a demo user with one simulated account per platform (requires OPENSOCIAL_DEMO_MODE=true)."""
    from opensocial.integrations.oauth import DiscoveredAccount, TokenSet, upsert_account

    if not get_settings().demo_mode:
        typer.secho(
            "Set OPENSOCIAL_DEMO_MODE=true first: demo accounts only work with simulated APIs.",
            fg=typer.colors.RED,
            err=True,
        )
        raise typer.Exit(1)
    rt = _runtime()
    with rt.db.session() as session:
        user = session.scalar(select(User).where(User.email == email)) or create_user(
            session, email, "Demo user", is_admin=True
        )
        user.mode = Mode.ASSISTANT
        owner_key = issue_api_key(session, user, "owner", "demo")
        agent_key = issue_api_key(session, user, "agent", "demo")
        created = []
        for platform, ext, name, scopes, meta in DEMO_ACCOUNTS:
            acc = upsert_account(
                session,
                rt.cipher,
                owner_id=user.id,
                platform=platform,
                discovered=DiscoveredAccount(external_id=ext, display_name=name, meta=meta),
                tokens=TokenSet(access_token=f"demo-token-{platform.value}"),
                granted_scopes=scopes,
                auth_flow="demo",
            )
            created.append({"platform": platform.value, "account_id": acc.id, "name": name})
    _print(
        {
            "user": email,
            "mode": "assistant",
            "accounts": created,
            "owner_key": owner_key,
            "agent_key": agent_key,
            "note": "Simulated accounts only. Every tool result is labelled environment=demo-mock.",
        }
    )


DEMO_ACCOUNTS = [
    (
        Platform.YOUTUBE,
        "UCdemo000000000000000001",
        "Demo Channel",
        [
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/yt-analytics.readonly",
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.force-ssl",
        ],
        {},
    ),
    (
        Platform.TIKTOK,
        "demo-open-id",
        "Demo Creator",
        ["user.info.basic", "video.list", "video.upload", "video.publish"],
        {},
    ),
    (
        Platform.FACEBOOK,
        "page_demo_1",
        "Demo Page",
        ["pages_show_list", "pages_read_engagement", "read_insights", "pages_manage_posts", "pages_manage_engagement"],
        {},
    ),
    (
        Platform.INSTAGRAM,
        "17841400000000001",
        "demo.ig",
        [
            "instagram_business_basic",
            "instagram_business_content_publish",
            "instagram_business_manage_comments",
            "instagram_business_manage_insights",
        ],
        {"login": "instagram"},
    ),
    (
        Platform.WHATSAPP,
        "100000000000001",
        "Demo Business +263 77 000 0000",
        ["whatsapp_business_messaging", "whatsapp_business_management"],
        {"waba_id": "200000000000001"},
    ),
    (Platform.KINDLE, "kdp-demo", "Kindle publishing (demo)", [], {}),
]


if __name__ == "__main__":
    app()
