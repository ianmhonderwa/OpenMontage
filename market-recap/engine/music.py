"""Synthesised minimal finance-news bed (soft kick, hats, pulsing pad). No external assets.
Usage: python3 engine/music.py <ID> [seed]"""
import numpy as np, soundfile as sf, json, sys, pathlib
SR = 44100; ROOT = pathlib.Path(__file__).resolve().parent.parent; EP = sys.argv[1]
dur = json.load(open(ROOT / "out" / EP / "timing.json"))["duration"]; rng = np.random.default_rng(int(sys.argv[2]) if len(sys.argv) > 2 else 3)
n = int(SR * dur); mix = np.zeros(n); bpm = 104; beat = 60 / bpm
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def add(sig, at):
    i = int(at * SR); j = min(n, i + len(sig))
    if i < n: mix[i:j] += sig[: j - i]
tk = np.arange(int(SR * 0.35)) / SR; kick = np.sin(2 * np.pi * (48 + 70 * np.exp(-tk * 30)) * tk) * np.exp(-tk * 9) * 0.55
th = np.arange(int(SR * 0.06)) / SR; hat = rng.uniform(-1, 1, len(th)) * np.exp(-th * 70) * 0.07
prog = [[50, 57, 62, 65], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]]   # Dm  Bb  Gm  A
bar = beat * 4; t = 0.0; b = 0
while t < dur:
    ch = prog[b % 4]; L = int(bar * SR); tt = np.arange(L) / SR
    pad = sum(np.sin(2 * np.pi * hz(m) * tt + np.sin(2 * np.pi * 0.3 * tt) * 0.3) for m in ch) / len(ch)
    pump = 0.55 + 0.45 * np.minimum(1, ((tt % beat) / beat) * 3)
    add(pad * pump * 0.09 * np.minimum(1, tt / 0.3) * np.minimum(1, (bar - tt) / 0.3), t)
    bass = np.sin(2 * np.pi * hz(ch[0] - 12) * tt) * 0.12 * pump; add(bass, t)
    for k in range(4):
        add(kick, t + k * beat)
        for h in (0.5, 0.75): add(hat, t + (k + h) * beat)
    t += bar; b += 1
fade = np.minimum(1, np.arange(n) / (SR * 1.5)) * np.minimum(1, (n - np.arange(n)) / (SR * 2.5))
mix = mix * fade; mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.8
sf.write(ROOT / "out" / EP / "music.wav", np.stack([mix, mix], 1).astype(np.float32), SR); print(f"music {dur:.1f} s")
