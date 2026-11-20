// BIB-004 – Cain and Abel. Source: Genesis 4:1-16 (KJV).
// Handled gently: no violence is shown. God is never drawn as a figure: only a warm light and a voice.
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture,
    makeStick, STORYTELLER, makeAnimal, drop } = ctx;
  const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const glowTex = radialTexture('rgba(255,236,160,1)', 'rgba(255,200,80,0)');
  const whiteTex = radialTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  const sprite = (tex, add = true) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));

  const G = new THREE.Group(); scene.add(G);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), toon(0x8cc667)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
  [[-12, -16, 6], [10, -20, 8], [26, -14, 5], [-26, -18, 7]].forEach(([x, z, r]) => { const h = outlined(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x78b85a), 1.01); h.position.set(x, 0, z); G.add(h); });
  // Cain's wheat field (left) – swaying stalks
  const wheat = []; { const R = rng(9);
    for (let row = 0; row < 7; row++) for (let i = 0; i < 12; i++) { const g = new THREE.Group(); const x = -5.2 + i * 0.5 + (R() - 0.5) * 0.2, z = -1.0 - row * 0.9 + (R() - 0.5) * 0.2; g.position.set(x, 0, z);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.1, 5), toon(0xd9b84a)); stem.position.y = 0.55; g.add(stem);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toon(0xe8c755)); head.scale.set(0.8, 2.2, 0.8); head.position.y = 1.2; g.add(head);
      G.add(g); wheat.push({ g, ph: R() * 6 }); } }
  // Abel's fence and lambs (right)
  for (let i = 0; i < 6; i++) { const p = outlined(new THREE.BoxGeometry(0.14, 0.9, 0.14), toon(0x9a6b42), 1.1); p.position.set(0.8 + i * 0.95, 0.45, -3.6); G.add(p); }
  const rail = outlined(new THREE.BoxGeometry(5.2, 0.1, 0.1), toon(0x9a6b42), 1.1); rail.position.set(3.2, 0.7, -3.6); G.add(rail);
  const lambs = [[2.6, -1.2, 0.5], [4.0, -0.6, 2.4], [3.3, -2.4, 1.0], [4.6, -2.2, 3.4]].map(([x, z, ry]) => { const l = makeAnimal('lamb'); l.root.scale.setScalar(1.4); l.root.position.set(x, 0, z); l.root.rotation.y = ry; G.add(l.root); return Object.assign(l, { x, z, ry }); });
  const carried = makeAnimal('lamb'); carried.root.scale.setScalar(1.1); G.add(carried.root);
  // altars
  function altar() { const g = new THREE.Group(); [[0.8, 0.28, 0], [0.62, 0.26, 0.28], [0.44, 0.24, 0.54]].forEach(([r, h, y], i) => { const s = outlined(new THREE.CylinderGeometry(r, r * 1.08, h, 10), toon(i % 2 ? 0xb4aca0 : 0xa49c92), 1.04); s.position.y = y + h / 2; g.add(s); }); return g; }
  const altC = altar(), altA = altar(); altC.position.set(-1.3, 0, -0.8); altA.position.set(1.3, 0, -0.8); G.add(altC); G.add(altA);
  const crops = new THREE.Group(); G.add(crops);
  { const sheaf = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.7, 8), toon(0xe0c050)); sheaf.position.y = 0.35; crops.add(sheaf);
    [[0.25, 0.1, 0.1, 0xe8602a], [-0.22, 0.1, 0.12, 0xd9302a], [0.0, 0.1, -0.25, 0xf0a830]].forEach(([x, y, z, c]) => { const f = outlined(new THREE.SphereGeometry(0.13, 10, 8), toon(c), 1.1); f.position.set(x, y, z); crops.add(f); }); }
  const heart = () => { const g = new THREE.Group(); for (const sx of [-1, 1]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe8334a, transparent: true })); s.position.set(sx * 0.1, 0.06, 0); g.add(s); }
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0xe8334a, transparent: true })); c.rotation.z = Math.PI; c.position.y = -0.1; c.rotation.y = Math.PI / 4; g.add(c); return g; };
  const hearts = [0, 1, 2, 3].map(() => { const h = heart(); G.add(h); return h; });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); G.add(beam);
  const beamGlow = sprite(glowTex); G.add(beamGlow);
  const sparks = Array.from({ length: 7 }, () => { const s = sprite(glowTex); G.add(s); return s; });
  const lightPt = new THREE.PointLight(0xffe0a0, 0, 30, 1.3); G.add(lightPt);
  const steam = Array.from({ length: 4 }, () => { const s = sprite(whiteTex, false); G.add(s); return s; });
  const sweat = [drop(), drop()]; sweat.forEach(d => G.add(d));
  // the doorway where "sin is crouching"
  const door = new THREE.Group(); G.add(door); door.position.set(2.2, 0, -2.2);
  { for (const sx of [-1, 1]) { const p = outlined(new THREE.BoxGeometry(0.22, 3.2, 0.22), toon(0x8a5a36), 1.05); p.position.set(sx * 1.1, 1.6, 0); door.add(p); }
    const lin = outlined(new THREE.BoxGeometry(2.6, 0.26, 0.26), toon(0x8a5a36), 1.05); lin.position.set(0, 3.2, 0); door.add(lin);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.1), toon(0x3a2a1e)); back.position.set(0, 1.55, -0.08); door.add(back); }
  const shadow = new THREE.Group(); G.add(shadow); { const b = outlined(new THREE.SphereGeometry(0.55, 14, 10), toon(0x1a1a22), 1.05); b.scale.set(1.2, 0.8, 1); b.position.y = 0.45; shadow.add(b);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30 })); e.position.set(sx * 0.2, 0.62, 0.45); shadow.add(e); }
    for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 6), BLACK); c.position.set(sx * 0.32, 1.0, 0.1); c.rotation.z = -sx * 0.3; shadow.add(c); } }
  // the sprout (jealousy)
  const sprout = new THREE.Group(); G.add(sprout);
  { const R = rng(17); for (let i = 0; i < 6; i++) { const seg = outlined(new THREE.CylinderGeometry(0.1 - i * 0.012, 0.12 - i * 0.012, 0.55, 8), toon(i % 2 ? 0x3f7f3a : 0x4f9a42), 1.06); seg.position.set(Math.sin(i * 0.9) * 0.18, 0.28 + i * 0.5, 0); seg.rotation.z = -Math.sin(i * 0.9) * 0.3; sprout.add(seg);
      for (const sd of [-1, 1]) { const th = outlined(new THREE.ConeGeometry(0.06, 0.28, 6), toon(0x2a2a30), 1.1); th.position.set(sd * 0.2 + Math.sin(i * 0.9) * 0.18, 0.28 + i * 0.5, 0); th.rotation.z = -sd * 1.3; sprout.add(th); }
      const lf = outlined(new THREE.SphereGeometry(0.3, 10, 8), toon(0x5fb04a), 1.08); lf.scale.set(1.5, 0.2, 0.9); lf.position.set(Math.sin(i * 0.9) * 0.18 + (i % 2 ? 0.4 : -0.4), 0.45 + i * 0.5, 0.05); lf.rotation.z = i % 2 ? 0.4 : -0.4; sprout.add(lf); } }

  const cain = makeStick({ robe: 0xb0743c, hair: 0x2a1a10, seed: 41 }), abel = makeStick({ robe: 0xe9e2c9, hair: 0x6b4a2a, prop: 'staff', seed: 42 }); G.add(cain.root); G.add(abel.root);
  const st = makeStick(STORYTELLER); G.add(st.root);
  const dummyAbelStaff = null; void dummyAbelStaff;

  function base(t, day = true) {
    G.visible = true; E.group.visible = false; scene.background = day ? SKIES.day : SKIES.sunset; aimSun(V3(0, 0, -2), day ? V3(-10, 20, 14) : V3(8, 5, 14), day ? 0xfff0d0 : 0xffa060, day ? 2.4 : 1.6); hemi.intensity = day ? 1.5 : 1.1;
    wheat.forEach(({ g, ph }) => { g.rotation.z = Math.sin(t * 2 + ph) * 0.07; g.visible = true; });
    lambs.forEach((l, i) => { l.root.visible = true; l.root.position.set(l.x, 0, l.z); l.root.rotation.set(0, l.ry, 0); l.head.rotation.set(0, 0, -0.5 + Math.sin(t * 1.5 + i) * 0.1); l.walk(0, 0); l.tail.rotation.z = 0.5 + Math.sin(t * 7 + i) * 0.2; });
    carried.root.visible = false; altC.visible = altA.visible = false; crops.visible = false; hearts.forEach(h => h.visible = false); beam.visible = false; beamGlow.visible = false; sparks.forEach(s => s.visible = false); lightPt.intensity = 0;
    steam.forEach(s => s.visible = false); sweat.forEach(s => s.visible = false); door.visible = false; shadow.visible = false; sprout.visible = false; st.root.visible = false;
    cain.rest(); abel.rest(); cain.root.visible = abel.root.visible = true; cain.root.rotation.set(0, 0, 0); abel.root.rotation.set(0, 0, 0); cain.expr('smile', 0.3); abel.expr('smile', 0.3); cain.look(0, 0); abel.look(0, 0);
    abel.root.position.set(2.0, 0, 0); cain.root.position.set(-2.0, 0, 0);
  }
  const cam = (x, y, z, lx, ly, lz, fov = 48) => { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; };

  return [
    // 1 – two brothers: Cain the farmer (wheat), Abel the shepherd (lambs)
    (lt, d, t) => { base(t); const u = ease(lt / d); cain.root.position.set(-1.5, 0, 0); abel.root.position.set(1.5, 0, 0);
      cain.root.rotation.y = 0.35; abel.root.rotation.y = -0.35; cain.arms[1].sh.rotation.set(-0.2, 0, 2.4 + Math.sin(t * 6) * 0.3); cain.arms[1].el.rotation.z = 0.5; cain.body.position.y = Math.abs(Math.sin(t * 2)) * 0.03;
      abel.arms[0].sh.rotation.set(-0.2, 0, -2.4 - Math.sin(t * 6 + 1) * 0.3); abel.arms[0].el.rotation.z = -0.5; abel.expr('smile', 0.4);
      cam(0, 2.4, lerp(13.0, 12.0, u), 0, 1.8, 0); },
    // 2 – Abel brings the best of his flock, with all his heart
    (lt, d, t) => { base(t); const u = lt / d, w = ease(clamp(u / 0.6)); altA.visible = true; altC.visible = true;
      abel.root.position.set(lerp(3.8, 2.0, w), 0, lerp(0.4, -0.2, w)); abel.root.rotation.y = -Math.PI / 2 + 0.3; abel.walk(t * 6, w < 1 ? 1 : 0); abel.expr('smile', 0.8);
      abel.arms.forEach(a => { a.sh.rotation.set(-1.0, 0, a.side * 0.25); a.el.rotation.set(-1.0, 0, 0); });
      carried.root.visible = true; carried.root.position.set(abel.root.position.x - 0.5, 1.35, abel.root.position.z + 0.05); carried.root.rotation.set(0, Math.PI, 0); carried.walk(0, 0); carried.head.rotation.z = 0.1;
      hearts.forEach((h, i) => { const v = ((lt * 0.5 + i / 4) % 1); h.visible = lt > 1.2; h.position.set(abel.root.position.x + Math.sin(i * 2.3) * 0.5, 3.6 + v * 1.4, abel.root.position.z + 0.3); h.scale.setScalar(0.9 + 0.3 * Math.sin(t * 6 + i)); h.children.forEach(c => c.material.opacity = 1 - v); });
      cain.root.rotation.y = 0.6; cain.look(0.6, 0); cain.root.position.set(-1.8, 0, 0.4);
      cam(0.5, 2.5, 12.5, 0.5, 1.8, 0); },
    // 3 – Cain's crops are set down; the warm light rests on Abel's offering, not on his
    (lt, d, t) => { base(t); const u = lt / d; altA.visible = altC.visible = true; crops.visible = true; crops.position.set(-1.3, 0.54, -0.8);
      cain.root.position.set(-2.1, 0, 0.3); cain.root.rotation.y = 0.5; cain.arms[1].sh.rotation.set(-0.5, 0, 0.2); cain.look(0.2, -0.2); cain.expr(u > 0.55 ? 'frown' : 'smile', u > 0.55 ? -0.9 : 0.3);
      abel.root.position.set(2.1, 0, 0.3); abel.root.rotation.y = -0.5; abel.expr('smile', 0.8); abel.arms[0].sh.rotation.set(-0.3, 0, -0.4);
      carried.root.visible = true; carried.root.position.set(1.3, 0.54, -0.8); carried.root.rotation.set(0, 0.6, 0); carried.head.rotation.z = 0; carried.walk(0, 0);
      const k = ease(clamp((u - 0.25) / 0.3)); beam.visible = k > 0.01; beam.scale.set(1, 1, 1); beam.position.set(1.3, 7, -0.8); beam.material.opacity = 0.16 * k; beamGlow.visible = true; beamGlow.position.set(1.3, 1.4, -0.4); beamGlow.scale.setScalar(2.4 * k); beamGlow.material.opacity = 0.5 * k;
      sparks.forEach((s, i) => { s.visible = k > 0.3; const a = i / 7 * 6.28 + t * 1.6; s.position.set(1.3 + Math.cos(a) * 0.9, 1.4 + Math.sin(a * 1.3) * 0.8, -0.4); s.scale.setScalar(0.3 + 0.15 * Math.sin(t * 6 + i)); s.material.opacity = 0.8; });
      lightPt.position.set(1.3, 3, 2); lightPt.intensity = 5 * k;
      cam(0, 2.6, 12.5, 0, 1.9, 0); },
    // 4 – Cain is furious; a gentle warning light; sin crouches at the door
    (lt, d, t) => { base(t); const u = lt / d; abel.root.visible = false; door.visible = true; shadow.visible = true; altC.visible = true; crops.visible = true; crops.position.set(-1.3, 0.54, -0.8);
      cain.root.position.set(-0.5, 0, 0.8); cain.root.rotation.y = 0.35; cain.expr('frown', -1.3); cain.look(0.2, -0.2); cain.arms.forEach(a => { a.sh.rotation.set(-0.4, 0, a.side * 0.35); a.el.rotation.set(-1.5, 0, 0); }); cain.root.position.x += Math.sin(t * 30) * 0.02 * (u < 0.35 ? 1 : 0.3);
      steam.forEach((s, i) => { s.visible = u < 0.5; const v = (t * 1.2 + i / 4) % 1; s.position.set(-0.7 + (i % 2 ? 0.5 : -0.5) * (0.6 + v), 3.5 + v * 0.9, 0.9); s.scale.setScalar(0.5 + v * 0.9); s.material.opacity = 0.8 * (1 - v); });
      const w = ease(clamp((u - 0.45) / 0.25)); beam.visible = true; beam.position.set(-0.4, 7, 0.8); beam.material.opacity = 0.22 * w; beamGlow.visible = w > 0; beamGlow.position.set(-0.4, 4.6, 0.6); beamGlow.scale.setScalar(5 * w); beamGlow.material.opacity = 0.5 * w; lightPt.position.set(-0.4, 4, 3); lightPt.intensity = 10 * w;
      shadow.position.set(1.6, 0, -1.5); shadow.scale.setScalar(1 + 0.05 * Math.sin(t * 4)); shadow.rotation.y = -0.5; cain.headG.rotation.y = u > 0.6 ? 0.35 : 0;
      cam(0.6, 2.6, 11.5, 0.6, 1.8, -0.5); },
    // 5 – "He led Abel into the field… and Abel never came home": the lamb waits alone
    (lt, d, t) => { const u = lt / d; const dusk = u > 0.5; base(t, !dusk);
      const w = clamp(u / 0.5);
      if (!dusk) { cain.root.position.set(-0.4, 0, lerp(1.5, -9, ease(w))); abel.root.position.set(0.7, 0, lerp(1.8, -9, ease(w))); cain.root.rotation.y = Math.PI; abel.root.rotation.y = Math.PI; cain.walk(t * 6, 1); abel.walk(t * 6 + 1, 1); cain.expr('flat', 0.3); abel.expr('smile', 0.5);
        lambs.forEach(l => l.root.visible = false); carried.root.visible = true; carried.root.position.set(2.2, 0, 0.5); carried.root.rotation.y = -1.9; carried.walk(0, 0); carried.head.rotation.z = -0.1; }
      else { abel.root.visible = false; const r = clamp((u - 0.62) / 0.38); cain.root.position.set(-1.1, 0, lerp(-9, 0.6, ease(r))); cain.root.rotation.y = 0; cain.walk(t * 4, r > 0 && r < 1 ? 0.8 : 0); cain.expr('flat', 0.2); cain.look(0, 0); cain.headG.rotation.y = 0.5;
        lambs.forEach(l => l.root.visible = false); carried.root.visible = true; carried.root.position.set(1.0, 0, 0.6); carried.root.rotation.y = -Math.PI / 2 - 0.2; carried.head.rotation.z = -0.35 + Math.sin(t * 2) * 0.05; carried.walk(0, 0); carried.mouth.visible = Math.sin(t * 3) > 0.3; }
      cam(0, 2.5, 9.0, 0, 1.4, -3, 50); },
    // 6 – "Where is your brother?" The warm light asks; Cain shrugs: "Am I my brother's keeper?"
    (lt, d, t) => { base(t, false); const u = lt / d; abel.root.visible = false; lambs.forEach(l => l.root.visible = false); wheat.forEach(({ g }) => g.visible = u > -1);
      beam.visible = true; beam.position.set(1.5, 7, 0.4); beam.material.opacity = 0.15 + 0.03 * Math.sin(t * 2.4); beamGlow.visible = true; beamGlow.position.set(1.5, 2.3, 0.2); beamGlow.scale.setScalar(3 + 0.3 * Math.sin(t * 2.4)); beamGlow.material.opacity = 0.4; lightPt.position.set(1.5, 3, 3); lightPt.intensity = 6;
      cain.root.position.set(-0.3, 0, 0.4); cain.root.rotation.y = Math.PI / 2 - 0.3; const sh = ease(clamp((u - 0.35) / 0.2)); cain.expr('open', 0.2); cain.look(0.5, 0.1);
      cain.arms.forEach(a => { a.sh.rotation.set(-0.3, 0, a.side * (0.2 + 1.1 * sh)); a.el.rotation.set(-0.9 * sh, 0, 0); }); cain.headG.rotation.z = 0.12 * sh; cain.body.position.y = Math.sin(t * 2) * 0.02;
      sweat.forEach((s, i) => { s.visible = u > 0.5; const v = (t * 0.9 + i / 2) % 1; s.position.set(-0.3 + 0.7 + i * 0.25, 3.6 - v * 0.8, 0.6); s.scale.setScalar(1.2); });
      cam(0.6, 2.5, 12.0, 0.6, 1.8, 0); },
    // 7 – jealousy starts as a tiny sprout and becomes a thorny tangle; master it while it's small
    (lt, d, t) => { base(t); const u = lt / d; cain.root.visible = abel.root.visible = false; lambs.forEach(l => l.root.visible = false); st.root.visible = true; sprout.visible = true;
      const gk = ease(clamp(u / 0.7)); sprout.position.set(-1.2, 0, 0.2); sprout.scale.setScalar(0.18 + 1.5 * gk); sprout.rotation.y = 0.3; sprout.children.forEach((c, i) => { if (c.material && c.material.color) c.material.color.lerpColors(new THREE.Color(0x5fb04a), new THREE.Color(0x3a2a48), gk * 0.7); });
      st.rest(); st.root.position.set(1.6, 0, 0.5); st.root.rotation.y = -1.0; st.expr(u > 0.72 ? 'smile' : 'open', 0.4); st.look(-0.4, 0.1);
      if (u < 0.7) { st.arms[0].sh.rotation.set(-0.3, 0, -1.4 - Math.sin(t * 5) * 0.1); st.arms[1].sh.rotation.set(-0.3, 0, 0.3); }
      else { st.root.rotation.y = -0.45; st.arms[1].sh.rotation.set(-0.3, 0, 2.55); st.arms[1].el.rotation.set(-1.6, 0, 0.9 + Math.sin(t * 7) * 0.15); st.arms[0].sh.rotation.set(-0.2, 0, -0.35); }
      cam(0.2, 2.8, 12.0, 0.2, 1.9, 0, 50); },
    // 8 – end card
    (lt, d, t) => { G.visible = false; lightPt.intensity = 0; E.group.visible = true; E.update(lt); },
  ];
}
