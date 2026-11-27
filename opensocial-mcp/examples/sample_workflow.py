#!/usr/bin/env python3
"""End-to-end example against simulated platform APIs (no real accounts are touched).

    OPENSOCIAL_DEMO_MODE=true OPENSOCIAL_ENCRYPTION_KEYS=$(opensocial generate-key) \\
    OPENSOCIAL_DATABASE_URL=sqlite:///./example.db python examples/sample_workflow.py

It plays both roles explicitly so you can see the separation:
* the AGENT reads accounts, creates content, adapts it and submits it (approval requested);
* the OWNER approves; only then does the publish run.
"""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

import yaml

from opensocial.core import approvals
from opensocial.core.authentication import authenticate
from opensocial.core.config import get_settings
from opensocial.core.database import Mode, Platform, User
from opensocial.core.runtime import Runtime
from opensocial.integrations.oauth import DiscoveredAccount, TokenSet, upsert_account
from opensocial.integrations.registry import load_integrations
from opensocial.services import core_operations  # noqa: F401
from opensocial.services.publishing_manager import execute_approved, submit_variant


async def main(brand_file: Path) -> None:
    settings = get_settings()
    if not settings.demo_mode:
        raise SystemExit("Run this example with OPENSOCIAL_DEMO_MODE=true.")
    load_integrations()
    rt = Runtime(settings)
    rt.db.create_all()
    from opensocial.core.authentication import create_user, issue_api_key

    with rt.db.session() as s:
        user = s.query(User).filter_by(email="example@example.org").one_or_none() or create_user(
            s, "example@example.org", "Example"
        )
        user.mode = Mode.ASSISTANT
        agent_key, owner_key = issue_api_key(s, user, "agent"), issue_api_key(s, user, "owner")
        fb = upsert_account(
            s,
            rt.cipher,
            owner_id=user.id,
            platform=Platform.FACEBOOK,
            discovered=DiscoveredAccount("page_demo_1", "Demo Page"),
            tokens=TokenSet("demo-token"),
            granted_scopes=["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
        ).id
        agent, owner = authenticate(s, agent_key), authenticate(s, owner_key)

    print("1. Agent reads the Page:", (await rt.execute(agent, "facebook_get_page", {}, account_id=fb))["page"]["name"])
    brand = await rt.execute(agent, "opensocial_save_brand", {"brand": yaml.safe_load(brand_file.read_text())})
    item = await rt.execute(
        agent,
        "opensocial_create_content",
        {
            "title": "Why particle size matters in flotation",
            "brand_id": brand["brand"]["brand_id"],
            "body": "Flotation recovery drops for very fine and very coarse particles. Grind to liberate, not to dust.",
        },
    )
    variants = await rt.execute(
        agent,
        "opensocial_adapt_content",
        {"item_id": item["item"]["item_id"], "platforms": ["facebook"], "accounts": {"facebook": fb}},
    )
    variant = variants["variants"][0]
    print("2. Facebook version:\n", variant["caption"])
    pending = await submit_variant(rt, agent, variant["variant_id"])
    print("3. Agent submitted it:", pending["status"], pending["approval_id"])
    with rt.db.session() as s:
        approvals.decide(s, owner, pending["approval_id"], approve=True, note="Looks good")
    result = await execute_approved(rt, owner, pending["approval_id"])
    print("4. Owner approved and it ran:", json.dumps(result))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--brand", type=Path, default=Path(__file__).with_name("sample_brand_config.yaml"))
    asyncio.run(main(parser.parse_args().brand))
