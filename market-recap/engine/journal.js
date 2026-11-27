// Reian Creative Finance – "journal" engine: premium financial-journalism look (navy, gold, white, charcoal).
// Canvas scenes driven by episodes/<ID>/episode.json segments; deterministic window.renderAt(t).
// Scenes: open, headline, index, board, movers, story, timeline, flow, calc, bars, split, outro.
// Every number shown must come from the episode JSON (which cites sources); captions come from each segment's "say".
const EP = new URLSearchParams(location.search).get('ep');
const E = await (await fetch(`../episodes/${EP}/episode.json`)).json();
const T = await (await fetch(`../out/${EP}/timing.json`)).json();
const cv = document.getElementById('c'), g = cv.getContext('2d'); const W = 1080, H = 1920;
const C = { navy: '#0b1a33', navy2: '#12284d', navy3: '#1b3766', gold: '#d4a73a', gold2: '#f0cf72', white: '#f5f3ee', char: '#2b2f36', mute: '#9aa6bd', up: '#3ccf7d', down: '#ff6b6b' };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)); const ease = x => 1 - Math.pow(1 - clamp(x), 3); const lerp = (a, b, k) => a + (b - a) * k;
const logo = new Image(); logo.src = 'logo.jpg';
const fmt = (v, dp = 2) => Number(v).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function text(s, x, y, size, o = {}) { if (s == null || s === '') return; g.save(); g.font = `${o.weight || 800} ${size}px ${o.font || 'Inter'}, sans-serif`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  g.fillStyle = o.color || C.white; g.globalAlpha = o.alpha ?? 1; if (o.spacing) g.letterSpacing = o.spacing; g.fillText(String(s), x, y); g.restore(); }
function wrap(s, max, size, weight = 800, font = 'Inter') { g.save(); g.font = `${weight} ${size}px ${font}, sans-serif`; const out = []; let cur = '';
  for (const w of String(s).split(' ')) { const tryS = cur ? cur + ' ' + w : w; if (g.measureText(tryS).width > max && cur) { out.push(cur); cur = w; } else cur = tryS; } if (cur) out.push(cur); g.restore(); return out; }
