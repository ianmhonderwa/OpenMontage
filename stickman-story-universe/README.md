# Stickman Story Universe – 3D episode engine

Public-domain stories retold as 45–60 s vertical 3D stickman shorts. Everything runs locally and free:
Three.js scenes rendered in headless Chromium, Kokoro TTS narration (Apache-2.0), synthesised music, ffmpeg mix.

- `engine/` – shared library (`lib.js`: rig, props, character presets), `runtime.js`, `index.html`,
  `render.js`, `tts.py`, `music.py`, `build.sh`
- `episodes/<ID>/` – `script.json` (narration lines, voice, titles) + `scenes.js` (sets and choreography)
- `scripts_source/` – Season 1 scripts (Batches 01–05) and the proposed catalogue
- `PRODUCTION.md` – queue and the protocol the scheduled runs follow
- `out/` (git-ignored) – narration, renders, previews, model files

Build an episode: `bash engine/build.sh SOC-001 stills` (check the contact sheet), then `bash engine/build.sh SOC-001 full`.
