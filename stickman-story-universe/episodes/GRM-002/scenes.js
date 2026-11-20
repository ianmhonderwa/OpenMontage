// GRM-002 – Cat and Mouse in Partnership. Source: Grimm, Household Tales, tr. Margaret Hunt (1884), tale 2.
// The Mouse's end is only implied: a pounce, a cloud of dust, and a very full cat.
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture,
    makeStick, makeAnimal, makeTree, column, STORYTELLER, drop } = ctx;
  const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const white = radialTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const sprite = (tex = white) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));

  // ===== C: the cottage, outdoors =====
  const C = new THREE.Group(); scene.add(C);
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(60, 64), toon(0x8fcf6a)); lawn.rotation.x = -Math.PI / 2; lawn.receiveShadow = true; C.add(lawn);
  [[-26, -30, 14], [4, -38, 18], [30, -34, 15]].forEach(([x, z, r]) => { const h = outlined(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x78b85a), 1.01); h.position.set(x, 0, z); C.add(h); });
  { const house = new THREE.Group(); house.position.set(-0.4, 0, -4.5); C.add(house);
    const wall = outlined(new THREE.BoxGeometry(5.2, 3.2, 3.6), toon(0xf0e0c0), 1.02); wall.position.y = 1.6; house.add(wall);
    const roof = outlined(new THREE.ConeGeometry(4.3, 2.4, 4), toon(0xc8553d), 1.03); roof.rotation.y = Math.PI / 4; roof.position.y = 4.4; roof.scale.z = 0.8; house.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.0, 0.1), toon(0x6b4423)); door.position.set(0, 1.0, 1.82); house.add(door);
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.08), toon(0x35566a)); w.position.set(sx * 1.7, 1.9, 1.82); house.add(w); } }
  [[-9, -9, 4.2], [8, -10, 4.6], [-13, -4, 4]].forEach(([x, z, h], i) => { const t = makeTree(h, 70 + i); t.position.set(x, 0, z); C.add(t); });

  // ===== K: the church interior (offset so lighting is separate) =====
  const K = new THREE.Group(); K.position.set(300, 0, 0); scene.add(K);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), toon(0xbfae92)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; K.add(floor);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { const t = new THREE.Mesh(new THREE.PlaneGeometry(4, 4.5), toon(0xa99878)); t.rotation.x = -Math.PI / 2; t.position.set(-10 + i * 4, 0.01, -6.75 + j * 4.5); K.add(t); }
  const bw = new THREE.Mesh(new THREE.BoxGeometry(24, 11, 0.5), toon(0xe6dcc6)); bw.position.set(0, 5.5, -7); bw.receiveShadow = true; K.add(bw);
  for (const x of [-7, 7]) { const c = column(9, 0.5); c.position.set(x, 0, -5.5); K.add(c); }
  { const win = outlined(new THREE.CylinderGeometry(1.7, 1.7, 0.2, 24), toon(0x4a90d9), 1.04); win.rotation.x = Math.PI / 2; win.position.set(0, 7.5, -6.7); K.add(win);
    for (const [r, col] of [[0.9, 0xe8c040], [0.4, 0xe0503a]]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 20), toon(col)); d.rotation.x = Math.PI / 2; d.position.set(0, 7.5, -6.65); K.add(d); } }
  // altar: a tall table; a cloth hangs from the front at the sides only so the pot is visible beneath
  const altar = new THREE.Group(); altar.position.set(0, 0, -3.0); K.add(altar);
  const top = outlined(new THREE.BoxGeometry(6.2, 0.3, 2.2), toon(0xf4efe4), 1.02); top.position.y = 2.7; altar.add(top);
  for (const [x, z] of [[-2.9, -0.9], [2.9, -0.9], [-2.9, 0.9], [2.9, 0.9]]) { const l = outlined(new THREE.BoxGeometry(0.28, 2.6, 0.28), toon(0x8a5a36), 1.05); l.position.set(x, 1.3, z); altar.add(l); }
  const runner = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 2.3), toon(0xb03030)); runner.position.set(0, 2.88, 0); altar.add(runner);
  for (const x of [-2.2, 2.2]) { const c = outlined(new THREE.CylinderGeometry(0.1, 0.12, 0.7, 8), toon(0xf4efe4), 1.05); c.position.set(x, 3.2, 0); altar.add(c); const f = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc040 })); f.scale.y = 1.6; f.position.set(x, 3.7, 0); altar.add(f); }
  // the pot of fat, with a fat level we can lower
  const pot = new THREE.Group(); pot.position.set(1.1, 0, -2.2); K.add(pot);
  const potBody = outlined(new THREE.CylinderGeometry(0.62, 0.5, 0.9, 20, 1, true), toon(0x9a6b42, { side: THREE.DoubleSide }), 1.04); potBody.position.y = 0.45; pot.add(potBody);
  const potBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 20), toon(0x9a6b42)); potBase.position.y = 0.03; pot.add(potBase);
  const fat = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.5, 0.8, 20), toon(0xfff3c4)); pot.add(fat);
  const fatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.02, 20), toon(0xfffbe0)); pot.add(fatTop);
  const setFat = (lv) => { const h = Math.max(0.001, 0.06 + 0.76 * lv); fat.scale.y = h / 0.8; fat.position.y = 0.04 + h / 2; fatTop.position.y = 0.04 + h; fat.visible = fatTop.visible = lv > 0.02; };

  // ===== characters =====
  const cat = makeAnimal('cat'); cat.root.scale.setScalar(1.15); const mouse = makeAnimal('mouse'); mouse.root.scale.setScalar(2.0);
  const st = makeStick(STORYTELLER); scene.add(st.root);
  const dust = Array.from({ length: 9 }, () => { const s = sprite(); scene.add(s); return s; });
  const stars = Array.from({ length: 4 }, () => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: 0xffd23f })); s.scale.z = 0.3; scene.add(s); return s; });
  const sweat = drop(); scene.add(sweat);

  const cam = (o, px, py, pz, lx, ly, lz, fov = 46) => { camera.position.set(o.x + px, py, o.z + pz); camera.lookAt(o.x + lx, ly, o.z + lz); camera.fov = fov; };
  function place(a, grp, x, z, ry, y = 0) { grp.add(a.root); a.root.position.set(x, y, z); a.root.rotation.set(0, ry, 0); }
  function reset() { cat.walk(0, 0); mouse.walk(0, 0); cat.head.rotation.set(0, 0, 0); mouse.head.rotation.set(0, 0, 0); cat.mouth.visible = mouse.mouth.visible = false; cat.tail.rotation.z = 0.5; mouse.tail.rotation.z = 0.5;
    for (const a of [cat, mouse]) a.eyes.forEach(e => e.scale.y = 1); dust.forEach(s => s.visible = false); stars.forEach(s => s.visible = false); sweat.visible = false; st.root.visible = false; E.group.visible = false; }
  const inC = () => { C.visible = true; K.visible = false; scene.background = SKIES.day; aimSun(V3(0, 0, -2), V3(-10, 20, 14), 0xfff0d0, 2.4); hemi.intensity = 1.5; };
  const inK = () => { C.visible = false; K.visible = true; scene.background = SKIES.forest; aimSun(K.position, V3(-6, 16, 12), 0xffe6b0, 1.8); hemi.intensity = 1.1; };
  const lick = (t, k = 1) => { cat.mouth.visible = Math.sin(t * 9) > 0; cat.head.rotation.z = -0.95 + Math.sin(t * 9) * 0.1 * k; };

  return [
    // 1 – outside the cottage: the Cat talks the Mouse into moving in together
    (lt, d, t) => { reset(); inC(); const u = lt / d; place(cat, C, -1.0, 1.6, 0.35); place(mouse, C, 1.2, 1.8, Math.PI - 0.35);
      cat.head.rotation.z = 0.1; cat.mouth.visible = Math.sin(t * 9) > 0 && u < 0.8; cat.tail.rotation.z = 0.5 + Math.sin(t * 3) * 0.3;
      mouse.root.position.y = Math.max(0, Math.sin(t * 6)) * 0.06 * (u > 0.55 ? 1 : 0); mouse.head.rotation.z = u > 0.55 ? 0.2 : 0;
      cam(C.position, 0.1, 2.0, lerp(13.5, 12.5, ease(u)), 0.1, 1.1, 0, 46); },
    // 2 – they carry a pot of fat to the church and tuck it under the altar
    (lt, d, t) => { reset(); inK(); const u = lt / d, w = ease(clamp(u / 0.55)); setFat(1); pot.position.set(lerp(-3.5, 1.1, w), 0, lerp(0.4, -2.2, w)); pot.position.y = w < 1 ? 0.9 : 0;
      place(cat, K, lerp(-5.2, -1.6, w), lerp(1.0, -0.6, w), 0); place(mouse, K, lerp(-3.9, -0.2, w) + 0, lerp(1.3, 0.3, w), 0); cat.walk(t * 6, w < 1 ? 0.7 : 0); mouse.walk(t * 9, w < 1 ? 0.8 : 0);
      cat.tail.rotation.z = 0.5; if (u > 0.7) { cat.head.rotation.z = 0.05; mouse.head.rotation.z = 0.25; }
      cam(K.position, 0.0, 2.4, 13.5, 0.0, 1.6, -2, 48); },
    // 3 – the Cat "goes to the christening" – straight to the church to lick the top off the fat
    (lt, d, t) => { reset(); const u = lt / d; const inChurch = u > 0.4;
      if (!inChurch) { inC(); place(cat, C, lerp(-1.0, 4.5, ease(clamp(u / 0.4))), 1.6, 0.35 * 0 + (u < 0.15 ? 0.3 : Math.PI / 2 * 0.0), 0); cat.root.rotation.y = u < 0.15 ? 0.3 : 0.05; cat.walk(t * 8, u > 0.15 ? 0.9 : 0); place(mouse, C, 1.6, 1.8, Math.PI - 0.5); mouse.head.rotation.z = 0.1; if (u < 0.15) { mouse.root.position.y = Math.abs(Math.sin(t * 5)) * 0.05; }
        cam(C.position, 1.5, 2.0, 13.0, 1.6, 1.1, 0, 48); }
      else { inK(); setFat(lerp(1, 0.78, ease(clamp((u - 0.55) / 0.35)))); pot.position.set(1.1, 0, -2.2); place(cat, K, 0.0, -0.9, 0); lick(t); cat.walk(0, 0); cat.tail.rotation.z = 0.8 + Math.sin(t * 5) * 0.3; mouse.root.visible = false;
        cam(K.position, 0.5, 2.2, 11.0, 0.5, 1.2, -2, 50); } },
    // 4 – "What's the baby called?" "Top-Off." (the Cat licks her lips, a smear of fat on her whiskers)
    (lt, d, t) => { reset(); inC(); const u = lt / d; place(cat, C, -1.0, 1.6, 0.35); place(mouse, C, 1.2, 1.8, Math.PI - 0.35); mouse.head.rotation.z = 0.2; mouse.mouth.visible = u < 0.4 && Math.sin(t * 10) > 0;
      cat.mouth.visible = u > 0.45 && Math.sin(t * 9) > 0; cat.head.rotation.z = 0.2 + (u > 0.45 ? Math.sin(t * 5) * 0.08 : 0); cat.tail.rotation.z = 0.5 + Math.sin(t * 6) * 0.4; if (u > 0.7) { cat.eyes.forEach(e => e.scale.y = Math.sin(t * 4) > 0 ? 0.3 : 1); }
      cam(C.position, 0.1, 2.0, 12.5, 0.1, 1.1, 0, 46); },
    // 5 – more "christenings": the pot empties by stages; the Mouse shakes her head
    (lt, d, t) => { reset(); const u = lt / d; if (u < 0.78) { inK(); const lv = u < 0.2 ? 0.78 : u < 0.5 ? lerp(0.78, 0.4, ease((u - 0.2) / 0.3)) : lerp(0.4, 0.0, ease((u - 0.5) / 0.28)); setFat(lv); pot.position.set(1.1, 0, -2.2);
        place(cat, K, 0.0, -0.9, 0); lick(t); cat.tail.rotation.z = 0.8 + Math.sin(t * 5) * 0.3; mouse.root.visible = false; cam(K.position, 0.5, 2.2, 11.0, 0.5, 1.2, -2, 50); }
      else { inC(); place(mouse, C, 0.2, 1.8, 0.0); mouse.head.rotation.set(0, Math.sin(t * 10) * 0.6, 0.15); mouse.root.position.x = Math.sin(t * 10) * 0.03; cat.root.visible = false; cam(C.position, 0.2, 1.8, 10.5, 0.2, 1.2, 0, 46); } },
    // 6 – winter: the empty pot; "Top-Off, Half-Done…" "One more word and I'll eat you!" "…All-Gone!"
    (lt, d, t) => { reset(); inK(); const u = lt / d; setFat(0); pot.position.set(0.2, 0, -2.2); place(cat, K, 1.8, -0.2, Math.PI); place(mouse, K, -1.3, 0.0, 0.1);
      const gasp = ease(clamp((u - 0.2) / 0.1)); mouse.head.rotation.z = 0.3 * gasp; mouse.mouth.visible = u > 0.55 && u < 0.62 || u > 0.82; mouse.root.position.y = u > 0.8 ? Math.abs(Math.sin(t * 9)) * 0.08 : 0;
      const growl = u > 0.62 && u < 0.8; cat.mouth.visible = growl && Math.sin(t * 12) > -0.2; cat.head.rotation.z = growl ? 0.25 : 0; cat.root.position.x = growl ? 1.8 - 0.6 * ease((u - 0.62) / 0.1) : 1.8; cat.tail.rotation.z = 0.5 + (growl ? 0.9 : 0);
      sweat.visible = u > 0.2; sweat.position.set(-1.3 + 0.9, 2.5 - ((lt * 0.9) % 1) * 0.6, 0.4); sweat.scale.setScalar(1.2);
      cam(K.position, 0.3, 2.2, 13.0, 0.3, 1.4, -2, 48); },
    // 7 – the end of the Mouse (a puff of dust, a very full cat); the Storyteller shakes his head
    (lt, d, t) => { reset(); inK(); const u = lt / d; setFat(0); pot.position.set(-2.4, 0, -2.2); place(cat, K, 0.8, -0.2, Math.PI);
      mouse.root.visible = false; dust.forEach((s, i) => { const v = clamp((lt - 0.2 - i * 0.05) / 1.6); s.visible = v > 0 && v < 1; const a = i / 9 * 6.28; s.position.set(K.position.x - 1.3 + Math.cos(a) * 0.8 * v, 0.5 + Math.sin(a) * 0.5 * v + v * 0.5, -0.1); s.scale.setScalar(0.8 + v * 1.6); s.material.opacity = 0.8 * (1 - v); });
      cat.mouth.visible = false; cat.head.rotation.z = 0.2; cat.root.scale.set(1.15, 1.15 * (1 + 0.1 * Math.sin(t * 2)), 1.15 * 1.12); cat.eyes.forEach(e => e.scale.y = 0.35);
      st.root.visible = true; st.rest(); scene.add(st.root); st.root.position.set(K.position.x - 2.6, 0, 0.6); st.root.rotation.y = 0.4; st.expr('frown', 0.3); st.look(0.4, 0); st.headG.rotation.y = Math.sin(t * 4) * 0.25; st.arms[1].sh.rotation.set(-0.3, 0, 0.3);
      cam(K.position, -0.8, 2.5, 12.5, -0.8, 1.6, 0, 50); },
    // 8 – end card
    (lt, d, t) => { C.visible = false; K.visible = false; cat.root.visible = mouse.root.visible = false; st.root.visible = false; E.update(lt); E.group.visible = true; },
  ];
}
