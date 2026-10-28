/* ================= pop-up art ================= */
/*
 * Everything that stands up from a page is a die-cut card: a watercolour picture printed on cream
 * card with a thin paper margin and a faint cut edge, the way a real pop-up book is made.
 * Shapes are given in pixels of their own canvas; `px` wraps the painter so it takes pixels too.
 */
const PAPER = '#f8f1e2';
function circPx(x, y, r, n = 30) { return Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; }); }
function ellPx(x, y, rx, ry, n = 30) { return Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry]; }); }
function rectPx(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function arcPx(x, y, r, a0, a1, n = 16) { return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [x + Math.cos(a) * r, y + Math.sin(a) * r]; }); }
function archPx(x, y, w, h) { const r = w / 2; return [[x, y + h], [x, y + r], ...arcPx(x + r, y + r, r, Math.PI, TAU, 18).slice(1, -1), [x + w, y + r], [x + w, y + h]]; }
function spiralPx(x, y, r, turns = 1.6, n = 40) { return Array.from({ length: n }, (_, i) => { const t = i / (n - 1), a = t * turns * TAU; return [x + Math.cos(a) * r * t, y + Math.sin(a) * r * t]; }); }
function starPx(x, y, R, r, n = 5, rot = -Math.PI / 2) { return Array.from({ length: n * 2 }, (_, i) => { const a = rot + (i * Math.PI) / n, rr = i % 2 ? r : R; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; }); }

/** the painter, taking pixel coordinates */
function px(p, w, h) {
  const F = (pts) => pts.map(([x, y]) => [x / w, y / h]);
  return {
    w, h, g: p.g, rand: p.rand, S: p.S,
    wash: (pts, col, o) => p.wash(F(pts), col, o),
    flat: (pts, col, a) => p.flat(F(pts), col, a),
    ink: (pts, o) => p.ink(F(pts), o),
    glow: (x, y, r, col, a, b) => p.glow(x / w, y / h, r / h, col, a, b),
    dot: (x, y, r, col, a) => p.dot(x / w, y / h, r / h, col, a),
    sparkle: (x, y, r, col, a) => p.sparkle(x / w, y / h, r / h, col, a),
    stroke: (x, y, len, ang, col, wd, a) => p.stroke(x / w, y / h, len / h, ang, col, wd, a),
    vgrad: (stops, y0 = 0, y1 = h) => p.vgrad(stops, [0, y0 / h, 1, y1 / h]),
    circle: circPx, ell: ellPx, rect: rectPx,
  };
}

/** a die-cut card: paper margin, cut edge, then the picture clipped to the shape */
function die(w, h, seed, outline, paint, o = {}) {
  const c = canvas(w, h), k = Math.max(w, h) / 600, p = painter(c, seed, k), g = p.g;
  const m = (o.margin ?? 5) * k, rule = o.evenodd ? 'evenodd' : 'nonzero';
  const trace = () => { g.beginPath(); for (const poly of outline) { poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); } };
  g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
  trace(); g.strokeStyle = 'rgba(96,74,60,.55)'; g.lineWidth = m * 2 + 2.4 * k; g.stroke();
  g.strokeStyle = PAPER; g.lineWidth = m * 2; g.stroke(); g.fillStyle = PAPER; g.fill(rule);
  g.restore();
  g.save(); trace(); g.clip(rule); paint(px(p, w, h), g); g.restore();
  return c;
}
/** a plain painted texture, no cut */
function sheet(w, h, seed, paint) { const c = canvas(w, h), p = painter(c, seed, Math.max(w, h) / 600); paint(px(p, w, h), p.g); return c; }

/* ---------- the skies at the back of each spread ---------- */

const SKIES = {
  tent: {
    stops: [[0, '#151e48'], [0.5, '#283f7a'], [0.85, '#4d5e98'], [1, '#6a6f9e']],
    shape: () => [circPx(1100, 118, 80)],
    paint(q, w, h) {
      q.glow(1100, 118, 210, '#fff0c4', 0.3);
      q.wash(q.circle(1100, 118, 66), '#fff3d4', { alpha: 0.42, layers: 14, vary: 0.02, edgeColor: '#e6cf98', edge: 0.5 });
      q.g.fillStyle = q.skyGrad; q.g.beginPath(); q.g.arc(1132, 96, 60, 0, TAU); q.g.fill();
      q.wash([[0, 420], [180, 372], [360, 396], [560, 352], [760, 390], [980, 362], [1200, 386], [1400, 356], [1400, 560], [0, 560]], '#35497c', { alpha: 0.24, layers: 14, vary: 0.02 });
      for (let k = 0; k < 7; k++) {
        const x = 500 + k * 44 + q.rand() * 10, y = 372 + Math.abs(k - 3) * 6;
        q.flat(rectPx(x, y, 26, 20), '#2a3a63'); q.flat([[x - 4, y], [x + 13, y - 14], [x + 30, y]], '#24335a');
        q.dot(x + 9, y + 9, 3.2, '#ffd77a', 0.95); q.glow(x + 10, y + 9, 16, '#ffc76a', 0.35);
      }
      q.wash([[0, 470], [240, 432], [480, 462], [720, 424], [960, 458], [1180, 432], [1400, 462], [1400, 560], [0, 560]], '#22344e', { alpha: 0.32, layers: 14, vary: 0.02 });
      q.wash(q.ell(700, 470, 700, 40), '#a9b3dc', { alpha: 0.05, layers: 10, edge: 0 });
    },
  },
  shrine: {
    stops: [[0, '#13223c'], [0.5, '#21425a'], [0.85, '#3d6672'], [1, '#5f8584']],
    shape: () => [circPx(1010, 128, 96), [[70, 300], [200, 112], [262, 176], [334, 62], [432, 206], [522, 146], [620, 300]]],
    paint(q) {
      q.glow(1010, 128, 250, '#fff0c4', 0.3);
      q.wash(q.circle(1010, 128, 82), '#fff4da', { alpha: 0.36, layers: 16, vary: 0.015, edgeColor: '#e6cf98', edge: 0.5 });
      q.wash([[40, 330], [200, 112], [262, 176], [334, 62], [432, 206], [522, 146], [660, 330], [660, 420], [40, 420]], '#2f5868', { alpha: 0.24, layers: 16, vary: 0.02 });
      for (let i = 0; i < 40; i++) { const x = 180 + q.rand() * 360, y = 140 + q.rand() * 180; q.stroke(x, y, 30 + q.rand() * 40, Math.PI / 2 + (q.rand() - 0.5) * 0.6, '#1c3440', 1.4, 0.35); }
      q.wash([[0, 400], [140, 330], [300, 372], [520, 300], [760, 360], [980, 310], [1200, 352], [1400, 320], [1400, 560], [0, 560]], '#1f3a48', { alpha: 0.28, layers: 16, vary: 0.02 });
      [[300, 410, 380], [960, 380, 420], [700, 470, 600]].forEach(([x, y, rx]) => q.wash(q.ell(x, y, rx, 26), '#d8e6e0', { alpha: 0.07, layers: 12, edge: 0 }));
      [[760, 150], [1200, 230], [560, 230]].forEach(([x, y]) => {
        q.ink(spiralPx(x, y, 26), { color: '#e3c27a', w: 2.2, alpha: 0.85, passes: 1 });
        q.ink([[x + 26, y], [x + 90, y - 6], [x + 130, y + 4]], { color: '#e3c27a', w: 2.2, alpha: 0.8, passes: 1 });
      });
    },
  },
  study: {
    stops: [[0, '#2a2f48'], [0.45, '#59617a'], [0.8, '#a9a6a6'], [1, '#d9cfbb']],
    shape: () => [[[40, 300], [108, 64], [160, 150], [214, 28], [292, 190], [362, 118], [440, 300]], [[910, 300], [992, 108], [1052, 178], [1124, 58], [1204, 196], [1282, 136], [1364, 300]]],
    paint(q) {
      q.wash(q.circle(740, 130, 50), '#f7efd9', { alpha: 0.4, layers: 14, vary: 0.02, edgeColor: '#d8c99f', edge: 0.4 });
      q.glow(740, 130, 150, '#fff4dc', 0.25);
      const peaks = (pts, col, a) => q.wash(pts, col, { alpha: a, layers: 16, vary: 0.02 });
      peaks([[20, 340], [108, 64], [160, 150], [214, 28], [292, 190], [362, 118], [460, 340], [460, 460], [20, 460]], '#4a5462', 0.22);
      peaks([[880, 340], [992, 108], [1052, 178], [1124, 58], [1204, 196], [1282, 136], [1390, 340], [1390, 460], [880, 460]], '#4a5462', 0.22);
      for (let i = 0; i < 50; i++) { const x = [80 + q.rand() * 340, 960 + q.rand() * 380][i % 2], y = 120 + q.rand() * 200; q.stroke(x, y, 24 + q.rand() * 40, Math.PI / 2 + (q.rand() - 0.5) * 0.5, '#2e3640', 1.3, 0.3); }
      peaks([[0, 420], [220, 340], [460, 390], [700, 330], [940, 380], [1180, 340], [1400, 380], [1400, 560], [0, 560]], '#6a7480', 0.2);
      [[400, 430, 420], [1000, 410, 400]].forEach(([x, y, rx]) => q.wash(q.ell(x, y, rx, 30), '#f2ece0', { alpha: 0.09, layers: 12, edge: 0 }));
      for (let k = 0; k < 6; k++) { const x = 560 + k * 26 + q.rand() * 10, y = 210 + q.rand() * 30; q.ink([[x - 9, y - 4], [x, y], [x + 9, y - 5]], { w: 1.4, alpha: 0.6, passes: 1 }); }
    },
  },
  tea: {
    stops: [[0, '#2a2347'], [0.45, '#5d3f70'], [0.8, '#b0708a'], [1, '#e2a993']],
    shape(w, h, rand) {
      const out = [];
      let x = 30;
      while (x < w - 60) {
        const bw = 80 + rand() * 80, top = 110 + rand() * 120;
        out.push(rectPx(x, top, bw, 320 - top));
        if (rand() < 0.5) out.push([[x - 6, top], [x + bw / 2, top - 46], [x + bw + 6, top]]);
        if (rand() < 0.6) out.push(rectPx(x + bw * 0.7, top - 40, 16, 44));
        x += bw + 4;
      }
      out.push(rectPx(660, 40, 80, 290), [[650, 44], [700, 8], [750, 44]]);
      this.blds = out;
      return out;
    },
    paint(q, w, h) {
      q.glow(320, 180, 220, '#ffd1a8', 0.2);
      // the rooftops: the same shapes the card was cut to, carried down behind the street
      this.blds.forEach((s) => q.wash(s, '#2c2440', { alpha: 0.55, layers: 6, vary: 0.005, edge: 0 }));
      this.blds.forEach((s) => { if (s.length !== 4) return; const [[x0, y0], [x1]] = s; for (let x = x0 + 10; x < x1 - 14; x += 26) for (let y = y0 + 20; y < 300; y += 40) if (q.rand() < 0.35) { q.flat(rectPx(x, y, 12, 16), '#ffd78a', 0.9); q.glow(x + 6, y + 8, 18, '#ffc76a', 0.3); } });
      q.wash(q.circle(700, 120, 26), '#fff1d0', { alpha: 0.5, layers: 10, vary: 0.02 });
      q.ink(q.circle(700, 120, 26), { closed: true, w: 1.5, alpha: 0.6 });
      q.ink([[700, 120], [700, 104]], { w: 1.4, alpha: 0.7, passes: 1 }); q.ink([[700, 120], [712, 126]], { w: 1.4, alpha: 0.7, passes: 1 });
      [[360, 80], [980, 110], [1180, 70]].forEach(([x, y]) => { for (let k = 0; k < 4; k++) q.wash(q.circle(x + k * 18, y - k * 22, 14 + k * 5), '#d9c3d0', { alpha: 0.05, layers: 6, edge: 0 }); });
      q.wash([[0, 330], [w, 330], [w, 560], [0, 560]], '#3b2e4c', { alpha: 0.25, layers: 10, vary: 0.02 });
      for (let x = 60; x < w; x += 180) { q.ink([[x, 560], [x, 420]], { w: 2, alpha: 0.6, passes: 1 }); q.glow(x, 414, 30, '#ffd78a', 0.6); q.dot(x, 414, 6, '#fff0c4', 1); }
    },
  },
  window: {
    stops: [[0, '#0e1a44'], [0.5, '#1d3476'], [0.85, '#3a5ea4'], [1, '#6283c0']],
    shape: () => [circPx(700, 128, 108)],
    paint(q) {
      q.glow(700, 128, 300, '#fff0c4', 0.34);
      q.wash(q.circle(700, 128, 94), '#fff4da', { alpha: 0.4, layers: 18, vary: 0.012, edgeColor: '#e6cf98', edge: 0.5 });
      [[670, 110, 18], [730, 150, 13], [712, 92, 9], [660, 160, 10]].forEach(([x, y, r]) => q.wash(q.circle(x, y, r), '#e8d7a8', { alpha: 0.14, layers: 8, edge: 0 }));
      q.wash([[0, 360], [260, 320], [420, 352], [560, 330], [560, 400], [0, 400]], '#1a2c58', { alpha: 0.3, layers: 12, vary: 0.02 });
      q.wash([[840, 330], [1000, 300], [1200, 340], [1400, 310], [1400, 400], [840, 400]], '#1a2c58', { alpha: 0.3, layers: 12, vary: 0.02 });
      q.wash([[0, 390], [1400, 390], [1400, 560], [0, 560]], '#1b2d63', { alpha: 0.3, layers: 12, vary: 0.02 });
      for (let i = 0; i < 46; i++) { const y = 400 + q.rand() * 150, sp = 30 + (y - 400) * 0.9; q.ink([[700 - sp * q.rand(), y], [700 + sp * q.rand(), y]], { color: '#fff0c4', w: 2, alpha: 0.5, wobble: 0.2, passes: 1 }); }
      q.flat(rectPx(1180, 270, 18, 66), '#e8e2d6'); q.flat([[1176, 270], [1189, 250], [1202, 270]], '#b8402f');
      q.glow(1189, 262, 40, '#fff0c4', 0.5);
    },
  },
  hearth: {
    stops: [[0, '#0b1729'], [0.5, '#123049'], [0.85, '#1e4d5c'], [1, '#3f7479']],
    shape: () => [[[60, 300], [220, 88], [330, 198], [432, 108], [560, 300]], [[820, 300], [962, 128], [1060, 218], [1182, 78], [1340, 300]]],
    paint(q, w) {
      const band = (y0, amp, col, a) => { const pts = []; for (let x = -20; x <= w + 20; x += 40) pts.push([x, y0 + Math.sin(x / 160) * amp]); for (let x = w + 20; x >= -20; x -= 40) pts.push([x, y0 + 60 + Math.sin(x / 160 + 1) * amp]); q.wash(pts, col, { alpha: a, layers: 16, vary: 0.02, edge: 0 }); };
      band(70, 40, '#7de0b0', 0.16); band(120, 50, '#5fd1c2', 0.12); band(30, 30, '#b48ae0', 0.12); q.glow(700, 110, 260, '#9ff0c8', 0.18);
      const peak = (pts) => { q.wash(pts, '#e8eef5', { alpha: 0.4, layers: 14, vary: 0.015 }); };
      peak([[40, 340], [220, 88], [330, 198], [432, 108], [580, 340]]); peak([[800, 340], [962, 128], [1060, 218], [1182, 78], [1360, 340]]);
      q.wash([[220, 88], [260, 200], [230, 300], [300, 340], [40, 340]], '#9fb4c8', { alpha: 0.2, layers: 10, edge: 0 });
      q.wash([[1182, 78], [1220, 200], [1200, 300], [1260, 340], [960, 340]], '#9fb4c8', { alpha: 0.2, layers: 10, edge: 0 });
      q.wash([[0, 380], [1400, 380], [1400, 560], [0, 560]], '#dbe6ef', { alpha: 0.24, layers: 10, vary: 0.02 });
      for (let x = 20; x < w; x += 46 + q.rand() * 40) { const y = 400 + q.rand() * 40, s = 30 + q.rand() * 30; q.flat([[x, y - s * 1.6], [x + s * 0.5, y], [x - s * 0.5, y]], '#1d3a3a', 0.9); }
    },
  },
};
function backdrop(kind) {
  const w = 1400, h = 560, rand = mulberry(kind.length * 131 + 7), sky = SKIES[kind];
  const top = 190;
  const outline = [[[14, h], [14, top + 40], [w - 14, top + 40], [w - 14, h]]];
  for (let x = 60; x < w - 50; x += 70 + rand() * 60) outline.push(circPx(x, top + 40 + rand() * 20, 28 + rand() * 34));
  outline.push(...sky.shape(w, h, rand));
  return die(w, h, kind.length * 17 + 3, outline, (q) => {
    const g = q.g, grad = g.createLinearGradient(0, 0, 0, h);
    sky.stops.forEach(([t, c]) => grad.addColorStop(t, c));
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    q.skyGrad = grad;
    for (let i = 0; i < 140; i++) q.dot(q.rand() * w, q.rand() * h * 0.62, 1 + q.rand() * 2.2, '#fff3cf', 0.35 + q.rand() * 0.6);
    for (let i = 0; i < 7; i++) q.sparkle(30 + q.rand() * (w - 60), 30 + q.rand() * 240, 9 + q.rand() * 7, '#fff3cf', 0.9);
    sky.paint(q, w, h);
  });
}


