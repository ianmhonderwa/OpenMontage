// GRM-005 – The Wolf and the Seven Young Kids. Source: Grimm, tr. Margaret Hunt (1884), tale 5. v2 look.
// Gentle: the swallowing is shown only as kids vanishing and a round belly; the "snipping" is a sparkle and the kids hopping out.
import { forest } from '../../engine/sets/forest.js';
import { endcard } from '../../engine/sets/endcard.js';
export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, easeOutBack, lerp, toon, makeAnimal, makeStick, STORYTELLER, drop } = ctx;
  const F = forest(ctx); const W = F.group; const O = F.origin; const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const mesh = (g, m) => { const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; return x; };
  W.children.slice().forEach(c => { const q = c.position; if (Math.abs(q.x) < 6 && q.z > -7 && q.z < 6 && !((c.geometry?.parameters?.width ?? 0) > 20 || (c.geometry?.parameters?.radius ?? 0) > 20)) c.visible = false; }); // clear set props around the cottage
  // ---- cottage (front wall cut away so we see inside) ----
  const C = new THREE.Group(); C.position.set(0, 0, -3); W.add(C);
  const floor = mesh(new THREE.BoxGeometry(7, 0.1, 5), toon(0x9a7a58)); floor.position.y = 0.05; C.add(floor);
  const backW = mesh(new THREE.BoxGeometry(7, 3.6, 0.25), toon(0xe6d3b0)); backW.position.set(0, 1.8, -2.5); C.add(backW);
  const sideL = mesh(new THREE.BoxGeometry(0.25, 3.6, 5), toon(0xdcc6a0)); sideL.position.set(-3.5, 1.8, 0); C.add(sideL);
  const sideR = mesh(new THREE.BoxGeometry(0.25, 3.6, 5), toon(0xdcc6a0)); sideR.position.set(3.5, 1.8, 0); C.add(sideR);
  const roof = mesh(new THREE.ConeGeometry(5.4, 2.4, 4), toon(0x8a4a2a)); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.75; roof.position.set(0, 4.8, -0.6); C.add(roof);
  const door = mesh(new THREE.BoxGeometry(0.15, 2.3, 1.2), toon(0x6b4423)); door.position.set(3.45, 1.2, 0.4); C.add(door);
  const win = mesh(new THREE.BoxGeometry(0.16, 0.8, 0.8), toon(0x9fd3ef)); win.position.set(3.45, 2.2, -1.4); C.add(win);
  const table = new THREE.Group(); table.position.set(-0.8, 0, 0.2); C.add(table); { const t = mesh(new THREE.BoxGeometry(1.8, 0.12, 1.0), toon(0x8a5a36)); t.position.y = 0.9; table.add(t); for (const [x, z] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) { const l = mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), toon(0x6b4423)); l.position.set(x, 0.45, z); table.add(l); } }
  const bed = mesh(new THREE.BoxGeometry(1.6, 0.6, 1.0), toon(0xb07d4f)); bed.position.set(-2.4, 0.3, -1.6); C.add(bed);
  const quilt = mesh(new THREE.BoxGeometry(1.5, 0.15, 0.95), toon(0xc8553d)); quilt.position.set(-2.4, 0.67, -1.6); C.add(quilt);
  const oven = mesh(new THREE.BoxGeometry(1.1, 1.3, 0.9), toon(0x8a8178)); oven.position.set(1.6, 0.65, -1.9); C.add(oven);
  const clock = new THREE.Group(); clock.position.set(0.3, 0, -2.2); C.add(clock); { const b = mesh(new THREE.BoxGeometry(0.6, 2.4, 0.4), toon(0x6b4423)); b.position.y = 1.2; clock.add(b); const f = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), toon(0xfff3d8)); f.rotation.x = Math.PI / 2; f.position.set(0, 2.0, 0.21); clock.add(f); }
  // ---- goats (lamb model as kids; bigger with horns as Mother) ----
  const mom = makeAnimal('lamb'); mom.root.scale.setScalar(2.0); C.add(mom.root);
  for (const sd of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(0.05, 0.3, 5), toon(0xd8cfb8)); h.position.set(0.05, 0.28, sd * 0.1); h.rotation.z = -0.5; mom.head.add(h); }
  const kidCols = [0xf4efe4, 0xe8dcc6, 0xd8c8a8, 0xf4efe4, 0xcbb894, 0xe8dcc6, 0xfaf6ee];
  const kids = kidCols.map(c => { const k = makeAnimal('lamb'); k.root.scale.setScalar(1.05); C.add(k.root); k.root.traverse(o => { if (o.isMesh && o.material?.color?.getHex?.() === 0xffffff) o.material = toon(c); }); return k; });
  const wolf = makeAnimal('wolf'); wolf.root.scale.setScalar(1.5); W.add(wolf.root);
  const belly = mesh(new THREE.IcosahedronGeometry(0.5, 1), toon(0x6b6f78)); wolf.root.add(belly); belly.position.set(-0.1, 0.55, 0);
  const pawsWhite = [];
  wolf.legs.forEach(l => { const p = mesh(new THREE.SphereGeometry(0.1, 6, 4), toon(0xffffff)); p.position.y = -0.48; l.add(p); pawsWhite.push(p); });
  const chalk = mesh(new THREE.BoxGeometry(0.1, 0.25, 0.1), toon(0xffffff)); W.add(chalk);
  const baker = makeStick({ robe: 0xf4efe4, inner: 0xffffff, hat: 0xffffff, seed: 81 }); W.add(baker.root);
  const flour = Array.from({ length: 10 }, () => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); W.add(s); return s; });
  const well = new THREE.Group(); well.position.set(-6, 0, -6); W.add(well); { const r = mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.9, 12, 1, true), toon(0x9a9389, { side: THREE.DoubleSide })); r.position.y = 0.45; well.add(r); const wt = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 12), toon(0x3d7ea6)); wt.position.y = 0.3; well.add(wt);
    for (const sd of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(0.15, 2, 0.15), toon(0x6b4423)); p.position.set(sd * 0.9, 1.4, 0); well.add(p); } const rf = mesh(new THREE.ConeGeometry(1.3, 0.7, 4), toon(0x8a4a2a)); rf.rotation.y = Math.PI / 4; rf.position.y = 2.7; well.add(rf); }
  const stones = Array.from({ length: 6 }, (_, i) => { const s = mesh(new THREE.DodecahedronGeometry(0.16, 0), toon(i % 2 ? 0x9a9389 : 0x7f786e)); W.add(s); return s; });
  const splash = Array.from({ length: 10 }, () => { const d = drop(); W.add(d); return d; });
  const sparkle = Array.from({ length: 6 }, () => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xffd23f })); s.scale.z = 0.3; W.add(s); return s; });

  const KX = i => -1.6 + (i % 4) * 0.8, KZ = i => 0.9 + Math.floor(i / 4) * 0.7;
  function reset(sky = SKIES.forest) { W.visible = true; E.group.visible = false; scene.background = sky; aimSun(O, V3(-8, 16, 12), 0xfff0d0, 2.6); hemi.intensity = 1.2;
    mom.root.visible = false; mom.root.rotation.set(0, 0, 0); mom.walk(0, 0); kids.forEach((k, i) => { k.root.visible = true; k.root.position.set(KX(i), 0.1, KZ(i)); k.root.rotation.set(0, Math.PI * 0.5, 0); k.walk(0, 0); k.mouth.visible = false; });
    wolf.root.visible = false; wolf.root.rotation.set(0, 0, 0); wolf.walk(0, 0); wolf.mouth.visible = false; belly.scale.setScalar(0.001); pawsWhite.forEach(p => p.visible = false); chalk.visible = false; baker.root.visible = false;
    flour.forEach(f => f.visible = false); stones.forEach(s => s.visible = false); splash.forEach(s => s.visible = false); sparkle.forEach(s => s.visible = false); door.rotation.y = 0; door.position.set(3.45, 1.2, 0.4); }
  const cam = (x, y, z, lx, ly, lz, fov = 50) => { camera.position.set(O.x + x, y, O.z + z); camera.lookAt(O.x + lx, ly, O.z + lz); camera.fov = fov; };
  const wolfAtDoor = () => { wolf.root.visible = true; wolf.root.position.set(4.6, 0, -2.4); wolf.root.rotation.y = Math.PI; };
  const openDoor = k => { door.rotation.y = -1.4 * k; door.position.set(3.45 + Math.sin(1.4 * k) * 0.6, 1.2, 0.4 + 0.6 - Math.cos(1.4 * k) * 0.6); };

  return [
    // 1 – Mother Goat warns the seven kids, then leaves through the door
    (lt, d, t) => { reset(); const u = lt / d; mom.root.visible = true; const k = clamp((u - 0.7) / 0.3); mom.root.position.set(lerp(1.4, 3.2, k), 0.1, lerp(0.8, 0.4, k)); mom.root.rotation.y = k > 0 ? 0 : Math.PI; mom.walk(t * 8, k > 0 ? 1 : 0); mom.mouth.visible = u < 0.7 && Math.sin(t * 10) > 0;
      openDoor(k); kids.forEach((kd, i) => { kd.head.rotation.z = Math.sin(t * 3 + i) * 0.1; }); cam(0.2, 3.2, 6.5, 0.2, 1.0, -2.6, 52); },
    // 2 – knock knock, a rough voice; the kids shake their heads
    (lt, d, t) => { reset(); wolfAtDoor(); wolf.mouth.visible = Math.sin(t * 10) > 0; wolf.root.position.x += Math.sin(t * 20) * 0.02 * (lt < 1.2 ? 1 : 0);
      kids.forEach((k, i) => { k.root.rotation.y = 0; k.head.rotation.y = Math.sin(t * 7 + i) * 0.5; k.mouth.visible = lt / d > 0.5; }); cam(1.4, 3.0, 6.8, 1.4, 1.0, -2.6, 54); },
    // 3 – the wolf eats chalk; then a black paw on the window sill
    (lt, d, t) => { reset(); const u = lt / d; wolfAtDoor(); if (u < 0.45) { chalk.visible = true; chalk.position.set(O.x + 4.0, 1.0, O.z - 2.4); wolf.mouth.visible = true; wolf.head.rotation.z = 0.3; }
      else { wolf.root.position.set(4.3, 0, -4.4); wolf.root.rotation.z = 0.9; kids.forEach((k, i) => { k.root.rotation.y = 0; k.mouth.visible = true; k.root.position.y = 0.1 + Math.abs(Math.sin(t * 8 + i)) * 0.15; }); }
      cam(1.6, 2.6, 5.8, 2.6, 1.4, -3.4, 50); },
    // 4 – the baker and miller whiten his paws; white paws, the kids open up
    (lt, d, t) => { reset(F === F ? SKIES.forest : SKIES.day); const u = lt / d;
      if (u < 0.55) { wolf.root.visible = true; wolf.root.position.set(7, 0, 1.5); wolf.root.rotation.y = Math.PI / 2; baker.root.visible = true; baker.root.position.set(8.3, 0, 1.5); baker.root.rotation.y = -Math.PI / 2; baker.arms[1].sh.rotation.set(-1.2 + Math.sin(t * 9) * 0.3, 0, 0.2);
        pawsWhite.forEach(p => p.visible = u > 0.3); flour.forEach((f, i) => { f.visible = u > 0.25; const v = (t * 1.2 + i / 10) % 1; f.position.set(O.x + 7.4 + Math.cos(i) * 0.5, 1.4 - v * 1.2, O.z + 1.5 + Math.sin(i) * 0.4); f.material.opacity = 0.7 * (1 - v); }); cam(7.4, 2.4, 9.0, 7.6, 1.2, 1.5, 50); }
      else { wolfAtDoor(); pawsWhite.forEach(p => p.visible = true); openDoor(ease(clamp((u - 0.6) / 0.25))); kids.forEach(k => { k.root.rotation.y = 0; }); cam(1.4, 3.0, 6.8, 1.6, 1.0, -2.6, 54); } },
    // 5 – kids hide everywhere; the wolf gobbles six (they vanish), sleeps under a tree; the youngest peeks from the clock
    (lt, d, t) => { reset(); const u = lt / d; pawsWhite.forEach(p => p.visible = true); openDoor(1);
      const spots = [V3(-0.8, 0.3, 0.2), V3(-2.4, 0.75, -1.6), V3(1.6, 1.4, -1.9), V3(-2.9, 0.1, 1.2), V3(2.6, 0.1, -1.0), V3(-1.4, 0.1, -2.0)];
      kids.forEach((k, i) => { if (i === 6) { k.root.visible = u > 0.75; k.root.position.set(0.3, 1.1, -2.0); k.root.rotation.y = 0; return; } k.root.position.copy(spots[i]); k.root.rotation.y = 0; k.root.visible = u < 0.4 + i * 0.05; });
      if (u < 0.6) { wolf.root.visible = true; wolf.root.position.set(lerp(3.0, -1, u / 0.6), 0, lerp(0.4, -0.5, u / 0.6)); wolf.root.rotation.y = Math.PI; wolf.walk(t * 8, 1); wolf.mouth.visible = true; belly.scale.setScalar(Math.max(0.001, u / 0.6)); cam(0.2, 3.2, 6.8, 0.2, 1.0, -2.4, 54); }
      else { wolf.root.visible = true; wolf.root.position.set(-4, 0, 3.5); wolf.root.rotation.y = 0.3; wolf.lie(1); belly.scale.setScalar(1); wolf.eyes.forEach(e => e.scale.y = 0.1); cam(-1.0, 3.0, 11.5, -3.6, 0.8, 3.0, 50); } },
    // 6 – Mother finds him snoring; snip (sparkles) and out hop the six kids; stones go in
    (lt, d, t) => { reset(); const u = lt / d; wolf.root.visible = true; wolf.root.position.set(-4, 0, 3.5); wolf.root.rotation.y = 0.3; wolf.lie(1); wolf.eyes.forEach(e => e.scale.y = 0.1); pawsWhite.forEach(p => p.visible = true); belly.scale.setScalar(1);
      mom.root.visible = true; mom.root.position.set(-2.6, 0, 4.4); mom.root.rotation.y = Math.PI + 0.4;
      sparkle.forEach((s, i) => { s.visible = u > 0.2 && u < 0.4; const a = i / 6 * 6.28 + t * 4; s.position.set(O.x - 4 + Math.cos(a) * 0.6, 1.2 + Math.sin(a) * 0.3, O.z + 3.5); });
      kids.forEach((k, i) => { if (i === 6) { k.root.position.set(-1.8, 0, 5.2); k.root.rotation.y = Math.PI; return; } const p = clamp((u - 0.35 - i * 0.04) / 0.2); k.root.visible = p > 0; k.root.position.set(-4 + lerp(0, -1.5 + i * 0.6, ease(p)), Math.sin(p * Math.PI) * 0.8, 3.5 + lerp(0, 1.4, ease(p))); k.root.rotation.y = Math.PI; });
      stones.forEach((s, i) => { s.visible = u > 0.75; const v = clamp((u - 0.75 - i * 0.03) / 0.1); s.position.set(O.x - 4 + (i - 3) * 0.12, lerp(1.4, 0.6, v), O.z + 3.5); });
      cam(-1.8, 3.2, 11.5, -3.4, 0.8, 3.8, 52); },
    // 7 – thirsty wolf at the well – splash – kids and mother dance around the well
    (lt, d, t) => { reset(SKIES.day); const u = lt / d; const fall = clamp((u - 0.25) / 0.15);
      wolf.root.visible = fall < 1; wolf.root.position.set(well.position.x + 1.2 - fall, fall * -1.2, well.position.z); wolf.root.rotation.z = -1.2 * fall; wolf.root.rotation.y = Math.PI; wolf.walk(t * 6, fall > 0 ? 0 : 0.8); belly.scale.setScalar(1);
      splash.forEach((s, i) => { s.visible = fall >= 1 && u < 0.6; const a = i / 10 * 6.28; const v = (u - 0.4) / 0.2; s.position.set(O.x + well.position.x + Math.cos(a) * 0.6 * v, 0.6 + Math.sin(v * Math.PI) * 1.6, O.z + well.position.z + Math.sin(a) * 0.6 * v); });
      mom.root.visible = true; const all = [mom, ...kids]; all.forEach((k, i) => { if (u < 0.45) { k.root.visible = i === 0 || i < 4; } const a = i / all.length * 6.28 + t * 1.2; k.root.position.set(well.position.x + Math.cos(a) * 2.4, Math.abs(Math.sin(t * 6 + i)) * 0.25, well.position.z + Math.sin(a) * 2.4); k.root.rotation.y = -a; k.walk(t * 10 + i, 1); });
      cam(-10.5, 4.2, 0.5, -6, 1.0, -6, 54); },
    (lt, d, t) => { W.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
