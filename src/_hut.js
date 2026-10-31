/* ================= the magic hut, in 3D ================= */
/*
 * The room the book lives in: modelled, not painted. Rounded, slightly toy-like shapes in the
 * manner of cosy life-sim games; warm practical lights everywhere; things from East and West
 * piled together the way a traveller's room fills up. Units are the book's: a page is one unit
 * wide (about 20 cm), the desk top is at y = 0.
 */
const FLOOR = -3.8, HUT_W = 22, HUT_BACK = -10, HUT_FRONT = 15, HUT_TOP = FLOOR + 15.5;
let gears = [], shafts = [], glowWalls = [], spinners = [], fireLining, pages, lampOn = true, lamp, roomSpot, hemi, moonSpot, fireLight, candleLight, orrery, bookHalo, sparks, smoke, globeSphere, record, fireCore, fireGlow, fireSparks, sleepyCat;
/** things in the hut you can poke: each with a tip for the hint line and something it does */
const PROPS = [], play = { music: false, notes: 0, cat: 0, globe: 0, orrery: 0, ball: 0, tree: 0, chest: 0, cue: 3, neon: 0, neonOn: false };
const BALL_LINES = ['水晶球里浮出一句：慢一点也没关系。', '水晶球里浮出一句：今天适合喝一杯热茶。', '水晶球里浮出一句：好消息正在路上。', '水晶球里浮出一句：给自己一个拥抱吧。', '水晶球里浮出一句：答案就在下一次深呼吸里。'];
const FIRE_COLS = [new THREE.Color(1.9, 1.15, 0.45), new THREE.Color(1.9, 0.62, 0.22), new THREE.Color(1.3, 0.9, 1.9), new THREE.Color(0.7, 1.6, 1.5)];
function prop(obj, tip, act) { const p = { obj, tip, act: () => { p.tried = true; act(); } }; PROPS.push(p); }
const floaters = [], hanging = [], swaying = [], beadGroups = [], drifting = [];
const meteor = { t: -1, wait: 5, a: null, b: null };

/* ---------- small helpers shared with the rooms ---------- */
/** a plain die-cut card, lit, standing on its bottom edge (or centred) */
function cardMesh(c, w, o = {}) {
  const h = (w * c.height) / c.width, map = popTex(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h).translate(0, o.center ? 0 : h / 2, 0), new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide, alphaTest: 0.5, ...(o.mat ?? {}) }));
  m.castShadow = o.shadow ?? true; m.receiveShadow = true;
  m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
  return m;
}
let GLOW_MAP;
/** one soft glowing point: a flame, a lamp, the heart of the orrery */
function glowSprite(size, color) {
  GLOW_MAP ??= glowTex();
  const p = new THREE.Points(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0)]), new THREE.PointsMaterial({ map: GLOW_MAP, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color }));
  p.frustumCulled = false;
  return p;
}
function place(parent, m, x, y, z, ry = 0, rx = 0) { m.position.set(x, y, z); m.rotation.set(rx, ry, 0); parent.add(m); return m; }
function solid(geo, mat, x, y, z, parent = scene) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
function lanternMesh(color, emissive, r = 0.18, h = 0.3) {
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(r * Math.sin(Math.PI * (0.08 + t * 0.84)), h * t)); }
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), new THREE.MeshLambertMaterial({ map: popTex(lanternPaper(color, '#8a3a2a'), 4, 1), emissive, emissiveIntensity: 0.9, side: THREE.DoubleSide }));
  body.position.y = -h / 2; g.add(body);
  [h / 2, -h / 2].forEach((y) => { const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.32, r * 0.32, h * 0.08, 12), new THREE.MeshLambertMaterial({ color: 0xc99a45 })); cap.position.y = y; g.add(cap); });
  return g;
}

/* ---------- a kit for stylised 3D ---------- */
const MATS = {};
const std = (key, o) => (MATS[key] ??= new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0, ...o }));
const velvet = (key, color, sheen) => (MATS[key] ??= new THREE.MeshPhysicalMaterial({ color, roughness: 0.8, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(sheen) }));
const rbox = (w, h, d, r = 0.08, s = 3) => new RoundedBoxGeometry(w, h, d, s, Math.max(0.005, Math.min(r, w / 2.01, h / 2.01, d / 2.01)));
const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg);
function add(geo, m, x, y, z, parent = scene, rot) {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z); if (rot) me.rotation.set(rot[0] ?? 0, rot[1] ?? 0, rot[2] ?? 0);
  me.castShadow = me.receiveShadow = true; parent.add(me);
  return me;
}
function group(x, y, z, ry = 0, parent = scene) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; }
const BRASS = () => std('brass', { color: 0xc99a45, metalness: 0.85, roughness: 0.32 });
const GOLDM = () => std('gold', { color: 0xf0c060, metalness: 0.9, roughness: 0.25, emissive: 0x3a2a08 });
const WAX = () => std('wax', { color: 0xf6ead2, roughness: 0.55, emissive: 0x3a2410 });
const glass = (key, color, opacity = 0.35) => (MATS[key] ??= new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, metalness: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: 0.05 }));
function flame(parent, x, y, z, s = 1) {
  add(new THREE.ConeGeometry(0.05 * s, 0.18 * s, 8), std('flame', { color: 0xffe2a0, emissive: 0xffb040, emissiveIntensity: 2.2 }), x, y + 0.09 * s, z, parent).castShadow = false;
  place(parent, glowSprite(0.45 * s, new THREE.Color(1.8, 1.25, 0.55)), x, y + 0.1 * s, z);
}
function candle(parent, x, y, z, h = 0.6, r = 0.09) { add(new THREE.CylinderGeometry(r, r * 1.04, h, 14), WAX(), x, y + h / 2, z, parent); flame(parent, x, y + h, z, r / 0.09); }
/** a row of books standing on a shelf, as one instanced mesh */
let SPINE;
function books(parent, x0, x1, y, z, depth, hMin, hMax, seed, flatEvery = 0) {
  SPINE ??= (() => { const c = canvas(64, 256), g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 256); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, 6, 256); g.fillRect(58, 0, 6, 256); g.fillStyle = '#e8c070'; g.fillRect(6, 24, 52, 8); g.fillRect(6, 224, 52, 8); g.fillRect(14, 90, 36, 50); return tx(c); })();
  const r = mulberry(seed), list = [];
  let x = x0;
  while (x < x1 - 0.12) {
    const w = 0.12 + r() * 0.14, h = hMin + r() * (hMax - hMin);
    if (flatEvery && r() < flatEvery) { const n = 2 + Math.floor(r() * 3); for (let k = 0; k < n; k++) list.push([x + 0.45, y + 0.07 + k * 0.14, z, 0.9 - k * 0.05, 0.13, depth * 0.9, 0]); x += 1.0; continue; }
    const lean = r() < 0.08 ? 0.2 : 0;
    list.push([x + w / 2 + lean * h * 0.5, y + h / 2, z, w, h, depth * (0.8 + r() * 0.2), lean]);
    x += w + 0.01 + lean * h * 0.6;
  }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('books', { map: SPINE, roughness: 0.7 }), list.length);
  const pal = [0x8f3b46, 0x3f7f86, 0xd9a441, 0x4a5a9a, 0x6b8a4a, 0x9a6ab0, 0xc4613f, 0x2f4a6a, 0xe8d4b0], mx = new THREE.Matrix4(), col = new THREE.Color();
  list.forEach(([bx, by, bz, w, h, d, lean], i) => { mx.compose(V(bx, by, bz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -lean)), V(w, h, d)); im.setMatrixAt(i, mx); im.setColorAt(i, col.set(pal[Math.floor(r() * pal.length)])); });
  im.castShadow = im.receiveShadow = true; parent.add(im);
  return im;
}
function potion(parent, x, y, z, color, s = 1) {
  add(lathe([[0, 0], [0.16 * s, 0], [0.2 * s, 0.08 * s], [0.2 * s, 0.32 * s], [0.08 * s, 0.42 * s], [0.07 * s, 0.6 * s], [0, 0.6 * s]], 20), glass('bottle', 0xdfe8f0, 0.32), x, y, z, parent).castShadow = false;
  add(lathe([[0, 0], [0.15 * s, 0], [0.18 * s, 0.07 * s], [0.18 * s, 0.26 * s], [0, 0.26 * s]], 16), std('liquid' + color, { color, emissive: color, emissiveIntensity: 1.1, roughness: 0.2 }), x, y + 0.02 * s, z, parent).castShadow = false;
  add(new THREE.CylinderGeometry(0.06 * s, 0.07 * s, 0.1 * s, 10), std('cork', { color: 0x8a5a3a }), x, y + 0.64 * s, z, parent);
  place(parent, glowSprite(0.6 * s, new THREE.Color(color).multiplyScalar(1.4)), x, y + 0.16 * s, z);
}
function hourglass(parent, x, y, z, s = 1) {
  const wood = std('darkwood', { color: 0x4a2c1a, roughness: 0.6 }), m = 0.47 * s, hg = new THREE.Group(); hg.position.set(x, y + m, z); parent.add(hg);   // pivots at its waist
  [0, 0.86 * s].forEach((dy) => add(new THREE.CylinderGeometry(0.28 * s, 0.28 * s, 0.07 * s, 18), wood, 0, dy + 0.035 * s - m, 0, hg));
  add(lathe([[0.22 * s, 0], [0.06 * s, 0.4 * s], [0.22 * s, 0.8 * s]], 18), glass('hourglass', 0xe8f0f8, 0.3), 0, 0.06 * s - m, 0, hg).castShadow = false;
  hg.userData.sand = add(new THREE.ConeGeometry(0.18 * s, 0.22 * s, 16), std('sand', { color: 0xe8c070 }), 0, 0.18 * s - m, 0, hg);
  for (const a of [0, 2.1, 4.2]) add(new THREE.CylinderGeometry(0.02 * s, 0.02 * s, 0.86 * s, 6), wood, Math.cos(a) * 0.24 * s, 0, Math.sin(a) * 0.24 * s, hg);
  return hg;
}
function crystals(parent, x, y, z, s = 1) {
  [[0, 0, 0.5, 0xb48ae0], [0.18, 0.08, 0.36, 0x7de0d0], [-0.16, 0.1, 0.32, 0xe98aa0], [0.05, -0.15, 0.28, 0x8fb6ff]].forEach(([dx, dz, h, c], i) => {
    const m = add(new THREE.ConeGeometry(0.09 * s, h * s, 6), std('crystal' + i, { color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.1, flatShading: true }), x + dx * s, y + (h * s) / 2, z + dz * s, parent);
    m.rotation.z = dx * 1.2; m.rotation.x = dz * 1.2;
  });
}
function plantPot(parent, x, y, z, color, s = 1) { return add(lathe([[0, 0], [0.32 * s, 0], [0.4 * s, 0.1 * s], [0.46 * s, 0.6 * s], [0.5 * s, 0.66 * s], [0.42 * s, 0.68 * s], [0, 0.68 * s]], 24), std('pot' + color, { color, roughness: 0.35 }), x, y, z, parent); }
/** a leaf: an outline bent into a gentle curve, with optional holes */
function leafGeo(len, wid, holes = 0) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(wid, len * 0.2, wid * 0.9, len * 0.8, 0, len); s.bezierCurveTo(-wid * 0.9, len * 0.8, -wid, len * 0.2, 0, 0);
  for (let k = 0; k < holes; k++) { const yy = len * (0.3 + k * 0.15), side = k % 2 ? 1 : -1; s.holes.push(new THREE.Path().absellipse(side * wid * 0.48, yy, wid * 0.12, len * 0.05, 0, TAU, false, 0)); }
  const g = new THREE.ShapeGeometry(s, 10), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const yy = p.getY(i), xx = p.getX(i); p.setZ(i, -((yy / len) ** 2) * len * 0.35 + Math.abs(xx) * 0.25); }
  g.computeVertexNormals();
  return g;
}
const LEAF = () => (MATS.leaf ??= new THREE.MeshStandardMaterial({ color: 0x3f7a44, roughness: 0.5, side: THREE.DoubleSide }));
const LEAF2 = () => (MATS.leaf2 ??= new THREE.MeshStandardMaterial({ color: 0x5f9a50, roughness: 0.5, side: THREE.DoubleSide }));
/** many small things of one kind, as one instanced mesh */
function scatter(parent, geo, material, items) {
  const im = new THREE.InstancedMesh(geo, material, items.length), mx = new THREE.Matrix4(), col = new THREE.Color();
  items.forEach(([p, rot, scl, color], i) => { mx.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot ?? [0, 0, 0]))), scl ?? V(1, 1, 1)); im.setMatrixAt(i, mx); if (color != null) im.setColorAt(i, col.set(color)); });
  im.castShadow = im.receiveShadow = true; parent.add(im);
  return im;
}
function starShape(R, r, n = 5) { const s = new THREE.Shape(); starPx(0, 0, R, r, n).forEach(([x, y], i) => (i ? s.lineTo(x, -y) : s.moveTo(x, -y))); return s; }
function moonShape(R, off = 0.42, k = 0.82) { const d = R * off, r = R * k, px_ = (R * R - r * r + d * d) / (2 * d), py = Math.sqrt(R * R - px_ * px_), a = Math.atan2(py, px_), b = Math.atan2(py, px_ - d), s = new THREE.Shape(); s.moveTo(px_, py); s.absarc(0, 0, R, a, TAU - a, false); s.absarc(d, 0, r, TAU - b, b, true); return s; }

