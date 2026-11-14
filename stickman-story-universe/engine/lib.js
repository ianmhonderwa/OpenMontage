// Stickman Story Universe – shared 3D library: helpers, stickman rig, props, character presets.
// Reuse these; add new character presets / props here when an episode first needs them.
import * as THREE from 'three';
export { THREE };
// ---------- helpers ----------
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOutBack = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const lerp = (a, b, x) => a + (b - a) * x;

export const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const matCache = {};
export function toon(color, opts = {}) { const k = color + JSON.stringify(opts); if (!matCache[k]) matCache[k] = new THREE.MeshToonMaterial({ color, gradientMap: grad, ...opts }); return matCache[k]; }
export const BLACK = new THREE.MeshBasicMaterial({ color: 0x111111 });
export const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide });
export function outlined(geo, mat, s = 1.06) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  const o = new THREE.Mesh(geo, OUTLINE); o.scale.setScalar(s); m.add(o); return m;
}
export function skyTexture(top, mid, bottom) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- stickman rig ----------
export const LIMB_R = 0.05;
export function limb(len) { const g = new THREE.CylinderGeometry(LIMB_R, LIMB_R, len, 10); g.translate(0, -len / 2, 0); const m = new THREE.Mesh(g, BLACK); m.castShadow = true; return m; }
export function joint() { return new THREE.Mesh(new THREE.SphereGeometry(LIMB_R * 1.05, 10, 8), BLACK); }