function para(s, x, y, max, size, o = {}) { const lines = wrap(s, max, size, o.weight || 800, o.font); const lh = size * (o.lh || 1.18); lines.forEach((ln, i) => text(ln, x, y + i * lh, size, o)); return lines.length * lh; }
// ---------- background, frame and branding ----------
function bg(t, accent = 0.5) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, C.navy2); gr.addColorStop(0.55, C.navy); gr.addColorStop(1, '#07101f'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = 0.07; g.strokeStyle = C.gold; g.lineWidth = 1; for (let x = 60; x < W; x += 80) { g.beginPath(); g.moveTo(x, 260); g.lineTo(x, 1500); g.stroke(); } for (let y = 260; y < 1500; y += 80) { g.beginPath(); g.moveTo(60, y); g.lineTo(W - 60, y); g.stroke(); } g.restore();
  const rg = g.createRadialGradient(W * 0.8, 380, 20, W * 0.8, 380, 700); rg.addColorStop(0, `rgba(212,167,58,${0.16 * accent})`); rg.addColorStop(1, 'rgba(212,167,58,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
}
function chrome(t) {
  g.save(); g.beginPath(); g.arc(96, 124, 32, 0, Math.PI * 2); g.clip(); if (logo.complete && logo.naturalWidth) g.drawImage(logo, 64, 92, 64, 64); g.restore();
  g.save(); g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.arc(96, 124, 33, 0, Math.PI * 2); g.stroke(); g.restore();
  text('REIAN CREATIVE FINANCE', 146, 112, 30, { align: 'left', spacing: '3px' }); text('Understanding markets. Following capital.', 146, 146, 22, { align: 'left', color: C.gold2, weight: 600 });
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(60, 196, W - 120, 4); g.fillStyle = C.gold; g.fillRect(60, 196, (W - 120) * clamp(t / T.duration), 4);
  if (E.series) text(E.series, W - 60, 124, 22, { align: 'right', color: C.mute, weight: 600, spacing: '2px' });
}
function note(s, a = 1) { if (!s) return; para(s, W / 2, 1488, 940, 23, { weight: 600, color: C.mute, alpha: a, lh: 1.3 }); }
function kicker(s, y, a = 1) { if (!s) return; g.save(); g.font = '800 26px Inter'; const w = g.measureText(s.toUpperCase()).width + 40; g.restore(); g.save(); g.globalAlpha = a; g.fillStyle = C.gold; rr(W / 2 - w / 2, y - 24, w, 48, 8); g.fill(); g.restore(); text(s.toUpperCase(), W / 2, y + 1, 26, { color: C.navy, alpha: a, spacing: '2px' }); }
function card(x, y, w, h, a = 1, fill = 'rgba(18,40,77,0.92)') { g.save(); g.globalAlpha = a; g.fillStyle = fill; rr(x, y, w, h, 22); g.fill(); g.strokeStyle = 'rgba(212,167,58,0.55)'; g.lineWidth = 2; g.stroke(); g.restore(); }
function arrow(x, y, up, s = 1, a = 1) { g.save(); g.globalAlpha = a; g.fillStyle = up ? C.up : C.down; g.beginPath(); if (up) { g.moveTo(x, y - 18 * s); g.lineTo(x + 16 * s, y + 10 * s); g.lineTo(x - 16 * s, y + 10 * s); } else { g.moveTo(x, y + 18 * s); g.lineTo(x + 16 * s, y - 10 * s); g.lineTo(x - 16 * s, y - 10 * s); } g.fill(); g.restore(); }
// ---------- captions (word-highlighted chunks spread over the segment) ----------
const CAPS = []; E.segments.forEach((s, i) => { const seg = T.segments[i]; if (!seg || !s.say) return; const words = s.say.replace(/\s+/g, ' ').trim().split(' ');
  const chunks = []; let cur = []; for (const w of words) { cur.push(w); if (cur.length >= 5 || (/[.!?:;,]$/.test(w) && cur.length >= 3)) { chunks.push(cur); cur = []; } } if (cur.length) chunks.push(cur);
  const wt = w => w.replace(/[^a-z0-9]/gi, '').length + 2; const tot = words.reduce((a, w) => a + wt(w), 0); let t = seg.start; const span = seg.end - seg.start;
  for (const c of chunks) { const ws = c.map(w => { const d = wt(w) / tot * span; const o = { w, a: t, b: t + d }; t += d; return o; }); CAPS.push({ a: ws[0].a, b: ws[ws.length - 1].b, ws }); } });
function captions(t) { const c = CAPS.find(c => t >= c.a - 0.05 && t < c.b + 0.2); if (!c) return; const line = c.ws.map(o => o.w).join(' ');
  const lines = wrap(line, 900, 46); const y0 = 1640 - (lines.length - 1) * 30; g.save(); g.fillStyle = 'rgba(7,16,31,0.78)'; rr(60, y0 - 46, W - 120, lines.length * 60 + 32, 18); g.fill(); g.restore();
  let wi = 0; lines.forEach((ln, li) => { const ws = ln.split(' '); g.save(); g.font = '800 46px Inter'; const total = g.measureText(ln).width; let x = W / 2 - total / 2;
    for (const w of ws) { const o = c.ws[wi++]; const on = o && t >= o.a; g.fillStyle = on ? C.gold2 : C.white; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(w, x, y0 + li * 60); x += g.measureText(w + ' ').width; } g.restore(); }); }
// ---------- scenes ----------
const S = {};
S.open = (s, lt, d, t) => { bg(t, 1); const k = ease(lt / 0.8);
  g.save(); g.globalAlpha = k; g.beginPath(); g.arc(W / 2, 560, 130, 0, Math.PI * 2); g.clip(); if (logo.naturalWidth) g.drawImage(logo, W / 2 - 130, 430, 260, 260); g.restore(); g.save(); g.globalAlpha = k; g.strokeStyle = C.gold; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, 560, 134, 0, Math.PI * 2); g.stroke(); g.restore();
  text('REIAN CREATIVE FINANCE', W / 2, 800, 58, { font: 'Anton', weight: 400, spacing: '4px', alpha: k }); text('Understanding markets. Following capital.', W / 2, 870, 32, { color: C.gold2, weight: 600, alpha: k });
  g.fillStyle = C.gold; g.fillRect(W / 2 - 160 * k, 930, 320 * k, 4); kicker(s.kicker, 1020, ease((lt - 0.5) / 0.5)); para(s.title, W / 2, 1120, 920, 74, { font: 'Anton', weight: 400, alpha: ease((lt - 0.7) / 0.6), lh: 1.1 }); note(s.note); };
