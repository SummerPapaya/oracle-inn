/* ================= the book ================= */
/*
 * A pop-up book on the desk of a small magic hut. Pages are stiff boards hinged at the spine
 * (the spine runs away from you, along z). Each spread is one little divination house.
 *
 * How the pop-ups fold: every piece of a spread is built flat-open, in the spread's own frame
 * (spine on the z axis, both pages on y = 0). A vertex shader folds it for the current opening
 * angle: pieces first stand up in turn (cards hinge up from lying flat, models rise), then the
 * whole spread is squeezed into the V between the two pages. Parallel cards ride up with the
 * pages like floating layers; cards facing you crease at the gutter like V-folds.
 */
const DEG = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PW = 1, PD = 1.32, T = 0.006, Y0 = 0.08, BOARD = 0.034;
const ROOMS = {
  tent:   { name: '星幕帐篷',     methods: '塔罗',        kind: 'tarot',   ready: true },
  shrine: { name: '东方神龛',     methods: '掷筊 · 灵签', kind: 'jiaobei', ready: true },
  study:  { name: '文房书案',     methods: '测字 · 六爻' },
  tea:    { name: '维多利亚茶桌', methods: '雷诺曼' },
  window: { name: '月下窗台',     methods: '灵摆' },
  hearth: { name: '北欧炉边',     methods: '卢恩符文' },
};
const ORDER = Object.keys(ROOMS);   // spread k (1…6) is ORDER[k - 1]
const NS = ORDER.length;            // leaves: 0 is the front cover with half the pages, 1…5 are single boards

/* ---------- folding, in the shader ---------- */
const TIME = { value: 0 };
const FOLD = /* glsl */ `
attribute vec4 aPop;          // z of the hinge, delay, mode (0 card, 1 model, 2 V-fold only, 3 floating), phase
uniform float uB;             // how far each page is lifted from flat, in radians
uniform float uU;             // how open the spread is, 0…1
uniform float uTime;
float popEase(float x) { float c1 = 1.5, c3 = c1 + 1.0, t = x - 1.0; return 1.0 + c3 * t * t * t + c1 * t * t; }
void popDeform(inout vec3 p, inout vec3 n) {
  float d = aPop.y;
  float ue = clamp((uU - d) / max(0.05, 1.0 - d), 0.0, 1.0);
  float e = popEase(ue);
  int mode = int(aPop.z + 0.5);
  if (mode == 0) {
    float a = (e - 1.0) * 1.5707963, ca = cos(a), sa = sin(a), dz = p.z - aPop.x, y = p.y;
    p.y = y * ca - dz * sa;
    p.z = aPop.x + y * sa + dz * ca;
    n = vec3(n.x, n.y * ca - n.z * sa, n.y * sa + n.z * ca);
  } else if (mode == 1 || mode == 3) {
    float ee = max(e, 0.002);
    p.y *= ee;
    n = vec3(n.x * ee, n.y, n.z * ee);
    if (mode == 3) p.y += sin(uTime * 1.3 + aPop.w) * 0.014 * ue;
  }
  float c = cos(uB), s = sin(uB), k = 0.55 + 0.45 * c, sx = p.x >= 0.0 ? 1.0 : -1.0;
  vec3 q = vec3(p.x * c, p.y * k + abs(p.x) * s, p.z);
  n = vec3(k * n.x - sx * s * n.y, c * n.y, c * k * n.z) + vec3(0.0, 1e-5, 0.0);
  p = q;
}
`;
function popMaterial(U, params) {
  const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, ...params });
  if (params.map) m.alphaTest = 0.5;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uB = U.uB; sh.uniforms.uU = U.uU; sh.uniforms.uTime = TIME;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + FOLD)
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n\tvec3 popP = position;\n\tpopDeform(popP, objectNormal);')
      .replace('#include <begin_vertex>', 'vec3 transformed = popP;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n\tif (!gl_FrontFacing) diffuseColor.rgb = vec3(0.93, 0.89, 0.81);');
  };
  m.customProgramCacheKey = () => 'pop';
  return m;
}
function popDepth(U, map) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: map ? 0.5 : 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uB = U.uB; sh.uniforms.uU = U.uU; sh.uniforms.uTime = TIME;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + FOLD)
      .replace('#include <begin_vertex>', 'vec3 popP = position; vec3 popN = vec3(0.0, 1.0, 0.0); popDeform(popP, popN); vec3 transformed = popP;');
  };
  m.customProgramCacheKey = () => 'popDepth';
  return m;
}
function popTex(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rx !== 1 || ry !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
  return t;
}
const CIRCLE_TEX = {}; let RING_TEX;

/** the pieces of one spread, plus its bits of magic */
class Pop {
  constructor(id) {
    this.id = id;
    this.U = { uB: { value: Math.PI / 2 }, uU: { value: 0 } };
    this.group = new THREE.Group();
    this.group.visible = false;
    this.hits = [];
    this.door = V(0, 0.1, 0.2);
    this.center = V(0, 0.25, -0.1);
    this.glowList = []; this.smokes = []; this.fade = 0; this.circles = [];
  }
  piece(geo, look, o = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (o.m) g.applyMatrix4(o.m);
    if (o.flat) g.computeVertexNormals();
    const n = g.attributes.position.count, a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { a[i * 4] = o.z0 ?? 0; a[i * 4 + 1] = o.delay ?? 0; a[i * 4 + 2] = o.mode ?? 2; a[i * 4 + 3] = o.phase ?? 0; }
    g.setAttribute('aPop', new THREE.BufferAttribute(a, 4));
    const one = (l) => popMaterial(this.U, l?.isTexture ? { map: l } : { color: l, ...(o.emissive ? { emissive: o.emissive } : {}) });
    const mesh = new THREE.Mesh(g, Array.isArray(look) ? look.map(one) : one(look));
    mesh.customDepthMaterial = popDepth(this.U, !Array.isArray(look) && look?.isTexture ? look : null);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    if (o.tag) { mesh.userData.tag = o.tag; this.hits.push(mesh); }
    this.group.add(mesh);
    return mesh;
  }
  /** a card standing on the page, bottom edge at (x, z), hinging up from lying flat */
  card(c, x, z, w, o = {}) {
    const h = (w * c.height) / c.width;
    return this.piece(new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0), popTex(c), { m: mat4(V(x, 0.003 + (o.y ?? 0), z), o.ry ?? 0), z0: z, delay: o.delay ?? 0.2, mode: o.mode ?? 0, tag: o.tag });
  }
  /** a card held up in the air on a clear stalk, bobbing a little */
  float(c, x, y, z, w, o = {}) {
    const h = (w * c.height) / c.width;
    return this.piece(new THREE.PlaneGeometry(w, h), popTex(c), { m: mat4(V(x, y, z), o.ry ?? 0), z0: z, delay: o.delay ?? 0.5, mode: 3, phase: o.phase ?? x * 7 });
  }
  /** a soft light at a window, a bulb or a lantern; shown once the page is open */
  glow(x, y, z, size = 0.05, color = GOLD) { this.glowList.push([x, y, z, size, color]); }
  /** the gold rune circle on the page under a house that can be entered */
  circle(x, z, r, kind = 'rune') {
    const ctex = (CIRCLE_TEX[kind] ??= popTex(kind === 'bagua' ? baguaCircleTex() : magicCircleTex()));
    const turns = kind === 'bagua' ? [-1, -1.6] : [1, -1.6];
    [[r, turns[0], 0.06], [r * 0.62, turns[1], 0.09]].forEach(([rr, spin, y]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(rr * 2, rr * 2), new THREE.MeshBasicMaterial({ map: ctex, transparent: true, opacity: 0, color: new THREE.Color(1.6, 1.2, 0.6), blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004 + y * 0.02, z); m.userData.spin = spin;
      this.group.add(m); this.circles.push(m);
    });
    RING_TEX ??= (() => { const c = canvas(256, 256), g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 90, 128, 128, 128); gr.addColorStop(0, 'rgba(255,230,170,0)'); gr.addColorStop(0.7, 'rgba(255,230,170,.9)'); gr.addColorStop(1, 'rgba(255,230,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return popTex(c); })();
    this.wave = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: RING_TEX, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.5, 1.2, 0.7) }));
    this.wave.rotation.x = -Math.PI / 2; this.wave.position.set(x, 0.01, z); this.wave.userData.t = 9;
    this.group.add(this.wave);
  }
  /** call once every piece is in: turns the glow list into one set of points */
  finish() {
    if (!this.glowList.length) return;
    this.glows = new Sparks(this.glowList.length);
    this.glowList.forEach(([x, y, z, size, color]) => this.glows.emit(V(x, y, z), V(0, 0, 0), { life: 1e9, size, color, drag: 0 }));
    this.glows.update(0);
    this.glows.mat.uniforms.uFade = { value: 0 };
    this.group.add(this.glows.points);
  }
}

