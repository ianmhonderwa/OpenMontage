#!/usr/bin/env bash
# Re-voice a narration WAV in place with the owner's voice (FreeVC), if enabled and past the start time.
# Usage: bash apply_owner_voice.sh <narration.wav>     (keeps the Kokoro original as *_kokoro.wav)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$HERE")"; W="$1"
ON=$(python3 - "$HERE/owner_voice.json" <<'PY'
import json, sys, datetime
c = json.load(open(sys.argv[1]))
print(1 if c.get("enabled") and datetime.datetime.now(datetime.timezone.utc) >= datetime.datetime.fromisoformat(c["from"]) else 0)
PY
)
REF="$ROOT/out/_models/owner_voice/reference.wav"
if [ "$ON" != 1 ]; then echo "owner voice: not active yet (Kokoro voice kept)"; exit 0; fi
if [ ! -s "$REF" ]; then echo "OWNER VOICE MISSING: restore $REF from Drive file $(python3 -c "import json;print(json.load(open('$HERE/owner_voice.json'))['drive_backup_file_id'])") (m4a -> 24 kHz mono wav)"; exit 3; fi
cp "$W" "${W%.wav}_kokoro.wav"
python3 "$HERE/voiceconv.py" "${W%.wav}_kokoro.wav" "$W" "$REF" 2>&1 | grep -E "^converted" || { echo "voice conversion failed"; exit 4; }
echo "owner voice: applied to $W"
