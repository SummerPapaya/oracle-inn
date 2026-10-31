/* ================= stepping inside a page: rooms made of card ================= */
/*
 * Tapping a ready house flies the camera down to its door; a warm flash, and you are standing in
 * a room the size of a real one, built the way the book is: painted card, cut and folded, lit by
 * candles and lanterns. "回到书里" brings you back out.
 */
const rooms = {};
let roomId = null;
const look = { yaw: 0, pitch: 0, tyaw: 0, tpitch: 0 };
const ROOM_VIEW = { tent: { at: V(0, 0.95, 0), orbit: { yaw: Math.PI / 4, pitch: 0.55, dist: 11 }, yaw: 0.6, pitch: 0.22, fov: [54, 34] }, shrine: { eye: V(0, 1.4, 2.3), at: V(0, 0.8, -1.2) } };

function roomScene(bg) { const s = new THREE.Scene(); s.background = new THREE.Color(bg); s.fog = new THREE.Fog(bg, 7, 18); return s; }
function keyLight(s, pos, target, color = 0xffe4bc, intensity = 18) {
  const l = new THREE.SpotLight(color, intensity, 0, 0.8, 0.7, 1.2);
  l.position.copy(pos); l.target.position.copy(target);
  l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.camera.near = 0.5; l.shadow.camera.far = 12; l.shadow.bias = -0.0006; l.shadow.normalBias = 0.02;
  s.add(l, l.target);
  return l;
}
function stringOf(s, x, y, z, top) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, top - y, 4), new THREE.MeshBasicMaterial({ color: 0x9a8a7a })); m.position.set(x, (top + y) / 2, z); s.add(m); }