/* ---------- shapes for folded card ---------- */
function tri(a, b, c) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
  g.computeVertexNormals();
  return g;
}
/** a square roof whose eaves curve up at the corners, the way temple roofs do; base at y = 0 */
function flared(w, d, h, top = 0.3, lift = 0.05, sag = 0.16) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 32, 6, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) + 0.5, a = Math.atan2(p.getX(i), p.getZ(i));
    const sq = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
    const r = 1 - (1 - top) * Math.pow(t, 0.75), corner = Math.pow(Math.abs(Math.sin(2 * a)), 6);
    p.setXYZ(i, (Math.sin(a) * sq * r * w) / 2, t * h - Math.sin(Math.PI * t) * h * sag + lift * corner * (1 - t) ** 2, (Math.cos(a) * sq * r * d) / 2);
  }
  g.computeVertexNormals();
  return g;
}
const catenary = (a, b, sag, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * sag, a.z + (b.z - a.z) * t); });
let FLAGS;
/** a string of little flags hanging between two points, and a row of bulbs just under it */
function bunting(P, a, b, o) {
  FLAGS ??= popTex(flagAtlas());
  const pts = catenary(a, b, o.sag ?? 0.04, o.n ?? 9), pos = [], uv = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[k].clone().lerp(pts[k + 1], 0.12), p1 = pts[k].clone().lerp(pts[k + 1], 0.88), tip = p0.clone().lerp(p1, 0.5).add(V(0, -0.034, 0));
    const c = k % 4;
    pos.push(...p0.toArray(), ...p1.toArray(), ...tip.toArray());
    uv.push(c / 4 + 0.01, 1, (c + 1) / 4 - 0.01, 1, c / 4 + 0.125, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  P.piece(g, FLAGS, o);
  P.piece(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0016, 4), 0x3b2418, o);
  if (o.bulbs) catenary(a.clone().add(V(0, -0.01, 0)), b.clone().add(V(0, -0.01, 0)), (o.sag ?? 0.04) + 0.012, 12).forEach((p, i) => i % 2 || P.glow(p.x, p.y, p.z, 0.028, i % 4 ? GOLD : ROSE));
}

