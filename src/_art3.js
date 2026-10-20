/* ================= souvenirs from everywhere, a Minnan temple, a quiet moon courtyard ================= */
/*
 * The hut becomes a little hall of things brought home from travels: an Eastern compass beside a
 * Persian astrolabe, fortune sticks next to a crystal ball, each with a small brass label. It hints
 * at what the book holds: ways of asking the future from East and West, side by side.
 */
const LABEL_FONT = '600 17px "Noto Serif SC", serif';
function tag(q, x, y, text) {
  const g = q.g; g.font = LABEL_FONT;
  const w = g.measureText(text).width + 16;
  q.flat(rectPx(x - w / 2, y, w, 24), '#c99a45', 1);
  g.fillStyle = '#2a1a10'; g.textAlign = 'center'; g.fillText(text, x, y + 18);
}
function worldMap() {
  // an old portolan-style chart: rhumb lines, water-lined coasts, sea monsters West and East, a sun and a moon, a scrolled cartouche
  const W = 1400, H = 900, S = 1.5, r = mulberry(9011);
  const sc = (pts) => pts.map(([x, y]) => [x * S, y * S]);
  const edge = [];
  const jag = (x, y) => [x + (r() - 0.5) * 9, y + (r() - 0.5) * 9];
  for (let x = 26; x < W - 26; x += 16) edge.push(jag(x, 24 + Math.sin(x * 0.05) * 3));
  for (let y = 24; y < H - 24; y += 16) edge.push(jag(W - 24 + Math.sin(y * 0.07) * 3, y));
  for (let x = W - 26; x > 26; x -= 16) edge.push(jag(x, H - 24 + Math.sin(x * 0.06) * 3));
  for (let y = H - 24; y > 24; y -= 16) edge.push(jag(24 + Math.sin(y * 0.05) * 3, y));
  // coastlines: rough base shapes broken up by midpoint displacement
  const coast = (base, seed, rough = 0.32) => {
    const rr = mulberry(seed); let p = base;
    for (let it = 0; it < 3; it++) { const out = []; p.forEach((a, i) => { const b = p[(i + 1) % p.length], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, d = (rr() - 0.5) * len * rough; out.push(a, [(a[0] + b[0]) / 2 - (dy / len) * d, (a[1] + b[1]) / 2 + (dx / len) * d]); }); p = out; }
    return p;
  };
  const offset = (p, d) => {
    let A = 0; p.forEach((a, i) => { const b = p[(i + 1) % p.length]; A += a[0] * b[1] - b[0] * a[1]; });
    const sg = A > 0 ? 1 : -1;
    return p.map((a, i) => { const pr = p[(i - 1 + p.length) % p.length], nx = p[(i + 1) % p.length], dx = nx[0] - pr[0], dy = nx[1] - pr[1], l = Math.hypot(dx, dy) || 1; return [a[0] + (sg * dy * d) / l, a[1] - (sg * dx * d) / l]; });
  };
  const LAND = [
    { p: coast([[60, 200], [110, 180], [138, 250], [102, 322], [66, 292]], 1), tint: '#9fae78' },
    { p: coast([[170, 150], [300, 112], [430, 140], [490, 205], [470, 282], [400, 318], [350, 300], [300, 352], [230, 378], [170, 344], [150, 270]], 2), tint: '#9fae78' },
    { p: coast([[420, 402], [520, 360], [640, 372], [700, 420], [690, 520], [622, 600], [562, 702], [500, 720], [468, 640], [430, 540]], 3), tint: '#d8ae62' },
    { p: coast([[640, 180], [760, 128], [900, 108], [1040, 130], [1150, 190], [1200, 272], [1150, 332], [1100, 400], [1020, 432], [940, 410], [860, 440], [780, 400], [720, 330], [662, 280]], 4), tint: '#a8b47a' },
    { p: coast([[1232, 180], [1272, 168], [1292, 232], [1262, 322], [1230, 300], [1242, 240]], 5), tint: '#a8b47a' },
    { p: coast([[1080, 622], [1140, 600], [1172, 642], [1130, 682], [1086, 666]], 6), tint: '#c8b878' },
    { p: coast([[820, 600], [920, 580], [982, 640], [952, 712], [862, 722], [810, 670]], 7), tint: '#cfa868' },
    { p: coast([[1086, 450], [1110, 440], [1128, 452], [1122, 472], [1100, 478], [1084, 468]], 8, 0.22), tint: '#b8c070' },
  ];
  const ROSE = [170, 700], MOONC = [1300, 104], SUNC = [104, 96];
  return die(W * S, H * S, 901, [sc(edge)], (q, g) => {
    q.wash(sc([[0, 0], [W, 0], [W, H], [0, H]]), '#dcc292', { alpha: 0.85, layers: 10, vary: 0.003, edge: 0 });
    for (let i = 0; i < 26; i++) q.wash(sc(ellPx(r() * W, r() * H, 60 + r() * 120, 40 + r() * 70)), '#c49a5a', { alpha: 0.045, layers: 4, edge: 0 });
    const raw = (fn) => { g.save(); g.scale(S, S); fn(); g.restore(); };
    const path = (pts, close = true) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); };
    const stroke = (pts, col, lw, a = 1, close = true) => { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; path(pts, close); g.stroke(); g.globalAlpha = 1; };
    const fill = (pts, col, a = 1) => { g.globalAlpha = a; g.fillStyle = col; path(pts); g.fill(); g.globalAlpha = 1; };
    const text = (s, x, y, font, col, o = {}) => { g.save(); g.translate(x, y); g.rotate(o.rot ?? 0); g.globalAlpha = o.a ?? 1; g.fillStyle = col; g.font = font; g.textAlign = o.align ?? 'center'; g.textBaseline = 'middle'; if (o.spacing) g.letterSpacing = o.spacing; g.fillText(s, 0, 0); g.restore(); };
    const INK = '#3b2418', SEP = '#6b4a2a', RED = '#a8322a', GOLD = '#c99a45', SEA = '#4f7c88';
    g.lineCap = 'round'; g.lineJoin = 'round';
    // rhumb lines from the two wind roses, under everything
    raw(() => {
      [[ROSE, 0.3], [[1180, 150], 0.18]].forEach(([[cx, cy], a]) => { for (let k = 0; k < 32; k++) { const ang = (k / 32) * TAU, col = k % 4 === 0 ? INK : k % 2 === 0 ? RED : '#4a7a4a'; g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = k % 4 === 0 ? 0.9 : 0.6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * 1800, cy + Math.sin(ang) * 1800); g.stroke(); } });
      g.globalAlpha = 1;
    });
    // the lands, washed in
    LAND.forEach((l) => { q.wash(sc(l.p), '#cfb27a', { alpha: 0.6, layers: 8, vary: 0.012, edge: 0 }); q.wash(sc(offset(l.p, -10)), l.tint, { alpha: 0.22, layers: 6, vary: 0.02, edge: 0 }); });
    raw(() => {
      // water-lining round every coast, then the coast itself
      LAND.forEach((l) => { [[5, 0.55], [11, 0.38], [18, 0.24], [27, 0.13]].forEach(([d, a]) => stroke(offset(l.p, d), SEA, 0.9, a)); stroke(l.p, SEP, 1.7, 0.9); stroke(offset(l.p, -3), '#8a6a3a', 0.6, 0.35); });
      // mountain ranges, hatched on their shadow side
      const mountain = (x, y, s) => { fill([[x - s, y], [x, y - s * 1.3], [x + s, y]], '#e2cc98', 0.9); stroke([[x - s, y], [x, y - s * 1.3], [x + s, y]], SEP, 1.1, 0.95, false); for (let k = 1; k < 4; k++) stroke([[x + (k * s) / 5, y - s * 1.3 + (k * s * 1.3) / 5 + 2], [x + (k * s) / 5 - 2, y]], SEP, 0.7, 0.6, false); };
      [[[230, 300], [400, 190], 9], [[790, 360], [1010, 330], 11], [[820, 210], [960, 170], 7], [[520, 470], [600, 560], 6]].forEach(([[x0, y0], [x1, y1], n]) => { for (let k = 0; k < n; k++) { const t = k / (n - 1); mountain(x0 + (x1 - x0) * t + (r() - 0.5) * 10, y0 + (y1 - y0) * t + (r() - 0.5) * 10, 9 + r() * 6); } });
      // forests, little round trees
      const forest = (cx, cy, n, sp) => { for (let k = 0; k < n; k++) { const x = cx + (r() - 0.5) * sp, y = cy + (r() - 0.5) * sp * 0.6; stroke([[x, y + 5], [x, y + 9]], SEP, 0.9, 0.8, false); g.fillStyle = '#7d9a5a'; g.beginPath(); g.arc(x, y + 1, 4.5, 0, TAU); g.fill(); g.strokeStyle = SEP; g.lineWidth = 0.8; g.stroke(); } };
      forest(200, 300, 14, 70); forest(420, 230, 10, 50); forest(1060, 250, 16, 90); forest(720, 250, 8, 50); forest(1260, 270, 5, 20);
      // desert stipple and dunes
      for (let k = 0; k < 260; k++) { const x = 470 + r() * 200, y = 400 + r() * 260; if (r() < 0.7) { g.fillStyle = 'rgba(140,100,50,.5)'; g.fillRect(x, y, 1.2, 1.2); } }
      for (let k = 0; k < 7; k++) { const x = 500 + r() * 140, y = 440 + r() * 180; stroke(arcPx(x, y + 10, 14, Math.PI * 1.2, Math.PI * 1.8, 8), '#9a7040', 1, 0.7, false); }
      // rivers
      [[[930, 220], [980, 270], [1040, 300], [1110, 350], [1150, 330]], [[600, 590], [612, 520], [640, 460], [662, 410]], [[330, 200], [300, 250], [250, 290], [200, 330]]].forEach((pts) => { const d = []; for (let i = 0; i < pts.length - 1; i++) for (let t = 0; t < 1; t += 0.1) d.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t + Math.sin(t * 9 + i) * 4, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]); stroke(d, SEA, 1.4, 0.8, false); });
      // a great wall along the northern hills
      const wall = []; for (let x = 840; x <= 1030; x += 6) wall.push([x, 168 + Math.sin(x * 0.04) * 8 + ((x / 6) % 2 ? -3 : 0)]); stroke(wall, '#8a3a2a', 1.6, 0.85, false);
      // waves: Western curls in the west, blue-and-gold scale waves (seigaiha) in the east
      for (let k = 0; k < 26; k++) { const x = 60 + r() * 360, y = 420 + r() * 420; if (Math.hypot(x - ROSE[0], y - ROSE[1]) < 125) continue; stroke([...arcPx(x, y, 7, Math.PI, TAU, 6), ...arcPx(x + 14, y, 7, Math.PI, TAU, 6)], SEA, 1, 0.55, false); }
      const scale = (x, y) => { for (let k = 3; k > 0; k--) stroke(arcPx(x, y, k * 5, Math.PI, TAU, 10), k === 3 ? GOLD : SEA, 0.9, 0.7, false); };
      for (let row = 0; row < 3; row++) for (let k = 0; k < 3; k++) scale(995 + k * 26 + (row % 2) * 13, 585 + row * 10);
      for (let row = 0; row < 3; row++) for (let k = 0; k < 3; k++) scale(1210 + k * 30 + (row % 2) * 15, 760 + row * 10);
      for (let row = 0; row < 2; row++) for (let k = 0; k < 4; k++) scale(700 + k * 30 + (row % 2) * 15, 780 + row * 10);
      // a sea serpent humping through the western sea
      const sx = 250, sy = 495;
      for (let k = 0; k < 4; k++) { const ax = sx + k * 34, rr = 15 - k * 1.5; [[9, INK], [6.5, '#5a8a6a']].forEach(([lw, c]) => stroke(arcPx(ax, sy, rr, Math.PI, TAU, 12), c, lw, 1, false)); for (let j = 0; j < 4; j++) { const a = Math.PI + (j + 0.5) * (Math.PI / 4); stroke(arcPx(ax + Math.cos(a) * rr, sy + Math.sin(a) * rr, 2, 0, Math.PI, 4), '#2a4a3a', 0.7, 0.8, false); } stroke([[ax - rr - 4, sy + 1], [ax + rr + 4, sy + 1]], SEA, 1, 0.7, false); }
      fill([[sx - 18, sy + 2], [sx - 30, sy - 26], [sx - 52, sy - 34], [sx - 64, sy - 26], [sx - 50, sy - 22], [sx - 62, sy - 14], [sx - 40, sy - 16], [sx - 26, sy + 2]], '#5a8a6a'); stroke([[sx - 18, sy + 2], [sx - 30, sy - 26], [sx - 52, sy - 34], [sx - 64, sy - 26], [sx - 50, sy - 22], [sx - 62, sy - 14], [sx - 40, sy - 16], [sx - 26, sy + 2]], INK, 1.3);
      g.fillStyle = '#f2d060'; g.beginPath(); g.arc(sx - 48, sy - 27, 2.4, 0, TAU); g.fill();
      for (let k = 0; k < 5; k++) fill([[sx - 30 - k * 5, sy - 26 - k * 1.5], [sx - 30 - k * 5 - 2, sy - 36 - k * 1.5], [sx - 30 - k * 5 - 5, sy - 27 - k * 1.5]], RED, 0.9);
      stroke([[sx + 120, sy], [sx + 132, sy - 18], [sx + 142, sy - 10], [sx + 130, sy - 4]], INK, 2, 1, false);
      // a galleon under full sail
      const gx = 120, gy = 455;
      fill([[gx - 34, gy], [gx + 36, gy], [gx + 28, gy + 14], [gx - 26, gy + 14]], '#7a4a2a'); stroke([[gx - 34, gy], [gx + 36, gy], [gx + 28, gy + 14], [gx - 26, gy + 14]], INK, 1.2);
      [[-16, 40], [4, 50], [22, 36]].forEach(([mx, mh]) => { stroke([[gx + mx, gy], [gx + mx, gy - mh]], INK, 1.2, 1, false); [0.25, 0.6].forEach((t) => { const y0 = gy - mh * (1 - t) - 12, y1 = y0 + 14; const sail = [[gx + mx - 11, y0], [gx + mx + 11, y0], [gx + mx + 13, y1], [gx + mx - 9, y1]]; fill(sail, '#f6efdc'); stroke(sail, SEP, 0.9); }); fill([[gx + mx, gy - mh], [gx + mx + 10, gy - mh + 3], [gx + mx, gy - mh + 6]], RED); });
      stroke(arcPx(gx, gy + 16, 40, 0.1, Math.PI - 0.1, 10), SEA, 0.8, 0.6, false);
      // an Eastern dragon coiling through clouds, chasing its pearl
      const dpts = []; for (let k = 0; k <= 60; k++) { const t = k / 60; dpts.push([1280 + Math.sin(t * 9.5) * 46 * (1 - t * 0.35), 420 + t * 270]); }
      [[14, '#5a1612'], [10, '#c8372d']].forEach(([lw, c]) => stroke(dpts, c, lw, 1, false)); stroke(dpts.map(([x, y]) => [x + 2.5, y]), '#f0c060', 2.2, 0.9, false);
      for (let k = 2; k < 58; k += 3) { const [x, y] = dpts[k]; stroke(arcPx(x - 1, y, 3.2, Math.PI * 0.2, Math.PI * 0.8, 4), '#5a1612', 0.7, 0.8, false); }
      for (let k = 4; k < 56; k += 5) { const [x, y] = dpts[k], [x2, y2] = dpts[k + 1], nx = -(y2 - y), ny = x2 - x, l = Math.hypot(nx, ny) || 1; fill([[x - (nx / l) * 5, y - (ny / l) * 5], [x - (nx / l) * 12, y - (ny / l) * 12 + 3], [x2 - (nx / l) * 5, y2 - (ny / l) * 5]], '#e8a040'); }
      [[14, 1], [32, -1], [44, 1]].forEach(([k, s]) => { const [x, y] = dpts[k]; stroke([[x, y], [x + s * 14, y + 6], [x + s * 20, y + 4]], '#5a1612', 2.2, 1, false); [-3, 0, 3].forEach((o) => stroke([[x + s * 20, y + 4], [x + s * 24, y + 4 + o]], '#5a1612', 1, 1, false)); });
      const [hx, hy] = dpts[0];
      fill([[hx - 16, hy + 6], [hx - 6, hy - 10], [hx + 14, hy - 12], [hx + 24, hy - 4], [hx + 20, hy + 6], [hx + 4, hy + 10]], '#c8372d'); stroke([[hx - 16, hy + 6], [hx - 6, hy - 10], [hx + 14, hy - 12], [hx + 24, hy - 4], [hx + 20, hy + 6], [hx + 4, hy + 10]], '#5a1612', 1.3);
      stroke([[hx - 2, hy - 10], [hx - 10, hy - 26], [hx - 4, hy - 22]], '#c99a45', 2, 1, false); stroke([[hx + 6, hy - 11], [hx + 2, hy - 28], [hx + 8, hy - 24]], '#c99a45', 2, 1, false);
      stroke([[hx + 22, hy + 2], [hx + 40, hy + 12], [hx + 52, hy + 4]], '#5a1612', 1, 1, false); stroke([[hx + 20, hy - 6], [hx + 38, hy - 20], [hx + 50, hy - 14]], '#5a1612', 1, 1, false);
      g.fillStyle = '#f2d060'; g.beginPath(); g.arc(hx + 8, hy - 4, 2.4, 0, TAU); g.fill();
      g.fillStyle = '#f6e6a8'; g.beginPath(); g.arc(hx - 36, hy + 18, 7, 0, TAU); g.fill(); stroke(circPx(hx - 36, hy + 18, 7), GOLD, 1.2); for (let k = 0; k < 3; k++) stroke([[hx - 36 + (k - 1) * 4, hy + 10], [hx - 36 + (k - 1) * 6, hy + 2]], RED, 1, 0.8, false);
      const cloud = (x, y, s) => { [[0, 0, 8], [10, -3, 9], [20, 1, 7]].forEach(([dx, dy, rr]) => stroke(arcPx(x + dx * s, y + dy * s, rr * s, Math.PI * 0.9, Math.PI * 2.1, 10), '#6a7a9a', 1.1, 0.75, false)); stroke(spiralPx(x + 4 * s, y + 4 * s, 7 * s, 1.2, 16), '#6a7a9a', 1, 0.7, false); };
      cloud(1300, 470, 1.1); cloud(1222, 600, 1); cloud(1320, 650, 0.9); cloud(1200, 420, 0.8);
      text('Hic sunt dracones', 1268, 735, 'italic 600 15px "Cormorant Garamond", serif', SEP, { rot: -0.06 }); text('此处有龙', 1270, 754, '500 12px "Noto Serif SC", serif', SEP);
      // a junk with ribbed sails
      const jx = 1040, jy = 535;
      fill([[jx - 30, jy - 4], [jx + 30, jy - 8], [jx + 24, jy + 8], [jx - 22, jy + 8]], '#6a3a20'); stroke([[jx - 30, jy - 4], [jx + 30, jy - 8], [jx + 24, jy + 8], [jx - 22, jy + 8]], INK, 1.1);
      [[-8, 34, 16], [12, 28, 13]].forEach(([mx, mh, sw]) => { const sail = [[jx + mx - sw / 2, jy - 6], [jx + mx + sw / 2, jy - 6], [jx + mx + sw / 2 + 3, jy - mh], [jx + mx - sw / 2 + 2, jy - mh - 2]]; fill(sail, '#d8683a'); stroke(sail, '#5a2a14', 1); for (let k = 1; k < 5; k++) { const y = jy - 6 - ((mh - 6) * k) / 5; stroke([[jx + mx - sw / 2, y], [jx + mx + sw / 2 + 1, y - 1]], '#5a2a14', 0.7, 0.9, false); } });
      // the route, dashed red, a little arrow at each crossing
      const stops = [[98, 252, '雾港', 'Fog Harbour', 0], [400, 196, '风车镇', 'Windmill Town', 1], [668, 290, '伊斯坦布尔', 'Istanbul', 2], [590, 470, '沙漠市集', 'Desert Bazaar', 3], [930, 262, '长安', "Chang'an", 4], [1112, 352, '泉州', 'Quanzhou', 5], [1106, 462, '夏天镇', 'Summer Town', 7], [1128, 642, '珊瑚岛', 'Coral Isle', 6]];
      g.setLineDash([6, 5]);
      for (let i = 0; i < stops.length - 1; i++) { const [x0, y0] = stops[i], [x1, y1] = stops[i + 1], pts = []; for (let k = 0; k <= 24; k++) { const t = k / 24; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * 34]); } stroke(pts, RED, 1.8, 0.9, false); }
      g.setLineDash([]);
      for (let i = 0; i < stops.length - 1; i++) { const [x0, y0] = stops[i], [x1, y1] = stops[i + 1], mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 34, a = Math.atan2(y1 - y0, x1 - x0); fill([[mx + Math.cos(a) * 7, my + Math.sin(a) * 7], [mx + Math.cos(a + 2.5) * 6, my + Math.sin(a + 2.5) * 6], [mx + Math.cos(a - 2.5) * 6, my + Math.sin(a - 2.5) * 6]], RED); }
      // a tiny sketch at each stop: lighthouse, windmill, domes, tents, pagoda, temple roof, palm
      const icon = (k, x, y) => {
        g.strokeStyle = INK; g.lineWidth = 1; g.fillStyle = '#f6ecd2';
        if (k === 0) { fill([[x - 4, y], [x + 4, y], [x + 2.5, y - 20], [x - 2.5, y - 20]], '#f6ecd2'); stroke([[x - 4, y], [x + 4, y], [x + 2.5, y - 20], [x - 2.5, y - 20]], INK, 1); fill([[x - 3, y - 20], [x + 3, y - 20], [x, y - 25]], RED); g.fillStyle = 'rgba(255,220,120,.6)'; g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 18, y - 28); g.lineTo(x + 18, y - 16); g.fill(); }
        if (k === 1) { stroke([[x - 4, y], [x - 2.5, y - 14], [x + 2.5, y - 14], [x + 4, y]], INK, 1); for (let j = 0; j < 4; j++) { const a = j * (Math.PI / 2) + 0.4; stroke([[x, y - 14], [x + Math.cos(a) * 12, y - 14 + Math.sin(a) * 12]], INK, 1.4, 1, false); } }
        if (k === 2) { g.beginPath(); g.arc(x, y - 8, 8, Math.PI, TAU); g.fill(); g.stroke(); stroke([[x - 8, y - 8], [x - 8, y], [x + 8, y], [x + 8, y - 8]], INK, 1, 1, false); [-13, 13].forEach((o) => stroke([[x + o, y], [x + o, y - 20]], INK, 1.6, 1, false)); }
        if (k === 3) { [[-6, 0], [6, 2]].forEach(([o, d]) => { fill([[x + o - 7, y + d], [x + o, y + d - 12], [x + o + 7, y + d]], '#e8c890'); stroke([[x + o - 7, y + d], [x + o, y + d - 12], [x + o + 7, y + d]], INK, 1); }); }
        if (k === 4) { for (let j = 0; j < 4; j++) { const yy = y - j * 7, ww = 9 - j * 1.6; stroke([[x - ww, yy - 1], [x - ww * 0.6, yy - 4], [x + ww * 0.6, yy - 4], [x + ww, yy - 1]], INK, 1.1, 1, false); stroke([[x - ww * 0.5, yy], [x - ww * 0.5, yy - 3]], INK, 0.8, 1, false); } stroke([[x, y - 27], [x, y - 33]], INK, 1, 1, false); }
        if (k === 5) { stroke([[x - 12, y - 10], [x - 6, y - 8], [x + 6, y - 8], [x + 12, y - 10]], INK, 1.3, 1, false); stroke([[x - 12, y - 10], [x - 14, y - 15]], INK, 1.3, 1, false); stroke([[x + 12, y - 10], [x + 14, y - 15]], INK, 1.3, 1, false); stroke([[x - 6, y - 8], [x - 6, y], [x + 6, y], [x + 6, y - 8]], RED, 1.4, 1, false); }
        if (k === 7) { for (let j = 0; j < 12; j++) { const a = (j / 12) * TAU; stroke([[x + 24 + Math.cos(a) * 6, y - 18 + Math.sin(a) * 6], [x + 24 + Math.cos(a) * 9.5, y - 18 + Math.sin(a) * 9.5]], '#d8902a', 1.1, 1, false); } fill(circPx(x + 24, y - 18, 4.8), '#f2b640'); [[-4, 0], [6, 2]].forEach(([dx, dy]) => { const hp = [[x + dx - 4.5, y + dy], [x + dx + 4.5, y + dy], [x + dx + 4.5, y + dy - 6], [x + dx, y + dy - 10], [x + dx - 4.5, y + dy - 6]]; fill(hp, '#f6ecd2'); stroke(hp, INK, 0.9); fill([[x + dx - 5.5, y + dy - 6], [x + dx, y + dy - 11], [x + dx + 5.5, y + dy - 6]], RED); }); }
        if (k === 6) { stroke([[x, y], [x + 2, y - 10], [x + 1, y - 18]], INK, 1.2, 1, false); [0.5, 1.6, 2.6, -0.6].forEach((a) => stroke([[x + 1, y - 18], [x + 1 + Math.cos(a) * 10, y - 18 - Math.sin(a) * 4 + 4]], '#4a7a4a', 1.6, 1, false)); }
      };
      stops.forEach(([x, y, zh, en, ik]) => {
        icon(ik, x - 16, y - 6);
        g.fillStyle = RED; g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill(); g.strokeStyle = '#5a1612'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(x - 1.5, y - 1.8, 1.8, 0, TAU); g.fill();
        text(zh, x, y + 17, '700 16px "Noto Serif SC", serif', INK); text(en, x, y + 31, 'italic 600 11px "Cormorant Garamond", serif', SEP);
      });
      // ocean names
      text('OCEANUS OCCIDENTALIS', 230, 590, 'italic 600 15px "Cormorant Garamond", serif', SEP, { spacing: '4px', rot: -0.12, a: 0.85 }); text('雾 海', 236, 610, '500 14px "Noto Serif SC", serif', SEP, { spacing: '10px', rot: -0.12, a: 0.85 });
      text('MARE ORIENTALE', 1150, 524, 'italic 600 14px "Cormorant Garamond", serif', SEP, { spacing: '3px', rot: 0.06, a: 0.85 }); text('东 海', 1150, 543, '500 14px "Noto Serif SC", serif', SEP, { spacing: '10px', rot: 0.06, a: 0.85 });
      // the great wind rose: fleur-de-lis to the north, and 北 beside it
      const [cx, cy] = ROSE;
      [[96, 1.6], [90, 0.8], [62, 0.8]].forEach(([rr, lw]) => stroke(circPx(cx, cy, rr, 64), SEP, lw));
      for (let k = 0; k < 64; k++) { const a = (k / 64) * TAU; stroke([[cx + Math.cos(a) * 90, cy + Math.sin(a) * 90], [cx + Math.cos(a) * (k % 2 ? 93 : 96), cy + Math.sin(a) * (k % 2 ? 93 : 96)]], SEP, 0.8, 1, false); }
      const point = (a, len, wd, c1, c2) => { const tip = [cx + Math.cos(a) * len, cy + Math.sin(a) * len], l = [cx + Math.cos(a - Math.PI / 2) * wd, cy + Math.sin(a - Math.PI / 2) * wd], rt = [cx + Math.cos(a + Math.PI / 2) * wd, cy + Math.sin(a + Math.PI / 2) * wd]; fill([[cx, cy], l, tip], c1); fill([[cx, cy], rt, tip], c2); stroke([l, tip, rt], INK, 0.8, 0.9, false); };
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU - Math.PI / 2 + Math.PI / 16; point(a, 50, 5, '#e6d2a0', '#b88a4a'); }
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU - Math.PI / 2 + Math.PI / 8; point(a, 66, 8, '#c8372d', '#7a1e18'); }
      for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU - Math.PI / 2; point(a, 88, 12, '#f0d080', GOLD); }
      fill(circPx(cx, cy, 8), '#f6ecd2'); stroke(circPx(cx, cy, 8), INK, 1);
      const fx = cx, fy = cy - 104; fill([[fx, fy - 14], [fx + 4, fy - 4], [fx, fy + 4], [fx - 4, fy - 4]], GOLD); stroke([[fx, fy - 14], [fx + 4, fy - 4], [fx, fy + 4], [fx - 4, fy - 4]], INK, 0.9); [-1, 1].forEach((s) => stroke([[fx + s * 3, fy - 2], [fx + s * 11, fy - 8], [fx + s * 9, fy + 2], [fx + s * 2, fy + 2]], INK, 1.1, 1, false)); stroke([[fx - 8, fy + 4], [fx + 8, fy + 4]], INK, 1.4, 1, false);
      text('北', cx + 22, cy - 104, '700 14px "Noto Serif SC", serif', RED); text('E', cx + 108, cy, 'italic 600 14px "Cormorant Garamond", serif', INK); text('S', cx, cy + 108, 'italic 600 14px "Cormorant Garamond", serif', INK); text('W', cx - 108, cy, 'italic 600 14px "Cormorant Garamond", serif', INK);
      // the sun of the West and the moon of the East, in medallions
      const medal = ([mx, my], rr) => { fill(circPx(mx, my, rr + 6, 48), '#efe0b8'); stroke(circPx(mx, my, rr + 6, 48), SEP, 1.4); stroke(circPx(mx, my, rr + 2, 48), GOLD, 1.2); };
      medal(SUNC, 46);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, l = k % 2 ? 40 : 46; fill([[SUNC[0] + Math.cos(a - 0.12) * 22, SUNC[1] + Math.sin(a - 0.12) * 22], [SUNC[0] + Math.cos(a) * l, SUNC[1] + Math.sin(a) * l], [SUNC[0] + Math.cos(a + 0.12) * 22, SUNC[1] + Math.sin(a + 0.12) * 22]], k % 2 ? '#e8a040' : GOLD); }
      fill(circPx(SUNC[0], SUNC[1], 22), '#f2c860'); stroke(circPx(SUNC[0], SUNC[1], 22), SEP, 1);
      [-7, 7].forEach((o) => stroke(arcPx(SUNC[0] + o, SUNC[1] - 3, 3.5, Math.PI * 0.1, Math.PI * 0.9, 6), INK, 1.1, 1, false)); stroke(arcPx(SUNC[0], SUNC[1] + 5, 7, Math.PI * 0.15, Math.PI * 0.85, 8), INK, 1.1, 1, false);
      text('SOL', SUNC[0], SUNC[1] + 62, 'italic 600 12px "Cormorant Garamond", serif', SEP, { spacing: '3px' });
      medal(MOONC, 46);
      fill(circPx(MOONC[0], MOONC[1], 46, 48), '#28305e'); for (let k = 0; k < 14; k++) { g.fillStyle = '#f6ecd2'; g.fillRect(MOONC[0] - 40 + r() * 80, MOONC[1] - 40 + r() * 80, 1.4, 1.4); }
      fill(circPx(MOONC[0] + 4, MOONC[1], 28, 40), '#f4e8c6');
      const rb = [[-8, 12], [-12, 2], [-6, -6], [2, -6], [4, -18], [8, -18], [7, -6], [12, -2], [14, 8], [10, 14]].map(([a, b]) => [MOONC[0] + 4 + a, MOONC[1] + b]); fill(rb, '#c8b48a'); stroke(rb, SEP, 0.8);
      stroke([[MOONC[0] - 12, MOONC[1] + 16], [MOONC[0] - 18, MOONC[1] + 22]], SEP, 1.2, 1, false);
      text('月', MOONC[0], MOONC[1] + 62, '700 13px "Noto Serif SC", serif', SEP);
      // the scrolled cartouche, with a vermilion seal
      const [kx, ky, kw, kh] = [990, 760, 330, 92];
      const sheetPts = [[kx, ky], [kx + kw, ky], [kx + kw, ky + kh], [kx, ky + kh]];
      fill(sheetPts, '#f6ecd2'); stroke(sheetPts, SEP, 1.6); stroke([[kx + 6, ky + 6], [kx + kw - 6, ky + 6], [kx + kw - 6, ky + kh - 6], [kx + 6, ky + kh - 6]], GOLD, 1.2);
      [[kx, -1], [kx + kw, 1]].forEach(([ex, s]) => { fill([[ex, ky - 6], [ex + s * 14, ky - 2], [ex + s * 14, ky + kh + 2], [ex, ky + kh + 6]], '#e6d4a6'); stroke([[ex, ky - 6], [ex + s * 14, ky - 2], [ex + s * 14, ky + kh + 2], [ex, ky + kh + 6]], SEP, 1.2); stroke(spiralPx(ex + s * 14, ky + 4, 9, 1.4, 18), SEP, 1.2, 1, false); stroke(spiralPx(ex + s * 14, ky + kh - 4, 9, 1.4, 18), SEP, 1.2, 1, false); });
      text('A Traveller’s Map', kx + kw / 2, ky + 34, 'italic 600 32px "Cormorant Garamond", serif', INK); text('东 西 行 旅 图', kx + kw / 2, ky + 68, '700 19px "Noto Serif SC", serif', '#5a3a22', { spacing: '6px' });
      fill([[kx + kw - 50, ky + kh - 46], [kx + kw - 14, ky + kh - 46], [kx + kw - 14, ky + kh - 10], [kx + kw - 50, ky + kh - 10]], '#b8322a', 0.9);
      text('东西', kx + kw - 32, ky + kh - 37, '700 12px "Noto Serif SC", serif', '#f6ecd2'); text('行记', kx + kw - 32, ky + kh - 20, '700 12px "Noto Serif SC", serif', '#f6ecd2');
      // a scale of leagues
      for (let k = 0; k < 6; k++) fill([[300 + k * 28, 836], [328 + k * 28, 836], [328 + k * 28, 842], [300 + k * 28, 842]], k % 2 ? '#f6ecd2' : INK);
      stroke([[300, 836], [468, 836], [468, 842], [300, 842]], INK, 0.9); text('Leagues · 百里', 384, 856, 'italic 600 12px "Cormorant Garamond", serif', SEP);
      // the neatline: a chequered degree band and starred corners
      stroke([[36, 36], [W - 36, 36], [W - 36, H - 36], [36, H - 36]], INK, 2.2); stroke([[46, 46], [W - 46, 46], [W - 46, H - 46], [46, H - 46]], INK, 0.9);
      for (let x = 46, k = 0; x < W - 46; x += 30, k++) if (k % 2) { fill([[x, 36], [Math.min(x + 30, W - 46), 36], [Math.min(x + 30, W - 46), 46], [x, 46]], INK, 0.85); fill([[x, H - 46], [Math.min(x + 30, W - 46), H - 46], [Math.min(x + 30, W - 46), H - 36], [x, H - 36]], INK, 0.85); }
      for (let y = 46, k = 0; y < H - 46; y += 30, k++) if (k % 2) { fill([[36, y], [46, y], [46, Math.min(y + 30, H - 46)], [36, Math.min(y + 30, H - 46)]], INK, 0.85); fill([[W - 46, y], [W - 36, y], [W - 36, Math.min(y + 30, H - 46)], [W - 46, Math.min(y + 30, H - 46)]], INK, 0.85); }
      [[41, 41], [W - 41, 41], [41, H - 41], [W - 41, H - 41]].forEach(([x, y]) => { fill(circPx(x, y, 9), '#efe0b8'); stroke(circPx(x, y, 9), INK, 1); fill(starPx(x, y, 7, 2.5, 4), GOLD); });
      // a coffee ring, and the creases where it has been folded
      [[760, 770, 34], [762, 772, 31]].forEach(([x, y, rr], i) => stroke(arcPx(x, y, rr, 0.3, TAU - 0.6, 40), '#8a5a2a', i ? 1 : 2.2, i ? 0.12 : 0.18, false));
      [[W / 3, 0, W / 3, H], [(2 * W) / 3, 0, (2 * W) / 3, H], [0, H / 2, W, H / 2]].forEach(([x0, y0, x1, y1]) => { stroke([[x0, y0], [x1, y1]], 'rgba(90,60,30,1)', 1.2, 0.12, false); stroke([[x0 + 1.5, y0 + 1.5], [x1 + 1.5, y1 + 1.5]], 'rgba(255,250,235,1)', 1.2, 0.25, false); });
    });
    // aged, a little scorched toward the edges
    g.save(); g.globalCompositeOperation = 'multiply';
    const vg = g.createRadialGradient(W * S * 0.5, H * S * 0.5, H * S * 0.35, W * S * 0.5, H * S * 0.5, W * S * 0.62); vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(0.75, 'rgba(200,160,110,.35)'); vg.addColorStop(1, 'rgba(110,60,25,.85)');
    g.fillStyle = vg; g.fillRect(0, 0, W * S, H * S); g.restore();
  });
}
function blueWhiteTex() {
  return sheet(1024, 512, 905, (q) => {
    q.wash(rectPx(-6, -6, 1036, 524), '#f4f4f0', { alpha: 0.8, layers: 6, edge: 0 });
    [40, 470].forEach((y) => { q.flat(rectPx(0, y, 1024, 14), '#2a4a9a', 1); for (let x = 0; x < 1024; x += 40) q.ink(arcPx(x + 20, y + 30 * (y < 100 ? 1 : -1), 14, 0, Math.PI, 8), { color: '#2a4a9a', w: 2, alpha: 0.8, passes: 1 }); });
    for (let k = 0; k < 9; k++) { const x = 60 + k * 112, y = 220 + (k % 2) * 60; q.ink(spiralPx(x, y, 34, 1.5), { color: '#2a4a9a', w: 3, alpha: 0.85, passes: 1 }); for (let j = 0; j < 5; j++) { const a = (j / 5) * TAU; q.wash(ellPx(x + 50 + Math.cos(a) * 16, y + Math.sin(a) * 16, 10, 7), '#3a5aaa', { alpha: 0.6, layers: 3, edge: 0 }); } }
  });
}
function luopanTex() {
  const c = canvas(512, 512), g = c.getContext('2d'), cx = 256;
  g.fillStyle = '#d9a441'; g.beginPath(); g.arc(cx, cx, 254, 0, TAU); g.fill();
  const rings = [240, 205, 170, 135, 100, 62];
  rings.forEach((r, i) => { g.strokeStyle = i % 2 ? '#8a2a1a' : '#3b2418'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cx, r, 0, TAU); g.stroke(); });
  const chars = '乾坎艮震巽离坤兑', marks = ['☰', '☵', '☶', '☳', '☴', '☲', '☷', '☱'];
  g.fillStyle = '#3b2418'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU - Math.PI / 2; g.save(); g.translate(cx + Math.cos(a) * 222, cx + Math.sin(a) * 222); g.rotate(a + Math.PI / 2); g.font = '700 26px "Noto Serif SC", serif'; g.fillText(chars[k], 0, 0); g.restore(); g.save(); g.translate(cx + Math.cos(a) * 152, cx + Math.sin(a) * 152); g.rotate(a + Math.PI / 2); for (let b = 0; b < 3; b++) { g.fillStyle = '#8a2a1a'; const broken = marks[k].charCodeAt(0) - 0x2630 & (1 << b); g.fillRect(-16, -12 + b * 9, broken ? 13 : 32, 5); if (broken) g.fillRect(3, -12 + b * 9, 13, 5); } g.restore(); }
  for (let k = 0; k < 72; k++) { const a = (k / 72) * TAU; g.strokeStyle = '#3b2418'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 170, cx + Math.sin(a) * 170); g.lineTo(cx + Math.cos(a) * 185, cx + Math.sin(a) * 185); g.stroke(); }
  g.fillStyle = '#c8372d'; g.beginPath(); g.arc(cx, cx, 58, 0, TAU); g.fill();
  g.fillStyle = '#f3ead6'; g.beginPath(); g.arc(cx, cx, 44, 0, TAU); g.fill();
  g.fillStyle = '#1e2a55'; g.beginPath(); g.moveTo(cx, cx - 40); g.lineTo(cx + 7, cx); g.lineTo(cx, cx + 40); g.lineTo(cx - 7, cx); g.closePath(); g.fill();
  g.fillStyle = '#c8372d'; g.beginPath(); g.moveTo(cx, cx - 40); g.lineTo(cx + 7, cx); g.lineTo(cx - 7, cx); g.closePath(); g.fill();
  return c;
}
/** the cloth on the desk: night-blue velvet, embroidered in gold with clouds and stars together */
function clothTop() {
  const w = 2048, h = 1480, c = canvas(w, h), p = painter(c, 909, 2.4), q = px(p, w, h), g = p.g;
  g.fillStyle = '#1c2148'; g.fillRect(0, 0, w, h);
  const img = g.getImageData(0, 0, w, h), d = img.data, r = mulberry(11);
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n * 1.2; }
  g.putImageData(img, 0, 0);
  const gold = { color: '#d9a441', w: 2.2, alpha: 0.9, passes: 1 };
  [[70, 70], [130, 130]].forEach(([a]) => q.ink(rectPx(a, a, w - 2 * a, h - 2 * a), { ...gold, closed: true }));
  // the border: Chinese cloud scrolls and Western eight-point stars, turn and turn about
  const motif = (x, y, k) => { if (k % 2) { q.ink(spiralPx(x - 14, y, 14, 1.3), gold); q.ink(spiralPx(x + 14, y, 14, 1.3).map(([a, b]) => [2 * x - a, b]), gold); } else { q.flat(starPx(x, y, 20, 7, 8), '#d9a441', 0.95); } };
  let k = 0;
  for (let x = 160; x < w - 140; x += 60) { motif(x, 100, k); motif(x, h - 100, k + 1); k++; }
  for (let y = 160; y < h - 140; y += 60) { motif(100, y, k); motif(w - 100, y, k + 1); k++; }
  // a big wheel in the middle, half compass and half zodiac
  const cx = w / 2, cy = h / 2;
  [520, 470, 330].forEach((rr, i) => q.ink(ellPx(cx, cy, rr * 1.0, rr * 1.0, 96), { ...gold, closed: true, w: i === 1 ? 1.4 : 2.4 }));
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU, x = cx + Math.cos(a) * 495, y = cy + Math.sin(a) * 495; if (i % 2) q.flat(starPx(x, y, 14, 5, 8), '#d9a441', 0.9); else { g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.fillStyle = '#d9a441'; for (let b = 0; b < 3; b++) { const broken = (i * 7 + b) % 3 === 0; g.fillRect(-14, -9 + b * 7, broken ? 11 : 28, 4); if (broken) g.fillRect(3, -9 + b * 7, 11, 4); } g.restore(); } }
  [[200, 200], [w - 200, 200], [200, h - 200], [w - 200, h - 200]].forEach(([x, y]) => { q.ink(circPx(x, y, 60), { ...gold, closed: true }); q.flat(starPx(x, y, 40, 14, 8), '#d9a441', 0.6); });
  return c;
}

