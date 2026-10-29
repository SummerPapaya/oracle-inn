/* ---------- the moonlit window baked in Blender (blender/build_window.py): a cottage and a tower on a grassy island ---------- */
/*
 * Page 5's cottage in the round: white walls under a pyramid of navy tiles, a stone tower with a gold star on its hat, a
 * stream under a tree full of fireflies, a fence, a lantern and an owl on its stump. Inside, a low table under a round
 * window open to the night, the pendulum hanging from a brass stand over its board. Two ways of asking: 灵摆问答, a
 * yes-or-no question once the pendulum has shown its yes and its no, and 灵摆盘, the four seasons and quarters, for what
 * this moment needs. In the window, tonight's moon in its phase, worked out from the date and time: tap it to read about it.
 */
const WINDOW_ASSETS = 'window/', WINDOW_PRE = 'window_10292323';
const WINDOW_VIEW = {
  orbit: { at: V(0.2, 4.2, 0), narrowAt: V(0.2, 5.4, 0), orbit: { yaw: 0, pitch: 0.32, dist: 30.5, narrow: 1.2 }, yaw: 0.8, pitch: 0.2, fov: [44, 28] },
  inside: { eye: V(0, 2.05, 1.65), at: V(0, 1.35, -0.85), yaw: 0.7, pitch: 0.42, fov: [70, 54] },
};
/** how far round the moon is from the sun, 0 (new) to 1 (new again), from the mean elongation and the larger periodic
 * terms (Meeus, Astronomical Algorithms, ch. 47-48): within a fraction of a degree, an hour or so of the moon's month */