/* ---------- the houses, made of folded card, a little larger than life ---------- */
function tentModel(P, x, z, delay = 0.24) {
  const o = { delay, mode: 1, tag: 'tent' }, th = -Math.PI / 8;
  const stripes = popTex(HOUSE_TEX.tentStripes(), 8, 1), roof = popTex(HOUSE_TEX.tentRoof(), 8, 1), val = popTex(HOUSE_TEX.valance(), 8, 1);
  const R = 0.24, H1 = 0.2, R2 = 0.29, C1 = 0.24, y2 = H1 + C1 * 0.7, top = y2 + 0.09 + 0.27;
  P.piece(new THREE.CylinderGeometry(R, R, H1, 8, 1, true, th), stripes, { ...o, flat: true, m: mat4(V(x, H1 / 2, z)) });
  P.piece(new THREE.ConeGeometry(R2, C1, 8, 1, true, th), roof, { ...o, flat: true, m: mat4(V(x, H1 + C1 / 2, z)) });
  P.piece(new THREE.CylinderGeometry(R2, R2, 0.05, 8, 1, true, th), val, { ...o, flat: true, m: mat4(V(x, H1 - 0.025, z)) });
  P.piece(new THREE.CylinderGeometry(0.088, 0.088, 0.09, 8, 1, true, th), popTex(HOUSE_TEX.tentStripes(), 4, 1), { ...o, flat: true, m: mat4(V(x, y2 + 0.045, z)) });
  P.piece(new THREE.CylinderGeometry(0.108, 0.108, 0.03, 8, 1, true, th), popTex(HOUSE_TEX.valance(), 8, 1), { ...o, flat: true, m: mat4(V(x, y2 + 0.075, z)) });
  P.piece(new THREE.ConeGeometry(0.108, 0.27, 8, 1, true, th), roof, { ...o, flat: true, m: mat4(V(x, y2 + 0.09 + 0.135, z)) });
  P.piece(new THREE.SphereGeometry(0.013, 10, 8), 0xd9a441, { ...o, m: mat4(V(x, top + 0.008, z)) });
  P.piece(new THREE.PlaneGeometry(0.085, 0.085), popTex(eightStarCard(508)), { ...o, m: mat4(V(x, top + 0.062, z)) });     // the same eight-pointed star as the tent's finial
  P.glow(x, top + 0.06, z + 0.01, 0.07, GOLD);
  // ropes of flags and bulbs out to four poles
  [[-0.42, -0.16], [0.44, -0.18], [-0.3, 0.19], [0.33, 0.2]].forEach(([px_, pz], i) => {
    const pole = V(x + px_, 0.27, z + pz);
    P.piece(new THREE.CylinderGeometry(0.0045, 0.0055, 0.27, 6), 0x5b3f2c, { ...o, m: mat4(V(pole.x, 0.135, pole.z)) });
    P.piece(new THREE.PlaneGeometry(0.04, 0.04), popTex(starCard(520 + i, false)), { ...o, m: mat4(V(pole.x, 0.285, pole.z)) });
    bunting(P, V(x, top - 0.08, z), pole, { ...o, sag: 0.05, n: 8, bulbs: true });
  });
  const fz = R * Math.cos(Math.PI / 8) + 0.004;
  P.piece(new THREE.PlaneGeometry(0.14, 0.19).translate(0, 0.095, 0), popTex(HOUSE_TEX.tentDoor()), { ...o, m: mat4(V(x, 0.002, z + fz)) });
  [-1, 1].forEach((s) => {
    const a = (s * Math.PI) / 4;
    P.piece(new THREE.PlaneGeometry(0.06, 0.06), popTex(porthole(530 + s)), { ...o, m: mat4(V(x + Math.sin(a) * fz, 0.12, z + Math.cos(a) * fz), a) });
    P.glow(x + Math.sin(a) * (fz + 0.01), 0.12, z + Math.cos(a) * (fz + 0.01), 0.07);
  });
  P.glow(x, 0.08, z + fz + 0.02, 0.12, GOLD);
  P.door = V(x, 0.09, z + fz + 0.02); P.center = V(x, 0.3, z);
  P.circle(x, z, 0.5);
}
/** a curved Minnan roof: the ridge dips in the middle and the ends sweep up; base at y = 0 */
function swallowRoof(w, d, rise, lift, over) {
  const nu = 24, nv = 8, pos = [], uv = [], idx = [];
  const ridgeY = (u) => rise + lift * Math.pow(Math.abs(2 * u - 1), 3), eaveY = (u) => -over * 0.3 + lift * 0.7 * Math.pow(Math.abs(2 * u - 1), 3);
  let base = 0;
  for (const s of [1, -1]) {
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv;
      pos.push((u - 0.5) * (w + 2 * over), ridgeY(u) + (eaveY(u) - ridgeY(u)) * v - Math.sin(Math.PI * v) * rise * 0.16, s * v * (d / 2 + over));
      uv.push(u, v);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e = c + 1; if (s > 0) idx.push(a, c, b, b, c, e); else idx.push(a, b, c, b, e, c); }
    base += (nu + 1) * (nv + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** the ridge beam, running out past the roof and splitting into a swallow's tail at each end */
function swallowRidge(P, x, y, z, w, over, rise, lift, o) {
  const L = w / 2 + over + 0.04, pts = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30, e = Math.abs(2 * u - 1); pts.push(V(x + (u - 0.5) * 2 * L, y + rise + 0.012 + lift * 1.25 * e ** 3 + Math.max(0, e - 0.85) * 0.5, z)); }
  P.piece(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.011, 6), 0xc4532e, o);
  P.piece(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(V(0, 0.012, 0)))), 48, 0.005, 5), 0xf0d8a0, o);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const end = pts[sx < 0 ? 0 : 30]; P.piece(new THREE.ConeGeometry(0.008, 0.07, 5), 0xc4532e, { ...o, m: mat4(V(end.x + sx * 0.012, end.y + 0.02, z + sz * 0.012), 0, sz * 0.5, -sx * 0.7) }); }
}
function flipped(c) { const t = popTex(c); t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; return t; }
/** the shrine page: a temple in the Quanzhou manner, red tiles, swallowtail ridges, dragons in cut porcelain */
function minnanTemple(P, x, z, delay = 0.24) {
  const o = { delay, mode: 1, tag: 'shrine' }, granite = 0xd8d4c8, red = 0xa8382a;
  const tiles = popTex(MINNAN.tiles(), 12, 1), side = popTex(MINNAN.side()), front = popTex(MINNAN.front()), beam = popTex(MINNAN.beam(), 2, 1);
  P.piece(new THREE.BoxGeometry(0.66, 0.06, 0.46), granite, { ...o, m: mat4(V(x, 0.03, z)) });
  P.piece(new THREE.BoxGeometry(0.26, 0.03, 0.08), granite, { ...o, m: mat4(V(x, 0.015, z + 0.27)) });
  P.piece(new THREE.BoxGeometry(0.2, 0.02, 0.06), granite, { ...o, m: mat4(V(x, 0.04, z + 0.25)) });
  P.piece(new THREE.BoxGeometry(0.48, 0.22, 0.3), [side, side, red, red, front, side], { ...o, m: mat4(V(x, 0.17, z)) });
  for (const sx of [-1, 1]) {
    const cx = x + sx * 0.17, cz = z + 0.18;
    P.piece(new THREE.CylinderGeometry(0.018, 0.02, 0.22, 10), granite, { ...o, m: mat4(V(cx, 0.17, cz)) });
    const coil = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * TAU * 2.2 * sx; coil.push(V(cx + Math.cos(a) * 0.026, 0.07 + t * 0.19, cz + Math.sin(a) * 0.026)); }
    P.piece(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 60, 0.007, 5), 0x3f9a7a, o);
    P.piece(new THREE.SphereGeometry(0.012, 8, 6), 0xe8b830, { ...o, m: mat4(coil[40]) });
  }
  P.piece(swallowRoof(0.52, 0.34, 0.075, 0.05, 0.045), tiles, { ...o, m: mat4(V(x, 0.28, z)) });
  swallowRidge(P, x, 0.28, z, 0.52, 0.045, 0.075, 0.05, o);
  P.piece(new THREE.BoxGeometry(0.34, 0.11, 0.22), [beam, beam, red, red, beam, beam], { ...o, m: mat4(V(x, 0.395, z)) });
  P.piece(swallowRoof(0.4, 0.26, 0.085, 0.09, 0.04), tiles, { ...o, m: mat4(V(x, 0.45, z)) });
  swallowRidge(P, x, 0.45, z, 0.4, 0.04, 0.085, 0.09, o);
  const dragon = ridgeDragon(541);
  P.piece(new THREE.PlaneGeometry(0.26, 0.13).translate(0, 0.065, 0), popTex(dragon), { ...o, m: mat4(V(x - 0.14, 0.545, z)) });
  P.piece(new THREE.PlaneGeometry(0.26, 0.13).translate(0, 0.065, 0), flipped(dragon), { ...o, m: mat4(V(x + 0.14, 0.545, z)) });
  P.piece(new THREE.PlaneGeometry(0.075, 0.082).translate(0, 0.041, 0), popTex(ridgePearl(543)), { ...o, m: mat4(V(x, 0.548, z)) });
  P.glow(x, 0.6, z + 0.01, 0.09, GOLD);
  const fl = ridgeFlowers(545);
  for (const sx of [-1, 1]) P.piece(new THREE.PlaneGeometry(0.1, 0.053).translate(0, 0.026, 0), popTex(fl), { ...o, m: mat4(V(x + sx * 0.18, 0.36, z)) });
  for (const [sx, ch] of [[-1, '福'], [1, '安']]) {
    P.piece(new THREE.PlaneGeometry(0.07, 0.084), popTex(lanternRound(547 + sx, ch)), { ...o, m: mat4(V(x + sx * 0.25, 0.2, z + 0.24)) });
    P.glow(x + sx * 0.25, 0.2, z + 0.25, 0.12, ROSE);
  }
  P.piece(new THREE.PlaneGeometry(0.12, 0.055), popTex(HOUSE_TEX.plaque()), { ...o, m: mat4(V(x, 0.4, z + 0.112)) });
  P.glow(x, 0.12, z + 0.16, 0.16, GOLD);
  P.door = V(x, 0.1, z + 0.16); P.center = V(x, 0.35, z);
  P.circle(x, z, 0.55, 'bagua');
}
/** a box house with a front, sides and one of several roofs */
function house(P, s) {
  const F = FRONTS[s.id], o = { delay: s.delay ?? 0.24, mode: 1, tag: s.id }, { x, z, w, h, d } = s;
  const front = popTex(F.front()), side = popTex(F.side()), base = 0x5b4a3e;
  P.piece(new THREE.BoxGeometry(w, h, d), [side, side, base, base, front, side], { ...o, m: mat4(V(x, h / 2, z)) });
  if (s.roof === 'gableZ') {
    const half = w / 2, ov = s.over, ang = Math.atan2(s.rise, half), L = (half + ov) / Math.cos(ang), cy = h + s.rise - ((half + ov) * s.rise) / (2 * half), roof = popTex(F.roof(), 2, 2);
    for (const sg of [-1, 1]) {
      const off = (sg * (half + ov)) / 2, at = (lift) => mat4(V(x + off + sg * Math.sin(ang) * lift, cy + Math.cos(ang) * lift, z), 0, 0, -sg * ang);
      P.piece(new THREE.BoxGeometry(L, 0.012, d + 2 * ov), roof, { ...o, m: at(0) });
      if (s.snow) P.piece(new THREE.BoxGeometry(L * 0.92, 0.014, d + 2 * ov - 0.01), 0xf2f6fb, { ...o, m: at(0.013) });
    }
    const gab = popTex(F.gable ? F.gable() : F.side());
    for (const sz of [1, -1]) P.piece(tri([x - sz * half, h, z + (sz * d) / 2], [x + sz * half, h, z + (sz * d) / 2], [x, h + s.rise, z + (sz * d) / 2]), gab, o);
    if (s.icicles) for (let k = 0; k < 9; k++) { const t = k / 8 - 0.5, ix = x + t * (w + ov), iy = h + s.rise * (1 - Math.abs(t) * 2) - (ov * s.rise) / half - 0.012; P.piece(new THREE.ConeGeometry(0.006, 0.03 + (k % 3) * 0.012, 5), 0xdfeefc, { ...o, m: mat4(V(ix, iy - 0.018, z + d / 2 + ov - 0.005), 0, Math.PI) }); }
  }
  if (s.roof === 'flared') {
    P.piece(flared(w + 0.18, d + 0.16, s.rise, 0.32, 0.06), popTex(F.roof(), 8, 2), { ...o, m: mat4(V(x, h, z)) });
    if (s.upper) {
      P.piece(new THREE.BoxGeometry(w * 0.42, 0.075, d * 0.44), popTex(F.side()), { ...o, m: mat4(V(x, h + s.rise * 0.82 + 0.03, z)) });
      P.piece(flared(w * 0.68, d * 0.78, s.rise * 0.7, 0.14, 0.045), popTex(F.roof(), 8, 2), { ...o, m: mat4(V(x, h + s.rise * 0.82 + 0.07, z)) });
      P.piece(new THREE.SphereGeometry(0.016, 10, 8), 0xd9a441, { ...o, m: mat4(V(x, h + s.rise * 0.82 + 0.07 + s.rise * 0.7 + 0.01, z)) });
    }
  }
  if (s.roof === 'pyramid') {
    const rx = w / 2 + s.over, rz = d / 2 + s.over;
    P.piece(new THREE.ConeGeometry(Math.SQRT2 * rx, s.rise, 4, 1, true, Math.PI / 4), popTex(F.roof(), 4, 2), { ...o, flat: true, m: mat4(V(x, h + s.rise / 2, z), 0, 0, 0, 1, 1, rz / rx) });
    P.piece(new THREE.SphereGeometry(0.016, 10, 8), 0xd9a441, { ...o, m: mat4(V(x, h + s.rise + 0.012, z)) });
  }
  if (s.chimney) {
    const [cx, cz, ch] = s.chimney;
    P.piece(new THREE.BoxGeometry(0.065, ch, 0.065), 0x8a7c84, { ...o, m: mat4(V(x + cx, ch / 2, z + cz)) });
    P.piece(new THREE.BoxGeometry(0.08, 0.018, 0.08), 0x5a4c54, { ...o, m: mat4(V(x + cx, ch, z + cz)) });
    P.smokes.push(V(x + cx, ch + 0.02, z + cz));
  }
  (s.glows ?? []).forEach(([gx, gy, size]) => P.glow(x + gx * w, gy, z + d / 2 + 0.012, size ?? 0.07));
  P.door = V(x + (s.doorX ?? 0) * w, 0.09, z + d / 2 + 0.01);
  P.center = V(x, h + 0.08, z);
}
function teaHouse(P, x, z, delay = 0.24) {
  const o = { delay, mode: 1, tag: 'tea' }, F = FRONTS.tea, w = 0.46, d = 0.3;
  house(P, { id: 'tea', x, z, w, h: 0.26, d, roof: 'none', doorX: 0.28, glows: [[-0.17, 0.16, 0.14], [0.28, 0.1, 0.08]], delay });
  const upSide = popTex(F.side()), slate = popTex(F.roof(), 4, 2), cream = 0xf0e2c4;
  P.piece(new THREE.BoxGeometry(w + 0.03, 0.022, d + 0.03), cream, { ...o, m: mat4(V(x, 0.271, z)) });
  P.piece(new THREE.BoxGeometry(w - 0.03, 0.17, d - 0.03), [upSide, upSide, cream, cream, popTex(teaUpper()), upSide], { ...o, m: mat4(V(x, 0.367, z)) });
  P.piece(new THREE.BoxGeometry(w + 0.01, 0.02, d + 0.01), cream, { ...o, m: mat4(V(x, 0.462, z)) });
  P.piece(new THREE.CylinderGeometry(0.17, 0.335, 0.14, 4, 1, true, Math.PI / 4), slate, { ...o, flat: true, m: mat4(V(x, 0.542, z), 0, 0, 0, 1, 1, 0.66) });
  P.piece(new THREE.BoxGeometry(0.25, 0.012, 0.17), 0x4a4e5e, { ...o, m: mat4(V(x, 0.612, z)) });
  [-0.1, 0.1].forEach((dx, i) => { P.piece(new THREE.PlaneGeometry(0.07, 0.077).translate(0, 0.038, 0), popTex(dormer(580 + i)), { ...o, m: mat4(V(x + dx, 0.48, z + 0.13)) }); P.glow(x + dx, 0.51, z + 0.142, 0.06); });
  [[-0.15, -0.05, 0.7], [0.17, -0.07, 0.66]].forEach(([cx, cz, ch]) => { P.piece(new THREE.BoxGeometry(0.05, 0.14, 0.05), 0x9b4f3b, { ...o, m: mat4(V(x + cx, ch - 0.07, z + cz)) }); P.piece(new THREE.BoxGeometry(0.064, 0.016, 0.064), 0x6b3a2a, { ...o, m: mat4(V(x + cx, ch, z + cz)) }); P.smokes.push(V(x + cx, ch + 0.02, z + cz)); });
  P.piece(new THREE.PlaneGeometry(w * 0.6, 0.11).translate(0, -0.055, 0), popTex(F.awning()), { ...o, m: mat4(V(x - w * 0.19, 0.22, z + d / 2 + 0.003), 0, -1.1) });
  P.piece(new THREE.PlaneGeometry(0.11, 0.095), popTex(teacupSign(585)), { ...o, m: mat4(V(x - w / 2 - 0.04, 0.24, z + d / 2 - 0.02)) });
  [[-0.22, 0.4], [-0.07, 0.4], [0.08, 0.4]].forEach(([gx, gy]) => P.glow(x + gx + 0.05, gy, z + d / 2 + 0.002, 0.07));
  P.center = V(x, 0.4, z);
}
function witchTower(P, x, z, delay = 0.24) {
  const o = { delay, mode: 1, tag: 'window' };
  house(P, { id: 'window', x: x - 0.07, z, w: 0.34, h: 0.21, d: 0.26, roof: 'pyramid', rise: 0.18, over: 0.035, doorX: 0.25, glows: [[-0.2, 0.12, 0.16]], delay });
  const tx = x + 0.18, tz = z + 0.07, navy = popTex(FRONTS.window.roof(), 6, 2);
  P.piece(new THREE.CylinderGeometry(0.11, 0.125, 0.44, 12, 1, true), popTex(towerTex(), 2, 1), { ...o, m: mat4(V(tx, 0.22, tz)) });
  P.piece(new THREE.CylinderGeometry(0.17, 0.17, 0.014, 16), 0x2f3f6e, { ...o, m: mat4(V(tx, 0.447, tz)) });
  P.piece(new THREE.ConeGeometry(0.15, 0.36, 12, 4, true), navy, { ...o, m: mat4(V(tx + 0.02, 0.63, tz), 0, 0, -0.1) });
  P.piece(new THREE.PlaneGeometry(0.06, 0.06), popTex(starCard(590, false)), { ...o, m: mat4(V(tx + 0.04, 0.83, tz)) });
  P.glow(tx + 0.04, 0.83, tz + 0.005, 0.08);
  [[0, 0.36], [0.9, 0.3], [-0.9, 0.24]].forEach(([a, y]) => P.glow(tx + Math.sin(a) * 0.13, y, tz + Math.cos(a) * 0.13, 0.08));
  P.center = V(x, 0.4, z);
}