S.headline = (s, lt, d, t) => { bg(t); chrome(t); kicker(s.kicker, 420, ease(lt / 0.4)); const h = para(s.title, W / 2, 560, 940, 84, { font: 'Anton', weight: 400, alpha: ease((lt - 0.2) / 0.5), lh: 1.08 });
  if (s.sub) para(s.sub, W / 2, 600 + h, 900, 38, { weight: 600, color: C.mute, alpha: ease((lt - 0.5) / 0.5), lh: 1.3 }); note(s.note); };
S.index = (s, lt, d, t) => { bg(t, 0.8); chrome(t); kicker(s.kicker || s.market, 330, ease(lt / 0.4)); const up = s.change_pts >= 0; const k = ease(lt / 1.4);
  text(s.name, W / 2, 440, 70, { font: 'Anton', weight: 400 }); if (s.where) text(s.where, W / 2, 506, 30, { weight: 600, color: C.mute });
  card(80, 580, W - 160, 520, ease(lt / 0.5)); text('CLOSE · ' + s.date_label, W / 2, 650, 28, { color: C.gold2, weight: 600, spacing: '2px' });
  text(fmt(lerp(s.prev_close, s.close, k), s.dp ?? 2), W / 2, 770, 112, { font: 'Anton', weight: 400 }); text(s.unit || 'points', W / 2, 856, 28, { color: C.mute, weight: 600 });
  const ck = ease((lt - 0.9) / 0.6); arrow(W / 2 - 250, 960, up, 1.4, ck); text(`${up ? '+' : '−'}${fmt(Math.abs(s.change_pts), s.dp ?? 2)} pts`, W / 2 - 70, 960, 52, { color: up ? C.up : C.down, alpha: ck }); text(`${up ? '+' : '−'}${fmt(Math.abs(s.change_pct), 2)}%`, W / 2 + 230, 960, 52, { color: up ? C.up : C.down, alpha: ck });
  text(`Previous close ${fmt(s.prev_close, s.dp ?? 2)} (${s.prev_label})`, W / 2, 1050, 30, { weight: 600, color: C.mute, alpha: ck });
  (s.facts || []).forEach((f, i) => { const a = ease((lt - 1.4 - i * 0.4) / 0.5); card(80, 1140 + i * 100, W - 160, 84, a, 'rgba(43,47,54,0.85)'); text(f, W / 2, 1182 + i * 100, 32, { weight: 600, alpha: a }); }); note(s.note); };
S.board = (s, lt, d, t) => { bg(t); chrome(t); kicker(s.kicker, 300, ease(lt / 0.4)); para(s.title, W / 2, 400, 940, 64, { font: 'Anton', weight: 400, lh: 1.08 });
  const rows = s.rows || []; const y0 = 520, rh = Math.min(118, 880 / Math.max(rows.length, 1));
  rows.forEach((r, i) => { const a = ease((lt - 0.3 - i * 0.25) / 0.5); const y = y0 + i * rh; card(70, y, W - 140, rh - 16, a); const up = r.pct >= 0;
    text(r.name, 110, y + rh / 2 - 26, 34, { align: 'left', alpha: a }); text(r.sub || '', 110, y + rh / 2 + 14, 24, { align: 'left', color: C.mute, weight: 600, alpha: a });
    text(r.value, W - 300, y + rh / 2 - 8, 40, { align: 'right', font: 'Anton', weight: 400, alpha: a }); arrow(W - 250, y + rh / 2 - 8, up, 0.9, a); text(`${up ? '+' : '−'}${fmt(Math.abs(r.pct), 2)}%`, W - 110, y + rh / 2 - 8, 38, { align: 'right', color: up ? C.up : C.down, alpha: a }); });
  note(s.note); };
S.movers = (s, lt, d, t) => { bg(t); chrome(t); kicker(s.kicker, 300, ease(lt / 0.4)); para(s.title, W / 2, 400, 940, 60, { font: 'Anton', weight: 400 });
  [[s.gainers || [], 'GAINERS', true, 90], [s.losers || [], 'LOSERS', false, 560]].forEach(([list, lab, up, x]) => { text(lab, x + 215, 520, 32, { color: up ? C.up : C.down, spacing: '3px' });
    list.forEach((r, i) => { const a = ease((lt - 0.3 - i * 0.3) / 0.5); const y = 570 + i * 150; card(x, y, 430, 130, a); text(r.name, x + 215, y + 42, 34, { alpha: a }); text(`${up ? '+' : '−'}${fmt(Math.abs(r.pct), 2)}%`, x + 215, y + 92, 40, { font: 'Anton', weight: 400, color: up ? C.up : C.down, alpha: a }); }); });
  note(s.note); };
