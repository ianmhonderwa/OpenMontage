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
    if (o.slippers) { const sl = outlined(new THREE.ConeGeometry(0.07, 0.3, 8), toon(o.slippers), 1.1); sl.rotation.x = Math.PI / 2 - 0.35; sl.position.set(0, -0.54, 0.22); knee.add(sl); }
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
    if (o.stripes) for (let k = 1; k <= 5; k++) { const fr = k / 6; const rr = (o.robeWide ?? 0.52) + (0.2 - (o.robeWide ?? 0.52)) * fr; const st = new THREE.Mesh(new THREE.TorusGeometry(rr + 0.012, 0.028, 6, 28), toon(o.stripes)); st.rotation.x = Math.PI / 2; st.position.y = bottom + len * fr; body.add(st); }
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
  if (o.leaf) { const lf = outlined(new THREE.CylinderGeometry(0.17, 0.32, 0.42, 14, 1, true), toon(o.leaf, { side: THREE.DoubleSide }), 1.05); lf.position.y = 1.0; body.add(lf);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const tip = outlined(new THREE.ConeGeometry(0.06, 0.16, 6), toon(o.leaf), 1.1); tip.position.set(Math.cos(a) * 0.3, 0.74, Math.sin(a) * 0.3); tip.rotation.x = Math.PI; body.add(tip); } }
  if (o.longHair) { const lh = outlined(new THREE.CapsuleGeometry(0.3, 0.55, 6, 14), toon(o.hair), 1.05); lh.position.set(0, -0.28, -0.3); headG.add(lh); }
  if (o.crown) { const cs = o.crownSize ?? 1; const cg = new THREE.Group(); cg.position.set(0, 0.52, 0); cg.scale.setScalar(cs); headG.add(cg);
    const band = outlined(new THREE.CylinderGeometry(0.27, 0.3, 0.14, 14, 1, true), toon(o.crown, { side: THREE.DoubleSide }), 1.08); cg.add(band);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const sp = outlined(new THREE.ConeGeometry(0.06, 0.16, 6), toon(o.crown), 1.1); sp.position.set(Math.cos(a) * 0.28, 0.14, Math.sin(a) * 0.28); cg.add(sp); } }
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
export const ADAM = { leaf: 0x3f8a3a, hair: 0x2a1a10, seed: 22 };
export const EVE = { leaf: 0x3f8a3a, hair: 0x2a1a10, longHair: true, seed: 23 };
export const NYANKUPON = { robe: 0xe0a52a, robeLong: true, robeWide: 0.7, stripes: 0x2a8a3a, trim: 0xc8323c, crown: 0xffd23f, crownSize: 1.35, seed: 41 };
export const CRITO = { robe: 0x2f5fa8, hair: 0x6b4423, curls: true, beard: 0x6b4423, seed: 12 };
export const XANTHIPPE = { robe: 0xc8623e, robeLong: true, hair: 0x2a1a10, bun: true, seed: 13 };
export const NASREDDIN = { robe: 0x3f8a4a, stripes: 0x2a6234, sash: 0x9fd09a, beard: 0x9a9a9a, turban: 0xffffff, slippers: 0xd9a441, seed: 14 };
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


