// NAS-002 – Thank God Camels Can't Fly. Source: The Turkish Jester, tr. George Borrow (1884).
// Nasreddin invents a very silly thing to be grateful for. Gentle, respectful tone.
import { anatolia } from '../../engine/sets/anatolia.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, rng, clamp, ease, easeOutBack, lerp, toon, outlined, makeStick, makeAnimal, NASREDDIN, drop } = ctx;
  const T = anatolia(ctx); const G = T.group;
  const E = endcard(ctx, NASREDDIN);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const nas = makeStick(NASREDDIN); G.add(nas.root);
  const DAIS_TOP = 0.6;

  // ---- the crowd, as in NAS-001 ----
  const crowd = [];
  { const R = rng(31); const robes = [0x3d7ea6, 0xc8553d, 0x8e5ba8, 0x2a9d8f, 0xe0a030, 0x6d6875, 0x4f8a4b, 0xb5455a, 0x5a6fa8];
    const spots = []; const arc = (rad, ths) => ths.forEach(th => { const a = th * Math.PI / 180; spots.push([rad * Math.sin(a), -4 + rad * Math.cos(a)]); });
    arc(5.2, [-75, -60, -45, -30, 30, 45, 60, 75]); arc(7.4, [-65, -50, -35, 35, 50, 65]); arc(5.2, [-14, 14]);
    spots.forEach(([x, z], i) => { const k = R(); const woman = i % 5 === 2;
      const o = woman ? { robe: robes[i % robes.length], robeLong: true, veil: [0xd9a6a0, 0x9fc1d6, 0xe8d9a0][i % 3], seed: 80 + i }
        : { robe: robes[i % robes.length], beard: k < 0.5 ? 0x3b2a1a : null, hair: k > 0.5 ? 0x2a1a10 : null, hat: k < 0.35 ? 0xb5262e : null, turban: k > 0.7 ? [0xf4efe4, 0xd9c9a0, 0x9fc1d6][i % 3] : null, seed: 80 + i };
      const r = makeStick(o); G.add(r.root); crowd.push({ r, x, z, ph: R() * 6 }); });
  }
  const faceDais = (c, x, z) => { c.r.root.rotation.y = Math.atan2(0 - x, -4 - z); };

  // ---- dream houses with winged camels (scenes 4–5) ----
  const dream = new THREE.Group(); G.add(dream);
  function makeHouse(w, h, wallCol, domeCol, flat = false) { const g = new THREE.Group();
    const body = outlined(new THREE.BoxGeometry(w, h, 3), toon(wallCol), 1.02); body.position.y = h / 2; g.add(body);
    const roof = new THREE.Group(); roof.position.y = h; g.add(roof);
    const dome = outlined(new THREE.SphereGeometry(w * 0.48, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(domeCol), 1.03); roof.add(dome); dome.visible = !flat;
    const slab = outlined(new THREE.BoxGeometry(w + 0.25, 0.16, 3.25), toon(0xd2b078), 1.03); slab.position.y = 0.08; roof.add(slab);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.1), toon(0x4a3426)); door.position.set(0, 0.8, 1.52); g.add(door);
    for (const sx of [-1, 1]) { const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.08), toon(0x35566a)); win.position.set(sx * w * 0.3, h * 0.62, 1.52); g.add(win); }
    const chim = outlined(new THREE.BoxGeometry(0.4, 0.9, 0.4), toon(0xb8aa94), 1.05); chim.position.set(w * 0.3, 0.45, -0.4); roof.add(chim);
    return { g, body, roof, h }; }
  const h1 = makeHouse(3.0, 3.4, 0xf1e3c8, 0x6aa6a6, true), h2 = makeHouse(2.8, 3.0, 0xd98a5a, 0xb8b0a0, true);
  h1.g.position.set(1.7, 0, -9.0); h2.g.position.set(4.6, 0, -9.6); dream.add(h1.g); dream.add(h2.g);
  const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.38 })); cloud.scale.set(5.4, 4.6, 0.2); cloud.position.set(3.1, 4.6, -12.6); dream.add(cloud);
  const bubbles = [[-0.3, 4.7, 0.16], [0.35, 5.35, 0.24], [1.0, 6.1, 0.34]].map(([x, y, r]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })); b.position.set(x, y, -3.3); dream.add(b); return b; });
  function wingedCamel(scale) { const c = makeAnimal('camel'); c.root.scale.setScalar(scale); const wings = [];
    for (const sd of [-1, 1]) { const w = new THREE.Group(); w.position.set(0.05, 1.9, sd * 0.42); c.root.add(w);
      for (let i = 0; i < 5; i++) { const f = outlined(new THREE.SphereGeometry(0.2, 10, 8), toon(i % 2 ? 0xffffff : 0xf4efe4), 1.1); f.scale.set(0.5, 1.9, 0.3); f.position.set((i - 2) * 0.17, 0.5 + Math.abs(i - 2) * -0.08, sd * 0.22); f.rotation.z = (i - 2) * 0.22; w.add(f); }
      wings.push({ w, sd }); }
    return { c, wings }; }
  const flap = (wc, t, k = 1) => wc.wings.forEach(({ w, sd }) => { w.rotation.x = sd * (0.5 + Math.sin(t * 7) * 0.7 * k); });
  const wc1 = wingedCamel(0.9), wc2 = wingedCamel(0.85), wc3 = wingedCamel(0.8);
  [wc1, wc2, wc3].forEach(w => dream.add(w.c.root));
  const runners = [makeStick({ robe: 0xc8553d, beard: 0x3b2a1a, seed: 91 }), makeStick({ robe: 0x3d7ea6, hair: 0x2a1a10, seed: 92 })]; runners.forEach(r => dream.add(r.root));

  // ---- Nasreddin's roof (scene 7) ----
  const roofHouse = makeHouse(4.0, 2.8, 0xe9d3a8, 0x6aa6a6); roofHouse.g.position.set(0, 0, -8.5); G.add(roofHouse.g); roofHouse.roof.visible = false;
  const parapet = outlined(new THREE.BoxGeometry(4.2, 0.18, 3.2), toon(0xd2b078), 1.03); parapet.position.set(0, 2.9, 0); roofHouse.g.add(parapet);
  const tray = outlined(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16), toon(0xd9a441), 1.05); tray.position.set(1.05, 3.02, 0.2); roofHouse.g.add(tray);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.2, 10), toon(0xc2402a)); glass.position.set(1.05, 3.15, 0.2); roofHouse.g.add(glass);
  const camel = makeAnimal('camel'); camel.root.scale.setScalar(1.1); G.add(camel.root);
  const steam = [0, 1, 2].map(() => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); G.add(s); return s; });

  function base(t) {
    scene.background = SKIES.desert; aimSun(V3(0, 0, -2), V3(-12, 22, 14), 0xfff0d0, 2.4);
    G.visible = true; E.group.visible = false; T.dais.visible = true; dream.visible = false; roofHouse.g.visible = false; camel.root.visible = false; steam.forEach(s => s.visible = false);
    nas.rest(); nas.root.visible = true; nas.root.rotation.set(0, 0, 0); nas.root.position.set(0, DAIS_TOP, -4); nas.expr('smile', 0.3); nas.look(0, 0); nas.headG.rotation.set(0, 0, 0);
    for (const c of crowd) { c.r.rest(); c.r.root.visible = true; c.r.root.position.set(c.x, 0, c.z); faceDais(c, c.x, c.z); c.r.body.position.y = Math.sin(t * 2 + c.ph) * 0.025; c.r.expr('flat', 0); c.r.look(0, 0.2); c.r.headG.rotation.set(0, 0, 0); for (const { e } of c.r.eyes) e.scale.y = 1; }
  }
  function speak(r, t, k = 1) { r.arms[1].sh.rotation.set(-0.35, 0, (1.5 + Math.sin(t * 3.2) * 0.4) * k); r.arms[1].el.rotation.z = 0.6; r.arms[0].sh.rotation.set(-0.7 + Math.sin(t * 2.4) * 0.2, 0, -0.5 * k); r.expr('open', 0.5); }

  return [
    // 1 – Nasreddin stands on the dais with a very serious face; the crowd waits
    (lt, d, t) => { base(t); const u = ease(lt / d);
      nas.expr('flat', 0.9); nas.look(0, 0.1); nas.arms.forEach(a => { a.sh.rotation.set(-0.3, 0, a.side * 0.2); a.el.rotation.x = -1.2; }); nas.root.position.y = DAIS_TOP + Math.sin(t * 1.5) * 0.02;
      camera.position.set(lerp(-1.4, -0.4, u), 4.6, lerp(11.8, 10.6, u)); camera.lookAt(0, 2.9, -4); camera.fov = 42; },
    // 2 – "My friends, let us give thanks…": the crowd leans in closer
    (lt, d, t) => { base(t); const u = ease(lt / d), k = ease(clamp(lt / 2.5));
      for (const c of crowd) { const sc = lerp(1.3, 1.0, k); const x = c.x * sc, z = -4 + (c.z + 4) * sc; c.r.root.position.set(x, 0, z); faceDais(c, x, z); c.r.headG.rotation.x = 0.1 * k; c.r.expr('smile', 0.5); }
      speak(nas, t, 1); nas.expr('open', 0.6);
      camera.position.set(lerp(-0.6, 0.4, u), 4.4, lerp(11.6, 10.4, u)); camera.lookAt(0, 2.8, -4); camera.fov = 44; },
    // 3 – "…that camels do not have wings!" arms to the sky; the crowd blinks
    (lt, d, t) => { base(t); const k = easeOutBack(clamp(lt / 0.8)); const bl = lt > 1.8 && (lt % 0.9) < 0.18;
      nas.arms.forEach(a => { a.sh.rotation.set(-0.2, 0, a.side * (0.4 + 2.3 * Math.min(k, 1)) + Math.sin(t * 5) * 0.05); a.el.rotation.x = -0.2; }); nas.headG.rotation.x = -0.35 * Math.min(k, 1); nas.expr('open', 0.9); nas.look(0, 0.6);
      for (const c of crowd) { c.r.expr('flat', 1); for (const { e } of c.r.eyes) e.scale.y = bl ? 0.1 : 1; c.r.headG.rotation.z = Math.sin(t * 1.2 + c.ph) * 0.05; }
      camera.position.set(0, lerp(3.4, 3.0, ease(lt / d)), 10.4); camera.lookAt(0, 3.6, -4); camera.fov = 46; },
    // 4 – "Imagine if they did": a thought-cloud of winged camels perched on roofs
    (lt, d, t) => { base(t); const u = lt / d, pop = easeOutBack(clamp((lt - 0.2) / 0.8)); crowd.forEach(c => c.r.root.visible = false);
      dream.visible = true; h1.roof.scale.set(1, 1, 1); h1.body.scale.y = 1; h1.roof.position.y = h1.h; h2.roof.position.y = h2.h; h2.body.scale.y = 1; h2.roof.scale.set(1, 1, 1); runners.forEach(r => r.root.visible = false);
      nas.root.position.set(-1.0, DAIS_TOP, -4); nas.root.rotation.y = 0.5; nas.expr('smile', 0.9); nas.look(0.4, 0.4); nas.arms[1].sh.rotation.set(-0.3, 0, 2.0); nas.arms[1].el.rotation.z = 0.4; nas.arms[0].sh.rotation.set(-0.5, 0, -0.6);
      bubbles.forEach((b, i) => b.scale.setScalar(clamp((lt - 0.1 - i * 0.25) / 0.3) * (1 + 0.05 * Math.sin(t * 3 + i)))); cloud.scale.set(5.4 * pop, 4.6 * pop, 0.2);
      [[wc1, h1, 0.2], [wc2, h2, -0.2]].forEach(([wc, h, rot], i) => { wc.c.root.visible = true; wc.c.root.scale.setScalar(Math.max(pop, 0.001) * 0.9); wc.c.root.position.set(h.g.position.x + (i ? 0.2 : -0.2), h.h + 0.16, h.g.position.z); wc.c.root.rotation.set(0, i ? 0.3 : -0.2, 0); wc.c.walk(0, 0); flap(wc, t + i, 1); wc.c.head.rotation.z = Math.sin(t * 2 + i) * 0.1; });
      wc3.c.root.visible = true; const fx = lerp(7.5, -1.5, ease(u)); wc3.c.root.scale.setScalar(0.8); wc3.c.root.position.set(fx, 7.4 + Math.sin(t * 3) * 0.25, -8.0); wc3.c.root.rotation.set(0, Math.PI, 0); wc3.c.walk(t * 6, 0.5); flap(wc3, t, 1.3);
      camera.position.set(1.7, 3.8, 10.4); camera.lookAt(1.7, 3.6, -6); camera.fov = 48; },
    // 5 – the roof caves in under a camel; people run out of the house
    (lt, d, t) => { base(t); const u = lt / d, cv = ease(clamp((u - 0.15) / 0.5)); crowd.forEach(c => c.r.root.visible = false); nas.root.visible = false;
      dream.visible = true; bubbles.forEach(b => b.visible = false); cloud.scale.set(5.4, 4.6, 0.2);
      h1.body.scale.y = lerp(1, 0.6, cv); h1.roof.position.y = h1.h * lerp(1, 0.6, cv); h1.roof.scale.set(1 + 0.12 * cv, 1 - 0.3 * cv, 1 + 0.12 * cv);
      h2.body.scale.y = 1; h2.roof.position.y = h2.h; h2.roof.scale.set(1, 1, 1);
      wc1.c.root.visible = true; wc1.c.root.scale.setScalar(0.9); wc1.c.root.position.set(1.5 + Math.sin(t * 30) * 0.03 * (1 - cv), h1.h * lerp(1, 0.6, cv) + 0.16 - 0.1 * cv, -9.0); wc1.c.root.rotation.set(0, -0.2, 0.1 * cv); wc1.c.walk(0, 0); flap(wc1, t, 1 - cv * 0.6);
      wc2.c.root.visible = true; wc2.c.root.scale.setScalar(0.85); wc2.c.root.position.set(4.8, h2.h + 0.16, -9.6); wc2.c.root.rotation.set(0, 0.3, 0); wc2.c.walk(0, 0); flap(wc2, t + 1, 0.8); wc2.c.mouth.visible = Math.sin(t * 4) > 0.5;
      wc3.c.root.visible = false;
      runners.forEach((r, i) => { const run = clamp((u - 0.3 - i * 0.07) / 0.55); r.root.visible = run > 0; r.rest(); r.root.position.set(lerp(1.7, -1.5 - i * 1.3, ease(run)), Math.abs(Math.sin(t * 9 + i)) * 0.08, lerp(-7.3, -3.0 + i * 0.8, ease(run))); r.root.rotation.y = -1.0 + i * 0.4; r.walk(t * 10, 1.2); r.expr('open', 1); r.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * 2.5 + Math.sin(t * 12) * 0.2)); });
      camera.position.set(1.6, 3.4, 10.4); camera.lookAt(1.2, 3.0, -6); camera.fov = 48; },
    // 6 – the crowd looks up nervously, back at their roofs, then gives thanks (view from the dais)
    (lt, d, t) => { base(t); nas.root.visible = false; T.dais.visible = false; const u = lt / d; const up = u < 0.35, down = u >= 0.35 && u < 0.62, pray = u >= 0.62;
      for (const c of crowd) { c.r.root.rotation.y = Math.PI; c.r.expr(pray ? 'smile' : 'open', 0.8);
        c.r.headG.rotation.x = up ? -0.55 + Math.sin(t * 6 + c.ph) * 0.05 : down ? 0.3 : 0.25; c.r.headG.rotation.y = up ? Math.sin(t * 3 + c.ph) * 0.35 : 0;
        if (pray) { c.r.arms.forEach(a => { a.sh.rotation.set(-1.2, 0, a.side * 0.4); a.el.rotation.set(-1.6, 0, 0); }); c.r.body.position.y = -0.03; }
        else c.r.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * 0.2)); }
      camera.position.set(0, 4.6, lerp(-11.0, -10.2, u)); camera.lookAt(0, 2.4, 0.8); camera.fov = 58; },
    // 7 – Nasreddin on his roof with a glass of tea; a plain camel (no wings) strolls past below
    (lt, d, t) => { base(t); crowd.forEach(c => c.r.root.visible = false); T.dais.visible = false; roofHouse.g.visible = true;
      nas.rest(); nas.sit(); nas.root.position.set(-0.3, 3.55, -8.5); nas.root.rotation.y = 0.15; nas.expr('smile', 1); nas.look(0.2, 0.1);
      nas.arms[1].sh.rotation.set(-1.1, 0, 0.2 - 0.15 * Math.sin(t * 1.2)); nas.arms[1].el.rotation.set(-1.4, 0, 0); nas.arms[0].sh.rotation.set(-0.4, 0, -0.35);
      glass.visible = true; nas.root.updateMatrixWorld(true);
      steam.forEach((s, i) => { s.visible = true; const v = (t * 0.6 + i / 3) % 1; s.position.set(1.05 + Math.sin(v * 8) * 0.06, 3.5 + v * 0.7, -8.3); s.scale.setScalar(1 + v); s.material.opacity = 0.6 * (1 - v); });
      camel.root.visible = true; camel.root.position.set(lerp(-7.5, 7.5, lt / d), 0, -2.2); camel.root.rotation.y = 0; camel.walk(t * 5, 0.9); camel.head.rotation.z = Math.sin(t * 2.5) * 0.08;
      camera.position.set(0.3, 3.0, 9.5); camera.lookAt(0.3, 2.7, -5); camera.fov = 50; },
    // 8 – end card
    (lt, d, t) => { G.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
