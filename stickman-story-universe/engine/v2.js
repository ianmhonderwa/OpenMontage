// Stickman Story Universe – week-2 "v2" characters: proportioned low-poly people (soft-lit, faceted),
// replacing the stick figures for every episode whose script.json has "style": "v2".
// makePerson(o) takes the same option object as makeStick (robe, robeLong, beard, bigBeard, hair, curls,
// longHair, turban, crown, veil, hat, bun, glasses, scarf, book, prop, sash, trim, stripes, slippers, seed)
// plus: skin (hex), height (scale, default 1). It returns the same rig API as makeStick
// (root, body, legs[{hip,knee}], arms[{sh,el,side}], headG, face, eyes[{e,p}], brows, smile/frown/open/flat,
// expr(), look(), rest(), walk(), sit()), so existing scene code works unchanged.
import { THREE, toon, rng } from './lib.js';

const SKINS = [0x5a3a26, 0x6b4430, 0x7d5236, 0x8d5f3e, 0xa06c48, 0xb27d58, 0xc69071, 0xd8a687];
const DARK = new THREE.MeshStandardMaterial({ color: 0x1b1410, roughness: 0.7, flatShading: true });
const WHITE_EYE = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.5 });
const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; };
const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return c.getHex(); };

export function makePerson(o = {}) {
  const R = rng(o.seed ?? 5);
  const skinHex = o.skin ?? SKINS[Math.floor(R() * SKINS.length)];
  const skin = toon(skinHex), cloth = toon(o.robe ?? 0x8a7a68), clothDark = toon(shade(o.robe ?? 0x8a7a68, 0.72));
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const H = { hip: 1.15, neck: 2.35 };
  const robeLong = o.robe ? (o.robeLong ?? true) : false;
  // ---- legs (trousers + shoes); hidden under a long robe but still animated for walking ----
  const legs = [];
  const trouser = toon(o.trousers ?? shade(o.robe ?? 0x5a4a3a, 0.55));
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * 0.14, H.hip, 0); body.add(hip);
    const th = mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.58, 7), trouser); th.position.y = -0.29; hip.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.58; hip.add(knee);
    const sh = mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.52, 7), trouser); sh.position.y = -0.26; knee.add(sh);
    const shoe = mesh(new THREE.BoxGeometry(0.15, 0.09, 0.3), o.slippers ? toon(o.slippers) : DARK); shoe.position.set(0, -0.53, 0.06); knee.add(shoe);
    legs.push({ hip, knee });
  }
  // ---- torso: tunic / robe with a front panel, belt and collar ----
  const torso = mesh(new THREE.CylinderGeometry(0.27, 0.24, H.neck - H.hip, 8), cloth); torso.position.y = (H.neck + H.hip) / 2; torso.scale.z = 0.72; body.add(torso);
  const chestW = mesh(new THREE.BoxGeometry(0.12, H.neck - H.hip - 0.05, 0.04), toon(o.inner ?? 0xefe6d2)); chestW.position.set(0, (H.neck + H.hip) / 2 + 0.05, 0.19); body.add(chestW);
  const collar = mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.08, 8), toon(o.inner ?? 0xefe6d2)); collar.position.y = H.neck + 0.02; body.add(collar);
  if (o.robe) {
    const len = robeLong ? 1.12 : 0.6, wide = (o.robeWide ?? 0.5) * 0.78;
    const g = new THREE.CylinderGeometry(0.26, wide, len, 10, 1, true); g.translate(0, H.hip + 0.06 - len / 2, 0);
    const skirt = mesh(g, toon(o.robe, { side: THREE.DoubleSide })); skirt.scale.z = 0.78; body.add(skirt);
    // vertical fold lines for a tailored, layered look
    for (let k = -2; k <= 2; k++) { if (!k) continue; const f = mesh(new THREE.BoxGeometry(0.02, len * 0.95, 0.02), clothDark); const a = k * 0.42; f.position.set(Math.sin(a) * (0.26 + wide) / 2, H.hip + 0.06 - len / 2, Math.cos(a) * (0.26 + wide) / 2 * 0.78); f.rotation.z = -Math.sin(a) * 0.18; body.add(f); }
    if (o.trim) { const tr = mesh(new THREE.TorusGeometry(wide, 0.035, 5, 20), toon(o.trim)); tr.rotation.x = Math.PI / 2; tr.scale.y = 0.78; tr.position.y = H.hip + 0.06 - len + 0.04; body.add(tr); }
    if (o.stripes) for (let k = 1; k <= 3; k++) { const st = mesh(new THREE.TorusGeometry(0.26 + (wide - 0.26) * k / 4 + 0.01, 0.022, 4, 20), toon(o.stripes)); st.rotation.x = Math.PI / 2; st.scale.y = 0.78; st.position.y = H.hip + 0.06 - len * k / 4; body.add(st); }
  }
  const belt = mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.08, 8), toon(o.sash ?? shade(o.robe ?? 0x8a7a68, 0.6))); belt.scale.z = 0.74; belt.position.y = H.hip + 0.1; body.add(belt);
  if (o.sash) { const s = mesh(new THREE.BoxGeometry(0.1, 0.9, 0.03), toon(o.sash)); s.position.set(-0.04, 1.8, 0.2); s.rotation.z = 0.55; body.add(s); }
  // ---- arms: sleeves in the robe colour, skin hands ----
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(side * 0.31, H.neck - 0.1, 0); body.add(sh);
    const up = mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.5, 7), cloth); up.position.y = -0.25; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.5; sh.add(el);
    const fo = mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.44, 7), cloth); fo.position.y = -0.22; el.add(fo);
    const cuff = mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.05, 7), toon(o.inner ?? 0xefe6d2)); cuff.position.y = -0.43; el.add(cuff);
    const hand = mesh(new THREE.DodecahedronGeometry(0.075, 0), skin); hand.scale.set(0.9, 1.25, 0.7); hand.position.y = -0.53; el.add(hand);
    arms.push({ sh, el, side });
  }
  // ---- head ----
  const headG = new THREE.Group(); headG.position.y = H.neck + 0.33; body.add(headG);
  const neck = mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.16, 7), skin); neck.position.y = -0.27; headG.add(neck);
  const head = mesh(new THREE.IcosahedronGeometry(0.24, 1), skin); head.scale.set(0.92, 1.12, 0.98); headG.add(head);
  const face = new THREE.Group(); headG.add(face);
  const ears = [-1, 1].map(sd => { const e = mesh(new THREE.SphereGeometry(0.045, 5, 4), skin); e.scale.set(0.5, 1, 0.8); e.position.set(sd * 0.22, 0.0, 0); headG.add(e); return e; });
  const eyes = [], brows = [];
  for (const sd of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.03, 8, 6), WHITE_EYE); e.scale.set(1.25, 0.8, 0.45); e.position.set(sd * 0.08, 0.035, 0.215); face.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.021, 8, 6), DARK); p.position.set(0, 0, 0.016); e.add(p); eyes.push({ e, p });
    const b = mesh(new THREE.BoxGeometry(0.09, 0.022, 0.02), toon(o.hair ?? o.beard ?? 0x1b1410)); b.position.set(sd * 0.08, 0.085, 0.22); face.add(b); brows.push(b);
  }
  const nose = mesh(new THREE.ConeGeometry(0.035, 0.09, 4), skin); nose.rotation.x = Math.PI / 2 + 0.25; nose.position.set(0, -0.01, 0.245); face.add(nose);
  const mouth = new THREE.Group(); mouth.position.set(0, -0.1, 0.225); face.add(mouth);
  const lipM = toon(shade(skinHex, 0.55));
  const smile = mesh(new THREE.TorusGeometry(0.045, 0.011, 4, 10, Math.PI), lipM); smile.rotation.z = Math.PI; mouth.add(smile);
  const frown = mesh(new THREE.TorusGeometry(0.04, 0.011, 4, 10, Math.PI), lipM); frown.position.y = -0.03; mouth.add(frown);
  const open = mesh(new THREE.SphereGeometry(0.04, 8, 6), DARK); open.scale.set(1, 1.1, 0.35); mouth.add(open);
  const flat = mesh(new THREE.BoxGeometry(0.08, 0.016, 0.015), lipM); mouth.add(flat);
  // ---- hair / beard / headwear ----
  if (o.beard) { const bm = toon(o.beard); const bg = new THREE.Group(); headG.add(bg);
    const jaw = mesh(new THREE.SphereGeometry(o.bigBeard ? 0.2 : 0.17, 8, 6, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), bm); jaw.position.set(0, -0.06, 0.03); jaw.scale.set(1.05, o.bigBeard ? 1.6 : 1.1, 1.0); bg.add(jaw);
    const mus = mesh(new THREE.BoxGeometry(0.13, 0.03, 0.04), bm); mus.position.set(0, -0.075, 0.225); bg.add(mus); mouth.position.z = 0.235; }
  if (o.hair && !o.turban) { const hm = toon(o.hair);
    const cap = mesh(new THREE.SphereGeometry(0.255, 10, 8, 0, Math.PI * 2, 0, Math.PI * (o.curls ? 0.5 : 0.42)), hm); cap.rotation.x = -0.3; cap.position.y = 0.02; headG.add(cap);
    if (o.curls) for (let i = 0; i < 10; i++) { const a = R() * Math.PI * 2, el = 0.2 + R() * 0.7; const c = mesh(new THREE.IcosahedronGeometry(0.06, 0), hm); c.position.set(Math.cos(a) * Math.sin(el) * 0.25, Math.cos(el) * 0.27, Math.sin(a) * Math.sin(el) * 0.25 - 0.03); headG.add(c); }
    if (o.longHair) { const lh = mesh(new THREE.BoxGeometry(0.42, 0.55, 0.16), hm); lh.position.set(0, -0.17, -0.15); headG.add(lh); }
    if (o.bun) { const bn = mesh(new THREE.IcosahedronGeometry(0.09, 0), hm); bn.position.set(0, 0.2, -0.2); headG.add(bn); } }
  if (o.turban) { const tm = toon(o.turban); const tb = new THREE.Group(); tb.position.y = 0.14; headG.add(tb);
    for (let i = 0; i < 3; i++) { const r = mesh(new THREE.TorusGeometry(0.2 - i * 0.03, 0.075, 6, 12), tm); r.rotation.x = Math.PI / 2 + (i % 2 ? 0.15 : -0.1); r.position.y = i * 0.07; tb.add(r); }
    const top = mesh(new THREE.SphereGeometry(0.16, 8, 6), tm); top.position.y = 0.12; top.scale.y = 0.7; tb.add(top); }
  if (o.crown) { const cs = (o.crownSize ?? 1) * 0.42; const cm = new THREE.MeshStandardMaterial({ color: o.crown, metalness: 0.7, roughness: 0.35, flatShading: true }); const cg = new THREE.Group(); cg.position.y = 0.2; cg.scale.setScalar(cs / 0.42); headG.add(cg);
    const band = mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.09, 10, 1, true), cm); band.material.side = THREE.DoubleSide; cg.add(band);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const sp = mesh(new THREE.ConeGeometry(0.035, 0.09, 4), cm); sp.position.set(Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2); cg.add(sp);
      const gem = mesh(new THREE.OctahedronGeometry(0.018), toon(i % 2 ? 0xc8323c : 0x2a6ac8)); gem.position.set(Math.cos(a) * 0.212, 0, Math.sin(a) * 0.212); cg.add(gem); } }
  if (o.hat) { const h = mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.17, 10), toon(o.hat)); h.position.y = 0.22; headG.add(h); }
  if (o.veil) { const v = mesh(new THREE.SphereGeometry(0.285, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), toon(o.veil, { side: THREE.DoubleSide })); v.rotation.x = -0.45; v.position.set(0, 0.0, -0.03); headG.add(v);
    const drape = mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), toon(o.veil)); drape.position.set(0, -0.3, -0.18); headG.add(drape); }
  if (o.glasses) for (const sd of [-1, 1]) { const r = mesh(new THREE.TorusGeometry(0.05, 0.009, 4, 12), DARK); r.position.set(sd * 0.085, 0.04, 0.235); face.add(r); }
  if (o.scarf) { const sc = mesh(new THREE.TorusGeometry(0.15, 0.06, 6, 12), toon(o.scarf)); sc.rotation.x = Math.PI / 2; sc.position.y = H.neck + 0.03; body.add(sc);
    const tail = mesh(new THREE.BoxGeometry(0.1, 0.45, 0.04), toon(o.scarf)); tail.position.set(0.1, H.neck - 0.22, 0.2); body.add(tail); }
  if (o.book) { const bk = mesh(new THREE.BoxGeometry(0.34, 0.44, 0.06), toon(o.book)); bk.position.set(0, 1.8, 0.33); bk.rotation.x = -0.35; body.add(bk); }
  if (o.prop === 'hammer') { const h = new THREE.Group(); const hd = mesh(new THREE.BoxGeometry(0.22, 0.1, 0.1), toon(0x8a8f96)); hd.position.y = -0.25; h.add(hd); const hl = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), toon(0x7a5230)); hl.position.y = -0.08; h.add(hl); arms[0].el.add(h); h.position.y = -0.5; }
  if (o.prop === 'staff') { const st = mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.4, 6), toon(0x7a5230)); arms[0].el.add(st); st.position.set(0, -0.5, 0.04); }
  if (o.leaf) { const lf = mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.4, 8, 1, true), toon(o.leaf, { side: THREE.DoubleSide })); lf.position.y = 1.0; body.add(lf); }
  if (o.height) root.scale.setScalar(o.height);

  const rig = { root, body, legs, arms, headG, face, eyes, brows, smile, frown, open, flat, H, v2: true };
  rig.expr = (kind, browUp = 0) => {
    smile.visible = kind === 'smile'; frown.visible = kind === 'frown'; open.visible = kind === 'open'; flat.visible = kind === 'flat';
    brows[0].position.y = brows[1].position.y = 0.085 + browUp * 0.02;
    brows[0].rotation.z = -browUp * 0.25; brows[1].rotation.z = browUp * 0.25;
  };
  rig.look = (x = 0, y = 0) => { for (const { p } of eyes) { p.position.x = x * 0.012; p.position.y = y * 0.012; } };
  rig.rest = () => {
    for (const { hip, knee } of legs) { hip.rotation.set(0, 0, 0); knee.rotation.set(0, 0, 0); }
    for (const { sh, el, side } of arms) { sh.rotation.set(0, 0, side * 0.12); el.rotation.set(0, 0, 0); }
    body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); headG.rotation.set(0, 0, 0);
  };
  rig.walk = (phase, amt = 1) => {
    const s = Math.sin(phase) * 0.45 * amt;
    legs[0].hip.rotation.x = s; legs[1].hip.rotation.x = -s;
    legs[0].knee.rotation.x = Math.max(0, -Math.sin(phase + 0.6)) * 0.7 * amt; legs[1].knee.rotation.x = Math.max(0, Math.sin(phase + 0.6)) * 0.7 * amt;
    arms[0].sh.rotation.x = -s * 0.7; arms[1].sh.rotation.x = s * 0.7; arms[0].el.rotation.x = -0.25 * amt; arms[1].el.rotation.x = -0.25 * amt;
    body.position.y = Math.abs(Math.cos(phase)) * 0.04 * amt;
  };
  rig.sit = () => { for (const { hip, knee } of legs) { hip.rotation.x = -1.45; knee.rotation.x = 1.45; } body.position.y = -0.62; };
  rig.rest(); rig.expr('smile');
  return rig;
}
