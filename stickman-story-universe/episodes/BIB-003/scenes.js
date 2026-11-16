// BIB-003 – The Serpent's Trick. Source: Genesis 3:1-13 (KJV).
// God is never drawn as a figure: only a soft glowing light approaching. The Storyteller hosts the end card.
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture,
    makeStick, STORYTELLER, ADAM, EVE, makeSnake, drop } = ctx;
  const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const glowTex = radialTexture('rgba(255,236,160,1)', 'rgba(255,200,80,0)');
  const sprite = (tex) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));

  const G = new THREE.Group(); scene.add(G);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), toon(0x7fc060)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
  [[-9, -14, 5.5], [9, -18, 7], [24, -12, 5], [-20, -20, 7]].forEach(([x, z, r]) => { const h = outlined(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x6fb352), 1.01); h.position.set(x, 0, z); G.add(h); });
  // small background trees
  [[-6, -9], [7, -12], [-12, -6], [14, -8]].forEach(([x, z], i) => { const g = new THREE.Group(); const tr = outlined(new THREE.CylinderGeometry(0.17, 0.26, 3, 8), toon(0x8a5a36), 1.06); tr.position.y = 1.5; g.add(tr);
    for (let k = 0; k < 3; k++) { const c = outlined(new THREE.SphereGeometry(0.9, 14, 10), toon(k % 2 ? 0x5aa84a : 0x6bb85a), 1.05); c.position.set((k - 1) * 0.5, 3.2 + k * 0.15, 0); g.add(c); } g.position.set(x, 0, z); G.add(g); });

  // the tree in the middle of the garden
  const T = V3(2.6, 0, -2.2);
  const tree = new THREE.Group(); tree.position.copy(T); G.add(tree);
  const trunk = outlined(new THREE.CylinderGeometry(0.34, 0.5, 4.2, 10), toon(0x8a5a36), 1.05); trunk.position.y = 2.1; tree.add(trunk);
  [[0, 5.0, 0, 1.5], [-1.2, 4.6, 0.2, 1.1], [1.2, 4.7, -0.1, 1.2], [0.1, 5.8, 0, 1.1], [-0.6, 5.3, 0.9, 0.95], [0.9, 5.2, 0.9, 0.9]].forEach(([x, y, z, r], i) => {
    const c = outlined(new THREE.SphereGeometry(r, 18, 12), toon(i % 2 ? 0x4f9a42 : 0x5fb04a), 1.04); c.position.set(x, y, z); tree.add(c); });
  const fruitMat = toon(0xd9302a);
  const fruits = [[-0.9, 3.55, 0.55], [0.7, 3.8, 0.75], [-0.3, 3.9, 0.95], [1.3, 3.7, 0.2], [-1.4, 4.1, -0.2]].map(([x, y, z]) => { const f = outlined(new THREE.SphereGeometry(0.2, 14, 10), fruitMat, 1.1); f.position.set(x, y, z); tree.add(f); return f; });
  const forb = fruits[0]; // the forbidden fruit
  const sparks = Array.from({ length: 8 }, (_, i) => { const s = sprite(glowTex); s.userData = { a: i / 8 * Math.PI * 2 }; tree.add(s); return s; });
  const eatenA = outlined(new THREE.SphereGeometry(0.2, 14, 10), fruitMat, 1.1), eatenB = outlined(new THREE.SphereGeometry(0.2, 14, 10), fruitMat, 1.1); G.add(eatenA); G.add(eatenB);
  const fruitGlow = sprite(glowTex); tree.add(fruitGlow);

  // the serpent
  const sn = makeSnake(0x4fae4a, 40); G.add(sn.root);
  const coil = (hx, hy, hz, t, wob = 0.1) => s => { const a = 0.24;
    if (s < a) { const u = s / a; return V3(lerp(hx, 0.5, u), lerp(hy, 2.9, u) + Math.sin(u * Math.PI) * 0.22, lerp(hz, 0, u) + Math.sin(u * 6 - t * 4) * wob * u); }
    const v = (s - a) / (1 - a), ang = v * 2.2 * Math.PI * 2; return V3(Math.cos(ang) * 0.52, 2.9 - v * 2.6, Math.sin(ang) * 0.52); };
  const faceHead = (dx, dz) => { sn.segs[0].rotation.y = Math.atan2(-dz, dx); };

  // people
  const adam = makeStick(ADAM), eve = makeStick(EVE); G.add(adam.root); G.add(eve.root);
  const stW = makeStick(STORYTELLER); // unused in the garden (end card hosts)
  void stW;
  // fig-leaf flyers and a bush
  const leaves = Array.from({ length: 8 }, (_, i) => { const l = outlined(new THREE.SphereGeometry(0.2, 10, 8), toon(0x4f9a3f), 1.1); l.scale.set(1, 0.14, 0.7); G.add(l); return l; });
  const bush = new THREE.Group(); G.add(bush);
  [[0, 0.7, 0, 0.95], [-0.9, 0.55, 0.1, 0.7], [0.9, 0.55, 0.15, 0.75], [-0.4, 1.15, 0, 0.6], [0.5, 1.1, 0.1, 0.55]].forEach(([x, y, z, r], i) => { const c = outlined(new THREE.SphereGeometry(r, 16, 12), toon(i % 2 ? 0x3f8f3c : 0x4fa046), 1.05); c.position.set(x, y, z); bush.add(c); });
  const light = sprite(glowTex); G.add(light);
  const lightPt = new THREE.PointLight(0xffe0a0, 0, 40, 1.3); G.add(lightPt);
  const sweat = drop(); G.add(sweat);
  const blink = (r, on) => { for (const { e } of r.eyes) e.scale.y = on ? 0.1 : 1; };
  const pt = (r, dir, a = 0) => { r.arms[dir > 0 ? 1 : 0].sh.rotation.set(0, 0, dir * 1.58); r.arms[dir > 0 ? 1 : 0].el.rotation.set(0, 0, 0); };

  function show(on) { G.visible = on; E.group.visible = !on; }
  function env(sky, col = 0xfff0d0, inten = 2.4, h = 1.5, off = V3(-10, 20, 14)) { scene.background = sky; aimSun(V3(0, 0, 0), off, col, inten); hemi.intensity = h; }
  function resetAll() { eatenA.visible = eatenB.visible = false; leaves.forEach(l => l.visible = false); bush.visible = false; light.visible = false; lightPt.intensity = 0; sweat.visible = false;
    fruits.forEach(f => f.visible = true); fruitGlow.visible = false; sparks.forEach(s => s.visible = false); adam.root.visible = eve.root.visible = true; adam.root.rotation.set(0, 0, 0); eve.root.rotation.set(0, 0, 0); adam.root.position.set(0, 0, 0); eve.root.position.set(0, 0, 0);
    adam.rest(); eve.rest(); blink(adam, false); blink(eve, false); sn.root.position.copy(T); sn.root.rotation.set(0, 0, 0); sn.root.visible = true; sn.segs[0].rotation.set(0, 0, 0); }

  return [
    // 1 – the serpent on the tree, grinning at us
    (lt, d, t) => { show(true); resetAll(); env(SKIES.day); const u = lt / d;
      adam.root.visible = eve.root.visible = false;
      sn.pose(coil(-0.55, 3.15 + Math.sin(t * 2) * 0.05, 0.85, t)); faceHead(0.25, 1);
      fruitGlow.visible = true; fruitGlow.position.copy(forb.position); fruitGlow.scale.setScalar(1.0 + 0.2 * Math.sin(t * 3)); fruitGlow.material.opacity = 0.7;
      camera.position.set(lerp(T.x - 0.4, T.x - 1.2, ease(u)), lerp(3.4, 3.2, u), lerp(8.4, 6.0, ease(u))); camera.lookAt(T.x - 0.2, 3.3, T.z); camera.fov = 46; },
    // 2 – the question: the serpent leans down to Eve
    (lt, d, t) => { show(true); resetAll(); env(SKIES.day); const u = lt / d, k = ease(clamp(lt / 0.8));
      sn.pose(coil(lerp(-0.55, -1.5, k), lerp(3.15, 2.75, k), lerp(0.85, 0.7, k), t, 0.05)); faceHead(-1, -0.15);
      eve.root.position.set(0.15, 0, 0.9); eve.root.rotation.y = 1.15; eve.expr('open', 0.6); eve.look(0.7, -0.1); eve.headG.rotation.z = 0.08;
      adam.root.visible = false; fruitGlow.visible = true; fruitGlow.position.copy(forb.position); fruitGlow.scale.setScalar(0.9 + 0.15 * Math.sin(t * 3)); fruitGlow.material.opacity = 0.8;
      camera.position.set(0.7, 2.7, lerp(10.0, 9.0, ease(u))); camera.lookAt(0.7, 2.6, 0); camera.fov = 46; },
    // 3 – "Only that one"... the serpent tempts; sparkles around the fruit; Eve's eyes widen
    (lt, d, t) => { show(true); resetAll(); env(SKIES.day); const u = lt / d;
      sn.pose(coil(-1.5 + Math.sin(t * 3) * 0.12, 2.75 + Math.sin(t * 2.3) * 0.12, 0.7, t, 0.12)); faceHead(-1, -0.15 + Math.sin(t * 3) * 0.1);
      eve.root.position.set(0.15, 0, 0.9); eve.root.rotation.y = 1.0; const w = ease(clamp((u - 0.45) / 0.3)); eve.expr('open', 0.6 + 0.4 * w); eve.look(0.6, 0.25); eve.headG.rotation.z = 0.08 - 0.1 * w;
      if (u < 0.45) eve.arms[1].sh.rotation.set(-0.6, 0, 0.3 + 0.2 * Math.sin(t * 5));
      adam.root.visible = false; fruitGlow.visible = true; fruitGlow.position.copy(forb.position); fruitGlow.scale.setScalar(1.4 + 0.3 * Math.sin(t * 6)); fruitGlow.material.opacity = 0.95;
      sparks.forEach((s, i) => { s.visible = true; const a = s.userData.a + t * 2.5; s.position.set(forb.position.x + Math.cos(a) * 0.55, forb.position.y + Math.sin(a) * 0.55, forb.position.z + 0.2); s.scale.setScalar(0.35 + 0.2 * Math.sin(t * 8 + i)); s.material.opacity = 0.9; });
      camera.position.set(0.7, 2.8, lerp(9.2, 8.0, ease(u))); camera.lookAt(0.7, 2.8, 0); camera.fov = 46; },
    // 4 – she bites the fruit, then hands one to Adam, who bites too
    (lt, d, t) => { show(true); resetAll(); env(SKIES.day); const u = lt / d;
      sn.pose(coil(-1.5, 2.75, 0.7, t, 0.06)); faceHead(-1, 0.3);
      eve.root.position.set(0.1, 0, 0.9); eve.root.rotation.y = 0.3; adam.root.position.set(-1.9, 0, 0.9); adam.root.rotation.y = 0.5;
      fruits[0].visible = false; eatenA.visible = true; eatenB.visible = u > 0.5;
      const m = ease(clamp(u / 0.3));
      eatenA.position.set(lerp(T.x - 0.9, 0.35, m), lerp(3.55, 2.35, m), lerp(T.z + 0.55, 1.65, m)); eatenA.scale.setScalar(u > 0.38 ? 0.75 : 1);
      eve.expr(u > 0.3 ? 'smile' : 'open', 0.9); eve.look(0.2, 0.1); eve.arms[1].sh.rotation.set(-1.7 * m, 0, 0.35); eve.arms[1].el.rotation.set(-1.4 * m, 0, 0); eve.headG.rotation.x = u > 0.3 && u < 0.4 ? 0.2 : 0;
      const m2 = ease(clamp((u - 0.5) / 0.25)); eatenB.position.set(lerp(-0.1, -1.55, m2), lerp(2.0, 2.35, m2), 1.65); eatenB.scale.setScalar(u > 0.8 ? 0.75 : 1);
      adam.expr(u > 0.8 ? 'smile' : 'open', 0.8); adam.look(0.2, 0.1); adam.arms[1].sh.rotation.set(-1.7 * m2, 0, 0.3); adam.arms[1].el.rotation.set(-1.4 * m2, 0, 0);
      camera.position.set(-0.9, 2.6, 9.2); camera.lookAt(-0.9, 2.4, 0); camera.fov = 48; },
    // 5 – eyes opened: shame; fig leaves stitched together
    (lt, d, t) => { show(true); resetAll(); env(SKIES.day, 0xfff0d0, 2.0, 1.3); const u = lt / d;
      sn.pose(coil(-1.5, 2.9, 0.7, t, 0.06)); faceHead(0, 1);
      adam.root.position.set(-1.0, 0, 0.9); eve.root.position.set(0.8, 0, 0.9); adam.root.rotation.y = 0.45; eve.root.rotation.y = -0.45;
      const pop = easeOutBack(clamp(u / 0.18)); [adam, eve].forEach((r, i) => { const sg = i ? -1 : 1; r.expr('open', 1); r.look(sg * 0.2, -0.1); r.headG.rotation.z = sg * -0.12;
        r.arms[0].sh.rotation.set(-0.8, 0, 0.5); r.arms[1].sh.rotation.set(-0.8, 0, -0.5); r.arms[0].el.rotation.set(-1.3, 0, 0); r.arms[1].el.rotation.set(-1.3, 0, 0);
        r.root.position.x += Math.sin(t * 38 + i) * 0.025; r.body.position.y = -0.04 * pop + Math.abs(Math.sin(t * 6 + i)) * 0.01; });
      leaves.forEach((l, i) => { const who = i % 2 ? eve : adam, st = 0.2 + (i >> 1) * 0.09, k = ease(clamp((u - st) / 0.2)); l.visible = u > st;
        const a = i / 8 * 6.28; l.position.set(lerp(T.x - 1.2 + Math.cos(a) * 0.6, who.root.position.x + Math.cos(a) * 0.32, k), lerp(3.4, 1.05 + 0.1 * (i >> 1), k), lerp(T.z + 0.3, who.root.position.z + 0.34 + Math.sin(a) * 0.15, k)); l.rotation.set(0, a, 0.3 + k * 0.4); l.scale.set(1.8, 0.2, 1.2); });
      sweat.visible = true; sweat.position.set(adam.root.position.x - 0.7, 3.3 - ((lt * 0.9) % 1) * 0.5, adam.root.position.z + 0.2); sweat.scale.setScalar(1.3);
      camera.position.set(-0.1, 2.3, lerp(10.0, 9.0, ease(u))); camera.lookAt(-0.1, 2.2, 0); camera.fov = 48; },
    // 6 – they crouch behind a bush while a soft light comes walking
    (lt, d, t) => { show(true); resetAll(); env(SKIES.endcard, 0xffe8b0, 2.0, 1.5); const u = lt / d;
      sn.root.visible = false; bush.visible = true; bush.position.set(0, 0, 2.0);
      adam.root.position.set(-0.75, -0.95, 0.9); eve.root.position.set(0.7, -0.95, 0.9); adam.root.rotation.set(0, 0.2, 0); eve.root.rotation.set(0, -0.2, 0);
      [adam, eve].forEach((r, i) => { r.expr('open', 1); r.look(i ? -0.25 : 0.25, 0.1); r.arms.forEach(a => { a.sh.rotation.set(-0.5, 0, a.side * 0.9); a.el.rotation.x = -1.2; }); r.root.position.y += Math.sin(t * 5 + i) * 0.02; });
      light.visible = true; const k = ease(clamp(lt / 3.2)); light.position.set(lerp(6, 2.6, k), 2.8, -2); light.scale.setScalar(lerp(3, 7, k)); light.material.opacity = 0.9;
      lightPt.position.copy(light.position).add(V3(0, 0, 3)); lightPt.intensity = 18 * k;
      camera.position.set(0.4, 2.0, 9.0); camera.lookAt(0.6, 1.8, 0); camera.fov = 50; },
    // 7 – the blame game: Adam points at Eve, Eve points at the serpent, who shrugs
    (lt, d, t) => { show(true); resetAll(); env(SKIES.endcard, 0xffe8b0, 2.0, 1.5); const u = lt / d;
      adam.root.position.set(-1.3, 0, 0.8); eve.root.position.set(0.4, 0, 0.8); adam.root.rotation.y = 1.0; eve.root.rotation.y = 1.0; bush.visible = false;
      const a1 = ease(clamp((u - 0.05) / 0.12)), a2 = ease(clamp((u - 0.2) / 0.12));
      adam.expr(a1 > 0.5 ? 'smile' : 'open', 0.8); adam.look(0.6, 0.1); adam.arms[1].sh.rotation.set(-0.05, 0, 0.1 + 1.45 * a1 + Math.sin(t * 9) * 0.05 * a1); adam.arms[1].el.rotation.set(0, 0, 0);
      eve.expr('open', 0.8); eve.look(0.6, 0.1); eve.arms[1].sh.rotation.set(-0.05, 0, 0.1 + 1.45 * a2 + Math.sin(t * 9) * 0.05 * a2); eve.arms[1].el.rotation.set(0, 0, 0);
      sn.root.position.set(1.7, 0, 0.5); const sh = Math.sin(t * 3) * 0.5; const gp = s => V3(s * 3.0, s < 0.2 ? lerp(1.0, 0.22, s / 0.2) + 0.12 * Math.sin(t * 3) * (1 - s / 0.2) : 0.22, Math.sin(s * 10 - t * 3) * 0.4 * s);
      sn.pose(gp); sn.segs[0].rotation.set(sh * 0.2, Math.PI + 0.1, Math.sin(t * 3) * 0.35);
      light.visible = true; light.position.set(3.4, 2.6, -2); light.scale.setScalar(6 + 0.5 * Math.sin(t * 2.5)); light.material.opacity = 0.85; lightPt.position.set(3, 2.4, 3); lightPt.intensity = 16;
      camera.position.set(0.9, 2.3, lerp(11.5, 10.5, u)); camera.lookAt(0.9, 1.8, 0); camera.fov = 50; },
    // 8 – end card
    (lt, d, t) => { show(false); light.visible = false; lightPt.intensity = 0; E.update(lt); },
  ];
}
