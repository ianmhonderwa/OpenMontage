// BIB-007 – The Great Flood. Source: Genesis 7:17-8:12 (KJV). God is never drawn: only a warm light. No drowning shown.
import { endcard } from '../../engine/sets/endcard.js';
export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, easeOutBack, lerp, toon, outlined, radialTexture, makeStick, makeBird, NOAH, STORYTELLER, drop } = ctx;
  const E = endcard(ctx, STORYTELLER); const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const glowTex = radialTexture('rgba(255,236,160,1)', 'rgba(255,200,80,0)');
  const G = new THREE.Group(); scene.add(G);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(90, 64), toon(0xd9b77a)); ground.rotation.x = -Math.PI / 2; G.add(ground);
  const peaks = [[-16, -26, 9, 7], [10, -30, 12, 9], [26, -24, 8, 6], [-3, -38, 14, 11]].map(([x, z, r, h], i) => { const m = outlined(new THREE.ConeGeometry(r, h * 1.6, 8), toon(i === 1 ? 0x8a7a68 : 0x9a8a76), 1.01); m.position.set(x, h * 0.8, z); G.add(m); return m; });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(200, 200, 40, 40), toon(0x3d7ea6)); sea.rotation.x = -Math.PI / 2; G.add(sea);
  // the ark (same design as BIB-005/006) with a window
  const ark = new THREE.Group(); G.add(ark);
  for (let j = 0; j < 7; j++) { const p = outlined(new THREE.BoxGeometry(17, 0.6, 0.25), toon(j % 2 ? 0x9a6b42 : 0x8a5a36), 1.02); p.position.set(0, 0.5 + j * 0.62, 0.3); ark.add(p); }
  const keel = outlined(new THREE.BoxGeometry(18, 0.5, 2.5), toon(0x6b4423), 1.02); keel.position.y = 0.25; ark.add(keel);
  const house = outlined(new THREE.BoxGeometry(8, 1.8, 2), toon(0x9a6b42), 1.02); house.position.set(0, 5.2, 0); ark.add(house);
  const hroof = outlined(new THREE.BoxGeometry(8.6, 0.3, 2.4), toon(0x6b4423), 1.03); hroof.position.set(0, 6.2, 0); ark.add(hroof);
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 0.1), toon(0x2a1a10)); win.position.set(1.5, 5.2, 1.02); ark.add(win);
  const noah = makeStick(NOAH); ark.add(noah.root); noah.root.scale.setScalar(0.55);
  const light = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); G.add(light);
  const cloud = new THREE.Group(); G.add(cloud); [[0, 0, 2.4], [-2.6, -0.3, 1.8], [2.6, -0.3, 2.0], [5, -0.4, 1.5], [-5, -0.4, 1.5]].forEach(([x, y, r]) => { const c = outlined(new THREE.SphereGeometry(r, 14, 10), toon(0x5a5f6e), 1.05); c.position.set(x, y, 0); cloud.add(c); });
  const rain = Array.from({ length: 30 }, () => { const d = drop(); G.add(d); return d; });
  const raven = makeBird(0x222222), dove = makeBird(0xffffff); G.add(raven.root, dove.root);
  const leaf = outlined(new THREE.SphereGeometry(0.18, 10, 8), toon(0x5fb04a), 1.1); leaf.scale.set(1.6, 0.5, 0.8); dove.root.add(leaf); leaf.position.set(0.5, 0.1, 0);
  const wind = Array.from({ length: 6 }, () => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 6, 24, Math.PI * 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); G.add(w); return w; });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f })); G.add(sun);

  function reset(sky = SKIES.night) { G.visible = true; E.group.visible = false; scene.background = sky; aimSun(V3(0, 0, -6), V3(-10, 20, 14), 0xfff0d0, sky === SKIES.night ? 1.2 : 2.4); hemi.intensity = sky === SKIES.night ? 0.9 : 1.5;
    noah.rest(); noah.root.visible = false; noah.root.position.set(1.5, 4.5, 1.15); noah.expr('smile', 0.3); light.visible = false; cloud.visible = false; rain.forEach(d => d.visible = false); raven.root.visible = dove.root.visible = false; leaf.visible = false; wind.forEach(w => w.visible = false); sun.visible = false;
    ark.position.set(0, 0, -6); ark.rotation.set(0, 0, 0); sea.position.y = 0.02; }
  const bob = t => { ark.rotation.z = Math.sin(t * 1.3) * 0.04; ark.rotation.x = Math.sin(t * 0.9) * 0.02; };
  const rainOn = (t, n = 30) => rain.forEach((d, i) => { d.visible = i < n; const v = (t * 1.4 + i / n) % 1; d.position.set(-14 + (i % 10) * 3, 16 - v * 16, -4 + (i % 3) * 2); d.scale.setScalar(1.5); });
  const cam = (x, y, z, lx, ly, lz, fov = 54) => { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; };

  return [
    // 1 – rain; the water rises and lifts the ark
    (lt, d, t) => { reset(); const u = lt / d; cloud.visible = true; cloud.position.set(0, 14, -10); cloud.scale.setScalar(2); rainOn(t);
      sea.position.y = lerp(0.02, 3.0, ease(u)); ark.position.y = Math.max(0, sea.position.y - 0.8); if (u > 0.4) bob(t);
      cam(0, 6, 24, 0, 4, -6, 56); },
    // 2 – even the mountains go under
    (lt, d, t) => { reset(); const u = lt / d; cloud.visible = true; cloud.position.set(0, 18, -16); cloud.scale.setScalar(2.4); rainOn(t, 18);
      sea.position.y = lerp(8, 19, ease(u)); ark.position.set(0, sea.position.y - 0.8, -8); bob(t);
      cam(0, sea.position.y + 6, 30, 0, sea.position.y + 2, -14, 60); },
    // 3 – "And God remembered Noah": a warm light, a wind blows, the water begins to drop
    (lt, d, t) => { reset(SKIES.sunset); const u = lt / d; sea.position.y = lerp(19, 17, ease(u)); ark.position.set(0, sea.position.y - 0.8, -8); bob(t);
      light.visible = true; light.position.set(0, sea.position.y + 12, -12); light.scale.setScalar(10 + Math.sin(t * 2)); light.material.opacity = 0.4 + 0.4 * ease(clamp(u * 2));
      wind.forEach((w, i) => { w.visible = u > 0.3; const v = (t * 0.6 + i / 6) % 1; w.position.set(lerp(-20, 20, v), sea.position.y + 3 + (i % 3) * 1.5, -6 + (i % 2) * 3); w.rotation.z = Math.PI / 2; w.material.opacity = 0.6 * Math.sin(v * Math.PI); });
      cam(0, sea.position.y + 6, 30, 0, sea.position.y + 3, -12, 60); },
    // 4 – the ark rests on Ararat; mountain tops appear
    (lt, d, t) => { reset(SKIES.day); const u = lt / d; sea.position.y = lerp(9.5, 7.5, ease(u)); ark.position.set(peaks[1].position.x, 13.4, peaks[1].position.z + 2.5); ark.rotation.z = 0.05;
      cam(10, 16, 4, 10, 12, -26, 60); },
    // 5 – Noah at the window sends out a raven, then a dove that comes back
    (lt, d, t) => { reset(SKIES.day); const u = lt / d; sea.position.y = 4.0; ark.position.set(0, 3.2, -6); noah.root.visible = true; noah.root.rotation.y = 0; noah.expr('smile', 0.5); noah.arms[1].sh.rotation.set(-0.3, 0, 2.4);
      const fly = (b, s, back) => { b.root.visible = true; const k = clamp((u - s) / 0.35); const x = back ? 1.5 + 9 * Math.sin(k * Math.PI) : 1.5 + 14 * k; b.root.position.set(x, 9.0 + 3 * Math.sin(k * Math.PI), -4.6); b.root.rotation.y = back && k > 0.5 ? Math.PI : 0; b.flap(t * 14); };
      if (u < 0.45) fly(raven, 0.05, false); else fly(dove, 0.5, true);
      cam(3, 10.0, 9, 3.5, 9.0, -6, 56); },
    // 6 – the dove returns with an olive leaf
    (lt, d, t) => { reset(SKIES.sunset); const u = lt / d; sea.position.y = 4.0; ark.position.set(0, 3.2, -6); noah.root.visible = true; noah.expr('open', 1); noah.arms.forEach(a => a.sh.rotation.set(-0.3, 0, a.side * 2.3));
      dove.root.visible = true; leaf.visible = true; const k = ease(clamp(u / 0.6)); dove.root.position.set(lerp(12, 2.6, k), lerp(11.5, 9.7, k), -4.6); dove.root.rotation.y = Math.PI; dove.flap(t * (k < 1 ? 14 : 4));
      cam(2.2, 9.6, 6.0, 2.0, 9.0, -5, 50); },
    // 7 – lesson: calm water, the sun rises behind the resting ark
    (lt, d, t) => { reset(SKIES.sunset); const u = lt / d; sea.position.y = 6.0; ark.position.set(peaks[1].position.x, 13.4, peaks[1].position.z + 2.5); ark.rotation.z = 0.05;
      sun.visible = true; sun.position.set(peaks[1].position.x + 6, lerp(10, 22, ease(u)), peaks[1].position.z - 14);
      dove.root.visible = true; dove.root.position.set(peaks[1].position.x - 4 + Math.sin(t) * 2, 20 + Math.sin(t * 2), peaks[1].position.z); dove.flap(t * 10);
      cam(10, 17, 8, 10, 15, -26, 60); },
    (lt, d, t) => { G.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