const SYNODIC = 29.530589;
function moonTurn(d = new Date()) {
  const T = (d / 864e5 - 10957.5) / 36525, r = DEG;                    // Julian centuries from J2000.0
  const D = 297.8501921 + 445267.1114034 * T, M = 357.5291092 + 35999.0502909 * T, Mp = 134.9633964 + 477198.8675055 * T;
  const e = D + 6.289 * Math.sin(Mp * r) - 2.1 * Math.sin(M * r) + 1.274 * Math.sin((2 * D - Mp) * r) + 0.658 * Math.sin(2 * D * r) + 0.214 * Math.sin(2 * Mp * r) + 0.11 * Math.sin(D * r);
  return (((e % 360) + 360) % 360) / 360;
}
const moonAge = (d) => moonTurn(d) * SYNODIC;
/** which of MOON_PHASES the moon is in: eight equal parts of its month, each centred on its phase */
function moonPhase(age) { return Math.floor((age / SYNODIC) * 8 + 0.5) % 8; }
/** tonight's moon: lit on the right while it waxes, as seen from the north, the dark part faint with earthshine */
function moonFace(age) {
  const c = canvas(512, 512), g = c.getContext('2d'), k = age / SYNODIC, lit = (1 - Math.cos(k * TAU)) / 2, R = 96, s = k < 0.5 ? 1 : -1, f = Math.cos(k * TAU);
  const halo = g.createRadialGradient(256, 256, 60, 256, 256, 256);
  halo.addColorStop(0, `rgba(255,240,205,${0.1 + 0.26 * lit})`); halo.addColorStop(0.3, `rgba(200,215,255,${0.02 + 0.06 * lit})`); halo.addColorStop(1, 'rgba(160,180,255,0)');
  g.fillStyle = halo; g.fillRect(0, 0, 512, 512);
  g.fillStyle = 'rgba(120,135,185,.26)'; g.beginPath(); g.arc(256, 256, R, 0, TAU); g.fill();
  // the lit part: the limb on the lit side, then back along the terminator, half an ellipse cos(phase) of the radius wide
  g.save(); g.beginPath();
  for (let i = 0; i <= 64; i++) { const a = -Math.PI / 2 + (Math.PI * i) / 64; g.lineTo(256 + s * R * Math.cos(a), 256 + R * Math.sin(a)); }
  for (let i = 64; i >= 0; i--) { const a = -Math.PI / 2 + (Math.PI * i) / 64; g.lineTo(256 + s * f * R * Math.cos(a), 256 + R * Math.sin(a)); }
  g.closePath(); g.fillStyle = '#f2e8cc'; g.fill(); g.clip();
  // the dark seas roughly where they lie on the near side, soft-edged, then a little darkening toward the rim
  [[-0.3, -0.4, 0.3, 0.24, 0.42], [0.18, -0.36, 0.17, 0.15, 0.4], [0.3, -0.04, 0.2, 0.17, 0.38], [0.66, -0.28, 0.11, 0.09, 0.4], [-0.56, 0.04, 0.24, 0.42, 0.34],
    [-0.12, 0.3, 0.18, 0.13, 0.3], [0.5, 0.2, 0.12, 0.17, 0.32], [-0.04, -0.7, 0.34, 0.07, 0.24]].forEach(([x, y, rx, ry, a]) => {
    g.save(); g.translate(256 + x * R, 256 + y * R); g.scale(rx, ry);
    const m = g.createRadialGradient(0, 0, 0, 0, 0, R); m.addColorStop(0, `rgba(150,146,138,${a})`); m.addColorStop(0.6, `rgba(150,146,138,${a * 0.75})`); m.addColorStop(1, 'rgba(150,146,138,0)');
    g.fillStyle = m; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.restore();
  });
  const rim = g.createRadialGradient(256, 256, R * 0.55, 256, 256, R); rim.addColorStop(0, 'rgba(120,100,70,0)'); rim.addColorStop(1, 'rgba(120,100,70,.2)');
  g.fillStyle = rim; g.fillRect(256 - R, 256 - R, 2 * R, 2 * R);
  g.fillStyle = 'rgba(255,252,240,.7)'; g.beginPath(); g.arc(256 - 0.12 * R, 256 + 0.68 * R, 2.5, 0, TAU); g.fill();   // Tycho, the bright crater low down
  g.restore();
  return tex(c);
}
/** the night beyond the island: low hills, round trees along their crests, one lit window far off; fading out at its foot */
function windowHills() {
  const c = canvas(2048, 512), g = c.getContext('2d');
  const hills = (base, amp, color, seed, trees) => {
    const rr = mulberry(seed), ph = [rr() * TAU, rr() * TAU, rr() * TAU], top = [];
    g.fillStyle = color; g.beginPath(); g.moveTo(0, 512);
    for (let x = 0; x <= 2048; x += 16) { const y = base - amp * (0.5 * Math.sin(x / 260 + ph[0]) + 0.3 * Math.sin(x / 120 + ph[1]) + 0.2 * Math.sin(x / 60 + ph[2])); g.lineTo(x, y); top.push([x, y]); }
    g.lineTo(2048, 512); g.closePath(); g.fill();
    for (let k = 0; k < trees; k++) { const [x, y] = top[Math.floor(rr() * top.length)], s = 7 + rr() * 12; g.beginPath(); g.arc(x, y - s * 0.9, s, 0, TAU); g.fill(); g.fillRect(x - 2, y - s, 4, s + 4); }
    return top;
  };
  hills(300, 44, '#1e2650', 31, 16);
  const near = hills(350, 30, '#161c3c', 32, 10), [hx, hy] = near[Math.floor(near.length * 0.62)];
  g.fillStyle = '#161c3c'; g.fillRect(hx - 16, hy - 22, 32, 26); g.beginPath(); g.moveTo(hx - 20, hy - 20); g.lineTo(hx, hy - 36); g.lineTo(hx + 20, hy - 20); g.fill();
  g.fillStyle = 'rgba(255,214,140,.9)'; g.fillRect(hx - 4, hy - 14, 7, 8);
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(0, 330, 0, 500); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = fade; g.fillRect(0, 330, 2048, 182);
  g.globalCompositeOperation = 'source-over';
  return tex(c);
}
async function buildBakedWindowRoom() {
  const gltf = await loadBakedGLB(WINDOW_ASSETS, WINDOW_PRE);
  const s = bakedScene(gltf, 0x0c1030);
  s.add(new THREE.HemisphereLight(0xe8e4ff, 0x4a4060, 1.5));               // only the live pendulum is lit by it
  const fx = [], warm = tentGlow('rgba(255,236,190,1)', 'rgba(255,170,80,.45)'), cool = tentGlow('rgba(235,225,255,1)', 'rgba(170,140,255,.4)'), flame = tentFlame();
  const sprite = (map, pos, size, color, kind, list = fx) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(pos); sp.scale.setScalar(size); s.add(sp); const f = { sp, size, base: color.clone(), kind, seed: Math.random() * 100, at: pos.clone() }; list.push(f); return f;
  };
  let pivot = null, board = null, table = null, moonWin = null, owl = null, cat = null; const chimneys = [], flies = [];
  gltf.scene.traverse((o) => {
    if (!o.name.startsWith('FX_')) return;
    const p = o.getWorldPosition(new THREE.Vector3()), n = o.name;
    if (n.startsWith('FX_candle')) { sprite(flame, p.clone().add(V(0, 0.004, 0)), 0.045, new THREE.Color(2.2, 1.7, 1.2), 'flame'); sprite(warm, p, 0.3, new THREE.Color(0.8, 0.5, 0.25), 'glow'); }
    else if (n.startsWith('FX_lantern_LanternLightTower')) sprite(warm, p, n.endsWith('Door') ? 0.7 : 1.0, new THREE.Color(0.7, 0.45, 0.2), n.endsWith('Door') ? 'glow' : 'breath');
    else if (n.startsWith('FX_lantern_LanternLightPost')) sprite(warm, p, 1.3, new THREE.Color(0.85, 0.55, 0.25), 'glow');
    else if (n.startsWith('FX_lantern')) sprite(warm, p, n.endsWith('Hang') ? 0.9 : 0.6, new THREE.Color(0.75, 0.5, 0.25), 'glow');
    else if (n.startsWith('FX_firefly')) flies.push(sprite(warm, p, 0.1, new THREE.Color(0.75, 1.0, 0.45), 'fly', []));
    else if (n.startsWith('FX_shroom')) sprite(cool, p.clone().add(V(0, 0.04, 0)), 0.3, new THREE.Color(0.45, 0.35, 0.8), 'breath');
    else if (n === 'FX_star') sprite(warm, p, 1.6, new THREE.Color(0.9, 0.7, 0.3), 'breath');
    else if (n === 'FX_orb') sprite(cool, p, 0.55, new THREE.Color(0.5, 0.4, 0.9), 'breath');
    else if (n.startsWith('FX_smoke')) chimneys.push(p.clone());
    else if (n === 'FX_pendulum') pivot = p.clone();
    else if (n === 'FX_board') board = p.clone();
    else if (n === 'FX_table') table = p.clone();
    else if (n === 'FX_moonwin') moonWin = p.clone();
    else if (n === 'FX_owl') owl = p.clone();
    else if (n === 'FX_cat') cat = p.clone();
  });
  // tonight's moon, set so it shows in the upper left of the round window as you sit at the table
  const win = moonWin ?? V(0, 1.75, -1.7), eye = WINDOW_VIEW.inside.eye;
  const sky = nightSky(s, windowHills(), eye.clone().addScaledVector(win.clone().add(V(-0.26, 0.24, 0)).sub(eye).normalize(), 34), 0, moonFace(moonAge()));
  // what you can touch: the table to sit at, the board, the pendulum, the window and its moon, the owl and the cat
  const hidden = new THREE.MeshBasicMaterial({ visible: false }), t0 = table ?? V(0, 0.8, -0.42);
  const hit = (geo, at, key) => { const m = new THREE.Mesh(geo, hidden); m.position.copy(at); m.userData[key] = true; s.add(m); return m; };
  const tableHit = hit(new THREE.CylinderGeometry(0.62, 0.62, 0.55, 16), t0.clone().add(V(0, -0.25, 0)), 'table');
  const winHit = hit(new THREE.CircleGeometry(0.78, 32), win, 'moon');
  const owlHit = hit(new THREE.SphereGeometry(0.4, 8, 6), (owl ?? V(5.25, 0.86, 2.4)).clone().add(V(0, -0.2, 0)), 'owl');
  const catHit = hit(new THREE.SphereGeometry(0.22, 8, 6), cat ?? V(-0.42, 0.9, -1.4), 'cat');
  const B = windowBoard(s, board ?? V(0, 0.825, -0.42)), P = windowPendulum(s, pivot ?? V(0, 1.416, -0.42));
  // two closer looks, each for a wide screen and an upright one: at the pendulum over its board for a question, and down
  // at the board for 灵摆盘. On a wide screen the look slides right so the board sits left of the panel at the side; on a
  // phone it stands further back, the board high in the frame, clear of the panel that rises below it
  const look = (eye, at, fov, dx = 0) => ({ eye: B.at.clone().add(eye).setX(B.at.x + dx), at: B.at.clone().add(at).setX(B.at.x + dx), yaw: 0.3, pitch: 0.25, fov: [fov, fov] });
  const views = { ask: [look(V(0, 0.66, 0.9), V(0, 0.17, -0.02), 44, 0.11), look(V(0, 0.92, 1.3), V(0, 0.1, 0.12), 60)],
    board: [look(V(0, 0.93, 0.6), V(0, 0, -0.01), 42, 0.17), look(V(0, 1.25, 0.78), V(0, 0, 0.36), 62)] };
  let smokeT = 0;
  const update = (dt, t) => {
    fxPulse(fx, t); sky(t); updatePendulum(P, dt, t);
    for (const f of flies) {
      const k = Math.max(0, Math.sin(t * 1.3 + f.seed)) ** 3;
      f.sp.position.set(f.at.x + 0.3 * Math.sin(t * 0.37 + f.seed), f.at.y + 0.18 * Math.sin(t * 0.53 + f.seed * 1.7), f.at.z + 0.3 * Math.cos(t * 0.31 + f.seed * 0.6));
      f.sp.material.color.copy(f.base).multiplyScalar(0.15 + 0.85 * k);
    }
    if ((smokeT -= dt) < 0) { smokeT = 0.24; for (const p of chimneys) smoke.emit(tmpV.copy(p).add(V(rnd(-0.03, 0.03), 0, rnd(-0.03, 0.03))), tmpW.set(rnd(0.02, 0.06), rnd(0.18, 0.28), rnd(-0.02, 0.02)), { life: rnd(3, 4.5), size: 0.2, drag: 0.15, color: new THREE.Color(0.24, 0.24, 0.34) }); }
    if (Math.random() < dt * 2.5) sparks.emit(tmpV.copy(P.bob.position), tmpW.set(0, 0.015, 0), { life: 0.9, size: 0.008, color: LILAC, drag: 0.4 });
  };
  return { scene: s, table: tableHit, hits: [tableHit, winHit, owlHit, catHit, B.mesh, P.hit], warm: { intensity: 0 }, warmBase: 0, mobiles: [], flames: [], glow: [], baked: true, update, board: B, pend: P, views };
}

