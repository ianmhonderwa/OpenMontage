// Spotlight explainer runtime: minimalist monochrome scenes (glowing figure, desk, counters, grids, curve)
// drawn on a canvas and animated deterministically by window.renderAt(t). Data: episodes/<ID>/episode.json.
const EP = new URLSearchParams(location.search).get('ep');
const E = await (await fetch(`../episodes/${EP}/episode.json`)).json();
const T = await (await fetch(`../out/${EP}/timing.json`)).json();
document.getElementById('handle').textContent = E.handle || '@reian.creative.finance';
const cv = document.getElementById('c'), g = cv.getContext('2d'); const W = 1080, H = 1920, FLOOR = 1430;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)); const ease = x => 1 - Math.pow(1 - clamp(x), 3);
const back = x => { x = clamp(x); const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const money = (v, d = 0) => '$' + Math.round(v).toLocaleString('en-US');
const logo = new Image(); logo.src = 'logo.jpg';

function glow(on, blur = 28, col = 'rgba(255,255,255,0.85)') { g.shadowBlur = on ? blur : 0; g.shadowColor = col; }
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function text(s, x, y, size, opts = {}) { g.save(); g.font = `${opts.weight || 800} ${size}px ${opts.font || 'Inter'}, sans-serif`; g.textAlign = opts.align || 'center'; g.textBaseline = 'middle';
  g.fillStyle = opts.color || '#f2f2f2'; g.globalAlpha = opts.alpha ?? 1; if (opts.spacing) g.letterSpacing = opts.spacing; glow(opts.glow ?? false, opts.blur || 22); g.fillText(s, x, y); g.restore(); }
function bg(t, spotX = 540, spotA = 1) {
  g.fillStyle = '#0a0a0b'; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H * 0.45, 200, W / 2, H * 0.5, 1200); vg.addColorStop(0, 'rgba(40,40,44,0.55)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  if (spotA > 0) { g.save(); g.globalAlpha = 0.16 * spotA; const sg = g.createLinearGradient(0, 0, 0, FLOOR); sg.addColorStop(0, 'rgba(255,255,255,0.0)'); sg.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = sg; g.beginPath(); g.moveTo(spotX - 40, 0); g.lineTo(spotX + 40, 0); g.lineTo(spotX + 330, FLOOR); g.lineTo(spotX - 330, FLOOR); g.closePath(); g.fill();
    g.globalAlpha = 0.22 * spotA; const fl = g.createRadialGradient(spotX, FLOOR, 10, spotX, FLOOR, 360); fl.addColorStop(0, '#fff'); fl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = fl; g.beginPath(); g.ellipse(spotX, FLOOR, 360, 60, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.setLineDash([18, 16]); g.lineDashOffset = -t * 20; g.beginPath(); g.moveTo(40, FLOOR); g.lineTo(W - 40, FLOOR); g.stroke(); g.restore();
}
// the figure: a glowing bean body with a round head. pose: {slump, arm: 'out'|'up'|'none', bob}
function figure(x, t, pose = {}) { const s = pose.scale || 1; g.save(); g.translate(x, FLOOR); g.scale(s, s); g.rotate(pose.slump ? -0.12 * pose.slump : 0);
  const bob = pose.bob ? Math.sin(t * 3) * 4 : 0; glow(true, 34); g.fillStyle = '#f4f4f4';
  rr(-85, -235 + bob, 170, 235, 70); g.fill(); g.beginPath(); g.arc(0, -300 + bob + (pose.slump ? 30 * pose.slump : 0), 62, 0, Math.PI * 2); g.fill();
  g.lineCap = 'round'; g.strokeStyle = '#f4f4f4'; g.lineWidth = 38;
  if (pose.arm === 'out') { const a = Math.sin(t * 9) * 0.05; g.beginPath(); g.moveTo(40, -170 + bob); g.lineTo(190, -195 + bob + a * 60); g.stroke(); }
  if (pose.arm === 'up') { for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 55, -190 + bob); g.lineTo(sd * 160, -330 + bob + Math.sin(t * 6 + sd) * 8); g.stroke(); } }
  g.restore(); }
function desk(x, mon = {}) { g.save(); glow(true, 18); g.strokeStyle = '#e8e8e8'; g.fillStyle = '#e8e8e8'; g.lineWidth = 10;
  g.beginPath(); g.moveTo(x - 230, FLOOR - 250); g.lineTo(x + 230, FLOOR - 250); g.stroke(); g.lineWidth = 8; for (const sx of [-200, 200]) { g.beginPath(); g.moveTo(x + sx, FLOOR - 250); g.lineTo(x + sx, FLOOR); g.stroke(); }
  g.fillRect(x - 12, FLOOR - 320, 24, 70); g.lineWidth = 8; g.fillStyle = '#121214'; rr(x - 190, FLOOR - 560, 380, 250, 18); g.fill(); g.stroke(); g.restore();
  if (mon.label) text(mon.label, x, FLOOR - 515, 24, { color: '#9a9ca3', spacing: '4px' });
  if (mon.value != null) text(mon.value, x, FLOOR - 430, mon.size || 76, { font: 'Anton', weight: 400, glow: true });
  if (mon.spin) { g.save(); g.strokeStyle = '#bbb'; g.lineWidth = 6; g.beginPath(); g.arc(x, FLOOR - 360, 18, mon.spin, mon.spin + 4.5); g.stroke(); g.restore(); } }
