# CUMSM 506 manual treadmill — 3D assembly animation

Deterministic 3D build video (≈ 6 min 43 s, 1920×1080, 30 fps) of the CUT CUMSM 506 manual treadmill prototype.

## Toolchain
| Stage | Tool |
|---|---|
| Parametric CAD of every part (tubes with M8 holes, pillow blocks, rollers, bolts, spanner) | CadQuery 2.8 (`cad/build_parts.py`) |
| Mesh processing, normals, volumes/mass estimate (`cad/bom.json`) | trimesh |
| 3D scene, shaders (rust → steel → primer → paint), sparks, swarf, belt | Three.js r181 (`hf/scene.js`) |
| Overlay timeline (step cards, captions, blueprint, stats) | GSAP 3.15 (from the `GSAP` repo `dist/`) |
| Frame-accurate rendering | HyperFrames 0.9.81 (`hf-seek` Three.js adapter) |
| Narration | Kokoro TTS, voice `bm_george` (offline; edge-tts host blocked in this environment) |
| SFX + ambient pad | numpy/scipy procedural synthesis (`build_audio.py`) |
| Encode / mux | ffmpeg (libx264 CRF 18, AAC) |

## Rebuild
```bash
P=projects/treadmill-assembly            # working dir (gitignored)
python3 cad/build_parts.py $P/hf/parts.js cad/bom.json
python3 build_index.py                   # timeline.json -> hf/index.html
./render_chunks.sh                       # HyperFrames, 6 chunks
python3 build_audio.py                   # narration + SFX + pad
```
Vendored runtime files (`hf/vendor/three.module.js`, `three.core.js`, `addons/`, `gsap.min.js`) and the drawings in `hf/assets/` are copied in at build time.

## Modelling notes (flag for verification against the built prototype)
- Cross members modelled at 500 mm (spec text says 400 mm) so the 400 mm rollers fit between pillow blocks on 40 mm rails; this matches the 650 mm envelope in the front elevation once the foot pads are included.
- Handrail modelled at 600 mm (spec ≈ 450 mm) because the uprights are bolted outside the rails.
- Pillow blocks are modelled UCP204-style; the drawing calls up 6204-2RS bearings.
- Frame steel mass ≈ 26 kg is a CAD estimate (volume × 7 850 kg/m³), not a weighed value.