/* ---------- 灵摆盘: the board of the four seasons and quarters, painted live so the pendulum's cell can light up ---------- */
/*
 * Laid out the old way, as if facing south: 南 at the far side, 北 near you, 东 on the left and 西 on the right, so the
 * seasons go round clockwise, spring to winter. Each quarter holds three words of what this moment needs.
 */
const BOARD_AT = { 东: 180, 南: 90, 西: 0, 北: 270 }, BOARD_R = 0.372, BOARD_WORD_R = 300 / 500;
const BOARD_CELLS = PENDULUM_BOARD.flatMap(([dir, season, theme, line, words], q) => words.map(([word, wordLine], j) => ({ q, dir, season, theme, line, word, wordLine, a: (BOARD_AT[dir] + 30 - 30 * j) * DEG })));
function windowBoard(s, at) {
  const c = canvas(1024, 1024), map = tex(c), mesh = new THREE.Mesh(new THREE.CircleGeometry(BOARD_R, 96), new THREE.MeshBasicMaterial({ map, color: 0xe4dcec }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.copy(at).add(V(0, 0.0015, 0)); mesh.userData.board = true; s.add(mesh);
  const C = { c, g: c.getContext('2d'), map, mesh, at: at.clone(), hi: -1 };
  paintBoard(C);
  document.fonts.load('900 54px "Noto Serif SC"', PENDULUM_BOARD.flat(2).join('')).then(() => paintBoard(C, C.hi)).catch(() => {});
  return C;
}
function paintBoard(C, hi = -1) {
  const g = C.g, c = 512, P = (a, r) => [c + Math.cos(a) * r, c - Math.sin(a) * r];
  const wedge = (a0, a1, r0, r1) => { g.beginPath(); g.arc(c, c, r1, -a1, -a0); g.arc(c, c, r0, -a0, -a1, true); g.closePath(); };
  C.hi = hi; g.clearRect(0, 0, 1024, 1024);
  g.fillStyle = '#232857'; g.beginPath(); g.arc(c, c, 500, 0, TAU); g.fill();
  const tint = { 东: 'rgba(70,150,128,.42)', 南: 'rgba(176,84,116,.38)', 西: 'rgba(196,146,72,.36)', 北: 'rgba(84,116,196,.42)' };
  for (const [dir] of PENDULUM_BOARD) { const a = BOARD_AT[dir] * DEG; g.fillStyle = tint[dir]; wedge(a - Math.PI / 4, a + Math.PI / 4, 150, 420); g.fill(); }
  if (hi >= 0) {
    const a = BOARD_CELLS[hi].a, [x, y] = P(a, 290), glow = g.createRadialGradient(x, y, 10, x, y, 170);
    glow.addColorStop(0, 'rgba(255,226,150,.85)'); glow.addColorStop(1, 'rgba(255,200,110,.18)');
    g.fillStyle = glow; wedge(a - Math.PI / 12, a + Math.PI / 12, 150, 420); g.fill();
    g.strokeStyle = '#ffe6a8'; g.lineWidth = 6; wedge(a - Math.PI / 12, a + Math.PI / 12, 150, 420); g.stroke();
  }
  // rings, the band round the rim, the spokes between the cells (the ones between quarters heavier)
  g.fillStyle = 'rgba(14,16,44,.55)'; g.beginPath(); g.arc(c, c, 488, 0, TAU); g.arc(c, c, 420, 0, TAU, true); g.fill();
  g.strokeStyle = '#d8b46a';
  [[500, 8], [486, 2], [420, 4], [150, 4], [138, 1.5]].forEach(([r, w]) => { g.lineWidth = w; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); });
  for (let k = 0; k < 12; k++) {
    const a = (15 + 30 * k) * DEG, major = k % 3 === 1, [x0, y0] = P(a, 150), [x1, y1] = P(a, major ? 486 : 420);
    g.lineWidth = major ? 4 : 1.6; g.globalAlpha = major ? 1 : 0.7; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.globalAlpha = 1; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [dir, season, theme] of PENDULUM_BOARD) {
    const a = BOARD_AT[dir] * DEG, [x, y] = P(a, 453), upright = dir === '东' || dir === '西';
    g.fillStyle = '#ecc97e'; g.font = '900 40px "Noto Serif SC", serif';
    if (upright) { g.fillText(dir, x, y - 24); g.fillText(season, x, y + 24); } else g.fillText(`${dir} · ${season}`, x, y);
    const [tx, ty] = P(a, 196); g.fillStyle = '#cbbcf2'; g.font = '700 30px "Noto Serif SC", serif'; g.fillText(theme, tx, ty);
  }
  BOARD_CELLS.forEach((cell, i) => {
    const [x, y] = P(cell.a, 300);
    g.save(); if (i === hi) { g.shadowColor = '#ffd27a'; g.shadowBlur = 24; }
    g.fillStyle = i === hi ? '#3a2410' : '#f4ead2'; g.font = '900 54px "Noto Serif SC", serif'; g.fillText(cell.word, x, y); g.restore();
  });
  // the middle: a crescent and a star, under the pendulum's point
  g.fillStyle = '#d8b46a'; g.beginPath(); moonPath(g, c - 18, c, 62, 0.42, 0.82); g.fill();
  g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 10 : 24; g.lineTo(c + 40 + Math.cos(a) * r, c - 4 + Math.sin(a) * r); } g.closePath(); g.fill();
  C.map.needsUpdate = true;
}
function cellAt(C, i) { const a = BOARD_CELLS[i].a, r = BOARD_R * BOARD_WORD_R; return C.at.clone().add(V(Math.cos(a) * r, 0.01, -Math.sin(a) * r)); }

