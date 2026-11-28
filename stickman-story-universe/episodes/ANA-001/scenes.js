// ANA-001 – How We Got the Name "Spider Tales". Source: Barker & Sinclair, West African Folk-Tales (1917), tale I.
// Anansi buys all the world's stories from the sky chief Nyankupon by outwitting a swarm of bees, a boa and a tiger.
// Soft retelling: the eye is only covered with a cloth, the tiger is only blindfolded (unharmed).
import { westafrica } from '../../engine/sets/westafrica.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture, skyTexture,
    makeStick, makeSpider, makeBee, makeSnake, makeAnimal, NYANKUPON, STORYTELLER } = ctx;
  const Wf = westafrica(ctx); const W = Wf.group; const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const O = Wf.origin;
  const cam = (px, py, pz, lx, ly, lz, fov = 46) => { camera.position.set(O.x + px, py, O.z + pz); camera.lookAt(O.x + lx, ly, O.z + lz); camera.fov = fov; };
  const SKY = { gold: skyTexture('#f5a847', '#ffd88a', '#fff1c8'), sunset: skyTexture('#6a3a8a', '#e0617a', '#ffb56b') };
  const glow = radialTexture('rgba(255,236,160,1)', 'rgba(255,200,80,0)'); const white = radialTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const sprite = (tex, add = true) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));

  // ---- the sky court (a cloud platform high above the village, inside the same world) ----
  const SKC = new THREE.Group(); SKC.position.set(0, 16, -14); W.add(SKC);
  { const R = rng(4); for (let i = 0; i < 40; i++) { const c = outlined(new THREE.SphereGeometry(1.3 + R() * 1.2, 14, 10), toon(0xffffff), 1.04); c.position.set((R() - 0.5) * 16, -0.9 + R() * 0.5, (R() - 0.5) * 11); c.scale.y = 0.55; SKC.add(c); }
    const th = outlined(new THREE.BoxGeometry(2.6, 0.7, 2.0), toon(0xe0b84a), 1.04); th.position.set(0, 0.4, -1); SKC.add(th);
    const bk = outlined(new THREE.BoxGeometry(2.6, 3.4, 0.3), toon(0xe0b84a), 1.04); bk.position.set(0, 2.0, -1.9); SKC.add(bk);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f })); sun.position.set(0, 3.2, -1.7); SKC.add(sun); }
  const nyan = makeStick(NYANKUPON); nyan.root.scale.setScalar(1.9); SKC.add(nyan.root);
  const basket = new THREE.Group(); SKC.add(basket);
  { const b = outlined(new THREE.CylinderGeometry(0.9, 0.65, 0.9, 16), toon(0xb98a46), 1.05); b.position.y = 0.45; basket.add(b);
    const R = rng(8); for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.1 + R() * 0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff2a0 })); s.position.set((R() - 0.5) * 1.1, 1.0 + R() * 0.6, (R() - 0.5) * 1.1); s.userData = { ph: R() * 6, y: s.position.y }; basket.add(s); }
    const g = sprite(glow); g.scale.setScalar(5); g.position.y = 1.3; basket.add(g); }
  const anansi = makeSpider(); W.add(anansi.root);
  const GY = -0.18;                                   // lift so the spider's feet touch the ground
  const jar = outlined(new THREE.CylinderGeometry(0.42, 0.34, 0.8, 14, 1, true), toon(0xc9753a, { side: THREE.DoubleSide }), 1.05); W.add(jar);
  const jarBase = new THREE.Mesh(new THREE.CircleGeometry(0.34, 14), toon(0xa85a2a)); jarBase.rotation.x = -Math.PI / 2; jar.add(jarBase); jarBase.position.y = -0.38;
  const lid = outlined(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 14), toon(0xe0b84a), 1.06); W.add(lid);
  const bees = Array.from({ length: 16 }, () => { const b = makeBee(); b.root.scale.setScalar(1.5); W.add(b.root); return b; });
  const boa = makeSnake(0x4fae4a, 22); boa.root.scale.setScalar(1.15); W.add(boa.root);
  const pole = outlined(new THREE.CylinderGeometry(0.1, 0.1, 6.8, 8), toon(0x7a5230), 1.1); pole.rotation.z = Math.PI / 2; W.add(pole);
  const ties = Array.from({ length: 5 }, () => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 14), toon(0xeeeeee)); W.add(r); return r; });
  const tiger = makeAnimal('tiger'); tiger.root.scale.setScalar(2.0); W.add(tiger.root);
  const blind = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.9), toon(0xc8323c)); tiger.head.add(blind); blind.position.set(0.12, 0.08, 0); blind.scale.set(1, 1, 1);
  const patch = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.05), toon(0xc8323c)); anansi.head.add(patch); patch.position.set(-0.18, 0.08, 0.45); patch.rotation.z = -0.15;
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 5), toon(0xdddddd)); W.add(needle);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 4), toon(0xc8323c)); W.add(thread);
  const sparkles = Array.from({ length: 10 }, () => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xfff3a0 })); s.scale.z = 0.3; W.add(s); return s; });

  const hideAll = () => { anansi.root.visible = false; jar.visible = false; lid.visible = false; bees.forEach(b => b.root.visible = false); boa.root.visible = false; pole.visible = false; ties.forEach(t => t.visible = false);
    tiger.root.visible = false; blind.visible = false; patch.visible = false; needle.visible = false; thread.visible = false; sparkles.forEach(s => s.visible = false); SKC.visible = true; basket.visible = true; nyan.root.visible = true; anansi.open.visible = false; anansi.eyes.forEach(e => e.scale.y = 1); };
  function day(t) { W.visible = true; E.group.visible = false; scene.background = SKY.gold; aimSun(V3(O.x, 0, O.z), V3(-12, 22, 14), 0xfff0d0, 2.4); hemi.intensity = 1.5; hideAll();
    if (anansi.root.parent !== W) W.add(anansi.root); anansi.root.scale.setScalar(1); anansi.walk(0, 0); anansi.wave(0); anansi.grin.visible = true;
    tiger.root.scale.setScalar(2.0); tiger.lie(0); tiger.bg.rotation.set(0, 0, 0); tiger.legs.forEach(l => l.rotation.z = 0); tiger.head.rotation.set(0, 0, 0); tiger.mouth.visible = false;
    pole.scale.set(1, 1, 1); pole.rotation.set(0, 0, Math.PI / 2); }
  function standAnansi(x, y, z, ry = 0) { anansi.root.visible = true; anansi.root.position.set(x, y + GY, z); anansi.root.rotation.set(0, ry, 0); anansi.head.rotation.set(0, 0, 0); }
  function nyanPose(t, k = 1) { nyan.rest(); nyan.root.position.set(0, 1.2, -1.0); nyan.sit(); nyan.root.position.set(0, 1.9, -1.0); nyan.root.rotation.y = 0; nyan.expr('smile', 0.7); nyan.arms.forEach(a => { a.sh.rotation.set(-0.4, 0, a.side * 0.5); a.el.rotation.x = -0.6; }); basket.position.set(2.4, 0.6, 0.9); basket.children.forEach(c => { if (c.userData && c.userData.y) c.position.y = c.userData.y + Math.sin(t * 2 + c.userData.ph) * 0.12; }); }

  return [
    // 1 – every story belonged to Nyankupon, the sky chief (seen from the village below)
    (lt, d, t) => {
      day(t); nyanPose(t); standAnansi(1.6, 0, 11.0, 0.2); anansi.walk(0, 0); anansi.head.rotation.x = -0.45;
      nyan.arms[1].sh.rotation.set(-0.6, 0, 1.1 + Math.sin(t * 2) * 0.08); nyan.expr('smile', 0.9);
      const u = ease(lt / d); cam(lerp(2.0, 0.6, u), lerp(7.0, 10.5, u), 19.0, 0, lerp(17.5, 20.0, u), -14, 62);
    },
    // 2 – "Fine. Bring me a jar of live bees, a boa constrictor and a tiger." (Anansi's jaw drops)
    (lt, d, t) => {
      day(t); nyanPose(t); anansi.root.visible = true; anansi.root.position.set(-1.9, 16.5 + GY, -9.7); anansi.root.rotation.set(0, 0.35, 0); anansi.walk(0, 0);
      anansi.open.visible = lt > 2.2; anansi.grin.visible = lt <= 2.2; anansi.head.rotation.x = lt > 2.2 ? 0.15 : -0.1;
      nyan.arms[1].sh.rotation.set(-1.4, 0, 0.5); nyan.arms[1].el.rotation.x = -0.4; nyan.expr('smile', 1); nyan.headG.rotation.z = Math.sin(t * 2) * 0.06;
      const u = ease(lt / d); camera.position.set(O.x + lerp(3.8, 2.8, u), 19.6, O.z - 0.4); camera.lookAt(O.x - 0.2, 19.6, O.z - 12.2); camera.fov = 56;
    },
    // 3 – the bees: Anansi argues with himself ("They can't fill it!" "Yes, they can!") and the bees fly into the jar
    (lt, d, t) => {
      day(t); SKC.visible = false; const jp = V3(-5.2, 0.4, 0.9); standAnansi(-6.0, 0, 2.2, 0.6); anansi.grin.visible = true; anansi.walk(t * 6, 0.25);
      const turn = Math.sin(t * 2.6) > 0; anansi.head.rotation.y = turn ? 0.5 : -0.45; anansi.open.visible = Math.sin(t * 12) > -0.1; anansi.grin.visible = !anansi.open.visible; anansi.head.rotation.z = turn ? 0.12 : -0.12; anansi.wave(t * 0.6);
      jar.visible = true; jar.position.copy(jp); lid.visible = true; const lidOn = ease((lt - d * 0.8) / 0.4); lid.position.set(jp.x, lerp(1.9, 0.82, lidOn), jp.z + lerp(0.9, 0, lidOn)); lid.rotation.z = (1 - lidOn) * 0.5;
      const hive = V3(-6.0, 3.55, -1.5); bees.forEach((b, i) => { const st = 0.5 + i * 0.12; const v = clamp((lt - st) / 1.3); b.root.visible = v > 0 && v < 1.01; const p = hive.clone().lerp(V3(jp.x, 0.95, jp.z), v); p.y += Math.sin(v * Math.PI) * 1.4 + Math.sin(t * 9 + i) * 0.1; p.x += Math.sin(v * 8 + i) * 0.25; b.root.position.copy(p); b.root.rotation.y = Math.atan2(-(jp.z - hive.z), jp.x - hive.x); b.flap(t * 40 + i); });
      cam(-2.0, 2.4, 6.6, -5.4, 2.0, 0, 48);
    },
    // 4 – the boa is measured against a long pole and tied to it
    (lt, d, t) => {
      day(t); SKC.visible = false; pole.visible = true; pole.position.set(0.0, 1.0, 0); const ext = ease(lt / (d * 0.5)); boa.root.visible = true;
      boa.pose(s => { const x = -3.0 + s * 6.0 * ext, wob = (1 - ext) * 0.5; return V3(3.0 - s * 6.0 * ext + (s > 0 ? 0 : 0), 1.0 + 0.22 + (s === 0 ? 0.0 : Math.sin(s * 9 + t * 2) * wob) + (s < 0.07 ? (1 - ext * 0.2) * 0.2 : 0), 0.28 + Math.sin(s * 8 + t * 3) * wob * 0.8); });
      const tie = clamp((lt - d * 0.55) / (d * 0.4)); ties.forEach((r, i) => { r.visible = tie > i / 5; r.position.set(2.4 - i * 1.2, 1.2, 0.28); r.rotation.y = Math.PI / 2; });
      const ax = lerp(2.6, -2.2, tie); standAnansi(lt < d * 0.55 ? -3.6 : ax, 0, 1.3, 0.1); anansi.walk(t * 9, lt < d * 0.55 ? 0.1 : 0.8); anansi.grin.visible = true; anansi.head.rotation.y = lt > d * 0.85 ? -0.5 : 0.2; if (lt > d * 0.88) anansi.eyes[1].scale.y = 0.12;
      cam(0, 2.6, 10.2, 0, 1.3, 0, 52);
    },
    // 5 – Anansi ties a cloth over one eye and sings about wonders (dancing on a rock beside the den)
    (lt, d, t) => {
      day(t); SKC.visible = false; const rp = Wf.rockLocal; standAnansi(rp.x, rp.y, rp.z, -0.25); anansi.walk(t * 4, 0.3); anansi.wave(t); patch.visible = true; anansi.open.visible = Math.sin(t * 8) > -0.3; anansi.grin.visible = !anansi.open.visible;
      anansi.root.position.y = rp.y + GY + Math.abs(Math.sin(t * 5)) * 0.25; anansi.head.rotation.z = Math.sin(t * 4) * 0.15;
      sparkles.forEach((s, i) => { const v = ((t * 0.8 + i * 0.1) % 1); s.visible = true; s.position.set(rp.x + Math.cos(i * 1.7) * (0.6 + v * 1.4), rp.y + 1.5 + v * 2.0, rp.z + 0.3 + Math.sin(i * 1.7) * 0.7); s.scale.setScalar((1 - v) * 1.2); s.rotation.z = v * 5; });
      cam(lerp(5.2, 4.4, ease(lt / d)), 2.6, 7.2, 4.8, 2.0, -0.2, 50);
    },
    // 6 – the tiger pokes out of the den and begs: "Do mine too!"
    (lt, d, t) => {
      day(t); SKC.visible = false; const dp = Wf.denLocal; tiger.root.visible = true; tiger.root.position.set(dp.x + 0.2, 0, dp.z - 0.6); tiger.root.rotation.set(0, -Math.PI / 2 + 0.3, 0); tiger.bg.rotation.z = 0.8; tiger.legs[0].rotation.z = tiger.legs[1].rotation.z = 2.2 + Math.sin(t * 6) * 0.15; tiger.head.rotation.z = -0.3 + Math.sin(t * 4) * 0.08; tiger.mouth.visible = Math.sin(t * 7) > 0.2;
      standAnansi(dp.x - 2.2, 0, dp.z + 2.0, 0.55); anansi.walk(0, 0); anansi.grin.visible = true; anansi.head.rotation.z = 0.1; patch.visible = true; needle.visible = true; thread.visible = true;
      const np = V3(dp.x - 1.5, 2.3 + Math.sin(t * 3) * 0.05, dp.z + 2.1); needle.position.copy(np); needle.rotation.z = 0.5; thread.position.set(np.x + 0.1, np.y - 0.45, np.z); thread.rotation.z = 0.15;
      cam(lerp(3.2, 4.4, ease(lt / d)), 2.6, 7.4, dp.x - 1.4, 1.7, dp.z + 0.2, 48);
    },
    // 7 – at the sky court, sunset: the jar, the tied boa and the blindfolded tiger; Nyankupon laughs and gives Anansi the stories
    (lt, d, t) => {
      day(t); scene.background = SKY.sunset; aimSun(V3(O.x, 16, O.z - 10), V3(10, 8, 12), 0xffa060, 2.0); nyanPose(t); nyan.expr('open', 1); nyan.root.position.y = 1.9 + Math.sin(t * 14) * 0.04; nyan.arms[1].sh.rotation.set(-1.2, 0, 0.6); nyan.arms[0].sh.rotation.set(-1.1, 0, -0.6);
      anansi.root.visible = true; anansi.root.position.set(-0.4, 16.5 + GY, -10.0); anansi.root.rotation.set(0, 0.1, 0); anansi.walk(0, 0); anansi.wave(t * 0.8); anansi.grin.visible = true; patch.visible = false; anansi.head.rotation.z = Math.sin(t * 3) * 0.1;
      jar.visible = true; jar.position.set(-2.6, 16.9, -10.2); lid.visible = true; lid.position.set(-2.6, 17.35, -10.2); lid.rotation.z = 0;
      bees.forEach((b, i) => { b.root.visible = true; const a = t * 3 + i * 0.7; b.root.position.set(-2.6 + Math.cos(a) * 0.9, 18.0 + Math.sin(a * 1.3) * 0.5, -10.2 + Math.sin(a) * 0.9); b.root.rotation.y = -a - Math.PI / 2; b.flap(t * 40 + i); });
      pole.visible = true; pole.position.set(2.6, 17.4, -10.2); pole.rotation.set(0, 0, Math.PI / 2 + 0.05); pole.rotation.z = Math.PI / 2 - 0.05; pole.scale.set(1, 0.65, 1);
      boa.root.visible = true; boa.pose(s => V3(3.9 - s * 4.0, 17.5 + 0.2 + (s < 0.07 ? 0.15 : 0), -9.95)); ties.forEach((r, i) => { r.visible = true; r.position.set(3.0 - i * 0.75, 17.7, -9.95); r.rotation.y = Math.PI / 2; });
      tiger.root.visible = true; tiger.root.scale.setScalar(1.5); tiger.root.position.set(1.2, 16.4, -12.1); tiger.root.rotation.set(0, -Math.PI / 2 + 0.3, 0); tiger.bg.rotation.z = 0.0; tiger.lie(1); tiger.legs[0].rotation.z = 1.2; blind.visible = true; tiger.mouth.visible = false;
      camera.position.set(O.x + lerp(0.6, 0.2, ease(lt / d)), 20.2, O.z + 0.6); camera.lookAt(O.x + 0.2, 19.6, O.z - 11.0); camera.fov = 60;
    },
    // 8 – end card: the Storyteller with Anansi sitting on the book
    (lt, d, t) => { W.visible = false; E.group.visible = true; E.update(lt); anansi.root.visible = true; E.group.add(anansi.root); anansi.root.scale.setScalar(0.38); anansi.root.position.set(0.2 + E.host.root.position.x, 1.62, 0.45); anansi.root.rotation.set(0, 0.3, 0); anansi.walk(0, 0); anansi.wave(t * 0.7); anansi.grin.visible = true; patch.visible = false; },
  ];
}