/* ---------- trees, banks of flowers and the little things on each page ---------- */

const NIGHT_LEAVES = ['#22403d', '#2f5a52', '#4f8270', '#7fae8e'];
function tree(kind, seed, o = {}) {
  if (kind === 'round') {
    // a whole, round crown cut from one sheet; inside it, layers of paper leaves with their veins, the way a paper artist builds a tree
    const w = 460, h = 640, pal = o.pal ?? NIGHT_LEAVES, rr = mulberry(seed);
    const blobs = [[230, 210, 124], [134, 280, 92], [326, 280, 92], [176, 356, 88], [284, 356, 88], [230, 118, 90], [146, 190, 72], [314, 190, 72], [230, 330, 96]];
    const trunk = [[206, 640], [212, 470], [176, 420], [188, 410], [216, 444], [224, 398], [240, 402], [236, 470], [250, 640]];
    const crown = (g) => { g.beginPath(); blobs.forEach(([x, y, r]) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); }); };
    return die(w, h, seed, [...blobs.map(([x, y, r]) => circPx(x, y, r, 48)), trunk], (q, g) => {
      g.fillStyle = '#5a4436'; g.beginPath(); trunk.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      for (let y = 480; y < 630; y += 20) { g.fillStyle = 'rgba(20,12,8,.5)'; g.fillRect(212 + rr() * 18, y, 8 + rr() * 10, 3); }
      g.fillStyle = pal[0]; crown(g); g.fill('nonzero');
      g.save(); crown(g); g.clip('nonzero');
      // a second layer, a little smaller and lighter, lifted on a soft shadow
      g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 5; g.fillStyle = pal[1]; g.beginPath(); blobs.forEach(([x, y, r]) => { g.moveTo(x + r * 0.84, y - 8); g.arc(x, y - 8, r * 0.84, 0, TAU); }); g.fill('nonzero'); g.restore();
      // cut-paper leaves fanning out from the heart of the crown, each with a midrib and side veins
      const leaf = (cx, cy, len, wid, a, col, vein) => {
        g.save(); g.translate(cx, cy); g.rotate(a);
        g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 5; g.shadowOffsetY = 2; g.fillStyle = col;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(wid, -len * 0.45, 0, -len); g.quadraticCurveTo(-wid, -len * 0.45, 0, 0); g.fill(); g.shadowColor = 'transparent';
        g.strokeStyle = vein; g.lineWidth = 1.8; g.beginPath(); g.moveTo(0, -3); g.lineTo(0, -len * 0.9); g.stroke(); g.lineWidth = 1.1;
        for (let k = 1; k < 6; k++) { const yy = -len * (0.15 + k * 0.13); [-1, 1].forEach((d) => { g.beginPath(); g.moveTo(0, yy); g.quadraticCurveTo(d * wid * 0.35, yy - len * 0.04, d * wid * 0.55, yy - len * 0.1); g.stroke(); }); }
        g.restore();
      };
      const heart = [230, 300];
      for (let ring = 0; ring < 3; ring++) {
        const n = [14, 11, 7][ring], rad = [150, 100, 48][ring], len = [86, 78, 66][ring];
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU + ring * 0.4 + rr() * 0.2, x = heart[0] + Math.cos(a) * rad * 0.9, y = heart[1] - 40 + Math.sin(a) * rad * 0.8; leaf(x, y + len * 0.4, len, len * 0.36, a + Math.PI / 2 + (rr() - 0.5) * 0.3, pal[2 + ((i + ring) % 2)], pal[ring === 2 ? 0 : 1]); }
      }
      for (let i = 0; i < 40; i++) { g.fillStyle = i % 3 ? pal[3] : '#f4ecd6'; g.globalAlpha = 0.75; g.beginPath(); g.arc(120 + rr() * 220, 110 + rr() * 300, 1.6 + rr() * 2.2, 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.restore();
      // a fine pale line round the whole crown, like the cut edge catching light
      g.strokeStyle = 'rgba(246,236,214,.45)'; g.lineWidth = 2.2; blobs.forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r - 2, 0, TAU); g.stroke(); });
      g.save(); g.globalCompositeOperation = 'destination-over'; g.restore();
      if (o.fireflies) for (let i = 0; i < 9; i++) { const x = 110 + q.rand() * 240, y = 120 + q.rand() * 260; q.glow(x, y, 20, '#ffe7a0', 0.5); q.dot(x, y, 2.8, '#fff3c4', 1); }
      if (o.fruit) for (let i = 0; i < 14; i++) { const x = 120 + rr() * 220, y = 130 + rr() * 260; g.fillStyle = o.fruit; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(x - 2, y - 2, 2.4, 0, TAU); g.fill(); }
    });
  }
  if (kind === 'rosebush') {
    // a Victorian standard rose: a stone urn, a slim stem, a clipped round head of leaves studded with roses, a small ball below
    const w = 360, h = 640, rr = mulberry(seed), rose = o.rose ?? '#e9a6b8';
    const head = [180, 190, 132], low = [180, 392, 58];
    const urn = [[118, 640], [130, 590], [100, 560], [96, 540], [264, 540], [260, 560], [230, 590], [242, 640]];
    const stem = [[172, 545], [174, 320], [186, 320], [188, 545]];
    const c = die(w, h, seed, [circPx(...head, 64), circPx(...low, 40), urn, stem, rectPx(88, 526, 184, 18)], (q, g) => {
      const ball = ([x, y, r], n) => {
        g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 8; g.shadowOffsetY = 4; g.fillStyle = '#2f5a3e'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
        g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
        for (let i = 0; i < n * 9; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * r, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d, la = rr() * TAU; g.save(); g.translate(lx, ly); g.rotate(la); g.fillStyle = ['#3f7a4e', '#5a9a62', '#2a4e36', '#76b07a'][i % 4]; g.beginPath(); g.ellipse(0, 0, 11, 5, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(20,40,24,.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-9, 0); g.lineTo(9, 0); g.stroke(); g.restore(); }
        const hl = g.createRadialGradient(x - r * 0.35, y - r * 0.4, 4, x, y, r); hl.addColorStop(0, 'rgba(255,255,230,.22)'); hl.addColorStop(0.6, 'rgba(0,0,0,0)'); hl.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = hl; g.fillRect(x - r, y - r, r * 2, r * 2);
        g.restore();
        for (let i = 0; i < n; i++) {
          const a = rr() * TAU, d = Math.sqrt(rr()) * (r - 16), cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d, s = 8 + rr() * 6;
          g.fillStyle = rose; g.beginPath(); g.arc(cx, cy, s, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(120,40,60,.55)'; g.lineWidth = 1.3; g.beginPath(); for (let k = 0; k <= 26; k++) { const t = k / 26, b = t * 2.6 * TAU; k ? g.lineTo(cx + Math.cos(b) * s * (1 - t) * 0.9, cy + Math.sin(b) * s * (1 - t) * 0.9) : g.moveTo(cx + s * 0.9, cy); } g.stroke();
          g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(cx - s * 0.35, cy - s * 0.35, s * 0.3, 0, TAU); g.fill();
        }
      };
      g.fillStyle = '#6a4a32'; g.beginPath(); stem.forEach(([a, b2], i) => (i ? g.lineTo(a, b2) : g.moveTo(a, b2))); g.closePath(); g.fill();
      g.strokeStyle = '#d9a441'; g.lineWidth = 2; for (let y = 470; y < 540; y += 14) { g.beginPath(); g.moveTo(170, y); g.lineTo(190, y + 7); g.stroke(); }
      const ug = g.createLinearGradient(96, 0, 264, 0); ug.addColorStop(0, '#9a9488'); ug.addColorStop(0.45, '#e2ddd0'); ug.addColorStop(1, '#8a8478');
      g.fillStyle = ug; g.beginPath(); urn.forEach(([a, b2], i) => (i ? g.lineTo(a, b2) : g.moveTo(a, b2))); g.closePath(); g.fill(); g.fillRect(88, 526, 184, 18);
      g.strokeStyle = 'rgba(70,64,56,.6)'; g.lineWidth = 1.6; [[100, 560, 260, 560], [128, 592, 232, 592]].forEach(([a, b2, c2, d]) => { g.beginPath(); g.moveTo(a, b2); g.lineTo(c2, d); g.stroke(); });
      for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(122 + k * 23, 572, 7, 0, Math.PI); g.stroke(); }
      ball(low, 5); ball(head, 15);
      g.strokeStyle = 'rgba(246,236,214,.45)'; g.lineWidth = 2; [head, low].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r - 2, 0, TAU); g.stroke(); });
    });
    if (!o.flip) return c;
    const m = canvas(w, h), mg = m.getContext('2d'); mg.translate(w, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0); return m;
  }
  if (kind === 'pine') {
    const w = 400, h = 640, cx = 200;
    const tiers = [0, 1, 2, 3].map((i) => { const ay = 30 + i * 112, by = 210 + i * 118, hw = 78 + i * 38; return { ay, by, hw, poly: [[cx, ay], [cx + hw * 0.55, by - 46], [cx + hw * 0.4, by - 40], [cx + hw, by], [cx + hw * 0.3, by - 12], [cx, by - 2], [cx - hw * 0.3, by - 12], [cx - hw, by], [cx - hw * 0.4, by - 40], [cx - hw * 0.55, by - 46]] }; });
    const trunk = rectPx(184, 540, 32, 100);
    return die(w, h, seed, [...tiers.map((t) => t.poly), trunk], (q) => {
      q.wash(trunk, '#4a3328', { alpha: 0.35, layers: 8, vary: 0.02 });
      tiers.forEach((t) => {
        q.wash(t.poly, '#1c3b35', { alpha: 0.25, layers: 12, vary: 0.02 });
        for (let i = 0; i < 18; i++) { const x = cx + (q.rand() - 0.5) * t.hw * 1.4, y = t.ay + 30 + q.rand() * (t.by - t.ay - 40); q.stroke(x, y, 16 + q.rand() * 14, Math.PI / 2 + (x - cx) / 200, '#3d6a5a', 1.4, 0.5); }
        if (o.snow) {
          q.wash([[cx, t.ay + 2], [cx + t.hw * 0.5, t.by - 52], [cx + t.hw * 0.2, t.by - 64], [cx, t.ay + 40], [cx - t.hw * 0.2, t.by - 64], [cx - t.hw * 0.5, t.by - 52]], '#f4f7fb', { alpha: 0.5, layers: 10, vary: 0.02 });
          q.wash([[cx + t.hw * 0.45, t.by - 6], [cx + t.hw, t.by], [cx + t.hw * 0.7, t.by - 18]], '#eef4fb', { alpha: 0.5, layers: 6, edge: 0 });
        }
        q.ink(t.poly, { closed: true, w: 1.3, alpha: 0.5, passes: 1 });
      });
    });
  }
  if (kind === 'yunsong') {
    // a Chinese decorative pine: a twisting brown trunk, needles gathered into flat clouds, each traced in gold
    const w = 560, h = 640;
    const curve = (pts, n = 28) => {
      const out = [];
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(t)), u = t - k;
        const a = pts[Math.max(0, k - 1)], b = pts[k], c = pts[k + 1], d = pts[Math.min(pts.length - 1, k + 2)];
        const cr = (j) => 0.5 * (2 * b[j] + (-a[j] + c[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u * u + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * u * u * u);
        out.push([cr(0), cr(1)]);
      }
      return out;
    };
    const limb = (pts, w0, w1) => {
      const P = curve(pts), L = [], R = [];
      P.forEach((p, i) => { const q1 = P[Math.min(P.length - 1, i + 1)], q0 = P[Math.max(0, i - 1)], dx = q1[0] - q0[0], dy = q1[1] - q0[1], d = Math.hypot(dx, dy) || 1, hw = (w0 + ((w1 - w0) * i) / (P.length - 1)) / 2; L.push([p[0] - (dy / d) * hw, p[1] + (dx / d) * hw]); R.push([p[0] + (dy / d) * hw, p[1] - (dx / d) * hw]); });
      return { line: P, poly: [...L, ...R.reverse()] };
    };
    const pad = (cx, cy, pw, ph) => {
      const bumps = Math.max(3, Math.round(pw / 48)), top = [], poly = [];
      for (let i = 0; i <= bumps * 8; i++) { const t = i / (bumps * 8), a = Math.PI + t * Math.PI, bump = Math.abs(Math.sin(t * bumps * Math.PI)) * ph * 0.2; top.push([cx + Math.cos(a) * (pw / 2 + bump * 0.5), cy + Math.sin(a) * (ph * 0.62 + bump)]); }
      poly.push(...top);
      for (let i = 1; i < 18; i++) { const t = i / 18; poly.push([cx + pw / 2 - t * pw, cy + Math.sin(t * Math.PI) * ph * 0.26]); }
      return { cx, cy, pw, ph, top, poly };
    };
    const trunk = limb([[262, 650], [250, 570], [292, 498], [252, 420], [212, 352], [242, 282], [298, 226], [292, 178]], 54, 16);
    const roots = [[206, 640], [236, 600], [290, 600], [322, 640]];
    const branches = [
      limb([[236, 412], [196, 398], [150, 390]], 22, 9), limb([[222, 336], [290, 318], [372, 300]], 20, 8),
      limb([[282, 492], [330, 478], [372, 470]], 16, 7), limb([[226, 298], [204, 270], [176, 248]], 14, 6),
    ];
    const pads = [pad(138, 384, 228, 84), pad(398, 296, 236, 88), pad(292, 168, 206, 82), pad(380, 470, 168, 62), pad(168, 240, 152, 58)];
    const cloudBlobs = o.cloud ? [[150, 612, 34], [204, 596, 44], [266, 606, 40], [330, 594, 46], [392, 612, 34]] : [];
    const c = die(w, h, seed, [trunk.poly, roots, ...branches.map((b) => b.poly), ...pads.map((p) => p.poly), ...cloudBlobs.map(([x, y, r]) => circPx(x, y, r))], (q) => {
      [trunk, ...branches].forEach((b) => { q.wash(b.poly, '#7a5236', { alpha: 0.4, layers: 10, vary: 0.02 }); q.wash(b.poly, '#4a2e1c', { alpha: 0.12, layers: 4, vary: 0.03, edge: 0.6 }); });
      q.wash(roots, '#6a4630', { alpha: 0.4, layers: 8, vary: 0.02 });
      for (let i = 0; i < 46; i++) { const p = trunk.line[Math.floor(q.rand() * (trunk.line.length - 4))], s2 = (q.rand() - 0.5) * 18; q.stroke(p[0] + s2, p[1] + q.rand() * 10, 12 + q.rand() * 14, -Math.PI / 2 + (q.rand() - 0.5) * 0.8, '#3a2214', 1.4, 0.45); }
      [trunk, ...branches].forEach((b) => q.ink(b.poly, { closed: true, w: 1.4, alpha: 0.55, passes: 1, color: '#3a2214' }));
      pads.forEach((pd) => {
        q.wash(pd.poly, '#2c6e66', { alpha: 0.42, layers: 12, vary: 0.02 });
        const inner = pad(pd.cx, pd.cy - pd.ph * 0.08, pd.pw * 0.84, pd.ph * 0.7);
        q.wash(inner.top.concat([[pd.cx + pd.pw * 0.42, pd.cy]]), '#4f9c8c', { alpha: 0.3, layers: 8, vary: 0.03, edge: 0 });
        for (let i = 0; i < Math.round(pd.pw / 5); i++) { const t = q.rand(), x = pd.cx + (t - 0.5) * pd.pw * 0.86, y = pd.cy + pd.ph * 0.12 - q.rand() * pd.ph * 0.5; q.stroke(x, y, 10 + q.rand() * 12, -Math.PI / 2 + (t - 0.5) * 1.6, q.rand() < 0.5 ? '#1c4c46' : '#7cc0ae', 1.1, 0.5); }
        q.ink(pd.top, { w: 2.4, alpha: 0.95, passes: 1, color: '#d9a441' });
        q.ink(inner.top, { w: 1.4, alpha: 0.7, passes: 1, color: '#e8c06a' });
        q.ink(pd.poly.slice(pd.top.length - 1).concat([pd.top[0]]), { w: 1.6, alpha: 0.75, passes: 1, color: '#c0903a' });
        for (let k = 0; k < 2; k++) q.sparkle(pd.cx + (q.rand() - 0.5) * pd.pw * 0.7, pd.cy - pd.ph * 0.3 * q.rand(), 5, '#fff0b8', 0.8);
      });
      if (o.cloud) {
        cloudBlobs.forEach(([x, y, r]) => q.wash(circPx(x, y, r), '#f6efe0', { alpha: 0.5, layers: 8, edge: 0 }));
        cloudBlobs.forEach(([x, y, r], i) => { q.ink(arcPx(x, y, r * 0.98, Math.PI * 1.05, Math.PI * 1.95), { w: 2, alpha: 0.9, passes: 1, color: '#d9a441' }); q.ink(spiralPx(x + (i % 2 ? 6 : -6), y + 4, r * 0.55, 1.3, 24), { w: 1.4, alpha: 0.7, passes: 1, color: '#c9a45a' }); });
      }
    });
    if (!o.flip) return c;
    const m = canvas(w, h), mg = m.getContext('2d'); mg.translate(w, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0); return m;
  }
  if (kind === 'bamboo') {
    const w = 380, h = 660;
    const stalks = [[80, 130, -0.05], [150, 60, 0.02], [224, 26, -0.02], [296, 100, 0.06]].map(([x, top, lean]) => ({ x, top, lean, poly: [[x - 9, h], [x + 9, h], [x + 9 + lean * (h - top), top], [x - 9 + lean * (h - top), top]] }));
    const leaves = [];
    stalks.forEach((s, k) => {
      for (let y = s.top + 30; y < 400; y += 70) {
        const bx = s.x + s.lean * (h - y);
        for (let j = 0; j < 3; j++) {
          const a = (k + j) % 2 ? -0.5 - j * 0.35 : Math.PI + 0.5 + j * 0.35, L = 70 + ((k * 7 + j * 13) % 25);
          const n = [Math.cos(a - Math.PI / 2) * 8, Math.sin(a - Math.PI / 2) * 8];
          leaves.push([[bx, y], [bx + Math.cos(a) * L * 0.45 + n[0], y + Math.sin(a) * L * 0.45 + n[1]], [bx + Math.cos(a) * L, y + Math.sin(a) * L], [bx + Math.cos(a) * L * 0.45 - n[0], y + Math.sin(a) * L * 0.45 - n[1]]]);
        }
      }
    });
    return die(w, h, seed, [...stalks.map((s) => s.poly), ...leaves], (q) => {
      stalks.forEach((s) => {
        q.wash(s.poly, '#5f9a5c', { alpha: 0.3, layers: 10, vary: 0.015 });
        for (let y = s.top + 60; y < h; y += 70) { const bx = s.x + s.lean * (h - y); q.ink([[bx - 10, y], [bx + 10, y]], { color: '#2f5a35', w: 2.2, alpha: 0.7, passes: 1 }); }
        q.ink(s.poly, { closed: true, w: 1.2, alpha: 0.45, passes: 1 });
      });
      leaves.forEach((l) => { q.wash(l, '#3e7a4a', { alpha: 0.32, layers: 6, vary: 0.02, edge: 0.3 }); q.ink([l[0], l[2]], { color: '#24482c', w: 1, alpha: 0.5, passes: 1 }); });
    });
  }
  if (kind === 'blossom') {
    const w = 460, h = 600;
    const trunk = [[205, 600], [212, 470], [180, 400], [150, 330], [118, 262], [136, 252], [170, 318], [200, 366], [214, 326], [250, 250], [302, 188], [320, 200], [268, 262], [242, 340], [236, 420], [252, 600]];
    const clusters = [[118, 236, 62], [306, 176, 72], [206, 150, 56], [362, 250, 52], [84, 330, 42], [250, 92, 46], [160, 300, 40]];
    return die(w, h, seed, [trunk, ...clusters.map(([x, y, r]) => circPx(x, y, r))], (q) => {
      clusters.forEach(([x, y, r]) => q.wash(circPx(x, y, r), '#f6d6dc', { alpha: 0.12, layers: 8, edge: 0 }));
      q.wash(trunk, '#3b2a26', { alpha: 0.4, layers: 10, vary: 0.02 });
      q.ink(trunk, { closed: true, w: 1.6, alpha: 0.6 });
      for (let i = 0; i < 110; i++) {
        const c = clusters[i % clusters.length], a = q.rand() * TAU, rr = c[2] * Math.sqrt(q.rand()) * 0.92, x = c[0] + Math.cos(a) * rr, y = c[1] + Math.sin(a) * rr;
        const col = q.rand() < 0.65 ? '#e98aa0' : '#fbeef0';
        for (let k = 0; k < 5; k++) { const b = (k / 5) * TAU; q.dot(x + Math.cos(b) * 4.5, y + Math.sin(b) * 4.5, 4, col, 0.9); }
        q.dot(x, y, 2.2, '#b8402f', 0.9);
      }
    });
  }
}