function buildTentRoom() {
  // a little tent on a wooden platform, seen from above one corner like a model on a table
  const s = new THREE.Scene(), Hs = 2.2, mobiles = [], flames = [];
  const bg = canvas(4, 256), bgg = bg.getContext('2d'), bgr = bgg.createLinearGradient(0, 0, 0, 256); bgr.addColorStop(0, '#141526'); bgr.addColorStop(1, '#2e2438'); bgg.fillStyle = bgr; bgg.fillRect(0, 0, 4, 256); s.background = new THREE.CanvasTexture(bg); s.background.colorSpace = THREE.SRGBColorSpace;
  s.environment = scene.environment; s.environmentIntensity = 0.2;
  s.add(new THREE.HemisphereLight(0x7a6aa8, 0x2a1a18, 0.2));
  const sun = new THREE.DirectionalLight(0xffd0a8, 0.42); sun.position.set(4, 7.5, 5.5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; s.add(sun);
  const glowAt = (p, size, col, light = 0, lc = 0xffb060, range = 3) => { place(s, glowSprite(size, col), p.x, p.y, p.z); if (light) { const l = new THREE.PointLight(lc, light, range, 1.6); l.position.copy(p); s.add(l); return l; } };
  const wood = std('t3wood', { map: tx(grainCanvas('#9a6a40', '#4a2a14', 9621), 1, 1), roughness: 0.65 }), woodD = std('t3woodD', { map: tx(grainCanvas('#6a4228', '#2a160a', 9622), 1, 1), roughness: 0.6 });
  const brass = std('t3brass', { color: 0xc89a48, metalness: 0.85, roughness: 0.35 }), gold = std('t3gold', { color: 0xe2bc62, metalness: 0.8, roughness: 0.3, emissive: 0x3a2808 }), iron = std('t3iron', { color: 0x3a3230, metalness: 0.6, roughness: 0.5 });
  const fringe = (pts, len = 0.07, r = 0.006) => { const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(r, r * 0.7, len, 5).translate(0, -len / 2, 0), gold, pts.length), mx = new THREE.Matrix4(); pts.forEach((p, i) => { mx.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, mx); }); s.add(im); return im; };
  const tassel = (x, y, z, sc = 1, parent = s) => { const g = group(x, y, z, 0, parent); g.scale.setScalar(sc); add(new THREE.SphereGeometry(0.035, 12, 10), gold, 0, -0.03, 0, g); add(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), gold, 0, -0.07, 0, g); add(new THREE.ConeGeometry(0.045, 0.16, 14, 1, true), gold, 0, -0.16, 0, g, [Math.PI, 0, 0]).material.side = THREE.DoubleSide; return g; };
  // ---- the platform, its frame, the step ----
  add(new THREE.BoxGeometry(2 * Hs + 0.3, 0.34, 2 * Hs + 0.3), woodD, 0, -0.17, 0, s);
  const floorM = std('t3floor', { map: tx(grainCanvas('#a87448', '#4a2a14', 9623, 1024, 1024, 8), 2, 2), roughness: 0.7 });
  const floor = add(new THREE.PlaneGeometry(2 * Hs, 2 * Hs), floorM, 0, 0.002, 0, s, [-Math.PI / 2, 0, 0]); floor.castShadow = false;
  [[0, Hs + 0.07, 0], [Hs + 0.07, 0, Math.PI / 2]].forEach(([x, z, ry]) => add(rbox(2 * Hs + 0.3, 0.2, 0.16, 0.03), wood, x, 0.04, z, s, [0, ry, 0]));
  [[Hs + 0.07, Hs + 0.07], [-Hs - 0.07, Hs + 0.07], [Hs + 0.07, -Hs - 0.07], [0, Hs + 0.07], [Hs + 0.07, 0]].forEach(([x, z]) => add(rbox(0.26, 0.28, 0.26, 0.04), wood, x, 0.06, z, s));
  const step = group(Hs + 0.34, -0.1, Hs + 0.34, Math.PI / 4); add(rbox(1.1, 0.18, 0.5, 0.04), wood, 0, 0, 0, step); add(new THREE.PlaneGeometry(0.8, 0.36), std('t3mat', { map: tx(T3.mat()), roughness: 0.95 }), 0, 0.092, 0, step, [-Math.PI / 2, 0, 0]);
  // ---- rugs ----
  const runnerM = std('t3runner', { map: tx(T3.runner(), 3, 1), roughness: 0.95 });
  add(new THREE.PlaneGeometry(3.4, 0.62), runnerM, 0.1, 0.005, Hs - 0.4, s, [-Math.PI / 2, 0, 0]).castShadow = false;
  add(new THREE.PlaneGeometry(3.4, 0.62), runnerM, Hs - 0.4, 0.006, 0.1, s, [-Math.PI / 2, 0, Math.PI / 2]).castShadow = false;
  add(new THREE.CircleGeometry(1.3, 64), std('t3rug', { map: tx(T3.roundRug()), roughness: 0.95 }), 0.05, 0.01, 0.05, s, [-Math.PI / 2, 0, Math.PI / 4]).castShadow = false;
  // ---- walls: two of striped cloth, rising to the back corner ----
  const wallM = std('t3wall', { map: tx(T3.wall(), 2, 1), roughness: 0.9, side: THREE.DoubleSide });
  const slope = (t) => 2.45 + 0.55 * t; // t = 0 at the open end, 1 at the back corner
  const wall = (a, b) => { const N = 16, pos = [], uv = [], idx = []; for (let i = 0; i <= N; i++) { const t = i / N, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, h = slope(t); pos.push(x, 0, z, x, h, z); uv.push(t, 0, t, h / 3); } for (let i = 0; i < N; i++) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, wallM); m.receiveShadow = true; s.add(m); };
  wall([-Hs, Hs], [-Hs, -Hs]); wall([Hs, -Hs], [-Hs, -Hs]);
  // ---- the canopy: a purple valance along each wall top, gold fringe, tassels; posts with ball finials; a star at the peak ----
  const valM = std('t3val', { map: tx(T3.valance(), 2, 1), roughness: 0.85, side: THREE.DoubleSide });
  const valance = (a, b, inward) => { const N = 32, M = 4, pos = [], uv = [], idx = [], hem = []; for (let i = 0; i <= N; i++) { const t = i / N, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, top = slope(t) + 0.04; for (let j = 0; j <= M; j++) { const v = j / M, y = top - v * (0.4 + 0.04 * Math.sin(t * Math.PI * 6)), push = 0.04 + v * 0.1; pos.push(x + inward[0] * push, y, z + inward[1] * push); uv.push(t, 1 - v); if (j === M && i % 1 === 0) hem.push(V(x + inward[0] * push, y, z + inward[1] * push)); } } for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const k = i * (M + 1) + j; idx.push(k, k + M + 1, k + 1, k + 1, k + M + 1, k + M + 2); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, valM); m.castShadow = true; s.add(m); const fp = []; for (let i = 0; i < hem.length - 1; i++) for (let k = 0; k < 4; k++) fp.push(hem[i].clone().lerp(hem[i + 1], k / 4)); fringe(fp, 0.08, 0.007); };
  valance([-Hs, Hs], [-Hs, -Hs], [1, 0]); valance([Hs, -Hs], [-Hs, -Hs], [0, 1]);
  [[-Hs, Hs, 2.55], [Hs, -Hs, 2.55], [-Hs, -Hs, 3.05]].forEach(([x, z, h]) => { add(new THREE.CylinderGeometry(0.055, 0.065, h, 14), wood, x, h / 2, z, s); add(new THREE.SphereGeometry(0.1, 16, 12), wood, x, h + 0.06, z, s); });
  tassel(-Hs + 0.12, 2.12, Hs - 0.05, 2.2); tassel(Hs - 0.05, 2.12, -Hs + 0.12, 2.2);
  const peak = add(new THREE.ExtrudeGeometry(starShape(0.2, 0.08, 5), { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), gold, -Hs + 0.05, 3.4, -Hs + 0.05, s, [0, Math.PI / 4, 0]); void peak;
  tassel(-Hs + 0.25, 2.98, -Hs + 0.25, 1.6);
  // ---- curtains at the two open corners, tied back with gold rope ----
  const velC = T3.velvet(), velM = new THREE.MeshPhysicalMaterial({ map: popTex(velC), roughness: 0.8, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xe0a0f0), side: THREE.DoubleSide });
  const lg = new THREE.Group(); lg.position.set(-Hs + 0.06, 0, Hs - 0.42); lg.rotation.y = Math.PI / 2; lg.scale.set(0.34, 2.5 / 9.6, 0.34); s.add(lg); velvetDrape(-1, 0, 4.8, 0, { parent: lg, mat: velM });
  const rg = new THREE.Group(); rg.position.set(Hs - 0.42, 0, -Hs + 0.06); rg.scale.set(0.34, 2.5 / 9.6, 0.34); s.add(rg); velvetDrape(1, 0, 4.8, 0, { parent: rg, mat: velM });
  // ---- a hanging lantern, gold stars on threads ----
  const lan = tentLantern(s, -1.2, 1.95, -1.2, 1.05, 0.55); lan.userData.ph = 0.4; lan.userData.base = 1.95; mobiles.push(lan);
  const warm = new THREE.PointLight(0xffb060, 2.2, 4.5, 1.5); warm.position.set(-1.2, 1.9, -1.2); s.add(warm);
  const starGeo = new THREE.ExtrudeGeometry(starShape(0.085, 0.036, 5), { depth: 0.02, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 });
  [[-Hs + 0.25, 1.95, -0.2], [-Hs + 0.25, 2.05, 1.2], [0.2, 2.0, -Hs + 0.25], [1.35, 2.1, -Hs + 0.25]].forEach(([x, y, z], i) => { const g = group(x, y, z, 0, s); add(starGeo, gold, 0, 0, 0, g); place(g, glowSprite(0.28, new THREE.Color(1.5, 1.1, 0.5)), 0, 0, 0.02); g.userData.ph = i * 1.4; mobiles.push(g); stringOf(s, x, y + 0.09, z, 2.7); });
  // ---- left wall: the sun hanging, a trunk with a runner, a moon lamp, a crystal, a lantern ----
  const hang = (c, w, h, x, y, z, ry) => { const g = group(x, y, z, ry, s); add(new THREE.PlaneGeometry(w, h), std('t3hang' + w, { map: tx(c), roughness: 0.9, side: THREE.DoubleSide }), 0, 0, 0, g); add(new THREE.CylinderGeometry(0.018, 0.018, w + 0.16, 8), woodD, 0, h / 2 + 0.03, 0.01, g, [0, 0, Math.PI / 2]); [-1, 1].forEach((d) => add(new THREE.SphereGeometry(0.03, 10, 8), brass, d * (w / 2 + 0.08), h / 2 + 0.03, 0.01, g)); [-0.3, 0, 0.3].forEach((t) => tassel(t * w, -h / 2, 0.01, 0.6, g)); return g; };
  hang(T3.sunHanging(), 0.72, 0.9, -Hs + 0.03, 1.62, 0.35, Math.PI / 2);
  const trunk = (x, z, ry, w, h, d, col, trim = brass) => { const g = group(x, 0, z, ry, s), body = std('t3trunk' + col, { map: tx(grainCanvas(col, '#2a1408', 9630 + w * 10), 1, 1), roughness: 0.6 }); add(rbox(w, h * 0.8, d, 0.03), body, 0, h * 0.4, 0, g); add(new THREE.CylinderGeometry(d / 2, d / 2, w, 24, 1, false, 0, Math.PI), body, 0, h * 0.8, 0, g, [0, 0, Math.PI / 2]).scale.set(1, 0.45, 1); [-0.35, 0.35].forEach((t) => { add(rbox(0.05, h * 0.82, d + 0.02, 0.01), iron, t * w, h * 0.4, 0, g); }); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b2]) => add(rbox(0.07, 0.07, 0.07, 0.01), trim, a * (w / 2 - 0.02), 0.04, b2 * (d / 2 - 0.02), g)); add(rbox(0.07, 0.09, 0.02, 0.01), trim, 0, h * 0.68, d / 2 + 0.01, g); return g; };
  const lt = trunk(-Hs + 0.33, 0.35, Math.PI / 2, 1.0, 0.56, 0.5, '#7a4a2a');
  add(new THREE.PlaneGeometry(0.42, 0.62), std('t3runner2', { map: tx(T3.runner(), 1, 1), roughness: 0.95, side: THREE.DoubleSide }), 0, 0.565, 0.0, lt, [-Math.PI / 2, 0, Math.PI / 2]);
  add(new THREE.PlaneGeometry(0.42, 0.3), std('t3runner2', {}), 0, 0.42, 0.255, lt);
  const ml = group(-Hs + 0.33, 0.58, 0.05, 0, s); add(lathe([[0, 0], [0.11, 0], [0.1, 0.03], [0.05, 0.07], [0.06, 0.1], [0, 0.1]], 24), brass, 0, 0, 0, ml);
  const moonTex = tx(T3.moonFace()); add(new THREE.SphereGeometry(0.17, 40, 28), new THREE.MeshStandardMaterial({ map: moonTex, emissive: 0xffe2a8, emissiveMap: moonTex, emissiveIntensity: 1.25, roughness: 0.6 }), 0, 0.27, 0, ml).castShadow = false;
  glowAt(V(-Hs + 0.33, 0.85, 0.05), 1.1, new THREE.Color(0.9, 0.75, 0.45), 1.5, 0xffe2b0, 3.2);
  [[0, 0.5, 0x8a6ac8], [0.05, 0.36, 0xb08ae0], [-0.06, 0.3, 0x6a4aa8]].forEach(([dx, hgt, c], i) => add(new THREE.ConeGeometry(0.035, hgt * 0.36, 6), std('t3amy' + i, { color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.2, flatShading: true }), -Hs + 0.3 + dx, 0.58 + hgt * 0.18, 0.5 + i * 0.04, s, [0, 0, dx * 3]));
  tentLantern(s, -Hs + 0.33, 0.58, 0.72, 0.55, 0); glowAt(V(-Hs + 0.33, 0.66, 0.72), 0, null, 0.6, 0xffa850, 2.2);
  // a potted plant and a lantern on a pile of books at the front left
  const plant = (x, z, sc, potCol, flowers) => { const g = group(x, 0, z, 0, s); g.scale.setScalar(sc); add(lathe([[0, 0], [0.16, 0], [0.2, 0.04], [0.23, 0.26], [0.25, 0.3], [0.21, 0.31], [0, 0.31]], 24), std('t3pot' + potCol, { color: potCol, roughness: 0.55 }), 0, 0, 0, g); add(new THREE.CircleGeometry(0.21, 20), std('t3soil', { color: 0x3a2618 }), 0, 0.3, 0, g, [-Math.PI / 2, 0, 0]); const rr = mulberry(Math.round(x * 100 + z * 10)); for (let k = 0; k < 11; k++) { const a = (k / 11) * TAU + rr() * 0.4, tilt = 0.35 + rr() * 0.5, len = 0.28 + rr() * 0.18, base = V(0, 0.3, 0), tip = V(Math.cos(a) * Math.sin(tilt) * len, 0.3 + Math.cos(tilt) * len * 1.3, Math.sin(a) * Math.sin(tilt) * len); add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, base.clone().lerp(tip, 0.5).add(V(0, 0.06, 0)), tip]), 6, 0.006, 4), LEAF(), 0, 0, 0, g); const lf = add(leafGeo(0.24, 0.15), k % 2 ? LEAF() : LEAF2(), tip.x, tip.y, tip.z, g); lf.rotation.set(-0.7 - rr() * 0.4, -a + Math.PI / 2, 0, 'YXZ'); } if (flowers) for (let k = 0; k < 5; k++) { const a = rr() * TAU, d = 0.15 + rr() * 0.1, fx = Math.cos(a) * d, fz = Math.sin(a) * d, fy = 0.55 + rr() * 0.15; for (let p = 0; p < 5; p++) { const b = (p / 5) * TAU; add(new THREE.SphereGeometry(0.022, 8, 6).scale(1.6, 0.5, 1), std('t3petal', { color: 0xf8f0e8, roughness: 0.6 }), fx + Math.cos(b) * 0.025, fy, fz + Math.sin(b) * 0.025, g, [0, -b, 0]); } add(new THREE.SphereGeometry(0.012, 8, 6), std('t3pistil', { color: 0xf2c84a }), fx, fy + 0.008, fz, g); } return g; };
  plant(-1.8, 1.5, 0.72, 0xd88a90, false);
  const bookPile = (x, z, n, parent = s) => { const g = group(x, 0, z, 0.3, parent); [0x7a2e3a, 0x3a4a6a, 0x5a6a3a, 0x8a5a2a].slice(0, n).forEach((c, i) => add(rbox(0.32 - i * 0.03, 0.06, 0.24 - i * 0.015, 0.01), std('t3bk' + c, { color: c, roughness: 0.7 }), 0, 0.03 + i * 0.062, 0, g, [0, (i % 2 ? 0.15 : -0.1), 0])); return g; };
  bookPile(-1.35, 1.95, 3); tentLantern(s, -1.35, 0.19, 1.95, 0.75, 0); glowAt(V(-1.35, 0.3, 1.95), 0, null, 0.9, 0xffa850, 2.4);
  // ---- the back corner: an arched bookcase, a crescent glowing in its crown, ivy spilling down ----
  const bc = group(-Hs + 0.23, 0, -1.3, Math.PI / 2, s), BW = 0.96, BD = 0.42;
  [-1, 1].forEach((d) => add(rbox(0.06, 1.75, BD, 0.015), wood, d * (BW / 2 - 0.03), 0.875, 0, bc));
  const archS = new THREE.Shape(); archS.moveTo(-BW / 2, 0); archS.lineTo(BW / 2, 0); archS.absarc(0, 0, BW / 2, 0, Math.PI, false); archS.closePath(); const archH = new THREE.Path(); archH.moveTo(-BW / 2 + 0.07, 0); archH.absarc(0, 0, BW / 2 - 0.07, Math.PI, 0, true); archH.lineTo(-BW / 2 + 0.07, 0); archS.holes.push(archH);
  add(new THREE.ExtrudeGeometry(archS, { depth: BD, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, curveSegments: 32 }), wood, 0, 1.75, -BD / 2, bc);
  const backS = new THREE.Shape(); backS.moveTo(-BW / 2 + 0.06, 0); backS.lineTo(BW / 2 - 0.06, 0); backS.lineTo(BW / 2 - 0.06, 1.75); backS.absarc(0, 1.75, BW / 2 - 0.06, 0, Math.PI, false); backS.closePath();
  add(new THREE.ShapeGeometry(backS, 24), woodD, 0, 0, -BD / 2 + 0.01, bc);
  add(rbox(BW, 0.08, BD + 0.02, 0.02), wood, 0, 0.04, 0, bc); add(rbox(BW - 0.08, 0.66, BD - 0.02, 0.02), woodD, 0, 0.42, 0.005, bc);
  [-1, 1].forEach((d) => { add(rbox(BW / 2 - 0.08, 0.58, 0.02, 0.01), wood, d * (BW / 4 - 0.01), 0.42, BD / 2, bc); add(new THREE.SphereGeometry(0.018, 10, 8), brass, d * 0.06, 0.45, BD / 2 + 0.02, bc); });
  [0.76, 1.16, 1.55].forEach((y) => add(rbox(BW - 0.1, 0.035, BD - 0.04, 0.01), wood, 0, y, 0, bc));
  const rbooks = (parent, x0, x1, y, z, seed) => { const rr = mulberry(seed), pal = [0x7a2e3a, 0x3a4a6a, 0x5a6a3a, 0x8a5a2a, 0x5a3a6a, 0x9a7a4a], list = []; let x = x0; while (x < x1) { const w = 0.03 + rr() * 0.025, h = 0.2 + rr() * 0.1, lean = rr() < 0.15 ? 0.2 : 0; list.push([V(x + w / 2 + lean * h * 0.5, y + h / 2, z), [0, 0, -lean], V(w, h, 0.2), pal[Math.floor(rr() * pal.length)]]); x += w + 0.004 + lean * h * 0.5; } scatter(parent, new THREE.BoxGeometry(1, 1, 1), std('t3books', { color: 0xffffff, roughness: 0.75 }), list); };
  rbooks(bc, -0.4, 0.05, 0.778, 0, 9641); rbooks(bc, 0.08, 0.4, 1.178, 0, 9642);
  add(lathe([[0, 0], [0.07, 0], [0.09, 0.05], [0.08, 0.12], [0.04, 0.16], [0.05, 0.18], [0, 0.18]], 20), std('t3teapot', { color: 0xe8e0d8, roughness: 0.3 }), 0.25, 0.778, 0, bc);
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.33, 0.83, 0), V(0.38, 0.87, 0), V(0.4, 0.92, 0)]), 6, 0.012, 6), std('t3teapot', {}), 0, 0, 0, bc);
  [[-0.3, 0x6ab0a0], [-0.18, 0xc87a9a], [-0.06, 0xd8b060]].forEach(([x, col], i) => potion(bc, x, 1.178, 0.02, col, 0.42 + i * 0.05));
  const pp = group(0.0, 1.57, 0, 0, bc); add(lathe([[0, 0], [0.07, 0], [0.085, 0.1], [0.09, 0.12], [0, 0.12]], 18), std('t3pot2', { color: 0xc87a5a, roughness: 0.6 }), 0, 0, 0, pp); const rv = mulberry(9643); for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; add(leafGeo(0.11, 0.07), LEAF(), Math.cos(a) * 0.05, 0.12, Math.sin(a) * 0.05, pp, [-(0.5 + rv() * 0.5), -a + Math.PI / 2, 0]).rotation.order = 'YXZ'; }
  const cres = add(new THREE.ExtrudeGeometry(moonShape(0.16), { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 }), std('t3cres', { color: 0xffe2a0, emissive: 0xffc860, emissiveIntensity: 1.5, roughness: 0.4 }), 0.02, 1.95, 0, bc, [0, 0, 0.2]); cres.castShadow = false;
  bc.updateMatrixWorld(); glowAt(bc.localToWorld(V(0, 1.95, 0.05)), 0.9, new THREE.Color(1.3, 1.0, 0.45), 1.2, 0xffd27a, 3);
  const ivyLeaves = [], ri = mulberry(9644); [[V(-0.5, 2.15, 0.25), V(-0.52, 1.6, 0.26), V(-0.48, 1.0, 0.25), V(-0.5, 0.5, 0.24)], [V(0.1, 2.24, 0.24), V(0.4, 2.0, 0.24), V(0.5, 1.6, 0.25), V(0.52, 1.25, 0.24)]].forEach((pts) => { const curve = new THREE.CatmullRomCurve3(pts); add(new THREE.TubeGeometry(curve, 30, 0.006, 4), std('t3ivy', { color: 0x3a4a2a }), 0, 0, 0, bc); for (let k = 0; k < 34; k++) { const p = curve.getPoint(k / 34); ivyLeaves.push([p.add(V((ri() - 0.5) * 0.08, (ri() - 0.5) * 0.05, ri() * 0.05)), [ri() - 0.2, ri() * TAU, ri() - 0.5], V(1, 1, 1)]); } });
  scatter(bc, leafGeo(0.07, 0.05), LEAF2(), ivyLeaves);
  // ---- right wall: a rack of drying herbs, a sideboard with the cat, lilies and a lantern, the moon hanging ----
  add(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 10), woodD, -0.05, 2.08, -Hs + 0.1, s, [0, 0, Math.PI / 2]); [-0.7, 0.6].forEach((x) => add(rbox(0.05, 0.12, 0.12, 0.01), woodD, x, 2.08, -Hs + 0.06, s));
  const HERB = [[0x5a8a4a, 0x7aa860], [0x8a6ac8, 0x6a8a4a], [0xe8e0c8, 0x8a9a6a], [0x6a9a58, 0x5a7a48], [0x9a7ad8, 0x6a8a4a]];
  HERB.forEach(([bud, stem], i) => { const x = -0.6 + i * 0.27, g = group(x, 2.05, -Hs + 0.12, 0, s), rr = mulberry(9650 + i), buds = []; add(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 4), std('t3twine', { color: 0xc8a878 }), 0, -0.04, 0, g); add(new THREE.TorusGeometry(0.02, 0.006, 6, 12), std('t3twine', {}), 0, -0.1, 0, g, [Math.PI / 2, 0, 0]); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU, spread = 0.03 + rr() * 0.05, tip = V(Math.cos(a) * spread, -0.42 - rr() * 0.1, Math.sin(a) * spread * 0.6); add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, -0.1, 0), tip]), 3, 0.003, 3), std('t3stem' + stem, { color: stem }), 0, 0, 0, g); for (let j = 0; j < 5; j++) buds.push([V(0, -0.1, 0).lerp(tip, 0.6 + j * 0.09).add(V((rr() - 0.5) * 0.015, 0, (rr() - 0.5) * 0.015)), [0, 0, 0], V(1, 1.6, 1)]); } scatter(g, new THREE.SphereGeometry(0.012, 6, 5), std('t3bud' + bud, { color: bud, roughness: 0.7 }), buds); });
  const sb = group(0.05, 0, -Hs + 0.25, 0, s);
  add(rbox(1.5, 0.66, 0.44, 0.02), wood, 0, 0.36, 0, sb); add(rbox(1.58, 0.05, 0.48, 0.015), woodD, 0, 0.715, 0, sb); add(rbox(1.46, 0.06, 0.42, 0.01), woodD, 0, 0.03, 0, sb);
  [-0.5, 0, 0.5].forEach((x) => { add(rbox(0.44, 0.52, 0.02, 0.01), woodD, x, 0.38, 0.225, sb); add(rbox(0.36, 0.44, 0.02, 0.01), wood, x, 0.38, 0.235, sb); add(new THREE.SphereGeometry(0.016, 10, 8), brass, x + 0.15, 0.4, 0.25, sb); });
  // the black cat
  const cat = group(-0.5, 0.74, 0.02, 0.15, sb), blk = std('t3cat', { color: 0x1e1a24, roughness: 0.35, metalness: 0.1 });
  add(new THREE.SphereGeometry(0.1, 20, 16), blk, 0, 0.1, 0, cat).scale.set(0.9, 1.2, 0.85); add(new THREE.SphereGeometry(0.07, 20, 16), blk, 0, 0.27, 0.03, cat);
  [-1, 1].forEach((d) => { add(new THREE.ConeGeometry(0.028, 0.06, 4), blk, d * 0.04, 0.33, 0.02, cat, [0, Math.PI / 4, d * -0.3]); add(new THREE.SphereGeometry(0.011, 10, 8), std('t3catEye', { color: 0xf2c84a, emissive: 0xc89020, emissiveIntensity: 0.8 }), d * 0.026, 0.28, 0.09, cat); add(new THREE.SphereGeometry(0.035, 12, 10), blk, d * 0.04, 0.02, 0.07, cat).scale.set(1, 0.6, 1.3); });
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0.05, 0.03, -0.06), V(0.14, 0.03, 0), V(0.13, 0.04, 0.08), V(0.06, 0.03, 0.11)]), 12, 0.016, 8), blk, 0, 0, 0, cat);
  // lilies in a vase
  const vz = group(0.1, 0.74, 0, 0, sb); add(lathe([[0, 0], [0.07, 0], [0.1, 0.06], [0.09, 0.14], [0.05, 0.19], [0.06, 0.21], [0, 0.21]], 24), std('t3vase', { color: 0x4a4e5a, roughness: 0.35 }), 0, 0, 0, vz);
  const rl = mulberry(9660); for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + rl(), tip = V(Math.cos(a) * 0.12, 0.42 + rl() * 0.08, Math.sin(a) * 0.1); add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, 0.18, 0), V(Math.cos(a) * 0.04, 0.3, Math.sin(a) * 0.04), tip]), 6, 0.004, 4), LEAF(), 0, 0, 0, vz); const fl = group(tip.x, tip.y, tip.z, a, vz); fl.rotation.x = -0.5; for (let p = 0; p < 6; p++) { const b = (p / 6) * TAU; add(new THREE.SphereGeometry(0.03, 10, 8).scale(0.45, 1.6, 0.2).translate(0, 0.035, 0), std('t3lily', { color: 0xfaf4ec, roughness: 0.5, emissive: 0x2a2018 }), 0, 0, 0, fl, [Math.cos(b) * 0.9, 0, Math.sin(b) * 0.9]); } add(new THREE.SphereGeometry(0.008, 6, 5), std('t3pistil', {}), 0, 0.02, 0, fl); add(leafGeo(0.12, 0.04), LEAF2(), Math.cos(a) * 0.06, 0.26, Math.sin(a) * 0.06, vz, [-0.9, -a + Math.PI / 2, 0]).rotation.order = 'YXZ'; }
  add(lathe([[0, 0], [0.05, 0], [0.06, 0.04], [0.04, 0.08], [0, 0.08]], 16), std('t3jar', { color: 0xd88aa0, roughness: 0.4 }), 0.32, 0.74, 0.05, sb);
  tentLantern(sb, 0.6, 0.74, 0.02, 0.6, 0); sb.updateMatrixWorld(); glowAt(sb.localToWorld(V(0.6, 0.83, 0.05)), 0, null, 1.0, 0xffa850, 2.6);
  hang(T3.moonHanging(), 0.66, 0.8, 1.0, 1.6, -Hs + 0.03, 0);
  // a trunk with books, a big plant in a pale pot, a little chest with a lantern
  const rt = trunk(1.28, -1.62, 0, 0.82, 0.52, 0.48, '#7a4a2a', iron); bookPile(0, 0.55, 4, rt).position.y = 0.52;
  plant(1.8, -0.95, 0.8, 0xe8e0ec, false);
  const sc2 = trunk(1.86, -0.25, -Math.PI / 2, 0.5, 0.3, 0.36, '#6a4428'); tentLantern(sc2, 0, 0.3, 0, 0.7, 0); sc2.updateMatrixWorld(); glowAt(sc2.localToWorld(V(0, 0.42, 0)), 0, null, 0.9, 0xffa850, 2.4);
  plant(-1.5, 2.0, 0.45, 0xc87a5a, true).position.set(-0.95, 0, 1.95);
  // ---- the table, its cloth, the things on it, two poufs ----
  const T0 = V(-0.25, 0, -0.25), TH = 0.72, TR = 0.6;
  add(new THREE.CylinderGeometry(0.06, 0.12, TH, 16), woodD, T0.x, TH / 2, T0.z, s);
  const skC = T3.skirt(), clothM = std('t3cloth', { map: tx(skC), roughness: 0.85, side: THREE.DoubleSide });
  { const NA = 128, NV = 10, pos = [], uv = [], idx = [], hem = []; for (let i = 0; i <= NA; i++) { const a = (i / NA) * TAU, sc = Math.abs(Math.cos(a * 4)); for (let j = 0; j <= NV; j++) { const v = j / NV, rr = TR + 0.03 + 0.12 * Math.pow(v, 1.4) + 0.012 * Math.sin(a * 16) * v, y = TH + 0.01 - v * (0.44 + 0.08 * sc); pos.push(T0.x + Math.sin(a) * rr, y, T0.z + Math.cos(a) * rr); uv.push(i / NA, 1 - v); if (j === NV) hem.push(V(T0.x + Math.sin(a) * rr, y, T0.z + Math.cos(a) * rr)); } } for (let i = 0; i < NA; i++) for (let j = 0; j < NV; j++) { const k = i * (NV + 1) + j; idx.push(k, k + 1, k + NV + 1, k + 1, k + NV + 2, k + NV + 1); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, clothM); m.castShadow = m.receiveShadow = true; s.add(m); const fp = []; for (let i = 0; i < hem.length - 1; i++) for (let k = 0; k < 3; k++) fp.push(hem[i].clone().lerp(hem[i + 1], k / 3)); fringe(fp, 0.06, 0.006); }
  add(new THREE.CircleGeometry(TR + 0.03, 64), std('t3clothTop', { map: tx(T3.clothTop()), roughness: 0.85 }), T0.x, TH + 0.012, T0.z, s, [-Math.PI / 2, 0, 0]).castShadow = false;
  const top = TH + 0.014, onT = (dx, dz) => V(T0.x + dx, top, T0.z + dz);
  // crystal ball, candle, a bowl of crystals, a gold crescent
  { const p = onT(-0.12, -0.12), bs = group(p.x, p.y, p.z, 0, s); add(lathe([[0, 0], [0.08, 0], [0.075, 0.015], [0.04, 0.04], [0.055, 0.07], [0.06, 0.08], [0, 0.08]], 24), brass, 0, 0, 0, bs); add(new THREE.SphereGeometry(0.115, 40, 28), new THREE.MeshPhysicalMaterial({ color: 0xe8e0ff, roughness: 0.02, transparent: true, opacity: 0.38, clearcoat: 1, envMapIntensity: 1.6 }), 0, 0.19, 0, bs).castShadow = false; add(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.0, 1.7) }), 0, 0.19, 0, bs).castShadow = false; glowAt(V(p.x, p.y + 0.19, p.z), 0.55, new THREE.Color(0.75, 0.6, 1.4), 0.8, 0xb8a0ff, 2.2); }
  { const p = onT(0.28, -0.22); add(new THREE.CylinderGeometry(0.06, 0.07, 0.015, 20), brass, p.x, p.y + 0.008, p.z, s); add(new THREE.CylinderGeometry(0.03, 0.032, 0.14, 16), std('t3wax', { color: 0xf2e6cc, roughness: 0.6, emissive: 0x3a2410, emissiveIntensity: 0.3 }), p.x, p.y + 0.085, p.z, s); flame(s, p.x, p.y + 0.155, p.z, 0.35); glowAt(V(p.x, p.y + 0.2, p.z), 0, null, 1.1, 0xffa850, 2.6); }
  { const p = onT(-0.32, 0.12); add(lathe([[0, 0], [0.05, 0], [0.09, 0.03], [0.1, 0.05], [0.095, 0.052], [0.085, 0.032], [0, 0.012]], 24), brass, p.x, p.y, p.z, s); [[0, 0x9a7ad8], [0.03, 0xb898e8], [-0.03, 0x7a5ab8]].forEach(([d, c], i) => add(new THREE.ConeGeometry(0.018, 0.07, 6), std('t3amy' + i, {}), p.x + d, p.y + 0.06, p.z + (i - 1) * 0.02, s, [0, 0, d * 6])); }
  { const p = onT(0.05, -0.36); add(new THREE.CylinderGeometry(0.04, 0.05, 0.02, 16), brass, p.x, p.y + 0.01, p.z, s); add(new THREE.ExtrudeGeometry(moonShape(0.07), { depth: 0.015, bevelEnabled: false }), gold, p.x, p.y + 0.09, p.z, s, [0, Math.PI / 4, 0.3]); }
  // cards laid out in an arc toward the front
  const backTex = tex(cardBackCanvas()), faces = [0, 2, 17];
  for (let i = 0; i < 9; i++) { const a = Math.PI / 4 + (i - 4) * 0.24, d = 0.4, c = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.12), new THREE.MeshStandardMaterial({ map: i % 2 ? backTex : tex(catTarot(faces[(i / 2) % 3 | 0], 240)), roughness: 0.6 })); c.rotation.set(-Math.PI / 2, 0, a + Math.PI); c.position.set(T0.x + Math.sin(a) * d, top + 0.001 + i * 0.0003, T0.z + Math.cos(a) * d); c.receiveShadow = true; s.add(c); }
  // the deck: tap it to draw
  const deck = new THREE.Group();
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.008, 0.12), [plain(0xc8a050), plain(0xc8a050), new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.5 }), plain(0xc8a050), plain(0xc8a050), plain(0xc8a050)]); c.position.set(0, top + 0.005 + i * 0.008, 0); c.rotation.y = Math.PI / 4 + i * 0.03; c.castShadow = true; c.userData.deck = true; deck.add(c); }
  deck.position.set(T0.x + 0.12, 0, T0.z + 0.3); s.add(deck);
  // two poufs in front of the table
  const pufC = (() => { const c = starFabric(512, 256, 9670, { top: '#a8344e', bottom: '#8a2a42', density: 0.8 }), g = c.getContext('2d'); g.fillStyle = '#e2bc62'; for (let x = 0; x < 512; x += 128) agStar(g, x + 64, 128, 34, 8, mulberry(x)); return c; })();
  const pufM = new THREE.MeshPhysicalMaterial({ map: popTex(pufC), roughness: 0.75, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffb0c0) });
  const f = V(1, 0, 1).normalize(), p2 = V(1, 0, -1).normalize();
  [-1, 1].forEach((d) => { const c = T0.clone().addScaledVector(f, 0.98).addScaledVector(p2, d * 0.5), g = group(c.x, 0, c.z, 0, s); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b2]) => add(new THREE.CylinderGeometry(0.022, 0.016, 0.14, 8), woodD, a * 0.15, 0.07, b2 * 0.15, g)); add(new THREE.CylinderGeometry(0.27, 0.26, 0.2, 40), pufM, 0, 0.24, 0, g); add(new THREE.SphereGeometry(0.27, 40, 16, 0, TAU, 0, Math.PI / 2), pufM, 0, 0.34, 0, g).scale.y = 0.28; add(new THREE.TorusGeometry(0.27, 0.012, 6, 48), gold, 0, 0.34, 0, g, [Math.PI / 2, 0, 0]); add(new THREE.SphereGeometry(0.02, 10, 8), gold, 0, 0.42, 0, g); const tp = []; for (let k = 0; k < 18; k++) { const a = (k / 18) * TAU; tp.push(V(c.x + Math.sin(a) * 0.275, 0.16, c.z + Math.cos(a) * 0.275)); } tp.forEach((p) => tassel(p.x, p.y, p.z, 0.45)); });
  return { scene: s, deck, warm, warmBase: 2.2, key: sun, mobiles, flames, glow: [] };
}

