// CUMSM 506 manual treadmill — deterministic Three.js build animation for HyperFrames.
// Everything visible is a pure function of time t (seconds). No clocks, no unseeded randomness.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const W = 1920, H = 1080;
const TL = window.TL, PARTS = window.PARTS;

// ---------------------------------------------------------------- math helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const S = (a, b, t) => clamp((t - a) / (b - a));
const sm = (x) => x * x * (3 - 2 * x);
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eout = (x) => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, x) => a + (b - a) * x;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function prng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------------------------------------------------------------- renderer / scene
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const BG = new THREE.Color(0x24282e);
scene.background = BG;
scene.fog = new THREE.Fog(0x24282e, 6, 14);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(32, W / H, 0.01, 40);

const hemi = new THREE.HemisphereLight(0xdce6f0, 0x3b342c, 0.55);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff1de, 2.4);
key.position.set(2.2, 4.0, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -1.7; key.shadow.camera.right = 1.7;
key.shadow.camera.top = 1.7; key.shadow.camera.bottom = -1.7;
key.shadow.camera.near = 0.5; key.shadow.camera.far = 10;
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01;
scene.add(key); scene.add(key.target);
const rim = new THREE.DirectionalLight(0x9fc4ff, 0.9);
rim.position.set(-3, 2.0, -2.5);
scene.add(rim);
const sparkLight = new THREE.PointLight(0xff9a3c, 0, 1.6, 2);
scene.add(sparkLight);

// ---------------------------------------------------------------- textures (seeded canvas)
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const concreteTex = canvasTex(1024, 1024, (g, w, h) => {
  const r = prng(7); g.fillStyle = "#6b6862"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60000; i++) { const v = 80 + r() * 60 | 0; g.fillStyle = `rgba(${v},${v - 2},${v - 6},${0.18 * r()})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(40,38,34,${0.05 * r()})`; g.beginPath(); g.arc(r() * w, r() * h, 20 + r() * 120, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(30,30,30,0.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 2); g.lineTo(w, 2); g.moveTo(2, 0); g.lineTo(2, h); g.stroke();
}, [8, 8]);
const beltTex = canvasTex(512, 256, (g, w, h) => {
  const r = prng(11); g.fillStyle = "#1e1e1f"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 20 + r() * 30 | 0; g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1); }
  for (let x = 0; x < w; x += 16) { g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(x, 0, 5, h); g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(x + 5, 0, 2, h); }
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(120,120,120,${0.05 + 0.05 * r()})`; g.fillRect(0, r() * h, w, 1 + r() * 3); }
}, [1, 1]);
const mdfTex = canvasTex(1024, 512, (g, w, h) => {
  const r = prng(5); g.fillStyle = "#b48a5c"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70000; i++) { const a = r(); g.fillStyle = a < 0.5 ? `rgba(90,55,25,${0.12 * r()})` : `rgba(230,200,160,${0.12 * r()})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
});
const discTex = (flap) => canvasTex(256, 256, (g, w) => {
  g.fillStyle = flap ? "#5a4a36" : "#2f3033"; g.beginPath(); g.arc(128, 128, 127, 0, 7); g.fill();
  if (flap) { for (let i = 0; i < 36; i++) { g.save(); g.translate(128, 128); g.rotate(i / 36 * 6.283); g.fillStyle = i % 2 ? "#6e5b40" : "#4a3c2c"; g.fillRect(55, -9, 72, 14); g.restore(); } }
  g.fillStyle = flap ? "#2a2a2a" : "#1d5fa8"; g.beginPath(); g.arc(128, 128, 54, 0, 7); g.fill();
  g.fillStyle = "#e8e8e8"; g.font = "bold 22px Inter"; g.textAlign = "center"; g.fillText(flap ? "P60" : "Ø115", 128, 105); g.fillText(flap ? "FLAP" : "1.0 mm", 128, 170);
  g.fillStyle = "#999"; g.beginPath(); g.arc(128, 128, 14, 0, 7); g.fill();
});
const cutDiscTex = discTex(false), flapDiscTex = discTex(true);
const bitTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = "#c9ccd0"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3d3f42"; g.lineWidth = 10; for (let y = -64; y < h + 64; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 24); g.stroke(); } }, [1, 1]);
const brushTex = canvasTex(256, 256, (g) => { g.fillStyle = "#555"; g.fillRect(0, 0, 256, 256); const r = prng(3); for (let i = 0; i < 1400; i++) { const a = r() * 6.283; g.strokeStyle = `rgba(${170 + r() * 70 | 0},${170 + r() * 70 | 0},${170 + r() * 70 | 0},0.8)`; g.beginPath(); g.moveTo(128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30); g.lineTo(128 + Math.cos(a) * 127, 128 + Math.sin(a) * 127); g.stroke(); } g.fillStyle = "#333"; g.beginPath(); g.arc(128, 128, 28, 0, 7); g.fill(); });
function labelTex(lines, w, h, bg, fg) {
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    lines.forEach(([txt, size, y, weight, col]) => { g.fillStyle = col || fg; g.font = `${weight || 700} ${size}px Inter`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2, y); });
  });
}
const screenCanvas = document.createElement("canvas"); screenCanvas.width = 256; screenCanvas.height = 80;
const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace;
function drawScreen(sec) {
  const g = screenCanvas.getContext("2d"); g.fillStyle = "#0b1f17"; g.fillRect(0, 0, 256, 80);
  g.fillStyle = "#58ffb0"; g.font = "bold 34px DejaVu Sans Mono"; g.textAlign = "center";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  g.fillText(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`, 128, 40);
  g.font = "bold 16px Inter"; g.fillText("TIME · MANUAL", 128, 66);
  screenTex.needsUpdate = true;
}

// ---------------------------------------------------------------- staged steel shader
const STEEL_GLSL = `
varying vec3 vLoc;
uniform float uA; uniform float uB; uniform float uW; uniform float uGloss; uniform float uSeed;
float h3(vec3 p){ p=fract(p*0.3183099+vec3(.1,.2,.3)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.-2.*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5,s=0.; for(int k=0;k<4;k++){ s+=a*vn(p); p*=2.03; a*=.5; } return s; }
void look(float st, vec3 p, out vec3 c, out float r, out float m){
  float n = fbm(p*160.0+uSeed);
  float big = fbm(p*14.0+uSeed*1.7);
  float n2 = vn(p*vec3(3.0,260.0,260.0)+uSeed);
  vec3 rust = mix(vec3(.075,.032,.014), vec3(.25,.095,.032), smoothstep(.25,.85,n*0.6+big*0.55));
  rust *= 0.8 + 0.35*vn(p*420.0+uSeed);
  rust = mix(rust, vec3(.085,.08,.078), smoothstep(.58,.70,big)*.7);
  vec3 oily = vec3(.36,.36,.36)*(.85+.25*n2);
  vec3 clean = vec3(.62,.63,.64)*(.82+.3*n2);
  vec3 primer = vec3(.30,.31,.30)*(.96+.06*n);
  vec3 paint = vec3(.025,.085,.25);
  float pr = mix(.45,.2,uGloss);
  if(st<=1.){ float k=st; c=mix(rust,oily,k); r=mix(.95,.5,k); m=mix(.15,.85,k); }
  else if(st<=1.5){ float k=(st-1.)*2.; c=mix(oily,clean,k); r=mix(.5,.3,k); m=mix(.85,.95,k); }
  else if(st<=2.){ float k=(st-1.5)*2.; c=mix(clean,primer,k); r=mix(.3,.85,k); m=mix(.95,0.,k); }
  else { float k=clamp(st-2.,0.,1.); c=mix(primer,paint,k); r=mix(.85,pr,k); m=mix(0.,.18,k); }
}`;
function steelMat(seed, stage = 0) {
  const u = { uA: { value: stage }, uB: { value: stage }, uW: { value: -9 }, uGloss: { value: 0 }, uSeed: { value: seed } };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.5 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vLoc;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLoc = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + STEEL_GLSL)
      .replace("#include <color_fragment>", "#include <color_fragment>\nvec3 sC; float sR, sM; float stg = mix(uA, uB, 1.0 - smoothstep(uW-0.004, uW+0.004, vLoc.x)); look(stg, vLoc, sC, sR, sM); diffuseColor.rgb = sC;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = sR;")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = sM;");
  };
  m.customProgramCacheKey = () => "steelStage";
  m.userData.u = u;
  return m;
}
function setStage(mat, a, b = a, w = -9, gloss = null) { const u = mat.userData.u; u.uA.value = a; u.uB.value = b; u.uW.value = w; if (gloss !== null) u.uGloss.value = gloss; }

// ---------------------------------------------------------------- plain materials
const M = {
  zinc: new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 1, roughness: 0.28 }),
  castIron: new THREE.MeshStandardMaterial({ color: 0x2d3640, metalness: 0.35, roughness: 0.55 }),
  bearing: new THREE.MeshStandardMaterial({ color: 0xd6d9dd, metalness: 1, roughness: 0.18 }),
  machined: new THREE.MeshStandardMaterial({ color: 0xb9bdc2, metalness: 1, roughness: 0.25 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1b1b1c, metalness: 0, roughness: 0.92 }),
  belt: new THREE.MeshStandardMaterial({ map: beltTex, color: 0xffffff, metalness: 0, roughness: 0.88 }),
  mdf: new THREE.MeshStandardMaterial({ map: mdfTex, metalness: 0, roughness: 0.82 }),
  plastic: new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: 0.1, roughness: 0.5 }),
  screen: new THREE.MeshBasicMaterial({ map: screenTex }),
  witness: new THREE.MeshStandardMaterial({ color: 0xffc21a, roughness: 0.6 }),
  toolBody: new THREE.MeshStandardMaterial({ color: 0x1c6e74, metalness: 0.2, roughness: 0.45 }),
  toolDark: new THREE.MeshStandardMaterial({ color: 0x222428, metalness: 0.4, roughness: 0.5 }),
  toolSteel: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 1, roughness: 0.35 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.8 }),
  benchTop: new THREE.MeshStandardMaterial({ color: 0x6f5235, roughness: 0.75 }),
  cardboard: new THREE.MeshStandardMaterial({ color: 0xa27a4a, roughness: 0.9 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xf2c418, roughness: 0.5 }),
  tape: new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.3, map: canvasTex(1024, 32, (g, w, h) => { g.fillStyle = "#f2d22a"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; for (let i = 0; i <= 200; i++) { const x = i / 200 * w; g.fillRect(x, 0, 1, i % 10 ? 8 : 16); } }) }),
  cloth: new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 1 }),
  marker: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }),
  markLine: new THREE.MeshBasicMaterial({ color: 0xf5f5f5 }),
  kerf: new THREE.MeshBasicMaterial({ color: 0x0a0a0a }),
  floor: new THREE.MeshLambertMaterial({ map: concreteTex, color: 0xbdb9b2 }),
};

// ---------------------------------------------------------------- geometry from CadQuery bundle
function b64(s, T) { const bin = atob(s); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new T(u8.buffer); }
const G = {};
for (const [name, d] of Object.entries(PARTS)) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(b64(d.p, Float32Array), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(b64(d.n, Float32Array), 3));
  g.setIndex(new THREE.BufferAttribute(b64(d.i, Uint32Array), 1));
  g.computeBoundingSphere();
  G[name] = g;
}
// hollow 25 x 25 x 2 raw stock (JS) along X
function hollowSquare(a, t, L) {
  const s = new THREE.Shape(); s.moveTo(-a / 2, -a / 2); s.lineTo(a / 2, -a / 2); s.lineTo(a / 2, a / 2); s.lineTo(-a / 2, a / 2); s.lineTo(-a / 2, -a / 2);
  const h = new THREE.Path(); const b = a / 2 - t; h.moveTo(-b, -b); h.lineTo(-b, b); h.lineTo(b, b); h.lineTo(b, -b); h.lineTo(-b, -b); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false }); g.translate(0, 0, -L / 2); g.rotateY(Math.PI / 2); return g;
}

const all = [];
function mesh(geo, mat, parent = scene, cast = true) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; parent.add(m); all.push(m); return m;
}
function group(parent = scene) { const g = new THREE.Group(); parent.add(g); all.push(g); return g; }

// ---------------------------------------------------------------- environment
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), M.floor);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

// workbench (prep phases)
const bench = group();
mesh(new THREE.BoxGeometry(1.7, 0.05, 0.7), M.benchTop, bench).position.set(-0.17, 0.835, 0);
for (const [x, z] of [[-0.95, -0.3], [-0.95, 0.3], [0.6, -0.3], [0.6, 0.3]]) mesh(new THREE.BoxGeometry(0.06, 0.81, 0.06), M.toolDark, bench).position.set(x, 0.405, z);
mesh(new THREE.BoxGeometry(1.6, 0.03, 0.04), M.toolDark, bench).position.set(-0.17, 0.2, 0.3);
mesh(new THREE.BoxGeometry(1.6, 0.03, 0.04), M.toolDark, bench).position.set(-0.17, 0.2, -0.3);
const BENCH_Y = 0.88; // centre of a 40 mm tube resting on the bench

// trestle rack (surface treatment)
const rack = group();
for (const x of [-0.45, 0.45]) {
  mesh(new THREE.BoxGeometry(0.06, 0.04, 1.15), M.wood, rack).position.set(x, 0.73, 0.0);
  for (const z of [-0.5, 0.5]) for (const s of [-1, 1]) { const l = mesh(new THREE.BoxGeometry(0.04, 0.78, 0.04), M.wood, rack); l.position.set(x + s * 0.12, 0.36, z); l.rotation.z = s * 0.3; }
}
const RACK_Y = 0.75;

// ---------------------------------------------------------------- frame members (staged steel)
const steelMeshes = [];
function steel(geoName, seed, parent = scene) { const m = mesh(G[geoName], steelMat(seed), parent); steelMeshes.push(m); return m; }
const railA = steel("rail", 1.3), railB = steel("rail", 2.1);
const crossF = steel("cross", 3.7), crossR = steel("cross", 4.4);
const bearerA = steel("bearer", 5.2), bearerB = steel("bearer", 6.9);
const postPivA = group(), postPivB = group();
const postA = steel("post", 7.3, postPivA), postB = steel("post", 8.8, postPivB);
const crossbar = steel("crossbar", 9.1);
const plateA = steel("plate", 10.4), plateB = steel("plate", 11.6);
const heroRaw = steel("rail_raw", 12.2); heroRaw.scale.x = 1.2;
const offcut = steel("rail_raw", 12.9); offcut.scale.x = 0.2;
const railRaw = steel("rail_raw", 1.3);
const members = [railA, railB, crossF, crossR, bearerA, bearerB, postA, postB, crossbar, plateA, plateB];

// raw material pile
const pile = group();
const pileTubes = [];
for (let i = 0; i < 6; i++) { const m = steel("rail_raw", 20 + i * 1.7, pile); m.scale.x = 1.25; pileTubes.push(m); }
const raw25Geo = hollowSquare(0.025, 0.002, 2.0);
for (let i = 0; i < 4; i++) { const m = mesh(raw25Geo, steelMat(40 + i), pile); m.userData.small = i; pileTubes.push(m); }
const pipeRaw = mesh(G.drum, steelMat(55), pile);
const beltRoll = group(pile);
mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 48, 1), M.belt, beltRoll).rotation.x = Math.PI / 2;
mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.425, 24), M.toolDark, beltRoll).rotation.x = Math.PI / 2;
const beltTail = mesh(new THREE.BoxGeometry(0.6, 0.007, 0.42), M.belt, beltRoll); beltTail.position.set(0.3, -0.166, 0);
const mdfBoard = mesh(new THREE.BoxGeometry(1.2, 0.018, 0.46), M.mdf, pile);
const boltBox = mesh(new THREE.BoxGeometry(0.22, 0.12, 0.16), M.cardboard, pile);
const pileBearings = [], spilled = [];
for (let i = 0; i < 4; i++) { const g = group(pile); mesh(G.pillow, M.castIron, g); mesh(G.insert, M.bearing, g); pileBearings.push(g); }
for (let i = 0; i < 7; i++) spilled.push(mesh(G[["bolt100", "bolt75", "bolt60", "nut", "washer", "nut", "bolt45"][i]], M.zinc, pile));
const pileLayout = () => {
  pileTubes.forEach((m, i) => {
    if (i < 6) { const row = i < 3 ? 0 : i < 5 ? 1 : 2; const k = i < 3 ? i : i < 5 ? i - 3 : 0; m.position.set(-0.1 + 0.03 * i, 0.02 + row * 0.04, -0.62 + k * 0.042 + row * 0.021); }
    else { const k = i - 6; m.position.set(0.05 - 0.02 * k, 0.0125, -0.35 + k * 0.03); }
  });
  pipeRaw.scale.set(1, 1, 2.6); pipeRaw.rotation.set(0, Math.PI / 2, 0); pipeRaw.position.set(-0.55, 0.0242, 0.62);
  beltRoll.position.set(0.72, 0.17, 0.12);
  mdfBoard.position.set(-0.55, 0.035, 0.12); mdfBoard.rotation.set(0, 0, 0);
  boltBox.position.set(0.95, 0.06, 0.62);
  pileBearings.forEach((g, i) => { g.position.set(0.05 + i * 0.15, 0, 0.62); g.rotation.set(0, 0.2 * i, 0); });
  spilled.forEach((m, i) => { m.position.set(0.8 + 0.06 * Math.cos(i * 2.4) + 0.02 * i, 0.006, 0.47 + 0.05 * Math.sin(i * 2.4)); m.rotation.set(Math.PI / 2, 0, i * 1.1); });
};

// ---------------------------------------------------------------- running gear and fittings
function pillowBlock() { const g = group(); mesh(G.pillow, M.castIron, g); mesh(G.insert, M.bearing, g); mesh(G.nipple, M.zinc, g); return g; }
const PB = [[-0.64, -0.23], [-0.64, 0.23], [0.64, -0.23], [0.64, 0.23]].map(([x, z]) => { const g = pillowBlock(); g.userData.home = V(x, 0.10, z); return g; });
function roller(x) {
  const g = group(); g.userData.home = V(x, 0.1333, 0);
  const spin = new THREE.Group(); g.add(spin);
  mesh(G.drum, M.machined, spin); mesh(G.shaft, M.bearing, spin);
  const w = mesh(new THREE.BoxGeometry(0.006, 0.0015, 0.36), M.witness, spin); w.position.set(0, 0.0245, 0);
  g.userData.spin = spin; return g;
}
const rollF = roller(-0.64), rollR = roller(0.64);
const deck = mesh(new THREE.BoxGeometry(1.2, 0.018, 0.46), M.mdf); deck.userData.home = V(0, 0.1482, 0);
const pads = [-0.725, 0.725].map((x) => { const m = mesh(G.pad, M.rubber); m.userData.home = V(x, 0.01, 0); return m; });
const grips = [-0.2, 0.2].map((z) => { const m = mesh(G.grip, M.rubber); m.rotation.y = Math.PI / 2; m.userData.home = V(-0.665, 1.0405, z); return m; });
const consoleG = group(); mesh(G.console, M.plastic, consoleG); mesh(G.screen, M.screen, consoleG); consoleG.rotation.y = Math.PI / 2; consoleG.userData.home = V(-0.665, 1.053, 0);
const decals = [];
{
  const t1 = labelTex([["CUMSM 506", 92, 70, 800, "#ffffff"], ["MANUAL TREADMILL · DfD", 38, 150, 600, "#ffd34a"]], 1024, 200, null, "#fff");
  const t2 = labelTex([["CUT", 120, 100, 900, "#ffffff"]], 512, 200, null, "#fff");
  const mk = (tex, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); scene.add(m); all.push(m); decals.push(m); return m; };
  const d1 = mk(t1, 0.42, 0.082); d1.userData.home = V(-0.05, 0.08, 0.2502);
  const d2 = mk(t2, 0.16, 0.0625); d2.userData.home = V(0.42, 0.08, 0.2502);
  const d3 = mk(t1, 0.42, 0.082); d3.userData.home = V(0.05, 0.08, -0.2502); d3.rotation.y = Math.PI;
}

// fasteners
const BOLTS = [];
function addBolt(len, pos, dir, stack, group_) {
  const g = group(); const b = mesh(G["bolt" + len], M.zinc, g, true); const w1 = mesh(G.washer, M.zinc, g); const w2 = mesh(G.washer, M.zinc, g); const n = mesh(G.nut, M.zinc, g);
  w1.position.y = -0.0008; w2.position.y = -stack - 0.0008; n.position.y = -stack - 0.0016 - 0.00325;
  b.position.y = 0.0016;
  g.position.copy(pos);
  if (dir === "+y") g.rotation.set(0, 0, 0);
  if (dir === "+z") g.rotation.set(Math.PI / 2, 0, 0);
  if (dir === "-z") g.rotation.set(-Math.PI / 2, 0, 0);
  if (dir === "-x") g.rotation.set(0, 0, Math.PI / 2);
  const rec = { g, b, w1, w2, n, stack, group: group_ }; BOLTS.push(rec); return rec;
}
for (const x of [-0.725, 0.725]) for (const z of [-0.23, 0.23]) addBolt(100, V(x, 0.10, z), "+y", 0.08, "lap");
for (const x of [-0.6875, -0.5925, 0.5925, 0.6875]) for (const z of [-0.23, 0.23]) addBolt(75, V(x, 0.114, z), "+y", 0.054, "pillow");
for (const x of [-0.5, 0, 0.5]) for (const z of [-0.23, 0.23]) addBolt(100, V(x, 0.14, z), "+y", 0.08, "bearer");
for (const x of [-0.665, -0.615]) for (const s of [-1, 1]) addBolt(60, V(x, 0.08, s * 0.256), s > 0 ? "+z" : "-z", 0.046, "plate");
for (const y of [0.14, 0.175]) for (const s of [-1, 1]) addBolt(45, V(-0.64, y, s * 0.281), s > 0 ? "+z" : "-z", 0.031, "post");
for (const s of [-1, 1]) addBolt(60, V(-0.6775, 1.0405, s * 0.2685), "-x", 0.05, "crossbar");

// belt loop (ribbon with thickness), segments ordered along the path for draw-range wrapping
const BR = 0.02765, BL = 1.28, BP = 2 * BL + 2 * Math.PI * BR, BTH = 0.007, BWID = 0.4, BTILE = 0.2;
function beltAt(s) {
  s = ((s % BP) + BP) % BP;
  if (s < BL) return [-0.64 + s, BR, 0, 1, 0];
  s -= BL; if (s < Math.PI * BR) { const a = Math.PI / 2 - s / BR; return [0.64 + BR * Math.cos(a), BR * Math.sin(a), Math.cos(a), Math.sin(a), 1]; }
  s -= Math.PI * BR; if (s < BL) return [0.64 - s, -BR, 0, -1, 2];
  s -= BL; const a = -Math.PI / 2 - s / BR; return [-0.64 + BR * Math.cos(a), BR * Math.sin(a), Math.cos(a), Math.sin(a), 3];
}
const BN = 640;
const beltGeo = new THREE.BufferGeometry();
const beltBase = [];
{
  const pos = [], nor = [], uv = [], idx = [];
  for (let k = 0; k <= BN; k++) {
    const s = k / BN * BP; const [x, y, nx, ny, part] = beltAt(s);
    const ox = x + nx * BTH / 2, oy = y + ny * BTH / 2, ix = x - nx * BTH / 2, iy = y - ny * BTH / 2;
    const u = s / BTILE;
    const push = (px, py, pz, n, uu, vv) => { pos.push(px, py, pz); nor.push(...n); uv.push(uu, vv); beltBase.push({ part, s }); };
    push(ox, oy, BWID / 2, [nx, ny, 0], u, 1); push(ox, oy, -BWID / 2, [nx, ny, 0], u, 0);
    push(ix, iy, BWID / 2, [-nx, -ny, 0], u, 1); push(ix, iy, -BWID / 2, [-nx, -ny, 0], u, 0);
    push(ox, oy, BWID / 2, [0, 0, 1], u, 1); push(ix, iy, BWID / 2, [0, 0, 1], u, 0.98);
    push(ox, oy, -BWID / 2, [0, 0, -1], u, 0); push(ix, iy, -BWID / 2, [0, 0, -1], u, 0.02);
  }
  for (let k = 0; k < BN; k++) {
    const a = k * 8, b = (k + 1) * 8;
    const q = (p0, p1, p2, p3) => idx.push(p0, p2, p1, p2, p3, p1);
    q(a + 1, b + 1, a, b);       // outer
    q(a + 2, b + 2, a + 3, b + 3); // inner
    q(a + 4, b + 4, a + 5, b + 5); // edge +z
    q(a + 7, b + 7, a + 6, b + 6); // edge -z
  }
  beltGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  beltGeo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  beltGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  beltGeo.setIndex(idx);
}
const beltPos0 = beltGeo.attributes.position.array.slice();
const belt = mesh(beltGeo, M.belt); belt.position.set(0, 0.1333, 0); belt.userData.home = V(0, 0.1333, 0);
let beltSag = -1;
function setBeltSag(sag) {
  if (Math.abs(sag - beltSag) < 1e-6) return; beltSag = sag;
  const p = beltGeo.attributes.position.array;
  for (let v = 0; v < beltBase.length; v++) {
    const { part, s } = beltBase[v]; let dy = 0;
    if (part === 2) { const f = (s - BL - Math.PI * BR) / BL; dy = -sag * Math.sin(Math.PI * clamp(f)); }
    if (part === 0) { const f = s / BL; dy = sag * 0.15 * Math.sin(Math.PI * clamp(f)); }
    p[v * 3 + 1] = beltPos0[v * 3 + 1] + dy;
  }
  beltGeo.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------- tools
// angle grinder: disc centred at group origin, spindle along +X, motor along +Z
function grinder(tex) {
  const g = group(); const disc = new THREE.Group(); g.add(disc);
  const dm = mesh(new THREE.CylinderGeometry(0.0575, 0.0575, 0.002, 64), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), disc); dm.rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 6), M.toolSteel, disc).rotation.z = Math.PI / 2;
  const guard = mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 48, 1, true, 0, Math.PI), M.toolSteel, g); guard.rotation.set(0, 0, Math.PI / 2); guard.position.x = 0.012; guard.material = M.toolSteel;
  const gh = mesh(new THREE.BoxGeometry(0.05, 0.055, 0.06), M.toolDark, g); gh.position.set(0.04, 0, 0.01);
  const body = mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.21, 32), M.toolBody, g); body.rotation.x = Math.PI / 2; body.position.set(0.04, 0, 0.145);
  const tail = mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.05, 24), M.toolDark, g); tail.rotation.x = Math.PI / 2; tail.position.set(0.04, 0, 0.275);
  const hdl = mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.11, 16), M.toolDark, g); hdl.position.set(0.04, 0.08, 0.02);
  g.userData.disc = disc; return g;
}
const cutGrinder = grinder(cutDiscTex), flapGrinder = grinder(flapDiscTex);
// wire-wheel grinder: brush wheel axis along Z, motor upward
const brushTool = group();
{
  const wheel = new THREE.Group(); brushTool.add(wheel);
  const wm = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 48), new THREE.MeshStandardMaterial({ map: brushTex, metalness: 0.7, roughness: 0.5 }), wheel); wm.rotation.x = Math.PI / 2;
  const gh = mesh(new THREE.BoxGeometry(0.055, 0.05, 0.05), M.toolDark, brushTool); gh.position.set(0, 0, 0.045);
  const body = mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.21, 32), M.toolBody, brushTool); body.position.set(0, 0.11, 0.045); body.rotation.z = -0.5;
  brushTool.userData.wheel = wheel;
}
// cordless drill, bit tip at group origin pointing -Y
const drill = group();
{
  const spin = new THREE.Group(); drill.add(spin);
  const bit = mesh(new THREE.CylinderGeometry(0.00425, 0.00425, 0.09, 16), new THREE.MeshStandardMaterial({ map: bitTex, metalness: 0.9, roughness: 0.3 }), spin); bit.position.y = 0.045;
  mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.05, 24), M.toolDark, spin).position.y = 0.115;
  const body = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.15, 24), M.toolBody, drill); body.position.y = 0.215;
  const hdl = mesh(new THREE.BoxGeometry(0.035, 0.03, 0.13), M.toolDark, drill); hdl.position.set(0, 0.22, 0.09);
  const bat = mesh(new THREE.BoxGeometry(0.07, 0.06, 0.09), M.toolDark, drill); bat.position.set(0, 0.22, 0.18);
  drill.userData.spin = spin;
}
// swarf helix
class Helix extends THREE.Curve { getPoint(u, o = new THREE.Vector3()) { const a = u * Math.PI * 7, r = 0.0055 + 0.006 * u; return o.set(Math.cos(a) * r, 0.002 + u * 0.034, Math.sin(a) * r); } }
const swarfGeo = new THREE.TubeGeometry(new Helix(), 220, 0.0009, 6, false);
const swarf = mesh(swarfGeo, M.bearing);
// spanner: ring centre at pivot
const spannerPiv = group(); const spanner = mesh(G.spanner, M.toolSteel, spannerPiv); spanner.position.set(0.078, 0, 0);
// tape measure
const tapeG = group(); const tapeCase = mesh(new THREE.BoxGeometry(0.07, 0.07, 0.035), M.yellow, tapeG); tapeCase.position.set(-0.035, 0.035, 0);
const tapeBlade = mesh(new THREE.BoxGeometry(1, 0.0008, 0.019), M.tape, tapeG);
const marker = group(); { const m = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 16), M.marker, marker); m.position.y = 0.065; const tip = mesh(new THREE.ConeGeometry(0.008, 0.015, 16), M.cloth, marker); tip.rotation.x = Math.PI; tip.position.y = -0.007; }
const markLines = [0, 1, 2].map(() => mesh(new THREE.BoxGeometry(0.0015, 0.0006, 0.04), M.markLine, scene, false));
const kerf = mesh(new THREE.BoxGeometry(0.0022, 1, 0.0402), M.kerf, scene, false);
const burrs = [0, 1, 2, 3].map(() => mesh(new THREE.BoxGeometry(0.003, 0.0025, 0.04), M.machined, scene, false));
const cloth = mesh(new THREE.BoxGeometry(0.12, 0.02, 0.09), M.cloth);
const sprayGun = group();
{ mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.09, 24), M.toolSteel, sprayGun).position.set(0, 0.12, 0); const b = mesh(new THREE.BoxGeometry(0.04, 0.05, 0.14), M.toolDark, sprayGun); b.position.set(0, 0.05, 0.04); const n = mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.03, 12), M.toolSteel, sprayGun); n.position.set(0, 0.02, -0.04); n.rotation.x = 0.6; const h = mesh(new THREE.BoxGeometry(0.03, 0.12, 0.03), M.toolDark, sprayGun); h.position.set(0, -0.02, 0.09); }
// hole plugs (cover pre-modelled holes until drilled)
const plugMat = steelMat(1.3, 1);
const plugXs = [-0.725, 0.725, -0.6875, -0.5925, 0.5925, 0.6875, -0.5, 0, 0.5];
const plugs = plugXs.map((x) => { const p = mesh(new THREE.BoxGeometry(0.0095, 0.0004, 0.0095), plugMat, scene, false); p.userData.x = x; return p; });
const sidePlugs = [-0.665, -0.615].map((x) => { const p = mesh(new THREE.BoxGeometry(0.0095, 0.0095, 0.0004), plugMat, scene, false); p.userData.x = x; return p; });

// ---------------------------------------------------------------- particles (sparks / mist / dust)
function particleSystem(n, additive, size) {
  const segPos = new Float32Array(n * 6), segCol = new Float32Array(n * 6);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(segPos, 3)); g.setAttribute("color", new THREE.BufferAttribute(segCol, 3));
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false }));
  lines.frustumCulled = false; scene.add(lines); all.push(lines);
  const pp = new Float32Array(n * 3), pc = new Float32Array(n * 3);
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pp, 3)); pg.setAttribute("color", new THREE.BufferAttribute(pc, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: additive ? 1 : 0.55, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, sizeAttenuation: true }));
  pts.frustumCulled = false; scene.add(pts); all.push(pts);
  return { n, lines, pts, segPos, segCol, pp, pc };
}
const sparks = particleSystem(420, true, 0.006);
const mist = particleSystem(500, false, 0.02);
const dust = particleSystem(160, false, 0.007);
/* emit(ps, t, opts): opts = {t0,t1, origin(fn of birth), dir:[x,y,z], spread, speed, life, grav, hot:true|colour, streak} */
function emit(ps, t, o) {
  let lit = 0;
  for (let i = 0; i < ps.n; i++) {
    const life = o.life * (0.55 + 0.9 * hash(i * 3.1 + o.seed));
    const off = hash(i * 7.7 + o.seed) * life;
    const cyc = Math.floor((t + off) / life), age = t + off - cyc * life, birth = t - age;
    const k = i * 6, kp = i * 3;
    let on = birth >= o.t0 && birth <= o.t1 && hash(i * 1.3 + cyc * 9.1) < (o.density ?? 1);
    if (!on) { for (let j = 0; j < 6; j++) { ps.segPos[k + j] = 0; ps.segCol[k + j] = 0; } ps.pp[kp] = ps.pp[kp + 1] = ps.pp[kp + 2] = 0; ps.pc[kp] = ps.pc[kp + 1] = ps.pc[kp + 2] = 0; continue; }
    const r1 = hash(i * 1.7 + cyc * 3.3 + o.seed), r2 = hash(i * 2.9 + cyc * 5.1 + o.seed), r3 = hash(i * 4.3 + cyc * 7.9 + o.seed);
    const d = V(o.dir[0] + (r1 - 0.5) * o.spread, o.dir[1] + (r2 - 0.5) * o.spread, o.dir[2] + (r3 - 0.5) * o.spread).normalize();
    const sp = o.speed * (0.5 + r2);
    const org = o.origin(birth);
    const g = o.grav;
    const px = org.x + d.x * sp * age, py = org.y + d.y * sp * age - 0.5 * g * age * age, pz = org.z + d.z * sp * age;
    const vx = d.x * sp, vy = d.y * sp - g * age, vz = d.z * sp;
    const st = o.streak ?? 0.02;
    if (py < 0.002) { for (let j = 0; j < 6; j++) { ps.segPos[k + j] = 0; ps.segCol[k + j] = 0; } ps.pp[kp] = ps.pp[kp + 1] = ps.pp[kp + 2] = 0; ps.pc[kp] = ps.pc[kp + 1] = ps.pc[kp + 2] = 0; continue; }
    ps.segPos.set([px, py, pz, px - vx * st, py - vy * st, pz - vz * st], k);
    const f = age / life; let c;
    if (o.hot) { const fade = 1 - f; c = [1.0 * fade + 0.2, (0.85 - 0.6 * f) * fade, (0.45 - 0.45 * f) * fade * fade]; }
    else { const a = 1 - f * 0.8; c = [o.col[0] * a, o.col[1] * a, o.col[2] * a]; }
    ps.segCol.set([...c, c[0] * 0.3, c[1] * 0.3, c[2] * 0.3], k);
    ps.pp.set([px, py, pz], kp); ps.pc.set(c, kp); lit++;
  }
  ps.lines.geometry.attributes.position.needsUpdate = ps.lines.geometry.attributes.color.needsUpdate = true;
  ps.pts.geometry.attributes.position.needsUpdate = ps.pts.geometry.attributes.color.needsUpdate = true;
  ps.lines.visible = ps.pts.visible = true;
  return lit;
}

// ---------------------------------------------------------------- final assembly placement
const HOME = {
  railA: [V(0, 0.08, 0.23)], railB: [V(0, 0.08, -0.23)],
  crossF: [V(-0.725, 0.04, 0)], crossR: [V(0.725, 0.04, 0)],
  bearerA: [V(0, 0.12, 0.23)], bearerB: [V(0, 0.12, -0.23)],
  plateA: [V(-0.64, 0.125, 0.253)], plateB: [V(-0.64, 0.125, -0.253)],
};
const POSTZ = 0.2685, PIVY = 0.14;
function placeHome(m, name) { m.position.copy(HOME[name][0]); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.visible = true; }
function setupPosts() {
  postPivA.position.set(-0.64, PIVY, POSTZ); postPivB.position.set(-0.64, PIVY, -POSTZ);
  for (const p of [postA, postB]) { p.position.set(0, 0.583 - PIVY, 0); p.rotation.set(0, 0, Math.PI / 2); p.visible = true; }
}
function show(o, v = true) { o.traverse((c) => (c.visible = v)); return o; }
function homeAt(o, off = null) { o.position.copy(o.userData.home); if (off) o.position.add(off); o.traverse((c) => (c.visible = true)); }
function boltState(rec, p, spin = 0) {
  // p: 0 hidden, (0..1) drop-in, 1 seated ; nut/washer under-side follows
  if (p <= 0) { rec.g.visible = false; return; }
  rec.g.visible = true; rec.g.children.forEach((c) => (c.visible = true));
  const drop = 1 - eout(clamp(p * 1.25));
  rec.b.position.y = 0.0016 + drop * 0.16; rec.w1.position.y = -0.0008 + drop * 0.05;
  const np = clamp((p - 0.55) / 0.45);
  rec.n.position.y = -rec.stack - 0.0016 - 0.00325 - (1 - eout(np)) * 0.05; rec.w2.position.y = -rec.stack - 0.0008 - (1 - eout(np)) * 0.04;
  rec.n.visible = rec.w2.visible = np > 0;
  rec.n.rotation.y = (1 - np) * 9 + spin; rec.b.rotation.y = spin;
}
function assembled(level, t) {
  // level: 1 base, 2 rollers, 3 deck, 4 belt, 5 uprights, 6 decals
  for (const p of pads) homeAt(p);
  placeHome(crossF, "crossF"); placeHome(crossR, "crossR"); crossF.rotation.y = crossR.rotation.y = Math.PI / 2;
  placeHome(railA, "railA"); placeHome(railB, "railB");
  BOLTS.filter((b) => b.group === "lap").forEach((b) => boltState(b, 1));
  if (level >= 2) { PB.forEach((g) => homeAt(g)); homeAt(rollF); homeAt(rollR); BOLTS.filter((b) => b.group === "pillow").forEach((b) => boltState(b, 1)); }
  if (level >= 3) { placeHome(bearerA, "bearerA"); placeHome(bearerB, "bearerB"); homeAt(deck); BOLTS.filter((b) => b.group === "bearer").forEach((b) => boltState(b, 1)); }
  if (level >= 4) { homeAt(belt); belt.geometry.setDrawRange(0, Infinity); setBeltSag(0); }
  if (level >= 5) {
    placeHome(plateA, "plateA"); placeHome(plateB, "plateB"); setupPosts(); postPivA.visible = postPivB.visible = true;
    postPivA.rotation.set(0, 0, 0); postPivB.rotation.set(0, 0, 0);
    crossbar.position.set(-0.665, 1.0405, 0); crossbar.rotation.set(0, Math.PI / 2, 0); crossbar.visible = true;
    grips.forEach((g) => homeAt(g)); homeAt(consoleG);
    BOLTS.filter((b) => ["plate", "post", "crossbar"].includes(b.group)).forEach((b) => boltState(b, 1));
  }
  if (level >= 6) decals.forEach((d) => { homeAt(d); d.material.opacity = 1; });
  for (const m of members) setStage(m.material, 3, 3, -9, 1);
}
function runBelt(t, v) {
  const d = v * t; beltTex.offset.x = -d / BTILE;
  rollF.userData.spin.rotation.z = -d / 0.02415; rollR.userData.spin.rotation.z = -d / 0.02415;
}

// ---------------------------------------------------------------- camera
function camLook(p, tgt, fov = 32) { camera.position.copy(p); camera.lookAt(tgt); if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); } camera.updateMatrixWorld(true); }
// keys: [time, [px,py,pz], [tx,ty,tz], fov?]; Catmull-Rom through keys, eased per span
function camKeys(t, keys) {
  if (t <= keys[0][0]) return camLook(V(...keys[0][1]), V(...keys[0][2]), keys[0][3] || 32);
  const n = keys.length; if (t >= keys[n - 1][0]) return camLook(V(...keys[n - 1][1]), V(...keys[n - 1][2]), keys[n - 1][3] || 32);
  let i = 0; while (t > keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const u = eio((t - k1[0]) / (k2[0] - k1[0]));
  const cr = (a, b, c, d) => { const u2 = u * u, u3 = u2 * u; return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3); };
  const p = V(0, 0, 0), q = V(0, 0, 0);
  for (const [j, ax] of [[0, "x"], [1, "y"], [2, "z"]]) { p[ax] = cr(k0[1][j], k1[1][j], k2[1][j], k3[1][j]); q[ax] = cr(k0[2][j], k1[2][j], k2[2][j], k3[2][j]); }
  camLook(p, q, lerp(k1[3] || 32, k2[3] || 32, u));
}
function orbit(t, c, r, h, a0, a1, d, fov = 32, ty = null) {
  const a = lerp(a0, a1, eio(clamp(t / d)));
  camLook(V(c[0] + Math.cos(a) * r, h, c[2] + Math.sin(a) * r), V(c[0], ty ?? c[1], c[2]), fov);
}

// ---------------------------------------------------------------- 2D overlay (projected labels / dimension lines)
const svg = document.getElementById("svg3d");
const labelLayer = document.getElementById("labels3d");
const LBL = {};
function lbl(id, text, sub) {
  if (!LBL[id]) {
    const d = document.createElement("div"); d.className = "l3"; d.innerHTML = `<b>${text}</b>${sub ? `<span>${sub}</span>` : ""}`; labelLayer.appendChild(d);
    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line"); ln.setAttribute("class", "lead"); svg.appendChild(ln);
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot.setAttribute("r", "5"); dot.setAttribute("class", "dot"); svg.appendChild(dot);
    LBL[id] = { d, ln, dot, used: false };
  }
  return LBL[id];
}
const DIM = {};
function dimEl(id) {
  if (!DIM[id]) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.setAttribute("class", "dim");
    g.innerHTML = `<line class="dl"/><line class="e1"/><line class="e2"/><polygon class="a1"/><polygon class="a2"/>`;
    svg.appendChild(g); const tx = document.createElement("div"); tx.className = "dimtxt"; labelLayer.appendChild(tx);
    DIM[id] = { g, tx, used: false };
  }
  return DIM[id];
}
function proj(v) { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }
function showLabel(id, text, sub, anchor, dx, dy, op) {
  const L = lbl(id, text, sub); L.used = true;
  const [x, y, z] = proj(anchor); const vis = z < 1 && op > 0.01;
  const lx = x + dx, ly = y + dy;
  L.d.style.opacity = vis ? op : 0; L.d.style.transform = `translate(${lx}px, ${ly}px) translate(${dx < 0 ? "-100%" : "0"}, -50%)`;
  L.ln.setAttribute("x1", x); L.ln.setAttribute("y1", y); L.ln.setAttribute("x2", lx); L.ln.setAttribute("y2", ly); L.ln.style.opacity = vis ? op : 0;
  L.dot.setAttribute("cx", x); L.dot.setAttribute("cy", y); L.dot.style.opacity = vis ? op : 0;
}
function showDim(id, a, b, offDir, text, op, grow = 1) {
  const D = dimEl(id); D.used = true;
  const pa = proj(a), pb = proj(b);
  const bb = [lerp(pa[0], pb[0], grow), lerp(pa[1], pb[1], grow)];
  const [ox, oy] = offDir;
  const A = [pa[0] + ox, pa[1] + oy], B = [bb[0] + ox, bb[1] + oy];
  const q = D.g.children;
  const set = (el, at) => Object.entries(at).forEach(([k, v]) => el.setAttribute(k, v));
  set(q[0], { x1: A[0], y1: A[1], x2: B[0], y2: B[1] });
  set(q[1], { x1: pa[0], y1: pa[1], x2: A[0] + ox * 0.25, y2: A[1] + oy * 0.25 });
  set(q[2], { x1: bb[0], y1: bb[1], x2: B[0] + ox * 0.25, y2: B[1] + oy * 0.25 });
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const arrow = (P, s) => { const c = Math.cos(ang) * s, si = Math.sin(ang) * s; return `${P[0]},${P[1]} ${P[0] + c * 16 - si * 6},${P[1] + si * 16 + c * 6} ${P[0] + c * 16 + si * 6},${P[1] + si * 16 - c * 6}`; };
  set(q[3], { points: arrow(A, 1) }); set(q[4], { points: arrow(B, -1) });
  D.g.style.opacity = op;
  D.tx.textContent = text; D.tx.style.opacity = op * clamp((grow - 0.6) / 0.4);
  D.tx.style.transform = `translate(${(A[0] + B[0]) / 2}px, ${(A[1] + B[1]) / 2 - 26}px) translate(-50%, -50%)`;
}
function clearOverlay() {
  for (const L of Object.values(LBL)) { if (!L.used) { L.d.style.opacity = 0; L.ln.style.opacity = 0; L.dot.style.opacity = 0; } L.used = false; }
  for (const D of Object.values(DIM)) { if (!D.used) { D.g.style.opacity = 0; D.tx.style.opacity = 0; } D.used = false; }
}
const fadeIO = (lt, a, b, f = 0.5) => clamp(Math.min((lt - a) / f, (b - lt) / f));

// ---------------------------------------------------------------- reset
function resetAll() {
  for (const o of all) o.visible = false;
  for (const m of steelMeshes) { m.rotation.set(0, 0, 0); m.scale.x = m === heroRaw ? 1.2 : m === offcut ? 0.2 : 1; setStage(m.material, 3, 3, -9, 1); }
  sparkLight.intensity = 0;
  floor.visible = true;
  key.position.set(2.2, 4.0, 2.6); key.intensity = 2.4; hemi.intensity = 0.55;
  belt.geometry.setDrawRange(0, Infinity);
  for (const r of [rollF, rollR]) r.userData.spin.rotation.set(0, 0, 0);
  beltTex.offset.x = 0;
  for (const d of decals) d.material.opacity = 1;
}

// ---------------------------------------------------------------- segment directors
const SEG = {};

SEG.title = (lt, d) => {
  assembled(6, lt); runBelt(lt, 0.25); drawScreen(0);
  key.intensity = 1.4; hemi.intensity = 0.25;
  orbit(lt, [0, 0.45, 0], 2.9, 1.15, 2.2, 2.9, d, 30, 0.42);
};
SEG.blueprint = (lt, d) => {
  assembled(6, 0); hemi.intensity = 0.1; key.intensity = 0.4;
  orbit(lt, [0, 0.45, 0], 3.4, 1.3, 2.9, 3.2, d, 30, 0.4);
};
SEG.materials = (lt, d) => {
  pile.visible = true; pile.traverse((o) => (o.visible = true)); pileLayout();
  pileTubes.forEach((m) => setStage(m.material, 0, 0, -9, 0)); setStage(pipeRaw.material, 0, 0, -9, 0);
  camKeys(lt, [[0, [3.2, 2.2, 2.6], [0.1, 0.1, 0.0], 32], [9, [1.8, 1.5, 2.8], [0.1, 0.1, 0.1], 32], [16, [-1.6, 1.6, 2.7], [0.1, 0.1, 0.0], 32], [22, [-2.9, 2.0, 1.0], [0.1, 0.1, 0.0], 32]]);
  const L = [["t40", "Reclaimed mild steel tube", "40 × 40 × 3 mm SHS", V(0.0, 0.12, -0.55), -60, -80, 1.5],
    ["t25", "Reclaimed mild steel tube", "25 × 25 × 2 mm SHS", V(-0.4, 0.03, -0.32), -120, 40, 3.0],
    ["belt", "Waste conveyor belt", "rubber, ≈ 7 mm", V(0.72, 0.32, 0.12), 60, -70, 4.5],
    ["mdf", "MDF deck board", "1200 × 460 × 18 mm", V(-0.3, 0.05, 0.25), 60, 70, 6.0],
    ["pipe", "Steel pipe for rollers", "Ø48.3 mm", V(-0.7, 0.05, 0.62), -60, 60, 7.5],
    ["pb", "Pillow-block bearings", "×4", V(0.28, 0.07, 0.62), 40, 80, 9.0],
    ["bolts", "M8 bolts, nuts, washers", "zinc-plated", V(0.95, 0.12, 0.62), 60, -50, 10.5]];
  for (const [id, a, b, p, dx, dy, t0] of L) showLabel("m_" + id, a, b, p, dx, dy, fadeIO(lt, t0, d - 0.4));
};
function benchScene() { bench.visible = true; bench.traverse((o) => (o.visible = true)); }
SEG.measure = (lt, d) => {
  benchScene(); show(heroRaw).position.set(0.15, BENCH_Y, 0); setStage(heroRaw.material, 0, 0, -9, 0);
  const ext = eio(S(1.0, 5.0, lt)) * 1.5;
  tapeG.visible = true; tapeG.traverse((o) => (o.visible = true)); tapeG.position.set(-0.75, BENCH_Y + 0.02, 0.0); tapeCase.position.set(-0.035, 0.0, 0.0);
  tapeBlade.scale.x = Math.max(ext, 0.001); tapeBlade.position.set(ext / 2, 0.0006, 0);
  const mk = S(5.4, 6.6, lt);
  marker.visible = mk > 0 && lt < 8.0; marker.traverse((o) => (o.visible = marker.visible));
  marker.position.set(0.75, BENCH_Y + 0.02 + 0.03 * (1 - Math.sin(Math.PI * mk)), (mk - 0.5) * 0.04); marker.rotation.set(0.35, 0, -0.25);
  markLines[0].visible = mk > 0.1; markLines[0].scale.z = clamp(mk * 1.2); markLines[0].position.set(0.75, BENCH_Y + 0.0203, 0);
  camKeys(lt, [[0, [-0.4, 1.75, 1.9], [0.1, 0.88, 0], 34], [5.0, [0.1, 1.7, 1.85], [0.15, 0.88, 0], 34], [7.5, [1.05, 1.1, 0.42], [0.75, 0.9, 0], 30], [11, [1.0, 1.12, 0.45], [0.73, 0.9, 0], 30], [16, [0.2, 1.6, 1.6], [0.1, 0.88, 0], 34]]);
  if (lt > 1.0) showDim("d1500", V(-0.75, BENCH_Y + 0.02, 0.02), V(0.75, BENCH_Y + 0.02, 0.02), [0, -70], "1 500 mm", fadeIO(lt, 1.0, 6.6), S(1.0, 5.0, lt));
  showLabel("mk", "Scribe / marker line", "cut mark at 1 500 mm", V(0.75, BENCH_Y + 0.021, 0.0), -70, -90, fadeIO(lt, 7.6, 11.5));
  showLabel("cl", "Also marked", "cross members 500 · uprights 940 · bearers 1 100 · handrail 600", V(0.0, BENCH_Y + 0.02, 0), -40, 110, fadeIO(lt, 12.0, d - 0.3));
};
SEG.cut = (lt, d) => {
  benchScene(); setStage(heroRaw.material, 0); setStage(offcut.material, 0);
  const cutP = S(2.5, 8.0, lt); // cutting progress
  const drop = S(8.2, 9.6, lt);
  if (cutP < 1) { show(heroRaw).position.set(0.15, BENCH_Y, 0); }
  else { show(railRaw).position.set(0, BENCH_Y, 0); setStage(railRaw.material, 0); show(offcut).position.set(0.9 + drop * 0.25, BENCH_Y - drop * drop * 0.86 + 0.02 * Math.sin(drop * 3), 0); offcut.rotation.set(0, drop * 0.5, -drop * 1.3); }
  markLines[0].visible = cutP < 0.98; markLines[0].position.set(0.75, BENCH_Y + 0.0203, 0);
  kerf.visible = cutP > 0 && cutP < 1; kerf.scale.y = 0.0402 * cutP; kerf.position.set(0.75, BENCH_Y + 0.0201 - 0.0402 * cutP / 2, 0);
  const g = cutGrinder; g.visible = true; g.traverse((o) => (o.visible = true));
  const approach = eout(S(0.3, 2.5, lt)), retreat = eio(S(8.0, 9.5, lt));
  const yc = BENCH_Y + 0.11 - 0.105 * cutP;
  g.position.set(0.75 - 0.0, lerp(BENCH_Y + 0.4, yc, approach) + retreat * 0.35, lerp(0.3, 0, approach) + retreat * 0.25);
  g.rotation.set(-0.25, 0, 0);
  g.userData.disc.rotation.x = lt * 70;
  const on = lt > 2.5 && lt < 8.0;
  const contact = () => V(0.75, BENCH_Y + 0.02 - 0.04 * cutP, 0.02);
  emit(sparks, lt, { t0: 2.5, t1: 8.0, origin: contact, dir: [0.0, -0.6, 1.0], spread: 0.7, speed: 3.2, life: 0.45, grav: 9.8, hot: true, seed: 1.0, streak: 0.018 });
  sparkLight.intensity = on ? 1.6 + 0.6 * Math.sin(lt * 37) : 0; sparkLight.position.copy(contact()).add(V(0, 0.04, -0.06));
  camKeys(lt, [[0, [1.35, 1.2, -0.85], [0.75, 0.9, 0], 32], [6, [1.15, 1.05, -0.6], [0.75, 0.88, 0.0], 28], [10, [1.55, 1.1, -0.6], [0.85, 0.7, 0], 32], [14, [0.9, 1.5, -1.5], [0.3, 0.85, 0], 34]]);
  showLabel("tool_cut", "Angle grinder", "Ø115 × 1.0 mm cutting disc", V(0.79, BENCH_Y + 0.16, 0.0), 90, -60, fadeIO(lt, 1.0, 7.5));
  showLabel("cutlist", "Cut list", "2 × 1500 · 2 × 1100 · 2 × 500 (40 SHS) · 2 × 940 · 1 × 600 (25 SHS)", V(0.3, BENCH_Y + 0.02, 0), -40, 120, fadeIO(lt, 10.0, d - 0.3));
};
SEG.deburr = (lt, d) => {
  benchScene(); show(railRaw).position.set(0, BENCH_Y, 0); setStage(railRaw.material, 0);
  const burrK = 1 - S(3.0, 8.5, lt);
  burrs.forEach((b, i) => { b.visible = burrK > 0.02; b.scale.set(1, burrK, 1); const a = i * Math.PI / 2; b.position.set(0.7515, BENCH_Y + Math.sin(a) * 0.0205, Math.cos(a) * 0.0205); b.rotation.x = a; });
  const g = flapGrinder; g.visible = true; g.traverse((o) => (o.visible = true));
  const app = eout(S(0.3, 2.5, lt)), ret = eio(S(9.0, 10.5, lt));
  const wob = Math.sin(lt * 6.0) * 0.012, wob2 = Math.cos(lt * 4.3) * 0.01;
  g.position.set(lerp(1.05, 0.758, app) + ret * 0.3, BENCH_Y + 0.02 + wob, lerp(0.2, 0.03, app) + wob2 + ret * 0.2);
  g.rotation.set(0, 0, 0);
  g.userData.disc.rotation.x = lt * 70;
  emit(sparks, lt, { t0: 2.5, t1: 9.0, origin: () => V(0.752, BENCH_Y + wob, 0.0 + wob2), dir: [0.3, -0.5, -1.0], spread: 0.9, speed: 2.4, life: 0.35, grav: 9.8, hot: true, seed: 2.0, density: 0.7 });
  sparkLight.intensity = lt > 2.5 && lt < 9 ? 1.2 + 0.5 * Math.sin(lt * 31) : 0; sparkLight.position.set(0.8, BENCH_Y + 0.05, -0.05);
  camKeys(lt, [[0, [1.3, 1.05, 0.55], [0.75, 0.88, 0], 30], [6, [1.15, 1.0, 0.35], [0.76, 0.88, 0], 26], [13, [1.2, 1.15, 0.7], [0.65, 0.88, 0], 30]]);
  showLabel("tool_flap", "Angle grinder", "flap disc — deburr cut ends", V(0.80, BENCH_Y + 0.07, 0.1), 80, -70, fadeIO(lt, 1.0, 9.5));
};
SEG.rust = (lt, d) => {
  benchScene(); show(railRaw).position.set(0, BENCH_Y, 0);
  const p = eio(S(1.5, 12.0, lt)); const bx = lerp(-0.8, 0.8, p);
  setStage(railRaw.material, 0, 1.0, bx, 0);
  const b = brushTool; b.visible = true; b.traverse((o) => (o.visible = true));
  const on = lt > 1.2 && lt < 12.3;
  b.position.set(bx + 0.01, BENCH_Y + 0.02 + 0.05 + (on ? 0 : 0.08), 0.0); b.userData.wheel.rotation.z = -lt * 60;
  emit(sparks, lt, { t0: 1.5, t1: 12.0, origin: (bt) => V(lerp(-0.8, 0.8, eio(S(1.5, 12, bt))), BENCH_Y + 0.021, 0), dir: [-1, 0.25, 0.3], spread: 1.2, speed: 1.6, life: 0.3, grav: 9.8, hot: true, seed: 3.0, density: 0.3 });
  emit(dust, lt, { t0: 1.5, t1: 12.0, origin: (bt) => V(lerp(-0.8, 0.8, eio(S(1.5, 12, bt))), BENCH_Y + 0.025, 0), dir: [-1, 0.5, 0], spread: 1.5, speed: 0.5, life: 0.9, grav: 0.3, col: [0.35, 0.18, 0.08], seed: 4.0 });
  const cx = lerp(-0.6, 0.6, p);
  const wide = sm(S(12.3, 14.5, lt)) + (1 - sm(S(0.0, 1.8, lt)));
  const fx = clamp(bx, -0.75, 0.75);
  camLook(V(lerp(fx - 0.15, 0.2, wide), lerp(1.13, 1.55, wide), lerp(0.62, 1.55, wide)), V(lerp(fx + 0.05, 0.0, wide), 0.88, 0), 30);
  showLabel("tool_wire", "Wire-brush wheel", "removes rust and mill scale", V(bx, BENCH_Y + 0.12, 0), 70, -90, fadeIO(lt, 1.5, 11.5));
  void cx;
};
SEG.drill = (lt, d) => {
  benchScene(); show(railA).position.set(0, BENCH_Y, 0); setStage(railA.material, 1, 1, -9, 0);
  const holes = [0.5, 0.0, -0.5];
  const T = [[0.6, 3.8], [4.2, 7.0], [7.4, 10.0]];
  let hx = 0.5, depth = 0, active = -1, hover = 1;
  for (let i = 0; i < 3; i++) { if (lt >= T[i][0] - 0.6) { hx = holes[i]; active = i; const k = S(T[i][0] + 0.5, T[i][1] - 0.5, lt); depth = k; hover = 1 - S(T[i][0] - 0.6, T[i][0] + 0.5, lt) + S(T[i][1] - 0.5, T[i][1], lt); } }
  const allOpen = lt > 10.6;
  plugs.forEach((p) => { const drilled = allOpen || holes.some((h, i) => Math.abs(h - p.userData.x) < 1e-6 && lt > T[i][0] + 0.9); p.visible = !drilled; p.position.set(p.userData.x, BENCH_Y + 0.0203, 0); });
  sidePlugs.forEach((p) => { p.visible = !allOpen; p.position.set(p.userData.x, BENCH_Y, 0.0203); });
  const dr = drill; dr.visible = lt < 10.6; dr.traverse((o) => (o.visible = dr.visible));
  const yTop = BENCH_Y + 0.02;
  dr.position.set(hx, yTop + 0.005 + hover * 0.08 - depth * 0.03, 0); dr.userData.spin.rotation.y = lt * 40;
  swarf.visible = active >= 0 && depth > 0.02 && lt < 10.6; swarf.position.set(hx, yTop - 0.002, 0); swarf.rotation.y = lt * 40; swarfGeo.setDrawRange(0, Math.floor(swarfGeo.index.count * clamp(depth) / 6) * 6);
  camKeys(lt, [[0, [0.82, 1.08, 0.3], [0.5, 0.9, 0], 28], [3.9, [0.82, 1.08, 0.3], [0.48, 0.9, 0], 26], [5.5, [0.25, 1.08, 0.33], [0.0, 0.9, 0], 26], [8.5, [-0.25, 1.08, 0.33], [-0.5, 0.9, 0], 26], [11, [-0.2, 1.35, 0.8], [-0.2, 0.88, 0], 32], [16, [0.6, 1.35, 0.9], [0.2, 0.88, 0], 34]]);
  showLabel("tool_drill", "Drill Ø8.5 mm", "M8 clearance (ISO 273)", V(hx, yTop + 0.09, 0), 80, -80, fadeIO(lt, 0.8, 10.2));
  showLabel("holes", "Bolt holes at every joint", "no welding — 100 % bolted", V(-0.5, yTop, 0), -40, 90, fadeIO(lt, 11.0, d - 0.3));
};
const KIT = [[railA, 0, -0.52, 0.02], [railB, 0, -0.43, 0.02], [bearerA, 0, -0.33, 0.02], [bearerB, 0, -0.24, 0.02], [crossF, 0, -0.14, 0.02], [crossR, 0, -0.05, 0.02], [postA, 0, 0.05, 0.0125], [postB, 0, 0.13, 0.0125], [crossbar, 0, 0.21, 0.0125], [plateA, -0.06, 0.3, 0.003], [plateB, 0.06, 0.3, 0.003]];
function kitLayout() {
  rack.visible = true; rack.traverse((o) => (o.visible = true));
  for (const [m, x, z, hh] of KIT) {
    m.visible = true; if (m.parent !== scene) { scene.attach(m); }
    m.position.set(x, RACK_Y + hh, z); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1);
    if (m === plateA || m === plateB) { m.rotation.set(-Math.PI / 2, 0, 0); }
  }
  // the plates need support: lay a board under them
}
const plateBoard = mesh(new THREE.BoxGeometry(1.0, 0.012, 0.16), M.wood); plateBoard.position.set(0, RACK_Y - 0.006 + 0.0, 0.3);
function restorePosts() { if (postA.parent !== postPivA) postPivA.attach(postA); if (postB.parent !== postPivB) postPivB.attach(postB); }
SEG.kit = (lt, d) => {
  kitLayout(); show(plateBoard);
  for (const [m] of KIT) setStage(m.material, 1, 1, -9, 0);
  camKeys(lt, [[0, [1.6, 1.6, 1.3], [0, 0.75, -0.1], 32], [7, [-1.4, 1.55, 1.4], [0, 0.75, -0.1], 32]]);
  const names = [["k1", "Rails", "2 × 40×40×3 × 1500", railA, -0.7, -70, -60], ["k2", "Deck bearers", "2 × 40×40×3 × 1100", bearerA, -0.5, -70, 40], ["k3", "Cross members", "2 × 40×40×3 × 500", crossF, 0.2, 60, -90], ["k4", "Uprights", "2 × 25×25×2 × 940", postA, 0.4, 70, -50], ["k5", "Handrail", "1 × 25×25×2 × 600", crossbar, 0.25, 70, 40], ["k6", "Bracket plates", "2 × 6 mm", plateA, 0.0, -70, 70]];
  names.forEach(([id, a, b, m, ax, dx, dy], i) => showLabel(id, a, b, m.position.clone().add(V(ax, 0.02, 0)), dx, dy, fadeIO(lt, 0.3 + i * 0.35, d - 0.3)));
};
function surface(lt, d, from, to, tool, colMist) {
  kitLayout(); show(plateBoard);
  const p = eio(S(1.0, d - 2.0, lt)); const wx = lerp(-0.85, 0.85, p);
  for (const [m] of KIT) setStage(m.material, from, to, wx - m.position.x, 0);
  const zs = Math.sin(lt * 5.5) * 0.45;
  if (tool === "cloth") { show(cloth).position.set(wx + 0.03, RACK_Y + 0.03, -0.52 + 0.0 * zs); cloth.rotation.y = Math.sin(lt * 9) * 0.3; }
  else {
    sprayGun.visible = true; sprayGun.traverse((o) => (o.visible = true)); sprayGun.position.set(wx + 0.05, RACK_Y + 0.33, zs * 0.9); sprayGun.rotation.set(0, 0, 0.3);
    emit(mist, lt, { t0: 1.0, t1: d - 2.0, origin: (bt) => V(lerp(-0.85, 0.85, eio(S(1.0, d - 2.0, bt))) + 0.03, RACK_Y + 0.32, Math.sin(bt * 5.5) * 0.4), dir: [-0.1, -1, 0], spread: 0.6, speed: 0.9, life: 0.45, grav: 0.2, col: colMist, seed: 5.0 + from });
  }
  camKeys(lt, [[0, [1.9, 1.7, 1.3], [0.0, 0.75, 0], 30], [d, [-1.5, 1.65, 1.5], [0.0, 0.75, 0], 30]]);
}
SEG.degrease = (lt, d) => { surface(lt, d, 1.0, 1.5, "cloth"); showLabel("sv", "Solvent degreaser", "removes oil and dust", V(lerp(-0.85, 0.85, eio(S(1, d - 2, lt))), RACK_Y + 0.05, -0.52), 60, -90, fadeIO(lt, 1, d - 1)); };
SEG.primer = (lt, d) => { surface(lt, d, 1.5, 2.0, "gun", [0.55, 0.56, 0.55]); showLabel("pr", "Rust-inhibiting primer", "spray-applied", V(lerp(-0.85, 0.85, eio(S(1, d - 2, lt))) + 0.05, RACK_Y + 0.42, 0), 70, -80, fadeIO(lt, 1, d - 1)); };
SEG.paint = (lt, d) => { surface(lt, d, 2.0, 3.0, "gun", [0.08, 0.25, 0.65]); showLabel("pt", "Industrial top coat", "blue enamel", V(lerp(-0.85, 0.85, eio(S(1, d - 2, lt))) + 0.05, RACK_Y + 0.42, 0), 70, -80, fadeIO(lt, 1, d - 1)); };
SEG.cure = (lt, d) => {
  kitLayout(); show(plateBoard);
  const g = sm(S(1.0, d - 1.5, lt));
  for (const [m] of KIT) setStage(m.material, 3, 3, -9, g);
  const a = lerp(-0.6, 2.4, S(0.5, d - 0.5, lt));
  key.position.set(Math.cos(a) * 3.5, 3.0 + Math.sin(S(0.5, d - 0.5, lt) * Math.PI) * 1.5, Math.sin(a) * 3.5);
  key.intensity = 1.5 + 1.2 * Math.sin(S(0.5, d - 0.5, lt) * Math.PI);
  orbit(lt, [0, 0.75, -0.1], 2.1, 1.5, 0.6, 1.4, d, 30, 0.72);
};
SEG.base = (lt, d) => {
  for (const m of members) setStage(m.material, 3, 3, -9, 1);
  pads.forEach((p, i) => homeAt(p, V(0, 0, (1 - eout(S(0.3 + i * 0.4, 2.0 + i * 0.4, lt))) * (i ? 1.2 : -1.2))));
  placeHome(crossF, "crossF"); placeHome(crossR, "crossR"); crossF.rotation.y = crossR.rotation.y = Math.PI / 2;
  crossF.position.y += (1 - eout(S(2.5, 4.5, lt))) * 0.5; crossR.position.y += (1 - eout(S(3.0, 5.0, lt))) * 0.5;
  placeHome(railA, "railA"); placeHome(railB, "railB");
  railA.position.y += (1 - eout(S(5.0, 7.5, lt))) * 0.6; railB.position.y += (1 - eout(S(5.6, 8.1, lt))) * 0.6;
  const lap = BOLTS.filter((b) => b.group === "lap");
  // hero corner = front, +z (index 1)
  const hero = lap[1];
  const tighten = S(15.0, 20.0, lt);
  const swing = (x) => { const c = x * 4; const f = c - Math.floor(c); return Math.floor(c) * 1.05 + (f < 0.6 ? f / 0.6 : 1 - (f - 0.6) / 0.4) * 1.05; };
  boltState(hero, S(9.0, 14.5, lt), swing(tighten) * 0.55);
  [lap[0], lap[2], lap[3]].forEach((b, i) => boltState(b, S(20.5 + i * 0.8, 23.0 + i * 0.8, lt)));
  const sp = spannerPiv; sp.visible = spanner.visible = lt > 14.6 && lt < 20.4;
  const a = tighten < 1 ? (() => { const c = tighten * 4; const f = c - Math.floor(c); return f < 0.6 ? f / 0.6 : 1 - (f - 0.6) / 0.4; })() : 0;
  sp.position.set(-0.725, 0.10 + 0.0016 + 0.0026, 0.23); sp.rotation.set(0, 0.9 - a * 1.05, 0);
  camKeys(lt, [[0, [2.2, 1.6, 2.2], [0, 0.05, 0], 32], [8.5, [1.4, 1.2, 1.9], [-0.2, 0.06, 0.05], 32], [11.5, [-0.45, 0.42, 0.62], [-0.725, 0.08, 0.23], 30], [19.5, [-0.5, 0.36, 0.55], [-0.725, 0.08, 0.23], 28], [23, [-1.3, 1.1, 1.6], [-0.1, 0.05, 0], 32], [30, [1.6, 1.5, 1.9], [0, 0.05, 0], 32]]);
  showLabel("lapb", "M8 × 100 hex bolt", "ISO 4017 · washers both sides", V(-0.725, 0.11, 0.23), 70, -90, fadeIO(lt, 10.0, 15.0));
  showLabel("span", "13 mm spanner", "hand-tight, then torque", V(-0.66, 0.104, 0.27), 80, -40, fadeIO(lt, 15.2, 20.3));
  showLabel("dfd", "Lap joint — bolted", "Design for Disassembly", V(0.725, 0.1, -0.23), 50, -110, fadeIO(lt, 23.5, d - 0.3));
};
SEG.rollers = (lt, d) => {
  assembled(1, lt);
  PB.forEach((g, i) => homeAt(g, V(0, (1 - eout(S(0.5 + i * 0.5, 2.5 + i * 0.5, lt))) * 0.45, 0)));
  BOLTS.filter((b) => b.group === "pillow").forEach((b, i) => boltState(b, S(4.0 + i * 0.35, 6.0 + i * 0.35, lt)));
  homeAt(rollF, V(0, (1 - eout(S(8.5, 11.0, lt))) * 0.45, 0)); homeAt(rollR, V(0, (1 - eout(S(10.0, 12.5, lt))) * 0.45, 0));
  rollF.visible = lt > 8.4; rollR.visible = lt > 9.9;
  const flick = (t0) => { const tt = Math.max(0, lt - t0); return 28 / 1.1 * (1 - Math.exp(-1.1 * tt)); };
  rollF.userData.spin.rotation.z = -flick(14.0); rollR.userData.spin.rotation.z = -flick(16.5);
  camKeys(lt, [[0, [1.9, 1.3, 1.8], [0, 0.1, 0], 32], [8, [1.6, 1.0, 1.4], [0.1, 0.1, 0], 32], [13, [-0.25, 0.42, 0.55], [-0.64, 0.13, 0.05], 30], [16, [-0.3, 0.38, 0.5], [-0.64, 0.13, 0.1], 28], [18.5, [1.0, 0.45, 0.6], [0.64, 0.13, 0.1], 28], [22, [1.7, 1.2, 1.6], [0.1, 0.1, 0], 32]]);
  showLabel("pbl", "Pillow-block bearing", "6204-2RS sealed (per drawing)", V(-0.64, 0.17, 0.23), 70, -90, fadeIO(lt, 2.5, 8.0));
  showLabel("rl", "Steel roller", "Ø48.3 pipe drum, Ø20 shaft", V(-0.64, 0.16, 0.0), -70, -100, fadeIO(lt, 11.0, 15.0));
  showLabel("spin", "Spins freely", "witness mark shows rotation", V(0.64, 0.16, 0.12), 70, -90, fadeIO(lt, 16.5, 21.5));
};
SEG.deck = (lt, d) => {
  assembled(2, lt);
  placeHome(bearerA, "bearerA"); placeHome(bearerB, "bearerB");
  bearerA.position.y += (1 - eout(S(0.5, 3.0, lt))) * 0.5; bearerB.position.y += (1 - eout(S(1.0, 3.5, lt))) * 0.5;
  BOLTS.filter((b) => b.group === "bearer").forEach((b, i) => boltState(b, S(3.8 + i * 0.3, 5.6 + i * 0.3, lt)));
  homeAt(deck, V(0, (1 - eout(S(7.5, 10.5, lt))) * 0.5, (1 - eout(S(7.5, 10.5, lt))) * 0.6)); deck.visible = lt > 7.4;
  camKeys(lt, [[0, [1.8, 1.4, 1.7], [0, 0.1, 0], 32], [7, [1.2, 1.0, 1.5], [0, 0.12, 0], 32], [11, [0.9, 0.38, 0.95], [0.3, 0.15, 0], 30], [15, [1.8, 1.3, 1.7], [0, 0.12, 0], 32]]);
  showLabel("brr", "Deck bearers", "40×40×3 SHS · 3 × M8 each side", V(0.3, 0.14, 0.23), 70, -80, fadeIO(lt, 2.5, 7.3));
  showLabel("dk", "MDF deck", "1200 × 460 × 18 mm", V(-0.2, 0.158, 0.1), -60, -110, fadeIO(lt, 10.5, d - 0.3));
};
SEG.belt = (lt, d) => {
  assembled(3, lt);
  const wrap = eio(S(1.0, 9.0, lt));
  homeAt(belt); belt.geometry.setDrawRange(0, Math.max(6, Math.floor(BN * wrap) * 24));
  setBeltSag(lerp(0.035, 0, sm(S(9.5, 12.5, lt))));
  const pull = sm(S(13.0, 19.0, lt)) * 0.35; beltTex.offset.x = -pull / BTILE; rollF.userData.spin.rotation.z = rollR.userData.spin.rotation.z = -pull / 0.02415;
  const s = wrap * BP; const [bx, by] = beltAt(s);
  camKeys(lt, [[0, [-1.6, 0.9, 1.4], [-0.3, 0.12, 0], 32], [5, [0.4, 1.0, 1.6], [0.3, 0.12, 0], 32], [9, [-0.2, 0.6, 1.4], [-0.2, 0.1, 0], 32], [12.5, [0.3, 0.32, 1.1], [0.2, 0.1, 0], 30], [17, [1.2, 0.35, 0.7], [0.64, 0.13, 0], 28], [20, [1.8, 1.2, 1.6], [0, 0.12, 0], 32]]);
  showLabel("bl", "Waste conveyor belt", "continuous loop, 400 mm wide", V(bx, 0.1333 + by + 0.01, 0.2), 60, -100, fadeIO(lt, 1.5, 9.0));
  showLabel("tn", "Tensioned", "runs flat on the deck", V(0.0, 0.16, 0.2), 60, -90, fadeIO(lt, 12.5, d - 0.3));
};
SEG.uprights = (lt, d) => {
  assembled(4, lt);
  placeHome(plateA, "plateA"); placeHome(plateB, "plateB");
  plateA.position.z += (1 - eout(S(0.5, 2.5, lt))) * 0.35; plateB.position.z -= (1 - eout(S(0.8, 2.8, lt))) * 0.35;
  const pb = BOLTS.filter((b) => b.group === "plate"); pb.forEach((b, i) => boltState(b, S(2.8 + i * 0.3, 4.6 + i * 0.3, lt)));
  setupPosts(); postPivA.visible = postPivB.visible = lt > 4.8;
  const lower = BOLTS.filter((b) => b.group === "post"); // [y.14 +z, y.14 -z, y.175 +z, y.175 -z]
  boltState(lower[0], S(5.0, 6.4, lt)); boltState(lower[1], S(5.2, 6.6, lt));
  const rise = eio(S(7.0, 11.0, lt));
  postPivA.rotation.z = postPivB.rotation.z = (1 - rise) * Math.PI / 2;
  // lower bolts must follow the pivot: they are on the pivot axis, so no change
  boltState(lower[2], S(11.0, 12.4, lt)); boltState(lower[3], S(11.2, 12.6, lt));
  crossbar.visible = lt > 12.8; crossbar.position.set(-0.665, 1.0405 + (1 - eout(S(12.8, 15.0, lt))) * 0.4, 0); crossbar.rotation.set(0, Math.PI / 2, 0);
  BOLTS.filter((b) => b.group === "crossbar").forEach((b, i) => boltState(b, S(15.2 + i * 0.4, 16.8 + i * 0.4, lt)));
  grips.forEach((g, i) => { homeAt(g, V(0, 0, (1 - eout(S(17.0 + i * 0.3, 18.5 + i * 0.3, lt))) * (i ? 0.25 : -0.25))); g.visible = lt > 17; });
  homeAt(consoleG, V(0, (1 - eout(S(18.8, 20.5, lt))) * 0.3, 0)); consoleG.visible = lt > 18.8; drawScreen(0);
  camKeys(lt, [[0, [-1.2, 0.6, 1.3], [-0.64, 0.12, 0.2], 32], [6.5, [-1.5, 0.9, 1.7], [-0.5, 0.3, 0], 32], [11, [0.9, 1.4, 2.4], [-0.4, 0.55, 0], 34], [16.5, [-1.6, 1.3, 0.9], [-0.66, 0.95, 0], 32], [19.5, [-1.6, 1.45, 0.9], [-0.66, 1.0, 0], 30], [22, [1.6, 1.5, 2.3], [-0.2, 0.5, 0], 34]]);
  showLabel("hinge", "Hinge pivot + locking bolt", "bracket plate, 2 × M8 to rail", V(-0.64, 0.14, 0.29), 60, -60, fadeIO(lt, 5.5, 12.5));
  showLabel("hr", "Handrail", "25×25×2 SHS, bolted to both posts", V(-0.665, 1.06, 0.15), 70, -80, fadeIO(lt, 15.0, 18.5));
  showLabel("cs", "Display console", "", V(-0.665, 1.11, 0), -60, -70, fadeIO(lt, 20.0, d - 0.3));
};
SEG.inspect = (lt, d) => {
  assembled(5, lt); drawScreen(0);
  orbit(lt, [0, 0.45, 0], 2.7, 1.25, 0.9, 0.9 + Math.PI * 1.15, d, 32, 0.4);
  const L = [["i1", "M8 bolted lap joint", "DfD", V(0.725, 0.105, 0.23)], ["i2", "Pillow-block bearing", "6204-2RS", V(0.64, 0.17, -0.23)], ["i3", "Waste conveyor belt", "", V(0.2, 0.16, 0.18)], ["i4", "40×40×3 SHS rail", "reclaimed, painted", V(0.2, 0.08, -0.25)], ["i5", "25×25×2 SHS upright", "", V(-0.64, 0.6, 0.27)], ["i6", "Hinge bracket plate", "", V(-0.64, 0.17, -0.26)], ["i7", "Waste-tyre foot pad", "", V(-0.725, 0.01, -0.3)], ["i8", "Handrail + grips", "", V(-0.665, 1.05, 0.2)]];
  L.forEach(([id, a, b, p], i) => showLabel(id, a, b, p, (i % 2 ? -1 : 1) * 70, -60 - (i % 3) * 25, fadeIO(lt, 1.0 + i * 1.6, 1.0 + i * 1.6 + 4.0)));
};
SEG.labels = (lt, d) => {
  assembled(5, lt);
  decals.forEach((m, i) => { homeAt(m); const k = sm(S(0.8 + i * 1.6, 2.4 + i * 1.6, lt)); m.material.opacity = k; m.scale.set(lerp(0.6, 1, k), 1, 1); });
  camKeys(lt, [[0, [0.1, 0.35, 1.1], [0.05, 0.09, 0.2], 30], [5, [0.3, 0.3, 0.95], [0.15, 0.09, 0.2], 28], [9, [1.4, 0.9, 1.6], [0, 0.2, 0], 32]]);
};
const V_RUN = 0.45;
SEG.run = (lt, d) => {
  assembled(6, lt); runBelt(lt, V_RUN); drawScreen(lt);
  const keys = [
    [0, [2.4, 1.3, 1.9], [0, 0.4, 0], 32], [10, [1.6, 1.2, 2.5], [0, 0.4, 0], 32],
    [13, [0.25, 0.3, 0.6], [-0.1, 0.15, 0.05], 28], [21, [-0.35, 0.28, 0.5], [-0.35, 0.15, 0.0], 28],
    [24, [0.98, 0.32, 0.6], [0.64, 0.14, 0.2], 26], [31, [1.02, 0.26, 0.42], [0.64, 0.13, 0.22], 24],
    [34, [0.95, 0.36, 0.55], [0.725, 0.08, 0.23], 26], [41, [0.95, 0.3, 0.12], [0.725, 0.08, 0.23], 26],
    [44, [-3.2, 0.75, 0.0], [0, 0.45, 0], 28], [51, [-3.0, 0.8, 0.0], [0, 0.45, 0], 28],
    [54, [0.0, 0.55, 3.4], [0, 0.45, 0], 28], [60, [0.0, 0.55, 3.2], [0, 0.45, 0], 28],
    [63, [0.05, 3.6, 0.02], [0, 0.0, 0], 30], [68, [0.05, 3.2, 0.3], [0, 0.0, 0], 30],
    [72, [2.0, 1.1, 2.2], [0, 0.4, 0], 32], [80, [2.6, 1.8, 1.4], [0, 0.4, 0], 32]];
  camKeys(lt, keys);
  const tags = [["r_belt", "Belt over MDF deck", "rubber texture, sliding contact", V(0.0, 0.16, 0.18), 13.5, 21.0], ["r_brg", "Bearing + roller", "turning on sealed bearings", V(0.64, 0.17, 0.23), 24.5, 31.5], ["r_jt", "Bolted joints", "no welds — disassemblable", V(0.725, 0.105, 0.23), 34.5, 41.5]];
  tags.forEach(([id, a, b, p, t0, t1]) => showLabel(id, a, b, p, 80, -90, fadeIO(lt, t0, t1)));
  const views = [["v_front", "Front view", 44.5, 51], ["v_side", "Side view", 54.5, 60.5], ["v_top", "Plan view", 63.5, 68.5]];
  views.forEach(([id, a, t0, t1]) => showLabel(id, a, "", V(0.64, 0.16, 0), -120, 60, fadeIO(lt, t0, t1)));
};
SEG.end = (lt, d) => {
  assembled(6, lt); runBelt(lt + 80, V_RUN); drawScreen(80 + lt);
  orbit(lt, [0, 0.4, 0], 3.2, 1.6, 0.6, 1.0, d, 30, 0.35);
  hemi.intensity = lerp(0.55, 0.15, S(0, d, lt)); key.intensity = lerp(2.4, 0.9, S(0, d, lt));
};

// ---------------------------------------------------------------- frame entry point
const segs = TL.segs;
function segAt(t) { let s = segs[0]; for (const x of segs) if (t >= x.start) s = x; return s; }
function phaseBar(s) {
  document.querySelectorAll("#phasebar .ph").forEach((el, i) => { el.classList.toggle("on", i + 1 === s.pi); el.classList.toggle("done", s.pi > 0 && i + 1 < s.pi); });
  document.getElementById("phasebar").style.opacity = s.pi > 0 ? 1 : 0;
}
function renderAt(t) {
  t = Math.max(0, Math.min(TL.total - 1e-3, t));
  const s = segAt(t); const lt = t - s.start;
  resetAll(); restorePosts();
  sparks.lines.visible = sparks.pts.visible = mist.lines.visible = mist.pts.visible = dust.lines.visible = dust.pts.visible = false;
  SEG[s.key](lt, s.dur);
  clearOverlay(); // hides labels not refreshed this frame — must run after segment
  phaseBar(s);
  // floor/fog tint for darker scenes
  renderer.render(scene, camera);
}
// labels used this frame are marked inside showLabel; clearOverlay resets the flags afterwards.
window.renderAt = renderAt;
window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
const q = new URLSearchParams(location.search);
renderAt(q.has("t") ? parseFloat(q.get("t")) : window.__hfThreeTime || 0);
window.__sceneReady = true;