// ---------- animals: simple stick-legged animals with round white heads (Guide: AES / BIB / ANA) ----------
// makeAnimal(kind): 'elephant' | 'lion' | 'giraffe' | 'rabbit' | 'mouse' | 'donkey' | 'horse' | 'tiger'. .mouth (visible toggle), .eyes[], .lie(k) lying pose. Faces +x. Returns { root, legs, head, tail, walk(phase, amt), hr }.
export function makeAnimal(kind) {
  const P = {
    elephant: { c: 0x9aa3ad, r: 0.72, len: 1.2, leg: 0.85, hr: 0.5, neck: 0 },
    lion: { c: 0xe0a23a, r: 0.42, len: 0.95, leg: 0.55, hr: 0.36, neck: 0 },
    giraffe: { c: 0xf0c24a, r: 0.42, len: 0.9, leg: 1.55, hr: 0.27, neck: 1.5 },
    rabbit: { c: 0xece6dc, r: 0.2, len: 0.32, leg: 0.16, hr: 0.19, neck: 0 },
    mouse: { c: 0xb9b3ad, r: 0.13, len: 0.22, leg: 0.1, hr: 0.14, neck: 0 },
    donkey: { c: 0x9aa0a8, r: 0.36, len: 0.85, leg: 0.62, hr: 0.3, neck: 0 },
    tiger: { c: 0xf29a2e, r: 0.42, len: 0.95, leg: 0.58, hr: 0.38, neck: 0 },
    horse: { c: 0xf4f0e8, r: 0.4, len: 1.0, leg: 0.95, hr: 0.27, neck: 0.62 },
  }[kind];
  const root = new THREE.Group(); const bg = new THREE.Group(); root.add(bg);
  const by = P.leg + P.r * 0.5;
  const body = outlined(new THREE.CapsuleGeometry(P.r, P.len, 6, 16), toon(P.c), 1.04); body.rotation.z = Math.PI / 2; body.position.y = by; bg.add(body);
  const L = by - P.r * 0.35, legs = [];
  for (const [x, z] of [[P.len / 2, 1], [P.len / 2, -1], [-P.len / 2, 1], [-P.len / 2, -1]]) {
    const piv = new THREE.Group(); piv.position.set(x, L, z * P.r * 0.55); bg.add(piv);
    const w = kind === 'elephant' ? 0.14 : 0.055; const g = new THREE.CylinderGeometry(w, w, L, 8); g.translate(0, -L / 2, 0);
    const m = new THREE.Mesh(g, kind === 'elephant' ? toon(P.c) : BLACK); m.castShadow = true; piv.add(m); legs.push(piv);
  }
  const hr = P.hr; const head = new THREE.Group(); bg.add(head);
  if (P.neck) {
    const t = 0.25, bx = P.len / 2 + P.r * 0.4, byy = by + P.r * 0.3;
    const nk = outlined(new THREE.CylinderGeometry(0.15, 0.22, P.neck, 10), toon(P.c), 1.05); nk.position.set(bx + Math.sin(t) * P.neck / 2, byy + Math.cos(t) * P.neck / 2, 0); nk.rotation.z = -t; bg.add(nk);
    head.position.set(bx + Math.sin(t) * P.neck + 0.12, byy + Math.cos(t) * P.neck + 0.05, 0);
  } else head.position.set(P.len / 2 + P.r * 0.55 + hr * 0.5, by + P.r * 0.45, 0);
  head.add(outlined(new THREE.SphereGeometry(hr, 24, 18), toon(0xffffff), 1.06));
  const eyes = [];
  for (const sd of [-1, 1]) {
    const e = outlined(new THREE.SphereGeometry(hr * 0.27, 14, 10), toon(0xffffff), 1.15); e.position.set(hr * 0.72, hr * 0.2, sd * hr * 0.48); head.add(e); eyes.push(e);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.14, 10, 8), BLACK); pu.position.set(hr * 0.2, 0, 0); e.add(pu);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.17, 10, 8), BLACK); nose.position.set(hr * 0.98, -hr * 0.12, 0); head.add(nose);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.34, 14, 10), BLACK); mouth.scale.set(0.5, 0.8, 0.9); mouth.position.set(hr * 0.86, -hr * 0.36, 0); mouth.visible = false; head.add(mouth);
  const tail = new THREE.Group(); tail.position.set(-P.len / 2 - P.r * 0.8, by + P.r * 0.2, 0); bg.add(tail);
  const tl = kind === 'rabbit' ? 0.01 : kind === 'mouse' ? 0.5 : 0.7 * P.r + 0.2; const tg = new THREE.CylinderGeometry(0.035, 0.035, tl, 6); tg.translate(0, -tl / 2, 0); tail.add(new THREE.Mesh(tg, BLACK)); tail.rotation.z = 0.5;
  if (kind === 'lion') { const tuft = outlined(new THREE.SphereGeometry(0.1, 10, 8), toon(0x9a5a1a), 1.1); tuft.position.y = -tl; tail.add(tuft);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const m = outlined(new THREE.SphereGeometry(0.17, 12, 10), toon(0xb8641a), 1.08); m.position.set(-0.12, Math.sin(a) * hr * 1.05, Math.cos(a) * hr * 1.05); head.add(m); } }
  if (kind === 'elephant') {
    for (const sd of [-1, 1]) { const ear = outlined(new THREE.SphereGeometry(hr * 0.8, 16, 12), toon(0x8a939d), 1.05); ear.scale.set(0.3, 1, 0.9); ear.position.set(-hr * 0.2, 0, sd * hr * 1.0); head.add(ear); }
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(hr * 0.85, -hr * 0.1, 0), new THREE.Vector3(hr * 1.45, -hr * 0.55, 0), new THREE.Vector3(hr * 1.55, -hr * 1.25, 0), new THREE.Vector3(hr * 1.95, -hr * 1.6, 0)]);
    head.add(outlined(new THREE.TubeGeometry(curve, 14, 0.1, 8), toon(0x9aa3ad), 1.08)); }
  if (kind === 'donkey') for (const sd of [-1, 1]) { const ear = outlined(new THREE.CapsuleGeometry(0.075, 0.42, 4, 8), toon(0x9aa0a8), 1.08); ear.position.set(-0.04, hr * 1.45, sd * hr * 0.34); ear.rotation.x = -sd * 0.42; head.add(ear);
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, hr * 0.5), BLACK); br.position.set(hr * 0.74, hr * 0.2 + hr * 0.36, sd * hr * 0.48); br.rotation.x = -sd * 0.5; head.add(br); }
  if (kind === 'tiger') { for (let k = 0; k < 6; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(P.r * 1.01, 0.035, 6, 18), BLACK); ring.rotation.y = Math.PI / 2; ring.position.set(-P.len / 2 + 0.12 + k * (P.len - 0.1) / 5, by, 0); bg.add(ring); }
    for (const sd of [-1, 1]) { const ear = outlined(new THREE.SphereGeometry(hr * 0.3, 10, 8), toon(0xf29a2e), 1.1); ear.position.set(-0.05, hr * 0.92, sd * hr * 0.6); head.add(ear); for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.05), BLACK); st.position.set(0.0, hr * 0.78 + 0.0, sd * (0.06 + k * 0.07)); st.rotation.z = 0.2; head.add(st); } } }
  if (kind === 'horse') { for (const sd of [-1, 1]) { const ear = outlined(new THREE.ConeGeometry(0.05, 0.16, 6), toon(0xf4f0e8), 1.1); ear.position.set(-0.04, hr * 1.05, sd * hr * 0.28); head.add(ear); }
    const plume = outlined(new THREE.SphereGeometry(0.1, 10, 8), toon(0xe8667a), 1.1); plume.scale.set(0.5, 1.6, 0.5); plume.position.set(-0.02, hr * 1.35, 0); head.add(plume);
    for (let i = 0; i < 4; i++) { const m = outlined(new THREE.SphereGeometry(0.1, 8, 6), toon(0xc9bda8), 1.1); m.position.set(-0.12 - i * 0.05, hr * 0.55 - i * 0.2, 0); head.add(m); } }
  if (kind === 'mouse') for (const sd of [-1, 1]) { const ear = outlined(new THREE.SphereGeometry(hr * 0.75, 14, 10), toon(0xf2b8c0), 1.08); ear.scale.set(0.22, 1, 1); ear.position.set(-hr * 0.15, hr * 0.8, sd * hr * 0.8); head.add(ear); }
  if (kind === 'rabbit') for (const sd of [-1, 1]) { const ear = outlined(new THREE.CapsuleGeometry(0.06, 0.32, 4, 8), toon(0xf6c8d0), 1.1); ear.position.set(-0.02, hr * 1.5, sd * hr * 0.42); ear.rotation.x = sd * 0.15; head.add(ear); }
  if (kind === 'giraffe') {
    for (const sd of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6), BLACK); h.position.set(-0.02, hr * 1.1, sd * hr * 0.35); head.add(h); const k = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), BLACK); k.position.set(-0.02, hr * 1.1 + 0.12, sd * hr * 0.35); head.add(k); }
    const R = rng(7); for (let i = 0; i < 9; i++) for (const sd of [-1, 1]) { const sp = outlined(new THREE.SphereGeometry(0.1 + R() * 0.05, 8, 6), toon(0xa8652a), 1.0); sp.scale.z = 0.25; sp.position.set((R() - 0.5) * P.len * 1.1, by + (R() - 0.4) * P.r * 0.9, sd * P.r * 0.92); bg.add(sp); } }
  return { root, bg, legs, head, tail, hr, by, eyes, mouth, leg: P.leg, r: P.r, len: P.len, lie(k) { legs[0].rotation.z = legs[1].rotation.z = 1.45 * k; legs[2].rotation.z = legs[3].rotation.z = -1.45 * k; bg.position.y = -P.leg * 0.85 * k; }, walk(phase, amt = 1) { const s = Math.sin(phase) * 0.5 * amt; legs[0].rotation.z = s; legs[3].rotation.z = s; legs[1].rotation.z = -s; legs[2].rotation.z = -s; bg.position.y = Math.abs(Math.cos(phase)) * 0.04 * amt; } };
}
// makeBird(color): flies along +x. bird.flap(t) beats the wings.
export function makeBird(color = 0x3d7ea6) {
  const root = new THREE.Group();
  const body = outlined(new THREE.SphereGeometry(0.22, 14, 10), toon(color), 1.07); body.scale.set(1.5, 0.9, 0.9); root.add(body);
  const head = outlined(new THREE.SphereGeometry(0.14, 14, 10), toon(0xffffff), 1.08); head.position.set(0.34, 0.1, 0); root.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), toon(0xf29f05)); beak.rotation.z = -Math.PI / 2; beak.position.set(0.52, 0.08, 0); root.add(beak);
  for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), BLACK); e.position.set(0.42, 0.14, sd * 0.09); root.add(e); }
  const tail = outlined(new THREE.BoxGeometry(0.28, 0.04, 0.16), toon(color), 1.1); tail.position.set(-0.42, 0.02, 0); root.add(tail);
  const wings = [];
  for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(0, 0.06, sd * 0.12); root.add(piv); const w = outlined(new THREE.SphereGeometry(0.2, 12, 8), toon(color), 1.06); w.scale.set(0.8, 0.08, 1.5); w.position.z = sd * 0.3; piv.add(w); wings.push({ piv, sd }); }
  return { root, flap(t) { for (const { piv, sd } of wings) piv.rotation.x = -sd * Math.sin(t) * 0.75; } };
}
// makeFish(color): swims along +x.
export function makeFish(color = 0xf29f05) {
  const root = new THREE.Group();
  const body = outlined(new THREE.SphereGeometry(0.3, 16, 12), toon(color), 1.07); body.scale.set(1.4, 0.8, 0.5); root.add(body);
  const tail = outlined(new THREE.ConeGeometry(0.22, 0.34, 3), toon(color), 1.08); tail.rotation.z = Math.PI / 2; tail.scale.z = 0.4; tail.position.x = -0.5; root.add(tail);
  const fin = outlined(new THREE.ConeGeometry(0.1, 0.22, 3), toon(0xd9731a), 1.08); fin.position.set(0, 0.28, 0); fin.scale.z = 0.4; root.add(fin);
  for (const sd of [-1, 1]) { const e = outlined(new THREE.SphereGeometry(0.06, 10, 8), toon(0xffffff), 1.2); e.position.set(0.28, 0.08, sd * 0.13); root.add(e); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), BLACK); pu.position.set(0.04, 0, 0); e.add(pu); }
  return { root, tail };
}