/* ---------- the six spreads ---------- */
const SPREAD = {
  tent(P) {
    P.card(backdrop('tent'), 0, -0.5, 1.76, { delay: 0, mode: 2 });
    P.card(tree('round', 11, { fireflies: true }), -0.68, -0.3, 0.4, { delay: 0.1 });
    P.card(tree('round', 12, { fireflies: true }), 0.72, -0.27, 0.36, { delay: 0.14 });
    P.card(tree('pine', 13), -0.89, -0.06, 0.17, { delay: 0.2 });
    tentModel(P, 0.03, -0.1);
    P.card(signpost('星幕帐篷', '塔罗 · 往这边走'), -0.48, 0.24, 0.2, { delay: 0.52 });
    P.card(cat(), 0.58, 0.24, 0.11, { delay: 0.58 });
    P.card(flowerBank(17, { mushrooms: true }), 0.12, 0.38, 0.6, { delay: 0.34 });
    P.card(flowerBank(18), 0.74, 0.42, 0.42, { delay: 0.38 });
    [[-0.28, 0.66, -0.3, 0.08], [0.36, 0.76, -0.34, 0.07], [0.66, 0.54, -0.1, 0.06], [-0.6, 0.52, -0.02, 0.06]].forEach(([x, y, z, w], i) => { P.float(starCard(21 + i, i < 2), x, y, z, w, { delay: 0.55 + i * 0.04 }); P.glow(x, y, z + 0.01, w * 1.4); });
  },
  shrine(P) {
    P.card(backdrop('shrine'), 0, -0.5, 1.76, { delay: 0, mode: 2 });
    P.card(tree('yunsong', 31, { cloud: true }), -0.69, -0.3, 0.4, { delay: 0.1 });
    P.card(tree('yunsong', 32, { flip: true, cloud: true }), 0.72, -0.27, 0.36, { delay: 0.14 });
    P.card(tree('yunsong', 33, { flip: true }), -0.88, -0.06, 0.2, { delay: 0.2 });
    minnanTemple(P, 0, -0.12);
    P.card(stoneLantern(35), -0.46, 0.14, 0.1, { delay: 0.44 });
    P.card(stoneLantern(36), 0.47, 0.14, 0.1, { delay: 0.48 });
    P.glow(-0.46, 0.115, 0.15, 0.08); P.glow(0.47, 0.115, 0.15, 0.08);
    P.card(cloudSwirl(37), -0.16, 0.38, 0.34, { delay: 0.36 });
    P.card(cloudSwirl(38), 0.3, 0.32, 0.3, { delay: 0.4 });
    P.float(crane(39), -0.44, 0.64, -0.26, 0.2, { delay: 0.55 });
    P.float(crane(40), 0.38, 0.76, -0.32, 0.16, { delay: 0.6 });
  },
  study(P) {
    P.card(backdrop('study'), 0, -0.5, 1.76, { delay: 0, mode: 2 });
    P.card(tree('bamboo', 51), -0.7, -0.3, 0.3, { delay: 0.1 });
    P.card(tree('blossom', 52), 0.68, -0.26, 0.38, { delay: 0.14 });
    house(P, { id: 'study', x: 0, z: -0.17, w: 0.48, h: 0.22, d: 0.28, roof: 'flared', rise: 0.13, upper: true, doorX: 0.23, glows: [[-0.2, 0.12, 0.14], [0.23, 0.11, 0.1]] });
    P.card(moonGate(53), 0, 0.12, 0.84, { delay: 0.4, tag: 'study' });
    P.card(rock(54), 0.54, 0.28, 0.14, { delay: 0.5 });
    P.float(paperSlip('吉', 55), -0.38, 0.6, -0.08, 0.06, { delay: 0.55 });
    P.float(paperSlip('安', 56), 0.36, 0.7, -0.2, 0.06, { delay: 0.6 });
  },
  tea(P) {
    const rose = ['#2d4a3a', '#3f6e4a', '#6a9a62', '#a8c88a'];
    P.card(backdrop('tea'), 0, -0.5, 1.76, { delay: 0, mode: 2 });
    P.card(tree('rosebush', 61, { rose: '#e9a6b8' }), -0.68, -0.3, 0.3, { delay: 0.1 });
    P.card(tree('rosebush', 62, { rose: '#f6efe2', flip: true }), 0.72, -0.27, 0.27, { delay: 0.14 });
    teaHouse(P, 0.02, -0.15);
    P.card(lampPost(63), -0.4, 0.08, 0.06, { delay: 0.44 }); P.glow(-0.4, 0.31, 0.085, 0.1);
    P.card(flowerPots(64), 0.46, 0.22, 0.26, { delay: 0.5 });
    P.card(flowerBank(65, { flowers: ['#e9a6b8', '#ffffff', '#f2d27a'] }), -0.05, 0.36, 0.5, { delay: 0.36 });
    [[-0.3, 0.7, -0.28, 0.06], [0.42, 0.76, -0.32, 0.06]].forEach(([x, y, z, w], i) => { P.float(starCard(66 + i, false), x, y, z, w, { delay: 0.56 }); P.glow(x, y, z + 0.01, 0.08); });
  },
  window(P) {
    P.card(backdrop('window'), 0, -0.5, 1.76, { delay: 0, mode: 2 });
    P.card(tree('round', 71, { pal: ['#1f3550', '#2c4a6a', '#4a6f94', '#8fb0d0'], fireflies: true }), -0.68, -0.28, 0.36, { delay: 0.1 });
    P.card(tree('pine', 72), 0.74, -0.24, 0.24, { delay: 0.14 });
    witchTower(P, 0, -0.14);
    P.card(fence(73), -0.14, 0.27, 0.6, { delay: 0.42 });
    P.card(owlStump(74), 0.52, 0.22, 0.11, { delay: 0.52 });
    P.float(pendulum(75), -0.44, 0.54, -0.06, 0.04, { delay: 0.56 }); P.glow(-0.44, 0.47, -0.05, 0.08, LILAC);
    P.float(starCard(76, true), 0.4, 0.74, -0.3, 0.07, { delay: 0.6 }); P.glow(0.4, 0.74, -0.29, 0.1);
  },
  hearth(P) {
    P.card(backdrop('hearth'), 0, -0.5, 1.76, { delay: 0, mode: 2 });
    P.card(tree('pine', 81, { snow: true }), -0.68, -0.3, 0.3, { delay: 0.1 });
    P.card(tree('pine', 82, { snow: true }), 0.72, -0.27, 0.27, { delay: 0.14 });
    P.card(tree('pine', 85, { snow: true }), -0.89, -0.06, 0.16, { delay: 0.2 });
    house(P, { id: 'hearth', x: 0, z: -0.12, w: 0.46, h: 0.24, d: 0.32, roof: 'gableZ', rise: 0.32, over: 0.05, snow: true, icicles: true, chimney: [0.12, -0.08, 0.56], glows: [[-0.29, 0.12, 0.1], [0.29, 0.12, 0.1], [0, 0.07, 0.12]] });
    P.card(firewood(87), -0.3, 0.06, 0.11, { delay: 0.42 });
    P.card(runeStones(83), 0.4, 0.24, 0.3, { delay: 0.46 });
    P.card(snowman(84), -0.42, 0.22, 0.12, { delay: 0.5 });
    [[-0.3, 0.64, -0.26], [0.3, 0.74, -0.32], [0.62, 0.52, -0.1], [-0.62, 0.54, -0.02]].forEach(([x, y, z], i) => P.float(snowflake(86 + i), x, y, z, 0.05, { delay: 0.55 + i * 0.03 }));
  },
};