export function makeStick(o = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body); // bobs / leans
  const H = { hip: 1.12, neck: 2.06 };
  // legs
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.11, H.hip, 0); body.add(hip);
    hip.add(limb(0.56)); const knee = new THREE.Group(); knee.position.y = -0.56; hip.add(knee); knee.add(joint());
    knee.add(limb(0.54)); const foot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), BLACK); foot.scale.set(0.9, 0.55, 1.6); foot.position.set(0, -0.56, 0.07); foot.castShadow = true; knee.add(foot);
    legs.push({ hip, knee });
  }
  // torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(LIMB_R, LIMB_R, H.neck - H.hip, 10), BLACK); torso.position.y = (H.neck + H.hip) / 2; body.add(torso);
  // arms
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.06, 1.95, 0); body.add(sh); sh.add(joint());
    sh.add(limb(0.5)); const el = new THREE.Group(); el.position.y = -0.5; sh.add(el); el.add(joint()); el.add(limb(0.45));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), BLACK); hand.position.y = -0.47; el.add(hand);
    arms.push({ sh, el, side });
  }
  // clothing
  if (o.robe) {
    const len = o.robeLong ? 1.95 : 1.45; const bottom = 1.97 - len;
    const g = new THREE.CylinderGeometry(0.2, o.robeWide ?? 0.52, len, 24, 1, true); g.translate(0, bottom + len / 2, 0);
    const robe = outlined(g, toon(o.robe, { side: THREE.DoubleSide }), 1.04); body.add(robe);
    const cap = outlined(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(o.robe)); cap.position.y = 1.97; body.add(cap);
    if (o.sash) { const s = outlined(new THREE.BoxGeometry(0.16, 1.05, 0.06), toon(o.sash)); s.position.set(-0.05, 1.6, 0.27); s.rotation.z = 0.62; s.rotation.x = -0.12; body.add(s); }
    if (o.trim) { const tr = new THREE.Mesh(new THREE.TorusGeometry(o.robeWide ?? 0.52, 0.045, 8, 32), toon(o.trim)); tr.rotation.x = Math.PI / 2; tr.position.y = bottom + 0.05; body.add(tr); }
  }
  // head
  const headG = new THREE.Group(); headG.position.y = 2.62; body.add(headG);
  const head = outlined(new THREE.SphereGeometry(0.56, 40, 30), toon(0xffffff), 1.055); headG.add(head);
  const face = new THREE.Group(); headG.add(face);
  const eyeR = o.bulge ? 0.16 : 0.13;
  const eyes = [], brows = [];
  for (const side of [-1, 1]) {
    const e = outlined(new THREE.SphereGeometry(eyeR, 20, 14), toon(0xffffff), 1.18); e.scale.z = 0.55; e.position.set(side * 0.2, 0.1, 0.5); face.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.52, 14, 10), BLACK); p.position.set(0, 0, eyeR * 0.85); e.add(p);
    eyes.push({ e, p });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.05), BLACK); b.position.set(side * 0.2, 0.33, 0.47); b.rotation.x = -0.5; face.add(b); brows.push(b);
  }
  if (o.nose) { const n = outlined(new THREE.SphereGeometry(0.085, 14, 10), toon(0xffffff), 1.2); n.scale.set(1.2, 0.9, 0.9); n.position.set(0, -0.05, 0.56); face.add(n); }
  const mouth = new THREE.Group(); mouth.position.set(0, -0.2, 0.52); mouth.rotation.x = -0.32; face.add(mouth);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 24, Math.PI), BLACK); smile.rotation.z = Math.PI; mouth.add(smile);
  const frown = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 24, Math.PI), BLACK); frown.position.y = -0.08; mouth.add(frown);
  const open = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), BLACK); open.scale.set(1, 1.2, 0.3); open.position.y = -0.03; mouth.add(open);
  const flat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.03), BLACK); flat.position.y = -0.04; mouth.add(flat);
  if (o.beard) {
    const bm = toon(o.beard); const R = rng(o.seed ?? 3);
    const beard = new THREE.Group(); headG.add(beard);
    const pts = o.bigBeard ? [[0, -0.5, .3, .3], [-.24, -.42, .28, .24], [.24, -.42, .28, .24], [-.38, -.18, .2, .2], [.38, -.18, .2, .2], [0, -.75, .2, .24], [-.17, -.68, .16, .2], [.17, -.68, .16, .2]] :
      [[0, -.46, .28, .17], [-.2, -.38, .26, .14], [.2, -.38, .26, .14]];
    for (const [x, y, z, r] of pts) { const b = outlined(new THREE.SphereGeometry(r + R() * 0.03, 16, 12), bm, 1.08); b.position.set(x, y, z); beard.add(b); }
    if (o.bigBeard) for (const s of [-1, 1]) { const tuft = outlined(new THREE.SphereGeometry(0.17, 14, 10), bm, 1.08); tuft.position.set(s * 0.5, 0.02, -0.08); headG.add(tuft); }
  }
  if (o.hair) {
    const hm = toon(o.hair); const R = rng(o.seed ?? 7);
    if (o.curls) { for (let i = 0; i < 14; i++) { const a = R() * Math.PI * 2, el = 0.3 + R() * 0.9; const c = outlined(new THREE.SphereGeometry(0.15, 10, 8), hm, 1.1); c.position.set(Math.cos(a) * Math.cos(el) * 0.5, Math.sin(el) * 0.5 + 0.06, Math.sin(a) * Math.cos(el) * 0.5 - 0.06); if (c.position.z > 0.2) c.position.z = 0.2; headG.add(c); } }
    else { const cap = outlined(new THREE.SphereGeometry(0.585, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.36), hm, 1.04); cap.rotation.x = -0.35; headG.add(cap); }
  }
  if (o.turban) { const tb = outlined(new THREE.SphereGeometry(0.62, 28, 18), toon(o.turban), 1.04); tb.scale.set(1.05, 0.62, 1.05); tb.position.y = 0.42; headG.add(tb); }
  if (o.bun) { const cap = outlined(new THREE.SphereGeometry(0.585, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.36), toon(o.hair), 1.04); cap.rotation.x = -0.35; headG.add(cap); const bn = outlined(new THREE.SphereGeometry(0.2, 14, 10), toon(o.hair), 1.08); bn.position.set(0, 0.45, -0.42); headG.add(bn); }
  if (o.hat) { const h = outlined(new THREE.CylinderGeometry(0.3, 0.42, 0.3, 20), toon(o.hat)); h.position.y = 0.55; headG.add(h); }
  if (o.veil) { const v = outlined(new THREE.SphereGeometry(0.62, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), toon(o.veil, { side: THREE.DoubleSide }), 1.03); v.rotation.x = -1.05; v.position.set(0, 0.05, -0.12); headG.add(v); }

  if (o.glasses) { for (const sd of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 24), BLACK); r.position.set(sd * 0.2, 0.1, 0.56); face.add(r); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.022, 0.02), BLACK); br.position.set(0, 0.12, 0.6); face.add(br); }
  if (o.scarf) { const sc = outlined(new THREE.TorusGeometry(0.2, 0.09, 10, 24), toon(o.scarf), 1.08); sc.rotation.x = Math.PI / 2; sc.position.y = 2.02; body.add(sc);
    const tail = outlined(new THREE.BoxGeometry(0.14, 0.42, 0.06), toon(o.scarf), 1.08); tail.position.set(0.12, 1.8, 0.2); tail.rotation.z = 0.15; body.add(tail); }
  if (o.book) { const bk = new THREE.Group(); for (const sd of [-1, 1]) { const pg = outlined(new THREE.BoxGeometry(0.34, 0.46, 0.04), toon(0xfff8e6), 1.06); pg.position.x = sd * 0.17; pg.rotation.y = -sd * 0.25; bk.add(pg); }
    const cv = outlined(new THREE.BoxGeometry(0.72, 0.5, 0.03), toon(o.book), 1.04); cv.position.z = -0.04; bk.add(cv); bk.position.set(0, 1.55, 0.42); bk.rotation.x = -0.5; body.add(bk); }
  if (o.prop === 'hammer') { const h = new THREE.Group(); const hd = outlined(new THREE.BoxGeometry(0.3, 0.14, 0.14), toon(0x8a8f96), 1.1); hd.position.y = -0.3; h.add(hd); const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), toon(0x7a5230)); hl.position.y = -0.1; h.add(hl); arms[0].el.add(h); h.position.y = -0.45; }
  if (o.prop === 'staff') { const st = outlined(new THREE.CylinderGeometry(0.045, 0.045, 2.6, 8), toon(0x7a5230), 1.1); st.position.y = -0.2; arms[0].el.add(st); st.position.set(0, -0.45, 0.05); }
  const rig = { root, body, legs, arms, headG, face, eyes, brows, smile, frown, open, flat, H };
  rig.expr = (kind, browUp = 0) => {
    smile.visible = kind === 'smile'; frown.visible = kind === 'frown'; open.visible = kind === 'open'; flat.visible = kind === 'flat';
    brows[0].position.y = brows[1].position.y = 0.33 + browUp * 0.09;
    brows[0].rotation.z = -browUp * 0.25; brows[1].rotation.z = browUp * 0.25;
  };
  rig.look = (x = 0, y = 0) => { for (const { p } of eyes) { p.position.x = x * 0.05; p.position.y = y * 0.05; } };
  rig.rest = () => {
    for (const { hip, knee } of legs) { hip.rotation.set(0, 0, 0); knee.rotation.set(0, 0, 0); }
    for (const { sh, el, side } of arms) { sh.rotation.set(0, 0, side * 0.18); el.rotation.set(0, 0, 0); }
    body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); headG.rotation.set(0, 0, 0);
  };
  rig.walk = (phase, amt = 1) => {
    const s = Math.sin(phase) * 0.55 * amt;
    legs[0].hip.rotation.x = s; legs[1].hip.rotation.x = -s;
    legs[0].knee.rotation.x = Math.max(0, -Math.sin(phase + 0.6)) * 0.9 * amt; legs[1].knee.rotation.x = Math.max(0, Math.sin(phase + 0.6)) * 0.9 * amt;
    arms[0].sh.rotation.x = -s * 0.8; arms[1].sh.rotation.x = s * 0.8; arms[0].el.rotation.x = -0.35 * amt; arms[1].el.rotation.x = -0.35 * amt;
    body.position.y = Math.abs(Math.cos(phase)) * 0.06 * amt;
  };
  rig.sit = () => {
    for (const { hip, knee } of legs) { hip.rotation.x = -1.45; knee.rotation.x = 1.45; }
    body.position.y = -0.62;
  };
  rig.rest(); rig.expr('smile');
  return rig;
}

