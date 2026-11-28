// Reusable set: a candle-lit castle hall (long table, door, tapestries, window, stairs) with a bed in the corner (bedchamber).
// Usage: const C = castle(ctx); C.group, C.origin; coordinates are local to the group (add objects to C.group).
export function castle(ctx) {
  const { THREE, scene, toon, outlined, column, radialTexture } = ctx;
  const g = new THREE.Group(); g.position.set(0, 0, -700); scene.add(g);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), toon(0xc9b38f)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2) { const t = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), toon(0xb59d77)); t.rotation.x = -Math.PI / 2; t.position.set(-9 + i * 3.6 + 1.8, 0.005, -8 + j * 3.6 + 1.8); g.add(t); }
  const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 9, 0.5), toon(0xe0d2b4)); wall.position.set(0, 4.5, -9); wall.receiveShadow = true; g.add(wall);
  const wl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 18), toon(0xd9c9a8)); wl.position.set(-11, 4.5, 0); g.add(wl); const wr = wl.clone(); wr.position.x = 11; g.add(wr);
  for (const x of [-6.5, 6.5]) { const tp = outlined(new THREE.BoxGeometry(2.2, 5, 0.1), toon(x < 0 ? 0xa83240 : 0x3a5a9a), 1.02); tp.position.set(x, 5, -8.7); g.add(tp); const bar = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.14), toon(0x6b4423)); bar.position.set(x, 7.6, -8.65); g.add(bar); }
  const win = outlined(new THREE.BoxGeometry(2.4, 3.6, 0.2), toon(0x9fd0ef), 1.04); win.position.set(0, 5, -8.8); g.add(win);
  for (const [w, h, x, y] of [[0.12, 3.6, 0, 5], [2.4, 0.12, 0, 5]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), toon(0x6b4423)); b.position.set(x, y, -8.7); g.add(b); }
  const table = outlined(new THREE.BoxGeometry(9, 0.25, 2.4), toon(0x8a5a36), 1.02); table.position.set(0, 1.5, -2.2); g.add(table);
  for (const [x, z] of [[-4.2, -1.2], [4.2, -1.2], [-4.2, -3.2], [4.2, -3.2]]) { const l = outlined(new THREE.BoxGeometry(0.3, 1.5, 0.3), toon(0x6b4423), 1.04); l.position.set(x, 0.75, z); g.add(l); }
  const cloth = outlined(new THREE.BoxGeometry(9.1, 0.06, 1.6), toon(0xf4efe4), 1.02); cloth.position.set(0, 1.66, -2.2); g.add(cloth);
  for (const x of [-3, 3]) { const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 8), toon(0xe0b84a)); stem.position.set(x, 2.15, -2.2); g.add(stem); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd25a })); fl.scale.y = 1.6; fl.position.set(x, 2.8, -2.2); g.add(fl);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,210,110,0.9)', 'rgba(255,200,80,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); gl.scale.setScalar(2.4); gl.position.set(x, 2.8, -2.1); g.add(gl); }
  const door = outlined(new THREE.BoxGeometry(2.6, 4.6, 0.3), toon(0x5a3a22), 1.02); door.position.set(4.2, 2.4, -8.6); g.add(door);   // bottom gap 0.1
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), toon(0xe0b84a)); knob.position.set(3.4, 2.3, -8.4); g.add(knob);
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), toon(0x6fa8d0)); puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.5, 0.7, 1); puddle.position.set(4.2, 0.015, -7.4); g.add(puddle);
  const bed = new THREE.Group(); bed.position.set(-7.6, 0, -4.2); g.add(bed);
  const frame = outlined(new THREE.BoxGeometry(3, 0.7, 4.6), toon(0x8a5a36), 1.03); frame.position.y = 0.35; bed.add(frame);
  const mat = outlined(new THREE.BoxGeometry(2.8, 0.5, 4.4), toon(0xf4efe4), 1.03); mat.position.y = 0.95; bed.add(mat);
  const blanket = outlined(new THREE.BoxGeometry(2.9, 0.2, 3.0), toon(0x9a3a5a), 1.04); blanket.position.set(0, 1.28, 0.7); bed.add(blanket);
  const pillow = outlined(new THREE.BoxGeometry(1.8, 0.3, 0.9), toon(0xfff8e6), 1.06); pillow.position.set(0, 1.3, -1.6); bed.add(pillow);
  const head = outlined(new THREE.BoxGeometry(3.1, 2.2, 0.25), toon(0x6b4423), 1.03); head.position.set(0, 1.4, -2.4); bed.add(head);
  const stair = new THREE.Group(); stair.position.set(-3.5, 0, -7.4); g.add(stair);
  for (let i = 0; i < 6; i++) { const st = outlined(new THREE.BoxGeometry(3, 0.35, 1.2), toon(0xe9e4d8), 1.02); st.position.set(0, 0.18 + i * 0.35, -i * 0.45); stair.add(st); }
  return { group: g, origin: g.position };
}