function flowerBank(seed, o = {}) {
  const w = 900, h = 170, rand = mulberry(seed);
  const outline = [[[10, h], [10, 100], [w - 10, 100], [w - 10, h]]];
  for (let x = 30; x < w - 20; x += 40 + rand() * 40) outline.push(circPx(x, 100 + rand() * 18, 26 + rand() * 28));
  const flowers = o.flowers ?? ['#f2d27a', '#e9a6b8', '#dfe6ff', '#c9a7e8'];
  return die(w, h, seed, outline, (q) => {
    q.wash([[0, 50], [w, 50], [w, h], [0, h]], o.ground ?? '#2f5a4a', { alpha: 0.32, layers: 10, vary: 0.02, edge: 0 });
    for (let i = 0; i < 280; i++) q.stroke(q.rand() * w, h - q.rand() * 50, 20 + q.rand() * 50, -Math.PI / 2 + (q.rand() - 0.5) * 0.9, q.rand() < 0.5 ? (o.dark ?? '#1f3a33') : (o.light ?? '#4f7e62'), 1.6, 0.7);
    for (let i = 0; i < 42; i++) {
      const x = 20 + q.rand() * (w - 40), y = 70 + q.rand() * 70, c = flowers[i % flowers.length];
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; q.dot(x + Math.cos(a) * 5.5, y + Math.sin(a) * 5.5, 4.5, c, 0.92); }
      q.dot(x, y, 3, '#fff3cf', 1);
    }
    if (o.mushrooms) for (let i = 0; i < 4; i++) { const x = 80 + i * 220 + q.rand() * 60, y = 120; q.flat(rectPx(x - 4, y, 8, 22), '#f3e6d0'); q.flat(arcPx(x, y + 2, 16, Math.PI, TAU, 10), '#c4513f'); q.dot(x - 5, y - 6, 2.4, '#fff3e0'); q.dot(x + 5, y - 9, 2, '#fff3e0'); }
  });
}

