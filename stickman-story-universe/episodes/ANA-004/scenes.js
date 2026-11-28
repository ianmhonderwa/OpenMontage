// ANA-004 – Thunder and Anansi. Source: Barker & Sinclair, West African Folk-Tales (1917), tale IV.
// The stick's beating is comic: Anansi bounces and flees, no injury shown.
import { westafrica } from '../../engine/sets/westafrica.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, lerp, toon, outlined, makeStick, makeSpider, STORYTELLER } = ctx;
  const Wf = westafrica(ctx); const W = Wf.group; const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z); const O = Wf.origin; const GY = -0.18;
  const cam = (px, py, pz, lx, ly, lz, fov = 50) => { camera.position.set(O.x + px, py, O.z + pz); camera.lookAt(O.x + lx, ly, O.z + lz); camera.fov = fov; };

  // ---- sea set (own group, placed at the village origin; the village is hidden while it shows)
  const SEA = new THREE.Group(); SEA.position.copy(O); scene.add(SEA);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), toon(0x2f7fb0)); water.rotation.x = -Math.PI / 2; water.position.y = 0.0; SEA.add(water);
  const islet = outlined(new THREE.CylinderGeometry(1.4, 1.8, 0.6, 16), toon(0xd9c49a), 1.03); islet.position.set(2.6, 0.1, -3); SEA.add(islet);
  const palm = new THREE.Group(); palm.position.set(2.6, 0.3, -3); SEA.add(palm);
  { for (let i = 0; i < 6; i++) { const s = outlined(new THREE.CylinderGeometry(0.2, 0.24, 1.0, 8), toon(0x8a6a44), 1.04); s.position.set(-i * 0.12, 0.5 + i * 0.95, 0); s.rotation.z = 0.12; palm.add(s); }
    for (let i = 0; i < 6; i++) { const l = outlined(new THREE.ConeGeometry(0.35, 2.6, 6), toon(0x3f8a3a), 1.04); l.position.set(-0.7, 6.1, 0); l.rotation.set(Math.cos(i) * 0.6, i * 1.05, 1.6); l.translateY(1.0); palm.add(l); } }
  const nuts = Array.from({ length: 3 }, () => { const n = outlined(new THREE.SphereGeometry(0.22, 10, 8), toon(0x6b4a2a), 1.06); SEA.add(n); return n; });
  const splashes = nuts.map(() => { const s = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 6, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); s.rotation.x = Math.PI / 2; SEA.add(s); return s; });
  const boat = new THREE.Group(); SEA.add(boat);
  { const hull = outlined(new THREE.BoxGeometry(2.4, 0.45, 1.0), toon(0x8a5a36), 1.03); hull.position.y = 0.22; boat.add(hull);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), toon(0x222222)); hole.position.set(0.6, 0.25, 0.51); boat.add(hole);
    const oar = outlined(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6), toon(0xc9a466), 1.06); oar.position.set(-0.4, 0.8, 0.6); oar.rotation.x = 1.0; boat.add(oar); boat.userData.oar = oar; }

  // ---- under the sea: Thunder's cottage
  const DEEP = new THREE.Group(); DEEP.position.copy(O); scene.add(DEEP);
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), toon(0xd8c79a)); bed.rotation.x = -Math.PI / 2; DEEP.add(bed);
  const cottage = new THREE.Group(); cottage.position.set(2.4, 0, -3.5); DEEP.add(cottage);
  { const w = outlined(new THREE.CylinderGeometry(1.6, 1.6, 2.0, 16), toon(0x9ab0c0), 1.03); w.position.y = 1.0; cottage.add(w);
    const r = outlined(new THREE.ConeGeometry(2.1, 1.6, 16), toon(0x5f7080), 1.04); r.position.y = 2.8; cottage.add(r);
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 0.1), toon(0x3a4a5a)); d.position.set(0, 0.65, 1.58); cottage.add(d); }
  const weeds = Array.from({ length: 8 }, (_, i) => { const c = outlined(new THREE.ConeGeometry(0.18, 1.6 + (i % 3) * 0.5, 6), toon(0x3d8a5a), 1.05); c.position.set(-6 + i * 1.6, 0.8, -6 - (i % 2) * 2); DEEP.add(c); return c; });
  const bubbles = Array.from({ length: 10 }, () => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); DEEP.add(b); return b; });
  const thunder = makeStick({ robe: 0x6b7280, robeLong: true, trim: 0xe0b84a, beard: 0xf4f4f4, bigBeard: true, hair: 0xf4f4f4, seed: 410 }); DEEP.add(thunder.root);

  // ---- props shared across sets
  const pot = new THREE.Group();
  { const b = outlined(new THREE.SphereGeometry(0.45, 16, 12), toon(0x3a3a3a), 1.05); b.scale.y = 0.85; pot.add(b);
    const rim = outlined(new THREE.TorusGeometry(0.34, 0.06, 8, 20), toon(0x2a2a2a), 1.05); rim.rotation.x = Math.PI / 2; rim.position.y = 0.36; pot.add(rim); }
  const food = [0xf4e1a6, 0xe0a030, 0xc8553d, 0x4f8a4b].map((c, i) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon(c)); f.position.set(Math.cos(i * 1.6) * 0.18, 0.5, Math.sin(i * 1.6) * 0.18); pot.add(f); return f; });
  const stick = outlined(new THREE.CylinderGeometry(0.07, 0.09, 1.6, 8), toon(0x6b4a2a), 1.06);
  const stars = Array.from({ length: 5 }, () => { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xffe066 })); return s; });

  const anansi = makeSpider();
  const wife = makeSpider(); const wrap = outlined(new THREE.TorusGeometry(0.32, 0.1, 8, 16), toon(0xe07a1f), 1.05); wrap.rotation.x = Math.PI / 2; wrap.position.y = 1.62; wife.root.add(wrap);
  const kweku = makeSpider(); kweku.root.scale.setScalar(0.6);
  const fly = new THREE.Group(); { const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon(0x222222)); fly.add(b); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); w.position.set(s * 0.12, 0.08, 0); w.rotation.y = s * 0.6; fly.add(w); } }
  const villagers = [0xe0a030, 0x2a9d8f, 0xc8553d, 0x3d7ea6].map((c, i) => makeStick({ robe: c, robeLong: i % 2 === 0, hair: 0x1a1a1a, curls: true, seed: 420 + i }));
  const hideout = outlined(new THREE.BoxGeometry(1.6, 1.4, 1.4), toon(0x9a7a5a), 1.03);

  const movable = [anansi.root, wife.root, kweku.root, fly, pot, stick, hideout, ...villagers.map(v => v.root), ...stars];
  function put(parent, ...objs) { objs.forEach(o => { if (o.parent !== parent) parent.add(o); o.visible = true; }); }
  function reset() {
    E.group.visible = false; W.visible = SEA.visible = DEEP.visible = false; scene.background = SKIES.day; aimSun(O, V3(-10, 20, 14), 0xfff0d0, 2.4); hemi.intensity = 1.5;
    movable.forEach(o => { o.visible = false; o.rotation.set(0, 0, 0); });
    for (const s of [anansi, wife, kweku]) { s.root.scale.setScalar(s === kweku ? 0.6 : 1); s.walk(0, 0); s.grin.visible = true; s.open.visible = false; }
    villagers.forEach(v => { v.rest(); v.expr('smile', 0.4); }); thunder.rest(); thunder.expr('smile', 0.6);
    nuts.forEach(n => n.visible = false); splashes.forEach(s => s.visible = false); bubbles.forEach(b => b.visible = false); food.forEach(f => f.visible = true);
  }
  const say = (sp, t) => { sp.open.visible = Math.sin(t * 12) > 0; sp.grin.visible = !sp.open.visible; };
  const bubble = (t) => bubbles.forEach((b, i) => { b.visible = true; const v = (t * 0.25 + i / 10) % 1; b.position.set(-5 + i * 1.1, v * 7, -2 - (i % 3)); });

  return [
    // 1 – famine; Anansi rows a leaky boat to a palm tree in the sea
    (lt, d, t) => { reset(); SEA.visible = true; const u = lt / d;
      boat.position.set(lerp(-2.0, 0.6, ease(u)), Math.sin(t * 2) * 0.05, -1.0); boat.rotation.z = Math.sin(t * 2) * 0.04; boat.userData.oar.rotation.z = Math.sin(t * 5) * 0.6;
      put(SEA, anansi.root); anansi.root.position.set(boat.position.x - 0.3, 0.45, -1.0); anansi.root.rotation.y = Math.PI / 2;
      cam(0.0, 2.6, 11.5, 0.4, 0.9, -2.0, 56); },
    // 2 – nuts fall: plop, plop, plop; he dives after them
    (lt, d, t) => { reset(); SEA.visible = true; const u = lt / d; boat.position.set(1.0, 0, -1.6); boat.userData.oar.rotation.z = 0;
      put(SEA, anansi.root); const dive = clamp((u - 0.72) / 0.2);
      anansi.root.position.set(lerp(1.9, 3.0, dive), lerp(5.2, -1.5, dive), -3); anansi.root.rotation.set(dive * 2.4, 0, 0); anansi.open.visible = u > 0.6; anansi.grin.visible = !anansi.open.visible;
      nuts.forEach((n, i) => { const k = clamp((u - 0.1 - i * 0.18) / 0.14); n.visible = k > 0 && k < 1; n.position.set(2.2 + i * 0.5, lerp(5.8, 0, k), -2.4 + i * 0.3); const s = splashes[i]; const k2 = clamp((u - 0.24 - i * 0.18) / 0.12); s.visible = k2 > 0 && k2 < 1; s.position.set(2.2 + i * 0.5, 0.05, -2.4 + i * 0.3); s.scale.setScalar(1 + k2 * 2); });
      cam(-0.6, 3.6, 10.5, 1.8, 3.0, -2.4, 58); },
    // 3 – on the sea bed: kind old Thunder hands over the pot; food appears
    (lt, d, t) => { reset(); DEEP.visible = true; scene.background = SKIES.night; hemi.intensity = 1.2; bubble(t); const u = lt / d;
      thunder.root.position.set(1.4, 0, -1.4); thunder.root.rotation.y = -0.5; thunder.arms[0].sh.rotation.set(-1.2, 0, -0.3);
      put(DEEP, anansi.root, pot); anansi.root.position.set(-1.2, GY, -0.6); anansi.root.rotation.y = 0.5; say(anansi, t);
      const k = ease(clamp(u / 0.35)); pot.position.set(lerp(0.9, -0.3, k), lerp(1.6, 0.45, k), lerp(-1.0, -0.4, k));
      food.forEach((f, i) => { f.visible = u > 0.75; f.scale.setScalar(ease(clamp((u - 0.75 - i * 0.04) / 0.1))); });
      cam(0.2, 2.6, 8.5, 0.2, 1.4, -1.0, 54); },
    // 4 – Anansi hides the pot; he grows plump, his family grows thin
    (lt, d, t) => { reset(); W.visible = true; const u = lt / d;
      put(W, anansi.root, pot, hideout, wife.root, kweku.root); hideout.position.set(-3.4, 0.7, -2.2); pot.position.set(-3.4, 1.6, -1.4);
      anansi.root.position.set(-2.2, GY, -0.6); anansi.root.rotation.y = -0.8; const fat = 1 + ease(u) * 0.45; anansi.root.scale.set(fat, 1 + ease(u) * 0.1, fat);
      wife.root.position.set(1.6, GY, -0.2); wife.root.rotation.y = -0.4; wife.root.scale.set(1 - u * 0.25, 1, 1 - u * 0.25); wife.grin.visible = false; wife.open.visible = u > 0.5;
      kweku.root.position.set(2.6, GY, 0.4); kweku.root.rotation.y = -0.6; kweku.root.scale.set(0.6 - u * 0.12, 0.6, 0.6 - u * 0.12);
      cam(-0.4, 2.8, 10.5, -0.4, 1.3, -0.8, 54); },
    // 5 – Kweku becomes a fly, follows; family feasts, then the village; the pot melts
    (lt, d, t) => { reset(); W.visible = true; const u = lt / d;
      put(W, fly, pot); const k = clamp(u / 0.35); fly.position.set(lerp(2.4, -3.0, k) + Math.sin(t * 9) * 0.15, 2.2 + Math.sin(t * 13) * 0.15, lerp(0, -1.4, k)); fly.visible = u < 0.4;
      pot.position.set(0, 0.45, -0.6); const melt = clamp((u - 0.82) / 0.18); pot.scale.set(1 + melt * 0.6, 1 - melt * 0.9, 1 + melt * 0.6);
      food.forEach(f => f.visible = melt < 0.3);
      if (u > 0.35) { put(W, wife.root, kweku.root); wife.root.position.set(-1.2, GY, 0.4); kweku.root.position.set(1.1, GY, 0.5); wife.root.lookAt(O.x, 0, O.z - 0.6); kweku.root.lookAt(O.x, 0, O.z - 0.6); }
      villagers.forEach((v, i) => { v.root.visible = u > 0.55; const a = -2.6 + i * 1.7; v.root.position.set(Math.cos(a) * 2.6, 0, -0.6 + Math.sin(a) * 2.0 - 1.2); v.root.lookAt(O.x, 0, O.z - 0.6); v.expr(melt > 0.3 ? 'open' : 'smile', 0.8); W.add(v.root); });
      cam(0, 3.6, 10.5, 0, 1.2, -1.0, 56); },
    // 6 – back to Thunder; this time, a stick
    (lt, d, t) => { reset(); DEEP.visible = true; scene.background = SKIES.night; hemi.intensity = 1.2; bubble(t); const u = lt / d;
      thunder.root.position.set(1.4, 0, -1.4); thunder.root.rotation.y = -0.5; thunder.expr('smile', 1.0); thunder.arms[0].sh.rotation.set(-1.2, 0, -0.3);
      put(DEEP, anansi.root, stick); anansi.root.position.set(-1.2, GY, -0.6); anansi.root.rotation.y = 0.5; say(anansi, t);
      const k = ease(clamp(u / 0.3)); stick.position.set(lerp(0.9, -0.5, k), lerp(1.8, 1.0, k), lerp(-1.0, -0.4, k)); stick.rotation.z = 1.2;
      cam(0.2, 2.6, 8.5, 0.2, 1.4, -1.0, 54); },
    // 7 – whack, whack, whack; Anansi swims for it
    (lt, d, t) => { reset(); const u = lt / d;
      if (u < 0.6) { DEEP.visible = true; scene.background = SKIES.night; bubble(t); put(DEEP, anansi.root, stick, ...stars);
        const hop = Math.abs(Math.sin(t * 9)); anansi.root.position.set(-0.6 + Math.sin(t * 4) * 0.8, GY + hop * 0.5, -0.6); anansi.open.visible = true; anansi.grin.visible = false;
        stick.position.copy(anansi.root.position).add(V3(0.6, 1.8 + Math.sin(t * 9) * 0.4, 0)); stick.rotation.z = 0.8 + Math.sin(t * 9) * 0.7;
        stars.forEach((s, i) => { s.position.copy(anansi.root.position).add(V3(Math.cos(t * 4 + i * 1.25) * 0.6, 2.0, Math.sin(t * 4 + i * 1.25) * 0.6)); });
        cam(0, 2.6, 8.0, 0, 1.4, -0.6, 54); }
      else { SEA.visible = true; put(SEA, anansi.root); const k = (u - 0.6) / 0.4; boat.position.set(-30, 0, 0);
        anansi.root.position.set(lerp(2, -4, k), -0.6 + Math.sin(t * 6) * 0.06, -1.5); anansi.root.rotation.y = -Math.PI / 2; anansi.walk(t * 14, 1); anansi.open.visible = true; anansi.grin.visible = false;
        cam(-1, 2.6, 9.5, -1, 0.8, -1.5, 54); } },
    // 8 – end card
    (lt, d, t) => { W.visible = SEA.visible = DEEP.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
