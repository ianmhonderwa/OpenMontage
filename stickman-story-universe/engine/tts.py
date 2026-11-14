"""Narration for one episode with Kokoro TTS (Apache-2.0). Usage: python3 engine/tts.py SOC-002
Reads episodes/<EP>/script.json, writes out/<EP>/narration.wav and out/<EP>/timing.json (per-line timings)."""
import json, sys, pathlib, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
ROOT = pathlib.Path(__file__).resolve().parent.parent
EP = sys.argv[1]; S = json.load(open(ROOT / "episodes" / EP / "script.json"))
M = ROOT / "out" / "_models" / "kokoro"; OUT = ROOT / "out" / EP; OUT.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(M / "kokoro-v1.0.int8.onnx"), str(M / "voices-v1.0.bin"))
gaps = S.get("gaps") or [0.45] * (len(S["lines"]) - 1) + [0.0]
sr = 24000; t = 0.35; out = [np.zeros(int(0.35 * sr), np.float32)]; segs = []
for i, (ln, g) in enumerate(zip(S["lines"], gaps)):
    a, sr = k.create(ln, voice=S.get("voice", "bm_george"), speed=S.get("speed", 1.05), lang="en-gb")
    a = a.astype(np.float32)
    segs.append({"scene": i + 1, "text": ln, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
    out += [a, np.zeros(int(g * sr), np.float32)]; t += len(a) / sr + g
out.append(np.zeros(int(0.8 * sr), np.float32))
audio = np.concatenate(out); sf.write(OUT / "narration.wav", audio, sr)
dur = round(len(audio) / sr, 3)
json.dump({"voice": S.get("voice"), "segments": segs, "duration": dur}, open(OUT / "timing.json", "w"), indent=1)
words = sum(len(l.split()) for l in S["lines"])
print(f"{EP}: {words} words, {dur} s")
if not 45 <= dur <= 60: print(f"WARNING: duration {dur}s is outside 45-60 s — adjust lines/speed")