function signpost(name, sub) {
  const w = 380, h = 440;
  const board = [[24, 40], [340, 40], [368, 112], [340, 184], [24, 184]], post = rectPx(172, 180, 36, 260);
  return die(w, h, 77, [board, post], (q, g) => {
    q.wash(post, '#5b3f2c', { alpha: 0.4, layers: 8, vary: 0.02 });
    q.wash(board, '#8a5a3a', { alpha: 0.32, layers: 12, vary: 0.012 });
    for (let i = 0; i < 16; i++) q.ink([[30 + q.rand() * 40, 50 + i * 8.5], [300 + q.rand() * 40, 50 + i * 8.5]], { color: '#5b3a28', w: 0.8, alpha: 0.25, passes: 1 });
    q.ink(board, { closed: true, w: 2, alpha: 0.7 });
    g.fillStyle = '#fbefd2'; g.textAlign = 'center';
    g.font = '900 62px "Noto Serif SC", serif'; g.fillText(name, 186, 120);
    g.font = '400 34px "Long Cang", "LXGW WenKai TC", cursive'; g.fillStyle = '#f2d78f'; g.fillText(sub, 186, 166);
  });
}
function cat() {
  const w = 280, h = 320;
  const body = ellPx(150, 236, 84, 80), head = circPx(140, 120, 58), earL = [[92, 100], [102, 42], [136, 74]], earR = [[150, 70], [184, 42], [190, 104]];
  const tail = [[220, 300], [264, 276], [272, 222], [252, 194], [242, 204], [258, 228], [248, 266], [214, 284]], base = rectPx(82, 296, 150, 24);
  return die(w, h, 81, [body, head, earL, earR, tail, base], (q) => {
    [body, head, earL, earR, tail, base].forEach((s) => q.flat(s, '#221d2e', 1));
    q.ink(arcPx(140, 120, 56, Math.PI * 0.75, Math.PI * 1.4), { color: '#9fb2e6', w: 3, alpha: 0.8, passes: 1 });
    q.ink(arcPx(150, 236, 82, Math.PI * 0.8, Math.PI * 1.3), { color: '#9fb2e6', w: 3, alpha: 0.7, passes: 1 });
    [[118, 118], [160, 118]].forEach(([x, y]) => { q.flat(ellPx(x, y, 11, 8), '#ffe08a', 1); q.flat(ellPx(x, y, 3, 7), '#221d2e', 1); });
    q.flat([[134, 140], [146, 140], [140, 147]], '#e9a6b8', 1);
    [[-1, 0], [1, 0]].forEach(([s]) => { q.ink([[140 + s * 14, 146], [140 + s * 60, 140]], { color: '#c9c3d8', w: 1, alpha: 0.6, passes: 1 }); q.ink([[140 + s * 14, 150], [140 + s * 58, 154]], { color: '#c9c3d8', w: 1, alpha: 0.6, passes: 1 }); });
  });
}
function stoneLantern(seed) {
  const w = 240, h = 380;
  const parts = [rectPx(40, 334, 160, 46), rectPx(96, 220, 48, 116), rectPx(56, 198, 128, 26), rectPx(74, 120, 92, 80), [[24, 126], [120, 62], [216, 126], [182, 134], [58, 134]], circPx(120, 52, 16)];
  return die(w, h, seed, parts, (q) => {
    parts.forEach((s) => q.wash(s, '#8e9592', { alpha: 0.3, layers: 10, vary: 0.02 }));
    q.flat(rectPx(100, 138, 40, 44), '#ffd27a', 1); q.glow(120, 160, 70, '#ffc76a', 0.55);
    for (let i = 0; i < 18; i++) q.dot(50 + q.rand() * 140, 200 + q.rand() * 170, 3 + q.rand() * 4, '#5f8a5a', 0.6);
    parts.forEach((s) => q.ink(s, { closed: true, w: 1.4, alpha: 0.5, passes: 1 }));
  });
}
function cloudSwirl(seed) {
  const w = 440, h = 200;
  const circles = [[110, 120, 60], [190, 88, 70], [282, 108, 62], [352, 130, 48], [62, 146, 40]];
  return die(w, h, seed, [...circles.map(([x, y, r]) => circPx(x, y, r)), rectPx(40, 140, 370, 56)], (q) => {
    circles.forEach(([x, y, r]) => q.wash(circPx(x, y, r), '#f3e2b8', { alpha: 0.3, layers: 10, vary: 0.02, edge: 0 }));
    q.wash(rectPx(20, 150, 400, 50), '#d9b77a', { alpha: 0.25, layers: 8, edge: 0 });
    circles.forEach(([x, y, r]) => q.ink(spiralPx(x, y + 4, r * 0.7, 1.4), { color: '#b8862f', w: 2.4, alpha: 0.8, passes: 1 }));
  });
}
function crane(seed) {
  const w = 380, h = 220;
  const body = ellPx(190, 124, 72, 26), neck = [[240, 112], [300, 88], [330, 78], [336, 90], [302, 102], [250, 126]], head = circPx(334, 82, 13);
  const beak = [[344, 78], [374, 86], [344, 90]], wingA = [[150, 112], [86, 30], [56, 12], [112, 72], [196, 106]], wingB = [[200, 104], [232, 22], [264, 8], [252, 72], [222, 114]], legs = [[124, 130], [36, 156], [34, 162], [126, 138]];
  return die(w, h, seed, [body, neck, head, beak, wingA, wingB, legs], (q) => {
    [body, neck, head, wingA, wingB].forEach((s) => q.flat(s, '#f7f3ea', 1));
    q.wash([[86, 30], [56, 12], [112, 72], [130, 76]], '#25212b', { alpha: 0.5, layers: 6 }); q.wash([[232, 22], [264, 8], [252, 72], [240, 70]], '#25212b', { alpha: 0.5, layers: 6 });
    q.flat(beak, '#3a3230', 1); q.flat(legs, '#3a3230', 1); q.dot(334, 72, 6, '#c8372d', 1); q.dot(338, 82, 2.5, '#221d2e', 1);
    [body, neck, wingA, wingB].forEach((s) => q.ink(s, { closed: true, w: 1.2, alpha: 0.5, passes: 1 }));
  });
}
function starCard(seed, face = true) {
  const w = 170, h = 170, shape = starPx(85, 88, 76, 34);
  return die(w, h, seed, [shape], (q) => {
    q.wash(shape, '#f2d27a', { alpha: 0.45, layers: 12, vary: 0.02, edgeColor: '#c99a45', edge: 0.6 });
    q.glow(85, 88, 60, '#fff6d0', 0.6);
    if (face) { q.dot(72, 84, 4, '#4a3528', 0.8); q.dot(98, 84, 4, '#4a3528', 0.8); q.ink(arcPx(85, 92, 12, 0.3, Math.PI - 0.3, 8), { w: 1.6, alpha: 0.7, passes: 1 }); q.dot(66, 98, 6, '#f0a090', 0.4); q.dot(104, 98, 6, '#f0a090', 0.4); }
  });
}
function snowflake(seed) {
  const w = 160, h = 160, parts = [];
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU, c = Math.cos(a), s = Math.sin(a), n = [-s * 7, c * 7]; parts.push([[80 + n[0], 80 + n[1]], [80 + c * 70 + n[0], 80 + s * 70 + n[1]], [80 + c * 70 - n[0], 80 + s * 70 - n[1]], [80 - n[0], 80 - n[1]]]); }
  parts.push(circPx(80, 80, 18));
  return die(w, h, seed, parts, (q) => {
    parts.forEach((s) => q.wash(s, '#e6f0fb', { alpha: 0.5, layers: 6, edge: 0 }));
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; q.ink([[80, 80], [80 + Math.cos(a) * 66, 80 + Math.sin(a) * 66]], { color: '#7fa0c8', w: 1.4, alpha: 0.7, passes: 1 }); }
  });
}
function paperSlip(ch, seed) {
  const w = 150, h = 330, slip = [[16, 30], [75, 8], [134, 30], [134, 322], [16, 322]];
  return die(w, h, seed, [slip], (q, g) => {
    q.wash(slip, '#f6ead0', { alpha: 0.3, layers: 8, vary: 0.01 });
    q.flat(rectPx(52, 250, 46, 46), '#c8372d', 0.9);
    g.fillStyle = '#2a211c'; g.textAlign = 'center'; g.font = '900 96px "Noto Serif SC", serif'; g.fillText(ch, 75, 200);
    g.fillStyle = '#fbeee0'; g.font = '700 26px "Noto Serif SC", serif'; g.fillText('问', 75, 283);
  });
}
function rock(seed) {
  const w = 300, h = 380;
  const out = [[40, 380], [30, 300], [60, 220], [40, 150], [90, 70], [150, 30], [220, 60], [250, 140], [230, 210], [270, 290], [260, 380]];
  const holes = [ellPx(140, 120, 26, 34), ellPx(190, 230, 22, 28), ellPx(110, 270, 18, 22)];
  return die(w, h, seed, [out, ...holes], (q) => {
    q.wash(out, '#8d9aa6', { alpha: 0.3, layers: 12, vary: 0.02 });
    q.wash([[60, 220], [40, 150], [90, 70], [120, 160]], '#c6cfd6', { alpha: 0.2, layers: 6, edge: 0 });
    holes.forEach((s) => q.ink(s, { closed: true, w: 2, alpha: 0.6 }));
    q.ink(out, { closed: true, w: 1.6, alpha: 0.55 });
    for (let i = 0; i < 14; i++) q.stroke(60 + q.rand() * 180, 60 + q.rand() * 300, 20 + q.rand() * 20, Math.PI / 2 + (q.rand() - 0.5), '#4a5866', 1.2, 0.35);
  }, { evenodd: true });
}
function lampPost(seed) {
  const w = 150, h = 640;
  const post = rectPx(66, 170, 18, 440), foot = [[44, 640], [56, 600], [94, 600], [106, 640]], lamp = [[42, 160], [108, 160], [98, 76], [52, 76]], cap = [[36, 80], [75, 40], [114, 80]], top = circPx(75, 34, 10);
  return die(w, h, seed, [post, foot, lamp, cap, top], (q) => {
    [post, foot, cap, top].forEach((s) => q.wash(s, '#262230', { alpha: 0.55, layers: 8, vary: 0.02 }));
    q.wash(lamp, '#ffe0a0', { alpha: 0.55, layers: 10, vary: 0.02 }); q.glow(75, 118, 80, '#fff0b8', 0.6);
    q.ink(lamp, { closed: true, w: 2.4, alpha: 0.85 }); q.ink([[75, 76], [75, 160]], { w: 1.4, alpha: 0.6, passes: 1 });
    q.ink(arcPx(75, 230, 20, Math.PI, TAU, 10), { w: 2, alpha: 0.6, passes: 1 });
  });
}
function flowerPots(seed) {
  const w = 520, h = 190, pots = [70, 260, 440].map((x) => [[x - 44, 110], [x + 44, 110], [x + 34, 190], [x - 34, 190]]);
  const bushes = [70, 260, 440].map((x, k) => circPx(x, 76, 52 + k * 4));
  return die(w, h, seed, [...pots, ...bushes], (q) => {
    bushes.forEach((s) => q.wash(s, '#3f6e4a', { alpha: 0.3, layers: 10, vary: 0.03 }));
    pots.forEach((s) => { q.wash(s, '#c46a4a', { alpha: 0.4, layers: 10, vary: 0.02 }); q.ink(s, { closed: true, w: 1.5, alpha: 0.6 }); });
    for (let i = 0; i < 40; i++) { const x = [70, 260, 440][i % 3] + (q.rand() - 0.5) * 80, y = 50 + q.rand() * 56, c = ['#e9a6b8', '#f2d27a', '#ffffff'][i % 3]; q.dot(x, y, 7, c, 0.9); q.dot(x, y, 2.5, '#c8372d', 0.8); }
  });
}
function owlStump(seed) {
  const w = 240, h = 380;
  const stump = rectPx(54, 250, 132, 130), top = ellPx(120, 250, 66, 18), body = ellPx(120, 184, 54, 68), tl = [[78, 130], [86, 92], [104, 120]], tr = [[136, 120], [154, 92], [162, 130]];
  return die(w, h, seed, [stump, top, body, tl, tr], (q) => {
    q.wash(stump, '#6b4a36', { alpha: 0.35, layers: 10, vary: 0.02 }); q.wash(top, '#c99a6a', { alpha: 0.4, layers: 6 });
    q.ink(ellPx(120, 250, 40, 10), { w: 1, alpha: 0.5, passes: 1 });
    q.wash(body, '#9a7a56', { alpha: 0.4, layers: 12, vary: 0.02 }); q.wash(ellPx(120, 205, 32, 40), '#e6d2b0', { alpha: 0.35, layers: 8, edge: 0 });
    for (let i = 0; i < 12; i++) q.ink(arcPx(104 + (i % 3) * 16, 190 + Math.floor(i / 3) * 12, 6, 0.2, Math.PI - 0.2, 6), { w: 1, alpha: 0.5, passes: 1 });
    [tl, tr].forEach((s) => q.flat(s, '#7a5a3e', 1));
    [[100, 156], [140, 156]].forEach(([x, y]) => { q.flat(circPx(x, y, 17), '#fff0c4', 1); q.flat(circPx(x, y, 8), '#2a211c', 1); q.dot(x + 3, y - 3, 2.5, '#ffffff', 1); });
    q.flat([[114, 172], [126, 172], [120, 184]], '#e3a03a', 1);
    q.ink(body, { closed: true, w: 1.4, alpha: 0.6 });
  });
}
function fence(seed) {
  const w = 820, h = 200, parts = [rectPx(10, 84, 800, 16), rectPx(10, 150, 800, 16)];
  for (let x = 20; x < 790; x += 52) parts.push([[x, 200], [x, 50], [x + 15, 30], [x + 30, 50], [x + 30, 200]]);
  return die(w, h, seed, parts, (q) => {
    parts.forEach((s) => q.wash(s, '#eef2f8', { alpha: 0.4, layers: 6, vary: 0.015, edge: 0 }));
    for (let x = 20; x < 790; x += 52) q.wash(rectPx(x + 20, 50, 10, 150), '#a8b8d8', { alpha: 0.25, layers: 4, edge: 0 });
    parts.forEach((s) => q.ink(s, { closed: true, w: 1.2, alpha: 0.45, passes: 1 }));
    for (let i = 0; i < 30; i++) { const x = 20 + q.rand() * 780, y = 90 + q.rand() * 90; q.dot(x, y, 6, ['#e9a6b8', '#c9a7e8', '#ffffff'][i % 3], 0.9); q.stroke(x, y, 20, Math.PI / 2, '#4f7e62', 1.6, 0.6); }
  });
}
function runeStones(seed) {
  const w = 620, h = 280;
  const stones = [[[40, 280], [50, 120], [96, 76], [150, 96], [170, 280]], [[220, 280], [226, 70], [290, 24], [356, 60], [370, 280]], [[420, 280], [430, 130], [484, 100], [540, 140], [560, 280]]];
  return die(w, h, seed, stones, (q) => {
    stones.forEach((s) => { q.wash(s, '#7d8a96', { alpha: 0.35, layers: 12, vary: 0.02 }); q.ink(s, { closed: true, w: 1.6, alpha: 0.55 }); });
    [[[96, 80], [130, 96], [150, 100], [80, 80]], [[290, 28], [340, 60], [240, 60]], [[484, 104], [530, 140], [440, 136]]].forEach((s) => q.wash(s, '#f4f7fb', { alpha: 0.6, layers: 6, edge: 0 }));
    const gold = { color: '#e3b45a', w: 3, alpha: 0.95, passes: 1 };
    q.ink([[106, 140], [106, 240]], gold); q.ink([[106, 160], [130, 140]], gold); q.ink([[106, 186], [130, 166]], gold);
    q.ink([[272, 120], [272, 230]], gold); q.ink([[320, 120], [320, 230]], gold); q.ink([[272, 120], [320, 230]], gold); q.ink([[320, 120], [272, 230]], gold);   // ᛞ Dagaz, daybreak
    q.ink([[490, 150], [522, 190], [490, 230], [458, 190], [490, 150]], gold);   // ᛜ Ingwaz, a seed
  });
}
function snowman(seed) {
  const w = 220, h = 330, parts = [circPx(110, 262, 66), circPx(110, 160, 48), circPx(110, 92, 34), rectPx(84, 30, 52, 44), rectPx(70, 66, 80, 10)];
  return die(w, h, seed, parts, (q) => {
    parts.slice(0, 3).forEach((s) => q.wash(s, '#f6f9fd', { alpha: 0.5, layers: 8, vary: 0.02, edgeColor: '#9fb4c8', edge: 0.5 }));
    q.wash(arcPx(130, 270, 50, -0.6, 1.2, 10).concat([[130, 270]]), '#bcd0e4', { alpha: 0.3, layers: 6, edge: 0 });
    parts.slice(3).forEach((s) => q.flat(s, '#2a2433', 1));
    q.flat(rectPx(68, 118, 84, 16), '#c8372d', 1); q.flat(rectPx(126, 118, 16, 46), '#c8372d', 1);
    q.dot(98, 86, 4, '#2a2433'); q.dot(122, 86, 4, '#2a2433'); q.flat([[110, 96], [140, 102], [110, 104]], '#e3803a', 1);
    [150, 175, 200].forEach((y) => q.dot(110, y, 4, '#2a2433'));
  });
}
function pendulum(seed) {
  const w = 130, h = 350, chain = rectPx(60, 6, 10, 214), gem = [[65, 206], [104, 262], [65, 342], [26, 262]];
  return die(w, h, seed, [chain, gem], (q) => {
    for (let y = 12; y < 214; y += 14) q.ink(ellPx(65, y, 4, 7), { closed: true, color: '#c99a45', w: 1.6, alpha: 0.9, passes: 1 });
    q.wash(gem, '#c9b6ff', { alpha: 0.5, layers: 10, vary: 0.01, edgeColor: '#7a62c8', edge: 0.6 });
    q.wash([[65, 206], [104, 262], [65, 262]], '#f1ebff', { alpha: 0.5, layers: 6, edge: 0 });
    q.ink([[26, 262], [104, 262]], { color: '#7a62c8', w: 1.2, alpha: 0.6, passes: 1 }); q.glow(65, 270, 80, '#e6dcff', 0.5);
  });
}

