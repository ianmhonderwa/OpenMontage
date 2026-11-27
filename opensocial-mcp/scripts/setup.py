#!/usr/bin/env python3
"""Beginner setup wizard.

    python scripts/setup.py            # interactive
    python scripts/setup.py --demo     # simulated accounts, no developer credentials needed

Creates .env with a fresh encryption key, initialises the database, creates your user
(or a demo user) and prints a ready-to-paste Claude Desktop configuration.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / ".env"
SERVERS = ["youtube", "tiktok", "facebook", "instagram", "whatsapp", "kindle", "core"]


def run(*args: str, env: dict[str, str]) -> str:
    return subprocess.run(args, check=True, capture_output=True, text=True, env=env, cwd=ROOT).stdout


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--demo", action="store_true", help="Use simulated platform APIs and a demo user")
    parser.add_argument("--email", default=None)
    args = parser.parse_args()

    cli = shutil.which("opensocial") or str(Path(sys.executable).parent / "opensocial")
    if not Path(cli).exists():
        print("Install first:  pip install -e .   (or: make install)")
        return 1
    if ENV.exists():
        print(f"{ENV} already exists; leaving it unchanged.")
    else:
        from cryptography.fernet import Fernet

        text = (ROOT / ".env.example").read_text()
        key = Fernet.generate_key().decode()
        text = text.replace("OPENSOCIAL_ENCRYPTION_KEYS=", f"OPENSOCIAL_ENCRYPTION_KEYS={key}")
        text = text.replace("sqlite:///./opensocial.db", f"sqlite:///{ROOT / 'opensocial.db'}")
        text = text.replace("OPENSOCIAL_MEDIA_ROOTS=./media", f"OPENSOCIAL_MEDIA_ROOTS={ROOT / 'media'}")
        text = text.replace("OPENSOCIAL_DEMO_MODE=true", f"OPENSOCIAL_DEMO_MODE={'true' if args.demo else 'false'}")
        ENV.write_text(text)
        os.chmod(ENV, 0o600)
        print(f"Created {ENV} (permissions 600) with a new encryption key.")
    (ROOT / "media").mkdir(exist_ok=True)

    env = {**os.environ}
    for line in ENV.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            env.setdefault(key.strip(), value.strip())
    run(cli, "init-db", env=env)

    if args.demo:
        seed = json.loads(run(cli, "demo", "seed", env=env))
        agent_key, owner_key = seed["agent_key"], seed["owner_key"]
        print("Demo user created with one simulated account per platform.")
    else:
        email = args.email or input("Your e-mail address: ").strip()
        output = run(cli, "create-user", "--email", email, "--admin", env=env)
        owner_key = next(line.split(": ", 1)[1].strip() for line in output.splitlines() if "OWNER key" in line)
        agent_key = next(line.split(": ", 1)[1].strip() for line in output.splitlines() if "AGENT key" in line)

    config = {
        "mcpServers": {
            f"opensocial-{name}": {
                "command": str(Path(cli).parent / f"opensocial-{name}"),
                "env": {"OPENSOCIAL_ENV_FILE": str(ENV), "OPENSOCIAL_API_KEY": agent_key},
            }
            for name in SERVERS
        }
    }
    out = ROOT / "claude_desktop_config.generated.json"
    out.write_text(json.dumps(config, indent=2))
    os.chmod(out, 0o600)
    print(f"\nOWNER key (dashboard/CLI only — never give it to an AI): {owner_key}")
    print(f"Claude Desktop config written to {out.name} (agent key included; keep private).")
    print("Next: `opensocial serve`, open http://127.0.0.1:8080 and sign in with the owner key.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