/* ---------- the book itself ---------- */
const bookGroup = new THREE.Group();
const leaves = [];
const spreads = {};
let blockTop, slabBack;
const bookMeshes = [];
function plain(color) { return new THREE.MeshLambertMaterial({ color }); }
function buildBook() {
  const edge = new THREE.MeshLambertMaterial({ map: tex(pageEdge()) }), cloth = plain(0x1f2a55), cream = () => plain(0xf1e6cf);
  const box = (w, h, d, mats, x, y, z, parent = bookGroup) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; m.userData.page = true; parent.add(m); bookMeshes.push(m); return m; };
  box(PW + 0.03, BOARD, PD + 0.05, cloth, (PW + 0.03) / 2, BOARD / 2, 0);
  blockTop = cream();
  box(PW, Y0 - BOARD, PD, [edge, edge, blockTop, edge, edge, edge], PW / 2, BOARD + (Y0 - BOARD) / 2, 0);
  const slab = new THREE.Group(); slab.position.set(0, Y0, 0); bookGroup.add(slab);
  const cover = new THREE.MeshStandardMaterial({ map: tex(coverArt()), metalnessMap: tex(coverArt('metal')), roughnessMap: tex(coverArt('rough')), bumpMap: tex(coverArt('bump')), bumpScale: 3, metalness: 1, roughness: 1, emissive: 0x000000 });
  cover.metalnessMap.colorSpace = cover.roughnessMap.colorSpace = cover.bumpMap.colorSpace = THREE.NoColorSpace;
  slabBack = cream();
  box(PW + 0.04, BOARD, PD + 0.06, [cloth, cloth, cover, cloth, cloth, cloth], (PW + 0.04) / 2, Y0 - BOARD / 2, 0, slab);
  // brass corners on the fore-edge, and raised bands across the spine
  const brassC = new THREE.MeshStandardMaterial({ color: 0xc99a45, metalness: 0.9, roughness: 0.3 }), cs = new THREE.Shape(); cs.moveTo(0, 0); cs.lineTo(-0.13, 0); cs.quadraticCurveTo(-0.07, -0.03, 0, -0.13); cs.closePath();
  [[1, 1], [1, -1]].forEach(([, sz]) => { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(cs, { depth: 0.006, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 2 }), brassC); m.rotation.x = -Math.PI / 2; if (sz < 0) m.scale.y = -1; m.position.set(PW + 0.04, Y0 + 0.001, -sz * (PD + 0.06) / 2); m.castShadow = true; slab.add(m); });
  [-0.42, -0.14, 0.14, 0.42].forEach((z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.012, BOARD + 0.01, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a2048, roughness: 0.6 })); b.position.set(0.004, Y0 - BOARD / 2, z * PD); slab.add(b); });
  box(PW, Y0 - BOARD, PD, [edge, edge, edge, slabBack, edge, edge], PW / 2, (Y0 - BOARD) / 2, 0, slab);
  leaves.push({ pivot: slab, axisY: Y0, cover });
  for (let i = 1; i < NS; i++) {
    const pivot = new THREE.Group(); pivot.position.set(0, Y0 + T / 2, 0); bookGroup.add(pivot);
    const front = cream(), back = cream();
    box(PW, T, PD, [edge, edge, front, back, edge, edge], PW / 2, 0, 0, pivot);
    leaves.push({ pivot, axisY: Y0 + T / 2, front, back });
  }
}
function setMap(mat, c, flip) {
  const t = tex(c);
  if (flip) { t.center.set(0.5, 0.5); t.rotation = Math.PI; }
  mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true;
}
/** paint a spread and fold up its pieces, the first time it's needed */
function ensureSpread(k) {
  if (k < 1 || k > NS || spreads[k]) return;
  const id = ORDER[k - 1], [L, R] = spreadArt(id, k), P = new Pop(id);
  SPREAD[id](P);
  P.finish();
  P.group.position.set(0, Y0 + T / 2, 0);
  bookGroup.add(P.group);
  spreads[k] = { id, P };
  setMap(k === 1 ? slabBack : leaves[k - 1].back, L, true);
  setMap(k === NS ? blockTop : leaves[k].front, R, false);
  layout();
}

/* ---------- turning pages ---------- */
let cur = 0, turn = null;
const angleOf = (i) => (turn && turn.leaf === i ? turn.phi : i < cur ? Math.PI : 0);
function layout() {
  const turning = turn ? turn.leaf : -1;
  let leftTop = -1, rightTop = 99;
  for (let i = 0; i < NS; i++) { if (i === turning) continue; if (i < cur) leftTop = Math.max(leftTop, i); else rightTop = Math.min(rightTop, i); }
  leaves.forEach((L, i) => {
    L.pivot.visible = i === 0 || i === turning || i === leftTop || i === rightTop;
    L.pivot.rotation.z = angleOf(i);
    L.pivot.position.y = L.axisY + (i === turning && i > 0 ? T : 0);
  });
  for (let k = 1; k <= NS; k++) {
    const s = spreads[k];
    if (!s) continue;
    const aL = angleOf(k - 1), aR = k < NS ? angleOf(k) : 0, th = aL - aR;
    s.P.group.visible = th > 0.004;
    if (!s.P.group.visible) continue;
    s.P.group.rotation.z = (aL + aR) / 2 - Math.PI / 2;
    s.P.U.uB.value = (Math.PI - th) / 2;
    s.P.U.uU.value = th / Math.PI;
  }
}
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function turnOnce(dir, dur) {
  return new Promise((done) => {
    ensureSpread(cur); ensureSpread(cur + dir);
    turn = { leaf: dir > 0 ? cur : cur - 1, dir, t: 0, dur: reduced ? 0.01 : dur, phi: dir > 0 ? 0 : Math.PI, done };
    sfx('page');
  });
}
function updateTurn(dt) {
  if (!turn) return;
  turn.t = Math.min(1, turn.t + dt / turn.dur);
  const e = easeIO(turn.t);
  turn.phi = turn.dir > 0 ? e * Math.PI : (1 - e) * Math.PI;
  // gold dust shaken off the edge of the turning page
  const pv = leaves[turn.leaf].pivot;
  for (let i = 0; i < 3; i++) { pv.localToWorld(tmpV.set(PW * rnd(0.85, 1), 0, rnd(-PD / 2, PD / 2))); sparks.emit(tmpV, tmpW.set(rnd(-0.1, 0.1), rnd(0.05, 0.25), rnd(-0.1, 0.1)), { life: rnd(0.8, 1.6), size: rnd(0.012, 0.024), acc: -0.12 }); }
  if (turn.t >= 1) { cur += turn.dir; const d = turn.done; turn = null; layout(); d(); }
  else layout();
}
let busy = false;
async function goTo(k) {
  if (busy || mode !== 'book') return;
  k = Math.max(0, Math.min(NS, k));
  if (k === cur) return;
  busy = true; setUI('turning'); clearBurst();
  const dir = Math.sign(k - cur), many = Math.abs(k - cur) > 1;
  while (cur !== k) await turnOnce(dir, many ? 0.7 : cur === 0 || cur + dir === 0 ? 1.9 : 1.55);
  busy = false;
  setUI(cur === 0 ? 'closed' : 'open');
  if (cur > 0) opened(spreads[cur].P);
  prefetch();
}
/** the moment a spread lands open: a ring of light runs out over the page and dust rises */
function opened(P) {
  if (P.wave) P.wave.userData.t = 0;
  P.group.localToWorld(tmpV.copy(P.center));
  burstAt(sparks, tmpV, 60, { speed: 0.5, up: 0.7, size: 0.03 });
  sfx('chime');
  SPREAD_FX[P.id]?.open?.(P);
}
let prefetchTimer;
function prefetch() {
  clearTimeout(prefetchTimer);
  const next = [cur + 1, cur - 1, cur + 2, 1, 2, 3, 4, 5, 6].find((k) => k >= 1 && k <= NS && !spreads[k]);
  if (next) prefetchTimer = setTimeout(() => { if (!busy && !turn) ensureSpread(next); prefetch(); }, 700);
}
/** each frame: magic for whichever spread lies open */
let starClock = 4;
function updateSpreadMagic(dt, t) {
  updateTeaser(dt, t);
  for (const k in spreads) {
    const P = spreads[k].P, open = P.group.visible ? THREE.MathUtils.smoothstep(P.U.uU.value, 0.9, 1) : 0;
    P.fade = open;
    if (P.glows) P.glows.mat.uniforms.uFade.value = open;
    const hot = hoverTag && hoverTag === P.id ? 1 : 0;
    P.circles.forEach((m) => { m.rotation.z += m.userData.spin * dt * 0.25; m.material.opacity = open * (0.28 + 0.12 * Math.sin(t * 2) + hot * 0.5); });
    if (P.wave) { const w = P.wave, wt = (w.userData.t += dt); w.material.opacity = open * Math.max(0, 1 - wt / 1.4) * 0.9; w.scale.setScalar(0.3 + wt * 1.5); }
    SPREAD_FX[P.id]?.always?.(P, dt, t);
  }
  const P = mode === 'book' && !turn && spreads[cur]?.P;
  if (!P || P.fade < 0.5) return;
  if (Math.random() < dt * 6) { P.group.localToWorld(tmpV.set(rnd(-0.8, 0.8), rnd(0.05, 0.45), rnd(-0.4, 0.3))); sparks.emit(tmpV, tmpW.set(rnd(-0.04, 0.04), rnd(-0.01, 0.04), rnd(-0.04, 0.04)), { life: rnd(2, 3.5), size: rnd(0.014, 0.022), color: Math.random() < 0.5 ? MINT : GOLD, drag: 0.1 }); }
  P.smokes.forEach((s) => { if (Math.random() < dt * 5) { P.group.localToWorld(tmpV.copy(s)); smoke.emit(tmpV, tmpW.set(rnd(-0.01, 0.01), rnd(0.05, 0.09), rnd(-0.01, 0.01)), { life: rnd(2.2, 3), size: 0.03, color: SMOKE, drag: 0.2, acc: 0.01 }); } });
  SPREAD_FX[P.id]?.tick?.(P, dt, t);
  if (hoverTag === P.id) { const a = t * 3; P.group.localToWorld(tmpV.copy(P.center).add(V(Math.cos(a) * 0.38, Math.sin(t * 1.7) * 0.08, Math.sin(a) * 0.3))); sparks.emit(tmpV, tmpW.set(0, 0.12, 0), { life: 1.2, size: 0.03 }); }
  if ((starClock -= dt) < 0) {
    starClock = rnd(5, 9);
    const y = rnd(0.62, 0.8), from = rnd(0.2, 0.8);
    for (let i = 0; i < 18; i++) {
      P.group.localToWorld(tmpV.set(from - i * 0.025, y + i * 0.006, -0.47));
      const head = tmpV.clone();
      P.group.localToWorld(tmpW.set(from - i * 0.025 - 0.9, y + i * 0.006 - 0.25, -0.47)).sub(head);
      sparks.emit(head, tmpW, { life: 0.5 + i * 0.012, size: 0.03 - i * 0.0012, color: GOLD, drag: 0 });
    }
  }
}

