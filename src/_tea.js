/* ---------- the tea room baked in Blender (blender/build_tea.py): a Victorian tea shop on a night street ---------- */
/*
 * Page 4's tea house in the round: a teal shopfront with a gilt fascia and a striped awning, a slate mansard with lit
 * dormers, a gas lamp, rose topiaries and a pillar box on the pavement; inside, a parlour round a laid tea table. Two ways
 * of asking at the table: 雷诺曼, cards dealt from the deck at your place (one, a line of three or a square of nine), and
 * 茶叶占卜: drink the cup, swirl it three times, turn it over on its saucer, then look at the leaves left inside.
 */
const TEA_ASSETS = 'tea/', TEA_PRE = 'tea_10290320';
const TEA_VIEW = {
  orbit: { at: V(0, 3.4, 0.4), narrowAt: V(0, 5.6, 0.4), orbit: { yaw: 0, pitch: 0.4, dist: 22.5, narrow: 1.08 }, yaw: 0.8, pitch: 0.2, fov: [44, 28] },
  inside: { eye: V(0, 1.97, 1.42), at: V(0, 1.28, -0.2), yaw: 0.7, pitch: 0.42, fov: [70, 54] },
};
/** the town behind the shop, as on the book page: terraces with lit windows and chimneys, a clock tower; low on the horizon,
 * so a wide screen sees its roofs over the shop's and a tall one the sky above them too, and fading out at its foot */
function teaTown() {
  const c = canvas(2048, 512), g = c.getContext('2d'), r = mulberry(404);
  const row = (base, hmin, hmax, color, lit, seed) => {
    const rr = mulberry(seed); let x = -20;
    while (x < 2068) {
      const w = 60 + rr() * 90, top = base - hmin - rr() * (hmax - hmin), roof = rr();
      g.fillStyle = color; g.fillRect(x, top, w, 512 - top);
      g.beginPath();
      if (roof < 0.4) { g.moveTo(x - 4, top); g.lineTo(x + w / 2, top - 22 - rr() * 14); g.lineTo(x + w + 4, top); }
      else if (roof < 0.7) { g.moveTo(x - 4, top); g.lineTo(x + 10, top - 18); g.lineTo(x + w - 10, top - 18); g.lineTo(x + w + 4, top); }
      g.fill();
      for (let k = 0; k < 1 + rr() * 2; k++) { const cx = x + 10 + rr() * (w - 24); g.fillRect(cx, top - 26 - (roof < 0.7 ? 14 : 0), 8, 28); }
      for (let wy = top + 10; wy < 470; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 16) {
        if (rr() < lit) { g.fillStyle = rr() < 0.8 ? 'rgba(255,214,140,.85)' : 'rgba(255,180,190,.75)'; g.fillRect(wx, wy, 5, 8); g.fillStyle = color; }
      }
      x += w + 2;
    }
  };
  row(260, 50, 130, '#3a2c55', 0.08, 21);
  // the clock tower, a little left of the middle, its face lit
  g.fillStyle = '#2a2042'; g.fillRect(820, 90, 64, 430); g.beginPath(); g.moveTo(810, 92); g.lineTo(852, 22); g.lineTo(894, 92); g.fill(); g.fillRect(849, 0, 6, 26);
  g.fillStyle = 'rgba(255,226,170,.95)'; g.beginPath(); g.arc(852, 136, 18, 0, TAU); g.fill();
  g.strokeStyle = '#2a2042'; g.lineWidth = 3; g.beginPath(); g.moveTo(852, 136); g.lineTo(852, 124); g.moveTo(852, 136); g.lineTo(862, 140); g.stroke();
  row(320, 30, 90, '#241b38', 0.12, 22);
  for (let i = 0; i < 26; i++) { const x = r() * 2048, y = 280 + r() * 80, w = 140 + r() * 260, m = g.createRadialGradient(x, y, 0, x, y, w); m.addColorStop(0, 'rgba(200,150,190,.12)'); m.addColorStop(1, 'rgba(200,150,190,0)'); g.fillStyle = m; g.fillRect(x - w, y - w, 2 * w, 2 * w); }
  g.globalCompositeOperation = 'destination-out';                          // the town thins into the night towards its foot
  const fade = g.createLinearGradient(0, 300, 0, 500); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = fade; g.fillRect(0, 300, 2048, 212);
  g.globalCompositeOperation = 'source-over';
  return tex(c);
}
/** rose-sprigged china for the visitor's cup and saucer: wraps round a lathe, gold at the rim */
function teaChina() {
  const c = canvas(512, 128), g = c.getContext('2d');
  g.fillStyle = '#fbf7f0'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#d8b46a'; g.fillRect(0, 0, 512, 7); g.fillRect(0, 13, 512, 2);
  for (let k = 0; k < 6; k++) {
    const x = 40 + k * 85, y = 70 + (k % 2 ? 10 : -6);
    g.fillStyle = '#7a9a6a'; [[-1, 0.3], [1, -0.2], [0.2, 1]].forEach(([dx, a]) => { g.beginPath(); g.ellipse(x + dx * 12, y + 6, 9, 4, a, 0, TAU); g.fill(); });
    [['#e9a6b8', 0, 0, 9], ['#f3c4cc', 12, 4, 7]].forEach(([cc, dx, dy, rr]) => { g.fillStyle = cc; g.beginPath(); g.arc(x + dx, y + dy, rr, 0, TAU); g.fill(); g.fillStyle = '#c86a84'; g.beginPath(); g.arc(x + dx, y + dy, rr * 0.4, 0, TAU); g.fill(); });
  }
  return tex(c);
}
async function buildBakedTeaRoom() {
  const gltf = await loadBakedGLB(TEA_ASSETS, TEA_PRE);
  const s = bakedScene(gltf, 0x140e22);
  s.add(new THREE.HemisphereLight(0xfff0e0, 0x5a4048, 1.5));               // only the live cup and cards are lit by it
  const fx = [], warm = tentGlow('rgba(255,236,190,1)', 'rgba(255,170,80,.45)'), flame = tentFlame();
  const sprite = (map, pos, size, color, kind) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(pos); sp.scale.setScalar(size); s.add(sp); const f = { sp, size, base: color.clone(), kind, seed: Math.random() * 100 }; fx.push(f); return f;
  };
  let cup = null, deck = null, table = null, canary = null; const chimneys = [];
  gltf.scene.traverse((o) => {
    if (!o.name.startsWith('FX_')) return;
    const p = o.getWorldPosition(new THREE.Vector3()), n = o.name;
    if (n.startsWith('FX_candle')) { sprite(flame, p.clone().add(V(0, 0.004, 0)), 0.045, new THREE.Color(2.2, 1.7, 1.2), 'flame'); sprite(warm, p, 0.3, new THREE.Color(0.8, 0.5, 0.25), 'glow'); }
    else if (n.startsWith('FX_lantern_LanternLightGas')) sprite(warm, p, 1.3, new THREE.Color(0.85, 0.55, 0.25), 'glow');
    else if (n.startsWith('FX_lantern_LanternLightChand')) sprite(warm, p.clone().add(V(0, -0.1, 0)), 0.42, new THREE.Color(0.7, 0.48, 0.24), 'glow');
    else if (n.startsWith('FX_lantern_LanternLightStand')) sprite(warm, p, 0.9, new THREE.Color(0.8, 0.45, 0.35), 'glow');
    else if (n.startsWith('FX_lantern_LanternLightFascia')) sprite(warm, p.clone().add(V(0, 0.06, 0)), 0.5, new THREE.Color(0.85, 0.6, 0.3), 'glow');
    else if (n.startsWith('FX_lantern_AtticLamp')) sprite(warm, p, n.includes('Win') ? 0.8 : 1.2, new THREE.Color(0.5, 0.32, 0.14), 'breath');
    else if (n.startsWith('FX_ember')) { sprite(warm, p, 0.7, new THREE.Color(1.0, 0.42, 0.14), 'glow'); sprite(warm, p.clone().add(V(0.05, 0.04, 0)), 0.3, new THREE.Color(1.4, 0.6, 0.2), 'flame'); }
    else if (n.startsWith('FX_smoke')) chimneys.push(p.clone());
    else if (n === 'FX_cup') cup = p.clone();
    else if (n === 'FX_deck') deck = p.clone();
    else if (n === 'FX_table') table = p.clone();
    else if (n === 'FX_canary') canary = p.clone();
  });
  const sky = nightSky(s, teaTown(), V(-10, 14, -42), -4.6);
  // what you can touch: the table to sit at, the deck, the cup, and the canary in its cage
  const hidden = new THREE.MeshBasicMaterial({ visible: false }), t0 = table ?? V(0, 1.33, 0.15);
  const tableHit = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.8, 16), hidden); tableHit.position.set(t0.x, t0.y - 0.38, t0.z); tableHit.userData.table = true; s.add(tableHit);
  const birdHit = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), hidden); birdHit.position.copy(canary ?? V(-1.85, 2.9, 1.25)); birdHit.userData.canary = true; s.add(birdHit);
  const lnDeck = teaDeck(s, deck ?? V(-0.16, 1.334, 0.51));
  const tc = teaCup(s, cup ?? V(0.12, 1.33, 0.51));
  let smokeT = 0;
  const update = (dt, t) => {
    fxPulse(fx, t); sky(t); updateLn(dt); updateTeaLeaves(dt, t);
    if ((smokeT -= dt) < 0) { smokeT = 0.22; for (const p of chimneys) smoke.emit(tmpV.copy(p).add(V(rnd(-0.03, 0.03), 0, rnd(-0.03, 0.03))), tmpW.set(rnd(0.02, 0.06), rnd(0.18, 0.28), rnd(-0.02, 0.02)), { life: rnd(3, 4.5), size: 0.2, drag: 0.15, color: new THREE.Color(0.24, 0.22, 0.3) }); }
    if (tc.steam && tc.full > 0.3 && Math.random() < dt * 5) smoke.emit(tmpV.copy(tc.at).add(V(rnd(-0.015, 0.015), 0.07, rnd(-0.015, 0.015))), tmpW.set(rnd(-0.005, 0.005), rnd(0.03, 0.05), rnd(-0.005, 0.005)), { life: rnd(1.4, 2.2), size: 0.03, drag: 0.4, color: new THREE.Color(0.9, 0.88, 0.86) });
  };
  return { scene: s, table: tableHit, hits: [tableHit, birdHit, ...lnDeck.hits, ...tc.hits], warm: { intensity: 0 }, warmBase: 0, mobiles: [], flames: [], glow: [], baked: true, update, deck: lnDeck, cup: tc, canary: birdHit };
}

