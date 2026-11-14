// SOC-001 – The Oracle Says No One Is Wiser. Source: Plato, Apology 20e-23b (Jowett tr.).
// Episode scenes: build(ctx) creates the sets and returns one function per narration line: (lt, d, t) => void
// lt = time inside the scene, d = scene duration, t = global time. ctx carries lib.js exports + scene/camera/aimSun/SKIES.
export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture,
    makeStick, SOCRATES, column, oliveTree, stall, questionMark, bulb, laurel, drop } = ctx;
  // ---------- SET A: the Agora ----------
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
  // crowd
  const crowd = [];
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
  const soc = makeStick(SOCRATES); setA.add(soc.root);
  const qm = questionMark(); setA.add(qm);
  const wreath = laurel(); soc.headG.add(wreath);
  // important men + pompous man
  const nobles = [];
  {
    const fine = [[0x5b2a86, 0xe0b84a, 0x111111], [0x23477a, 0xe0b84a, 0x6b4423], [0x2a7a5a, 0xe0b84a, null], [0x7a2340, 0xe0b84a, 0x3b2a1a]];
    fine.forEach(([robe, trim, beard], i) => { const r = makeStick({ robe, trim, robeLong: true, robeWide: 0.6, beard, hair: i % 2 ? 0x111111 : 0x6b4423, seed: 60 + i }); setA.add(r.root); nobles.push(r); });
  }
  const pompous = makeStick({ robe: 0xa8323e, trim: 0xe0b84a, robeLong: true, robeWide: 0.66, beard: 0x111111, hair: 0x111111, seed: 77 }); setA.add(pompous.root);
  const drops = Array.from({ length: 6 }, () => { const d = drop(); setA.add(d); return d; });

  // ---------- SET B: temple at Delphi ----------
  const setB = new THREE.Group(); setB.position.set(400, 0, 0); scene.add(setB);
  const mists = [];
  let pythia, friend, tripodGlow, templeLight;
  {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), toon(0x4a3b5c)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; setB.add(floor);
    const back = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 0.5), toon(0x2e2440)); back.position.set(0, 10, -9); setB.add(back);
    for (let i = -3; i <= 3; i++) { if (i === 0) continue; const c = column(9, 0.5, 0x8d7fa6); c.position.set(i * 2.6, 0, -6 + Math.abs(i) * 0.6); setB.add(c); }
    // chasm crack under tripod
    const crack = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ color: 0x1a1226 })); crack.rotation.x = -Math.PI / 2; crack.position.set(0, 0.02, -2); crack.scale.set(1.4, 0.6, 1); setB.add(crack);
    // tripod
    const bronze = toon(0xb0874a);
    const tri = new THREE.Group(); tri.position.set(0, 0, -2); setB.add(tri);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const l = outlined(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), bronze, 1.2); l.position.set(Math.cos(a) * 0.55, 1.15, Math.sin(a) * 0.55); l.rotation.z = Math.cos(a) * 0.22; l.rotation.x = -Math.sin(a) * 0.22; tri.add(l); }
    const bowl = outlined(new THREE.CylinderGeometry(0.9, 0.6, 0.4, 20), bronze, 1.05); bowl.position.y = 2.35; tri.add(bowl);
    pythia = makeStick({ robe: 0x6c4f9e, robeLong: true, robeWide: 0.7, veil: 0x9f7cc9, seed: 88 });
    pythia.root.position.set(0, 1.2, -2); setB.add(pythia.root);
    friend = makeStick({ robe: 0x4f8a4b, hair: 0x111111, curls: true, seed: 5 });
    friend.root.position.set(0.3, 0, 1.6); friend.root.rotation.y = Math.PI; setB.add(friend.root);
    tripodGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,215,110,1)', 'rgba(255,180,60,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    tripodGlow.position.set(0, 3.4, -2); tripodGlow.scale.setScalar(5); setB.add(tripodGlow);
    templeLight = new THREE.PointLight(0xffc870, 30, 30, 1.6); templeLight.position.set(0, 4, -1); setB.add(templeLight);
    const mtex = radialTexture('rgba(220,205,255,0.55)', 'rgba(220,205,255,0)');
    const R = rng(5);
    for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mtex, transparent: true, depthWrite: false })); s.userData = { x: (R() - 0.5) * 8, y: 0.5 + R() * 4, z: -3 + R() * 4, ph: R() * 6, sc: 3 + R() * 3 }; setB.add(s); mists.push(s); }
  }

  // ---------- SET C: olive tree at sunset ----------
  const setC = new THREE.Group(); setC.position.set(-400, 0, 0); scene.add(setC);
  const soc7 = makeStick(SOCRATES); setC.add(soc7.root);
  const bulbG = bulb(); setC.add(bulbG);
  let sun;
  {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), toon(0xb07a4a)); hill.scale.set(1, 0.15, 1); hill.position.set(0, -6.0, 0); hill.receiveShadow = true; setC.add(hill);
    const t = oliveTree(1.9, 42); t.position.set(-1.8, 0, -1.6); setC.add(t);
    [[-14, -18, 1.3, 43], [12, -20, 1.5, 44], [20, -30, 1.4, 45]].forEach(([x, z, s, sd]) => { const tt = oliveTree(s, sd); tt.position.set(x, 0, z); setC.add(tt); });
    sun = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshBasicMaterial({ color: 0xffd27a })); sun.position.set(10, 6, -80); setC.add(sun);
    const city = new THREE.Group(); city.position.set(-6, 0, -60); setC.add(city);
    for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(3, 2 + (i * 7) % 4, 3), toon(0x7a4f6a)); b.position.set(i * 3.4 - 15, 1, (i % 3) * 2); city.add(b); }
  }
  const bulbLight = new THREE.PointLight(0xffe08a, 0, 12, 1.5); setC.add(bulbLight);

  // ---------- SET D: end card ----------
  const setD = new THREE.Group(); setD.position.set(0, 0, 400); scene.add(setD);
  const socEnd = makeStick(SOCRATES); setD.add(socEnd.root);
  {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 48), toon(0xe9dcc3)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; setD.add(floor);
    for (const x of [-4.5, 4.5]) { const c = column(7, 0.45); c.position.set(x, 0, -4); setD.add(c); }
  }

  // ---------- scene choreography ----------
  const V = new THREE.Vector3();
  function show(set) { for (const s of [setA, setB, setC, setD]) s.visible = s === set; }
  function resetAgora() {
    soc.root.visible = qm.visible = wreath.visible = pompous.root.visible = true; drops.forEach(d => d.visible = false);
    for (const n of nobles) n.root.visible = false; pompous.root.visible = false; qm.visible = false; wreath.visible = false;
    for (const c of crowd) { c.r.root.visible = true; c.r.root.position.set(c.x, 0, c.z); }
    soc.rest(); soc.expr('smile'); soc.look(0, 0); soc.root.rotation.set(0, 0, 0);
  }
  function idle(c, t) { c.r.rest(); c.r.body.position.y = Math.sin(t * 2 + c.ph) * 0.03; c.r.arms[0].sh.rotation.x = Math.sin(t * 1.3 + c.ph) * 0.15; c.r.expr('smile'); }

  const scenesFn = [
    // 1: Socrates walks barefoot through the busy agora; people step aside.
    (lt, d, t) => {
      show(setA); scene.background = SKIES.day; aimSun(V.set(0, 0, 0), new THREE.Vector3(-12, 22, 14), 0xfff0d0, 2.4); resetAgora();
      const z = lerp(-9, 2.8, ease(lt / d * 0.95)); soc.root.position.set(0, 0, z); soc.walk(lt * 6.2); soc.look(0, 0);
      if (lt > d - 2.4) { const k = ease((lt - (d - 2.4)) / 0.5); soc.arms[0].sh.rotation.set(-2.3 * k, 0, -0.2); soc.arms[0].el.rotation.x = -0.4 * k; soc.expr('open', 0.6 * k); }
      for (const c of crowd) {
        idle(c, t); const dz = Math.abs(c.z - z); const push = clamp(1 - dz / 3.2);
        c.r.root.position.x = c.x + c.dir * ease(push) * 1.1; c.r.expr(push > 0.3 ? 'open' : 'smile', push);
        c.r.root.rotation.y = Math.atan2(-c.x, z - c.z) * 0.6;
      }
      qm.visible = lt > d - 2.0; if (qm.visible) { const k = easeOutBack((lt - (d - 2.0)) / 0.45); qm.position.set(0.9, 4.2 + Math.sin(lt * 4) * 0.05, z); qm.scale.setScalar(0.85 * k); qm.rotation.y = Math.sin(lt * 2) * 0.3; }
      camera.position.set(lerp(1.5, 0.6, lt / d), lerp(2.6, 2.2, lt / d), z + lerp(9.5, 6.8, ease(lt / d))); camera.lookAt(0, 2.0, z - 0.5); camera.fov = 42;
    },
    // 2: the friend kneels before the priestess at Delphi.
    (lt, d, t) => {
      show(setB); scene.background = SKIES.night; aimSun(setB.position, new THREE.Vector3(6, 14, 10), 0x9b8cff, 0.9);
      friend.rest(); friend.sit(); friend.legs.forEach(l => { l.hip.rotation.x = -0.25; l.knee.rotation.x = 1.9; }); friend.body.position.y = -0.55; friend.body.rotation.x = 0.25;
      friend.arms.forEach(a => { a.sh.rotation.x = -1.2; a.el.rotation.x = -0.5; }); friend.expr('flat', 0.3); friend.headG.rotation.x = -0.2;
      pythia.rest(); pythia.sit(); pythia.body.position.y = -0.35; pythia.expr('flat', -0.2); pythia.look(0, -0.5);
      pythia.arms.forEach(a => { a.sh.rotation.x = -0.6 + Math.sin(t * 1.5 + a.side) * 0.1; a.el.rotation.x = -0.8; });
      tripodGlow.material.opacity = 0.35 + Math.sin(t * 3) * 0.08; templeLight.intensity = 25;
      mistUpdate(t, 1);
      const k = ease(lt / d); camera.position.set(setB.position.x + lerp(5.5, 3.6, k), lerp(2.4, 2.9, k), lerp(8, 6.2, k)); camera.lookAt(setB.position.x + 0.1, 2.4, -0.4); camera.fov = 44;
    },
    // 3: "No one is wiser than Socrates." — she points, mist glows gold, jaw drops.
    (lt, d, t) => {
      scenesFn[1](lt + 7, 7, t);
      const k = easeOutBack(clamp(lt / 0.5));
      pythia.arms[0].sh.rotation.set(-1.55 * k, 0, -0.1); pythia.arms[0].el.rotation.x = 0; pythia.expr('open', 0.8 * k); pythia.look(0, 0);
      friend.expr('open', 1); friend.body.rotation.x = lerp(0.25, -0.35, ease(lt / 0.6)); friend.arms.forEach(a => { a.sh.rotation.set(-2.6 * ease(lt / 0.5), 0, a.side * 0.6); });
      friend.open.scale.set(1, 1.2 + ease(lt / 0.6) * 1.2, 0.3);
      tripodGlow.material.opacity = 0.6 + 0.4 * ease(lt / 0.5); tripodGlow.scale.setScalar(5 + 3 * ease(lt / 0.5)); templeLight.intensity = 25 + 60 * ease(lt / 0.5);
      mistUpdate(t, 1 + 2 * ease(lt / 0.6), true);
      const p = ease(lt / d); camera.position.set(setB.position.x + lerp(-3.5, -2.6, p), lerp(2.2, 2.6, p), lerp(5.5, 4.2, p)); camera.lookAt(setB.position.x, 2.8, -1.2); camera.fov = 46;
    },
    // 4: Socrates scratches his bald head; question mark; then a laurel wreath lands ("genius").
    (lt, d, t) => {
      show(setA); scene.background = SKIES.day; aimSun(V.set(0, 0, 0), new THREE.Vector3(-12, 22, 14), 0xfff0d0, 2.4); resetAgora();
      friend.open.scale.set(1, 1.2, 0.3);
      soc.root.position.set(0, 0, 2); soc.rest();
      const scratch = Math.sin(lt * 14) * 0.18;
      soc.arms[0].sh.rotation.set(-0.4, 0, -2.55); soc.arms[0].el.rotation.set(0, 0, -1.9 + scratch);
      soc.arms[1].sh.rotation.set(-0.5, 0, 0.5); soc.arms[1].el.rotation.x = -1.2;
      soc.headG.rotation.z = 0.12; soc.expr(lt < 2.2 ? 'open' : 'frown', 1); soc.look(0.3, 0.6);
      qm.visible = true; const pk = easeOutBack(lt / 0.4); qm.scale.setScalar(1.15 * pk); qm.position.set(1.3, 4.6 + Math.sin(lt * 3) * 0.1, 2); qm.rotation.y = Math.sin(lt * 2) * 0.4;
      const wt = d * 0.58; wreath.visible = lt > wt;
      if (wreath.visible) { const k = ease((lt - wt) / 0.7); wreath.position.set(0, lerp(2.6, 0.42, k), -0.05); wreath.rotation.set(-0.15, lt * 2 * (1 - k), 0); soc.expr('smile', 1); soc.look(0, 1); qm.scale.setScalar(1.15 * (1 - ease((lt - wt) / 0.4))); }
      for (const c of crowd) idle(c, t);
      const p = ease(lt / d); camera.position.set(lerp(-0.4, 0.3, p), 3.1, lerp(10.2, 9.0, p)); camera.lookAt(0.3, 3.3, 2); camera.fov = 42;
    },
    // 5: Socrates marches toward the important men.
    (lt, d, t) => {
      show(setA); scene.background = SKIES.day; aimSun(V.set(0, 0, -4), new THREE.Vector3(-12, 22, 14), 0xfff0d0, 2.4); resetAgora();
      for (const c of crowd) { c.r.root.visible = c.x < 0 && c.z > -3; idle(c, t); }
      nobles.forEach((n, i) => { n.root.visible = true; n.rest(); n.root.position.set(-2.7 + i * 1.8, 0, -8 + Math.abs(i - 1.5) * 0.5); n.root.rotation.y = 0; n.headG.rotation.x = -0.18; n.expr('flat', -0.3); n.arms.forEach(a => { a.sh.rotation.z = a.side * 0.45; a.el.rotation.z = -a.side * 1.6; }); });
      const z = lerp(4, -4.6, ease(lt / d)); soc.root.position.set(0.2, 0, z); soc.root.rotation.y = Math.PI; soc.walk(lt * 8, 1.15); soc.expr('smile', 0.4);
      soc.body.rotation.x = 0.12;
      const p = ease(lt / d); camera.position.set(lerp(8.5, 7.5, p), 3.0, z + 1.5); camera.lookAt(0, 2.2, z - 1.0); camera.fov = 46;
    },
    // 6: questioning a pompous man who starts sweating.
    (lt, d, t) => {
      show(setA); scene.background = SKIES.day; aimSun(V.set(0, 0, -6), new THREE.Vector3(-12, 22, 14), 0xfff0d0, 2.4); resetAgora();
      for (const c of crowd) c.r.root.visible = false;
      nobles.forEach((n, i) => { n.root.visible = i !== 1; n.rest(); n.root.position.set(-3.6 + i * 2.2, 0, -9.5); n.expr(lt > d * 0.6 ? 'open' : 'flat', 0.2); });
      pompous.root.visible = true; pompous.rest(); pompous.root.position.set(1.0, 0, -6.4); pompous.root.rotation.y = -0.45;
      const nerv = ease((lt - d * 0.35) / (d * 0.4));
      pompous.headG.rotation.x = lerp(-0.3, 0.15, nerv); pompous.expr(nerv < 0.3 ? 'smile' : (nerv < 0.8 ? 'flat' : 'open'), lerp(-0.5, 1, nerv));
      pompous.arms.forEach(a => { a.sh.rotation.z = a.side * lerp(0.5, 0.15, nerv); a.el.rotation.z = -a.side * lerp(1.7, 0, nerv); });
      pompous.body.position.x = Math.sin(lt * 40) * 0.03 * nerv; pompous.look(-0.5 * nerv, 0.4 * nerv);
      drops.forEach((dr, i) => { const st = d * 0.45 + i * 0.35; const u = (lt - st) % 1.1; dr.visible = lt > st; if (!dr.visible) return; const sd = i % 2 ? 1 : -1;
        dr.position.set(1.0 + sd * (0.55 + u * 1.2) * Math.cos(0.55), 3.25 + u * 1.6 - u * u * 3.2, -6.4 + sd * u * 0.4); });
      soc.root.position.set(-1.1, 0, -5.0); soc.root.rotation.y = 1.35; soc.rest(); soc.expr('smile', 0.7); soc.look(0.4, 0.1);
      soc.arms[1].sh.rotation.set(-2.0 + Math.sin(lt * 2.5) * 0.12, 0, 0.3); soc.arms[1].el.rotation.x = -0.6;
      soc.headG.rotation.z = -0.15 + Math.sin(lt * 1.7) * 0.05;
      const p = ease(lt / d); camera.position.set(lerp(3.6, 3.0, p), 2.9, lerp(0.2, -0.6, p)); camera.lookAt(-0.05, 2.7, -5.7); camera.fov = 44;
    },
    // 7: under the olive tree at sunset, the lightbulb moment.
    (lt, d, t) => {
      show(setC); scene.background = SKIES.sunset; aimSun(setC.position, new THREE.Vector3(14, 9, -18), 0xffa060, 2.2);
      soc7.rest(); soc7.sit(); soc7.root.position.set(-0.6, 0.0, 0.2); soc7.root.rotation.y = 0.35;
      soc7.arms.forEach(a => { a.sh.rotation.set(-0.7, 0, a.side * 0.3); a.el.rotation.x = -0.9; });
      const on = lt > 0.7; const k = easeOutBack((lt - 0.7) / 0.45);
      soc7.expr(on ? 'smile' : 'flat', on ? 0.8 : 0); soc7.look(0, on ? 0.9 : 0); soc7.headG.rotation.x = on ? -0.12 : 0.1;
      bulbG.visible = on; bulbG.position.set(-0.6, 3.55 + Math.sin(lt * 2) * 0.06, 0.4); bulbG.scale.setScalar(0.9 * k);
      bulbG.userData.glow.material.opacity = on ? 0.7 + Math.sin(lt * 6) * 0.15 : 0;
      bulbLight.position.copy(bulbG.position); bulbLight.intensity = on ? 5 : 0;
      const a = lerp(-0.25, 0.3, ease(lt / d)); const R = lerp(7.2, 6.0, ease(lt / d));
      camera.position.set(setC.position.x - 0.6 + Math.sin(a) * R, 2.4, 0.2 + Math.cos(a) * R); camera.lookAt(setC.position.x - 0.6, 2.9, 0.2); camera.fov = 44;
    },
    // 8: end card — Socrates waves on the left, follow button on the right.
    (lt, d, t) => {
      show(setD); scene.background = SKIES.endcard; aimSun(setD.position, new THREE.Vector3(-8, 16, 12), 0xfff0d0, 2.2);
      socEnd.rest(); socEnd.root.position.set(0, 0, 0); socEnd.root.rotation.y = 0.3; socEnd.expr('smile', 0.6);
      socEnd.arms[1].sh.rotation.set(0, 0, 2.5); socEnd.arms[1].el.rotation.z = 0.5 + Math.sin(lt * 9) * 0.45;
      socEnd.body.position.y = Math.abs(Math.sin(lt * 4.5)) * 0.05;
      camera.position.set(setD.position.x + 1.2, 2.2, setD.position.z + 9.5); camera.lookAt(setD.position.x + 1.2, 2.4, setD.position.z); camera.fov = 44;
    },
  ];
  function mistUpdate(t, boost, gold = false) {
    for (const s of mists) { const u = s.userData; s.position.set(setB.position.x + u.x + Math.sin(t * 0.4 + u.ph) * 0.8, u.y + Math.sin(t * 0.3 + u.ph) * 0.3, u.z);
      s.scale.setScalar(u.sc * (1 + 0.15 * Math.sin(t + u.ph))); s.material.opacity = Math.min(1, 0.55 * boost); s.material.color.set(gold ? 0xffe0a0 : 0xffffff); }
  }

  return scenesFn;
}