// makeTree(height, seed): round-crowned tree.
export function makeTree(h = 3, seed = 1) { const g = new THREE.Group(); const R = rng(seed);
  const tr = outlined(new THREE.CylinderGeometry(0.17, 0.26, h, 8), toon(0x8a5a36), 1.06); tr.position.y = h / 2; g.add(tr);
  for (let i = 0; i < 3; i++) { const c = outlined(new THREE.SphereGeometry(0.75 + R() * 0.25, 14, 10), toon(i % 2 ? 0x5aa84a : 0x6bb85a), 1.05); c.position.set((R() - 0.5) * 0.8, h + 0.2 + i * 0.25, (R() - 0.5) * 0.8); g.add(c); }
  return g; }

// makeFrog(): bright-green stick-figure frog with a round white head and bulging eyes (Guide: GRM-001). Faces +z.
export function makeFrog() {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body); const green = toon(0x4fbf4a);
  const torso = outlined(new THREE.SphereGeometry(0.34, 18, 14), green, 1.06); torso.scale.set(1, 1.15, 0.9); torso.position.y = 0.62; body.add(torso);
  const head = new THREE.Group(); head.position.y = 1.12; body.add(head);
  head.add(outlined(new THREE.SphereGeometry(0.42, 24, 18), toon(0xffffff), 1.06));
  const eyes = []; for (const sd of [-1, 1]) { const ey = outlined(new THREE.SphereGeometry(0.15, 14, 10), toon(0xffffff), 1.14); ey.position.set(sd * 0.23, 0.3, 0.22); head.add(ey);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), BLACK); pu.position.set(0, 0, 0.12); ey.add(pu); eyes.push(ey); }
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.026, 8, 26, Math.PI), BLACK); grin.rotation.z = Math.PI; grin.position.set(0, -0.06, 0.37); head.add(grin);
  const open = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), BLACK); open.scale.set(1.2, 0.7, 0.3); open.position.set(0, -0.14, 0.39); open.visible = false; head.add(open);
  const arms = []; for (const sd of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(sd * 0.3, 0.82, 0); body.add(sh);
    const g = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8); g.translate(0, -0.25, 0); sh.add(new THREE.Mesh(g, BLACK)); const h = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), BLACK); h.position.y = -0.52; sh.add(h); sh.rotation.z = sd * 0.35; arms.push({ sh, side: sd }); }
  const legs = []; for (const sd of [-1, 1]) { const hp = new THREE.Group(); hp.position.set(sd * 0.2, 0.4, 0); body.add(hp);
    const g = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8); g.translate(0, -0.2, 0); hp.add(new THREE.Mesh(g, green)); const ft = outlined(new THREE.SphereGeometry(0.14, 12, 8), green, 1.1); ft.scale.set(1, 0.35, 1.7); ft.position.set(0, -0.4, 0.12); hp.add(ft); hp.rotation.z = sd * 0.25; legs.push({ hp, side: sd }); }
  return { root, body, head, eyes, grin, open, arms, legs, hop(u) { body.position.y = Math.max(0, Math.sin(u * Math.PI)) * 0.35; } };
}

