#!/usr/bin/env bash
# Stickman Story Universe – build one episode end to end.
# Usage: bash engine/build.sh <EP> [stills|full]   (stills = narration + test stills only; full = everything)
set -euo pipefail
cd "$(dirname "$0")/.."
EP="$1"; MODE="${2:-full}"; OUT="out/$EP"; mkdir -p "$OUT" out/_models/kokoro

# --- one-time setup (idempotent) ---
M=out/_models/kokoro; REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -s $M/kokoro-v1.0.int8.onnx ] || curl -sSL --max-time 600 -o $M/kokoro-v1.0.int8.onnx $REL/kokoro-v1.0.int8.onnx
[ -s $M/voices-v1.0.bin ] || curl -sSL --max-time 300 -o $M/voices-v1.0.bin $REL/voices-v1.0.bin
python3 -c "import kokoro_onnx, soundfile" 2>/dev/null || pip install -q kokoro-onnx soundfile
[ -d node_modules/three ] || npm install --silent --no-save three@0.170.0
node -e "require('playwright')" 2>/dev/null || { echo "playwright missing"; exit 1; }

# --- narration, music ---
if [ -s "$OUT/narration.wav" ] && [ -s "$OUT/timing.json" ] && [ "$OUT/timing.json" -nt "episodes/$EP/script.json" ] && [ -z "${FORCE_TTS:-}" ]; then echo "narration cached"; else
python3 engine/tts.py "$EP"
bash engine/apply_owner_voice.sh "$OUT/narration.wav"
fi
[ -s "$OUT/music.wav" ] && [ "$OUT/music.wav" -nt "$OUT/timing.json" ] || python3 engine/music.py "$EP" "${MUSIC_SEED:-7}"

# --- test stills: one per scene (mid-point) + contact sheet ---
TIMES=$(python3 -c "
import json; t=json.load(open('$OUT/timing.json')); s=t['segments']
print(','.join(str(round((x['start']+x['end'])/2,2)) for x in s))")
node engine/render.js "$EP" stills "$TIMES"
python3 - "$OUT" <<'PY'
import sys, glob, subprocess, os
d = sys.argv[1]; fs = sorted(glob.glob(f"{d}/stills/t*.jpg"), key=lambda p: float(os.path.basename(p)[1:-4]))
ins = sum([["-i", f] for f in fs], []); n = len(fs)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", f"hstack=inputs={n},scale={240*n}:-1", f"{d}/contact_sheet.jpg"], check=True)
PY
echo "contact sheet: $OUT/contact_sheet.jpg"
[ "$MODE" = "stills" ] && exit 0

# --- full render + mix ---
node engine/render.js "$EP" video 30
NAME=$(python3 -c "import json,re; s=json.load(open('episodes/$EP/script.json')); print(s['id']+'_'+re.sub(r'[^A-Za-z0-9]+','_',s['title']).strip('_'))")
ffmpeg -y -loglevel error -i "$OUT/video_only.mp4" -i "$OUT/narration.wav" -i "$OUT/music.wav" -filter_complex \
 "[1:a]aresample=48000,asplit=2[vo][sc];[2:a]aresample=48000,volume=0.16[m];[m][sc]sidechaincompress=threshold=0.05:ratio=4:attack=20:release=400[md];[vo][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/$NAME.mp4"
ffprobe -v error -show_entries format=duration,size -of compact "$OUT/$NAME.mp4"
echo "FINAL: $OUT/$NAME.mp4"
# 720p preview (< 3 MB) for Google Drive uploads from a session (4.2 MB per-request limit)
ffmpeg -y -loglevel error -i "$OUT/$NAME.mp4" -vf scale=720:1280:flags=lanczos -c:v libx264 -preset slow -crf 30 -maxrate 380k -bufsize 760k \
 -pix_fmt yuv420p -c:a aac -b:a 64k -ac 1 -movflags +faststart "$OUT/${NAME}_preview720.mp4"
ls -la "$OUT/${NAME}_preview720.mp4"; sha256sum "$OUT/${NAME}_preview720.mp4"
echo "PREVIEW: $OUT/${NAME}_preview720.mp4"
