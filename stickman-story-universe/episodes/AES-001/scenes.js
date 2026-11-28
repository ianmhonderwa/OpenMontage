// AES-001 – The Lion and the Mouse. Source: Aesop's Fables, tr. G. F. Townsend (1867).
// A sleeping lion spares a mouse; later the mouse gnaws him free from a hunter's net.
import { meadow } from '../../engine/sets/meadow.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture,
    makeAnimal, STORYTELLER, drop } = ctx;
  const M = meadow(ctx); const W = M.group;
  const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  M.group.position.set(0, 0, 0);

  const LS = 2.2, MS = 1.5;                       // lion and mouse scale
  const lion = makeAnimal('lion'); lion.root.scale.setScalar(LS); lion.root.rotation.order = 'YXZ'; W.add(lion.root);
  const mouse = makeAnimal('mouse'); mouse.root.scale.setScalar(MS); W.add(mouse.root);
  const LX = 0.2, LZ = 0.0, YAW = -0.5;           // lion's home spot and heading
  function placeLion(extra = {}) { lion.root.position.set(LX + (extra.dx || 0), extra.dy || 0, LZ + (extra.dz || 0)); lion.root.rotation.set(extra.roll || 0, YAW, extra.tilt || 0); lion.root.updateMatrixWorld(true); }
  function openEyes(a, k) { a.eyes.forEach(e => e.scale.y = k); }
  const white = radialTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const sprite = () => new THREE.Sprite(new THREE.SpriteMaterial({ map: white, transparent: true, depthWrite: false }));
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); W.add(bubble);
  const tears = [drop(), drop()]; tears.forEach(t => W.add(t));
  const flashes = Array.from({ length: 8 }, () => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: 0xfff3a0 })); s.scale.z = 0.3; W.add(s); return s; });
  const rock = outlined(new THREE.CylinderGeometry(0.6, 0.75, 1, 10), toon(0xa9a39a), 1.03); W.add(rock);

  // ----- the hunter's net: a dome of individual ropes -----
  const NC = V3(0.9, 0, 0.1), NR = V3(3.7, 2.9, 2.7);
  const net = new THREE.Group(); W.add(net); const ropes = [];
  { const rope = toon(0x8a6a3a); const LAT = 6, LON = 18;
    const P = (th, ph) => V3(NC.x + NR.x * Math.sin(th) * Math.cos(ph), NC.y + NR.y * Math.cos(th), NC.z + NR.z * Math.sin(th) * Math.sin(ph));
    const add = (a, b, ph, th) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 5), rope); const mid = a.clone().add(b).multiplyScalar(0.5); const dir = b.clone().sub(a); const len = dir.length();
      m.scale.y = len; m.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize()); m.position.copy(mid); m.castShadow = true; net.add(m); ropes.push({ m, base: mid.clone(), baseQ: m.quaternion.clone(), ph, th, rand: Math.random() }); };
    for (let i = 1; i <= LAT; i++) for (let j = 0; j < LON; j++) add(P(i / LAT * Math.PI / 2, j / LON * Math.PI * 2), P(i / LAT * Math.PI / 2, (j + 1) / LON * Math.PI * 2), (j + 0.5) / LON * Math.PI * 2, i / LAT * Math.PI / 2);
    for (let j = 0; j < LON; j++) for (let i = 0; i < LAT; i++) add(P(i / LAT * Math.PI / 2, j / LON * Math.PI * 2), P((i + 1) / LAT * Math.PI / 2, j / LON * Math.PI * 2), j / LON * Math.PI * 2, (i + 0.5) / LAT * Math.PI / 2);
  }
  const NET_PH = 1.0;                                  // mouse gnaws at this longitude
  const netRim = (ph) => V3(NC.x + NR.x * Math.cos(ph), 0, NC.z + NR.z * Math.sin(ph));
  function netState(snapStart, snapSpan, t) {           // t: seconds into the snapping phase; ropes near NET_PH go first
    for (const r of ropes) {
      let dph = Math.abs(((r.ph - NET_PH + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
      const st = snapStart + (dph / Math.PI) * snapSpan * 0.8 + (1 - r.th / (Math.PI / 2)) * snapSpan * 0.2 + r.rand * 0.15;
      const f = t - st; r.m.position.copy(r.base); r.m.quaternion.copy(r.baseQ); r.m.visible = true;
      if (f > 0) { const fall = Math.min(0.5 * 9 * f * f, Math.max(0, r.base.y - 0.05)); r.m.position.y = r.base.y - fall; r.m.rotation.z += f * (r.rand - 0.5) * 3; r.m.position.x += f * (r.rand - 0.5) * 0.8; if (f > 1.6) r.m.visible = false; }
    }
  }

  function snapFlash(t, times) { flashes.forEach((f, i) => { const u = (t - times[i]) / 0.25; f.visible = u > 0 && u < 1; if (f.visible) { f.scale.setScalar(1 + u * 1.5); f.scale.z = 0.3; f.material.opacity = 1 - u; f.rotation.z = u * 2; } }); }

  function base() {
    scene.background = SKIES.day; aimSun(V3(0, 0, 0), V3(-12, 22, 14), 0xfff0d0, 2.4);
    W.visible = true; E.group.visible = false; net.visible = false; bubble.visible = false; tears.forEach(t => t.visible = false); flashes.forEach(f => f.visible = false); rock.visible = false;
    lion.root.visible = mouse.root.visible = true; lion.root.scale.setScalar(LS); mouse.root.scale.setScalar(MS);
    lion.lie(0); lion.mouth.visible = false; openEyes(lion, 1); lion.head.rotation.set(0, 0, 0); lion.root.rotation.order = 'YXZ'; lion.bg.rotation.set(0, 0, 0);
    mouse.lie(0); mouse.mouth.visible = false; openEyes(mouse, 1); mouse.bg.rotation.set(0, 0, 0); mouse.head.rotation.set(0, 0, 0);
    lion.tail.rotation.z = 0.5 + 0.1 * Math.sin(0);
  }
  const mouseTo = (p, heading, scale = MS) => { mouse.root.position.copy(p); mouse.root.rotation.y = heading; mouse.root.scale.setScalar(scale); };
  const heading = (a, b) => Math.atan2(-(b.z - a.z), b.x - a.x);             // +x local facing from a to b

  return [
    // 1 – the lion naps under a tree; a tiny mouse runs right across his nose
    (lt, d, t) => {
      base(); placeLion(); lion.lie(1); openEyes(lion, 0.08);
      const br = 0.5 + 0.5 * Math.sin(t * 2.0); lion.bg.scale.set(1, 1 + 0.025 * br, 1 + 0.025 * br);
      const nose = lion.root.localToWorld(V3(1.28, 0.42, 0)); bubble.visible = true; bubble.position.copy(nose).add(V3(0.1, 0.05, 0.12)); bubble.scale.setScalar(0.12 + 0.28 * br);
      const u = clamp((lt - 0.8) / (d - 1.2)); const path = [[-1.1, 0.74], [0.4, 0.78], [0.82, 0.9], [1.05, 0.98], [1.3, 0.5]];
      const f = u * (path.length - 1), i = Math.min(Math.floor(f), path.length - 2), k = f - i;
      const lp = V3(lerp(path[i][0], path[i + 1][0], k), lerp(path[i][1], path[i + 1][1], k) + Math.abs(Math.sin(t * 24)) * 0.04, 0);
      mouse.root.visible = u > 0 && u < 1.01; mouse.root.position.copy(lion.root.localToWorld(lp)); mouse.root.rotation.y = YAW; mouse.walk(t * 26, 1.0);
      mouse.root.rotation.z = 0; mouse.bg.rotation.z = (i === 2 ? 0.5 : i === 3 ? -0.6 : 0);
      camera.position.set(lerp(4.6, 3.6, ease(lt / d)), 2.7, lerp(11.5, 10.2, ease(lt / d))); camera.lookAt(0.3, 1.2, 0); camera.fov = 46;
    },
    // 2 – the lion wakes and slams his paw down: Gotcha!
    (lt, d, t) => {
      base(); const wk = ease((lt - 0.2) / 0.7); placeLion({ dy: 0 }); lion.lie(1 - wk); openEyes(lion, lt > 0.2 ? 1 : 0.08);
      const slam = ease((lt - 1.15) / 0.22), lift = ease((lt - 0.7) / 0.45); const th = lerp(0.1, 1.15, lift) * (1 - slam) + 0.12 * slam;
      lion.legs[0].rotation.z = th; lion.head.rotation.z = -0.15 * wk; lion.mouth.visible = lt > 1.3; lion.mouth.scale.set(0.6, 1.0 + 0.3 * Math.sin(t * 20), 1);
      lion.root.position.x += Math.sin(t * 40) * 0.03 * (lt > 1.3 ? 1 : 0);
      lion.root.updateMatrixWorld(true); const paw = lion.legs[0].localToWorld(V3(0, -lion.leg + 0.02, 0));
      const nose = lion.root.localToWorld(V3(1.28, 0.62, 0));
      const hop = ease((lt - 0.55) / 0.55); const from = nose.clone(), to = paw.clone(); to.y = 0;
      const mp = from.clone().lerp(to, hop); mp.y = lerp(from.y, 0, hop) + Math.sin(Math.PI * hop) * 0.35;
      mouseTo(mp, heading(from, to) + 0, MS); mouse.walk(t * 28, hop < 1 ? 1 : 0); if (slam > 0.95) { mouse.root.scale.set(MS * 1.15, MS * 0.55, MS * 1.15); mouse.root.position.copy(to); }
      camera.position.set(lerp(4.0, 3.4, ease(lt / d)), 2.3, 7.8); camera.lookAt(lerp(0.9, 1.5, ease(lt / d)), 0.9, 0.5); camera.fov = 48;
    },
    // 3 – "Please let me go!" The mouse begs, tiny paws clasped
    (lt, d, t) => {
      base(); placeLion(); lion.legs[0].rotation.z = 0.95 + 0.08 * Math.sin(t * 3); lion.head.rotation.z = -0.28; lion.root.updateMatrixWorld(true);
      const paw = lion.legs[0].localToWorld(V3(0, -lion.leg, 0)); const spot = V3(paw.x + 0.55, 0, paw.z + 0.35);
      mouseTo(spot, YAW + 0.55, MS * 1.15); mouse.bg.rotation.z = 0.95; mouse.legs[0].rotation.z = mouse.legs[1].rotation.z = 2.5 + Math.sin(t * 16) * 0.12; mouse.head.rotation.z = -0.35;
      mouse.mouth.visible = Math.sin(t * 17) > -0.2; mouse.root.position.y += Math.sin(t * 22) * 0.015; mouse.legs[2].rotation.z = mouse.legs[3].rotation.z = -0.4;
      camera.position.set(spot.x + 2.6, 1.7, spot.z + 5.4); camera.lookAt(spot.x - 0.4, 1.0, spot.z - 0.2); camera.fov = 48;
    },
    // 4 – the lion laughs so hard he rolls over; the mouse scurries away
    (lt, d, t) => {
      base(); const roll = Math.PI * ease(lt / 1.1) + Math.sin(t * 8) * 0.18 * ease((lt - 1) / 0.5);
      const by = lion.by * LS; placeLion({ roll, dy: by * (1 - Math.cos(roll)) * 0.8 }); lion.lie(0.1);
      lion.legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 15 + i * 1.7) * 0.7; }); lion.mouth.visible = true; lion.mouth.scale.set(0.8, 1.0 + 0.4 * Math.abs(Math.sin(t * 14)), 1); lion.head.rotation.z = Math.sin(t * 12) * 0.12; openEyes(lion, 0.35);
      lion.root.updateMatrixWorld(true); const hw = lion.head.getWorldPosition(V3(0, 0, 0));
      tears.forEach((tr, i) => { const u = (lt * 1.2 + i * 0.5) % 1; tr.visible = lt > 1.0; tr.position.set(hw.x + (i ? 0.3 : -0.1), hw.y + 0.55 - u * 0.9, hw.z + 0.55); tr.scale.setScalar(1.4); });
      const start = V3(1.9, 0, 1.3), end = V3(7.5, 0, -2.5); const f = clamp((lt - 0.8) / (d - 1.0)); const mp = start.clone().lerp(end, ease(f));
      mouseTo(mp, heading(start, end), MS); mouse.walk(t * 30, f < 1 ? 1 : 0); mouse.root.visible = true;
      camera.position.set(3.8, 2.8, 9.8); camera.lookAt(1.6, 1.2, 0.4); camera.fov = 48;
    },
    // 5 – weeks later: the lion is caught in a hunter's net and roars
    (lt, d, t) => {
      base(); mouse.root.visible = false; placeLion({ dx: Math.sin(t * 17) * 0.05 * ease((lt - 0.5) / 0.3), dz: Math.cos(t * 13) * 0.03, tilt: Math.sin(t * 11) * 0.05 });
      lion.legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 12 + i * 1.9) * 0.45; }); lion.mouth.visible = lt > 0.5; lion.mouth.scale.set(0.7, 1.1 + 0.3 * Math.sin(t * 19), 1); lion.head.rotation.z = 0.18 * Math.sin(t * 6);
      net.visible = true; const fall = ease(lt / 0.6); net.position.set(0, lerp(7, 0, easeOutBack(clamp(lt / 0.6))), 0); netState(999, 1, 0);
      const jiggle = lt > 0.6 ? Math.sin(t * 15) * 0.04 : 0; net.position.y += jiggle; net.scale.set(1, 1, 1);
      camera.position.set(lerp(5.4, 4.4, ease(lt / d)), 3.2, 11.4); camera.lookAt(0.9, 1.4, 0.2); camera.fov = 48;
    },
    // 6 – the mouse runs over and gnaws through the ropes: nibble, nibble, snap!
    (lt, d, t) => {
      base(); const rim = netRim(NET_PH); const arrive = ease(lt / 1.2); const from = V3(8.5, 0, 6.2); const mp = from.clone().lerp(rim.clone().add(V3(0.5, 0, 0.45)), arrive);
      mouseTo(mp, heading(from, rim), MS); mouse.walk(t * 30, arrive < 1 ? 1 : 0); const chew = lt > 1.2; if (chew) { mouse.head.rotation.z = -0.3 + Math.sin(t * 30) * 0.12; mouse.mouth.visible = Math.sin(t * 30) > 0; mouse.root.rotation.y = heading(mp, rim) + 0.2; }
      net.visible = true; net.position.set(0, 0, 0); const sn = lt - 1.6; netState(0.1, 1.9, sn);
      placeLion({ dx: Math.sin(t * 15) * 0.04 * (1 - ease(sn / 1.8)) }); lion.legs.forEach((l, i) => { l.rotation.z = Math.sin(t * 10 + i * 1.9) * 0.35 * (1 - ease(sn / 1.8)); }); lion.mouth.visible = sn < 0.9; lion.mouth.scale.set(0.7, 1.0, 1); lion.head.rotation.z = 0.12 * Math.sin(t * 6);
      snapFlash(sn, [0.1, 0.35, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6].map(x => x + 0));
      flashes.forEach((f, i) => { if (f.visible) f.position.copy(rim).add(V3(-0.3 + (i % 4) * 0.25, 0.35 + (i % 3) * 0.3, 0.9)); });
      camera.position.set(lerp(6.2, 5.4, ease(lt / d)), 2.0, 8.6); camera.lookAt(2.0, 0.9, 1.0); camera.fov = 50;
    },
    // 7 – friends at last: even a mouse can help a lion (a gentle high-five)
    (lt, d, t) => {
      base(); net.visible = false; rock.visible = true; placeLion({ dx: -0.9 }); lion.head.rotation.z = -0.12; lion.mouth.visible = lt > 4.8 ? Math.sin(t * 6) > 0.4 : false;
      const raise = ease((lt - 1.4) / 0.7); lion.legs[0].rotation.z = lerp(0.1, 1.45, raise) + Math.sin(t * 5) * 0.03 * raise; lion.tail.rotation.z = 0.5 + 0.3 * Math.sin(t * 4);
      lion.root.updateMatrixWorld(true); const paw = lion.legs[0].localToWorld(V3(0, -lion.leg, 0));
      mouse.bg.rotation.z = 0.8; mouse.legs[0].rotation.z = 2.6; mouse.legs[1].rotation.z = 0.5; mouse.legs[2].rotation.z = mouse.legs[3].rotation.z = -0.3; mouse.head.rotation.z = -0.1;
      mouse.root.rotation.y = YAW + 2.8; mouse.root.position.set(paw.x + 1.5, 1.0, paw.z + 0.1); mouse.root.updateMatrixWorld(true);
      const mp = mouse.legs[0].localToWorld(V3(0, -mouse.leg, 0)); mouse.root.position.add(paw.clone().sub(mp).multiplyScalar(raise)); mouse.root.position.y = Math.max(mouse.root.position.y, 0.5);
      mouse.mouth.visible = lt < 4.5 && Math.sin(t * 13) > -0.1; rock.position.set(mouse.root.position.x, 0, mouse.root.position.z); rock.scale.set(1, Math.max(mouse.root.position.y, 0.2), 1); rock.position.y = Math.max(mouse.root.position.y, 0.2) / 2;
      const hf = clamp((lt - 2.1) / 0.3); flashes[0].visible = lt > 2.1 && lt < 2.7; if (flashes[0].visible) { flashes[0].position.copy(paw).add(V3(0.2, 0.3, 0.3)); flashes[0].scale.setScalar(0.8 + (lt - 2.1) * 2.5); flashes[0].material.opacity = 1; }
      camera.position.set(lerp(2.0, 2.6, ease(lt / d)), 2.0, 10.6); camera.lookAt(0.5, 1.2, 0.5); camera.fov = 46;
    },
    // 8 – end card
    (lt, d, t) => { W.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
