// Stickman Story Universe – shared runtime. Loads episodes/<EP>/script.json, out/<EP>/timing.json and
// episodes/<EP>/scenes.js, then exposes window.renderAt(t) for the frame renderer.
import * as L from './lib.js';
const { THREE, clamp, skyTexture } = L;

const EP = new URLSearchParams(location.search).get('ep');
const SCRIPT = await (await fetch(`../episodes/${EP}/script.json`)).json();
const TIMING = await (await fetch(`../out/${EP}/timing.json`)).json();
const DUR = TIMING.duration, SEG = TIMING.segments;
// Scene i runs from the start of its narration line (scene 1 from 0) to the start of the next.
const SCENES = SEG.map((s, i) => ({ start: i === 0 ? 0 : SEG[i].start - 0.2, end: i < SEG.length - 1 ? SEG[i + 1].start - 0.2 : DUR }));

// on-screen text
document.querySelector('#badge span').innerHTML = `${SCRIPT.series_badge} · <b>EP ${SCRIPT.ep_number}</b>`;
document.getElementById('title').innerHTML = SCRIPT.title_html;
document.querySelector('#endcard .ep').textContent = SCRIPT.next_title;

// renderer + world
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1080 / 1920, 0.1, 400);
const hemi = new THREE.HemisphereLight(0xfff3dd, 0x8a6a4a, 1.5); scene.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff0d0, 2.4); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048);
Object.assign(sunL.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 }); scene.add(sunL); scene.add(sunL.target);
function aimSun(origin, off, color = 0xfff0d0, inten = 2.4) { sunL.position.copy(origin).add(off); sunL.target.position.copy(origin); sunL.color.set(color); sunL.intensity = inten; sunL.shadow.camera.updateProjectionMatrix(); }
const SKIES = {
  day: skyTexture('#5fb3ea', '#a9dcf5', '#fde9c0'),
  night: skyTexture('#140e22', '#241a38', '#3a2b52'),
  sunset: skyTexture('#4b2a78', '#e0617a', '#ffb56b'),
  endcard: skyTexture('#78c4ee', '#bfe6f7', '#fbeed2'),
  desert: skyTexture('#4aa3df', '#9fd3ef', '#f6d9a0'),
  forest: skyTexture('#2c4a3a', '#6f9a7c', '#d9e6c8'),
};

// episode
const mod = await import(`../episodes/${EP}/scenes.js`);
const scenesFn = mod.build({ ...L, L, scene, camera, renderer, hemi, sunL, aimSun, SKIES, skyTexture, SCRIPT, TIMING, SCENES });
if (scenesFn.length !== SCENES.length) console.error(`scenes.js returned ${scenesFn.length} scenes but script has ${SCENES.length} lines`);

// captions: word-highlighted chunks, timing proportional to word length within each narration line
const wmEl = document.getElementById('wm'), capEl = document.getElementById('caption'), titleEl = document.getElementById('title'), fadeEl = document.getElementById('fade'), endEl = document.getElementById('endcard');
const CAPS = [];
for (const s of SEG) {
  const words = s.text.replace(/\s+/g, ' ').trim().split(' ');
  const chunks = []; let cur = [];
  for (const w of words) { cur.push(w); if (cur.length >= 4 || /[.!?:]$/.test(w) && cur.length >= 2) { chunks.push(cur); cur = []; } }
  if (cur.length) chunks.push(cur);
  const weight = w => w.replace(/[^a-z0-9]/gi, '').length + 2;
  const total = words.reduce((a, w) => a + weight(w), 0); let t = s.start; const span = s.end - s.start;
  for (const c of chunks) { const ws = c.map(w => { const d = weight(w) / total * span; const o = { w, a: t, b: t + d }; t += d; return o; }); CAPS.push({ a: ws[0].a, b: ws[ws.length - 1].b, ws }); }
}
let lastCap = '';
function updateCaption(t) {
  const c = CAPS.find(c => t >= c.a - 0.05 && t < c.b + 0.25);
  const html = c ? c.ws.map(o => `<span class="${t >= o.a ? 'on' : ''}">${o.w}</span>`).join(' ') : '';
  if (html !== lastCap) { capEl.innerHTML = html; lastCap = html; }
}

window.renderAt = (t) => {
  let i = SCENES.findIndex(s => t < s.end); if (i < 0) i = SCENES.length - 1;
  const s = SCENES[i]; const lt = t - s.start, d = s.end - s.start;
  scenesFn[i](lt, d, t); camera.updateProjectionMatrix();
  fadeEl.style.opacity = i > 0 && lt < 0.12 ? (1 - lt / 0.12) * 0.85 : (i < SCENES.length - 1 && d - lt < 0.08 ? (1 - (d - lt) / 0.08) * 0.85 : 0);
  titleEl.style.opacity = t < 3.2 ? clamp(t / 0.3) * clamp((3.2 - t) / 0.4) : 0;
  endEl.style.opacity = i === SCENES.length - 1 ? clamp((lt - 0.2) / 0.4) : 0;
  wmEl.style.opacity = i === SCENES.length - 1 ? 1 - clamp((lt - 0.1) / 0.3) : 0.92 * clamp((t - 3.2) / 0.4);
  endEl.querySelector('.btn').style.transform = `scale(${1 + 0.05 * Math.sin(lt * 6)})`;
  updateCaption(t);
  renderer.render(scene, camera);
  return i;
};
window.DURATION = DUR;
await Promise.all([...document.images].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
window.ready = true;