/* ---------- 雷诺曼: the deck at your place, dealt into the air before you, turned one card at a time ---------- */
let lnCards = [], lnSpread = null, lnShuffle = null;
const lnFaces = {};
let lnBackMat = null;
const LN_W = 0.3, LN_H = 0.465;
/** the deck: a stack of cards lying face down by the visitor's cup */
function teaDeck(s, at) {
  lnBackMat ??= new THREE.MeshBasicMaterial({ map: tex(lenormandBack(256)) });
  const g = new THREE.Group(), edge = new THREE.MeshStandardMaterial({ color: 0xefe4cc, roughness: 0.8 }), hits = [];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.0011, 0.096), [edge, edge, lnBackMat, edge, edge, edge]);
    m.position.set(rnd(-0.0015, 0.0015), 0.0006 + i * 0.0011, rnd(-0.0015, 0.0015)); m.rotation.y = rnd(-0.03, 0.03); m.userData.deck = true; g.add(m); hits.push(m);
  }
  g.position.copy(at); g.rotation.y = 0.08; s.add(g);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.16), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(at); hit.userData.deck = true; s.add(hit); hits.push(hit);
  return { g, at: at.clone(), hits, cards: g.children };
}
function lnFaceMat(k) { return (lnFaces[k] ??= new THREE.MeshBasicMaterial({ map: tex(lenormandCard(k, 360)) })); }
const LN_INSET = { H: '红桃', D: '方块', C: '梅花', S: '黑桃' };
const lnInset = (k) => { const s = LENORMAND[k][2]; return `${LN_INSET[s.slice(-1)]} ${s.slice(0, -1)}`; };

