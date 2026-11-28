// Reusable set: the Athenian agora (stoa, stalls, olive trees, Acropolis on the hill) plus an optional crowd.
// Usage: const A = agora(ctx, { crowd: true }); A.group, A.crowd (array of { r, x, z, ph, dir }), A.idle(c, t)
export function agora(ctx, opts = {}) {
  const { THREE, scene, rng, toon, outlined, makeStick, column, oliveTree, stall } = ctx;
  const setA = new THREE.Group(); scene.add(setA);
  {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), toon(0xe6cc94)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; setA.add(ground);
    const paving = new THREE.Mesh(new THREE.CircleGeometry(9, 48), toon(0xd8b97c)); paving.rotation.x = -Math.PI / 2; paving.position.y = 0.01; paving.receiveShadow = true; setA.add(paving);
    // stoa behind
    for (let i = -6; i <= 6; i++) { const c = column(6, 0.42); c.position.set(i * 2.4, 0, -14); setA.add(c); }
    const beam = outlined(new THREE.BoxGeometry(31, 0.9, 1.4), toon(0xf3eee4), 1.01); beam.position.set(0, 6.8, -14); setA.add(beam);
    const roof = outlined(new THREE.BoxGeometry(31.5, 0.35, 4), toon(0xc8553d), 1.01); roof.position.set(0, 7.4, -15); setA.add(roof);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(31, 6.5, 0.4), toon(0xe9dcc3)); wall.position.set(0, 3.2, -16.6); setA.add(wall);
    // Acropolis on hill (far, peeking above the stoa)
    const hill = outlined(new THREE.SphereGeometry(30, 32, 16), toon(0xc9a56b), 1.005); hill.scale.set(1.6, 0.42, 0.6); hill.position.set(14, -2, -70); setA.add(hill);
    const temple = new THREE.Group(); temple.position.set(12, 10.4, -62); setA.add(temple);
    const tb = outlined(new THREE.BoxGeometry(13, 0.8, 6), toon(0xefe6d2), 1.02); temple.add(tb);
    for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 3.4, 10), toon(0xefe6d2)); c.position.set(-5.6 + i * 1.6, 2.1, 2.6); temple.add(c); }
    const tr = outlined(new THREE.BoxGeometry(13, 0.7, 6), toon(0xefe6d2), 1.02); tr.position.y = 4.1; temple.add(tr);
    const ped = outlined(new THREE.CylinderGeometry(3.2, 3.2, 13, 3, 1), toon(0xefe6d2), 1.02); ped.rotation.z = Math.PI / 2; ped.rotation.y = 0; ped.scale.set(0.42, 1, 1); ped.position.y = 5.0; temple.add(ped);
    // stalls & trees
    const st = [[-6.5, -6, 0xc8553d, 0.5], [6.8, -5.5, 0x3d7ea6, -0.45], [-8.5, 2, 0x4f8a4b, 1.1], [8.8, 2.5, 0xe0a030, -1.1]];
    st.forEach(([x, z, c, ry], i) => { const s = stall(c, 20 + i); s.position.set(x, 0, z); s.rotation.y = ry; setA.add(s); });
    [[-11, -10, 1.2, 4], [11.5, -9.5, 1.1, 5], [-4, -11, 0.9, 6], [13, 6, 1.3, 8]].forEach(([x, z, s, sd]) => { const t = oliveTree(s, sd); t.position.set(x, 0, z); setA.add(t); });
  }
  const crowd = [];
  if (opts.crowd !== false) {
  {
    const R = rng(99); const tunics = [0x3d7ea6, 0xc8553d, 0x4f8a4b, 0xe0a030, 0x8e5ba8, 0x2a9d8f, 0xd9a6a0, 0x6d6875];
    const hairs = [0x3b2a1a, 0x111111, 0x6b4423, null, 0x8a8a8a];
    const spots = [[-2.6, 2], [2.4, 1.2], [-3.2, -1.5], [3.4, -2.5], [-2.2, -4.5], [2.6, -5.6], [-4.8, 4.5], [4.5, 4.2], [-5.6, -3], [5.6, -0.5], [-1.5, -8], [1.8, -9]];
    spots.forEach(([x, z], i) => {
      const h = hairs[Math.floor(R() * hairs.length)];
      const r = makeStick({ robe: tunics[i % tunics.length], hair: h, hat: R() < 0.25 ? 0x9a6b42 : null, beard: R() < 0.4 ? 0x3b2a1a : null, seed: 30 + i });
      r.root.position.set(x, 0, z); r.root.rotation.y = (x < 0 ? 0.9 : -0.9) + (R() - 0.5) * 0.6; setA.add(r.root);
      crowd.push({ r, x, z, ph: R() * 6, dir: x < 0 ? -1 : 1 });
    });
  }
  }
  function idle(c, t) { c.r.rest(); c.r.body.position.y = Math.sin(t * 2 + c.ph) * 0.03; c.r.arms[0].sh.rotation.x = Math.sin(t * 1.3 + c.ph) * 0.15; c.r.expr('smile'); }
  function reset() { for (const c of crowd) { c.r.root.visible = true; c.r.root.position.set(c.x, 0, c.z); } }
  return { group: setA, crowd, idle, reset };
}
