"""Soundtrack for the treadmill build video: narration + procedural SFX + ambient pad.

Deterministic (seeded). SFX timings mirror the event times in hf/scene.js.
Output: assets/audio/final_mix.wav (48 kHz stereo), loudness-normalised later by ffmpeg.
"""
import json

import numpy as np
import soundfile as sf
from scipy.signal import butter, resample_poly, sosfilt

SR = 48000
tl = json.load(open("artifacts/timeline.json"))
T = tl["total"]
N = int(T * SR) + SR
rng = np.random.default_rng(506)
seg = {s["key"]: s["start"] for s in tl["segs"]}

sfx = np.zeros(N)
vo = np.zeros(N)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def env(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def put(buf, t, x, g=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i]
    buf[i : i + len(x)] += g * x


def tvec(d):
    return np.arange(int(d * SR)) / SR


def grinder(d, load=(0, 0), seed=0):
    t = tvec(d)
    loaded = ((t > load[0]) & (t < load[1])).astype(float)
    loaded = lp(loaded, 3)  # smooth load transitions
    f = 190 * (1 - 0.12 * loaded) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = sum(np.sin(k * ph) / k for k in range(1, 9))
    hiss = bp(rng.standard_normal(len(t)), 2500, 9000) * (0.4 + 1.6 * loaded)
    crackle = bp(rng.standard_normal(len(t)), 800, 3000) * loaded * (rng.random(len(t)) > 0.7)
    return (0.25 * tone + 0.5 * hiss + 0.3 * crackle) * env(len(t), 0.5, 0.6)


def brush(d):
    t = tvec(d)
    n = bp(rng.standard_normal(len(t)), 1500, 9000)
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 31 * t)
    motor = 0.15 * np.sin(2 * np.pi * 160 * t + 0.3 * np.sin(2 * np.pi * 4 * t))
    return (0.55 * n * am + motor) * env(len(t), 0.3, 0.4)


def drill(d):
    t = tvec(d)
    ph = 2 * np.pi * 230 * t
    tone = sum(np.sin(k * ph) / (k * k) for k in range(1, 6))
    n = bp(rng.standard_normal(len(t)), 1800, 6000) * 0.5
    return (0.4 * tone + n) * env(len(t), 0.15, 0.2)


def spray(d):
    t = tvec(d)
    return hp(rng.standard_normal(len(t)), 3000) * 0.35 * env(len(t), 0.2, 0.3)


def wipe(d):
    t = tvec(d)
    n = bp(rng.standard_normal(len(t)), 400, 3000)
    am = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 1.6 * t))
    return 0.35 * n * am * env(len(t), 0.2, 0.3)


def clink(f0=2100):
    t = tvec(0.35)
    x = sum(np.sin(2 * np.pi * f0 * r * t) * np.exp(-t * dcy) for r, dcy in ((1, 14), (1.63, 18), (2.47, 24), (3.9, 30)))
    return 0.35 * x


def thud():
    t = tvec(0.6)
    low = np.sin(2 * np.pi * 85 * t) * np.exp(-t * 9)
    ring = (np.sin(2 * np.pi * 640 * t) + 0.6 * np.sin(2 * np.pi * 1130 * t)) * np.exp(-t * 7)
    burst = lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 40)
    return 0.7 * low + 0.18 * ring + 0.4 * burst


def click():
    t = tvec(0.03)
    return bp(rng.standard_normal(len(t)), 2000, 7000) * np.exp(-t * 300) * 0.8


