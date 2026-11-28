// ANA-003 – Anansi and Nothing. Source: Barker & Sinclair, West African Folk-Tales (1917), tale III.
// Nothing's fall is shown as a slip and a fade to the widow; no injury is shown.
import { westafrica } from '../../engine/sets/westafrica.js';
import { endcard } from '../../engine/sets/endcard.js';

export function build(ctx) {
  const { THREE, scene, camera, aimSun, SKIES, hemi, clamp, ease, easeOutBack, lerp, toon, outlined, makeStick, makeSpider, drop, STORYTELLER } = ctx;
  const Wf = westafrica(ctx); const W = Wf.group; const E = endcard(ctx, STORYTELLER);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z); const O = Wf.origin; const GY = -0.18;
  const cam = (px, py, pz, lx, ly, lz, fov = 50) => { camera.position.set(O.x + px, py, O.z + pz); camera.lookAt(O.x + lx, ly, O.z + lz); camera.fov = fov; };

  const anansi = makeSpider(); W.add(anansi.root);
  // capes for Anansi: velvet (purple) or ragged cotton (brown with patches)
  const cape = (col, patch) => { const g = new THREE.Group(); const c = outlined(new THREE.ConeGeometry(0.75, 0.9, 16, 1, true), toon(col, { side: THREE.DoubleSide }), 1.04); c.position.y = 0.55; g.add(c);
    if (patch) for (const [x, y] of [[0.3, 0.4], [-0.25, 0.6]]) { const p = outlined(new THREE.BoxGeometry(0.2, 0.2, 0.05), toon(0xc9a466), 1.05); p.position.set(x, y, 0.5); g.add(p); } anansi.root.add(g); return g; };
  const capeVel = cape(0x6a2a8a, false), capeRag = cape(0x9a7a5a, true);
  const nothingVel = makeStick({ robe: 0x6a2a8a, robeLong: true, trim: 0xe0b84a, hat: 0x6a2a8a, seed: 301 }); W.add(nothingVel.root);
  const nothingRag = makeStick({ robe: 0x9a7a5a, stripes: 0x7a5a3a, hat: 0x6a2a8a, seed: 301 }); W.add(nothingRag.root);
  const wivesC = [0xe0a030, 0x2a9d8f, 0xc8553d, 0x3d7ea6];
  const wives = wivesC.map((c, i) => { const r = makeStick({ robe: c, robeLong: true, hair: 0x1a1a1a, curls: true, seed: 310 + i }); W.add(r.root); return r; });
  const mother = makeStick({ robe: 0x8e5ba8, robeLong: true, hair: 0x9a9a9a, seed: 320 }); W.add(mother.root);
  const bride = makeStick({ robe: 0xf4b6c8, robeLong: true, hair: 0x1a1a1a, longHair: true, seed: 321 }); W.add(bride.root);
  const kids = [0x3d7ea6, 0xe0a030, 0x4f8a4b].map((c, i) => { const r = makeStick({ robe: c, hair: 0x1a1a1a, seed: 330 + i }); r.root.scale.setScalar(0.65); W.add(r.root); return r; });
  // palace and hut at the crossroads
  const palace = new THREE.Group(); W.add(palace);
  { const b = outlined(new THREE.BoxGeometry(5, 3.4, 3), toon(0xf1e3c8), 1.02); b.position.y = 1.7; palace.add(b);
    for (const x of [-2.6, 2.6]) { const tw = outlined(new THREE.CylinderGeometry(0.7, 0.8, 4.8, 12), toon(0xe9d3a8), 1.03); tw.position.set(x, 2.4, 0); palace.add(tw); const cp = outlined(new THREE.ConeGeometry(0.95, 1.4, 12), toon(0xe0b84a), 1.04); cp.position.set(x, 5.5, 0); palace.add(cp); }
    const dr = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.1), toon(0x5a3a22)); dr.position.set(0, 1.0, 1.52); palace.add(dr); }
  const hutG = new THREE.Group(); W.add(hutG);
  { const w = outlined(new THREE.CylinderGeometry(1.1, 1.1, 1.4, 14), toon(0xb5865a), 1.03); w.position.y = 0.7; hutG.add(w); const r = outlined(new THREE.ConeGeometry(1.5, 1.2, 14), toon(0xc9a466), 1.04); r.position.y = 2.0; hutG.add(r); }
  const roads = [-1, 1].map(sd => { const r = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 12), toon(0xc9a466)); r.rotation.set(-Math.PI / 2, 0, sd * 0.5); r.position.set(sd * 2.8, 0.02, -6); W.add(r); return r; });
  const slick = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: 0x9fd0ef, transparent: true, opacity: 0.8 })); slick.rotation.x = -Math.PI / 2; W.add(slick);
  const bowl = outlined(new THREE.SphereGeometry(0.35, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0x8a5a36, { side: THREE.DoubleSide }), 1.06); W.add(bowl);
  const yam = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), toon(0xf4e1a6)); yam.scale.y = 0.4; W.add(yam);
  const tears = Array.from({ length: 6 }, () => { const d = drop(); W.add(d); return d; });
  const dust = Array.from({ length: 8 }, () => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd9c49a, transparent: true, opacity: 0.6 })); W.add(s); return s; });

  const all = [nothingVel, nothingRag, ...wives, mother, bride, ...kids];
  function reset() { W.visible = true; E.group.visible = false; scene.background = SKIES.day; aimSun(O, V3(-10, 20, 14), 0xfff0d0, 2.4); hemi.intensity = 1.5;
    anansi.root.visible = true; anansi.root.rotation.set(0, 0, 0); anansi.root.position.set(0, GY, 0); anansi.walk(0, 0); anansi.grin.visible = true; anansi.open.visible = false; capeVel.visible = false; capeRag.visible = true;
    all.forEach(r => { r.rest(); r.root.visible = false; r.root.rotation.set(0, 0, 0); r.expr('smile', 0.3); r.look(0, 0); });
    palace.visible = hutG.visible = false; roads.forEach(r => r.visible = false); slick.visible = false; bowl.visible = yam.visible = false; tears.forEach(d => d.visible = false); dust.forEach(d => d.visible = false); }
  const say = (sp, t) => { sp.open.visible = Math.sin(t * 12) > 0; sp.grin.visible = !sp.open.visible; };

  return [
    // 1 – Anansi and his rich neighbour Nothing, in fine velvet
    (lt, d, t) => { reset(); anansi.root.position.set(-1.4, GY, 0); anansi.root.rotation.y = 0.4; anansi.wave(t * 0.6);
      nothingVel.root.visible = true; nothingVel.root.position.set(1.3, 0, -0.4); nothingVel.root.rotation.y = -0.4; nothingVel.expr('smile', 0.8); nothingVel.arms[1].sh.rotation.set(-0.3, 0, 1.9 + Math.sin(t * 3) * 0.2);
      cam(0, 2.8, 11.0, 0, 1.4, -0.4, 52); },
    // 2 – on the road: velvet vs rags; "let's swap clothes for a while"
    (lt, d, t) => { reset(); const u = lt / d; const sw = u > 0.65;
      anansi.root.position.set(-1.2, GY, 0); anansi.root.rotation.y = 0.5; say(anansi, t); capeRag.visible = !sw; capeVel.visible = sw;
      const N = sw ? nothingRag : nothingVel; N.root.visible = true; N.root.position.set(1.2, 0, -0.3); N.root.rotation.y = -0.5; N.expr(sw ? 'flat' : 'smile', 0.4);
      dust.forEach((s, i) => { s.visible = u > 0.6 && u < 0.75; s.position.set(Math.cos(i) * 1.2, 1 + Math.sin(i * 2) * 0.6, -0.2); s.scale.setScalar(1 + (u - 0.6) * 6); });
      cam(0, 2.8, 11.0, 0, 1.4, -0.3, 52); },
    // 3 – "Not yet, the road is dusty… not yet, the sun is too hot"; Nothing taps his foot
    (lt, d, t) => { reset(); scene.background = SKIES.sunset; const u = lt / d; capeVel.visible = true; capeRag.visible = false;
      anansi.root.position.set(lerp(-3, 0.6, u), GY, 0); anansi.root.rotation.y = Math.PI / 2; anansi.walk(t * 10, 1); say(anansi, t);
      nothingRag.root.visible = true; nothingRag.root.position.set(lerp(-4.6, -1.0, u), 0, 0.2); nothingRag.root.rotation.y = Math.PI / 2; nothingRag.walk(t * 8, 1); nothingRag.expr('frown', 0.4); nothingRag.arms[1].sh.rotation.set(-0.8, 0, 0.4);
      cam(-1.2, 2.6, 11.0, -1.2, 1.3, 0, 54); },
    // 4 – velvet Anansi surrounded by wives; ragged Nothing laughed at, until a kind mother brings her daughter
    (lt, d, t) => { reset(); const u = lt / d; capeVel.visible = true; capeRag.visible = false; anansi.root.position.set(-2.0, GY, -0.4); anansi.root.rotation.y = 0.3; anansi.wave(t * 0.8);
      wives.forEach((r, i) => { r.root.visible = true; r.root.position.set(-3.6 + i * 0.9 + (i > 1 ? 0.8 : 0), 0, -1.4 - (i % 2) * 0.5); r.root.lookAt(O.x - 2, 0, O.z - 0.4); r.expr('smile', 0.6); });
      nothingRag.root.visible = true; nothingRag.root.position.set(2.0, 0, 0); nothingRag.root.rotation.y = -0.3; nothingRag.expr(u < 0.55 ? 'frown' : 'smile', 0.6);
      mother.root.visible = bride.root.visible = u > 0.5; const k = ease(clamp((u - 0.5) / 0.35)); mother.root.position.set(lerp(5.5, 3.3, k), 0, -0.6); bride.root.position.set(lerp(6.3, 2.9, k), 0, 0.4); mother.root.rotation.y = bride.root.rotation.y = -Math.PI / 2; mother.walk(t * 8, 1 - k); bride.walk(t * 8, 1 - k);
      cam(0.2, 3.2, 13, 0.2, 1.5, -0.6, 54); },
    // 5 – the crossroads: Nothing's road to a palace, Anansi's to a hut; the wives walk over to the palace
    (lt, d, t) => { reset(); const u = lt / d; roads.forEach(r => r.visible = true); palace.visible = hutG.visible = true; palace.position.set(4.6, 0, -11); hutG.position.set(-4.2, 0, -10);
      nothingRag.root.visible = bride.root.visible = true; nothingRag.root.position.set(lerp(0.6, 3.2, u), 0, lerp(-1, -7, u)); bride.root.position.set(lerp(1.4, 4.0, u), 0, lerp(-1, -7, u)); nothingRag.root.rotation.y = bride.root.rotation.y = Math.PI - 0.4; nothingRag.walk(t * 8, 1); bride.walk(t * 8, 1);
      capeVel.visible = true; capeRag.visible = false; anansi.root.position.set(lerp(-0.6, -3.0, u * 0.6), GY, lerp(-1, -5, u * 0.6)); anansi.root.rotation.y = Math.PI + 0.4; anansi.walk(t * 10, 1);
      wives.forEach((r, i) => { const k = clamp((u - 0.45 - i * 0.05) / 0.5); r.root.visible = true; r.root.position.set(lerp(-1.6 + i * 0.5, 3.6 + i * 0.3, ease(k)), 0, lerp(-1.6, -8.6, ease(k))); r.root.rotation.y = Math.PI - 0.4; r.walk(t * 8 + i, k > 0 && k < 1 ? 1 : 0); });
      cam(0, 7.0, 9.5, 0, 1.6, -6, 58); },
    // 6 – furious Anansi pours a slippery trap at the palace door; Nothing slips (fade)
    (lt, d, t) => { reset(); const u = lt / d; palace.visible = true; palace.position.set(1.6, 0, -5.5); capeVel.visible = true; capeRag.visible = false;
      anansi.root.position.set(-1.3, GY, -2.2); anansi.root.rotation.y = u < 0.5 ? 0.6 : 0; anansi.open.visible = true; anansi.grin.visible = false;
      slick.visible = u > 0.2; slick.position.set(1.6, 0.03, -3.4); slick.scale.setScalar(ease(clamp((u - 0.2) / 0.25)));
      nothingRag.root.visible = u > 0.5; const s = clamp((u - 0.62) / 0.18); nothingRag.root.position.set(1.6, 0, lerp(-3.9, -3.2, s)); nothingRag.root.rotation.set(-s * 1.4, 0, 0); nothingRag.expr('open', 1);
      const fade = clamp((u - 0.82) / 0.18); hemi.intensity = 1.5 * (1 - fade * 0.7); scene.background = fade > 0.5 ? SKIES.night : SKIES.sunset;
      cam(0, 3.4, 9.5, 0, 1.6, -3.4, 56); },
    // 7 – the widow, crying, shares mashed yam with children; they all cry together
    (lt, d, t) => { reset(); scene.background = SKIES.sunset; const u = lt / d; anansi.root.visible = false;
      bride.root.visible = true; bride.root.position.set(-1.0, 0, -0.6); bride.root.rotation.y = 0.6; bride.expr('frown', 1.0); bride.arms[1].sh.rotation.set(-1.2, 0, 0.3);
      bowl.visible = yam.visible = true; bowl.position.set(-0.4, 1.4, 0.0); yam.position.set(-0.4, 1.5, 0.0);
      kids.forEach((k, i) => { k.root.visible = true; k.root.position.set(0.8 + i * 0.8, 0, 0.3 - (i % 2) * 0.4); k.root.rotation.y = -0.7; k.expr(u > 0.3 ? 'open' : 'frown', 1.0); });
      tears.forEach((d, i) => { d.visible = u > 0.3; const who = i < 2 ? bride : kids[(i - 2) % 3]; const v = (t * 1.2 + i / 6) % 1; d.position.copy(who.root.position).add(V3(0.15, (who === bride ? 3.4 : 2.2) - v * 0.8, 0.4)); d.scale.setScalar(0.9); });
      cam(0.4, 2.4, 9.5, 0.4, 1.4, -0.2, 54); },
    // 8 – end card
    (lt, d, t) => { W.visible = false; E.group.visible = true; E.update(lt); },
  ];
}
