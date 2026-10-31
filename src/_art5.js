/* ================= surfaces for the 3D hut ================= */
/*
 * Plain canvas textures, drawn soft and simple so the shapes read the way stylised 3D games do:
 * bricks, star-and-moon decals on painted wood, wallpaper, a pierced Moroccan pattern, a rug.
 */
function noisy(g, w, h, amt, seed) {
  const img = g.getImageData(0, 0, w, h), d = img.data, r = mulberry(seed);
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
function tx(c, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
  return t;
}
function grainCanvas(base, dark, seed, w = 512, h = 512, planks = 0) {
  const c = canvas(w, h), g = c.getContext('2d'), r = mulberry(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const rows = planks || 1, ph = h / rows;
  for (let p = 0; p < rows; p++) {
    const t = (r() - 0.5) * 0.16; g.fillStyle = t > 0 ? `rgba(255,230,200,${t})` : `rgba(0,0,0,${-t})`; g.fillRect(0, p * ph, w, ph);
    for (let i = 0; i < ph * 0.5; i++) { const y = p * ph + r() * ph; g.strokeStyle = dark; g.globalAlpha = 0.06 + r() * 0.12; g.lineWidth = 0.6 + r() * 1.4; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.012 + i) * 1.6); g.stroke(); }
    g.globalAlpha = 1;
    if (planks) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, p * ph, w, 2); let x = r() * 200; while (x < w) { g.fillRect(x, p * ph, 2, ph); x += 180 + r() * 260; } }
  }
  noisy(g, w, h, 10, seed + 1);
  return c;
}
function brickCanvas() {
  const w = 512, h = 512, c = canvas(w, h), g = c.getContext('2d'), r = mulberry(1201);
  g.fillStyle = '#5a3a2e'; g.fillRect(0, 0, w, h);
  const bh = 32, bw = 96;
  for (let y = 0; y < h; y += bh) for (let x = ((y / bh) % 2) * -48; x < w; x += bw) {
    const k = r(); g.fillStyle = `rgb(${150 + k * 50},${80 + k * 30},${60 + k * 20})`;
    g.beginPath(); g.roundRect(x + 3, y + 3, bw - 6, bh - 6, 4); g.fill();
    g.fillStyle = 'rgba(255,220,180,.12)'; g.fillRect(x + 4, y + 4, bw - 8, 4);
  }
  noisy(g, w, h, 18, 1202);
  return c;
}
function decalCanvas(base, ink, seed) {
  const w = 512, h = 512, c = canvas(w, h), g = c.getContext('2d'), r = mulberry(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h); noisy(g, w, h, 8, seed);
  g.fillStyle = ink; g.globalAlpha = 0.55;
  for (let i = 0; i < 14; i++) {
    const x = r() * w, y = r() * h, s = 10 + r() * 16;
    if (r() < 0.5) { g.beginPath(); starPx(x, y, s, s * 0.42, 5).forEach(([a, b], k) => (k ? g.lineTo(a, b) : g.moveTo(a, b))); g.fill(); }
    else { g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x + s * 0.45, y - s * 0.2, s * 0.9, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; g.fillStyle = base; g.globalAlpha = 1; g.beginPath(); g.arc(x + s * 0.45, y - s * 0.2, s * 0.9, 0, TAU); g.fill(); g.fillStyle = ink; g.globalAlpha = 0.55; }
  }
  for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(r() * w, r() * h, 1.6 + r() * 2, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  return c;
}
function wallpaperCanvas(glow = false) {
  const w = 512, h = 512, c = canvas(w, h), g = c.getContext('2d');
  const stars = () => { for (let y = 32; y < h; y += 128) for (let x = 0; x < w; x += 128) { g.beginPath(); starPx(x + (y % 256 > 100 ? 64 : 0), y, 9, 3.5, 4, 0).forEach(([a, b], k) => (k ? g.lineTo(a, b) : g.moveTo(a, b))); g.fill(); } };
  if (glow) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 10; stars(); g.shadowBlur = 0; return c; }
  g.fillStyle = '#3a2648'; g.fillRect(0, 0, w, h); noisy(g, w, h, 8, 1203);
  g.strokeStyle = '#5a3e6a'; g.lineWidth = 3;
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(k * 128 + 64, 0); for (let y = 0; y <= h; y += 16) g.lineTo(k * 128 + 64 + Math.sin(y / 40) * 18, y); g.stroke(); }
  g.fillStyle = '#c9a45a'; g.globalAlpha = 0.7; stars();
  const r = mulberry(1204); g.globalAlpha = 0.35; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(r() * w, r() * h, 1.4, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  return c;
}
/** a Moroccan pattern: dark metal, pierced, the holes glowing (used as an emissive map) */
function piercedCanvas(glow) {
  const w = 512, h = 256, c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = glow;
  for (let y = 0; y < h; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < w + 32; x += 64) {
    g.beginPath(); g.moveTo(x, y + 4); g.quadraticCurveTo(x + 22, y + 22, x, y + 52); g.quadraticCurveTo(x - 22, y + 22, x, y + 4); g.fill();
    g.beginPath(); g.arc(x + 32, y + 32, 5, 0, TAU); g.fill();
  }
  return c;
}
function sunMoonRug() {
  const s = 1024, c = canvas(s, s), g = c.getContext('2d'), cx = s / 2;
  g.fillStyle = '#2a2350'; g.beginPath(); g.arc(cx, cx, 510, 0, TAU); g.fill();
  noisy(g, s, s, 10, 1205);
  g.strokeStyle = '#e8c88a'; g.lineWidth = 8; g.beginPath(); g.arc(cx, cx, 490, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(cx, cx, 460, 0, TAU); g.stroke();
  g.fillStyle = '#4a3a78'; g.beginPath(); g.arc(cx, cx, 330, 0, TAU); g.fill();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU, x = cx + Math.cos(a) * 395, y = cx + Math.sin(a) * 395;
    g.fillStyle = '#f2e2b8'; g.beginPath(); g.arc(x, y, 42, 0, TAU); g.fill();
    g.fillStyle = '#2a2350'; g.beginPath(); g.arc(x + Math.cos(a + k) * 40 * (k % 4 === 0 ? 0 : 1), y, 42 * (k % 4 === 0 ? 0 : 0.9), 0, TAU); g.fill();
  }
  g.fillStyle = '#e8b44a';
  g.beginPath(); starPx(cx, cx, 300, 70, 16).forEach(([a, b], k) => (k ? g.lineTo(a, b) : g.moveTo(a, b))); g.fill();
  g.fillStyle = '#f6d88a'; g.beginPath(); g.arc(cx, cx, 120, 0, TAU); g.fill();
  g.strokeStyle = '#c98a3a'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cx, 120, 0, TAU); g.stroke();
  return c;
}
function bannerCanvas() {
  const w = 512, h = 800, c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#1e2c5a'; g.fillRect(0, 0, w, h); noisy(g, w, h, 10, 1207);
  g.strokeStyle = '#d9a441'; g.lineWidth = 10; g.strokeRect(24, 24, w - 48, h - 120);
  g.fillStyle = '#d9a441';
  g.beginPath(); g.arc(256, 340, 110, 0, TAU); g.fill(); g.fillStyle = '#1e2c5a'; g.beginPath(); g.arc(300, 310, 100, 0, TAU); g.fill();
  g.fillStyle = '#d9a441'; for (let k = 0; k < 3; k++) { g.beginPath(); starPx(160 + k * 96, 560, 22, 9, 5).forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.fill(); }
  g.strokeStyle = '#d9a441'; g.lineWidth = 6;
  for (const s of [-1, 1]) { g.beginPath(); for (let t = 0; t <= 1; t += 0.05) { const a = Math.PI * (0.65 + t * 0.7); g.lineTo(256 + s * Math.cos(a) * -170, 340 + Math.sin(a) * 170); } g.stroke(); for (let t = 0.1; t < 1; t += 0.15) { const a = Math.PI * (0.65 + t * 0.7), x = 256 + s * Math.cos(a) * -170, y = 340 + Math.sin(a) * 170; g.beginPath(); g.ellipse(x, y, 16, 7, a, 0, TAU); g.fill(); } }
  g.font = 'italic 600 54px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.fillText('Oracle Inn', 256, 650);
  return c;
}
function crystalArt(seed) {
  const w = 300, h = 380, c = canvas(w, h), g = c.getContext('2d'), r = mulberry(seed);
  g.fillStyle = '#1e1a2c'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 4; k++) { const x = 80 + k * 46 + r() * 10, hh = 120 + r() * 120, cw = 26 + r() * 16, col = ['#b48ae0', '#7de0d0', '#e98aa0', '#8fb6ff'][k];
    g.fillStyle = col; g.beginPath(); g.moveTo(x - cw, 300); g.lineTo(x - cw, 300 - hh * 0.7); g.lineTo(x, 300 - hh); g.lineTo(x + cw, 300 - hh * 0.7); g.lineTo(x + cw, 300); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x, 300 - hh); g.lineTo(x + cw, 300 - hh * 0.7); g.lineTo(x + cw, 300); g.lineTo(x, 300); g.fill(); }
  g.fillStyle = '#d9a441'; for (let i = 0; i < 20; i++) { g.beginPath(); g.arc(r() * w, r() * 200, 1.6, 0, TAU); g.fill(); }
  return c;
}
function recordCanvas() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#141216'; g.beginPath(); g.arc(128, 128, 127, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.08)'; for (let r = 40; r < 124; r += 4) { g.beginPath(); g.arc(128, 128, r, 0, TAU); g.stroke(); }
  g.fillStyle = '#c8372d'; g.beginPath(); g.arc(128, 128, 36, 0, TAU); g.fill(); g.fillStyle = '#f2d78f'; g.beginPath(); g.arc(128, 128, 5, 0, TAU); g.fill();
  return c;
}
function starGlobeCanvas() {
  const w = 1024, h = 512, c = canvas(w, h), g = c.getContext('2d'), r = mulberry(1209);
  g.fillStyle = '#1b2456'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f2d78f'; for (let i = 0; i < 300; i++) { g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 2.2, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(242,215,143,.6)'; g.lineWidth = 2;
  for (let k = 0; k < 10; k++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 120; y += (r() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); }
  g.strokeStyle = 'rgba(242,215,143,.3)'; for (let y = 64; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  return c;
}
/** button-tufted velvet: one diamond of the lattice, buttons at the corners and the centre */
function tuftCanvas(bump = false) {
  const c = canvas(256, 256), g = c.getContext('2d'), r = mulberry(5160);
  g.fillStyle = bump ? '#808080' : '#5e1628'; g.fillRect(0, 0, 256, 256);
  [[128, 40], [216, 128], [128, 216], [40, 128], [0, 0], [256, 0], [0, 256], [256, 256]].forEach(([x, y]) => { const gr = g.createRadialGradient(x, y, 0, x, y, 92); gr.addColorStop(0, bump ? 'rgba(255,255,255,.9)' : 'rgba(170,64,92,.75)'); gr.addColorStop(1, bump ? 'rgba(255,255,255,0)' : 'rgba(170,64,92,0)'); g.fillStyle = gr; g.fillRect(x - 92, y - 92, 184, 184); });
  if (!bump) for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,180,200' : '30,0,10'},${0.04 + r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
  g.lineCap = 'round';
  [[0, 0], [256, 0], [0, 256], [256, 256]].forEach(([x, y]) => { [[10, bump ? '#202020' : 'rgba(40,6,16,.55)'], [3, bump ? '#000' : 'rgba(30,4,12,.9)']].forEach(([w, col]) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(128, 128); g.lineTo(x, y); g.stroke(); }); });
  [[128, 128], [0, 0], [256, 0], [0, 256], [256, 256]].forEach(([x, y]) => { g.fillStyle = bump ? '#000' : '#3a0a18'; g.beginPath(); g.arc(x, y, 12, 0, TAU); g.fill(); });
  return c;
}
/** a wool tartan throw: deep green and plum, with gold and cream overchecks */
function tartanCanvas() {
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#23402e'; g.fillRect(0, 0, 256, 256);
  const bands = [[0, 70, 'rgba(90,30,60,.75)'], [96, 30, 'rgba(20,30,60,.6)'], [150, 70, 'rgba(90,30,60,.75)'], [124, 6, 'rgba(230,190,90,.9)'], [40, 4, 'rgba(240,230,210,.8)'], [200, 4, 'rgba(240,230,210,.8)']];
  bands.forEach(([p, w, col]) => { g.fillStyle = col; g.fillRect(p, 0, w, 256); g.globalAlpha = 0.6; g.fillRect(0, p, 256, w); g.globalAlpha = 1; });
  g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1; for (let k = 0; k < 256; k += 3) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); }
  return c;
}
/** a mantel clock's face: Roman hours, a gilt centre, hands at ten past ten */
function clockFaceCanvas() {
  const c = canvas(256, 256), g = c.getContext('2d'), cx = 128;
  g.fillStyle = '#e2d2ac'; g.beginPath(); g.arc(cx, cx, 126, 0, TAU); g.fill();
  g.strokeStyle = '#3b2418'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cx, 104, 0, TAU); g.stroke(); g.beginPath(); g.arc(cx, cx, 84, 0, TAU); g.stroke();
  g.fillStyle = '#3b2418'; g.font = '600 22px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, k) => { const a = (k / 12) * TAU - Math.PI / 2; g.save(); g.translate(cx + Math.cos(a) * 94, cx + Math.sin(a) * 94); g.rotate(a + Math.PI / 2); g.fillText(n, 0, 0); g.restore(); });
  for (let k = 0; k < 60; k++) { const a = (k / 60) * TAU; g.lineWidth = k % 5 ? 1 : 2.5; g.beginPath(); g.moveTo(cx + Math.cos(a) * 112, cx + Math.sin(a) * 112); g.lineTo(cx + Math.cos(a) * 120, cx + Math.sin(a) * 120); g.stroke(); }
  [[-Math.PI / 2 - (2 * TAU) / 12, 52, 6], [-Math.PI / 2 + (2 * TAU) / 12, 72, 4]].forEach(([a, l, w]) => { g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cx); g.lineTo(cx + Math.cos(a) * l, cx + Math.sin(a) * l); g.stroke(); });
  g.fillStyle = '#c99a45'; g.beginPath(); g.arc(cx, cx, 9, 0, TAU); g.fill();
  return c;
}
/**
 * The 人生海海 neon sign on the hut's back wall, a fan's tribute to Mayday (五月天)'s album 人生海海 (not affiliated;
 * the rights stay with their owners): PEOPLE LIFE, OCEAN WILD in white neon above, a blue road-sign lightbox with a
 * white arrow (no wordmark on it), 人生海海 in white brush neon below. lit 0 = switched off, 1 = lit. The lettering
 * uses each device's heavy sans and the page's Long Cang, so nothing extra is shipped.
 */
