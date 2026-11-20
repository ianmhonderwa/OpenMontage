// Reusable set: an old Anatolian town square – domed stone houses, a slender minaret, tea house, bazaar stalls, well, plane tree.
// Usage: const T = anatolia(ctx); T.group; T.dais (platform at (0,0,-4), top y = 0.6)
export function anatolia(ctx) {
  const { THREE, scene, rng, toon, outlined, stall, oliveTree } = ctx;
  const g = new THREE.Group(); scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), toon(0xe3c590)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  const cobble = new THREE.Mesh(new THREE.CircleGeometry(11, 56), toon(0xd2b078)); cobble.rotation.x = -Math.PI / 2; cobble.position.y = 0.01; cobble.receiveShadow = true; g.add(cobble);
  const R = rng(14);
  const wall = [0xf1e3c8, 0xd98a5a, 0xe9d3a8, 0xa9c8d6, 0xf1e3c8, 0xd9a07a];
  for (let i = 0; i < 13; i++) {                       // backdrop of houses with domes
    const x = -22 + i * 3.7 + (R() - 0.5) * 0.6, h = 3.2 + R() * 3.2, w = 3 + R() * 0.8, z = -15.5 - R() * 3;
    const b = outlined(new THREE.BoxGeometry(w, h, 3.4), toon(wall[i % wall.length]), 1.015); b.position.set(x, h / 2, z); b.receiveShadow = true; g.add(b);
    if (i % 3 !== 1) { const dome = outlined(new THREE.SphereGeometry(w * 0.45, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(i % 2 ? 0x6aa6a6 : 0xb8b0a0), 1.03); dome.position.set(x, h, z); g.add(dome); }
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.1), toon(0x4a3426)); door.position.set(x, 0.85, z + 1.72); g.add(door);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 14, 1, false, 0, Math.PI), toon(0x4a3426)); arch.rotation.set(Math.PI / 2, 0, Math.PI / 2); arch.position.set(x, 1.7, z + 1.72); g.add(arch);
    for (let k = 0; k < 2; k++) { const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.08), toon(0x35566a)); win.position.set(x + (k ? 0.9 : -0.9), h * 0.62, z + 1.72); g.add(win); }
  }
  const mn = outlined(new THREE.CylinderGeometry(0.45, 0.55, 12, 16), toon(0xf4efe4), 1.02); mn.position.set(-10.5, 6, -18); g.add(mn);
  const bal = outlined(new THREE.CylinderGeometry(0.85, 0.7, 0.35, 16), toon(0xe0d4bc), 1.04); bal.position.set(-10.5, 9.4, -18); g.add(bal);
  const cone = outlined(new THREE.ConeGeometry(0.62, 2.6, 16), toon(0x5a8f93), 1.03); cone.position.set(-10.5, 13.3, -18); g.add(cone);
  // tea house with awning, stools and tea glasses
  const th = outlined(new THREE.BoxGeometry(4.2, 3, 3), toon(0xe9d3a8), 1.015); th.position.set(9.5, 1.5, -7); g.add(th);
  const aw = outlined(new THREE.BoxGeometry(4.6, 0.12, 2.4), toon(0xc8553d), 1.04); aw.position.set(9.5, 3.05, -5.2); aw.rotation.x = 0.18; g.add(aw);
  for (let i = 0; i < 3; i++) { const st = outlined(new THREE.CylinderGeometry(0.26, 0.22, 0.45, 10), toon(0x8a5a36), 1.06); st.position.set(8.2 + i * 1.4, 0.22, -4.4); g.add(st);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.14, 8), toon(0xc2402a)); gl.position.set(8.2 + i * 1.4, 0.52, -4.4); g.add(gl); }
  [[-8.5, -6.5, 0x3d7ea6, 0.4], [-11, -3.5, 0x4f8a4b, 0.9]].forEach(([x, z, c, ry], i) => { const s = stall(c, 30 + i); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s); });
  const well = outlined(new THREE.CylinderGeometry(0.8, 0.9, 0.9, 18), toon(0xb8aa94), 1.04); well.position.set(7.4, 0.45, 2.2); g.add(well);
  for (const sx of [-0.75, 0.75]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 6), toon(0x6b4423)); post.position.set(7.4 + sx, 1.7, 2.2); g.add(post); }
  const wr = outlined(new THREE.BoxGeometry(2.0, 0.12, 1.2), toon(0xc8553d), 1.05); wr.position.set(7.4, 2.65, 2.2); g.add(wr);
  const pt = oliveTree(1.6, 77); pt.position.set(-9.5, 0, 1.5); g.add(pt);
  const dais = outlined(new THREE.BoxGeometry(3.4, 0.6, 2.4), toon(0x9a6b42), 1.03); dais.position.set(0, 0.3, -4); dais.receiveShadow = true; g.add(dais);
  const step = outlined(new THREE.BoxGeometry(1.4, 0.3, 0.6), toon(0x8a5a36), 1.04); step.position.set(0, 0.15, -2.6); g.add(step);
  return { group: g, dais };
}