/* ---------- the room ---------- */
async function buildHut() {
  const W = HUT_W, D = HUT_FRONT - HUT_BACK, back = HUT_BACK, front = HUT_FRONT, top = HUT_TOP;
  const winW = 3.4, winBot = FLOOR + 4.6, winArch = FLOOR + 11.2, winR = winW, winY = 5.4;
  const darkWood = std('darkwood', { color: 0x4a2c1a, roughness: 0.5 }), panelWood = std('panel', { map: tx(grainCanvas('#5a3622', '#1e0f08', 1220), 2, 1), bumpMap: tx(grainCanvas('#5a3622', '#1e0f08', 1220), 2, 1, false), bumpScale: 2, roughness: 0.45 });
  const midWood = std('midwood', { map: tx(grainCanvas('#8a5a36', '#3a2010', 1221), 1, 1), bumpMap: tx(grainCanvas('#8a5a36', '#3a2010', 1221), 1, 1, false), bumpScale: 2, roughness: 0.45 });
  // floor, walls, ceiling and beams
  const floorCv = grainCanvas('#7a4e30', '#2a160c', 1210, 1024, 1024, 8), floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshPhysicalMaterial({ map: tx(floorCv, 3, 4), bumpMap: tx(floorCv, 3, 4, false), bumpScale: 3, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.25 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR, (back + front) / 2); floor.receiveShadow = true; scene.add(floor);
  const wpCv = wallpaperCanvas(), paper = std('wallpaper', { map: tx(wpCv, 0.25, 0.25), bumpMap: tx(wpCv, 0.25, 0.25, false), bumpScale: 1.5, roughness: 0.8, emissive: 0xffc860, emissiveMap: tx(wallpaperCanvas(true), 0.25, 0.25), emissiveIntensity: 0.2 });
  glowWalls.push(paper);
  const wallShape = new THREE.Shape([new THREE.Vector2(-W / 2, FLOOR + 4), new THREE.Vector2(W / 2, FLOOR + 4), new THREE.Vector2(W / 2, top), new THREE.Vector2(-W / 2, top)]);
  wallShape.holes.push(windowArch(new THREE.Path(), winW, winBot, winArch, true));
  const backWall = new THREE.Mesh(new THREE.ShapeGeometry(wallShape, 64), paper); backWall.position.z = back; backWall.receiveShadow = backWall.castShadow = true; scene.add(backWall);
  const spCv = wallpaperCanvas(), sidePaper = std('sidepaper', { map: tx(spCv, D / 4, (top - FLOOR - 4) / 4), bumpMap: tx(spCv, D / 4, (top - FLOOR - 4) / 4, false), bumpScale: 1.5, roughness: 0.8, emissive: 0xffc860, emissiveMap: tx(wallpaperCanvas(true), D / 4, (top - FLOOR - 4) / 4), emissiveIntensity: 0.2 });
  glowWalls.push(sidePaper);
  [[-W / 2, Math.PI / 2], [W / 2, -Math.PI / 2]].forEach(([x, ry]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(D, top - FLOOR - 4), sidePaper); m.position.set(x, (top + FLOOR + 4) / 2, (back + front) / 2); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); });
  const fw = new THREE.Mesh(new THREE.PlaneGeometry(W, top - FLOOR), sidePaper); fw.position.set(0, (top + FLOOR) / 2, front); fw.rotation.y = Math.PI; scene.add(fw);
  await slice();
  // wood panelling below a chair rail, all round
  const wains = (len, cx, cz, ry) => {
    const g = group(cx, FLOOR, cz, ry);
    add(new THREE.BoxGeometry(len, 4, 0.3), panelWood, 0, 2, 0, g);
    for (let x = -len / 2 + 1.4; x < len / 2 - 1; x += 2.6) add(rbox(2.2, 2.6, 0.14, 0.05), panelWood, x, 2.0, 0.2, g);
    add(rbox(len, 0.28, 0.45, 0.06), darkWood, 0, 4.0, 0.1, g);
    add(rbox(len, 0.5, 0.4, 0.04), darkWood, 0, 0.25, 0.1, g);
  };
  wains(W, 0, back + 0.15, 0); wains(D, -W / 2 + 0.15, (back + front) / 2, Math.PI / 2); wains(D, W / 2 - 0.15, (back + front) / 2, -Math.PI / 2);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), std('ceil', { color: 0x2a1c22, roughness: 0.9 })); ceil.position.set(0, top, (back + front) / 2); ceil.rotation.x = Math.PI / 2; scene.add(ceil);
  for (const z of [-7.5, -2.5, 2.5, 7.5]) add(rbox(W, 0.7, 0.6, 0.06), midWood, 0, top - 0.35, z);
  add(rbox(W, 0.5, 0.5, 0.08), darkWood, 0, top - 0.25, back + 0.25);

  await slice();
  // a tall arched window in brass, art-nouveau lines curling up it; the night outside; velvet curtains drawn back
  outdoors(6.4, winW + 1);
  const pane = new THREE.Mesh(new THREE.ShapeGeometry(windowArch(new THREE.Shape(), winW - 0.05, winBot, winArch), 48), new THREE.MeshPhysicalMaterial({ color: 0xcfd8ff, roughness: 0.05, transparent: true, opacity: 0.06, clearcoat: 1, depthWrite: false }));
  pane.position.z = back + 0.04; scene.add(pane);
  artNouveauWindow(winW, winBot, winArch, back, darkWood);
  add(rbox(8.2, 0.32, 1.3, 0.1), midWood, 0, winBot - 0.16, back + 0.55);
  // long enough that even the lifted leading corner falls past the bottom of the window; the wall side brushes the chair rail
  const drapeTop = 10.8, drapeBot = FLOOR + 3.9, drapeLen = drapeTop - drapeBot, cz = back + 0.7;
  [-1, 1].forEach((s) => velvetDrape(s, winW + 1.05, drapeTop - drapeLen / 2, cz, { h: drapeLen, tie: (4.2 - drapeBot) / drapeLen, lift: 0.6 }));
  add(new THREE.CylinderGeometry(0.07, 0.07, 2 * winW + 4.2, 12), BRASS(), 0, 10.95, cz, scene, [0, 0, Math.PI / 2]);
  [-1, 1].forEach((s) => add(new THREE.SphereGeometry(0.18, 16, 12), BRASS(), s * (winW + 2.1), 10.95, cz));
  // a string of evil-eye beads in the window
  for (let k = 0; k < 6; k++) { const y = 7.6 - k * 0.42; add(new THREE.SphereGeometry(0.16 - k * 0.008, 16, 12), std('nazar', { color: 0x2a5ac8, roughness: 0.1, emissive: 0x0a1a40 }), winW - 0.7, y, back + 0.5); add(new THREE.CircleGeometry(0.08, 16), std('nazarEye', { color: 0xffffff, emissive: 0x222222 }), winW - 0.7, y, back + 0.66); }
  // moonlight falling in through it, dust turning in the beams
  moonShafts(winW, winBot, winArch);

  await slice();
  // the fireplace: brick, a mantel crowded with candles, a ball of magic fire, a little white cat curled in her bed by the bookcase
  const brick = std('brick', { map: tx(brickCanvas(), 2, 3), roughness: 0.85, bumpMap: tx(brickCanvas(), 2, 3, false), bumpScale: 2 });
  const fz = -3, fx = -W / 2;
  add(rbox(1.6, top - FLOOR - 6.6, 6.6, 0.1), brick, fx + 0.8, FLOOR + 6.6 + (top - FLOOR - 6.6) / 2, fz);
  firebox(fx, fz, brick, midWood);
  fireCore = V(fx + 1.2, FLOOR + 1.95, fz);
  fireGlow = place(scene, glowSprite(2.8, new THREE.Color(1.3, 0.62, 0.22)), fireCore.x, fireCore.y, fireCore.z);
  const fireHit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 3.2), new THREE.MeshBasicMaterial({ visible: false })); fireHit.position.copy(fireCore).add(V(0.3, -0.3, 0)); scene.add(fireHit);   // the hearth's mouth, to tap
  prop(fireHit, '壁炉 · 添一把柴', () => { play.fire = 1; sfx('crackle'); toast('噼啪——炉火旺了起来，屋里又暖了一点'); });
  fireSparks = new Sparks(800); scene.add(fireSparks.points);
  fireLight = new THREE.PointLight(0xff9a40, 36, 18, 1.4); fireLight.position.set(fx + 2.9, FLOOR + 2.0, fz); scene.add(fireLight);
  mantelpiece(FLOOR + 6.525, fz);
  candleLight = new THREE.PointLight(0xffb060, 9, 9, 1.5); candleLight.position.set(fx + 3.9, FLOOR + 8.4, fz + 1.2); scene.add(candleLight);
  // in the nook between the fireplace and the bookcase, where it shows on a narrow screen too once you look that way
  catBed(fx + 3.5, FLOOR, fz - 3.9);
  sleepyCat = catAsleep(fx + 3.5, FLOOR + 0.3, fz - 3.9, 0.38, 0.66);                // curled with her face to the room, her head at the bookcase end
  prop(sleepyCat.g, '小白猫 · 摸摸它', () => { catAnswer(); burstAt(sparks, sleepyCat.g.getWorldPosition(V(0, 0, 0)).add(V(0, 0.9, 0)), 18, { speed: 0.3, up: 0.5, size: 0.05, color: new THREE.Color(1.8, 0.9, 1.1) }); });
  garland(V(fx + 1.75, FLOOR + 12.6, fz - 3.2), V(fx + 1.75, FLOOR + 12.6, fz + 3.2), 1.2, 13);

  await slice();
  // back left: a tall walnut bookcase with drawers, gold stars and moons painted on
  const decal = std('decal', { map: tx(decalCanvas('#4e3022', '#d9a441', 1230), 1, 2), roughness: 0.55 });
  const bc = group(-8.5, FLOOR, back + 1.0);
  [-2.05, 2.05].forEach((x) => add(rbox(0.35, 11.6, 1.9, 0.08), decal, x, 5.8, 0, bc));
  add(rbox(4.8, 0.45, 2.1, 0.1), decal, 0, 11.75, 0.05, bc); add(rbox(4.4, 0.4, 1.9, 0.06), decal, 0, 0.2, 0, bc);
  add(new THREE.PlaneGeometry(3.8, 11), std('shelfback', { color: 0x2a1c30, roughness: 0.9 }), 0, 5.8, -0.9, bc);
  [[-0.95, 1.2], [0.95, 1.2], [-0.95, 2.7], [0.95, 2.7]].forEach(([x, y]) => { add(rbox(1.8, 1.35, 0.2, 0.06), decal, x, y, 0.85, bc); add(rbox(0.5, 0.12, 0.14, 0.05), BRASS(), x, y + 0.2, 1.0, bc); });
  [3.55, 5.6, 7.65, 9.7].forEach((y) => { add(rbox(3.8, 0.18, 1.7, 0.04), decal, 0, y, 0, bc); add(rbox(3.8, 0.05, 0.05, 0.02), BRASS(), 0, y + 0.07, 0.86, bc); });
  books(bc, -1.8, 0.3, 3.64, 0, 1.3, 1.0, 1.6, 1231, 0.12);
  potion(bc, 0.7, 3.64, 0.2, 0x7de0b0); potion(bc, 1.15, 3.64, -0.1, 0xe98ad0, 1.15); potion(bc, 1.6, 3.64, 0.25, 0xffc860, 0.8);
  crystals(bc, -1.3, 5.69, 0.1); hourglass(bc, -0.3, 5.69, 0.1, 1.05); books(bc, 0.35, 1.8, 5.69, 0, 1.2, 1.0, 1.5, 1232);
  [-1.55, -1.0, -0.45, 0.1, 0.65].forEach((x, i) => potion(bc, x, 7.74, (i % 2) * 0.3 - 0.1, [0x8fb6ff, 0xb48ae0, 0x7de0d0, 0xe98aa0, 0xffd27a][i], 0.9 + (i % 3) * 0.15));
  add(lathe([[0, 0], [0.4, 0.05], [0.5, 0.3], [0.45, 0.42], [0, 0.42]], 24), std('mortar', { color: 0x8d9aa6, roughness: 0.8 }), 1.35, 7.74, 0.1, bc);
  books(bc, -1.8, 1.8, 9.79, 0, 1.3, 0.9, 1.5, 1233, 0.15);

  await slice();
  // back right: a chest of drawers, a celestial globe and a telescope by the window
  const dWood = std('dresserWood', { map: tx(grainCanvas('#9a6642', '#4a2a16', 1241), 1, 1), roughness: 0.5 });
  const dr = group(6.7, FLOOR, back + 1.2);
  add(rbox(5.8, 3.8, 2.0, 0.15), dWood, 0, 2.15, 0, dr);
  add(rbox(6.1, 0.3, 2.2, 0.1), dWood, 0, 4.1, 0, dr);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { add(rbox(2.6, 1.05, 0.12, 0.05), dWood, -1.4 + c * 2.8, 0.85 + r * 1.15, 1.0, dr); add(rbox(0.7, 0.1, 0.12, 0.04), darkWood, -1.4 + c * 2.8, 0.85 + r * 1.15, 1.1, dr); }
  [[-2.6, -0.8], [2.6, -0.8], [-2.6, 0.8], [2.6, 0.8]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.14, 0.1, 0.3, 10), darkWood, x, 0.15, z, dr));
  const cg = group(-1.6, 4.25, 0, 0, dr);
  prop(cg, '天球仪 · 转一转', () => { play.globe = 1; sfx('soft'); burstAt(sparks, cg.localToWorld(V(0, 1.75, 0)), 30, { speed: 0.5, up: 0.4, size: 0.05, color: new THREE.Color(1.1, 1.2, 1.9) }); toast('天球仪呼呼地转起来，星座一个个闪过'); });
  add(lathe([[0, 0], [0.45, 0], [0.4, 0.1], [0.12, 0.3], [0.1, 0.9], [0, 0.9]], 20), BRASS(), 0, 0, 0, cg);
  globeSphere = add(new THREE.SphereGeometry(0.85, 32, 24), std('celestial', { map: tx(starGlobeCanvas()), roughness: 0.45, emissive: 0x0a0e30 }), 0, 1.75, 0, cg);
  add(new THREE.TorusGeometry(1.0, 0.05, 8, 48), BRASS(), 0, 1.75, 0, cg, [0.4, 0, 0.3]);
  add(new THREE.TorusGeometry(1.0, 0.035, 8, 48), BRASS(), 0, 1.75, 0, cg, [Math.PI / 2, 0, 0]);
  [[0x6b3f7d, 0.2], [0x2f4a6a, 0.16], [0xd9a441, 0.18]].forEach(([c, h], i) => add(rbox(1.3 - i * 0.12, h, 0.95, 0.04), std('bk' + c, { color: c, roughness: 0.7 }), 0.3, 4.25 + h / 2 + i * 0.19, 0, dr, [0, 0.2 - i * 0.25, 0]));
  const sandGlass = hourglass(dr, 1.3, 4.25, 0.3, 0.9); potion(dr, 2.1, 4.25, -0.2, 0xb48ae0, 1.1);
  prop(sandGlass, '沙漏 · 翻过来', () => { if (play.flip > 0) return; play.flip = 1; play.flipFrom = sandGlass.rotation.z; sfx('soft'); toast('沙漏翻了过来，时间从头开始慢慢流'); });
  play.sandGlass = sandGlass; potion(dr, 2.5, 4.25, 0.3, 0x7de0b0, 0.8);
  candle(dr, 0.7, 4.25, 0.5, 0.5); candle(dr, 0.95, 4.25, 0.35, 0.8);
  add(lathe([[0, 0], [0.18, 0], [0.26, 0.15], [0.3, 0.5], [0.16, 0.75], [0.14, 0.95], [0.2, 1.0], [0, 1.0]], 28), std('bluewhite', { map: tx(blueWhiteTex(), 2, 1), roughness: 0.2 }), 2.55, 4.25, -0.5, dr);
  for (let k = 0; k < 6; k++) { const a = -0.5 + k * 0.2, pts = [V(2.55, 5.2, -0.5), V(2.55 + Math.sin(a) * 0.6, 6.1, -0.5 + Math.cos(a + 1) * 0.2), V(2.55 + Math.sin(a) * 1.1, 6.7 + k * 0.08, -0.5)]; add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.02, 5), darkWood, 0, 0, 0, dr); scatter(dr, new THREE.SphereGeometry(0.07, 8, 6), std('blossom', { color: 0xf2b8c8, emissive: 0x3a1a20 }), pts.slice(1).flatMap((p) => [[p.clone().add(V(0.05, 0.03, 0))], [p.clone().add(V(-0.06, -0.05, 0.03))]])); }
  prop(telescope(V(-2.0, FLOOR, -6.4), 7.6, V(0.15, 0.6, -0.78)), '望远镜 · 看看窗外', () => peekSky());

  await slice();
  // a tufted velvet wingback, carved and gilded, in the foreground, drawn up to the desk with its back to us; a tartan throw over one arm
  wingChair(0.3, 3.55, Math.PI, 0.9);

  // the big rug under the desk
  add(new THREE.CylinderGeometry(6.2, 6.2, 0.05, 72), std('rug', { map: tx(sunMoonRug()), roughness: 0.95 }), 0.3, FLOOR + 0.025, -0.4);

  await slice();
  // a treasure chest spilling coins, jewels and pearls
  const ch = group(-8.3, FLOOR, 4.6, 1.2), chWood = std('chest', { map: tx(grainCanvas('#7a4a2a', '#2a160c', 1260), 1, 1), roughness: 0.6 });
  prop(ch, '宝箱 · 打开看看', () => { play.chest = 1; sfx('coin'); burstAt(sparks, ch.localToWorld(V(0, 1.9, 0.2)), 60, { speed: 0.7, up: 1.3, size: 0.07, color: GOLD }); toast('叮——一枚古金币跳了出来，又落回箱子里'); });
  add(rbox(3.0, 1.6, 2.0, 0.12), chWood, 0, 0.8, 0, ch);
  [-1.1, 0, 1.1].forEach((x) => add(rbox(0.16, 1.66, 2.06, 0.04), BRASS(), x, 0.8, 0, ch));
  add(rbox(0.4, 0.5, 0.1, 0.05), BRASS(), 0, 1.3, 1.04, ch);
  const lidPivot = group(0, 1.6, -1.0, 0, ch); lidPivot.rotation.x = -1.95;
  add(new THREE.CylinderGeometry(1.0, 1.0, 3.0, 24, 1, false, 0, Math.PI), chWood, 0, 0, 1.0, lidPivot, [0, 0, Math.PI / 2]);
  const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20), rc = mulberry(9), coins = [];
  for (let i = 0; i < 160; i++) { const x = (rc() - 0.5) * 2.6, z = (rc() - 0.5) * 1.7, hgt = 0.35 * Math.max(0, 1 - (x * x) / 2 - (z * z) / 1.2); coins.push([V(x, 1.62 + hgt * rc(), z), [(rc() - 0.5) * 0.8, rc() * 3, (rc() - 0.5) * 0.8]]); }
  for (let i = 0; i < 36; i++) { const a = rc() * Math.PI - 0.2, d = 1.4 + rc() * 1.8; coins.push([V(Math.cos(a) * d * 0.9, 0.03 + (i % 3) * 0.04, 1.0 + Math.sin(a) * d * 0.6), [(rc() - 0.5) * 0.2, rc() * 3, 0]]); }
  scatter(ch, coinGeo, GOLDM(), coins);
  const gems = []; for (let i = 0; i < 16; i++) gems.push([V((rc() - 0.5) * 2.4, 1.85 + rc() * 0.2, (rc() - 0.5) * 1.4), [rc() * 3, rc() * 3, 0], V(1, 1.2, 1), [0xc8102e, 0x1a9a5a, 0x2a5ac8, 0x9a3ac8, 0xffc020][i % 5]]);
  scatter(ch, new THREE.OctahedronGeometry(0.14), std('gem', { roughness: 0.1, metalness: 0.2, emissive: 0x222222, flatShading: true }), gems);
  const pearls = []; for (let i = 0; i < 26; i++) { const t = i / 25; pearls.push([V(-0.6 + t * 1.6, 1.65 - Math.sin(t * Math.PI) * 0.1 - Math.max(0, t - 0.6) * 3.4, 1.05 + Math.max(0, t - 0.55) * 0.5)]); }
  scatter(ch, new THREE.SphereGeometry(0.07, 12, 8), std('pearl', { color: 0xf6f0e8, roughness: 0.2, metalness: 0.1 }), pearls);
  const glint = new THREE.PointLight(0xffc860, 4, 5, 1.6); glint.position.set(0, 2.6, 0.4); ch.add(glint);

  await slice();
  // a gramophone on a little cabinet against the right wall
  const gr = group(W / 2 - 1.5, FLOOR, -2.8, -Math.PI / 2);
  prop(gr, '留声机 · 放首歌', () => { play.music = !play.music; musicBox(play.music); toast(play.music ? '♪ 留声机唱起一首老歌' : '留声机安静下来了'); });
  add(rbox(2.6, 3.0, 2.2, 0.15), darkWood, 0, 1.5, 0, gr);
  add(rbox(1.2, 1.3, 0.1, 0.05), midWood, -0.62, 1.5, 1.1, gr); add(rbox(1.2, 1.3, 0.1, 0.05), midWood, 0.62, 1.5, 1.1, gr);
  add(rbox(1.9, 0.6, 1.7, 0.1), midWood, 0, 3.3, 0, gr);
  record = add(new THREE.CylinderGeometry(0.75, 0.75, 0.04, 40), [std('recEdge', { color: 0x141216 }), std('rec', { map: tx(recordCanvas()), roughness: 0.3 }), std('recEdge', {})], 0, 3.63, 0, gr);
  add(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 12), BRASS(), 0.55, 3.85, -0.55, gr);
  const hornDir = V(0.67, 0.5, 0.55).normalize(), neckEnd = V(0.5, 5.3, -0.42);
  const neck = new THREE.CatmullRomCurve3([V(0.55, 4.05, -0.55), V(0.45, 4.65, -0.78), V(0.36, 5.12, -0.6), neckEnd]);
  add(new THREE.TubeGeometry(neck, 20, 0.075, 10), BRASS(), 0, 0, 0, gr);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.55, 3.9, -0.55), V(0.2, 3.95, -0.2), V(-0.05, 3.78, 0.15)]), 12, 0.035, 8), BRASS(), 0, 0, 0, gr);
  add(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), BRASS(), -0.05, 3.72, 0.15, gr);
  const hornPts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; hornPts.push([0.075 + Math.pow(t, 3.2) * 1.2, t * 2.3]); }
  const horn = add(lathe(hornPts, 48), std('horn', { color: 0xe0b050, metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide }), neckEnd.x, neckEnd.y, neckEnd.z, gr);
  horn.quaternion.setFromUnitVectors(UP, hornDir);
  gr.updateMatrixWorld(true); play.hornMouth = gr.localToWorld(neckEnd.clone().addScaledVector(hornDir, 2.2));
  add(new THREE.TorusGeometry(1.27, 0.035, 8, 64), BRASS(), neckEnd.x + hornDir.x * 2.3, neckEnd.y + hornDir.y * 2.3, neckEnd.z + hornDir.z * 2.3, gr).quaternion.setFromUnitVectors(V(0, 0, 1), hornDir);

  await slice();
  // a wishing tree hung with paper slips and small lanterns, and a monstera by the fire
  const wt = group(9.85, FLOOR, -5.0);                    // in the corner, clear of the neon sign
  prop(wt, '许愿树 · 挂一个愿望', () => { play.tree = 1; sfx('chime'); for (let k = 0; k < 40; k++) sparks.emit(wt.localToWorld(V(rnd(-1, 1), rnd(4, 8), rnd(-0.6, 0.6))), tmpW.set(rnd(-0.1, 0.1), rnd(0.2, 0.5), rnd(-0.1, 0.1)), { life: rnd(1.2, 2.2), size: rnd(0.04, 0.07), color: k % 2 ? GOLD : ROSE }); toast('一张许愿签轻轻转了个圈，灯笼更亮了'); });
  add(lathe([[0, 0], [0.7, 0], [0.9, 0.2], [1.0, 1.2], [1.1, 1.35], [0.95, 1.38], [0, 1.38]], 32), std('wtpot', { color: 0x2f6a8a, roughness: 0.25 }), 0, 0, 0, wt);
  const rt = mulberry(77), slips = [], tleaves = [], lanterns = [], bamboo = std('bamboo', { color: 0x6a9a4a, roughness: 0.5 });
  for (let k = 0; k < 3; k++) {
    const sx = (k - 1) * 0.25, pts = [V(sx, 1.3, 0), V(sx + (k - 1) * 0.25, 4.5, (k - 1) * 0.15), V(sx + (k - 1) * 0.5, 8.4 - k * 0.4, (k - 1) * 0.25)];
    const curve = new THREE.CatmullRomCurve3(pts); add(new THREE.TubeGeometry(curve, 16, 0.07 - k * 0.01, 6), bamboo, 0, 0, 0, wt);
    for (let j = 0; j < 7; j++) {
      const p = curve.getPoint(0.4 + j * 0.085), dir = j % 2 ? 1 : -1, bEnd = p.clone().add(V(dir * (0.55 + rt() * 0.35), 0.4 + rt() * 0.3, (rt() - 0.5) * 0.9));
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p, p.clone().lerp(bEnd, 0.5).add(V(0, 0.15, 0)), bEnd]), 8, 0.025, 5), bamboo, 0, 0, 0, wt);
      for (let n = 0; n < 4; n++) tleaves.push([bEnd.clone().add(V((rt() - 0.5) * 0.5, (rt() - 0.5) * 0.3, (rt() - 0.5) * 0.4)), [rt() * 3, rt() * 3, rt() * 3], V(1, 1, 1)]);
      slips.push([bEnd.clone().add(V(0, -0.45, 0.05)), [0, rt() * 3, (rt() - 0.5) * 0.2], V(1, 1, 1), [0xf2a0b8, 0xf2d27a, 0x9ad0f0, 0xa8e0b8, 0xc8a8e8][Math.floor(rt() * 5)]]);
      if (j % 3 === 0) lanterns.push(bEnd.clone().add(V(0, -0.55, 0)));
    }
  }
  scatter(wt, new THREE.PlaneGeometry(0.12, 0.42), std('leafbits', { color: 0x4f8a44, side: THREE.DoubleSide, roughness: 0.5 }), tleaves);
  scatter(wt, new THREE.PlaneGeometry(0.2, 0.62), std('slip', { color: 0xffffff, side: THREE.DoubleSide, roughness: 0.8, emissive: 0x1a1410 }), slips);
  lanterns.forEach((p) => { add(new THREE.SphereGeometry(0.16, 16, 12), std('paperlamp', { color: 0xffd090, emissive: 0xff9a40, emissiveIntensity: 1.2 }), p.x, p.y, p.z, wt).castShadow = false; place(wt, glowSprite(0.8, new THREE.Color(1.6, 1.0, 0.5)), p.x, p.y, p.z); });
  const mo = group(8.9, FLOOR, 6.4);
  plantPot(mo, 0, 0, 0, 0xc46a4a, 2.4);
  for (let k = 0; k < 9; k++) {
    const a = k * 0.72, tilt = 0.4 + (k % 3) * 0.25, len = 1.6 + (k % 3) * 0.4, base = V(0, 1.6, 0), tip = V(Math.cos(a) * len * Math.sin(tilt), 1.6 + len * Math.cos(tilt) * 1.4, Math.sin(a) * len * Math.sin(tilt));
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, base.clone().lerp(tip, 0.5).add(V(0, 0.3, 0)), tip]), 8, 0.035, 5), LEAF(), 0, 0, 0, mo);
    const lf = add(leafGeo(1.5, 0.9, 4), k % 2 ? LEAF() : LEAF2(), tip.x, tip.y, tip.z, mo);
    lf.rotation.set(-0.9 - (k % 3) * 0.2, -a + Math.PI / 2, 0, 'YXZ');
  }

  await slice();
  // things hung from the beams: strings of glass beads, pierced lanterns, glowing orbs, stars and moons
  const beadCluster = (cx, cz, sx, sz, n, seed) => {
    const r = mulberry(seed), items = [], g = group(cx, 0, cz);
    for (let k = 0; k < n; k++) { const x = (r() - 0.5) * sx, z = (r() - 0.5) * sz, len = 6 + Math.floor(r() * 9), c = [0xd8402e, 0x2aa878, 0xe8b830, 0x40b8c8, 0xa86ad8][Math.floor(r() * 5)]; for (let j = 0; j < len; j++) items.push([V(x, top - 0.8 - j * 0.26, z), [0, r() * 3, 0], V(1, 1.6, 1), c]); }
    scatter(g, new THREE.OctahedronGeometry(0.075), std('bead', { roughness: 0.2, metalness: 0.2, emissive: 0x1a1a1a }), items).castShadow = false;
    beadGroups.push(g);
  };
  beadCluster(-6.5, -3.2, 4, 4, 22, 301); beadCluster(6.4, -6.2, 4.5, 3, 20, 302); beadCluster(5.5, 4.5, 4, 3, 16, 303);
  [[-3.0, 3.0, -5.6, '#40d8c0', 0x40d8c0], [4.4, 2.6, -4.2, '#ffb050', 0xffb050], [-4.4, 3.2, 3.8, '#ff6a50', 0xff6a50], [1.6, 2.2, 5.4, '#a8ff70', 0xa8ff70]].forEach(([x, drop, z, css, hex]) => moroccanLamp(x, top - drop, z, css, hex));
  [[2.8, 4.0, 0.8], [-5.2, 3.4, -6.6]].forEach(([x, drop, z]) => orbLamp(x, top - drop, z));
  garland(V(-W / 2 + 0.6, top - 1.0, back + 0.6), V(W / 2 - 0.6, top - 1.0, back + 0.6), 1.9, 26);
  garland(V(-W / 2 + 0.6, top - 0.9, 0), V(W / 2 - 0.6, top - 0.9, 4), 1.6, 24);
  const goldStar = new THREE.ExtrudeGeometry(starShape(0.45, 0.2), { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), goldMoon = new THREE.ExtrudeGeometry(moonShape(0.5), { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
  [[-3.4, 9.6, 1.5, 1], [4.2, 9.2, 2.5, 0], [-5.2, 8.6, -3.5, 0], [5.6, 9.8, -2.5, 1], [-1.8, 10.2, 4.5, 0], [3.6, 10.6, -4.8, 0]].forEach(([x, y, z, moon], i) => {
    const g = group(x, y, z); add(moon ? goldMoon : goldStar, GOLDM(), 0, 0, 0, g);
    add(new THREE.CylinderGeometry(0.008, 0.008, top - y, 4), std('thread', { color: 0x8a7a6a }), 0, (top - y) / 2 + 0.4, 0, g);
    g.userData.ph = i * 1.3; hanging.push(g);
  });
  [[-5.4, -7.5], [5.9, -7.5], [-8.6, -2.5], [8.9, -2.5], [-2.6, 2.5], [6.6, 2.5], [3.9, -6.2]].forEach(([x, z], i) => vine(x, top - 0.7, z, 2.2 + (i % 3) * 0.9, 400 + i));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.3, r = 5 + (i % 3) * 1.4, g = new THREE.Group();
    add(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 12), WAX(), 0, 0, 0, g).castShadow = false;
    place(g, glowSprite(0.7, new THREE.Color(1.8, 1.3, 0.6)), 0, 0.34, 0);
    g.position.set(Math.cos(a) * r + 0.3, 3.8 + (i % 4) * 1.2, Math.sin(a) * r * 0.7 - 1);
    if (g.position.x > 2.5 && g.position.y < 7) g.position.y = 8.3 + (i % 2) * 0.6;      // the two on the right would hang across the neon sign: they float higher
    g.userData.base = g.position.clone(); g.userData.ph = i * 1.7;
    scene.add(g); floaters.push(g);
  }

  await slice();
  // pictures, a crystal pair and a banner, in 3D frames
  frame3d(pictureCanvas('crane', 2.4, 3.0, 962), 2.4, 3.0, 'gold', 8.7, FLOOR + 10.5, back + 0.32, -0.02);
  frame3d(crystalArt(963), 1.2, 1.5, 'black', 5.35, FLOOR + 7.4, back + 0.32, 0.03);
  frame3d(crystalArt(964), 1.2, 1.5, 'black', W / 2 - 0.32, FLOOR + 8.2, 1.3, -0.02, -Math.PI / 2);
  frame3d(pictureCanvas('stars', 1.7, 1.7, 965), 1.7, 1.7, 'oval', 5.35, FLOOR + 10.0, back + 0.32);
  neonSign(7.4, FLOOR + 7.4, back + 0.36, 2.09);         // below and left of the crane, over the chest of drawers, clear of the globe and the vase
  frame3d(pictureCanvas('moonsea', 2.0, 2.4, 966), 2.0, 2.4, 'gold', W / 2 - 0.32, FLOOR + 9.0, 4.2, 0, -Math.PI / 2);
  frame3d(pictureCanvas('cat', 1.3, 1.6, 967), 1.3, 1.6, 'black', W / 2 - 0.32, FLOOR + 8.4, 7.0, 0.05, -Math.PI / 2);
  frame3d(pictureCanvas('ship', 1.8, 1.4, 968), 1.8, 1.4, 'gold', -W / 2 + 0.32, FLOOR + 8.6, 4.4, 0.03, Math.PI / 2);
  frame3d(pictureCanvas('botanical', 1.3, 1.7, 969), 1.3, 1.7, 'wood', -W / 2 + 0.32, FLOOR + 8.4, 6.8, -0.04, Math.PI / 2);
  const ban = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.75, 10, 10), std('banner', { map: tx(bannerCanvas()), roughness: 0.9, side: THREE.DoubleSide }));
  ban.position.set(W / 2 - 0.3, FLOOR + 9.0, -6.6); ban.rotation.y = -Math.PI / 2; scene.add(ban);
  add(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 8), BRASS(), W / 2 - 0.3, FLOOR + 10.95, -6.6, scene, [Math.PI / 2, 0, 0]);
  const fr = []; for (let k = 0; k < 24; k++) fr.push([V(0, 0, -1.15 + k * 0.1)]);
  const fringe = scatter(scene, new THREE.BoxGeometry(0.02, 0.35, 0.03), GOLDM(), fr); fringe.position.set(W / 2 - 0.3, FLOOR + 6.95, -6.6);

  await slice();
  // the desk: rounded walnut, turned legs, an old map under the book, and the things left lying on it
  const walnut = std('walnut', { map: tx(fineWood()), roughness: 0.4 });
  add(rbox(6.4, 0.32, 4.6, 0.12), [darkWood, darkWood, walnut, darkWood, darkWood, darkWood], 0.3, -0.16, -0.1);
  add(rbox(6.0, 0.6, 4.2, 0.08), darkWood, 0.3, -0.6, -0.1);
  [[-2.6, -1.8], [3.2, -1.8], [-2.6, 1.6], [3.2, 1.6]].forEach(([x, z]) => add(lathe([[0, 0], [0.16, 0], [0.2, 0.15], [0.14, 0.5], [0.12, 1.4], [0.18, 1.8], [0.14, 2.2], [0.2, 2.9], [0.24, 3.2], [0, 3.2]], 20), darkWood, x, FLOOR, z));
  add(rbox(1.6, 0.42, 0.12, 0.05), darkWood, 0.3, -0.6, 2.02); add(new THREE.SphereGeometry(0.07, 12, 10), BRASS(), 0.3, -0.6, 2.1);
  const mapSheet = new THREE.Mesh(new THREE.PlaneGeometry(4.7, 3.02), new THREE.MeshLambertMaterial({ map: popTex(worldMap()), alphaTest: 0.5 }));
  mapSheet.receiveShadow = true; mapSheet.rotation.set(-Math.PI / 2, 0, -0.06); mapSheet.position.set(0.3, 0.004, -0.1); scene.add(mapSheet);
  candle(scene, -1.75, 0.03, -1.85, 0.28, 0.05); add(new THREE.CylinderGeometry(0.13, 0.15, 0.03, 24), BRASS(), -1.75, 0.015, -1.85);
  const lp = add(new THREE.CylinderGeometry(0.36, 0.38, 0.05, 48), [std('luoside', { color: 0x8a5a2a }), std('luo', { map: popTex(luopanTex()), roughness: 0.4 }), std('luoside', {})], -2.35, 0.032, -0.85); lp.rotation.y = 0.3;
  const sg = group(-2.45, 0.006, -1.8);
  add(new THREE.CylinderGeometry(0.13, 0.12, 0.42, 20, 1, true), std('qiantong', { color: 0x7a9a4a, roughness: 0.5, side: THREE.DoubleSide }), 0, 0.21, 0, sg);
  for (let k = 0; k < 12; k++) { const a = k * 2.4, r = 0.03 + (k % 3) * 0.025; add(new THREE.BoxGeometry(0.018, 0.55, 0.006), std(k % 4 ? 'stick' : 'stickR', { color: k % 4 ? 0xe8d4a0 : 0xc8372d }), Math.cos(a) * r, 0.36 + (k % 3) * 0.03, Math.sin(a) * r, sg, [Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12]); }
  const back3 = std('cardback', { map: tex(cardBackCanvas()), roughness: 0.5 }), navy = std('navy', { color: 0x1d2650, roughness: 0.5 });
  const tb = group(-2.25, 0, 1.45, 0.35);
  add(rbox(0.31, 0.14, 0.48, 0.02), [navy, navy, back3, navy, navy, navy], 0, 0.07, 0, tb);
  const lidC = canvas(400, 580), lg = lidC.getContext('2d'); lg.fillStyle = '#1d2650'; lg.fillRect(0, 0, 400, 580); lg.strokeStyle = '#d9a441'; lg.lineWidth = 10; lg.strokeRect(14, 14, 372, 552);
  for (let k = 0; k < 5; k++) { const x = 70 + k * 65; lg.fillStyle = '#f2d78f'; lg.beginPath(); lg.arc(x, 120, 22, 0, TAU); lg.fill(); lg.fillStyle = '#1d2650'; lg.beginPath(); lg.arc(x + (k - 2) * 9, 120, 22, 0, TAU); lg.fill(); }
  lg.fillStyle = '#f2d78f'; lg.beginPath(); lg.arc(200, 300, 60, 0, TAU); lg.fill();
  add(rbox(0.32, 0.04, 0.49, 0.015), [navy, navy, std('lid', { map: tex(lidC), roughness: 0.4 }), navy, navy, navy], -2.35, 0.02, 0.45, scene, [0, -0.3, 0]);
  [[-1.62, 1.86, 0.5, 0], [-1.38, 1.7, 0.9, 0], [-1.05, 1.9, 1.3, 1], [-1.6, 1.25, -0.2, 0], [-1.2, 1.32, 0.2, 1], [1.62, -0.95, 0.4, 0], [1.98, -0.6, -0.3, 1]].forEach(([x, z, r, face], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.448), face ? std('face' + i, { map: tex(catTarot([0, 2, 17][[2, 4, 6].indexOf(i)], 300)), roughness: 0.5 }) : back3);
    m.rotation.set(-Math.PI / 2, 0, r); m.position.set(x, 0.01 + i * 0.002, z); m.receiveShadow = m.castShadow = true; scene.add(m);
  });
  const dc = [], rd = mulberry(31);
  [[-0.85, 0.95, 6], [-0.65, 1.25, 4], [-1.0, 1.5, 3]].forEach(([x, z, n]) => { for (let k = 0; k < n; k++) dc.push([V(x + (rd() - 0.5) * 0.01, 0.012 + k * 0.017, z)]); });
  for (let k = 0; k < 9; k++) dc.push([V(-1.3 + rd() * 0.9, 0.012, 0.8 + rd() * 1.2), [(rd() - 0.5) * 0.3, 0, (rd() - 0.5) * 0.3]]);
  scatter(scene, new THREE.CylinderGeometry(0.075, 0.075, 0.016, 24), GOLDM(), dc);
  await slice();
  // a second chart, rolled up and tied with a red ribbon, behind the first
  const sc2 = group(2.0, 0.075, -1.98, 0.12), parch = std('scroll', { color: 0xe6d2a4, roughness: 0.85 });
  add(new THREE.CylinderGeometry(0.075, 0.075, 1.1, 20), parch, 0, 0, 0, sc2, [0, 0, Math.PI / 2]);
  [-0.55, 0.55].forEach((ex) => { add(new THREE.TorusGeometry(0.05, 0.012, 6, 20), std('scrollEdge', { color: 0xb8945a, roughness: 0.9 }), ex, 0, 0, sc2, [0, Math.PI / 2, 0]); add(new THREE.TorusGeometry(0.025, 0.01, 6, 16), std('scrollEdge', {}), ex, 0, 0, sc2, [0, Math.PI / 2, 0]); });
  const ribbon = std('ribbon', { color: 0xa82a2a, roughness: 0.5 });
  add(new THREE.TorusGeometry(0.08, 0.014, 6, 24), ribbon, 0.1, 0, 0, sc2, [0, Math.PI / 2, 0]);
  [[-0.35, 0.3], [0.4, -0.25]].forEach(([rz, ry]) => add(rbox(0.05, 0.006, 0.32, 0.002), ribbon, 0.1 + rz * 0.15, -0.07, 0.17, sc2, [0, ry, 0]));
  [[2.75, 1.25, -0.3, 0], [2.2, 1.6, 0.5, 1]].forEach(([x, z, r, k], i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.44), new THREE.MeshLambertMaterial({ map: tex(envelope(987 + i, k)), alphaTest: 0.5 })); m.rotation.set(-Math.PI / 2, 0, r); m.position.set(x, 0.012 + i * 0.003, z); m.receiveShadow = m.castShadow = true; scene.add(m); });
  const celadon = std('celadon', { color: 0x9ac8b0, roughness: 0.15 });
  add(lathe([[0, 0], [0.05, 0], [0.065, 0.02], [0.075, 0.08], [0.078, 0.1], [0.072, 0.1], [0.068, 0.08], [0.058, 0.025], [0, 0.02]], 28), celadon, 3.05, 0.012, -0.25);
  add(new THREE.CylinderGeometry(0.13, 0.11, 0.012, 32), celadon, 3.05, 0.006, -0.25);
  const pot = group(2.9, 0, 0.6);
  add(lathe([[0, 0], [0.14, 0], [0.2, 0.06], [0.22, 0.16], [0.16, 0.26], [0.06, 0.28], [0, 0.28]], 28), celadon, 0, 0, 0, pot);
  add(new THREE.SphereGeometry(0.04, 10, 8), celadon, 0, 0.3, 0, pot);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.18, 0.1, 0), V(0.3, 0.16, 0), V(0.36, 0.26, 0)]), 8, 0.025, 6), celadon, 0, 0, 0, pot);
  add(new THREE.TorusGeometry(0.1, 0.018, 6, 16, Math.PI), celadon, -0.22, 0.14, 0, pot, [0, 0, Math.PI / 2]);
  const ballG = group(2.7, 0, -1.55);
  prop(ballG, '水晶球 · 看一眼', () => { play.ball = 1; sfx('soft'); toast(BALL_LINES[Math.floor(Math.random() * BALL_LINES.length)]); });
  add(lathe([[0, 0], [0.16, 0], [0.12, 0.05], [0.08, 0.12], [0.12, 0.16], [0, 0.16]], 24), BRASS(), 0, 0, 0, ballG);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; add(new THREE.ConeGeometry(0.025, 0.16, 6), BRASS(), Math.cos(a) * 0.11, 0.2, Math.sin(a) * 0.11, ballG, [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]); }
  // true refracting glass on a computer; a phone gets glowing glass instead, as refraction draws the whole room a second time every frame
  const glass = lowPower ? std('ballglass', { color: 0x3c3080, emissive: 0x8a6ad8, emissiveIntensity: 0.77, roughness: 0.08 }) : new THREE.MeshPhysicalMaterial({ color: 0xe6dcff, roughness: 0.02, transmission: 1, thickness: 0.3, ior: 1.45, clearcoat: 1 });
  add(new THREE.SphereGeometry(0.19, 32, 24), glass, 0, 0.34, 0, ballG).castShadow = false;
  add(new THREE.SphereGeometry(0.07, 16, 12), std('ballcore', { color: 0xd8c8ff, emissive: 0x8a6ad8, emissiveIntensity: 1.4 }), 0, 0.34, 0, ballG).castShadow = false;
  place(ballG, glowSprite(0.8, new THREE.Color(1.0, 0.85, 1.6)), 0, 0.34, 0);

  await slice();
  // an art-nouveau tulip lamp on the desk, its frosted shade glowing
  const tl = group(-1.05, 0, -1.8, 0.35); tl.scale.setScalar(1.6);             // a lamp you notice on the desk
  add(lathe([[0, 0], [0.22, 0], [0.24, 0.03], [0.1, 0.07], [0.05, 0.1], [0, 0.1]], 28), BRASS(), 0, 0, 0, tl);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.08, 0), V(0.06, 0.5, 0), V(-0.03, 0.9, 0), V(0.14, 1.2, 0), V(0.42, 1.22, 0)]), 32, 0.024, 8), BRASS(), 0, 0, 0, tl);
  [[V(0.02, 0.35, 0), 1], [V(0.0, 0.7, 0), -1]].forEach(([p, s2]) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p, p.clone().add(V(s2 * 0.12, 0.08, 0)), p.clone().add(V(s2 * 0.16, 0.2, 0)), p.clone().add(V(s2 * 0.08, 0.22, 0))]), 12, 0.012, 6), BRASS(), 0, 0, 0, tl));
  const shadeMat = std('tulip', { color: 0xffe6c0, emissive: 0xffa850, emissiveIntensity: 1.3, roughness: 0.45, side: THREE.DoubleSide });
  add(lathe([[0.2, 0], [0.23, 0.05], [0.21, 0.15], [0.14, 0.25], [0.05, 0.3], [0, 0.31]], 32), shadeMat, 0.42, 0.9, 0, tl).castShadow = false;
  const tg = place(tl, glowSprite(0.9, new THREE.Color(1.7, 1.15, 0.5)), 0.42, 0.98, 0);
  prop(tl, '台灯 · 开关', () => { lampOn = !lampOn; sfx('soft'); shadeMat.emissiveIntensity = lampOn ? 1.3 : 0.05; tg.visible = lampOn; });
  await slice();
  // the great armillary sphere, hung on chains in front of the window
  orrery = armillary(0.3, 7.0, -0.7, 2.0);
  prop(orrery, '浑天仪 · 拨一下', () => { play.orrery = 1; sfx('soft'); toast('浑天仪的星环转了起来'); });
  pages = floatingPages(8);
  // the gold circle that glows round the book while it waits
  bookHalo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: popTex(magicCircleTex()), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.5, 1.15, 0.6) }));
  bookHalo.rotation.x = -Math.PI / 2; bookHalo.position.set(0.5, 0.012, 0); scene.add(bookHalo);
}

