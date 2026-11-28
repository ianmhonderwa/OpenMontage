// SOC-002 – Testing the Politicians. Source: Plato, Apology 21c-e (Jowett tr.).
// Socrates questions a politician famed for wisdom, finds he only thinks he knows, and makes an enemy.
import { agora } from '../../engine/sets/agora.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, clamp, ease, easeOutBack, lerp, toon, grad, BLACK, outlined, radialTexture,
    makeStick, SOCRATES, laurel, drop } = ctx;

  const A = agora(ctx);
  const E = endcard(ctx, SOCRATES);
  const soc = makeStick(SOCRATES); A.group.add(soc.root);

  // speaking platform (bema) and the politician
  const bema = outlined(new THREE.BoxGeometry(3.2, 0.8, 2.2), toon(0xe9dcc3), 1.02); bema.position.set(0, 0.4, -6); bema.receiveShadow = true; A.group.add(bema);
  const step = outlined(new THREE.BoxGeometry(3.2, 0.4, 0.8), toon(0xe0d2b6), 1.02); step.position.set(0, 0.2, -4.5); A.group.add(step);
  const pol = makeStick({ robe: 0x5b2a86, trim: 0xe0b84a, robeLong: true, robeWide: 0.66, beard: 0x111111, hair: 0x111111, seed: 202 });
  A.group.add(pol.root);
  const crown = laurel(); crown.position.set(0, 0.42, -0.05); crown.rotation.x = -0.15; pol.headG.add(crown);
  const polHeadMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad });
  pol.headG.children[0].material = polHeadMat;
  const white = new THREE.Color(0xffffff), angry = new THREE.Color(0xff6b5a);
  function polRed(k) { polHeadMat.color.copy(white).lerp(angry, clamp(k)); }

  // steam puffs from the politician's ears
  const steamTex = radialTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0)');
  const steam = Array.from({ length: 8 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false })); s.userData = { side: i % 2 ? 1 : -1, ph: i * 0.37 }; A.group.add(s); return s; });
  function steamAt(t, on, origin) {
    for (const s of steam) {
      s.visible = on; if (!on) continue;
      const u = (t * 1.3 + s.userData.ph) % 1;
      s.position.set(origin.x + s.userData.side * (0.62 + u * 0.5), origin.y + u * 1.4, origin.z);
      s.scale.setScalar(0.25 + u * 0.7); s.material.opacity = 0.9 * (1 - u);
    }
  }
  const drops = Array.from({ length: 6 }, () => { const d = drop(); A.group.add(d); return d; });
  function sweat(lt, start, origin) {
    drops.forEach((dr, i) => { const st = start + i * 0.3; const u = (lt - st) % 1.1; dr.visible = lt > st; if (!dr.visible) return; const sd = i % 2 ? 1 : -1;
      dr.position.set(origin.x + sd * (0.55 + u * 1.0), origin.y + 0.3 + u * 1.4 - u * u * 3.0, origin.z + 0.2); });
  }

  // the "politician as a dog" cutaway: a round-headed stick dog in a tiny purple robe and laurel
  const dog = new THREE.Group(); A.group.add(dog);
  {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8), BLACK); body.rotation.z = Math.PI / 2; body.position.y = 0.75; dog.add(body);
    const cape = outlined(new THREE.CylinderGeometry(0.28, 0.36, 0.7, 16, 1, true), toon(0x5b2a86, { side: THREE.DoubleSide }), 1.05); cape.rotation.z = Math.PI / 2; cape.position.set(-0.05, 0.78, 0); dog.add(cape);
    const head = outlined(new THREE.SphereGeometry(0.36, 24, 18), toon(0xffffff), 1.07); head.position.set(0.62, 1.08, 0); dog.add(head);
    for (const sd of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), BLACK); ear.scale.set(0.6, 1.4, 0.5); ear.position.set(0.55, 1.36, sd * 0.24); dog.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), BLACK); eye.position.set(0.9, 1.14, sd * 0.13); dog.add(eye);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), BLACK); nose.position.set(0.98, 1.0, 0); dog.add(nose);
    const wreath = laurel(); wreath.scale.setScalar(0.6); wreath.position.set(0.62, 1.38, 0); dog.add(wreath);
    dog.userData.legs = [];
    for (const [x, z] of [[0.38, 0.12], [0.38, -0.12], [-0.38, 0.12], [-0.38, -0.12]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 8), BLACK); l.geometry.translate(0, -0.35, 0); l.position.set(x, 0.75, z); dog.add(l); dog.userData.legs.push(l); }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.5, 8), BLACK); tail.geometry.translate(0, 0.25, 0); tail.position.set(-0.5, 0.8, 0); tail.rotation.z = 0.9; dog.add(tail); dog.userData.tail = tail;
  }

  const POL = new THREE.Vector3(0, 0.8, -6);           // politician stands on the bema
  const polHead = () => new THREE.Vector3(POL.x, POL.y + 2.62, POL.z);
  function base(t) {
    scene.background = SKIES.day; aimSun(new THREE.Vector3(0, 0, -3), new THREE.Vector3(-12, 22, 14), 0xfff0d0, 2.4);
    for (const s of [A.group]) s.visible = true; E.group.visible = false;
    A.reset(); for (const c of A.crowd) { A.idle(c, t); c.r.root.rotation.y = Math.atan2(POL.x - c.x, POL.z - c.z); }
    pol.root.visible = true; pol.rest(); pol.root.position.copy(POL); pol.root.rotation.set(0, 0, 0); pol.body.scale.setScalar(1); polRed(0);
    soc.root.visible = true; soc.rest(); soc.expr('smile', 0.4); soc.look(0, 0);
    dog.visible = false; steamAt(t, false); drops.forEach(d => d.visible = false);
    for (const { e } of soc.eyes) e.scale.y = 1;
  }
  function faceTo(r, x, z) { r.root.rotation.y = Math.atan2(x - r.root.position.x, z - r.root.position.z); }
  function cheer(c, t, k) { c.r.arms.forEach(a => { a.sh.rotation.set(0, 0, a.side * (0.4 + 2.2 * k + Math.sin(t * 9 + c.ph) * 0.25 * k)); }); c.r.body.position.y = Math.abs(Math.sin(t * 7 + c.ph)) * 0.12 * k; c.r.expr(k > 0.3 ? 'open' : 'smile', 0.5 * k); }
  function speech(r, t) { r.arms[1].sh.rotation.set(-0.3, 0, 1.6 + Math.sin(t * 3) * 0.35); r.arms[1].el.rotation.z = 0.6; r.arms[0].sh.rotation.set(-0.8 + Math.sin(t * 2.3) * 0.2, 0, -0.3); r.expr('open', 0.2); r.headG.rotation.x = -0.15; }

  return [
    // 1 – the famous politician addresses an adoring crowd
    (lt, d, t) => {
      base(t); speech(pol, t);
      A.crowd.forEach(c => cheer(c, t, c.z > -5.5 ? 1 : 0.3));
      soc.root.position.set(lerp(5.5, 3.6, ease(lt / d)), 0, -1.6); faceTo(soc, POL.x, POL.z); soc.walk(lt * 6, 1 - ease(lt / d)); soc.look(-0.6, 0.3);
      const p = ease(lt / d); camera.position.set(lerp(-1.2, 0.2, p), lerp(1.4, 1.7, p), lerp(5.0, 3.4, p)); camera.lookAt(0, 3.6, -6); camera.fov = 48;
    },
    // 2 – "What is justice?" … "Whatever I say it is."
    (lt, d, t) => {
      base(t); soc.root.position.set(1.9, 0, -3.4); faceTo(soc, POL.x, POL.z);
      soc.arms[1].sh.rotation.set(-2.0 + Math.sin(lt * 2.5) * 0.1, 0, 0.3); soc.arms[1].el.rotation.x = -0.6; soc.expr('smile', 0.7); soc.look(-0.4, 0.5);
      for (const c of A.crowd) { c.r.root.rotation.y = Math.atan2(1 - c.x, -4.6 - c.z); if (c.x > 1.5) c.r.root.visible = false; }
      const puff = ease((lt - d * 0.45) / 0.6);
      pol.body.scale.set(1 + 0.12 * puff, 1 + 0.04 * puff, 1 + 0.12 * puff); pol.headG.rotation.x = -0.35 * puff;
      pol.arms.forEach(a => { a.sh.rotation.z = a.side * lerp(0.2, 0.55, puff); a.el.rotation.z = -a.side * lerp(0, 1.8, puff); });
      pol.expr(puff > 0.2 ? 'smile' : 'flat', -0.4 * puff); pol.look(0.4, -0.3);
      faceTo(pol, 1.9, -3.4);
      const p = ease(lt / d); camera.position.set(lerp(3.0, 2.7, p), 2.5, lerp(2.0, 1.2, p)); camera.lookAt(0.5, 3.2, -5.5); camera.fov = 46;
    },
    // 3 – round and round: the politician starts to sweat, the crowd leans in
    (lt, d, t) => {
      base(t); soc.root.position.set(1.9, 0, -3.4); faceTo(soc, POL.x, POL.z); faceTo(pol, 1.9, -3.4);
      const back = Math.sin(lt * 2.4) > 0;   // alternate who is speaking
      soc.arms[1].sh.rotation.set(back ? -1.8 : -0.4, 0, 0.3); soc.expr(back ? 'open' : 'smile', 0.7);
      const nerv = ease(lt / d);
      pol.expr(back ? 'flat' : 'open', lerp(-0.2, 1, nerv)); pol.headG.rotation.x = lerp(-0.3, 0.1, nerv); pol.look(lerp(0.4, -0.6, nerv), 0.2);
      pol.body.position.x = Math.sin(lt * 35) * 0.025 * nerv;
      sweat(lt, d * 0.3, polHead());
      for (const c of A.crowd) { c.r.body.rotation.x = 0.18 * nerv; c.r.expr('open', 0.6 * nerv); c.r.root.rotation.y = Math.atan2(1 - c.x, -4.6 - c.z); if (c.x < -1 && c.z > -3) c.r.root.visible = false; }
      const p = ease(lt / d); camera.position.set(lerp(-3.8, -3.2, p), 3.1, lerp(0.4, -0.4, p)); camera.lookAt(0.7, 2.9, -4.9); camera.fov = 46;
    },
    // 4 – like a dog chasing its own tail
    (lt, d, t) => {
      base(t); pol.root.visible = false;
      dog.visible = true; const a = lt * 7.5; dog.position.set(Math.cos(a) * 0.35, 0, -1.2 + Math.sin(a) * 0.35); dog.rotation.y = -a - Math.PI / 2;
      dog.userData.legs.forEach((l, i) => { l.rotation.z = Math.sin(lt * 22 + i * Math.PI) * 0.5; });
      dog.userData.tail.rotation.z = 0.9 + Math.sin(lt * 25) * 0.4;
      soc.root.position.set(2.4, 0, 0.6); faceTo(soc, 0, -1.2); soc.expr('smile', 0.8); soc.headG.rotation.z = 0.2 + Math.sin(lt * 2) * 0.05;
      soc.arms[1].sh.rotation.set(-0.4, 0, 0.6); soc.arms[1].el.rotation.z = 2.0;     // hand on chin-ish
      for (const c of A.crowd) { c.r.root.rotation.y = Math.atan2(0 - c.x, -1.2 - c.z); cheer(c, t, 0.5); }
      const p = ease(lt / d); camera.position.set(lerp(-0.4, 0.3, p), lerp(2.4, 2.1, p), lerp(2.6, 2.0, p)); camera.lookAt(0, 0.9, -1.2); camera.fov = 50;
    },
    // 5 – the crowd laughs; the politician turns red, steam from his ears
    (lt, d, t) => {
      base(t); soc.root.position.set(1.9, 0, -3.4); faceTo(soc, POL.x, POL.z); soc.expr('flat', 0.6);
      faceTo(pol, 0, 2); const k = ease(lt / (d * 0.5)); polRed(k); pol.expr('frown', -1); pol.headG.rotation.x = 0.1;
      pol.arms.forEach(a => { a.sh.rotation.z = a.side * 0.5; a.el.rotation.z = -a.side * 1.8; }); pol.body.position.x = Math.sin(lt * 40) * 0.03 * k;
      steamAt(t, k > 0.4, polHead());
      for (const c of A.crowd) { c.r.root.rotation.y = Math.atan2(0 - c.x, -6 - c.z); c.r.expr('open', 1); c.r.body.position.y = Math.abs(Math.sin(t * 11 + c.ph)) * 0.14;
        c.r.arms.forEach(a => { a.sh.rotation.set(-0.6, 0, a.side * 0.2); a.el.rotation.set(-1.4, 0, 0); }); c.r.body.rotation.x = Math.sin(t * 11 + c.ph) * 0.12; }
      const p = ease(lt / d); camera.position.set(lerp(-0.6, 0, p), 3.4, lerp(-0.6, -1.6, p)); camera.lookAt(0, 3.3, -6); camera.fov = 46;
    },
    // 6 – Socrates walks away, counting on his fingers; the politician fumes behind him
    (lt, d, t) => {
      base(t); polRed(1); pol.expr('frown', -1); steamAt(t, true, polHead()); faceTo(pol, 1.6, 0);
      pol.arms.forEach(a => { a.sh.rotation.set(0, 0, a.side * (2.4 + Math.sin(t * 12) * 0.2)); });
      for (const c of A.crowd) { c.r.root.rotation.y = Math.atan2(1.6 - c.x, 0 - c.z); if (c.x > 0 && c.z > -3) c.r.root.visible = false; }
      const z = lerp(-3.0, 1.6, ease(lt / d)); soc.root.position.set(1.6, 0, z); soc.root.rotation.y = 0; soc.walk(lt * 5, 0.8);
      soc.arms[1].sh.rotation.set(-1.35, 0, 0.15); soc.arms[1].el.rotation.x = -0.9 + Math.sin(lt * 5) * 0.15;
      soc.expr('smile', 0.6); soc.look(0.3, 0.5);
      camera.position.set(2.0, 2.7, z + 6.2); camera.lookAt(1.2, 2.6, z - 3); camera.fov = 46;
    },
    // 7 – close-up: Socrates winks at the camera
    (lt, d, t) => {
      base(t); pol.root.visible = false; for (const c of A.crowd) c.r.root.visible = c.z < -2;
      soc.root.position.set(0, 0, 2); soc.root.rotation.y = 0; soc.expr('smile', 0.5); soc.look(0, 0);
      const w = lt > 2.2 && lt < 3.0; soc.eyes[1].e.scale.y = w ? 0.12 : 1; if (w) soc.brows[1].position.y = 0.27;
      soc.arms[1].sh.rotation.set(-1.9, 0, 0.2); soc.arms[1].el.rotation.x = -0.4;
      const p = ease(lt / d); camera.position.set(0, 2.8, lerp(6.6, 5.6, p)); camera.lookAt(0, 2.65, 2); camera.fov = 42;
    },
    // 8 – end card
    (lt, d, t) => { A.group.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