function showLnChooser() {
  const R = rooms.tea;
  if (roomId !== 'tea' || !R || busy || lnShuffle || teaLeaves?.phase && teaLeaves.phase !== 'done') return;
  if (!roomInside) { roomSit(); return; }
  clearLn();
  showPanel('<small>Lenormand · 选一个牌阵</small><h3>想怎么看这件事？</h3><p class="spread-pick"><b>单张</b>　一张牌，一句提醒<br><b>三张连读</b>　来处 · 中心 · 去处，连成一句话<br><b>九宫格</b>　核心，和它的来处、去处、心上、脚下</p>',
    [['单张', () => pickLn('single')], ['三张连读', () => pickLn('line'), true], ['九宫格', () => pickLn('square')]]);
}
function pickLn(kind) {
  hidePanel(); lnSpread = kind;
  const D = rooms.tea.deck;
  // the shuffle: the deck splits in two, the halves riffle together twice, then it squares up
  lnShuffle = { t: 0, dur: 1.5, cards: D.cards.map((m) => ({ m, p: m.position.clone(), side: Math.random() < 0.5 ? -1 : 1 })) };
  sfx('riffle'); setTimeout(() => sfx('riffle'), 700); setUI('room');
}
function updateLn(dt) {
  if (lnShuffle) {
    const S = lnShuffle; S.t += dt; const k = Math.min(1, S.t / S.dur), lift = Math.sin(Math.PI * k);
    S.cards.forEach((c, i) => {
      const ph = Math.sin(k * TAU * 2 + i * 0.4);
      c.m.position.set(c.p.x + c.side * 0.045 * Math.sin(Math.PI * k) * (0.6 + 0.4 * ph), c.p.y + lift * 0.03 * (i / 12), c.p.z);
      c.m.rotation.z = c.side * 0.25 * lift * (0.5 + 0.5 * ph);
    });
    if (k >= 1) { S.cards.forEach((c) => { c.m.position.copy(c.p); c.m.rotation.z = 0; }); lnShuffle = null; dealLn(); }
  }
  for (const c of lnCards) {
    if (c.t < 1) { c.t = Math.min(1, c.t + dt / 0.7); const k = ease(Math.max(0, c.t)); c.group.position.lerpVectors(c.from, c.to, k).add(V(0, Math.sin(k * Math.PI) * 0.12, 0)); if (c.t > 0 && Math.random() < 0.4) sparks.emit(c.group.position, tmpW.set(0, 0.04, 0), { life: 0.6, size: 0.01 }); }
    c.group.lookAt(camera.position);
    if (c.flipping) c.flip = Math.min(1, c.flip + dt / 0.6);
    c.group.rotateY(ease(c.flip) * Math.PI);
  }
  updateLnTags();
}
/** deal the chosen spread, face down, into the air before you: one card, a row of three, or a three-by-three square */
function dealLn() {
  const S = LN_SPREADS[lnSpread], n = S.n, order = [];
  while (order.length < n) { const k = Math.floor(Math.random() * 36); if (!order.includes(k)) order.push(k); }
  const fwd = camera.getWorldDirection(new THREE.Vector3()), right = new THREE.Vector3().crossVectors(fwd, UP).normalize(), camUp = new THREE.Vector3().crossVectors(right, fwd);
  const cols = n === 9 ? 3 : n, rows = n === 9 ? 3 : 1;
  const dist = 0.78 * cardReach(), halfH = dist * Math.tan((camera.fov * DEG) / 2), halfW = halfH * camera.aspect;
  const gap = n === 9 ? 1.08 : 1.14, gapY = n === 9 ? (camera.aspect < 0.8 ? 1.16 : 1.06) : 1;
  const sc = Math.min(n === 1 ? 0.62 : n === 3 ? 0.5 : 0.36, (halfW * 2 * 0.86) / (cols * LN_W * gap), (halfH * 2 * (n === 9 ? 0.74 : 0.6)) / (rows * LN_H * gapY));
  const from = rooms.tea.deck.at.clone().add(V(0, 0.02, 0)), lift = halfH * (n === 9 ? 0.12 : 0.14);
  burstAt(sparks, from, 30, { speed: 0.25, up: 0.5, size: 0.016 }); sfx('pop');
  lnCards = order.map((k, i) => {
    const g = new THREE.Group(), back = new THREE.Mesh(new THREE.PlaneGeometry(LN_W, LN_H), lnBackMat), face = new THREE.Mesh(new THREE.PlaneGeometry(LN_W, LN_H), lnFaceMat(k));
    face.rotation.y = Math.PI; back.userData.ln = i; face.userData.ln = i; g.add(back, face);
    g.position.copy(from); g.scale.setScalar(sc); rooms.tea.scene.add(g);
    const cx = (i % cols) - (cols - 1) / 2, cy = (rows - 1) / 2 - Math.floor(i / cols);
    const to = camera.position.clone().addScaledVector(fwd, dist).addScaledVector(right, cx * LN_W * sc * gap).addScaledVector(camUp, cy * LN_H * sc * gapY + lift);
    return { k, group: g, from: from.clone(), to, t: -i * 0.09, flip: 0, flipping: false, slot: S.slots?.[i], h: LN_H * sc, camUp };
  });
  lnTags(lnSpread === 'line');
  toast(n === 1 ? '点开这张牌' : `${S.name}摆好了 · 一张一张点开`);
  setUI('room');
}
function flipLn(i) {
  const c = lnCards[i];
  if (!c || c.flipping || c.t < 1) return;
  c.flipping = true; sfx('page'); setUI('room');
  setTimeout(() => {
    burstAt(sparks, c.group.position, 20, { speed: 0.25, up: 0.3, size: 0.014 });
    if (lnCards.length === 1) { setTimeout(() => showLnCard(c.k), 350); return; }
    toast(`${c.slot} · ${LENORMAND[c.k][0]}`);
    if (lnCards.every((o) => o.flipping)) setTimeout(showLnSummary, 900);
  }, 550);
}
const lnNext = () => lnCards.findIndex((c) => !c.flipping);
function flipAllLn() { lnCards.forEach((c, i) => setTimeout(() => whenLanded(i, () => flipLn(i)), i * 260)); }
function whenLanded(i, fn) { const c = lnCards[i]; if (!c) return; if (c.t < 1) { setTimeout(() => whenLanded(i, fn), 120); return; } fn(); }
const LN_NOTE = `牌面为本书原创的剪影画，牌义为本书新写；牌的次序和牌角的扑克牌沿用旧时雷诺曼牌的传统。<br>${DISCLAIM.replace('X', '牌面')}`;
function showLnCard(k) {
  const [name, en, , key, line] = LENORMAND[k];
  sfx('chime');
  showPanel(`<span class="seal">牌</span><small>雷诺曼 · 第 ${k + 1} 张 · ${en} · 牌角 ${lnInset(k)}</small><h3>${name}</h3><p class="gua-image">牌意 · ${key}</p><p>${line}</p><div class="note">${LN_NOTE}</div>`,
    [['再翻一次', () => { clearLn(); hidePanel(); setTimeout(showLnChooser, 200); }, true], ['收起', () => { clearLn(); hidePanel(); setUI('room'); }]]);
}
function showLnSummary() {
  if (!lnCards.length) return;
  const card = (c) => LENORMAND[c.k], phrase = (i) => card(lnCards[i])[5];
  let body;
  if (lnSpread === 'line') {
    const rows = lnCards.map((c) => { const [name, en, , key, line] = card(c); return `<li><b>${c.slot}</b>　${name} <i>${en}</i> · ${key}<span>${line}</span></li>`; }).join('');
    body = `<h3>你的三张连读</h3><p class="ln-sentence">这件事的中心是${phrase(1)}；它的来处是${phrase(0)}，去处是${phrase(2)}。</p><ul class="spread-list">${rows}</ul>`;
  } else {
    const [name, en, , key, line] = card(lnCards[4]);
    const sides = LN_SIDES.map(([side, where, idx, what]) => `<li><b>${side}</b>　${where} · ${what}<span>${idx.map((i) => card(lnCards[i])[0]).join(' · ')}：${idx.map(phrase).join('、')}</span></li>`).join('');
    body = `<h3>你的九宫格</h3><p class="ln-sentence"><b>核心 · ${name}</b> <i>${en}</i> · ${key}<br>${line}</p><ul class="spread-list">${sides}</ul>`;
  }
  sfx('chime');
  const corners = lnSpread === 'square' ? '四个角上的牌同时在一行和一列里，会被读到两次。<br>' : '';
  showPanel(`<span class="seal">牌</span><small>${LN_SPREADS[lnSpread].name} · ${LN_SPREADS[lnSpread].note}</small>${body}<div class="note">${corners}${LN_NOTE}</div>`,
    [['再翻一次', () => { clearLn(); hidePanel(); setTimeout(showLnChooser, 200); }, true], ['收起', () => { clearLn(); hidePanel(); setUI('room'); }]]);
  $('panel').classList.add('long');
}
function clearLn() { lnCards.forEach((c) => c.group.parent?.remove(c.group)); lnCards = []; lnSpread = null; lnShuffle = null; lnTags(false); }
/** the place names under a line of three, kept on screen as the cards move */
function lnTags(on) {
  let box = $('lnTags');
  if (!on) { box?.remove(); return; }
  if (!box) { box = el('div', 'spread-tags'); box.id = 'lnTags'; document.body.appendChild(box); }
  box.replaceChildren(...lnCards.map((c) => { const t = el('span', 'spread-tag'); t.textContent = c.slot; return t; }));
}
function updateLnTags() {
  const box = $('lnTags'); if (!box) return;
  const r = renderer.domElement.getBoundingClientRect();
  lnCards.forEach((c, i) => {
    const t = box.children[i]; if (!t) return;
    tmpV.copy(c.group.position).addScaledVector(c.camUp, -(c.h * 0.5 + 0.016)).project(camera);
    t.style.left = `${r.left + ((tmpV.x + 1) / 2) * r.width}px`; t.style.top = `${r.top + ((1 - tmpV.y) / 2) * r.height}px`;
    t.classList.toggle('open', c.flipping); t.style.opacity = c.t > 0.6 ? 1 : 0;
  });
}

