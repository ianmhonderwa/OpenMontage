// Reusable set: end card – a series host waving on the left, empty right side for the FOLLOW block (HTML overlay).
// Usage: const E = endcard(ctx, SOCRATES); then in the last scene function: E.update(lt)
export function endcard(ctx, preset, skyKey = 'endcard') {
  const { THREE, scene, camera, aimSun, SKIES, toon, column, makeStick } = ctx;
  const g = new THREE.Group(); g.position.set(0, 0, 400); scene.add(g);
  const host = makeStick(preset); g.add(host.root);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 48), toon(0xe9dcc3)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  for (const x of [-4.5, 4.5]) { const c = column(7, 0.45); c.position.set(x, 0, -4); g.add(c); }
  function update(lt) {
    scene.background = SKIES[skyKey]; aimSun(g.position, new THREE.Vector3(-8, 16, 12), 0xfff0d0, 2.2);
    host.rest(); host.root.position.set(0, 0, 0); host.root.rotation.y = 0.3; host.expr('smile', 0.6);
    host.arms[1].sh.rotation.set(0, 0, 2.5); host.arms[1].el.rotation.z = 0.5 + Math.sin(lt * 9) * 0.45;
    host.body.position.y = Math.abs(Math.sin(lt * 4.5)) * 0.05;
    camera.position.set(g.position.x + 1.2, 2.2, g.position.z + 9.5); camera.lookAt(g.position.x + 1.2, 2.4, g.position.z); camera.fov = 44;
  }
  return { group: g, host, update };
}
