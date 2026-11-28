// SOC-003 – How Many Things I Do Not Need. Source: Diogenes Laertius, Lives II.25 (Yonge tr.).
// Socrates browses a glittering market and buys nothing; his friend's twelve shopping bags make the point.
import { agora } from '../../engine/sets/agora.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined,
    makeStick, SOCRATES, stall } = ctx;
  const A = agora(ctx, { crowd: false }); const G = A.group; const E = endcard(ctx, SOCRATES);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const soc = makeStick(SOCRATES); G.add(soc.root);

  // ---- a row of market stalls with glittering goods ----
  const SX = [-7.5, -3.75, 0, 3.75, 7.5], SZ = -5.2, awnings = [0xc8553d, 0x3d7ea6, 0xe0a030, 0x8e5ba8, 0x2a9d8f];
  SX.forEach((x, i) => { const s = stall(awnings[i], 50 + i); s.position.set(x, 0, SZ); G.add(s); });
  const gold = toon(0xf2c230), gem = toon(0xc8323c);
  function goods(x) {
    const nl = new THREE.Group(); nl.position.set(x - 0.6, 1.2, SZ + 0.3); const ring = outlined(new THREE.TorusGeometry(0.22, 0.035, 8, 20), gold, 1.15); ring.rotation.x = 0.2; nl.add(ring); const j = outlined(new THREE.SphereGeometry(0.07, 8, 6), gem, 1.15); j.position.set(0, -0.22, 0.04); nl.add(j); G.add(nl);
    const pb = new THREE.Group(); pb.position.set(x + 0.3, 1.0, SZ + 0.4); const bd = outlined(new THREE.SphereGeometry(0.17, 10, 8), toon(0xf08ab4), 1.1); pb.add(bd); const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 6), toon(0xe0b84a)); nk.position.y = 0.22; pb.add(nk); G.add(pb);
    [0xc8553d, 0xe0a030, 0x8a5a36].forEach((c, k) => { const cone = outlined(new THREE.ConeGeometry(0.16, 0.28, 10), toon(c), 1.08); cone.position.set(x + 0.9 + k * 0.05, 1.04, SZ + 0.2 + k * 0.2 - 0.2); G.add(cone); });
    [0x8e5ba8, 0x2a9d8f].forEach((c, k) => { const bolt = outlined(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 10), toon(c), 1.08); bolt.rotation.z = Math.PI / 2; bolt.position.set(x - 0.1, 1.05 + k * 0.24, SZ - 0.1); G.add(bolt); });
    return nl;
  }
  const necklaces = SX.map(goods);
  const heldNecklace = (() => { const g = new THREE.Group(); const ring = outlined(new THREE.TorusGeometry(0.25, 0.04, 8, 20), gold, 1.15); g.add(ring); const j = outlined(new THREE.SphereGeometry(0.08, 8, 6), gem, 1.15); j.position.set(0, -0.25, 0.04); g.add(j); G.add(g); return g; })();
  const merch = SX.map((x, i) => { const r = makeStick({ robe: [0xb5455a, 0x3d7ea6, 0xe0a030, 0x6d6875, 0x4f8a4b][i], hat: i % 2 ? 0xb5262e : null, turban: i % 2 ? null : [0xf4efe4, 0xd9c9a0, 0x9fc1d6][i % 3], beard: i % 3 ? 0x3b2a1a : null, seed: 120 + i }); r.root.position.set(x, 0, SZ - 1.0); G.add(r.root); return r; });
  // ---- the friend and his twelve shopping bags ----
  const friend = makeStick({ robe: 0x2a9d8f, hair: 0x2a1a10, beard: 0x3b2a1a, seed: 131 }); G.add(friend.root);
  const bagCols = [0xe05a6a, 0xf2c230, 0x4f8ad0, 0x6bb85a, 0xa56bd0, 0xf29a2e];
  friend.arms.forEach((a, ai) => { for (let k = 0; k < 6; k++) { const b = outlined(new THREE.BoxGeometry(0.28, 0.34, 0.2), toon(bagCols[(k + ai) % 6]), 1.08); b.position.set((k % 2 ? 0.1 : -0.1), -0.55 - k * 0.2, 0.0); b.rotation.z = (k % 2 ? 0.12 : -0.12); a.el.add(b);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 5, 10), BLACK); h.position.set(b.position.x, b.position.y + 0.2, 0); b.parent.add(h); } });
  const dollars = Array.from({ length: 6 }, () => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xfff3a0 })); s.scale.z = 0.3; G.add(s); return s; });

  function base(t) { scene.background = SKIES.day; aimSun(V3(0, 0, -2), V3(-12, 22, 14), 0xfff0d0, 2.4); G.visible = true; E.group.visible = false;
    soc.rest(); soc.root.visible = true; soc.root.rotation.set(0, 0, 0); soc.expr('smile', 0.4); soc.look(0, 0); soc.headG.rotation.set(0, 0, 0);
    friend.rest(); friend.root.visible = false; friend.root.rotation.set(0, 0, 0); friend.headG.rotation.set(0, 0, 0); friend.expr('smile', 0.3);
    merch.forEach((m, i) => { m.rest(); m.root.visible = true; m.root.position.set(SX[i], 0, SZ - 1.0); m.root.rotation.set(0, 0, 0); m.expr('smile', 0.6); m.body.position.y = Math.sin(t * 2 + i) * 0.02; });
    heldNecklace.visible = false; necklaces.forEach(n => n.visible = true); dollars.forEach(d => d.visible = false); }
  const shout = (t, k) => merch.forEach((m, i) => { m.expr(Math.sin(t * 9 + i * 2) > -0.2 ? 'open' : 'smile', 0.9); m.arms[1].sh.rotation.set(-0.4, 0, 1.6 + Math.sin(t * 5 + i) * 0.5 * k); m.arms[0].sh.rotation.set(-0.3 + Math.sin(t * 4 + i) * 0.3, 0, -0.9 * k); m.root.position.z += 0; });

  return [
    // 1 – Socrates wanders through the glittering market
    (lt, d, t) => {
      base(t); const u = ease(lt / d); soc.root.position.set(lerp(-5.5, 4.0, u), 0, -1.6); soc.root.rotation.y = Math.PI / 2 - 0.15; soc.walk(t * 6, 0.8); soc.look(0, 0.4); soc.expr('smile', 0.7);
      shout(t, 0.5); dollars.forEach((s, i) => { s.visible = true; s.position.set(SX[i % 5] + Math.cos(t * 2 + i) * 0.7, 2.3 + Math.sin(t * 3 + i * 2) * 0.4, SZ + 0.3); s.scale.setScalar(0.7 + 0.5 * Math.abs(Math.sin(t * 5 + i))); s.rotation.z = t * 3 + i; });
      camera.position.set(lerp(-3, 3, u), 3.4, 8.4); camera.lookAt(lerp(-2.5, 2.5, u), 2.0, -3.0); camera.fov = 50;
    },
    // 2 – "Buy this! You need this!" – merchants wave their goods in his face
    (lt, d, t) => {
      base(t); soc.root.position.set(0.2, 0, -1.0); soc.root.rotation.y = 0; soc.expr('flat', 0.4); soc.look(0, 0);
      merch.forEach((m, i) => { const a = (i - 2) * 0.55; m.root.position.set(1.4 * Math.sin(a * 1.2) * 2.4 + 0.2, 0, -1.0 + 1.9 * Math.cos(a * 1.2) * 0.1 + 1.6); m.root.position.set(0.2 + (i - 2) * 1.5, 0, 0.9 + Math.abs(i - 2) * 0.12); m.root.rotation.y = Math.atan2(0.2 - m.root.position.x, -1.0 - m.root.position.z); });
      shout(t, 1.2); camera.position.set(0.2, 3.6, 10.5); camera.lookAt(0.2, 2.3, 0.4); camera.fov = 52;
    },
    // 3 – he studies a golden necklace very carefully… and puts it back
    (lt, d, t) => {
      base(t); soc.root.position.set(SX[3] - 0.9, 0, SZ + 1.5); soc.root.rotation.y = 0.15; const take = ease(lt / 1.2), putb = ease((lt - d * 0.7) / 0.6);
      soc.arms[1].sh.rotation.set(lerp(-0.2, -1.6, take) + putb * 1.2, 0, 0.35); soc.arms[1].el.rotation.x = lerp(-0.2, -1.2, take - putb);
      heldNecklace.visible = true; necklaces[3].visible = putb > 0.95; const hp = V3(SX[3] - 0.65, lerp(1.4, 2.15, take * (1 - putb)) + 0.0, SZ + 1.35 - take * 0.1 * (1 - putb)); heldNecklace.position.copy(hp);
      soc.expr('flat', 0.8); soc.look(0.2, 0.5); soc.headG.rotation.x = 0.15; soc.headG.rotation.z = Math.sin(t * 1.5) * 0.06; merch[3].expr('smile', 1); merch[3].arms[1].sh.rotation.set(-0.5, 0, 1.0);
      camera.position.set(lerp(SX[3] + 2.4, SX[3] + 1.8, ease(lt / d)), 2.8, 6.2); camera.lookAt(SX[3] - 0.6, 2.1, SZ + 1.0); camera.fov = 44;
    },
    // 4 – a friend catches up, arms full of shopping bags: "Why do you come here if you never buy anything?"
    (lt, d, t) => {
      base(t); soc.root.position.set(0.8, 0, -1.2); soc.root.rotation.y = -0.55; soc.expr('smile', 0.4); const arr = ease(lt / 1.4);
      friend.root.visible = true; friend.root.position.set(lerp(-5.5, -1.3, arr), 0, -0.6); friend.root.rotation.y = lerp(1.2, 0.55, arr); friend.walk(t * 9, arr < 1 ? 0.9 : 0); if (arr >= 1) friend.walk(0, 0);
      friend.arms.forEach(a => { a.sh.rotation.set(-0.15, 0, a.side * 0.2); a.el.rotation.x = -0.3; }); friend.expr(arr >= 1 ? 'open' : 'flat', 0.8); friend.headG.rotation.z = arr >= 1 ? 0.15 : 0;
      merch.forEach((m, i) => { m.expr('smile', 0.5); });
      camera.position.set(lerp(-0.5, 0.2, ease(lt / d)), 3.2, 8.0); camera.lookAt(-0.3, 2.0, -0.8); camera.fov = 50;
    },
    // 5 – "I come to see how many things there are that I don't need." (arms spread, peaceful)
    (lt, d, t) => {
      base(t); soc.root.position.set(0.4, 0, -0.5); soc.root.rotation.y = 0; soc.expr('smile', 1); soc.look(0, 0.3); const sp = ease(lt / 1.3);
      soc.arms.forEach(a => { a.sh.rotation.set(-0.2, 0, a.side * (0.4 + 1.5 * sp)); a.el.rotation.z = a.side * -0.2; }); soc.headG.rotation.z = Math.sin(t * 1.4) * 0.05;
      friend.root.visible = true; friend.root.position.set(-1.8, 0, -0.2); friend.root.rotation.y = 0.9; friend.arms.forEach(a => { a.sh.rotation.set(-0.15, 0, a.side * 0.2); a.el.rotation.x = -0.3; }); friend.expr('flat', 0.5);
      merch.forEach((m, i) => { m.expr('smile', 0.8); m.arms[1].sh.rotation.set(-0.4, 0, 1.4 + Math.sin(t * 3 + i) * 0.3); });
      camera.position.set(0.3, 2.8, lerp(7.6, 6.2, ease(lt / d))); camera.lookAt(0.2, 2.3, -0.5); camera.fov = 46;
    },
    // 6 – the friend looks down at his twelve shopping bags, and says nothing
    (lt, d, t) => {
      base(t); soc.root.position.set(1.7, 0, -0.5); soc.root.rotation.y = -0.6; soc.expr('smile', 0.6);
      friend.root.visible = true; friend.root.position.set(-0.4, 0, 0.3); friend.root.rotation.y = 0.2; friend.arms.forEach(a => { a.sh.rotation.set(-0.15, 0, a.side * 0.18); a.el.rotation.x = -0.3; });
      const dn = ease(lt / 1.0); friend.headG.rotation.x = 0.7 * dn; friend.expr('flat', -0.6 * dn); friend.look(0, -0.9); friend.body.position.y = Math.sin(t * 3) * 0.015; friend.root.position.x += Math.sin(t * 20) * 0.01 * dn;
      camera.position.set(lerp(2.2, 1.4, ease(lt / d)), lerp(3.6, 3.0, ease(lt / d)), 4.8); camera.lookAt(-0.4, 1.7, 0.3); camera.fov = 48;
    },
    // 7 – Socrates strolls home with empty hands (a very full mind); the friend trudges behind with his bags
    (lt, d, t) => {
      base(t); const u = ease(lt / d); soc.root.position.set(lerp(-4.0, 6.0, u), 0, -1.0); soc.root.rotation.y = Math.PI / 2; soc.walk(t * 6.5, 0.8); soc.expr('smile', 0.8); soc.arms.forEach(a => a.sh.rotation.x = Math.sin(t * 6.5 + a.side) * 0.5);
      friend.root.visible = true; friend.root.position.set(lerp(-7.2, 3.0, u), 0, -0.9); friend.root.rotation.y = Math.PI / 2; friend.walk(t * 5, 0.7); friend.arms.forEach(a => { a.sh.rotation.set(-0.1, 0, a.side * 0.2); a.el.rotation.x = -0.3; }); friend.expr('smile', 0.3); friend.headG.rotation.x = 0.1;
      merch.forEach(m => { m.expr('smile', 0.5); m.arms[1].sh.rotation.set(-0.4, 0, 1.3 + Math.sin(t * 3) * 0.3); });
      camera.position.set(lerp(-2, 4.0, u), 2.8, 8.8); camera.lookAt(lerp(-2, 3.5, u), 2.0, -1.6); camera.fov = 50;
    },
    // 8 – end card
    (lt, d, t) => { G.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
