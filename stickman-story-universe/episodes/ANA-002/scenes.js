// ANA-002 – How Wisdom Became the Property of the Human Race. Source: Barker & Sinclair, West African Folk-Tales (1917), tale II.
// Anansi hoards all wisdom in a pot, tries to climb the tallest tree with it slung in front, and is out-thought by his small son Kweku Tsin.
import { westafrica } from '../../engine/sets/westafrica.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture, skyTexture,
    makeStick, makeSpider, STORYTELLER, drop } = ctx;
  const Wf = westafrica(ctx); const W = Wf.group; const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z); const O = Wf.origin;
  const cam = (px, py, pz, lx, ly, lz, fov = 48) => { camera.position.set(O.x + px, py, O.z + pz); camera.lookAt(O.x + lx, ly, O.z + lz); camera.fov = fov; };
  const glowTex = radialTexture('rgba(255,236,160,1)', 'rgba(255,200,80,0)');
  const sprite = () => new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const GY = -0.18;

  // ---- the tallest tree ----
  const TX = 5.6, TZ = -1.6;
  const tree = new THREE.Group(); tree.position.set(TX, 0, TZ); W.add(tree);
  const trunk = outlined(new THREE.CylinderGeometry(0.42, 0.62, 16, 12), toon(0x8a5a36), 1.04); trunk.position.y = 8; tree.add(trunk);
  [[0, 16.4, 0, 2.6], [-1.8, 15.6, 0.4, 1.8], [1.9, 15.8, -0.2, 1.9], [0.3, 17.6, 0.2, 1.8]].forEach(([x, y, z, r], i) => { const c = outlined(new THREE.SphereGeometry(r, 16, 12), toon(i % 2 ? 0x4f9a42 : 0x5fb04a), 1.04); c.position.set(x, y, z); tree.add(c); });
  for (let i = 0; i < 6; i++) { const b = outlined(new THREE.CylinderGeometry(0.06, 0.1, 1.4, 6), toon(0x7a4a2a), 1.08); const y = 4 + i * 2; b.position.set(i % 2 ? 0.8 : -0.8, y, 0); b.rotation.z = i % 2 ? -1.0 : 1.0; tree.add(b); }

  // ---- the pot of wisdom ----
  function makePot() { const g = new THREE.Group();
    const body = outlined(new THREE.SphereGeometry(0.42, 18, 14), toon(0xb5652e), 1.05); body.scale.set(1, 0.9, 1); g.add(body);
    const neck = outlined(new THREE.CylinderGeometry(0.2, 0.26, 0.2, 14), toon(0xa85a2a), 1.06); neck.position.y = 0.42; g.add(neck);
    const lid = outlined(new THREE.CylinderGeometry(0.25, 0.25, 0.07, 14), toon(0xe0b84a), 1.08); lid.position.y = 0.55; g.add(lid);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 24), toon(0xe0b84a)); band.rotation.x = Math.PI / 2; g.add(band);
    const gl = sprite(); gl.scale.setScalar(1.6); gl.position.y = 0.2; g.add(gl);
    return { g, lid, gl }; }
  const pot = makePot(); W.add(pot.g);
  const shards = Array.from({ length: 10 }, (_, i) => { const s = outlined(new THREE.TetrahedronGeometry(0.16 + (i % 3) * 0.05), toon(0xb5652e), 1.08); W.add(s); return s; });
  const sparks = Array.from({ length: 40 }, () => { const s = sprite(); W.add(s); return s; });
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 20), toon(0x7a4a2a)); W.add(strap);

  // ---- characters ----
  const anansi = makeSpider(); W.add(anansi.root);
  const kweku = makeSpider(); kweku.root.scale.setScalar(0.62); W.add(kweku.root); kweku.hatG.visible = false;
  const cap = outlined(new THREE.SphereGeometry(0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xc8323c), 1.06); cap.position.y = 0.32; kweku.head.add(cap);
  const peep = [0x3d7ea6, 0xc8553d, 0x8e5ba8, 0x2a9d8f, 0xe0a030].map((c, i) => { const r = makeStick({ robe: c, robeLong: i % 2 === 0, hair: 0x1a1a1a, curls: i % 2 === 1, seed: 120 + i }); W.add(r.root); return r; });
  const stool = outlined(new THREE.CylinderGeometry(0.5, 0.42, 0.55, 12), toon(0x8a5a36), 1.05); W.add(stool);
  const bulbs = peep.map(() => { const s = sprite(); W.add(s); return s; });
  const sweat = drop(); W.add(sweat);

  const ANA_HOME = V3(-0.6, 0, -0.6);
  function reset() { W.visible = true; E.group.visible = false; scene.background = SKIES.day; aimSun(O, V3(-10, 20, 14), 0xfff0d0, 2.4); hemi.intensity = 1.5;
    anansi.root.visible = true; anansi.root.rotation.set(0, 0, 0); anansi.root.scale.setScalar(1); anansi.walk(0, 0); anansi.grin.visible = true; anansi.open.visible = false; anansi.eyes.forEach(e => e.scale.set(1, 1, 0.55));
    kweku.root.visible = false; kweku.root.rotation.set(0, 0, 0); kweku.walk(0, 0); kweku.grin.visible = true; kweku.open.visible = false;
    peep.forEach(r => { r.rest(); r.root.visible = true; r.root.rotation.set(0, 0, 0); r.expr('smile', 0.3); r.look(0, 0); });
    stool.visible = false; bulbs.forEach(b => b.visible = false); sweat.visible = false; pot.g.visible = false; pot.g.rotation.set(0, 0, 0); pot.lid.visible = true; pot.gl.visible = true; strap.visible = false;
    shards.forEach(s => s.visible = false); sparks.forEach(s => s.visible = false); }
  function crowd(face = true) { peep.forEach((r, i) => { const a = (-0.9 + i * 0.45); r.root.position.set(ANA_HOME.x + Math.sin(a) * 3.6, 0, ANA_HOME.z - 1.2 - Math.cos(a) * 1.4); if (face) r.root.rotation.y = Math.atan2(ANA_HOME.x - r.root.position.x, ANA_HOME.z - r.root.position.z); }); }
  const angry = (sp, k = 1) => { sp.brows.forEach((b, i) => { b.rotation.z = (i ? -1 : 1) * -0.55 * k; }); };
  const calm = sp => sp.brows.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * 0.35; });

  return [
    // 1 – Anansi, keeper of all wisdom, gives advice from his stool; ideas light up over people's heads
    (lt, d, t) => { reset(); const u = lt / d; calm(anansi); stool.visible = true; stool.position.set(ANA_HOME.x, 0.27, ANA_HOME.z); anansi.root.position.set(ANA_HOME.x, 0.55 + GY, ANA_HOME.z); anansi.wave(t * 0.6);
      crowd(); peep.forEach((r, i) => { r.headG.rotation.x = Math.sin(t * 6 + i) * 0.12; const on = u > 0.35 + i * 0.1; bulbs[i].visible = on; bulbs[i].position.copy(r.root.position).add(V3(0, 4.0, 0)); bulbs[i].scale.setScalar(on ? 0.9 + 0.2 * Math.sin(t * 5 + i) : 0); if (on) r.expr('open', 0.6); });
      pot.g.visible = false;
      cam(-0.6, 3.0, lerp(12.0, 11.0, ease(u)), -0.6, 1.8, -1.2, 50); },
    // 2 – the people offend him (laughing, pointing); "I'll take it all back!"
    (lt, d, t) => { reset(); const u = lt / d; stool.visible = true; stool.position.set(ANA_HOME.x, 0.27, ANA_HOME.z); anansi.root.position.set(ANA_HOME.x, 0.55 + GY + (u > 0.55 ? Math.abs(Math.sin(t * 9)) * 0.2 : 0), ANA_HOME.z);
      crowd(); peep.forEach((r, i) => { r.expr('open', 0.3); r.body.position.y = Math.abs(Math.sin(t * 9 + i)) * 0.05; r.arms[1].sh.rotation.set(-1.2, 0, 0.2); r.arms[1].el.rotation.set(0, 0, 0); r.headG.rotation.z = Math.sin(t * 8 + i) * 0.12; });
      angry(anansi, ease(clamp(u / 0.4))); anansi.grin.visible = false; anansi.open.visible = u > 0.55; anansi.wave(t * 2);
      cam(-0.6, 3.0, 11.0, -0.6, 1.8, -1.2, 50); },
    // 3 – every spark of wisdom streams into one great pot; the lid seals; off he goes
    (lt, d, t) => { reset(); const u = lt / d; angry(anansi, 0.6); crowd(); peep.forEach(r => { r.expr('flat', 0.2); r.look(0.2, 0.2); });
      pot.g.visible = true; const walk = clamp((u - 0.62) / 0.38); pot.g.position.set(lerp(ANA_HOME.x + 0.9, ANA_HOME.x + 5.0, ease(walk)), 0.45, ANA_HOME.z + 0.4);
      anansi.root.position.set(lerp(ANA_HOME.x, ANA_HOME.x + 4.1, ease(walk)), GY, ANA_HOME.z); anansi.walk(t * 10, walk > 0 && walk < 1 ? 1 : 0); anansi.root.rotation.y = walk > 0 ? 0.9 : 0.4;
      sparks.forEach((s, i) => { const st = (i / sparks.length) * 0.45; const k = clamp((u - st) / 0.18); const src = peep[i % peep.length].root.position;
        s.visible = k > 0 && k < 1 && walk === 0; s.position.set(lerp(src.x, pot.g.position.x, ease(k)), lerp(3.8, 0.9, ease(k)) + Math.sin(k * Math.PI) * 1.2, lerp(src.z, pot.g.position.z, ease(k))); s.scale.setScalar(0.5); });
      pot.lid.position.y = 0.55 + (u < 0.5 ? 0.6 : lerp(0.6, 0, ease((u - 0.5) / 0.08))); pot.gl.scale.setScalar(0.8 + 1.2 * clamp(u / 0.5));
      cam(lerp(-0.4, 1.4, ease(walk)), 3.0, 11.0, lerp(-0.4, 1.4, ease(walk)), 1.8, -1.0, 50); },
    // 4 – Kweku Tsin tiptoes after him, peeking from behind the tree
    (lt, d, t) => { reset(); const u = lt / d; peep.forEach(r => r.root.visible = false); calm(anansi);
      pot.g.visible = true; strap.visible = false; anansi.root.position.set(TX - 1.6, GY, TZ + 1.6); anansi.root.rotation.y = 1.6; anansi.walk(t * 9, 1); pot.g.position.set(TX - 1.6 + 0.55, 0.5, TZ + 1.6 + 0.1);
      kweku.root.visible = true; const k = ease(clamp(u / 0.7)); kweku.root.position.set(lerp(TX - 6.5, TX - 3.6, k), GY * 0.6, TZ + 2.1); kweku.root.rotation.y = 1.2; kweku.walk(t * 7, k < 1 ? 0.8 : 0); kweku.body.position.y = Math.abs(Math.sin(t * 7)) * 0.06; kweku.open.visible = false;
      kweku.head.rotation.y = u > 0.75 ? -0.6 : 0;
      cam(TX - 2.8, 2.2, TZ + 10.0, TX - 2.8, 1.0, TZ + 1.5, 46); },
    // 5 – up the trunk with the pot slung in front: it swings, he slips, it bumps his knees
    (lt, d, t) => { reset(); const u = lt / d; peep.forEach(r => r.root.visible = false); const climb = lt < d * 0.55 ? lt / (d * 0.55) : 1; const slip = u > 0.55 && u < 0.72;
      const y = lerp(1.5, 6.5, ease(climb)) - (slip ? 1.2 * Math.sin((u - 0.55) / 0.17 * Math.PI) : 0);
      anansi.root.position.set(TX, y, TZ + 0.62); anansi.root.rotation.set(0, 0, 0); anansi.wave(t * 2.2); anansi.open.visible = slip || u > 0.8; anansi.grin.visible = !anansi.open.visible; angry(anansi, u > 0.8 ? 1 : 0.3);
      pot.g.visible = true; strap.visible = true; const sw = Math.sin(t * 5) * (0.55 + (slip ? 0.3 : 0)); pot.g.position.set(TX + Math.sin(sw) * 0.55, y + 0.65 - Math.cos(sw) * 0.4, TZ + 1.25); pot.g.rotation.z = sw * 0.5;
      strap.position.set(TX, y + 1.3, TZ + 1.0); strap.rotation.x = Math.PI / 2;
      sweat.visible = u > 0.6; sweat.position.set(TX + 0.55, y + 2.3 - ((lt * 0.9) % 1) * 0.5, TZ + 1.2); sweat.scale.setScalar(1.2);
      cam(TX + 0.2, y + 1.6, TZ + 8.0, TX, y + 1.0, TZ, 46); },
    // 6 – Kweku calls up: "Hang it on your back!" Anansi freezes, eyes wide
    (lt, d, t) => { reset(); const u = lt / d; peep.forEach(r => r.root.visible = false); const y = 6.5;
      anansi.root.position.set(TX, y, TZ + 0.62); calm(anansi); const fr = u > 0.45; anansi.wave(fr ? 0 : t * 2); anansi.eyes.forEach(e => e.scale.set(fr ? 1.35 : 1, fr ? 1.35 : 1, 0.55)); anansi.open.visible = fr; anansi.grin.visible = !fr;
      pot.g.visible = true; strap.visible = true; const sw = fr ? 0 : Math.sin(t * 5) * 0.4; pot.g.position.set(TX + Math.sin(sw) * 0.55, y + 0.65 - Math.cos(sw) * 0.4, TZ + 1.25); strap.position.set(TX, y + 1.3, TZ + 1.0); strap.rotation.x = Math.PI / 2;
      kweku.root.visible = true; kweku.root.position.set(TX - 1.0, GY * 0.6, TZ + 3.4); kweku.root.rotation.y = 0.3; kweku.head.rotation.x = -0.6; kweku.open.visible = u < 0.45 && Math.sin(t * 12) > 0; kweku.grin.visible = !kweku.open.visible; kweku.wave(t * 1.5);
      cam(TX - 0.4, 3.6, TZ + 11.0, TX - 0.4, 3.7, TZ + 1.0, 56); },
    // 7 – he flings the pot down; it smashes on the rock and wisdom sparkles out over the whole village
    (lt, d, t) => { reset(); const u = lt / d; const R = Wf.rockLocal; crowd(false); peep.forEach((r, i) => { r.root.position.x += 2.4; r.root.rotation.y = 0.2 * (i - 2); });
      anansi.root.position.set(TX, 6.5, TZ + 0.62); angry(anansi, 1); anansi.open.visible = u < 0.3; anansi.grin.visible = !anansi.open.visible; anansi.wave(t * 3);
      const fall = clamp(u / 0.22); const hit = u >= 0.22;
      pot.g.visible = !hit; if (!hit) { pot.g.position.set(lerp(TX, R.x, fall), lerp(7.2, R.y + 0.8, fall * fall), lerp(TZ + 1.25, R.z, fall)); pot.g.rotation.z = fall * 6; }
      const k = clamp((u - 0.22) / 0.5);
      shards.forEach((s, i) => { s.visible = hit; const a = i / shards.length * 6.28; s.position.set(R.x + Math.cos(a) * 1.4 * ease(k), R.y + 0.8 + Math.sin(k * Math.PI) * 0.9 * (0.5 + (i % 3) * 0.3), R.z + Math.sin(a) * 0.9 * ease(k)); s.rotation.set(k * 5 + i, k * 3, 0); });
      sparks.forEach((s, i) => { s.visible = hit; const tgt = peep[i % peep.length].root.position; const kk = clamp((u - 0.22 - (i % 8) * 0.02) / 0.45);
        s.position.set(lerp(R.x, tgt.x, ease(kk)) + Math.sin(i) * (1 - kk), lerp(R.y + 1, 4.0, ease(kk)) + Math.sin(kk * Math.PI) * 2.5, lerp(R.z, tgt.z, ease(kk))); s.scale.setScalar(0.5 + 0.3 * Math.sin(t * 7 + i)); });
      peep.forEach((r, i) => { const lit = u > 0.65; bulbs[i].visible = lit; bulbs[i].position.copy(r.root.position).add(V3(0, 4.0, 0)); bulbs[i].scale.setScalar(1.0); if (lit) { r.expr('smile', 0.8); r.arms[i % 2].sh.rotation.set(0, 0, (i % 2 ? 1 : -1) * 2.4); } });
      cam(lerp(2.4, 2.0, ease(u)), lerp(5.0, 3.0, ease(u)), lerp(12.5, 13.5, ease(u)), 2.4, lerp(4.0, 1.8, ease(u)), -0.6, 54); },
    // 8 – end card
    (lt, d, t) => { W.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