/* ---------- a handful of cards that fly out of the tent ---------- */
const flyers = [];
let backMat;
function burst() {
  const P = spreads[cur]?.P;
  if (!P || reduced) return;
  backMat ??= new THREE.MeshLambertMaterial({ map: tex(cardBackCanvas()), side: THREE.FrontSide });
  const from = P.group.localToWorld(V(0.03, 0.62, -0.1));
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group(), k = Math.floor(Math.random() * MAJOR.length);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), new THREE.MeshLambertMaterial({ map: tex(cardFace(k, 160)) }));
    face.rotation.y = Math.PI;
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), backMat), face);
    g.children.forEach((m) => { m.castShadow = true; });
    g.position.copy(from);
    const a = Math.random() * TAU, sp = 0.25 + Math.random() * 0.45;
    flyers.push({ g, v: V(Math.cos(a) * sp, 1.0 + Math.random() * 0.7, Math.sin(a) * sp * 0.7), spin: V((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 9), t: -i * 0.05, rest: false });
    g.visible = false;
    scene.add(g);
  }
}
function updateBurst(dt) {
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    f.t += dt;
    if (f.t < 0) continue;
    f.g.visible = true;
    if (!f.rest) {
      f.v.y -= 2.4 * dt; f.v.multiplyScalar(1 - 0.6 * dt);
      f.g.position.addScaledVector(f.v, dt);
      f.g.rotation.x += f.spin.x * dt; f.g.rotation.y += f.spin.y * dt; f.g.rotation.z += f.spin.z * dt;
      if (f.v.y < 0) f.v.y = Math.max(f.v.y, -0.5);
      if (Math.random() < 0.3) sparks.emit(f.g.position, tmpW.set(0, 0.05, 0), { life: 0.6, size: 0.015 });
      const floor = Math.abs(f.g.position.x) < PW && Math.abs(f.g.position.z) < PD / 2 ? Y0 + T + 0.004 : 0.004;
      if (f.g.position.y <= floor) { f.g.position.y = floor + (f.lift ?? 0); f.rest = true; if (f.restY) f.g.rotation.set(0, Math.random() * TAU, 0); else f.g.rotation.set(-Math.PI / 2, 0, Math.random() * TAU); }
    }
    if (f.t > 3.4) f.g.scale.setScalar(Math.max(0.001, 1 - (f.t - 3.4) / 0.6));
    if (f.t > 4) { scene.remove(f.g); flyers.splice(i, 1); }
  }
}
/* ---------- each spread's own little magic when it opens ---------- */
let COIN_MATS;
function coinCanvas() {
  const c = canvas(128, 128), g = c.getContext('2d');
  const gr = g.createRadialGradient(54, 50, 6, 64, 64, 64); gr.addColorStop(0, '#d8a85a'); gr.addColorStop(1, '#8a5a2a'); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 63, 0, TAU); g.fill();
  g.strokeStyle = '#5a3a1a'; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 56, 0, TAU); g.stroke(); g.strokeRect(50, 50, 28, 28);
  g.clearRect(54, 54, 20, 20);
  g.fillStyle = '#4a2e14'; g.font = '900 22px "Noto Serif SC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  [['開', 64, 30], ['元', 64, 98], ['通', 98, 64], ['寶', 30, 64]].forEach(([ch, x, y]) => g.fillText(ch, x, y));
  return c;
}
/** three copper coins tossed up from the study, the way a hexagram is cast */
function tossCoins(P) {
  if (reduced) return;
  COIN_MATS ??= (() => { const face = new THREE.MeshStandardMaterial({ map: tex(coinCanvas()), alphaTest: 0.5, metalness: 0.6, roughness: 0.4 }); return [new THREE.MeshStandardMaterial({ color: 0x8a5a2a, metalness: 0.6, roughness: 0.4 }), face, face]; })();
  const from = P.group.localToWorld(V(0, 0.3, -0.1));
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 28), COIN_MATS); m.castShadow = true; g.add(m); g.position.copy(from); g.visible = false; scene.add(g);
    const a = -0.6 + i * 0.6 + rnd(-0.2, 0.2), sp = 0.22 + Math.random() * 0.12;
    flyers.push({ g, v: V(Math.sin(a) * sp, 1.2 + Math.random() * 0.3, Math.cos(a) * sp * 0.8), spin: V(rnd(8, 14), rnd(-3, 3), rnd(-4, 4)), t: -i * 0.18, rest: false, restY: true, lift: 0.003 });
  }
  setTimeout(() => sfx('coin'), 900);
}
const SNOWY = new THREE.Color(1.4, 1.45, 1.6), TWINKLE = [GOLD, ROSE, MINT, new THREE.Color(0.9, 1.1, 1.9)];
const SPREAD_FX = {
  tent: { open: () => burst() },
  shrine: {
    open(P) {
      P.fxT = 0;
      if (P.clouds) return;
      const c = cloudSwirl(377), t2 = popTex(c), h = (0.24 * c.height) / c.width;
      P.clouds = Array.from({ length: 7 }, (_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, h), new THREE.MeshBasicMaterial({ map: t2, transparent: true, depthWrite: false, opacity: 0, alphaTest: 0.05 })); m.userData = { a: (i / 7) * TAU, r: 0.52 + (i % 3) * 0.07, y: 0.16 + (i % 4) * 0.08, sp: 0.32 + (i % 2) * 0.14 }; P.group.add(m); return m; });
    },
    always(P, dt, t) {
      if (!P.clouds) return;
      P.fxT += dt; const rise = Math.min(1, P.fxT / 2.5);
      P.clouds.forEach((m) => { const u = m.userData; u.a += dt * u.sp; m.position.set(Math.cos(u.a) * u.r, u.y + 0.08 * rise + Math.sin(t * 0.8 + u.a) * 0.03, -0.12 + Math.sin(u.a) * u.r * 0.5); m.material.opacity = P.fade * rise; m.lookAt(camera.position); });
    },
    tick(P, dt) { if (P.clouds && Math.random() < dt * 10) { const m = P.clouds[Math.floor(Math.random() * P.clouds.length)]; sparks.emit(m.getWorldPosition(tmpV), tmpW.set(rnd(-0.02, 0.02), rnd(0.01, 0.05), rnd(-0.02, 0.02)), { life: 1.2, size: 0.016, color: GOLD }); } },
  },
  study: { open: (P) => tossCoins(P) },
  tea: {
    tick(P, dt, t) {
      if (Math.random() < dt * 28) { const a = t * 1.6 + Math.random() * 0.6, y = 0.06 + ((t * 0.22 + Math.random() * 0.25) % 0.62); P.group.localToWorld(tmpV.set(0.02 + Math.cos(a) * 0.44, y, -0.15 + Math.sin(a) * 0.28)); sparks.emit(tmpV, tmpW.set(-Math.sin(a) * 0.1, 0.06, Math.cos(a) * 0.06), { life: rnd(1.4, 2.2), size: rnd(0.014, 0.024), color: Math.random() < 0.65 ? ROSE : GOLD, drag: 0.2 }); }
    },
  },
  window: {
    tick(P, dt, t) {
      if (Math.random() < dt * 24) { const a = t * 1.2 + rnd(0, TAU); P.group.localToWorld(tmpV.set(Math.cos(a) * 0.34, rnd(0.15, 0.78), -0.14 + Math.sin(a) * 0.22)); sparks.emit(tmpV, tmpW.set(0, rnd(0.01, 0.04), 0), { life: rnd(1.5, 2.5), size: rnd(0.012, 0.02), color: Math.random() < 0.5 ? LILAC : MINT, drag: 0.3 }); }
      if (Math.random() < dt * 30) { const ph = Math.sin(t * 2.2) * 0.7; P.group.localToWorld(tmpV.set(-0.44 + Math.sin(ph) * 0.1, 0.62 - Math.cos(ph) * 0.1, -0.05)); sparks.emit(tmpV, tmpW.set(0, 0, 0), { life: 0.7, size: 0.016, color: LILAC, drag: 0 }); }
    },
  },
  hearth: {
    tick(P, dt) {
      if (Math.random() < dt * 34) { P.group.localToWorld(tmpV.set(rnd(-0.95, 0.95), rnd(0.75, 1.0), rnd(-0.5, 0.4))); sparks.emit(tmpV, tmpW.set(rnd(-0.02, 0.02), rnd(-0.11, -0.06), rnd(-0.01, 0.01)), { life: rnd(6, 9), size: rnd(0.012, 0.022), color: SNOWY, drag: 0 }); }
      for (let k = 0; k <= 12; k++) { if (Math.random() > dt * 6) continue; const u = k / 12, x = -0.29 + u * 0.58, y = 0.235 + (0.32 * (1 - Math.abs(u - 0.5) * 2)); P.group.localToWorld(tmpV.set(x, y - 0.012, 0.065)); sparks.emit(tmpV, tmpW.set(0, 0, 0), { life: rnd(0.3, 0.6), size: 0.026, color: TWINKLE[k % 4], drag: 0 }); }
    },
  },
};
function clearBurst() { flyers.forEach((f) => scene.remove(f.g)); flyers.length = 0; }