/* ---------- a temple in the manner of Quanzhou: swallowtail ridges, cut-porcelain dragons ---------- */
const MINNAN = {
  front: () => sheet(512, 260, 921, (q, g) => {
    q.wash(rectPx(-6, -6, 524, 272), '#b8482e', { alpha: 0.55, layers: 10, vary: 0.003, edge: 0 });
    for (let y = 70; y < 190; y += 16) for (let x = ((y / 16) % 2) * 20; x < 512; x += 40) q.ink(rectPx(x + 2, y + 2, 36, 12), { closed: true, color: '#f0d8c0', w: 1, alpha: 0.5, passes: 1 });
    q.wash(rectPx(-6, 186, 524, 80), '#d8d4c8', { alpha: 0.75, layers: 6, vary: 0.003, edge: 0 });
    for (let x = 30; x < 512; x += 120) { q.ink(rectPx(x, 198, 90, 48), { closed: true, color: '#8a8478', w: 1.6, alpha: 0.7, passes: 1 }); q.ink(spiralPx(x + 30, 222, 12, 1.3), { color: '#8a8478', w: 1.4, alpha: 0.7, passes: 1 }); q.ink(spiralPx(x + 60, 222, 12, 1.3), { color: '#8a8478', w: 1.4, alpha: 0.7, passes: 1 }); }
    q.wash(rectPx(166, 60, 180, 200), '#3b1e14', { alpha: 0.8, layers: 6, edge: 0 });
    q.wash(rectPx(176, 70, 76, 110), '#ffd98a', { alpha: 0.5, layers: 6, edge: 0 }); q.wash(rectPx(260, 70, 76, 110), '#ffd98a', { alpha: 0.5, layers: 6, edge: 0 }); q.glow(256, 130, 140, '#fff0c4', 0.4);
    for (let k = 0; k < 4; k++) { q.ink([[176 + k * 25, 70], [176 + k * 25, 180]], { color: '#3b1e14', w: 3, alpha: 0.9, passes: 1 }); q.ink([[260 + k * 25, 70], [260 + k * 25, 180]], { color: '#3b1e14', w: 3, alpha: 0.9, passes: 1 }); }
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { q.dot(186 + k * 20, 196 + r * 18, 3.5, '#e3b45a'); q.dot(270 + k * 20, 196 + r * 18, 3.5, '#e3b45a'); }
    q.ink(rectPx(166, 60, 180, 200), { closed: true, color: '#e3b45a', w: 3, alpha: 0.9, passes: 1 });
    [60, 452].forEach((x) => { q.wash(circPx(x, 120, 36), '#ffd98a', { alpha: 0.45, layers: 6, edge: 0 }); q.ink(circPx(x, 120, 36), { closed: true, color: '#d8d4c8', w: 6, alpha: 0.95, passes: 1 }); for (let k = -1; k <= 1; k++) { q.ink([[x + k * 12, 88], [x + k * 12, 152]], { color: '#5a2a1a', w: 2, alpha: 0.8, passes: 1 }); q.ink([[x - 32, 120 + k * 12], [x + 32, 120 + k * 12]], { color: '#5a2a1a', w: 2, alpha: 0.8, passes: 1 }); } });
    // a painted beam across the top in blue, green and gold
    q.flat(rectPx(0, 0, 512, 50), '#2f5a7a', 1);
    for (let x = 0; x < 512; x += 64) { q.flat(ellPx(x + 32, 25, 26, 16), '#3f9a7a', 1); q.flat(ellPx(x + 32, 25, 14, 8), '#e8b830', 1); }
    q.flat(rectPx(0, 46, 512, 8), '#e3b45a', 1);
    void g;
  }),
  side: () => sheet(360, 260, 923, (q) => {
    q.wash(rectPx(-6, -6, 372, 272), '#b8482e', { alpha: 0.55, layers: 10, vary: 0.003, edge: 0 });
    for (let y = 50; y < 190; y += 16) for (let x = ((y / 16) % 2) * 20; x < 360; x += 40) q.ink(rectPx(x + 2, y + 2, 36, 12), { closed: true, color: '#f0d8c0', w: 1, alpha: 0.5, passes: 1 });
    q.wash(rectPx(-6, 186, 372, 80), '#d8d4c8', { alpha: 0.75, layers: 6, edge: 0 });
    q.flat(rectPx(0, 0, 360, 40), '#2f5a7a', 1);
    q.wash(rectPx(120, 70, 120, 90), '#ffd98a', { alpha: 0.45, layers: 6, edge: 0 }); q.ink(rectPx(120, 70, 120, 90), { closed: true, color: '#d8d4c8', w: 6, alpha: 0.95, passes: 1 });
  }),
  tiles: () => sheet(256, 512, 925, (q) => {
    q.wash(rectPx(-6, -6, 268, 524), '#c25a32', { alpha: 0.6, layers: 8, vary: 0.003, edge: 0 });
    for (let x = 0; x < 256; x += 32) { q.flat(rectPx(x + 22, 0, 10, 500), '#8a3420', 0.9); q.flat(rectPx(x + 4, 0, 4, 500), '#ec9a68', 0.8); }
    for (let x = 0; x < 256; x += 32) { q.flat(circPx(x + 27, 496, 9), '#e3b45a', 1); q.flat(circPx(x + 27, 496, 4), '#8a3420', 1); }
  }),
  beam: () => sheet(512, 96, 927, (q) => { q.flat(rectPx(0, 0, 512, 96), '#2f5a7a', 1); for (let x = 0; x < 512; x += 48) { q.flat(ellPx(x + 24, 48, 20, 30), '#3f9a7a', 1); q.flat(circPx(x + 24, 48, 9), '#e8b830', 1); } q.flat(rectPx(0, 0, 512, 8), '#e3b45a', 1); q.flat(rectPx(0, 88, 512, 8), '#e3b45a', 1); }),
};
/** a dragon for the roof ridge, in the colourful chips of Minnan cut-porcelain work */
function ridgeDragon(seed) {
  const w = 600, h = 300, body = [];
  const spine = []; for (let i = 0; i <= 30; i++) { const t = i / 30; spine.push([60 + t * 420, 200 - Math.sin(t * Math.PI * 2.2) * 60 - t * 40]); }
  spine.forEach(([x, y], i) => { const r = 26 - i * 0.55; body.push(circPx(x, y, r, 12)); });
  const head = [[470, 170], [540, 120], [585, 130], [570, 160], [590, 180], [540, 200], [480, 210]], horn = [[520, 128], [500, 70], [536, 118]], tail = [[60, 200], [10, 160], [30, 220], [0, 250], [70, 220]];
  return die(w, h, seed, [...body, head, horn, tail], (q) => {
    body.forEach((s, i) => { const [x, y] = spine[i]; q.flat(s, '#2f8a6a', 1); for (let k = 0; k < 4; k++) q.flat(ellPx(x + (q.rand() - 0.5) * 30, y + (q.rand() - 0.5) * 30, 7, 5, 6), ['#3a64b0', '#e8b830', '#7ac8a8', '#f6efe2'][k], 0.95); });
    [head, horn, tail].forEach((s, i) => q.flat(s, ['#3f9a7a', '#e8b830', '#e8b830'][i], 1));
    q.dot(552, 150, 7, '#ffffff'); q.dot(554, 150, 3.5, '#1e1209');
    for (let k = 0; k < 6; k++) { const [x, y] = spine[k * 5]; q.flat([[x - 6, y - 24], [x, y - 46], [x + 6, y - 24]], '#c8372d', 1); }
    q.ink([[580, 175], [600, 196]], { color: '#e8b830', w: 3, alpha: 1, passes: 1 });
  });
}
function ridgePearl(seed) {
  const w = 220, h = 240, flames = [];
  for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.36; flames.push([[110 + Math.cos(a - 0.12) * 50, 140 + Math.sin(a - 0.12) * 50], [110 + Math.cos(a) * 100, 140 + Math.sin(a) * 100], [110 + Math.cos(a + 0.12) * 50, 140 + Math.sin(a + 0.12) * 50]]); }
  return die(w, h, seed, [circPx(110, 140, 56), ...flames, rectPx(96, 190, 28, 50)], (q) => {
    flames.forEach((f, i) => q.flat(f, i % 2 ? '#e8b830' : '#e86a3a', 1));
    q.wash(circPx(110, 140, 56), '#f6efe2', { alpha: 0.7, layers: 6 }); q.ink(spiralPx(110, 140, 40, 1.6), { color: '#3a64b0', w: 4, alpha: 0.9, passes: 1 });
    q.flat(rectPx(96, 190, 28, 50), '#3f9a7a', 1);
  });
}
function ridgeFlowers(seed) {
  const w = 300, h = 160, parts = [];
  for (let k = 0; k < 5; k++) parts.push(circPx(40 + k * 55, 90 - (k % 2) * 24, 34));
  return die(w, h, seed, [...parts, rectPx(20, 120, 260, 40)], (q) => {
    q.flat(rectPx(20, 120, 260, 40), '#3f9a7a', 1);
    parts.forEach(([[x0]], k) => { const cx = 40 + k * 55, cy = 90 - (k % 2) * 24; for (let j = 0; j < 8; j++) { const a = (j / 8) * TAU; q.flat(ellPx(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, 12, 7), ['#e86a3a', '#e8b830', '#f6efe2', '#3a64b0', '#e86aa0'][k], 1); } q.flat(circPx(cx, cy, 10), '#e8b830', 1); void x0; });
  });
}
function lanternRound(seed, ch) {
  const w = 200, h = 240, body = ellPx(100, 120, 86, 80);
  return die(w, h, seed, [body, rectPx(70, 22, 60, 22), rectPx(70, 194, 60, 22), rectPx(92, 214, 16, 26)], (q, g) => {
    q.wash(body, '#d8402e', { alpha: 0.65, layers: 8 }); q.glow(100, 120, 110, '#ffb070', 0.5);
    for (let k = -2; k <= 2; k++) q.ink(arcPx(100 + k * 80, 120, 110, Math.PI / 2 - 0.75, Math.PI / 2 + 0.75, 12).map(([x, y]) => [100 + (x - 100 - k * 80) * (k / 2.6), y]), { color: '#a8282a', w: 1.2, alpha: 0.5, passes: 1 });
    g.fillStyle = '#f2d78f'; g.textAlign = 'center'; g.font = '900 64px "Noto Serif SC", serif'; g.fillText(ch, 100, 144);
    [rectPx(70, 22, 60, 22), rectPx(70, 194, 60, 22)].forEach((s) => q.flat(s, '#d9a441', 1)); q.flat(rectPx(92, 214, 16, 26), '#e3b45a', 1);
  });
}

