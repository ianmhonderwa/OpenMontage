// GRM-004 – The Youth Who Went Forth to Learn What Fear Was. Source: Grimm, tr. Margaret Hunt (1884), tale 4.
// Spooky but gentle: ghosts are sheet-ghosts, cats are cartoon cats, the giant is a big bearded stick figure. No injuries shown.
import { castle } from '../../engine/sets/castle.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, easeOutBack, lerp, toon, outlined, radialTexture, makeStick, makeAnimal, makeFish, STORYTELLER, drop, questionMark } = ctx;
  const C = castle(ctx), E = endcard(ctx, STORYTELLER); const O = C.origin, W = C.group;
  W.children.slice().forEach(c => { const z = c.position.z; if (z > -3.4 && z < -1.0 && c.position.y < 3.2) c.visible = false; }); // hide the banquet table, its legs, cloth and candles
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const cam = (px, py, pz, lx, ly, lz, fov = 50) => { camera.position.set(O.x + px, py, O.z + pz); camera.lookAt(O.x + lx, ly, O.z + lz); camera.fov = fov; };
  const mk = o => { const r = makeStick(o); W.add(r.root); return r; };
  const boy = mk({ robe: 0x4f8a4b, hair: 0xf0c34a, seed: 201 });
  const dad = mk({ robe: 0x7a5230, beard: 0x9a9a9a, seed: 202 });
  const princess = mk({ robe: 0xf4b6c8, robeLong: true, hair: 0x2a1a10, longHair: true, crown: 0xe0b84a, crownSize: 0.75, seed: 203 });
  const giant = mk({ robe: 0x5a5a6e, beard: 0xf2f2f2, bigBeard: true, seed: 204 }); giant.root.scale.setScalar(1.9);
  // sheet ghosts
  const ghost = () => { const g = new THREE.Group(); const m = toon(0xffffff); const b = outlined(new THREE.CapsuleGeometry(0.55, 1.1, 8, 16), m, 1.05); b.position.y = 1.3; g.add(b);
    const hem = outlined(new THREE.ConeGeometry(0.75, 0.8, 16, 1, true), toon(0xffffff, { side: THREE.DoubleSide }), 1.05); hem.position.y = 0.5; g.add(hem);
    for (const sx of [-0.2, 0.2]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x111111 })); e.position.set(sx, 1.75, 0.52); g.add(e); } W.add(g); return g; };
  const ghosts = [ghost(), ghost(), ghost()];
  const cats = [makeAnimal('cat'), makeAnimal('cat')]; cats.forEach(c => { c.root.scale.setScalar(1.4); W.add(c.root); c.eyes?.forEach(e => e.material = new THREE.MeshBasicMaterial({ color: 0xff5a1f })); });
  const pins = Array.from({ length: 9 }, () => { const p = outlined(new THREE.CylinderGeometry(0.08, 0.16, 0.7, 10), toon(0xf4efe4), 1.08); W.add(p); return p; });
  const ball = outlined(new THREE.SphereGeometry(0.28, 14, 10), toon(0x8a5a36), 1.08); W.add(ball);
  const anvil = outlined(new THREE.BoxGeometry(1.4, 0.9, 0.7), toon(0x4a4f58), 1.05); W.add(anvil);
  const chest = outlined(new THREE.BoxGeometry(1.4, 0.9, 0.9), toon(0xb07d4f), 1.05); W.add(chest);
  const coins = Array.from({ length: 10 }, () => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), new THREE.MeshBasicMaterial({ color: 0xffd23f })); W.add(c); return c; });
  const bucket = outlined(new THREE.CylinderGeometry(0.4, 0.32, 0.6, 14, 1, true), toon(0x8a8f96, { side: THREE.DoubleSide }), 1.06); W.add(bucket);
  const fish = Array.from({ length: 5 }, () => { const f = makeFish(0xf29f05); f.root.scale.setScalar(0.6); W.add(f.root); return f; });
  const water = Array.from({ length: 12 }, () => { const d = drop(); W.add(d); return d; });
  const bed = W.children.find(c => c.type === 'Group' && c.position.x === -7.6);
  const shiver = Array.from({ length: 6 }, () => { const s = outlined(new THREE.BoxGeometry(0.05, 0.45, 0.05), toon(0x111111), 1.0); W.add(s); return s; });

  function reset(night = true) { W.visible = true; E.group.visible = false; scene.background = night ? SKIES.night : SKIES.day; aimSun(V3(O.x, 0, O.z), V3(O.x - 8, 18, O.z + 12), night ? 0xb8c4ff : 0xfff0d0, night ? 1.3 : 2.2); hemi.intensity = night ? 0.9 : 1.4;
    for (const r of [boy, dad, princess, giant]) { r.rest(); r.root.visible = false; r.root.rotation.set(0, 0, 0); r.expr('smile', 0.3); r.look(0, 0); }
    ghosts.forEach(g => g.visible = false); cats.forEach(c => { c.root.visible = false; c.root.rotation.set(0, 0, 0); }); pins.forEach(p => p.visible = false); ball.visible = false; anvil.visible = false; chest.visible = false; coins.forEach(c => c.visible = false);
    bucket.visible = false; fish.forEach(f => f.root.visible = false); water.forEach(d => d.visible = false); shiver.forEach(s => s.visible = false); if (bed) { bed.position.set(-7.6, 0, -4.2); bed.rotation.set(0, 0, 0); } }
  const bob = (g, t, i = 0) => { g.position.y = 0.3 + Math.sin(t * 3 + i) * 0.15; g.rotation.z = Math.sin(t * 2 + i) * 0.08; };

  return [
    // 1 – the fearless boy tells his father he wants to learn to shudder (daytime hall)
    (lt, d, t) => { reset(false); boy.root.visible = dad.root.visible = true; boy.root.position.set(-1.0, 0, 1.0); boy.root.rotation.y = 0.5; dad.root.position.set(1.2, 0, 0.6); dad.root.rotation.y = -0.6;
      boy.expr(Math.sin(t * 9) > 0 ? 'open' : 'smile', 0.6); boy.arms[1].sh.rotation.set(-0.3, 0, 2.2 + Math.sin(t * 4) * 0.2); dad.expr('frown', 0.6); dad.arms[0].sh.rotation.set(-0.6, 0, -1.4);
      cam(0, 2.4, 8.5, 0, 1.6, 0, 48); },
    // 2 – midnight on the stairs: a sheet ghost; the boy shoves it, it tumbles down
    (lt, d, t) => { reset(); const u = lt / d; const g = ghosts[0]; g.visible = true; const fall = clamp((u - 0.55) / 0.3);
      g.position.set(-3.5, 1.9 - fall * 1.6, -8.4 + fall * 2.5); g.rotation.set(fall * 3.5, 0, Math.sin(t * 2) * 0.08 * (1 - fall));
      boy.root.visible = true; boy.root.position.set(-3.5, 1.8 - (u > 0.5 ? 0 : 0), -8.2 + 1.0); boy.root.position.set(-2.2, 0, -5.4); boy.root.rotation.y = -0.7; boy.expr(u > 0.45 ? 'open' : 'flat', 0.2);
      if (u > 0.45 && u < 0.65) { boy.arms.forEach(a => a.sh.rotation.set(-1.5, 0, a.side * 0.1)); boy.body.rotation.x = 0.2; }
      cam(0.5, 3.4, 4.5, -2.8, 1.8, -7.0, 56); },
    // 3 – sent away; a carter points to the haunted castle (window shows night, the boy marches in)
    (lt, d, t) => { reset(); const u = lt / d; boy.root.visible = true; boy.root.position.set(lerp(4.2, 0.5, ease(clamp(u / 0.6))), 0, lerp(-7.6, 1.0, ease(clamp(u / 0.6)))); boy.root.rotation.y = Math.atan2(-3.7, 8.6) + Math.PI; boy.walk(t * 8, u < 0.6 ? 1 : 0);
      if (u >= 0.6) { boy.root.rotation.y = 0; boy.expr('smile', 0.8); boy.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * 1.0)); }
      cam(0, 3.0, 9.5, 0.5, 2.2, -3, 52); },
    // 4 – night one: fiery-eyed cats chased off; then the bed rolls round the hall with him in it
    (lt, d, t) => { reset(); const u = lt / d; boy.root.visible = true;
      if (u < 0.45) { cats.forEach((c, i) => { c.root.visible = true; const k = clamp(u / 0.45); c.root.position.set(lerp(1.5 + i, 9, ease(k)), 0, -1 - i * 1.2); c.root.rotation.y = 0; c.walk(t * 14 + i, 1.3); c.mouth.visible = true; });
        boy.root.position.set(lerp(-1, 3, clamp(u / 0.45)), 0, -1.6); boy.root.rotation.y = Math.PI / 2; boy.walk(t * 10, 1); boy.expr('open', -0.5); boy.arms[1].sh.rotation.set(-0.3, 0, 2.6); }
      else { const k = (u - 0.45) / 0.55, a = k * Math.PI * 1.6; if (bed) { bed.position.set(Math.cos(a) * 2.2, Math.abs(Math.sin(t * 12)) * 0.15, Math.sin(a) * 1.5 - 3.0); bed.rotation.y = -a; }
        boy.root.position.copy(bed ? bed.position : V3()); boy.root.position.y += 0.75; boy.root.rotation.y = -a; boy.sit(); boy.expr('smile', 1); boy.arms.forEach(s => s.sh.rotation.set(0, 0, s.side * 2.6)); }
      cam(0, 4.0, 10, 0, 1.4, -2.5, 56); },
    // 5 – night two: ghosts playing skittles; the boy joins in
    (lt, d, t) => { reset(); const u = lt / d; ghosts.forEach((g, i) => { g.visible = true; g.position.set(-3 + i * 1.6, 0, -4.8 + (i % 2) * 0.6); bob(g, t, i); g.rotation.y = 0.3; });
      pins.forEach((p, i) => { p.visible = true; const r = Math.floor(i / 3), c = i % 3; const hit = clamp((u - 0.75) / 0.1); p.position.set(1.4 + c * 0.45 + r * 0.22, 0.35, -2.0 - r * 0.45); p.rotation.z = hit * (c - 1 + 0.5) * 1.3; });
      boy.root.visible = true; boy.root.position.set(-1.6, 0, 0.6); boy.root.rotation.y = 1.3; boy.expr('smile', 1);
      const roll = clamp((u - 0.45) / 0.3); ball.visible = true; ball.position.set(lerp(-1.0, 1.8, roll), 0.28, lerp(0.6, -2.3, roll)); boy.arms[1].sh.rotation.set(u < 0.45 ? 0.6 : -1.2, 0, 0.3);
      cam(0.6, 3.4, 8.5, 0.4, 1.2, -2.0, 56); },
    // 6 – night three: the giant; his beard caught in the anvil; the boy opens the treasure chest
    (lt, d, t) => { reset(); const u = lt / d; giant.root.visible = true; giant.root.position.set(-2.4, 0, -4.2); giant.root.rotation.y = 0.4; anvil.visible = true; anvil.position.set(-0.9, 0.45, -2.6);
      const stuck = u > 0.35; giant.expr(stuck ? 'open' : 'frown', stuck ? 1 : -0.8); giant.body.rotation.x = stuck ? 0.45 + Math.sin(t * 10) * 0.04 : 0; giant.arms.forEach(a => a.sh.rotation.set(stuck ? -0.9 : 0, 0, a.side * (stuck ? 1.4 + Math.sin(t * 9) * 0.3 : 0.3)));
      boy.root.visible = true; boy.root.position.set(1.8, 0, -1.2); boy.root.rotation.y = -0.5; boy.expr('smile', 0.8);
      chest.visible = u > 0.6; chest.position.set(3.0, 0.45, -2.4); coins.forEach((c, i) => { c.visible = u > 0.65; const v = (t * 1.2 + i / 10) % 1; c.position.set(3.0 + Math.cos(i) * 0.6 * v, 1.0 + v * 1.4 - v * v * 1.2, -2.4 + Math.sin(i) * 0.4 * v); c.rotation.x = t * 5 + i; });
      cam(0.4, 3.8, 9.5, 0.2, 2.4, -2.6, 56); },
    // 7 – married; at night the princess tips cold water and fish over him; he finally shudders
    (lt, d, t) => { reset(); const u = lt / d; boy.root.visible = true; if (bed) bed.position.set(-1.2, 0, -3.0);
      boy.root.position.set(-1.2, 1.0, -2.8); boy.sit(); boy.root.rotation.y = 0; const wet = u > 0.45;
      princess.root.visible = true; princess.root.position.set(0.9, 0, -2.6); princess.root.rotation.y = -1.0; princess.expr('smile', 0.6);
      bucket.visible = true; const tip = ease(clamp((u - 0.3) / 0.15)); bucket.position.set(0.0, 2.9, -2.8); bucket.rotation.z = tip * 2.2; princess.arms.forEach(a => a.sh.rotation.set(-0.3, 0, a.side * 2.4));
      water.forEach((w, i) => { w.visible = u > 0.38 && u < 0.7; const v = (t * 2 + i / 12) % 1; w.position.set(-0.5 + (i % 4) * 0.25 - 0.4, 2.8 - v * 1.6, -2.8 + (i % 3) * 0.15); w.scale.setScalar(1.2); });
      fish.forEach((f, i) => { f.root.visible = u > 0.42; f.root.position.set(-1.8 + i * 0.4, 1.4 + Math.abs(Math.sin(t * 9 + i)) * 0.3, -2.6); f.root.rotation.z = Math.sin(t * 12 + i) * 0.8; });
      boy.expr(wet ? 'open' : 'smile', wet ? 1.2 : 0.2); boy.root.position.x += wet ? Math.sin(t * 40) * 0.05 : 0; if (wet) boy.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * (2.4 + Math.sin(t * 30) * 0.2)));
      shiver.forEach((s, i) => { s.visible = wet; const sd = i < 3 ? -1 : 1; s.position.set(-1.2 + sd * (0.9 + (i % 3) * 0.2), 2.5 + (i % 3) * 0.25, -2.6); s.rotation.z = sd * 0.3; });
      cam(-0.4, 3.0, 6.5, -0.4, 2.0, -2.8, 52); },
    // 8 – end card
    (lt, d, t) => { W.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
