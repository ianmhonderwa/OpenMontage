// Market recap runtime: builds one DOM layer per segment from episodes/<ID>/episode.json and
// animates it deterministically from window.renderAt(t). Timings come from out/<ID>/timing.json.
const q = new URLSearchParams(location.search); const EP = q.get('ep');
const E = await (await fetch(`../episodes/${EP}/episode.json`)).json();
const T = await (await fetch(`../out/${EP}/timing.json`)).json();
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => 1 - Math.pow(1 - clamp(x), 3);
const back = x => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const el = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
const css = (e, o) => Object.assign(e.style, o);
const fmt = (v, d = 2) => Number(v).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '±');
const tone = v => (v > 0 ? 'up' : v < 0 ? 'down' : '');
const arrow = v => (v > 0 ? '▲' : v < 0 ? '▼' : '■');
// entrance: fade + rise (+ optional scale) at local time lt, after delay, over dur seconds
function enter(e, lt, delay = 0, dur = 0.45, dy = 40, sc = 0) { const k = ease((lt - delay) / dur); css(e, { opacity: k, transform: `translateY(${(1 - k) * dy}px) scale(${1 - sc * (1 - k)})` }); return k; }

const HANDLE = E.handle || '@reian.creative.finance'; document.getElementById('handle').textContent = HANDLE;
const segsEl = document.getElementById('segs'), chapEl = document.getElementById('chap'), prog = document.querySelector('#progress i');
const glow = document.getElementById('glow'), bgpath = document.getElementById('bgpath');
const COL = { up: '#22c55e', down: '#ef4444', '': '#38bdf8' };

// background chart from real data points only (episode.spark = list of closes); hidden when absent
if (Array.isArray(E.spark) && E.spark.length > 1) {
  const s = E.spark, mn = Math.min(...s), mx = Math.max(...s), r = mx - mn || 1;
  bgpath.setAttribute('d', s.map((v, i) => `${i ? 'L' : 'M'}${(i / (s.length - 1) * 1080).toFixed(1)},${(470 - (v - mn) / r * 420).toFixed(1)}`).join(' '));
  bgpath.setAttribute('stroke', COL[tone(s[s.length - 1] - s[0])]);
} else bgpath.parentNode.style.display = 'none';

// ticker tape of real moves (episode.ticker = [{sym, chg}])
let tape = null;
if (Array.isArray(E.ticker) && E.ticker.length) { tape = el('div', 'tick', null, document.getElementById('tickwrap'));
  const items = [...E.ticker, ...E.ticker, ...E.ticker]; tape.innerHTML = items.map(x => `<span>${x.sym} <span class="${tone(x.chg)}">${arrow(x.chg)} ${fmt(Math.abs(x.chg), 2)}%</span></span>`).join(''); }