/* ---------- the little houses: walls, roofs and doors ---------- */

const HOUSE_TEX = {
  tentStripes: () => sheet(256, 256, 501, (q) => {
    q.wash(rectPx(-4, -4, 132, 264), '#6b3f7d', { alpha: 0.4, layers: 12, vary: 0.01, edge: 0 });
    q.wash(rectPx(128, -4, 132, 264), '#c4acd8', { alpha: 0.42, layers: 12, vary: 0.01, edge: 0 });
    for (let i = 0; i < 8; i++) q.sparkle(20 + q.rand() * 88, 20 + q.rand() * 200, 7, '#e3b45a', 0.9);
    q.flat(rectPx(0, 226, 256, 30), '#d9a441', 0.9);
    q.ink([[128, 0], [128, 226]], { w: 1, alpha: 0.35, passes: 1 });
  }),
  tentRoof: () => sheet(256, 256, 503, (q) => {
    q.wash(rectPx(-4, -4, 132, 264), '#55296a', { alpha: 0.42, layers: 12, vary: 0.01, edge: 0 });
    q.wash(rectPx(128, -4, 132, 264), '#7d4f96', { alpha: 0.42, layers: 12, vary: 0.01, edge: 0 });
    for (let i = 0; i < 10; i++) q.sparkle(q.rand() * 256, 40 + q.rand() * 200, 6, '#e3b45a', 0.95);
  }),
  valance: () => { const c = canvas(128, 64), g = c.getContext('2d'); g.fillStyle = '#d9a441'; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 0); g.lineTo(128, 26); g.arc(96, 26, 32, 0, Math.PI); g.arc(32, 26, 32, 0, Math.PI); g.closePath(); g.fill(); g.strokeStyle = 'rgba(90,60,30,.6)'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#fff0c4'; g.beginPath(); g.arc(32, 46, 4, 0, TAU); g.arc(96, 46, 4, 0, TAU); g.fill(); return c; },
  tentDoor: () => die(240, 330, 507, [archPx(18, 18, 204, 312)], (q) => {
    const g = q.g, gr = g.createRadialGradient(120, 210, 10, 120, 210, 220); gr.addColorStop(0, '#fff2c4'); gr.addColorStop(1, '#f2b45a');
    g.fillStyle = gr; g.fillRect(0, 0, 240, 330);
    q.flat(ellPx(120, 280, 70, 16), '#6a3a5a', 1); q.flat(rectPx(64, 280, 112, 50), '#6a3a5a', 1);
    q.flat(circPx(120, 254, 22), '#d9ccff', 1); q.glow(120, 254, 50, '#ffffff', 0.5);
    q.wash([[18, 330], [18, 120], [70, 40], [96, 60], [70, 200], [86, 330]], '#55296a', { alpha: 0.5, layers: 10, vary: 0.015 });
    q.wash([[222, 330], [222, 120], [170, 40], [144, 60], [170, 200], [154, 330]], '#55296a', { alpha: 0.5, layers: 10, vary: 0.015 });
    q.flat(rectPx(60, 196, 30, 10), '#e3b45a', 1); q.flat(rectPx(150, 196, 30, 10), '#e3b45a', 1);
    q.ink(archPx(18, 18, 204, 312), { closed: true, w: 3, color: '#d9a441', alpha: 0.95 });
  }),
  lacquerFront: () => sheet(512, 280, 511, (q) => {
    q.wash(rectPx(-6, -6, 524, 292), '#a8322a', { alpha: 0.4, layers: 12, vary: 0.01, edge: 0 });
    q.wash(rectPx(166, 40, 180, 240), '#ffd98a', { alpha: 0.55, layers: 10, vary: 0.01, edge: 0 }); q.glow(256, 170, 160, '#fff0c4', 0.5);
    for (let x = 166; x <= 346; x += 22.5) q.ink([[x, 40], [x, 280]], { color: '#7a2018', w: 2.4, alpha: 0.85, passes: 1 });
    for (let y = 40; y <= 280; y += 24) q.ink([[166, y], [346, y]], { color: '#7a2018', w: 2.4, alpha: 0.85, passes: 1 });
    q.ink([[256, 40], [256, 280]], { color: '#d9a441', w: 4, alpha: 0.9, passes: 1 }); q.ink(rectPx(166, 40, 180, 240), { closed: true, color: '#d9a441', w: 4, alpha: 0.9, passes: 1 });
    [70, 442].forEach((x) => { q.wash(circPx(x, 130, 46), '#ffd98a', { alpha: 0.45, layers: 8, edge: 0 }); q.ink(circPx(x, 130, 46), { closed: true, color: '#d9a441', w: 3.5, alpha: 0.9, passes: 1 }); for (let k = -1; k <= 1; k++) { q.ink([[x + k * 16, 88], [x + k * 16, 172]], { color: '#7a2018', w: 2, alpha: 0.8, passes: 1 }); q.ink([[x - 44, 130 + k * 16], [x + 44, 130 + k * 16]], { color: '#7a2018', w: 2, alpha: 0.8, passes: 1 }); } });
    q.flat(rectPx(0, 0, 512, 14), '#d9a441', 0.9); q.flat(rectPx(0, 266, 512, 14), '#5b2a20', 0.9);
  }),
  lacquerSide: () => sheet(360, 280, 513, (q) => {
    q.wash(rectPx(-6, -6, 372, 292), '#a8322a', { alpha: 0.4, layers: 12, vary: 0.01, edge: 0 });
    q.wash(circPx(180, 130, 56), '#ffd98a', { alpha: 0.45, layers: 8, edge: 0 }); q.ink(circPx(180, 130, 56), { closed: true, color: '#d9a441', w: 4, alpha: 0.9, passes: 1 });
    for (let k = -2; k <= 2; k++) { q.ink([[180 + k * 18, 78], [180 + k * 18, 182]], { color: '#7a2018', w: 2, alpha: 0.8, passes: 1 }); q.ink([[126, 130 + k * 18], [234, 130 + k * 18]], { color: '#7a2018', w: 2, alpha: 0.8, passes: 1 }); }
    q.flat(rectPx(0, 0, 360, 14), '#d9a441', 0.9);
  }),
  tiles: (base, light, seed, stars) => sheet(256, 256, seed, (q) => {
    q.wash(rectPx(-6, -6, 268, 268), base, { alpha: 0.45, layers: 12, vary: 0.01, edge: 0 });
    for (let y = 16; y < 260; y += 26) for (let x = (y / 26) % 2 ? 0 : 16; x < 270; x += 32) { q.ink(arcPx(x, y, 15, 0.1, Math.PI - 0.1, 8), { color: light, w: 2, alpha: 0.75, passes: 1 }); }
    if (stars) for (let i = 0; i < 10; i++) q.sparkle(q.rand() * 256, q.rand() * 256, 6, '#e3b45a', 0.9);
  }),
  stone: () => sheet(256, 128, 517, (q) => {
    q.wash(rectPx(-6, -6, 268, 140), '#9a9e98', { alpha: 0.4, layers: 10, vary: 0.01, edge: 0 });
    for (let y = 0; y < 128; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < 256; x += 64) q.ink(rectPx(x + 2, y + 2, 60, 28), { closed: true, color: '#5a5e58', w: 1.2, alpha: 0.5, passes: 1 });
  }),
  plaque: () => die(260, 120, 519, [rectPx(10, 10, 240, 100)], (q, g) => {
    q.flat(rectPx(0, 0, 260, 120), '#d9a441', 1); q.flat(rectPx(22, 20, 216, 80), '#1d2a4a', 1);
    g.fillStyle = '#f2d78f'; g.textAlign = 'center'; g.font = '900 60px "Noto Serif SC", serif'; g.fillText('问心', 130, 82);
  }),
  // generic walls: base colour, then whatever the front of each house needs
  wall: (w, h, base, seed, extra) => sheet(w, h, seed, (q, g) => {
    q.wash(rectPx(-6, -6, w + 12, h + 12), base, { alpha: 0.42, layers: 12, vary: 0.01, edge: 0 });
    for (let i = 0; i < 10; i++) q.wash(ellPx(q.rand() * w, q.rand() * h, 60, 30), '#ffffff', { alpha: 0.03, layers: 4, edge: 0 });
    if (extra) extra(q, g);
  }),
  logs: (w, h, seed, extra) => sheet(w, h, seed, (q, g) => {
    for (let y = 0; y < h; y += 28) { q.wash(rectPx(-4, y, w + 8, 28), (y / 28) % 2 ? '#8a5a3a' : '#7a4e30', { alpha: 0.4, layers: 6, vary: 0.01, edgeColor: '#4a2c1a', edge: 0.5 }); }
    [6, w - 6].forEach((x) => { for (let y = 14; y < h; y += 28) { q.flat(circPx(x, y, 12), '#c99466', 1); q.ink(circPx(x, y, 6), { closed: true, w: 1, alpha: 0.5, passes: 1 }); } });
    if (extra) extra(q, g);
  }),
};
const glowWindow = (q, pts, frame = '#4a3528') => { q.flat(pts, '#ffd98a', 1); const [x0, y0] = pts[0], [x1, y1] = pts[2]; q.glow((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(y1 - y0) * 1.2, '#fff0b8', 0.5); q.ink(pts, { closed: true, color: frame, w: 2.6, alpha: 0.85, passes: 1 }); q.ink([[(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1]], { color: frame, w: 1.6, alpha: 0.7, passes: 1 }); q.ink([[x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2]], { color: frame, w: 1.6, alpha: 0.7, passes: 1 }); };
const glowRound = (q, x, y, r, frame = '#4a3528') => { q.flat(circPx(x, y, r), '#ffd98a', 1); q.glow(x, y, r * 2.2, '#fff0b8', 0.5); q.ink(circPx(x, y, r), { closed: true, color: frame, w: 3, alpha: 0.85, passes: 1 }); q.ink([[x - r, y], [x + r, y]], { color: frame, w: 1.6, alpha: 0.7, passes: 1 }); q.ink([[x, y - r], [x, y + r]], { color: frame, w: 1.6, alpha: 0.7, passes: 1 }); };
const doorArch = (q, x, y, w, h, col, frame = '#4a3528') => { q.wash(archPx(x, y, w, h), col, { alpha: 0.5, layers: 10, vary: 0.01 }); q.ink(archPx(x, y, w, h), { closed: true, color: frame, w: 3, alpha: 0.85, passes: 1 }); q.dot(x + w * 0.78, y + h * 0.62, 4, '#e3b45a', 1); };

const FRONTS = {
  study: {
    front: () => HOUSE_TEX.wall(512, 244, '#f3ede0', 521, (q) => {
      q.wash(rectPx(-4, 200, 520, 50), '#8d8c88', { alpha: 0.4, layers: 8, vary: 0.01 });
      glowRound(q, 150, 112, 64);
      for (let k = -2; k <= 2; k++) q.ink([[150 + k * 22, 54], [150 + k * 22, 170]], { color: '#4a3528', w: 1.2, alpha: 0.5, passes: 1 });
      q.wash(rectPx(320, 64, 110, 140), '#ffd98a', { alpha: 0.55, layers: 8, edge: 0 }); q.glow(375, 134, 110, '#fff0b8', 0.45);
      for (let x = 320; x <= 430; x += 18.3) q.ink([[x, 64], [x, 204]], { color: '#5b3a28', w: 1.6, alpha: 0.75, passes: 1 });
      for (let y = 64; y <= 204; y += 20) q.ink([[320, y], [430, y]], { color: '#5b3a28', w: 1.6, alpha: 0.75, passes: 1 });
      q.ink(rectPx(320, 64, 110, 140), { closed: true, color: '#5b3a28', w: 3.4, alpha: 0.9, passes: 1 });
      q.flat(rectPx(330, 28, 90, 26), '#3b2418', 1);
    }),
    side: () => HOUSE_TEX.wall(360, 244, '#ebe3d2', 523, (q) => { q.wash(rectPx(-4, 200, 370, 50), '#8d8c88', { alpha: 0.4, layers: 8 }); glowWindow(q, rectPx(130, 70, 100, 90)); }),
    gable: () => HOUSE_TEX.wall(256, 128, '#ebe3d2', 525),
    roof: () => HOUSE_TEX.tiles('#55606e', '#8a95a3', 527),
  },
  tea: {
    front: () => HOUSE_TEX.wall(512, 340, '#3f7f7a', 531, (q, g) => {
      q.flat(rectPx(0, 0, 512, 52), '#f0e2c4', 1);
      g.fillStyle = '#3b2e4c'; g.textAlign = 'center'; g.font = 'italic 600 34px "Cormorant Garamond", serif'; g.fillText('Tea  ·  茶 室', 256, 37);
      glowWindow(q, rectPx(40, 96, 250, 170), '#f0e2c4');
      [90, 150, 210].forEach((x) => { q.flat(ellPx(x, 240, 18, 9), '#f6efe2', 1); q.flat(rectPx(x - 14, 222, 28, 18), '#f6efe2', 1); });
      doorArch(q, 340, 100, 120, 240, '#2b5653', '#f0e2c4');
      ['#e8613f', '#e3b45a', '#4a6fa5', '#9a6ab0'].forEach((c, k) => q.dot(366 + k * 22, 160, 8, c, 0.9));
    }),
    side: () => HOUSE_TEX.wall(360, 340, '#3a7470', 533, (q) => glowWindow(q, rectPx(110, 100, 140, 120), '#f0e2c4')),
    roof: () => HOUSE_TEX.tiles('#4a4e5e', '#7a7f92', 535),
    awning: () => sheet(512, 128, 537, (q) => { for (let k = 0; k < 8; k++) q.wash(rectPx(k * 64, 0, 64, 110), k % 2 ? '#f6ead2' : '#e9a6b8', { alpha: 0.5, layers: 8, vary: 0.01, edge: 0 }); for (let k = 0; k < 16; k++) q.flat(arcPx(16 + k * 32, 104, 16, 0, Math.PI, 8), k % 2 ? '#f6ead2' : '#e9a6b8', 1); }),
  },
  window: {
    front: () => HOUSE_TEX.wall(512, 340, '#b9cde3', 541, (q) => {
      glowRound(q, 150, 150, 80, '#2f3f6e'); q.wash(circPx(130, 130, 26), '#fff6dc', { alpha: 0.4, layers: 6, edge: 0 });
      q.wash(rectPx(70, 240, 160, 30), '#8a5a3a', { alpha: 0.45, layers: 6 }); for (let k = 0; k < 9; k++) q.dot(80 + k * 18, 236, 8, ['#e9a6b8', '#f2d27a', '#cfd8ff'][k % 3], 1);
      doorArch(q, 330, 120, 110, 220, '#3c5d97', '#2f3f6e');
    }),
    side: () => HOUSE_TEX.wall(420, 340, '#a9bfd8', 543, (q) => glowWindow(q, archPx(160, 100, 100, 140), '#2f3f6e')),
    roof: () => HOUSE_TEX.tiles('#2f3f6e', '#5a6fa8', 545, true),
  },
  hearth: {
    front: () => HOUSE_TEX.logs(512, 256, 551, (q) => {
      doorArch(q, 200, 66, 112, 190, '#6b4430', '#3b2418');
      q.ink([[236, 150], [256, 130], [236, 110]], { color: '#e3b45a', w: 3, alpha: 0.9, passes: 1 }); q.ink([[276, 110], [276, 150], [296, 130]], { color: '#e3b45a', w: 3, alpha: 0.9, passes: 1 });
      glowWindow(q, rectPx(56, 80, 90, 80), '#3b2418'); glowWindow(q, rectPx(366, 80, 90, 80), '#3b2418');
    }),
    side: () => HOUSE_TEX.logs(384, 256, 553, (q) => glowWindow(q, rectPx(150, 80, 84, 80), '#3b2418')),
    gable: () => HOUSE_TEX.logs(256, 160, 555, (q) => { q.flat(circPx(128, 90, 22), '#ffd98a', 1); q.ink(circPx(128, 90, 22), { closed: true, w: 2.4, alpha: 0.8, passes: 1 }); }),
    roof: () => HOUSE_TEX.tiles('#6b4a36', '#a07656', 557),
  },
};

/* ---------- the printed pages under everything ---------- */

const PAGE_TEXT = {
  tent:   ['第一页', '星幕帐篷', 'Tarot · 塔罗', '抽一张牌，听听今天的星星想说什么。'],
  shrine: ['第二页', '东方神龛', 'Jiaobei · 掷筊 · 灵签', '心里默念你的问题，让木筊替你回答。'],
  study:  ['第三页', '文房书案', 'Characters · 测字 · 六爻', '写下一个字，看看它藏着什么心事。'],
  tea:    ['第四页', '维多利亚茶桌', 'Lenormand · 雷诺曼 · 茶叶占卜', '一杯茶的工夫，翻开一组小小的卡片。'],
  window: ['第五页', '月下窗台', 'Pendulum · 灵摆', '让水晶在月光里慢慢摆动。'],
  hearth: ['第六页', '北欧炉边', 'Runes · 卢恩符文', '在炉火边，摸一颗刻着古老符号的石头。'],
};
const GROUND = {
  tent(q) {
    q.wash(ellPx(768, 470, 660, 330), '#6f9a7e', { alpha: 0.1, layers: 18, vary: 0.03, edge: 0 });
    q.wash(ellPx(768, 470, 520, 250), '#5d8a70', { alpha: 0.08, layers: 14, vary: 0.04, edge: 0 });
    q.wash([[700, 1014], [836, 1014], [810, 760], [800, 600], [770, 560], [740, 600], [730, 760]], '#efe0bc', { alpha: 0.18, layers: 14, vary: 0.02 });
    for (let i = 0; i < 260; i++) { const a = q.rand() * TAU, r = Math.sqrt(q.rand()), x = 768 + Math.cos(a) * r * 620, y = 470 + Math.sin(a) * r * 300; q.stroke(x, y, 8 + q.rand() * 10, -Math.PI / 2 + (q.rand() - 0.5), '#3f6e58', 1.2, 0.4); }
    for (let i = 0; i < 36; i++) { const a = q.rand() * TAU, r = 0.4 + q.rand() * 0.55, x = 768 + Math.cos(a) * r * 600, y = 480 + Math.sin(a) * r * 300; q.dot(x, y, 5, ['#f2d27a', '#e9a6b8', '#ffffff'][i % 3], 0.85); }
  },
  shrine(q) {
    for (let y = 250; y < 760; y += 54) for (let x = 360 + ((y / 54) % 2) * 30; x < 1180; x += 60) q.wash(rectPx(x, y, 56, 50), '#b9b2a2', { alpha: 0.1, layers: 4, vary: 0.02, edgeColor: '#7a7466', edge: 0.3 });
    q.wash(ellPx(1210, 820, 170, 90), '#4f8aa0', { alpha: 0.16, layers: 14, vary: 0.03 });
    [[1160, 810, 0.3], [1250, 840, -2.6]].forEach(([x, y, a]) => { q.flat(ellPx(x, y, 22, 9), '#e8743a', 0.9); q.flat([[x - Math.cos(a) * 22, y - Math.sin(a) * 9], [x - Math.cos(a) * 36, y - 8], [x - Math.cos(a) * 36, y + 8]], '#e8743a', 0.9); });
    for (let i = 0; i < 6; i++) q.flat(ellPx(1150 + q.rand() * 120, 760 + q.rand() * 120, 16, 6), '#5f8a5a', 0.7);
    for (let i = 0; i < 80; i++) q.dot(300 + q.rand() * 940, 220 + q.rand() * 600, 3 + q.rand() * 4, '#6f9a6a', 0.4);
  },
  study(q) {
    q.wash(ellPx(768, 520, 640, 330), '#d8d0bf', { alpha: 0.12, layers: 14, vary: 0.03, edge: 0 });
    for (let r = 40; r < 280; r += 22) q.ink(ellPx(1110, 760, r * 1.4, r * 0.7, 48), { closed: true, color: '#9a917f', w: 1.2, alpha: 0.35, passes: 1 });
    for (let y = 300; y < 860; y += 18) q.ink([[340, y], [600, y + 6]], { color: '#a8a08e', w: 1, alpha: 0.25, passes: 1 });
    [[760, 900], [790, 820], [770, 740], [800, 660]].forEach(([x, y]) => q.wash(ellPx(x, y, 34, 18), '#8d8c88', { alpha: 0.3, layers: 8, vary: 0.03 }));
    q.wash(ellPx(470, 760, 120, 60), '#7fa8b0', { alpha: 0.18, layers: 10 }); [[440, 750], [500, 770]].forEach(([x, y]) => { q.flat(circPx(x, y, 14), '#5f8a5a', 0.8); q.dot(x + 4, y - 4, 5, '#f2b8c8', 0.9); });
  },
  tea(q) {
    q.wash(rectPx(240, 300, 1060, 520), '#b8a690', { alpha: 0.1, layers: 10, vary: 0.02, edge: 0 });
    for (let y = 310; y < 820; y += 26) for (let x = 250 + ((y / 26) % 2) * 14; x < 1290; x += 30) q.ink(ellPx(x, y, 12, 9, 10), { closed: true, color: '#8a7a68', w: 1, alpha: 0.28, passes: 1 });
    [[330, 840], [1210, 830]].forEach(([x, y]) => { q.wash(ellPx(x, y, 110, 40), '#5f8a5a', { alpha: 0.2, layers: 10 }); for (let i = 0; i < 16; i++) q.dot(x + (q.rand() - 0.5) * 200, y + (q.rand() - 0.5) * 60, 6, ['#e9a6b8', '#f2d27a', '#ffffff'][i % 3], 0.9); });
  },
  window(q) {
    q.wash(ellPx(768, 480, 660, 330), '#6a8fae', { alpha: 0.1, layers: 16, vary: 0.03, edge: 0 });
    q.wash([[300, 1014], [380, 1014], [520, 800], [700, 700], [900, 640], [1100, 560], [1080, 520], [880, 600], [680, 660], [480, 760]], '#7fb0d8', { alpha: 0.2, layers: 14, vary: 0.02 });
    for (let i = 0; i < 30; i++) { const t = q.rand(); q.ink([[380 + t * 700 - 20, 980 - t * 440], [380 + t * 700 + 14, 980 - t * 440]], { color: '#ffffff', w: 1.6, alpha: 0.5, passes: 1 }); }
    for (let i = 0; i < 200; i++) { const a = q.rand() * TAU, r = Math.sqrt(q.rand()), x = 768 + Math.cos(a) * r * 600, y = 470 + Math.sin(a) * r * 300; q.stroke(x, y, 8 + q.rand() * 10, -Math.PI / 2 + (q.rand() - 0.5), '#4a6f8a', 1.2, 0.35); }
  },
  hearth(q) {
    q.wash(ellPx(768, 480, 700, 360), '#dfe9f2', { alpha: 0.2, layers: 16, vary: 0.03, edge: 0 });
    for (let i = 0; i < 18; i++) q.wash(ellPx(300 + q.rand() * 940, 300 + q.rand() * 500, 90, 26), '#a9bfd4', { alpha: 0.08, layers: 6, edge: 0 });
    for (let k = 0; k < 14; k++) { const x = 780 + Math.sin(k * 0.7) * 30 + (k % 2) * 18, y = 980 - k * 32; q.flat(ellPx(x, y, 7, 10), '#9fb4c8', 0.6); }
  },
};
/** a whole spread, painted as one picture and cut down the middle */
/** each spread's page border: a double gold rule and corner ornaments in that spread's own manner */
function pageBorder(g, x0, id) {
  const GOLD_ = '#b8903e', INK_ = '#6a4a30', theme = { tent: ['#3a3a7a', '#d9a441'], shrine: ['#a8322a', '#c9a45a'], study: ['#3f6a4a', '#6a4a30'], tea: ['#c86a84', '#6a9a62'], window: ['#5a4a8a', '#8fb0d0'], hearth: ['#3a5a7a', '#a8c8e0'] }[id];
  const L = (pts, c, w, close = false) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); g.stroke(); };
  const spiral = (cx, cy, r, turns, c, w) => L(Array.from({ length: 40 }, (_, k) => { const t = k / 39, a = t * turns * TAU; return [cx + Math.cos(a) * r * (1 - t), cy + Math.sin(a) * r * (1 - t)]; }), c, w);
  g.save(); g.globalAlpha = 0.9;
  L([[x0 + 30, 30], [x0 + 738, 30], [x0 + 738, 984], [x0 + 30, 984]], GOLD_, 2.2, true); L([[x0 + 40, 40], [x0 + 728, 40], [x0 + 728, 974], [x0 + 40, 974]], INK_, 0.9, true);
  const corner = (cx, cy, rot) => {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    if (id === 'tent') { g.fillStyle = theme[1]; g.beginPath(); starPx(26, 26, 22, 8, 8).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.strokeStyle = INK_; g.lineWidth = 1.2; g.stroke(); L(Array.from({ length: 20 }, (_, k) => [26 + Math.cos(0.2 + k * 0.07) * 60, 26 + Math.sin(0.2 + k * 0.07) * 60]), GOLD_, 1.6); g.fillStyle = theme[0]; g.beginPath(); g.arc(80, 24, 9, Math.PI * 0.6, Math.PI * 1.4, true); g.arc(84, 24, 7, Math.PI * 1.35, Math.PI * 0.65, false); g.fill(); [[48, 70], [70, 50], [24, 90]].forEach(([x, y]) => { g.fillStyle = theme[1]; g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill(); }); }
    if (id === 'shrine') { L([[6, 70], [6, 6], [70, 6], [70, 40], [26, 40], [26, 26], [50, 26]], theme[0], 3); L([[16, 92], [16, 16], [92, 16]], GOLD_, 1.4); spiral(96, 34, 12, 1.4, GOLD_, 1.8); spiral(34, 96, 12, 1.4, GOLD_, 1.8); }
    if (id === 'study') { L([[8, 100], [70, 8]], theme[0], 5); L([[30, 72], [36, 64]], '#f3e8d0', 2); [[46, 44, -0.4], [56, 30, 0.6], [22, 80, -0.9]].forEach(([x, y, a]) => { g.fillStyle = theme[0]; g.beginPath(); g.ellipse(x + 16 * Math.cos(a), y + 16 * Math.sin(a), 18, 4.5, a, 0, TAU); g.fill(); }); g.fillStyle = '#a8322a'; g.fillRect(84, 10, 18, 18); }
    if (id === 'tea') { g.fillStyle = theme[0]; g.beginPath(); g.arc(28, 28, 16, 0, TAU); g.fill(); spiral(28, 28, 13, 1.8, '#8a3a50', 1.6); [[52, 18, -0.2], [18, 52, 1.8], [60, 40, 0.5]].forEach(([x, y, a]) => { g.fillStyle = theme[1]; g.beginPath(); g.ellipse(x, y, 13, 5.5, a, 0, TAU); g.fill(); }); L(Array.from({ length: 24 }, (_, k) => [70 + k * 3, 14 + Math.sin(k * 0.8) * 5]), theme[1], 1.4); for (let k = 0; k < 4; k++) { g.fillStyle = theme[0]; g.beginPath(); g.arc(14, 70 + k * 10, 2.4, 0, TAU); g.fill(); } }
    if (id === 'window') { g.fillStyle = '#d8c8f0'; g.beginPath(); g.arc(26, 26, 18, Math.PI * 0.6, Math.PI * 1.9, false); g.arc(32, 22, 14, Math.PI * 1.8, Math.PI * 0.7, true); g.fill(); g.strokeStyle = theme[0]; g.lineWidth = 1.4; g.stroke(); spiral(70, 20, 14, 1.5, theme[0], 1.6); spiral(20, 70, 14, 1.5, theme[0], 1.6); [[58, 54], [84, 36], [36, 84]].forEach(([x, y]) => { g.fillStyle = theme[1]; g.beginPath(); starPx(x, y, 6, 2.4, 4, 0).forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.fill(); }); }
    if (id === 'hearth') { [[28, 18], [18, 28]].forEach(([x, y]) => { g.strokeStyle = theme[0]; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 16, 0, TAU); g.stroke(); }); L([[23, 3], [43, 23], [23, 43], [3, 23]], GOLD_, 1.6, true); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; L([[72, 30], [72 + Math.cos(a) * 14, 30 + Math.sin(a) * 14]], theme[1], 1.6); L([[72 + Math.cos(a) * 8, 30 + Math.sin(a) * 8], [72 + Math.cos(a + 0.5) * 11, 30 + Math.sin(a + 0.5) * 11]], theme[1], 1.2); } L([[100, 8], [100, 30]], theme[0], 1.4); }
    g.restore();
  };
  corner(x0 + 30, 30, 0); corner(x0 + 738, 30, Math.PI / 2); corner(x0 + 738, 984, Math.PI); corner(x0 + 30, 984, -Math.PI / 2);
  g.restore();
}
function spreadArt(id, n) {
  const w = 1536, h = 1014, c = canvas(w, h), p = painter(c, id.length * 29 + n, 1.6), q = px(p, w, h), g = p.g;
  p.paper('#f3e8d0');
  for (let i = 0; i < 14; i++) q.wash(ellPx(q.rand() * w, q.rand() * h, 260, 160), q.rand() < 0.5 ? '#e9dcc0' : '#f8f0de', { alpha: 0.04, layers: 6, edge: 0 });
  GROUND[id](q);
  [0, 768].forEach((x0) => pageBorder(g, x0, id));
  // the title, printed at the front of the left page
  const [num, name, en, line] = PAGE_TEXT[id];
  g.textAlign = 'left'; g.fillStyle = '#7a6050'; g.font = '700 26px "Noto Serif SC", serif'; g.fillText(num, 84, 780);
  g.fillStyle = '#4a3528'; g.font = '900 64px "Noto Serif SC", serif'; g.fillText(name, 80, 852);
  g.fillStyle = '#9a6a3a'; g.font = 'italic 600 30px "Cormorant Garamond", serif'; g.fillText(en, 84, 894);
  g.fillStyle = '#5a4434'; g.font = '400 34px "Long Cang", "LXGW WenKai TC", cursive'; g.fillText(line, 84, 944);
  q.ink([[84, 796], [300, 796]], { color: '#c99a45', w: 1.6, alpha: 0.8, passes: 1 });
  // a note on the right page
  g.textAlign = 'right'; g.fillStyle = '#6a4f3c'; g.font = '400 36px "Long Cang", "LXGW WenKai TC", cursive';
  g.fillText(ROOMS[id].ready ? '轻点小屋，走进去看看' : '这一间还在装订中', 1450, 900);
  g.font = '400 28px "Long Cang", "LXGW WenKai TC", cursive'; g.fillStyle = '#8a6f5a';
  g.fillText(ROOMS[id].ready ? '仅供娱乐 · 不构成任何建议' : '下次翻开时，再来坐坐', 1450, 944);
  g.textAlign = 'center'; g.fillStyle = '#9a8270'; g.font = 'italic 500 24px "Cormorant Garamond", serif';
  g.fillText(`— ${n * 2 - 1} —`, 384, 972); g.fillText(`— ${n * 2} —`, 1152, 972);
  // the fold: a little shade either side of the gutter
  const gg = g.createLinearGradient(w / 2 - 80, 0, w / 2 + 80, 0);
  gg.addColorStop(0, 'rgba(70,46,30,0)'); gg.addColorStop(0.5, 'rgba(70,46,30,.2)'); gg.addColorStop(1, 'rgba(70,46,30,0)');
  g.fillStyle = gg; g.fillRect(w / 2 - 80, 0, 160, h);
  const half = (x) => { const o = canvas(768, 1014); o.getContext('2d').drawImage(c, x, 0, 768, 1014, 0, 0, 768, 1014); return o; };
  return [half(0), half(768)];
}

