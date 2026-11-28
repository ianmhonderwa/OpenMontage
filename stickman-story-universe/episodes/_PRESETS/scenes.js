export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, toon, makeStick, STORYTELLER, SOCRATES, CRITO, XANTHIPPE, NASREDDIN, NOAH, ABRAM, SARAI, LOT } = ctx;
  const g = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), toon(0xe6cc94)); g.rotation.x = -Math.PI / 2; scene.add(g);
  const P = [STORYTELLER, SOCRATES, CRITO, XANTHIPPE, NASREDDIN, NOAH, ABRAM, SARAI, LOT];
  P.forEach((p, i) => { const r = makeStick(p); r.root.position.set((i % 3 - 1) * 2.2, 0, -Math.floor(i / 3) * 3.2); scene.add(r.root); });
  return [() => { scene.background = SKIES.day; aimSun(new THREE.Vector3(0, 0, -3), new THREE.Vector3(-8, 16, 12)); camera.position.set(0, 5.5, 9); camera.lookAt(0, 1.6, -3); camera.fov = 60; }];
}
