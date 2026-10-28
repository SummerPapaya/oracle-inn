/* ---------- the tea table's Lenormand cards: Victorian cut-paper silhouettes ---------- */
/*
 * A cream card with a double gold rule and little corner scrolls; in an oval window a dusk sky in the colour of the
 * card's suit, and in it the card's picture cut as a black paper silhouette, the way Victorian silhouettists cut
 * profiles and scenes; a touch of colour only where the picture needs it (a seal, a ribbon, a lit window, the sun).
 * The playing card the old decks print sits in the top corner; the name is on a ribbon at the foot. Everything is
 * drawn here. Pictures are drawn in a box 200 wide and 236 high round the oval's centre, y downwards.
 */
const LN_INK = '#211a1f', LN_GOLD = '#b88a3e', LN_ROSE = '#b2546a', LN_WARM = '#ffd98a';
const LN_SUIT = {                      // the oval's dusk, top to bottom, by suit
  H: ['#f8dccd', '#efb6ac', '#d98f93'], D: ['#fcebc4', '#f1c88e', '#dc9d6a'],
  C: ['#e6eed6', '#bfd3aa', '#8fb08a'], S: ['#e3e0f2', '#b9b2db', '#8d86bd'],
};
const LN_NIGHT = ['#3a3f72', '#4c4a86', '#7a6a9c'];      // the stars and the moon are night cards whatever their suit

/** the four suits as paths, centred on (x, y), r about half their height */
function lnSuit(g, s, x, y, r) {
  g.beginPath();
  if (s === 'H') { g.moveTo(x, y + r); g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45); g.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r); }
  else if (s === 'D') { g.moveTo(x, y - r); g.quadraticCurveTo(x + r * 0.35, y - r * 0.3, x + r * 0.75, y); g.quadraticCurveTo(x + r * 0.35, y + r * 0.3, x, y + r); g.quadraticCurveTo(x - r * 0.35, y + r * 0.3, x - r * 0.75, y); g.quadraticCurveTo(x - r * 0.35, y - r * 0.3, x, y - r); }
  else if (s === 'S') { g.moveTo(x, y - r); g.bezierCurveTo(x + r * 1.6, y + r * 0.1, x + r * 0.7, y + r * 1.0, x, y + r * 0.35); g.bezierCurveTo(x - r * 0.7, y + r * 1.0, x - r * 1.6, y + r * 0.1, x, y - r); g.moveTo(x, y + r * 0.2); g.lineTo(x + r * 0.32, y + r); g.lineTo(x - r * 0.32, y + r); }
  else { [[0, -0.45], [-0.48, 0.12], [0.48, 0.12]].forEach(([dx, dy]) => { g.moveTo(x + dx * r + r * 0.42, y + dy * r); g.arc(x + dx * r, y + dy * r, r * 0.42, 0, TAU); }); g.moveTo(x, y); g.lineTo(x + r * 0.3, y + r); g.lineTo(x - r * 0.3, y + r); }
  g.fill();
}

/* the silhouettist's tools: every shape is filled in ink, and shapes that overlap simply merge */
function lnSmooth(pts, n = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]); return out;
}
function lnKit(g) {
  const K = {
    ell(x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); },
    circ(x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); },
    poly(pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); },
    line(pts, w, smooth = false) { const p = smooth ? lnSmooth(pts) : pts; g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); },
    path(d) { g.fill(new Path2D(d)); },
    stroke(d, w) { g.lineWidth = w; g.lineCap = g.lineJoin = 'round'; g.stroke(new Path2D(d)); },
    /** a stroke that thins from w0 to w1 along a smoothed curve: stems, tails, branches, a snake */
    taper(pts, w0, w1, wf) {
      const p = lnSmooth(pts, 10), L = [], R = [];
      p.forEach(([x, y], i) => {
        const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        const t = i / (p.length - 1), w = (wf ? wf(t) : w0 + (w1 - w0) * t) / 2;
        L.push([x - (dy / d) * w, y + (dx / d) * w]); R.push([x + (dy / d) * w, y - (dx / d) * w]);
      });
      K.poly([...L, ...R.reverse()]);
      K.circ(p[0][0], p[0][1], (wf ? wf(0) : w0) / 2);
    },
    rect(x, y, w, h) { g.fillRect(x, y, w, h); },
    star(x, y, r, n = 5, inner = 0.45, rot = -Math.PI / 2) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, rr = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); },
    heart(x, y, s, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); g.moveTo(0, s * 0.9); g.bezierCurveTo(-s * 1.4, -s * 0.1, -s * 0.6, -s * 1.1, 0, -s * 0.4); g.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.4, -s * 0.1, 0, s * 0.9); g.fill(); g.restore(); },
    /** the ground: a low mound across the oval with tufts of grass along its top */
    ground(y = 84, seed = 1, wave = 6) {
      const r = mulberry(seed), top = [];
      for (let x = -130; x <= 130; x += 4) top.push([x, y + Math.sin(x * 0.03 + seed) * wave + Math.sin(x * 0.11 + seed * 2) * 1.5]);
      K.poly([...top, [130, 160], [-130, 160]]);
      for (let i = 0; i < 46; i++) { const [x, yy] = top[Math.floor(r() * top.length)], h = 4 + r() * 9, lean = (r() - 0.5) * 6; K.poly([[x - 1.6, yy + 1], [x + lean, yy - h], [x + 1.6, yy + 1]]); }
    },
    birds(list) { list.forEach(([x, y, s]) => K.line([[x - s, y - s * 0.3], [x - s * 0.45, y - s * 0.55], [x, y], [x + s * 0.45, y - s * 0.55], [x + s, y - s * 0.3]], Math.max(1, s * 0.22), true)); },
    in(color, fn) { const f = g.fillStyle, s = g.strokeStyle; g.fillStyle = g.strokeStyle = color; fn(); g.fillStyle = f; g.strokeStyle = s; },
  };
  return K;
}

