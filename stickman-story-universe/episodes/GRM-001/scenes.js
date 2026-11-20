// GRM-001 – The Frog-King, or Iron Henry. Source: Grimm, Household Tales, tr. Margaret Hunt (1884), tale 1.
// The princess's flung "kiss" is never shown: the throw is only a wind-up; the transformation is a flash.
import { forest } from '../../engine/sets/forest.js';
import { castle } from '../../engine/sets/castle.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, rng, clamp, ease, easeOutBack, lerp, toon, BLACK, outlined, radialTexture,
    makeStick, makeFrog, makeAnimal, STORYTELLER } = ctx;
  const F = forest(ctx), C = castle(ctx), E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const glowTex = radialTexture('rgba(255,244,190,1)', 'rgba(255,214,90,0)');
  const sprite = (tex = glowTex) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const cam = (o, px, py, pz, lx, ly, lz, fov = 46) => { camera.position.set(o.x + px, py, o.z + pz); camera.lookAt(o.x + lx, ly, o.z + lz); camera.fov = fov; };

  // ---- characters (fixed descriptions from the Guide / batch notes) ----
  const mk = (o, parent) => { const r = makeStick(o); parent.add(r.root); return r; };
  const princessO = { robe: 0xf4b6c8, robeLong: true, hair: 0xf0c34a, longHair: true, crown: 0xe0b84a, crownSize: 0.75, seed: 101 };
  const prF = mk(princessO, F.group), prC = mk(princessO, C.group);
  const king = mk({ robe: 0xb03030, trim: 0xffffff, robeLong: true, robeWide: 0.62, beard: 0xf2f2f2, bigBeard: true, crown: 0xe0b84a, seed: 102 }, C.group);
  const princeO = { robe: 0x3a5aa8, hair: 0x7a4a2a, crown: 0xe0b84a, crownSize: 0.7, seed: 103 };
  const prince = mk(princeO, C.group);
  const frogF = makeFrog(), frogC = makeFrog(); F.group.add(frogF.root); C.group.add(frogC.root);
  const ballMat = toon(0xf2c230); const ball = outlined(new THREE.SphereGeometry(0.28, 20, 14), ballMat, 1.1); F.group.add(ball);
  const ripples = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 28), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true })); r.rotation.x = Math.PI / 2; F.group.add(r); return r; });
  const splash = Array.from({ length: 8 }, () => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcfe8ff })); F.group.add(s); return s; });
  const flash = sprite(); C.group.add(flash);
  const plate = outlined(new THREE.CylinderGeometry(0.5, 0.42, 0.07, 18), toon(0xe0b84a), 1.06); C.group.add(plate);
  const shadowFrog = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color: 0x1a1a2a })); shadowFrog.scale.set(1.2, 0.3, 0.8); shadowFrog.position.set(4.2, 0.08, -8.15); C.group.add(shadowFrog);

  // ---- courtyard set + carriage (scene 7) ----
  const Y = new THREE.Group(); Y.position.set(900, 0, 0); scene.add(Y);
  const yg = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), toon(0xcdbd9a)); yg.rotation.x = -Math.PI / 2; yg.receiveShadow = true; Y.add(yg);
  const ywall = outlined(new THREE.BoxGeometry(60, 9, 1), toon(0xe0d2b4), 1.01); ywall.position.set(0, 4.5, -9); Y.add(ywall);
  for (let i = -6; i <= 6; i++) { const m = outlined(new THREE.BoxGeometry(1.2, 1, 1.2), toon(0xe0d2b4), 1.03); m.position.set(i * 4.6, 9.4, -9); Y.add(m); }
  const gate = outlined(new THREE.BoxGeometry(4.4, 6, 0.3), toon(0x5a3a22), 1.02); gate.position.set(0, 3, -8.4); Y.add(gate);
  [[-14, 11], [14, 13]].forEach(([x, h], i) => { const tw = outlined(new THREE.CylinderGeometry(2.2, 2.4, h, 16), toon(0xe9dcc3), 1.02); tw.position.set(x, h / 2, -12); Y.add(tw); const cn = outlined(new THREE.ConeGeometry(2.7, 4, 16), toon(i ? 0x3a5aa8 : 0xa83240), 1.03); cn.position.set(x, h + 2, -12); Y.add(cn); });
  const car = new THREE.Group(); Y.add(car);
  { const fl = outlined(new THREE.BoxGeometry(3.4, 0.3, 1.9), toon(0xe0b84a), 1.04); fl.position.y = 1.0; car.add(fl);
    for (const z of [-0.95, 0.95]) { const sp = outlined(new THREE.BoxGeometry(3.4, 0.9, 0.12), toon(0xe0b84a), 1.04); sp.position.set(0, 1.5, z); car.add(sp); }
    const bk = outlined(new THREE.BoxGeometry(0.15, 1.1, 1.9), toon(0xc9962a), 1.04); bk.position.set(-1.7, 1.6, 0); car.add(bk);
    const seat = outlined(new THREE.BoxGeometry(0.7, 0.7, 1.7), toon(0xa83240), 1.04); seat.position.set(2.2, 1.35, 0); car.add(seat);
    const board = outlined(new THREE.BoxGeometry(0.9, 0.5, 1.7), toon(0xc9962a), 1.04); board.position.set(1.75, 0.95, 0); car.add(board); }
  const wheels = []; for (const [x, z] of [[-1.0, 1.0], [-1.0, -1.0], [1.4, 1.0], [1.4, -1.0]]) { const w = new THREE.Group(); w.position.set(x, 0.75, z * 1.05); const rim = outlined(new THREE.TorusGeometry(0.72, 0.09, 8, 24), toon(0x6b4423), 1.06); w.add(rim);
    for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.4, 0.07), toon(0x6b4423)); sp.rotation.z = k / 6 * Math.PI; w.add(sp); } car.add(w); wheels.push(w); }
  const horses = []; for (let i = 0; i < 4; i++) { const h = makeAnimal('horse'); h.root.scale.setScalar(1.15); car.add(h.root); horses.push(h); }
  const henry = makeStick({ robe: 0xb03030, robeWide: 0.6, beard: 0x9a9a9a, hair: 0x4a3a2a, seed: 104 }); car.add(henry.root);
  const bands = [0, 1, 2].map(i => { const b = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 20), toon(0x4a4f57)); b.rotation.x = Math.PI / 2; henry.body.add(b); return b; });
  const princeY = makeStick(princeO), princessY = makeStick(princessO); car.add(princeY.root); car.add(princessY.root);
  const sparks = Array.from({ length: 12 }, () => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xfff3a0 })); s.scale.z = 0.3; car.add(s); return s; });

  function showOnly(...on) { for (const g of [F.group, C.group, Y, E.group]) g.visible = on.includes(g); }
  const faceTo = (r, x, z) => { r.root.rotation.y = Math.atan2(x - r.root.position.x, z - r.root.position.z); };
  function reset(r) { r.rest(); r.root.visible = true; r.root.rotation.set(0, 0, 0); r.expr('smile', 0.3); r.look(0, 0); r.headG.rotation.set(0, 0, 0); }
  const wellTop = V3(F.wellPos.x, 1.0, F.wellPos.z);
  function forestBase(t, on) { showOnly(F.group); scene.background = SKIES.forest; aimSun(V3(F.origin.x, 0, F.origin.z), V3(-10, 20, 12), 0xfff0c8, 2.2); hemi.intensity = 1.35;
    reset(prF); frogF.root.visible = false; ball.visible = false; ripples.forEach(r => r.visible = false); splash.forEach(s => s.visible = false); frogF.open.visible = false; }
  function hallBase(t) { showOnly(C.group); scene.background = SKIES.forest; aimSun(V3(0, 0, -700), V3(-6, 14, 10), 0xffe2b0, 1.3); hemi.intensity = 0.95; flash.visible = false; plate.visible = false; shadowFrog.visible = false; prince.root.visible = false;
    reset(prC); reset(king); frogC.root.visible = false; frogC.open.visible = false; frogC.root.scale.setScalar(1); frogC.root.rotation.set(0, 0, 0); }

  return [
    // 1 – the golden ball falls into the well
    (lt, d, t) => {
      forestBase(t); prF.root.position.set(-1.5, 0, 1.4); faceTo(prF, 0, -1); const u = lt / d;
      const hand = V3(-1.35, 2.15, 0.9), rimP = V3(0.1, 1.9, -0.6), splashT = 0.62;
      ball.visible = true;
      if (u < 0.35) { ball.position.set(hand.x, hand.y + Math.abs(Math.sin(u * 22)) * 0.5, hand.z); prF.arms[0].sh.rotation.set(-1.3, 0, -0.5); prF.expr('smile', 0.6); }
      else if (u < splashT) { const k = (u - 0.35) / (splashT - 0.35); ball.position.set(lerp(hand.x, 0.1, k), lerp(hand.y, 0.4, k * k) + Math.sin(Math.PI * Math.min(1, k * 1.4)) * 1.6, lerp(hand.z, -1, k)); prF.arms[0].sh.rotation.set(-1.9, 0, -0.3); prF.expr('open', 0.7); }
      else { ball.visible = false; prF.arms.forEach(a => { a.sh.rotation.set(-1.7, 0, a.side * 0.4); a.el.rotation.x = -0.4; }); prF.expr('open', 1); prF.headG.rotation.x = 0.2; const sp = (u - splashT) / (1 - splashT);
        ripples.forEach((r, i) => { const v = clamp(sp * 2.2 - i * 0.35); r.visible = v > 0 && v < 1; r.position.set(F.wellPos.x, 0.5, F.wellPos.z); r.scale.setScalar(0.5 + v * 2.6); r.material.opacity = 1 - v; });
        splash.forEach((s, i) => { const v = clamp(sp * 2.5); s.visible = v > 0 && v < 1; const a = i / 8 * Math.PI * 2; s.position.set(F.wellPos.x + Math.cos(a) * v * 0.7, 0.5 + Math.sin(v * Math.PI) * 0.9, F.wellPos.z + Math.sin(a) * v * 0.7); }); }
      cam(F.origin, lerp(2.4, 1.6, ease(u)), 3.3, 8.2, -0.9, 1.8, -0.4, 48);
    },
    // 2 – a frog pops up and lists his very long terms and conditions
    (lt, d, t) => {
      forestBase(t); prF.root.position.set(-1.9, 0, 1.0); faceTo(prF, 0.6, -1); prF.body.rotation.x = -0.18; prF.expr('frown', 0.7); prF.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * 0.5));
      const rise = easeOutBack(clamp((lt - 0.15) / 0.5)); frogF.root.visible = true; frogF.root.position.set(0.5, lerp(0.2, 1.02, rise), -1.7); frogF.root.rotation.y = 0.5; frogF.root.scale.setScalar(1.15);
      frogF.open.visible = Math.sin(t * 14) > -0.2 && lt > 0.7; frogF.head.rotation.z = Math.sin(t * 3) * 0.1;
      frogF.arms[1].sh.rotation.set(-1.6, 0, 0.7 + Math.sin(t * 8) * 0.18); frogF.arms[0].sh.rotation.set(-0.5, 0, -0.5 + Math.sin(t * 5) * 0.2);
      cam(F.origin, lerp(0.2, 0.8, ease(lt / d)), 2.7, 7.6, -0.4, 1.7, -0.6, 48);
    },
    // 3 – the frog fetches the ball; she snatches it and runs off
    (lt, d, t) => {
      forestBase(t); const u = lt / d; const snatch = 0.38;
      frogF.root.visible = true; frogF.root.position.set(0.6, 1.02, -1.7); frogF.root.rotation.y = 0.5; frogF.root.scale.setScalar(1.15); frogF.open.visible = u < 0.3 && Math.sin(t * 12) > 0; frogF.arms.forEach(a => a.sh.rotation.set(0, 0, a.side * 2.7));
      ball.visible = true; if (u < snatch) { ball.position.set(0.6, 3.0, -1.5); prF.root.position.set(-1.5, 0, -0.6); faceTo(prF, 0.6, -1.5); prF.arms[1].sh.rotation.set(-2.6, 0, 0.3); prF.expr('open', 0.8); }
      else { const k = ease((u - snatch) / (1 - snatch)); const px = lerp(-1.5, 3.4, Math.min(1, k * 1.15)), pz = lerp(-0.6, -16, k); prF.root.position.set(px, 0, pz); prF.root.rotation.y = Math.PI; prF.walk(t * 11, 1); prF.arms[0].sh.rotation.set(-0.8, 0, -0.3); ball.position.set(px - 0.15, 2.0, pz); frogF.arms[0].sh.rotation.set(-0.6, 0, -1.9 + Math.sin(t * 5) * 0.1); }
      cam(F.origin, lerp(-3.2, -1.8, ease(u)), 2.6, lerp(7.0, 6.0, ease(u)), 1.2, 1.6, lerp(-1.5, -8, ease(u)), 46);
    },
    // 4 – knock, knock: the frog is at the dining-hall door; the King insists
    (lt, d, t) => {
      hallBase(t); prC.root.position.set(0.1, 0, -3.8); prC.root.rotation.y = 0.15; prC.expr('flat', 0.4); prC.arms[1].sh.rotation.set(-0.9, 0, 0.3); prC.arms[1].el.rotation.x = -1.7;
      king.root.position.set(2.5, 0, -3.8); king.root.rotation.y = -0.25; const pt = ease((lt - 3.0) / 0.5); king.arms[0].sh.rotation.set(-1.45 * pt, 0, -0.9 * pt - 0.1 * (1 - pt)); king.arms[0].el.rotation.x = -0.1; king.expr(lt > 3.0 ? 'frown' : 'flat', 0.8);
      shadowFrog.visible = true; const kn = Math.sin(t * 16) > 0.6 && lt < 3.0; shadowFrog.position.y = 0.08 + (kn ? 0.05 : 0); plate.visible = true; plate.position.set(-0.4, 1.74, -2.7);
      if (lt < 3.0) { king.arms[1].sh.rotation.set(0, 0, 0.3); }
      cam(C.origin, 2.0, 3.4, 8.6, 2.2, 2.1, -5, 46);
    },
    // 5 – the frog eats from the golden plate; the princess winds up her arm (the throw itself is never shown)
    (lt, d, t) => {
      hallBase(t); plate.visible = true; plate.position.set(0.3, 1.74, -2.2); frogC.root.visible = true; frogC.root.position.set(0.3, 1.7, -2.2); frogC.root.scale.setScalar(0.85); frogC.open.visible = Math.sin(t * 9) > -0.2;
      frogC.head.rotation.x = 0.25 + Math.sin(t * 9) * 0.1; frogC.arms.forEach(a => a.sh.rotation.set(-1.0 + Math.sin(t * 9 + a.side) * 0.2, 0, a.side * 0.2));
      prC.root.position.set(-1.3, 0, -3.8); faceTo(prC, 0.3, -2.2); prC.expr('frown', 1); const w = ease((lt - d * 0.5) / (d * 0.4)); prC.arms[1].sh.rotation.set(lerp(-0.3, 0.4, w), 0, lerp(0.4, 2.7, w)); prC.arms[1].el.rotation.z = lerp(0.2, 1.6, w); prC.body.rotation.x = -0.12 * w; prC.body.position.x = Math.sin(t * 30) * 0.02 * w;
      king.root.position.set(2.1, 0, -3.8); faceTo(king, 0.3, -2.2); king.expr('flat', 0.6);
      cam(C.origin, 0.4, 3.5, 8.6, 0.4, 2.2, -2.8, 48);
    },
    // 6 – flash! the frog becomes a handsome prince (freed from a witch's spell)
    (lt, d, t) => {
      hallBase(t); const spot = V3(-6.0, 0.85, -2.6); const fl = clamp((lt - 0.9) / 1.4);
      prC.root.position.set(-3.6, 0, -2.0); faceTo(prC, spot.x, spot.z); prC.expr('open', 1); prC.arms.forEach(a => { a.sh.rotation.set(-2.5, 0, a.side * 0.55); a.el.rotation.x = -1.6; });
      if (lt < 0.9) { frogC.root.visible = true; frogC.root.position.copy(spot); frogC.root.rotation.y = 0.9; frogC.root.scale.setScalar(1.0 + 0.06 * Math.sin(t * 12)); }
      else { frogC.root.visible = false; }
      flash.visible = lt > 0.8 && lt < 2.6; flash.position.set(spot.x, 2.2, spot.z + 0.4); const fk = ease(clamp((lt - 0.8) / 0.4)) * (1 - ease(clamp((lt - 1.2) / 1.2))); flash.scale.setScalar(2 + fk * 9); flash.material.opacity = 1 - ease(clamp((lt - 1.1) / 1.2)) * 0.97;
      prince.root.visible = lt > 1.0; prince.rest(); prince.root.position.set(spot.x, 0.85 - 0.85 * 0, spot.z); prince.root.position.y = 0.0; prince.root.rotation.y = 0.9; prince.root.scale.setScalar(Math.max(0.001, easeOutBack(clamp((lt - 1.0) / 0.45)))); prince.expr('smile', 1);
      prince.arms[1].sh.rotation.set(-0.2, 0, 0.5 + Math.sin(t * 4) * 0.1);
      cam(C.origin, lerp(-1.6, -2.4, ease(lt / d)), 3.2, 5.8, -5.0, 2.3, -3.4, 46);
    },
    // 7 – the carriage: Faithful Henry's iron bands snap with joy
    (lt, d, t) => {
      showOnly(Y); scene.background = SKIES.day; aimSun(V3(900, 0, 0), V3(-10, 18, 12), 0xfff0d0, 2.3); hemi.intensity = 1.5; flash.visible = false; const u = lt / d;
      car.position.set(lerp(-3.2, 1.8, ease(u)), 0, 0); wheels.forEach(w => { w.rotation.z = -t * 3.2; });
      horses.forEach((h, i) => { h.root.position.set(4.2 + Math.floor(i / 2) * 2.0, 0, (i % 2 ? 0.7 : -0.7)); h.root.rotation.y = 0; h.walk(t * 9 + i, 0.8); });
      henry.rest(); henry.root.position.set(2.2, 1.15, 0); henry.rest(); henry.sit(); henry.root.position.set(2.2, 1.7, 0); henry.expr('open', 0.9); henry.arms.forEach(a => a.sh.rotation.set(-0.5, 0, a.side * 0.35)); henry.body.position.y += 0;
      const pop = clamp((lt - 1.0) / 0.9);
      bands.forEach((b, i) => { const y = 1.55 + i * 0.16; b.position.set(0, y, 0); b.visible = pop < 0.02; if (pop > 0) { b.visible = pop < 1; b.position.set(0, y + pop * 2.2, pop * (i - 1) * 2.2); b.scale.setScalar(1 + pop * 1.5); b.rotation.z = pop * 6; } });
      sparks.forEach((s, i) => { const v = clamp((lt - 1.0) / 0.9); s.visible = v > 0.02 && v < 1; const a = i / 12 * Math.PI * 2; s.position.set(2.2 + Math.cos(a) * v * 1.6, 2.8 + Math.sin(a) * v * 1.4, Math.sin(a * 2) * v); s.scale.setScalar(0.8 + v); s.rotation.z = v * 4; });
      princeY.rest(); princeY.sit(); princeY.root.position.set(-0.6, 1.5, 0.15); princeY.arms[1].sh.rotation.set(0, 0, 2.5 + Math.sin(t * 6) * 0.3); princeY.expr('smile', 1);
      princessY.rest(); princessY.sit(); princessY.root.position.set(0.5, 1.5, 0.15); princessY.arms[0].sh.rotation.set(0, 0, -2.5 - Math.sin(t * 6 + 1) * 0.3); princessY.expr('smile', 1);
      cam(V3(900, 0, 0), lerp(-1.0, 1.6, ease(u)), 3.6, 14.0, lerp(1.4, 3.0, ease(u)), 1.9, 0, 50);
    },
    // 8 – end card
    (lt, d, t) => { showOnly(E.group); E.update(lt); },
  ];
}