/* ---------- 灵摆: the pendulum on its chain, swinging the way a reading needs ---------- */
/*
 * Not a free simulation: the swing has an axis on the board's angles (0 to the right, a quarter turn to the far side), a
 * reach, an offset along the axis and a roundness (0 a line, 1 a circle), and each of them eases towards what the
 * reading asks for, at the pace a 50 cm pendulum swings.
 */
const PEND_L = 0.5, PEND_W = Math.sqrt(9.8 / PEND_L), DOWN = V(0, -1, 0);
const SWING = { forward: { ax: Math.PI / 2, amp: 0.085, ecc: 0.05, c: 0 }, side: { ax: 0, amp: 0.085, ecc: 0.05, c: 0 }, circle: { amp: 0.07, ecc: 1, c: 0 }, still: { amp: 0.005, ecc: 0.4, c: 0 }, rest: { amp: 0.003, ecc: 0.5, c: 0 } };
function windowPendulum(s, pivot) {
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 0.9, roughness: 0.3 });
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.0014, 1, 5).translate(0, -0.5, 0), brass);
  const bob = new THREE.Group(), gem = new THREE.Mesh(new THREE.LatheGeometry([[0, -0.058], [0.011, -0.04], [0.014, -0.022], [0.01, -0.009], [0.003, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 8),
    new THREE.MeshStandardMaterial({ color: 0xb89cf0, emissive: 0x5a34b0, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.1, flatShading: true }));
  bob.add(gem, new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), brass)); s.add(chain, bob);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.pendulum = true; s.add(hit);
  return { pivot: pivot.clone(), chain, bob, gem, hit, ph: 0, rate: 1.2, ...SWING.rest, ax: 0, to: { ...SWING.rest, ax: 0 } };
}
function swingTo(P, kind, extra = {}) { Object.assign(P.to, SWING[kind], extra); }
function updatePendulum(P, dt, t) {
  const k = 1 - Math.exp(-dt * P.rate), T = P.to, d = Math.atan2(Math.sin(T.ax - P.ax), Math.cos(T.ax - P.ax));
  P.amp += (T.amp - P.amp) * k; P.ecc += (T.ecc - P.ecc) * k; P.c += (T.c - P.c) * k; P.ax += d * k; P.ph += PEND_W * dt;
  const u = P.c + P.amp * Math.cos(P.ph), v = P.amp * P.ecc * Math.sin(P.ph) + 0.0015 * (Math.sin(t * 1.3) + Math.sin(t * 2.9 + 1));
  const ca = Math.cos(P.ax), sa = Math.sin(P.ax), x = u * ca - v * sa, z = -(u * sa + v * ca), y = -Math.sqrt(PEND_L * PEND_L - Math.min(x * x + z * z, 0.8 * PEND_L * PEND_L));
  P.bob.position.set(P.pivot.x + x, P.pivot.y + y, P.pivot.z + z); P.hit.position.copy(P.bob.position);
  const dir = tmpW.copy(P.bob.position).sub(P.pivot), len = dir.length();
  P.chain.position.copy(P.pivot); P.chain.scale.set(1, len, 1); P.chain.quaternion.setFromUnitVectors(DOWN, dir.divideScalar(len)); P.bob.quaternion.copy(P.chain.quaternion);
  P.gem.rotation.y += dt * 0.5;
}

