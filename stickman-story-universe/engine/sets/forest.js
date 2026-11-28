// Reusable set: old German forest clearing with a mossy stone well under a linden tree (GRM series).
// Usage: const F = forest(ctx); F.group, F.wellPos (x,z), F.water (disc at the well mouth)
export function forest(ctx) {
  const { THREE, scene, rng, toon, outlined, makeTree } = ctx;
  const g = new THREE.Group(); g.position.set(0, 0, 700); scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), toon(0x62a04c)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 60), toon(0xc8a46a)); path.rotation.x = -Math.PI / 2; path.position.set(3.4, 0.01, -26); path.rotation.z = 0.12; g.add(path);
  const R = rng(9);
  for (let i = 0; i < 22; i++) { const x = (R() - 0.5) * 44, z = -6 - R() * 26; if (Math.abs(x - 3.4) < 3.5 && z > -40) continue; const h = 4 + R() * 3;
    const t = new THREE.Group(); t.position.set(x, 0, z); const tr = outlined(new THREE.CylinderGeometry(0.25, 0.35, 1.4, 8), toon(0x6b4423), 1.06); tr.position.y = 0.7; t.add(tr);
    for (let k = 0; k < 3; k++) { const c = outlined(new THREE.ConeGeometry(1.5 - k * 0.3, h * 0.45, 10), toon(k % 2 ? 0x2f6b3f : 0x3a7d48), 1.04); c.position.y = 1.6 + k * h * 0.28; t.add(c); } g.add(t); }
  const linden = makeTree(4.6, 21); linden.scale.setScalar(1.5); linden.position.set(-2.4, 0, -1.8); g.add(linden);
  const wellPos = { x: 0, z: -1 };
  const ring = outlined(new THREE.CylinderGeometry(1.0, 1.1, 1.0, 20, 1, true), toon(0x9a9a8f, { side: THREE.DoubleSide }), 1.03); ring.position.set(wellPos.x, 0.5, wellPos.z); g.add(ring);
  const rim = outlined(new THREE.TorusGeometry(1.02, 0.12, 8, 28), toon(0xaaa89c), 1.05); rim.rotation.x = Math.PI / 2; rim.position.set(wellPos.x, 1.0, wellPos.z); g.add(rim);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), toon(0x2f6fa8)); water.rotation.x = -Math.PI / 2; water.position.set(wellPos.x, 0.45, wellPos.z); g.add(water);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), toon(0x5bb04a)); m.scale.y = 0.4; m.position.set(wellPos.x + Math.cos(a) * 1.08, 0.2 + R() * 0.4, wellPos.z + Math.sin(a) * 1.08); g.add(m); }
  for (let i = 0; i < 9; i++) { const mx = (R() - 0.5) * 12, mz = 1 - R() * 7; const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 6), toon(0xf0e6d0)); st.position.set(mx, 0.1, mz); g.add(st);
    const cap = outlined(new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xc8323c), 1.1); cap.position.set(mx, 0.2, mz); g.add(cap); }
  return { group: g, origin: g.position, wellPos, water };
}