/* ---------- the moon courtyard inside the shrine page: quiet colours, no altar ---------- */
function inkRange(seed, col, peaks, mist = true) {
  // layered ink-wash hills: a broken ridge, ink deepening toward the top, texture strokes down the slopes, mist, a fine gold ridge line, little pines
  const w = 1800, h = 700, rand = mulberry(seed);
  let ridge = [[0, 260 + rand() * 200]];
  for (let i = 1; i <= peaks; i++) { ridge.push([((i - 0.5) / peaks) * w + (rand() - 0.5) * 60, 70 + rand() * 200]); ridge.push([(i / peaks) * w, 250 + rand() * 220]); }
  for (let it = 0; it < 4; it++) { const out = []; ridge.forEach((a, i) => { out.push(a); const b = ridge[i + 1]; if (b) out.push([(a[0] + b[0]) / 2 + (rand() - 0.5) * 8, (a[1] + b[1]) / 2 + (rand() - 0.5) * Math.abs(b[0] - a[0]) * 0.32]); }); ridge = out; }
  const shape = [[0, h], ...ridge, [w, h]];
  return die(w, h, seed, [shape], (q, g) => {
    const gr = g.createLinearGradient(0, 60, 0, h); gr.addColorStop(0, col); gr.addColorStop(0.5, col); gr.addColorStop(1, '#c4d0d8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    q.wash(shape, '#1a2230', { alpha: 0.08, layers: 8, vary: 0.01, edge: 0 });
    for (let i = 1; i < ridge.length - 1; i++) {
      const [x, y] = ridge[i], [px_, py] = ridge[i - 1], lit = y < py;
      for (let k = 0; k < 4; k++) {
        const len = 30 + rand() * 110, a = Math.PI / 2 + (lit ? -0.35 : 0.35) + (rand() - 0.5) * 0.6, sx = x + (rand() - 0.5) * 16, sy = y + 5 + rand() * 40;
        g.strokeStyle = lit ? `rgba(220,230,240,${0.06 + rand() * 0.1})` : `rgba(14,18,28,${0.12 + rand() * 0.2})`; g.lineWidth = 0.8 + rand() * 2.2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + Math.cos(a) * len * 0.5 + (rand() - 0.5) * 16, sy + Math.sin(a) * len * 0.5, sx + Math.cos(a) * len, sy + Math.sin(a) * len); g.stroke();
      }
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(14,18,28,${0.08 + rand() * 0.15})`; const r0 = ridge[Math.floor(rand() * ridge.length)]; g.beginPath(); g.arc(r0[0] + (rand() - 0.5) * 30, r0[1] + 8 + rand() * 50, 1 + rand() * 2.2, 0, TAU); g.fill(); }
    if (mist) for (let k = 0; k < 3; k++) { const y = 330 + k * 120 + rand() * 40, mg = g.createLinearGradient(0, y - 70, 0, y + 70); mg.addColorStop(0, 'rgba(206,218,228,0)'); mg.addColorStop(0.5, `rgba(206,218,228,${0.22 + k * 0.08})`); mg.addColorStop(1, 'rgba(206,218,228,0)'); g.fillStyle = mg; g.fillRect(0, y - 70, w, 140); }
    g.strokeStyle = 'rgba(222,190,110,.6)'; g.lineWidth = 2.2; g.beginPath(); ridge.forEach(([x, y], i) => (i ? g.lineTo(x, y + 3) : g.moveTo(x, y + 3))); g.stroke();
    for (let i = 4; i < ridge.length - 4; i += 7) {
      if (rand() < 0.45) continue;
      const [x, y] = ridge[i], s = 0.7 + rand() * 0.6; g.fillStyle = 'rgba(16,22,30,.85)'; g.strokeStyle = 'rgba(16,22,30,.85)'; g.lineWidth = 2 * s;
      g.beginPath(); g.moveTo(x, y + 6); g.quadraticCurveTo(x - 4 * s, y - 10 * s, x + 2 * s, y - 26 * s); g.stroke();
      [[-6, -10, 13], [6, -17, 11], [-2, -25, 8]].forEach(([dx, dy, rw]) => { g.beginPath(); g.ellipse(x + dx * s, y + dy * s, rw * s, 3.6 * s, 0, 0, TAU); g.fill(); });
    }
  }, { margin: 2 });
}
function moonDisc() {
  // a full moon with soft seas, a faint osmanthus tree and jade rabbit, a wisp of gold-edged cloud across its foot
  const c = canvas(1024, 1024), g = c.getContext('2d'), cx = 512, R = 300, rand = mulberry(931);
  const halo = g.createRadialGradient(cx, cx, R * 0.9, cx, cx, 512); halo.addColorStop(0, 'rgba(243,234,208,.55)'); halo.addColorStop(0.45, 'rgba(196,208,232,.16)'); halo.addColorStop(1, 'rgba(196,208,232,0)'); g.fillStyle = halo; g.fillRect(0, 0, 1024, 1024);
  const body = g.createRadialGradient(cx - 70, cx - 80, 20, cx, cx, R); body.addColorStop(0, '#fffbf2'); body.addColorStop(0.75, '#f3e9cf'); body.addColorStop(1, '#d9caa0'); g.fillStyle = body; g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.clip();
  [[420, 430, 110], [600, 380, 80], [560, 560, 120], [400, 610, 70], [660, 640, 60]].forEach(([x, y, r]) => { const m = g.createRadialGradient(x, y, 0, x, y, r); m.addColorStop(0, 'rgba(206,192,150,.45)'); m.addColorStop(1, 'rgba(206,192,150,0)'); g.fillStyle = m; g.fillRect(x - r, y - r, r * 2, r * 2); });
  for (let i = 0; i < 70; i++) { const a = rand() * TAU, d = Math.sqrt(rand()) * R * 0.95, x = cx + Math.cos(a) * d, y = cx + Math.sin(a) * d, r = 3 + rand() * rand() * 16; g.strokeStyle = 'rgba(170,152,110,.28)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,250,236,.25)'; g.beginPath(); g.arc(x - r * 0.25, y - r * 0.25, r * 0.6, 0, TAU); g.fill(); }
  g.globalAlpha = 0.14; g.fillStyle = '#7a6a4a'; g.strokeStyle = '#7a6a4a'; g.lineCap = 'round';
  g.lineWidth = 14; g.beginPath(); g.moveTo(640, 720); g.quadraticCurveTo(620, 600, 650, 500); g.stroke();
  [[650, 470, 70], [590, 500, 50], [710, 510, 52], [640, 410, 50]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
  g.beginPath(); g.ellipse(430, 640, 46, 34, -0.2, 0, TAU); g.fill(); g.beginPath(); g.arc(390, 600, 24, 0, TAU); g.fill();
  [[376, 560, -0.35], [394, 556, -0.1]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, 7, 26, r, 0, TAU); g.fill(); });
  g.beginPath(); g.moveTo(480, 690); g.lineTo(520, 690); g.lineTo(512, 640); g.lineTo(488, 640); g.closePath(); g.fill(); g.lineWidth = 6; g.beginPath(); g.moveTo(470, 610); g.lineTo(505, 655); g.stroke();
  g.globalAlpha = 1; g.restore();
  // a cloud wisp across the lower limb
  const lobes = [[300, 760, 40], [360, 740, 52], [430, 752, 44], [500, 770, 36], [560, 762, 42], [620, 780, 30]];
  g.fillStyle = 'rgba(176,188,212,.78)'; lobes.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); g.fillRect(270, 760, 380, 36);
  g.strokeStyle = 'rgba(222,190,110,.9)'; g.lineWidth = 3; lobes.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); });
  [[360, 748, 26], [500, 776, 18]].forEach(([x, y, r]) => { g.beginPath(); for (let k = 0; k <= 30; k++) { const t = k / 30, a = t * 1.5 * TAU; g.lineTo(x + Math.cos(a) * r * t, y + Math.sin(a) * r * t); } g.stroke(); });
  g.beginPath(); g.moveTo(270, 796); g.quadraticCurveTo(220, 800, 200, 780); g.stroke();
  return c;
}
function iceLattice(seed) {
  // a carved screen of cracked-ice lattice over glowing paper: key-fret border, cloud brackets in the corners, a plum-blossom roundel
  const w = 900, h = 2100, rand = mulberry(seed);
  return die(w, h, seed, [rectPx(20, 20, w - 40, h - 40)], (q, g) => {
    const paper = () => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f0d29a'); gr.addColorStop(0.45, '#f8e6b8'); gr.addColorStop(1, '#c8985c'); g.fillStyle = gr; g.fillRect(0, 0, w, h); const gl = g.createRadialGradient(w / 2, h * 0.42, 40, w / 2, h * 0.42, h * 0.62); gl.addColorStop(0, 'rgba(255,248,220,.75)'); gl.addColorStop(1, 'rgba(255,248,220,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, h); };
    paper();
    for (let i = 0; i < 1400; i++) { g.strokeStyle = `rgba(150,100,50,${0.03 + rand() * 0.06})`; g.lineWidth = 1; const x = rand() * w, y = rand() * h, a = rand() * TAU, l = 6 + rand() * 22; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    const M = 118, area = (p) => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0)) / 2;
    const split = (p) => {
      let cx = 0, cy = 0; p.forEach(([x, y]) => { cx += x; cy += y; }); cx /= p.length; cy /= p.length;
      const xs = p.map((a) => a[0]), ys = p.map((a) => a[1]), sx = Math.max(...xs) - Math.min(...xs), sy = Math.max(...ys) - Math.min(...ys);
      cx += (rand() - 0.5) * sx * 0.3; cy += (rand() - 0.5) * sy * 0.3;
      const a = (sx > sy ? 0 : Math.PI / 2) + (rand() - 0.5) * 1.3, nx = Math.cos(a), ny = Math.sin(a), A = [], B = [];
      p.forEach((pa, i) => { const pb = p[(i + 1) % p.length], da = (pa[0] - cx) * nx + (pa[1] - cy) * ny, db = (pb[0] - cx) * nx + (pb[1] - cy) * ny; (da >= 0 ? A : B).push(pa); if (da >= 0 !== db >= 0) { const t = da / (da - db), ip = [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t]; A.push(ip); B.push(ip); } });
      return A.length > 2 && B.length > 2 ? [A, B] : [p];
    };
    let polys = [[[M, M], [w - M, M], [w - M, h - M], [M, h - M]]];
    for (let k = 0; k < 40; k++) { polys.sort((a, b) => area(b) - area(a)); polys.push(...split(polys.shift())); }
    const RC = [w / 2, h * 0.42, 170];
    const bars = (lines) => [[17, '#24160f'], [10, '#5e3c24'], [2.4, 'rgba(246,206,138,.6)']].forEach(([lw, c], pass) => { g.strokeStyle = c; g.lineWidth = lw; g.lineCap = 'round'; lines.forEach((pts) => { g.beginPath(); pts.forEach(([x, y], i) => { const o = pass === 2 ? -2 : 0; i ? g.lineTo(x + o, y + o) : g.moveTo(x + o, y + o); }); g.stroke(); }); });
    bars(polys.flatMap((p) => p.map((a, i) => [a, p[(i + 1) % p.length]])));
    // the roundel: cleared, ringed, a carved plum blossom inside
    g.save(); g.beginPath(); g.arc(RC[0], RC[1], RC[2], 0, TAU); g.clip(); paper(); g.restore();
    bars([Array.from({ length: 65 }, (_, i) => [RC[0] + Math.cos((i / 64) * TAU) * RC[2], RC[1] + Math.sin((i / 64) * TAU) * RC[2]]), Array.from({ length: 65 }, (_, i) => [RC[0] + Math.cos((i / 64) * TAU) * (RC[2] - 26), RC[1] + Math.sin((i / 64) * TAU) * (RC[2] - 26)])]);
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k / 5) * TAU; g.fillStyle = '#4a2c1a'; g.beginPath(); g.arc(RC[0] + Math.cos(a) * 46, RC[1] + Math.sin(a) * 46, 42, 0, TAU); g.fill(); }
    g.fillStyle = '#c9a45a'; g.beginPath(); g.arc(RC[0], RC[1], 22, 0, TAU); g.fill();
    g.strokeStyle = '#d8b46a'; g.lineWidth = 2.5; for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; g.beginPath(); g.moveTo(RC[0] + Math.cos(a) * 24, RC[1] + Math.sin(a) * 24); g.lineTo(RC[0] + Math.cos(a) * 58, RC[1] + Math.sin(a) * 58); g.stroke(); g.beginPath(); g.arc(RC[0] + Math.cos(a) * 60, RC[1] + Math.sin(a) * 60, 4, 0, TAU); g.fill(); }
    // the frame: dark lacquer, gold rules, a running key-fret
    g.fillStyle = '#24160f'; g.fillRect(0, 0, w, M - 8); g.fillRect(0, h - M + 8, w, M); g.fillRect(0, 0, M - 8, h); g.fillRect(w - M + 8, 0, M, h);
    g.strokeStyle = '#c9a45a'; g.lineWidth = 3; [[34, 34, w - 68, h - 68], [M - 22, M - 22, w - 2 * M + 44, h - 2 * M + 44]].forEach(([x, y, ww, hh]) => g.strokeRect(x, y, ww, hh));
    const fret = (x0, y0, x1, y1) => { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 46), a = Math.atan2(y1 - y0, x1 - x0); g.save(); g.translate(x0, y0); g.rotate(a); g.lineWidth = 3.4; g.lineCap = 'square'; for (let k = 0; k < n; k++) { const u = k * (len / n); g.beginPath(); [[0, 12], [0, -12], [30, -12], [30, 6], [10, 6], [10, -4], [20, -4]].forEach(([x, y], i) => (i ? g.lineTo(u + x + 6, y) : g.moveTo(u + x + 6, y))); g.stroke(); } g.restore(); };
    const mid = (34 + M - 22) / 2;
    fret(mid + 20, mid, w - mid - 20, mid); fret(w - mid - 20, h - mid, mid + 20, h - mid); fret(mid, h - mid - 20, mid, mid + 20); fret(w - mid, mid + 20, w - mid, h - mid - 20);
    // cloud brackets tucked into the inner corners
    [[M, M, 0], [w - M, M, Math.PI / 2], [w - M, h - M, Math.PI], [M, h - M, -Math.PI / 2]].forEach(([x, y, r]) => { g.save(); g.translate(x, y); g.rotate(r); g.fillStyle = '#3a2416'; g.beginPath(); g.moveTo(0, 0); g.lineTo(96, 0); g.quadraticCurveTo(70, 30, 40, 34); g.quadraticCurveTo(34, 70, 0, 96); g.closePath(); g.fill(); g.strokeStyle = '#d8b46a'; g.lineWidth = 2.5; g.beginPath(); for (let k = 0; k <= 30; k++) { const t = k / 30, a = t * 1.4 * TAU; g.lineTo(34 + Math.cos(a) * 20 * t, 34 + Math.sin(a) * 20 * t); } g.stroke(); g.restore(); });
  }, { margin: 2 });
}
function rippleFloor() {
  // dark water: faint scale waves everywhere, rings round the stand, a path of moonlight, lotus leaves edged in gold
  const S = 2048, c = canvas(S, S), g = c.getContext('2d'), cx = S / 2, rand = mulberry(937);
  const bg = g.createRadialGradient(cx, cx, 100, cx, cx, S / 2); bg.addColorStop(0, '#1e2a3a'); bg.addColorStop(1, '#0c121a'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
  g.lineWidth = 1.4;
  for (let row = 0, y = 0; y < S + 40; row++, y += 26) for (let x = (row % 2) * 30; x < S + 60; x += 60) [30, 21, 12].forEach((r, i) => { g.strokeStyle = `rgba(120,150,184,${0.07 + i * 0.015})`; g.beginPath(); g.arc(x, y, r, Math.PI, TAU); g.stroke(); });
  const path = g.createLinearGradient(0, 0, 0, cx); path.addColorStop(0, 'rgba(226,230,246,.16)'); path.addColorStop(1, 'rgba(226,230,246,0)'); g.fillStyle = path; g.beginPath(); g.moveTo(cx - 70, 0); g.lineTo(cx + 70, 0); g.lineTo(cx + 26, cx); g.lineTo(cx - 26, cx); g.fill();
  for (let i = 0; i < 160; i++) { const y = rand() * cx, half = 70 - (y / cx) * 44, x = cx + (rand() - 0.5) * 2 * half; g.strokeStyle = `rgba(240,242,255,${0.2 + rand() * 0.35})`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 6 - rand() * 10, y); g.lineTo(x + 6 + rand() * 10, y); g.stroke(); }
  for (let r = 60; r < 940; r += 20 + r * 0.05) { g.strokeStyle = `rgba(150,176,204,${Math.max(0.04, 0.42 - r / 1600)})`; g.lineWidth = 1.6; g.beginPath(); for (let k = 0; k <= 160; k++) { const a = (k / 160) * TAU, rr = r + Math.sin(a * 6 + r) * 2.5; k ? g.lineTo(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr) : g.moveTo(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr); } g.stroke(); }
  for (let i = 0; i < 16; i++) {
    let a = rand() * TAU; if (Math.abs(Math.sin(a) + 1) < 0.35) a += 1.2;
    const d = 560 + rand() * 360, x = cx + Math.cos(a) * d, y = cx + Math.sin(a) * d, r = 36 + rand() * 50, n = rand() * TAU;
    g.fillStyle = 'rgba(38,74,58,.9)'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, n + 0.25, n + TAU - 0.25); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(214,180,100,.75)'; g.lineWidth = 2.2; g.stroke();
    g.strokeStyle = 'rgba(120,170,130,.45)'; g.lineWidth = 1.2; for (let k = 1; k < 9; k++) { const b = n + 0.25 + (k / 9) * (TAU - 0.5); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(b) * r * 0.9, y + Math.sin(b) * r * 0.9); g.stroke(); }
    if (i % 5 === 0) { g.fillStyle = 'rgba(236,168,184,.95)'; for (let k = 0; k < 6; k++) { const b = (k / 6) * TAU; g.beginPath(); g.ellipse(x + r * 0.6 + Math.cos(b) * 9, y - r * 0.2 + Math.sin(b) * 9, 7, 13, b + Math.PI / 2, 0, TAU); g.fill(); } g.fillStyle = '#f2d060'; g.beginPath(); g.arc(x + r * 0.6, y - r * 0.2, 5, 0, TAU); g.fill(); }
  }
  return c;
}
function cloudLine(seed) {
  // an auspicious cloud: layered lobes in jade grey, gold outlines and curls, a trailing tail
  const w = 520, h = 200, circles = [[120, 120, 58], [210, 88, 70], [300, 108, 60], [380, 130, 46], [70, 144, 38]];
  return die(w, h, seed, [...circles.map(([x, y, r]) => circPx(x, y, r)), rectPx(40, 140, 380, 56)], (q, g) => {
    circles.forEach(([x, y, r]) => { const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, 4, x, y, r); gr.addColorStop(0, '#d8e4dc'); gr.addColorStop(1, '#6f9086'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    g.fillStyle = '#6f9086'; g.fillRect(40, 140, 380, 56);
    circles.forEach(([x, y, r]) => { q.ink(arcPx(x, y, r - 3, Math.PI * 1.02, Math.PI * 1.98, 16), { color: '#d9b25e', w: 2.6, alpha: 0.95, passes: 1 }); q.ink(spiralPx(x, y + 4, r * 0.62, 1.5), { color: '#e6c278', w: 2, alpha: 0.85, passes: 1 }); q.ink(arcPx(x, y, r * 0.82, Math.PI * 1.15, Math.PI * 1.7, 10), { color: '#f4ecd8', w: 1.4, alpha: 0.6, passes: 1 }); });
    q.ink([[44, 194], [416, 194]], { color: '#d9b25e', w: 2.4, alpha: 0.9, passes: 1 });
  }, { margin: 3 });
}
function plumBranch(seed) {
  // an old plum bough: dry-brushed ink bark, mossy dots, five-petalled blossoms with stamens, buds, a few petals falling
  const S = 2, w = 700 * S, h = 500 * S, rand = mulberry(seed);
  const limb = (pts, w0, w1) => { const L = [], R = []; pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, hw = (w0 + ((w1 - w0) * i) / (pts.length - 1)) / 2; L.push([p[0] - (dy / d) * hw, p[1] + (dx / d) * hw]); R.push([p[0] + (dy / d) * hw, p[1] - (dx / d) * hw]); }); return { pts, poly: [...L, ...R.reverse()] }; };
  const sc = (pts) => pts.map(([x, y]) => [x * S, y * S]);
  const limbs = [limb(sc([[-10, 478], [90, 452], [200, 400], [280, 352], [340, 290], [400, 214], [470, 170], [560, 128], [640, 104], [700, 96]]), 64, 10), limb(sc([[330, 300], [318, 240], [292, 180], [262, 124]]), 22, 6), limb(sc([[470, 170], [500, 120], [512, 70]]), 16, 5), limb(sc([[200, 400], [210, 330], [176, 270]]), 18, 5)];
  const flowers = [[200, 384], [240, 372], [332, 296], [302, 214], [272, 140], [420, 196], [508, 112], [512, 70], [566, 124], [640, 100], [182, 290], [208, 336], [470, 160], [604, 112]].map(([x, y]) => [x * S, y * S, (11 + rand() * 4) * S]);
  return die(w, h, seed, [...limbs.map((l) => l.poly), ...flowers.map(([x, y, r]) => circPx(x, y, r * 2.2))], (q, g) => {
    limbs.forEach((l) => { g.fillStyle = '#2a2220'; g.beginPath(); l.poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); });
    limbs.forEach((l) => { for (let k = 0; k < l.pts.length * 18; k++) { const i = Math.floor(rand() * (l.pts.length - 1)), t = rand(), a = l.pts[i], b = l.pts[i + 1], x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, ang = Math.atan2(b[1] - a[1], b[0] - a[0]); g.strokeStyle = `rgba(${rand() < 0.5 ? '120,110,104' : '10,8,8'},${0.25 + rand() * 0.35})`; g.lineWidth = 1 + rand() * 2; g.beginPath(); const o = (rand() - 0.5) * 18 * S * (1 - i / l.pts.length); g.moveTo(x - Math.sin(ang) * o, y + Math.cos(ang) * o); g.lineTo(x - Math.sin(ang) * o + Math.cos(ang) * (10 + rand() * 30), y + Math.cos(ang) * o + Math.sin(ang) * (10 + rand() * 30)); g.stroke(); } for (let k = 0; k < 14; k++) { const p = l.pts[Math.floor(rand() * l.pts.length)]; g.fillStyle = rand() < 0.5 ? 'rgba(60,90,60,.8)' : 'rgba(14,12,10,.9)'; g.beginPath(); g.arc(p[0] + (rand() - 0.5) * 20, p[1] + (rand() - 0.5) * 20, 2 + rand() * 4, 0, TAU); g.fill(); } });
    flowers.forEach(([x, y, r], i) => {
      if (i % 4 === 3) { g.fillStyle = '#d86a84'; g.beginPath(); g.ellipse(x, y, r * 0.5, r * 0.75, rand() * 3, 0, TAU); g.fill(); return; }
      const rot = rand() * TAU;
      for (let k = 0; k < 5; k++) { const a = rot + (k / 5) * TAU, px_ = x + Math.cos(a) * r * 0.85, py = y + Math.sin(a) * r * 0.85, gr = g.createRadialGradient(px_ - Math.cos(a) * r * 0.4, py - Math.sin(a) * r * 0.4, 1, px_, py, r * 0.8); gr.addColorStop(0, '#fffaf6'); gr.addColorStop(1, '#f0b8c6'); g.fillStyle = gr; g.beginPath(); g.arc(px_, py, r * 0.72, 0, TAU); g.fill(); g.strokeStyle = 'rgba(200,120,140,.6)'; g.lineWidth = 1.2; g.stroke(); }
      g.fillStyle = '#a8324a'; g.beginPath(); g.arc(x, y, r * 0.28, 0, TAU); g.fill();
      g.strokeStyle = '#8a2a20'; g.lineWidth = 1.2; for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU + rot, l = r * (0.5 + rand() * 0.2); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); g.fillStyle = '#f2c84a'; g.beginPath(); g.arc(x + Math.cos(a) * l, y + Math.sin(a) * l, 2.4, 0, TAU); g.fill(); }
    });
  });
}
function gateTex() {
  // dark lacquer for the moon gate, a gold key-fret running round its face
  const W = 2048, H = 128, c = canvas(W, H), g = c.getContext('2d'), n = 52, u = W / n;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1e1614'); gr.addColorStop(0.75, '#3a2a24'); gr.addColorStop(1, '#1e1614'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#d2ac60'; g.lineWidth = 2.5; [74, 118].forEach((y) => { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); });
  g.lineWidth = 3; g.lineCap = 'square';
  for (let k = 0; k < n; k++) { const x0 = k * u + 4; g.beginPath(); [[0, 112], [0, 80], [u - 10, 80], [u - 10, 104], [8, 104], [8, 88], [u - 18, 88]].forEach(([x, y], i) => (i ? g.lineTo(x0 + x, y) : g.moveTo(x0 + x, y))); g.stroke(); }
  return c;
}
function eaveTop() {
  const w = 2000, h = 360, shape = [[0, 0], [w, 0], [w, 210], [w - 60, 260], [w - 140, 230], [140, 230], [60, 260], [0, 210]];
  return die(w, h, 935, [shape], (q) => {
    q.wash(shape, '#1e2632', { alpha: 0.8, layers: 8, vary: 0.003, edge: 0 });
    for (let x = 160; x < w - 140; x += 44) { q.flat(arcPx(x, 230, 22, 0, Math.PI, 8), '#2c3644', 1); q.ink(arcPx(x, 230, 22, 0.1, Math.PI - 0.1, 8), { color: '#8a96a8', w: 1.6, alpha: 0.6, passes: 1 }); }
    q.flat(rectPx(0, 150, w, 24), '#3a2a22', 1); q.ink([[0, 150], [w, 150]], { color: '#c9a45a', w: 2, alpha: 0.7, passes: 1 });
  }, { margin: 2 });
}
