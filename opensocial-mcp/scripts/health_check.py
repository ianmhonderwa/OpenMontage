#!/usr/bin/env python3
"""Check a running OpenSocial API: `python scripts/health_check.py [base_url]`. Exit 0 when healthy."""

from __future__ import annotations

import json
import sys
import urllib.request

url = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080").rstrip("/") + "/api/health"
try:
    with urllib.request.urlopen(url, timeout=5) as response:  # noqa: S310 - operator-supplied URL
        body = json.load(response)
except OSError as exc:
    print(f"UNHEALTHY: {exc}")
    sys.exit(1)
print(json.dumps(body, indent=2))
failed = [k for k, v in body.get("integrations", {}).items() if v != "loaded"]
active = [k for k, v in body.get("controls", {}).items() if v]
if failed:
    print(f"Integrations failing: {failed}")
if active:
    print(f"Emergency controls active: {active}")
sys.exit(0 if body.get("status") == "ok" and not failed else 1)
