"""Synthesised Karplus-Strong plucked music bed (no external assets). Usage: python3 engine/music.py SOC-002 [seed]"""
import numpy as np, soundfile as sf, json, sys

SR = 44100
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
EP = sys.argv[1]
P = str(ROOT / "out" / EP) + "/"
dur = json.load(open(P + "timing.json"))["duration"]
rng = np.random.default_rng(int(sys.argv[2]) if len(sys.argv) > 2 else 7)

def pluck(freq, length=2.4, decay=0.996, bright=0.5):
    n = int(SR * length); period = int(SR / freq)
    buf = rng.uniform(-1, 1, period) * bright + (1 - bright) * np.sin(np.linspace(0, 2 * np.pi, period))
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = decay * 0.5 * (buf[i % period] + buf[(i + 1) % period])
    env = np.minimum(1, np.arange(n) / (SR * 0.004))
    return out * env

def hz(m): return 440 * 2 ** ((m - 69) / 12)

# D dorian, 92 bpm, gentle arpeggios over i - IV - i - VII
bpm = 92; beat = 60 / bpm; eighth = beat / 2
chords = [[50, 57, 62, 65, 69], [55, 59, 62, 67, 71], [50, 57, 62, 65, 69], [48, 55, 60, 64, 67]]
pattern = [0, 2, 3, 4, 3, 2, 1, 2]
track = np.zeros(int(SR * (dur + 3)))
cache = {}
t = 0.0; bar = 0
while t < dur + 1:
    ch = chords[bar % 4]
    for k, idx in enumerate(pattern):
        m = ch[idx]
        if m not in cache: cache[m] = pluck(hz(m))
        s = cache[m]; i0 = int((t + k * eighth) * SR)
        if i0 >= len(track): break
        seg = s[: len(track) - i0]
        track[i0:i0 + len(seg)] += seg * (0.55 if k else 0.8)
    # soft bass drone on the root
    r = ch[0] - 12
    if r not in cache: cache[r] = pluck(hz(r), 4.0, 0.998, 0.2)
    i0 = int(t * SR); seg = cache[r][: len(track) - i0]; track[i0:i0 + len(seg)] += seg * 0.5
    t += 8 * eighth; bar += 1

track = track[: int(SR * dur)]
fade = int(SR * 2.5); track[-fade:] *= np.linspace(1, 0, fade)
track[: int(SR * 0.5)] *= np.linspace(0, 1, int(SR * 0.5))
track /= np.max(np.abs(track)) + 1e-9
sf.write(P + "music.wav", (track * 0.9).astype(np.float32), SR)
print("music", round(dur, 2), "s")
