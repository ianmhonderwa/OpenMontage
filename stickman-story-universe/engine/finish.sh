#!/usr/bin/env bash
# Finish an episode after the MP4 is delivered: tick its queue row, commit episode + SOCIAL.md + PRODUCTION.md, push.
# Usage: bash engine/finish.sh <EP> "<commit title>"
set -euo pipefail
cd "$(dirname "$0")/.."
EP="$1"; MSG="${2:-$EP}"
sed -i "s/^\(| [0-9]* | $EP .*\)| \[ \] |\$/\1| [x] |/" PRODUCTION.md
grep -q "| $EP .*\[x\]" PRODUCTION.md && echo "ticked $EP"
cd ..
git add "stickman-story-universe/episodes/$EP" stickman-story-universe/SOCIAL.md stickman-story-universe/PRODUCTION.md stickman-story-universe/engine
git commit -qm "$MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01VxRZk1VdFcxcDNAXTUC7WR"
for i in 1 2 3 4; do git push -q origin claude/stickman-story-universe-gz78n1 2>/dev/null && break; sleep $((2**i)); done
git log --oneline -1
grep -m1 -n "\[ \]" stickman-story-universe/PRODUCTION.md | cut -d'|' -f3,4
