/* ================= the magic hut and the paper rooms, painted ================= */
/*
 * Everything here is cut card too: walls, shelves, curtains, the fireplace, the rooms inside the
 * little houses. Big pieces are painted once, at a size that holds up close to the camera.
 */

/* ---------- the hut around the desk ---------- */
function roundRug(seed, pal = ['#1f2a55', '#c99a45', '#6b3f7d', '#f2d78f']) {
  const w = 1024, c = 512;
  return die(w, w, seed, [circPx(c, c, 500, 72)], (q) => {
    q.wash(circPx(c, c, 504, 72), pal[0], { alpha: 0.55, layers: 12, vary: 0.004, edge: 0 });
    [480, 440, 300, 140].forEach((r, i) => q.ink(circPx(c, c, r, 72), { closed: true, color: i % 2 ? pal[3] : pal[1], w: i === 1 ? 6 : 3, alpha: 0.9, passes: 1 }));
    q.wash(circPx(c, c, 296, 72), pal[2], { alpha: 0.25, layers: 8, edge: 0 });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, x = c + Math.cos(a) * 370, y = c + Math.sin(a) * 370; q.wash(circPx(x, y, 34), pal[3], { alpha: 0.4, layers: 6, edge: 0 }); q.g.fillStyle = pal[0]; q.g.beginPath(); q.g.arc(x + 10 * Math.cos(k), y + 10 * Math.sin(k), 30, 0, TAU); q.g.fill(); }
    q.flat(starPx(c, c, 120, 46, 8), pal[1], 0.95); q.flat(circPx(c, c, 34), pal[3], 1);
  }, { margin: 2 });
}
function bookcase(seed, mirror = false) {
  const w = 800, h = 1400;
  const frame = [[20, h], [20, 150], [70, 74], [400, 22], [730, 74], [780, 150], [780, h]];
  return die(w, h, seed, [frame], (q) => {
    q.wash(frame, '#4a2e1e', { alpha: 0.6, layers: 10, vary: 0.004, edge: 0 });
    q.wash([[70, h - 40], [70, 170], [110, 116], [400, 76], [690, 116], [730, 170], [730, h - 40]], '#22140c', { alpha: 0.7, layers: 8, vary: 0.004, edge: 0 });
    const shelves = [370, 620, 870, 1120, 1340];
    shelves.forEach((y) => { q.flat(rectPx(60, y, 680, 26), '#6b4a30', 1); q.ink([[60, y], [740, y]], { color: '#c99a45', w: 1.5, alpha: 0.6, passes: 1 }); });
    const tops = [170, 396, 646, 896, 1146];
    const spines = ['#8f3b46', '#3f7f86', '#d9a441', '#4a5a9a', '#6b8a4a', '#9a6ab0', '#c4613f', '#2f4a6a'];
    tops.forEach((top, row) => {
      const y1 = shelves[row];
      let x = 80;
      while (x < 710) {
        const kind = q.rand();
        if (kind < 0.55) { // a run of books
          const n = 2 + Math.floor(q.rand() * 5);
          for (let i = 0; i < n && x < 700; i++) { const bw = 18 + q.rand() * 16, bh = (y1 - top) * (0.55 + q.rand() * 0.35), col = spines[Math.floor(q.rand() * spines.length)]; q.wash(rectPx(x, y1 - bh, bw, bh), col, { alpha: 0.6, layers: 4, vary: 0.004, edgeColor: '#1e1209', edge: 0.6 }); q.ink([[x + 3, y1 - bh * 0.8], [x + bw - 3, y1 - bh * 0.8]], { color: '#e3b45a', w: 1.4, alpha: 0.8, passes: 1 }); x += bw + 2; }
          x += 12;
        } else if (kind < 0.75) { // a potion jar that glows
          const jw = 48 + q.rand() * 20, jh = 70 + q.rand() * 40, col = ['#7de0b0', '#e9a6d8', '#8fb6ff', '#ffd27a'][Math.floor(q.rand() * 4)];
          q.wash([[x, y1], [x + jw, y1], [x + jw, y1 - jh * 0.6], [x + jw * 0.7, y1 - jh * 0.8], [x + jw * 0.7, y1 - jh], [x + jw * 0.3, y1 - jh], [x + jw * 0.3, y1 - jh * 0.8], [x, y1 - jh * 0.6]], '#d8e6f0', { alpha: 0.3, layers: 6, vary: 0.004 });
          q.wash(rectPx(x + 4, y1 - jh * 0.5, jw - 8, jh * 0.5 - 4), col, { alpha: 0.55, layers: 6, edge: 0 });
          q.glow(x + jw / 2, y1 - jh * 0.3, jh, col, 0.45);
          q.flat(rectPx(x + jw * 0.28, y1 - jh - 10, jw * 0.44, 12), '#8a5a3a', 1);
          x += jw + 16;
        } else if (kind < 0.88) { // a crystal cluster
          [[0, 70, 14], [20, 96, 16], [44, 60, 12]].forEach(([dx, hh, ww]) => q.wash([[x + dx, y1], [x + dx + ww, y1], [x + dx + ww * 0.5, y1 - hh]], '#c9b6ff', { alpha: 0.5, layers: 6, edgeColor: '#7a62c8', edge: 0.6 }));
          q.glow(x + 30, y1 - 40, 60, '#e6dcff', 0.4);
          x += 80;
        } else { // a small globe or a plant
          if (q.rand() < 0.5) { q.wash(circPx(x + 34, y1 - 56, 30), '#4a6fa5', { alpha: 0.5, layers: 6 }); q.ink(circPx(x + 34, y1 - 56, 30), { closed: true, color: '#c99a45', w: 2, alpha: 0.8, passes: 1 }); q.flat(rectPx(x + 26, y1 - 24, 16, 24), '#c99a45', 1); }
          else { q.flat([[x, y1], [x + 54, y1], [x + 46, y1 - 34], [x + 8, y1 - 34]], '#c46a4a', 1); for (let i = 0; i < 9; i++) q.wash(ellPx(x + 27 + (q.rand() - 0.5) * 60, y1 - 60 - q.rand() * 50, 14, 8), '#4f8a54', { alpha: 0.5, layers: 4, edge: 0 }); }
          x += 76;
        }
      }
    });
    q.ink(frame, { closed: true, color: '#c99a45', w: 2, alpha: 0.6 });
    q.flat(rectPx(370, 40, 60, 40), '#c99a45', 1); q.flat(circPx(400, 54, 14), '#f2d78f', 1);
    if (mirror) q.g.scale(1, 1);
  });
}
function fireplace(seed) {
  const w = 1000, h = 900;
  const mantle = rectPx(30, 150, 940, 60), body = [[80, h], [80, 210], [920, 210], [920, h]], top = rectPx(60, 100, 880, 56);
  return die(w, h, seed, [mantle, body, top], (q) => {
    q.wash(body, '#5e5670', { alpha: 0.5, layers: 10, vary: 0.004, edge: 0 });
    for (let y = 220; y < h; y += 56) for (let x = 80 + ((y / 56) % 2) * 50; x < 920; x += 100) q.ink(rectPx(x + 2, y + 2, 96, 52), { closed: true, color: '#2e2840', w: 1.6, alpha: 0.6, passes: 1 });
    const arch = archPx(250, 390, 500, 510);
    q.wash(arch, '#120a0a', { alpha: 0.9, layers: 6, vary: 0.004 });
    q.glow(500, 800, 300, '#ff9a3a', 0.65); q.glow(500, 820, 160, '#ffe08a', 0.7);
    [[380, 880, 520, 838], [450, 870, 640, 846]].forEach(([x0, y0, x1, y1]) => q.wash([[x0, y0], [x1, y1], [x1 + 4, y1 + 26], [x0 + 4, y0 + 26]], '#4a2a18', { alpha: 0.8, layers: 4 }));
    [[430, 840, 70, 150], [500, 840, 90, 210], [570, 840, 70, 160]].forEach(([x, y, fw, fh]) => { q.wash([[x - fw / 2, y], [x - fw / 4, y - fh * 0.6], [x, y - fh], [x + fw / 4, y - fh * 0.55], [x + fw / 2, y]], '#ff8a3a', { alpha: 0.5, layers: 8, edge: 0 }); q.wash([[x - fw / 4, y], [x, y - fh * 0.6], [x + fw / 4, y]], '#ffe08a', { alpha: 0.6, layers: 6, edge: 0 }); });
    q.ink(arch, { closed: true, color: '#2e2840', w: 4, alpha: 0.8 });
    [mantle, top].forEach((s) => { q.wash(s, '#6b4a30', { alpha: 0.6, layers: 8, vary: 0.004 }); q.ink(s, { closed: true, color: '#c99a45', w: 1.6, alpha: 0.6, passes: 1 }); });
  });
}
function drape(seed, flip = false) {
  const w = 700, h = 1500, f = (x) => (flip ? w - x : x);
  const shape = [[f(0), 0], [f(700), 0], [f(640), 60], [f(470), 260], [f(330), 560], [f(300), 620], [f(340), 760], [f(300), 1500], [f(0), 1500]];
  return die(w, h, seed, [shape], (q) => {
    q.wash(shape, '#5a2f6e', { alpha: 0.55, layers: 12, vary: 0.004, edge: 0 });
    for (let k = 0; k < 7; k++) { const x = 40 + k * 44; q.wash([[f(x), 0], [f(x + 20), 0], [f(x + 30 + k * 10), 620], [f(x + 14 + k * 8), 1500], [f(x - 6), 1500]], '#7a4b92', { alpha: 0.25, layers: 6, edge: 0 }); }
    q.ink([[f(700), 0], [f(640), 60], [f(470), 260], [f(330), 560]], { color: '#e3b45a', w: 5, alpha: 0.9, passes: 1 });
    q.flat(ellPx(f(320), 640, 40, 26), '#d9a441', 1); q.ink([[f(320), 660], [f(330), 760]], { color: '#d9a441', w: 6, alpha: 1, passes: 1 }); q.flat([[f(310), 760], [f(350), 760], [f(360), 840], [f(300), 840]], '#d9a441', 1);
  });
}
/** the tent's finial on the page: an eight-pointed star, long points up, down and to the sides, short ones between (as on the tarot Star card) */
function eightStarCard(seed) {
  const w = 220, h = 220, cx = 110, cy = 110;
  const shape = Array.from({ length: 16 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 8, k = i % 4, r = k === 0 ? 100 : k === 2 ? 64 : 22; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  return die(w, h, seed, [shape], (q) => {
    q.wash(shape, '#f2d27a', { alpha: 0.5, layers: 12, vary: 0.02, edgeColor: '#c99a45', edge: 0.6 });
    q.glow(cx, cy, 70, '#fff6d0', 0.7);
    for (let i = 0; i < 16; i += 2) q.ink([[cx, cy], shape[i]], { color: '#c99a45', w: 1.2, alpha: 0.45, passes: 1 });     // a ridge down each point
  }, { margin: 3 });
}
function lanternPaper(base = '#ffd98a', ink = '#c4613f') {
  return sheet(512, 256, 713, (q) => {
    q.wash(rectPx(-4, -4, 520, 264), base, { alpha: 0.6, layers: 8, vary: 0.004, edge: 0 });
    for (let x = 0; x < 512; x += 64) q.ink([[x, 0], [x, 256]], { color: ink, w: 1.4, alpha: 0.5, passes: 1 });
    for (let k = 0; k < 4; k++) q.sparkle(64 + k * 128, 128, 22, ink, 0.6);
  });
}

/* ---------- inside the tent ---------- */
/* ---------- inside the tarot tent: celestial paper art, every layer edged in dark gold ---------- */
const DG = '#a27c30', DG2 = '#cfa955', PCREAM = '#efe2c4';
/** one cut-paper layer: a soft shadow under it, a flat fill, a dark-gold edge */
function layer(g, path, fill, o = {}) {
  g.save(); g.shadowColor = `rgba(8,4,16,${o.shadow ?? 0.5})`; g.shadowBlur = o.blur ?? 10; g.shadowOffsetX = o.dx ?? 2; g.shadowOffsetY = o.dy ?? 5; g.fillStyle = fill; g.beginPath(); path(); g.fill(); g.restore();
  if (o.lw !== 0) { g.save(); g.strokeStyle = o.line ?? DG; g.lineWidth = o.lw ?? 3; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); path(); g.stroke(); g.restore(); }
}
function polyPath(g, pts) { return () => { pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }; }
function circlePath(g, x, y, r) { return () => g.arc(x, y, r, 0, TAU); }
function crescentPath(g, x, y, r) { return () => moonPath(g, x, y, r); }
/** the little celestial motifs the tent is full of */
function motif(g, kind, x, y, r) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'sun') {
    const rays = []; for (let k = 0; k < 32; k++) { const a = (k / 32) * TAU, l = k % 2 ? r * 1.25 : r * 1.55; rays.push([x + Math.cos(a) * (k % 2 ? r * 1.02 : l), y + Math.sin(a) * (k % 2 ? r * 1.02 : l)]); }
    layer(g, polyPath(g, rays), '#d9a646'); layer(g, circlePath(g, x, y, r), '#efc96e');
    g.strokeStyle = DG; g.lineWidth = Math.max(2, r * 0.06);
    [-1, 1].forEach((s) => { g.beginPath(); g.arc(x + s * r * 0.33, y - r * 0.08, r * 0.16, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); });
    g.beginPath(); g.arc(x, y + r * 0.22, r * 0.3, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    g.beginPath(); g.moveTo(x, y - r * 0.05); g.quadraticCurveTo(x + r * 0.1, y + r * 0.12, x - r * 0.02, y + r * 0.14); g.stroke();
  } else if (kind === 'moon') {
    layer(g, crescentPath(g, x, y, r), '#ead9a6');
    g.strokeStyle = DG; g.lineWidth = Math.max(2, r * 0.06); g.beginPath(); g.arc(x - r * 0.42, y - r * 0.1, r * 0.13, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
    g.beginPath(); g.arc(x - r * 0.35, y + r * 0.32, r * 0.12, Math.PI * 0.2, Math.PI * 0.9); g.stroke();
  } else if (kind === 'star') {
    layer(g, polyPath(g, starPx(x, y, r, r * 0.38, 8)), '#e8c46a'); layer(g, polyPath(g, starPx(x, y, r * 0.55, r * 0.22, 4, 0)), '#f6e6b0', { lw: 2, blur: 4, dy: 2 });
  } else if (kind === 'planet') {
    g.save(); g.strokeStyle = DG; g.lineWidth = Math.max(2, r * 0.07); g.beginPath(); g.ellipse(x, y, r * 1.7, r * 0.45, -0.35, Math.PI, TAU); g.stroke(); g.restore();
    layer(g, circlePath(g, x, y, r), '#3f7f86');
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip(); g.strokeStyle = 'rgba(239,226,196,.45)'; g.lineWidth = r * 0.12; [-0.35, 0.05, 0.4].forEach((o) => { g.beginPath(); g.moveTo(x - r, y + o * r - 0.3 * r); g.lineTo(x + r, y + o * r + 0.3 * r); g.stroke(); }); g.restore();
    g.save(); g.strokeStyle = DG; g.lineWidth = Math.max(3, r * 0.09); g.beginPath(); g.ellipse(x, y, r * 1.7, r * 0.45, -0.35, 0, Math.PI); g.stroke(); g.strokeStyle = '#e8c46a'; g.lineWidth = Math.max(1.5, r * 0.04); g.stroke(); g.restore();
  } else if (kind === 'comet') {
    layer(g, () => { g.moveTo(x + r * 0.4, y - r * 0.4); g.quadraticCurveTo(x - r * 1.2, y + r * 0.2, x - r * 2.6, y + r * 1.6); g.quadraticCurveTo(x - r * 0.6, y + r * 0.9, x + r * 0.4, y + r * 0.4); g.closePath(); }, '#cdbfe6');
    layer(g, circlePath(g, x + r * 0.35, y, r * 0.55), '#f6e6b0');
  } else if (kind === 'eye') {
    layer(g, () => { g.moveTo(x - r * 1.3, y); g.quadraticCurveTo(x, y - r * 1.1, x + r * 1.3, y); g.quadraticCurveTo(x, y + r * 1.1, x - r * 1.3, y); g.closePath(); }, PCREAM);
    layer(g, circlePath(g, x, y, r * 0.48), '#3f7f86', { blur: 3, dy: 1 }); g.fillStyle = '#1a1430'; g.beginPath(); g.arc(x, y, r * 0.2, 0, TAU); g.fill();
    g.strokeStyle = DG; g.lineWidth = 2.5; for (let k = 0; k < 7; k++) { const a = Math.PI + 0.35 + (k / 6) * (Math.PI - 0.7); g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.75); g.lineTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.15); g.stroke(); }
  } else if (kind === 'hourglass') {
    layer(g, polyPath(g, [[x - r * 0.7, y - r], [x + r * 0.7, y - r], [x + r * 0.12, y], [x + r * 0.7, y + r], [x - r * 0.7, y + r], [x - r * 0.12, y]]), '#cfe0e6');
    layer(g, polyPath(g, [[x - r * 0.45, y + r * 0.95], [x + r * 0.45, y + r * 0.95], [x, y + r * 0.45]]), '#e8c46a', { lw: 1.5, blur: 2, dy: 1 });
    [-1, 1].forEach((s) => layer(g, polyPath(g, [[x - r * 0.9, y + s * r - 5], [x + r * 0.9, y + s * r - 5], [x + r * 0.9, y + s * r + 5], [x - r * 0.9, y + s * r + 5]]), '#7a4a2a', { lw: 2, blur: 3, dy: 2 }));
  } else if (kind === 'key') {
    layer(g, circlePath(g, x, y - r * 0.6, r * 0.42), '#e8c46a'); g.fillStyle = '#2a2458'; g.beginPath(); g.arc(x, y - r * 0.6, r * 0.18, 0, TAU); g.fill();
    layer(g, polyPath(g, [[x - r * 0.08, y - r * 0.2], [x + r * 0.08, y - r * 0.2], [x + r * 0.08, y + r], [x - r * 0.08, y + r]]), '#e8c46a', { lw: 2 });
    [[0.55, 0.3], [0.8, 0.25]].forEach(([o, l]) => layer(g, polyPath(g, [[x + r * 0.08, y + r * o], [x + r * (0.08 + l), y + r * o], [x + r * (0.08 + l), y + r * (o + 0.12)], [x + r * 0.08, y + r * (o + 0.12)]]), '#e8c46a', { lw: 2, blur: 2, dy: 1 }));
  }
}