/* ---------- pieces used above ---------- */
function pictureCanvas(kind, w, h, seed) { const c = canvas(Math.round(w * 200), Math.round(h * 200)), p = painter(c, seed, 1.2); PICTURE[kind](px(p, c.width, c.height), p.g, 0, 0, c.width, c.height); return c; }
/**
 * The 人生海海 neon sign (neonSignCanvas): a tribute to Mayday's album, on a clear acrylic board held off the wall by
 * four brass standoffs. Off, it keeps a faint glow, the tubes and the box just alight; a tap lights it, steady, and it
 * lights the wall round it blue; another tap turns it back down to the glow.
 */
let NEON = null;
const NEON_IDLE = 0.22, NEON_LIT = 0.86;                 // how much of the lit face shows: switched off (a faint glow), and lit
function neonSign(x, y, z, w = 2.2) {
  const h = (w * 1080) / 1380, g = group(x, y, z);
  const offTex = tx(neonSignCanvas(0)), onTex = tx(neonSignCanvas(1));
  add(rbox(w + 0.16, h + 0.16, 0.04, 0.02), new THREE.MeshStandardMaterial({ color: 0xdfe8f2, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.035 }), 0, 0, 0, g);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => add(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 12), BRASS(), sx * (w / 2 + 0.01), sy * (h / 2 + 0.01), -0.02, g, [Math.PI / 2, 0, 0]));
  const off = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std('neonOff', { map: offTex, transparent: true, roughness: 0.4, alphaTest: 0.02 })); off.position.z = 0.03; g.add(off);
  const onMat = new THREE.MeshBasicMaterial({ map: onTex, transparent: true, opacity: 0, depthWrite: false });      // laid over the cold sign; the whites go past the bloom threshold, the blue stays blue
  const on = new THREE.Mesh(new THREE.PlaneGeometry(w, h), onMat); on.position.z = 0.035; g.add(on);
  const wash = place(g, glowSprite(w * 2, new THREE.Color(0.18, 0.42, 0.9)), 0, 0, 0.2); wash.material.opacity = 0;   // the blue light it throws on the wall
  const hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), new THREE.MeshBasicMaterial({ visible: false })); g.add(hit);
  prop(hit, '霓虹灯 · 致敬五月天《人生海海》', () => {
    play.neonOn = !play.neonOn; sfx(play.neonOn ? 'bell' : 'soft');
    toast(play.neonOn ? '嗡——霓虹灯亮了。愿你在海海人生里，找到自己的方向。' : '霓虹灯暗了下来');
  });
  NEON = { onMat, wash, repaint: () => { offTex.image = neonSignCanvas(0); onTex.image = neonSignCanvas(1); offTex.needsUpdate = onTex.needsUpdate = true; } };
  // the brush lettering needs Long Cang: paint again once it has loaded, in case it wasn't there yet
  document.fonts?.load("300px 'Long Cang'", '人生海海').then(() => NEON.repaint()).catch(() => {});
  return g;
}
/** a quick, smooth fade between the glow and lit, either way */
function updateNeon(dt) {
  if (!NEON) return;
  play.neon += ((play.neonOn ? NEON_LIT : NEON_IDLE) - play.neon) * Math.min(1, dt * 12);
  NEON.onMat.opacity = play.neon; NEON.onMat.color.setScalar(0.96 + 0.27 * play.neon);     // lit, a little over 1: the bloom picks up the white tubes
  NEON.wash.material.opacity = play.neon * 0.44;
}
/** a picture in a moulded frame: gold, black lacquer, wood, or an oval */
function frame3d(pic, w, h, kind, x, y, z, tilt = 0, ry = 0) {
  const g = group(x, y, z, ry); g.rotation.z = tilt;
  const b = kind === 'black' ? 0.14 : 0.24, matF = kind === 'black' ? std('lacquer', { color: 0x1a1416, roughness: 0.25 }) : kind === 'wood' ? std('darkwood', {}) : std('frameGold', { color: 0xd4a24a, metalness: 0.8, roughness: 0.3 });
  const outer = new THREE.Shape(), inner = new THREE.Path();
  if (kind === 'oval') { outer.absellipse(0, 0, w / 2, h / 2, 0, TAU); inner.absellipse(0, 0, w / 2 - b, h / 2 - b, 0, TAU); }
  else { outer.moveTo(-w / 2, -h / 2); outer.lineTo(w / 2, -h / 2); outer.lineTo(w / 2, h / 2); outer.lineTo(-w / 2, h / 2); inner.moveTo(-w / 2 + b, -h / 2 + b); inner.lineTo(-w / 2 + b, h / 2 - b); inner.lineTo(w / 2 - b, h / 2 - b); inner.lineTo(w / 2 - b, -h / 2 + b); }
  outer.holes.push(inner);
  add(new THREE.ExtrudeGeometry(outer, { depth: 0.1, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 40 }), matF, 0, 0, 0, g);
  const picGeo = kind === 'oval' ? new THREE.CircleGeometry(0.5, 48).scale(w - 2 * b + 0.04, h - 2 * b + 0.04, 1) : new THREE.PlaneGeometry(w - 2 * b + 0.04, h - 2 * b + 0.04);
  const p = new THREE.Mesh(picGeo, new THREE.MeshStandardMaterial({ map: tex(pic), roughness: 0.6 })); p.position.z = 0.03; p.receiveShadow = true; g.add(p);
  return g;
}
/** a tube whose radius changes along its length: turned and carved legs, stalks */
function sweep(curve, radius, segs = 24, radial = 12) {
  const fr = curve.computeFrenetFrames(segs, false), pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = curve.getPointAt(t), rr = radius(t), N = fr.normals[i], B = fr.binormals[i];
    for (let j = 0; j <= radial; j++) { const a = (j / radial) * TAU, cs = Math.cos(a), sn = Math.sin(a); pos.push(p.x + rr * (cs * N.x + sn * B.x), p.y + rr * (cs * N.y + sn * B.y), p.z + rr * (cs * N.z + sn * B.z)); uv.push(j / radial, t); }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** a gilded scallop shell, the carver's favourite ornament */
function shell(parent, x, y, z, s, rot) {
  const g = group(x, y, z, 0, parent); if (rot) g.rotation.set(...rot); g.scale.setScalar(s);
  for (let k = 0; k < 7; k++) { const f = ((k - 3) / 3) * 1.15; add(new THREE.CapsuleGeometry(0.035, 0.22, 4, 8), GOLDM(), Math.sin(f) * 0.13, Math.cos(f) * 0.13, 0, g, [0, 0, -f]).castShadow = false; }
  add(new THREE.SphereGeometry(0.06, 12, 8), GOLDM(), 0, -0.02, 0.02, g);
  return g;
}
/** a Victorian wingback: cabriole legs on brass ball feet, a camel-backed button-tufted back, rolled arms, nailheads, fringe and a tartan throw */
function wingChair(x, z, ry, s) {
  const ch = group(x, FLOOR, z, ry); ch.scale.setScalar(s);
  const wood = std('mahogany', { color: 0x4a2014, roughness: 0.32 }), vel = velvet('wingVel', 0x6a1a2e, 0xe08aa0);
  const tuft = (MATS.tuft ??= new THREE.MeshPhysicalMaterial({ map: tx(tuftCanvas(), 1 / 0.55, 1 / 0.55), bumpMap: tx(tuftCanvas(true), 1 / 0.55, 1 / 0.55, false), bumpScale: 3, roughness: 0.8, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xe08aa0) }));
  // cabriole legs: a swelling knee, a slim ankle, a brass ball in a claw
  const leg = new THREE.CatmullRomCurve3([V(0, 1.3, 0), V(0, 1.0, 0.14), V(0, 0.62, 0.06), V(0, 0.3, -0.06), V(0, 0.12, 0.04)]);
  const legGeo = sweep(leg, (t) => 0.1 + Math.sin(Math.min(1, t * 2.2) * Math.PI) * 0.07 + (t > 0.8 ? (t - 0.8) * 0.4 : 0), 28, 14);
  [[-1.72, 1.42, -0.6], [1.72, 1.42, 0.6], [-1.68, -1.38, -2.4], [1.68, -1.38, 2.4]].forEach(([lx, lz, a]) => {
    const lg = group(lx, 0, lz, a, ch); add(legGeo, wood, 0, 0, 0, lg);
    add(new THREE.SphereGeometry(0.13, 16, 12), BRASS(), 0, 0.13, 0.05, lg);
    for (let k = 0; k < 3; k++) add(new THREE.CapsuleGeometry(0.03, 0.12, 4, 6), wood, Math.cos(k * 2.1) * 0.12, 0.17, 0.05 + Math.sin(k * 2.1) * 0.12, lg, [Math.sin(k * 2.1) * 0.6, 0, -Math.cos(k * 2.1) * 0.6]);
    if (lz > 0) shell(lg, 0, 1.06, 0.26, 0.55, [0.3, 0, 0]);
  });
  // the seat rail, gilt beading, a carved shell at the front, a fringe all round
  add(rbox(3.9, 0.44, 3.3, 0.1), wood, 0, 1.42, 0.05, ch);
  add(new THREE.CylinderGeometry(0.028, 0.028, 3.9, 8), GOLDM(), 0, 1.62, 1.72, ch, [0, 0, Math.PI / 2]);
  shell(ch, 0, 1.3, 1.72, 1.1);
  const fringe = [];
  for (let fx2 = -1.85; fx2 <= 1.85; fx2 += 0.07) fringe.push([V(fx2, 1.07, 1.72)]);
  for (let fz2 = -1.45; fz2 <= 1.6; fz2 += 0.07) [-1, 1].forEach((sd) => fringe.push([V(sd * 1.97, 1.07, fz2)]));
  scatter(ch, new THREE.CylinderGeometry(0.016, 0.01, 0.3, 5), std('fringe', { color: 0xc8963e, roughness: 0.55, metalness: 0.3 }), fringe).castShadow = false;
  // the seat cushion
  add(rbox(3.25, 0.62, 3.05, 0.28), vel, 0, 1.93, 0.2, ch);
  // the back: camel-backed, button-tufted, a gilt crest rail along the top
  const backShape = new THREE.Shape(); backShape.moveTo(-1.75, 0); backShape.lineTo(-1.75, 3.0); backShape.bezierCurveTo(-1.6, 3.55, -0.8, 3.45, 0, 3.8); backShape.bezierCurveTo(0.8, 3.45, 1.6, 3.55, 1.75, 3.0); backShape.lineTo(1.75, 0); backShape.closePath();
  const bk = group(0, 1.63, -1.55, 0, ch); bk.rotation.x = -0.1;
  add(new THREE.ExtrudeGeometry(backShape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.14, bevelSegments: 4, curveSegments: 24 }), [tuft, vel], 0, 0, 0, bk);
  const crestY = (cx) => { const t = Math.abs(cx) / 1.75; return 3.8 - (3.8 - 3.0) * t * t * (1.1 - 0.1 * t); };
  const buttons = [];
  for (let j = 1; j < 9; j++) for (let i = -4; i <= 4; i++) { const bx = (i + (j % 2) * 0.5) * 0.55, by = j * 0.275; if (Math.abs(bx) < 1.45 && by > 0.5 && by < crestY(bx) - 0.35) buttons.push([V(bx, by, 0.67)]); }
  scatter(bk, new THREE.SphereGeometry(0.05, 10, 8), std('tuftBtn', { color: 0x3a0a18, roughness: 0.4 }), buttons).castShadow = false;
  const crest = new THREE.CurvePath(); crest.add(new THREE.CubicBezierCurve3(V(-1.85, 3.0, 0.25), V(-1.7, 3.65, 0.25), V(-0.84, 3.57, 0.25), V(0, 3.94, 0.25))); crest.add(new THREE.CubicBezierCurve3(V(0, 3.94, 0.25), V(0.84, 3.57, 0.25), V(1.7, 3.65, 0.25), V(1.85, 3.0, 0.25)));
  add(new THREE.TubeGeometry(crest, 48, 0.07, 8), GOLDM(), 0, 0, 0, bk);
  shell(bk, 0, 4.0, 0.3, 1.0);
  // the wings, curving forward round the sitter's head
  const wingShape = new THREE.Shape(); wingShape.moveTo(0, 1.0); wingShape.lineTo(0, 3.25); wingShape.bezierCurveTo(0.5, 3.35, 1.0, 3.1, 1.1, 2.6); wingShape.bezierCurveTo(1.2, 2.0, 0.85, 1.6, 0.95, 1.0); wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 16 }).rotateY(-Math.PI / 2);
  [-1, 1].forEach((sd) => { const w = add(wingGeo, vel, sd * 1.5, 1.63, -1.35, ch); w.scale.x = -sd; w.rotation.y = sd * 0.12; });
  // rolled arms with carved fronts, a rosette on each scroll, a line of brass nailheads
  const nails = [];
  [-1, 1].forEach((sd) => {
    add(rbox(0.5, 1.2, 3.1, 0.12), vel, sd * 1.72, 2.2, 0.12, ch);
    add(new THREE.CylinderGeometry(0.36, 0.36, 3.2, 28), vel, sd * 1.8, 2.86, 0.12, ch, [Math.PI / 2, 0, 0]);
    add(rbox(0.66, 1.62, 0.16, 0.06), wood, sd * 1.76, 2.38, 1.74, ch);
    add(new THREE.TorusGeometry(0.17, 0.035, 8, 20), GOLDM(), sd * 1.8, 2.86, 1.83, ch); add(new THREE.SphereGeometry(0.07, 12, 8), GOLDM(), sd * 1.8, 2.86, 1.84, ch);
    for (let nz = -1.35; nz <= 1.6; nz += 0.11) nails.push([V(sd * 1.98, 1.66, nz)]);
    for (let ny = 1.7; ny <= 3.0; ny += 0.11) nails.push([V(sd * 1.76 + sd * 0.3, ny, 1.83)]);
  });
  for (let nx = -1.85; nx <= 1.85; nx += 0.11) nails.push([V(nx, 1.5, 1.72)]);
  scatter(ch, new THREE.SphereGeometry(0.035, 8, 6), BRASS(), nails).castShadow = false;
  // a moon cushion, and a tartan throw over the right arm, fringed
  add(rbox(1.6, 1.4, 0.45, 0.22), std('cushion', { map: tx(decalCanvas('#d9a441', '#6a2a3e', 1250)), roughness: 0.8 }), -0.45, 2.95, -0.75, ch, [-0.22, -0.15, -0.1]);
  const throwGeo = new THREE.PlaneGeometry(1.5, 2.4, 12, 40), tp = throwGeo.attributes.position, R = 0.42, arcLen = R * 2.9;
  for (let i = 0; i < tp.count; i++) {
    const u = tp.getX(i), sArc = 1.2 - tp.getY(i); let px_, py;
    if (sArc < arcLen) { const a = 2.75 - sArc / R; px_ = Math.cos(a) * R; py = Math.sin(a) * R; } else { const a = 2.75 - arcLen / R, d = sArc - arcLen; px_ = Math.cos(a) * R + d * 0.18 + Math.sin(u * 5) * 0.03 * d; py = Math.sin(a) * R - d; }
    tp.setXYZ(i, px_, py, u);
  }
  throwGeo.computeVertexNormals();
  const throwM = add(throwGeo, std('tartan', { map: tx(tartanCanvas(), 3, 4), roughness: 0.95, side: THREE.DoubleSide }), 1.8, 2.86, 0.55, ch);
  const tassels = []; for (let k = 0; k <= 16; k++) { const a = 2.75 - arcLen / R, d = 2.4 - arcLen; tassels.push([V(1.8 + Math.cos(a) * R + d * 0.18, 2.86 + Math.sin(a) * R - d - 0.1, 0.55 - 0.75 + k * (1.5 / 16))]); }
  scatter(ch, new THREE.CylinderGeometry(0.014, 0.01, 0.2, 4), std('throwFringe', { color: 0xe8d8b0, roughness: 0.9 }), tassels).castShadow = false;
  return ch;
}
/** the fireplace as a real firebox: an arched opening cut through the brick, sooty lining, an iron grate, three logs */
function barkCanvas() { const c = canvas(256, 512), g = c.getContext('2d'), r = mulberry(4801); g.fillStyle = '#4a3426'; g.fillRect(0, 0, 256, 512); for (let i = 0; i < 70; i++) { const x = r() * 256, w = 2 + r() * 6; g.fillStyle = r() < 0.5 ? 'rgba(20,12,8,.7)' : 'rgba(120,96,74,.35)'; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 512; y += 16) g.lineTo(x + Math.sin(y * 0.03 + i) * 4, y); g.lineTo(x + w, 512); for (let y = 512; y >= 0; y -= 16) g.lineTo(x + w + Math.sin(y * 0.03 + i) * 4, y); g.fill(); } for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '160,130,100' : '10,6,4'},${0.1 + r() * 0.2})`; g.fillRect(r() * 256, r() * 512, 1 + r() * 2, 2 + r() * 6); } return c; }
function emberCanvas() { const c = canvas(256, 512), g = c.getContext('2d'), r = mulberry(4802); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 512); for (let i = 0; i < 40; i++) { const x = r() * 256, y = r() * 512, l = 20 + r() * 80; const gr = g.createLinearGradient(x, y, x, y + l); gr.addColorStop(0, 'rgba(255,120,30,0)'); gr.addColorStop(0.5, `rgba(255,${100 + r() * 80},30,${0.5 + r() * 0.5})`); gr.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + r() * 3, l); } return c; }
function ringsCanvas() { const c = canvas(256, 256), g = c.getContext('2d'), r = mulberry(4803); g.fillStyle = '#3a281c'; g.beginPath(); g.arc(128, 128, 128, 0, TAU); g.fill(); g.fillStyle = '#b8895a'; g.beginPath(); g.arc(128, 128, 112, 0, TAU); g.fill(); for (let k = 0; k < 16; k++) { g.strokeStyle = `rgba(110,70,40,${0.3 + r() * 0.4})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.ellipse(128 + (r() - 0.5) * 6, 128 + (r() - 0.5) * 6, 8 + k * 6.5, 7 + k * 6.3, r(), 0, TAU); g.stroke(); } [[0.4, 60], [2.1, 80], [4, 50]].forEach(([a, l]) => { g.strokeStyle = 'rgba(40,24,14,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * l, 128 + Math.sin(a) * l); g.stroke(); }); return c; }
function logGeo(len, rad, seed) {
  const geo = new THREE.CylinderGeometry(rad, rad * 0.94, len, 18, 8), p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) { if (Math.abs(n.getY(i)) > 0.5) continue; const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.07 * Math.sin(a * 5 + y * 2.3 + seed) + 0.04 * Math.sin(a * 11 + seed * 2); p.setXYZ(i, x * k, y, z * k); }
  geo.computeVertexNormals(); return geo;
}
function firebox(fx, fz, brick, wood) {
  const H = 6.2, D = 2.2, ow = 1.9, ob = 0.5, os = 2.6;
  const sh = new THREE.Shape(); sh.moveTo(-4, 0); sh.lineTo(4, 0); sh.lineTo(4, H); sh.lineTo(-4, H); sh.closePath();
  const hole = new THREE.Path(); hole.moveTo(-ow, ob); hole.lineTo(-ow, os); hole.absarc(0, os, ow, Math.PI, 0, true); hole.lineTo(ow, ob); hole.lineTo(-ow, ob); sh.holes.push(hole);
  const brickX = std('brickX', { map: tx(brickCanvas(), 0.25, 0.48), bumpMap: tx(brickCanvas(), 0.25, 0.48, false), bumpScale: 2, roughness: 0.85 });
  add(new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 40 }).rotateY(-Math.PI / 2), brickX, fx + D, FLOOR, fz);
  // the inside: sooty brick, lit from the fire
  const soot = std('firelining', { map: tx(brickCanvas(), 0.5, 0.9), color: 0x3a2620, roughness: 1, side: THREE.DoubleSide }), sootP = std('firelining2', { map: tx(brickCanvas(), 0.9, 1.1), color: 0x3a2620, roughness: 1, side: THREE.DoubleSide });
  const back = new THREE.Shape(); back.moveTo(-ow, ob); back.lineTo(ow, ob); back.lineTo(ow, os); back.absarc(0, os, ow, 0, Math.PI, false); back.lineTo(-ow, ob);
  add(new THREE.ShapeGeometry(back, 32).rotateY(Math.PI / 2), soot, fx + 0.3, FLOOR, fz);
  [-1, 1].forEach((s2) => add(new THREE.PlaneGeometry(D - 0.3, os - ob).rotateY(s2 < 0 ? 0 : Math.PI), sootP, fx + 0.3 + (D - 0.3) / 2, FLOOR + (ob + os) / 2, fz + s2 * (ow - 0.02)));
  add(new THREE.CylinderGeometry(ow - 0.02, ow - 0.02, D - 0.3, 40, 1, true, 0, Math.PI), sootP, fx + 0.3 + (D - 0.3) / 2, FLOOR + os, fz, scene, [0, 0, Math.PI / 2]);
  const ashC = canvas(256, 256), ag = ashC.getContext('2d'), ar = mulberry(4804); ag.fillStyle = '#2a2420'; ag.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { ag.fillStyle = ar() < 0.08 ? `rgba(255,${120 + ar() * 80},40,.9)` : `rgba(${90 + ar() * 60},${80 + ar() * 50},${70 + ar() * 40},.5)`; ag.fillRect(ar() * 256, ar() * 256, 1 + ar() * 3, 1 + ar() * 3); }
  add(new THREE.CircleGeometry(1, 40).scale(0.8, 1.7, 1), std('ash', { map: tx(ashC), roughness: 1, emissive: 0xff7020, emissiveMap: tx(ashC), emissiveIntensity: 0.25 }), fx + 1.15, FLOOR + 0.507, fz, scene, [-Math.PI / 2, 0, 0]).castShadow = false;
  // an iron grate on two andirons with brass finials
  const iron = std('iron', { color: 0x2a2624, metalness: 0.7, roughness: 0.5 });
  [-1, 1].forEach((s2) => { const z = fz + s2 * 1.05; add(new THREE.BoxGeometry(1.5, 0.08, 0.08), iron, fx + 1.25, FLOOR + 0.7, z); add(new THREE.CylinderGeometry(0.05, 0.06, 0.9, 10), iron, fx + 2.0, FLOOR + 0.95, z); add(new THREE.SphereGeometry(0.1, 14, 10), BRASS(), fx + 2.0, FLOOR + 1.45, z); add(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 8), iron, fx + 0.55, FLOOR + 0.6, z); });
  [0.75, 1.15, 1.55].forEach((x) => add(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 8), iron, fx + x, FLOOR + 0.76, fz, scene, [Math.PI / 2, 0, 0]));
  // three logs with bark and ring-cut ends, embers glowing in their cracks
  const bark = std('bark', { map: tx(barkCanvas(), 2, 1), bumpMap: tx(barkCanvas(), 2, 1, false), bumpScale: 7, color: 0x8a7a70, roughness: 1, emissive: 0xff6a20, emissiveMap: tx(emberCanvas(), 2, 1), emissiveIntensity: 0.8 }), rings = std('rings', { map: tx(ringsCanvas()), roughness: 0.9 });
  [[fx + 0.95, FLOOR + 0.98, 0.21, 2.3, 0.08], [fx + 1.52, FLOOR + 0.96, 0.19, 2.2, -0.1]].forEach(([x, y, r2, l, tw], i) => add(logGeo(l, r2, i * 3), [bark, rings, rings], x, y, fz + tw, scene, [Math.PI / 2, 0, tw * 0.5]));
  add(logGeo(1.5, 0.16, 7), [bark, rings, rings], fx + 1.25, FLOOR + 1.32, fz + 0.15, scene, [0.25, 0, Math.PI / 2 - 0.15]);
}
/** a velvet drape with real pleats, gold trim at its edge and hem, a fringe, rings on the rod, a rope tieback and tassel */
function velvetCanvas() {
  const c = canvas(512, 512), g = c.getContext('2d'), r = mulberry(4701);
  for (let x = 0; x < 512; x++) { const v = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(x * 0.12)) * (0.7 + 0.3 * Math.sin(x * 0.031 + 1)); g.fillStyle = `rgb(${Math.round(128 * v)},${Math.round(42 * v)},${Math.round(80 * v)})`; g.fillRect(x, 0, 1, 512); }
  for (let i = 0; i < 12000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,200,225,.05)' : 'rgba(0,0,0,.07)'; g.fillRect(r() * 512, r() * 512, 1, 2 + r() * 4); }
  g.fillStyle = '#c9a24e'; g.fillRect(486, 0, 18, 512); g.fillStyle = '#7a5a22'; g.fillRect(484, 0, 2, 512); g.fillRect(504, 0, 2, 512);
  for (let y = 8; y < 512; y += 14) { g.fillStyle = '#ecd08a'; g.beginPath(); g.arc(495, y, 3.2, 0, TAU); g.fill(); }
  g.fillStyle = '#c9a24e'; g.fillRect(0, 492, 512, 16); g.fillStyle = '#7a5a22'; g.fillRect(0, 490, 512, 2);
  for (let x = 8; x < 512; x += 14) { g.fillStyle = '#ecd08a'; g.beginPath(); g.arc(x, 500, 3.2, 0, TAU); g.fill(); }
  return c;
}
/**
 * A velvet curtain tied back to one side. The wall edge (x = -w/2) hangs straight from the rod; the leading edge
 * sweeps down to the tie in one curve and fans out again below it. Folds deepen and wander as the cloth is squeezed
 * in, the cloth blouses a little over the rope, and the hem is worked out from the cloth itself: a fold that travels
 * further sideways on its way to the tie has less length left below it, so the hem climbs towards the leading edge.
 */