def whirr(d, f0=420, decay=0.0):
    t = tvec(d)
    f = f0 * np.exp(-decay * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (0.15 * np.sin(ph) + 0.2 * bp(rng.standard_normal(len(t)), 300, 1200) * np.exp(-decay * t)) * env(len(t), 0.05, 0.3)


def belt_run(d):
    t = tvec(d)
    rumble = lp(rng.standard_normal(len(t)), 180, 4) * 3.0
    slap = bp(rng.standard_normal(len(t)), 500, 1800) * (0.5 + 0.5 * np.sin(2 * np.pi * 2.2 * t)) * 0.12
    return (rumble + slap) * env(len(t), 1.5, 1.5)


s = seg
# measure: tape and marker
put(sfx, s["measure"] + 1.0, bp(rng.standard_normal(int(4 * SR)), 1500, 6000) * 0.12 * env(int(4 * SR), 0.1, 0.3))
put(sfx, s["measure"] + 5.4, bp(rng.standard_normal(int(1.2 * SR)), 2500, 7000) * 0.15 * env(int(1.2 * SR), 0.05, 0.2))
put(sfx, s["measure"] + 5.2, click(), 0.7)
# cutting, deburring, wire brush, drilling
put(sfx, s["cut"] + 0.3, grinder(9.4, load=(2.2, 7.7)), 0.8)
put(sfx, s["cut"] + 8.5, thud(), 0.8)  # offcut drop
put(sfx, s["deburr"] + 0.3, grinder(10.4, load=(2.2, 8.7)), 0.7)
put(sfx, s["rust"] + 1.2, brush(11.1), 0.8)
for a, b in ((1.1, 3.3), (4.7, 6.5), (7.9, 9.5)):
    put(sfx, s["drill"] + a, drill(b - a), 0.7)
# surface treatment
put(sfx, s["degrease"] + 1.0, wipe(7.0), 0.8)
put(sfx, s["primer"] + 1.0, spray(8.0), 0.9)
put(sfx, s["paint"] + 1.0, spray(7.0), 0.9)
# base frame
for k, tt in enumerate((1.2, 1.6, 4.4, 4.9, 7.4, 8.0)):
    put(sfx, s["base"] + tt, thud(), 0.55 if k < 2 else 0.8)
for tt in (10.0, 11.8, 13.5):
    put(sfx, s["base"] + tt, clink(2100 + 150 * tt), 0.6)
for k in range(4):
    for j in range(5):
        put(sfx, s["base"] + 15.0 + k * 1.25 + j * 0.12, click(), 0.8)
for k in range(3):
    put(sfx, s["base"] + 21.5 + k * 0.8, clink(2300 + 200 * k), 0.5)
# rollers
for k in range(4):
    put(sfx, s["rollers"] + 2.5 + k * 0.5, thud(), 0.5)
for k in range(8):
    put(sfx, s["rollers"] + 5.2 + k * 0.35, clink(2400 + 60 * k), 0.35)
put(sfx, s["rollers"] + 11.0, thud(), 0.6)
put(sfx, s["rollers"] + 12.5, thud(), 0.6)
put(sfx, s["rollers"] + 14.0, whirr(6.0, 520, 0.55), 0.8)
put(sfx, s["rollers"] + 16.5, whirr(5.0, 520, 0.55), 0.8)
# deck
put(sfx, s["deck"] + 3.0, thud(), 0.6)
put(sfx, s["deck"] + 3.5, thud(), 0.6)
for k in range(6):
    put(sfx, s["deck"] + 5.0 + k * 0.3, clink(2200 + 50 * k), 0.35)
put(sfx, s["deck"] + 10.4, thud(), 0.7)
# belt
put(sfx, s["belt"] + 1.0, bp(rng.standard_normal(int(8 * SR)), 150, 900) * 0.25 * env(int(8 * SR), 0.5, 0.5))
put(sfx, s["belt"] + 13.0, belt_run(6.0), 0.6)
# uprights
for k in range(4):
    put(sfx, s["uprights"] + 3.4 + k * 0.3, clink(2000 + 80 * k), 0.4)
for tt in (6.0, 6.2, 12.0, 12.2, 16.2, 16.6):
    put(sfx, s["uprights"] + tt, clink(2500), 0.4)
put(sfx, s["uprights"] + 7.0, bp(rng.standard_normal(int(4 * SR)), 200, 700) * 0.2 * env(int(4 * SR), 0.5, 0.5))
put(sfx, s["uprights"] + 11.0, thud(), 0.6)
put(sfx, s["uprights"] + 15.0, thud(), 0.6)
put(sfx, s["uprights"] + 20.5, thud(), 0.3)
# decals
for k in range(3):
    put(sfx, s["labels"] + 1.6 + k * 1.6, bp(rng.standard_normal(int(0.4 * SR)), 2000, 8000) * 0.12 * env(int(0.4 * SR), 0.05, 0.2))
# running
run_len = s["end"] + 12 - s["run"]
put(sfx, s["run"], belt_run(run_len) + 0.5 * whirr(run_len, 300), 0.55)
put(sfx, s["title"], belt_run(10.0), 0.25)

# narration
for v in tl["vo"]:
    x, sr = sf.read(f"assets/audio/vo/{v['key']}.wav")
    if x.ndim > 1: x = x.mean(1)
    x = resample_poly(x, SR, sr)
    put(vo, v["t"], x, 1.0)

# ambient pad (A minor add9 drift), ducked under narration
t = np.arange(N) / SR
pad = np.zeros(N)
chords = [[110, 164.81, 220, 261.63, 329.63], [98, 146.83, 196, 246.94, 293.66], [87.31, 130.81, 174.61, 220, 261.63], [98, 146.83, 196, 246.94, 329.63]]
cl = 16.0
for ci in range(int(T // cl) + 2):
    ch = chords[ci % 4]
    a, b = int(ci * cl * SR), int(min(N, (ci + 1.15) * cl * SR))
    if a >= N: break
    tt = t[a:b] - ci * cl
    e = np.minimum(1, tt / 4.0) * np.minimum(1, np.maximum(0, (cl * 1.15 - tt) / 4.0))
    for f in ch:
        for det in (-0.6, 0.6):
            pad[a:b] += np.sin(2 * np.pi * (f + det) * tt + f) * e * 0.06
pad = lp(pad, 1400)
voenv = lp(np.abs(vo), 4)
duck = 1 - 0.55 * np.clip(voenv / (voenv.max() * 0.25 + 1e-9), 0, 1)
fade = np.clip(t / 3.0, 0, 1) * np.clip((T - t) / 4.0, 0, 1)
music = pad * duck * fade

vo_n = vo / (np.abs(vo).max() + 1e-9) * 0.9
sfx_n = sfx / (np.abs(sfx).max() + 1e-9) * 0.42
mus_n = music / (np.abs(music).max() + 1e-9) * 0.16
mix = vo_n + sfx_n * fade + mus_n
# simple stereo: SFX slight width via small delay
L = mix + 0.0
R = mix.copy()
R[24:] = vo_n[24:] + (sfx_n * fade)[:-24] + mus_n[24:]
out = np.stack([L, R], 1)
out /= np.abs(out).max() / 0.95
sf.write("assets/audio/final_mix_raw.wav", out[: int(T * SR)].astype(np.float32), SR)
print("audio seconds", T)