/** the cover: night-blue cloth, gold foil */
/** the cover in layers: leather colour with gold foil, and masks for where the foil is metal, smooth and raised */
function coverArt(layer = 'color') {
  const w = 800, h = 1080, c = canvas(w, h), g = c.getContext('2d'), r = mulberry(5);
  const mask = layer !== 'color', ink = layer === 'color' ? null : '#ffffff', cut = layer === 'color' ? '#1c2450' : layer === 'rough' ? '#b8b8b8' : layer === 'bump' ? '#7a7a7a' : '#000000';
  if (layer === 'color') {
    g.fillStyle = '#1c2450'; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h), d = img.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n * 1.2; } g.putImageData(img, 0, 0);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,10' : '120,130,180'},${0.05 + r() * 0.08})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2.5, 0, TAU); g.fill(); }
    for (let i = 0; i < 24; i++) { g.strokeStyle = `rgba(160,170,210,${0.05 + r() * 0.06})`; g.lineWidth = 1 + r() * 2; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 40, x + (r() - 0.5) * 140, y + (r() - 0.5) * 60); g.stroke(); }
    const v = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(120,130,170,.22)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  } else {
    g.fillStyle = layer === 'rough' ? '#b8b8b8' : layer === 'bump' ? '#7a7a7a' : '#000'; g.fillRect(0, 0, w, h);
    if (layer === 'bump') for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.14)'; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 1.8, 0, TAU); g.fill(); }
  }
  const gold = (() => { if (mask) return ink; const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f6dc94'); gr.addColorStop(0.35, '#b8862e'); gr.addColorStop(0.55, '#f2d283'); gr.addColorStop(1, '#a87a2a'); return gr; })();
  const pressed = () => { if (layer !== 'color') return; g.save(); g.globalCompositeOperation = 'source-over'; g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 3; g.shadowOffsetX = 1.5; g.shadowOffsetY = 2; };
  const done = () => { if (layer === 'color') g.restore(); };
  pressed();
  g.strokeStyle = gold; g.fillStyle = gold;
  g.lineWidth = 6; g.strokeRect(46, 46, w - 92, h - 92); g.lineWidth = 2; g.strokeRect(64, 64, w - 128, h - 128);
  // corner flourishes
  [[64, 64, 1, 1], [w - 64, 64, -1, 1], [64, h - 64, 1, -1], [w - 64, h - 64, -1, -1]].forEach(([x, y, dx, dy]) => { g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= 40; k++) { const t = k / 40, a = t * 1.6 * TAU; const xx = x + dx * (34 + Math.cos(a) * 26 * (1 - t)), yy = y + dy * (34 + Math.sin(a) * 26 * (1 - t)); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); g.beginPath(); starPx(x + dx * 6, y + dy * 6, 16, 5, 4, 0).forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.fill(); });
  // the emblem: a crescent cradling a little house, ringed by stars
  g.save(); g.translate(400, 380);
  g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 150, 0, TAU); g.stroke(); g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 134, 0, TAU); g.stroke();
  for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.cos(a) * 158, Math.sin(a) * 158); g.lineTo(Math.cos(a) * (k % 2 ? 172 : 186), Math.sin(a) * (k % 2 ? 172 : 186)); g.stroke(); }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.beginPath(); starPx(Math.cos(a) * 150, Math.sin(a) * 150, 9, 3, 4, a).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill(); }
  g.beginPath(); g.arc(-10, 0, 96, 0, TAU); g.fill();
  g.fillStyle = cut; g.beginPath(); g.arc(20, -22, 90, 0, TAU); g.fill(); g.fillStyle = gold;
  g.beginPath(); g.moveTo(-30, 60); g.lineTo(-30, 10); g.lineTo(0, -18); g.lineTo(30, 10); g.lineTo(30, 60); g.closePath(); g.fill();
  g.fillStyle = cut; g.fillRect(-9, 30, 18, 30); g.fillStyle = layer === 'color' ? '#fff3c4' : gold; g.beginPath(); g.arc(0, 8, 6, 0, TAU); g.fill(); g.fillStyle = gold;
  g.restore();
  g.textAlign = 'center';
  g.font = 'italic 600 132px "Cormorant Garamond", serif'; g.fillText('Oracle Inn', 400, 690);
  g.font = 'italic 500 32px "Cormorant Garamond", serif'; g.fillText('a pop-up book of fortunes from East & West', 400, 742);
  g.lineWidth = 1.5; g.beginPath(); g.moveTo(250, 774); g.lineTo(550, 774); g.stroke();
  g.font = '900 46px "Noto Serif SC", serif'; g.letterSpacing = '10px'; g.fillText('借问众神明', 405, 834);
  g.font = '500 22px "Noto Serif SC", serif'; g.letterSpacing = '8px'; g.fillText('东西方立体占卜书', 404, 876); g.letterSpacing = '0px';
  g.font = '400 34px "Long Cang", "LXGW WenKai TC", cursive'; g.fillText('翻开它，每一页是一间小屋', 400, 960);
  done();
  if (layer === 'bump') { const b = canvas(w, h), bg = b.getContext('2d'); bg.filter = 'blur(2px)'; bg.drawImage(c, 0, 0); return b; }
  return c;
}
function pageEdge() { const c = canvas(32, 256), g = c.getContext('2d'); g.fillStyle = '#efe4cc'; g.fillRect(0, 0, 32, 256); g.strokeStyle = 'rgba(120,96,70,.35)'; for (let y = 2; y < 256; y += 3.2) { g.beginPath(); g.moveTo(0, y); g.lineTo(32, y); g.stroke(); } return c; }
function moonGate(seed) {
  const w = 1000, h = 320;
  const coping = [[0, 70], [22, 36], [978, 36], [1000, 70]], wall = [[12, 320], [12, 70], [988, 70], [988, 320]], hole = circPx(500, 202, 116, 48);
  return die(w, h, seed, [coping, wall, hole], (q) => {
    q.wash(wall, '#f3ede0', { alpha: 0.4, layers: 12, vary: 0.006, edge: 0 });
    for (let i = 0; i < 12; i++) q.wash(ellPx(q.rand() * w, 120 + q.rand() * 180, 90, 40), '#d9cfbb', { alpha: 0.05, layers: 4, edge: 0 });
    q.wash(coping, '#55606e', { alpha: 0.45, layers: 10, vary: 0.01 });
    for (let x = 30; x < 980; x += 26) q.ink(arcPx(x, 50, 12, 0.1, Math.PI - 0.1, 6), { color: '#8a95a3', w: 1.6, alpha: 0.7, passes: 1 });
    q.ink(circPx(500, 202, 128, 48), { closed: true, color: '#8d8c88', w: 9, alpha: 0.75, passes: 1 });
    [170, 830].forEach((x) => { q.wash(rectPx(x - 50, 130, 100, 100), '#ffd98a', { alpha: 0.45, layers: 6, edge: 0 }); for (let k = 0; k <= 4; k++) { q.ink([[x - 50 + k * 25, 130], [x - 50 + k * 25, 230]], { color: '#5b3a28', w: 1.6, alpha: 0.75, passes: 1 }); q.ink([[x - 50, 130 + k * 25], [x + 50, 130 + k * 25]], { color: '#5b3a28', w: 1.6, alpha: 0.75, passes: 1 }); } });
    q.wash(rectPx(0, 300, 1000, 20), '#8d8c88', { alpha: 0.4, layers: 6, edge: 0 });
  }, { evenodd: true });
}