S.story = (s, lt, d, t) => { bg(t, 0.7); chrome(t); kicker(s.kicker, 300, ease(lt / 0.4)); const h = para(s.title, W / 2, 400, 940, 66, { font: 'Anton', weight: 400, lh: 1.08 });
  let y = 420 + h; (s.points || []).forEach((p, i) => { const a = ease((lt - 0.4 - i * Math.min(0.9, d / ((s.points.length + 1) * 1.2))) / 0.5); const lines = wrap(p, 820, 36, 600); const hh = lines.length * 46 + 44;
    card(70, y, W - 140, hh, a); g.save(); g.globalAlpha = a; g.fillStyle = C.gold; g.beginPath(); g.arc(112, y + 44, 10, 0, Math.PI * 2); g.fill(); g.restore(); lines.forEach((ln, j) => text(ln, 140, y + 44 + j * 46, 36, { align: 'left', weight: 600, alpha: a })); y += hh + 20; });
  note(s.note); };
S.timeline = (s, lt, d, t) => { bg(t); chrome(t); kicker(s.kicker, 300, ease(lt / 0.4)); para(s.title, W / 2, 400, 940, 62, { font: 'Anton', weight: 400 });
  const ev = s.events || []; const y0 = 520, step = Math.min(200, 920 / Math.max(ev.length, 1)); g.save(); g.strokeStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.moveTo(160, y0); g.lineTo(160, y0 + (ev.length - 0.4) * step * ease(lt / 1.5)); g.stroke(); g.restore();
  ev.forEach((e, i) => { const a = ease((lt - 0.3 - i * 0.5) / 0.5); const y = y0 + i * step; g.save(); g.globalAlpha = a; g.fillStyle = C.gold; g.beginPath(); g.arc(160, y + 20, 14, 0, Math.PI * 2); g.fill(); g.restore();
    text(e.date, 200, y + 20, 32, { align: 'left', color: C.gold2, alpha: a }); para(e.text, 200, y + 66, 800, 32, { align: 'left', weight: 600, alpha: a, lh: 1.25 }); }); note(s.note); };
S.flow = (s, lt, d, t) => { bg(t); chrome(t); kicker(s.kicker, 300, ease(lt / 0.4)); const h = para(s.title, W / 2, 400, 940, 62, { font: 'Anton', weight: 400 });
  const st = s.steps || []; const y0 = 430 + h, bh = Math.min(150, (1440 - y0) / Math.max(st.length, 1) - 30);
  st.forEach((p, i) => { const a = ease((lt - 0.3 - i * Math.min(0.8, d / (st.length + 2))) / 0.5); const y = y0 + i * (bh + 30); card(110, y, W - 220, bh, a, i % 2 ? 'rgba(27,55,102,0.95)' : 'rgba(18,40,77,0.95)');
    g.save(); g.globalAlpha = a; g.fillStyle = C.gold; g.beginPath(); g.arc(160, y + bh / 2, 30, 0, Math.PI * 2); g.fill(); g.restore(); text(String(i + 1), 160, y + bh / 2 + 2, 34, { color: C.navy, alpha: a });
    const lines = wrap(p, 720, 34, 600); lines.forEach((ln, j) => text(ln, 215, y + bh / 2 - (lines.length - 1) * 21 + j * 42, 34, { align: 'left', weight: 600, alpha: a }));
    if (i < st.length - 1) { g.save(); g.globalAlpha = a; g.fillStyle = C.gold; g.beginPath(); g.moveTo(W / 2 - 14, y + bh + 6); g.lineTo(W / 2 + 14, y + bh + 6); g.lineTo(W / 2, y + bh + 24); g.fill(); g.restore(); } }); note(s.note); };
S.calc = (s, lt, d, t) => { bg(t); chrome(t); kicker(s.kicker || 'WORKED EXAMPLE', 300, ease(lt / 0.4)); para(s.title, W / 2, 400, 940, 60, { font: 'Anton', weight: 400 });
  const rows = s.rows || []; const y0 = 510, rh = Math.min(120, 900 / Math.max(rows.length, 1));
  rows.forEach((r, i) => { const a = ease((lt - 0.3 - i * Math.min(0.9, d / (rows.length + 2))) / 0.5); const y = y0 + i * rh; const hl = r.hl; card(70, y, W - 140, rh - 14, a, hl ? 'rgba(212,167,58,0.18)' : 'rgba(18,40,77,0.92)');
    para(r.label, 100, y + (rh - 14) / 2 - (wrap(r.label, 560, 32, 600).length - 1) * 19, 560, 32, { align: 'left', weight: 600, alpha: a, lh: 1.2 }); text(r.value, W - 100, y + (rh - 14) / 2, 42, { align: 'right', font: 'Anton', weight: 400, color: hl ? C.gold2 : C.white, alpha: a }); });
  note(s.note); };
