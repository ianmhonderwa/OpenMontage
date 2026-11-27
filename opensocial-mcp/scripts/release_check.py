#!/usr/bin/env python3
"""Pre-release checks: required files, version consistency, changelog entry, no secrets."""

from __future__ import annotations

import re
import subprocess
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "README.md",
    "LICENSE",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "SECURITY.md",
    "CHANGELOG.md",
    "pyproject.toml",
    ".gitignore",
    ".env.example",
    "Dockerfile",
    "docker-compose.yml",
    "Makefile",
    "docs/architecture.md",
    "docs/installation.md",
    "docs/security.md",
    "docs/api_reference.md",
    "docs/claude_setup.md",
    "docs/deployment.md",
    "docs/troubleshooting.md",
    "docs/contributing.md",
    "docs/privacy.md",
    "docs/platform_capabilities.md",
    "docs/quality_report.md",
    "examples/claude_desktop_config.json",
    "examples/sample_workflow.py",
    "examples/sample_brand_config.yaml",
    ".github/workflows/ci.yml",
    ".github/PULL_REQUEST_TEMPLATE.md",
]


def main() -> int:
    problems = [f"missing {f}" for f in REQUIRED if not (ROOT / f).exists()]
    version = tomllib.loads((ROOT / "pyproject.toml").read_text())["project"]["version"]
    init = (ROOT / "src/opensocial/__init__.py").read_text()
    if f'__version__ = "{version}"' not in init:
        problems.append("src/opensocial/__init__.py version differs from pyproject.toml")
    if not re.search(rf"^## \[{re.escape(version)}\]", (ROOT / "CHANGELOG.md").read_text(), re.M):
        problems.append(f"CHANGELOG.md has no entry for {version}")
    if subprocess.run([sys.executable, str(ROOT / "scripts/security_check.py")]).returncode:
        problems.append("secret scan failed")
    for p in problems:
        print(f"FAIL: {p}")
    print("Release check passed." if not problems else f"{len(problems)} problem(s).")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