/** the thirty-six pictures, by card number; each draws with the ink already set */
const LN_PICTURE = {
  1(K) {      // Rider: a horse at full gallop, the rider in a top hat leaning into it
    K.ground(86, 1); K.birds([[-62, -78, 7], [-42, -88, 5]]);
    K.ell(0, 16, 40, 18, -0.04); K.ell(28, 12, 18, 17); K.ell(-28, 12, 20, 18);
    K.taper([[26, 6], [40, -12], [54, -32]], 24, 13); K.ell(61, -30, 14, 7.5, 0.75); K.ell(68, -21, 7, 6, 0.6);
    K.poly([[51, -40], [55, -52], [58, -40]]); K.line([[30, -2], [40, -16], [50, -34]], 4);
    K.line([[32, 26], [48, 40], [66, 36]], 7); K.line([[24, 28], [34, 48], [28, 64]], 7);
    K.line([[-32, 26], [-50, 40], [-72, 46]], 8); K.line([[-24, 28], [-20, 48], [-30, 62]], 7);
    K.taper([[-44, 4], [-62, -2], [-76, 10], [-84, 28]], 10, 3);
    K.taper([[2, -2], [6, -22], [12, -40]], 16, 12); K.circ(14, -50, 7.5);
    K.rect(7, -73, 14, 17); K.line([[3, -57], [25, -57]], 3);
    K.poly([[0, -16], [-18, -8], [-14, -2], [2, -6]]);
    K.line([[9, -34], [26, -22], [46, -24]], 5); K.line([[2, -4], [16, 10], [12, 26]], 7);
    K.line([[46, -24], [62, -22]], 1.2);
  },
  2(K) {      // Clover: a four-leaf clover on a curving stem
    K.ground(92, 2, 4);
    K.taper([[0, -2], [6, 30], [-4, 64], [4, 96]], 7, 4);
    [0.785, 2.356, 3.927, 5.498].forEach((a) => K.heart(Math.cos(a) * 27, -16 + Math.sin(a) * 27, 30, a + Math.PI / 2));
    K.in('rgba(255,244,226,.35)', () => [0.785, 2.356, 3.927, 5.498].forEach((a) => K.line([[Math.cos(a) * 6, -16 + Math.sin(a) * 6], [Math.cos(a) * 42, -16 + Math.sin(a) * 42]], 1.4)));
    [[-62, 74, 11], [64, 70, 10]].forEach(([x, y, s]) => { [-1.57, 0.52, 2.62].forEach((a) => K.heart(x + Math.cos(a) * s * 0.9, y + Math.sin(a) * s * 0.9, s, a + Math.PI / 2)); K.line([[x, y], [x + 2, y + 18]], 2); });
  },
  3(K) {      // Ship: a three-master under full sail on a swelling sea
    K.birds([[-70, -86, 6], [58, -92, 5], [74, -80, 4]]);
    K.path('M -78 20 L 76 20 Q 68 44 42 48 L -46 48 Q -70 44 -78 20 Z');
    K.line([[72, 22], [98, 4]], 3);
    [[-34, -76], [4, -98], [40, -70]].forEach(([x, top]) => {
      K.line([[x, 22], [x, top]], 3.4);
      const h = (20 - top) / 3;
      for (let k = 0; k < 2; k++) { const y0 = top + 6 + k * (h + 4), w = 22 + k * 5; K.path(`M ${x - w} ${y0} Q ${x} ${y0 + 6} ${x + w} ${y0} L ${x + w - 3} ${y0 + h} Q ${x} ${y0 + h + 9} ${x - w + 3} ${y0 + h} Z`); }
      K.poly([[x, top], [x + 14, top + 3], [x, top + 6]]);
    });
    K.path('M 72 20 L 96 6 L 70 -8 Z');
    K.in(LN_WARM, () => [-40, -24, -8, 8, 24, 40].forEach((x) => K.rect(x, 30, 5, 4)));
    const wave = [];
    for (let x = -130; x <= 130; x += 6) wave.push([x, 46 + Math.sin(x * 0.07) * 6 + Math.sin(x * 0.19) * 2]);
    K.poly([...wave, [130, 160], [-130, 160]]);
    K.in('rgba(255,244,226,.45)', () => { for (let x = -110; x < 110; x += 26) K.line([[x, 70 + Math.sin(x) * 4], [x + 12, 66 + Math.sin(x) * 4]], 1.6); });
  },
  4(K) {      // House: a cottage with a lit door and windows, smoke curling from the chimney, a picket fence
    K.ground(66, 4, 3);
    K.rect(-48, -8, 96, 72); K.poly([[-60, -6], [0, -56], [60, -6]]); K.rect(26, -52, 12, 30); K.rect(23, -55, 18, 5);
    K.in('rgba(60,50,60,.35)', () => { K.circ(36, -66, 7); K.circ(44, -78, 9); K.circ(38, -94, 11); });
    K.in(LN_WARM, () => { K.path('M -9 64 L -9 34 A 9 9 0 0 1 9 34 L 9 64 Z'); K.rect(-38, 10, 18, 20); K.rect(20, 10, 18, 20); K.circ(0, -24, 7); });
    K.line([[-29, 10], [-29, 30]], 2); K.line([[-38, 20], [-20, 20]], 2); K.line([[29, 10], [29, 30]], 2); K.line([[20, 20], [38, 20]], 2);
    for (const s of [-1, 1]) { for (let x = 56; x < 120; x += 9) K.poly([[s * x - 3, 70], [s * x - 3, 50], [s * x, 46], [s * x + 3, 50], [s * x + 3, 70]]); K.line([[s * 54, 56], [s * 124, 56]], 2.4); }
    K.circ(-84, 10, 16); K.circ(-74, -4, 14); K.circ(-92, -8, 12); K.line([[-82, 20], [-82, 60]], 5);
  },
  5(K) {      // Tree: a spreading oak with a rope swing
    K.ground(88, 5, 4);
    K.taper([[0, 92], [2, 50], [0, 12]], 24, 14);
    K.taper([[0, 22], [-22, 2], [-44, -18]], 11, 4); K.taper([[0, 14], [22, -6], [40, -28]], 11, 4); K.taper([[0, 4], [-4, -30]], 10, 4);
    K.taper([[-6, 90], [-22, 96]], 8, 3); K.taper([[6, 90], [24, 97]], 8, 3);
    [[-44, -34, 30], [-12, -58, 34], [26, -46, 32], [48, -16, 24], [-54, -4, 22], [0, -26, 30], [18, -76, 22], [-34, -72, 20], [56, -42, 20], [-22, -10, 20]].forEach(([x, y, r]) => K.circ(x, y, r));
    const r = mulberry(55); for (let i = 0; i < 30; i++) { const a = r() * TAU, d = 52 + r() * 22; K.circ(Math.cos(a) * d * 1.05, -36 + Math.sin(a) * d * 0.72, 4 + r() * 5); }
    K.line([[34, -6], [34, 46]], 1.4); K.line([[48, -10], [48, 46]], 1.4); K.rect(30, 45, 22, 4);
  },
  6(K) {      // Clouds: a heavy cloud with a little rain, a paler one drifting behind
    K.ground(96, 6, 3);
    K.in('rgba(70,60,72,.45)', () => [[36, -12, 22], [58, -20, 18], [16, -4, 16], [74, -6, 14], [44, 0, 18]].forEach(([x, y, r]) => K.circ(x, y, r)));
    [[-30, -50, 28], [-2, -62, 30], [26, -50, 24], [-54, -36, 20], [44, -38, 18], [-14, -36, 24], [10, -34, 22]].forEach(([x, y, r]) => K.circ(x, y, r));
    for (let i = 0; i < 9; i++) { const x = -48 + i * 11; K.line([[x, -14 + (i % 2) * 6], [x - 5, 6 + (i % 3) * 5]], 1.6); }
    K.taper([[70, 96], [72, 64], [70, 44]], 6, 3); K.circ(70, 40, 12); K.circ(62, 48, 9); K.circ(78, 50, 9);
  },
  7(K) {      // Snake: coiled on the ground round a stone, head raised
    K.ground(92, 7, 3); K.ell(-48, 84, 22, 12);
    K.taper([[-74, 78], [-30, 86], [12, 78], [32, 54], [6, 36], [-28, 36], [-36, 14], [-10, -2], [22, -8], [36, -28], [30, -46]], 3, 10, (t) => 3 + 13 * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) * (t > 0.85 ? 0.8 : 1));
    K.ell(33, -52, 10, 7, -0.4);
    K.line([[40, -58], [50, -64], [54, -60]], 1.2); K.line([[50, -64], [53, -70]], 1.2);
    K.in('rgba(255,240,215,.4)', () => { const p = lnSmooth([[12, 78], [32, 54], [6, 36], [-28, 36], [-36, 14], [-10, -2], [22, -8]], 6); p.forEach(([x, y], i) => { if (i % 4 === 0) K.star(x, y, 2.4, 4, 0.5, 0); }); K.circ(35, -54, 1.6); });
  },
  8(K) {      // Coffin, softened: a long wooden casket with a sash of ribbon, a spray of lilies laid along its lid
    K.ground(86, 8, 3);
    K.path('M -80 44 L 80 44 L 74 82 L -74 82 Z'); K.path('M -86 44 L -76 26 L 76 26 L 86 44 Z'); K.rect(-88, 42, 176, 6);
    K.in('rgba(255,240,215,.22)', () => { K.line([[-70, 58], [70, 58]], 1.2); K.line([[-68, 70], [68, 70]], 1.2); [[-58, 64], [58, 64]].forEach(([x, y]) => K.circ(x, y, 3)); });
    K.in(LN_ROSE, () => { K.rect(30, 26, 12, 56); K.ell(26, 22, 12, 6, 0.5); K.ell(46, 22, 12, 6, -0.5); K.circ(36, 24, 5); K.poly([[33, 26], [22, 46], [29, 46], [36, 30]]); });
    K.taper([[-74, 20], [-30, 14], [20, 8], [56, 2]], 3, 2);
    [[-34, 14, -0.15], [6, 9, -0.05], [-6, 12, 0.1]].forEach(([x, y, a], i) => K.taper([[x, y], [x + 14 + i * 4, y - 14 - i * 6]], 2.4, 1.6));
    lnLily(K, 56, 2, -0.15, 1); lnLily(K, 24, -22, -0.75, 0.9); lnLily(K, 40, -14, -0.4, 0.8);
    [[-50, 16, -0.15], [-14, 10, -0.2], [-30, 6, -0.6]].forEach(([x, y, a]) => K.ell(x, y, 13, 3.6, a));
  },
  9(K) {      // Bouquet: roses and sprigs gathered in a ribbon
    K.ground(100, 9, 2);
    for (let i = -3; i <= 3; i++) K.line([[i * 3, 40], [i * 6, 96]], 2.6);
    [[-34, -14, 14], [0, -34, 17], [34, -14, 14], [-16, 8, 13], [18, 8, 13], [-46, 12, 10], [46, 12, 10], [0, -6, 13]].forEach(([x, y, r], i) => {
      K.circ(x, y, r); for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + i; K.circ(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.42); }
      K.in('rgba(255,236,220,.32)', () => { g_spiral(K, x, y, r * 0.6); });
    });
    [[-56, -4, -0.6], [56, -4, 0.6], [-26, 28, -0.9], [26, 28, 0.9], [-50, -34, -1.2], [50, -34, 1.2]].forEach(([x, y, a]) => K.ell(x, y, 14, 6, a));
    const r = mulberry(9); for (let i = 0; i < 26; i++) { const a = -Math.PI * (0.1 + r() * 0.8), d = 50 + r() * 22; K.circ(Math.cos(a) * d, Math.sin(a) * d * 0.9 - 2, 2 + r() * 1.6); }
    K.in(LN_ROSE, () => { K.rect(-10, 38, 20, 8); K.ell(-16, 38, 14, 7, -0.3); K.ell(16, 38, 14, 7, 0.3); K.poly([[-4, 44], [-18, 70], [-10, 70], [0, 48]]); K.poly([[4, 44], [18, 70], [10, 70], [0, 48]]); });
  },
  10(K) {     // Scythe: leaning on a sheaf of wheat at harvest time
    K.ground(90, 10, 3); K.birds([[-70, -60, 5]]);
    K.taper([[-54, 94], [-14, 10], [26, -74]], 7, 5); K.line([[-30, 44], [-18, 40]], 4); K.line([[0, -18], [12, -22]], 4);
    K.path('M 28 -76 Q -22 -100 -84 -64 Q -26 -82 26 -64 Z');
    for (let i = -6; i <= 6; i++) { K.line([[56 + i * 0.6, 92], [56 + i * 4.2, -10 + Math.abs(i) * 3]], 2); K.ell(56 + i * 4.4, -16 + Math.abs(i) * 3, 3.2, 8, i * 0.08); }
    K.rect(44, 36, 24, 6);
  },
  11(K) {     // Whip: two coachman's whips crossed, their lashes curling outwards
    K.ground(92, 11, 3);
    for (const d of [-1, 1]) {
      K.taper([[-d * 54, 96], [-d * 12, 24], [d * 28, -46]], 8, 3);
      K.in('rgba(255,240,215,.35)', () => { for (let k = 0; k < 5; k++) { const t = 0.05 + k * 0.035, x = -d * 54 + d * 82 * t, y = 96 - 142 * t; K.line([[x - 4, y - 1], [x + 4, y + 1]], 1.2); } });
      K.ell(-d * 54, 96, 6, 9, d * 0.5); K.circ(d * 28, -46, 3);
      K.taper([[d * 28, -46], [d * 42, -72], [d * 62, -84], [d * 78, -70], [d * 74, -50], [d * 84, -32], [d * 100, -30]], 3, 0.8);
    }
  },
  12(K) {     // Birds: a pair on a flowering branch, talking
    K.birds([[-60, -80, 6], [-44, -90, 4]]);
    K.taper([[-120, 30], [-60, 22], [0, 30], [70, 18], [104, 2]], 9, 3);
    K.taper([[30, 26], [52, 42], [62, 58]], 4, 1.5);
    [[-80, 18, -0.5], [-40, 34, 0.6], [24, 36, 0.8], [80, 6, -0.6], [56, 50, 0.4]].forEach(([x, y, a]) => K.ell(x, y, 10, 4, a));
    const bird = (x, y, dir) => { K.ell(x, y, 15, 10, dir * 0.15); K.circ(x + dir * 11, y - 9, 7); K.poly([[x + dir * 17, y - 11], [x + dir * 25, y - 9], [x + dir * 17, y - 7]]); K.poly([[x - dir * 12, y - 2], [x - dir * 30, y + 6], [x - dir * 26, y + 10], [x - dir * 10, y + 6]]); K.line([[x - 3, y + 8], [x - 4, y + 15]], 1.4); K.line([[x + 3, y + 8], [x + 4, y + 15]], 1.4); };
    bird(-22, 8, 1); bird(26, 6, -1);
    K.in(LN_GOLD, () => { K.circ(-4, -26, 2); K.line([[-2, -26], [-2, -38]], 1.2); K.circ(6, -34, 2); K.line([[8, -34], [8, -46]], 1.2); K.line([[-2, -38], [8, -46]], 1.6); });
  },
  13(K) {     // Child: a little girl bowling a hoop along
    K.ground(86, 13, 3); K.birds([[60, -78, 5]]);
    K.circ(-14, -52, 10); K.path('M -27 -54 Q -26 -70 -12 -68 Q 2 -66 0 -54 Q -10 -60 -27 -54 Z'); K.ell(-24, -44, 5, 8, 0.3);
    K.path('M -22 -40 L -6 -40 L 12 16 L -42 16 Z'); K.in('rgba(255,244,228,.3)', () => K.path('M -20 -14 L -8 -14 L -2 12 L -30 12 Z'));
    K.line([[-22, 16], [-24, 50]], 5); K.line([[-8, 16], [-4, 50]], 5); K.ell(-26, 52, 6, 3); K.ell(-2, 52, 6, 3);
    K.line([[-10, -32], [10, -18], [30, -6]], 4.5);
    K.line([[30, -6], [44, 30]], 2.2);
    g_ring(K, 56, 42, 26, 4);
  },
  14(K) {     // Fox: trotting through the grass, tail tipped white
    K.ground(84, 14, 3);
    K.ell(4, 20, 34, 14); K.ell(-24, 14, 16, 14);
    K.ell(-36, 0, 12, 10); K.poly([[-44, -4], [-66, 6], [-44, 10]]);
    K.poly([[-42, -6], [-38, -26], [-32, -6]]); K.poly([[-32, -6], [-24, -24], [-22, -4]]);
    [[-20, 28, -24, 64], [-10, 30, -4, 64], [20, 28, 16, 64], [30, 26, 38, 62]].forEach(([x0, y0, x1, y1]) => K.line([[x0, y0], [x1, y1]], 5));
    K.path('M 30 12 Q 66 -18 92 12 Q 80 36 36 28 Z');
    K.in('#f3e6cc', () => K.path('M 76 4 Q 90 2 92 12 Q 86 22 76 20 Q 80 12 76 4 Z'));
    K.in('rgba(255,240,215,.7)', () => K.circ(-40, -2, 1.6));
  },
  15(K) {     // Bear: lumbering past the pines
    K.in('rgba(70,60,72,.35)', () => [[-80, 60, 26], [-56, 64, 34], [74, 62, 30]].forEach(([x, y, h]) => K.poly([[x - 12, y], [x, y - h * 2], [x + 12, y]])));
    K.ground(84, 15, 3);
    K.path('M -58 34 Q -66 6 -44 -6 Q -24 -18 -2 -16 Q 14 -24 26 -14 Q 34 -6 40 0 Q 50 -2 58 6 Q 72 10 74 18 Q 70 24 60 24 Q 50 30 40 30 Q 30 40 20 42 L -40 44 Q -56 44 -58 34 Z');
    K.circ(46, -4, 5); K.circ(54, -2, 4.4);
    [[-46, 34, -50, 70, 1], [-28, 38, -24, 72, 0], [14, 34, 10, 70, 1], [30, 30, 34, 70, 0]].forEach(([x0, y0, x1, y1, back]) => { K.taper([[x0, y0], [(x0 + x1) / 2 + (back ? -2 : 2), (y0 + y1) / 2], [x1, y1]], 18, 13); K.ell(x1 + 3, y1 + 2, 10, 5); });
    K.in('rgba(255,240,215,.7)', () => K.circ(58, 8, 1.6));
  },
  16(K) {     // Stars: a stargazer and a telescope on a hill under a sky full of stars
    K.in(LN_GOLD, () => { K.star(-10, -64, 16, 8, 0.38, 0); K.star(40, -40, 7, 5); K.star(-54, -30, 6, 5); K.star(64, -80, 5, 5); K.star(18, -96, 4, 5); K.star(-70, -76, 4, 5); K.star(-30, -6, 3.4, 5); K.star(70, -10, 3, 5); });
    K.in('rgba(255,236,190,.5)', () => K.line([[-10, -64], [40, -40], [70, -10]], 0.8));
    K.ground(70, 16, 10);
    K.line([[10, 70], [26, 40]], 3); K.line([[42, 70], [26, 40]], 3); K.line([[26, 70], [26, 40]], 3);
    K.taper([[14, 46], [52, 18]], 9, 6);
    K.circ(-14, 6, 7); K.path('M -22 16 L -6 16 L -2 58 L -26 58 Z'); K.line([[-8, 22], [12, 38]], 4); K.line([[-20, 58], [-20, 72]], 4); K.line([[-10, 58], [-8, 72]], 4); K.rect(-21, -6, 14, 5);
  },
  17(K) {     // Stork: standing on its nest on a chimney top, another flying in
    K.path('M -120 120 L -120 70 L 120 50 L 120 120 Z'); K.rect(-18, 20, 34, 48); K.rect(-22, 16, 42, 6);
    K.path('M -30 18 Q -2 4 30 18 Q 0 26 -30 18 Z');
    K.in('rgba(255,240,215,.3)', () => { for (let i = 0; i < 6; i++) K.line([[-26 + i * 9, 18], [-20 + i * 9, 12]], 1); });
    K.line([[0, 14], [-2, -10]], 2); K.line([[6, 14], [8, -2], [2, -10]], 2);
    K.ell(2, -22, 24, 12, -0.25); K.poly([[20, -30], [40, -24], [22, -20]]);
    K.taper([[-16, -26], [-22, -48], [-14, -62]], 8, 6); K.circ(-14, -64, 6);
    K.poly([[-18, -66], [-44, -50], [-16, -60]]);
    K.ell(50, -82, 10, 5, 0.2); K.line([[40, -84], [32, -84]], 2); K.poly([[46, -84], [62, -98], [56, -80]]); K.poly([[52, -82], [70, -70], [58, -78]]);
  },
  18(K) {     // Dog: a faithful spaniel sitting up, a ball at its feet
    K.ground(86, 18, 3);
    K.path('M -44 84 Q -54 50 -36 30 Q -24 18 -12 14 Q -2 -2 4 -18 Q 8 -34 20 -40 Q 34 -44 40 -32 Q 44 -26 54 -24 Q 62 -22 60 -14 Q 56 -8 46 -10 Q 38 -8 34 -2 Q 30 12 26 26 Q 24 44 26 60 L 28 84 Z');
    K.path('M 18 -36 Q 6 -30 8 -10 Q 10 4 18 6 Q 24 -6 24 -22 Z');
    K.ell(-36, 74, 22, 14); K.ell(-14, 84, 14, 4);
    K.line([[16, 30], [12, 84]], 7); K.ell(14, 85, 8, 3.4); K.ell(34, 85, 8, 3.4);
    K.taper([[-56, 68], [-72, 52], [-74, 36]], 8, 3);
    K.in(LN_ROSE, () => { K.line([[12, -8], [34, -6]], 3.4); K.circ(66, 78, 9); });
    K.in('rgba(255,240,215,.75)', () => K.circ(36, -30, 1.8));
  },
  19(K) {     // Tower: a round stone tower on a hill, its windows lit, a pennant flying
    K.ground(80, 19, 8); K.birds([[-62, -40, 5], [-48, -52, 4]]);
    K.path('M -24 84 L -20 -54 L 20 -54 L 24 84 Z'); K.rect(-28, -66, 56, 14);
    for (let k = 0; k < 5; k++) K.rect(-28 + k * 12, -76, 8, 11);
    K.line([[0, -76], [0, -104]], 2); K.poly([[0, -104], [22, -98], [0, -92]]);
    K.in(LN_WARM, () => { K.path('M -5 -20 L -5 -32 A 5 5 0 0 1 5 -32 L 5 -20 Z'); K.path('M -5 30 L -5 18 A 5 5 0 0 1 5 18 L 5 30 Z'); K.rect(-12, -46, 4, 6); K.rect(8, -46, 4, 6); });
    K.in('rgba(255,240,215,.2)', () => { for (let y = -46; y < 84; y += 10) K.line([[-22, y], [22, y]], 0.8); });
    K.path('M 24 84 L 24 54 L 70 54 L 70 84 Z'); for (let k = 0; k < 4; k++) K.rect(24 + k * 13, 46, 8, 9);
  },
  20(K) {     // Garden: a rose arbour over the path, clipped topiary, a fountain beyond
    K.in('rgba(70,60,72,.4)', () => { K.rect(-6, -24, 12, 30); K.ell(0, -26, 22, 6); K.ell(0, 6, 30, 6); K.line([[0, -26], [-14, -40]], 2); K.line([[0, -26], [14, -40]], 2); });
    K.ground(66, 20, 2);
    K.in('rgba(255,244,226,.42)', () => K.path('M -10 66 L 10 66 L 34 120 L -34 120 Z'));
    K.line([[-40, 66], [-40, -20]], 5); K.line([[40, 66], [40, -20]], 5); K.stroke('M -40 -20 Q -40 -64 0 -64 Q 40 -64 40 -20', 5);
    const r = mulberry(20); for (let i = 0; i < 34; i++) { const t = r(), a = Math.PI * t, x = -40 * Math.cos(a), y = -20 - 44 * Math.sin(a); K.circ(x + (r() - 0.5) * 10, y + (r() - 0.5) * 8, 3 + r() * 3); }
    K.in(LN_ROSE, () => { for (let i = 0; i < 10; i++) { const a = Math.PI * (0.05 + i * 0.1); K.circ(-40 * Math.cos(a), -22 - 44 * Math.sin(a), 2.4); } });
    for (const s of [-1, 1]) { K.rect(s * 76 - 4, 40, 8, 26); K.circ(s * 76, 26, 16); K.circ(s * 76, 2, 11); K.rect(s * 76 - 9, 62, 18, 6); }
    K.rect(-130, 58, 72, 10); K.rect(58, 58, 72, 10);
  },
  21(K) {     // Mountain: a peak with snow on it, a path winding up, pines at its foot
    K.in('rgba(70,60,72,.38)', () => K.poly([[-130, 40], [-70, -34], [-40, -6], [10, -50], [60, 0], [130, -30], [130, 60], [-130, 60]]));
    K.poly([[-110, 90], [-30, -70], [-14, -54], [4, -84], [80, 20], [120, 60], [120, 90]]);
    K.in('#f4ece0', () => { K.poly([[-30, -70], [-14, -54], [4, -84], [18, -64], [8, -60], [0, -66], [-12, -46], [-22, -58], [-34, -62]]); });
    K.in('rgba(255,244,226,.35)', () => K.line([[-20, 90], [10, 60], [-14, 30], [12, 0], [-2, -30]], 2, true));
    K.ground(92, 21, 2); [[-80, 86], [-66, 90], [70, 84], [86, 88]].forEach(([x, y]) => K.poly([[x - 8, y], [x, y - 26], [x + 8, y]]));
    K.birds([[56, -70, 5], [70, -78, 4]]);
  },
  22(K) {     // Crossroads: a signpost where the road forks
    K.in('rgba(70,60,72,.35)', () => K.poly([[-130, 20], [-60, -6], [0, 8], [70, -12], [130, 14], [130, 40], [-130, 40]]));
    K.ground(30, 22, 2);
    K.in('rgba(255,244,226,.45)', () => K.path('M -14 130 L -4 64 Q 0 46 -30 32 L -18 30 Q 4 40 2 46 Q 6 38 30 30 L 42 32 Q 10 46 6 64 L 18 130 Z'));
    K.line([[0, 100], [0, -60]], 6);
    K.path('M -4 -54 L -58 -66 L -66 -56 L -58 -46 L -4 -40 Z'); K.path('M 4 -30 L 58 -40 L 66 -30 L 58 -20 L 4 -18 Z');
    K.in('rgba(255,240,215,.35)', () => { K.line([[-50, -56], [-14, -50]], 1.2); K.line([[14, -28], [50, -32]], 1.2); });
    [[-80, 30], [84, 30]].forEach(([x, y]) => { K.line([[x, y], [x, y - 20]], 4); K.circ(x, y - 30, 14); K.circ(x - 8, y - 22, 10); K.circ(x + 8, y - 22, 10); });
  },
  23(K) {     // Mice: three of them at a wedge of cheese
    K.ground(80, 23, 2);
    K.path('M -44 80 L 44 80 L 44 24 L -44 50 Z'); K.in('rgba(255,236,200,.5)', () => { K.circ(-22, 62, 6); K.circ(6, 50, 7); K.circ(26, 66, 5); K.circ(30, 38, 4); });
    const mouse = (x, y, dir, s = 1) => { K.ell(x, y, 15 * s, 9 * s); K.poly([[x + dir * 10 * s, y - 6 * s], [x + dir * 26 * s, y + 2 * s], [x + dir * 10 * s, y + 6 * s]]); K.circ(x + dir * 9 * s, y - 10 * s, 5.5 * s); K.line([[x - dir * 14 * s, y], [x - dir * 26 * s, y - 14 * s], [x - dir * 22 * s, y - 28 * s], [x - dir * 30 * s, y - 34 * s]], 1.6, true); K.in('rgba(255,240,215,.7)', () => K.circ(x + dir * 18 * s, y - 2 * s, 1.2 * s)); };
    mouse(-72, 62, 1, 1.5); mouse(74, 64, -1, 1.45); mouse(6, 6, 1, 1.25);
  },
  24(K) {     // Heart: a lace-edged valentine heart
    const r = mulberry(24);
    for (let i = 0; i < 40; i++) { const t = i / 40 * TAU, x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); K.circ(x * 4.4, y * 4.4 - 6, 8); }
    K.heart(0, -6, 52);
    K.in('rgba(255,240,226,.45)', () => { g_heartLine(K, 0, -4, 38); });
    K.in(LN_ROSE, () => K.heart(0, -6, 18));
    K.ground(102, 24, 2);
    [[-64, 78], [64, 78], [-80, 92], [80, 92]].forEach(([x, y]) => { K.circ(x, y, 6); K.ell(x + 8, y + 4, 6, 3, 0.4); });
    void r;
  },
  25(K) {     // Ring: a ring with a cut stone, resting on a tasselled cushion
    K.path('M -70 70 Q -74 46 -50 44 L 50 44 Q 74 46 70 70 Q 72 92 50 92 L -50 92 Q -72 92 -70 70 Z');
    [[-70, 50], [70, 50], [-70, 88], [70, 88]].forEach(([x, y]) => { K.circ(x, y, 4); K.poly([[x - 3, y], [x + 3, y], [x + 5, y + 12], [x - 5, y + 12]]); });
    g_ring(K, 0, 6, 34, 9, 1.18);
    K.poly([[-14, -34], [-8, -44], [8, -44], [14, -34], [0, -18]]); K.rect(-10, -32, 20, 6);
    K.in('rgba(255,250,236,.6)', () => { K.line([[-8, -44], [-2, -34], [0, -18]], 1); K.line([[8, -44], [2, -34], [0, -18]], 1); K.line([[-14, -34], [14, -34]], 1); });
    K.in(LN_GOLD, () => { K.star(28, -58, 7, 4, 0.3, 0); K.star(-30, -50, 5, 4, 0.3, 0); K.star(40, -30, 4, 4, 0.3, 0); });
  },
  26(K) {     // Book: open on a lectern beside a candle, a ribbon marking the place
    K.path('M -10 50 L 10 50 L 16 94 L -16 94 Z'); K.rect(-36, 92, 72, 6);
    K.path('M 0 -4 Q -36 -22 -78 -12 L -74 44 Q -34 34 0 50 Z'); K.path('M 0 -4 Q 36 -22 78 -12 L 74 44 Q 34 34 0 50 Z');
    K.in('rgba(255,244,226,.5)', () => { for (let k = 0; k < 6; k++) { const y = -2 + k * 8; K.line([[-66, y - 4 + k * 0.2], [-10, y + 4]], 1.2); K.line([[10, y + 4], [66, y - 4 + k * 0.2]], 1.2); } });
    K.in(LN_ROSE, () => K.path('M 4 44 L 10 44 L 10 76 L 7 70 L 4 76 Z'));
    K.rect(70, 34, 10, 40); K.ell(75, 74, 14, 4);
    K.in(LN_WARM, () => { K.ell(75, 26, 3.2, 7); });
  },
  27(K) {     // Letter: a sealed envelope and the quill that wrote it
    K.taper([[-76, 92], [-20, 0], [36, -86]], 3, 1.5);
    K.path('M 36 -86 Q 6 -70 -18 -20 Q -6 -40 26 -60 Q 10 -50 -8 -30 Q 30 -56 36 -86 Z');
    K.path('M -64 -24 L 64 -24 L 64 56 L -64 56 Z');
    K.in('rgba(255,244,226,.4)', () => { K.line([[-64, -24], [0, 22], [64, -24]], 1.6); K.line([[-64, 56], [-14, 14]], 1.2); K.line([[64, 56], [14, 14]], 1.2); });
    K.in('#a82c2c', () => { K.circ(0, 22, 12); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; K.circ(Math.cos(a) * 11, 22 + Math.sin(a) * 11, 3.4); } });
    K.in('rgba(255,220,200,.6)', () => K.star(0, 22, 5, 5));
    K.path('M 60 74 L 84 74 L 82 94 L 62 94 Z'); K.ell(72, 74, 13, 4);
  },
  28(K) {     // Gentleman: a profile bust in a top hat, facing right, as a silhouettist would cut it
    K.path('M -46 110 Q -50 74 -24 60 Q -28 46 -26 30 Q -40 22 -42 2 Q -44 -24 -30 -40 L 24 -42 Q 28 -36 28 -30 Q 32 -26 33 -20 Q 34 -16 32 -12 L 46 2 Q 48 7 40 8 L 36 9 Q 38 13 35 15 Q 37 18 34 20 Q 35 22 34 25 Q 32 30 24 32 Q 22 40 26 46 L 38 54 Q 64 60 72 80 Q 78 96 76 110 Z');
    K.path('M -36 -40 L -34 -98 Q -4 -104 22 -98 L 26 -40 Z'); K.path('M -52 -40 Q -8 -50 42 -40 Q -4 -32 -52 -40 Z');
    K.in('rgba(255,244,226,.38)', () => { K.path('M 12 40 Q 28 44 38 54 Q 32 66 18 64 Q 24 52 12 40 Z'); K.line([[-36, -50], [24, -50]], 2.4); K.path('M -4 70 L 8 104 L 18 104 L 10 70 Z'); });
    K.path('M -16 0 Q -24 18 -18 34 Q -30 22 -28 4 Z');
  },
  29(K) {     // Lady: her profile facing left, hair up in a bun with a ringlet, a cameo at her throat
    K.path('M 46 110 Q 52 76 26 62 Q 30 48 26 32 Q 34 20 34 -2 Q 34 -30 12 -42 Q -12 -48 -24 -36 Q -28 -30 -28 -24 Q -32 -20 -33 -14 L -42 -2 Q -43 3 -36 4 L -32 5 Q -34 9 -31 11 Q -33 14 -30 16 Q -31 18 -30 21 Q -28 26 -20 28 Q -20 36 -24 44 Q -54 58 -68 78 Q -76 96 -76 110 Z');
    K.circ(30, -42, 18); K.circ(42, -26, 11); K.circ(16, -56, 13); K.circ(4, -48, 10);
    K.taper([[34, -12], [44, 6], [36, 24], [44, 40]], 8, 4);
    K.in(LN_ROSE, () => { K.ell(-6, -52, 7, 4.4, -0.4); K.circ(4, -56, 3); });
    K.in('rgba(255,244,226,.38)', () => { for (let k = 0; k < 8; k++) K.circ(-40 + k * 10, 60 + Math.abs(k - 3.5) * 2, 4.6); });
    K.in('#f3e6cc', () => K.ell(-8, 74, 8, 10)); K.in(LN_ROSE, () => K.ell(-8, 74, 5, 6.6));
  },
  30(K) {     // Lily: tall white lilies in flower, buds still closed
    K.ground(92, 30, 3);
    K.taper([[0, 96], [2, 30], [-2, -30]], 5, 3); K.taper([[2, 46], [26, 10], [34, -8]], 4, 2.5); K.taper([[0, 36], [-26, 4], [-36, -12]], 4, 2.5);
    lnLily(K, -2, -30, -1.75, 1.25); lnLily(K, 34, -8, -0.75, 1.1); lnLily(K, -36, -12, -2.4, 1.1);
    K.ell(16, -64, 5, 14, 0.35); K.ell(-24, -58, 4.6, 13, -0.35); K.line([[12, -52], [6, -36]], 2); K.line([[-20, -46], [-10, -32]], 2);
    [[-14, 70, -0.5, -1], [16, 62, 0.5, 1], [-12, 30, -0.7, -1], [14, 18, 0.7, 1]].forEach(([x, y, a, d]) => K.ell(x + d * 10, y - 4, 20, 4.5, a));
  },
  31(K) {     // Sun: a smiling sun over the hills and a farmstead
    K.in(LN_GOLD, () => { for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; if (k % 2) K.taper([[Math.cos(a) * 40, -40 + Math.sin(a) * 40], [Math.cos(a + 0.08) * 52, -40 + Math.sin(a + 0.08) * 52], [Math.cos(a - 0.06) * 64, -40 + Math.sin(a - 0.06) * 64]], 5, 1); else K.poly([[Math.cos(a - 0.1) * 38, -40 + Math.sin(a - 0.1) * 38], [Math.cos(a) * 70, -40 + Math.sin(a) * 70], [Math.cos(a + 0.1) * 38, -40 + Math.sin(a + 0.1) * 38]]); } K.circ(0, -40, 36); });
    K.in('rgba(150,96,30,.55)', () => { K.line([[-16, -46], [-8, -48]], 2.4); K.line([[8, -48], [16, -46]], 2.4); K.stroke('M -12 -28 Q 0 -20 12 -28', 2.4); });
    K.ground(60, 31, 12);
    K.rect(40, 26, 30, 22); K.poly([[36, 28], [55, 12], [74, 28]]); K.in(LN_WARM, () => K.rect(50, 34, 7, 7));
    [[-70, 40], [-54, 46]].forEach(([x, y]) => { K.line([[x, y], [x, y - 14]], 3); K.circ(x, y - 22, 11); });
  },
  32(K) {     // Moon: a crescent with a sleepy face over the roofs and chimneys of a town
    const g = K.g;
    K.in('#f5e6b8', () => { g.beginPath(); moonPath(g, -6, -46, 40, 0.42, 0.84, -0.3); g.fill(); });
    K.in('rgba(150,110,60,.55)', () => { K.stroke('M -30 -54 Q -24 -50 -20 -54', 2); K.stroke('M -28 -32 Q -22 -28 -16 -32', 2); });
    K.in(LN_GOLD, () => { K.star(50, -80, 5, 5); K.star(64, -40, 4, 5); K.star(-70, -86, 4, 5); K.star(34, -18, 3, 5); });
    [[-120, 40, 40], [-80, 24, 36], [-44, 34, 30], [-14, 18, 36], [22, 30, 30], [52, 14, 40], [92, 28, 40]].forEach(([x, y, w]) => { K.rect(x, y, w, 120); K.poly([[x - 3, y + 2], [x + w / 2, y - 16], [x + w + 3, y + 2]]); });
    [[-70, 0], [-4, -6], [70, -8]].forEach(([x, y]) => K.rect(x, y, 7, 22));
    K.in(LN_WARM, () => { K.rect(-70, 44, 7, 9); K.rect(-2, 36, 7, 9); K.rect(64, 34, 7, 9); K.rect(30, 50, 6, 8); });
  },
  33(K) {     // Key: an old iron key with a trefoil bow, a ribbon tied through it
    const g = K.g; g.save(); g.rotate(-0.6);
    [[-58, -12], [-46, -26], [-46, 2]].forEach(([x, y]) => K.circ(x, y, 13)); K.circ(-50, -12, 10);
    K.in('#f3e6cc', () => [[-58, -12], [-46, -26], [-46, 2]].forEach(([x, y]) => K.circ(x, y, 5)));
    K.rect(-40, -17, 100, 10); K.rect(-34, -21, 6, 18); K.rect(-24, -21, 4, 18);
    K.path('M 40 -8 L 40 18 L 46 18 L 46 10 L 52 10 L 52 22 L 60 22 L 60 -8 Z');
    g.restore();
    K.in(LN_ROSE, () => { K.ell(-34, 26, 12, 6, -0.6); K.ell(-50, 40, 12, 6, 0.9); K.line([[-40, 30], [-46, 62]], 3); K.line([[-40, 30], [-28, 60]], 3); });
    K.in(LN_GOLD, () => { K.star(50, -60, 6, 4, 0.3, 0); K.star(70, -30, 4, 4, 0.3, 0); });
  },
  34(K) {     // Fish: two fish leaping from the waves
    const fish = (x, y, a, s) => { const g = K.g; g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); K.path('M -34 0 Q -10 -22 22 -6 L 40 -18 L 34 0 L 40 18 L 22 6 Q -10 22 -34 0 Z'); K.path('M -6 -14 Q 4 -26 14 -10 Z'); K.in('rgba(255,244,226,.7)', () => K.circ(-22, -3, 2.2)); g.restore(); };
    fish(-36, -30, 0.6, 1.1); fish(36, -10, -0.5 + Math.PI, 0.95);
    K.in('rgba(255,244,226,.6)', () => [[-4, -60, 3], [6, -72, 2.2], [-10, -82, 1.8]].forEach(([x, y, r]) => { const g = K.g; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }));
    const wave = []; for (let x = -130; x <= 130; x += 6) wave.push([x, 50 + Math.sin(x * 0.06) * 8]);
    K.poly([...wave, [130, 160], [-130, 160]]);
    K.in('rgba(255,244,226,.45)', () => { for (let x = -100; x < 110; x += 30) K.line([[x, 70], [x + 14, 66]], 1.6); });
  },
  35(K) {     // Anchor: on the sand with its rope, a starfish beside it
    K.ground(88, 35, 2);
    g_ring(K, 0, -74, 10, 5);
    K.rect(-4, -64, 8, 112); K.rect(-34, -56, 68, 8); K.circ(-36, -52, 5); K.circ(36, -52, 5);
    K.stroke('M -50 30 Q -46 58 0 60 Q 46 58 50 30', 8);
    K.poly([[-58, 22], [-44, 26], [-54, 40]]); K.poly([[58, 22], [44, 26], [54, 40]]);
    K.in('rgba(255,244,226,.5)', () => K.line([[-4, -40], [10, -30], [-8, -16], [10, -2], [-8, 12], [6, 24]], 2, true));
    K.in(LN_ROSE, () => K.star(64, 84, 9, 5, 0.42));
  },
  36(K) {     // Cross: a plain wooden cross on a hillside at dusk, wildflowers at its foot
    K.birds([[-60, -70, 5], [-44, -80, 4], [60, -60, 4]]);
    K.ground(70, 36, 14);
    K.rect(-5, -70, 10, 146); K.rect(-34, -42, 68, 9);
    K.in('rgba(255,240,215,.22)', () => { K.line([[-1, -64], [-1, 60]], 1); K.line([[-28, -38], [28, -38]], 1); });
    K.in(LN_ROSE, () => [[-22, 66], [-14, 72], [18, 68], [26, 74], [10, 76]].forEach(([x, y]) => K.circ(x, y, 3)));
    [[-22, 66], [-14, 72], [18, 68], [26, 74], [10, 76]].forEach(([x, y]) => K.line([[x, y + 2], [x, y + 14]], 1.4));
  },
};
/* small shared drawings */
function lnLily(K, x, y, a, s = 1) {
  const g = K.g; g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
  K.path('M 0 -3 L 14 -5 L 14 5 L 0 3 Z');
  for (const k of [-1, 0, 1]) K.taper([[10, k * 3], [20, k * 7], [28, k * 13], [30, k * 19 + (k ? 0 : 2)], [26, k * 24 + (k ? 0 : 4)]], 4, 2, (t) => 3 + 8 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
  K.in(LN_GOLD, () => { for (const k of [-1, -0.4, 0.4, 1]) { K.line([[14, k * 2], [32, k * 6]], 0.9); K.ell(33, k * 6.4, 2.4, 1.3, k * 0.2); } });
  g.restore();
}
function g_spiral(K, x, y, r) { const g = K.g; g.lineWidth = 1.2; g.beginPath(); for (let t = 0; t < 14; t++) { const a = t * 0.7, rr = r * (t / 14); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.stroke(); }
function g_ring(K, x, y, r, w, sy = 1) { const g = K.g; g.lineWidth = w; g.beginPath(); g.ellipse(x, y, r, r * sy, 0, 0, TAU); g.stroke(); }
function g_heartLine(K, x, y, s) { const g = K.g; g.lineWidth = 1.6; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9); g.stroke(); g.setLineDash([]); }

/** one card's face, w pixels wide (the card is 400 by 620 at w = 400) */
function lenormandCard(k, w = 400) {
  const [name, en, inset] = LENORMAND[k], no = k + 1, s = w / 400, c = canvas(w, w * 1.55), g = c.getContext('2d');
  g.scale(s, s);
  const rnd = mulberry(700 + no);
  // the card: cream, a little aged at the edges, with a fine grain
  g.fillStyle = '#f3e6cc'; g.fillRect(0, 0, 400, 620);
  const age = g.createRadialGradient(200, 300, 160, 200, 310, 420); age.addColorStop(0, 'rgba(255,250,236,0)'); age.addColorStop(1, 'rgba(170,120,70,.32)');
  g.fillStyle = age; g.fillRect(0, 0, 400, 620);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '120,90,60' : '255,255,245'},${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * 400, rnd() * 620, 1.4, 1.4); }
  // the double gold rule with scrolls in the corners
  g.strokeStyle = LN_GOLD; g.lineWidth = 3; g.strokeRect(14, 14, 372, 592); g.lineWidth = 1.2; g.strokeRect(22, 22, 356, 576);
  for (const [cx, cy, sx, sy] of [[22, 22, 1, 1], [378, 22, -1, 1], [22, 598, 1, -1], [378, 598, -1, -1]]) {
    g.save(); g.translate(cx, cy); g.scale(sx, sy); g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(6, 30); g.bezierCurveTo(6, 14, 14, 6, 30, 6); g.stroke();
    g.beginPath(); g.arc(18, 18, 5, 0, TAU); g.stroke(); g.fillStyle = LN_GOLD; g.beginPath(); g.arc(18, 18, 2, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(34, 6); g.quadraticCurveTo(46, 12, 44, 20); g.moveTo(6, 34); g.quadraticCurveTo(12, 46, 20, 44); g.stroke();
    g.restore();
  }
  // the oval window: the suit's dusk (a night sky for the stars and the moon), a faint sun low in it
  const OX = 200, OY = 270, RX = 148, RY = 178, sky = no === 16 || no === 32 ? LN_NIGHT : LN_SUIT[inset.slice(-1)];
  g.save(); g.beginPath(); g.ellipse(OX, OY, RX, RY, 0, 0, TAU); g.clip();
  const gr = g.createLinearGradient(0, OY - RY, 0, OY + RY); sky.forEach((cc, i) => gr.addColorStop(i / (sky.length - 1), cc)); g.fillStyle = gr; g.fillRect(0, 0, 400, 620);
  if (sky !== LN_NIGHT) { const sun = g.createRadialGradient(OX, OY + 60, 10, OX, OY + 60, 170); sun.addColorStop(0, 'rgba(255,248,226,.55)'); sun.addColorStop(1, 'rgba(255,248,226,0)'); g.fillStyle = sun; g.fillRect(0, 0, 400, 620); }
  else for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,240,210,${0.25 + rnd() * 0.5})`; g.beginPath(); g.arc(OX + (rnd() - 0.5) * 2 * RX, OY - RY + rnd() * RY * 1.2, 0.6 + rnd() * 1.2, 0, TAU); g.fill(); }
  // the picture is cut paper laid over the tinted ground: a soft shadow under it, and the oval darkening a little at its edge
  g.save(); g.shadowColor = 'rgba(40,18,30,.4)'; g.shadowBlur = 7; g.shadowOffsetY = 3;
  g.translate(OX, OY); g.scale(RX / 100, RX / 100);
  g.fillStyle = g.strokeStyle = LN_INK;
  const K = lnKit(g); K.g = g;
  LN_PICTURE[no](K);
  g.restore();
  const vig = g.createRadialGradient(OX, OY, RX * 0.7, OX, OY, RY * 1.02); vig.addColorStop(0, 'rgba(60,30,40,0)'); vig.addColorStop(1, 'rgba(60,30,40,.28)');
  g.fillStyle = vig; g.fillRect(0, 0, 400, 620);
  g.restore();
  g.strokeStyle = LN_GOLD; g.lineWidth = 3; g.beginPath(); g.ellipse(OX, OY, RX, RY, 0, 0, TAU); g.stroke();
  g.lineWidth = 1; g.beginPath(); g.ellipse(OX, OY, RX + 6, RY + 6, 0, 0, TAU); g.stroke();
  // the playing card in the corner, as on the old decks
  const red = 'HD'.includes(inset.slice(-1)), rank = inset.slice(0, -1);
  g.save(); g.translate(38, 38); g.rotate(-0.06);
  g.fillStyle = 'rgba(80,50,30,.25)'; g.fillRect(3, 4, 54, 76);
  g.fillStyle = '#fffaf0'; g.strokeStyle = '#8a7050'; g.lineWidth = 1.2; g.beginPath(); g.roundRect(0, 0, 54, 76, 5); g.fill(); g.stroke();
  g.fillStyle = red ? '#b0302c' : '#221a1e'; g.textAlign = 'center'; g.font = `600 ${rank.length > 1 ? 22 : 26}px "Cormorant Garamond", serif`; g.fillText(rank, 27, 30);
  lnSuit(g, inset.slice(-1), 27, 52, 11);
  g.restore();
  // the number at the top
  g.fillStyle = '#6a4a2a'; g.textAlign = 'center'; g.font = 'italic 600 30px "Cormorant Garamond", serif'; g.fillText(String(no), 200, 66);
  g.strokeStyle = LN_GOLD; g.lineWidth = 1; [[150, 182], [218, 250]].forEach(([a, b]) => { g.beginPath(); g.moveTo(a, 56); g.lineTo(b, 56); g.stroke(); });
  // the ribbon with the name
  const ry = 492;
  g.fillStyle = '#7a4a52'; [[1, 60], [-1, 340]].forEach(([d, x]) => { g.beginPath(); g.moveTo(x, ry + 6); g.lineTo(x - d * 34, ry + 4); g.lineTo(x - d * 22, ry + 30); g.lineTo(x - d * 34, ry + 56); g.lineTo(x, ry + 54); g.closePath(); g.fill(); });
  g.fillStyle = '#9b5a64'; g.beginPath(); g.moveTo(58, ry); g.quadraticCurveTo(200, ry - 14, 342, ry); g.lineTo(342, ry + 50); g.quadraticCurveTo(200, ry + 36, 58, ry + 50); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,226,180,.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(66, ry + 6); g.quadraticCurveTo(200, ry - 7, 334, ry + 6); g.moveTo(66, ry + 44); g.quadraticCurveTo(200, ry + 31, 334, ry + 44); g.stroke();
  g.fillStyle = '#fff4dc'; g.font = `900 ${name.length > 2 ? 30 : 34}px "Noto Serif SC", serif`; g.textBaseline = 'middle'; g.fillText([...name].join(name.length > 2 ? '' : ' '), 200, ry + 20);
  g.fillStyle = '#6a4a2a'; g.font = 'italic 500 26px "Cormorant Garamond", serif'; g.fillText(en, 200, ry + 82);
  return c;
}
/** the back of every card: teal and gold, a teacup in a medallion, little stars all round */
function lenormandBack(w = 400) {
  const s = w / 400, c = canvas(w, w * 1.55), g = c.getContext('2d'); g.scale(s, s);
  const rnd = mulberry(911);
  g.fillStyle = '#2c5c5a'; g.fillRect(0, 0, 400, 620);
  const gl = g.createRadialGradient(200, 310, 40, 200, 310, 380); gl.addColorStop(0, 'rgba(120,190,180,.35)'); gl.addColorStop(1, 'rgba(10,30,30,.4)'); g.fillStyle = gl; g.fillRect(0, 0, 400, 620);
  g.strokeStyle = 'rgba(214,180,110,.28)'; g.lineWidth = 1;
  for (let x = -620; x < 400; x += 26) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 620, 620); g.stroke(); g.beginPath(); g.moveTo(x + 620, 0); g.lineTo(x, 620); g.stroke(); }
  g.fillStyle = 'rgba(233,166,184,.55)'; for (let y = 13; y < 620; y += 26) for (let x = (y / 26) % 2 ? 13 : 0; x < 400; x += 26) { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
  g.strokeStyle = '#d6b46e'; g.lineWidth = 3; g.strokeRect(14, 14, 372, 592); g.lineWidth = 1.2; g.strokeRect(24, 24, 352, 572);
  g.fillStyle = '#244a48'; g.beginPath(); g.ellipse(200, 310, 112, 150, 0, 0, TAU); g.fill();
  g.strokeStyle = '#d6b46e'; g.lineWidth = 3; g.stroke(); g.lineWidth = 1; g.beginPath(); g.ellipse(200, 310, 120, 158, 0, 0, TAU); g.stroke();
  g.fillStyle = '#d6b46e';
  // the teacup and saucer
  g.beginPath(); g.moveTo(146, 300); g.lineTo(254, 300); g.bezierCurveTo(250, 354, 226, 372, 200, 372); g.bezierCurveTo(174, 372, 150, 354, 146, 300); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#d6b46e'; g.beginPath(); g.arc(258, 326, 16, -1.2, 1.4); g.stroke();
  g.beginPath(); g.ellipse(200, 380, 76, 10, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(233,166,184,.9)'; [[178, 330], [200, 340], [222, 330]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); });
  g.strokeStyle = 'rgba(214,180,110,.8)'; g.lineWidth = 2.4; [[180, 0], [200, 1], [220, 2]].forEach(([x, k]) => { g.beginPath(); g.moveTo(x, 290); g.bezierCurveTo(x - 10, 270 - k * 4, x + 10, 256, x, 236 - k * 6); g.stroke(); });
  g.fillStyle = '#d6b46e';
  const star8 = (x, y, r) => { g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, rr = i % 2 ? r * 0.4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  star8(200, 196, 14); star8(150, 232, 6); star8(250, 232, 6);
  for (let i = 0; i < 18; i++) star8(40 + rnd() * 320, 40 + rnd() * 540, 2 + rnd() * 2.4);
  g.font = 'italic 600 26px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.fillText('Lenormand', 200, 430);
  for (const [x, y, r] of [[200, 60, 0], [200, 560, Math.PI]]) { g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); for (let k = -3; k <= 3; k++) { g.moveTo(0, 0); g.lineTo(k * 12, -20 + Math.abs(k) * 3); } g.lineWidth = 1.6; g.strokeStyle = '#d6b46e'; g.stroke(); g.restore(); }
  return c;
}
