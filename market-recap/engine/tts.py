"""Narration for one market recap with Kokoro TTS (Apache-2.0). Usage: python3 engine/tts.py ZSE-2026-W47
Reads episodes/<ID>/episode.json (segments[].say), writes out/<ID>/narration.wav and out/<ID>/timing.json."""
import json, sys, pathlib, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
ROOT = pathlib.Path(__file__).resolve().parent.parent
EP = sys.argv[1]; S = json.load(open(ROOT / "episodes" / EP / "episode.json"))
M = ROOT / "out" / "_models" / "kokoro"; OUT = ROOT / "out" / EP; OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(M / "kokoro-v1.0.int8.onnx"), str(M / "voices-v1.0.bin"))
sr = 24000; t = 0.4; out = [np.zeros(int(0.4 * sr), np.float32)]; segs = []
for i, s in enumerate(S["segments"]):
    ln = s["say"]; g = s.get("gap", 0.35 if i < len(S["segments"]) - 1 else 0.0)
    a, sr = k.create(ln, voice=S.get("voice", "bm_george"), speed=S.get("speed", 1.0), lang="en-gb")
    a = a.astype(np.float32); hold = s.get("hold", 0.0)
    segs.append({"seg": i + 1, "type": s["type"], "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
    out += [a, np.zeros(int((g + hold) * sr), np.float32)]; t += len(a) / sr + g + hold
out.append(np.zeros(int(2.5 * sr), np.float32))
audio = np.concatenate(out); sf.write(OUT / "narration.wav", audio, sr)
dur = round(len(audio) / sr, 3)
json.dump({"voice": S.get("voice"), "segments": segs, "duration": dur}, open(OUT / "timing.json", "w"), indent=1)
words = sum(len(s["say"].split()) for s in S["segments"])
print(f"{EP}: {words} words, {dur} s")
if not 82 <= dur <= 98: print(f"WARNING: duration {dur}s is outside 82-98 s (target 1:30) — adjust narration/speed")
