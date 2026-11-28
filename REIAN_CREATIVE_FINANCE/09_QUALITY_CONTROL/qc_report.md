# QC Report: Reian Creative Finance six-video series

Prepared 28 Nov 2026. Every score is out of 100. A video passes at 95 or above.

**How the videos were checked**
- Technical figures come from the `*_tech.json` files: ffprobe for format, and the ebur128 measurement for loudness.
- Visuals were judged on five spot-check frames per video, plus extra frames wherever something looked wrong.
- No one has watched all six videos from start to finish yet.

**Scoring areas**

| Area | Points | What it covers |
|---|---|---|
| Accuracy and sourcing | 30 | Figures, attribution, unverified items left out |
| Technical | 20 | Resolution, frame rate, duration, true peak |
| Visual and design | 20 | Brand look, legibility, overflow, labels |
| Audio | 15 | Narration, loudness against the −14 LUFS target, music |
| Compliance | 15 | Disclaimers, hypothetical labels, no advice given |

## Scores

| Video | Duration | Loudness (LUFS) | True peak (dBTP) | Accuracy /30 | Technical /20 | Visual /20 | Audio /15 | Compliance /15 | **Total** | Pass at 95? |
|---|---|---|---|---|---|---|---|---|---|---|
| 1. USA and Europe (first render) | 4:54 | −15.2 | −1.2 | 27 | 20 | 14 | 12 | 15 | **88** | No (re-render in progress) |
| 2. African markets | 3:30 | −14.6 | −1.3 | 27 | 20 | 17 | 13 | 15 | **92** | No |
| 3. Listing-ready | 3:26 | −14.5 | −1.4 | 29 | 20 | 19 | 13 | 15 | **96** | Yes |
| 4. Private to public | 3:24 | −14.6* | −1.3 | 29 | 20 | 19 | 13 | 15 | **96** | Yes |
| 5. IPO and valuation | 3:22 | −14.7* | −1.4 | 29 | 20 | 19 | 13 | 15 | **96** | Yes |
| 6. Life after listing | 3:18 | −14.5 | −1.3 | 29 | 20 | 19 | 13 | 15 | **96** | Yes |

All six videos are 1080×1920 at 30 fps, with subtitle files and 30-second teasers.

## Where points were lost

**Video 1 (first render)**
- The header text overflowed the frame.
- Captions showed spoken spellings such as "V F E X" and "Footsie" instead of written forms. Both faults are fixed in the engine, and the re-render will be scored separately.
- The Anthropic and Nvidia figures come from secondary reporting and an amended S-1. They are attributed on screen, but they are not fully primary.

**Video 2**
- The header label reads "GLOBAL MARKETS · 2/2", which is wrong for an Africa video.
- The VFEX index value could not be verified. It was left out, which is correct, but the market picture is incomplete.
- The metals-to-JSE link is our own interpretation, and it is labelled as such.

**Videos 4 and 5**
- Loudness is −15.2 and −15.3 LUFS, about one decibel under the −14 target.

**All six videos**
- Narration is TTS converted to the owner's voice with FreeVC. It is clear but noticeably synthetic, so no video scores above 13 out of 15 for audio.
- Spot-checks cover five frames per video, not a full watch.

## Fixes before publishing

1. Fix the Video 2 header label, then re-render Video 2.
2. ~~Loudness fix for Videos 4 and 5~~ Done 28 Nov. *Audio was re-normalised: before the fix they measured −15.2 and −15.3 LUFS; now −14.6 and −14.7.
3. Score the Video 1 re-render once it is complete.
4. Have a person watch each video in full.
5. Have the legal statements in Videos 3–6 reviewed by a Zimbabwe legal practitioner or sponsoring broker.
