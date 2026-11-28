// AES-003 – The Father and His Sons. Source: Aesop's Fables, tr. G. F. Townsend (1867).
// Three quarrelling sons cannot break a bundle of sticks, but snap single sticks easily: united they stand.
import { meadow } from '../../engine/sets/meadow.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, lerp, toon, outlined,
    makeStick, STORYTELLER, drop, questionMark } = ctx;
  const M = meadow(ctx); const W = M.group;
  const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  M.shadeTree.position.set(-5.5, 0, -6.5);

  const dad = makeStick({ robe: 0x7a5230, sash: 0x5a3a20, beard: 0xdcdcdc, bigBeard: true, seed: 31 }); W.add(dad.root);
  const sons = [
    makeStick({ robe: 0xc8323c, hair: 0x2a1a10, seed: 32 }),
    makeStick({ robe: 0x2f5fa8, hair: 0x6b4423, curls: true, seed: 33 }),
    makeStick({ robe: 0x3f8a3a, hair: 0x111111, seed: 34 }),
  ]; sons.forEach(s => W.add(s.root));
  const st = makeStick(STORYTELLER); W.add(st.root);
  const stickMat = toon(0x9a6b42);
  const mkStick = () => outlined(new THREE.CylinderGeometry(0.07, 0.07, 2.0, 8), stickMat, 1.12);
  // bundle: 7 sticks with a rope band
  const bundle = new THREE.Group(); W.add(bundle);
  for (let i = 0; i < 7; i++) { const s = mkStick(); const a = i / 7 * 6.28; const r = i === 0 ? 0 : 0.16; s.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); bundle.add(s); }
  for (const y of [-0.5, 0.5]) { const band = outlined(new THREE.TorusGeometry(0.24, 0.05, 6, 16), toon(0xe8d29a), 1.1); band.rotation.x = Math.PI / 2; band.position.y = y; bundle.add(band); }
  // single sticks: each made of two halves so they can snap
  const singles = [0, 1, 2].map(() => { const g = new THREE.Group(); const a = outlined(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 8), stickMat, 1.12); a.position.y = 0.5; const b = a.clone(); b.position.y = -0.5;
    const pa = new THREE.Group(), pb = new THREE.Group(); pa.add(a); pb.add(b); g.add(pa, pb); W.add(g); return { g, pa, pb }; });
  const sweat = [drop(), drop(), drop()]; sweat.forEach(d => W.add(d));
  const qm = questionMark(); W.add(qm);
  const sparks = Array.from({ length: 9 }, () => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: 0xffd23f })); s.scale.z = 0.3; W.add(s); return s; });
  const heart = new THREE.Group(); W.add(heart);
  { const m = toon(0xe8435a); for (const sd of [-1, 1]) { const b = outlined(new THREE.SphereGeometry(0.3, 14, 10), m, 1.06); b.position.set(sd * 0.22, 0.1, 0); heart.add(b); }
    const c = outlined(new THREE.ConeGeometry(0.42, 0.6, 14), m, 1.06); c.rotation.z = Math.PI; c.position.y = -0.3; heart.add(c); }

  const DAD = V3(1.55, 0, -3.8), SON = [V3(-2.4, 0, -3.4), V3(2.4, 0, -3.4), V3(0.9, 0, -2.6)];
  function reset() { W.visible = true; E.group.visible = false; st.root.visible = false; dad.root.visible = true; sons.forEach(s => { s.root.visible = true; s.rest(); s.expr('smile'); s.root.rotation.set(0, 0, 0); });
    dad.rest(); dad.expr('flat'); dad.root.rotation.set(0, 0, 0); dad.root.position.copy(DAD); bundle.visible = false; bundle.rotation.set(0, 0, 0);
    singles.forEach(s => { s.g.visible = false; s.pa.rotation.set(0, 0, 0); s.pb.rotation.set(0, 0, 0); s.g.rotation.set(0, 0, 0); });
    sweat.forEach(d => d.visible = false); qm.visible = false; sparks.forEach(s => s.visible = false); heart.visible = false;
    scene.background = SKIES.day; aimSun(V3(0, 0, -4), V3(-10, 20, 12), 0xfff0d0, 2.4); hemi.intensity = 1.5; }
  function cam(x, y, z, lx, ly, lz, fov = 46) { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; }
  const argue = (s, t, i) => { s.expr(Math.sin(t * 9 + i) > 0 ? 'open' : 'frown', -0.6); s.arms[i % 2].sh.rotation.z = (i % 2 ? 1 : -1) * (1.2 + Math.sin(t * 10 + i) * 0.5); s.body.rotation.z = Math.sin(t * 6 + i) * 0.06; };

  return [
    // 1 – three sons bicker in a circle; sparks fly
    (lt, d, t) => { reset(); const u = lt / d;
      sons.forEach((s, i) => { const a = i / 3 * 6.28 + 0.3; s.root.position.set(Math.cos(a) * 1.6, 0, -3.4 + Math.sin(a) * 1.0); s.root.rotation.y = -a - Math.PI / 2 + Math.PI; s.root.lookAt(0, 0, -3.4); argue(s, t, i); });
      dad.root.position.set(-3.4, 0, -6.0); dad.root.rotation.y = 0.5; dad.expr('frown', 0.4);
      sparks.forEach((s, i) => { s.visible = true; const a = i / 9 * 6.28 + t * 1.5; s.position.set(Math.cos(a) * 0.9, 2.9 + Math.sin(a * 2 + t * 3) * 0.3, -3.4 + Math.sin(a) * 0.5); s.scale.setScalar(0.8 + 0.3 * Math.sin(t * 9 + i)); s.scale.z = 0.3; });
      cam(0, 2.6, lerp(8.5, 7.0, ease(u)), 0, 1.4, -3.6, 46); },
    // 2 – the father pleads; they ignore him; he scratches his head (question mark)
    (lt, d, t) => { reset(); const u = lt / d; dad.root.position.set(lerp(-3.4, -1.2, ease(clamp(u / 0.3))), 0, -5.0); dad.walk(t * 8, u < 0.3 ? 1 : 0);
      if (u >= 0.3) { dad.expr(u < 0.65 ? 'open' : 'flat', 0.6); dad.arms[0].sh.rotation.z = -1.3 - Math.sin(t * 6) * 0.3; dad.arms[1].sh.rotation.z = 1.3 + Math.sin(t * 6) * 0.3; }
      if (u > 0.7) { dad.arms[1].sh.rotation.set(-0.4, 0, 2.6); dad.arms[1].el.rotation.set(-1.6, 0, 0.8); qm.visible = true; qm.position.set(-0.6, 3.6, -5.0); qm.scale.setScalar(1.2 + 0.1 * Math.sin(t * 6)); }
      sons.forEach((s, i) => { const a = i / 3 * 6.28 + 0.3; s.root.position.set(1.4 + Math.cos(a) * 1.4, 0, -3.4 + Math.sin(a) * 0.9); s.root.lookAt(1.4, 0, -3.4); argue(s, t, i); });
      cam(0.2, 2.4, 7.4, 0.2, 1.4, -4, 46); },
    // 3 – the bundle challenge: push, pull, sit
    (lt, d, t) => { reset(); const u = lt / d; dad.root.position.set(-3.2, 0, -5.2); dad.root.rotation.y = 0.5; dad.expr('smile', 0.3);
      sons.forEach((s, i) => { s.root.position.set(-1.4 + i * 1.9, 0, -3.4); s.expr('flat'); });
      bundle.visible = true; const ph = Math.min(2, Math.floor(u * 3)); const s = sons[ph]; s.expr('open', 0.5); s.root.position.x += 0;
      if (ph === 0) { bundle.position.set(s.root.position.x + 0.55, 1.4, -3.0); bundle.rotation.z = Math.PI / 2; s.arms[0].sh.rotation.set(-1.2, 0, -0.2); s.arms[1].sh.rotation.set(-1.2, 0, 0.2); s.body.rotation.x = 0.15 + Math.sin(t * 20) * 0.03; }
      if (ph === 1) { bundle.position.set(s.root.position.x, 1.5, -2.9); bundle.rotation.z = Math.PI / 2; s.arms[0].sh.rotation.set(-1.4, 0, -0.9 - Math.sin(t * 18) * 0.1); s.arms[1].sh.rotation.set(-1.4, 0, 0.9 + Math.sin(t * 18) * 0.1); s.body.rotation.x = -0.1; }
      if (ph === 2) { bundle.position.set(s.root.position.x, 0.25, -3.4); bundle.rotation.set(0, 0, Math.PI / 2); s.sit(); s.body.position.y = -0.3 + Math.abs(Math.sin(t * 12)) * 0.15; s.root.position.y = 0.0; }
      sweat.forEach((w, i) => { w.visible = true; const v = (t * 0.9 + i / 3) % 1; w.position.set(s.root.position.x + 0.35 + i * 0.15, 3.0 - v * 0.8, -3.0); w.scale.setScalar(1.1); });
      cam(0.3, 2.3, 7.0, 0.3, 1.2, -3.4, 46); },
    // 4 – nobody can break it; father unties it and hands out single sticks
    (lt, d, t) => { reset(); const u = lt / d; sons.forEach((s, i) => { s.root.position.set(-1.9 + i * 1.1, 0, -2.8); s.expr('frown', 0.2); s.body.rotation.z = -0.08; });
      dad.root.position.copy(DAD); dad.expr('smile', 0.4);
      if (u < 0.45) { bundle.visible = true; bundle.position.set(1.0, 1.3, -3.3); bundle.rotation.set(0, 0, Math.PI / 2 + Math.sin(t * 3) * 0.05); dad.arms[0].sh.rotation.set(-1.1, 0, -0.3); dad.arms[1].sh.rotation.set(-1.1, 0, 0.3); }
      else { const k = ease(clamp((u - 0.45) / 0.4)); singles.forEach((s, i) => { s.g.visible = true; const target = V3(-1.9 + i * 1.1 + 0.35, 1.3, -2.5); s.g.position.lerpVectors(V3(1.0 + (i - 1) * 0.25, 1.4, -3.3), target, k); s.g.rotation.z = Math.PI / 2 * k + 0.2 * (1 - k); });
        sons.forEach(s => { s.arms[1].sh.rotation.set(-1.0 * k, 0, 0.3); s.expr('smile', 0.6 * k); }); }
      cam(-0.2, 2.4, 7.4, -0.2, 1.3, -3.2, 50); },
    // 5 – snap, snap, snap
    (lt, d, t) => { reset(); const u = lt / d; dad.root.position.copy(DAD); dad.expr('smile', 0.5);
      sons.forEach((s, i) => { s.root.position.set(-1.9 + i * 1.1, 0, -2.8); const at = 0.15 + i * 0.25; const k = clamp((u - at) / 0.08);
        const sg = singles[i]; sg.g.visible = true; sg.g.position.set(s.root.position.x, 1.35, -2.4); sg.g.rotation.set(0, 0, Math.PI / 2);
        sg.pa.rotation.x = -0.9 * k; sg.pb.rotation.x = 0.9 * k; s.arms[0].sh.rotation.set(-1.1, 0, -0.3); s.arms[1].sh.rotation.set(-1.1, 0, 0.3);
        s.expr(k > 0.5 ? 'open' : 'flat', k); if (k > 0 && k < 1) sparks.slice(i * 3, i * 3 + 3).forEach((p, j) => { p.visible = true; p.position.set(s.root.position.x + (j - 1) * 0.3, 1.6 + j * 0.15, -2.2); p.scale.setScalar(0.9); p.scale.z = 0.3; }); });
      cam(-0.2, 2.3, 7.2, -0.2, 1.3, -3.0, 50); },
    // 6 – the father's lesson: sons gather close
    (lt, d, t) => { reset(); const u = lt / d; dad.root.position.set(0, 0, -4.4); dad.expr(Math.sin(t * 9) > 0 ? 'open' : 'smile', 0.5); dad.arms[0].sh.rotation.set(-0.6, 0, -1.2 - Math.sin(t * 3) * 0.2); dad.arms[1].sh.rotation.set(-0.6, 0, 1.2 + Math.sin(t * 3) * 0.2);
      const k = ease(clamp(u / 0.6)); sons.forEach((s, i) => { s.root.position.set(lerp([-2.8, -1.4, 1.8][i], [-1.6, -0.7, 1.4][i], k), 0, -2.9); s.root.lookAt(0, 0, -4.4); s.expr('smile', 0.3); s.arms[0].sh.rotation.z = -0.9 * k; s.arms[1].sh.rotation.z = 0.9 * k; });
      bundle.visible = u > 0.55; bundle.position.set(0, 0.3, -3.6); bundle.rotation.set(0, 0, Math.PI / 2);
      heart.visible = u > 0.7; heart.position.set(0, 4.1, -4.0); heart.scale.setScalar((0.8 + 0.08 * Math.sin(t * 6)) * ease(clamp((u - 0.7) / 0.1)));
      cam(0, 2.4, lerp(7.4, 6.4, ease(u)), 0, 1.5, -3.6, 46); },
    // 7 – moral: Storyteller in front; the family stands together behind
    (lt, d, t) => { reset(); st.root.visible = true; st.rest(); st.root.position.set(0.1, 0, -1.0); st.root.rotation.y = -0.1; st.expr('smile', 0.8);
      const w = Math.sin(t * 6) * 0.15; st.arms[1].sh.rotation.set(-0.3, 0, 2.55); st.arms[1].el.rotation.set(-1.6, 0, 0.9 + w); st.arms[0].sh.rotation.set(-0.2, 0, -0.35);
      dad.root.position.set(2.6, 0, -6.5); dad.expr('smile', 0.3); sons.forEach((s, i) => { s.root.position.set([-2.8, -1.6, 1.5][i], 0, -6.0); s.arms[0].sh.rotation.z = -0.9; s.arms[1].sh.rotation.z = 0.9; });
      cam(0, 2.0, 7.0, 0, 1.5, -2.5, 50); },
    // 8 – end card
    (lt, d, t) => { W.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