function neonSignCanvas(lit = 1, W = 1380, H = 1080) {
  const c = canvas(W, H), g = c.getContext('2d');
  const SANS = "'Futura', 'Avenir Next', 'Century Gothic', 'Trebuchet MS', 'Arial', sans-serif";
  const neonText = (txt, x, y, font, spacing, thick, fit) => {           // glows then a white core; cold, pale glass
    g.save(); g.font = font; if ('letterSpacing' in g) g.letterSpacing = spacing + 'px';
    const sx = fit / (g.measureText(txt).width + thick - spacing);         // as wide as the blue sign, whatever the device's font
    g.translate(x, y); g.scale(sx, 1); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (lit > 0) {
      for (const [blur, w, a] of [[44, 14, 0.32], [20, 8, 0.6], [7, 5, 0.95]]) { g.shadowColor = '#cfe8ff'; g.shadowBlur = blur; g.strokeStyle = '#e9f5ff'; g.globalAlpha = a * lit; g.lineWidth = w + thick; g.strokeText(txt, 0, 0); }
      g.shadowBlur = 0; g.globalAlpha = 1; g.fillStyle = g.strokeStyle = '#ffffff';
      if (thick) { g.lineWidth = thick; g.strokeText(txt, 0, 0); }
      g.fillText(txt, 0, 0);
    } else {
      g.fillStyle = g.strokeStyle = 'rgba(120,128,140,.55)'; if (thick) { g.lineWidth = thick; g.strokeText(txt, 0, 0); } g.fillText(txt, 0, 0);
    }
    g.restore();
  };
  const bw = 1200, bh = 480, bx = (W - bw) / 2, by = 205, r = 32;
  neonText('PEOPLE LIFE, OCEAN WILD', W / 2, 118, `700 90px ${SANS}`, 4, 0, bw);
  const rr = (x, y, w, h, rad) => { g.beginPath(); g.moveTo(x + rad, y); g.arcTo(x + w, y, x + w, y + h, rad); g.arcTo(x + w, y + h, x, y + h, rad); g.arcTo(x, y + h, x, y, rad); g.arcTo(x, y, x + w, y, rad); g.closePath(); };
  g.save(); if (lit > 0) { g.shadowColor = 'rgba(70,170,255,.85)'; g.shadowBlur = 70; }
  rr(bx, by, bw, bh, r); g.fillStyle = lit > 0 ? '#2f8fd6' : '#1c3550'; g.fill(); g.restore();
  // the face, weathered like an old painted sign: soft clouds of wear (radial gradients, so no canvas filter is needed) and fine scratches
  g.save(); rr(bx + 20, by + 20, bw - 40, bh - 40, r * 0.7); g.clip();
  const face = g.createLinearGradient(0, by, 0, by + bh); face.addColorStop(0, lit > 0 ? '#48b2f2' : '#203c58'); face.addColorStop(1, lit > 0 ? '#2b86d0' : '#162d45');
  g.fillStyle = face; g.fillRect(bx, by, bw, bh);
  const rnd = mulberry(1977);
  for (let i = 0; i < 90; i++) {
    const x = bx + rnd() * bw, y = by + rnd() * bh, s = 40 + rnd() * 140, dark = rnd() < 0.55, a = 0.03 + rnd() * 0.05;
    const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(${dark ? '10,40,80' : '210,238,255'},${a})`); gr.addColorStop(1, `rgba(${dark ? '10,40,80' : '210,238,255'},0)`);
    g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1, 0.3 + rnd() * 0.35); g.translate(-x, -y); g.fillRect(x - s, y - s, 2 * s, 2 * s); g.restore();
  }
  for (let i = 0; i < 110; i++) { const x = bx + rnd() * bw, y = by + rnd() * bh, l = 20 + rnd() * 120, a = (rnd() - 0.5) * 0.3; g.strokeStyle = `rgba(230,245,255,${0.03 + rnd() * 0.06})`; g.lineWidth = 1 + rnd() * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.restore();
  g.save(); rr(bx + 16, by + 16, bw - 32, bh - 32, r * 0.75); g.lineWidth = 12; g.strokeStyle = lit > 0 ? '#f4fbff' : '#7d8a98';
  if (lit > 0) { g.shadowColor = '#d8eeff'; g.shadowBlur = 18; } g.stroke(); g.restore();
  // the white arrow, about 1100 wide: a stout shaft and a broad head
  const ax0 = bx + 50, atip = bx + bw - 50, ax1 = atip - 235, acy = by + bh / 2, sh = 210, hh = 200;
  g.save(); g.beginPath(); g.moveTo(ax0, acy - sh / 2); g.lineTo(ax1, acy - sh / 2); g.lineTo(ax1, acy - hh); g.lineTo(atip, acy); g.lineTo(ax1, acy + hh); g.lineTo(ax1, acy + sh / 2); g.lineTo(ax0, acy + sh / 2); g.closePath();
  if (lit > 0) { g.shadowColor = '#ebf8ff'; g.shadowBlur = 36; g.fillStyle = '#ffffff'; } else g.fillStyle = '#9aa6b2';
  g.fill(); g.restore();
  neonText('人生海海', W / 2, 870, `300px 'Long Cang', 'LXGW WenKai TC', 'Kaiti SC', cursive`, 2, 12, bw);
  return c;
}
