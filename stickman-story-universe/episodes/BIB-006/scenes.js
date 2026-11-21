// BIB-006 – The Animals Arrive. Source: Genesis 7:1-16 (KJV). God is never drawn: only a warm light and a voice.
import { endcard } from '../../engine/sets/endcard.js';
export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, easeOutBack, lerp, toon, outlined, radialTexture, makeStick, makeAnimal, makeBird, NOAH, STORYTELLER, drop } = ctx;
  const E = endcard(ctx, STORYTELLER); const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const glowTex = radialTexture('rgba(255,236,160,1)', 'rgba(255,200,80,0)');
  const G = new THREE.Group(); scene.add(G);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), toon(0xd9b77a)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
  [[-20, -30, 10], [15, -36, 14], [40, -28, 9]].forEach(([x, z, r]) => { const h = outlined(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xc9a466), 1.01); h.position.set(x, 0, z); G.add(h); });
  // finished ark (same build as BIB-005) with a door and ramp
  const ark = new THREE.Group(); ark.position.set(3, 0, -7); G.add(ark);
  for (let j = 0; j < 7; j++) { const p = outlined(new THREE.BoxGeometry(17, 0.6, 0.25), toon(j % 2 ? 0x9a6b42 : 0x8a5a36), 1.02); p.position.set(0, 0.5 + j * 0.62, 0.3); ark.add(p); }
  const keel = outlined(new THREE.BoxGeometry(18, 0.5, 2.5), toon(0x6b4423), 1.02); keel.position.y = 0.25; ark.add(keel);
  const house = outlined(new THREE.BoxGeometry(8, 1.8, 2), toon(0x9a6b42), 1.02); house.position.set(0, 5.2, 0); ark.add(house);
  const hroof = outlined(new THREE.BoxGeometry(8.6, 0.3, 2.4), toon(0x6b4423), 1.03); hroof.position.set(0, 6.2, 0); ark.add(hroof);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.6, 0.1), toon(0x2a1a10)); hole.position.set(-3.2, 1.5, 0.48); ark.add(hole);
  const doorPiv = new THREE.Group(); doorPiv.position.set(-3.2, 0.2, 0.55); ark.add(doorPiv); // hinged at the bottom; becomes the ramp
  const door = outlined(new THREE.BoxGeometry(2.0, 2.7, 0.2), toon(0xb07d4f), 1.04); door.position.y = 1.35; doorPiv.add(door);
  const setDoor = k => { doorPiv.rotation.x = lerp(Math.PI / 2 - 0.25, 0, k); }; // 0 = down (ramp), 1 = shut
  const DOOR = V3(-0.2, 0, -6.2), RAMP = V3(-0.2, 0, -3.6);
  const noah = makeStick(NOAH); G.add(noah.root);
  const fam = [{ robe: 0x9c8a7a, robeLong: true, veil: 0x9a9a9a, seed: 171 }, { robe: 0x3d7ea6, beard: 0x3b2a1a, seed: 172 }, { robe: 0xc8553d, hair: 0x2a1a10, seed: 173 }, { robe: 0x4f8a4b, beard: 0x2a1a10, seed: 174 },
    { robe: 0xe0a030, robeLong: true, veil: 0xd9a6a0, seed: 175 }, { robe: 0x8e5ba8, robeLong: true, veil: 0x9fc1d6, seed: 176 }, { robe: 0x2a9d8f, robeLong: true, veil: 0xe8d9a0, seed: 177 }].map(o => { const r = makeStick(o); G.add(r.root); return r; });
  const light = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); G.add(light);
  // animal pairs, in parade order
  const KINDS = [['elephant', 0.9], ['lion', 1.0], ['giraffe', 0.85], ['horse', 1.0], ['camel', 1.0], ['tiger', 1.0], ['lamb', 1.4], ['rabbit', 1.4], ['donkey', 1.0], ['cat', 1.4]];
  const pairs = KINDS.map(([k, s]) => [0, 1].map(() => { const a = makeAnimal(k); a.root.scale.setScalar(s); G.add(a.root); return a; }));
  const sheep7 = Array.from({ length: 7 }, () => { const a = makeAnimal('lamb'); a.root.scale.setScalar(1.3); G.add(a.root); return a; });
  const birds = Array.from({ length: 6 }, (_, i) => { const b = makeBird([0x3d7ea6, 0xffffff, 0xe0a030][i % 3]); G.add(b.root); return b; });
  const cloud = new THREE.Group(); G.add(cloud); [[0, 0, 1.6], [-1.5, -0.2, 1.1], [1.5, -0.2, 1.2], [3, -0.3, 0.9]].forEach(([x, y, r]) => { const c = outlined(new THREE.SphereGeometry(r, 14, 10), toon(0x5a5f6e), 1.05); c.position.set(x, y, 0); cloud.add(c); });
  const rain = Array.from({ length: 18 }, () => { const d = drop(); G.add(d); return d; });
  const days = Array.from({ length: 7 }, (_, i) => { const c = outlined(new THREE.BoxGeometry(0.8, 0.8, 0.1), toon(0xfff8e0), 1.06); G.add(c); return c; });

  function reset(sky = SKIES.desert) { G.visible = true; E.group.visible = false; scene.background = sky; aimSun(V3(0, 0, -4), V3(-10, 20, 14), 0xfff0d0, 2.4); hemi.intensity = 1.5;
    for (const r of [noah, ...fam]) { r.rest(); r.root.visible = false; r.root.rotation.set(0, 0, 0); r.expr('smile', 0.3); }
    noah.root.visible = true; light.visible = false; cloud.visible = false; rain.forEach(d => d.visible = false); days.forEach(c => c.visible = false); setDoor(0);
    pairs.flat().forEach(a => { a.root.visible = false; a.root.rotation.set(0, 0, 0); a.walk(0, 0); }); sheep7.forEach(a => a.root.visible = false); birds.forEach(b => b.root.visible = false); }
  const cam = (x, y, z, lx, ly, lz, fov = 48) => { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; };
  // parade: pair i walks from the right toward the ramp, then up it into the door; s = global progress (pairs per unit)
  function parade(s, t, list = pairs) { list.forEach((pr, i) => { const p = s - i * 0.9; pr.forEach((a, j) => { const z = (j ? 0.7 : -0.1);
      if (p < 0) { a.root.visible = false; return; } a.root.visible = true; a.walk(t * 8 + j, 1);
      if (p < 3) { const k = p / 3; a.root.position.set(lerp(12, RAMP.x + 0.6, k), 0, RAMP.z + z); a.root.rotation.y = Math.PI; }
      else if (p < 4.2) { const k = (p - 3) / 1.2; a.root.position.set(RAMP.x + 0.6 - k * 0.6 + (j ? 0.5 : -0.5) * (1 - k), k * 1.2, lerp(RAMP.z + z, DOOR.z, k)); a.root.rotation.y = Math.PI / 2; }
      else a.root.visible = false; }); }); }

  return [
    // 1 – "Come thou and all thy house into the ark": warm light over the finished ark
    (lt, d, t) => { reset(); const u = lt / d; noah.root.position.set(-3.2, 0, -1.0); noah.root.rotation.y = 0.5; noah.expr('smile', 0.7); noah.look(0.3, 0.7);
      light.visible = true; light.position.set(-1, 9, -3); light.scale.setScalar(6 + Math.sin(t * 2)); light.material.opacity = 0.5 + 0.3 * ease(u);
      cam(-1.5, 4.5, lerp(22, 19, ease(u)), -1.5, 4.0, -5, 54); },
    // 2 – seven days, then rain: a calendar of seven, a cloud in the distance
    (lt, d, t) => { reset(); const u = lt / d; noah.root.position.set(-3.5, 0, -1.2); noah.root.rotation.y = 0.3; noah.expr('open', 0.6); noah.arms[1].sh.rotation.set(-0.3, 0, 2.4);
      days.forEach((c, i) => { c.visible = true; const k = easeOutBack(clamp((u - i * 0.09) / 0.15)); c.position.set(-3.9 + i * 0.85, 7.6, -3); c.scale.setScalar(Math.max(0.001, k)); });
      cloud.visible = u > 0.65; cloud.position.set(9, 9, -12); cloud.scale.setScalar(1.2 * ease(clamp((u - 0.65) / 0.2)));
      cam(-1.3, 4.4, 17, -1.3, 4.4, -4, 56); },
    // 3 – two by two: elephants, lions, giraffes parade towards the ramp
    (lt, d, t) => { reset(); const u = lt / d; noah.root.position.set(-3.0, 0, -2.6); noah.root.rotation.y = 0.9; noah.expr('open', 1); noah.look(0.6, 0.2);
      parade(u * 5.0, t, pairs.slice(0, 3)); cam(0.3, 3.6, 15, 0.3, 2.2, -4, 56); },
    // 4 – seven of the clean animals, two of the others; birds overhead
    (lt, d, t) => { reset(); const u = lt / d; noah.root.position.set(-3.0, 0, -2.6); noah.root.rotation.y = 0.9; noah.expr('smile', 0.8);
      parade(u * 5.0 + 1.5, t, pairs.slice(3, 6));
      sheep7.forEach((a, i) => { a.root.visible = true; a.root.position.set(lerp(13, 4.5, ease(u)) + (i % 4) * 0.9, 0, -1.0 + Math.floor(i / 4) * 0.8); a.root.rotation.y = Math.PI; a.walk(t * 9 + i, 1); });
      birds.forEach((b, i) => { b.root.visible = true; b.root.position.set(lerp(12, -2, (u + i * 0.07) % 1), 7 + (i % 3) * 0.6 + Math.sin(t * 3 + i) * 0.2, -4 - (i % 2)); b.root.rotation.y = Math.PI; b.flap(t * 14 + i); });
      cam(0.3, 3.8, 16, 0.3, 2.8, -4, 58); },
    // 5 – no chasing, no nets: Noah simply watches them file in, scratching his beard
    (lt, d, t) => { reset(); const u = lt / d; noah.root.position.set(-3.0, 0, -2.6); noah.root.rotation.y = 0.9; noah.expr('smile', 1); noah.look(0.5, 0);
      noah.arms[1].sh.rotation.set(-1.3, 0, 0.6); noah.arms[1].el.rotation.set(-1.6, 0, 0); noah.arms[0].sh.rotation.set(-0.2, 0, -0.3);
      parade(u * 5.0 + 1.0, t, pairs.slice(6)); cam(0.0, 3.4, 14, 0.0, 2.0, -4, 56); },
    // 6 – the family walks in; the door rises and shuts by itself, with a warm glow
    (lt, d, t) => { reset(); const u = lt / d; const all = [noah, ...fam];
      all.forEach((r, i) => { r.root.visible = true; const p = clamp(u * 2.2 - i * 0.12); r.walk(t * 8 + i, p > 0 && p < 1 ? 1 : 0);
        if (p < 0.6) { const k = p / 0.6; r.root.position.set(lerp(-6 - i * 0.6, RAMP.x, k), 0, RAMP.z); r.root.rotation.y = Math.PI / 2; }
        else if (p < 1) { const k = (p - 0.6) / 0.4; r.root.position.set(RAMP.x, k * 1.2, lerp(RAMP.z, DOOR.z, k)); r.root.rotation.y = Math.PI; }
        else r.root.visible = false; });
      const sh = ease(clamp((u - 0.72) / 0.2)); setDoor(sh); light.visible = u > 0.65; light.position.set(-0.2, 2.6, -5.2); light.scale.setScalar(5); light.material.opacity = 0.7 * ease(clamp((u - 0.65) / 0.1));
      cam(-1.8, 3.6, 15, -1.8, 2.6, -5, 56); },
    // 7 – the lesson: storm gathers, rain falls, the shut ark glows safe
    (lt, d, t) => { reset(SKIES.night); const u = lt / d; setDoor(1); noah.root.visible = false;
      cloud.visible = true; cloud.position.set(3, 11 - ease(u) * 1.5, -9); cloud.scale.setScalar(2 + u);
      rain.forEach((dd, i) => { dd.visible = true; const v = (t * 1.3 + i / 18) % 1; dd.position.set(-6 + (i % 9) * 1.8, 12 - v * 12, -2 + (i % 2) * 1.5); dd.scale.setScalar(1.4); });
      light.visible = true; light.position.set(3, 5.2, -6.2); light.scale.setScalar(7 + Math.sin(t * 2)); light.material.opacity = 0.6;
      cam(0.5, 4.2, 20, 0.5, 4.2, -5, 56); },
    (lt, d, t) => { G.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
