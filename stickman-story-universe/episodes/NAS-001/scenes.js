// NAS-001 – Do You Know What I'm Going to Say? Source: The Turkish Jester, tr. George Borrow (1884), anecdote 1.
// Nasreddin turns a lecture into a lesson in three Fridays. Gentle, respectful tone.
import { anatolia } from '../../engine/sets/anatolia.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, rng, clamp, ease, easeOutBack, lerp, toon, outlined, makeStick, makeAnimal, NASREDDIN, drop } = ctx;
  const T = anatolia(ctx); const G = T.group;
  const E = endcard(ctx, NASREDDIN);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  const nas = makeStick(NASREDDIN); G.add(nas.root);
  const donkey = makeAnimal('donkey'); donkey.root.scale.setScalar(1.5); G.add(donkey.root);
  const drops = Array.from({ length: 5 }, () => { const d = drop(); G.add(d); return d; });

  // ---- the crowd: two rows facing the dais; split into a left and a right half ----
  const crowd = [];
  { const R = rng(31); const robes = [0x3d7ea6, 0xc8553d, 0x8e5ba8, 0x2a9d8f, 0xe0a030, 0x6d6875, 0x4f8a4b, 0xb5455a, 0x5a6fa8];
    const spots = []; const arc = (rad, ths) => ths.forEach(th => { const a = th * Math.PI / 180; spots.push([rad * Math.sin(a), -4 + rad * Math.cos(a)]); });
    arc(5.2, [-75, -60, -45, -30, 30, 45, 60, 75]); arc(7.4, [-65, -50, -35, 35, 50, 65]); arc(5.2, [-14, 14]);
    spots.forEach(([x, z], i) => { const k = R(); const woman = i % 5 === 2;
      const o = woman ? { robe: robes[i % robes.length], robeLong: true, veil: [0xd9a6a0, 0x9fc1d6, 0xe8d9a0][i % 3], seed: 80 + i }
        : { robe: robes[i % robes.length], beard: k < 0.5 ? 0x3b2a1a : null, hair: k > 0.5 ? 0x2a1a10 : null, hat: k < 0.35 ? 0xb5262e : null, turban: k > 0.7 ? [0xf4efe4, 0xd9c9a0, 0x9fc1d6][i % 3] : null, seed: 80 + i };
      const r = makeStick(o); r.root.position.set(x, 0, z); G.add(r.root); crowd.push({ r, x, z, ph: R() * 6, left: x < 0 }); });
  }
  const DAIS_TOP = 0.6;
  const faceDais = (c) => { c.r.root.rotation.y = Math.atan2(0 - c.x, -4 - c.z); };

  function base(t) {
    scene.background = SKIES.desert; aimSun(V3(0, 0, -2), V3(-12, 22, 14), 0xfff0d0, 2.4);
    G.visible = true; E.group.visible = false; drops.forEach(d => d.visible = false);
    nas.rest(); nas.root.visible = true; nas.root.rotation.set(0, 0, 0); nas.root.position.set(0, DAIS_TOP, -4); nas.expr('smile', 0.4); nas.look(0, 0); nas.headG.rotation.set(0, 0, 0);
    donkey.root.visible = true; donkey.root.position.set(3.1, 0, -4.8); donkey.root.rotation.set(0, -2.6, 0); donkey.walk(0, 0); donkey.head.rotation.set(0, 0, 0);
    for (const c of crowd) { c.r.rest(); c.r.root.visible = true; c.r.root.position.set(c.x, 0, c.z); faceDais(c); c.r.body.position.y = Math.sin(t * 2 + c.ph) * 0.025; c.r.expr('flat', 0); c.r.look(0, 0.2); }
  }
  function speak(r, t, k = 1) { r.arms[1].sh.rotation.set(-0.35, 0, (1.5 + Math.sin(t * 3.2) * 0.4) * k); r.arms[1].el.rotation.z = 0.6; r.arms[0].sh.rotation.set(-0.7 + Math.sin(t * 2.4) * 0.2, 0, -0.5 * k); r.expr('open', 0.5); }
  const nodH = (c, t, a = 0.3) => { c.r.headG.rotation.x = Math.sin(t * 9 + c.ph) * a; };
  const shakeH = (c, t, a = 0.5) => { c.r.headG.rotation.y = Math.sin(t * 10 + c.ph) * a; };
  const cheer = (c, t, k) => { c.r.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * (0.5 + 2.2 * k + Math.sin(t * 9 + c.ph) * 0.25 * k))); c.r.body.position.y = Math.abs(Math.sin(t * 8 + c.ph)) * 0.12 * k; c.r.expr('open', 0.5 * k); };

  return [
    // 1 – asked to speak to the whole town; he didn't prepare. At all. (sweating on the dais)
    (lt, d, t) => {
      base(t); const u = ease(lt / d);
      nas.expr('flat', 0.9); nas.look(0.3, -0.2); nas.headG.rotation.z = Math.sin(t * 2) * 0.05; nas.arms.forEach((a, i) => { a.sh.rotation.set(-0.3, 0, a.side * 0.35); a.el.rotation.x = -1.1; });
      nas.arms[1].el.rotation.x = -1.1 + Math.sin(t * 6) * 0.12;          // fidgeting hands
      drops.forEach((dr, i) => { const st = 0.9 + i * 0.35; const v = (lt - st) % 1.1; dr.visible = lt > st; if (dr.visible) { const sd = i % 2 ? 1 : -1; dr.position.set(sd * (0.55 + v * 0.8), DAIS_TOP + 3.2 + 0.2 - v * 1.1 - v * v * 0.5, -3.5 + 0.2); } });
      donkey.head.rotation.z = -0.15; donkey.root.rotation.y = -2.9;
      camera.position.set(lerp(-1.6, -0.6, u), 4.6, lerp(11.8, 10.6, u)); camera.lookAt(0, 2.9, -4); camera.fov = 42;
    },
    // 2 – "Do you know what I'm going to say?" "No!" … so he walks off, donkey in tow
    (lt, d, t) => {
      base(t); const ask = clamp(lt / (d * 0.45)), leave = ease((lt - d * 0.6) / (d * 0.4));
      for (const c of crowd) { if (lt > d * 0.3 && lt < d * 0.55) shakeH(c, t, 0.55); if (lt > d * 0.3) { c.r.expr('flat', 0); c.r.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * 0.3)); } }
      if (leave < 0.01) { speak(nas, t, 1); nas.root.position.set(0, DAIS_TOP, -4); }
      else { const x = lerp(0, 8.5, leave); const stepDown = ease(leave * 4); nas.root.position.set(x, lerp(DAIS_TOP, 0, stepDown), lerp(-4, -5.0, stepDown)); nas.root.rotation.y = Math.PI / 2; nas.walk(t * 7, 1); nas.expr('smile', 0.6); nas.arms[1].sh.rotation.set(-0.3, 0, 0.5);
        donkey.root.position.set(lerp(3.1, 6.6, leave), 0, -5.6); donkey.root.rotation.y = lerp(-2.6, 0, ease(leave * 3)); donkey.walk(t * 7, leave > 0.1 ? 0.8 : 0); }
      camera.position.set(lerp(-0.8, 4.2, leave), 4.2, lerp(11.5, 10.5, leave)); camera.lookAt(lerp(0, 4.6, leave), 2.4, -4); camera.fov = 44;
    },
    // 3 – next week, same question; this time the whole crowd shouts "Yes!"  (camera on the dais, crowd faces us)
    (lt, d, t) => {
      base(t); nas.root.visible = false; donkey.root.visible = false;
      const k = ease((lt - 0.35) / 0.35);
      for (const c of crowd) { cheer(c, t, k); c.r.root.rotation.y = Math.PI; }
      camera.position.set(0, 4.6, -11.0 + lt * 0.12); camera.lookAt(0, 2.2, 0.8); camera.fov = 58;
    },
    // 4 – "Then you already know. Why should I tell you?" – he waves goodbye; jaws drop
    (lt, d, t) => {
      base(t); const x = lerp(0.2, 8.0, ease((lt - 0.7) / (d - 0.7)));
      for (const c of crowd) { c.r.expr('open', 1.2); c.r.headG.rotation.x = -0.15; c.r.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * 0.15)); }
      if (lt < 0.7) { speak(nas, t, 0.8); nas.root.position.set(0, DAIS_TOP, -4); }
      else { nas.root.position.set(x, lerp(DAIS_TOP, 0, ease((lt - 0.7) / 0.4)), lerp(-4, -5.0, ease((lt - 0.7) / 0.4))); nas.root.rotation.y = Math.PI / 2 - 0.5; nas.walk(t * 7, 1); nas.expr('smile', 0.8); nas.arms[0].sh.rotation.set(-0.2, 0, -2.5 - Math.sin(t * 9) * 0.3); donkey.root.position.set(x - 2.0, 0, -5.6); donkey.root.rotation.y = 0; donkey.walk(t * 7, 0.8); }
      camera.position.set(lerp(3.2, 5.6, ease(lt / d)), 3.4, 10.8); camera.lookAt(lerp(1.5, 4.2, ease(lt / d)), 2.0, -3.4); camera.fov = 46;
    },
    // 5 – third week: the crowd is ready: half say yes, half say no (grinning at their clever plan)
    (lt, d, t) => {
      base(t); nas.root.visible = true; nas.root.position.set(0, DAIS_TOP, -4); nas.expr('smile', 0.5); nas.root.rotation.y = 0; donkey.root.visible = false; nas.root.visible = false;
      for (const c of crowd) { c.r.root.rotation.y = Math.PI; c.r.expr('smile', 1);
        if (c.left) { nodH(c, t, 0.35); c.r.arms[1].sh.rotation.set(-0.4, 0, 0.3); } else { shakeH(c, t, 0.6); c.r.arms[0].sh.rotation.set(-0.4, 0, -0.3); } }
      camera.position.set(0, 4.6, -11.0); camera.lookAt(lerp(-0.9, 0.9, ease(lt / d)), 2.2, 0.8); camera.fov = 58;
    },
    // 6 – "Wonderful! Those who know can tell those who don't." and off he goes again; the crowd turns to each other, puzzled
    (lt, d, t) => {
      base(t); const smile = ease(lt / 1.0), leave = ease((lt - 2.4) / (d - 2.4));
      if (leave < 0.01) { nas.expr('smile', 1); nas.arms[1].sh.rotation.set(-0.3, 0, 2.3 + Math.sin(t * 5) * 0.2); nas.arms[1].el.rotation.z = 0.5; nas.arms[0].sh.rotation.set(-0.4, 0, -0.9 * smile); }
      else { nas.root.position.set(lerp(0, 7.5, leave), lerp(DAIS_TOP, 0, ease(leave * 4)), lerp(-4, -5.0, ease(leave * 4))); nas.root.rotation.y = Math.PI / 2; nas.walk(t * 7, 1); nas.expr('smile', 0.8);
        donkey.root.position.set(lerp(3.1, 5.6, leave), 0, -5.6); donkey.root.rotation.y = lerp(-2.6, 0, ease(leave * 3)); donkey.walk(t * 7, 0.8); }
      for (const c of crowd) { const toN = crowd[(crowd.indexOf(c) + (c.left ? 1 : -1) + crowd.length) % crowd.length]; if (lt > 1.5) { c.r.root.rotation.y = Math.atan2(toN.x - c.x, toN.z - c.z); c.r.expr('open', 0.7); c.r.headG.rotation.z = Math.sin(t * 3 + c.ph) * 0.15; c.r.arms[1].sh.rotation.set(-0.5, 0, 0.9 + Math.sin(t * 5 + c.ph) * 0.2); } else { c.r.expr('smile', 0.7); } }
      camera.position.set(lerp(-1.5, 3.6, leave), 4.2, lerp(11.5, 10.8, leave)); camera.lookAt(lerp(0, 4.4, leave), 2.5, -3.6); camera.fov = 46;
    },
    // 7 – the crowd now chat and explain things to each other; Nasreddin peeks back and winks
    (lt, d, t) => {
      base(t); nas.root.position.set(8.2, 0, -5.0); nas.root.rotation.y = -2.2; nas.expr('smile', 0.7); nas.look(-0.6, 0.1); donkey.root.position.set(9.7, 0, -5.4); donkey.root.rotation.y = 3.0; donkey.head.rotation.z = 0.1;
      const w = (lt > 3.6 && lt < 4.3); nas.eyes[1].e.scale.y = w ? 0.1 : 1; nas.arms[0].sh.rotation.set(-0.2, 0, -2.3 - Math.sin(t * 7) * 0.2);
      crowd.forEach((c, i) => { const nb = crowd[(i + (i % 2 ? 1 : -1) + crowd.length) % crowd.length]; c.r.root.rotation.y = Math.atan2(nb.x - c.x, nb.z - c.z); c.r.expr(Math.sin(t * 5 + c.ph * 3) > -0.3 ? 'open' : 'smile', 0.5); c.r.arms[1].sh.rotation.set(-0.7 + Math.sin(t * 4 + c.ph) * 0.3, 0, 1.0 + Math.sin(t * 5 + c.ph) * 0.25); c.r.headG.rotation.z = Math.sin(t * 2 + c.ph) * 0.1; });
      camera.position.set(lerp(1.5, 5.2, ease(lt / d)), 4.4, 11.4); camera.lookAt(lerp(1.5, 5.6, ease(lt / d)), 1.8, -1.2); camera.fov = 50;
    },
    // 8 – end card
    (lt, d, t) => { G.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
