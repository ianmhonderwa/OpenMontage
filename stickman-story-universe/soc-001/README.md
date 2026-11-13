# SOC-001 – The Oracle Says No One Is Wiser (3D stickman pilot)

Source: Plato, *Apology* 20e–23b (Jowett tr.). Script from Batch 01 of the Stickman Story Universe.

Pipeline (all local, no paid services):

1. `tts.py` – narration with Kokoro TTS (Apache-2.0, model files from the
   `thewh1teagle/kokoro-onnx` GitHub release `model-files-v1.0`), British voice `bm_george`, speed 1.05.
   Writes `assets/audio/narration.wav` and `artifacts/narration_timing.json` (per-scene timings).
2. `music.py` – synthesised Greek-lyre music bed (Karplus-Strong plucks, D dorian).
3. `index.html` + `main.js` – Three.js scene: toon-shaded 3D stickmen, agora, Delphi temple,
   sunset olive grove, end card. Every frame is a pure function of time (`window.renderAt(t)`).
4. `render.js` – headless Chromium (Playwright, SwiftShader) captures 1080×1920 frames at 30 fps into ffmpeg.
5. Final mix (ffmpeg): narration + ducked music, loudness-normalised to −14 LUFS.

The scripts expect the OpenMontage project layout `projects/soc-001-oracle/{work,assets,artifacts,renders}`
(`npm install three@0.170.0` inside `work/`). Renders and model files are not committed.