/* ---------- 茶叶占卜: drink, swirl three times, turn the cup over, and read what the leaves left ---------- */
/*
 * The inside of the cup is painted as seen from straight above: the centre is the bottom, the edge the rim, the handle to
 * the right. Two or three shapes form among the stray leaves, each in a zone (rim, wall, bottom) and on a side (by the
 * handle, across from it, or between); a gold ring and a number mark each one once the cup is read.
 */
/** the inside of the cup, bottom to rim, as (radius, height): the tea's surface follows it */
const TEA_IN = [[0.0005, 0.006], [0.02, 0.007], [0.036, 0.034], [0.042, 0.058], [0.0445, 0.066]];
function teaInR(y) { for (let i = 1; i < TEA_IN.length; i++) { const [r0, y0] = TEA_IN[i - 1], [r1, y1] = TEA_IN[i]; if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0); } return TEA_IN[TEA_IN.length - 1][0]; }
let teaLeaves = null;
function teaCup(s, at) {
  const china = new THREE.MeshStandardMaterial({ map: teaChina(), roughness: 0.25, metalness: 0, emissive: 0x2a2420 });
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const prof = [[0, 0.002], [0.022, 0.002], [0.025, 0.008], [0.04, 0.035], [0.046, 0.06], [0.047, 0.066]].map(([r, y]) => new THREE.Vector2(r, y));
  body.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 40), china));
  // the inside: its own lathe, mapped from above so the painted leaves sit where they are drawn
  const inProf = TEA_IN.map(([r, y]) => new THREE.Vector2(r, y));
  const inGeo = new THREE.LatheGeometry(inProf, 48), pos = inGeo.attributes.position, uv = inGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * 0.0445), 0.5 - pos.getZ(i) / (2 * 0.0445));
  const W = 512, cv = canvas(W, W), cg = cv.getContext('2d'), map = tex(cv);
  const inside = new THREE.Mesh(inGeo, new THREE.MeshStandardMaterial({ map, roughness: 0.2, side: THREE.BackSide, emissive: 0x302820 })); body.add(inside);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.0443, 0.0472, 48), new THREE.MeshStandardMaterial({ color: 0xd8b46a, roughness: 0.3, metalness: 0.6, side: THREE.DoubleSide })); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.066; body.add(rim);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0045, 8, 20, Math.PI * 1.25), china); handle.position.set(0.05, 0.04, 0); handle.rotation.z = -Math.PI * 0.62; body.add(handle);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: 0x6a3214, roughness: 0.05, transparent: true, opacity: 0.94 })); tea.rotation.x = -Math.PI / 2; body.add(tea);
  const saucer = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.075, 0.011], [0.078, 0.015], [0.07, 0.013], [0.03, 0.006], [0, 0.007]].map(([r, y]) => new THREE.Vector2(r, y)), 40), china);
  g.add(saucer); body.position.y = 0.007;
  g.position.copy(at); g.rotation.y = -0.5; s.add(g);
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(at).add(V(0, 0.04, 0)); hit.userData.cup = true; s.add(hit);
  const C = { g, body, tea, inside, cv, cg, map, W, at: at.clone(), hits: [hit, ...body.children], full: 1, steam: true };
  setTeaLevel(C, 1); paintDregs(C, mulberry(Math.floor(Math.random() * 1e6)), 160);
  return C;
}
/** how full the cup is, 0 to 1: the tea's surface sits on the inside wall at that height */
function setTeaLevel(C, k) {
  C.full = k; const y = 0.01 + k * 0.046;
  C.tea.position.y = y; C.tea.scale.setScalar(Math.max(0.001, teaInR(y) - 0.0004)); C.tea.visible = k > 0.02;
}
/** porcelain inside, faintly stained, with stray leaves */
function paintDregs(C, r, n) {
  const { cg: g, W } = C, c = W / 2;
  g.fillStyle = '#f8f3ea'; g.fillRect(0, 0, W, W);
  const st = g.createRadialGradient(c, c, 10, c, c, c); st.addColorStop(0, 'rgba(176,120,70,.35)'); st.addColorStop(0.5, 'rgba(176,120,70,.12)'); st.addColorStop(0.92, 'rgba(176,120,70,.18)'); st.addColorStop(1, 'rgba(176,120,70,0)');
  g.fillStyle = st; g.fillRect(0, 0, W, W);
  g.strokeStyle = 'rgba(150,96,50,.3)'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, W * 0.47, 0, TAU); g.stroke();
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * W * 0.46; teaFleck(g, c + Math.cos(a) * d, c + Math.sin(a) * d, r, 0.8); }
  C.map.needsUpdate = true;
}
/** one tea leaf, curled and dark */
function teaFleck(g, x, y, r, s = 1) {
  const L = (3 + r() * 6) * s, w = L * (0.3 + r() * 0.3), a = r() * TAU;
  g.fillStyle = r() < 0.5 ? 'rgba(40,24,12,.92)' : 'rgba(70,42,20,.88)';
  g.beginPath(); g.ellipse(x, y, L, w, a, 0, TAU); g.fill();
}
/* the outlines the leaves gather along: strokes and filled shapes in a box -1..1, y up */
const TEA_SHAPES = (() => {
  const arc = (cx, cy, r, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * (i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const heart = Array.from({ length: 40 }, (_, i) => { const t = (i / 40) * TAU; return [(16 * Math.sin(t) ** 3) / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17]; });
  const star = Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.38 : 0.95; return [Math.cos(a) * rr, Math.sin(a) * rr]; });
  return {
    heart: { fill: [heart] }, star: { fill: [star] },
    moon: { fill: [[...arc(0, 0, 0.85, Math.PI * 0.35, Math.PI * 1.65), ...arc(0.35, 0, 0.62, Math.PI * 1.45, Math.PI * 0.55)]] },
    sun: { fill: [arc(0, 0, 0.42, 0, TAU, 24)], strokes: Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * TAU; return [[Math.cos(a) * 0.55, Math.sin(a) * 0.55], [Math.cos(a) * 0.92, Math.sin(a) * 0.92]]; }) },
    bird: { strokes: [[[-1, 0.25], [-0.55, 0.62], [-0.15, 0.2], [0, 0.05]], [[0, 0.05], [0.15, 0.2], [0.55, 0.62], [1, 0.25]]], fill: [arc(0, -0.05, 0.16, 0, TAU, 12)] },
    fish: { fill: [[[-0.75, 0], [-0.35, 0.36], [0.2, 0.32], [0.55, 0], [0.2, -0.32], [-0.35, -0.36]], [[0.5, 0], [0.95, 0.4], [0.85, 0], [0.95, -0.4]]] },
    key: { strokes: [[[-0.35, 0], [0.95, 0]], [[0.62, 0], [0.62, -0.32]], [[0.82, 0], [0.82, -0.26]], arc(-0.62, 0, 0.3, 0, TAU, 20)] },
    ring: { strokes: [arc(0, 0, 0.7, 0, TAU, 32)] },
    anchor: { strokes: [[[0, 0.62], [0, -0.75]], [[-0.42, 0.42], [0.42, 0.42]], arc(0, -0.2, 0.62, Math.PI * 1.1, Math.PI * 1.9, 16), arc(0, 0.78, 0.16, 0, TAU, 12)] },
    tree: { strokes: [[[0, -0.95], [0, 0.05]]], fill: [arc(0, 0.38, 0.55, 0, TAU, 24)] },
    house: { fill: [[[-0.6, -0.8], [0.6, -0.8], [0.6, 0.1], [0.82, 0.1], [0, 0.82], [-0.82, 0.1], [-0.6, 0.1]]] },
    mountain: { fill: [[[-1, -0.6], [-0.3, 0.72], [0.15, -0.1], [0.5, 0.32], [1, -0.6]]] },
    ladder: { strokes: [[[-0.35, -0.95], [-0.35, 0.95]], [[0.35, -0.95], [0.35, 0.95]], ...[-0.6, -0.2, 0.2, 0.6].map((y) => [[-0.35, y], [0.35, y]])] },
    bridge: { strokes: [arc(0, -0.75, 0.95, Math.PI * 0.18, Math.PI * 0.82, 20), [[-0.95, 0.12], [0.95, 0.12]], [[-0.62, 0.12], [-0.62, -0.45]], [[0.62, 0.12], [0.62, -0.45]]] },
    boat: { fill: [[[-0.92, -0.2], [0.92, -0.2], [0.6, -0.62], [-0.6, -0.62]], [[0.04, 0.82], [0.62, -0.1], [0.04, -0.1]]], strokes: [[[0, -0.2], [0, 0.85]]] },
    flower: { fill: Array.from({ length: 5 }, (_, i) => { const a = Math.PI / 2 + (i / 5) * TAU; return arc(Math.cos(a) * 0.36, 0.25 + Math.sin(a) * 0.36, 0.24, 0, TAU, 12); }), strokes: [[[0, 0.1], [0.05, -0.5], [0, -0.95]]] },
    leaf: { fill: [[[0, -0.95], [0.42, -0.4], [0.5, 0.2], [0, 0.95], [-0.5, 0.2], [-0.42, -0.4]]] },
    butterfly: { fill: [arc(-0.42, 0.3, 0.36, 0, TAU, 14), arc(0.42, 0.3, 0.36, 0, TAU, 14), arc(-0.32, -0.32, 0.25, 0, TAU, 12), arc(0.32, -0.32, 0.25, 0, TAU, 12)], strokes: [[[0, -0.6], [0, 0.6]]] },
    umbrella: { fill: [[...arc(0, 0.1, 0.85, 0, Math.PI, 20)]], strokes: [[[0, 0.1], [0, -0.75]], arc(0.16, -0.75, 0.16, Math.PI, TAU, 8)] },
    bell: { fill: [[[-0.75, -0.55], [0.75, -0.55], [0.5, -0.3], [0.42, 0.45], [0, 0.78], [-0.42, 0.45], [-0.5, -0.3]], arc(0, -0.72, 0.13, 0, TAU, 10)] },
    kite: { fill: [[[0, 0.95], [0.45, 0.25], [0, -0.35], [-0.45, 0.25]]], strokes: [[[0, -0.35], [0.22, -0.55], [-0.12, -0.72], [0.15, -0.95]]] },
    spiral: { strokes: [Array.from({ length: 50 }, (_, i) => { const a = i * 0.32, rr = 0.06 + i * 0.017; return [Math.cos(a) * rr, Math.sin(a) * rr]; })] },
    triangle: { strokes: [[[0, 0.85], [0.85, -0.65], [-0.85, -0.65], [0, 0.85]]] },
    square: { strokes: [[[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7], [-0.7, -0.7]]] },
    question: { strokes: [[...arc(0, 0.38, 0.38, Math.PI * 1.0, Math.PI * -0.45, 16), [0.08, -0.15], [0, -0.38]]], fill: [arc(0, -0.78, 0.11, 0, TAU, 10)] },
    cat: { fill: [arc(0, -0.05, 0.6, 0, TAU, 24), [[-0.58, 0.18], [-0.5, 0.92], [-0.12, 0.5]], [[0.58, 0.18], [0.5, 0.92], [0.12, 0.5]]] },
    feather: { fill: [[[0, 0.95], [0.32, 0.4], [0.28, -0.3], [0, -0.55], [-0.24, -0.2], [-0.3, 0.45]]], strokes: [[[0, 0.95], [0, -0.95]]] },
    candle: { fill: [[[-0.25, -0.95], [0.25, -0.95], [0.25, 0.3], [-0.25, 0.3]], [[0, 0.95], [0.16, 0.58], [0, 0.42], [-0.16, 0.58]]] },
    crown: { fill: [[[-0.85, -0.55], [0.85, -0.55], [0.95, 0.55], [0.48, 0.05], [0, 0.72], [-0.48, 0.05], [-0.95, 0.55]]] },
  };
})();
/** leaves gathered into one shape at (x, y), s pixels across: along its strokes and scattered through its filled parts */
function paintShape(g, shape, x, y, s, r) {
  const P = (px, py) => [x + px * s * 0.5, y - py * s * 0.5];
  g.save(); g.fillStyle = g.strokeStyle = 'rgba(150,92,40,.2)'; g.lineWidth = s * 0.07; g.lineCap = g.lineJoin = 'round';         // the damp tea stain the leaves sit in
  for (const line of shape.strokes ?? []) { g.beginPath(); line.forEach(([px, py], i) => { const [qx, qy] = P(px, py); if (i) g.lineTo(qx, qy); else g.moveTo(qx, qy); }); g.stroke(); }
  for (const poly of shape.fill ?? []) { g.beginPath(); poly.forEach(([px, py], i) => { const [qx, qy] = P(px, py); if (i) g.lineTo(qx, qy); else g.moveTo(qx, qy); }); g.closePath(); g.fill(); }
  g.restore();
  for (const line of shape.strokes ?? []) for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i], [bx, by] = line[i + 1], n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.06));
    for (let k = 0; k < n * 2; k++) { const t = k / (n * 2), [px, py] = P(ax + (bx - ax) * t, ay + (by - ay) * t); teaFleck(g, px + (r() - 0.5) * s * 0.035, py + (r() - 0.5) * s * 0.035, r, s / 110); }
  }
  for (const poly of shape.fill ?? []) {
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const n = Math.ceil(((x1 - x0) * (y1 - y0)) / 0.0035);
    for (let k = 0; k < n; k++) { const px = x0 + r() * (x1 - x0), py = y0 + r() * (y1 - y0); if (inPoly(poly, px, py)) { const [qx, qy] = P(px, py); teaFleck(g, qx, qy, r, s / 130); } }
    poly.forEach(([px, py], i) => { if (i % 2) return; const [qx, qy] = P(px, py); teaFleck(g, qx, qy, r, s / 120); });
  }
}
function inPoly(poly, x, y) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside; } return inside; }
/** where the shapes fall: zone by distance from the centre, side by angle from the handle (to the right, at 0) */
function teaPlaces(n, r) {
  const zones = ['rim', 'wall', 'bottom'], sides = [['handle', 0], ['far', Math.PI], ['side', -Math.PI / 2], ['side', Math.PI / 2]], out = [];
  const pool = []; for (const z of zones) for (const [side, a] of sides) if (z !== 'bottom' || side === 'side') pool.push({ zone: z, side: z === 'bottom' ? 'side' : side, a });
  while (out.length < n && pool.length) {
    const p = pool.splice(Math.floor(r() * pool.length), 1)[0];
    // far enough apart that two shapes never run into each other
    const at = (q) => { const d = { rim: 0.33, wall: 0.2, bottom: 0 }[q.zone]; return [Math.cos(q.a) * d, Math.sin(q.a) * d]; };
    if (out.some((o) => { const [x0, y0] = at(o), [x1, y1] = at(p); return Math.hypot(x1 - x0, y1 - y0) < 0.25; })) continue;
    out.push(p);
  }
  return out;
}
function startTeaLeaves() {
  const R = rooms.tea;
  if (roomId !== 'tea' || !R || busy || lnShuffle || lnCards.length || (teaLeaves && teaLeaves.phase !== 'done')) return;
  if (!roomInside) { roomSit(); return; }
  hidePanel(); const C = R.cup;
  teaLeaves = { phase: 'drink', turns: 0, anim: null, C };
  C.body.rotation.set(0, 0, 0); setTeaLevel(C, 1); C.steam = true; paintDregs(C, mulberry(Math.floor(Math.random() * 1e6)), 160);
  toast('默念你的问题，慢慢喝完这杯茶，杯底留一点点'); sfx('soft'); setUI('room');
}
/** each step plays as a little animation of the cup: lifted and drunk, swirled, turned over, turned back */
function teaStep() {
  const L = teaLeaves; if (!L || L.anim) return;
  if (L.phase === 'drink') { L.anim = { kind: 'drink', t: 0, dur: 2.2 }; sfx('sip'); }
  else if (L.phase === 'swirl') { L.acc = 0; L.anim = { kind: 'swirl', t: 0, dur: 0.9 }; sfx('soft'); }
  else if (L.phase === 'turn') { L.anim = { kind: 'turn', t: 0, dur: 1.2 }; sfx('soft'); }
  else if (L.phase === 'wait') { L.anim = { kind: 'back', t: 0, dur: 1.1 }; sfx('clink'); }
  setUI('room');
}
function updateTeaLeaves(dt) {
  const L = teaLeaves; if (!L?.anim) return;
  const A = L.anim, C = L.C; A.t += dt; const k = Math.min(1, A.t / A.dur), e = easeIO(k);
  if (A.kind === 'drink') {
    const lift = Math.sin(Math.PI * k);
    C.body.position.set(0, 0.007 + lift * 0.09, lift * 0.06); C.body.rotation.x = lift * 0.55;
    setTeaLevel(C, Math.max(0.04, 1 - e * 1.05)); C.steam = k < 0.5;
  } else if (A.kind === 'swirl') {
    C.body.rotation.y = (L.turns + e) * TAU; C.body.position.y = 0.007 + Math.sin(Math.PI * k) * 0.012;
  } else if (A.kind === 'turn') {
    C.body.position.y = 0.007 + Math.sin(Math.PI * k) * 0.08 + e * 0.066; C.body.rotation.x = e * Math.PI;
    if (k >= 1) setTeaLevel(C, 0);
  } else if (A.kind === 'back') {
    C.body.position.y = 0.073 - e * 0.066 + Math.sin(Math.PI * k) * 0.08; C.body.rotation.x = Math.PI * (1 - e);
  }
  if (k < 1) return;
  L.anim = null;
  if (A.kind === 'drink') { L.phase = 'swirl'; sfx('clink'); toast('左手握着杯子，转三圈'); }
  else if (A.kind === 'swirl') teaTurned(L);
  else if (A.kind === 'turn') { L.phase = 'wait'; sfx('clink'); paintLeaves(L); setTimeout(() => { if (teaLeaves === L && L.phase === 'wait') teaStep(); }, 1500); }
  else if (A.kind === 'back') { L.phase = 'read'; readCup(L); }
  setUI('room');
}
/** one full turn of the cup done, by a swipe or the button; after the third it is ready to turn over */
function teaTurned(L) { L.turns++; sfx('soft'); if (L.turns >= 3) { L.phase = 'turn'; toast('把杯子倒扣在碟子上'); } else toast(`第 ${L.turns} 圈`); setUI('room'); }
/** swiping turns the cup round on its saucer: a swipe across most of a phone, or about half a wide screen, either way, is one full turn */
function teaSwirl(dx) {
  const L = teaLeaves; if (!L || L.phase !== 'swirl' || L.anim) return;
  const turn = Math.max(300, innerWidth * 0.4);
  L.acc = (L.acc ?? 0) + Math.abs(dx);
  L.C.body.rotation.y = (L.turns + Math.min(1, L.acc / turn)) * TAU;
  if (L.acc >= turn) { L.acc = 0; teaTurned(L); }
}
/** the leaves settle into two or three shapes among the strays (painted while the cup is upside down) */
function paintLeaves(L) {
  const C = L.C, r = mulberry(Math.floor(Math.random() * 1e6)), n = r() < 0.4 ? 2 : 3, W = C.W, c = W / 2;
  paintDregs(C, r, 60);
  const picks = []; while (picks.length < n) { const i = Math.floor(r() * TEA_SYMBOLS.length); if (!picks.includes(i)) picks.push(i); }
  const places = teaPlaces(n, r);
  L.found = places.map((p, i) => {
    const d = { rim: 0.33, wall: 0.2, bottom: 0.0 }[p.zone] * W, a = p.a + (r() - 0.5) * 0.25, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d, s = (p.zone === 'bottom' ? 0.26 : 0.24) * W;
    paintShape(C.cg, TEA_SHAPES[TEA_SYMBOLS[picks[i]][1]], x, y, s, r);
    return { k: picks[i], zone: p.zone, side: p.side, x, y, s };
  });
  C.map.needsUpdate = true;
}
/** look down into the cup; a gold ring and a number round each shape, one after another; then the reading */
async function readCup(L) {
  const C = L.C, at = C.at.clone().add(V(0, 0.03, 0)), dir = camera.position.clone().sub(at).setY(0).normalize();
  busy = true; setUI('moving');
  await flyRoom({ eye: at.clone().add(V(0, 0.27, 0)).addScaledVector(dir, 0.11), at, yaw: 0.2, pitch: 0.2, fov: [44, 34] }, 1200);
  busy = false;
  const g = C.cg;
  for (const [i, f] of L.found.entries()) {
    await wait(650); if (teaLeaves !== L) return;
    g.save(); g.strokeStyle = 'rgba(214,170,80,.95)'; g.lineWidth = 4; g.setLineDash([10, 8]); g.beginPath(); g.arc(f.x, f.y, f.s * 0.62, 0, TAU); g.stroke(); g.restore();
    const nx = Math.min(C.W * 0.9, f.x + f.s * 0.5), ny = Math.max(C.W * 0.1, f.y - f.s * 0.5);
    g.fillStyle = 'rgba(176,130,50,.95)'; g.beginPath(); g.arc(nx, ny, C.W * 0.04, 0, TAU); g.fill();
    g.fillStyle = '#fff8e8'; g.font = `600 ${Math.round(C.W * 0.055)}px "Cormorant Garamond", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(i + 1), nx, ny + 1); C.map.needsUpdate = true;
    sfx('pop'); burstAt(sparks, C.at.clone().add(V(0, 0.07, 0)), 8, { speed: 0.05, up: 0.08, size: 0.006, life: 0.6 });
  }
  await wait(700); if (teaLeaves !== L) return;
  L.phase = 'done'; showTeaReading(L); setUI('room');
}
function showTeaReading(L) {
  const rows = L.found.map((f, i) => {
    const [name, , line] = TEA_SYMBOLS[f.k], [zone, zoneLine] = TEA_ZONES[f.zone], [side, sideLine] = TEA_SIDES[f.side] ?? [];
    return `<li><b>${i + 1} · ${name}</b>　${zone}${side ? ` · ${side}` : ''}<span>${line}</span><span class="tea-where">${zoneLine}${sideLine ? `；${sideLine}` : ''}。</span></li>`;
  }).join('');
  sfx('chime');
  showPanel(`<span class="seal">茶</span><small>茶叶占卜 · 杯里看见了 ${L.found.length} 样东西</small><h3>${L.found.map((f) => TEA_SYMBOLS[f.k][0]).join('、')}</h3><p class="gua-image">只读金圈里的形状，其余散叶不必看。</p><ul class="spread-list">${rows}</ul>`
    + `<div class="note">杯里的茶叶形状由程序随机生成，解读为本书新写。<br>${DISCLAIM.replace('X', '茶叶的形状')}</div>`,
    [['再来一杯', () => { hidePanel(); backToTea().then(startTeaLeaves); }, true], ['收起', () => { hidePanel(); backToTea(); setUI('room'); }]]);
  $('panel').classList.add('long');
}
function backToTea() { return roomId === 'tea' && roomInside && ROOM_VIEW.tea !== TEA_VIEW.inside && !roomFly ? flyRoom(TEA_VIEW.inside, 900) : Promise.resolve(); }
/** everything back on the table: the cards put away, a fresh cup poured */
function resetTea() {
  clearLn(); teaLeaves = null;
  const C = rooms.tea?.cup; if (C) { C.body.position.set(0, 0.007, 0); C.body.rotation.set(0, 0, 0); setTeaLevel(C, 1); C.steam = true; paintDregs(C, mulberry(7), 160); }
}
/** the buttons along the bottom while a reading is under way; true when they take the place of the room's own */
function teaButtons(act, hint) {
  if (lnShuffle) { hint.textContent = '洗牌中……想着你的问题'; return true; }
  if (lnCards.length) {
    const i = lnNext();
    if (i >= 0) {
      hint.textContent = lnCards.length === 1 ? '点牌，或按下面的按钮翻开' : '点牌，或按下面的按钮，一张一张翻开';
      act.append(button(lnCards.length === 1 ? '翻开这张牌' : `翻开第 ${i + 1} 张`, () => whenLanded(i, () => flipLn(i)), true));
      if (lnCards.length > 1) act.append(button('全部翻开', flipAllLn));
      act.append(button('收起牌', () => { clearLn(); hidePanel(); setUI('room'); }));
      return true;
    }
    return false;
  }
  const L = teaLeaves;
  if (L && L.phase !== 'done') {
    hint.textContent = { drink: '默念你的问题，喝完这杯茶 · 点杯子也可以', swirl: `左右滑动转杯子，或按「转一圈」，一共三圈（${L.turns}/3）`, turn: '把杯子倒扣在碟子上', wait: '等茶汤流干，杯子会翻回来给你看', read: '杯里留下了什么……' }[L.phase];
    if (!L.anim && L.phase !== 'read' && L.phase !== 'wait') act.append(button({ drink: '喝茶', swirl: '转一圈', turn: '倒扣杯子' }[L.phase], teaStep, true));
    if (L.phase !== 'read') act.append(button('放下杯子', () => { resetTea(); setUI('room'); }));
    return true;
  }
  return false;
}
/** a tap in the tea room: a card to turn, the deck, the cup, the canary, or the table to sit at */
function teaTap(hit) {
  const u = hit.object.userData;
  if (u.ln !== undefined) { flipLn(u.ln); return; }
  if (u.canary) { sfx('chirp'); burstAt(sparks, hit.object.position, 10, { speed: 0.08, up: 0.12, size: 0.01, life: 0.8 }); toast('金丝雀唱了一小段'); return; }
  if (!roomInside) { roomSit(); return; }
  if (u.deck) { if (!lnCards.length && (!teaLeaves || teaLeaves.phase === 'done')) { teaLeaves = null; showLnChooser(); } return; }
  if (u.cup || rooms.tea.cup.hits.includes(hit.object)) { if (teaLeaves && teaLeaves.phase !== 'done') teaStep(); else if (!lnCards.length) { teaLeaves = null; startTeaLeaves(); } }
}
