#!/usr/bin/env bash
# Market recap – build one weekly episode end to end.
# Usage: bash engine/build.sh <ID> [stills|full]
set -euo pipefail
cd "$(dirname "$0")/.."
EP="$1"; MODE="${2:-full}"; OUT="out/$EP"; mkdir -p "$OUT" out/_models/kokoro
M=out/_models/kokoro; REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
SM=../stickman-story-universe/out/_models/kokoro
for f in kokoro-v1.0.int8.onnx voices-v1.0.bin; do
  [ -s $M/$f ] || { [ -s $SM/$f ] && cp $SM/$f $M/$f; } || true
  [ -s $M/$f ] || curl -sSL --max-time 600 -o $M/$f $REL/$f
done
python3 -c "import kokoro_onnx, soundfile" 2>/dev/null || pip install -q kokoro-onnx soundfile
export PAGE=$(python3 -c "import json;print(json.load(open('episodes/$EP/episode.json')).get('page','index.html'))")
# cache: skip narration/music when they are newer than the episode script (resume after a timeout)
if [ -s "$OUT/narration.wav" ] && [ -s "$OUT/timing.json" ] && [ "$OUT/timing.json" -nt "episodes/$EP/episode.json" ] && [ -z "${FORCE_TTS:-}" ]; then echo "narration cached"; else
python3 engine/tts.py "$EP"
bash ../stickman-story-universe/engine/apply_owner_voice.sh "$OUT/narration.wav"
fi
[ -s "$OUT/music.wav" ] && [ "$OUT/music.wav" -nt "$OUT/timing.json" ] || python3 engine/music.py "$EP"
TIMES=$(python3 -c "
import json; t=json.load(open('$OUT/timing.json')); s=t['segments']
print(','.join(str(round(min(x['start']+3.2, (x['start']+x['end'])/2+1.5),2)) for x in s))")
node engine/render.js "$EP" stills "$TIMES"
python3 - "$OUT" <<'PY'
import sys, glob, subprocess, os
d = sys.argv[1]; fs = sorted(glob.glob(f"{d}/stills/t*.jpg"), key=lambda p: float(os.path.basename(p)[1:-4]))
ins = sum([["-i", f] for f in fs], []); n = len(fs)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", f"hstack=inputs={n},scale={200*n}:-1", f"{d}/contact_sheet.jpg"], check=True)
PY
echo "contact sheet: $OUT/contact_sheet.jpg"
[ "$MODE" = "stills" ] && exit 0
node engine/render.js "$EP" video 30
NAME=$(python3 -c "import json,re; s=json.load(open('episodes/$EP/episode.json')); print(s['id']+'_'+re.sub(r'[^A-Za-z0-9]+','_',s['name']).strip('_'))")
ffmpeg -y -loglevel error -i "$OUT/video_only.mp4" -i "$OUT/narration.wav" -i "$OUT/music.wav" -filter_complex \
 "[1:a]aresample=48000,asplit=2[vo][sc];[2:a]aresample=48000,volume=0.20[m];[m][sc]sidechaincompress=threshold=0.05:ratio=4:attack=20:release=400[md];[vo][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$OUT/$NAME.mp4"
ffprobe -v error -show_entries format=duration,size -of compact "$OUT/$NAME.mp4"
echo "FINAL: $OUT/$NAME.mp4"
ffmpeg -y -loglevel error -i "$OUT/$NAME.mp4" -vf scale=720:1280:flags=lanczos -c:v libx264 -preset slow -crf 30 -maxrate 300k -bufsize 600k \
 -pix_fmt yuv420p -c:a aac -b:a 64k -ac 1 -movflags +faststart "$OUT/${NAME}_preview720.mp4"
ls -la "$OUT/${NAME}_preview720.mp4"; sha256sum "$OUT/${NAME}_preview720.mp4"
echo "PREVIEW: $OUT/${NAME}_preview720.mp4"