/* ---------- the tarot tent, candlelit: indigo velvet printed with worn gold stars, aged card, warm light ---------- */
const AG = { gold: '#c9a24e', gold2: '#e2c27a', goldD: '#9a7a36', tan: '#8a6a48', line: '#3a2618' };
function agStar(g, x, y, R, n, rng) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = (i % 2 ? R * 0.4 : R) * (0.86 + rng() * 0.28); i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
function agSparkle(g, x, y, R) { const k = 0.14; g.beginPath(); g.moveTo(x, y - R); g.quadraticCurveTo(x + R * k, y - R * k, x + R, y); g.quadraticCurveTo(x + R * k, y + R * k, x, y + R); g.quadraticCurveTo(x - R * k, y + R * k, x - R, y); g.quadraticCurveTo(x - R * k, y - R * k, x, y - R); g.fill(); }
function agCrescent(g, x, y, R, a = 0) { g.beginPath(); moonPath(g, x, y, R, 0.42, 0.8, a); g.fill(); }
function agMottle(g, w, h, r, n, light = 'rgba(96,66,140,.10)', dark = 'rgba(4,2,10,.18)') { for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, rad = 20 + r() * 90, gb = g.createRadialGradient(x, y, 0, x, y, rad); gb.addColorStop(0, r() < 0.5 ? light : dark); gb.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gb; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); } }
function agWear(g, w, h, r, n) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(255,236,200,${0.02 + r() * 0.05})`; const x = r() * w, y = r() * h; g.fillRect(x, y, 1 + r() * 3, 1); } for (let i = 0; i < n / 40; i++) { g.strokeStyle = `rgba(255,236,200,${0.03 + r() * 0.04})`; g.lineWidth = 1; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke(); } }
/** scattered gold print: dots, sparkles, little stars and the odd crescent; painted into colour and into a glow mask alike */
function agPrint(g, gg, x0, y0, w, h, n, seed, scale = 1) {
  const r = mulberry(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * w, y = y0 + r() * h, k = r(), kind = k < 0.42 ? 0 : k < 0.72 ? 1 : k < 0.94 ? 2 : 3, sz = [1 + r() * 1.6, 4 + r() * 7, 4 + r() * 5, 7 + r() * 6][kind] * scale, rot = r() * TAU, a = 0.5 + r() * 0.5, col = [AG.gold, AG.gold2, AG.goldD][Math.floor(r() * 3)], sd = Math.floor(r() * 1e6);
    [[g, col], [gg, '#fff']].forEach(([x2, cl]) => { if (!x2) return; x2.globalAlpha = a; x2.fillStyle = cl; const rng = mulberry(sd);
      if (kind === 0) { x2.beginPath(); x2.arc(x, y, sz, 0, TAU); x2.fill(); } else if (kind === 1) agSparkle(x2, x, y, sz); else if (kind === 2) agStar(x2, x, y, sz, 5, rng); else agCrescent(x2, x, y, sz, rot); x2.globalAlpha = 1; });
  }
}
/** the velvet itself: deep indigo-violet, mottled and worn, folds shaded in, a gold print over it */
function starFabric(w, h, seed, o = {}) {
  const c = canvas(w, h), g = c.getContext('2d'), gl = canvas(w, h), gg = gl.getContext('2d'), r = mulberry(seed);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, o.top ?? '#2a1f48'); gr.addColorStop(1, o.bottom ?? '#1b1532'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  agMottle(g, w, h, r, Math.round((w * h) / 5000));
  if (o.folds) for (let x = 0; x < w; x++) { const f = Math.sin((x / w) * TAU * o.folds) * 0.6 + Math.sin((x / w) * TAU * o.folds * 2.3 + 1) * 0.4; g.fillStyle = f > 0 ? `rgba(130,110,180,${f * 0.09})` : `rgba(0,0,0,${-f * 0.3})`; g.fillRect(x, 0, 1, h); }
  gg.fillStyle = '#000'; gg.fillRect(0, 0, w, h);
  agPrint(g, gg, 0, 0, w, h, Math.round(((w * h) / 2600) * (o.density ?? 1)), seed + 1, o.scale ?? 1);
  agWear(g, w, h, r, Math.round((w * h) / 1600));
  const trim = (x, y, ww, hh, vertical) => { [[g, AG.gold], [gg, '#fff']].forEach(([x2, cl]) => { x2.fillStyle = cl; x2.globalAlpha = 0.95; x2.fillRect(x, y, ww, hh); x2.globalAlpha = 1; x2.fillStyle = x2 === g ? '#5a3f18' : '#000'; if (vertical) { x2.fillRect(x + 3, y, 2, hh); x2.fillRect(x + ww - 5, y, 2, hh); for (let yy = y + 10; yy < y + hh; yy += 22) { x2.beginPath(); x2.arc(x + ww / 2, yy, 3, 0, TAU); x2.fill(); } } else { x2.fillRect(x, y + 3, ww, 2); x2.fillRect(x, y + hh - 5, ww, 2); for (let xx = x + 10; xx < x + ww; xx += 22) { x2.beginPath(); x2.arc(xx, y + hh / 2, 3, 0, TAU); x2.fill(); } } }); };
  if (o.trimBottom) trim(0, h - o.trimBottom, w, o.trimBottom, false);
  if (o.trimSide) trim(w - o.trimSide - 8, 0, o.trimSide, h, true);
  c.glow = gl; return c;
}


/* ---------- the tarot tent as a little 3D diorama: painted surfaces ---------- */
const T3 = {
  /** pale tent cloth, panels of cream and lilac, faint stars */
  wall() { const W = 1024, H = 512, c = canvas(W, H), g = c.getContext('2d'), r = mulberry(9601); for (let x = 0; x < W; x += 64) { g.fillStyle = (x / 64) % 2 ? '#c8928c' : '#dcc0a8'; g.fillRect(x, 0, 64, H); } for (let x = 0; x < W; x++) { const f = Math.sin(x * 0.098) * 0.5 + Math.sin(x * 0.21 + 1) * 0.25; g.fillStyle = f > 0 ? `rgba(255,250,240,${f * 0.12})` : `rgba(90,40,50,${-f * 0.14})`; g.fillRect(x, 0, 1, H); } const v = g.createLinearGradient(0, 0, 0, H); v.addColorStop(0, 'rgba(110,50,80,.28)'); v.addColorStop(0.3, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(110,60,50,.2)'); g.fillStyle = v; g.fillRect(0, 0, W, H); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '80,40,50'},.04)`; g.fillRect(r() * W, r() * H, 1, 2); } return c; },
  /** the canopy's valance: purple, gold moons and sparkles, a gold band along the hem */
  valance() { const W = 2048, H = 256, c = canvas(W, H), g = c.getContext('2d'), r = mulberry(9611); const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4a2a70'); gr.addColorStop(1, '#6a3c92'); g.fillStyle = gr; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x++) { const f = Math.sin(x * 0.03) * 0.5; g.fillStyle = f > 0 ? `rgba(255,220,255,${f * 0.08})` : `rgba(0,0,0,${-f * 0.18})`; g.fillRect(x, 0, 1, H); } g.fillStyle = '#e2bf6e'; for (let k = 0; k < 12; k++) { const x = 90 + k * 170; if (k % 2) { g.beginPath(); moonPath(g, x, 110, 30, 0.42, 0.82, Math.PI * 0.1); g.fill(); } else agSparkle(g, x, 110, 20); agSparkle(g, x + 85, 80, 9); } g.fillRect(0, 196, W, 34); g.fillStyle = '#b8903e'; g.fillRect(0, 196, W, 4); g.fillRect(0, 226, W, 4); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},.04)`; g.fillRect(r() * W, r() * H, 1, 2); } return c; },
  /** a pink runner worked with lozenges */
  runner() { const W = 1024, H = 256, c = canvas(W, H), g = c.getContext('2d'), r = mulberry(9612); g.fillStyle = '#d4889a'; g.fillRect(0, 0, W, H); g.fillStyle = '#b8667e'; g.fillRect(0, 0, W, 22); g.fillRect(0, H - 22, W, 22); for (let x = 0; x < W; x += 128) { g.fillStyle = '#f2d2c4'; g.beginPath(); g.moveTo(x + 64, 40); g.lineTo(x + 120, 128); g.lineTo(x + 64, 216); g.lineTo(x + 8, 128); g.closePath(); g.fill(); g.fillStyle = '#c86a82'; g.beginPath(); g.moveTo(x + 64, 84); g.lineTo(x + 92, 128); g.lineTo(x + 64, 172); g.lineTo(x + 36, 128); g.closePath(); g.fill(); g.fillStyle = '#f2d2c4'; g.beginPath(); g.arc(x + 64, 128, 8, 0, TAU); g.fill(); } for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '60,20,30'},.05)`; g.fillRect(r() * W, r() * H, 2, 2); } return c; },
  /** purple velvet printed with gold stars and moons */
  velvet() { return starFabric(512, 1024, 9602, { top: '#5e3684', bottom: '#4e2c74', density: 0.7, scale: 1.3, trimSide: 20, trimBottom: 26 }); },
  /** the cloth for the table's skirt: a sun medallion at each quarter, moons between, a gold band at the hem */
  skirt() { const W = 2048, H = 512, c = starFabric(W, H, 9603, { top: '#5a3280', bottom: '#4a2a6a', density: 0.7, scale: 1.4 }), g = c.getContext('2d'); g.fillStyle = '#d9b25e'; g.strokeStyle = '#d9b25e'; const sun = (cx, cy) => { for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, l = k % 2 ? 66 : 92; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.13) * 40, cy + Math.sin(a - 0.13) * 40); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.lineTo(cx + Math.cos(a + 0.13) * 40, cy + Math.sin(a + 0.13) * 40); g.fill(); } g.beginPath(); g.arc(cx, cy, 40, 0, TAU); g.fill(); g.strokeStyle = '#6a4418'; g.lineWidth = 3; [-1, 1].forEach((d) => { g.beginPath(); g.arc(cx + d * 13, cy - 5, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }); g.beginPath(); g.arc(cx, cy + 10, 11, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); g.strokeStyle = '#d9b25e'; }; [0.125, 0.375, 0.625, 0.875].forEach((u) => sun(u * W, 220)); [0, 0.25, 0.5, 0.75, 1].forEach((u, i) => { g.beginPath(); moonPath(g, u * W, 220, 46, 0.42, 0.82, i % 2 ? 0 : Math.PI); g.fill(); }); g.fillRect(0, H - 70, W, 8); g.fillRect(0, H - 22, W, 6); for (let x = 0; x < W; x += 34) { g.beginPath(); g.moveTo(x, H - 58); g.lineTo(x + 17, H - 40); g.lineTo(x + 34, H - 58); g.lineTo(x + 17, H - 30); g.closePath(); g.fill(); } return c; },
  /** the top of the cloth: a ring of stars and a gold border */
  clothTop() { const S = 512, c = starFabric(S, S, 9604, { top: '#5a3280', bottom: '#4e2c72', density: 0.6 }), g = c.getContext('2d'); g.strokeStyle = '#d9b25e'; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, 244, 0, TAU); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(256, 256, 226, 0, TAU); g.stroke(); return c; },
  /** a round rug: indigo and violet, a ring of moons, a sun-star at the heart */
  roundRug() { const S = 1024, c = canvas(S, S), g = c.getContext('2d'), cx = 512, r = mulberry(9605); g.fillStyle = '#4a3478'; g.beginPath(); g.arc(cx, cx, 512, 0, TAU); g.fill(); [[500, '#c9963e'], [478, '#3a2a62'], [380, '#c9963e'], [366, '#5a3e8a'], [180, '#c9963e'], [166, '#3a2a62']].forEach(([rr, col]) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cx, rr, 0, TAU); g.fill(); }); g.fillStyle = '#e0bc6a'; for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; g.beginPath(); moonPath(g, cx + Math.cos(a) * 428, cx + Math.sin(a) * 428, 24, 0.42, 0.8, a); g.fill(); agStar(g, cx + Math.cos(a + 0.2) * 428, cx + Math.sin(a + 0.2) * 428, 9, 5, r); } for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; agStar(g, cx + Math.cos(a) * 270, cx + Math.sin(a) * 270, 34, 4, r); } for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.12) * 60, cx + Math.sin(a - 0.12) * 60); g.lineTo(cx + Math.cos(a) * 150, cx + Math.sin(a) * 150); g.lineTo(cx + Math.cos(a + 0.12) * 60, cx + Math.sin(a + 0.12) * 60); g.fill(); } g.beginPath(); g.arc(cx, cx, 60, 0, TAU); g.fill(); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,240,220' : '0,0,0'},.06)`; g.fillRect(r() * S, r() * S, 2, 3); } return c; },
  /** a navy hanging with a gold sun face */
  sunHanging() { const W = 512, H = 640, c = canvas(W, H), g = c.getContext('2d'), r = mulberry(9606); g.fillStyle = '#1e2448'; g.fillRect(0, 0, W, H); g.strokeStyle = '#c9a24e'; g.lineWidth = 8; g.strokeRect(24, 24, W - 48, H - 48); g.lineWidth = 2; g.strokeRect(42, 42, W - 84, H - 84); const cx = 256, cy = 300; g.fillStyle = '#d9b25e'; for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU, l = k % 2 ? 150 : 190; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.08) * 92, cy + Math.sin(a - 0.08) * 92); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.lineTo(cx + Math.cos(a + 0.08) * 92, cy + Math.sin(a + 0.08) * 92); g.fill(); } g.beginPath(); g.arc(cx, cy, 92, 0, TAU); g.fill(); g.strokeStyle = '#6a4418'; g.lineWidth = 5; [-1, 1].forEach((d) => { g.beginPath(); g.arc(cx + d * 32, cy - 14, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.moveTo(cx + d * 16, cy - 40); g.quadraticCurveTo(cx + d * 32, cy - 50, cx + d * 50, cy - 38); g.stroke(); }); g.beginPath(); g.moveTo(cx, cy - 10); g.quadraticCurveTo(cx + 12, cy + 16, cx - 4, cy + 22); g.stroke(); g.beginPath(); g.arc(cx, cy + 32, 26, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); g.fillStyle = '#d9b25e'; for (let i = 0; i < 30; i++) { const x = 60 + r() * 392, y = 60 + r() * 520; if (Math.hypot(x - cx, y - cy) < 200) continue; agSparkle(g, x, y, 4 + r() * 6); } return c; },
  /** a navy hanging: a crescent, stars, a range of mountains */
  moonHanging() { const W = 640, H = 760, c = canvas(W, H), g = c.getContext('2d'), r = mulberry(9607); g.fillStyle = '#1a2246'; g.fillRect(0, 0, W, H); g.fillStyle = '#d9b25e'; g.beginPath(); moonPath(g, 330, 250, 110, 0.42, 0.82, Math.PI * 0.15); g.fill(); [[150, 170, 22], [500, 150, 16], [520, 360, 26], [120, 420, 14], [420, 460, 12], [250, 110, 10]].forEach(([x, y, s]) => agStar(g, x, y, s, 4, r)); for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(40 + r() * 560, 40 + r() * 480, 1.5 + r() * 2, 0, TAU); g.fill(); } const mts = [[0, 690], [120, 540], [210, 620], [330, 470], [450, 600], [540, 520], [640, 640], [640, 760], [0, 760]]; g.fillStyle = '#3a3e6a'; g.beginPath(); mts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill(); g.fillStyle = '#7a6a8a'; [[120, 540], [330, 470], [540, 520]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 30, y + 40); g.lineTo(x - 8, y + 34); g.lineTo(x + 6, y + 46); g.lineTo(x + 30, y + 38); g.closePath(); g.fill(); }); g.strokeStyle = '#c9a24e'; g.lineWidth = 6; g.strokeRect(14, 14, W - 28, H - 28); return c; },
  /** the moon lamp's face */
  moonFace() { const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = mulberry(9608); g.fillStyle = '#f6ecd0'; g.fillRect(0, 0, S, S); for (let i = 0; i < 40; i++) { const x = r() * S, y = r() * S, rr = 8 + r() * 40, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(180,160,120,.4)'); gr.addColorStop(1, 'rgba(180,160,120,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } return c; },
  /** the sign on its easel */
  sign() { const W = 512, H = 700, c = canvas(W, H), g = c.getContext('2d'), r = mulberry(9609); g.fillStyle = '#1e2448'; g.fillRect(0, 0, W, H); g.strokeStyle = '#c9a24e'; g.lineWidth = 8; g.strokeRect(22, 22, W - 44, H - 44); g.lineWidth = 2; g.strokeRect(40, 40, W - 80, H - 80); g.fillStyle = '#d9b25e'; g.font = '600 92px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TAROT', 256, 130); const sun = (cx, cy, R) => { for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, l = k % 2 ? R * 1.5 : R * 1.9; g.beginPath(); g.moveTo(cx + Math.cos(a - 0.14) * R, cy + Math.sin(a - 0.14) * R); g.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.lineTo(cx + Math.cos(a + 0.14) * R, cy + Math.sin(a + 0.14) * R); g.fill(); } g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); }; sun(256, 330, 60); agStar(g, 256, 540, 56, 8, r); g.beginPath(); moonPath(g, 130, 560, 30, 0.42, 0.8); g.fill(); g.beginPath(); moonPath(g, 382, 560, 30, 0.42, 0.8, Math.PI); g.fill(); return c; },
  /** a doormat on the step */
  mat() { const W = 512, H = 256, c = canvas(W, H), g = c.getContext('2d'), r = mulberry(9610); g.fillStyle = '#4a2e6a'; g.fillRect(0, 0, W, H); g.strokeStyle = '#d9b25e'; g.lineWidth = 6; g.strokeRect(16, 16, W - 32, H - 32); g.fillStyle = '#d9b25e'; g.beginPath(); moonPath(g, 256, 128, 52, 0.42, 0.82, Math.PI * 0.1); g.fill(); [[140, 128], [372, 128]].forEach(([x, y]) => agStar(g, x, y, 16, 4, r)); return c; },
  /** a scrap of paper pinned to the wall */
  note(seed) { const W = 200, H = 260, c = canvas(W, H), g = c.getContext('2d'), r = mulberry(seed); g.fillStyle = '#efe2c4'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(90,60,40,.5)'; g.lineWidth = 2; for (let y = 40; y < 230; y += 18) { g.beginPath(); g.moveTo(20, y); for (let x = 20; x < 180; x += 10) g.lineTo(x, y + (r() - 0.5) * 3); g.stroke(); } g.fillStyle = '#8a5a2a'; agStar(g, 150, 50, 16, 5, r); return c; },
};


