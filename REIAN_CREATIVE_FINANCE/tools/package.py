#!/usr/bin/env python3
"""Package one rendered Reian Creative Finance episode into the REIAN_CREATIVE_FINANCE delivery tree.
Usage: python3 package.py <EPISODE_ID> <slug e.g. video_01_usa_europe>
Writes: 02_SCRIPTS/<slug>.md, 06_FINAL_VIDEOS/<slug>.mp4, 07_THUMBNAILS/<slug>.jpg, 08_CAPTIONS_AND_SUBTITLES/<slug>.srt,
        10_PUBLISHING_PACK/<slug>_teaser.mp4, 09_QUALITY_CONTROL/<slug>_tech.json. Prints a one-line summary only."""
import json, sys, re, subprocess, shutil, pathlib
EP, SLUG = sys.argv[1], sys.argv[2]
MR = pathlib.Path('/home/user/OpenMontage/market-recap'); R = pathlib.Path('/home/user/OpenMontage/REIAN_CREATIVE_FINANCE')
E = json.load(open(MR / f'episodes/{EP}/episode.json')); T = json.load(open(MR / f'out/{EP}/timing.json'))
final = next(p for p in (MR / f'out/{EP}').glob(f'{EP}_*.mp4') if 'preview' not in p.name)
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h:02}:{m:02}:{int(s):02},{int(round((s - int(s)) * 1000)):03}"
# SRT: same chunking as the burned-in captions (journal.js)
cues = []
for i, s in enumerate(E['segments']):
    seg = T['segments'][i]; words = s['say'].split(); chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= 5 or (re.search(r'[.!?:;,]$', w) and len(cur) >= 3): chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    wt = lambda w: len(re.sub(r'[^A-Za-z0-9]', '', w)) + 2; tot = sum(wt(w) for w in words); t = seg['start']; span = seg['end'] - seg['start']
    for c in chunks:
        d = sum(wt(w) for w in c) / tot * span; cues.append((t, t + d, ' '.join(c))); t += d
srt = '\n'.join(f"{k+1}\n{ts(a)} --> {ts(b)}\n{txt}\n" for k, (a, b, txt) in enumerate(cues))
(R / '08_CAPTIONS_AND_SUBTITLES' / f'{SLUG}.srt').write_text(srt)
shutil.copy(final, R / '06_FINAL_VIDEOS' / f'{SLUG}.mp4')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', '3.2', '-i', str(final), '-frames:v', '1', '-q:v', '2', str(R / '07_THUMBNAILS' / f'{SLUG}.jpg')], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(final), '-t', '30', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-af', 'afade=t=out:st=28.5:d=1.5', '-vf', 'fade=t=out:st=29:d=1', '-movflags', '+faststart', str(R / '10_PUBLISHING_PACK' / f'{SLUG}_teaser.mp4')], check=True)
# script markdown
md = [f"# {E['name']}\n", f"Episode ID: {EP} · Series: {E.get('series','')} · Duration: {T['duration']:.1f} s\n", "## Narration script (as recorded)\n"]
for i, s in enumerate(E['segments']):
    md.append(f"**[{i+1}] {s.get('kicker','')} – {s.get('title','')}** ({T['segments'][i]['start']:.1f}s)\n\n{s['say']}\n")
    if s.get('note'): md.append(f"_On-screen source note: {s['note']}_\n")
md.append("\n## Sources\n" + '\n'.join('- ' + x for x in E.get('sources', [])))
(R / '02_SCRIPTS' / f'{SLUG}.md').write_text('\n'.join(md))
# technical QC
pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration,size', '-of', 'json', str(final)], capture_output=True, text=True).stdout)
ln = subprocess.run(['ffmpeg', '-i', str(final), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', ln); TP = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', ln)
v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
tech = dict(file=f'06_FINAL_VIDEOS/{SLUG}.mp4', width=v['width'], height=v['height'], fps=v['r_frame_rate'], duration_s=round(float(pr['format']['duration']), 2), size_mb=round(int(pr['format']['size']) / 1e6, 1),
            integrated_lufs=float(I[-1]) if I else None, true_peak_dbfs=float(TP[-1]) if TP else None, srt_cues=len(cues), audio=any(s['codec_type'] == 'audio' for s in pr['streams']))
json.dump(tech, open(R / '09_QUALITY_CONTROL' / f'{SLUG}_tech.json', 'w'), indent=1)
print(json.dumps(tech))