/** a brass lantern with glass panes and a candle inside; hung on a chain if it has one */
function tentLantern(parent, x, y, z, s, chain) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s); parent.add(g);
  const brass = new THREE.MeshStandardMaterial({ color: 0x9a7432, metalness: 0.85, roughness: 0.4 });
  solid(new THREE.CylinderGeometry(0.072, 0.085, 0.03, 6), brass, 0, 0.015, 0, g);
  solid(new THREE.CylinderGeometry(0.06, 0.072, 0.02, 6), brass, 0, 0.04, 0, g);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + Math.PI / 6; solid(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 6), brass, Math.sin(a) * 0.066, 0.15, Math.cos(a) * 0.066, g); }
  const glassM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.55, 0.25), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const gm = solid(new THREE.CylinderGeometry(0.064, 0.064, 0.2, 6, 1, true), glassM, 0, 0.15, 0, g); gm.castShadow = false;
  solid(new THREE.CylinderGeometry(0.058, 0.08, 0.03, 6), brass, 0, 0.265, 0, g);
  solid(new THREE.ConeGeometry(0.07, 0.1, 6), brass, 0, 0.33, 0, g);
  solid(new THREE.TorusGeometry(0.018, 0.005, 6, 16), brass, 0, 0.4, 0, g);
  solid(new THREE.CylinderGeometry(0.018, 0.02, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0xf0e2c4, emissive: 0x3a2410 }), 0, 0.08, 0, g);
  place(g, glowSprite(0.13 * s, new THREE.Color(1.6, 1.1, 0.45)), 0, 0.13, 0);
  place(g, glowSprite(0.32 * s, new THREE.Color(0.45, 0.28, 0.1)), 0, 0.15, 0);
  if (chain > 0) { const links = []; for (let y = 0.42, k = 0; y < 0.42 + chain / s; y += 0.025, k++) links.push([V(0, y, 0), [0, k % 2 ? Math.PI / 2 : 0, 0]]); const ch = new THREE.InstancedMesh(new THREE.TorusGeometry(0.008, 0.0025, 4, 8).scale(1, 1.5, 1), brass, links.length), mx = new THREE.Matrix4(); links.forEach(([p, r], i) => { mx.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), V(1, 1, 1)); ch.setMatrixAt(i, mx); }); g.add(ch); }
  return g;
}

/** the shrine page, inside: not a hall of offerings but a quiet courtyard under the moon */
function buildShrineRoom() {
  const s = roomScene(0x0f1520), mobiles = [], flames = [], lanterns = [];
  s.fog = new THREE.Fog(0x0f1520, 6, 17);
  s.add(new THREE.HemisphereLight(0x9fb4d0, 0x1a1410, 0.6));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 64), new THREE.MeshLambertMaterial({ map: popTex(rippleFloor()) }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -1; floor.receiveShadow = true; s.add(floor);
  const moon = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), new THREE.MeshBasicMaterial({ map: popTex(moonDisc()), transparent: true, depthWrite: false, fog: false }));
  place(s, moon, 0, 2.35, -9.5);
  [[941, '#8a9aac', 7, 18, -7.8, 0, -3.6], [942, '#6a7a8e', 6, 15, -6.2, -1.4, -3.2], [943, '#4a586a', 5, 12, -4.8, 2.2, -2.9]].forEach(([seed, col, peaks, w, z, x, y]) => place(s, cardMesh(inkRange(seed, col, peaks), w, { shadow: false }), x, y, z));
  // a round gate standing alone in the courtyard, framing the moon
  const ringMat = new THREE.MeshLambertMaterial({ map: popTex(gateTex()) }), goldLine = new THREE.MeshLambertMaterial({ color: 0xc9a45a, emissive: 0x3a2a10 });
  solid(new THREE.TorusGeometry(1.7, 0.1, 10, 72), ringMat, 0, 1.85, -3.4, s);
  solid(new THREE.TorusGeometry(1.84, 0.02, 6, 72), goldLine, 0, 1.85, -3.38, s);
  // two lattice screens lit from behind, an eave across the top like standing under a roof
  [[-2.3, -1.7, 0.55, 945], [2.4, -1.9, -0.55, 946]].forEach(([x, z, ry, seed]) => {
    place(s, cardMesh(iceLattice(seed), 1.3), x, 0, z, ry);
    const l = new THREE.PointLight(0xffc98a, 2.2, 3.5, 1.6); l.position.set(x - Math.sin(ry) * 0.4, 1.5, z - Math.cos(ry) * 0.4); s.add(l);
  });
  place(s, cardMesh(eaveTop(), 5.6, { shadow: false }), 0, 2.02, 1.15);
  const plum = place(s, cardMesh(plumBranch(947), 1.7), -1.15, 1.25, 0.2, 0.35); plum.material.emissiveMap = plum.material.map; plum.material.emissive.setRGB(0.45, 0.42, 0.42);
  [[-2.4, 2.7, -2.8], [2.6, 3.0, -3.6]].forEach(([x, y, z], i) => { const c = cardMesh(cloudLine(948 + i), 1.4, { center: true, shadow: false }); const g = new THREE.Group(); g.position.set(x, y, z); g.add(c); g.userData.ph = i * 2; s.add(g); mobiles.push(g); });
  // a low stone stand in the shape of a lotus, where the moon blocks rest
  const stone = new THREE.MeshLambertMaterial({ color: 0x7a8a84 });
  const stand = solid(new THREE.LatheGeometry([[0, 0], [0.42, 0], [0.46, 0.06], [0.3, 0.12], [0.24, 0.3], [0.32, 0.42], [0.48, 0.5], [0.52, 0.56], [0, 0.56]].map(([a, b]) => new THREE.Vector2(a, b)), 40), stone, 0, 0, -0.9, s);
  void stand;
  const petal = new THREE.MeshLambertMaterial({ color: 0xa8b8b0, emissive: 0x1a2220 });
  for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, pt = solid(new THREE.SphereGeometry(0.1, 16, 10), petal, Math.cos(a) * 0.49, 0.53, -0.9 + Math.sin(a) * 0.49, s); pt.scale.set(0.62, 1.05, 0.26); pt.rotation.set(0.38, Math.PI / 2 - a, 0, 'YXZ'); }
  solid(new THREE.TorusGeometry(0.5, 0.012, 6, 48), goldLine, 0, 0.56, -0.9, s).rotation.x = Math.PI / 2;
  // paper lanterns drifting at different heights, in soft amber
  [[-1.2, 2.25, -1.6], [1.45, 2.55, -2.3], [0.3, 2.9, -3.8]].forEach(([x, y, z], i) => {
    const l = lanternMesh('#e8c890', 0x5a3a14, 0.16, 0.26); l.position.set(x, y, z); l.userData.ph = i * 1.7; l.userData.base = y; s.add(l); mobiles.push(l); lanterns.push(l.children[0].material);
    l.add(place(l, glowSprite(0.55, new THREE.Color(1.0, 0.8, 0.5)), 0, 0, 0));
  });
  const warm = new THREE.PointLight(0xffc98a, 4, 7, 1.5); warm.position.set(0, 2.4, -1.6); s.add(warm);
  const bei = [-0.15, 0.15].map((x, i) => {
    const b = jiaobei(); b.position.set(x, 0.645, -0.9); b.rotation.set(-Math.PI / 2, 0, i ? 0.4 : -0.4, 'YXZ');
    b.userData.home = { pos: b.position.clone(), rot: b.rotation.clone() }; s.add(b); return b;
  });
  const moonKey = keyLight(s, V(-1.4, 5.2, -4.5), V(0, 0.4, -0.6), 0xc8d4ff, 22);
  const top = new THREE.SpotLight(0xffe6c4, 9, 0, 0.45, 0.8, 1.2); top.position.set(0.3, 3.4, 0.6); top.target.position.set(0, 0.5, -0.9); s.add(top, top.target);
  return { scene: s, bei, warm, key: moonKey, mobiles, flames, lanterns, moon };
}
/** old red wood for the moon blocks: the flat face matte and grainy, the round back lacquered and smoother */
function beiWood(flat) {
  const c = canvas(512, 128), g = c.getContext('2d'), r = mulberry(flat ? 771 : 772);
  g.fillStyle = flat ? '#a65a3c' : '#8c3322'; g.fillRect(0, 0, 512, 128);
  for (let k = 0; k < (flat ? 42 : 30); k++) { const y0 = r() * 128, amp = 2 + r() * 5, ph = r() * 6; g.strokeStyle = flat ? `rgba(90,36,18,${0.1 + r() * 0.18})` : `rgba(70,20,12,${0.08 + r() * 0.14})`; g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); for (let x = 0; x <= 512; x += 8) g.lineTo(x, y0 + Math.sin(x * 0.02 + ph) * amp); g.stroke(); }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,210,170' : '40,10,5'},${0.04 + r() * 0.06})`; g.fillRect(r() * 512, r() * 128, 1 + r() * 2, 1); }
  for (let i = 0; i < 20; i++) { g.strokeStyle = `rgba(240,190,150,${0.12 + r() * 0.2})`; g.lineWidth = 0.8; const x = r() * 512, y = r() * 128, a = (r() - 0.5) * 0.8, l = 10 + r() * 30; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return c;
}
let BEI_MATS;
/** one of the pair of moon blocks: a crescent rounded all over and pointed at both ends, flat on one face (+z), domed on the other, worn pale at the edges */
function jiaobei() {
  BEI_MATS ??= [new THREE.MeshStandardMaterial({ map: popTex(beiWood(true)), vertexColors: true, roughness: 0.8 }), new THREE.MeshStandardMaterial({ map: popTex(beiWood(false)), vertexColors: true, roughness: 0.4 })];
  const L = 0.22, ty = -0.07, top = 0.15, inn = -0.05, H = 0.085, U = 56, N = 18;
  const oc = (top * top - L * L - ty * ty) / (2 * (top - ty)), ic = (inn * inn - L * L - ty * ty) / (2 * (inn - ty)), Ro = top - oc, Ri = inn - ic;
  const al = Math.atan2(ty - oc, L), be = Math.atan2(ty - ic, L);
  const surface = (back) => {
    const pos = [], uv = [], col = [], idx = [];
    for (let i = 0; i <= U; i++) {
      const u = i / U, ao = Math.PI - al - u * (Math.PI - 2 * al), ai = Math.PI - be - u * (Math.PI - 2 * be), su = Math.pow(Math.sin(Math.PI * u), 0.5);
      for (let j = 0; j <= N; j++) {
        const v = j / N, sv = Math.pow(Math.sin(Math.PI * v), 0.55), x = (1 - v) * Math.cos(ai) * Ri + v * Math.cos(ao) * Ro, y = (1 - v) * (ic + Math.sin(ai) * Ri) + v * (oc + Math.sin(ao) * Ro);
        pos.push(x, y, back ? -H * sv * su : 0.012 * sv * su); uv.push(u, v);
        const e = 1 - Math.pow(Math.sin(Math.PI * v), 0.4) * Math.pow(Math.sin(Math.PI * u), 0.3), k = back ? 0.9 + 0.5 * e * e + 0.12 * sv * su : 1 + 0.45 * e * e;
        col.push(k, k * 0.96, k * 0.92);
      }
    }
    for (let i = 0; i < U; i++) for (let j = 0; j < N; j++) { const a = i * (N + 1) + j, b = a + N + 1, c = a + 1, d = b + 1; if (back) idx.push(a, c, b, c, d, b); else idx.push(a, b, c, c, b, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, BEI_MATS[back ? 1 : 0]); m.castShadow = m.receiveShadow = true; m.userData.bei = true; return m;
  };
  const g = new THREE.Group(); g.add(surface(false), surface(true));
  return g;
}

/* ---------- the starry tent baked in Blender: its lighting painted into two atlases, the flicker added live ---------- */
/*
 * The octagonal tent from blender/build_tent.py, lit in Cycles and baked by bake_tent.py. It arrives as
 * tent/tent_scene.json + tent/tent_geom.txt (base64) + two .jpg atlases, because the artifact host serves
 * neither .glb nor fetches of data: URIs; the GLB is put back together in memory. Two ways to look:
 * from outside, turning left and right round the cut-away front, and sitting at the table.
 */
const TENT_ASSETS = 'tent/', TENT_PRE = 'tent_v27';                 // the prefix changes with every bake: same names would come back from the browser cache
const TENT_VIEW = {
  orbit: { at: V(0, 1.72, 0), orbit: { yaw: Math.PI / 4, pitch: 0.4, dist: 17 }, yaw: 0.75, pitch: 0.2, fov: [44, 28] },
  inside: { eye: V(0.72, 1.25, 0.72), at: V(-0.3, 0.88, -0.3), yaw: 0.9, pitch: 0.45, fov: [72, 58] },
};
let roomInside = false, roomFly = null;

/** a baked room arrives as <pre>_scene.json + <pre>_geom.txt (base64) + .jpg atlases; put the GLB back together in memory */
async function loadBakedGLB(base, pre) {
  const get = (f) => fetch(base + f).then((r) => { if (!r.ok) throw new Error(`${f} ${r.status}`); return r.text(); });
  const [json, b64] = await Promise.all([get(pre + '_scene.json'), get(pre + '_geom.txt')]);
  const raw = atob(b64.trim()), bin = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i);
  const jb = new TextEncoder().encode(json), jp = (4 - (jb.length % 4)) % 4, bp = (4 - (bin.length % 4)) % 4;
  const total = 28 + jb.length + jp + bin.length + bp, buf = new ArrayBuffer(total), dv = new DataView(buf), u8 = new Uint8Array(buf);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jb.length + jp, true); dv.setUint32(16, 0x4e4f534a, true); u8.set(jb, 20); u8.fill(0x20, 20 + jb.length, 20 + jb.length + jp);
  const o = 20 + jb.length + jp; dv.setUint32(o, bin.length + bp, true); dv.setUint32(o + 4, 0x004e4942, true); u8.set(bin, o + 8);
  return new Promise((res, rej) => new GLTFLoader().parse(buf, base, res, rej));
}
/** the rooms that come baked from Blender, how to look at them, and how to build them */
const BAKED = { tent: { view: () => TENT_VIEW, build: () => buildBakedTentRoom() }, shrine: { view: () => SHRINE_VIEW, build: () => buildBakedShrineRoom() }, study: { view: () => STUDY_VIEW, build: () => buildBakedStudyRoom() }, tea: { view: () => TEA_VIEW, build: () => buildBakedTeaRoom() }, window: { view: () => WINDOW_VIEW, build: () => buildBakedWindowRoom() }, hearth: { view: () => HEARTH_VIEW, build: () => buildBakedHearthRoom() } };
const bakedP = {};
function preloadBaked(id) { return (bakedP[id] ??= BAKED[id].build().catch((e) => { console.warn(`baked ${id} unavailable, using the paper one`, e); return null; })); }
function preloadBakedTent() { return preloadBaked('tent'); }
/** a glTF scene from Blender shown as baked: unlit, both faces, so turning round it never shows through */
function bakedScene(gltf, bg) {
  const s = new THREE.Scene(); s.background = new THREE.Color(bg);
  const aniso = renderer.capabilities.getMaxAnisotropy();
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const map = o.material.map; if (map) { map.anisotropy = aniso; map.colorSpace = THREE.SRGBColorSpace; }
    o.material = new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide });
  });
  s.add(gltf.scene); return s;
}
function fxPulse(fx, t) {
  for (const f of fx) {
    const n = Math.sin(t * 9 + f.seed) * 0.5 + Math.sin(t * 23 + f.seed * 3) * 0.3 + Math.sin(t * 3.1 + f.seed) * 0.2;
    const k = f.kind === 'flame' ? 1 + n * 0.14 : f.kind === 'glow' ? 1 + n * 0.1 : f.kind === 'ember' ? 0.7 + 0.3 * Math.sin(t * 2.3 + f.seed) : 1 + Math.sin(t * 0.9 + f.seed) * 0.12;
    f.sp.material.color.copy(f.base).multiplyScalar(k * (f.dim ?? 1));
    if (f.kind === 'flame') f.sp.scale.set(f.size * (1 - n * 0.05), f.size * (1 + n * 0.12), 1);
  }
}