const B = {};   // segment builders: return render(lt, d, t)
const fitTitle = (e) => { const n = e.textContent.length; if (n > 15) e.style.fontSize = n > 22 ? '78px' : '92px'; };
B.cover = (s, root) => {
  const kick = el('div', 'pill', s.kicker, root); css(kick, { position: 'absolute', top: '330px', left: '50%', marginLeft: '0', background: '#1c1f27', border: '2px solid #333744', color: '#d6d9e2', fontSize: '34px', transformOrigin: 'center' });
  const t = el('div', 'title', s.title, root); css(t, { top: '440px', fontSize: '150px' });
  const w = el('div', 'sub', s.week, root); css(w, { top: '790px', fontSize: '40px' });
  const v = el('div', 'big', '', root); css(v, { position: 'absolute', top: '930px', left: 0, right: 0, textAlign: 'center', fontSize: s.bigSize || '300px' }); v.className = 'big ' + tone(s.delta);
  const l = el('div', 'sub', s.deltaLabel, root); css(l, { top: '1270px', fontSize: '38px', letterSpacing: '.12em', color: '#c9ccd6' });
  const sw = el('div', 'sweep', null, root);
  return (lt) => { const k = enter(kick, lt, 0.05, 0.4, 20); kick.style.transform += ' translateX(-50%)';
    enter(t, lt, 0.15, 0.5, 60, 0.15); enter(w, lt, 0.4); const kv = enter(v, lt, 0.6, 0.5, 30, 0.3); enter(l, lt, 0.9);
    v.textContent = s.big ?? `${sgn(s.delta)}${fmt(Math.abs(s.delta) * ease((lt - 0.6) / 1.4), 2)}%`;
    css(sw, { left: `${-300 + ease((lt - 0.8) / 0.9) * 1500}px`, opacity: lt > 0.8 && lt < 1.7 ? 1 : 0 }); };
};
B.bignum = (s, root) => {
  const t = el('div', 'title', s.title, root); const lab = el('div', 'sub', s.label, root); css(lab, { top: '470px', letterSpacing: '.16em', fontSize: '34px' });
  const v = el('div', 'big', '', root); css(v, { position: 'absolute', top: '560px', left: 0, right: 0, textAlign: 'center', fontSize: s.size || '250px' });
  const p = el('div', 'pill ' + tone(s.delta), `${s.delta ? arrow(s.delta) + ' ' : ''}${s.deltaText}`, root); css(p, { position: 'absolute', top: '870px', left: '50%', background: s.delta > 0 ? 'rgba(34,197,94,.14)' : s.delta < 0 ? 'rgba(239,68,68,.14)' : '#1c1f27', border: `2px solid ${COL[tone(s.delta)]}` });
  const notes = (s.notes || []).map((n, i) => { const c = el('div', 'card', n, root); css(c, { position: 'absolute', left: '90px', right: '90px', top: `${1010 + i * 150}px`, padding: '30px 40px', fontSize: '36px', fontWeight: 600, lineHeight: 1.3 }); return c; });
  return (lt) => { enter(t, lt, 0, 0.45, 50); enter(lab, lt, 0.2); enter(v, lt, 0.3, 0.5, 30, 0.2);
    v.textContent = (s.prefix || '') + fmt(s.from != null ? s.from + (s.value - s.from) * ease((lt - 0.3) / 1.6) : s.value * ease((lt - 0.3) / 1.2), s.decimals ?? 2) + (s.suffix || '');
    const k = enter(p, lt, 1.2, 0.35, 0, 0.4); p.style.transform += ' translateX(-50%)'; notes.forEach((c, i) => enter(c, lt, 1.6 + i * 0.5)); };
};
B.compare = (s, root) => {
  const t = el('div', 'title', s.title, root);
  const mk = (o, top, cls) => { const g = el('div', null, null, root); css(g, { position: 'absolute', top, left: 0, right: 0, textAlign: 'center' });
    const v = el('div', 'big ' + (cls || ''), o.value, g); css(v, { fontSize: '170px' }); const l = el('div', 'sub', o.label, g); css(l, { position: 'static', marginTop: '10px', fontSize: '34px' }); return g; };
  const a = mk(s.from, '470px'), ar = el('div', 'big', '↓', root), b = mk(s.to, '930px', tone(s.delta));
  css(ar, { position: 'absolute', top: '720px', left: 0, right: 0, textAlign: 'center', fontSize: '150px', color: '#5b6070' });
  const p = el('div', 'pill ' + tone(s.delta), `${s.delta ? arrow(s.delta) + ' ' : ''}${s.deltaText}`, root); css(p, { position: 'absolute', top: '1240px', left: '50%', background: '#1c1f27', border: `2px solid ${COL[tone(s.delta)]}` });
  return (lt) => { enter(t, lt, 0, 0.45, 50); enter(a, lt, 0.25); enter(ar, lt, 0.7, 0.35, -40); enter(b, lt, 1.0, 0.45, 40, 0.15); enter(p, lt, 1.5, 0.35, 0, 0.4); p.style.transform += ' translateX(-50%)'; };
};
B.bars = (s, root) => {
  const t = el('div', 'title', s.title, root); const sub = s.sub ? el('div', 'sub', s.sub, root) : null; if (sub) css(sub, { top: '310px' });
  const max = Math.max(...s.items.map(i => Math.abs(i.value))) || 1; const top0 = sub ? 420 : 380, H = Math.min(190, 1050 / s.items.length);
  const rows = s.items.map((it, i) => { const r = el('div', null, null, root); css(r, { position: 'absolute', left: '70px', right: '70px', top: `${top0 + i * H}px`, height: `${H - 24}px` });
    const name = el('div', null, it.label, r); css(name, { fontFamily: 'Anton', fontSize: `${Math.min(50, H * 0.34)}px`, letterSpacing: '.02em', width: '360px', whiteSpace: 'nowrap', overflow: 'hidden' });
    const sm = it.note ? el('div', null, it.note, r) : null; if (sm) css(sm, { position: 'absolute', left: 0, top: `${Math.min(50, H * 0.34) + 14}px`, fontSize: '26px', color: '#8b90a0', fontWeight: 600 });
    const bar = el('div', null, null, r); css(bar, { position: 'absolute', left: '380px', top: '10px', height: `${Math.min(56, H * 0.36)}px`, borderRadius: '12px', background: s.color || COL[tone(it.value)] });
    const val = el('div', 'big ' + tone(it.value), '', r); css(val, { position: 'absolute', right: 0, top: '2px', fontSize: `${Math.min(58, H * 0.38)}px`, textAlign: 'right' });
    return { r, bar, val, it }; });
  const W = 940 - 380 - 290;
  return (lt) => { enter(t, lt, 0, 0.45, 50); if (sub) enter(sub, lt, 0.2);
    rows.forEach(({ r, bar, val, it }, i) => { const d0 = 0.4 + i * 0.28; enter(r, lt, d0, 0.35, 30); const k = ease((lt - d0 - 0.1) / 0.8);
      bar.style.width = `${Math.max(6, Math.abs(it.value) / max * W * k)}px`; val.textContent = `${s.plain ? (s.prefix || '') : sgn(it.value)}${fmt(Math.abs(it.value) * k, it.decimals ?? s.decimals ?? 2)}${it.unit ?? s.unit ?? '%'}`; if (s.plain) val.className = 'big'; }); };
};
B.cards = (s, root) => {
  const t = el('div', 'title', s.title, root); const n = s.cards.length, H = Math.min(270, 1150 / n);
  const cs = s.cards.map((c, i) => { const d = el('div', 'card', null, root); css(d, { position: 'absolute', left: '70px', right: '70px', top: `${400 + i * H}px`, height: `${H - 30}px`, display: 'flex', alignItems: 'center', gap: '36px', padding: '0 44px' });
    const b = el('div', 'big ' + (c.tone || ''), c.big, d); css(b, { fontSize: `${Math.min(110, H * 0.5)}px`, minWidth: '300px' });
    const tx = el('div', null, `<div style="font-weight:800;font-size:38px;line-height:1.15">${c.text}</div>${c.sub ? `<div style="margin-top:8px;font-size:27px;color:#8b90a0;font-weight:600">${c.sub}</div>` : ''}`, d); return d; });
  return (lt) => { enter(t, lt, 0, 0.45, 50); cs.forEach((d, i) => enter(d, lt, 0.45 + i * 0.55, 0.45, 60, 0.05)); };
};
B.table = (s, root) => {
  const t = el('div', 'title', s.title, root); const box = el('div', 'card', null, root); css(box, { position: 'absolute', left: '60px', right: '60px', top: '400px', padding: '20px 40px' });
  const rows = s.rows.map((r, i) => { const d = el('div', null, `<span>${r.name}</span><span style="font-family:Anton;font-size:52px">${r.value}</span><span class="${tone(r.chg)}" style="font-family:Anton;font-size:52px;min-width:210px;text-align:right">${sgn(r.chg)}${fmt(Math.abs(r.chg), 2)}%</span>`, box);
    css(d, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', padding: '26px 0', borderBottom: i < s.rows.length - 1 ? '2px solid #262932' : 'none', fontWeight: 800, fontSize: '34px' }); return d; });
  const foot = s.foot ? el('div', 'sub', s.foot, root) : null; if (foot) css(foot, { top: `${450 + s.rows.length * 120}px`, fontSize: '28px' });
  return (lt) => { enter(t, lt, 0, 0.45, 50); enter(box, lt, 0.25, 0.4, 40); rows.forEach((d, i) => enter(d, lt, 0.45 + i * 0.3, 0.3, 20)); if (foot) enter(foot, lt, 0.6 + rows.length * 0.3); };
};
B.but = (s, root) => {
  const w = el('div', 'big', s.text || 'BUT…', root); css(w, { position: 'absolute', top: '700px', left: 0, right: 0, textAlign: 'center', fontSize: '330px' });
  return (lt, d, tt) => { const k = back((lt - 0.05) / 0.4); const j = lt < 0.6 ? Math.sin(tt * 90) * 10 * (1 - lt / 0.6) : 0;
    css(w, { opacity: clamp(lt / 0.15), transform: `translate(${j}px, ${-j * 0.5}px) scale(${0.6 + 0.4 * k})`, textShadow: lt < 0.7 ? `${-8 + j}px 0 #ef4444, ${8 - j}px 0 #38bdf8` : 'none' }); };
};
B.quote = (s, root) => {
  const t = el('div', 'title', s.title, root); const c = el('div', 'card', null, root); css(c, { position: 'absolute', left: '70px', right: '70px', top: '440px', padding: '50px 50px', fontSize: '42px', lineHeight: 1.45, fontWeight: 600, color: '#d7dae3' });
  const parts = s.quote.split(s.highlight); c.innerHTML = `“${parts[0]}<mark style="background:linear-gradient(90deg,#ffd23f 0,#ffd23f var(--k),transparent var(--k));color:inherit;padding:0 4px">${s.highlight}</mark>${parts.slice(1).join(s.highlight)}”`;
  const m = c.querySelector('mark'); const src = el('div', 'sub', '— ' + s.source, root); css(src, { top: 'auto', bottom: '520px', fontSize: '30px' });
  return (lt) => { enter(t, lt, 0, 0.45, 50); enter(c, lt, 0.3); enter(src, lt, 0.7); const k = ease((lt - 1.1) / 1.0); m.style.setProperty('--k', `${k * 100}%`); m.style.color = k > 0.5 ? '#111' : 'inherit'; };
};
B.outro = (s, root) => {
  const t = el('div', 'title', s.title, root); const ls = (s.lines || []).map((x, i) => { const d = el('div', 'card', x, root); css(d, { position: 'absolute', left: '80px', right: '80px', top: `${400 + i * 175}px`, padding: '34px 40px', fontSize: '38px', fontWeight: 700, lineHeight: 1.3 }); return d; });
  const fb = el('div', null, `<img src="logo.jpg" style="width:150px;height:150px;border-radius:50%;object-fit:cover;border:4px solid #fff"><div style="font-family:Anton;font-size:64px;margin-top:22px">${s.follow || 'FOLLOW FOR NEXT WEEK'}</div><div style="font-weight:800;font-size:40px;color:#c9ccd6;margin-top:6px">${HANDLE}</div>`, root);
  css(fb, { position: 'absolute', top: '1020px', left: 0, right: 0, textAlign: 'center' });
  const dis = el('div', 'src', s.disclaimer, root); css(dis, { bottom: '230px' });
  return (lt) => { enter(t, lt, 0, 0.45, 50); ls.forEach((d, i) => enter(d, lt, 0.4 + i * 0.6)); enter(fb, lt, 0.8 + ls.length * 0.6, 0.5, 40, 0.2); enter(dis, lt, 1.2 + ls.length * 0.6); };
};

// build every segment
const segs = E.segments.map((s, i) => { const root = el('div', 'seg', null, segsEl); const r = B[s.type](s, root);
  if (s.type !== 'cover') root.querySelectorAll(':scope > .title').forEach(fitTitle);
  if (s.source && s.type !== 'quote') { const sc = el('div', 'src', 'Source: ' + s.source, root); }
  const tm = T.segments[i]; return { s, root, r, start: i ? tm.start - 0.25 : 0 }; });
segs.forEach((g, i) => { g.end = i < segs.length - 1 ? segs[i + 1].start : T.duration; });
window.DURATION = T.duration;
window.renderAt = (t) => {
  prog.style.width = `${clamp(t / T.duration) * 100}%`;
  let cur = null; for (const g of segs) { const on = t >= g.start && t < g.end || (g === segs[segs.length - 1] && t >= g.start); g.root.style.display = on ? 'block' : 'none'; if (on) cur = g; }
  if (cur) { const lt = t - cur.start; cur.r(lt, cur.end - cur.start, t); chapEl.textContent = cur.s.chapter || E.series;
    const srcEl = cur.root.querySelector(':scope > .src'); if (srcEl && cur.s.type !== 'outro') srcEl.style.opacity = clamp((lt - 1.0) / 0.5);
    const tn = cur.s.tone ?? tone(cur.s.delta ?? 0); glow.style.background = COL[tn] || COL['']; }
  css(glow, { left: `${-160 + Math.sin(t * 0.21) * 140}px`, top: `${240 + Math.cos(t * 0.17) * 160}px` });
  document.getElementById('grid').style.transform = `translate(${(t * 12) % 90}px, ${(t * 6) % 90}px)`;
  if (tape) tape.style.transform = `translateX(${-((t * 70) % (tape.scrollWidth / 3))}px)`;
};
await document.fonts.ready; await Promise.all([...document.images].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
window.renderAt(0); window.ready = true;
