"""Re-voice a narration WAV with the owner's voice timbre using FreeVC (MIT; Coqui release weights).
Usage: python3 engine/voiceconv.py <in.wav> <out.wav> <reference.wav>
Models: out/_models/freevc/voice_conversion_models--multilingual--vctk--freevc24/{config.json,model.pth}
and WavLM-Large.pt (linked into ~/.local/share/tts/wavlm/)."""
import sys, pathlib, numpy as np, soundfile as sf, torch, librosa
from TTS.vc.configs.freevc_config import FreeVCConfig
from TTS.vc.models.freevc import FreeVC
ROOT = pathlib.Path(__file__).resolve().parent.parent
MD = ROOT / "out" / "_models" / "freevc" / "voice_conversion_models--multilingual--vctk--freevc24"
src, dst, ref = sys.argv[1:4]
torch.set_num_threads(max(1, torch.get_num_threads()))
cfg = FreeVCConfig(); cfg.load_json(str(MD / "config.json"))
m = FreeVC.init_from_config(cfg); m.load_checkpoint(cfg, str(MD / "model.pth"), eval=True)
sr_m = cfg.audio.output_sample_rate if hasattr(cfg.audio, "output_sample_rate") else 24000
# reference: 8-s chunks of the cleaned sample, averaged into one speaker embedding
r, rsr = librosa.load(ref, sr=16000); L = 16000 * 8
chunks = [torch.from_numpy(r[i:i + L]).float() for i in range(0, len(r) - L // 2, L)]
g = m._extract_target_se(chunks)
# source: convert in ~12-s pieces split at silences to bound memory
s, _ = librosa.load(src, sr=16000)
iv = librosa.effects.split(s, top_db=40, frame_length=1024, hop_length=256)
out = []; prev = 0
with torch.inference_mode():
    for a, b in iv:
        if a > prev: out.append(np.zeros(int((a - prev) * 24000 / 16000), np.float32))
        seg = torch.from_numpy(s[a:b]).float().unsqueeze(0)
        c = m.extract_wavlm_features(seg)
        y = m.inference(c, g=g)[0][0].cpu().float().numpy()
        out.append(y.astype(np.float32)); prev = b
    if len(s) > prev: out.append(np.zeros(int((len(s) - prev) * 24000 / 16000), np.float32))
y = np.concatenate(out); y = y / (np.max(np.abs(y)) + 1e-9) * 0.9
sf.write(dst, y, 24000); print(f"converted {len(s)/16000:.1f}s -> {len(y)/24000:.1f}s at 24 kHz")