function bigCounter(label, value, y = 330, size = 150) { text(label, 540, y - size * 0.82, 30, { color: '#9a9ca3', spacing: '6px' }); text(value, 540, y, size, { font: 'Anton', weight: 400, glow: true, blur: 30 }); }
function wrapLines(s, max = 58) { const w = s.split(' '), out = ['']; for (const x of w) { if ((out[out.length - 1] + ' ' + x).trim().length > max) out.push(x); else out[out.length - 1] = (out[out.length - 1] + ' ' + x).trim(); } return out; }
function note(s, a = 1) { if (!s) return; wrapLines(s).forEach((ln, i, arr) => text(ln, 540, 1740 + (i - (arr.length - 1) / 2) * 36, 26, { color: '#7d8088', weight: 600, alpha: a })); }
function bill(x, y, s = 1, a = 1) { g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s); glow(true, 14); g.fillStyle = '#e9e9e9'; rr(-60, -32, 120, 64, 10); g.fill(); g.fillStyle = '#0a0a0b'; g.font = '800 34px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowBlur = 0; g.fillText('$', 0, 2); g.restore(); }
function battery(x, y, lvl, t) { g.save(); glow(true, 12); g.strokeStyle = '#ddd'; g.lineWidth = 6; rr(x - 70, y - 30, 130, 60, 10); g.stroke(); g.fillStyle = '#ddd'; g.fillRect(x + 62, y - 12, 12, 24);
  g.fillStyle = lvl < 0.25 ? (Math.sin(t * 8) > 0 ? '#ef4444' : '#7a2222') : '#e8e8e8'; g.fillRect(x - 62, y - 22, 114 * lvl, 44); g.restore(); }

const S = {}; // scene renderers: (s, lt, d, t)
S.desk = (s, lt, d, t) => { bg(t, 360); const k = ease(lt / Math.min(d, 3)); figure(330, t, { arm: 'out', bob: true }); desk(620, { label: s.monLabel, value: s.monValue });
  if (s.headline) text(s.headline, 540, 420, 96, { font: 'Anton', weight: 400, glow: true, alpha: ease((lt - 0.6) / 0.5) }); if (s.sub) text(s.sub, 540, 520, 40, { color: '#a9abb2', alpha: ease((lt - 1.2) / 0.5) }); };
S.grid = (s, lt, d, t) => { bg(t, 300); figure(300, t, { arm: 'out', bob: true }); const n = s.cells, cols = 12, cw = 54, gap = 10, x0 = 540 - (cols * (cw + gap) - gap) / 2 + 130, y0 = 640; const fill = Math.floor(n * clamp(lt / (d * 0.85)));
  g.save(); glow(true, 10); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 3; rr(x0 - 24, y0 - 24, cols * (cw + gap) - gap + 48, Math.ceil(n / cols) * (cw + gap) - gap + 48, 16); g.stroke(); g.restore();
  for (let i = 0; i < n; i++) { const cx = x0 + (i % cols) * (cw + gap), cy = y0 + Math.floor(i / cols) * (cw + gap); g.save(); if (i < fill) { glow(true, 12); g.fillStyle = '#ececec'; rr(cx, cy, cw, cw, 8); g.fill(); g.fillStyle = '#0a0a0b'; g.shadowBlur = 0; g.font = '800 26px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', cx + cw / 2, cy + cw / 2 + 1); }
    else { g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2; rr(cx, cy, cw, cw, 8); g.stroke(); } g.restore(); }
  const yrs = fill / 12; text(`MONTH ${fill}`, 540, 560, 30, { color: '#9a9ca3', spacing: '6px' });
  const fv = m => 50 * (Math.pow(1 + 0.08 / 12, m) - 1) / (0.08 / 12); bigCounter('BALANCE', money(fv(fill)), 330); note(s.note); };
S.slump = (s, lt, d, t) => { bg(t, 360, 0.6); figure(330, t, { arm: 'out', slump: ease(lt / 1.2) }); desk(620, { label: s.monLabel, value: s.monValue, spin: t * 3 }); battery(540, 360, lerp(0.6, 0.12, ease(lt / 2)), t); text(s.tag, 540, 450, 34, { color: '#a9abb2', spacing: '6px', alpha: ease((lt - 0.8) / 0.5) }); note(s.note); };
S.coins = (s, lt, d, t) => { bg(t, 540); figure(540, t, { arm: 'up' }); const gens = s.gens || 5; const k = clamp(lt / (d * 0.8)) * gens;
  let row = 0, idx = 0; for (let gi = 0; gi < gens; gi++) { const cnt = Math.pow(2, gi), a = clamp(k - gi); if (a <= 0) break; for (let j = 0; j < cnt; j++) { const x = 540 + (j - (cnt - 1) / 2) * 128 * Math.min(1, 8 / cnt) , y = 980 - gi * 95; bill(x, y, 0.9 * Math.min(1, 8 / cnt) * back(a), a); } }
  text(s.label, 540, 420, 92, { font: 'Anton', weight: 400, glow: true, alpha: ease((lt - 0.5) / 0.5) }); text(s.sub, 540, 515, 36, { color: '#a9abb2', alpha: ease((lt - 1.0) / 0.5) }); note(s.note); };
