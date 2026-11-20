// SOC-004 – After Thunder Comes Rain. Source: Diogenes Laertius, Lives II.36 (Yonge tr.).
// Xanthippe scolds Socrates, then drenches him with a bucket; he answers with the thunder-and-rain line.
import { agora } from '../../engine/sets/agora.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture,
    makeStick, SOCRATES, XANTHIPPE, drop } = ctx;
  const A = agora(ctx, { crowd: false }); const G = A.group; const E = endcard(ctx, SOCRATES);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const soc = makeStick(SOCRATES), xan = makeStick(XANTHIPPE); G.add(soc.root); G.add(xan.root);
  const cit = [makeStick({ robe: 0x3d7ea6, hair: 0x2a1a10, seed: 141 }), makeStick({ robe: 0xe0a030, beard: 0x3b2a1a, hat: 0xb5262e, seed: 142 })]; cit.forEach(c => G.add(c.root));
  const bench = outlined(new THREE.BoxGeometry(2.2, 0.55, 0.8), toon(0xd9cbb0), 1.03); G.add(bench);
  const bucket = new THREE.Group(); G.add(bucket);
  { const b = outlined(new THREE.CylinderGeometry(0.34, 0.27, 0.55, 14, 1, true), toon(0x8a5a36, { side: THREE.DoubleSide }), 1.06); bucket.add(b);
    const hd = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 16, Math.PI), BLACK); hd.position.y = 0.27; bucket.add(hd);
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.31, 16), toon(0x5bb3e0)); w.rotation.x = -Math.PI / 2; w.position.y = 0.18; bucket.add(w); }
  const water = Array.from({ length: 26 }, () => { const d = drop(); G.add(d); return d; });
  const drips = Array.from({ length: 6 }, () => { const d = drop(); G.add(d); return d; });
  const cloud = new THREE.Group(); G.add(cloud);
  [[0, 0, 0.7], [-0.6, -0.1, 0.5], [0.6, -0.1, 0.55], [0.25, 0.3, 0.5]].forEach(([x, y, r]) => { const c = outlined(new THREE.SphereGeometry(r, 14, 10), toon(0x5a5f6e), 1.05); c.position.set(x, y, 0); cloud.add(c); });
  const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 3), new THREE.MeshBasicMaterial({ color: 0xffd23f })); bolt.rotation.z = 0.4; cloud.add(bolt);
  const rain = Array.from({ length: 10 }, () => { const d = drop(); cloud.add(d); return d; });
  const zig = Array.from({ length: 6 }, () => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), BLACK); G.add(s); return s; });
  const coin = new THREE.Group(); G.add(coin); { const p = outlined(new THREE.SphereGeometry(0.22, 12, 10), toon(0x8a5a36), 1.08); p.scale.set(1, 1.2, 0.8); coin.add(p); }
  const sunG = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f })); G.add(sunG);

  const SOC = V3(-0.9, 0, 0.4), XAN = V3(1.4, 0, 0.6);
  function reset(t) { G.visible = true; E.group.visible = false; scene.background = SKIES.day; aimSun(V3(0, 0, -2), V3(-10, 20, 14), 0xfff0d0, 2.4); hemi.intensity = 1.5;
    for (const r of [soc, xan, ...cit]) { r.rest(); r.root.visible = true; r.root.rotation.set(0, 0, 0); r.expr('smile', 0.3); r.look(0, 0); r.headG.rotation.set(0, 0, 0); }
    cit.forEach(c => c.root.visible = false); soc.root.position.copy(SOC); xan.root.position.copy(XAN); soc.root.rotation.y = 0.5; xan.root.rotation.y = -0.6;
    bench.visible = false; bucket.visible = false; water.forEach(d => d.visible = false); drips.forEach(d => d.visible = false); cloud.visible = false; zig.forEach(z => z.visible = false); coin.visible = false; sunG.visible = false; }
  const mad = (r, t, k = 1) => { r.expr('open', -1.2 * k); r.arms[0].sh.rotation.set(-0.3, 0, -1.2 - Math.sin(t * 9) * 0.4 * k); r.arms[1].sh.rotation.set(-0.3, 0, 1.2 + Math.sin(t * 9 + 1) * 0.4 * k); r.body.position.y = Math.abs(Math.sin(t * 8)) * 0.06 * k; };
  const stormOver = (r, t, rainOn = false) => { cloud.visible = true; cloud.position.copy(r.root.position).add(V3(0, 4.3 + Math.sin(t * 2) * 0.06, 0)); bolt.position.set(0.1, -0.7, 0.3); bolt.visible = Math.sin(t * 7) > 0.6;
    rain.forEach((d, i) => { d.visible = rainOn; const v = (t * 1.6 + i / 10) % 1; d.position.set(-0.7 + (i % 5) * 0.35, -0.5 - v * 1.4, 0.1); d.scale.setScalar(0.8); }); };
  const cam = (x, y, z, lx, ly, lz, fov = 48) => { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; };

  return [
    // 1 – Socrates and Xanthippe; a little thundercloud follows her
    (lt, d, t) => { reset(t); const u = lt / d; soc.expr('smile', 0.5); xan.expr('flat', -0.6); stormOver(xan, t); soc.arms[1].sh.rotation.set(-0.3, 0, 0.5); xan.arms.forEach(a => { a.sh.rotation.set(-0.9, 0, a.side * 0.5); a.el.rotation.set(-1.8, 0, 0); });
      cam(0.2, 2.6, lerp(12.5, 11.5, ease(u)), 0.2, 2.4, 0.4); },
    // 2 – he asks questions all day; she holds up an empty purse
    (lt, d, t) => { reset(t); const u = lt / d; cit.forEach((c, i) => { c.root.visible = true; c.root.position.set(-3.2 + i * 1.3, 0, -0.6); c.root.rotation.y = 0.9; c.headG.rotation.z = Math.sin(t * 2 + i) * 0.12; c.expr('open', 0.2); });
      soc.root.position.set(-0.4, 0, 0.3); soc.root.rotation.y = -0.9; soc.expr('open', 0.5); soc.arms[1].sh.rotation.set(-0.3, 0, 1.6 + Math.sin(t * 3) * 0.3); soc.arms[1].el.rotation.z = 0.6;
      xan.root.position.set(1.7, 0, 1.0); xan.root.rotation.y = -0.5; xan.expr('flat', -1); coin.visible = true; coin.position.set(1.7 + 0.55, 2.4 + Math.sin(t * 6) * 0.05, 1.3); xan.arms[1].sh.rotation.set(-0.3, 0, 2.3); xan.arms[1].el.rotation.z = 0.4;
      cam(-0.6, 2.6, 13.5, -0.6, 2.2, 0); },
    // 3 – an hour of shouting; Socrates sits, calm as a mountain, while the sky moves on
    (lt, d, t) => { reset(t); const u = lt / d; scene.background = u > 0.5 ? SKIES.sunset : SKIES.day; if (u > 0.5) { aimSun(V3(0, 0, -2), V3(10, 6, 12), 0xffa060, 1.8); hemi.intensity = 1.2; }
      bench.visible = true; bench.position.set(SOC.x, 0.28, SOC.z - 0.1); soc.sit(); soc.root.position.set(SOC.x, 0.85, SOC.z); soc.expr('smile', 0.2); soc.root.rotation.y = 0.4; soc.eyes.forEach(e => e.e.scale.y = 0.15);
      mad(xan, t); stormOver(xan, t); zig.forEach((z, i) => { z.visible = true; const a = i / 6 * Math.PI - Math.PI / 2; z.position.set(XAN.x + Math.cos(a) * 0.9, 3.0 + Math.sin(a) * 0.9, XAN.z + 0.2); z.rotation.z = a; z.scale.y = 0.7 + 0.4 * Math.abs(Math.sin(t * 12 + i)); });
      sunG.visible = true; sunG.position.set(lerp(-6, 6, u), lerp(9, 4.5, u), -14);
      cam(0.2, 2.6, 12.5, 0.2, 2.2, 0.3); },
    // 4 – the bucket!
    (lt, d, t) => { reset(t); const u = lt / d; soc.sit(); bench.visible = true; bench.position.set(SOC.x, 0.28, SOC.z - 0.1); soc.root.position.set(SOC.x, 0.85, SOC.z); soc.root.rotation.y = 0.4; soc.expr('smile', 0.2);
      const w = ease(clamp(u / 0.35)); xan.root.position.set(lerp(XAN.x, SOC.x + 1.5, w), 0, lerp(XAN.z, SOC.z - 0.3, w)); xan.root.rotation.y = -1.2; xan.walk(t * 9, w < 1 ? 1 : 0); xan.expr('open', -1.2);
      bucket.visible = true; const tip = ease(clamp((u - 0.45) / 0.15)); bucket.position.set(SOC.x + 0.35 + (1 - tip) * 0.6 + (w < 1 ? (XAN.x - SOC.x) * (1 - w) : 0), lerp(1.8, 4.3, w) , SOC.z + 0.35); bucket.rotation.z = tip * 2.4;
      xan.arms.forEach(a => { a.sh.rotation.set(-0.2, 0, a.side * (0.6 + 2.0 * w)); });
      water.forEach((dd, i) => { const v = clamp((u - 0.55 - (i % 9) * 0.015) / 0.35); dd.visible = v > 0 && v < 1; dd.position.set(SOC.x + 0.2 + Math.sin(i * 2.1) * 0.4, 4.0 - v * 3.0, SOC.z + 0.35 + Math.cos(i) * 0.3); dd.scale.setScalar(1.3); });
      soc.eyes.forEach(e => e.e.scale.y = u > 0.55 ? 0.1 : 1);
      cam(0.0, 2.8, 11.5, -0.1, 2.6, 0.3, 50); },
    // 5 – dripping wet: "after thunder, there would be rain"
    (lt, d, t) => { reset(t); const u = lt / d; soc.sit(); bench.visible = true; bench.position.set(SOC.x, 0.28, SOC.z - 0.1); soc.root.position.set(SOC.x, 0.85, SOC.z); soc.root.rotation.y = 0.35; soc.expr(Math.sin(t * 9) > 0 ? 'open' : 'smile', 0.3); soc.arms[1].sh.rotation.set(-0.3, 0, 1.5); soc.arms[1].el.rotation.z = 0.6;
      drips.forEach((dd, i) => { dd.visible = true; const v = (t * 0.9 + i / 6) % 1; dd.position.set(SOC.x - 0.5 + i * 0.2, 3.6 - v * 2.2, SOC.z + 0.5); dd.scale.setScalar(1.1); });
      xan.root.position.set(SOC.x + 1.6, 0, SOC.z + 0.5); xan.root.rotation.y = -1.0; xan.expr('open', 0.6); xan.eyes.forEach(e => e.e.scale.y = 1.25); bucket.visible = true; bucket.position.set(SOC.x + 2.2, 1.6, SOC.z + 0.8); bucket.rotation.z = Math.PI;
      stormOver(soc, t, true); bolt.visible = false;
      cam(0.0, 2.6, 9.5, 0.0, 2.4, 0.4); },
    // 6 – even Xanthippe almost laughs
    (lt, d, t) => { reset(t); const u = lt / d; soc.sit(); bench.visible = true; bench.position.set(SOC.x, 0.28, SOC.z - 0.1); soc.root.position.set(SOC.x, 0.85, SOC.z); soc.root.rotation.y = 0.35; soc.expr('smile', 0.6);
      xan.root.position.set(SOC.x + 1.6, 0, SOC.z + 0.5); xan.root.rotation.y = -0.6; const k = u > 0.35 && u < 0.8; xan.expr(k ? 'smile' : 'flat', k ? 0.6 : -0.6); xan.arms[1].sh.rotation.set(-1.6, 0, 0.6); xan.arms[1].el.rotation.set(-1.8, 0, 0.4); xan.body.position.y = k ? Math.abs(Math.sin(t * 14)) * 0.03 : 0;
      drips.forEach((dd, i) => { dd.visible = true; const v = (t * 0.9 + i / 6) % 1; dd.position.set(SOC.x - 0.5 + i * 0.2, 3.6 - v * 2.2, SOC.z + 0.5); });
      cam(0.0, 2.6, lerp(9.5, 8.5, ease(u)), 0.0, 2.6, 0.4); },
    // 7 – the lesson: the storm passes, the sun comes out over a calm Socrates
    (lt, d, t) => { reset(t); const u = lt / d; soc.root.position.set(0, 0, 0.4); soc.root.rotation.y = 0; soc.expr('smile', 0.6); soc.arms[1].sh.rotation.set(-0.3, 0, 2.3 + Math.sin(t * 2) * 0.1); soc.arms[1].el.rotation.z = 0.5; xan.root.visible = false;
      cloud.visible = u < 0.55; if (cloud.visible) { cloud.position.set(lerp(0, 4.5, ease(u / 0.55)), 4.6, 0.4); bolt.visible = false; rain.forEach((dd, i) => { dd.visible = true; const v = (t * 1.6 + i / 10) % 1; dd.position.set(-0.7 + (i % 5) * 0.35, -0.5 - v * 1.4, 0.1); }); }
      sunG.visible = true; sunG.position.set(-2.5, lerp(3, 8.5, ease(clamp((u - 0.35) / 0.4))), -14);
      cam(0.0, 2.8, 10.5, 0.0, 2.8, 0.4); },
    // 8 – end card
    (lt, d, t) => { G.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
