// SOC-005 – Socrates and the Kick. Source: Diogenes Laertius, Lives II.21. The kick is a cartoon bump, no injury.
import { agora } from '../../engine/sets/agora.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, easeOutBack, lerp, toon, outlined, makeStick, makeAnimal, SOCRATES, drop, questionMark } = ctx;
  const A = agora(ctx, { crowd: true }); const G = A.group; const E = endcard(ctx, SOCRATES);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const soc = makeStick(SOCRATES); G.add(soc.root);
  const angry = makeStick({ robe: 0x8a2a2a, beard: 0x2a1a10, hair: 0x2a1a10, seed: 151 }); G.add(angry.root);
  const judge = makeStick({ robe: 0x3d7ea6, hair: 0x2a1a10, seed: 152 }); G.add(judge.root);
  const donkey = makeAnimal('donkey'); donkey.root.scale.setScalar(1.15); G.add(donkey.root);
  const steam = Array.from({ length: 6 }, () => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); G.add(s); return s; });
  const stars = Array.from({ length: 6 }, () => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: 0xffd23f })); s.scale.z = 0.3; G.add(s); return s; });
  const dust = Array.from({ length: 8 }, () => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe6d6b0, transparent: true, opacity: 0.7 })); G.add(s); return s; });
  const qm = questionMark(); G.add(qm);
  // the court in a thought bubble: a gavel-like block with a donkey "in the dock"
  const sweat = [drop(), drop()]; sweat.forEach(d => G.add(d));

  const SOC = V3(-1.2, 0, 0.6), ANG = V3(1.3, 0, 0.6);
  function reset(t) { G.visible = true; E.group.visible = false; scene.background = SKIES.day; aimSun(V3(0, 0, -2), V3(-10, 20, 14), 0xfff0d0, 2.4); hemi.intensity = 1.5;
    A.reset(); A.crowd.forEach(c => { A.idle(c, t); c.r.root.rotation.y = Math.atan2(-c.x, 0.6 - c.z); if (c.z > -0.5 || Math.abs(c.x) < 2.2) c.r.root.visible = false; });
    for (const r of [soc, angry, judge]) { r.rest(); r.root.visible = true; r.root.rotation.set(0, 0, 0); r.expr('smile', 0.3); r.look(0, 0); r.headG.rotation.set(0, 0, 0); }
    judge.root.visible = false; soc.root.position.copy(SOC); angry.root.position.copy(ANG); soc.root.rotation.y = 0.6; angry.root.rotation.y = -0.6;
    donkey.root.visible = false; donkey.root.rotation.set(0, 0, 0); donkey.walk(0, 0);
    steam.forEach(s => s.visible = false); stars.forEach(s => s.visible = false); dust.forEach(s => s.visible = false); qm.visible = false; sweat.forEach(s => s.visible = false); }
  const cam = (x, y, z, lx, ly, lz, fov = 50) => { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; };
  const talk = (r, t) => { r.expr(Math.sin(t * 11) > 0 ? 'open' : 'smile', 0.4); r.arms[1].sh.rotation.set(-0.3, 0, 1.3 + Math.sin(t * 3) * 0.3); r.arms[1].el.rotation.z = 0.5; };

  return [
    // 1 – Socrates questions people in the market; the man gets cross
    (lt, d, t) => { reset(t); const u = lt / d; talk(soc, t); angry.expr(u > 0.5 ? 'frown' : 'flat', u > 0.5 ? -0.9 : 0);
      cam(0, 3.0, lerp(11, 9.5, ease(u)), 0, 1.8, 0, 50); },
    // 2 – red face, hot ears (steam) … then the kick
    (lt, d, t) => { reset(t); const u = lt / d; angry.expr('open', -1.3); angry.root.position.x += Math.sin(t * 20) * 0.03 * (u < 0.6 ? 1 : 0);
      steam.forEach((s, i) => { s.visible = u > 0.2; const v = (t * 1.1 + i / 6) % 1; s.position.set(ANG.x + (i % 2 ? 0.4 : -0.4), 3.1 + v * 1.0, ANG.z); s.scale.setScalar(0.6 + v); s.material.opacity = 0.7 * (1 - v); });
      const k = clamp((u - 0.62) / 0.12); angry.legs[0].hip.rotation.x = -1.3 * Math.sin(k * Math.PI); angry.root.position.x -= 0.4 * Math.sin(k * Math.PI);
      const hit = clamp((u - 0.68) / 0.2); soc.root.position.x = SOC.x - 0.5 * Math.sin(hit * Math.PI); soc.body.rotation.z = 0.35 * Math.sin(hit * Math.PI); soc.expr(hit > 0 ? 'open' : 'flat', 0.8);
      stars.forEach((s, i) => { s.visible = hit > 0 && hit < 1; const a = i / 6 * 6.28 + t * 4; s.position.set(SOC.x + Math.cos(a) * 0.8, 3.4 + Math.sin(a) * 0.3, SOC.z); s.scale.setScalar(0.9); s.scale.z = 0.3; });
      cam(0, 2.8, 8.5, 0, 1.8, 0.3, 50); },
    // 3 – the crowd gasps: "take him to court!"
    (lt, d, t) => { reset(t); soc.body.rotation.z = 0.1; soc.expr('flat', 0.4); angry.expr('frown', -0.6);
      A.crowd.forEach(c => { c.r.expr('open', 1.0); c.r.arms.forEach(a => a.sh.rotation.set(-1.2, 0, a.side * 0.6)); });
      judge.root.visible = true; judge.root.position.set(-3.0, 0, 1.4); judge.root.rotation.y = 0.9; talk(judge, t); judge.arms[1].sh.rotation.set(-0.3, 0, 2.6);
      cam(-0.4, 3.6, 11.5, -0.4, 1.6, -1, 54); },
    // 4 – Socrates calmly dusts off his robe and thinks (dust puffs, hand on chin)
    (lt, d, t) => { reset(t); const u = lt / d; soc.root.rotation.y = 0.2; soc.expr('smile', 0.3); soc.look(0.3, 0.4);
      if (u < 0.5) { soc.arms[0].sh.rotation.set(-0.6 + Math.sin(t * 14) * 0.3, 0, -0.2); soc.arms[1].sh.rotation.set(-0.6 - Math.sin(t * 14) * 0.3, 0, 0.2);
        dust.forEach((s, i) => { s.visible = true; const v = (t * 1.5 + i / 8) % 1; s.position.set(SOC.x + Math.cos(i * 2) * (0.4 + v * 0.6), 1.0 + v * 0.8, SOC.z + Math.sin(i * 2) * 0.4 + 0.3); s.scale.setScalar(0.6 + v); s.material.opacity = 0.7 * (1 - v); }); }
      else { soc.arms[1].sh.rotation.set(-1.4, 0, 0.5); soc.arms[1].el.rotation.set(-1.8, 0, 0); qm.visible = true; qm.position.set(SOC.x + 0.8, 3.6, SOC.z); qm.scale.setScalar(1.1 + 0.1 * Math.sin(t * 5)); }
      cam(SOC.x + 0.6, 2.6, 6.5, SOC.x + 0.4, 2.0, SOC.z, 48); },
    // 5 – "If a donkey kicked me…": a donkey wanders in and gives a little back-kick
    (lt, d, t) => { reset(t); const u = lt / d; talk(soc, t); soc.root.rotation.y = 0.0;
      donkey.root.visible = true; const k = ease(clamp(u / 0.5)); donkey.root.position.set(lerp(-7, -3.4, k), 0, 1.2); donkey.walk(t * 8, 1 - k);
      if (u > 0.6) { const b = Math.sin(clamp((u - 0.6) / 0.15) * Math.PI); donkey.legs[2].rotation.z = donkey.legs[3].rotation.z = -1.0 * b; donkey.root.rotation.z = -0.15 * b; }
      cam(-1.0, 2.8, 9.0, -1.4, 1.6, 0, 52); },
    // 6 – the crowd laughs; the angry man sweats; the donkey looks away
    (lt, d, t) => { reset(t); soc.expr('smile', 0.8); angry.expr('flat', 0.9); angry.headG.rotation.x = 0.35; angry.root.rotation.y = -0.2;
      sweat.forEach((s, i) => { s.visible = true; const v = (t * 0.9 + i / 2) % 1; s.position.set(ANG.x + 0.4 + i * 0.2, 3.0 - v * 0.8, ANG.z + 0.3); s.scale.setScalar(1.1); });
      A.crowd.forEach(c => { c.r.expr('open', 1.0); c.r.body.position.y = Math.abs(Math.sin(t * 9 + c.ph)) * 0.08; c.r.arms.forEach(a => a.sh.rotation.set(-0.4, 0, a.side * 0.8)); });
      donkey.root.visible = true; donkey.root.position.set(-3.4, 0, 1.0); donkey.root.rotation.y = Math.PI; donkey.head.rotation.z = -0.3;
      cam(0, 3.6, 12, 0, 1.6, -1, 54); },
    // 7 – the moral: Socrates calm, hands behind back, smiling
    (lt, d, t) => { reset(t); soc.root.position.set(0, 0, 1.2); soc.root.rotation.y = 0; soc.expr('smile', 0.9); soc.look(0, 0.1); angry.root.visible = false;
      soc.arms[1].sh.rotation.set(-0.3, 0, 2.5); soc.arms[1].el.rotation.set(-1.6, 0, 0.9 + Math.sin(t * 6) * 0.15); soc.arms[0].sh.rotation.set(-0.2, 0, -0.35);
      cam(0, 2.6, 8.0, 0, 2.0, 0, 48); },
    (lt, d, t) => { G.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