S.compare = (s, lt, d, t) => { bg(t, 540, 0.7); const maxv = s.max; const bars = [[s.aLabel, s.a, 330], [s.bLabel, s.b, 750]];
  text(s.title, 540, 330, 88, { font: 'Anton', weight: 400, glow: true });
  bars.forEach(([lab, v, x], i) => { const k = ease((lt - 0.5 - i * 0.9) / 1.4); const h = 820 * v / maxv * k; g.save(); glow(true, 26); g.fillStyle = i ? '#f4f4f4' : '#8a8c92'; rr(x - 120, FLOOR - 40 - h, 240, Math.max(h, 2), 18); g.fill(); g.restore();
    text(money(v * k), x, FLOOR - 90 - h, 70, { font: 'Anton', weight: 400, glow: !!i, alpha: k > 0.02 ? 1 : 0 }); text(lab, x, FLOOR + 60, 30, { color: '#a9abb2', spacing: '3px' }); });
  note(s.note); };
S.curve = (s, lt, d, t) => { bg(t, 540, 0.4); const data = s.data, n = data.length - 1, x0 = 140, x1 = 960, y0 = 1380, y1 = 640, mx = Math.max(...data); const k = clamp(lt / (d * 0.75));
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y1 - 40); g.lineTo(x0, y0); g.lineTo(x1 + 20, y0); g.stroke(); g.restore();
  const upto = k * n; g.save(); glow(true, 26); g.strokeStyle = '#f4f4f4'; g.lineWidth = 9; g.lineJoin = 'round'; g.beginPath();
  for (let i = 0; i <= Math.floor(upto); i++) { const x = x0 + (x1 - x0) * i / n, y = y0 - (y0 - y1) * data[i] / mx; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  const fi = Math.floor(upto), fr = upto - fi; let ex = x0, ey = y0; if (fi < n) { ex = x0 + (x1 - x0) * (fi + fr) / n; ey = y0 - (y0 - y1) * lerp(data[fi], data[fi + 1], fr) / mx; g.lineTo(ex, ey); } else { ex = x1; ey = y1; } g.stroke(); g.restore();
  g.save(); glow(true, 30); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 14, 0, Math.PI * 2); g.fill(); g.restore();
  for (const yr of [10, 20, 30]) text(`YEAR ${yr}`, x0 + (x1 - x0) * yr / n, y0 + 50, 24, { color: '#7d8088' });
  const val = fi < n ? lerp(data[fi], data[fi + 1], fr) : data[n]; bigCounter(`YEAR ${Math.min(n, Math.floor(upto))}`, money(val), 330);
  if (k >= 1) text(s.tag, 540, 520, 44, { font: 'Anton', weight: 400, glow: true, alpha: ease((lt - d * 0.75) / 0.5) }); note(s.note); };
S.outro = (s, lt, d, t) => { bg(t, 540, 0.5); text(s.title, 540, 330, 96, { font: 'Anton', weight: 400, glow: true });
  s.lines.forEach((ln, i) => text(ln, 540, 520 + i * 110, 52, { font: 'Anton', weight: 400, alpha: ease((lt - 0.6 - i * 0.7) / 0.5), glow: true }));
  const fa = ease((lt - 0.8 - s.lines.length * 0.7) / 0.5); g.save(); g.globalAlpha = fa; g.beginPath(); g.arc(540, 1080, 90, 0, Math.PI * 2); g.clip(); if (logo.complete) g.drawImage(logo, 450, 990, 180, 180); g.restore();
  text('FOLLOW FOR MORE', 540, 1240, 64, { font: 'Anton', weight: 400, alpha: fa, glow: true }); text(E.handle || '@reian.creative.finance', 540, 1310, 38, { color: '#c9ccd6', alpha: fa });
  note(s.disclaimer, fa); };

const segs = E.segments.map((s, i) => ({ s, start: i ? T.segments[i].start - 0.2 : 0 })); segs.forEach((x, i) => x.end = i < segs.length - 1 ? segs[i + 1].start : T.duration);
window.DURATION = T.duration;
window.renderAt = (t) => { const cur = segs.find(x => t >= x.start && t < x.end) || segs[segs.length - 1]; const lt = t - cur.start, d = cur.end - cur.start;
  S[cur.s.scene](cur.s, lt, d, t);
  const fade = Math.min(clamp(lt / 0.25), clamp((d - lt) / 0.25)); if (fade < 1) { g.fillStyle = `rgba(10,10,11,${1 - fade})`; g.fillRect(0, 0, W, H); }
  g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(60, 70, (W - 120) * clamp(t / T.duration), 6); };
await document.fonts.ready; await new Promise(r => logo.complete ? r() : (logo.onload = logo.onerror = r)); window.renderAt(0); window.ready = true;
