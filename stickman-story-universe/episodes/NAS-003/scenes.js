// NAS-003 – The Same Stars. Source: The Turkish Jester, tr. George Borrow (1884).
// In a proud new city, Nasreddin "proves" the air is the same as at home by counting the stars. Gentle, respectful tone.
import { anatolia } from '../../engine/sets/anatolia.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, outlined, makeStick, makeAnimal, NASREDDIN, questionMark } = ctx;
  const T = anatolia(ctx); const G = T.group;
  const E = endcard(ctx, NASREDDIN);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const nas = makeStick(NASREDDIN); G.add(nas.root);
  const donkey = makeAnimal('donkey'); G.add(donkey.root);
  const DAIS_TOP = 0.6;

  const crowd = [];
  { const R = rng(37); const robes = [0x3d7ea6, 0xc8553d, 0x8e5ba8, 0x2a9d8f, 0xe0a030, 0x6d6875, 0x4f8a4b, 0xb5455a, 0x5a6fa8];
    const spots = []; const arc = (rad, ths) => ths.forEach(th => { const a = th * Math.PI / 180; spots.push([rad * Math.sin(a), -4 + rad * Math.cos(a)]); });
    arc(5.2, [-75, -60, -45, -30, 30, 45, 60, 75]); arc(7.4, [-65, -50, -35, 35, 50, 65]); arc(5.2, [-14, 14]);
    spots.forEach(([x, z], i) => { const k = R(); const woman = i % 5 === 2;
      const o = woman ? { robe: robes[i % robes.length], robeLong: true, veil: [0xd9a6a0, 0x9fc1d6, 0xe8d9a0][i % 3], seed: 120 + i }
        : { robe: robes[i % robes.length], beard: k < 0.5 ? 0x3b2a1a : null, hair: k > 0.5 ? 0x2a1a10 : null, hat: k < 0.35 ? 0xb5262e : null, turban: k > 0.7 ? [0xf4efe4, 0xd9c9a0, 0x9fc1d6][i % 3] : null, seed: 120 + i };
      const r = makeStick(o); G.add(r.root); crowd.push({ r, x, z, ph: R() * 6 }); }); }
  const faceDais = (c, x, z) => { c.r.root.rotation.y = Math.atan2(0 - x, -4 - z); };

  // proud city: towers and a fountain behind the dais
  const city = new THREE.Group(); G.add(city);
  [[-6, -14, 9, 0xe9d3a8], [6.5, -15, 11, 0xd98a5a], [-2.5, -18, 7, 0xf1e3c8], [2.8, -17, 8.5, 0xcfb890]].forEach(([x, z, h, c]) => {
    const tw = outlined(new THREE.CylinderGeometry(0.9, 1.1, h, 16), toon(c), 1.02); tw.position.set(x, h / 2, z); city.add(tw);
    const cap = outlined(new THREE.ConeGeometry(1.25, 2.2, 16), toon(0x6aa6a6), 1.03); cap.position.set(x, h + 1.1, z); city.add(cap); });
  const fount = new THREE.Group(); fount.position.set(4.2, 0, -6.5); city.add(fount);
  { const basin = outlined(new THREE.CylinderGeometry(1.4, 1.5, 0.6, 24), toon(0xd8ccb4), 1.03); basin.position.y = 0.3; fount.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.05, 24), toon(0x5bb3e0)); water.position.y = 0.6; fount.add(water);
    const col = outlined(new THREE.CylinderGeometry(0.15, 0.2, 1.4, 10), toon(0xd8ccb4), 1.05); col.position.y = 1.2; fount.add(col); }
  const jets = Array.from({ length: 8 }, () => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xbfe6ff })); fount.add(s); return s; });

  // night roof + stars
  const roof = outlined(new THREE.BoxGeometry(4.2, 2.8, 3.2), toon(0xe9d3a8), 1.02); roof.position.set(0, 1.4, -8.0); G.add(roof);
  const stars = new THREE.Group(); G.add(stars);
  { const R = rng(77); for (let i = 0; i < 90; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.09 + R() * 0.1), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
    s.position.set((R() - 0.5) * 34, 6 + R() * 16, -22 - R() * 6); s.userData.ph = R() * 6; stars.add(s); } }
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d6 })); moon.position.set(-8, 16, -26); stars.add(moon);
  const tally = new THREE.Group(); G.add(tally); // tally marks floating near Nasreddin
  const marks = Array.from({ length: 10 }, (_, i) => { const m = outlined(new THREE.BoxGeometry(0.07, 0.55, 0.05), toon(0xfff3b0), 1.1); m.position.set((i % 5) * 0.22 + Math.floor(i / 5) * 1.3, 0, 0); if (i % 5 === 4) { m.rotation.z = 1.1; m.position.x -= 0.45; m.scale.y = 1.9; } tally.add(m); return m; });
  // two "skies" side by side (scene 5): two framed panels with matching star patterns
  const panels = new THREE.Group(); G.add(panels);
  for (const sx of [-1, 1]) { const p = new THREE.Group(); p.position.set(sx * 2.0, 4.6, -6); panels.add(p);
    const bg = outlined(new THREE.BoxGeometry(3.3, 3.3, 0.1), new THREE.MeshBasicMaterial({ color: 0x0f1d3d }), 1.04); p.add(bg);
    const R = rng(11); for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xfff3b0 })); s.position.set((R() - 0.5) * 2.8, (R() - 0.5) * 2.8, 0.1); p.add(s); }
    const lbl = outlined(new THREE.BoxGeometry(1.2, 0.5, 0.1), toon(sx < 0 ? 0x6aa6a6 : 0xd98a5a), 1.05); lbl.position.set(0, -2.0, 0.05); p.add(lbl); }
  const eq = new THREE.Group(); G.add(eq); for (const y of [0.18, -0.18]) { const b = outlined(new THREE.BoxGeometry(0.7, 0.16, 0.1), toon(0xffd23f), 1.08); b.position.y = y; eq.add(b); } eq.position.set(0, 4.6, -5.8);
  const qms = [questionMark(), questionMark(), questionMark()]; qms.forEach(q => G.add(q));

  function base(t, night = false) {
    scene.background = night ? SKIES.night : SKIES.desert; aimSun(V3(0, 0, -2), V3(-12, 22, 14), night ? 0x9fb4ff : 0xfff0d0, night ? 0.9 : 2.4); if (hemi) hemi.intensity = night ? 0.7 : 1.5;
    G.visible = true; E.group.visible = false; T.dais.visible = true; city.visible = !night; roof.visible = false; stars.visible = night; tally.visible = false; panels.visible = false; eq.visible = false; qms.forEach(q => q.visible = false); donkey.root.visible = false;
    nas.rest(); nas.root.visible = true; nas.root.rotation.set(0, 0, 0); nas.root.position.set(0, DAIS_TOP, -4); nas.expr('smile', 0.3); nas.look(0, 0); nas.headG.rotation.set(0, 0, 0);
    for (const c of crowd) { c.r.rest(); c.r.root.visible = true; c.r.root.position.set(c.x, 0, c.z); faceDais(c, c.x, c.z); c.r.body.position.y = Math.sin(t * 2 + c.ph) * 0.025; c.r.expr('smile', 0.2); c.r.look(0, 0.2); c.r.headG.rotation.set(0, 0, 0); }
    jets.forEach((j, i) => { const v = (t * 0.8 + i / 8) % 1, a = i / 8 * 6.28; j.position.set(Math.cos(a) * v * 0.9, 1.9 + v * 0.8 - v * v * 1.6, Math.sin(a) * v * 0.9); });
    stars.children.forEach(s => { if (s.userData.ph !== undefined) s.scale.setScalar(0.8 + 0.4 * Math.abs(Math.sin(t * 2 + s.userData.ph))); });
  }
  function speak(r, t, k = 1) { r.arms[1].sh.rotation.set(-0.35, 0, (1.5 + Math.sin(t * 3.2) * 0.4) * k); r.arms[1].el.rotation.z = 0.6; r.arms[0].sh.rotation.set(-0.7 + Math.sin(t * 2.4) * 0.2, 0, -0.5 * k); r.expr('open', 0.5); }

  return [
    // 1 – Nasreddin arrives with his donkey; proud citizens show off towers and fountain
    (lt, d, t) => { base(t); const u = lt / d; T.dais.visible = false; const k = ease(clamp(u / 0.6));
      nas.root.position.set(lerp(-6, -1.5, k), 0, -2.5); nas.root.rotation.y = Math.PI / 2 * (1 - k) + 0.3 * k; nas.walk(t * 8, 1 - k); nas.look(0.5, 0.6);
      donkey.root.visible = true; donkey.root.position.set(lerp(-7.6, -3.1, k), 0, -2.9); donkey.walk(t * 8, 1 - k);
      crowd.forEach((c, i) => { if (i > 5) { c.r.root.visible = false; return; } c.r.root.position.set(1.0 + (i % 3) * 1.4, 0, -3.0 - Math.floor(i / 3) * 1.4); c.r.root.rotation.y = -0.6; c.r.expr('smile', 0.8);
        c.r.arms[1].sh.rotation.set(-0.2, 0, 2.2 + Math.sin(t * 3 + i) * 0.3); });
      camera.position.set(0, 3.4, lerp(10.5, 9.5, ease(u))); camera.lookAt(0, 3.2, -6); camera.fov = 52; },
    // 2 – on the dais: "The air here is exactly like my home town"
    (lt, d, t) => { base(t); const u = ease(lt / d); speak(nas, t, 1); nas.arms[1].sh.rotation.set(-0.3, 0, 2.8); nas.arms[1].el.rotation.z = 0;
      camera.position.set(lerp(-0.6, 0.4, u), 7.0, lerp(12.6, 11.6, u)); camera.lookAt(0, 2.6, -4); camera.fov = 44; },
    // 3 – the crowd frowns, arms folded
    (lt, d, t) => { base(t); nas.expr('flat', 0.5); nas.look(0, -0.3);
      for (const c of crowd) { c.r.expr('frown', -0.7); c.r.arms.forEach(a => { a.sh.rotation.set(-1.25, 0, a.side * 0.35); a.el.rotation.set(-1.7, 0, 0); }); c.r.headG.rotation.z = Math.sin(t * 2 + c.ph) * 0.08; }
      camera.position.set(0, 4.6, -11.0); camera.lookAt(0, 2.2, 0.8); camera.fov = 58; nas.root.visible = false; T.dais.visible = false; },
    // 4 – flashback: night on a roof, Nasreddin counting stars (tally marks appear)
    (lt, d, t) => { base(t, true); const u = lt / d; crowd.forEach(c => c.r.root.visible = false); T.dais.visible = false; roof.visible = true;
      nas.root.position.set(0, 2.8, -6.9); nas.headG.rotation.x = -0.5; nas.look(0, 0.8); nas.expr('open', 0.6);
      nas.arms[1].sh.rotation.set(-0.3, 0, 2.6 + Math.sin(t * 8) * 0.25); nas.arms[1].el.rotation.z = 0.2;
      tally.visible = true; tally.position.set(1.0, 5.4, -6.6); const n = Math.floor(clamp(u / 0.9) * 10); marks.forEach((m, i) => m.visible = i < n);
      camera.position.set(0, 4.6, 3.0); camera.lookAt(0, 5.4, -12); camera.fov = 60; },
    // 5 – two skies, the same number of stars: an equals sign
    (lt, d, t) => { base(t, true); crowd.forEach(c => c.r.root.visible = false); T.dais.visible = false; const k = easeOutBack(clamp(lt / 0.8));
      panels.visible = true; panels.scale.setScalar(Math.min(k, 1.05)); eq.visible = lt > 1.2; eq.scale.setScalar(easeOutBack(clamp((lt - 1.2) / 0.5)));
      nas.root.position.set(0, 0, -4.2); speak(nas, t, 1); nas.expr('smile', 0.9);
      camera.position.set(0, 3.6, 7.6); camera.lookAt(0, 3.6, -6); camera.fov = 52; },
    // 6 – the crowd tries to argue, then looks up at the sky in silence (dusk)
    (lt, d, t) => { base(t); const u = lt / d; nas.expr('smile', 0.6); scene.background = u > 0.5 ? SKIES.sunset : SKIES.desert;
      for (const c of crowd) { if (u < 0.45) { c.r.expr('open', -0.5); c.r.arms[1].sh.rotation.set(-0.4, 0, 1.4 + Math.sin(t * 9 + c.ph) * 0.4); }
        else { c.r.expr('flat', 0.6); c.r.headG.rotation.x = -0.55; c.r.look(0, 0.9); } }
      nas.root.visible = false; T.dais.visible = false; qms.forEach((q, i) => { q.visible = u > 0.45; q.position.set(-3 + i * 3, 3.4 + Math.sin(t * 3 + i) * 0.15, 0.2); q.scale.setScalar(1.0); });
      camera.position.set(0, 4.6, lerp(-11.0, -10.2, u)); camera.lookAt(0, 2.6, 0.8); camera.fov = 58; },
    // 7 – moral: Nasreddin and the townspeople side by side under one starry sky
    (lt, d, t) => { base(t, true); T.dais.visible = false; nas.root.position.set(0, 0, -3.0); nas.expr('smile', 0.8); nas.headG.rotation.x = -0.25; nas.look(0, 0.5);
      crowd.forEach((c, i) => { if (i > 5) { c.r.root.visible = false; return; } const x = [-3.4, -2.2, -1.1, 1.1, 2.2, 3.4][i]; c.r.root.position.set(x, 0, -3.2 - Math.abs(x) * 0.15); c.r.root.rotation.y = 0; c.r.expr('smile', 0.6); c.r.headG.rotation.x = -0.25; c.r.look(0, 0.5);
        c.r.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * 0.9)); });
      nas.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * 0.9));
      camera.position.set(0, 2.6, lerp(7.0, 6.2, ease(lt / d))); camera.lookAt(0, 4.0, -8); camera.fov = 58; },
    // 8 – end card
    (lt, d, t) => { G.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
