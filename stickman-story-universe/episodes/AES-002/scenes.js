// AES-002 – The Wolf and the Lamb. Source: Aesop's Fables, tr. G. F. Townsend (1867).
// A wolf hunts for an excuse to eat a lamb drinking downstream of him; the excuses fail and he pounces anyway.
import { meadow } from '../../engine/sets/meadow.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture,
    makeAnimal, makeStick, STORYTELLER, drop, questionMark } = ctx;
  const M = meadow(ctx); const W = M.group;
  const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  M.shadeTree.visible = false;

  const WS = 1.2, LS = 1.5;
  const wolf = makeAnimal('wolf'); wolf.root.scale.setScalar(WS); W.add(wolf.root);
  const lamb = makeAnimal('lamb'); lamb.root.scale.setScalar(LS); W.add(lamb.root);
  const st = makeStick(STORYTELLER); W.add(st.root);
  const rock = outlined(new THREE.SphereGeometry(1.5, 18, 12), toon(0xa9a39a), 1.03); rock.scale.set(1.3, 0.95, 1.0); W.add(rock);
  const qm = questionMark(); W.add(qm);
  const notes = outlined(new THREE.BoxGeometry(0.9, 1.1, 0.04), toon(0xfff8e0), 1.05); W.add(notes);
  const sweat = [drop(), drop(), drop()]; sweat.forEach(d => W.add(d));
  const flashes = Array.from({ length: 6 }, () => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xffd23f })); s.scale.z = 0.3; W.add(s); return s; });
  const wave = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); wave.rotation.x = Math.PI / 2; W.add(wave);
  // flow arrow: floats over the stream, pointing from the wolf's side to the lamb's
  const arrow = new THREE.Group(); W.add(arrow);
  const shaft = outlined(new THREE.BoxGeometry(4.2, 0.4, 0.15), toon(0x2f7fd8), 1.05); arrow.add(shaft);
  const head = outlined(new THREE.ConeGeometry(0.62, 1.0, 4), toon(0x2f7fd8), 1.05); head.rotation.z = -Math.PI / 2; head.position.x = 2.5; arrow.add(head);
  const lamb2 = null; void lamb2;

  const WOLF_HOME = V3(-1.6, 0, -7.0), LAMB_HOME = V3(1.4, 0, -7.4);
  const blink = (a, on) => a.eyes.forEach(e => e.scale.y = on ? 0.1 : 1);
  function reset() { W.visible = true; E.group.visible = false; wolf.root.visible = lamb.root.visible = true; st.root.visible = false; rock.visible = false; qm.visible = false; notes.visible = false;
    sweat.forEach(d => d.visible = false); flashes.forEach(f => f.visible = false); wave.visible = false; arrow.visible = false; wolf.mouth.visible = lamb.mouth.visible = false; blink(wolf, false); blink(lamb, false);
    wolf.root.rotation.set(0, 0, 0); lamb.root.rotation.set(0, 0, 0); wolf.head.rotation.set(0, 0, 0); lamb.head.rotation.set(0, 0, 0); wolf.tail.rotation.z = 0.5; lamb.tail.rotation.z = 0.5;
    wolf.walk(0, 0); lamb.walk(0, 0); scene.background = SKIES.day; aimSun(V3(0, 0, -6), V3(-10, 20, 12), 0xfff0d0, 2.4); hemi.intensity = 1.5; }
  function cam(x, y, z, lx, ly, lz, fov = 46) { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; }

  return [
    // 1 – the lamb drinks at the stream; the wolf peeks over a rock
    (lt, d, t) => { reset(); const u = lt / d; rock.visible = true; rock.position.set(-3.7, 0.1, -5.4);
      lamb.root.position.copy(LAMB_HOME).add(V3(-0.6, 0, 0.2)); lamb.root.rotation.y = 0.15; lamb.head.rotation.set(0, 0.5, -0.8 + Math.sin(t * 2.2) * 0.12); lamb.tail.rotation.z = 0.5 + Math.sin(t * 8) * 0.25;
      wolf.root.position.set(-3.9, 0.3 + 0.2 * ease(clamp((lt - 1) / 1.2)), -6.5); wolf.head.rotation.z = 0.05; wolf.walk(0, 0);
      const peek = Math.sin(t * 1.4) * 0.06; wolf.root.position.y += peek; wolf.mouth.visible = u > 0.7; blink(wolf, Math.sin(t * 3.3) > 0.95); wolf.tail.rotation.z = 0.5 + Math.sin(t * 5) * 0.2;
      wave.visible = true; wave.position.set(lamb.root.position.x + 0.8, 0.05, -8.1); const wv = (t * 0.9) % 1; wave.scale.setScalar(0.3 + wv); wave.material.opacity = 0.8 * (1 - wv);
      cam(-1.5, 1.8, lerp(8.0, 6.8, ease(u)), -1.5, 0.5, -7, 46); },
    // 2 – the wolf storms out: "You're muddying my water!"
    (lt, d, t) => { reset(); const u = lt / d, k = ease(clamp(lt / 1.2));
      lamb.root.position.copy(LAMB_HOME).add(V3(0.2, 0, 0)); lamb.root.rotation.y = Math.PI * 0.85; lamb.head.rotation.set(0, 0, 0.05); lamb.root.position.x += 0.12 * Math.sin(t * 6) * k;
      wolf.root.position.set(lerp(-4.2, -1.6, k), 0, lerp(-6.5, -7.0, k)); wolf.walk(t * 9, 1 - k + 0.15); wolf.mouth.visible = Math.sin(t * 14) > -0.3; wolf.head.rotation.z = 0.12 + Math.sin(t * 14) * 0.05;
      flashes.forEach((f, i) => { f.visible = k > 0.8; const a = i / 6 * 6.28 + t * 2; f.position.set(wolf.root.position.x + 0.6 + Math.cos(a) * 0.9, 2.4 + Math.sin(a) * 0.5, -7.0); f.scale.setScalar(0.8 + 0.3 * Math.sin(t * 9 + i)); f.scale.z = 0.3; });
      cam(-0.1, 1.8, 7.0, -0.1, 0.5, -7, 46); },
    // 3 – the lamb explains the current; the arrow shows the flow from wolf to lamb
    (lt, d, t) => { reset(); const u = lt / d; wolf.root.position.copy(WOLF_HOME); lamb.root.position.copy(LAMB_HOME); lamb.root.rotation.y = Math.PI * 0.9; wolf.root.rotation.y = 0.05;
      wolf.head.rotation.z = 0.15; wolf.mouth.visible = false; lamb.head.rotation.set(0, -0.9 * ease(clamp(u / 0.3)), 0.1); lamb.mouth.visible = Math.sin(t * 10) > 0; lamb.tail.rotation.z = 0.5 + Math.sin(t * 7) * 0.2;
      arrow.visible = true; const ak = ease(clamp((u - 0.28) / 0.25)); arrow.scale.set(ak, ak, ak); arrow.position.set(0.0 + Math.sin(t * 3) * 0.2, 1.5, -9.3); arrow.scale.multiplyScalar(0.8);
      cam(-0.1, 1.8, 7.0, -0.1, 0.5, -7.4, 46); },
    // 4 – "You insulted me last year!" / "I wasn't even born last year!"
    (lt, d, t) => { reset(); const u = lt / d, ph = u < 0.5 ? 0 : 1; wolf.root.position.copy(WOLF_HOME); lamb.root.position.copy(LAMB_HOME); lamb.root.rotation.y = Math.PI * 0.9;
      wolf.mouth.visible = ph === 0 && Math.sin(t * 13) > -0.2; wolf.head.rotation.z = ph === 0 ? 0.2 + Math.sin(t * 13) * 0.06 : 0.0; wolf.root.position.x += ph === 0 ? Math.sin(t * 9) * 0.05 : 0;
      lamb.mouth.visible = ph === 1 && Math.sin(t * 13) > -0.2; lamb.head.rotation.set(0, ph === 1 ? Math.sin(t * 7) * 0.4 : 0, 0); lamb.root.position.y = ph === 1 ? Math.abs(Math.sin(t * 5)) * 0.08 : 0;
      qm.visible = ph === 1; qm.position.set(WOLF_HOME.x + 0.9, 3.6, WOLF_HOME.z); qm.scale.setScalar(1.3 + 0.1 * Math.sin(t * 6));
      cam(-0.1, 1.8, 7.0, -0.1, 0.5, -7.4, 46); },
    // 5 – "Then it was your father!" The wolf checks his notes, sweating
    (lt, d, t) => { reset(); const u = lt / d; wolf.root.position.copy(WOLF_HOME); lamb.root.position.copy(LAMB_HOME); lamb.root.rotation.y = Math.PI * 0.9; lamb.head.rotation.z = 0.05; lamb.tail.rotation.z = 0.5 + Math.sin(t * 7) * 0.2;
      const shout = u < 0.35; wolf.mouth.visible = shout && Math.sin(t * 13) > -0.2; wolf.head.rotation.z = shout ? 0.22 : -0.15;
      notes.visible = u > 0.4; notes.position.set(WOLF_HOME.x + 1.4 + 0.1, 2.0 + Math.sin(t * 3) * 0.05, WOLF_HOME.z + 0.7); notes.rotation.set(0, -0.5, 0.15 + Math.sin(t * 4) * 0.05);
      sweat.forEach((s, i) => { s.visible = u > 0.45; const v = (t * 0.9 + i / 3) % 1; s.position.set(WOLF_HOME.x + 0.9 + i * 0.2, 2.9 - v * 0.9, WOLF_HOME.z + 0.4); s.scale.setScalar(1.2); });
      blink(wolf, u > 0.4 && Math.sin(t * 5) > 0.9);
      cam(-0.1, 1.8, 7.0, -0.1, 0.5, -7.4, 46); },
    // 6 – he gives up arguing and pounces; the lamb bolts
    (lt, d, t) => { reset(); const u = lt / d, p = clamp((u - 0.35) / 0.5);
      const cx = lerp(-1.6, 3.0, p), cy = 3.2 * 4 * p * (1 - p); wolf.root.position.set(u < 0.3 ? -1.6 : cx, u < 0.3 ? 0 : cy, -7.0); wolf.root.rotation.z = u < 0.35 ? 0 : -0.7 * Math.sin(p * Math.PI) + 0.35;
      wolf.mouth.visible = true; wolf.head.rotation.z = u < 0.3 ? -0.05 : 0.1; wolf.walk(0, 0); if (u >= 0.3 && u < 0.35) wolf.root.position.y = -0.1;
      const run = clamp((u - 0.4) / 0.5); lamb.root.position.set(lerp(1.6, 9.5, ease(run)), Math.abs(Math.sin(t * 14)) * 0.18 * (run > 0 ? 1 : 0), -7.4); lamb.root.rotation.y = run > 0 ? 0 : Math.PI * 0.9; lamb.walk(t * 16, run > 0 ? 1.3 : 0); lamb.mouth.visible = run > 0;
      flashes.forEach((f, i) => { f.visible = u > 0.38 && u < 0.7; const a = i / 6 * 6.28; f.position.set(lamb.root.position.x - 0.8 + Math.cos(a) * 0.5, 1.2 + Math.sin(a) * 0.6, -7.4); f.scale.setScalar(0.7); f.scale.z = 0.3; });
      cam(lerp(-0.1, 1.4, ease(u)), 1.8, 7.0, lerp(-0.1, 1.4, ease(u)), 0.5, -7.2, 46); },
    // 7 – the moral: the Storyteller lectures; the wolf sulks far away, the lamb grazes safely
    (lt, d, t) => { reset(); const u = lt / d; st.root.visible = true; st.rest(); st.root.position.set(0.1, 0, -2.0); st.root.rotation.y = -0.1; st.expr('smile', 0.8); st.look(0, 0.1);
      const w = Math.sin(t * 6) * 0.15; st.arms[1].sh.rotation.set(-0.3, 0, 2.55 + w * 0); st.arms[1].el.rotation.set(-1.6, 0, 0.9 + w); st.arms[0].sh.rotation.set(-0.2, 0, -0.35); st.body.position.y = Math.abs(Math.sin(t * 2)) * 0.03;
      wolf.root.position.set(-2.6, 0, -8.0); wolf.root.rotation.y = 0; wolf.head.rotation.z = -0.35; wolf.tail.rotation.z = 1.2; wolf.walk(0, 0); blink(wolf, Math.sin(t * 2.7) > 0.8);
      lamb.root.position.set(2.6, 0, -6.0); lamb.root.rotation.y = Math.PI * 0.85; lamb.head.rotation.set(0, 0, -0.9 + Math.sin(t * 2) * 0.15); lamb.tail.rotation.z = 0.5 + Math.sin(t * 8) * 0.25;
      cam(0, 2.0, 7.0, 0, 1.5, -3, 50); },
    // 8 – end card
    (lt, d, t) => { W.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