function tentGlow(inner, outer) {
  const c = canvas(128, 128), g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, inner); r.addColorStop(0.25, outer); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return tex(c);
}
/** a gold arrow pointing down, softly glowing: the hint over something to tap */
function cueArrow() {
  const c = canvas(96, 128), g = c.getContext('2d'), gr = g.createLinearGradient(0, 12, 0, 112);
  gr.addColorStop(0, '#fff3cc'); gr.addColorStop(1, '#e2a845');
  g.beginPath(); g.moveTo(37, 14); g.lineTo(59, 14); g.lineTo(59, 60); g.lineTo(80, 60); g.lineTo(48, 110); g.lineTo(16, 60); g.lineTo(37, 60); g.closePath();
  g.shadowColor = 'rgba(255,205,110,.95)'; g.shadowBlur = 14; g.fillStyle = gr; g.fill();
  return tex(c);
}
function tentFlame() {
  const c = canvas(64, 128), g = c.getContext('2d'), r = g.createRadialGradient(32, 84, 2, 32, 74, 46);
  r.addColorStop(0, 'rgba(255,250,225,1)'); r.addColorStop(0.35, 'rgba(255,190,90,.9)'); r.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = r; g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(54, 54, 52, 112, 32, 118); g.bezierCurveTo(12, 112, 10, 54, 32, 6); g.fill();
  return tex(c);
}

