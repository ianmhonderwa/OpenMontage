#!/usr/bin/env python3
"""Scan tracked files for secrets before committing or releasing.

Looks for private keys, live-looking platform tokens, Fernet keys and committed .env files.
Test fixtures use obviously fake values (e.g. 'demo', 'test') which are allow-listed.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = {
    "private key": re.compile(r"-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----"),
    "Google OAuth client secret": re.compile(r"GOCSPX-[A-Za-z0-9_-]{20,}"),
    "Google access token": re.compile(r"ya29\.[A-Za-z0-9_-]{30,}"),
    "Meta token": re.compile(r"EAA[A-Za-z0-9]{60,}"),
    "AWS key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "GitHub token": re.compile(r"gh[pousr]_[A-Za-z0-9]{36,}"),
    "OpenSocial key": re.compile(r"os(agent|owner)_[A-Za-z0-9_-]{40,}"),
    "Fernet key assignment": re.compile(r"ENCRYPTION_KEYS\s*=\s*[A-Za-z0-9_-]{43}="),
}
ALLOW = re.compile(r"demo|test|example|fake|dummy|placeholder", re.IGNORECASE)
FORBIDDEN_FILES = re.compile(r"(^|/)(\.env|.*\.pem|.*\.key|client_secret.*\.json|credentials.*\.json)$")


def tracked_files() -> list[Path]:
    try:
        out = subprocess.run(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        return [ROOT / line for line in out.splitlines() if line]
    except (subprocess.CalledProcessError, FileNotFoundError):
        return [p for p in ROOT.rglob("*") if p.is_file() and ".venv" not in p.parts and "node_modules" not in p.parts]


def main() -> int:
    findings = []
    for path in tracked_files():
        rel = path.relative_to(ROOT).as_posix()
        if FORBIDDEN_FILES.search(rel) and not rel.endswith(".env.example"):
            findings.append(f"{rel}: file type must never be committed")
            continue
        if not path.is_file() or path.stat().st_size > 2_000_000:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        for number, line in enumerate(text.splitlines(), 1):
            for name, pattern in PATTERNS.items():
                match = pattern.search(line)
                if match and not ALLOW.search(line):
                    findings.append(f"{rel}:{number}: possible {name}")
    if findings:
        print("Potential secrets found:\n  " + "\n  ".join(findings))
        return 1
    print("Secret scan: no findings.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