const DRAPE_NX = 96, DRAPE_NY = 88, DRAPES = {};
function drapeGeo(w, h, vt, liftK) {
  const geo = new THREE.PlaneGeometry(w, h, DRAPE_NX, DRAPE_NY), p = geo.attributes.position, TW = 0.2, BW = 0.6;
  const sm = (k) => { k = Math.min(1, Math.max(0, k)); return k * k * (3 - 2 * k); };
  const keep = (v) => v >= vt ? TW + (1 - TW) * (1 - Math.pow(Math.max(0, 1 - (v - vt) / (1 - vt)), 2.3)) : TW + (BW - TW) * (1 - Math.pow(Math.max(0, 1 - (vt - v) / vt), 2));   // float32 rows can sit a hair outside [0, 1]
  const shape = (a, v) => {
    const f = keep(v), squeeze = (1 - f) / (1 - TW), top = sm((v - 0.93) / 0.07), below = v < vt ? (vt - v) / vt : 0;
    const wander = (1 - top) * (0.75 * Math.sin(v * 3.1 + a * 1.7) + 0.35 * Math.sin(v * 8.3 + a * 3 + 2.1));
    const sn = Math.sin(a * Math.PI * 8 + wander), fold = Math.sign(sn) * Math.pow(Math.abs(sn), 0.65);   // round bellies, tight creases
    const depth = (0.07 + 0.12 * squeeze) * (0.8 + 0.4 * (0.5 + 0.5 * Math.sin(a * 13.7 + 1.1)));
    const tie = Math.exp(-(((v - vt) / 0.045) ** 2)), blouse = 0.15 * Math.exp(-(((v - vt - 0.065) / 0.06) ** 2)) * (0.35 + 0.65 * a);
    const z = fold * depth + Math.sin(a * Math.PI * 23 + v * 7 + wander) * 0.018 * (1 - tie) + tie * 0.16 + blouse + 0.1 * below * a;
    return [-w / 2 + a * w * f, z, fold];
  };
  // length of cloth each column uses between the rod and the hem line, against the straight wall edge
  const cols = DRAPE_NX + 1, extra = new Float32Array(cols), N = 240;
  for (let c = 0; c < cols; c++) {
    let len = 0, prev = shape(c / DRAPE_NX, 1);
    for (let k = 1; k <= N; k++) { const v = 1 - k / N, q = shape(c / DRAPE_NX, v); len += Math.hypot(q[0] - prev[0], h / N, q[1] - prev[1]); prev = q; }
    extra[c] = len;
  }
  for (let c = cols - 1; c >= 0; c--) extra[c] -= extra[0];
  for (let i = 0; i < p.count; i++) {
    const c = i % cols, y = p.getY(i), v = Math.min(1, Math.max(0, (y + h / 2) / h)), a = c / DRAPE_NX, [x, z, fold] = shape(a, v), below = v < vt ? (vt - v) / vt : 0;
    const lift = (extra[c] * liftK + h * 0.012 * a) * below + fold * 0.035 * below ** 6;   // a little ripple in the hem line where the folds swing
    p.setXYZ(i, x, y + lift, z);
  }
  geo.computeVertexNormals(); return geo;
}
/** A two-ply cord following a curve. */
function cordGeos(curve, r, n = 160, twists = 18) {
  const fr = curve.computeFrenetFrames(n, curve.closed), plies = [[], []];
  for (let i = 0; i <= n; i++) {
    const t = i / n, c = curve.getPointAt(t), k = Math.min(i, n - 1), th = t * Math.PI * 2 * twists;
    plies.forEach((pts, j) => pts.push(c.clone().addScaledVector(fr.normals[k], Math.cos(th + j * Math.PI) * r * 0.55).addScaledVector(fr.binormals[k], Math.sin(th + j * Math.PI) * r * 0.55)));
  }
  return plies.map((pts) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, curve.closed), n, r * 0.62, 7, curve.closed));
}
function strandCanvas() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 8; const g = c.getContext('2d');
  for (let i = 0; i < 256; i += 4) { g.fillStyle = `hsl(42 62% ${52 + ((i * 37) % 23)}%)`; g.fillRect(i, 0, 3, 8); g.fillStyle = 'hsl(36 50% 26%)'; g.fillRect(i + 3, 0, 1, 8); }
  return c;
}
/** A silk tassel hanging from (x, y, z): cord, turned head, collar and a skirt of strands. */
function tassel(parent, x, y, z, len = 0.42) {
  const gold = std('rope', { color: 0xd8b060, roughness: 0.5, metalness: 0.4 });
  const strands = MATS.tasselStrand ??= new THREE.MeshStandardMaterial({ map: tx(strandCanvas()), roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  add(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 6), gold, x, y - 0.07, z, parent);
  const head = new THREE.LatheGeometry([[0, 0], [0.05, 0.01], [0.068, 0.05], [0.06, 0.09], [0.034, 0.125], [0.02, 0.15], [0, 0.152]].map(([r, h]) => new THREE.Vector2(r, h)), 20);
  add(head, GOLDM(), x, y - 0.14 - 0.152, z, parent);
  add(new THREE.TorusGeometry(0.052, 0.014, 6, 20), gold, x, y - 0.3, z, parent, [Math.PI / 2, 0, 0]);
  const skirt = new THREE.LatheGeometry(Array.from({ length: 9 }, (_, k) => { const t = k / 8; return new THREE.Vector2(0.046 + 0.05 * Math.pow(t, 1.4), -t * len); }).reverse(), 48);
  add(skirt, strands, x, y - 0.3, z, parent);
}
/** A tied-back velvet curtain centred at (s·x, y, z); `o.h` is its length, `o.tie` how far up it the tieback sits. */
function velvetDrape(s, x, y, z, o = {}) {
  const w = 2.4, h = o.h ?? 9.6, vt = o.tie ?? 0.34, liftK = o.lift ?? 1.5, geo = (DRAPES[[h, vt, liftK]] ??= drapeGeo(w, h, vt, liftK));
  const mat = o.mat ?? (MATS.drape ??= new THREE.MeshPhysicalMaterial({ map: tx(velvetCanvas()), roughness: 0.82, sheen: 1, sheenRoughness: 0.32, sheenColor: new THREE.Color(0xf2a8c8), side: THREE.DoubleSide }));
  const m = add(geo, mat, s * x, y, z, o.parent ?? scene); m.scale.x = -s;
  const p = geo.attributes.position, hem = [], ring = [], tie = { x0: 9, x1: -9, z0: 9, z1: -9, y: 0, n: 0 }, cols = DRAPE_NX + 1, tieRow = Math.round((1 - vt) * DRAPE_NY);
  for (let i = 0; i < p.count; i++) {
    const row = Math.floor(i / cols), col = i % cols, px_ = p.getX(i), py = p.getY(i), pz = p.getZ(i);
    if (row === DRAPE_NY && col % 3 === 0) hem.push([V(px_, py - 0.12, pz)]);
    if (row === 0 && col % 12 === 0) ring.push([V(px_, py + 0.06, pz), [0, Math.PI / 2, 0]]);
    if (Math.abs(row - tieRow) <= 1) { tie.x0 = Math.min(tie.x0, px_); tie.x1 = Math.max(tie.x1, px_); tie.z0 = Math.min(tie.z0, pz); tie.z1 = Math.max(tie.z1, pz); tie.y += py; tie.n++; }
  }
  scatter(m, new THREE.CylinderGeometry(0.012, 0.008, 0.24, 5), GOLDM(), hem).castShadow = false;
  scatter(m, new THREE.TorusGeometry(0.1, 0.022, 6, 16), BRASS(), ring).castShadow = false;
  // the tieback: a cord hugging the bundle, sagging a touch at the front, knotted on the wall side with two tassels
  const ty = tie.y / tie.n, cx = (tie.x0 + tie.x1) / 2, cz = (tie.z0 + tie.z1) / 2, rx = (tie.x1 - tie.x0) / 2 + 0.05, rz = (tie.z1 - tie.z0) / 2 + 0.05;
  const loop = new THREE.CatmullRomCurve3(Array.from({ length: 16 }, (_, k) => { const t = (k / 16) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t); return V(cx + rx * c - (c < 0 ? 0.06 * c * c : 0), ty - 0.07 * Math.max(0, sn) + 0.02 * c, cz + rz * sn); }), true);
  const rope = std('rope', { color: 0xd8b060, roughness: 0.5, metalness: 0.4 });
  cordGeos(loop, 0.05).forEach((g) => add(g, rope, 0, 0, 0, m));
  const kx = tie.x0 - 0.1, kz = cz;
  add(new THREE.SphereGeometry(0.075, 14, 10), GOLDM(), kx, ty + 0.01, kz, m);
  tassel(m, kx - 0.03, ty - 0.03, kz + 0.04, 0.44); tassel(m, kx + 0.05, ty - 0.05, kz - 0.03, 0.36);
}
/** little figures for the mantel: porcelain cats, a ship, a music box with a turning star, nesting dolls, a starfish and a shell */
function porcelainCat(x, y, z, ry, s = 1) {
  const g = group(x, y, z, ry); g.scale.setScalar(s); const por = std('porcelain', { color: 0xf6f2ea, roughness: 0.15 }), gold = GOLDM();
  add(lathe([[0, 0], [0.2, 0], [0.22, 0.08], [0.2, 0.3], [0.14, 0.46], [0.1, 0.52], [0, 0.53]], 24), por, 0, 0, 0, g);
  add(new THREE.SphereGeometry(0.15, 20, 16), por, 0, 0.62, 0.02, g).scale.set(1, 0.92, 0.95);
  [-1, 1].forEach((d) => { add(new THREE.ConeGeometry(0.05, 0.11, 4), por, d * 0.08, 0.76, 0.0, g, [0, Math.PI / 4, d * -0.25]); add(new THREE.SphereGeometry(0.018, 8, 6), std('catEyeBlue', { color: 0x3a6ac8, roughness: 0.2 }), d * 0.055, 0.64, 0.135, g); });
  add(new THREE.SphereGeometry(0.014, 8, 6), std('catNose', { color: 0xe08a9a }), 0, 0.6, 0.15, g);
  add(new THREE.TorusGeometry(0.105, 0.016, 6, 24), gold, 0, 0.5, 0.01, g, [Math.PI / 2, 0, 0]); add(new THREE.SphereGeometry(0.03, 10, 8), gold, 0, 0.47, 0.11, g);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.06, -0.18), V(0.18, 0.06, -0.12), V(0.24, 0.05, 0.06), V(0.16, 0.04, 0.18)]), 16, 0.035, 8), por, 0, 0, 0, g);
  [-1, 1].forEach((d) => add(new THREE.SphereGeometry(0.05, 10, 8), por, d * 0.07, 0.04, 0.17, g).scale.set(1, 0.7, 1.2));
}
function shipModel(x, y, z, ry) {
  const g = group(x, y, z, ry), wood = std('mahogany', { color: 0x4a2014, roughness: 0.32 }), sail = std('sail', { color: 0xf2e8d2, roughness: 0.8, side: THREE.DoubleSide });
  add(rbox(0.5, 0.08, 0.18, 0.03), wood, 0, 0.04, 0, g); [-0.15, 0.15].forEach((dx) => add(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), BRASS(), dx, 0.14, 0, g));
  const hull = new THREE.Shape(); hull.moveTo(-0.42, 0.12); hull.quadraticCurveTo(-0.3, -0.04, 0, -0.05); hull.quadraticCurveTo(0.34, -0.04, 0.46, 0.14); hull.lineTo(-0.42, 0.12);
  add(new THREE.ExtrudeGeometry(hull, { depth: 0.16, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }).translate(0, 0, -0.08), wood, 0, 0.27, 0, g);
  [[-0.18, 0.55], [0.06, 0.66], [0.28, 0.48]].forEach(([mx, mh]) => { add(new THREE.CylinderGeometry(0.01, 0.012, mh, 6), wood, mx, 0.4 + mh / 2, 0, g); [0.3, 0.62].forEach((t) => { const sw = 0.24 - t * 0.12, sg = new THREE.PlaneGeometry(sw, mh * 0.26, 6, 4), sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.cos((sp.getX(i) / sw) * Math.PI) * 0.03); sg.computeVertexNormals(); add(sg, sail, mx, 0.4 + mh * t, 0.02, g); }); add(new THREE.PlaneGeometry(0.08, 0.04), std('flag', { color: 0xc8372d, side: THREE.DoubleSide }), mx + 0.04, 0.42 + mh, 0, g); });
}
function musicChest(x, y, z, ry) {
  const g = group(x, y, z, ry), wood = std('walnutBox', { map: tx(grainCanvas('#7a4a2a', '#2a160c', 4901), 1, 1), roughness: 0.4 });
  add(rbox(0.5, 0.2, 0.36, 0.03), wood, 0, 0.1, 0, g); add(rbox(0.52, 0.025, 0.38, 0.01), GOLDM(), 0, 0.205, 0, g);
  const lid = group(0, 0.21, -0.18, 0, g); lid.rotation.x = -1.9; add(rbox(0.5, 0.06, 0.36, 0.02), wood, 0, 0.03, 0.18, lid); add(new THREE.PlaneGeometry(0.42, 0.28), std('boxMirror', { color: 0xdfe6ee, metalness: 1, roughness: 0.08 }), 0, -0.002, 0.18, lid, [Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), BRASS(), 0, 0.3, 0.02, g);
  const st = group(0, 0.42, 0.02, 0, g); add(new THREE.ExtrudeGeometry(starShape(0.08, 0.035), { depth: 0.015, bevelEnabled: false }), std('boxStar', { color: 0xffe2a0, emissive: 0xffb040, emissiveIntensity: 1.2 }), 0, 0, 0, st).castShadow = false; st.add(glowSprite(0.35, new THREE.Color(1.5, 1.1, 0.5)));
  spinners.push(st);
}
function matryoshka(x, y, z, s, colors) {
  const g = group(x, y, z, -Math.PI / 2 - 0.3); g.scale.setScalar(s);
  const C = document.createElement('canvas'); C.width = 256; C.height = 128; const c = C.getContext('2d');
  c.fillStyle = colors[0]; c.fillRect(0, 0, 256, 128); c.fillStyle = '#f6e8d6'; c.beginPath(); c.ellipse(64, 40, 26, 28, 0, 0, TAU); c.fill(); c.fillStyle = '#3a2418'; [56, 72].forEach((ex) => { c.beginPath(); c.arc(ex, 38, 3, 0, TAU); c.fill(); }); c.fillStyle = '#e07a8a'; [50, 78].forEach((ex) => { c.beginPath(); c.arc(ex, 48, 5, 0, TAU); c.fill(); }); c.fillStyle = colors[1]; c.beginPath(); c.ellipse(64, 100, 34, 20, 0, 0, TAU); c.fill(); for (let k = 0; k < 5; k++) { c.fillStyle = '#f2d060'; c.beginPath(); c.arc(40 + k * 12, 100, 4, 0, TAU); c.fill(); }
  add(lathe([[0, 0], [0.2, 0], [0.24, 0.1], [0.22, 0.3], [0.14, 0.42], [0.16, 0.52], [0.13, 0.64], [0, 0.68]], 28), std('doll' + colors[0], { map: tx(C), roughness: 0.25 }), 0, 0, 0, g);
}
function starfish(x, y, z, ry) { const sh = starShape(0.16, 0.06); add(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 }), std('starfish', { color: 0xe8905a, roughness: 0.8 }), x, y + 0.03, z, scene, [-Math.PI / 2, 0, ry]); }
function conch(x, y, z, ry) { const g = group(x, y, z, ry); add(fullCone(0.12, 0.34, 16, 6).rotateZ(Math.PI / 2), std('conch', { color: 0xf2dcc4, roughness: 0.45 }), 0, 0.1, 0, g); add(new THREE.TorusGeometry(0.08, 0.04, 8, 16, Math.PI * 1.4), std('conchIn', { color: 0xf0b8a8, roughness: 0.4 }), 0.1, 0.1, 0, g, [0, Math.PI / 2, 0]); }
/** the mantelpiece, dressed: a sunburst mirror, a clock, candlesticks, a ginger jar, a bell jar with a moon in it, pampas, books, a little oil lamp, a swag of greenery */
function mantelpiece(y0, fz) {
  const front = -8.1, mid = -8.75;
  // a gilt sunburst mirror on the chimney breast
  const sm = group(-9.36, y0 + 2.6, fz, Math.PI / 2);
  prop(sm, '太阳镜 · 照一照', () => { sfx('chime'); burstAt(sparks, sm.localToWorld(V(0, 0, 0.2)), 40, { speed: 0.5, up: 0.3, size: 0.05, color: GOLD }); play.mirror = 1; toast(MIRROR_LINES[(play.mirrorTurn = ((play.mirrorTurn ?? -1) + 1) % MIRROR_LINES.length)]); });
  play.mirrorObj = sm;
  add(new THREE.CircleGeometry(0.72, 48), std('mirror', { color: 0xe6ecf4, metalness: 1, roughness: 0.04 }), 0, 0, 0.03, sm).castShadow = false;
  add(new THREE.TorusGeometry(0.76, 0.07, 10, 48), GOLDM(), 0, 0, 0.04, sm);
  for (let k = 0; k < 28; k++) { const a = (k / 28) * TAU, l = k % 2 ? 0.42 : 0.82, m = add(new THREE.ConeGeometry(k % 2 ? 0.045 : 0.06, l, 6), GOLDM(), Math.cos(a) * (0.82 + l / 2), Math.sin(a) * (0.82 + l / 2), 0.02, sm); m.rotation.z = a - Math.PI / 2; m.castShadow = false; if (!(k % 2)) add(new THREE.SphereGeometry(0.06, 10, 8), GOLDM(), Math.cos(a) * 1.68, Math.sin(a) * 1.68, 0.02, sm).castShadow = false; }
  for (let k = 0; k < 20; k++) { const a = (k / 20) * TAU; add(new THREE.SphereGeometry(0.035, 8, 6), GOLDM(), Math.cos(a) * 0.88, Math.sin(a) * 0.88, 0.06, sm).castShadow = false; }
  // a mahogany mantel clock with an arched top and a gilt finial
  const ck = group(mid - 0.05, y0, fz, Math.PI / 2), wood = std('mahogany', { color: 0x4a2014, roughness: 0.32 });
  prop(ck, '座钟 · 听它报时', () => { sfx('bell'); const h = new Date().getHours() % 12 || 12; toast(`当——当——现在是 ${h} 点钟`); });
  add(rbox(1.05, 0.12, 0.55, 0.04), GOLDM(), 0, 0.06, 0, ck);
  add(rbox(0.82, 0.86, 0.44, 0.05), wood, 0, 0.55, 0, ck);
  add(new THREE.CylinderGeometry(0.41, 0.41, 0.44, 28, 1, false, -Math.PI / 2, Math.PI), wood, 0, 0.98, 0, ck, [-Math.PI / 2, 0, 0]);
  add(new THREE.CircleGeometry(0.27, 40), std('clockface', { map: tx(clockFaceCanvas()), roughness: 0.5 }), 0, 0.82, 0.225, ck);
  add(new THREE.TorusGeometry(0.28, 0.035, 8, 40), GOLDM(), 0, 0.82, 0.23, ck);
  add(new THREE.SphereGeometry(0.07, 12, 8), GOLDM(), 0, 1.44, 0, ck); add(new THREE.ConeGeometry(0.04, 0.16, 8), GOLDM(), 0, 1.55, 0, ck);
  [-0.36, 0.36].forEach((cx) => add(new THREE.SphereGeometry(0.06, 10, 8), GOLDM(), cx, 0.03, 0.2, ck));
  // a framed card leaning on the breast, a pair of stubby candles before it
  const fr = group(-9.2, y0, fz + 0.75, Math.PI / 2); const fm = group(0, 0, 0, 0, fr); fm.rotation.x = -0.18;
  add(rbox(0.5, 0.74, 0.05, 0.02), GOLDM(), 0, 0.37, 0, fm); add(new THREE.PlaneGeometry(0.38, 0.6), std('mantelCard', { map: tex(catTarot(17, 300)), roughness: 0.5 }), 0, 0.37, 0.03, fm);
  // a pair of porcelain cats either side of the clock, a ship model and a music box further out
  porcelainCat(mid + 0.05, y0, fz - 1.35, Math.PI / 2 + 0.35, 1.1); porcelainCat(mid + 0.05, y0, fz + 1.35, Math.PI / 2 - 0.35, 1.1);
  shipModel(mid, y0, fz - 2.5, Math.PI / 2 - 0.1);
  musicChest(mid + 0.05, y0, fz + 2.4, Math.PI / 2 + 0.2);
  crystals(scene, -8.42, y0, fz - 0.72, 0.7); hourglass(scene, -8.45, y0, fz + 0.62, 0.55);
  // left end: three nesting dolls in a row
  [[-9.0, -3.95, 1.0, ['#c8372d', '#2f6a4a']], [-8.7, -3.55, 0.78, ['#2f4a8a', '#c8372d']], [-8.45, -3.25, 0.58, ['#d9a441', '#6a3a8a']]].forEach(([x, dz, sc, col]) => matryoshka(x, y0, fz + dz, sc, col));
  // right end: old books, a little brass oil lamp on top, a starfish and a shell from the sea
  [[0.56, 0.14, 0x6b3f7d, 0.1], [0.5, 0.12, 0x2f4a6a, -0.12], [0.44, 0.1, 0x8a2a2a, 0.2]].forEach(([w, h, c, rot], i) => add(rbox(w + 0.3, h, w, 0.03), std('mbk' + c, { color: c, roughness: 0.7 }), -9.35, y0 + 0.07 + i * 0.13, fz + 3.85, scene, [0, rot, 0]));
  const ol = group(-9.35, y0 + 0.38, fz + 3.85, -0.6);
  add(lathe([[0, 0], [0.12, 0], [0.2, 0.06], [0.18, 0.14], [0.08, 0.18], [0.05, 0.24], [0, 0.26]], 20), BRASS(), 0, 0, 0, ol);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.15, 0.1, 0), V(0.32, 0.14, 0), V(0.42, 0.22, 0)]), 8, 0.03, 6), BRASS(), 0, 0, 0, ol);
  add(new THREE.TorusGeometry(0.09, 0.018, 6, 16, Math.PI * 1.3), BRASS(), -0.2, 0.12, 0, ol);
  flame(ol, 0.42, 0.23, 0, 0.6);
  starfish(-8.45, y0, fz + 3.3, 0.6); conch(-8.5, y0, fz + 3.75, 0.4);
  // a swag of greenery along the front edge, fairy lights caught in it
  const rl = mulberry(612), leaves = [], lights = [];
  [[fz - 4.3, fz - 1.45], [fz - 1.45, fz + 1.45], [fz + 1.45, fz + 4.3]].forEach(([z0, z1]) => {
    const pts = catenary(V(front + 0.06, y0 - 0.05, z0), V(front + 0.06, y0 - 0.05, z1), 0.55, 16);
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.025, 5), std('vine', { color: 0x3a4a2a }), 0, 0, 0).castShadow = false;
    pts.forEach((p, i) => { for (let k = 0; k < 4; k++) leaves.push([p.clone().add(V(0.05 + rl() * 0.1, (rl() - 0.5) * 0.18, (rl() - 0.5) * 0.18)), [rl() * TAU, rl() * TAU, rl() * TAU], V(1, 1, 1), rl() < 0.5 ? 0x5a8a5a : 0x7aa08a]); if (i % 3 === 1) lights.push(p.clone().add(V(0.12, -0.04, 0))); });
  });
  scatter(scene, leafGeo(0.3, 0.16), std('swagLeaf', { color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide }), leaves).castShadow = false;
  scatter(scene, new THREE.SphereGeometry(0.05, 8, 6), std('bulb', { color: 0xfff0c0, emissive: 0xffc860, emissiveIntensity: 2 }), lights.map((p) => [p])).castShadow = false;
  const lg = new Sparks(lights.length); lights.forEach((p) => lg.emit(p, V(0, 0, 0), { life: 1e9, size: 0.3, color: new THREE.Color(1.7, 1.25, 0.6), drag: 0 })); lg.update(0); scene.add(lg.points);
}
/** a ginger tabby curled up asleep by the fire: back rounded, head resting on its paws, tail wrapped round the front */
/** a round, fluffy bed for the cat: a fat plush rim, lumpy as fleece, round a soft cushion */
function catBed(x, y, z) {
  const g = group(x, y, z), c = canvas(256, 256), cg = c.getContext('2d'), rr = mulberry(5150);
  cg.fillStyle = '#d6a4ac'; cg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {                                   // short soft strokes of fur in all directions
    const px_ = rr() * 256, py = rr() * 256, a = rr() * Math.PI * 2, l = 3 + rr() * 6, v = 185 + rr() * 60;
    cg.strokeStyle = `rgba(${v},${v - 58},${v - 48},.55)`; cg.lineWidth = 1.2; cg.beginPath(); cg.moveTo(px_, py); cg.lineTo(px_ + Math.cos(a) * l, py + Math.sin(a) * l); cg.stroke();
  }
  const fleece = new THREE.MeshPhysicalMaterial({ map: tx(c, 3, 1), bumpMap: tx(c, 3, 1, false), bumpScale: 4, roughness: 1, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xfff6ea) });
  const gc = canvas(256, 256), gg = gc.getContext('2d');                       // pink-and-white gingham for the cushion
  gg.fillStyle = '#fbf4f2'; gg.fillRect(0, 0, 256, 256); gg.fillStyle = 'rgba(226,160,170,.55)'; gg.fillRect(0, 0, 128, 256); gg.fillRect(0, 0, 256, 128); gg.fillStyle = 'rgba(214,138,150,.55)'; gg.fillRect(0, 0, 128, 128);
  const plush = new THREE.MeshPhysicalMaterial({ map: tx(gc, 3, 3), bumpMap: tx(c, 2, 2, false), bumpScale: 1.5, roughness: 0.95, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xfff0f2) });
  // the rim: a thick ring, pushed in and out a little all round so it looks stuffed rather than turned
  const rim = new THREE.TorusGeometry(0.95, 0.4, 28, 72), rp = rim.attributes.position, n = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) {
    q.fromBufferAttribute(rp, i); const a = Math.atan2(q.y, q.x), ring = V(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0); n.copy(q).sub(ring).normalize();
    q.addScaledVector(n, 0.035 * Math.sin(a * 9) + 0.02 * Math.sin(a * 23 + q.z * 9) + 0.012 * (rr() - 0.5)); rp.setXYZ(i, q.x, q.y, q.z);
  }
  rim.computeVertexNormals(); rim.rotateX(Math.PI / 2).scale(1, 0.55, 1);
  add(rim, fleece, 0, 0.26, 0, g);
  add(new THREE.CylinderGeometry(0.98, 1.02, 0.16, 48), fleece, 0, 0.08, 0, g);            // the base under it all
  const cush = new THREE.SphereGeometry(0.86, 40, 16).scale(1, 0.16, 1); add(cush, plush, 0, 0.2, 0, g);
  return g;
}
/*
 * A little white cat asleep, curled nose-to-tail in her bed like a porcelain figure: the long loaf of her body, the round
 * haunch, the hind paws together in front, her chin on her forepaws, the tail wrapped round the front. Her head is narrow
 * at the crown and full at the cheeks, two soft whisker pads under a small pink nose. Tapped, she lifts her head and opens
 * her odd eyes, one blue and one amber, roundish pupils. Body and head are each one smooth surface (a distance field
 * blended where the parts meet), so the joins flow like clay; eyes, nose and mouth are laid onto that surface.
 * Local axes: +z toward the room, +x to her right, y up; the head's own +x is the way her face points.
 */
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const sdEll = (x, y, z, c, r) => {                                                       // an ellipsoid, near enough
  const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2], k0 = Math.sqrt(px * px + py * py + pz * pz);
  const qx = px / r[0], qy = py / r[1], qz = pz / r[2];
  return (k0 * (k0 - 1)) / Math.max(1e-6, Math.sqrt(qx * qx + qy * qy + qz * qz));
};
const sdLimb = (x, y, z, a, b, ra, rb) => {                                              // a capsule tapering from ra at a to rb at b
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2];
  const t = Math.min(1, Math.max(0, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz)));
  const dx = px - bx * t, dy = py - by * t, dz = pz - bz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t);
};
/** the smooth closed surface where a distance field f crosses zero, sampled every h over the box lo..hi (naive surface nets) */
function fieldMesh(f, lo, hi, h) {
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const val = new Float32Array(nx * ny * nz), at = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[at(i, j, k)] = f(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
  // one vertex in every cell the surface passes through, at the mean of its edge crossings
  const cx = nx - 1, cy = ny - 1, cell = new Int32Array(cx * cy * (nz - 1)).fill(-1), pos = [], idx = [], v = new Float32Array(8);
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]], E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let inside = 0;
    for (let c = 0; c < 8; c++) { v[c] = val[at(i + C[c][0], j + C[c][1], k + C[c][2])]; if (v[c] < 0) inside++; }
    if (inside === 0 || inside === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) { if (v[a] < 0 === v[b] < 0) continue; const t = v[a] / (v[a] - v[b]); sx += C[a][0] + (C[b][0] - C[a][0]) * t; sy += C[a][1] + (C[b][1] - C[a][1]) * t; sz += C[a][2] + (C[b][2] - C[a][2]) * t; n++; }
    cell[i + cx * (j + cy * k)] = pos.length / 3; pos.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
  }
  // a quad across every grid edge the surface cuts, joining the four cells round it
  const ci = (i, j, k) => cell[i + cx * (j + cy * k)], quad = (a, b, c, d) => { if (a >= 0 && b >= 0 && c >= 0 && d >= 0) idx.push(a, b, c, a, c, d); };
  const cut = (i, j, k, di, dj, dk) => val[at(i, j, k)] < 0 !== val[at(i + di, j + dj, k + dk)] < 0;
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    if (j > 0 && k > 0 && cut(i, j, k, 1, 0, 0)) quad(ci(i, j, k), ci(i, j - 1, k), ci(i, j - 1, k - 1), ci(i, j, k - 1));
    if (i > 0 && k > 0 && cut(i, j, k, 0, 1, 0)) quad(ci(i, j, k), ci(i - 1, j, k), ci(i - 1, j, k - 1), ci(i, j, k - 1));
    if (i > 0 && j > 0 && cut(i, j, k, 0, 0, 1)) quad(ci(i, j, k), ci(i - 1, j, k), ci(i - 1, j - 1, k), ci(i, j - 1, k));
  }
  // settle each vertex onto the surface, take its normal from the field, and face every triangle outward
  const nrm = new Float32Array(pos.length), e = h * 0.25;
  for (let p = 0; p < pos.length; p += 3) {
    const [x, y, z] = [pos[p], pos[p + 1], pos[p + 2]], gx = (f(x + e, y, z) - f(x - e, y, z)) / (2 * e), gy = (f(x, y + e, z) - f(x, y - e, z)) / (2 * e), gz = (f(x, y, z + e) - f(x, y, z - e)) / (2 * e);
    const l2 = gx * gx + gy * gy + gz * gz || 1, d = f(x, y, z), l = Math.sqrt(l2);
    pos[p] -= (d * gx) / l2; pos[p + 1] -= (d * gy) / l2; pos[p + 2] -= (d * gz) / l2; nrm[p] = gx / l; nrm[p + 1] = gy / l; nrm[p + 2] = gz / l;
  }
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3], ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2];
    if ((uy * wz - uz * wy) * nrm[a] + (uz * wx - ux * wz) * nrm[a + 1] + (ux * wy - uy * wx) * nrm[a + 2] < 0) { const s = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = s; }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geo.setIndex(idx);
  return geo;
}
/*
 * Plush fur for the cat, needing no UVs on a field-built mesh: the coat's normal is ruffled by short strokes of 3D noise combed
 * along x, and each layer > 0 is a shell pushed out along the normal where only scattered strand tips survive, thinner further out.
 */