/* ---------- the camera ---------- */
const user = { yaw: 0, pitch: 0, zoom: 1 };
const rig = { tx: 0.3, ty: 0.9, tz: -1.4, dist: 16, yaw: 0, pitch: 0.2, fov: 52 };
let rigTween = null, rigHold = null;
const bookFov = () => (camera.aspect < 0.85 ? 50 : 38);
const hutFov = () => (camera.aspect < 0.85 ? 66 : 52);
function fitDist(fov) {
  const vf = (fov * DEG) / 2, hf = Math.atan(Math.tan(vf) * camera.aspect);
  return Math.max(1.12 / Math.tan(hf), 0.8 / Math.tan(vf));
}
function home() {
  if (mode === 'hut') {
    const portrait = camera.aspect < 0.85;
    return { tx: 0.3, ty: 3.0, tz: -2.5, dist: portrait ? 17 : 15, yaw: user.yaw * 0.6, pitch: THREE.MathUtils.clamp(0.1 + user.pitch * 0.5, -0.05, 0.5), fov: hutFov() };
  }
  const closed = cur === 0 ? (turn ? 1 - turn.phi / Math.PI : 1) : 0, portrait = camera.aspect < 0.85, fov = bookFov();
  return {
    tx: 0.5 * closed, ty: 0.2 - 0.1 * closed, tz: -0.02 + 0.06 * closed + (portrait ? 0.08 : 0),
    dist: fitDist(fov) * (1.22 - 0.2 * closed) * user.zoom,
    yaw: user.yaw, pitch: THREE.MathUtils.clamp(0.74 + 0.12 * closed + user.pitch + (portrait ? 0.12 : 0), 0.3, 1.35), fov,
  };
}
const RIG_KEYS = ['tx', 'ty', 'tz', 'dist', 'yaw', 'pitch', 'fov'];
function tweenRig(to, dur) {
  return new Promise((done) => { rigTween = { from: { ...rig }, to: { ...rig, ...to }, t: 0, dur: reduced ? 0.01 : dur, done }; });
}
function updateRig(dt) {
  if (rigTween) {
    const tw = rigTween;
    tw.t = Math.min(1, tw.t + dt / tw.dur);
    const e = easeIO(tw.t);
    for (const k of RIG_KEYS) rig[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
    if (tw.t >= 1) { rigTween = null; tw.done(); }
  } else {
    const h = rigHold ?? home(), f = 1 - Math.exp(-dt * 3.2);
    for (const k of RIG_KEYS) rig[k] += (h[k] - rig[k]) * f;
  }
  const cp = Math.cos(rig.pitch);
  camera.position.set(rig.tx + Math.sin(rig.yaw) * cp * rig.dist, rig.ty + Math.sin(rig.pitch) * rig.dist, rig.tz + Math.cos(rig.yaw) * cp * rig.dist);
  camera.lookAt(rig.tx, rig.ty, rig.tz);
  if (Math.abs(camera.fov - rig.fov) > 0.01) { camera.fov = rig.fov; camera.updateProjectionMatrix(); }
}

/* ---------- a taste of the pages still being bound: one small thing to try on each ---------- */
/*
 * Tapping the little house on an unfinished page (or its button) plays a short preview on the page itself and
 * says what it showed: three coins for a line of 六爻, a Lenormand card, a pendulum's answer, a rune stone.
 * What lands is what the panel reports.
 */
let teaser = null;
// Lenormand, by its usual numbers; 8 (the coffin) and 36 (the cross) are left out of this little preview
const LENORMAND = [[1, '骑士', '好消息正骑马赶来。'], [2, '四叶草', '一点小小的好运就在身边。'], [3, '船', '远方在召唤，适合出发。'], [4, '房子', '回到让你安心的地方。'], [5, '树', '慢慢生长，照顾好身体。'], [6, '云', '暂时看不清，等风吹散。'], [7, '蛇', '绕一点路，反而更稳。'], [9, '花束', '会有一个小小的惊喜。'], [10, '镰刀', '该断则断，干脆一点。'], [11, '鞭子', '别和自己较劲，松一松。'], [12, '鸟', '多聊聊，答案在对话里。'], [13, '孩子', '用新手的心情重新开始。'], [14, '狐狸', '多留个心眼，看清再决定。'], [15, '熊', '你比自己以为的更有力量。'], [16, '星星', '方向就在头顶，抬头看看。'], [17, '鹳', '改变正在发生，顺势而为。'], [18, '狗', '可靠的朋友会帮你一把。'], [19, '塔', '守住自己的原则。'], [20, '花园', '去人多的地方走走。'], [21, '山', '眼前有座山，绕过去或慢慢爬。'], [22, '岔路', '两条路都可以，听听心的选择。'], [23, '老鼠', '留意那些悄悄溜走的小事。'], [24, '心', '用爱去做，不会错。'], [25, '戒指', '一个约定值得珍惜。'], [26, '书', '答案还藏着，再多了解一点。'], [27, '信', '有消息要来，或者该写封信了。'], [28, '绅士', '想想那位你在意的人。'], [29, '淑女', '把温柔也留一点给自己。'], [30, '百合', '平和与安静是你的底气。'], [31, '太阳', '今天会是明亮的一天。'], [32, '月亮', '相信你的灵感和直觉。'], [33, '钥匙', '你已经握着那把钥匙了。'], [34, '鱼', '丰盛在流动，大方一点。'], [35, '锚', '稳住，它会帮你站定。']];
// runes drawn as strokes on a 10 × 16 grid; only ones without a modern history of misuse
const RUNES = [['Fehu', '丰盛', '付出会有回报，丰收在路上。', [[3, 1, 3, 15], [3, 5, 8, 2], [3, 9, 8, 6]]], ['Uruz', '力量', '你身上有股韧劲，可以扛住。', [[2, 15, 2, 1, 8, 5, 8, 15]]],
  ['Ansuz', '讯息', '留意别人的一句话，里面有答案。', [[3, 1, 3, 15], [3, 2, 8, 5], [3, 6, 8, 9]]], ['Raidho', '旅程', '出发吧，路会在脚下展开。', [[3, 1, 3, 15], [3, 1, 8, 4, 3, 8, 8, 15]]],
  ['Kenaz', '灵感', '一点火光就够照亮下一步。', [[8, 1, 3, 8, 8, 15]]], ['Gebo', '馈赠', '给出去的善意，会以别的样子回来。', [[2, 2, 8, 14], [8, 2, 2, 14]]],
  ['Wunjo', '喜悦', '允许自己开心一点。', [[3, 1, 3, 15], [3, 1, 8, 4, 3, 7]]], ['Nauthiz', '耐心', '需要的东西会来，再等一等。', [[5, 1, 5, 15], [2, 5, 8, 10]]],
  ['Isa', '静止', '先停下来，冰化之前别急着走。', [[5, 1, 5, 15]]], ['Jera', '收获', '时候到了，自然有结果。', [[4, 1, 1, 5, 4, 9], [6, 7, 9, 11, 6, 15]]],
  ['Berkano', '新生', '新的开始正在萌芽。', [[3, 1, 3, 15], [3, 1, 8, 4, 3, 8, 8, 12, 3, 15]]], ['Ehwaz', '同行', '有人和你一起走，会更稳。', [[2, 15, 2, 1, 5, 5, 8, 1, 8, 15]]],
  ['Mannaz', '自我', '好好认识自己，答案在里面。', [[2, 15, 2, 1, 8, 8], [8, 15, 8, 1, 2, 8]]], ['Laguz', '直觉', '顺着水流，相信直觉。', [[3, 1, 3, 15], [3, 1, 8, 5]]],
  ['Ingwaz', '孕育', '安静地酝酿，时候到了自会开花。', [[5, 3, 8, 8, 5, 13, 2, 8, 5, 3]]], ['Dagaz', '破晓', '天快亮了，转机就在眼前。', [[2, 2, 2, 14, 8, 2, 8, 14, 2, 2]]]];
const TEASE_BTN = { study: '掷三枚铜钱', tea: '翻一张雷诺曼', window: '垂下灵摆', hearth: '摸一颗符文石' };
const TEASE_NOTE = '<div class="note">这一间还在装订中，下次翻开时就能完整地玩 · 仅供娱乐</div>';
function teaserStart(id) {
  const P = spreads[cur]?.P;
  if (!P || P.id !== id || turn || busy || !TEASE[id]) return;
  teaserClear(); hidePanel(); sfx('pop');
  const g = new THREE.Group(); P.group.add(g);
  teaser = { id, P, g, t: 0, done: false, at: P.door.clone().add(V(0, 0, 0.14)) };
  TEASE[id].make(teaser);
}
function teaserClear() { if (!teaser) return; teaser.P.group.remove(teaser.g); teaser.g.traverse((o) => o.geometry?.dispose()); teaser = null; }
function updateTeaser(dt, t) {
  if (!teaser) return;
  if (mode !== 'book' || turn || spreads[cur]?.P !== teaser.P) { teaserClear(); return; }
  teaser.t += dt; TEASE[teaser.id].tick(teaser, dt, t);
  if (!teaser.done && teaser.t > teaser.dur) { teaser.done = true; TEASE[teaser.id].reveal(teaser); }
}
const teaseAgain = (id) => [['再来一次', () => teaserStart(id), true], ['收起', hidePanel]];
function lenormandFace(no, name, line) {
  const c = canvas(256, 384), g = c.getContext('2d');
  g.fillStyle = '#f4ead2'; g.fillRect(0, 0, 256, 384); g.strokeStyle = '#b8903e'; g.lineWidth = 8; g.strokeRect(10, 10, 236, 364); g.lineWidth = 2; g.strokeRect(22, 22, 212, 340);
  g.fillStyle = '#7a5a2a'; g.textAlign = 'center'; g.font = 'italic 600 30px "Cormorant Garamond", serif'; g.fillText(`№ ${no}`, 128, 70);
  g.fillStyle = '#3a2a1a'; g.font = `900 ${name.length > 2 ? 54 : 70}px "Noto Serif SC", serif`; g.fillText(name, 128, 210);
  g.fillStyle = '#b8903e'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = Math.PI / 2 + (i * Math.PI) / 8, r = i % 4 === 0 ? 16 : i % 2 ? 4 : 10; g.lineTo(128 + Math.cos(a) * r, 290 - Math.sin(a) * r); } g.fill();
  return tex(c);
}
const TEASE = {
  study: {
    make(T) {
      const front = new THREE.MeshStandardMaterial({ map: tex(coinCanvas()), metalness: 0.6, roughness: 0.4 });
      const backC = canvas(128, 128), bg = backC.getContext('2d'); bg.fillStyle = '#9a6a30'; bg.beginPath(); bg.arc(64, 64, 62, 0, TAU); bg.fill(); bg.strokeStyle = '#6a4418'; bg.lineWidth = 6; bg.stroke(); bg.fillStyle = '#2a1a0c'; bg.fillRect(50, 50, 28, 28); bg.strokeRect(46, 46, 36, 36);
      const back = new THREE.MeshStandardMaterial({ map: tex(backC), metalness: 0.6, roughness: 0.45 }), edge = new THREE.MeshStandardMaterial({ color: 0x8a5a2a, metalness: 0.6, roughness: 0.4 });
      T.heads = [0, 1, 2].map(() => Math.random() < 0.5);              // heads: the inscribed face (字) up
      T.coins = T.heads.map((h, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.006, 32), [edge, front, back]); m.castShadow = true; T.g.add(m);
        return { m, from: T.at.clone().add(V(0, 0.03, 0)), to: T.at.clone().add(V(-0.11 + i * 0.11, 0.005, 0.02 + (i % 2) * 0.03)), turns: (h ? 6 : 7) + 2 * i, yaw: rnd(0, TAU), delay: i * 0.12, landed: false }; });
      T.dur = 1.7; setTimeout(() => sfx('coin'), 300);
    },
    tick(T) {
      for (const c of T.coins) {
        const k = THREE.MathUtils.clamp((T.t - c.delay) / 1.1, 0, 1), e = easeIO(k);
        c.m.position.lerpVectors(c.from, c.to, e); c.m.position.y += Math.sin(Math.PI * k) * 0.32;
        c.m.rotation.set(Math.PI * c.turns * e, c.yaw, 0);
        if (k >= 1 && !c.landed) { c.landed = true; sfx('clack'); }
      }
    },
    reveal(T) {
      const z = T.heads.filter(Boolean).length, b = 3 - z, sum = 2 * z + 3 * b;
      const [name, line] = { 6: ['老阴', '阴爻，而且会变'], 7: ['少阳', '一条阳爻'], 8: ['少阴', '一条阴爻'], 9: ['老阳', '阳爻，而且会变'] }[sum];
      showPanel(`<span class="seal">爻</span><small>预告 · 六爻</small><h3>${name}</h3><p>三枚铜钱，${z ? `${z} 字` : ''}${z && b ? '、' : ''}${b ? `${b} 背` : ''}：这是${line}。六爻要连掷六次，排成一卦，再配上测字慢慢读。</p>${TEASE_NOTE}`, teaseAgain('study'));
    },
  },
  tea: {
    make(T) {
      T.card = LENORMAND[Math.floor(Math.random() * LENORMAND.length)];
      const backC = canvas(128, 192), b = backC.getContext('2d'); b.fillStyle = '#24484a'; b.fillRect(0, 0, 128, 192); b.strokeStyle = '#d8b060'; b.lineWidth = 4; b.strokeRect(8, 8, 112, 176); b.beginPath(); b.arc(64, 96, 26, 0, TAU); b.stroke();
      const geo = new THREE.PlaneGeometry(0.12, 0.18), g = new THREE.Group();
      g.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: lenormandFace(...T.card) })));
      const bk = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex(backC) })); bk.rotation.y = Math.PI; g.add(bk);
      g.position.copy(T.at); T.g.add(g); T.cardG = g; T.dur = 1.6; sfx('page');
    },
    tick(T, dt, t) {
      const k = Math.min(1, T.t / 1.4), e = easeIO(k), g = T.cardG;
      g.position.copy(T.at).add(V(0, 0.04 + 0.26 * e, 0)); g.scale.setScalar(0.5 + 0.7 * e);
      const face = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(g.getWorldPosition(tmpV), camera.position, camera.up));
      const spin = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), (1 - e) * Math.PI * 3);
      const parentQ = T.g.getWorldQuaternion(new THREE.Quaternion()).invert();
      g.quaternion.copy(parentQ.multiply(face).multiply(spin)).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI));
      if (Math.random() < dt * 20) sparks.emit(g.getWorldPosition(tmpV), tmpW.set(rnd(-0.05, 0.05), rnd(0.02, 0.08), rnd(-0.05, 0.05)), { life: 0.8, size: 0.012 });
    },
    reveal(T) { const [no, name, line] = T.card; showPanel(`<span class="seal">牌</span><small>预告 · 雷诺曼 · 第 ${no} 张</small><h3>${name}</h3><p>${line}</p>${TEASE_NOTE}`, teaseAgain('tea')); },
  },
  window: {
    make(T) {
      T.ans = ['yes', 'no', 'wait'][Math.floor(Math.random() * 3)];
      T.pivot = T.at.clone().add(V(0, 0.58, -0.02));
      const brass = new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 0.9, roughness: 0.3 });
      T.chain = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 1, 6).translate(0, -0.5, 0), brass); T.chain.position.copy(T.pivot); T.g.add(T.chain);
      T.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), new THREE.MeshStandardMaterial({ color: 0xc8b0ff, emissive: 0x6a40c0, emissiveIntensity: 0.8, roughness: 0.15, metalness: 0.2 })); T.gem.scale.set(1, 1.6, 1); T.g.add(T.gem);
      T.dur = 3.4; sfx('soft');
    },
    tick(T, dt, t) {
      const L = 0.4, w = 3.2, s = Math.min(1, T.t / 0.6) * (T.t > 3.0 ? Math.max(0.35, 1 - (T.t - 3.0)) : 1);
      const off = T.ans === 'yes' ? V(Math.cos(T.t * w) * 0.09, 0, Math.sin(T.t * w) * 0.09) : T.ans === 'no' ? V(Math.sin(T.t * w) * 0.11, 0, 0) : V(Math.sin(T.t * 2.1) * 0.025 + Math.sin(T.t * 5.3) * 0.01, 0, Math.cos(T.t * 1.7) * 0.015);
      off.multiplyScalar(s); const end = T.pivot.clone().add(off).add(V(0, -Math.sqrt(Math.max(0.01, L * L - off.lengthSq())), 0));
      T.gem.position.copy(end).add(V(0, -0.04, 0)); T.gem.rotation.y += dt * 2;
      const d = end.clone().sub(T.pivot); T.chain.scale.set(1, d.length(), 1); T.chain.quaternion.setFromUnitVectors(V(0, -1, 0), d.normalize());
      if (Math.random() < dt * 24) sparks.emit(T.gem.getWorldPosition(tmpV), tmpW.set(0, 0.02, 0), { life: 0.7, size: 0.012, color: LILAC });
    },
    reveal(T) {
      const [h, line] = { yes: ['是', '灵摆轻轻画起了圈：这件事，也许是可以的。'], no: ['否', '灵摆前后摆动：这件事，先放一放。'], wait: ['再想想', '灵摆只是微微晃了晃：心里还没定，过些时候再问。'] }[T.ans];
      showPanel(`<span class="seal">摆</span><small>预告 · 灵摆 · 在心里问一个是或否的问题</small><h3>${h}</h3><p>${line}</p>${TEASE_NOTE}`, teaseAgain('window'));
    },
  },
  hearth: {
    make(T) {
      T.rune = RUNES[Math.floor(Math.random() * RUNES.length)];
      const c = canvas(160, 224), g = c.getContext('2d'); g.strokeStyle = '#ffd27a'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = '#ffb040'; g.shadowBlur = 14;
      for (const st of T.rune[3]) { g.beginPath(); for (let i = 0; i < st.length; i += 2) { const x = 30 + st[i] * 10, y = 32 + st[i + 1] * 10; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      const stone = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.14, 0.035, 3, 0.012), new THREE.MeshStandardMaterial({ color: 0x8a96a2, roughness: 0.85 }));
      const glyph = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.105), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glyph.position.z = 0.0185; stone.add(glyph);
      const g2 = new THREE.Group(); g2.add(stone); g2.position.copy(T.at); T.g.add(g2); T.stone = g2; T.glyph = glyph; T.dur = 1.6; sfx('soft');
    },
    tick(T, dt, t) {
      const k = Math.min(1, T.t / 1.3), e = easeIO(k), g = T.stone;
      g.position.copy(T.at).add(V(0, 0.08 + 0.18 * e, 0));
      const face = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position, g.getWorldPosition(tmpV), camera.up));
      const parentQ = T.g.getWorldQuaternion(new THREE.Quaternion()).invert();
      g.quaternion.copy(parentQ.multiply(face)).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), (1 - e) * Math.PI * 2));
      T.glyph.material.opacity = 0.4 + 0.6 * e * (0.8 + 0.2 * Math.sin(t * 4));
      if (Math.random() < dt * 18) sparks.emit(g.getWorldPosition(tmpV), tmpW.set(rnd(-0.04, 0.04), rnd(0.02, 0.07), rnd(-0.04, 0.04)), { life: 0.9, size: 0.012, color: GOLD });
    },
    reveal(T) { const [latin, name, line] = T.rune; showPanel(`<span class="seal">符</span><small>预告 · 卢恩符文 · ${latin}</small><h3>${name}</h3><p>${line}</p>${TEASE_NOTE}`, teaseAgain('hearth')); },
  },
};