// makeSpider(): Anansi – round white head, eight thin black legs, tiny straw hat, sly grin. Faces +z.
export function makeSpider() {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const abd = outlined(new THREE.SphereGeometry(0.34, 18, 14), toon(0x222222), 1.06); abd.scale.set(1, 0.95, 1.1); abd.position.set(0, 0.8, 0); body.add(abd);
  const head = new THREE.Group(); head.position.y = 1.4; body.add(head);
  head.add(outlined(new THREE.SphereGeometry(0.46, 28, 20), toon(0xffffff), 1.06));
  const eyes = [], brows = []; for (const sd of [-1, 1]) { const e = outlined(new THREE.SphereGeometry(0.13, 14, 10), toon(0xffffff), 1.18); e.scale.z = 0.55; e.position.set(sd * 0.18, 0.08, 0.4); head.add(e);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), BLACK); pu.position.set(0, 0, 0.1); e.add(pu); eyes.push(e);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.05), BLACK); b.position.set(sd * 0.18, 0.28 + (sd > 0 ? 0.04 : 0), 0.4); b.rotation.z = sd * -0.35; head.add(b); brows.push(b); }
  const grin = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.026, 8, 24, Math.PI), BLACK); grin.rotation.z = Math.PI + 0.18; grin.position.set(0.03, -0.12, 0.42); head.add(grin);
  const open = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), BLACK); open.scale.set(1.1, 0.8, 0.3); open.position.set(0, -0.2, 0.43); open.visible = false; head.add(open);
  const hatG = new THREE.Group(); hatG.position.set(0, 0.42, 0); hatG.rotation.z = -0.12; head.add(hatG);
  const brim = outlined(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 18), toon(0xe3c470), 1.06); hatG.add(brim);
  const crn = outlined(new THREE.CylinderGeometry(0.2, 0.24, 0.2, 14), toon(0xe3c470), 1.06); crn.position.y = 0.11; hatG.add(crn);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.05, 14), toon(0xb03030)); band.position.y = 0.04; hatG.add(band);
  const legs = []; for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.position.set(sd * 0.18, 0.82, 0); g.rotation.y = (i - 1.5) * 0.5 * sd; body.add(g);
    const up = new THREE.Group(); up.rotation.z = sd * 1.75; g.add(up); const ug = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6); ug.translate(0, -0.25, 0); up.add(new THREE.Mesh(ug, BLACK));
    const kn = new THREE.Group(); kn.position.y = -0.5; kn.rotation.z = -sd * 1.5; up.add(kn); const lg = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6); lg.translate(0, -0.35, 0); kn.add(new THREE.Mesh(lg, BLACK)); legs.push({ g, up, kn, i, sd }); }
  return { root, body, head, eyes, brows, grin, open, hatG, legs,
    walk(ph, amt = 1) { legs.forEach(l => { const a = Math.sin(ph + (l.i % 2 ? Math.PI : 0) + (l.sd > 0 ? 0 : Math.PI)) * 0.3 * amt; l.g.rotation.y = (l.i - 1.5) * 0.5 * l.sd + a; l.kn.rotation.z = -l.sd * (1.5 - Math.max(0, a) * 0.8); }); body.position.y = Math.abs(Math.cos(ph)) * 0.04 * amt; },
    wave(t) { legs.forEach(l => { const a = Math.sin(t * 7 + l.i * 0.9 + (l.sd > 0 ? 0 : 1.6)); l.up.rotation.z = l.sd * (1.75 + a * 0.5); }); } };
}
// makeBee(): tiny yellow-and-black bee with a round white head. Faces +x. bee.flap(t).
export function makeBee() {
  const root = new THREE.Group(); const body = outlined(new THREE.SphereGeometry(0.14, 12, 8), toon(0xffd23f), 1.08); body.scale.set(1.3, 1, 1); root.add(body);
  for (const x of [-0.06, 0.05]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 14), BLACK); r.rotation.y = Math.PI / 2; r.position.x = x; root.add(r); }
  const h = outlined(new THREE.SphereGeometry(0.095, 12, 8), toon(0xffffff), 1.1); h.position.set(0.2, 0.03, 0); root.add(h);
  for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), BLACK); e.position.set(0.28, 0.06, sd * 0.05); root.add(e); }
  const wings = []; for (const sd of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(0, 0.12, sd * 0.06); root.add(piv); const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.8 })); w.scale.set(1, 0.1, 1.4); w.position.z = sd * 0.1; piv.add(w); wings.push({ piv, sd }); }
  return { root, flap(t) { for (const { piv, sd } of wings) piv.rotation.x = -sd * Math.sin(t) * 0.9; } };
}
// makeSnake(color, n): a chain of spheres; call snake.pose(fn) with fn(s in [0,1]) => Vector3 (head at s=0). White round head.
export function makeSnake(color = 0x4fae4a, n = 20) {
  const root = new THREE.Group(); const segs = [];
  for (let i = 0; i < n; i++) { const r = i === 0 ? 0.3 : 0.26 * (1 - 0.55 * (i / n)); const m = outlined(new THREE.SphereGeometry(r, 14, 10), toon(i === 0 ? 0xffffff : (i % 2 ? color : 0x3f8f3c)), 1.07); root.add(m); segs.push(m); }
  for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), BLACK); e.position.set(0.2, 0.1, sd * 0.14); segs[0].add(e); }
  const sm = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 14, Math.PI), BLACK); sm.rotation.z = Math.PI; sm.position.set(0.24, -0.06, 0); segs[0].add(sm);
  return { root, segs, pose(fn) { segs.forEach((m, i) => m.position.copy(fn(i / (segs.length - 1)))); } };
}