/* ---------- magic: the gold rune circle under a house that can be entered ---------- */
function magicCircleTex() {
  const c = canvas(1024, 1024), g = c.getContext('2d'), cx = 512;
  g.strokeStyle = '#ffe6a8'; g.fillStyle = '#ffe6a8'; g.lineCap = 'round';
  [500, 470, 330, 300, 120].forEach((r, i) => { g.lineWidth = i % 2 ? 3 : 8; g.beginPath(); g.arc(cx, cx, r, 0, TAU); g.stroke(); });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU - Math.PI / 2, b = ((k + 2) / 6) * TAU - Math.PI / 2; g.lineWidth = 4; g.beginPath(); g.moveTo(cx + Math.cos(a) * 300, cx + Math.sin(a) * 300); g.lineTo(cx + Math.cos(b) * 300, cx + Math.sin(b) * 300); g.stroke(); }
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU, x = cx + Math.cos(a) * 400, y = cx + Math.sin(a) * 400;
    g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.lineWidth = 5;
    g.beginPath();
    const t = k % 4;
    if (t === 0) { g.moveTo(0, -26); g.lineTo(0, 26); g.moveTo(0, -10); g.lineTo(16, -26); g.moveTo(0, 6); g.lineTo(16, -10); }
    else if (t === 1) { g.moveTo(-14, 26); g.lineTo(0, -26); g.lineTo(14, 26); }
    else if (t === 2) { g.arc(0, 0, 16, 0, TAU); g.moveTo(0, -26); g.lineTo(0, 26); }
    else { g.moveTo(-16, -20); g.lineTo(16, 20); g.moveTo(16, -20); g.lineTo(-16, 20); }
    g.stroke(); g.restore();
  }
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.beginPath(); g.arc(cx + Math.cos(a) * 485, cx + Math.sin(a) * 485, 9, 0, TAU); g.fill(); }
  g.beginPath(); starPx(cx, cx, 110, 44, 8).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.lineWidth = 4; g.stroke();
  return c;
}
/** the circle under the Eastern shrine: a key-fret border, the twelve earthly branches, the eight trigrams, taiji at the heart */
function baguaCircleTex() {
  const c = canvas(1024, 1024), g = c.getContext('2d'), cx = 512, col = '#ffe6a8';
  g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'square'; g.lineJoin = 'miter';
  const ring = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(cx, cx, r, 0, TAU); g.stroke(); };
  ring(500, 8); ring(486, 2.5); ring(444, 3); ring(352, 3); ring(340, 1.5); ring(250, 3); ring(150, 3);
  // 回纹: a running key-fret between the two outer rings
  const n = 40;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU; g.save(); g.translate(cx + Math.cos(a) * 465, cx + Math.sin(a) * 465); g.rotate(a + Math.PI / 2); g.lineWidth = 4;
    g.beginPath(); [[-34, 14], [-34, -14], [28, -14], [28, 8], [-22, 8], [-22, -4], [14, -4]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore();
  }
  // 十二地支, upright to anyone walking round the ring, a dot between each; clockwise from 子 in the north
  g.font = '700 58px "Noto Serif SC", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  '子丑寅卯辰巳午未申酉戌亥'.split('').forEach((ch, k) => {
    const a = Math.PI / 2 + (k / 12) * TAU; g.save(); g.translate(cx + Math.cos(a) * 398, cx + Math.sin(a) * 398);   // 子 at the bottom (north), 午 at the top, as the trigrams are laid out south-up g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 2); g.restore();
    const b = a + Math.PI / 12; g.beginPath(); g.arc(cx + Math.cos(b) * 398, cx + Math.sin(b) * 398, 7, 0, TAU); g.fill();
  });
  // 先天八卦: 乾 at the top, then round to the left; the bottom line of each trigram sits innermost
  const TRI = [['乾', [1, 1, 1]], ['兑', [1, 1, 0]], ['离', [1, 0, 1]], ['震', [1, 0, 0]], ['坤', [0, 0, 0]], ['艮', [0, 0, 1]], ['坎', [0, 1, 0]], ['巽', [0, 1, 1]]];
  g.font = '700 38px "Noto Serif SC", serif';
  TRI.forEach(([name, lines], k) => {
    const a = -Math.PI / 2 - (k * Math.PI) / 4;
    lines.forEach((on, j) => { g.save(); const rr = 274 + j * 24; g.translate(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr); g.rotate(a + Math.PI / 2); if (on) g.fillRect(-50, -6, 100, 12); else { g.fillRect(-50, -6, 41, 12); g.fillRect(9, -6, 41, 12); } g.restore(); });
    g.save(); g.translate(cx + Math.cos(a) * 214, cx + Math.sin(a) * 214); g.rotate(a + Math.PI / 2); g.fillText(name, 0, 2); g.restore();
    const b = a - Math.PI / 8; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + Math.cos(b) * 160, cx + Math.sin(b) * 160); g.lineTo(cx + Math.cos(b) * 340, cx + Math.sin(b) * 340); g.stroke();
  });
  // 太极 at the heart
  const R = 112; g.lineWidth = 4; g.beginPath(); g.arc(cx, cx, R, 0, TAU); g.stroke();
  g.save(); g.globalAlpha = 0.45; g.beginPath(); g.arc(cx, cx, R, -Math.PI / 2, Math.PI / 2); g.arc(cx, cx + R / 2, R / 2, Math.PI / 2, -Math.PI / 2, true); g.arc(cx, cx - R / 2, R / 2, Math.PI / 2, -Math.PI / 2, false); g.fill(); g.restore();
  g.beginPath(); g.arc(cx, cx - R / 2, 14, 0, TAU); g.stroke(); g.beginPath(); g.arc(cx, cx + R / 2, 14, 0, TAU); g.fill();
  return c;
}
function cardBackCanvas() { return catTarotBack(300); }
