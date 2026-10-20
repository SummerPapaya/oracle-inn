/* ================= a lived-in room: things gathered over years of travel ================= */
/*
 * Nothing sits in a display case. Pictures crowd the walls in odd frames, plants trail from the
 * beams, an armchair waits by a lamp, and the desk is covered in a map, letters and coins.
 * East and West are simply mixed together, the way a traveller's things end up.
 */

/** a picture in a frame: gold and fussy, an oval, a plain black one or old wood */
function framed(kind, w, h, seed, frame = 'gold') {
  const oval = frame === 'oval';
  const outline = oval ? [ellPx(w / 2, h / 2, w / 2 - 6, h / 2 - 6, 48)] : [rectPx(6, 6, w - 12, h - 12)];
  return die(w, h, seed, outline, (q, g) => {
    const fw = frame === 'black' ? w * 0.06 : w * 0.11, ix = fw, iy = fw, iw = w - 2 * fw, ih = h - 2 * fw;
    const col = { gold: '#c99a45', oval: '#c99a45', black: '#1e1a1c', wood: '#6b4430' }[frame];
    q.wash(rectPx(0, 0, w, h), col, { alpha: 0.75, layers: 6, vary: 0.003, edge: 0 });
    if (frame === 'gold' || oval) {
      for (let k = 0; k < 3; k++) q.ink(oval ? ellPx(w / 2, h / 2, w / 2 - 12 - k * fw * 0.3, h / 2 - 12 - k * fw * 0.3, 48) : rectPx(10 + k * fw * 0.3, 10 + k * fw * 0.3, w - 20 - k * fw * 0.6, h - 20 - k * fw * 0.6), { closed: true, color: k === 1 ? '#f2d78f' : '#7a5a20', w: 2, alpha: 0.8, passes: 1 });
      if (!oval) [[fw / 2, fw / 2], [w - fw / 2, fw / 2], [fw / 2, h - fw / 2], [w - fw / 2, h - fw / 2]].forEach(([x, y]) => { q.flat(circPx(x, y, fw * 0.42), '#e3b45a', 1); q.ink(spiralPx(x, y, fw * 0.32, 1.3), { color: '#7a5a20', w: 1.6, alpha: 0.9, passes: 1 }); });
    }
    g.save(); g.beginPath();
    if (oval) g.ellipse(w / 2, h / 2, iw / 2, ih / 2, 0, 0, TAU); else g.rect(ix, iy, iw, ih);
    g.clip();
    PICTURE[kind](q, g, ix, iy, iw, ih);
    g.restore();
    g.strokeStyle = 'rgba(40,24,12,.6)'; g.lineWidth = 3; g.beginPath(); if (oval) g.ellipse(w / 2, h / 2, iw / 2, ih / 2, 0, 0, TAU); else g.rect(ix, iy, iw, ih); g.stroke();
  });
}
/** a 祥云: rounded lobes in cream with gold outlines, curls inside, a curling tail (drawn straight onto a canvas) */
function xiangyun(g, x, y, s, flip) {
  const lobes = [[0, 0, 22], [30, -12, 28], [62, -4, 22], [86, 6, 15]];
  g.save(); g.translate(x, y); g.scale(flip ? -s : s, s); g.lineCap = 'round';
  g.fillStyle = 'rgba(250,244,230,.96)'; lobes.forEach(([cx, cy, r]) => { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); }); g.fillRect(-14, 0, 112, 16);
  g.strokeStyle = '#c9a045'; g.lineWidth = 2.6;
  lobes.forEach(([cx, cy, r]) => { g.beginPath(); g.arc(cx, cy, r, Math.PI * 1.02, Math.PI * 1.98); g.stroke(); });
  g.beginPath(); g.moveTo(-14, 16); g.lineTo(100, 16); g.stroke();
  [[30, -8, 16], [62, -1, 12]].forEach(([cx, cy, r]) => { g.beginPath(); for (let k = 0; k <= 28; k++) { const t = k / 28, a = t * 1.5 * TAU; g.lineTo(cx + Math.cos(a) * r * t, cy + Math.sin(a) * r * t); } g.stroke(); });
  g.beginPath(); for (let k = 0; k <= 30; k++) { const t = k / 30, a = Math.PI * 0.5 + t * 1.6 * TAU; g.lineTo(-22 + Math.cos(a) * 12 * (1 - t * 0.7), 8 + Math.sin(a) * 12 * (1 - t * 0.7)); } g.stroke();
  g.restore();
}
/** a little 团松 on a rock: a twisting trunk, needles gathered into flat clouds traced in gold */
function cloudPine(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = '#6a7684'; g.beginPath(); [[0, 0], [0, -36], [22, -60], [62, -56], [92, -38], [116, 0]].forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(30,36,46,.6)'; g.lineWidth = 2; g.stroke(); [[30, -50, 44, -20], [70, -48, 80, -14], [16, -30, 22, -6]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
  const trunk = [[54, -54], [74, -110], [52, -160], [70, -210], [104, -246]];
  [[18, '#3a2416'], [13, '#7a5236'], [4, 'rgba(200,150,100,.5)']].forEach(([lw, c], i) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); trunk.forEach(([a, b], k) => { const o = i === 2 ? -3 : 0; k ? g.lineTo(a + o, b) : g.moveTo(a + o, b); }); g.stroke(); });
  [[[62, -150], [26, -172]], [[66, -120], [130, -150]], [[70, -206], [40, -230]]].forEach(([[a, b], [c, d]]) => { [[8, '#3a2416'], [5, '#7a5236']].forEach(([lw, col]) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2, d + 8, c, d); g.stroke(); }); });
  const pad = (cx, cy, pw, ph) => {
    const bumps = Math.max(3, Math.round(pw / 20)), top = [];
    for (let k = 0; k <= bumps * 8; k++) { const t = k / (bumps * 8), a = Math.PI + t * Math.PI, bump = Math.abs(Math.sin(t * bumps * Math.PI)) * ph * 0.22; top.push([cx + Math.cos(a) * (pw / 2 + bump * 0.4), cy + Math.sin(a) * (ph * 0.6 + bump)]); }
    g.fillStyle = '#2c6e66'; g.beginPath(); top.forEach(([a, b], k) => (k ? g.lineTo(a, b) : g.moveTo(a, b))); g.quadraticCurveTo(cx, cy + ph * 0.4, cx - pw / 2, cy); g.fill();
    g.fillStyle = 'rgba(96,166,146,.55)'; g.beginPath(); g.ellipse(cx, cy - ph * 0.22, pw * 0.36, ph * 0.26, 0, Math.PI, TAU); g.fill();
    g.strokeStyle = '#d9a441'; g.lineWidth = 2.4; g.beginPath(); top.forEach(([a, b], k) => (k ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke();
    g.strokeStyle = 'rgba(232,196,110,.8)'; g.lineWidth = 1.3; g.beginPath(); g.ellipse(cx, cy - ph * 0.05, pw * 0.38, ph * 0.38, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.strokeStyle = 'rgba(30,70,60,.7)'; g.lineWidth = 1; for (let k = 0; k < pw / 6; k++) { const t = k / (pw / 6), xx = cx + (t - 0.5) * pw * 0.8; g.beginPath(); g.moveTo(xx, cy + 2); g.lineTo(xx + (t - 0.5) * 8, cy - ph * 0.35); g.stroke(); }
  };
  pad(24, -176, 74, 30); pad(132, -152, 86, 32); pad(40, -232, 60, 26); pad(108, -250, 66, 28);
  g.restore();
}
const PICTURE = {
  moonsea(q, g, x, y, w, h) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#141e48'); gr.addColorStop(0.6, '#2e4a86'); gr.addColorStop(1, '#16244a'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    for (let i = 0; i < 50; i++) q.dot(x + q.rand() * w, y + q.rand() * h * 0.55, 1.6, '#fff3cf', 0.8);
    q.glow(x + w * 0.62, y + h * 0.3, w * 0.4, '#fff0c4', 0.4); q.wash(circPx(x + w * 0.62, y + h * 0.3, w * 0.14), '#fff4da', { alpha: 0.5, layers: 10, edge: 0 });
    q.wash(rectPx(x, y + h * 0.66, w, h * 0.34), '#1a2c58', { alpha: 0.6, layers: 6, edge: 0 });
    for (let i = 0; i < 24; i++) { const yy = y + h * (0.68 + q.rand() * 0.3), sp = w * 0.04 + (yy - y - h * 0.66) * 0.5; q.ink([[x + w * 0.62 - sp * q.rand(), yy], [x + w * 0.62 + sp * q.rand(), yy]], { color: '#fff0c4', w: 1.6, alpha: 0.6, passes: 1 }); }
  },
  crane(q, g, x, y, w, h) {
    g.fillStyle = '#efe3c6'; g.fillRect(x, y, w, h);
    q.wash(circPx(x + w * 0.7, y + h * 0.28, w * 0.13), '#c8372d', { alpha: 0.6, layers: 8, edge: 0 });
    // auspicious clouds: across the foot of the sun, up on the left, drifting low on the right
    xiangyun(g, x + w * 0.56, y + h * 0.36, w * 0.0021, false); xiangyun(g, x + w * 0.1, y + h * 0.2, w * 0.0016, true); xiangyun(g, x + w * 0.62, y + h * 0.68, w * 0.0014, false);
    for (let k = 0; k < 5; k++) q.ink(arcPx(x + w * (0.1 + k * 0.2), y + h * 0.92, w * 0.12, Math.PI, TAU, 10), { color: '#2a4a6a', w: 3, alpha: 0.8, passes: 1 });
    // a cloud pine on a rock in the lower left, leaning out over the waves
    cloudPine(g, x + w * 0.0, y + h * 0.97, w * 0.0019);
    const cx = x + w * 0.42, cy = y + h * 0.5;
    q.flat(ellPx(cx, cy, w * 0.14, h * 0.035), '#ffffff', 1); q.flat([[cx - w * 0.05, cy], [cx - w * 0.3, cy - h * 0.18], [cx + w * 0.02, cy - h * 0.02]], '#ffffff', 1); q.flat([[cx + w * 0.02, cy], [cx + w * 0.2, cy - h * 0.2], [cx + w * 0.08, cy + h * 0.01]], '#ffffff', 1);
    q.flat([[cx - w * 0.3, cy - h * 0.18], [cx - w * 0.22, cy - h * 0.12], [cx - w * 0.18, cy - h * 0.13]], '#1e1a1c', 1); q.dot(cx + w * 0.17, cy - h * 0.012, w * 0.012, '#c8372d');
    q.ink([[cx + w * 0.12, cy], [cx + w * 0.2, cy - h * 0.01]], { color: '#1e1a1c', w: 2, alpha: 0.9, passes: 1 });
    q.flat(rectPx(x + w * 0.08, y + h * 0.08, w * 0.08, w * 0.08), '#c8372d', 0.9);
  },
  cat(q, g, x, y, w, h) {
    g.fillStyle = '#2f4a3a'; g.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h * 0.62;
    q.flat(ellPx(cx, cy + h * 0.25, w * 0.4, h * 0.3), '#1e1a24', 1); q.flat(circPx(cx, cy, w * 0.24), '#1e1a24', 1);
    q.flat([[cx - w * 0.2, cy - h * 0.08], [cx - w * 0.16, cy - h * 0.26], [cx - w * 0.04, cy - h * 0.14]], '#1e1a24', 1); q.flat([[cx + w * 0.2, cy - h * 0.08], [cx + w * 0.16, cy - h * 0.26], [cx + w * 0.04, cy - h * 0.14]], '#1e1a24', 1);
    q.flat([[cx - w * 0.16, cy - h * 0.2], [cx, cy - h * 0.5], [cx + w * 0.16, cy - h * 0.2]], '#5a3a7a', 1); q.flat(ellPx(cx, cy - h * 0.2, w * 0.24, h * 0.03), '#5a3a7a', 1); q.sparkle(cx + w * 0.02, cy - h * 0.34, w * 0.05, '#e3b45a', 1);
    [[-0.09], [0.09]].forEach(([dx]) => { q.flat(ellPx(cx + w * dx, cy, w * 0.05, w * 0.035), '#ffe08a', 1); q.flat(ellPx(cx + w * dx, cy, w * 0.015, w * 0.03), '#1e1a24', 1); });
    q.flat(ellPx(cx, cy + h * 0.17, w * 0.2, h * 0.04), '#f3ead6', 1);
  },
  ship(q, g, x, y, w, h) {
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#e8c9a0'); gr.addColorStop(1, '#a8b8c8'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    q.wash(rectPx(x, y + h * 0.7, w, h * 0.3), '#4a6a8a', { alpha: 0.6, layers: 6, edge: 0 });
    const cx = x + w * 0.5, cy = y + h * 0.7;
    q.flat([[cx - w * 0.3, cy], [cx + w * 0.3, cy], [cx + w * 0.22, cy + h * 0.1], [cx - w * 0.24, cy + h * 0.1]], '#5a3a26', 1);
    [-0.12, 0.06].forEach((dx, i) => { q.flat(rectPx(cx + w * dx, cy - h * 0.5, 3, h * 0.5), '#3b2418', 1); q.flat([[cx + w * dx + 3, cy - h * (0.48 - i * 0.05)], [cx + w * dx + w * 0.16, cy - h * 0.12], [cx + w * dx + 3, cy - h * 0.1]], '#f6efe2', 1); });
    for (let k = 0; k < 6; k++) q.ink(arcPx(x + w * (0.1 + k * 0.16), y + h * 0.82, w * 0.06, Math.PI, TAU, 8), { color: '#e8eef2', w: 2, alpha: 0.7, passes: 1 });
  },
  botanical(q, g, x, y, w, h) {
    g.fillStyle = '#f0e6cc'; g.fillRect(x, y, w, h);
    const cx = x + w / 2; q.ink([[cx, y + h * 0.9], [cx, y + h * 0.12]], { color: '#4f6a3a', w: 2.4, alpha: 0.9, passes: 1 });
    for (let k = 0; k < 9; k++) { const yy = y + h * (0.18 + k * 0.08), s = k % 2 ? 1 : -1, len = w * (0.32 - k * 0.02); q.wash([[cx, yy], [cx + s * len * 0.5, yy - h * 0.03], [cx + s * len, yy + h * 0.01], [cx + s * len * 0.5, yy + h * 0.03]], '#6a8a4a', { alpha: 0.6, layers: 4, edge: 0.4 }); }
    g.fillStyle = '#4a3528'; g.font = `italic 600 ${Math.round(w * 0.08)}px "Cormorant Garamond", serif`; g.textAlign = 'center'; g.fillText('Filix lunaris', cx, y + h * 0.97);
  },
  stars(q, g, x, y, w, h) {
    g.fillStyle = '#18204a'; g.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2;
    [0.45, 0.32, 0.18].forEach((r) => q.ink(circPx(cx, cy, Math.min(w, h) * r, 40), { closed: true, color: '#c99a45', w: 1.2, alpha: 0.6, passes: 1 }));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; q.ink([[cx, cy], [cx + Math.cos(a) * w * 0.45, cy + Math.sin(a) * w * 0.45]], { color: '#c99a45', w: 0.8, alpha: 0.35, passes: 1 }); }
    const pts = Array.from({ length: 7 }, () => [x + w * (0.15 + q.rand() * 0.7), y + h * (0.15 + q.rand() * 0.7)]);
    q.ink(pts, { color: '#f2d78f', w: 1.6, alpha: 0.8, passes: 1 }); pts.forEach(([a, b]) => q.sparkle(a, b, w * 0.035, '#fff3cf', 1));
  },
  tarotStar(q, g, x, y, w, h) { g.drawImage(cardFace(17, 300), x, y, w, h); },
  mirror(q, g, x, y, w, h) {
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#5a6278'); gr.addColorStop(0.5, '#9aa4b8'); gr.addColorStop(1, '#4a5064'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    q.glow(x + w * 0.3, y + h * 0.7, w * 0.4, '#ffd08a', 0.4);
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(x + w * 0.15, y); g.lineTo(x + w * 0.35, y); g.lineTo(x + w * 0.05, y + h); g.lineTo(x - w * 0.15, y + h); g.fill(); g.globalCompositeOperation = 'source-over';
  },
  print(q, g, x, y, w, h) {
    g.fillStyle = '#efe6d0'; g.fillRect(x, y, w, h);
    g.fillStyle = '#2a1a10'; g.textAlign = 'center';
    g.font = `italic 600 ${Math.round(w * 0.16)}px "Cormorant Garamond", serif`; g.fillText('Oracle Inn', x + w / 2, y + h * 0.22);
    g.font = `500 ${Math.round(w * 0.075)}px "Noto Serif SC", serif`; g.fillText('借 问 众 神 明', x + w / 2, y + h * 0.32);
    q.flat(starPx(x + w / 2, y + h * 0.55, w * 0.16, w * 0.06, 8), '#2a1a10', 0.9);
    g.font = `italic 500 ${Math.round(w * 0.08)}px "Cormorant Garamond", serif`; g.fillText('fortune favours', x + w / 2, y + h * 0.8); g.fillText('the curious', x + w / 2, y + h * 0.88);
  },
};
/* ---------- furniture and plants ---------- */
function armchair(seed) {
  const w = 760, h = 820;
  const back = [[150, 520], [130, 160], [200, 60], [380, 30], [560, 60], [630, 160], [610, 520]];
  const armL = [[60, 640], [60, 420], [110, 360], [190, 380], [200, 640]], armR = [[700, 640], [700, 420], [650, 360], [570, 380], [560, 640]];
  const seat = [[180, 600], [580, 600], [600, 700], [160, 700]], legs = [rectPx(110, 700, 30, 110), rectPx(620, 700, 30, 110)];
  return die(w, h, seed, [back, armL, armR, seat, ...legs], (q) => {
    q.wash(back, '#8a1f2a', { alpha: 0.7, layers: 8, vary: 0.004 });
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const x = 240 + k * 95 + (r % 2) * 47, y = 140 + r * 90; q.dot(x, y, 6, '#4a0f16', 0.9); q.ink([[x, y], [x + 47, y + 45]], { color: '#5a1018', w: 1.2, alpha: 0.5, passes: 1 }); }
    [armL, armR].forEach((s) => { q.wash(s, '#7a1a24', { alpha: 0.75, layers: 8 }); q.ink(s, { closed: true, color: '#3a0a10', w: 2, alpha: 0.6 }); });
    q.wash(seat, '#9a2a34', { alpha: 0.75, layers: 6 });
    legs.forEach((s) => q.flat(s, '#2a1a12', 1));
    q.wash([[260, 600], [260, 450], [420, 430], [440, 600]], '#d9a441', { alpha: 0.6, layers: 6 }); for (let k = 0; k < 5; k++) q.ink([[270 + k * 34, 460], [280 + k * 34, 590]], { color: '#8a5a20', w: 1.4, alpha: 0.6, passes: 1 });
    q.wash([[430, 600], [470, 380], [600, 400], [640, 700], [560, 720]], '#5a6a8a', { alpha: 0.55, layers: 6 }); for (let k = 0; k < 4; k++) q.ink([[470 + k * 30, 420], [500 + k * 30, 700]], { color: '#e8d4b0', w: 2, alpha: 0.5, passes: 1 });
    q.ink(arcPx(380, 330, 250, Math.PI * 1.15, Math.PI * 1.85, 16), { color: '#e3a0a8', w: 3, alpha: 0.4, passes: 1 });
  });
}
function monstera(seed) {
  const w = 760, h = 1100, pot = [[240, 1100], [520, 1100], [560, 860], [200, 860]], leaves = [], rand = mulberry(seed);
  for (let k = 0; k < 9; k++) { const a = -2.6 + k * 0.6 + (rand() - 0.5) * 0.2, L = 300 + rand() * 180, cx = 380 + Math.cos(a) * L * 0.75, cy = 840 + Math.sin(a) * L * 0.95; leaves.push({ cx, cy, r: 110 + rand() * 50, a }); }
  return die(w, h, seed, [pot, ...leaves.map((l) => ellPx(l.cx, l.cy, l.r, l.r * 0.8, 24))], (q) => {
    leaves.forEach((l) => q.ink([[380, 860], [l.cx, l.cy]], { color: '#2f5a35', w: 4, alpha: 0.9, passes: 1 }));
    leaves.forEach((l) => { q.wash(ellPx(l.cx, l.cy, l.r, l.r * 0.8, 24), '#2f6a3e', { alpha: 0.6, layers: 6, edge: 0.4 }); q.wash(ellPx(l.cx - l.r * 0.2, l.cy - l.r * 0.2, l.r * 0.5, l.r * 0.35, 16), '#5a9a5a', { alpha: 0.3, layers: 4, edge: 0 }); for (let k = 0; k < 4; k++) { const b = l.a + Math.PI + (k - 1.5) * 0.5; q.g.save(); q.g.globalCompositeOperation = 'destination-out'; q.g.lineWidth = 9; q.g.beginPath(); q.g.moveTo(l.cx + Math.cos(b) * l.r * 0.3, l.cy + Math.sin(b) * l.r * 0.25); q.g.lineTo(l.cx + Math.cos(b) * l.r * 1.1, l.cy + Math.sin(b) * l.r * 0.9); q.g.stroke(); q.g.restore(); } q.ink([[l.cx - Math.cos(l.a) * l.r * 0.9, l.cy - Math.sin(l.a) * l.r * 0.7], [l.cx + Math.cos(l.a) * l.r * 0.9, l.cy + Math.sin(l.a) * l.r * 0.7]], { color: '#1e3a22', w: 1.6, alpha: 0.6, passes: 1 }); });
    q.wash(pot, '#b8835a', { alpha: 0.7, layers: 6 }); for (let y = 880; y < 1100; y += 22) q.ink([[205 + (y - 860) * 0.18, y], [555 - (y - 860) * 0.18, y]], { color: '#7a5030', w: 2, alpha: 0.5, passes: 1 });
  });
}
function palm(seed) {
  const w = 700, h = 1300, pot = [[240, 1300], [460, 1300], [500, 1080], [200, 1080]], fronds = [], rand = mulberry(seed);
  for (let k = 0; k < 8; k++) { const a = -Math.PI / 2 + (k - 3.5) * 0.32 + (rand() - 0.5) * 0.1, L = 520 + rand() * 260; fronds.push({ a, L }); }
  const shape = [pot];
  fronds.forEach(({ a, L }) => { for (let t = 0.25; t < 1; t += 0.08) { const x = 350 + Math.cos(a) * L * t + Math.cos(a) * 0, y = 1080 + Math.sin(a) * L * t + t * t * 180; shape.push(ellPx(x, y, 70 * (1 - t * 0.7), 22, 10)); } });
  return die(w, h, seed, shape, (q) => {
    fronds.forEach(({ a, L }) => { const pts = []; for (let t = 0; t <= 1; t += 0.1) pts.push([350 + Math.cos(a) * L * t, 1080 + Math.sin(a) * L * t + t * t * 180]); q.ink(pts, { color: '#3a5a2a', w: 3, alpha: 0.9, passes: 1 }); });
    shape.slice(1).forEach((s) => q.wash(s, q.rand() < 0.5 ? '#3f7a44' : '#5a9a50', { alpha: 0.55, layers: 4, edge: 0.3 }));
    q.wash(pot, '#c9a46a', { alpha: 0.7, layers: 6 }); for (let y = 1100; y < 1300; y += 24) for (let x = 210; x < 490; x += 30) q.ink([[x, y], [x + 14, y + 12]], { color: '#8a6a3a', w: 2, alpha: 0.5, passes: 1 });
  });
}
/* ---------- the desk: a map under the book, letters, coins, an open box of cards ---------- */
function fineWood() {
  return sheet(1024, 768, 953, (q) => {
    q.wash(rectPx(-6, -6, 1036, 780), '#5a3420', { alpha: 0.75, layers: 6, vary: 0.003, edge: 0 });
    for (let i = 0; i < 160; i++) { const y = q.rand() * 768, len = 200 + q.rand() * 600, x = q.rand() * 1024; q.ink([[x, y], [x + len, y + (q.rand() - 0.5) * 8]], { color: q.rand() < 0.5 ? '#3a2014' : '#7a4a2a', w: 0.8, alpha: 0.35, passes: 1 }); }
    for (let k = 0; k < 3; k++) q.ink(arcPx(300 + k * 300, 380, 60 + k * 10, 0, TAU, 30), { color: '#3a2014', w: 0.8, alpha: 0.2, passes: 1 });
    q.ink(rectPx(28, 28, 968, 712), { closed: true, color: '#c9a060', w: 6, alpha: 0.7, passes: 1 });
    q.ink(rectPx(40, 40, 944, 688), { closed: true, color: '#d9a441', w: 1.6, alpha: 0.6, passes: 1 });
  });
}
function envelope(seed, tilt = 0) {
  const w = 320, h = 220;
  return die(w, h, seed, [rectPx(10, 10, 300, 200)], (q, g) => {
    q.wash(rectPx(0, 0, w, h), '#efe2c4', { alpha: 0.8, layers: 4, edge: 0 });
    q.ink([[10, 10], [160, 120], [310, 10]], { color: '#a8906a', w: 1.6, alpha: 0.7, passes: 1 });
    q.flat(circPx(160, 120, 26), '#a8222a', 1); q.flat(starPx(160, 120, 14, 5, 6), '#6a1218', 1);
    g.fillStyle = '#4a3528'; g.font = 'italic 500 24px "Cormorant Garamond", serif'; g.textAlign = 'left'; g.fillText(tilt ? 'to the Oracle Inn' : 'from far away', 40, 182);
  });
}