const FUR_GLSL = `
uniform float uLayer, uLen;
varying vec3 vFurP;
float furHash(vec3 c) { return fract(sin(dot(c, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float furNoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(furHash(i), furHash(i + vec3(1, 0, 0)), f.x), mix(furHash(i + vec3(0, 1, 0)), furHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(furHash(i + vec3(0, 0, 1)), furHash(i + vec3(1, 0, 1)), f.x), mix(furHash(i + vec3(0, 1, 1)), furHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`;
function furMaterial(layer, len, bare = []) {                                                      // bare: [x, y, z, r] spots kept clear (eyes, nose, mouth)
  const m = new THREE.MeshPhysicalMaterial({ color: 0xd9dce3, roughness: 1, specularIntensity: 0.25, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xd8dce4), emissive: 0x23262d });   // a little cool light of her own, so she reads white by the fire
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uLayer = { value: layer }; sh.uniforms.uLen = { value: len }; sh.uniforms.uBare = { value: bare.map((b) => new THREE.Vector4(...b)) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uLayer, uLen;\nattribute float furLen;\nvarying vec3 vFurP;')
      .replace('#include <begin_vertex>', 'vec3 transformed = position + objectNormal * uLen * uLayer * furLen; vFurP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FUR_GLSL + (bare.length ? `\nuniform vec4 uBare[${bare.length}];` : ''))
      .replace('#include <map_fragment>', `#include <map_fragment>
  float keep = 1.0;${bare.length ? `
  for (int i = 0; i < ${bare.length}; i++) keep *= smoothstep(0.55, 1.0, length(vFurP - uBare[i].xyz) / uBare[i].w);
  diffuseColor.rgb *= mix(0.84, 1.0, keep);                // the bare skin round the eyes and nose a shade darker, as it is` : ''}
  if (uLayer > 0.0) {                                       // a shell: only strands long enough to reach it, tapering as they go
    float reach = furHash(floor(vFurP * 90.0)) * keep;${bare.length ? `
    reach *= mix(0.5, 1.0, 1.0 - smoothstep(0.05, 0.13, vFurP.x));                  // short on the face, and none round the eyes, nose and mouth` : ''}
    vec3 q = fract(vFurP * 90.0) - 0.5;
    if (reach < uLayer || dot(q, q) > 0.22 * (1.0 - uLayer)) discard;
  }
  diffuseColor.rgb *= mix(0.88, 1.05, uLayer);              // a little darker at the roots`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  vec3 fp = vFurP * 160.0;                                  // short strokes combed along x
  float fh = furNoise(vec3(fp.x * 0.2, fp.y, fp.z)) * 0.65 + furNoise(vec3(fp.x * 0.4, fp.yz * 2.1)) * 0.35;
  vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition), r1 = cross(dpy, normal), r2 = cross(normal, dpx);
  float det = dot(dpx, r1);
  normal = normalize(abs(det) * normal - sign(det) * 0.002 * (dFdx(fh) * r1 + dFdy(fh) * r2));`);
  };
  m.customProgramCacheKey = () => 'fur' + bare.length;
  return m;
}
function catAsleep(x, y, z, ry, sc = 1) {
  const root = group(x, y, z, ry); root.scale.setScalar(sc);
  const g = group(0, 0, 0, 0, root); g.scale.x = -1;                                                 // built head-left, then mirrored: the phone view sees that end over the desk
  const N = lowPower ? 4 : 8, furry = (geo, parent, len, bare, lenAt) => {                     // the coat, and N shells of fuzz over it; lenAt scales the fur from place to place
    const P = geo.attributes.position, fl = new Float32Array(P.count).fill(1);
    if (lenAt) for (let i = 0; i < P.count; i++) fl[i] = lenAt(P.getX(i), P.getY(i), P.getZ(i));
    geo.setAttribute('furLen', new THREE.BufferAttribute(fl, 1));
    for (let i = 1; i <= N; i++) add(geo, furMaterial(i / N, len, bare), 0, 0, 0, parent).castShadow = false;
    return add(geo, furMaterial(0, len, bare), 0, 0, 0, parent);
  };
  // the body, curled on the cushion: one field of rounded parts melted together, flat where she lies
  const body = (px, py, pz) => {
    let d = sdEll(px, py, pz, [0.0, 0.27, -0.06], [0.52, 0.3, 0.42]);                              // a round bean of a body, its back rising to the hip
    d = smin(d, sdEll(px, py, pz, [0.3, 0.31, 0.06], [0.38, 0.34, 0.42]), 0.06);                    // the round haunch, a soft crease where it meets her
    d = smin(d, sdEll(px, py, pz, [-0.36, 0.21, 0.1], [0.3, 0.22, 0.32]), 0.14);                   // chest and shoulders curling round to the front, lower than the hip
    d = smin(d, sdLimb(px, py, pz, [0.28, 0.15, 0.34], [0.0, 0.1, 0.5], 0.12, 0.075), 0.06);      // a hind leg folded forward
    d = smin(d, sdEll(px, py, pz, [-0.04, 0.085, 0.56], [0.075, 0.07, 0.1]), 0.03);                // and the hind paws, side by side, toes to the room
    d = smin(d, sdEll(px, py, pz, [0.11, 0.08, 0.6], [0.07, 0.065, 0.095]), 0.025);
    d = smin(d, sdLimb(px, py, pz, [-0.4, 0.12, 0.3], [-0.56, 0.08, 0.48], 0.075, 0.06), 0.07);   // a forearm curled under her chin
    d = smin(d, sdEll(px, py, pz, [-0.6, 0.065, 0.5], [0.085, 0.06, 0.075]), 0.03);
    d = smin(d, sdLimb(px, py, pz, [-0.46, 0.1, 0.2], [-0.76, 0.06, 0.32], 0.07, 0.055), 0.07);   // the other reaching out in front
    d = smin(d, sdEll(px, py, pz, [-0.8, 0.055, 0.33], [0.08, 0.05, 0.065]), 0.03);
    return Math.max(d, -py);
  };
  furry(fieldMesh(body, [-0.95, -0.03, -0.55], [0.75, 0.7, 0.72], 0.024), g, 0.035);
  // the tail: from the haunch round the right and along the front, tapering to a rounded tip
  const t0 = V(0.6, 0.14, 0.1), tailG = group(t0.x, t0.y, t0.z, 0, g);                          // on a pivot at its root, so it can flick
  const tailCurve = new THREE.CatmullRomCurve3([V(0.6, 0.14, 0.1), V(0.68, 0.1, 0.42), V(0.48, 0.07, 0.68), V(0.12, 0.06, 0.74), V(-0.24, 0.065, 0.68)].map((p) => p.sub(t0)));
  const TS = 60, RS = 16, tg = new THREE.TubeGeometry(tailCurve, TS, 1, RS, false), tp = tg.attributes.position, q = V(0, 0, 0), ctr = V(0, 0, 0);
  for (let i = 0; i < tp.count; i++) {
    const t = Math.floor(i / (RS + 1)) / TS;
    tailCurve.getPointAt(t, ctr); q.fromBufferAttribute(tp, i).sub(ctr).multiply(V(1, 0.85, 1)).multiplyScalar(0.08 - 0.032 * t).add(ctr); tp.setXYZ(i, q.x, q.y, q.z);
  }
  tg.computeVertexNormals(); furry(tg, tailG, 0.028);
  const tip = tailCurve.getPointAt(1); furry(new THREE.SphereGeometry(0.05, 16, 12).translate(tip.x, tip.y, tip.z), tailG, 0.028);
  // the head, chin down on her forepaws and turned to the room: a smooth round egg of a head, a raised nose bridge to a
  // small nose, puffy whisker pads, and the fur a little longer at the cheeks and under the chin
  const head0 = group(-0.6, 0.3, 0.38, -Math.PI / 2 - 0.35, g); head0.rotation.z = -0.18; head0.rotation.x = 0.22; head0.userData.y0 = head0.position.y; head0.scale.setScalar(1.15);
  const head = group(0, 0, 0, 0, head0); head.rotation.z = 0.12;
  const face = (px, py, pz) => {
    let d = sdEll(px, py, pz, [-0.02, 0.03, 0], [0.19, 0.17, 0.19]);                              // a round crown, broad at the temples
    d = smin(d, sdEll(px, py, pz, [0.03, -0.055, 0], [0.17, 0.12, 0.175]), 0.14);                  // the cheeks, melting into it so the head stays one smooth egg
    d = smin(d, sdLimb(px, py, pz, [0.1, 0.06, 0], [0.17, -0.03, 0], 0.04, 0.03), 0.05);           // the bridge of the nose
    d = smin(d, sdEll(px, py, pz, [0.178, -0.038, 0], [0.022, 0.018, 0.026]), 0.02);                // and the nose itself, a little raised
    d = smin(d, sdEll(px, py, pz, [0.13, -0.078, 0], [0.06, 0.058, 0.1]), 0.06);                   // the muzzle, short and broad
    for (const s of [-1, 1]) d = smin(d, sdEll(px, py, pz, [0.152, -0.09, s * 0.045], [0.045, 0.044, 0.058]), 0.035);   // two puffy whisker pads
    d = smin(d, sdEll(px, py, pz, [0.115, -0.13, 0], [0.05, 0.035, 0.06]), 0.04);                   // the chin
    return d;
  };
  // ears: pointed, a little turned out, pink within
  const ears = [], lids = [], earIn = std('kittenEarIn', { color: 0xf0b4c2, roughness: 0.8 });
  // eyes, nose and mouth are laid on the face: each point pressed onto the surface down the field, then lifted a hair off it
  const UPV = V(0, 1, 0), snap = (p) => {
    const n = V(0, 0, 0), e = 1e-3;
    for (let it = 0; it < 6; it++) {
      const d = face(p.x, p.y, p.z); n.set(face(p.x + e, p.y, p.z) - face(p.x - e, p.y, p.z), face(p.x, p.y + e, p.z) - face(p.x, p.y - e, p.z), face(p.x, p.y, p.z + e) - face(p.x, p.y, p.z - e)).divideScalar(2 * e);
      p.addScaledVector(n, -d / Math.max(1e-6, n.lengthSq()));
    }
    return n.normalize();
  };
  const seat = (az, el) => {                                                                          // a frame on the face in that direction, looking out of it, its y up the head
    const p = V(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).multiplyScalar(0.2), n = snap(p), side = UPV.clone().cross(n).normalize();
    return new THREE.Matrix4().makeBasis(side, n.clone().cross(side), n).setPosition(p);
  };
  const mark = (geo, frame, mat, parent, off = 0.003) => {
    const P = geo.applyMatrix4(frame).attributes.position, p = V(0, 0, 0);
    for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); p.addScaledVector(snap(p), off); P.setXYZ(i, p.x, p.y, p.z); }
    geo.computeVertexNormals(); const m = add(geo, mat, 0, 0, 0, parent); m.castShadow = false; return m;
  };
  // flat shapes to lay on her: filled with rings of vertices so they bend with the face, or a fine line tapering at both ends
  const disc = (fn, rings = 4, segs = 40, tint) => {                                                // tint(t): a colour from the middle (0) out to the edge (1)
    const pos = [0, 0, 0], col = [], idx = [], at = (k, j) => (k === 0 ? 0 : 1 + (k - 1) * segs + (j % segs));
    for (let k = 1; k <= rings; k++) for (let j = 0; j < segs; j++) { const [x, y] = fn((j / segs) * Math.PI * 2); pos.push((x * k) / rings, (y * k) / rings, 0); }
    for (let j = 0; j < segs; j++) { idx.push(0, at(1, j), at(1, j + 1)); for (let k = 1; k < rings; k++) idx.push(at(k, j), at(k + 1, j), at(k + 1, j + 1), at(k, j), at(k + 1, j + 1), at(k, j + 1)); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    if (tint) { for (let v = 0; v < pos.length / 3; v++) col.push(...tint(v === 0 ? 0 : Math.ceil(v / segs) / rings).toArray()); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); }
    return geo;
  };
  const stroke = (pts, w) => {
    const pos = [], idx = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.y - a.y) || 1, nx = -(b.y - a.y) / l, ny = (b.x - a.x) / l, hw = w * 0.5 * Math.sin(Math.PI * (0.15 + (0.7 * i) / (pts.length - 1)));
      pos.push(p.x + nx * hw, p.y + ny * hw, 0, p.x - nx * hw, p.y - ny * hw, 0); if (i) idx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); return geo;
  };
  const almond = (w, h) => (a) => { const c = Math.cos(a), s = Math.sin(a); return [w * c, h * s * (0.92 + 0.08 * Math.abs(s)) * (s < 0 ? 0.95 : 1) + 0.1 * h * c]; };   // round, a touch of almond, the outer corner (+x) lifted
  const round = (r, sy = 1) => (a) => [r * Math.cos(a), r * sy * Math.sin(a)];
  const curve = (...p) => new THREE.CubicBezierCurve(...p.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(16);
  const noseAt = seat(0, -0.19), eyeAt = [seat(-0.5, 0.1), seat(0.5, 0.1)], spot = (m, r) => [...V(0, 0, 0).setFromMatrixPosition(m).toArray(), r];
  const ruff = (x, y, z) => 1 + 0.4 * THREE.MathUtils.smoothstep(Math.abs(z), 0.1, 0.2) * (1 - THREE.MathUtils.smoothstep(y, -0.02, 0.08)) * (1 - THREE.MathUtils.smoothstep(x, 0.08, 0.16))
    + 1.2 * (1 - THREE.MathUtils.smoothstep(y, -0.16, -0.08)) * (1 - THREE.MathUtils.smoothstep(x, 0.05, 0.13));   // longer at the cheeks and under the chin
  furry(fieldMesh(face, [-0.25, -0.2, -0.27], [0.27, 0.24, 0.27], 0.011), head, 0.022, [spot(eyeAt[0], 0.075), spot(eyeAt[1], 0.075), spot(noseAt, 0.075)], ruff);
  const flat = (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });          // flat colour: the fire close by would wash a lit eye pale, and a lit glint would bloom over it
  const line = flat(0x6e5a5e), iris = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  // a small rounded nose, point down, and under it the line of her lip: down from the nose, then out along each whisker pad
  mark(disc((a) => { const r = 0.02 * (1 + 0.2 * Math.cos(3 * (a - 1.5 * Math.PI))); return [r * Math.cos(a) * 1.15, r * Math.sin(a) * 0.85]; }, 3, 36), noseAt, flat(0xe8909f), head, 0.0035);
  mark(stroke(curve([0, -0.016], [0, -0.026], [0, -0.034], [0, -0.042]), 0.0035), noseAt, line, head);
  [-1, 1].forEach((k) => mark(stroke(curve([0, -0.04], [k * 0.01, -0.06], [k * 0.038, -0.062], [k * 0.052, -0.046]), 0.0035), noseAt, line, head));
  // whiskers from the pads, fanning out and drooping, and a few over each eye
  const whisk = flat(0xd8d4cc);                                                                       // pale in any light, never a dark scratch
  const hair = (root, d, len, droop) => {
    const pts = [0, 0.33, 0.66, 1].map((t) => root.clone().addScaledVector(d, len * t).add(V(-0.06 * t * t, -droop * t * t, 0)));
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0016, 3), whisk, 0, 0, 0, head).castShadow = false;
  };
  [-1, 1].forEach((s) => {
    for (let i = 0; i < 4; i++) { const root = V(0.17, -0.078 - 0.011 * i, s * (0.05 + 0.006 * i)); snap(root); hair(root, V(0.35, 0.22 - 0.16 * i, s).normalize(), 0.3 - 0.025 * i, 0.03 + 0.012 * i); }
    for (let i = 0; i < 2; i++) { const root = V(0.15, 0.085, s * (0.06 + 0.025 * i)); snap(root); hair(root, V(0.6, 0.7, s * 0.8).normalize(), 0.12 - 0.02 * i, 0.01); }
  });
  [-1, 1].forEach((s2) => {
    const ear = group(-0.05, 0.13, s2 * 0.115, 0, head); ears.push(ear);
    const tilted = group(0, 0, 0, 0, ear); tilted.rotation.set(s2 * 0.32, -s2 * 0.45, -0.12);
    furry(fullCone(0.095, 0.2, 24, 1).translate(0, 0.09, 0).scale(0.42, 1, 1), tilted, 0.01);
    add(fullCone(0.07, 0.15, 24, 1).translate(0, 0.085, 0).scale(0.2, 1, 1), earIn, 0.022, 0.01, 0, tilted).castShadow = false;
    // odd eyes, round with a touch of almond at the outer corner: blue on her right, amber on her left, the iris paler
    // round the pupil, a round dark pupil and a glint of light. The frame's x points across her face, so mirror for the far eye
    const at = eyeAt[s2 < 0 ? 0 : 1], open = group(0, 0, 0, 0, head), shut = group(0, 0, 0, 0, head), mx = -s2; lids.push([open, shut]);   // open when she looks; shut while she sleeps
    const [deep, pale] = (s2 < 0 ? [0x2c7ed0, 0x8fd0f0] : [0xb8901c, 0xeccf5c]).map((c) => new THREE.Color(c));   // the iris pale round the pupil, deepening to its edge
    const shade = (t) => pale.clone().lerp(deep, THREE.MathUtils.smoothstep(t, 0.55, 0.95)).multiplyScalar(t > 0.9 ? 0.85 : 1);
    mark(disc(almond(0.055, 0.05), 6, 40, shade).scale(mx, 1, 1), at, iris, open, 0.0034);
    mark(disc(round(0.036), 4).translate(0, 0.002, 0), at, flat(0x0c0c10), open, 0.0048);                // a big round pupil, the iris a ring round it
    mark(disc(round(0.009), 2).translate(mx * 0.013, 0.016, 0), at, flat(0xe6e6e6), open, 0.0055);    // a glint, and a small one opposite
    mark(disc(round(0.0045), 2).translate(-mx * 0.012, -0.013, 0), at, flat(0xd0d0d0), open, 0.0055);
    mark(stroke(curve([-0.052, -0.004], [-0.02, -0.022], [0.02, -0.02], [0.054, 0.008]), 0.006).scale(mx, 1, 1), at, line, shut, 0.0035);
  });
  return { g: root, head: head0, sc, tailG, ears, lids };
}
/** an arch: straight sides up to the springing line, a half circle over the top */
function windowArch(p, w, bot, spring, hole = false) {
  if (hole) { p.moveTo(-w, bot); p.lineTo(-w, spring); p.absarc(0, spring, w, Math.PI, 0, true); p.lineTo(w, bot); p.lineTo(-w, bot); }
  else { p.moveTo(-w, bot); p.lineTo(w, bot); p.lineTo(w, spring); p.absarc(0, spring, w, 0, Math.PI, false); p.lineTo(-w, bot); }
  return p;
}
/** the window's frame and tracery: a deep wooden reveal, then brass lines that rise and curl like lily stems round a rose */
function artNouveauWindow(w, bot, spring, z, wood) {
  const frameCurve = (r) => { const c = new THREE.CurvePath(); c.add(new THREE.LineCurve3(V(-r, bot, 0), V(-r, spring, 0))); c.add(new THREE.CatmullRomCurve3(Array.from({ length: 33 }, (_, k) => { const a = Math.PI - (k / 32) * Math.PI; return V(Math.cos(a) * r, spring + Math.sin(a) * r, 0); }))); c.add(new THREE.LineCurve3(V(r, spring, 0), V(r, bot, 0))); return c; };
  const g = group(0, 0, z + 0.1), brass = BRASS(), b = (pts, r = 0.055) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(16, pts.length * 10), r, 8), brass, 0, 0, 0.08, g);
  add(new THREE.TubeGeometry(frameCurve(w + 0.14), 160, 0.3, 12), wood, 0, 0, 0, g);
  add(new THREE.TubeGeometry(frameCurve(w - 0.08), 160, 0.07, 8), brass, 0, 0, 0.22, g);
  b([V(0, bot, 0), V(0, spring - 1.0, 0)], 0.06);
  [-1, 1].forEach((s) => {
    b([V(s * (w - 0.55), bot, 0), V(s * (w - 0.85), bot + 2.4, 0), V(s * 1.5, bot + 4.6, 0), V(s * 0.95, spring - 0.6, 0), V(s * 1.35, spring + 1.05, 0), V(s * 2.3, spring + 1.9, 0), V(s * (w - 0.2), spring + 1.2, 0)]);
    b([V(s * 0.06, bot + 1.6, 0), V(s * 0.7, bot + 2.6, 0), V(s * 1.1, bot + 3.2, 0), V(s * 1.7, bot + 3.3, 0), V(s * 2.4, bot + 2.6, 0)], 0.04);
    b([V(s * (w - 0.05), spring - 2.6, 0), V(s * (w - 0.8), spring - 2.1, 0), V(s * (w - 0.95), spring - 1.3, 0), V(s * (w - 0.6), spring - 0.9, 0)], 0.04);
    [[V(s * 2.4, bot + 2.6, 0)], [V(s * (w - 0.2), spring + 1.2, 0)], [V(s * (w - 0.6), spring - 0.9, 0)]].forEach(([p]) => add(new THREE.SphereGeometry(0.09, 12, 10), GOLDM(), p.x, p.y, 0.08, g));
  });
  // the rose: a ring of petals round a small sun
  add(new THREE.TorusGeometry(1.15, 0.06, 10, 64), brass, 0, spring + 0.25, 0.08, g);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; add(new THREE.TorusGeometry(0.38, 0.03, 8, 32), brass, Math.cos(a) * 0.72, spring + 0.25 + Math.sin(a) * 0.72, 0.08, g); }
  add(new THREE.SphereGeometry(0.2, 16, 12), GOLDM(), 0, spring + 0.25, 0.1, g);
  // a transom low down, with a row of little arches
  b([V(-w + 0.1, bot + 1.6, 0), V(w - 0.1, bot + 1.6, 0)], 0.045);
  for (let k = 0; k < 6; k++) { const x0 = -w + 0.1 + (k * (2 * w - 0.2)) / 6, x1 = x0 + (2 * w - 0.2) / 6; b(Array.from({ length: 9 }, (_, i) => { const a = Math.PI - (i / 8) * Math.PI; return V((x0 + x1) / 2 + Math.cos(a) * (x1 - x0) / 2, bot + 1.6 - Math.sin(a) * 0.35, 0); }), 0.025); }
  return g;
}
/** the ecliptic band's face: dark blue enamel, gold rules, twelve houses marked with stars */
function eclipticCanvas() {
  const c = canvas(2048, 96), g = c.getContext('2d');
  g.fillStyle = '#1e2a52'; g.fillRect(0, 0, 2048, 96);
  g.strokeStyle = '#e2c27a'; g.lineWidth = 4; [8, 88].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); });
  for (let k = 0; k < 12; k++) { const x = (k / 12) * 2048; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 8); g.lineTo(x, 88); g.stroke(); for (let j = 1; j < 30; j++) { g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + j * (2048 / 360), 8); g.lineTo(x + j * (2048 / 360), j % 5 ? 18 : 26); g.stroke(); } const cx = x + 85; g.fillStyle = '#f2d78f'; g.beginPath(); starPx(cx, 56, 14, 5, 8).forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.fill(); [[cx - 34, 48], [cx + 30, 62], [cx + 44, 44]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 3, 0, TAU); g.fill(); }); }
  return c;
}
/** a little gear, extruded */
function gearGeo(r, teeth, depth) { const s = new THREE.Shape(); for (let k = 0; k <= teeth * 4; k++) { const a = (k / (teeth * 4)) * TAU, rr = k % 4 < 2 ? r : r * 0.8; k ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } s.holes.push(new THREE.Path().absarc(0, 0, r * 0.25, 0, TAU, true)); return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2); }
/** a great armillary sphere: meridian ring with its scale, a turning ecliptic band, colures and an equator, a sun at the heart, hung on chains */
function armillary(cx, cy, cz, R) {
  const g = group(cx, cy, cz), brass = BRASS();
  const links = []; for (let y = R + 0.6, k = 0; y < HUT_TOP - cy; y += 0.15, k++) links.push([V(0, y, 0), [0, k % 2 ? Math.PI / 2 : 0, 0]]);
  scatter(g, new THREE.TorusGeometry(0.06, 0.016, 6, 12).scale(1, 1.5, 1), brass, links).castShadow = false;
  add(new THREE.TorusGeometry(R, 0.07, 12, 128), brass, 0, 0, 0, g);
  add(new THREE.TorusGeometry(R - 0.13, 0.025, 8, 128), brass, 0, 0, 0, g);
  const ticks = []; for (let k = 0; k < 72; k++) { const a = (k / 72) * TAU; ticks.push([V(Math.cos(a) * (R - 0.07), Math.sin(a) * (R - 0.07), 0), [0, 0, a], V(k % 6 ? 0.08 : 0.15, 0.015, 0.03)]); }
  scatter(g, new THREE.BoxGeometry(1, 1, 1), GOLDM(), ticks).castShadow = false;
  // a crown where the chains meet: a finial and two gears that turn against each other
  add(new THREE.CylinderGeometry(0.08, 0.16, 0.5, 16), brass, 0, R + 0.3, 0, g);
  add(new THREE.SphereGeometry(0.14, 16, 12), GOLDM(), 0, R + 0.6, 0, g);
  [[-0.32, 1, 12], [0.3, -1, 9]].forEach(([x, dir, n]) => { const m = add(gearGeo(n === 12 ? 0.3 : 0.22, n, 0.06), brass, x, R + 0.18, 0.1, g); m.userData.dir = dir * (12 / n); gears.push(m); });
  const turning = (tilt, speed) => { const ring = new THREE.Group(); ring.rotation.set(tilt[0], tilt[1], tilt[2]); g.add(ring); const spin = new THREE.Group(); spin.userData.speed = speed; ring.add(spin); ring.userData.spin = spin; return spin; };
  const ecl = turning([0, 0, 0.41], 0.22);
  add(new THREE.CylinderGeometry(R * 0.84, R * 0.84, 0.26, 128, 1, true), std('ecliptic', { map: tx(eclipticCanvas()), metalness: 0.55, roughness: 0.35, side: THREE.DoubleSide }), 0, 0, 0, ecl);
  [0.13, -0.13].forEach((y) => add(new THREE.TorusGeometry(R * 0.84, 0.03, 8, 128), brass, 0, y, 0, ecl, [Math.PI / 2, 0, 0]));
  const col = turning([0, 0, 0.41], -0.15);
  [0, Math.PI / 2].forEach((ry) => add(new THREE.TorusGeometry(R * 0.72, 0.04, 8, 112), brass, 0, 0, 0, col, [0, ry, 0]));
  add(new THREE.SphereGeometry(0.1, 12, 10), std('planet0', { color: 0x8fb6ff, roughness: 0.4 }), R * 0.72, 0, 0, col);
  const eq = turning([0, 0, 0.41], 0.1);
  add(new THREE.TorusGeometry(R * 0.6, 0.035, 8, 96), brass, 0, 0, 0, eq, [Math.PI / 2, 0, 0]);
  add(new THREE.SphereGeometry(0.08, 12, 10), std('planet1', { color: 0xe9a6b8, roughness: 0.4 }), 0, 0, R * 0.6, eq);
  const axis = new THREE.Group(); axis.rotation.z = 0.41; g.add(axis);
  add(new THREE.CylinderGeometry(0.03, 0.03, R * 2 + 0.3, 8), brass, 0, 0, 0, axis);
  [-1, 1].forEach((s2) => add(new THREE.SphereGeometry(0.08, 12, 10), GOLDM(), 0, s2 * (R + 0.15), 0, axis));
  add(new THREE.IcosahedronGeometry(0.42, 3), std('core', { color: 0xffe2a0, emissive: 0xffb040, emissiveIntensity: 1.5, roughness: 0.3 }), 0, 0, 0, g).castShadow = false;
  g.add(glowSprite(3.2, new THREE.Color(1.2, 0.85, 0.42)));
  return g;
}
/** the moonlight through the window as one soft volume: the window's own outline swept along the light, fading in from the glass and out toward the floor, streaked where the tracery breaks it */
let BEAM;
function moonShafts(w, bot, spring) {
  const dir = moonSpot.target.position.clone().sub(moonSpot.position).normalize(), ww = w - 0.2, out = [];
  for (let k = 0; k <= 10; k++) out.push([-ww, bot + 0.2 + (spring - bot - 0.2) * (k / 10)]);
  for (let k = 1; k < 36; k++) { const a = Math.PI - (k / 36) * Math.PI; out.push([Math.cos(a) * ww, spring + Math.sin(a) * ww]); }
  for (let k = 10; k >= 0; k--) out.push([ww, bot + 0.2 + (spring - bot - 0.2) * (k / 10)]);
  for (let k = 1; k < 10; k++) out.push([ww - (k / 10) * 2 * ww, bot + 0.2]);
  const n = out.length, pos = [], uv = [], idx = [], z0 = HUT_BACK - 0.5;
  out.forEach(([x, y], i) => { const p = V(x, y, z0), len = (y - FLOOR) / -dir.y + 0.4, q = p.clone().addScaledVector(dir, len); pos.push(p.x, p.y, p.z, q.x, q.y, q.z); uv.push(i / n, 0, i / n, 1); });
  for (let i = 0; i < n; i++) { const a = i * 2, b = ((i + 1) % n) * 2; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  const sc = canvas(512, 4), sg = sc.getContext('2d'), r = mulberry(4501); for (let x = 0; x < 512; x++) { const v = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(x * 0.05 + Math.sin(x * 0.013) * 3), 2) * (0.7 + r() * 0.3); sg.fillStyle = `rgb(${v * 255},${v * 255},${v * 255})`; sg.fillRect(x, 0, 1, 4); }
  const st = new THREE.CanvasTexture(sc); st.wrapS = THREE.RepeatWrapping;
  BEAM = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0.62, 0.72, 1.0) }, uOpacity: { value: 0.12 }, uTime: { value: 0 }, uStripe: { value: st } },
    vertexShader: 'varying float vT; varying float vU; varying vec3 vN; varying vec3 vV;\nvoid main() { vT = uv.y; vU = uv.x; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; uniform float uTime; uniform sampler2D uStripe; varying float vT; varying float vU; varying vec3 vN; varying vec3 vV;\nvoid main() {\n  float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.4);\n  float fade = smoothstep(0.0, 0.16, vT) * pow(max(0.0, 1.0 - vT), 1.7);\n  float st = texture2D(uStripe, vec2(vU * 2.0 + uTime * 0.004, 0.5)).r;\n  gl_FragColor = vec4(uColor * uOpacity * fade * edge * st, 1.0);\n}',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, BEAM); m.renderOrder = 4; m.frustumCulled = false; scene.add(m);
  shafts.push({ dir, ww, bot, spring });
}
/** a few loose pages, drifting round the top of the room */
function pageCanvas() { const c = canvas(128, 168), g = c.getContext('2d'), r = mulberry(4601); g.fillStyle = '#f2e8d2'; g.fillRect(0, 0, 128, 168); g.strokeStyle = 'rgba(90,60,40,.45)'; g.lineWidth = 1.4; for (let y = 22; y < 150; y += 10) { g.beginPath(); g.moveTo(14, y); for (let x = 14; x < 114; x += 6) g.lineTo(x, y + (r() - 0.5) * 2); g.stroke(); } g.strokeStyle = 'rgba(160,110,50,.6)'; g.strokeRect(6, 6, 116, 156); return c; }
function floatingPages(n) {
  const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.39), new THREE.MeshLambertMaterial({ map: tx(pageCanvas()), side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), n), r = mulberry(4602);
  im.userData.list = Array.from({ length: n }, () => ({ a: r() * TAU, rad: 3.6 + r() * 4.5, y: 6.2 + r() * 3.6, sp: (0.05 + r() * 0.07) * (r() < 0.5 ? 1 : -1), ph: r() * 6 }));
  im.castShadow = true; scene.add(im); return im;
}
/** a brass-and-blue telescope on a wooden tripod, looking out of the window */
function rod(parent, a, b, r, mat) { const d = b.clone().sub(a), m = add(new THREE.CylinderGeometry(r, r, d.length(), 10), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, parent); m.quaternion.setFromUnitVectors(UP, d.normalize()); return m; }
function telescope(at, height, dir) {
  const g = group(at.x, at.y, at.z), wood = std('darkwood', {}), head = V(0, height, 0);
  g.userData.isTelescope = true;
  [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3].forEach((a) => rod(g, head.clone().add(V(Math.cos(a) * 0.12, -0.1, Math.sin(a) * 0.12)), V(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15), 0.055, wood));
  add(new THREE.CylinderGeometry(0.2, 0.16, 0.25, 16), BRASS(), 0, height, 0, g);
  add(new THREE.CylinderGeometry(0.66, 0.66, 0.05, 3), wood, 0, height * 0.45, 0, g);
  rod(g, V(0, height + 0.1, 0), V(0, height + 0.55, 0), 0.06, BRASS());
  const d = dir.clone().normalize(), tube = group(0, height + 0.62, 0, 0, g);
  tube.quaternion.setFromUnitVectors(UP, d);
  add(new THREE.CylinderGeometry(0.26, 0.22, 2.6, 24), std('teleBlue', { color: 0x24346a, roughness: 0.35, metalness: 0.3 }), 0, 0.4, 0, tube);
  add(new THREE.CylinderGeometry(0.32, 0.29, 0.5, 24), std('teleBlue', {}), 0, 1.85, 0, tube);
  [-0.85, 0.3, 1.6, 2.1].forEach((y) => add(new THREE.CylinderGeometry(y > 1.5 ? 0.34 : 0.27, y > 1.5 ? 0.34 : 0.27, 0.08, 24), BRASS(), 0, y, 0, tube));
  add(new THREE.CylinderGeometry(0.12, 0.17, 0.9, 16), BRASS(), 0, -1.3, 0, tube);
  add(new THREE.CylinderGeometry(0.07, 0.1, 0.3, 12), std('eyepiece', { color: 0x1a1a1a, roughness: 0.4 }), 0, -1.85, 0, tube);
  add(new THREE.TorusGeometry(0.1, 0.03, 8, 16), BRASS(), 0.28, 0, 0, tube, [0, Math.PI / 2, 0]);
  add(new THREE.CircleGeometry(0.29, 24), new THREE.MeshPhysicalMaterial({ color: 0x8aa0d8, roughness: 0.05, metalness: 0.3, clearcoat: 1 }), 0, 2.11, 0, tube, [-Math.PI / 2, 0, 0]);
  return g;
}
/** what's beyond the round window: a deep sky, a far moon, drifting clouds, hills and a sleeping town, each at its own distance */
function outdoors(winY, winR) {
  const r = mulberry(4401), C = V(0, winY, HUT_BACK);
  const far = (geo, mat, order = 0) => { mat.fog = false; const m = new THREE.Mesh(geo, mat); m.renderOrder = order; scene.add(m); return m; };
  // the sky: a curved screen eighty units out, dark at the top, glowing toward the hills, a milky way across it
  const skyC = canvas(2048, 1024), sg = skyC.getContext('2d'), hz = 704;
  const grd = sg.createLinearGradient(0, 0, 0, 1024);
  grd.addColorStop(0, '#03051a'); grd.addColorStop(0.4, '#0a1240'); grd.addColorStop(0.6, '#18245e'); grd.addColorStop(hz / 1024, '#384684'); grd.addColorStop(0.8, '#1c1e46'); grd.addColorStop(1, '#0a0a1e');
  sg.fillStyle = grd; sg.fillRect(0, 0, 2048, 1024);
  sg.save(); sg.translate(1024, 380); sg.rotate(-0.42);
  for (let i = 0; i < 180; i++) { const x = (r() - 0.5) * 2600, y = (r() - 0.5) * 110, rr = 40 + r() * 110, g2 = sg.createRadialGradient(x, y, 0, x, y, rr); g2.addColorStop(0, `rgba(${170 + r() * 50},${160 + r() * 40},255,0.06)`); g2.addColorStop(1, 'rgba(170,160,255,0)'); sg.fillStyle = g2; sg.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 2200; i++) { const x = (r() - 0.5) * 2600, y = (r() + r() + r() - 1.5) * 80; sg.fillStyle = `rgba(235,235,255,${0.15 + r() * 0.5})`; sg.fillRect(x, y, 1.3, 1.3); }
  sg.restore();
  for (let i = 0; i < 1500; i++) { const y = Math.pow(r(), 1.3) * (hz - 30); sg.fillStyle = `rgba(255,${228 + r() * 27},${200 + r() * 55},${(0.3 + r() * 0.7) * (1 - (y / hz) * 0.5)})`; sg.beginPath(); sg.arc(r() * 2048, y, 0.7 + r() * r() * 1.9, 0, TAU); sg.fill(); }
  const sky = far(new THREE.SphereGeometry(80, 48, 24, Math.PI * 1.5 - 0.8, 1.6, 0.61, 1.4), new THREE.MeshBasicMaterial({ map: tx(skyC), side: THREE.BackSide, depthWrite: false }), -3);
  sky.position.copy(C);
  // bright stars as real points scattered through depth, so they twinkle and shift as you move
  const stars = new Sparks(240);
  for (let i = 0; i < 240; i++) { const az = (r() - 0.5) * 1.3, el = 0.14 + Math.pow(r(), 0.8) * 0.75, d = 60 + r() * 15, big = r() < 0.06; stars.emit(V(C.x + Math.sin(az) * Math.cos(el) * d, C.y + Math.sin(el) * d, C.z - Math.cos(az) * Math.cos(el) * d), V(0, 0, 0), { life: 1e9, size: big ? 0.6 + r() * 0.3 : 0.22 + r() * 0.4, color: [new THREE.Color(1.5, 1.45, 1.3), new THREE.Color(1.1, 1.25, 1.7), new THREE.Color(1.6, 1.3, 0.9)][i % 3], drag: 0 }); }
  stars.update(0); stars.points.renderOrder = -2; scene.add(stars.points);
  // the moon, far off and up to the right, wrapped in its own light
  const moonC = canvas(512, 512), mg = moonC.getContext('2d'), mgr = mg.createRadialGradient(236, 226, 20, 256, 256, 250);
  mgr.addColorStop(0, '#fffdf4'); mgr.addColorStop(0.75, '#f4ead0'); mgr.addColorStop(1, '#d6c49c'); mg.fillStyle = mgr; mg.beginPath(); mg.arc(256, 256, 248, 0, TAU); mg.fill();
  mg.globalAlpha = 0.22; [[170, 190, 70], [300, 160, 46], [330, 300, 60], [210, 330, 40], [260, 240, 30]].forEach(([cx, cy, cr]) => { mg.fillStyle = '#9a8c78'; mg.beginPath(); mg.arc(cx, cy, cr, 0, TAU); mg.fill(); });
  mg.globalAlpha = 0.35; for (let i = 0; i < 26; i++) { const a = r() * TAU, d = r() * 200, cr = 4 + r() * 12; mg.strokeStyle = '#b8a888'; mg.lineWidth = 2; mg.beginPath(); mg.arc(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, cr, 0, TAU); mg.stroke(); }
  mg.globalAlpha = 1;
  const moonPos = V(7.4, winY + 10.5, HUT_BACK - 50);
  const moon = far(new THREE.CircleGeometry(3.0, 64), new THREE.MeshBasicMaterial({ map: tx(moonC), transparent: true, color: new THREE.Color(1.3, 1.27, 1.15), depthWrite: false }), -1);
  moon.position.copy(moonPos); moon.lookAt(0, winY - 2, 12);
  [[30, [0.22, 0.26, 0.5]], [13, [0.55, 0.55, 0.6]], [7.5, [0.6, 0.55, 0.45]]].forEach(([sz, c]) => { const h = glowSprite(sz, new THREE.Color(...c)); h.material.fog = false; h.renderOrder = -1; h.position.copy(moonPos); scene.add(h); });
  // soft clouds at different depths, one drifting across the moon, edges lit silver
  const cloud = (seed, w, alpha) => {
    const c = canvas(512, 200), cg = c.getContext('2d'), rr = mulberry(seed);
    for (let i = 0; i < 30; i++) { const x = 70 + rr() * 372, y = 90 + rr() * 50 - Math.sin(((x - 70) / 372) * Math.PI) * 30, rad = 22 + rr() * 42, gr2 = cg.createRadialGradient(x, y - rad * 0.3, 0, x, y, rad); gr2.addColorStop(0, 'rgba(200,205,240,.55)'); gr2.addColorStop(0.6, 'rgba(110,115,170,.35)'); gr2.addColorStop(1, 'rgba(70,75,130,0)'); cg.fillStyle = gr2; cg.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    const m = far(new THREE.PlaneGeometry(w, (w * 200) / 512), new THREE.MeshBasicMaterial({ map: tx(c), transparent: true, opacity: alpha, depthWrite: false }), -1);
    m.userData.v = 0.12 + rr() * 0.15; drifting.push(m); return m;
  };
  [[4402, 22, 0.85, 1.5, winY + 8.0, -44], [4403, 30, 0.6, -14, winY + 5.5, -55], [4404, 18, 0.75, 14, winY + 3.2, -36], [4405, 26, 0.5, -4, winY + 13.5, -58]].forEach(([seed, w, a, x, y, z]) => cloud(seed, w, a).position.set(x, y, HUT_BACK + z));
  // hills in layers, the farther the paler, each with a moonlit rim
  const ridge = (seed, base, amp) => (x) => base + Math.sin(x * 0.045 + seed) * amp + Math.sin(x * 0.12 + seed * 2.1) * amp * 0.45 + Math.sin(x * 0.31 + seed * 3.3) * amp * 0.12;
  const hill = (z, f, rim, body) => {
    const pos = [], col = [], idx = [], cr = new THREE.Color(rim), cb = new THREE.Color(body); let n = 0;
    for (let x = -90; x <= 90; x += 1.5, n++) { const y = f(x); pos.push(x, y, 0, x, y - 2.5, 0, x, winY - 40, 0); col.push(cr.r, cr.g, cr.b, cb.r, cb.g, cb.b, cb.r * 0.6, cb.g * 0.6, cb.b * 0.6); }
    for (let i = 0; i < n - 1; i++) for (let row = 0; row < 2; row++) { const a = i * 3 + row; idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
    far(geo, new THREE.MeshBasicMaterial({ vertexColors: true })).position.z = HUT_BACK + z;
  };
  const fFar = ridge(1.1, winY + 0.8, 3.2), fMid = ridge(2.7, winY - 1.6, 2.0), fNear = ridge(4.2, winY - 2.9, 1.1);
  hill(-70, fFar, 0x4a5490, 0x262c5a); hill(-42, fMid, 0x323a70, 0x161a3c); hill(-24, fNear, 0x1e2448, 0x0b0d22);
  // a little town asleep on the middle hill, windows lit
  const town = new Sparks(40);
  for (let i = 0; i < 40; i++) { const x = -6 + r() * 20; town.emit(V(x, fMid(x) - 0.5 - r() * 2.2, HUT_BACK - 41.8), V(0, 0, 0), { life: 1e9, size: 0.3 + r() * 0.25, color: new THREE.Color(1.7, 1.15 + r() * 0.2, 0.5), drag: 0 }); }
  town.update(0); scene.add(town.points);
  // dark pines in front, near enough to slide past the window as you move
  const pine = mergeGeometries([new THREE.ConeGeometry(0.9, 1.6, 7).translate(0, 0.8, 0), new THREE.ConeGeometry(0.7, 1.4, 7).translate(0, 1.6, 0), new THREE.ConeGeometry(0.48, 1.1, 7).translate(0, 2.35, 0), new THREE.CylinderGeometry(0.1, 0.12, 0.6, 5).translate(0, 0.1, 0)]);
  const trees = [];
  for (let i = 0; i < 22; i++) { const x = -20 + i * 1.9 + r() * 0.8; if (Math.abs(x - 2) < 3.5 && r() < 0.7) continue; const sc = 0.9 + r() * 1.1; trees.push([V(x, fNear(x) - 1.2, HUT_BACK - 14 - r() * 4), [0, r() * 3, 0], V(sc, sc * (1 + r() * 0.4), sc)]); }
  const tr = scatter(scene, pine, new THREE.MeshBasicMaterial({ color: 0x06071a, fog: false }), trees); tr.castShadow = tr.receiveShadow = false;
}
/** a garland of little gold stars and moons with bulbs between, hung in a swag */
function garland(a, b, sag, n) {
  const pts = catenary(a, b, sag, n * 2), stars = [], bulbs = [];
  pts.forEach((p, i) => (i % 2 ? bulbs : stars).push([p.clone(), [0, (i * 0.7) % 3, 0], V(0.55, 0.55, 0.55)]));
  scatter(scene, new THREE.ExtrudeGeometry(starShape(0.32, 0.14), { depth: 0.05, bevelEnabled: false }), GOLDM(), stars.filter((_, i) => i % 2 === 0)).castShadow = false;
  scatter(scene, new THREE.ExtrudeGeometry(moonShape(0.3), { depth: 0.05, bevelEnabled: false }), GOLDM(), stars.filter((_, i) => i % 2 === 1)).castShadow = false;
  scatter(scene, new THREE.SphereGeometry(0.1, 10, 8), std('bulb', { color: 0xfff0c0, emissive: 0xffc860, emissiveIntensity: 2 }), bulbs).castShadow = false;
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 4, 0.012, 4), std('wire', { color: 0x3a2a1a }), 0, 0, 0).castShadow = false;
  const glows = new Sparks(bulbs.length);
  bulbs.forEach(([p]) => glows.emit(p, V(0, 0, 0), { life: 1e9, size: 0.35, color: new THREE.Color(1.7, 1.25, 0.6), drag: 0 }));
  glows.update(0); scene.add(glows.points);
}
/** a Moroccan lantern in pierced brass, glowing through its holes */
function moroccanLamp(x, y, z, css, hex) {
  const g = group(x, y, z);
  add(lathe([[0.05, -1.0], [0.35, -0.85], [0.62, -0.4], [0.66, 0.1], [0.45, 0.55], [0.18, 0.85], [0.08, 1.1]], 24), std('moro' + css, { color: 0x4a3418, metalness: 0.7, roughness: 0.4, emissiveMap: tx(piercedCanvas(css), 2, 1), emissive: 0xffffff, emissiveIntensity: 2.2, side: THREE.DoubleSide }), 0, 0, 0, g).castShadow = false;
  add(new THREE.ConeGeometry(0.12, 0.4, 10), BRASS(), 0, 1.25, 0, g); add(new THREE.SphereGeometry(0.1, 10, 8), BRASS(), 0, -1.08, 0, g);
  add(new THREE.CylinderGeometry(0.01, 0.01, HUT_TOP - y, 4), std('thread', {}), 0, (HUT_TOP - y) / 2 + 0.6, 0, g);
  place(g, glowSprite(3.2, new THREE.Color(hex).multiplyScalar(1.2)), 0, 0, 0);
  g.add(new THREE.PointLight(hex, 7, 9, 1.5));
  g.userData.ph = x; swaying.push(g);
}
/** a frosted glass globe with a little star burning inside */
function orbLamp(x, y, z) {
  const g = group(x, y, z);
  add(new THREE.SphereGeometry(0.55, 32, 24), std('orb', { color: 0xfff0d8, emissive: 0xffa850, emissiveIntensity: 0.55, roughness: 0.3, transparent: true, opacity: 0.85 }), 0, 0, 0, g).castShadow = false;
  add(new THREE.ExtrudeGeometry(starShape(0.22, 0.1), { depth: 0.04, bevelEnabled: false }), std('orbstar', { color: 0xffe8a0, emissive: 0xffd060, emissiveIntensity: 3 }), 0, 0, 0, g).castShadow = false;
  add(new THREE.CylinderGeometry(0.14, 0.18, 0.18, 12), BRASS(), 0, 0.6, 0, g);
  add(new THREE.CylinderGeometry(0.01, 0.01, HUT_TOP - y, 4), std('thread', {}), 0, (HUT_TOP - y) / 2 + 0.6, 0, g);
  place(g, glowSprite(1.7, new THREE.Color(1.2, 0.85, 0.45)), 0, 0, 0);
  g.add(new THREE.PointLight(0xffc070, 8, 9, 1.5));
  g.userData.ph = z; swaying.push(g);
}
/** a vine hanging down from a beam, leaves all along it */
function vine(x, y, z, len, seed) {
  const r = mulberry(seed), pts = [];
  for (let i = 0; i <= 8; i++) pts.push(V(x + Math.sin(i * 0.9 + seed) * 0.25, y - (i / 8) * len, z + Math.cos(i * 0.7) * 0.2));
  const curve = new THREE.CatmullRomCurve3(pts);
  add(new THREE.TubeGeometry(curve, 24, 0.025, 5), std('vine', { color: 0x3a6a3a }), 0, 0, 0).castShadow = false;
  const items = [];
  for (let i = 0; i < 16; i++) { const p = curve.getPoint(i / 16); items.push([p.add(V((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.15)), [r() * 1.2 - 0.6, r() * 6, r() * 1.2 - 0.6]]); }
  scatter(scene, leafGeo(0.32, 0.2), r() < 0.5 ? LEAF() : LEAF2(), items).castShadow = false;
}

function buildLights() {
  hemi = new THREE.HemisphereLight(0x7a6aa8, 0x3a2418, 0.34); scene.add(hemi);
  lamp = new THREE.SpotLight(0xffe4bc, 17, 0, 0.62, 0.55, 1.1);
  lamp.position.set(-1.25, 3.3, 1.8);
  lamp.target.position.set(0.05, 0, -0.1);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.camera.near = 1.2; lamp.shadow.camera.far = 7;
  lamp.shadow.bias = -0.0004; lamp.shadow.normalBias = 0.012;
  scene.add(lamp, lamp.target);
  const room = (roomSpot = new THREE.SpotLight(0xffd2a8, 48, 0, 0.95, 0.9, 1.1));
  room.position.set(1.5, FLOOR + 14.5, 9); room.target.position.set(0, FLOOR, -5);
  room.castShadow = true; room.shadow.mapSize.set(2048, 2048); room.shadow.camera.near = 4; room.shadow.camera.far = 40; room.shadow.bias = -0.0006; room.shadow.normalBias = 0.04;
  scene.add(room, room.target);
  moonSpot = new THREE.SpotLight(0xb4c6ff, 130, 0, 0.62, 0.45, 1.0);
  moonSpot.position.set(1.8, FLOOR + 16.5, HUT_BACK - 7);
  moonSpot.target.position.set(0.6, FLOOR, 2.4);
  moonSpot.castShadow = true;
  moonSpot.shadow.mapSize.set(2048, 2048);
  moonSpot.shadow.camera.near = 3; moonSpot.shadow.camera.far = 40;
  moonSpot.shadow.bias = -0.001; moonSpot.shadow.normalBias = 0.03;
  scene.add(moonSpot, moonSpot.target);
}
/** the hut, moving: fire, orrery, lanterns swaying, a record turning, embers and dust */
function updateHut(dt, t) {
  // up close to the book, the room lights fall back so the page isn't washed out
  const near = mode === 'hut' ? 0 : 1;
  roomSpot.intensity += ((near ? 8 : 48) - roomSpot.intensity) * Math.min(1, dt * 2);
  moonSpot.intensity += ((near ? 10 : 130) - moonSpot.intensity) * Math.min(1, dt * 2);
  hemi.intensity += ((near ? 0.3 : 0.42) - hemi.intensity) * Math.min(1, dt * 2);
  fireLight.intensity = 36 + Math.sin(t * 13) * 5 + Math.sin(t * 7.1) * 4;
  candleLight.intensity = 9 + Math.sin(t * 11) * 0.8 + Math.sin(t * 7.3) * 0.6;
  // the fire: a knot of flickering motes turning round its own heart
  fireSparks.update(dt);
  fireGlow.material.size = 2.0 + Math.sin(t * 9) * 0.25 + Math.sin(t * 5.3) * 0.2;
  for (let n = Math.floor(dt * 260 + Math.random()); n > 0; n--) {
    const a = Math.random() * TAU, r = Math.pow(Math.random(), 1.4) * 0.7, h = (Math.random() - 0.4) * 0.85, sp = 0.5 + Math.random() * 0.8, c = Math.random();
    tmpV.set(fireCore.x + Math.cos(a) * r * 0.75, fireCore.y + h * 0.9, fireCore.z + Math.sin(a) * r * 0.95);
    tmpW.set(-Math.sin(a) * sp * 0.45 + rnd(-0.05, 0.05), rnd(0.15, 0.6), Math.cos(a) * sp + rnd(-0.05, 0.05));
    fireSparks.emit(tmpV, tmpW, { life: rnd(0.35, 0.9), size: rnd(0.05, 0.14) * (1.1 - r), color: FIRE_COLS[c < 0.5 ? 0 : c < 0.85 ? 1 : c < 0.93 ? 2 : 3], drag: 2.2, acc: 0.4 });
  }
  // moonbeams fade away up close to the book; dust turns in them
  if (BEAM) { BEAM.uniforms.uOpacity.value += ((1 - near) * 0.12 - BEAM.uniforms.uOpacity.value) * Math.min(1, dt * 3); BEAM.uniforms.uTime.value = t; }
  glowWalls.forEach((m) => { m.emissiveIntensity = 0.06 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.15)); });
  if (MATS.bark) MATS.bark.emissiveIntensity = 0.7 + Math.sin(t * 7) * 0.2 + Math.sin(t * 13) * 0.1;
  spinners.forEach((g) => { g.rotation.y += dt * 1.6; g.position.y = 0.42 + Math.sin(t * 2) * 0.02; });
  if (!near && shafts[0] && Math.random() < dt * 26) { const u = shafts[0], x = rnd(-u.ww, u.ww), y = rnd(u.bot + 0.3, u.spring + Math.sqrt(Math.max(0, u.ww * u.ww - x * x)) * 0.9); tmpV.set(x, y, HUT_BACK).addScaledVector(u.dir, ((y - FLOOR) / -u.dir.y) * Math.random() * 0.9); sparks.emit(tmpV, tmpW.set(rnd(-0.03, 0.03), rnd(-0.01, 0.03), rnd(-0.03, 0.03)), { life: rnd(3, 6), size: rnd(0.025, 0.05), color: new THREE.Color(1.1, 1.2, 1.6), drag: 0.05 }); }
  gears.forEach((m) => { m.rotation.z += dt * 0.6 * m.userData.dir * (1 + play.orrery * 6); });
  if (pages) { const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(); pages.userData.list.forEach((p, i) => { p.a += dt * p.sp; e.set(Math.sin(t * 0.9 + p.ph) * 0.6, -p.a + Math.sin(t * 0.4 + p.ph), Math.sin(t * 1.3 + p.ph) * 0.4); mx.compose(tmpV.set(0.3 + Math.cos(p.a) * p.rad, p.y + Math.sin(t * 0.6 + p.ph) * 0.35, -2.5 + Math.sin(p.a) * p.rad * 0.7), q.setFromEuler(e), tmpW.set(1, 1, 1)); pages.setMatrixAt(i, mx); }); pages.instanceMatrix.needsUpdate = true; }
  // the little contraptions
  const cat = sleepyCat, w = play.cat > 0 ? Math.sin(Math.PI * (1 - play.cat)) : 0;
  play.cat = Math.max(0, play.cat - dt / 3);
  cat.g.scale.y = cat.sc * (1 + Math.sin(t * 1.7) * 0.02);
  cat.head.rotation.z = -0.18 + 0.42 * w; cat.head.position.y = cat.head.userData.y0 + 0.08 * w; cat.head.rotation.x = 0.22 - 0.2 * w + Math.sin(t * 20) * 0.04 * w;
  const awake = w > 0.25; cat.lids.forEach(([o, l]) => { o.visible = awake; l.visible = !awake; });                                       // asleep, until she lifts her head to look at you
  play.tail = Math.max(0, (play.tail ?? 0) - dt / 1.6); cat.tailG.rotation.y = Math.sin(t * 13) * 0.32 * play.tail;
  play.ears = Math.max(0, (play.ears ?? 0) - dt / 1.2); cat.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 30 + i) * 0.25 * play.ears; });
  play.stretch = Math.max(0, (play.stretch ?? 0) - dt / 2.2); cat.g.scale.x = cat.sc * (1 + 0.1 * Math.sin(Math.PI * (1 - play.stretch)) * (play.stretch > 0 ? 1 : 0));
  if ((play.purr ?? 0) > 0) { play.purr -= dt; cat.g.scale.y *= 1 + Math.sin(t * 60) * 0.006; if (Math.random() < dt * 4) heart(cat.head.getWorldPosition(V(0, 0, 0)).add(V(0, 0.4, 0))); }
  for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i]; h.t += dt / 1.8; h.sp.position.y += dt * 0.55; h.sp.position.x += Math.sin(t * 3 + i) * dt * 0.1; h.sp.material.opacity = 1 - h.t; if (h.t >= 1) { scene.remove(h.sp); h.sp.material.dispose(); hearts.splice(i, 1); } }
  if ((play.flip ?? 0) > 0) { play.flip = Math.max(0, play.flip - dt / 0.9); play.sandGlass.rotation.z = play.flipFrom + Math.PI * easeIO(1 - play.flip); }
  play.fire = Math.max(0, (play.fire ?? 0) - dt / 2.5); fireLight.intensity += play.fire * 40; fireGlow.material.size *= 1 + play.fire * 0.6;
  if (play.fire > 0 && Math.random() < dt * 60) fireSparks.emit(tmpV.copy(fireCore).add(V(rnd(-0.4, 0.4), rnd(0, 0.6), rnd(-0.6, 0.6))), tmpW.set(rnd(-0.1, 0.4), rnd(1.2, 2.6), rnd(-0.3, 0.3)), { life: rnd(0.6, 1.2), size: rnd(0.06, 0.12), color: FIRE_COLS[1], drag: 1.2, acc: 0.3 });
  propMarks(dt, t);
  play.globe = Math.max(0, play.globe - dt * 0.35); globeSphere.rotation.y += dt * (0.15 + play.globe * play.globe * 9);
  play.orrery = Math.max(0, play.orrery - dt * 0.3); orrery.rotation.y += dt * (0.12 + play.orrery * 1.5);
  orrery.children.forEach((r) => { if (r.userData.spin) r.userData.spin.rotation.y += dt * r.userData.spin.userData.speed * (1 + play.orrery * 7); });
  record.rotation.y += dt * (play.music ? 4.2 : 0.6);
  if (play.music && (play.notes -= dt) < 0) { play.notes = rnd(0.25, 0.45); sparks.emit(tmpV.copy(play.hornMouth).add(V(rnd(-0.4, 0.4), rnd(-0.4, 0.4), rnd(-0.4, 0.4))), tmpW.set(rnd(-0.5, -0.2), rnd(0.25, 0.5), rnd(-0.1, 0.3)), { life: rnd(1.6, 2.4), size: rnd(0.07, 0.11), color: Math.random() < 0.5 ? GOLD : LILAC, drag: 0.3 }); }
  play.ball = Math.max(0, play.ball - dt * 0.25);
  MATS.ballcore.emissiveIntensity = 1.4 + play.ball * 4; if (play.ball > 0) { MATS.ballcore.emissive.setHSL((t * 0.4) % 1, 0.7, 0.5); if (Math.random() < dt * 40) { const a = t * 5 + Math.random(); sparks.emit(tmpV.set(2.7 + Math.cos(a) * 0.3, 0.34 + rnd(-0.1, 0.2), -1.55 + Math.sin(a) * 0.3), tmpW.set(0, rnd(0.1, 0.3), 0), { life: 0.9, size: 0.03, color: LILAC }); } } else MATS.ballcore.emissive.setHex(0x8a6ad8);
  if (MATS.ballglass) { MATS.ballglass.emissive.copy(MATS.ballcore.emissive); MATS.ballglass.emissiveIntensity = MATS.ballcore.emissiveIntensity * 0.55; }     // the phone's glass glows with the core
  play.tree = Math.max(0, play.tree - dt * 0.3); MATS.paperlamp.emissiveIntensity = 1.2 + play.tree * 2.5;
  updateNeon(dt);
  // now and then, a twinkle over something you could poke
  if (mode === 'hut' && (play.cue -= dt) < 0) { play.cue = rnd(3.5, 6.5); const pr = PROPS[Math.floor(Math.random() * PROPS.length)]; pr.box ??= new THREE.Box3().setFromObject(pr.obj).getCenter(V(0, 0, 0)); burstAt(sparks, pr.box, 10, { speed: 0.25, up: 0.3, size: 0.05, life: 1 }); }
  floaters.forEach((g) => { g.position.y = g.userData.base.y + Math.sin(t * 0.8 + g.userData.ph) * 0.18; });
  hanging.forEach((g) => { g.rotation.y = Math.sin(t * 0.5 + g.userData.ph) * 0.6; });
  swaying.forEach((g) => { g.rotation.z = Math.sin(t * 0.7 + g.userData.ph) * 0.03; g.rotation.y += dt * 0.08; });
  beadGroups.forEach((g, i) => { g.rotation.y = Math.sin(t * 0.3 + i) * 0.02; });
  drifting.forEach((c) => { c.position.x += c.userData.v * dt; if (c.position.x > 28) c.position.x -= 56; });
  if (meteor.t < 0 && (meteor.wait -= dt) < 0) { meteor.t = 0; meteor.a = V(rnd(-16, -2), rnd(18, 23), HUT_BACK - 60); meteor.b = meteor.a.clone().add(V(rnd(10, 16), rnd(-6, -4), 0)); }
  if (meteor.t >= 0) {
    meteor.t += dt / 0.9;
    if (meteor.t < 1) for (let k = 0; k < 4; k++) sparks.emit(tmpV.lerpVectors(meteor.a, meteor.b, meteor.t + k * 0.005), tmpW.set(0, 0, 0), { life: 0.45, size: 0.7 * (1 - meteor.t * 0.6), color: new THREE.Color(1.5, 1.5, 1.8), drag: 0 });
    else { meteor.t = -1; meteor.wait = rnd(6, 12); }
  }
  if (Math.random() < dt * 16) sparks.emit(tmpV.set(-HUT_W / 2 + 1.3 + rnd(-0.4, 0.4), FLOOR + 1.4, -3 + rnd(-0.8, 0.8)), tmpW.set(rnd(-0.05, 0.25), rnd(0.6, 1.4), rnd(-0.2, 0.2)), { life: rnd(1, 2.2), size: rnd(0.03, 0.06), color: new THREE.Color(1.8, 0.8, 0.3), drag: 0.6 });
  if (Math.random() < dt * 6) sparks.emit(tmpV.set(-8.3 + rnd(-0.6, 0.6), FLOOR + 2.0, 4.6 + rnd(-1, 1)), tmpW.set(rnd(-0.05, 0.05), rnd(0.2, 0.5), 0), { life: rnd(0.8, 1.6), size: rnd(0.04, 0.07), color: GOLD });
  if (Math.random() < dt * 10) sparks.emit(tmpV.set(rnd(-3, 3.6), rnd(FLOOR + 1, 7), rnd(-6, 2)), tmpW.set(rnd(-0.05, 0.05), rnd(-0.02, 0.06), rnd(-0.05, 0.05)), { life: rnd(3, 5), size: rnd(0.03, 0.05), color: new THREE.Color(1.1, 1.15, 1.4), drag: 0.1 });
  const waiting = mode === 'hut' && !rigTween;
  bookHalo.material.opacity += ((waiting ? 0.45 + Math.sin(t * 2.2) * 0.15 : 0) - bookHalo.material.opacity) * Math.min(1, dt * 3);
  bookHalo.rotation.z += dt * 0.2;
  if (waiting && Math.random() < dt * 30) { const a = Math.random() * TAU; sparks.emit(tmpV.set(0.5 + Math.cos(a) * 0.9, 0.05, Math.sin(a) * 0.9), tmpW.set(-Math.sin(a) * 0.25, rnd(0.25, 0.6), Math.cos(a) * 0.25), { life: rnd(1.2, 2), size: rnd(0.04, 0.07), acc: -0.05 }); }
  leaves[0].cover.emissive.setRGB(...(waiting ? [0.05 + Math.sin(t * 2.2) * 0.03, 0.04, 0.02] : [0, 0, 0]));
}

const MIRROR_LINES = ['镜子里的你，眼睛亮亮的。', '镜面闪过一道金光：今天会遇到一点小好事。', '镜子说：你比自己以为的更勇敢。', '镜面起了一层薄雾，上面写着：慢慢来。'];
/** the cat answers in turn: a look and a mew, a purr with hearts, a flick of the tail, a big stretch */
function catAnswer() {
  const k = (play.catTurn = ((play.catTurn ?? -1) + 1) % 4);
  if (k === 0) { play.cat = 1; sfx('meow'); toast('喵～（抬起头看了你一眼）'); }
  else if (k === 1) { play.purr = 2.4; sfx('purr'); toast('呼噜呼噜……它眯起眼睛，蹭了蹭你的手'); }
  else if (k === 2) { play.tail = 1; sfx('soft'); toast('尾巴尖轻轻甩了两下，像在说：别吵我～'); }
  else { play.cat = 1; play.ears = 1; play.stretch = 1; sfx('meow'); toast('伸了个大大的懒腰，又蜷回去睡着了'); }
  burstAt(sparks, sleepyCat.g.getWorldPosition(V(0, 0, 0)).add(V(0, 0.9, 0)), 14, { speed: 0.3, up: 0.5, size: 0.05, color: new THREE.Color(1.6, 1.2, 0.8) });
}
let heartTex = null, PROP_MARKS = null; const hearts = [];
function heart(p) {
  heartTex ??= (() => { const c = canvas(64, 64), g = c.getContext('2d'); g.fillStyle = '#ff8fb0'; g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(6, 36, 4, 14, 20, 12); g.bezierCurveTo(28, 11, 32, 18, 32, 22); g.bezierCurveTo(32, 18, 36, 11, 44, 12); g.bezierCurveTo(60, 14, 58, 36, 32, 54); g.fill(); return tex(c); })();
  const sp = new THREE.Points(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0)]), new THREE.PointsMaterial({ map: heartTex, size: 0.32, transparent: true, depthWrite: false })); sp.frustumCulled = false; sp.position.copy(p); scene.add(sp);   // points, like the other glows (sprites upset the AO pass)
  hearts.push({ sp, t: 0, x: rnd(-0.3, 0.3) });
}
/** a small gold star breathing over each thing you can poke, until you have tried it */
function propMarks(dt, t) {
  if (!PROP_MARKS) {
    const c = canvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,240,190,1)'); gr.addColorStop(0.25, 'rgba(255,214,130,.8)'); gr.addColorStop(1, 'rgba(255,200,110,0)');
    g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? 9 : 30; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.closePath(); g.fill();
    const map = tex(c);
    PROP_MARKS = PROPS.map((p, i) => { const b = new THREE.Box3().setFromObject(p.obj), top = V((b.min.x + b.max.x) / 2, Math.min(b.max.y, b.min.y + 6) + 0.45, (b.min.z + b.max.z) / 2);
      const sp = new THREE.Points(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0)]), new THREE.PointsMaterial({ map, size: 0.85, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); sp.frustumCulled = false; sp.position.copy(top); scene.add(sp); return { p, sp, ph: i * 1.3 }; });
  }
  const show = mode === 'hut' && !busy;
  for (const m of PROP_MARKS) { const want = show && !m.p.tried ? 0.7 + 0.3 * Math.sin(t * 2.2 + m.ph) : 0; m.sp.material.opacity += (want - m.sp.material.opacity) * Math.min(1, dt * 4); m.sp.material.size = 0.8 + 0.2 * Math.sin(t * 2.2 + m.ph); }
}

/** the prop under a ray, if any */
function propAt(ray) {
  const th = ray.params.Points.threshold; ray.params.Points.threshold = 0.05;
  const hit = ray.intersectObjects(PROPS.map((p) => p.obj), true)[0];
  ray.params.Points.threshold = th;
  for (let o = hit?.object; o; o = o.parent) { const p = PROPS.find((q) => q.obj === o); if (p) return p; }
  return null;
}
/** put an eye to the telescope: the view swings out of the window, a star falls, then back */
async function peekSky() {
  if (busy || mode !== 'hut') return;
  busy = true; sfx('soft');
  const view = { tx: 0, ty: 7.4, tz: -10, dist: 10, yaw: 0, pitch: 0.06, fov: 38 };
  await tweenRig(view, 1.8);
  rigHold = view;
  meteor.t = 0; meteor.a = V(-10, 15, HUT_BACK - 60); meteor.b = V(4, 9.5, HUT_BACK - 60);
  toast('一颗流星划过——悄悄许个愿吧');
  await wait(3200);
  rigHold = null;
  await wait(1500);
  busy = false;
}
