// BIB-001 – Creation, Day by Day. Source: Genesis 1:1–2:3 (KJV).
// God is never drawn as a figure: only light, voice and glow. The Storyteller hosts and reacts.
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture,
    makeStick, STORYTELLER, ADAM, EVE, makeAnimal, makeBird, makeFish, drop } = ctx;
  const E = endcard(ctx, STORYTELLER);
  const glowTex = radialTexture('rgba(255,236,160,1)', 'rgba(255,200,80,0)');
  const whiteTex = radialTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const black = new THREE.Color(0x000000), gold = new THREE.Color(0xfff1b0);
  const sprite = (tex, blend = true) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: blend ? THREE.AdditiveBlending : THREE.NormalBlending }));

  // ===== V: the void (scenes 1–2, Storyteller floating) =====
  const V = new THREE.Group(); V.position.set(-500, 0, 0); scene.add(V);
  const stV = makeStick(STORYTELLER); V.add(stV.root);
  const voidGlow = sprite(glowTex); V.add(voidGlow);
  const voidLight = new THREE.PointLight(0xffd878, 0, 30, 1.4); voidLight.position.set(0, 2.6, 1.5); V.add(voidLight);

  // ===== W: the created world (scenes 3–6) =====
  const W = new THREE.Group(); scene.add(W);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), toon(0x3d9bd6)); sea.rotation.x = -Math.PI / 2; sea.position.set(-114, -0.02, 0); sea.receiveShadow = true; W.add(sea);
  const land = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), toon(0x7fc060)); land.rotation.x = -Math.PI / 2; land.position.set(126, 0, 0); land.receiveShadow = true; W.add(land);
  const foam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 240), toon(0xffffff)); foam.position.set(6.1, 0.01, 0); W.add(foam);
  const sparkles = []; { const R = rng(3); for (let i = 0; i < 34; i++) { const s = sprite(whiteTex); s.position.set(-4 - R() * 30, 0.1, 6 - R() * 30); s.scale.setScalar(0.5 + R() * 0.6); s.userData = { ph: R() * 6 }; W.add(s); sparkles.push(s); } }
  // hills
  const hills = [[14, -12, 6], [26, -17, 7.5], [8, -22, 5], [38, -10, 5]].map(([x, z, r]) => {
    const h = outlined(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x6fb352), 1.01); h.position.set(x, 0, z); h.receiveShadow = true; W.add(h); return h; });
  // trees (pop up in scene 3)
  function makeTree(h, seed) { const g = new THREE.Group(); const R = rng(seed);
    const tr = outlined(new THREE.CylinderGeometry(0.17, 0.26, h, 8), toon(0x8a5a36), 1.06); tr.position.y = h / 2; g.add(tr);
    for (let i = 0; i < 3; i++) { const c = outlined(new THREE.SphereGeometry(0.75 + R() * 0.25, 14, 10), toon(i % 2 ? 0x5aa84a : 0x6bb85a), 1.05); c.position.set((R() - 0.5) * 0.8, h + 0.2 + i * 0.25, (R() - 0.5) * 0.8); g.add(c); }
    return g; }
  const treeSpots = [[9.0, -3.6, 3.2], [19.8, -4.0, 3.4], [13, -11.5, 3.8], [16.6, -12.5, 4], [21.5, -9.5, 4], [9, -10, 3.4], [25, -6, 3.2], [30, -12, 4], [19, -14.5, 4.2], [6.8, -14, 3.6], [11.4, -13.5, 3.2]];
  const trees = treeSpots.map(([x, z, h], i) => { const t = makeTree(h, 40 + i); t.position.set(x, 0, z); W.add(t);
    const p = sprite(whiteTex, false); p.position.set(x, h * 0.6, z + 0.3); p.visible = false; W.add(p); return { t, p, i }; });
  // sun, moon, stars (scene 4)
  const sun = new THREE.Mesh(new THREE.SphereGeometry(3.4, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffd23f })); sun.position.set(-10, 9, -38); W.add(sun);
  const sunGlow = sprite(glowTex); sunGlow.scale.setScalar(20); sunGlow.position.copy(sun.position); sunGlow.position.z += 1; W.add(sunGlow);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 20), new THREE.MeshBasicMaterial({ color: 0xe6e9f2 })); moon.position.set(3.5, 11, -38); W.add(moon);
  [[-0.8, 0.7, 0.8], [0.9, -0.5, 0.6], [-0.2, -1.1, 0.45]].forEach(([x, y, r]) => { const c = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: 0xc4c9d8 })); c.scale.z = 0.2; c.position.set(moon.position.x + x, moon.position.y + y, moon.position.z + 2.55); W.add(c); });
  const stars = []; { const R = rng(11); for (let i = 0; i < 22; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.28 + R() * 0.2), new THREE.MeshBasicMaterial({ color: 0xfff3a0 })); s.scale.z = 0.3; s.position.set(-16 + R() * 28, 8 + R() * 10, -37); s.userData = { ph: R() * 6 }; W.add(s); stars.push(s); } }
  // fish and birds (scene 4)
  const fish = Array.from({ length: 6 }, (_, i) => { const f = makeFish([0xf29f05, 0x3ec1d3, 0xe85d75][i % 3]); f.root.scale.setScalar(1.7); W.add(f.root); return f; });
  const birds = Array.from({ length: 7 }, (_, i) => { const b = makeBird([0x3d7ea6, 0xc8553d, 0x8e5ba8, 0xe0a030][i % 4]); b.root.scale.setScalar(1.5); W.add(b.root); return b; });
  // animals and the first people (scenes 5–6)
  const animals = [['elephant', 11.7, -5.0, 0.45, 0.85], ['lion', 17.4, -4.2, 2.7, 1.0], ['giraffe', 14.3, -6.4, 0.0, 0.95], ['rabbit', 12.2, -0.6, 0.6, 1.0], ['rabbit', 16.2, -0.2, 2.4, 1.0]]
    .map(([k, x, z, ry, sc]) => { const a = makeAnimal(k); a.root.position.set(x, 0, z); a.root.rotation.y = ry; a.root.scale.setScalar(sc); W.add(a.root); return Object.assign(a, { x, z, ry, k, sc }); });
  const adam = makeStick(ADAM), eve = makeStick(EVE); W.add(adam.root); W.add(eve.root);
  const stW = makeStick(STORYTELLER); W.add(stW.root);
  const worldGlow = sprite(glowTex); worldGlow.scale.setScalar(26); worldGlow.position.set(16, 7, -22); W.add(worldGlow);
  const tear = drop(); W.add(tear);

  // ===== H: hammock at sunset (scene 7) =====
  const H = new THREE.Group(); H.position.set(300, 0, 0); scene.add(H);
  const stH = makeStick(STORYTELLER); const stHp = new THREE.Group(); H.add(stHp); stHp.add(stH.root); stHp.rotation.y = Math.PI / 2;
  const hg = new THREE.Mesh(new THREE.CircleGeometry(26, 48), toon(0xc9a56b)); hg.rotation.x = -Math.PI / 2; hg.receiveShadow = true; H.add(hg);
  function palm(x, lean) { const g = new THREE.Group(); g.position.set(x, 0, -0.4);
    for (let i = 0; i < 8; i++) { const seg = outlined(new THREE.CylinderGeometry(0.2 - i * 0.008, 0.23 - i * 0.008, 0.62, 8), toon(i % 2 ? 0x9a6b42 : 0x8a5a36), 1.05); seg.position.set(lean * i * 0.07 * i * 0.2, 0.31 + i * 0.6, 0); seg.rotation.z = -lean * 0.07 * i; g.add(seg); }
    const top = new THREE.Group(); top.position.set(lean * 0.07 * 8 * 8 * 0.2 * 0.9, 5.0, 0); g.add(top);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const fr = outlined(new THREE.SphereGeometry(0.5, 10, 6), toon(i % 2 ? 0x4f9a3f : 0x5fb04a), 1.05); fr.scale.set(3.2, 0.12, 0.7); fr.position.set(Math.cos(a) * 1.5, -0.15, Math.sin(a) * 1.5); fr.rotation.y = -a; fr.rotation.z = -0.25; top.add(fr); }
    for (let i = 0; i < 3; i++) { const c = outlined(new THREE.SphereGeometry(0.18, 10, 8), toon(0x6b4423), 1.1); c.position.set((i - 1) * 0.25, -0.25, 0.1 * i); top.add(c); }
    return g; }
  H.add(palm(-3.3, 0.35)); H.add(palm(3.3, -0.35));
  { // hammock ribbon
    const pts = []; const N = 24; for (let i = 0; i <= N; i++) { const u = i / N; pts.push([lerp(-3.0, 3.0, u), 2.35 - 1.15 * Math.sin(Math.PI * u)]); }
    const pos = [], idx = []; pts.forEach(([x, y], i) => { pos.push(x, y, -0.55, x, y, 0.55); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const hm = new THREE.Mesh(g, toon(0xe0613a, { side: THREE.DoubleSide })); hm.castShadow = true; H.add(hm);
    const edge = (z) => { const e = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, z))), 24, 0.04, 6), BLACK); H.add(e); }; edge(-0.55); edge(0.55);
    for (const [x, z] of [[-3.0, 0.5], [3.0, 0.5], [-3.0, -0.5], [3.0, -0.5]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 5), BLACK); r.position.set(x * 1.06, 2.5, z * 0.8); r.rotation.z = x > 0 ? -0.9 : 0.9; H.add(r); }
  }
  const hStars = []; { const R = rng(21); for (let i = 0; i < 26; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.2 + R() * 0.15), new THREE.MeshBasicMaterial({ color: 0xfff3a0 })); s.scale.z = 0.3; s.position.set(300 - 12 + R() * 24, 6 + R() * 9, -30); s.userData = { ph: R() * 6 }; scene.add(s); hStars.push(s); } }
  const hSun = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40), new THREE.MeshBasicMaterial({ color: 0xffb35a })); hSun.position.set(296, 4.2, -34); scene.add(hSun);

  // ---------- helpers ----------
  function show(...on) { for (const g of [V, W, H, E.group]) g.visible = on.includes(g); const hs = on.includes(H); hStars.forEach(s => s.visible = hs); hSun.visible = hs; }
  function lightFor(origin, off, color, inten, h = 1.5) { aimSun(origin, off, color, inten); hemi.intensity = h; }
  const wake = (r, lt) => { const e0 = r.eyes; };
  function blink(r, on) { for (const { e } of r.eyes) e.scale.y = on ? 0.1 : 1; }
  function lieDown(r, x, z, k) { // k: 1 = lying on the grass, 0 = standing
    const a = (1 - ease(k)) * 0; r.root.position.set(x, lerp(0.52, 0, ease(1 - k)), z); r.root.rotation.z = lerp(Math.PI / 2, 0, ease(1 - k)); }

  return [
    // 1 – darkness; a single golden glow; the Storyteller floats, amazed
    (lt, d, t) => {
      show(V); scene.background = black; lightFor(V.position, new THREE.Vector3(0, 8, 8), 0x6a5a8a, 0.35, 0.28);
      voidGlow.position.set(0, 2.4, -1.5); voidGlow.scale.setScalar(1.6 + Math.sin(t * 2.2) * 0.2); voidGlow.material.opacity = 0.85;
      voidLight.intensity = 3 + 2 * Math.sin(t * 2.2);
      stV.rest(); stV.root.position.set(0, 0.7 + Math.sin(t * 1.4) * 0.14, 0); stV.root.rotation.set(0, Math.sin(t * 0.7) * 0.35, Math.sin(t * 0.9) * 0.04);
      stV.expr('open', 1); stV.look(0, 0.4); stV.arms.forEach(a => { a.sh.rotation.set(-0.15, 0, a.side * (0.65 + Math.sin(t * 1.6) * 0.08)); a.el.rotation.x = -0.4; });
      stV.legs.forEach((l, i) => { l.hip.rotation.x = Math.sin(t * 1.4 + i) * 0.12; l.knee.rotation.x = 0.25; });
      camera.position.set(V.position.x, 2.6, lerp(8.2, 6.6, ease(lt / d))); camera.lookAt(V.position.x, 2.4, 0); camera.fov = 42;
    },
    // 2 – "Let there be light": the glow explodes; the Storyteller shields his eyes, grinning
    (lt, d, t) => {
      show(V); const k = ease(lt / 0.7); scene.background = black.clone().lerp(gold, k); lightFor(V.position, new THREE.Vector3(0, 8, 8), 0xfff0c0, 0.4 + 2.4 * k, 0.3 + 1.9 * k);
      voidGlow.position.set(0, 2.4, -1.5); voidGlow.scale.setScalar(lerp(1.6, 40, k)); voidGlow.material.opacity = 1; voidLight.intensity = 3 + 40 * k;
      stV.rest(); stV.root.position.set(0, 0.7 + Math.sin(t * 1.4) * 0.1, 0); stV.root.rotation.set(0, 0.2, 0);
      stV.expr('smile', 0.8); blink(stV, k > 0.2); stV.look(0.3, 0);
      stV.arms[1].sh.rotation.set(-2.5 * Math.min(1, k * 2), 0, 0.15); stV.arms[1].el.rotation.x = -0.9; stV.arms[0].sh.rotation.set(-0.2, 0, -0.5);
      stV.legs.forEach((l, i) => { l.hip.rotation.x = Math.sin(t * 1.4 + i) * 0.1; l.knee.rotation.x = 0.25; });
      camera.position.set(V.position.x, 2.6, 6.6 - 0.4 * ease(lt / d)); camera.lookAt(V.position.x, 2.4, 0); camera.fov = 42;
    },
    // 3 – sky, sparkling sea; the land rises into hills; trees pop up like popcorn
    (lt, d, t) => {
      show(W); blink(stV, false); scene.background = SKIES.day; lightFor(new THREE.Vector3(10, 0, -8), new THREE.Vector3(-12, 22, 14), 0xfff0d0, 2.4, 1.5);
      const u = lt / d; hills.forEach((h, i) => { const k = easeOutBack(clamp((u - 0.08 - i * 0.07) / 0.3)); h.scale.set(1, Math.max(k, 0.001), 1); });
      trees.forEach(({ t: tr, p, i }) => { const st = 0.42 + i * 0.045; const k = easeOutBack(clamp((u - st) / 0.1)); tr.scale.setScalar(Math.max(k, 0.001));
        const pu = clamp((u - st) / 0.12); p.visible = pu > 0 && pu < 1; if (p.visible) { p.scale.setScalar(1.2 + pu * 3.2); p.material.opacity = 1 - pu; } });
      animals.forEach(a => a.root.visible = false); adam.root.visible = eve.root.visible = stW.root.visible = false; sun.visible = moon.visible = sunGlow.visible = false; stars.forEach(s => s.visible = false); fish.forEach(f => f.root.visible = false); birds.forEach(b => b.root.visible = false);
      worldGlow.visible = false; tear.visible = false;
      sparkles.forEach(s => { s.material.opacity = 0.3 + 0.7 * Math.max(0, Math.sin(t * 3 + s.userData.ph)); });
      foam.position.x = 6.1 + Math.sin(t * 1.6) * 0.18;
      camera.position.set(lerp(2.2, 4.6, ease(u)), lerp(3.2, 3.8, ease(u)), 10); camera.lookAt(lerp(9, 12, ease(u)), 2.6, -8); camera.fov = 52;
    },
    // 4 – sun and moon side by side, stars; fish leap from the sea; birds soar
    (lt, d, t) => {
      show(W); scene.background = SKIES.day; lightFor(new THREE.Vector3(-4, 0, -6), new THREE.Vector3(-10, 22, 14), 0xfff0d0, 2.2, 1.5);
      hills.forEach(h => h.scale.set(1, 1, 1)); trees.forEach(({ t: tr, p }) => { tr.scale.setScalar(1); p.visible = false; });
      animals.forEach(a => a.root.visible = false); adam.root.visible = eve.root.visible = stW.root.visible = false; worldGlow.visible = false; tear.visible = false;
      const u = lt / d; sun.visible = moon.visible = sunGlow.visible = true; stars.forEach(s => { s.visible = u > 0.28; s.scale.setScalar(clamp((u - 0.28) / 0.1) * (0.9 + 0.2 * Math.sin(t * 5 + s.userData.ph))); });
      sun.position.y = lerp(3, 9.5, ease(u / 0.35)); sunGlow.position.y = sun.position.y; moon.position.y = lerp(4, 11.5, ease(u / 0.35));
      sparkles.forEach(s => { s.material.opacity = 0.3 + 0.7 * Math.max(0, Math.sin(t * 3 + s.userData.ph)); });
      fish.forEach((f, i) => { const st = 2.0 + i * 0.7; const v = (lt - st) / 1.3; f.root.visible = v > 0 && v < 1;
        if (!f.root.visible) return; const x = -9 + (i % 3) * 2.8 + v * 3.2, y = 4.2 * 4 * v * (1 - v); f.root.position.set(x, y + 0.2, -3.5 - (i % 2) * 2.4); f.root.rotation.z = (1 - 2 * v) * -0.9; f.tail.rotation.y = Math.sin(t * 25) * 0.5; });
      birds.forEach((b, i) => { const v = ((lt * 0.14 + i * 0.17) % 1); b.root.visible = lt > 0.8; b.root.position.set(-16 + v * 30, 7.5 + Math.sin(i * 2.1 + t) * 0.7 + (i % 3) * 1.1, -14 - (i % 4) * 3); b.root.rotation.y = 0; b.flap(t * 9 + i); });
      camera.position.set(-3, 2.0, 4); camera.lookAt(-3, 6.6, -38); camera.fov = 52;
    },
    // 5 – animals of every kind; then a stickman and a stickwoman wake up, blinking with wonder
    (lt, d, t) => {
      show(W); scene.background = SKIES.day; lightFor(new THREE.Vector3(14, 0, -4), new THREE.Vector3(-12, 22, 14), 0xfff0d0, 2.4, 1.6);
      hills.forEach(h => h.scale.set(1, 1, 1)); trees.forEach(({ t: tr, p }) => { tr.scale.setScalar(1); p.visible = false; });
      sun.visible = moon.visible = sunGlow.visible = false; stars.forEach(s => s.visible = false); fish.forEach(f => f.root.visible = false); birds.forEach(b => b.root.visible = false); worldGlow.visible = false; stW.root.visible = false; tear.visible = false;
      const u = lt / d; animals.forEach((a, i) => { a.root.visible = true; const st = 0.04 + i * 0.06; const k = easeOutBack(clamp((u - st) / 0.16)); a.root.scale.setScalar(Math.max(k, 0.001) * a.sc); a.root.position.set(a.x, 0, a.z); a.root.rotation.y = a.ry;
        a.walk(t * 4 + i, 0.35); if (a.k === 'rabbit') a.root.position.y = Math.abs(Math.sin(t * 6 + i)) * 0.25; a.head.rotation.z = Math.sin(t * 1.5 + i) * 0.08; });
      adam.root.visible = eve.root.visible = true; adam.rest(); eve.rest();
      const k = clamp((u - 0.45) / 0.35); const standK = 1 - ease(k);
      lieDown(adam, 13.5, -2.0, standK); lieDown(eve, 15.1, -2.0, standK);
      const bl = (Math.sin(t * 5) > 0.93 || (u > 0.45 && u < 0.6 && Math.sin(t * 22) > 0.4)); blink(adam, bl); blink(eve, bl);
      adam.expr(k > 0.5 ? 'open' : 'flat', 0.8 * k); eve.expr(k > 0.5 ? 'open' : 'flat', 0.8 * k); adam.look(0.2, 0.6); eve.look(-0.2, 0.6);
      if (k >= 1) { adam.arms[1].sh.rotation.set(-0.3, 0, 2.3 + Math.sin(t * 6) * 0.2); adam.arms[1].el.rotation.z = 0.5; eve.arms[0].sh.rotation.set(-0.3, 0, -2.3 - Math.sin(t * 6) * 0.2); eve.arms[0].el.rotation.z = -0.5; adam.expr('smile', 1); eve.expr('smile', 1); }
      adam.root.rotation.y = lerp(0, 0.25, 1 - standK) * 0 + 0.15; eve.root.rotation.y = -0.15;
      camera.position.set(lerp(14.6, 14.3, u), lerp(3.4, 2.8, u), lerp(11.5, 9.0, ease(u))); camera.lookAt(14.3, 1.9, -3.5); camera.fov = 54;
    },
    // 6 – the whole new world glows; the Storyteller wipes a happy tear
    (lt, d, t) => {
      show(W); scene.background = SKIES.endcard; lightFor(new THREE.Vector3(14, 0, -2), new THREE.Vector3(-10, 18, 12), 0xffe0a0, 2.6, 1.7);
      hills.forEach(h => h.scale.set(1, 1, 1)); trees.forEach(({ t: tr, p }) => { tr.scale.setScalar(1); p.visible = false; });
      sun.visible = moon.visible = sunGlow.visible = false; stars.forEach(s => s.visible = false); fish.forEach(f => f.root.visible = false);
      birds.forEach((b, i) => { b.root.visible = true; const a = t * 0.5 + i * 0.9; b.root.position.set(16 + Math.cos(a) * 9, 8 + Math.sin(a * 2) * 0.8 + i * 0.4, -10 + Math.sin(a) * 4); b.root.rotation.y = -a - Math.PI / 2 * 0; b.root.rotation.y = -(a + Math.PI / 2); b.flap(t * 9 + i); });
      worldGlow.visible = true; worldGlow.material.opacity = 0.65 + 0.15 * Math.sin(t * 2);
      animals.forEach((a, i) => { a.root.visible = true; a.root.scale.setScalar(a.sc); a.root.position.set(a.x, 0, a.z); a.root.rotation.y = a.ry; a.walk(t * 3 + i, 0.2); if (a.k === 'rabbit') a.root.position.y = Math.abs(Math.sin(t * 5 + i)) * 0.2; });
      adam.root.visible = eve.root.visible = true; adam.rest(); eve.rest(); adam.root.position.set(13.5, 0, -2.0); eve.root.position.set(15.1, 0, -2.0); adam.root.rotation.set(0, 0.15, 0); eve.root.rotation.set(0, -0.15, 0);
      adam.arms[1].sh.rotation.set(-0.3, 0, 2.3 + Math.sin(t * 5) * 0.25); adam.arms[1].el.rotation.z = 0.5; eve.arms[0].sh.rotation.set(-0.3, 0, -2.3 - Math.sin(t * 5) * 0.25); eve.arms[0].el.rotation.z = -0.5; adam.expr('smile', 1); eve.expr('smile', 1);
      stW.root.visible = true; stW.rest(); stW.root.position.set(12.5, 0, 5.2); stW.root.rotation.y = 0.45; stW.expr('smile', 1); stW.look(0.3, 0.2);
      const w = Math.sin(t * 7) * 0.12; stW.arms[0].sh.rotation.set(-1.75, 0, 0.25 + w); stW.arms[0].el.rotation.set(-1.85, 0, 0); stW.arms[1].sh.rotation.set(-0.2, 0, 0.3); stW.headG.rotation.z = -0.1;
      stW.body.position.y = Math.sin(t * 2) * 0.03; const tu = (lt * 0.8) % 1; tear.visible = lt > 0.6; tear.position.set(0.24, 2.72 - tu * 0.9, 0.55).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.45).add(stW.root.position); tear.scale.setScalar(1.2);
      camera.position.set(lerp(13.4, 14.2, ease(lt / d)), lerp(3.4, 3.8, ease(lt / d)), 12.4); camera.lookAt(14.2, 2.3, -3); camera.fov = 56;
    },
    // 7 – the seventh day: sunset, Storyteller rests in a hammock, book on his chest
    (lt, d, t) => {
      show(H); scene.background = SKIES.sunset; lightFor(H.position, new THREE.Vector3(14, 8, -16), 0xffa060, 2.2, 1.2);
      stH.rest(); stHp.position.set(1.7, 1.75, 0); stH.root.position.set(0, 0, 0); stH.root.rotation.set(-Math.PI / 2, 0, 0); stH.expr('smile', 0.4); stH.look(0, 0.2);
      stH.arms.forEach(a => { a.sh.rotation.set(-0.35, 0, a.side * 0.18); a.el.rotation.x = -0.9; }); stH.headG.rotation.y = -1.25;
      const closed = lt > 2.0; blink(stH, closed); stHp.position.y = 1.75 + Math.sin(t * 1.2) * 0.03;
      hStars.forEach(s => { s.scale.setScalar((0.25 + 0.75 * clamp((lt - 2.5) / 3)) * (0.85 + 0.25 * Math.sin(t * 4 + s.userData.ph))); });
      camera.position.set(H.position.x + lerp(0.6, -0.3, ease(lt / d)), 2.4, lerp(13.5, 12.0, ease(lt / d))); camera.lookAt(H.position.x + 0.1, 2.3, 0); camera.fov = 46;
    },
    // 8 – end card
    (lt, d, t) => { show(E.group); hStars.forEach(s => s.visible = false); E.update(lt); },
  ];
}