/* ---------- more pieces for the grander houses ---------- */
function towerTex() {
  return sheet(1024, 512, 561, (q) => {
    q.wash(rectPx(-6, -6, 1036, 524), '#b9cde3', { alpha: 0.45, layers: 10, vary: 0.003, edge: 0 });
    for (let y = 0; y < 512; y += 40) for (let x = ((y / 40) % 2) * 40; x < 1024; x += 80) q.ink(rectPx(x + 2, y + 2, 76, 36), { closed: true, color: '#7f93b0', w: 1.2, alpha: 0.45, passes: 1 });
    [128, 640].forEach((x) => glowWindow(q, archPx(x - 50, 120, 100, 170), '#2f3f6e'));
    [384, 896].forEach((x) => glowRound(q, x, 330, 44, '#2f3f6e'));
  });
}
function teaUpper() {
  return HOUSE_TEX.wall(512, 210, '#3a7470', 563, (q) => {
    [70, 206, 342].forEach((x) => { glowWindow(q, archPx(x, 40, 100, 120), '#f0e2c4'); q.wash(rectPx(x - 6, 160, 112, 22), '#8a5a3a', { alpha: 0.5, layers: 6 }); for (let k = 0; k < 6; k++) q.dot(x + 6 + k * 18, 156, 8, ['#e9a6b8', '#f2d27a', '#ffffff'][k % 3], 1); });
  });
}
function dormer(seed) {
  const w = 200, h = 220, shape = [[20, 220], [20, 90], [100, 14], [180, 90], [180, 220]];
  return die(w, h, seed, [shape], (q) => {
    q.wash(shape, '#3a7470', { alpha: 0.5, layers: 8, vary: 0.004 });
    q.wash([[10, 96], [100, 6], [190, 96], [176, 104], [100, 30], [24, 104]], '#4a4e5e', { alpha: 0.6, layers: 6 });
    glowWindow(q, archPx(56, 100, 88, 110), '#f0e2c4');
  });
}
function teacupSign(seed) {
  const w = 300, h = 260, bracket = rectPx(0, 20, 300, 14), board = circPx(150, 150, 100);
  return die(w, h, seed, [bracket, board, rectPx(60, 30, 8, 40), rectPx(232, 30, 8, 40)], (q) => {
    q.flat(bracket, '#262230', 1);
    q.wash(board, '#f0e2c4', { alpha: 0.6, layers: 8 }); q.ink(circPx(150, 150, 92), { closed: true, color: '#3a7470', w: 5, alpha: 0.9, passes: 1 });
    q.wash([[100, 140], [200, 140], [190, 190], [110, 190]], '#e9a6b8', { alpha: 0.6, layers: 6 }); q.ink(arcPx(206, 160, 18, -1.4, 1.4, 8), { color: '#c4613f', w: 4, alpha: 0.9, passes: 1 });
    q.ink([[130, 125], [125, 100], [135, 80]], { color: '#9a8aa0', w: 2.5, alpha: 0.7, passes: 1 }); q.ink([[165, 125], [160, 100], [170, 80]], { color: '#9a8aa0', w: 2.5, alpha: 0.7, passes: 1 });
  });
}
function firewood(seed) {
  const w = 300, h = 200, logs = [];
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) logs.push(circPx(60 + k * 60 + r * 30, 170 - r * 50, 28));
  return die(w, h, seed, logs, (q) => logs.forEach((s) => { q.wash(s, '#c99466', { alpha: 0.6, layers: 6 }); const [cx, cy] = [s.reduce((a, p) => a + p[0], 0) / s.length, s.reduce((a, p) => a + p[1], 0) / s.length]; q.ink(circPx(cx, cy, 16), { closed: true, color: '#6b4430', w: 1.4, alpha: 0.6, passes: 1 }); q.ink(s, { closed: true, color: '#4a2c1a', w: 2, alpha: 0.7, passes: 1 }); }));
}
function porthole(seed) { return die(160, 160, seed, [circPx(80, 80, 70)], (q) => glowRound(q, 80, 80, 58, '#d9a441')); }
function flagAtlas() {
  return sheet(512, 128, 571, (q) => ['#e3b45a', '#e9a6b8', '#9a7ad0', '#5fb0a8'].forEach((c, k) => { q.wash([[k * 128 + 6, 4], [k * 128 + 122, 4], [k * 128 + 64, 124]], c, { alpha: 0.6, layers: 6, vary: 0.004, edgeColor: '#5a3a28', edge: 0.4 }); q.sparkle(k * 128 + 64, 40, 14, '#fff3cf', 0.9); }));
}
