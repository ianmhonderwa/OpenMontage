// Reusable set: sunny Greek countryside meadow – ground, rolling hills, trees, flowers, a fence and a stream.
// Usage: const M = meadow(ctx); M.group (visibility), M.shadeTree (big tree at 'shade' spot)
export function meadow(ctx) {
  const { THREE, scene, rng, toon, outlined, makeTree } = ctx;
  const g = new THREE.Group(); g.position.set(0, 0, 0); scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), toon(0x8fcf6a)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  [[-26, -30, 14], [4, -38, 18], [30, -34, 15], [-8, -22, 8], [18, -24, 9]].forEach(([x, z, r], i) => { const h = outlined(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), toon(i % 2 ? 0x7cc15c : 0x86c964), 1.005); h.position.set(x, 0, z); g.add(h); });
  const R = rng(5);
  [[-9, -12, 4.2], [8, -13, 4.6], [-15, -7, 4], [14, -6, 3.8], [-5, -17, 5], [3, -19, 4.4], [-20, -14, 4.6], [20, -14, 4.2]].forEach(([x, z, h], i) => { const t = makeTree(h, 60 + i); t.position.set(x, 0, z); g.add(t); });
  const cols = [0xff6b8a, 0xffd23f, 0xffffff, 0xb07ae0];
  for (let i = 0; i < 70; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toon(cols[i % 4])); f.position.set((R() - 0.5) * 30, 0.1, 2 - R() * 18); g.add(f); }
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(60, 2.2), toon(0x5bb3e0)); stream.rotation.x = -Math.PI / 2; stream.position.set(0, 0.01, -9); g.add(stream);
  for (let i = -6; i <= 6; i++) { const p = outlined(new THREE.BoxGeometry(0.14, 1.0, 0.14), toon(0x9a6b42), 1.1); p.position.set(i * 1.6 - 14, 0.5, -6.2); if (i > 2 || i < -3) g.add(p); }
  const shadeTree = makeTree(5.2, 99); shadeTree.scale.setScalar(1.35); shadeTree.position.set(-1.6, 0, -1.8); g.add(shadeTree);
  return { group: g, shadeTree, origin: g.position };
}
