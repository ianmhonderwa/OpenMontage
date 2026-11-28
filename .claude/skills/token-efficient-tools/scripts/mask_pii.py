#!/usr/bin/env python3
"""Replace emails and phone numbers with stable tokens ([EMAIL_1], [PHONE_1]) so data can be inspected without
exposing it. The token map is written to FILE.pii-map.json (keep it out of chats and source control)."""
import json, re, sys
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE = re.compile(r"(?<!\d)(?:\+?\d[\d\s-]{7,}\d)")
src = sys.argv[1]; text = open(src, encoding="utf-8", errors="replace").read(); mapping = {}
def sub(kind):
    def f(m):
        v = m.group(0)
        if v not in mapping:
            mapping[v] = f"[{kind}_{sum(1 for t in mapping.values() if t.startswith('['+kind))+1}]"
        return mapping[v]
    return f
text = PHONE.sub(sub("PHONE"), EMAIL.sub(sub("EMAIL"), text))
json.dump({v: k for k, v in mapping.items()}, open(src + ".pii-map.json", "w"), indent=1)
sys.stdout.write(text)
