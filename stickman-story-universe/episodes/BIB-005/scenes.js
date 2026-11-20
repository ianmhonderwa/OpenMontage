// BIB-005 – Noah Builds the Ark. Source: Genesis 6 (KJV). God is never drawn: only a warm light and a voice.
import { endcard } from '../../engine/sets/endcard.js';
export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture, makeStick, NOAH, STORYTELLER, drop } = ctx;
  const E = endcard(ctx, STORYTELLER); const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const glowTex = radialTexture('rgba(255,236,160,1)', 'rgba(255,200,80,0)');
  const G = new THREE.Group(); scene.add(G);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 64), toon(0xd9b77a)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
  [[-20, -30, 10], [15, -36, 14], [40, -28, 9]].forEach(([x, z, r]) => { const h = outlined(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xc9a466), 1.01); h.position.set(x, 0, z); G.add(h); });
  // the ark: hull ribs that appear as it is built, then planks
  const ark = new THREE.Group(); ark.position.set(3, 0, -6); G.add(ark);
  const ribs = [], planks = [];
  for (let i = 0; i < 12; i++) { const r = outlined(new THREE.BoxGeometry(0.3, 4.2, 0.3), toon(0x8a5a36), 1.05); r.position.set(-8.25 + i * 1.5, 2.1, 0); ark.add(r); ribs.push(r); }
  for (let j = 0; j < 6; j++) { const p = outlined(new THREE.BoxGeometry(17, 0.6, 0.25), toon(j % 2 ? 0x9a6b42 : 0x8a5a36), 1.02); p.position.set(0, 0.5 + j * 0.65, 0.3); ark.add(p); planks.push(p); }
  const keel = outlined(new THREE.BoxGeometry(18, 0.5, 2.5), toon(0x6b4423), 1.02); keel.position.y = 0.25; ark.add(keel);
  const noah = makeStick(NOAH); G.add(noah.root);
  const mock = [0xc8553d, 0x3d7ea6, 0x8e5ba8, 0xe0a030].map((c, i) => { const r = makeStick({ robe: c, hair: 0x2a1a10, beard: i % 2 ? 0x3b2a1a : null, seed: 150 + i }); G.add(r.root); return r; });
  const light = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); G.add(light);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f })); G.add(sun);
  const crowdMad = [0x5a3030, 0x40405a].map((c, i) => { const r = makeStick({ robe: c, hair: 0x1a1a1a, seed: 160 + i }); G.add(r.root); return r; });
  const cloud = new THREE.Group(); G.add(cloud); [[0, 0, 1.4], [-1.3, -0.2, 1], [1.3, -0.2, 1.1]].forEach(([x, y, r]) => { const c = outlined(new THREE.SphereGeometry(r, 14, 10), toon(0x5a5f6e), 1.05); c.position.set(x, y, 0); cloud.add(c); });
  const rain = Array.from({ length: 14 }, () => { const d = drop(); G.add(d); return d; });
  const sweat = drop(); G.add(sweat);
  function built(k) { ribs.forEach((r, i) => r.scale.y = Math.max(0.001, clamp(k * 12 - i))); planks.forEach((p, j) => p.scale.x = Math.max(0.001, clamp((k - 0.4) * 10 - j))); }
  function reset(t, sky = SKIES.desert) { G.visible = true; E.group.visible = false; scene.background = sky; aimSun(V3(0, 0, -4), V3(-10, 20, 14), 0xfff0d0, 2.4); hemi.intensity = 1.5;
    for (const r of [noah, ...mock, ...crowdMad]) { r.rest(); r.root.visible = false; r.root.rotation.set(0, 0, 0); r.expr('smile', 0.3); }
    noah.root.visible = true; light.visible = false; sun.visible = false; cloud.visible = false; rain.forEach(d => d.visible = false); sweat.visible = false; built(0); }
  const hammer = (t) => { noah.arms[1].sh.rotation.set(-1.6 + Math.abs(Math.sin(t * 7)) * 1.2, 0, 0.2); noah.arms[1].el.rotation.set(-0.5, 0, 0); };
  const cam = (x, y, z, lx, ly, lz, fov = 48) => { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; };
  return [
    // 1 – a violent world (angry figures shoving) – but Noah walks with God
    (lt, d, t) => { reset(t); const u = lt / d; crowdMad.forEach((r, i) => { r.root.visible = true; r.root.position.set(-3.2 + i * 1.1, 0, -1.5); r.root.rotation.y = i ? -1.2 : 1.2; r.expr('frown', -1.2); r.arms[i ? 0 : 1].sh.rotation.set(-1.4, 0, i ? -0.2 : 0.2); r.root.position.x += Math.sin(t * 9 + i) * 0.06; });
      noah.root.position.set(1.8, 0, 0.6); noah.root.rotation.y = -0.2; noah.expr('smile', 0.6); noah.look(0.2, 0.6); light.visible = true; light.position.set(2.2, 7, -1); light.scale.setScalar(4 + Math.sin(t * 2)); light.material.opacity = ease(u * 2) * 0.8;
      cam(0, 2.6, 11.5, 0, 2.2, -0.5); },
    // 2 – "Build an ark": warm light, Noah listens and nods
    (lt, d, t) => { reset(t); noah.root.position.set(0, 0, 0.5); noah.expr('open', 0.8); noah.look(0, 0.7); noah.headG.rotation.x = -0.3 + (lt > d * 0.6 ? Math.sin(t * 8) * 0.12 : 0);
      light.visible = true; light.position.set(0.3, 7.5, -1); light.scale.setScalar(6 + Math.sin(t * 2) * 0.5); light.material.opacity = 0.9; cam(0, 2.4, 9.5, 0, 3.0, 0); },
    // 3 – 300 cubits! the keel stretches across the desert
    (lt, d, t) => { reset(t); const u = lt / d; built(0.05 + 0.1 * u); keel.scale.x = Math.max(0.05, ease(u / 0.6)); noah.root.position.set(-6, 0, -3.5); noah.root.rotation.y = 0.8; noah.expr('open', 1); noah.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * 2.4));
      cam(lerp(-4, 3, ease(u)), 6, 18, 3, 1.5, -6, 54); },
    // 4 – the neighbours laugh
    (lt, d, t) => { reset(t); built(0.35); keel.scale.x = 1; noah.root.position.set(-2.5, 0, -3.8); noah.root.rotation.y = 0.2; hammer(t);
      mock.forEach((r, i) => { r.root.visible = true; r.root.position.set(1.0 + i * 1.2, 0, 1.2 + (i % 2) * 0.6); r.root.rotation.y = -0.6; r.expr('open', 0.5); r.body.position.y = Math.abs(Math.sin(t * 9 + i)) * 0.08; r.arms[i % 2].sh.rotation.set(-1.4, 0, 0.3); r.headG.rotation.z = Math.sin(t * 8 + i) * 0.15; });
      cam(0.5, 2.8, 12, 0.5, 2.0, -1.5); },
    // 5 – day after day, year after year: the ark rises while the sun races overhead
    (lt, d, t) => { reset(t); const u = lt / d; keel.scale.x = 1; built(0.35 + 0.6 * ease(u)); noah.root.position.set(lerp(-6, 6, (u * 3) % 1), 0, -3.6); hammer(t); noah.expr('flat', 0.2);
      sun.visible = true; const a = u * Math.PI * 6; sun.position.set(Math.cos(a) * 14, 6 + Math.sin(a) * 7, -30); scene.background = Math.sin(a) < -0.3 ? SKIES.night : SKIES.desert;
      sweat.visible = true; sweat.position.copy(noah.root.position).add(V3(0.5, 3.0 - ((t * 0.9) % 1) * 0.5, 0.4));
      cam(3, 4.5, 17, 3, 3, -6, 54); },
    // 6 – no arguing, no quitting – just obeying
    (lt, d, t) => { reset(t); keel.scale.x = 1; built(1); noah.root.position.set(0.5, 0, -1.8); noah.expr('smile', 0.6); hammer(t); mock.forEach((r, i) => { r.root.visible = i < 2; r.root.position.set(-3 + i * 1.2, 0, 1.5); r.root.rotation.y = 0.6; r.expr('open', 0.4); });
      cam(0, 3.4, 13, 1.5, 3, -4); },
    // 7 – the lesson: storm clouds gather over the finished ark; the laughing stops
    (lt, d, t) => { reset(t, SKIES.night); const u = lt / d; keel.scale.x = 1; built(1); noah.root.position.set(-1, 0, -1.5); noah.expr('smile', 0.4); noah.look(0, 0.6);
      mock.forEach((r, i) => { r.root.visible = true; r.root.position.set(1.4 + i * 1.1, 0, 1.4); r.root.rotation.y = 0; r.expr('open', 1); r.look(0, 0.8); });
      cloud.visible = true; cloud.position.set(3, 9 - ease(u) * 1.5, -4); cloud.scale.setScalar(1.5 + u);
      rain.forEach((dd, i) => { dd.visible = u > 0.6; const v = (t * 1.3 + i / 14) % 1; dd.position.set(-3 + (i % 7) * 1.4, 8 - v * 8, -3 + (i % 2)); dd.scale.setScalar(1.3); });
      cam(1, 3.2, 14, 1.5, 3.4, -3, 54); },
    (lt, d, t) => { G.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