// ---------- canonical recurring characters (Style & Script Guide) – reuse word for word ----------
export const STORYTELLER = { glasses: true, scarf: 0xc8323c, book: 0x8a3b2e, seed: 21 }; // host: BIB, AES, ANA, GRM
export const CRITO = { robe: 0x2f5fa8, hair: 0x6b4423, curls: true, beard: 0x6b4423, seed: 12 };
export const XANTHIPPE = { robe: 0xc8623e, robeLong: true, hair: 0x2a1a10, bun: true, seed: 13 };
export const NASREDDIN = { robe: 0x3f8a4a, sash: 0x9fd09a, beard: 0x9a9a9a, turban: 0xffffff, seed: 14 };
export const NOAH = { robe: 0x7a5230, beard: 0xf2f2f2, bigBeard: true, prop: 'hammer', seed: 15 };
export const ABRAM = { robe: 0xcfa36a, sash: 0x8a5a3c, beard: 0xa0a0a0, bigBeard: true, prop: 'staff', seed: 16 };
export const SARAI = { robe: 0x9c8a7a, robeLong: true, veil: 0x9a9a9a, seed: 17 };
export const LOT = { robe: 0xb03030, beard: 0x111111, hair: 0x111111, seed: 18 };
export const SOCRATES = { robe: 0xf1ead9, sash: 0xdcd0b6, beard: 0xb7b7b7, bigBeard: true, nose: true, bulge: true, seed: 11 };

