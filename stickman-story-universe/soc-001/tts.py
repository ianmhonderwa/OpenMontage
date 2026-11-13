import json, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
M = "/home/user/OpenMontage/projects/_models/kokoro/"
P = "/home/user/OpenMontage/projects/soc-001-oracle/"
k = Kokoro(M + "kokoro-v1.0.int8.onnx", M + "voices-v1.0.bin")
voice = sys.argv[1] if len(sys.argv) > 1 else "bm_george"
lines = [
 "Athens, twenty-four hundred years ago. Meet Socrates. No money, no shoes, and the most annoying questions in history.",
 "One day, his friend went to the famous Oracle at Delphi, and asked: Is anyone wiser than Socrates?",
 "The answer came back: No one is wiser than Socrates.",
 "Socrates was shocked. Me? I don't know anything! It was like googling yourself, and finding out you're a genius.",
 "So he went looking for someone wiser, to prove the Oracle wrong.",
 "He questioned the smartest people in Athens. They all thought they knew everything. They didn't.",
 "Then he understood. He was wiser only because he knew that he didn't know. Wisdom starts with admitting what you don't know.",
 "Next time: Socrates tests the politicians. It does not go well. Follow so you don't miss it!",
]
gap_after = [0.45, 0.35, 0.5, 0.4, 0.3, 0.45, 0.6, 0.0]
sr = 24000; out = []; t = 0.35; segs = []
out.append(np.zeros(int(0.35 * sr), dtype=np.float32))
for i, (ln, g) in enumerate(zip(lines, gap_after)):
    a, sr = k.create(ln, voice=voice, speed=1.05, lang="en-gb")
    a = a.astype(np.float32)
    segs.append({"scene": i + 1, "text": ln, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
    out += [a, np.zeros(int(g * sr), dtype=np.float32)]
    t += len(a) / sr + g
out.append(np.zeros(int(0.8 * sr), dtype=np.float32))
audio = np.concatenate(out)
sf.write(P + "assets/audio/narration.wav", audio, sr)
json.dump({"voice": voice, "segments": segs, "duration": round(len(audio) / sr, 3)}, open(P + "artifacts/narration_timing.json", "w"), indent=1)
print(voice, round(len(audio) / sr, 2), "s"); [print(s["scene"], s["start"], s["end"]) for s in segs]
