// Reusable set: West African village and bush – red earth, round thatched huts, palms, a silk-cotton tree with a beehive, a baobab with a den.
// Usage: const W = westafrica(ctx); W.group, W.origin, W.hive (world-local position), W.den (den mouth local pos), W.rock
export function westafrica(ctx) {
  const { THREE, scene, rng, toon, outlined, BLACK } = ctx;
  const g = new THREE.Group(); g.position.set(-700, 0, 0); scene.add(g);
  const R = rng(17);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), toon(0xc4673a)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  const grass = new THREE.Mesh(new THREE.CircleGeometry(22, 40), toon(0xa8a24a)); grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0.01, -8); g.add(grass);
  function hut(x, z, s = 1) { const h = new THREE.Group(); h.position.set(x, 0, z); h.scale.setScalar(s);
    const w = outlined(new THREE.CylinderGeometry(1.4, 1.45, 1.7, 18), toon(0xe3b27a), 1.03); w.position.y = 0.85; h.add(w);
    const r = outlined(new THREE.ConeGeometry(2.0, 1.9, 18), toon(0xc9a24a), 1.03); r.position.y = 2.65; h.add(r);
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.1), toon(0x4a2e1a)); d.position.set(0, 0.55, 1.42); h.add(d);
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.07, 6, 24), toon(0xb03a2e)); band.rotation.x = Math.PI / 2; band.position.y = 1.1; h.add(band); g.add(h); }
  [[-9, -9, 1], [-5.5, -13, 1.1], [7, -10, 1], [11, -15, 1.15], [-13, -16, 1], [2, -17, 1.2]].forEach(([x, z, s]) => hut(x, z, s));
  function palm(x, z, h = 6, lean = 0.2) { const p = new THREE.Group(); p.position.set(x, 0, z);
    for (let i = 0; i < 8; i++) { const seg = outlined(new THREE.CylinderGeometry(0.2 - i * 0.012, 0.23 - i * 0.012, h / 8 + 0.05, 8), toon(i % 2 ? 0x9a6b42 : 0x8a5a36), 1.05); seg.position.set(lean * i * 0.16, h / 16 + i * h / 8, 0); seg.rotation.z = -lean * 0.3; p.add(seg); }
    const top = new THREE.Group(); top.position.set(lean * 1.1, h, 0); p.add(top);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const fr = outlined(new THREE.SphereGeometry(0.5, 10, 6), toon(i % 2 ? 0x4f9a3f : 0x5fb04a), 1.05); fr.scale.set(3.2, 0.12, 0.7); fr.position.set(Math.cos(a) * 1.5, -0.15, Math.sin(a) * 1.5); fr.rotation.y = -a; fr.rotation.z = -0.25; top.add(fr); } g.add(p); }
  [[-15, -4, 7, 0.25], [14, -6, 6.5, -0.2], [-3, -20, 7.5, 0.1], [17, -19, 7, -0.25], [-18, -14, 6.5, 0.2]].forEach(([x, z, h, l]) => palm(x, z, h, l));
  // silk-cotton tree with a beehive (left of the stage)
  const sc = new THREE.Group(); sc.position.set(-7.5, 0, -2.5); g.add(sc);
  const trunk = outlined(new THREE.CylinderGeometry(0.7, 1.4, 9, 14), toon(0x8a7a66), 1.04); trunk.position.y = 4.5; sc.add(trunk);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const fin = outlined(new THREE.BoxGeometry(0.15, 3, 1.6), toon(0x8a7a66), 1.04); fin.position.set(Math.cos(a) * 1.0, 1.5, Math.sin(a) * 1.0); fin.rotation.y = -a; sc.add(fin); }
  for (let i = 0; i < 6; i++) { const c = outlined(new THREE.SphereGeometry(2.2 + R() * 0.8, 14, 10), toon(i % 2 ? 0x4f9a3f : 0x5fb04a), 1.04); c.position.set((R() - 0.5) * 5, 9.5 + R() * 1.5, (R() - 0.5) * 4); c.scale.y = 0.7; sc.add(c); }
  const hive = outlined(new THREE.SphereGeometry(0.55, 14, 10), toon(0xb98a46), 1.06); hive.scale.y = 1.3; hive.position.set(1.5, 3.8, 1.0); sc.add(hive);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), BLACK); hole.position.set(1.5, 3.55, 1.52); sc.add(hole);
  // baobab with a den (right of the stage)
  const bb = new THREE.Group(); bb.position.set(8.5, 0, -3.5); g.add(bb);
  const bt = outlined(new THREE.CylinderGeometry(1.7, 2.3, 6.5, 18), toon(0x9a8268), 1.03); bt.position.y = 3.25; bb.add(bt);
  for (let i = 0; i < 5; i++) { const a = -0.8 + i * 0.4; const br = outlined(new THREE.CylinderGeometry(0.2, 0.4, 3, 8), toon(0x9a8268), 1.05); br.position.set(Math.sin(a) * 1.5, 7.5, 0); br.rotation.z = -a * 0.9; bb.add(br);
    const lf = outlined(new THREE.SphereGeometry(0.9, 10, 8), toon(0x5fb04a), 1.05); lf.position.set(Math.sin(a) * 2.8, 9.0, 0); bb.add(lf); }
  const den = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), BLACK); den.scale.set(1, 1.2, 0.5); den.position.set(-0.6, 0.0, 2.1); den.rotation.y = -0.2; bb.add(den);
  const rock = outlined(new THREE.SphereGeometry(1.1, 12, 8), toon(0x8d8a84), 1.05); rock.scale.set(1.2, 0.7, 1); rock.position.set(3.6, 0.5, 0.3); g.add(rock);
  const rockTop = V => V; 
  return { group: g, origin: g.position, hiveLocal: new THREE.Vector3(-7.5 + 1.5, 3.8, -2.5 + 1.0), denLocal: new THREE.Vector3(8.5 - 0.6, 0.6, -3.5 + 2.1), rockLocal: new THREE.Vector3(3.6, 1.2, 0.3) };
}