S.bars = (s, lt, d, t) => { bg(t); chrome(t); kicker(s.kicker, 300, ease(lt / 0.4)); para(s.title, W / 2, 400, 940, 60, { font: 'Anton', weight: 400 });
  const it = s.items || []; const mx = Math.max(...it.map(i => Math.abs(i.value))); const y0 = 540, rh = Math.min(130, 880 / Math.max(it.length, 1)); const k = ease((lt - 0.3) / 1.2);
  it.forEach((r, i) => { const y = y0 + i * rh; text(r.label, 90, y, 32, { align: 'left', weight: 600 }); const w = (W - 380) * Math.abs(r.value) / mx * k; g.fillStyle = r.value >= 0 ? C.gold : C.down; rr(90, y + 26, Math.max(6, w), 44, 10); g.fill();
    text(r.text || `${r.value >= 0 ? '+' : '−'}${fmt(Math.abs(r.value), r.dp ?? 2)}${r.unit ?? '%'}`, 110 + Math.max(6, w), y + 48, 34, { align: 'left', font: 'Anton', weight: 400 }); }); note(s.note); };
S.split = (s, lt, d, t) => { bg(t); chrome(t); kicker(s.kicker, 300, ease(lt / 0.4)); para(s.title, W / 2, 400, 940, 60, { font: 'Anton', weight: 400 });
  [[s.left, 80], [s.right, 560]].forEach(([col, x], ci) => { if (!col) return; const a = ease((lt - 0.3 - ci * 0.5) / 0.5); card(x, 500, 440, 900, a); text(col.head, x + 220, 560, 38, { color: C.gold2, alpha: a });
    let y = 630; (col.points || []).forEach(p => { const lines = wrap(p, 380, 30, 600); lines.forEach((ln, j) => text(ln, x + 30, y + j * 38, 30, { align: 'left', weight: 600, alpha: a })); y += lines.length * 38 + 30; }); }); note(s.note); };
S.outro = (s, lt, d, t) => { bg(t, 1); chrome(t); kicker(s.kicker || 'KEY TAKEAWAY', 360, ease(lt / 0.4)); const h = para(s.title, W / 2, 480, 940, 72, { font: 'Anton', weight: 400, lh: 1.08 });
  (s.lines || []).forEach((l, i) => para(l, W / 2, 520 + h + i * 70, 900, 38, { weight: 600, color: C.gold2, alpha: ease((lt - 0.4 - i * 0.3) / 0.5) }));
  const fa = ease((lt - 1.2) / 0.6); text('FOLLOW FOR MORE', W / 2, 1180, 60, { font: 'Anton', weight: 400, alpha: fa }); text(E.handle || '@reian.creative.finance', W / 2, 1250, 36, { color: C.gold2, alpha: fa, weight: 600 }); if (s.next) para('Next: ' + s.next, W / 2, 1320, 900, 32, { weight: 600, color: C.mute, alpha: fa }); note(s.disclaimer, fa); };
// ---------- timeline driver ----------
const segs = E.segments.map((s, i) => ({ s, start: i ? T.segments[i].start - 0.2 : 0 })); segs.forEach((x, i) => x.end = i < segs.length - 1 ? segs[i + 1].start : T.duration);
window.DURATION = T.duration;
window.renderAt = (t) => { const cur = segs.find(x => t >= x.start && t < x.end) || segs[segs.length - 1]; const lt = t - cur.start, d = cur.end - cur.start;
  S[cur.s.scene](cur.s, lt, d, t); captions(t);
  const fade = Math.min(clamp(lt / 0.25), clamp((d - lt) / 0.25)); if (fade < 1) { g.fillStyle = `rgba(7,16,31,${1 - fade})`; g.fillRect(0, 0, W, H); }
  text('Educational content · not financial advice', W / 2, 1880, 20, { weight: 600, color: 'rgba(154,166,189,0.75)' }); };
await document.fonts.ready; await new Promise(r => logo.complete ? r() : (logo.onload = logo.onerror = r)); window.renderAt(0); window.ready = true;