/* ---------- the readings: calibrate, ask, or swing it over the board ---------- */
let pend = null, pendYes = null;            // the reading under way; which way the pendulum showed its "yes" this visit
const otherSwing = (k) => (k === 'forward' ? 'side' : 'forward');
const PEND_LAST = {};
function pendLine(k) { const lines = PENDULUM_ANSWERS[k][2]; let i; do i = Math.floor(Math.random() * lines.length); while (lines.length > 1 && i === PEND_LAST[k]); PEND_LAST[k] = i; return lines[i]; }
/** the pendulum casting about before it settles: a small swing, wandering */
async function pendSearch(P, my, ms) {
  for (let k = 0; k < 3; k++) { Object.assign(P.to, { amp: rnd(0.015, 0.035), ecc: rnd(0.3, 0.8), ax: rnd(0, TAU), c: 0 }); await wait(ms / 3); if (pend !== my) return; }
}
function backToWindow() { return roomId === 'window' && roomInside && ROOM_VIEW.window !== WINDOW_VIEW.inside && !roomFly ? flyRoom(WINDOW_VIEW.inside, 900) : Promise.resolve(); }
/** glide to one of the room's closer looks, the one for where the panel opens (and hold still meanwhile) */
async function flyWindow(kind) {
  const v = rooms.window.views[kind][matchMedia('(max-aspect-ratio: 1/1), (max-width: 760px)').matches ? 1 : 0];
  if (ROOM_VIEW.window === v || roomFly) return;
  busy = true; setUI('moving'); await flyRoom(v, 1000); busy = false;
}
function pendIntro() {
  if (roomId !== 'window' || busy || (pend && pend.phase !== 'done')) return;
  if (!roomInside) { roomSit(); return; }
  endPend(false);
  const cal = !!pendYes;
  showPanel(`<span class="seal">摆</span><small>灵摆问答 · Pendulum</small><h3>${cal ? '问一个是或否的问题' : '先校准，再提问'}</h3><p>${PENDULUM_UI.ask}</p><p>${cal ? `刚才校准过：「是」${PENDULUM_UI.swing[pendYes]}，「否」${PENDULUM_UI.swing[otherSwing(pendYes)]}。` : PENDULUM_UI.calibrate}</p>`,
    cal ? [['让灵摆摆起来', pendAsk, true], ['重新校准', pendCalibrate], ['收起', hidePanel]] : [['先校准', pendCalibrate, true], ['收起', hidePanel]]);
}
async function pendCalibrate() {
  if (roomId !== 'window' || !roomInside || busy) return;
  const yes = Math.random() < 0.5 ? 'forward' : 'side';             // and 「否」 is always the other way
  hidePanel(); await flyWindow('ask');
  const P = rooms.window.pend, my = (pend = { mode: 'calib', phase: 'yes', yes });
  pendYes = null; swingTo(P, 'rest'); P.rate = 1.2; setUI('room'); sfx('soft');
  await wait(900); if (pend !== my) return;
  await pendSearch(P, my, 1200); if (pend !== my) return;
  swingTo(P, yes); await wait(3000); if (pend !== my) return;
  my.phase = 'yesShown'; sfx('pop'); setUI('room');
}
async function pendShowNo() {
  const my = pend; if (!my || my.phase !== 'yesShown') return;
  const P = rooms.window.pend, no = otherSwing(my.yes);
  my.phase = 'no'; swingTo(P, 'rest'); setUI('room');
  await wait(1300); if (pend !== my) return;
  await pendSearch(P, my, 1000); if (pend !== my) return;
  swingTo(P, no); await wait(3000); if (pend !== my) return;
  pendYes = my.yes; my.phase = 'ready'; sfx('pop');
  toast(PENDULUM_UI.shows.replace('X', '否').replace('Y', PENDULUM_UI.swing[no]));
  P.rate = 0.6; swingTo(P, 'rest'); setUI('room');
}
let pendForce = null;                       // tests can fix the next answer
async function pendAsk() {
  if (roomId !== 'window' || !roomInside || busy || !pendYes) return;
  hidePanel(); await flyWindow('ask');
  const P = rooms.window.pend, r = Math.random(), out = pendForce ?? (r < 0.38 ? 'yes' : r < 0.76 ? 'no' : r < 0.92 ? 'circle' : 'still'), my = (pend = { mode: 'ask', phase: 'swing', out });
  pendForce = null; P.rate = 1.2; swingTo(P, 'rest'); setUI('room'); sfx('soft');
  await wait(800); if (pend !== my) return;
  await pendSearch(P, my, 1800); if (pend !== my) return;
  const kind = out === 'yes' ? pendYes : out === 'no' ? otherSwing(pendYes) : out;
  swingTo(P, kind); await wait(3400); if (pend !== my) return;
  my.phase = 'done'; showPendAnswer(out, kind); setUI('room');
}
function showPendAnswer(out, kind) {
  const how = { ...PENDULUM_UI.swing, circle: '画圈', still: '几乎不动' }[kind], [label, key] = PENDULUM_ANSWERS[out], sw = PENDULUM_UI.swing;
  sfx('chime');
  showPanel(`<span class="seal">摆</span><small>灵摆问答 · ${how}</small><h3>${label}</h3><p class="gua-image">关键词 · ${key}</p><p>${pendLine(out)}</p>`
    + `<div class="note">校准时，「是」${sw[pendYes]}，「否」${sw[otherSwing(pendYes)]}。<br>${PENDULUM_UI.note}</div>`,
    [['再问一个', () => { hidePanel(); const P = rooms.window.pend; P.rate = 0.8; swingTo(P, 'rest'); pend = { mode: 'ask', phase: 'ready', again: true }; setUI('room'); }, true], ['收起', () => endPend()]]);
}
async function boardIntro() {
  if (roomId !== 'window' || busy || (pend && pend.phase !== 'done')) return;
  if (!roomInside) { roomSit(); return; }
  endPend(false); const my = (pend = { mode: 'board', phase: 'boardReady' });
  await flyWindow('board'); if (pend !== my) return;
  showPanel(`<span class="seal">盘</span><small>灵摆盘 · 四时四方</small><h3>此刻需要什么</h3><p>${PENDULUM_UI.board}</p>`, [['让灵摆转起来', pendSpin, true], ['收起', () => endPend()]]);
  setUI('room');
}
async function pendSpin() {
  if (!pend || pend.mode !== 'board' || pend.phase === 'spin') return;
  hidePanel();
  const R = rooms.window, P = R.pend, cell = Math.floor(Math.random() * BOARD_CELLS.length), my = (pend = { mode: 'board', phase: 'spin', cell });
  paintBoard(R.board, -1); setUI('room'); sfx('soft');
  // round and round, slower and flatter, until the swing lies along one cell's line, leaning out towards it
  P.rate = 0.9; Object.assign(P.to, { amp: 0.12, ecc: 1, c: 0 }); P.ax = P.to.ax = BOARD_CELLS[cell].a;
  await wait(2600); if (pend !== my) return;
  Object.assign(P.to, { amp: 0.1, ecc: 0.5 }); await wait(1300); if (pend !== my) return;
  P.rate = 0.8; Object.assign(P.to, { amp: 0.105, ecc: 0.04, c: 0.085 }); await wait(2900); if (pend !== my) return;
  paintBoard(R.board, cell); sfx('pop'); burstAt(sparks, cellAt(R.board, cell), 18, { speed: 0.05, up: 0.1, size: 0.008, life: 0.8 });
  await wait(900); if (pend !== my) return;
  my.phase = 'done'; showBoardReading(BOARD_CELLS[cell]); setUI('room');
}
function showBoardReading(C) {
  sfx('chime');
  showPanel(`<span class="seal">盘</span><small>灵摆盘 · ${C.dir}方 · ${C.season} · ${C.theme}</small><h3>${C.word}</h3><p class="ln-sentence">${C.wordLine}</p><p class="gua-image">${C.line}</p><div class="note">${PENDULUM_UI.note}</div>`,
    [['再转一次', () => { const R = rooms.window; paintBoard(R.board, -1); R.pend.rate = 0.8; swingTo(R.pend, 'rest'); pend = { mode: 'board', phase: 'boardReady' }; hidePanel(); setUI('room'); }, true], ['收起', () => endPend()]]);
}
/** the pendulum let go: it slows to rest, the board goes dark again, and you sit back */
function endPend(fly = true) {
  pend = null; hidePanel();
  const R = rooms.window; if (!R?.pend) return;
  R.pend.rate = 0.7; swingTo(R.pend, 'rest'); if (R.board.hi >= 0) paintBoard(R.board, -1);
  if (fly) backToWindow().then(() => setUI('room')); setUI('room');
}
function resetWindow(all = false) {
  endPend(false); if (all) pendYes = null;
  const P = rooms.window?.pend; if (P) { Object.assign(P, SWING.rest); P.to = { ...SWING.rest, ax: 0 }; }
}
function showMoon() {
  const age = moonAge(), [name, days, sky, folk, line] = MOON_PHASES[moonPhase(age)];
  sfx('chime');
  showPanel(`<span class="seal">月</span><small>今晚的月亮 · 月龄约 ${age.toFixed(1)} 天</small><h3>${name}</h3><p class="gua-image">${days}</p><p>${sky}</p><p>${folk}</p><p class="ln-sentence">${line}</p><div class="note">月相按此刻的日期和时间推算，和天文台的数据相差不过几个小时；农历日子只是大约的对应。</div>`, [['知道了', hidePanel, true]]);
  $('panel').classList.add('long');
}
/** the buttons along the bottom while the pendulum is busy; true when they take the place of the room's own */
function windowButtons(act, hint) {
  const p = pend; if (!p) return false;
  const yesNo = (k) => PENDULUM_UI.shows.replace('X', k === p.yes ? '是' : '否').replace('Y', PENDULUM_UI.swing[k]);
  if (p.phase === 'yes' || p.phase === 'no') { hint.textContent = `默念「请给我看看『${p.phase === 'yes' ? '是' : '否'}』」……`; act.append(button('放下灵摆', () => endPend())); return true; }
  if (p.phase === 'yesShown') { hint.textContent = yesNo(p.yes); act.append(button('再看「否」', pendShowNo, true), button('放下灵摆', () => endPend())); return true; }
  if (p.phase === 'ready') { hint.textContent = p.again ? '默念你的下一个问题，再让灵摆慢慢摆起来' : PENDULUM_UI.calibrated; act.append(button('让灵摆摆起来', pendAsk, true), button('重新校准', pendCalibrate), button('放下灵摆', () => endPend())); return true; }
  if (p.phase === 'swing') { hint.textContent = '灵摆慢慢摆起来了……'; return true; }
  if (p.phase === 'boardReady') { hint.textContent = '默念：这件事里，我此刻最需要什么'; act.append(button('让灵摆转起来', pendSpin, true), button('放下灵摆', () => endPend())); return true; }
  if (p.phase === 'spin') { hint.textContent = '灵摆在盘上慢慢转着……'; return true; }
  return false;
}
/** a tap in the cottage: the owl, the cat, the moon in the window, the pendulum, the board, or the table to sit at */
function windowTap(hit) {
  const u = hit.object.userData;
  if (u.owl) { sfx('hoot'); toast('猫头鹰轻轻叫了两声：咕——咕咕'); return; }
  if (u.cat) { sfx('purr'); toast('小黑猫在梦里打了个呼噜'); return; }
  if (u.moon) { if (!pend || pend.phase === 'done') showMoon(); return; }
  if (!roomInside) { roomSit(); return; }
  if (pend && pend.phase !== 'done') { if (pend.phase === 'yesShown') pendShowNo(); else if (pend.phase === 'ready') pendAsk(); else if (pend.phase === 'boardReady') pendSpin(); return; }
  if (u.board) boardIntro(); else pendIntro();
}
