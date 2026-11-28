#!/usr/bin/env python3
"""Filter a CSV/XLSX in code and print only a small sample, so large tables never enter the chat.
Usage: peek_table.py FILE [--sheet NAME] [--where COL=VALUE ...] [--cols A,B] [--limit 5]"""
import argparse, csv, sys
from pathlib import Path

def rows(path, sheet=None):
    p = Path(path)
    if p.suffix.lower() in (".xlsx", ".xlsm"):
        from openpyxl import load_workbook
        ws = load_workbook(p, read_only=True, data_only=True)[sheet] if sheet else load_workbook(p, read_only=True, data_only=True).active
        it = ws.iter_rows(values_only=True)
        head = [str(h) for h in next(it)]
        for r in it:
            yield dict(zip(head, r))
    else:
        with open(p, newline="", encoding="utf-8-sig") as f:
            yield from csv.DictReader(f)

ap = argparse.ArgumentParser()
ap.add_argument("file"); ap.add_argument("--sheet"); ap.add_argument("--where", action="append", default=[])
ap.add_argument("--cols"); ap.add_argument("--limit", type=int, default=5)
a = ap.parse_args()
conds = [w.split("=", 1) for w in a.where]
cols = a.cols.split(",") if a.cols else None
n, shown = 0, []
for r in rows(a.file, a.sheet):
    if all(str(r.get(k, "")) == v for k, v in conds):
        n += 1
        if len(shown) < a.limit:
            shown.append({c: r.get(c) for c in cols} if cols else r)
print(f"{n} matching rows; first {len(shown)}:")
for s in shown:
    print(s)