async function buildBakedTentRoom() {
  const gltf = await loadBakedGLB(TENT_ASSETS, TENT_PRE);
  const s = bakedScene(gltf, 0x040510);
  // the live part: flames that flicker, lanterns and bulbs that breathe, a crystal ball with mist moving inside
  const fx = [], warm = tentGlow('rgba(255,236,190,1)', 'rgba(255,170,80,.45)'), lilac = tentGlow('rgba(240,225,255,1)', 'rgba(170,130,255,.4)'), flame = tentFlame();
  const sprite = (map, pos, size, color, kind) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(pos); sp.scale.setScalar(size); s.add(sp); fx.push({ sp, size, base: color.clone(), kind, seed: Math.random() * 100 });
  };
  let ballMat = null;
  gltf.scene.traverse((o) => {
    if (!o.name.startsWith('FX_')) return;
    const p = o.getWorldPosition(new THREE.Vector3()), n = o.name;
    if (n.startsWith('FX_candle')) { sprite(flame, p.clone().add(V(0, 0.012, 0)), 0.07, new THREE.Color(2.2, 1.7, 1.2), 'flame'); sprite(warm, p, 0.5, new THREE.Color(0.9, 0.6, 0.3), 'glow'); }
    else if (n.startsWith('FX_lantern')) sprite(warm, p, 0.55 * (/Hang/.test(n) ? 1.1 : /Trunk|SB/.test(n) ? 0.55 : 0.75), new THREE.Color(0.8, 0.5, 0.24), 'glow');
    else if (n.startsWith('FX_bulb')) sprite(warm, p, 0.16, new THREE.Color(0.9, 0.6, 0.3), 'glow');
    else if (n.startsWith('FX_moonlamp')) sprite(warm, p, 0.8, new THREE.Color(0.28, 0.22, 0.15), 'breath');
    else if (n.startsWith('FX_finial')) sprite(warm, p, 1.0, new THREE.Color(0.7, 0.5, 0.22), 'breath');
    else if (n.startsWith('FX_crescent')) sprite(warm, p, 0.6, new THREE.Color(0.6, 0.45, 0.22), 'breath');
    else if (n.startsWith('FX_ball')) {
      ballMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { t: { value: 0 } },
        vertexShader: 'varying vec3 vN, vV, vP; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader: `uniform float t; varying vec3 vN, vV, vP; void main(){
          vec3 n = normalize(vN), e = normalize(vV); float f = pow(clamp(1. - abs(dot(n, e)), 0., 1.), 2.2), sw = .5 + .5 * sin(vP.y * 38. + t * 1.4 + sin(vP.x * 26. - t * .9) * 2.4);
          vec3 c = mix(vec3(.55, .42, 1.), vec3(1., .96, 1.), f) * (.5 + 1.8 * f) + vec3(.6, .45, 1.) * sw * .25;
          float spec = pow(max(dot(reflect(-e, n), normalize(vec3(.4, .8, .3))), 0.), 40.);
          gl_FragColor = vec4(c + spec * 2., clamp(f * .9 + .1 + sw * .08 + spec, 0., 1.)); }` });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.115, 48, 32), ballMat); ball.position.copy(p); s.add(ball);
      sprite(lilac, p, 0.6, new THREE.Color(0.5, 0.4, 0.9), 'breath');
    }
  });
  // what you can touch, as invisible stand-ins: the table to sit down at, the deck to draw from
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.7, 24), hidden); table.position.set(-0.12, 0.35, -0.12); table.userData.table = true; s.add(table);
  const deck = new THREE.Group(); deck.position.set(0.05, 0.74, -0.07); s.add(deck);
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.15), hidden); c.position.y = i * 0.012; c.userData.deck = true; deck.add(c); }
  const update = (dt, t) => { if (ballMat) ballMat.uniforms.t.value = t; fxPulse(fx, t); };
  // kept cards hang under the canopy over the back half, where the roof is
  const keepAt = () => { const a = (80 + Math.random() * 110) * DEG, r = 1.0 + Math.random() * 0.6; return V(Math.cos(a) * r, 2.0 + Math.random() * 0.3, -Math.sin(a) * r); };
  const roofAt = (x, z) => 2.41 + (1.14 * (2.36 - Math.hypot(x, z))) / 1.94 - 0.1;
  return { scene: s, deck, table, hits: [table, ...deck.children], warm: { intensity: 0 }, warmBase: 0, mobiles: [], flames: [], glow: [], baked: true, update, keepAt, roofAt };
}

/* ---------- the shrine baked in Blender (blender/build_shrine.py): a Quanzhou temple cut open at the front ---------- */
const SHRINE_ASSETS = 'shrine/', SHRINE_PRE = 'shrine_10181912';
const SHRINE_VIEW = {
  orbit: { at: V(0, 1.9, 0), orbit: { yaw: 0, pitch: 0.4, dist: 19.5 }, yaw: 0.8, pitch: 0.18, fov: [44, 28] },
  inside: { eye: V(0, 1.24, 1.36), at: V(0, 1.3, -1.0), yaw: 0.65, pitch: 0.4, fov: [70, 54] },
};
async function buildBakedShrineRoom() {
  const gltf = await loadBakedGLB(SHRINE_ASSETS, SHRINE_PRE);
  const s = bakedScene(gltf, 0x05070f);
  // light only for the live moon blocks: the baked parts are unlit and ignore it
  s.add(new THREE.HemisphereLight(0xe8e4ff, 0x6a4024, 1.5));
  const lamp = new THREE.PointLight(0xffc890, 4, 3, 1.2); lamp.position.set(0, 1.45, 0.05); s.add(lamp);      // the palace lanterns' warmth on the blocks
  const fx = [], warm = tentGlow('rgba(255,236,190,1)', 'rgba(255,170,80,.45)'), rose = tentGlow('rgba(255,220,210,1)', 'rgba(255,90,90,.45)'), cool = tentGlow('rgba(225,235,255,1)', 'rgba(140,170,255,.35)'), flame = tentFlame();
  const sprite = (map, pos, size, color, kind) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(pos); sp.scale.setScalar(size); s.add(sp); const f = { sp, size, base: color.clone(), kind, seed: Math.random() * 100 }; fx.push(f); return f;
  };
  let moonGlow = null, bei0 = null, incense = null, cup0 = null, cab0 = null; const embers = [], lamps = [];
  gltf.scene.traverse((o) => {
    if (!o.name.startsWith('FX_')) return;
    const p = o.getWorldPosition(new THREE.Vector3()), n = o.name;
    if (n.startsWith('FX_candle')) { sprite(flame, p.clone().add(V(0, 0.006, 0)), 0.06, new THREE.Color(2.2, 1.7, 1.2), 'flame'); sprite(warm, p, 0.42, new THREE.Color(0.8, 0.5, 0.25), 'glow'); }
    else if (n.startsWith('FX_lantern_Palace')) lamps.push(sprite(warm, p, 1.1, new THREE.Color(0.75, 0.45, 0.2), 'glow'));
    else if (n.startsWith('FX_lantern_Porch')) lamps.push(sprite(rose, p, 1.0, new THREE.Color(0.8, 0.3, 0.26), 'glow'));
    else if (n.startsWith('FX_lantern_Stone')) sprite(warm, p, 0.55, new THREE.Color(0.7, 0.45, 0.2), 'glow');
    else if (n === 'FX_pearl') sprite(warm, p, 1.3, new THREE.Color(0.85, 0.62, 0.25), 'breath');
    else if (n === 'FX_moon') { moonGlow = sprite(cool, p.clone().add(V(0, 0, 0.25)), 2.0, new THREE.Color(0.22, 0.26, 0.36), 'breath'); }
    else if (n.startsWith('FX_window')) sprite(cool, p, 0.6, new THREE.Color(0.18, 0.22, 0.32), 'breath');
    else if (n.startsWith('FX_ember')) { sprite(warm, p, 0.05, new THREE.Color(1.2, 0.5, 0.2), 'ember'); embers.push(p.clone()); }
    else if (n === 'FX_bei') bei0 = p.clone();
    else if (n === 'FX_incense') incense = p.clone();
    else if (n === 'FX_sticks') cup0 = p.clone();
    else if (n === 'FX_cabinet') cab0 = p.clone();
  });
  // the moon blocks, live: resting on their red cloth, thrown onto the table in front of the burner
  const S = 0.3, rest = bei0 ?? V(0, 0.826, 0.22);
  const bei = [-1, 1].map((sx) => {
    const b = jiaobei(); b.scale.setScalar(S);
    b.position.set(rest.x + sx * 0.065, rest.y + 0.086 * S + 0.002, rest.z); b.rotation.set(-Math.PI / 2, 0, sx * 0.35, 'YXZ');
    b.userData.home = { pos: b.position.clone(), rot: b.rotation.clone() }; s.add(b); return b;
  });
  const beiCfg = { x0: rest.x - 0.09, dx: 0.18, z: rest.z + 0.02, spread: 0.04, floor: rest.y + 0.002, yFlat: 0.086 * S, yRound: 0.014 * S, arc: 0.42, bounce: 0.02, hop: 0.025, aim: V(rest.x, rest.y + 0.16, rest.z - 0.35), fx: { c: V(rest.x, rest.y + 0.05, rest.z), r: 0.35 } };
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.9, 0.82), hidden); table.position.set(0, 0.45, 0.05); table.userData.table = true; s.add(table);
  // the full moon from the book page, far behind the building at its upper right, with a few thin clouds across it
  const moonTex = (() => {
    const c = canvas(512, 512), g = c.getContext('2d'), r = mulberry(812);
    const halo = g.createRadialGradient(256, 256, 60, 256, 256, 256); halo.addColorStop(0, 'rgba(255,240,205,.36)'); halo.addColorStop(0.3, 'rgba(200,215,255,.07)'); halo.addColorStop(0.72, 'rgba(160,180,255,0)'); halo.addColorStop(1, 'rgba(160,180,255,0)');
    g.fillStyle = halo; g.fillRect(0, 0, 512, 512);
    g.fillStyle = '#efe5c8'; g.beginPath(); g.arc(256, 256, 104, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(256, 256, 103, 0, TAU); g.clip(); g.filter = 'blur(7px)';
    for (let i = 0; i < 12; i++) { const a = r() * TAU, d = r() * 70, s = 10 + r() * 24; g.fillStyle = `rgba(185,168,140,${0.07 + r() * 0.07})`; g.beginPath(); g.ellipse(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, s, s * 0.8, r() * 3, 0, TAU); g.fill(); }
    g.restore(); return tex(c);
  })();
  const sky = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false }));
  sky.position.set(13.0, -0.8, -40); sky.scale.setScalar(10.7); sky.renderOrder = -1; s.add(sky);       // seen just off the upper right of the roofs in the opening view
  const cloudTex = (() => {
    const c = canvas(512, 128), g = c.getContext('2d'), r = mulberry(813);
    for (let i = 0; i < 46; i++) { const x = 110 + r() * 292, y = 64 + (r() - 0.5) * 22, w = 18 + r() * 26; const gr = g.createRadialGradient(x, y, 0, x, y, w); gr.addColorStop(0, 'rgba(160,175,210,.13)'); gr.addColorStop(1, 'rgba(160,175,210,0)'); g.fillStyle = gr; g.fillRect(x - w, y - w, w * 2, w * 2); }
    return tex(c);
  })();
  const clouds = [[11.6, -1.9, -39.6, 13], [15.0, 0.3, -40.6, 10], [11.8, 1.2, -41.2, 8.7]].map(([x, y, z, w], i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
    sp.position.set(x, y, z); sp.scale.set(w, w / 4, 1); sp.renderOrder = -1; s.add(sp); return { sp, x, ph: i * 2.1 };
  });
  // a night sky: faint stars all round that twinkle, crowding into a soft band of the Milky Way across the view
  const N = 1500, pos = [], seed = [], mag = [], tint = [], rng = mulberry(1229);
  const d0 = V(0, -0.32, -1).normalize(), nrm = d0.clone().cross(V(1, 0.8, 0.2).normalize()).normalize(), e2 = nrm.clone().cross(d0).normalize();
  const gauss = () => (rng() + rng() + rng() + rng() - 2) / 2;
  for (let i = 0; i < N; i++) {
    let dir;
    if (i < 650) { const z = rng() * 2 - 1, a = rng() * TAU, r = Math.sqrt(1 - z * z); dir = V(r * Math.cos(a), z, r * Math.sin(a)); }
    else { const a = rng() * TAU; dir = d0.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a)).addScaledVector(nrm, gauss() * 0.075).normalize(); }
    pos.push(dir.x * 70, dir.y * 70, dir.z * 70); seed.push(rng()); mag.push(i < 650 ? Math.pow(rng(), 3) : Math.pow(rng(), 6) * 0.8);
    const w = rng(); tint.push(0.78 + 0.22 * w, 0.82 + 0.08 * w, 1.0 - 0.18 * w);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); starGeo.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1));
  starGeo.setAttribute('mag', new THREE.Float32BufferAttribute(mag, 1)); starGeo.setAttribute('tint', new THREE.Float32BufferAttribute(tint, 3));
  const starMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, px: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; attribute float mag; attribute vec3 tint; uniform float t, px; varying vec3 vC; varying float vA;
      void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        float tw = .55 + .45 * sin(t * (.7 + seed * 2.4) + seed * 41.);
        gl_PointSize = (1.3 + mag * 3.4) * px * (.8 + .2 * tw); vC = tint; vA = (.28 + .72 * mag) * (.35 + .65 * tw); }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 d = gl_PointCoord - .5; float r = dot(d, d); if (r > .25) discard; gl_FragColor = vec4(vC * vA * smoothstep(.25, .0, r), 1.); }` });
  const stars = new THREE.Points(starGeo, starMat); stars.renderOrder = -2; stars.frustumCulled = false; s.add(stars);
  const milky = tentGlow('rgba(205,200,255,1)', 'rgba(120,120,200,.35)');
  for (let i = 0; i < 46; i++) {                                // the band's soft glow, brighter towards its middle
    const a = (i / 46 - 0.5) * 2.6, dir = d0.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a)).addScaledVector(nrm, gauss() * 0.03).normalize();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: milky, color: new THREE.Color(0.05, 0.05, 0.085).multiplyScalar(1.15 - Math.abs(a) * 0.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    sp.position.copy(dir.multiplyScalar(69)); sp.scale.setScalar(9 + rng() * 7); sp.renderOrder = -2; s.add(sp);
  }
  s.background = new THREE.Color(0x060a18);
  // the fortune-stick cup, live so it can be shaken: bamboo, three bands, thirty-four sticks with red-lacquered ends
  const cupAt = cup0 ?? V(-0.3, 0.82, -0.11);
  const bamboo = (() => { const c = canvas(256, 256), g = c.getContext('2d'), r = mulberry(31); g.fillStyle = '#c9a96a'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 70; i++) { const x = r() * 256; g.strokeStyle = `rgba(120,88,40,${0.06 + r() * 0.12})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + r() * 6 - 3, 256); g.stroke(); } return tex(c); })();
  const cup = new THREE.Group(); cup.position.copy(cupAt); s.add(cup);
  const cupBody = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.072, 0.01], [0.068, 0.24], [0.074, 0.25], [0.064, 0.25], [0.06, 0.03], [0, 0.03]].map(([r, h]) => new THREE.Vector2(r, h)), 32), new THREE.MeshStandardMaterial({ map: bamboo, roughness: 0.5 }));
  cupBody.userData.cup = true; cup.add(cupBody);
  const bandM = new THREE.MeshStandardMaterial({ color: 0x8a6a30, roughness: 0.5, side: THREE.DoubleSide });
  for (const h of [0.06, 0.15, 0.22]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0735, 0.0735, 0.012, 32, 1, true), bandM); b.position.y = h; b.userData.cup = true; cup.add(b); }
  const stickM = new THREE.MeshStandardMaterial({ color: 0xd8b880, roughness: 0.6 }), tipM = new THREE.MeshStandardMaterial({ color: 0xa81c14, roughness: 0.45 }), rs = mulberry(9), sticks = [];
  for (let k = 0; k < 34; k++) {
    const a = rs() * TAU, r = rs() * 0.045, h = 0.3 + rs() * 0.06, tilt = 0.04 + r * 1.3, st = new THREE.Group();
    st.position.set(Math.cos(a) * r * 0.5, 0.035, Math.sin(a) * r * 0.5); st.rotation.set(Math.sin(a) * tilt, rs() * TAU, -Math.cos(a) * tilt);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.008, h, 0.003).translate(0, h / 2, 0), stickM), tip = new THREE.Mesh(new THREE.BoxGeometry(0.0086, 0.04, 0.0036).translate(0, h - 0.02, 0), tipM);
    body.userData.cup = tip.userData.cup = true; st.add(body, tip); st.userData.home = st.position.clone(); st.userData.rot = st.rotation.clone(); cup.add(st); sticks.push(st);
  }
  // the hint that the cup can be tapped too, not only the moon blocks (updateLots shows it)
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: warm, color: new THREE.Color(0.9, 0.65, 0.3), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, fog: false }));
  const arrow = new THREE.Sprite(new THREE.SpriteMaterial({ map: cueArrow(), color: new THREE.Color(1.25, 1.18, 1.05), transparent: true, depthWrite: false, opacity: 0, fog: false }));
  halo.scale.setScalar(0.32); halo.userData.cup = arrow.userData.cup = true;
  const cue = new THREE.Group(); cue.add(halo, arrow); cue.position.copy(cupAt).add(V(0, 0.56, 0)); cue.visible = false; s.add(cue);
  // the drawer that slides out of the slip cabinet when a lot is granted (row-major from the top left, as painted)
  const cabAt = cab0 ?? V(-1.567, 0.93, -0.05), CWd = 1.32, CHd = 1.62 * 0.92, cwd = CWd / 10, chd = CHd / 6;
  const drawerAt = (n) => { const r = Math.floor((n - 1) / 10), c = (n - 1) % 10; return V(cabAt.x, cabAt.y + CHd / 2 - (r + 0.5) * chd, cabAt.z + CWd / 2 - (c + 0.5) * cwd); };
  const front = canvas(128, 232), fg = front.getContext('2d'), frontTex = tex(front);
  const paintFront = (n) => {
    fg.fillStyle = '#5e3a22'; fg.fillRect(0, 0, 128, 232); fg.strokeStyle = '#24140c'; fg.lineWidth = 6; fg.strokeRect(3, 3, 122, 226);
    fg.fillStyle = '#efe2c2'; fg.fillRect(36, 22, 56, 120); fg.strokeStyle = '#a8301e'; fg.lineWidth = 3; fg.strokeRect(36, 22, 56, 120);
    fg.fillStyle = '#2a1a12'; fg.textAlign = 'center'; fg.textBaseline = 'middle'; const t = qianNum(n), sz = t.length > 2 ? 30 : 38; fg.font = `700 ${sz}px "Noto Serif SC", serif`;
    [...t].forEach((ch, i) => fg.fillText(ch, 64, 82 + (i - (t.length - 1) / 2) * (sz + 4)));
    fg.fillStyle = '#c99a48'; fg.beginPath(); fg.arc(64, 186, 11, 0, TAU); fg.fill(); frontTex.needsUpdate = true;
  };
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.6 });
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.3, chd * 0.9, cwd * 0.9), [new THREE.MeshBasicMaterial({ map: frontTex }), wood, wood, wood, wood, wood]);
  drawer.visible = false; s.add(drawer);
  const slip = new THREE.Mesh(new THREE.PlaneGeometry(cwd * 0.55, 0.2), new THREE.MeshBasicMaterial({ color: 0xf3e6c8, side: THREE.DoubleSide })); slip.visible = false; s.add(slip);
  const drawerGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: warm, color: new THREE.Color(0.9, 0.6, 0.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  drawerGlow.scale.setScalar(0.5); drawerGlow.visible = false; s.add(drawerGlow);
  const setDrawer = (n) => { paintFront(n); const p = drawerAt(n); drawer.position.set(p.x - 0.15 + 0.004, p.y, p.z); slip.position.set(p.x + 0.05, p.y + chd * 0.25, p.z); slip.rotation.set(0, Math.PI / 2, 0); drawerGlow.position.set(p.x + 0.12, p.y, p.z); return p; };
  const smokeAt = embers.length ? embers : [incense ?? V(0, 1.3, -0.1)];
  const update = (dt, t) => {
    fxPulse(fx, t); starMat.uniforms.t.value = t;
    for (const c of clouds) c.sp.position.x = c.x + Math.sin(t * 0.05 + c.ph) * 1.6;
    // incense: thin threads rising from each stick and coil, drifting a little
    for (const p of smokeAt) if (Math.random() < dt * 9) smoke.emit(tmpV.copy(p), tmpW.set(rnd(-0.008, 0.008), rnd(0.06, 0.1), rnd(-0.008, 0.008)), { life: rnd(3.5, 5.5), size: rnd(0.035, 0.06), color: new THREE.Color(0.62, 0.62, 0.66), drag: 0.02 });
    // low mist drifting off the podium
    if (Math.random() < dt * 2) { const a = rnd(0, TAU); smoke.emit(tmpV.set(Math.cos(a) * rnd(2.6, 3.4), rnd(-0.1, 0.15), Math.sin(a) * rnd(1.8, 2.4)), tmpW.set(Math.cos(a) * 0.05, 0.005, Math.sin(a) * 0.05), { life: rnd(5, 8), size: 0.34, color: new THREE.Color(0.12, 0.14, 0.2), drag: 0.03 }); }
  };
  return { scene: s, bei, table, cup, sticks, cupTilt: 0, cue, cueK: 0, cueY: cue.position.y, cupTried: false, drawer, slip, drawerGlow, drawerAt, setDrawer, hits: [table, ...bei.map((b) => b.children).flat(), cupBody], warm: { intensity: 0 }, warmBase: 0, mobiles: [], flames: [], glow: [], lanterns: [], baked: true, update,
    moon: moonGlow ? { material: { set opacity(v) { moonGlow.dim = v; } } } : { material: {} }, beiCfg, incensePos: incense, moonPos: moonGlow?.sp.position, setGlow: (g) => lamps.forEach((f) => { f.dim = g / 0.9; }) };
}

/** what an orbit looks at: a view may centre a screen held upright on another point */
function orbitAt(v) { return camera.aspect < 0.8 && v.narrowAt ? v.narrowAt : v.at; }
/** how far out a view's orbit sits: further on a screen held upright, by the view's own factor if it has one */
function orbitDist(v) { return v.orbit.dist * (camera.aspect < 0.8 ? v.orbit.narrow ?? 1.15 : 1); }
/** where the camera sits for a view, and its lens */
function viewPose(v) {
  if (!v.orbit) return { pos: v.eye.clone(), at: v.at.clone() };
  const d = orbitDist(v), cp = Math.cos(v.orbit.pitch), at = orbitAt(v);
  return { pos: V(at.x + Math.sin(v.orbit.yaw) * cp * d, at.y + Math.sin(v.orbit.pitch) * d, at.z + Math.cos(v.orbit.yaw) * cp * d), at: at.clone() };
}
function viewFov(v) { const f = v.fov ?? [72, 62]; return camera.aspect < 0.8 ? f[0] : f[1]; }
/** glide the camera from wherever it is to another view of the room */
function flyRoom(v, ms = 1400) {
  const cur = ROOM_VIEW[roomId], fwd = camera.getWorldDirection(new THREE.Vector3());
  const fromAt = cur.orbit ? orbitAt(cur).clone() : camera.position.clone().addScaledVector(fwd, camera.position.distanceTo(cur.at));
  return new Promise((done) => { roomFly = { t0: performance.now(), ms, v, done, from: { pos: camera.position.clone(), at: fromAt, fov: camera.fov }, to: { ...viewPose(v), fov: viewFov(v) } }; });
}
function updateRoomFly() {
  const f = roomFly, k = ease(Math.min(1, (performance.now() - f.t0) / f.ms));
  camera.position.lerpVectors(f.from.pos, f.to.pos, k);
  camera.lookAt(tmpV.lerpVectors(f.from.at, f.to.at, k));
  camera.fov = f.from.fov + (f.to.fov - f.from.fov) * k; camera.updateProjectionMatrix();
  if (k < 1) return;
  roomFly = null; ROOM_VIEW[roomId] = f.v;
  if (f.v.orbit) { look.yaw = look.tyaw = f.v.orbit.yaw; look.pitch = look.tpitch = f.v.orbit.pitch; }
  else { camera.position.copy(f.v.eye); aimAt(f.v.at, true); }
  f.done();
}
/** come in close: sit at the tent's table, or kneel at the shrine's offering table */
async function roomSit() {
  if (busy || roomFly || roomInside || !rooms[roomId]?.baked) return;
  busy = true; hidePanel(); setUI('moving'); sfx('soft');
  await flyRoom(BAKED[roomId].view().inside, 1500);
  roomInside = true; busy = false; setUI('room');
  toast({ tent: '点一下桌上的牌堆，开始占卜', shrine: '默念你的问题，点签筒求签，或点木筊掷筊', study: '宣纸已经铺好，三枚铜钱就在手边', tea: '茶刚斟好，牌就放在杯子旁边', window: '灵摆就挂在桌上，窗外是今晚的月亮', hearth: '炉火正旺，符文袋和锡勺都在手边' }[roomId]);
}
/** stand up and step back out to the cut-away view */
async function roomStand() {
  if (busy || roomFly || !roomInside || throwing) return;
  busy = true; clearCards(); resetLots(); resetLiuyao(); resetTea(); resetWindow(); resetHearth(); hidePanel(); setUI('moving');
  await flyRoom(BAKED[roomId].view().orbit, 1300);
  roomInside = false; busy = false; setUI('room');
}
const tentSit = roomSit, tentStand = roomStand;

function lookFrom(p, from = camera.position) { const d = p.clone().sub(from); return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) }; }
function aimAt(p, snap = false) {
  const l = lookFrom(p);
  look.tyaw = l.yaw; look.tpitch = l.pitch;
  if (snap) { look.yaw = look.tyaw; look.pitch = look.tpitch; }
}
function roomFov(id) { const f = ROOM_VIEW[id].fov ?? [72, 62]; return camera.aspect < 0.8 ? f[0] : f[1]; }
function updateRoomLook() {
  if (roomFly) { updateRoomFly(); return; }
  look.yaw += (look.tyaw - look.yaw) * 0.1;
  look.pitch += (look.tpitch - look.pitch) * 0.1;
  const v = ROOM_VIEW[roomId];
  if (v?.orbit) { const d = orbitDist(v), cp = Math.cos(look.pitch), at = orbitAt(v); camera.position.set(at.x + Math.sin(look.yaw) * cp * d, at.y + Math.sin(look.pitch) * d, at.z + Math.cos(look.yaw) * cp * d); camera.lookAt(at); return; }
  camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
}
function updateRoom(dt, t) {
  const r = rooms[roomId];
  r.warm.intensity = (r.warmBase ?? 4) * (1 + Math.sin(t * 9) * 0.08 + Math.sin(t * 3.3) * 0.06);
  r.mobiles.forEach((m) => { m.rotation.y = Math.sin(t * 0.6 + m.userData.ph) * 0.4; m.rotation.z = Math.sin(t * 0.9 + m.userData.ph) * 0.04; if (m.userData.base) m.position.y = m.userData.base + Math.sin(t * 0.7 + m.userData.ph) * 0.08; });
  if (Math.random() < dt * 12) sparks.emit(tmpV.set(rnd(-2, 2), rnd(0.3, 2.6), rnd(-2, 1)), tmpW.set(rnd(-0.04, 0.04), rnd(0, 0.05), rnd(-0.04, 0.04)), { life: rnd(2.5, 4), size: rnd(0.012, 0.022), drag: 0.1 });
  if (roomId === 'shrine') { updateShrineFx(dt, t); updateLots(dt, t); }
  if (r.glow) r.glow.forEach((m) => { m.emissiveIntensity = (m.userData.gb ?? 0.38) * (1 + 0.45 * Math.sin(t * 1.1)); });
  if (roomId === 'tent') { updateKept(dt); updateRitual(dt, t); updateSpreadTags(); }
  r.update?.(dt, t);
  if (roomId === 'shrine' && !r.baked && Math.random() < dt * 5) smoke.emit(tmpV.set(rnd(-3.5, 3.5), rnd(0.03, 0.2), rnd(-4.5, -1.3)), tmpW.set(rnd(0.05, 0.12), rnd(0, 0.015), rnd(-0.02, 0.02)), { life: rnd(4, 6), size: 0.3, color: new THREE.Color(0.34, 0.4, 0.5), drag: 0.05 });
}

async function enterRoom(id) {
  if (busy || mode !== 'book') return;
  if (!ROOMS[id].ready) { toast(`「${ROOMS[id].name}」还在装订中，下次翻开时再来坐坐`); sfx('soft'); return; }
  busy = true; setUI('moving'); clearBurst(); setHover(null);
  const baked = BAKED[id] && !rooms[id] ? preloadBaked(id) : null;
  const P = spreads[cur].P, door = P.group.localToWorld(P.door.clone());
  sfx('chime');
  burstAt(sparks, door, 50, { speed: 0.25, up: 0.35, size: 0.02, life: 0.8 });
  const fly = tweenRig({ tx: door.x, ty: door.y, tz: door.z - 0.04, dist: 0.2, yaw: 0, pitch: 0.1, fov: 44 }, 1.6);
  await wait(1050);
  $('flash').classList.add('on');
  await fly;
  if (baked) { const r = await Promise.race([baked, wait(20000).then(() => null)]); if (r) rooms[id] = r; }
  if (!rooms[id] && !PAPER_ROOM[id]) {
    Object.assign(rig, { tx: door.x, ty: door.y, tz: door.z - 0.04, dist: 0.24, yaw: 0, pitch: 0.12, fov: 44 }); updateRig(0);
    $('flash').classList.remove('on'); busy = false; setUI('open'); toast(`「${ROOMS[id].name}」这会儿没能打开，稍后再来试试`); return;
  }
  showRoom(id);
  await wait(250);
  $('flash').classList.remove('on');
  await askQuestion(id);
  busy = false; setUI('room');
}
/** the rooms drawn in code, the stand-ins when a baked room can't load (the study has none) */
const PAPER_ROOM = { tent: () => buildTentRoom(), shrine: () => buildShrineRoom() };
/** switch the view to a room, building it the first time */
function showRoom(id) {
  rooms[id] ??= PAPER_ROOM[id]();
  roomId = id; mode = 'room';
  rooms[id].scene.add(sparks.points, smoke.points);
  renderPass.scene = rooms[id].scene;
  if (rooms[id].baked) { ROOM_VIEW[id] = BAKED[id].view().orbit; roomInside = false; roomFly = null; }
  camera.fov = roomFov(id); camera.updateProjectionMatrix();
  const v = ROOM_VIEW[id];
  if (v.orbit) { look.yaw = look.tyaw = v.orbit.yaw; look.pitch = look.tpitch = v.orbit.pitch; }
  else { camera.position.copy(v.eye); aimAt(v.at, true); }
  updateRoomLook();
}
async function leaveRoom() {
  if (busy || mode !== 'room') return;
  busy = true; clearCards(); resetLots(); resetLiuyao(); resetTea(); resetWindow(true); resetHearth(); hidePanel(); throwing = null; roomFly = null; roomInside = false;
  for (const id in BAKED) if (rooms[id]?.baked) ROOM_VIEW[id] = BAKED[id].view().orbit;
  $('flash').classList.add('on');
  await wait(450);
  mode = 'book'; roomId = null;
  scene.add(sparks.points, smoke.points);
  renderPass.scene = scene;
  const P = spreads[cur].P, door = P.group.localToWorld(P.door.clone());
  Object.assign(rig, { tx: door.x, ty: door.y, tz: door.z - 0.04, dist: 0.24, yaw: 0, pitch: 0.12, fov: 44 });
  updateRig(0);
  $('flash').classList.remove('on');
  busy = false; setUI('open');
}

/* ---------- the tarot room: cards that fly up to you ---------- */
let cards = [];
const faceCache = {};
const ease = easeIO;
let cardBackMat;
/** how much further cards should float when the room's lens is narrower, so they look the same size */
function cardReach() { return Math.max(1, Math.tan(31 * DEG) / Math.tan((camera.fov * DEG) / 2)); }
/** how often a card comes up reversed: a gentle third of the time */
const REVERSE_CHANCE = 0.3;
function drawCards(from0) {
  if (cards.length || roomId !== 'tent') return;
  if (rooms.tent.baked && !roomInside) { tentSit(); return; }
  hidePanel(); sfx('pop');
  const R = rooms.tent, order = [];
  while (order.length < 3) { const k = Math.floor(Math.random() * MAJOR.length); if (!order.includes(k)) order.push(k); }
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
  const camUp = new THREE.Vector3().crossVectors(right, fwd);
  const from = from0 instanceof THREE.Vector3 ? from0.clone() : R.deck.children[3].getWorldPosition(new THREE.Vector3());
  const kd = cardReach(), viewW = 2 * 1.05 * kd * Math.tan((camera.fov * DEG) / 2) * camera.aspect;
  const sc = Math.min(1, viewW / 1.25), gap = 0.38 * sc;
  cardBackMat ??= new THREE.MeshBasicMaterial({ map: tex(cardBackCanvas()) });
  burstAt(sparks, from, 30, { speed: 0.3, up: 0.6, size: 0.02 });
  cards = order.map((k, i) => {
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.48), cardBackMat);
    faceCache[k] ??= new THREE.MeshBasicMaterial({ map: tex(catTarot(k, 480)) });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.48), faceCache[k]);
    const rev = Math.random() < REVERSE_CHANCE;
    face.rotation.set(0, Math.PI, rev ? Math.PI : 0);          // a reversed card turns over upside down
    back.userData.card = i; face.userData.card = i;
    g.add(back, face);
    g.position.copy(from);
    g.scale.setScalar(sc); g.userData.sc = sc;
    R.scene.add(g);
    const to = camera.position.clone().addScaledVector(fwd, 1.05 * kd).addScaledVector(right, (i - 1) * gap * kd).addScaledVector(camUp, i === 1 ? 0.03 * kd : 0);
    return { k, rev, group: g, from: from.clone(), to, t: -i * 0.12, flip: 0, flipping: false, spin: (i - 1) * 0.12, fwd, camUp };
  });
  toast('挑一张，翻开看看');
  cardsChanged();
}
function updateCards(dt) {
  for (const c of cards) {
    if (c.t < 1) {
      c.t = Math.min(1, c.t + dt / 0.75);
      const k = ease(Math.max(0, c.t));
      c.group.position.lerpVectors(c.from, c.to, k).add(new THREE.Vector3(0, Math.sin(k * Math.PI) * 0.25, 0));
      if (c.leaving) c.group.scale.setScalar(Math.max(0.05, 1 - k) * c.group.userData.sc);
      else if (c.group.userData.shrink) c.group.scale.setScalar(c.group.userData.sc * (1 - (1 - c.group.userData.shrink) * k));
      if (c.leaving && c.t >= 1) c.group.visible = false;
      if (c.t > 0 && c.t < 1 && Math.random() < 0.5) sparks.emit(c.group.position, tmpW.set(0, 0.05, 0), { life: 0.7, size: 0.012 });
    }
    c.group.lookAt(camera.position);
    c.group.rotateZ(-c.spin);
    if (c.flipping) c.flip = Math.min(1, c.flip + dt / 0.8);
    c.group.rotateY(ease(c.flip) * Math.PI);
  }
}
function flipCard(i) {
  const kd = cardReach();
  const c = cards[i];
  if (!c || cards.some((o) => o.flipping)) return;
  c.flipping = true; sfx('page'); cardsChanged();
  const wide = camera.aspect > 1 && innerWidth > 760, deck = rooms.tent.deck;
  cards.forEach((o) => {
    o.from = o.group.position.clone(); o.t = 0;
    o.to = o !== c ? deck.children[3].getWorldPosition(new THREE.Vector3())
      : camera.position.clone().addScaledVector(c.fwd, 0.9 * kd).addScaledVector(c.camUp, (wide ? 0 : 0.17) * kd).addScaledVector(new THREE.Vector3().crossVectors(c.fwd, UP).normalize(), (wide ? -0.16 : 0) * kd);
  });
  c.spin = 0;
  if (!wide) c.group.userData.shrink = 0.82;
  cards.forEach((o) => { if (o !== c) o.leaving = true; });
  const [name, en, , up, key] = MAJOR[c.k], line = c.rev ? MAJOR_REV[c.k] : up;
  setTimeout(() => { sfx('chime'); burstAt(sparks, c.group.position, 40, { speed: 0.35, up: 0.4, size: 0.018 }); showPanel(`<span class="seal">星</span><small>${ROMAN[c.k]} · ${en} · ${c.rev ? '逆位' : '正位'}</small><h3>${name}</h3><p class="gua-image">牌意 · ${key}</p><p>${line}</p><div class="note">仅供娱乐 · 不构成任何建议</div>`, [['收下这张牌', () => keepCard(c), true], ['再抽一张', () => { clearCards(); hidePanel(); setTimeout(startRitual, 200); }], ['合上', () => { clearCards(); hidePanel(); }]]); addSlip(); addReading(c.k, c.rev); }, 850);
}
function clearCards() { cards.forEach((c) => c.group.parent?.remove(c.group)); cards = []; endRitual(); spreadTags(false); cardsChanged(); }
/** the buttons under the room follow the cards on the table */
function cardsChanged() { if (mode === 'room' && roomId === 'tent' && !busy) setUI('room'); }
/** the cards turn by buttons as well as by a tap on them (setUI puts these in front of the room's own buttons) */
function cardButtons(act) {
  if (cards.some((c) => c.leaving)) return;
  if (cards[0].spread) {
    const i = cards.findIndex((c) => !c.flipping);
    if (i < 0) return;
    $('hint').textContent = '点牌，或按下面的按钮，一张一张翻开';
    act.prepend(button(`翻开「${cards[i].slot.name}」`, () => whenDealt(i, () => flipSpreadCard(i)), true));
  } else if (!cards.some((c) => c.flipping)) {
    $('hint').textContent = '凭直觉点一张牌，或按下面的按钮';
    act.prepend(button('左边这张', () => whenDealt(0, () => flipCard(0))), button('中间这张', () => whenDealt(1, () => flipCard(1)), true), button('右边这张', () => whenDealt(2, () => flipCard(2))));
  }
}
/** a card turns only once it has landed: a button pressed while the cards still fly waits for it */
function whenDealt(i, fn) {
  const c = cards[i];
  if (!c) return;
  if (c.t < 1) { setTimeout(() => whenDealt(i, fn), 120); return; }
  fn();
}
/* ---------- spreads: several cards, each set in a place that gives it its meaning ---------- */
/*
 * After the shuffle and the cut, the cards come up in the shape of the chosen spread and hang in the air before
 * you, face down, each with the name of its place beneath it. Turn them one by one; when all are open, the panel
 * lists them and the reader can tie them together. Units are steps of one card (with a little gap).
 */
const SPREADS = {
  single: { name: '单张', note: '一张牌，一句提醒', slots: null },
  triangle: { name: '圣三角', note: '过去 · 现在 · 未来', scale: 0.52, gapY: 1.14, slots: [
    { name: '过去', hint: '因缘', x: -1, y: -0.56 },
    { name: '现在', hint: '现状', x: 0, y: 0.56 },
    { name: '未来', hint: '趋向', x: 1, y: -0.56 },
  ] },
  // the crossing card lies over the lower half of the core card, so the core's number and picture still show
  cross: { name: '六芒十字', note: '核心、阻碍、潜意识、根源、目标、走向', scale: 0.44, gapY: 1.22, slots: [
    { name: '核心现状', x: 0, y: 0.12, tag: 'top' },
    { name: '阻碍 / 助力', x: 0, y: -0.12, cross: true },
    { name: '环境 / 潜意识', x: 0, y: -1.3 },
    { name: '过去根源', x: -1.3, y: 0 },
    { name: '远景目标', x: 0, y: 1.3 },
    { name: '未来走向', x: 1.3, y: 0 },
  ] },
};
let spreadKind = 'single';
function showSpreadChooser() {
  if (roomId !== 'tent' || busy) return;
  if (cards.length || ritual) { clearCards(); hidePanel(); }            // a new reading puts the last one away
  if (rooms.tent.baked && !roomInside) { tentSit(); return; }
  showPanel('<small>Spread · 选一个牌阵</small><h3>想怎么看这件事？</h3><p class="spread-pick"><b>单张</b>　一张牌，一句提醒<br><b>圣三角</b>　过去 · 现在 · 未来<br><b>六芒十字</b>　核心、阻碍、潜意识、根源、目标、走向</p>',
    [['单张', () => pickSpread('single')], ['圣三角', () => pickSpread('triangle'), true], ['六芒十字', () => pickSpread('cross')]]);
}
function pickSpread(kind) { spreadKind = SPREADS[kind] ? kind : 'single'; hidePanel(); startRitual(); }
/** deal the chosen spread from where the cut deck lies (one card to pick from three, for a single draw) */
function dealSpread(from0) {
  const S = SPREADS[spreadKind];
  if (!S.slots) return drawCards(from0);
  if (cards.length || roomId !== 'tent') return;
  hidePanel(); sfx('pop');
  const R = rooms.tent, n = S.slots.length, order = [];
  while (order.length < n) { const k = Math.floor(Math.random() * MAJOR.length); if (!order.includes(k)) order.push(k); }
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  const right = new THREE.Vector3().crossVectors(fwd, UP).normalize(), camUp = new THREE.Vector3().crossVectors(right, fwd);
  const from = from0 instanceof THREE.Vector3 ? from0.clone() : R.deck.children[3].getWorldPosition(new THREE.Vector3());
  // fit the whole spread into the view, leaving room for the bar at the bottom
  // close enough to hang in front of everything on the table; sized so the whole spread fits the view
  const dist = 0.78 * cardReach(), halfH = dist * Math.tan((camera.fov * DEG) / 2), halfW = halfH * camera.aspect;
  const cols = Math.max(...S.slots.map((t) => Math.abs(t.x))) * 2 + 1, rows = Math.max(...S.slots.map((t) => Math.abs(t.y))) * 2 + 1;
  const gapY = S.gapY * (camera.aspect < 0.8 ? 1.3 : 1);           // a tall phone screen has height to spare: give the rows air so the labels never touch
  const sc = Math.min(S.scale, (halfW * 2 * 0.84) / (cols * 0.3 * 1.16), (halfH * 2 * 0.72) / (rows * 0.48 * gapY));
  const stepX = 0.3 * sc * 1.16, stepY = 0.48 * sc * gapY, lift = halfH * 0.1;
  cardBackMat ??= new THREE.MeshBasicMaterial({ map: tex(cardBackCanvas()) });
  burstAt(sparks, from, 36, { speed: 0.3, up: 0.6, size: 0.02 });
  cards = order.map((k, i) => {
    const slot = S.slots[i], g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.48), cardBackMat);
    faceCache[k] ??= new THREE.MeshBasicMaterial({ map: tex(catTarot(k, 480)) });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.48), faceCache[k]);
    const rev = Math.random() < REVERSE_CHANCE;
    face.rotation.set(0, Math.PI, rev ? Math.PI : 0);
    back.userData.card = i; face.userData.card = i;
    g.add(back, face); g.position.copy(from); g.scale.setScalar(sc); g.userData.sc = sc;
    R.scene.add(g);
    const to = camera.position.clone().addScaledVector(fwd, dist - (slot.cross ? 0.02 : 0)).addScaledVector(right, slot.x * stepX).addScaledVector(camUp, slot.y * stepY + lift);
    return { k, rev, slot, spread: true, group: g, from: from.clone(), to, t: -i * 0.1, flip: 0, flipping: false, spin: slot.cross ? Math.PI / 2 : 0, fwd, camUp, h: 0.48 * sc, w: 0.3 * sc };
  });
  spreadTags(true);
  toast(`${S.name}牌阵摆好了 · 一张一张点开`);
  cardsChanged();
}
/** turn one card of a spread over where it hangs; when the last one is open, show the whole spread */
function flipSpreadCard(i) {
  const c = cards[i];
  if (!c || c.flipping || c.t < 1) return;
  c.flipping = true; sfx('page'); cardsChanged();
  const [name] = MAJOR[c.k];
  setTimeout(() => {
    burstAt(sparks, c.group.position, 24, { speed: 0.3, up: 0.35, size: 0.016 });
    toast(`${c.slot.name} · ${name}${c.rev ? ' · 逆位' : ''}`);
    if (cards.length && cards.every((o) => o.flipping)) setTimeout(showSpreadSummary, 900);
  }, 650);
}
function showSpreadSummary() {
  if (!cards.length || !cards[0].spread) return;
  const S = SPREADS[spreadKind];
  // everything set as HTML here comes from the deck's own names and lines; the viewer's question never does
  const rows = cards.map((c) => { const [name, en, , up, key] = MAJOR[c.k]; return `<li><b>${c.slot.name}</b>　${name} <i>${en}</i> · ${c.rev ? '逆位' : '正位'} · ${key}<span>${c.rev ? MAJOR_REV[c.k] : up}</span></li>`; }).join('');
  sfx('chime');
  showPanel(`<span class="seal">阵</span><small>${S.name} · ${S.note}</small><h3>你的${S.name}</h3><ul class="spread-list">${rows}</ul><div class="note">仅供娱乐 · 不构成任何建议</div>`,
    [['再占一次', () => { clearCards(); hidePanel(); setTimeout(showSpreadChooser, 200); }, true], ['合上', () => { clearCards(); hidePanel(); }]]);
  $('panel').classList.add('long');
  addSlip();
  addReading(null, false, cards.map((c) => ({ name: c.slot.name, hint: c.slot.hint, k: c.k, rev: c.rev })));
}
/** the place names under each card of a spread, kept on screen as the cards move */
function spreadTags(on) {
  let box = $('spreadTags');
  if (!on) { box?.remove(); return; }
  if (!box) { box = el('div', 'spread-tags'); box.id = 'spreadTags'; document.body.appendChild(box); }
  box.replaceChildren(...cards.map((c) => { const t = el('span', 'spread-tag'); t.textContent = c.slot.name; return t; }));
}
const tagV = new THREE.Vector3();
function updateSpreadTags() {
  const box = $('spreadTags'); if (!box) return;
  const r = renderer.domElement.getBoundingClientRect();
  cards.forEach((c, i) => {
    const t = box.children[i]; if (!t) return;
    const half = (c.slot.cross ? c.w : c.h) * 0.5;
    tagV.copy(c.group.position).addScaledVector(c.camUp, c.slot.tag === 'top' ? half + 0.03 : -(half + 0.016));
    tagV.project(camera);
    t.style.left = `${r.left + ((tagV.x + 1) / 2) * r.width}px`; t.style.top = `${r.top + ((1 - tagV.y) / 2) * r.height}px`;
    t.classList.toggle('open', c.flipping); t.style.opacity = c.t > 0.6 ? 1 : 0;
  });
}

/* ---------- before drawing: shuffle by swiping, then cut the deck by hand ---------- */
/*
 * A little ceremony that slows the moment down: swipe side to side and the deck riffles in front of you,
 * then it falls into three piles and you pick one by feel. Only then do the cards come up.
 */
let ritual = null;
const RITUAL_SWIPE = 1400;            // px of side-to-side swiping that counts as a good shuffle
function ritualBase() {
  if (rooms.tent.baked) return V(0.0, 0.738, 0.0);           // on the cloth, between the crystal ball and your seat
  return rooms.tent.deck.children[3].getWorldPosition(new THREE.Vector3()).add(V(0, 0.01, 0));
}
function ritualMeter(k) {
  let m = $('ritualMeter');
  if (!m) { m = el('div', 'ritual-meter', '<i></i>'); m.id = 'ritualMeter'; document.body.appendChild(m); }
  m.firstChild.style.width = `${Math.round(Math.min(1, k) * 100)}%`;
}
function startRitual() {
  if (ritual || cards.length || roomId !== 'tent' || busy) return;
  if (rooms.tent.baked && !roomInside) { tentSit(); return; }
  hidePanel(); sfx('pop');
  cardBackMat ??= new THREE.MeshBasicMaterial({ map: tex(cardBackCanvas()) });
  const edge = new THREE.MeshBasicMaterial({ color: 0xc9a75e }), base = ritualBase(), g = new THREE.Group();
  g.position.copy(base); g.rotation.y = Math.atan2(camera.position.x - base.x, camera.position.z - base.z);   // squared to your seat
  rooms.tent.scene.add(g);
  const list = [];
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.0035, 0.12), [edge, edge, cardBackMat, edge, edge, edge]);
    m.position.y = i * 0.0037; g.add(m);
    list.push({ m, home: m.position.clone(), ph: Math.random() * TAU, side: i % 2 ? 1 : -1, turn: 0 });
  }
  ritual = { phase: 'shuffle', g, list, progress: 0, energy: 0, swap: 0, sound: 0, hits: [] };
  ritualMeter(0); setUI('room');
  toast('左右滑动屏幕洗牌 · 一边洗，一边想着你的问题');
}
/** a swipe while shuffling: the deck splits and riffles back together, faster the harder you swipe */
function ritualSwipe(dx) {
  const r = ritual; if (!r || r.phase !== 'shuffle') return;
  const d = Math.abs(dx); r.progress += d; r.energy = Math.min(1, r.energy + d / 90); r.sound += d;
  if (r.sound > 260) { r.sound = 0; sfx('page'); }
  if (Math.random() < d / 60) sparks.emit(tmpV.copy(r.g.position).add(V(rnd(-0.08, 0.08), 0.05, rnd(-0.05, 0.05))), tmpW.set(0, 0.06, 0), { life: 0.8, size: 0.012 });
  ritualMeter(r.progress / RITUAL_SWIPE);
  if (r.progress >= RITUAL_SWIPE) finishShuffle();
}
function finishShuffle() {
  const r = ritual; if (!r || r.phase !== 'shuffle') return;
  r.phase = 'settle'; r.energy = 0; ritualMeter(1); sfx('chime');
  burstAt(sparks, r.g.position.clone().add(V(0, 0.06, 0)), 30, { speed: 0.25, up: 0.35, size: 0.016 });
  setTimeout(startCut, 650);
}
/** the shuffled deck falls into three piles; one of them is yours */
function startCut() {
  const r = ritual; if (!r) return;
  r.phase = 'cut'; $('ritualMeter')?.remove();
  const sizes = [5 + Math.floor(Math.random() * 3), 5 + Math.floor(Math.random() * 3)]; sizes.push(r.list.length - sizes[0] - sizes[1]);
  const hit = new THREE.MeshBasicMaterial({ visible: false });
  let i = 0;
  sizes.forEach((n, k) => {
    const x = (k - 1) * 0.105;
    for (let j = 0; j < n; j++, i++) { const c = r.list[i]; c.pile = k; c.home.set(x, j * 0.0037, 0); c.turn = (Math.random() - 0.5) * 0.12; }
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.07, 0.14), hit); h.position.set(x, 0.03, 0); h.userData.pile = k; r.g.add(h); r.hits.push(h);
  });
  setUI('room'); toast('凭直觉，点一叠牌');
}
function chooseCut(k) {
  const r = ritual; if (!r || r.phase !== 'cut') return;
  r.phase = 'gather'; sfx('soft');
  // the chosen pile goes on top of the other two, squared up in the middle
  const order = [...r.list.filter((c) => c.pile !== k), ...r.list.filter((c) => c.pile === k)];
  order.forEach((c, j) => { c.home.set(0, j * 0.0037, 0); c.turn = 0; c.lift = c.pile === k ? 0.07 : 0; });
  burstAt(sparks, r.g.localToWorld(V((k - 1) * 0.105, 0.05, 0)), 24, { speed: 0.25, up: 0.4, size: 0.016 });
  setTimeout(() => {
    if (ritual !== r) return;
    r.phase = 'done'; setUI('room');
    dealSpread(r.g.localToWorld(V(0, r.list.length * 0.0037 + 0.01, 0)));
  }, 900);
}
function skipRitual() {
  const r = ritual; if (!r) return;
  r.phase = 'done'; $('ritualMeter')?.remove(); setUI('room');
  dealSpread(r.g.localToWorld(V(0, r.list.length * 0.0037 + 0.01, 0)));
}
function endRitual() { if (!ritual) return; ritual.g.parent?.remove(ritual.g); ritual = null; $('ritualMeter')?.remove(); }
function updateRitual(dt, t) {
  const r = ritual; if (!r) return;
  r.energy *= Math.exp(-dt * 2.6);
  // while the deck is busy, neighbouring cards trade places now and then: the riffle
  if (r.phase === 'shuffle' && r.energy > 0.25 && (r.swap -= dt) < 0) {
    r.swap = 0.05; const a = Math.floor(Math.random() * r.list.length), b = Math.min(r.list.length - 1, a + 1 + Math.floor(Math.random() * 3));
    const y = r.list[a].home.y; r.list[a].home.y = r.list[b].home.y; r.list[b].home.y = y;
  }
  const e = r.energy;
  for (const c of r.list) {
    const wob = Math.abs(Math.sin(t * 13 + c.ph));
    const tx = c.home.x + (r.phase === 'shuffle' ? c.side * e * (0.035 + 0.045 * wob) : 0);
    const ty = c.home.y + (r.phase === 'shuffle' ? e * 0.02 * wob : 0) + (c.lift ?? 0) * (r.phase === 'gather' ? 1 : 0);
    const k = 1 - Math.exp(-dt * 14);
    c.m.position.x += (tx - c.m.position.x) * k; c.m.position.y += (ty - c.m.position.y) * k; c.m.position.z += (c.home.z - c.m.position.z) * k;
    c.m.rotation.y += ((r.phase === 'shuffle' ? c.side * e * 0.22 : c.turn) - c.m.rotation.y) * k;
    if (c.lift && r.phase === 'gather') c.lift = Math.max(0, c.lift - dt * 0.12);
  }
}

/** keep a drawn card: it floats up and hangs from the tent roof on a thread, with the stars */
const kept = [];
function keepCard(c) {
  if (!cards.includes(c)) return;
  hidePanel(); sfx('chime');
  cards.splice(cards.indexOf(c), 1); clearCards();
  c.from = c.group.position.clone(); c.t = 0; c.keep = true;
  c.to = rooms.tent.keepAt?.() ?? (ROOM_VIEW.tent.orbit ? V(rnd(-1.4, 1.4), rnd(1.7, 2.1), -1.9) : V(rnd(-1.5, 1.5), rnd(1.95, 2.35), rnd(-2.0, -0.6)));
  c.group.userData.shrink = 0.4; c.group.scale.setScalar(c.group.userData.sc);
  kept.push(c);
}
function updateKept(dt) {
  for (let i = kept.length - 1; i >= 0; i--) {
    const c = kept[i];
    c.t = Math.min(1, c.t + dt / 1.6);
    const k = ease(c.t);
    c.group.position.lerpVectors(c.from, c.to, k).add(V(0, Math.sin(k * Math.PI) * 0.3, 0));
    c.group.scale.setScalar(c.group.userData.sc * (1 - 0.6 * k));
    c.group.lookAt(camera.position); c.group.rotateY(Math.PI);
    if (Math.random() < 0.6) sparks.emit(c.group.position, tmpW.set(0, 0.04, 0), { life: 0.8, size: 0.014, color: GOLD });
    if (c.t >= 1) {
      kept.splice(i, 1);
      const [back, face] = c.group.children; back.rotation.y = Math.PI; face.rotation.y = 0;
      c.group.rotation.set(0, 0, 0); c.group.userData.ph = Math.random() * 6;
      rooms.tent.mobiles.push(c.group); stringOf(rooms.tent.scene, c.to.x, c.to.y + 0.14, c.to.z, rooms.tent.roofAt?.(c.to.x, c.to.z) ?? (ROOM_VIEW.tent.orbit ? 2.75 : 3.6));
      burstAt(sparks, c.to, 24, { speed: 0.3, up: 0.3, size: 0.02 });
      toast('这张牌挂上了帐篷顶，和星星们在一起');
    }
  }
}

/* ---------- the shrine: throwing the moon blocks ---------- */
let throwing = null, shrineFx = null, thanks = 0, forceBei = null;
/** after asking: bow your thanks, and a thread of incense rises */
function thankGods() { hidePanel(); sfx('bell'); thanks = 3.2; toast('心意已经送到了 · 谢谢你认真地问'); }
function updateShrineFx(dt, t) {
  const R = rooms.shrine; if (!R) return;
  let glow = 0.9; const c = R.beiCfg ?? BEI_PAPER, C = c.fx.c, rr = c.fx.r;
  if (shrineFx) {
    const f = shrineFx, e = (f.t += dt);
    if (f.kind === 'holy') { glow += 1.4 * Math.max(0, 1 - e / 3); if (e < 2.4 && Math.random() < dt * 40) sparks.emit(tmpV.set(C.x + rnd(-rr, rr), C.y + rnd(0, rr * 0.4), C.z + rnd(-rr, rr)), tmpW.set(rnd(-0.05, 0.05), rnd(0.25, 0.6) * Math.min(1, rr * 1.4), rnd(-0.05, 0.05)), { life: rnd(1.4, 2.4), size: rnd(0.02, 0.035), color: Math.random() < 0.5 ? ROSE : GOLD, drag: 0.4 }); }
    if (f.kind === 'laugh' && e < 1.2) R.bei.forEach((b, i) => { b.position.y = b.userData.landY + Math.abs(Math.sin(e * 11 + i)) * c.hop * (1 - e / 1.2); if (Math.random() < dt * 4) sfx('pop'); });
    if (f.kind === 'yin') { const k = Math.sin(Math.min(1, e / 4) * Math.PI); R.moon.material.opacity = 1 - 0.5 * k; if (e < 3 && Math.random() < dt * 8) smoke.emit(R.moonPos ? tmpV.set(R.moonPos.x + rnd(-0.7, 0.7), R.moonPos.y + rnd(-0.3, 0.4), R.moonPos.z + 0.1) : tmpV.set(rnd(-1.5, 1.5), rnd(1.4, 2.6), rnd(-3.2, -2.4)), tmpW.set(rnd(0.05, 0.12) * (R.moonPos ? 0.4 : 1), 0, 0), { life: rnd(3, 4), size: R.moonPos ? 0.28 : 0.45, color: new THREE.Color(0.4, 0.45, 0.55), drag: 0.05 }); }
    if (e > 4) { R.moon.material.opacity = 1; shrineFx = null; }
  }
  if (thanks > 0) { thanks -= dt; glow += 1.2 * Math.min(1, thanks); if (Math.random() < dt * 14) smoke.emit(R.incensePos ? tmpV.copy(R.incensePos).add(tmpW.set(rnd(-0.03, 0.03), 0, rnd(-0.03, 0.03))) : tmpV.set(rnd(-0.05, 0.05), 0.62, -0.9 + rnd(-0.05, 0.05)), tmpW.set(rnd(-0.02, 0.02), rnd(0.18, 0.28) * (R.incensePos ? 0.5 : 1), rnd(-0.02, 0.02)), { life: rnd(2.5, 3.5), size: R.incensePos ? 0.045 : 0.06, color: new THREE.Color(0.75, 0.7, 0.62), drag: 0.1, acc: 0.02 }); }
  R.lanterns.forEach((m, i) => { m.emissiveIntensity = glow + Math.sin(t * 3 + i) * 0.08; });
  R.setGlow?.(glow);
}
const BEI_PAPER = { x0: -0.34, dx: 0.64, z: -0.25, spread: 0.15, floor: 0, yFlat: 0.086, yRound: 0.014, arc: 0.95, bounce: 0.05, hop: 0.07, aim: V(0, 0.3, -0.6), fx: { c: V(0, 0.2, -0.55), r: 0.8 } };
const BEI = {
  holy: ['圣筊', '一平一凸 · 神明点头了', '这件事可以放心去做，你的心意已经被听见。'],
  laugh: ['笑筊', '两面皆平 · 神明笑而不答', '答案或许你心里早就有了，换个问法再问问看。'],
  yin: ['阴筊', '两面皆凸 · 时机未到', '先缓一缓，照顾好自己，过些时候再来问。'],
};
function throwBei() {
  if (throwing || roomId !== 'shrine') return;
  const R = rooms.shrine, c = R.beiCfg ?? BEI_PAPER;
  hidePanel(); sfx('pop');
  aimAt(c.aim);
  const flat = forceBei === 'holy' ? [true, false] : [Math.random() < 0.5, Math.random() < 0.5]; forceBei = null;
  const res = flat[0] !== flat[1] ? 'holy' : flat[0] ? 'laugh' : 'yin';
  throwing = {
    t: 0, res, clack: false,
    blocks: rooms.shrine.bei.map((b, i) => {
      const home = b.userData.home;
      b.position.copy(home.pos); b.rotation.copy(home.rot);
      const land = new THREE.Vector3(c.x0 + i * c.dx + (Math.random() - 0.5) * c.spread, c.floor + (flat[i] ? c.yFlat : c.yRound), c.z + (Math.random() - 0.5) * c.spread * 1.3);
      return { b, from: home.pos.clone(), land, spinX: (3 + Math.floor(Math.random() * 2)) * TAU, finalX: flat[i] ? -Math.PI / 2 : Math.PI / 2, yaw: (Math.random() - 0.5) * 1.4 };
    }),
  };
}
function updateBei(dt) {
  if (!throwing) return;
  const th = throwing, c = rooms.shrine.beiCfg ?? BEI_PAPER;
  th.t = Math.min(1, th.t + dt / 1.25);
  for (const o of th.blocks) {
    const t = th.t, k = Math.min(1, t / 0.86);
    const p = o.from.clone().lerp(o.land, k);
    p.y += Math.sin(k * Math.PI) * c.arc;
    if (t > 0.86) p.y = o.land.y + Math.abs(Math.sin(((t - 0.86) / 0.14) * Math.PI)) * c.bounce;
    o.b.position.copy(p);
    o.b.rotation.set(-Math.PI / 2 + (o.finalX + o.spinX + Math.PI / 2) * ease(k), o.yaw * k, 0, 'YXZ');
    if (k < 0.86 && Math.random() < 0.6) sparks.emit(p, tmpW.set(0, 0.05, 0), { life: 0.6, size: 0.015 * Math.min(1, c.arc) });
  }
  if (th.t > 0.86 && !th.clack) { th.clack = true; sfx('clack'); th.blocks.forEach((o) => burstAt(sparks, o.land, 14, { speed: 0.25 * Math.min(1, c.arc * 1.5), up: 0.3 * Math.min(1, c.arc * 1.5), size: 0.016, life: 0.7 })); }
  if (th.t >= 1) {
    throwing = null;
    const [title, sub, line] = BEI[th.res];
    sfx('chime');
    shrineFx = { kind: th.res, t: 0 };
    th.blocks.forEach((o) => { o.b.userData.landY = o.land.y; });
    if (lots?.phase === 'confirm') { lotsAnswer(th.res); return; }            // asking whether a fortune stick is yours
    showPanel(`<span class="seal">${{ holy: '允', laugh: '笑', yin: '缓' }[th.res]}</span><small>${sub}</small><h3>${title}</h3><p>${line}</p><div class="note">仅供娱乐 · 不构成任何建议</div>`, [['谢过神明', thankGods, true], ['再掷一次', throwBei], ['收起', hidePanel]]);
    addSlip();
  }
}
/* ---------- 灵签: shake the cup until one stick falls, ask with the moon blocks whether it is yours, open its drawer ---------- */
/*
 * shake → drop → ask (panel) → confirm (the blocks are thrown) → granted → drawer (slides out) → slip (the poem)
 *                               ↘ again (not a holy answer: put the stick back and shake once more)
 */
let lots = null;
const QGRADE = { 上上: 'a', 上吉: 'b', 中吉: 'c', 中平: 'd', 宜守: 'e' };
function startLots() {
  const R = rooms.shrine;
  if (roomId !== 'shrine' || !R?.baked || throwing || busy) return;
  if (!roomInside) { roomSit(); return; }
  resetLots(); hidePanel(); sfx('soft'); backToTable();
  lots = { phase: 'shake', p: 0, t: 0, kick: 0, n: 0 }; R.cupTried = true;
  aimAt(R.cup.position.clone().add(V(0.12, 0.12, 0.25)));
  ritualMeter(0); setUI('room');
}
function lotsShake(dx) {
  const L = lots; if (L?.phase !== 'shake') return;
  const a = Math.abs(dx);
  L.p = Math.min(1, L.p + a / 1500); L.kick = Math.min(1, L.kick + a / 240);
  if (Math.random() < Math.min(1, a / 80)) sfx('rattle');
  ritualMeter(L.p);
  if (L.p >= 1) dropStick();
}
function dropStick() {
  const R = rooms.shrine, L = lots;
  $('ritualMeter')?.remove();
  L.phase = 'drop'; L.t = 0; L.clack = false; L.n = 1 + Math.floor(Math.random() * 60);
  L.stick = R.sticks[Math.floor(Math.random() * R.sticks.length)];
  R.scene.attach(L.stick);                                      // keeps where it is while it leaves the cup
  L.from = L.stick.position.clone(); L.fromQ = L.stick.quaternion.clone();
  L.up = V(0, 1, 0).applyQuaternion(R.cup.getWorldQuaternion(new THREE.Quaternion()));
  L.land = R.cup.position.clone().add(V(-0.1, 0.004, 0.36));     // on the table's left front corner, lying towards the red cloth
  L.landQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.3, -Math.PI / 2));
  sfx('pop'); setUI('room');
}
function updateLots(dt, t) {
  const R = rooms.shrine, L = lots; if (!R?.cup) return;
  const shaking = L?.phase === 'shake';
  R.cupTilt += ((shaking ? 0.55 : 0) - R.cupTilt) * Math.min(1, dt * 6);            // held tilted towards you while you shake
  const k = shaking ? L.kick : 0;
  R.cup.rotation.set(R.cupTilt + Math.sin(t * 31) * 0.08 * k, 0, Math.sin(t * 23) * 0.05 * k);
  if (shaking) {
    L.kick *= Math.exp(-dt * 2.5);
    R.sticks.forEach((st, i) => { if (st.parent === R.cup) st.position.y = st.userData.home.y + Math.abs(Math.sin(t * 37 + i * 1.7)) * 0.012 * k; });
  }
  if (L?.phase === 'drop') {
    L.t += dt;
    const k1 = Math.min(1, L.t / 0.35), k2 = Math.max(0, Math.min(1, (L.t - 0.35) / 0.55));
    const out = L.from.clone().addScaledVector(L.up, 0.2 * ease(k1)), p = out.lerp(L.land, ease(k2));     // rides up out of the cup, then tumbles onto the table
    p.y += Math.sin(k2 * Math.PI) * 0.12; L.stick.position.copy(p); L.stick.quaternion.copy(L.fromQ).slerp(L.landQ, ease(k2));
    if (k2 >= 1 && !L.clack) { L.clack = true; sfx('clack'); burstAt(sparks, L.land, 10, { speed: 0.12, up: 0.15, size: 0.012, life: 0.6 }); }
    if (L.t > 1.15) { L.phase = 'ask'; lotsAskPanel(); setUI('room'); }
  }
  if (L?.phase === 'drawer') {
    L.t += dt; const e = ease(Math.min(1, L.t / 0.8)), e2 = ease(Math.max(0, Math.min(1, (L.t - 0.7) / 0.6)));
    R.drawer.position.x = L.x0 + 0.22 * e; R.drawerGlow.material.opacity = e * (0.8 + 0.2 * Math.sin(t * 3));
    R.slip.position.x = R.drawer.position.x + 0.2; R.slip.position.y = L.slipY + 0.12 * e2; R.slip.visible = e2 > 0;
    if (L.t > 1.4 && !L.shown) { L.shown = true; L.phase = 'slip'; showSlip(); setUI('room'); }
  }
  // kneeling at the table and the cup not tried yet: a gold arrow bobs over it and now and then it twinkles
  const cueOn = roomInside && !L && !throwing && !busy && !R.cupTried;
  R.cueK += ((cueOn ? 1 : 0) - R.cueK) * Math.min(1, dt * 5);
  const [halo, arrow] = R.cue.children;
  R.cue.visible = R.cueK > 0.01; R.cue.position.y = R.cueY + Math.sin(t * 3.2) * 0.025;
  halo.material.opacity = 0.55 * R.cueK; arrow.material.opacity = R.cueK; arrow.scale.set(0.125, 0.165, 1).multiplyScalar(1 + 0.06 * Math.sin(t * 6.4));
  if (cueOn && Math.random() < dt * 2.5) burstAt(sparks, tmpV.copy(R.cup.position).add(V(0, 0.36, 0)), 7, { speed: 0.14, up: 0.22, size: 0.02, life: 0.9 });
}
function lotsAskPanel() {
  const n = lots.n;
  showPanel(`<span class="seal">签</span><small>第 ${n} 签 · 落签</small><h3>第${qianNum(n)}签</h3><p>一支签落了下来。再掷一次木筊请示：得圣筊，这一签便是你的。</p><div class="note">仅供娱乐 · 不构成任何建议</div>`,
    [['掷筊请示', lotsAsk, true], ['放回，重新摇签', startLots]]);
}
function lotsAsk() { if (lots?.phase !== 'ask' || throwing) return; lots.phase = 'confirm'; hidePanel(); throwBei(); setUI('room'); }
function lotsAnswer(res) {
  const L = lots;
  if (res === 'holy') { L.phase = 'granted'; toast(`圣筊 · 第${qianNum(L.n)}签是你的`); setUI('room'); setTimeout(openDrawer, 1100); return; }
  L.phase = 'again';
  showPanel(`<span class="seal">${res === 'laugh' ? '笑' : '缓'}</span><small>${BEI[res][0]} · 请示未允</small><h3>再摇一次</h3><p>${res === 'laugh' ? '神明笑而不答。把这支签放回签筒，静下心来，再摇一次。' : '这一签并非所问之签。放回签筒，重新摇签吧。'}</p><div class="note">仅供娱乐 · 不构成任何建议</div>`,
    [['放回，再摇一次', startLots, true], ['收起', () => { resetLots(); hidePanel(); setUI('room'); }]]);
  setUI('room');
}
/** step over to the slip cabinet, then let the drawer slide out */
async function openDrawer() {
  const R = rooms.shrine, L = lots; if (L?.phase !== 'granted') return;
  const p = R.setDrawer(L.n);
  await flyRoom({ eye: V(-0.42, 1.22, Math.min(0.78, p.z + 0.7)), at: p.clone().add(V(0.12, 0.02, 0)), yaw: 0.55, pitch: 0.4, fov: [70, 54] }, 1100);   // stand inside the hall, clear of the front wall
  if (lots !== L) return;
  L.phase = 'drawer'; L.t = 0; L.shown = false; L.x0 = R.drawer.position.x; L.slipY = R.slip.position.y;
  R.drawer.visible = true; R.drawerGlow.visible = true; R.drawerGlow.material.opacity = 0;
  sfx('page'); setUI('room');
}
/** back to kneeling at the offering table, if the slip cabinet took you away */
function backToTable() { if (roomId === 'shrine' && roomInside && ROOM_VIEW.shrine !== SHRINE_VIEW.inside && !roomFly) flyRoom(SHRINE_VIEW.inside, 900); }
function showSlip() {
  const L = lots, [grade, title, poem, jie, gist] = LINGQIAN[L.n - 1];
  const cols = poem.split(/[，。]/).filter(Boolean).map((l) => `<span>${l}</span>`).join('');
  showPanel(`<div class="qian"><div class="qhead"><b>第${qianNum(L.n)}签</b><i class="g${QGRADE[grade]}">${grade}</i></div><div class="qtitle">${title}</div><div class="qgist">签意 · ${gist}</div><div class="qpoem">${cols}</div><div class="qjie"><b>解曰</b>${jie}</div></div><div class="note">签诗为本书新写，不托名任何神明 · 仅供娱乐，不构成任何建议</div>`,
    [['收下签诗', closeLots, true], ['再求一签', startLots], ['收起', closeLots]]);
  $('panel').classList.add('long');
  sfx('chime'); burstAt(sparks, rooms.shrine.drawerGlow.position, 30, { speed: 0.2, up: 0.3, size: 0.016, life: 1 });
}
function closeLots() { resetLots(); hidePanel(); backToTable(); setUI('room'); }
function resetLots() {
  const R = rooms.shrine; lots = null; $('ritualMeter')?.remove();
  if (!R?.cup) return;
  R.sticks.forEach((st) => { if (st.parent !== R.cup) R.cup.add(st); st.position.copy(st.userData.home); st.rotation.copy(st.userData.rot); });
  R.drawer.visible = false; R.slip.visible = false; R.drawerGlow.visible = false;
}

function roomTap(ndc) {
  ray.setFromCamera(ndc, camera);
  if (lots) { if (lots.phase === 'shake') lotsShake(420); else if (lots.phase === 'ask' && ray.intersectObjects(rooms.shrine.bei.map((b) => b.children).flat(), false).length) lotsAsk(); return; }
  if (ritual?.phase === 'cut') { const h = ray.intersectObjects(ritual.hits, false)[0]; if (h) chooseCut(h.object.userData.pile); return; }
  if (ritual && ritual.phase !== 'done') return;
  const objs = [];
  if (roomId === 'tent') objs.push(...rooms.tent.deck.children, ...cards.map((c) => c.group.children).flat(), ...(rooms.tent.table ? [rooms.tent.table] : []));
  if (roomId === 'shrine') { const R = rooms.shrine; R.bei.forEach((b) => objs.push(...b.children)); if (R.cup) objs.push(...R.cup.children.filter((o) => o.isMesh)); if (R.cue?.visible) objs.push(...R.cue.children); if (R.table) objs.push(R.table); }
  if (roomId === 'study') objs.push(...rooms.study.hits);
  if (roomId === 'tea') objs.push(...lnCards.flatMap((c) => c.group.children), ...rooms.tea.hits);
  if (roomId === 'window') objs.push(...rooms.window.hits);
  if (roomId === 'hearth') objs.push(...rooms.hearth.hits);
  const hit = ray.intersectObjects(objs, false)[0];
  if (!hit) return;
  if (roomId === 'tea') { teaTap(hit); return; }
  if (roomId === 'window') { windowTap(hit); return; }
  if (roomId === 'hearth') { hearthTap(hit); return; }
  if (hit.object.userData.card !== undefined) { const i = hit.object.userData.card; if (cards[i]?.spread) flipSpreadCard(i); else flipCard(i); }
  else if (roomId === 'shrine') { if (rooms.shrine.baked && !roomInside) roomSit(); else if (hit.object.userData.cup) startLots(); else throwBei(); }
  else if (roomId === 'study') { if (!roomInside) roomSit(); else if (hit.object.userData.coins || rooms.study.coinMeshes.includes(hit.object.parent)) { if (liuyao?.phase === 'ready') tossLiuyao(); else if (!liuyao || liuyao.phase === 'done') { liuyao = null; startLiuyao(); } } }
  else if (hit.object.userData.deck || hit.object.userData.table) { if (rooms.tent.baked && !roomInside) tentSit(); else if (!ritual && !cards.length) showSpreadChooser(); }
  else if (hit.object.userData.bei) throwBei();
}