// ---------- props ----------
export function column(h = 6, r = 0.42, color = 0xf3eee4) {
  const g = new THREE.Group(); const m = toon(color);
  const shaft = outlined(new THREE.CylinderGeometry(r * 0.88, r, h, 18), m, 1.03); shaft.position.y = h / 2; g.add(shaft);
  const base = outlined(new THREE.BoxGeometry(r * 2.6, 0.3, r * 2.6), m, 1.03); base.position.y = 0.15; g.add(base);
  const capi = outlined(new THREE.BoxGeometry(r * 2.7, 0.35, r * 2.7), m, 1.03); capi.position.y = h + 0.17; g.add(capi);
  shaft.receiveShadow = true; return g;
}
export function oliveTree(scale = 1, seed = 1) {
  const g = new THREE.Group(); const R = rng(seed);
  const trunk = outlined(new THREE.CylinderGeometry(0.22, 0.38, 2.6, 10), toon(0x7a5230), 1.05); trunk.position.y = 1.3; trunk.rotation.z = 0.12; g.add(trunk);
  const leaf = toon(0x7f9b47);
  for (let i = 0; i < 6; i++) { const b = outlined(new THREE.SphereGeometry(0.9 + R() * 0.5, 16, 12), leaf, 1.05); b.scale.y = 0.7; b.position.set((R() - 0.5) * 2.4, 2.9 + R() * 1.2, (R() - 0.5) * 1.6); g.add(b); }
  g.scale.setScalar(scale); return g;
}
export function stall(awning, seed) {
  const g = new THREE.Group(); const R = rng(seed);
  const wood = toon(0x9a6b42);
  const table = outlined(new THREE.BoxGeometry(2.6, 0.9, 1.2), wood, 1.03); table.position.y = 0.45; g.add(table);
  for (const [x, z] of [[-1.2, -0.5], [1.2, -0.5], [-1.2, 0.5], [1.2, 0.5]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), BLACK); p.position.set(x, 1.3, z); g.add(p); }
  const aw = outlined(new THREE.BoxGeometry(3.0, 0.12, 1.6), toon(awning), 1.04); aw.position.y = 2.6; aw.rotation.x = 0.12; g.add(aw);
  const goods = [0xf29f05, 0xc0392b, 0x7f9b47, 0xc06a3a];
  for (let i = 0; i < 7; i++) { const c = goods[Math.floor(R() * goods.length)]; const s = outlined(new THREE.SphereGeometry(0.18, 10, 8), toon(c), 1.1); s.position.set(-1 + i * 0.33, 1.05, (R() - 0.5) * 0.6); g.add(s); }
  const jar = outlined(new THREE.CylinderGeometry(0.2, 0.28, 0.6, 12), toon(0xc06a3a), 1.06); jar.position.set(1.6, 0.3, 0.6); g.add(jar);
  return g;
}
export function questionMark() {
  const g = new THREE.Group(); const m = toon(0xffd23f);
  const arc = outlined(new THREE.TorusGeometry(0.34, 0.1, 12, 30, Math.PI * 1.45), m, 1.12); arc.rotation.z = -Math.PI * 0.45; arc.position.y = 0.62; g.add(arc);
  const stem = outlined(new THREE.CylinderGeometry(0.1, 0.1, 0.32, 12), m, 1.12); stem.position.set(0, 0.12, 0); g.add(stem);
  const dot = outlined(new THREE.SphereGeometry(0.12, 14, 10), m, 1.12); dot.position.y = -0.3; g.add(dot);
  return g;
}
export function bulb() {
  const g = new THREE.Group();
  const glass = outlined(new THREE.SphereGeometry(0.42, 24, 18), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }), 1.06); glass.position.y = 0.45; g.add(glass);
  const base = outlined(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 14), toon(0x9aa0a6), 1.08); base.position.y = -0.02; g.add(base);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,236,150,0.9)', 'rgba(255,200,80,0)'), transparent: true, depthWrite: false }));
  glow.scale.setScalar(3.2); glow.position.y = 0.45; g.add(glow);
  g.userData = { glass, glow }; return g;
}
export function laurel() {
  const g = new THREE.Group(); const m = toon(0x5f8f2f);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 8, 32), toon(0x4a6f22)); ring.rotation.x = Math.PI / 2; g.add(ring);
  for (let i = 0; i < 16; i++) { if (i === 4 || i === 12) continue; const a = i / 16 * Math.PI * 2; const l = outlined(new THREE.SphereGeometry(0.1, 10, 8), m, 1.15); l.scale.set(1.8, 0.6, 0.9); l.position.set(Math.cos(a) * 0.5, 0.04, Math.sin(a) * 0.5); l.rotation.y = -a + 0.6; g.add(l); }
  return g;
}
export function drop() { const d = outlined(new THREE.SphereGeometry(0.09, 12, 10), toon(0x5bc0eb), 1.15); d.scale.y = 1.45; return d; }

