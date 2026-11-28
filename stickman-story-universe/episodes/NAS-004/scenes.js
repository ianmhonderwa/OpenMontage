// NAS-004 – The Dream of Nine Coins. Source: The Turkish Jester, tr. George Borrow (1884). v2 look.
import { endcard } from '../../engine/sets/endcard.js';
export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, easeOutBack, lerp, toon, radialTexture, makeStick, NASREDDIN, questionMark } = ctx;
  const E = endcard(ctx, NASREDDIN); const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const mesh = (g, m) => { const x = new THREE.Mesh(g, m); x.castShadow = x.receiveShadow = true; return x; };
  const G = new THREE.Group(); scene.add(G);
  // ---- room: plaster walls, wooden beams, rug, sleeping mat, lamp, window ----
  const floor = mesh(new THREE.PlaneGeometry(14, 10), toon(0x9a7a58)); floor.rotation.x = -Math.PI / 2; G.add(floor);
  const back = mesh(new THREE.BoxGeometry(14, 6, 0.3), toon(0xe6d3b0)); back.position.set(0, 3, -3.5); G.add(back);
  const side = mesh(new THREE.BoxGeometry(0.3, 6, 10), toon(0xdcc6a0)); side.position.set(-5, 3, 1); G.add(side);
  for (let i = -3; i <= 3; i++) { const b = mesh(new THREE.BoxGeometry(0.25, 0.25, 10), toon(0x6b4423)); b.position.set(i * 1.6, 5.4, 1); G.add(b); }
  const winF = mesh(new THREE.BoxGeometry(1.6, 1.4, 0.2), toon(0x6b4423)); winF.position.set(2.4, 3.2, -3.3); G.add(winF);
  const winG = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.1), new THREE.MeshBasicMaterial({ color: 0x1a2440 })); winG.position.set(2.4, 3.2, -3.18); G.add(winG);
  const rug = mesh(new THREE.BoxGeometry(4.2, 0.03, 2.8), toon(0x9a2a2a)); rug.position.set(-0.6, 0.02, -0.6); G.add(rug);
  const rugB = mesh(new THREE.BoxGeometry(3.6, 0.035, 2.2), toon(0xd9a441)); rugB.position.set(-0.6, 0.025, -0.6); G.add(rugB);
  const rugC = mesh(new THREE.BoxGeometry(3.2, 0.04, 1.8), toon(0x2a4a7a)); rugC.position.set(-0.6, 0.03, -0.6); G.add(rugC);
  const mat = mesh(new THREE.BoxGeometry(1.2, 0.25, 2.8), toon(0xefe6d2)); mat.position.set(-0.6, 0.15, -0.8); G.add(mat);
  const pillow = mesh(new THREE.BoxGeometry(0.9, 0.22, 0.5), toon(0x3f8a4a)); pillow.position.set(-0.6, 0.36, -1.9); G.add(pillow);
  const blanket = mesh(new THREE.BoxGeometry(1.26, 0.14, 1.6), toon(0x8a5a9a)); blanket.position.set(-0.6, 0.38, -0.2); G.add(blanket);
  const lamp = mesh(new THREE.SphereGeometry(0.16, 8, 6), toon(0xb5652e)); lamp.scale.y = 0.6; lamp.position.set(1.2, 0.12, -1.6); G.add(lamp);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), new THREE.MeshBasicMaterial({ color: 0xffc04a })); flame.position.set(1.32, 0.28, -1.6); G.add(flame);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,190,90,0.9)', 'rgba(255,160,60,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(2.4); glow.position.set(1.3, 0.4, -1.5); G.add(glow);
  const lampL = new THREE.PointLight(0xffb060, 6, 8, 2); lampL.position.set(1.3, 0.8, -1.3); G.add(lampL);
  const nas = makeStick(NASREDDIN); G.add(nas.root);
  // ---- dream bubble: a soft violet world with the stranger and the coins ----
  const D = new THREE.Group(); D.position.set(0, 0, -40); scene.add(D);
  const dfloor = mesh(new THREE.CircleGeometry(9, 32), toon(0x6a5a9a)); dfloor.rotation.x = -Math.PI / 2; D.add(dfloor);
  const clouds = [[-4, 1, -4, 2], [4, 1.5, -5, 2.4], [0, 0.6, -6, 2.8], [-6, 2.5, -7, 2]].map(([x, y, z, r]) => { const c = mesh(new THREE.IcosahedronGeometry(r, 1), toon(0xcfc4f0)); c.position.set(x, y, z); D.add(c); return c; });
  const nasD = makeStick(NASREDDIN); D.add(nasD.root);
  const stranger = makeStick({ robe: 0x2a4a7a, inner: 0xe0d4b8, turban: 0x1b1b2a, beard: 0x1b1410, skin: 0x8d5f3e, seed: 61 }); D.add(stranger.root);
  const coinM = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, emissive: 0x6a6e78, metalness: 0.2, roughness: 0.35, flatShading: true });
  const coins = Array.from({ length: 11 }, () => { const c = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 12), coinM); c.rotation.x = Math.PI / 2; D.add(c); return c; });
  const numSprite = (txt) => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256; const g = cv.getContext('2d'); g.font = 'bold 170px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 16; g.strokeStyle = '#1b1410'; g.strokeText(txt, 128, 136); g.fillStyle = '#ffd23f'; g.fillText(txt, 128, 136);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); s.scale.setScalar(1.0); D.add(s); return s; };
  const nums = { 9: numSprite('9'), 10: numSprite('10'), 11: numSprite('11') };
  const qm = questionMark(); G.add(qm);
  const rooster = new THREE.Group(); G.add(rooster);
  { const b = mesh(new THREE.IcosahedronGeometry(0.18, 1), toon(0xc8553d)); b.scale.set(1.3, 1, 0.9); rooster.add(b); const h = mesh(new THREE.IcosahedronGeometry(0.1, 0), toon(0xc8553d)); h.position.set(0.2, 0.18, 0); rooster.add(h);
    const comb = mesh(new THREE.ConeGeometry(0.05, 0.12, 4), toon(0xe02020)); comb.position.set(0.2, 0.3, 0); rooster.add(comb); const bk = mesh(new THREE.ConeGeometry(0.03, 0.08, 4), toon(0xe0b84a)); bk.rotation.z = -Math.PI / 2; bk.position.set(0.32, 0.17, 0); rooster.add(bk);
    const tl = mesh(new THREE.ConeGeometry(0.12, 0.3, 4), toon(0x2a5a3a)); tl.rotation.z = 0.8; tl.position.set(-0.24, 0.12, 0); rooster.add(tl); }
  rooster.position.set(2.4, 2.65, -3.15); rooster.scale.setScalar(1.3);

  const lie = r => { r.rest(); r.root.rotation.set(-Math.PI / 2, 0, 0); r.root.position.set(-0.6, 0.45, -1.95 + 0.0); };
  function room(night = true) { G.visible = true; D.visible = false; E.group.visible = false; scene.background = night ? SKIES.night : SKIES.day; scene.fog = null;
    aimSun(V3(0, 0, -1), V3(6, 10, 8), night ? 0x6a7ab8 : 0xffe8c0, night ? 0.5 : 2.2); hemi.intensity = night ? 0.35 : 1.1; lampL.intensity = night ? 6 : 1.5; winG.material.color.set(night ? 0x1a2440 : 0x9fd3ef);
    nas.root.visible = true; nas.expr('smile', 0.2); nas.look(0, 0); qm.visible = false; rooster.visible = false; flame.scale.y = 1 + Math.sin(performance.now() * 0.01) * 0.1; }
  function dream(t) { G.visible = false; D.visible = true; E.group.visible = false; scene.background = SKIES.sunset; aimSun(D.position, V3(-6, 12, 10), 0xf0d8ff, 2.0); hemi.intensity = 1.1;
    nasD.rest(); stranger.rest(); nasD.root.position.set(-1.0, 0, 0); nasD.root.rotation.y = 0.9; stranger.root.position.set(1.0, 0, 0); stranger.root.rotation.y = -0.9;
    Object.values(nums).forEach(n => n.visible = false); coins.forEach(c => c.visible = false); clouds.forEach((c, i) => c.position.y += Math.sin(t + i) * 0.002); }
  const showCoins = (n, t, spread = 1) => coins.forEach((c, i) => { c.visible = i < n; const a = (i / Math.max(n, 1)) * Math.PI * 2 + t * 0.8; c.position.set(Math.cos(a) * 0.6 * spread, 2.1 + Math.sin(a * 2) * 0.1, 0.6 + Math.sin(a) * 0.2); c.rotation.z = t * 3 + i; });
  const dcam = (x, y, z, lx, ly, lz, fov = 42) => { camera.position.set(D.position.x + x, y, D.position.z + z); camera.lookAt(D.position.x + lx, ly, D.position.z + lz); camera.fov = fov; };
  const cam = (x, y, z, lx, ly, lz, fov = 44) => { camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.fov = fov; };
  const talk = (r, t, k = 1) => { r.expr(Math.sin(t * 11) > 0 ? 'open' : 'smile', 0.4); r.arms[1].sh.rotation.set(-0.5, 0, (1.0 + Math.sin(t * 4) * 0.3) * k); };

  return [
    // 1 – asleep by lamplight, then the dream: a stranger offers nine coins
    (lt, d, t) => { const u = lt / d; if (u < 0.4) { room(); lie(nas); nas.expr('smile', 0); nas.eyes.forEach(e => e.e.scale.y = 0.1); cam(1.6, 2.2, 2.6, -0.6, 0.4, -1.2, 44); }
      else { dream(t); nasD.expr('open', 0.8); stranger.expr('smile', 0.4); stranger.arms[1].sh.rotation.set(-1.2, 0, -0.2); showCoins(9, t); dcam(0, 2.4, 6.8, 0, 1.9, 0, 46); } },
    // 2 – "Nine? Make it ten!"
    (lt, d, t) => { dream(t); talk(nasD, t); nasD.arms[1].sh.rotation.set(-0.3, 0, 2.6); stranger.expr('flat', 0.2); stranger.arms[1].sh.rotation.set(-1.2, 0, -0.2); showCoins(9, t);
      const n = lt / d < 0.4 ? 9 : 10; nums[n].visible = true; nums[n].position.set(-1.0, 3.6, 0); nums[n].scale.setScalar(1.0 + 0.08 * Math.sin(t * 6));
      dcam(0.3, 2.5, 6.4, 0, 2.2, 0, 46); },
    // 3 – "Why not eleven!" – arms folded, a heated argument
    (lt, d, t) => { dream(t); const u = lt / d; nasD.expr(u < 0.4 ? 'open' : 'frown', -0.6); stranger.expr('frown', -0.8);
      if (u < 0.4) { talk(nasD, t); nasD.arms[1].sh.rotation.set(-0.3, 0, 2.6); nums[11].visible = true; nums[11].position.set(-1.0, 3.6, 0); }
      else { nasD.arms.forEach(a => { a.sh.rotation.set(-1.1, 0, a.side * 0.35); a.el.rotation.set(-1.7, 0, 0); }); talk(stranger, t); stranger.arms[1].sh.rotation.set(-0.3, 0, -1.4 - Math.sin(t * 8) * 0.3); nasD.body.rotation.z = Math.sin(t * 9) * 0.03; }
      showCoins(9, t); dcam(0, 2.5, 6.8, 0, 2.0, 0, 46); },
    // 4 – the rooster crows; dawn; he wakes and stares at his empty hand
    (lt, d, t) => { room(false); const u = lt / d; rooster.visible = true; rooster.rotation.z = u < 0.35 ? Math.sin(t * 12) * 0.15 : 0;
      if (u < 0.35) { lie(nas); nas.eyes.forEach(e => e.e.scale.y = 0.1); cam(1.2, 2.6, 3.0, 1.0, 1.8, -2.6, 46); }
      else { nas.rest(); nas.sit(); nas.root.rotation.set(0, 0.3, 0); nas.root.position.set(-0.6, -0.15, -1.5); nas.arms[1].sh.rotation.set(-1.3, 0, 0.2); nas.arms[1].el.rotation.set(-0.6, 0, 0); nas.headG.rotation.x = 0.35; nas.expr('open', 1.0);
        qm.visible = u > 0.6; qm.position.set(0.1, 2.8, -1.0); qm.scale.setScalar(0.7); cam(1.0, 2.2, 3.8, -0.5, 1.2, -1.2, 46); } },
    // 5 – eyes squeezed shut, hand out: "Fine, fine! I'll take the nine!"
    (lt, d, t) => { room(false); nas.rest(); nas.sit(); nas.root.rotation.set(0, 0.25, 0); nas.root.position.set(-0.6, -0.15, -1.5);
      nas.eyes.forEach(e => e.e.scale.y = 0.12); nas.expr(Math.sin(t * 10) > 0 ? 'open' : 'smile', 0.9); nas.arms[1].sh.rotation.set(-1.45, 0, 0.1); nas.arms[1].el.rotation.set(0, 0, 0); nas.arms[0].sh.rotation.set(-0.3, 0, -0.5);
      cam(1.0, 2.1, 3.5, -0.5, 1.2, -1.2, 44); },
    // 6 – he waits… and waits… nothing
    (lt, d, t) => { room(false); const u = lt / d; nas.rest(); nas.sit(); nas.root.rotation.set(0, 0.25, 0); nas.root.position.set(-0.6, -0.15, -1.5); nas.arms[1].sh.rotation.set(-1.45 + u * 0.3, 0, 0.1);
      nas.eyes.forEach(e => e.e.scale.y = u < 0.6 ? 0.12 : 1); nas.expr(u < 0.6 ? 'flat' : 'frown', 0.5); nas.headG.rotation.z = u > 0.6 ? 0.15 : 0;
      cam(lerp(1.0, 1.6, ease(u)), 2.2, lerp(3.5, 4.4, ease(u)), -0.5, 1.2, -1.2, 46); },
    // 7 – moral: Nasreddin smiles, ruefully, with a cup of tea at the window
    (lt, d, t) => { room(false); nas.rest(); nas.root.rotation.set(0, -0.2, 0); nas.root.position.set(1.4, 0, -1.6); nas.expr('smile', 0.6); nas.arms[1].sh.rotation.set(-0.3, 0, 2.4); nas.arms[1].el.rotation.set(-1.3, 0, 0.7 + Math.sin(t * 5) * 0.15);
      cam(0.0, 2.3, 4.6, 1.0, 1.9, -1.8, 48); },
    (lt, d, t) => { G.visible = false; D.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
