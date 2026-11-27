// AES-004 – The Crow and the Pitcher. Source: Aesop's Fables, tr. G. F. Townsend (1867). First episode in the v2 look.
import { meadow } from '../../engine/sets/meadow.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, makeStick, STORYTELLER, drop } = ctx;
  const M = meadow(ctx); const W = M.group; const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const mesh = (g, m) => { const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; return x; };
  // dry the meadow out: hide the stream, tint the grass straw-yellow
  W.traverse(o => { if (o.isMesh && o.geometry?.parameters?.width === 60) o.visible = false; });
  W.children[0].material = toon(0xc9b46a); M.shadeTree.visible = false;
  // ---- low-poly crow (faces +x) ----
  const crow = new THREE.Group(); W.add(crow);
  const black = toon(0x1d1f24), sheen = toon(0x2c3340), beakM = toon(0x3a3a3a);
  const cbody = mesh(new THREE.IcosahedronGeometry(0.34, 1), black); cbody.scale.set(1.45, 0.95, 0.85); crow.add(cbody);
  const chead = new THREE.Group(); chead.position.set(0.48, 0.28, 0); crow.add(chead);
  chead.add(mesh(new THREE.IcosahedronGeometry(0.2, 1), sheen));
  const beak = mesh(new THREE.ConeGeometry(0.075, 0.36, 5), beakM); beak.rotation.z = -Math.PI / 2; beak.position.set(0.3, -0.03, 0); chead.add(beak);
  for (const sd of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.04, 8, 6), toon(0xf0e6c8)); e.position.set(0.12, 0.06, sd * 0.13); chead.add(e); const p = mesh(new THREE.SphereGeometry(0.024, 6, 5), toon(0x080808)); p.position.set(0.02, 0, sd * 0.015); e.add(p); }
  const tail = mesh(new THREE.ConeGeometry(0.2, 0.55, 4), black); tail.rotation.z = Math.PI / 2 + 0.25; tail.scale.z = 0.35; tail.position.set(-0.62, 0.05, 0); crow.add(tail);
  const wings = [-1, 1].map(sd => { const piv = new THREE.Group(); piv.position.set(0.05, 0.16, sd * 0.24); crow.add(piv); const w = mesh(new THREE.ConeGeometry(0.28, 0.85, 4), sheen); w.rotation.set(sd * Math.PI / 2, 0, Math.PI / 2 + 0.2); w.scale.set(1, 1, 0.25); w.position.set(-0.2, 0, sd * 0.32); piv.add(w); return { piv, sd }; });
  const legs = [-1, 1].map(sd => { const l = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), beakM); l.position.set(0.05, -0.42, sd * 0.1); crow.add(l); return l; });
  const flap = (t, k = 1) => wings.forEach(({ piv, sd }) => piv.rotation.x = -sd * (0.2 + Math.sin(t) * 0.9 * k));
  const fold = () => wings.forEach(({ piv, sd }) => piv.rotation.x = sd * 0.1);
  crow.scale.setScalar(0.9);
  // ---- clay pitcher (lathe) with water inside ----
  const PX = 0.6, PZ = -3.2;
  const prof = [[0.0, 0], [0.42, 0.02], [0.55, 0.35], [0.6, 0.75], [0.5, 1.15], [0.3, 1.45], [0.26, 1.7], [0.33, 1.85]].map(([x, y]) => new THREE.Vector2(x, y));
  const pitcher = mesh(new THREE.LatheGeometry(prof, 12), toon(0xb5652e, { side: THREE.DoubleSide })); pitcher.position.set(PX, 0, PZ); W.add(pitcher);
  const band = mesh(new THREE.TorusGeometry(0.6, 0.03, 4, 14), toon(0xe0b070)); band.rotation.x = Math.PI / 2; band.position.set(PX, 0.75, PZ); W.add(band);
  const handle = mesh(new THREE.TorusGeometry(0.28, 0.05, 5, 10, Math.PI), toon(0xa85a2a)); handle.position.set(PX - 0.45, 1.2, PZ); handle.rotation.z = Math.PI / 2; W.add(handle);
  const water = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 12), toon(0x4a9ad0)); W.add(water);
  const setWater = k => { const y = lerp(0.25, 1.72, k); water.position.set(PX, y, PZ); const r = y < 0.75 ? lerp(0.42, 0.6, y / 0.75) : lerp(0.6, 0.27, clamp((y - 0.75) / 0.95)); water.scale.set(r / 0.42, 1, r / 0.42); };
  // stones on the ground and falling stones
  const R = rng(17); const stoneM = [toon(0x9a9389), toon(0x7f786e), toon(0xb3ab9e)];
  const pile = Array.from({ length: 22 }, (_, i) => { const s = mesh(new THREE.DodecahedronGeometry(0.09 + R() * 0.05, 0), stoneM[i % 3]); s.position.set(-1.8 + R() * 1.4, 0.06, -2.6 - R() * 1.4); W.add(s); return s; });
  const falling = mesh(new THREE.DodecahedronGeometry(0.11, 0), stoneM[0]); W.add(falling);
  const splash = Array.from({ length: 6 }, () => { const d = drop(); W.add(d); return d; });
  const heat = Array.from({ length: 6 }, () => { const h = mesh(new THREE.TorusGeometry(0.5, 0.02, 4, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); W.add(h); return h; });
  const sunDisk = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: 0xfff0b0 })); W.add(sunDisk);
  const st = makeStick(STORYTELLER); W.add(st.root);

  function reset(sky = SKIES.desert) { W.visible = true; E.group.visible = false; scene.background = sky; aimSun(V3(0, 0, -3), V3(-12, 16, 10), 0xffe0a8, 3.2); hemi.intensity = 1.1;
    crow.visible = true; crow.position.set(0, 0.42, -2.4); crow.rotation.set(0, 0, 0); chead.rotation.set(0, 0, 0); fold(); legs.forEach(l => l.visible = true);
    setWater(0); falling.visible = false; splash.forEach(d => d.visible = false); heat.forEach(h => h.visible = false); sunDisk.visible = false; st.root.visible = false; pitcher.rotation.set(0, 0, 0); pitcher.position.set(PX, 0, PZ); }
  const cam = (x, y, z, lx, ly, lz, fov = 46) => { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; };
  // stone drop cycle: crow at the pile -> flies to rim -> drops stone. Returns phase info.
  function dropCycle(t, period, base) { const ph = (t % period) / period; const atRim = ph > 0.45;
    crow.position.set(lerp(-1.0, PX - 0.45, ease(clamp((ph - 0.15) / 0.3))), atRim ? 1.95 : 0.42 + 1.5 * Math.sin(clamp((ph - 0.15) / 0.3) * Math.PI) * 0.6 + (ph > 0.15 ? clamp((ph - 0.15) / 0.3) * 1.53 : 0), PZ);
    if (ph > 0.15 && ph < 0.45) flap(t * 18, 1); else fold(); chead.rotation.z = atRim ? -0.6 : ph < 0.15 ? -0.9 : 0;
    falling.visible = ph < 0.75; const fk = clamp((ph - 0.6) / 0.15);
    if (ph < 0.6) falling.position.copy(crow.position).add(V3(0.65 * Math.cos(chead.rotation.z), 0.2 + 0.3 * Math.sin(chead.rotation.z), 0)); else falling.position.set(PX, lerp(1.9, base, fk), PZ);
    splash.forEach((d, i) => { d.visible = ph > 0.75 && ph < 0.9; const a = i / 6 * 6.28; const v = (ph - 0.75) / 0.15; d.position.set(PX + Math.cos(a) * 0.25 * v, base + 0.25 + Math.sin(v * Math.PI) * 0.35, PZ + Math.sin(a) * 0.25 * v); d.scale.setScalar(0.7); }); }

  return [
    // 1 – blazing heat; the crow staggers along the dry ground, beak open
    (lt, d, t) => { reset(); const u = lt / d; sunDisk.visible = true; sunDisk.position.set(-4, 9, -14);
      crow.position.set(lerp(-3.2, -0.8, u), 0.42 + Math.abs(Math.sin(t * 5)) * 0.05, -2.2); crow.rotation.z = Math.sin(t * 5) * 0.08; chead.rotation.z = -0.25;
      heat.forEach((h, i) => { h.visible = true; const v = (t * 0.4 + i / 6) % 1; h.position.set(-3 + i * 1.3, 0.3 + v * 2.2, -4); h.material.opacity = 0.25 * Math.sin(v * Math.PI); });
      cam(0, 1.6, lerp(5.5, 4.6, ease(u)), -0.6, 0.9, -2.6, 44); },
    // 2 – he spots the pitcher, flies to the rim and peeks in (cutaway: water low inside)
    (lt, d, t) => { reset(); const u = lt / d; const k = ease(clamp(u / 0.45));
      crow.position.set(lerp(-1.6, PX - 0.42, k), lerp(0.42, 1.95, k) + Math.sin(k * Math.PI) * 0.8, PZ); if (k < 1) flap(t * 16, 1); else { fold(); chead.rotation.z = -0.9; }
      cam(lerp(2.5, 1.6, ease(u)), lerp(2.2, 3.4, ease(u)), lerp(4.8, 2.4, ease(u)), PX, lerp(1.4, 0.9, ease(u)), PZ, 46); },
    // 3 – beak too short; tries to tip the pitcher – too heavy
    (lt, d, t) => { reset(); const u = lt / d;
      if (u < 0.5) { crow.position.set(PX - 0.42, 1.95, PZ); chead.rotation.z = -0.9 - Math.abs(Math.sin(t * 6)) * 0.35; }
      else { crow.position.set(PX - 0.9, 0.42, PZ); crow.rotation.z = -0.25 - Math.abs(Math.sin(t * 7)) * 0.1; flap(t * 20, 0.5); pitcher.rotation.z = Math.sin(t * 12) * 0.015; }
      cam(1.4, 2.0, 2.8, PX - 0.2, 1.4, PZ, 46); },
    // 4 – the idea: picks up a stone and drops it in – plop
    (lt, d, t) => { reset(); const u = lt / d; if (u < 0.2) { crow.position.set(-0.9, 0.42, -3.0); chead.rotation.z = -0.2 + Math.sin(t * 3) * 0.1; } else dropCycle((u - 0.2) * d, (1 - 0.2) * d, 0.3);
      setWater(0.02 * clamp((u - 0.8) * 5)); cam(0.3, 1.9, 4.6, -0.2, 1.1, PZ, 46); },
    // 5 – another, and another: plop, plop, plop – the water creeps up (cutaway view)
    (lt, d, t) => { reset(); const u = lt / d; dropCycle(t, 1.2, lerp(0.35, 0.9, u)); setWater(lerp(0.05, 0.45, u));
      pile.forEach((s, i) => s.visible = i < 22 - Math.floor(u * 10));
      cam(1.2, 2.2, 3.6, PX - 0.3, 1.2, PZ, 46); },
    // 6 – the water reaches his beak; he drinks deeply
    (lt, d, t) => { reset(); const u = lt / d; setWater(lerp(0.5, 0.95, ease(clamp(u / 0.5)))); pile.forEach((s, i) => s.visible = i < 8);
      crow.position.set(PX - 0.42, 1.95, PZ); chead.rotation.z = u > 0.5 ? -0.7 + Math.sin(t * 6) * 0.2 : -0.5; if (u > 0.75) { chead.rotation.z = 0.5; flap(t * 10, 0.4); }
      cam(1.5, 2.6, 2.6, PX - 0.2, 1.8, PZ, 44); },
    // 7 – moral: the storyteller beside the pitcher, the crow perched proudly on top
    (lt, d, t) => { reset(SKIES.day); st.root.visible = true; st.rest(); st.root.position.set(-1.3, 0, -2.6); st.root.rotation.y = 0.35; st.expr('smile', 0.6);
      st.arms[1].sh.rotation.set(-0.3, 0, 2.5); st.arms[1].el.rotation.set(-1.4, 0, 0.8 + Math.sin(t * 5) * 0.15);
      setWater(0.95); crow.position.set(PX, 2.25, PZ); crow.rotation.y = 0.5; chead.rotation.z = 0.3; pile.forEach((s, i) => s.visible = i < 8);
      cam(-0.2, 1.9, 4.6, -0.3, 1.6, PZ, 46); },
    (lt, d, t) => { W.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
