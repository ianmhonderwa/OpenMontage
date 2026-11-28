// BIB-008 – The Rainbow Promise. Source: Genesis 8:13-9:17 (KJV). God is never drawn: only a warm light and the rainbow. v2 look.
import { endcard } from '../../engine/sets/endcard.js';
export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, easeOutBack, lerp, toon, radialTexture, makeStick, makeAnimal, makeBird, NOAH, STORYTELLER } = ctx;
  const E = endcard(ctx, STORYTELLER); const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const mesh = (g, m) => { const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; return x; };
  const G = new THREE.Group(); scene.add(G);
  const ground = mesh(new THREE.CircleGeometry(90, 48), toon(0x7fae5a)); ground.rotation.x = -Math.PI / 2; G.add(ground);
  [[-18, -30, 12, 10], [12, -34, 16, 13], [34, -26, 10, 8]].forEach(([x, z, r, h]) => { const m = mesh(new THREE.ConeGeometry(r, h * 1.6, 7), toon(0x8a7a68)); m.position.set(x, h * 0.8, z); G.add(m); });
  // the ark, resting on a hillside
  const ark = new THREE.Group(); ark.position.set(6, 0, -12); ark.rotation.y = -0.3; G.add(ark);
  for (let j = 0; j < 7; j++) { const p = mesh(new THREE.BoxGeometry(17, 0.6, 2.6), toon(j % 2 ? 0x9a6b42 : 0x8a5a36)); p.position.set(0, 0.5 + j * 0.62, 0); ark.add(p); }
  const house = mesh(new THREE.BoxGeometry(8, 1.8, 2), toon(0x9a6b42)); house.position.set(0, 5.2, 0); ark.add(house);
  const hroof = mesh(new THREE.BoxGeometry(8.6, 0.3, 2.4), toon(0x6b4423)); hroof.position.set(0, 6.2, 0); ark.add(hroof);
  const cover = mesh(new THREE.BoxGeometry(8.8, 0.25, 2.6), toon(0xc9b48a)); cover.position.set(0, 6.45, 0); ark.add(cover);
  const ramp = mesh(new THREE.BoxGeometry(2.2, 0.15, 5), toon(0xb07d4f)); ramp.position.set(-3, 1.2, 3.2); ramp.rotation.x = 0.45; ark.add(ramp);
  // people
  const noah = makeStick(NOAH); G.add(noah.root);
  const fam = [{ robe: 0x9c8a7a, veil: 0x9a9a9a, seed: 171 }, { robe: 0x3d7ea6, beard: 0x3b2a1a, seed: 172 }, { robe: 0xc8553d, hair: 0x2a1a10, seed: 173 }, { robe: 0x4f8a4b, beard: 0x2a1a10, seed: 174 },
    { robe: 0xe0a030, veil: 0xd9a6a0, seed: 175 }, { robe: 0x8e5ba8, veil: 0x9fc1d6, seed: 176 }, { robe: 0x2a9d8f, veil: 0xe8d9a0, seed: 177 }].map(o => { const r = makeStick(o); G.add(r.root); return r; });
  const animals = ['elephant', 'giraffe', 'lion', 'horse', 'camel', 'lamb'].map(k => { const a = makeAnimal(k); G.add(a.root); return a; });
  const birds = Array.from({ length: 6 }, (_, i) => { const b = makeBird([0xffffff, 0x3d7ea6, 0xe0a030][i % 3]); G.add(b.root); return b; });
  // altar of stones with a thin smoke column
  const altar = new THREE.Group(); altar.position.set(-1.5, 0, -2.5); G.add(altar);
  for (let i = 0; i < 14; i++) { const s = mesh(new THREE.DodecahedronGeometry(0.28, 0), toon(i % 2 ? 0x9a9389 : 0x7f786e)); s.position.set((i % 4) * 0.42 - 0.63, 0.25 + Math.floor(i / 4) * 0.36, (i % 2) * 0.2); altar.add(s); }
  const smoke = Array.from({ length: 8 }, () => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: 0xe8e4dc, transparent: true, opacity: 0.5 })); G.add(s); return s; });
  const light = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,236,160,1)', 'rgba(255,200,80,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); G.add(light);
  // rainbow: 7 concentric half-torus bands, revealed by a growing arc
  const bowCols = [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5, 0x3949ab, 0x8e24aa];
  const bow = new THREE.Group(); bow.position.set(0, 0, -30); G.add(bow);
  const bands = bowCols.map((c, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(24 - i * 0.9, 0.45, 6, 60, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8 })); bow.add(m); return m; });
  const setBow = k => bands.forEach(b => { b.geometry.dispose(); const R = b.geometry.parameters?.radius; }) ; void setBow;
  const cloud = new THREE.Group(); G.add(cloud); [[0, 0, 2.6], [-3, -0.3, 2], [3, -0.3, 2.2], [6, -0.4, 1.6]].forEach(([x, y, r]) => { const c = mesh(new THREE.IcosahedronGeometry(r, 1), toon(0xdfe3ea)); c.position.set(x, y, 0); cloud.add(c); });
  const seasons = ['🌱', '🌾', '❄️', '☀️'];

  function reset(sky = SKIES.day) { G.visible = true; E.group.visible = false; scene.background = sky; aimSun(V3(0, 0, -4), V3(-10, 18, 12), 0xffefcf, 2.8); hemi.intensity = 1.2;
    for (const r of [noah, ...fam]) { r.rest(); r.root.visible = false; r.root.rotation.set(0, 0, 0); r.expr('smile', 0.4); }
    animals.forEach(a => { a.root.visible = false; a.walk(0, 0); a.root.rotation.set(0, 0, 0); }); birds.forEach(b => b.root.visible = false);
    smoke.forEach(s => s.visible = false); light.visible = false; bow.visible = false; cloud.visible = false; altar.visible = true; cover.visible = true; }
  const cam = (x, y, z, lx, ly, lz, fov = 50) => { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; };
  const showBow = k => { bow.visible = true; bands.forEach((b, i) => { b.scale.set(1, ease(k), 1); b.material.opacity = 0.8 * ease(k); }); };
  const smokeUp = t => smoke.forEach((s, i) => { s.visible = true; const v = (t * 0.35 + i / 8) % 1; s.position.set(altar.position.x + Math.sin(v * 6 + i) * 0.2, 1.6 + v * 5, altar.position.z); s.scale.setScalar(0.5 + v * 1.2); s.material.opacity = 0.5 * (1 - v); });

  return [
    // 1 – Noah lifts the covering and looks out on dry land
    (lt, d, t) => { reset(); const u = lt / d; cover.position.x = lerp(0, -9, ease(clamp(u / 0.6))); noah.root.visible = true; noah.root.position.copy(ark.position).add(V3(-1, 6.3, 0.6)); noah.root.rotation.y = -0.3; noah.expr('open', 0.8); noah.arms[1].sh.rotation.set(-0.4, 0, 2.3);
      altar.visible = false; cam(-4, 7, 6, 4, 6, -12, 52); },
    // 2 – out they come: family and animals stream down the ramp
    (lt, d, t) => { reset(); const u = lt / d; cover.visible = false; altar.visible = false;
      [noah, ...fam].forEach((r, i) => { const p = clamp(u * 1.6 - i * 0.08); r.root.visible = p > 0; r.root.position.set(lerp(2.5, -3 + i * 0.9, ease(p)), 0, lerp(-6, -1 - (i % 2) * 1.2, ease(p))); r.root.rotation.y = -0.8; r.walk(t * 8 + i, p < 1 ? 1 : 0); });
      animals.forEach((a, i) => { const p = clamp(u * 1.4 - 0.3 - i * 0.08); a.root.visible = p > 0; a.root.position.set(lerp(4, 6 + i * 2.4, ease(p)), 0, lerp(-7, -3 - (i % 2) * 2, ease(p))); a.root.rotation.y = 0.4; a.walk(t * 8 + i, p < 1 ? 1 : 0); });
      birds.forEach((b, i) => { b.root.visible = true; b.root.position.set(lerp(4, -6 + i * 3, ease(u)), 6 + i % 3 + Math.sin(t * 2 + i) * 0.3, -6); b.root.rotation.y = Math.PI; b.flap(t * 14 + i); });
      cam(1, 4.5, 14, 2, 2.4, -5, 56); },
    // 3 – Noah builds an altar and gives thanks; smoke rises; warm light
    (lt, d, t) => { reset(SKIES.sunset); cover.visible = false; noah.root.visible = true; noah.root.position.set(-2.6, 0, -1.4); noah.root.rotation.y = 2.4; noah.arms.forEach(a => { a.sh.rotation.set(0, 0, a.side * 2.6); }); noah.headG.rotation.x = -0.3;
      fam.slice(0, 3).forEach((r, i) => { r.root.visible = true; r.root.position.set([-4.2, 1.4, 2.6][i], 0, -2.2 + i * 0.3); r.root.rotation.y = i ? -1.9 : 1.9; r.headG.rotation.x = 0.25; });
      smokeUp(t); light.visible = true; light.position.set(-1.5, 9, -4); light.scale.setScalar(7 + Math.sin(t * 2)); light.material.opacity = 0.6;
      cam(-0.5, 3.0, 7.0, -1.2, 2.2, -2.5, 52); },
    // 4 – the promise: seedtime and harvest, cold and heat, day and night (cycling sky)
    (lt, d, t) => { const u = lt / d; const k = Math.floor(u * 4) % 4; reset([SKIES.day, SKIES.sunset, SKIES.forest, SKIES.night][k]); cover.visible = false;
      light.visible = true; light.position.set(0, 10, -8); light.scale.setScalar(9); light.material.opacity = 0.5;
      noah.root.visible = true; noah.root.position.set(0, 0, -1); noah.root.rotation.y = 0; noah.headG.rotation.x = -0.4; noah.look(0, 0.8); noah.expr('smile', 0.6);
      ground.material = toon([0x7fae5a, 0xc9b46a, 0xd8e0e8, 0x5a7a4a][k]);
      cam(0, 1.8, 5.2, 0, 2.4, -1, 48); },
    // 5 – never again a flood; storm clouds gather but stay gentle
    (lt, d, t) => { reset(SKIES.day); ground.material = toon(0x7fae5a); cover.visible = false; const u = lt / d; cloud.visible = true; cloud.position.set(lerp(-14, 0, ease(u)), 12, -14);
      [noah, ...fam].forEach((r, i) => { r.root.visible = true; r.root.position.set(-4.5 + i * 1.3, 0, -2 + (i % 2) * 0.5); r.root.rotation.y = 0; r.headG.rotation.x = -0.3; });
      cam(0, 2.6, 9.5, 0, 4.5, -6, 54); },
    // 6 – "I do set my bow in the cloud": the rainbow appears
    (lt, d, t) => { reset(SKIES.day); ground.material = toon(0x7fae5a); cover.visible = false; const u = lt / d; cloud.visible = true; cloud.position.set(0, 12, -14); showBow(clamp(u / 0.7));
      [noah, ...fam].forEach((r, i) => { r.root.visible = true; r.root.position.set(-4.5 + i * 1.3, 0, -2 + (i % 2) * 0.5); r.root.rotation.y = Math.PI; r.headG.rotation.x = -0.35; r.expr('open', 0.8); if (i % 2) r.arms[1].sh.rotation.set(0, 0, 2.6); });
      cam(0, 3.0, 8.5, 0, 7.5, -20, 60); },
    // 7 – the lesson: Noah under the rainbow, animals grazing nearby
    (lt, d, t) => { reset(SKIES.day); ground.material = toon(0x7fae5a); cover.visible = false; showBow(1); noah.root.visible = true; noah.root.position.set(0, 0, 0); noah.root.rotation.y = 0.2; noah.expr('smile', 0.8); noah.arms[1].sh.rotation.set(-0.3, 0, 2.4); noah.arms[1].el.rotation.set(-1.2, 0, 0.8 + Math.sin(t * 5) * 0.15);
      animals.forEach((a, i) => { a.root.visible = i < 4; a.root.position.set(-6 + i * 4, 0, -7 - (i % 2) * 2); a.root.rotation.y = i % 2 ? Math.PI : 0; a.head.rotation.z = -0.6 + Math.sin(t * 2 + i) * 0.1; });
      cam(0, 2.2, 6.5, 0, 3.6, -10, 56); },
    (lt, d, t) => { G.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
