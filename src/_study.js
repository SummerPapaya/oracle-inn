
/* ---------- the study baked in Blender (blender/build_study.py): a scholar's study behind a moon gate ---------- */
/*
 * Page 3's garden in the round: a white wall with a moon gate and two leak windows, the study hall behind it under
 * upturned eaves with a little pavilion roof and a gold finial, bamboo on the left, a plum in blossom and a Taihu
 * rock on the right, a lily pond and stepping stones in front. Look in from outside, or step up to the desk.
 */
const STUDY_ASSETS = 'study/', STUDY_PRE = 'study_10290111';
const STUDY_VIEW = {
  // the garden is twice as wide as the tent's or the shrine's platform: a phone held upright steps back further to keep it whole
  orbit: { at: V(0, 2.1, 1.1), orbit: { yaw: 0, pitch: 0.4, dist: 27, narrow: 1.3 }, yaw: 0.8, pitch: 0.2, fov: [44, 28] },
  inside: { eye: V(0, 1.98, 0.92), at: V(0, 1.08, -0.38), yaw: 0.7, pitch: 0.42, fov: [70, 54] },
};
/** the ink ranges behind the garden, as on the book page: dark peaks either side, paler ones between, mist at their feet */
function studyRanges() {
  const c = canvas(2048, 512), g = c.getContext('2d'), r = mulberry(303);
  const ridge = (base, amp, peaks, color, alpha, seed) => {
    const rr = mulberry(seed), cs = Array.from({ length: peaks }, () => [rr(), 0.4 + rr() * 0.6, 0.03 + rr() * 0.08]);
    g.beginPath(); g.moveTo(0, 512);
    for (let i = 0; i <= 256; i++) {
      const x = i / 256; let h = 0; for (const [cx, a, w] of cs) h += a * Math.exp(-(((x - cx) / w) ** 2));
      g.lineTo(x * 2048, 512 * (base - amp * Math.min(1.2, h) - 0.01 * Math.sin(x * 90 + seed)));
    }
    g.lineTo(2048, 512); g.closePath();
    const gr = g.createLinearGradient(0, 512 * (base - amp), 0, 512 * base + 40); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(20,28,44,0)');
    g.globalAlpha = alpha; g.fillStyle = gr; g.fill(); g.globalAlpha = 1;
  };
  ridge(0.92, 0.42, 9, '#56657c', 0.55, 11); ridge(0.95, 0.55, 6, '#3a465a', 0.8, 12); ridge(1.0, 0.7, 5, '#222b3a', 0.95, 13);
  for (let i = 0; i < 26; i++) { const x = r() * 2048, y = 360 + r() * 120, w = 120 + r() * 260; const m = g.createRadialGradient(x, y, 0, x, y, w); m.addColorStop(0, 'rgba(170,184,206,.16)'); m.addColorStop(1, 'rgba(170,184,206,0)'); g.fillStyle = m; g.fillRect(x - w, y - w, w * 2, w * 2); }
  return tex(c);
}
/** the study's sky: the night sky over the ink ranges, the moon high on the right */
function studySky(s) { return nightSky(s, studyRanges(), V(9, 13, -42), 4.5); }
/** stars all round that twinkle, the moon with its halo, and a painted backdrop low on the horizon behind (the tea room uses it too) */
function nightSky(s, back, moonAt, backY) {
  const N = 900, pos = [], seed = [], mag = [], rng = mulberry(4417);
  for (let i = 0; i < N; i++) {
    const z = rng() * 1.1 - 0.1, a = rng() * TAU, rr = Math.sqrt(Math.max(0, 1 - z * z));
    pos.push(rr * Math.cos(a) * 70, z * 70, rr * Math.sin(a) * 70); seed.push(rng()); mag.push(Math.pow(rng(), 3));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1)); geo.setAttribute('mag', new THREE.Float32BufferAttribute(mag, 1));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 }, px: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float seed; attribute float mag; uniform float t, px; varying float vA;
      void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); float tw = .55 + .45 * sin(t * (.7 + seed * 2.4) + seed * 41.);
        gl_PointSize = (1.2 + mag * 3.2) * px * (.8 + .2 * tw); vA = (.25 + .75 * mag) * (.35 + .65 * tw); }`,
    fragmentShader: `varying float vA; void main(){ vec2 d = gl_PointCoord - .5; float r = dot(d, d); if (r > .25) discard; gl_FragColor = vec4(vec3(.86, .9, 1.) * vA * smoothstep(.25, .0, r), 1.); }` });
  const stars = new THREE.Points(geo, mat); stars.renderOrder = -2; stars.frustumCulled = false; s.add(stars);
  const moonTex = (() => {
    const c = canvas(512, 512), g = c.getContext('2d');
    const halo = g.createRadialGradient(256, 256, 60, 256, 256, 256); halo.addColorStop(0, 'rgba(255,240,205,.34)'); halo.addColorStop(0.3, 'rgba(200,215,255,.07)'); halo.addColorStop(1, 'rgba(160,180,255,0)');
    g.fillStyle = halo; g.fillRect(0, 0, 512, 512); g.fillStyle = '#f2e8cc'; g.beginPath(); g.arc(256, 256, 96, 0, TAU); g.fill(); return tex(c);
  })();
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false }));
  moon.position.copy(moonAt); moon.scale.setScalar(9); moon.renderOrder = -1; s.add(moon);
  const ranges = new THREE.Mesh(new THREE.PlaneGeometry(110, 27.5), new THREE.MeshBasicMaterial({ map: back, transparent: true, depthWrite: false, fog: false }));
  ranges.position.set(0, backY, -46); ranges.renderOrder = -1; s.add(ranges);
  return (t) => { mat.uniforms.t.value = t; };
}
async function buildBakedStudyRoom() {
  const gltf = await loadBakedGLB(STUDY_ASSETS, STUDY_PRE);
  const s = bakedScene(gltf, 0x060a18);
  // light only for the live parts (coins, brush): the baked parts are unlit and ignore it
  s.add(new THREE.HemisphereLight(0xe8ecff, 0x5a4030, 1.4));
  const fx = [], warm = tentGlow('rgba(255,236,190,1)', 'rgba(255,170,80,.45)'), cool = tentGlow('rgba(225,235,255,1)', 'rgba(140,170,255,.35)'), flame = tentFlame();
  const sprite = (map, pos, size, color, kind) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(pos); sp.scale.setScalar(size); s.add(sp); const f = { sp, size, base: color.clone(), kind, seed: Math.random() * 100 }; fx.push(f); return f;
  };
  let paper = null, coins = null, desk = null, incense = null;
  gltf.scene.traverse((o) => {
    if (!o.name.startsWith('FX_')) return;
    const p = o.getWorldPosition(new THREE.Vector3()), n = o.name;
    if (n.startsWith('FX_candle')) { sprite(flame, p.clone().add(V(0, 0.006, 0)), 0.05, new THREE.Color(2.2, 1.7, 1.2), 'flame'); sprite(warm, p, 0.36, new THREE.Color(0.8, 0.5, 0.25), 'glow'); }
    else if (n.startsWith('FX_lantern_LanternLight')) sprite(warm, p, n.endsWith('Garden') ? 0.55 : 1.0, new THREE.Color(0.75, 0.45, 0.2), 'glow');   // the stone lantern in the garden is the small one
    else if (n.startsWith('FX_attic')) sprite(warm, p, 0.9, new THREE.Color(0.55, 0.35, 0.16), 'breath');
    else if (n === 'FX_finial') sprite(warm, p, 0.9, new THREE.Color(0.6, 0.42, 0.18), 'breath');
    else if (n === 'FX_window') sprite(cool, p.clone().add(V(0, 0, 0.3)), 1.5, new THREE.Color(0.16, 0.2, 0.3), 'breath');
    else if (n.startsWith('FX_ember')) sprite(warm, p, 0.04, new THREE.Color(1.2, 0.5, 0.2), 'ember');
    else if (n === 'FX_incense') incense = p.clone();
    else if (n === 'FX_paper') paper = p.clone();
    else if (n === 'FX_coins') coins = p.clone();
    else if (n === 'FX_desk') desk = p.clone();
  });
  const sky = studySky(s);
  // what you can touch: the desk, to step up to it
  const hidden = new THREE.MeshBasicMaterial({ visible: false }), d0 = desk ?? V(0, 1.14, -0.25);
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 0.8), hidden); table.position.set(d0.x, d0.y - 0.4, d0.z); table.userData.table = true; s.add(table);
  // the three coins, live: resting in their celadon dish until they're tossed; they land side by side on the strip of felt
  // in front of the paper, where a phone held upright still sees them (the dish and the felt left of the paper are out of its
  // view), lying on the felt and the paper's edge: never sunk in them (felt 4 mm, paper 4.5 mm over the desk; a coin is 3.2 mm)
  const dish = coins ?? V(-0.5, 1.18, 0.0), top = d0.y + 0.0225 + 0.0045 + 0.0016 + 0.0004, pp = paper ?? V(0.02, 1.165, -0.19);
  const coinRest = [V(-0.024, 0, -0.012), V(0.024, 0.0035, -0.014), V(0, 0.007, 0.026)].map((o) => dish.clone().add(o));
  const coinMeshes = coinRest.map((p, k) => { const m = makeCoin(); m.position.copy(p); m.rotation.y = k * 1.3; s.add(m); return m; });
  const coinLand = () => [0, 1, 2].map((k) => V(pp.x + (k - 1) * 0.09 + rnd(-0.012, 0.012), top, pp.z + 0.222 + rnd(-0.004, 0.004)));
  const dishHit = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), hidden); dishHit.position.copy(dish); dishHit.userData.coins = true; s.add(dishHit);
  let smokeT = 0;
  const update = (dt, t) => {
    fxPulse(fx, t); sky(t); updateLiuyao(dt);
    if (incense && (smokeT -= dt) < 0) { smokeT = 0.18; smoke.emit(tmpV.copy(incense).add(V(rnd(-0.004, 0.004), 0.01, rnd(-0.004, 0.004))), tmpW.set(rnd(-0.01, 0.01), rnd(0.05, 0.08), rnd(-0.01, 0.01)), { life: rnd(2.2, 3.2), size: 0.05, drag: 0.3, color: new THREE.Color(0.55, 0.55, 0.6) }); }
  };
  return { scene: s, table, hits: [dishHit, ...coinMeshes.flatMap((m) => m.children), table], warm: { intensity: 0 }, warmBase: 0, mobiles: [], flames: [], glow: [], baked: true, update, paper, coins, coinMeshes, coinRest, coinLand };
}

/* ---------- 六爻: three coins tossed six times, each line brushed onto the rice paper, bottom to top ---------- */
/** the line at the foot of every reading in the study; X is what it was read from */
const DISCLAIM = '这是照着X写的自我观照，不是预测，也不构成医疗、法律或投资建议。';
/** a coin face on canvas: copper with a raised rim and a square hole; the 字 side carries 太平通宝 read top, bottom, right, left */
function coinFace(word) {
  const c = canvas(256, 256), g = c.getContext('2d');
  const gr = g.createRadialGradient(110, 100, 10, 128, 128, 128); gr.addColorStop(0, '#c89a5a'); gr.addColorStop(0.7, '#8a5e2e'); gr.addColorStop(1, '#5a3a1a');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,226,170,.55)'; g.lineWidth = 9; g.beginPath(); g.arc(128, 128, 116, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(70,40,14,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(128, 128, 110, 0, TAU); g.stroke();
  g.fillStyle = 'rgba(255,226,170,.5)'; g.fillRect(88, 88, 80, 80); g.fillStyle = '#1a1008'; g.fillRect(98, 98, 60, 60);
  if (word) {
    g.fillStyle = '#3a220c'; g.font = `900 46px ${'"Noto Serif SC", serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    [[128, 58], [128, 198], [198, 128], [58, 128]].forEach(([x, y], i) => { g.fillStyle = 'rgba(255,226,170,.45)'; g.fillText(word[i], x + 1.5, y + 1.5); g.fillStyle = '#3a220c'; g.fillText(word[i], x, y); });
  }
  for (let i = 0; i < 300; i++) { const a = Math.random() * TAU, r = Math.random() * 120; g.fillStyle = `rgba(${Math.random() < 0.5 ? '40,60,40' : '255,230,190'},${Math.random() * 0.12})`; g.fillRect(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 2, 2); }
  return tex(c);
}
let STUDY_COIN_MATS = null;
/** a coin: two faces back to back (字 up, 背 down) round a thin rim, with the square hole cut through. A large one (as big as a
 * 当十 piece) and lit a little from within: this room has no reflections for metal to show, and it must read from across the desk */
function makeCoin() {
  STUDY_COIN_MATS ??= [coinFace('太平通宝'), coinFace(null)].map((map) => new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.45, metalness: 0.15, roughness: 0.5, alphaTest: 0.5, transparent: false }));
  const R = 0.032, shape = new THREE.Shape().absarc(0, 0, R, 0, TAU), hole = new THREE.Path(); const h = R * 0.235;
  hole.moveTo(-h, -h); hole.lineTo(h, -h); hole.lineTo(h, h); hole.lineTo(-h, h); hole.closePath(); shape.holes.push(hole);
  const face = new THREE.ShapeGeometry(shape, 24), uv = face.attributes.uv, pos = face.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / (2 * R), 0.5 + pos.getY(i) / (2 * R));
  const g = new THREE.Group(), T = 0.0016;
  const top = new THREE.Mesh(face, STUDY_COIN_MATS[0]); top.rotation.x = -Math.PI / 2; top.position.y = T; g.add(top);
  const bot = new THREE.Mesh(face, STUDY_COIN_MATS[1]); bot.rotation.x = Math.PI / 2; bot.position.y = -T; g.add(bot);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, 2 * T, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x9a6a34, emissive: 0x3a2410, metalness: 0.15, roughness: 0.5 })));
  return g;
}
const LINE_NAME = { 6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳' }, LINE_ORD = ['初', '二', '三', '四', '五', '上'];
const COIN_WORDS = { 6: '三枚皆字', 7: '两字一背', 8: '一字两背', 9: '三枚皆背' };
let liuyao = null;
/** the rice paper on the desk as a canvas the page can write on */
function studyPaper(R) {
  if (R.ink) return R.ink;
  const W = 1024, H = 694, c = canvas(W, H), g = c.getContext('2d'), t = tex(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.copy(R.paper ?? V(0.02, 1.165, -0.19)).add(V(0, 0.0015, 0)); m.renderOrder = 2; R.scene.add(m);
  return (R.ink = { c, g, t, m, W, H, clear() { g.clearRect(0, 0, W, H); t.needsUpdate = true; } });
}
/** one hexagram line brushed across the paper: a stroke with a heavier head and a dry, broken tail, drawn out over ms */
function brushLine(ink, i, yang, moving, ms = 650) {
  const { g, W, H } = ink, y = H * (0.86 - i * 0.135), x0 = W * 0.25, x1 = W * 0.71, gap = W * 0.07, th = H * 0.052;
  const segs = yang ? [[x0, x1]] : [[x0, (x0 + x1) / 2 - gap / 2], [(x0 + x1) / 2 + gap / 2, x1]];
  const seed = mulberry(1000 + i * 17 + (yang ? 1 : 0));
  const paint = (k) => {
    g.save(); g.beginPath(); g.rect(0, y - th * 1.4, x0 + (x1 - x0) * k + 4, th * 2.8); g.clip();
    for (const [a, b] of segs) {
      const r = mulberry(Math.floor(a));
      g.fillStyle = 'rgba(18,14,12,.92)'; g.beginPath();
      const n = 24; const top = [], bot = [];
      for (let j = 0; j <= n; j++) {
        const t = j / n, x = a + (b - a) * t, w = th * (0.5 + 0.18 * Math.sin(t * Math.PI) + (t < 0.08 ? 0.2 * (1 - t / 0.08) : 0) - (t > 0.9 ? 0.25 * (t - 0.9) / 0.1 : 0));
        top.push([x, y - w + (r() - 0.5) * 2.2]); bot.push([x, y + w + (r() - 0.5) * 2.2]);
      }
      g.moveTo(top[0][0] - th * 0.25, y); top.forEach(([x, yy]) => g.lineTo(x, yy)); g.lineTo(b + th * 0.15, y); bot.reverse().forEach(([x, yy]) => g.lineTo(x, yy)); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(239,232,214,.5)'; g.lineWidth = 1.2;                    // the dry streaks where the brush ran out
      for (let s = 0; s < 5; s++) { const yy = y + (seed() - 0.5) * th * 1.1, xs = a + (b - a) * (0.55 + seed() * 0.35); g.beginPath(); g.moveTo(xs, yy); g.lineTo(b, yy + (seed() - 0.5) * 2); g.stroke(); }
    }
    g.restore();
  };
  return new Promise((done) => {
    const t0 = performance.now(), step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms); paint(k); ink.t.needsUpdate = true;
      if (k < 1) requestAnimationFrame(step);
      else {
        g.font = `${Math.round(H * 0.05)}px ${'"Noto Serif SC", serif'}`; g.fillStyle = 'rgba(60,52,44,.55)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(LINE_ORD[i], W * 0.18, y);
        if (moving) { g.strokeStyle = 'rgba(168,40,28,.9)'; g.lineWidth = 5; const cx = W * 0.78, r = th * 0.75;   // ○ for an old yang, × for an old yin, in cinnabar
          g.beginPath(); if (yang) g.arc(cx, y, r, 0, TAU); else { g.moveTo(cx - r, y - r); g.lineTo(cx + r, y + r); g.moveTo(cx + r, y - r); g.lineTo(cx - r, y + r); } g.stroke(); }
        ink.t.needsUpdate = true; done();
      }
    };
    step();
  });
}
/** the brush hand on the paper; brushReady loads it for the characters first, since a canvas never redraws when a font
 * arrives late (most of 测字's characters sit in subsets that load only when asked for). A slow connection waits 2.5 s at most */
const BRUSH = "'Long Cang', 'LXGW WenKai TC', 'Kaiti SC', 'STKaiti', 'KaiTi', serif";
function brushReady(text) {
  const load = Promise.all([document.fonts.load("40px 'Long Cang'", text), document.fonts.load("40px 'LXGW WenKai TC'", text)]).catch(() => {});
  return Promise.race([load, new Promise((r) => setTimeout(r, 2500))]);
}
/** the hexagram's name written down the right edge of the paper once all six lines are in */
function brushName(ink, name) {
  const { g, W, H } = ink; g.fillStyle = 'rgba(18,14,12,.9)'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const fs = Math.round(H * 0.11); g.font = `${fs}px ${BRUSH}`;
  [...name].forEach((ch, k) => g.fillText(ch, W * 0.9, H * 0.22 + k * fs * 1.05));
  g.fillStyle = 'rgba(168,40,28,.85)'; g.fillRect(W * 0.9 - fs * 0.32, H * 0.22 + name.length * fs * 1.05 - fs * 0.2, fs * 0.64, fs * 0.64);      // a small seal under it
  ink.t.needsUpdate = true;
}
function startLiuyao() {
  const R = rooms.study;
  if (roomId !== 'study' || !R || busy || liuyao?.phase === 'toss' || cezi?.phase === 'write') return;
  if (!roomInside) { roomSit(); return; }
  hidePanel(); studyPaper(R).clear(); cezi = null;
  liuyao = { values: [], phase: 'ready', coins: R.coinMeshes };
  R.coinMeshes.forEach((m, k) => { m.position.copy(R.coinRest[k]); m.rotation.set(0, k * 1.3, 0); });
  toast('默念你的问题，掷六次铜钱，一爻一爻自下而上'); sfx('soft'); setUI('room');
}
/** one toss: the three coins jump out of the dish, turn over in the air and land; heads and tails decide the line */
function tossLiuyao() {
  const R = rooms.study, L = liuyao;
  if (!L || L.phase !== 'ready' || L.values.length >= 6) return;
  L.phase = 'toss'; sfx('coin'); setUI('room');
  const faces = [0, 1, 2].map(() => (Math.random() < 0.5 ? 2 : 3));                // 字 counts 2, 背 counts 3
  const land = R.coinLand();
  L.anim = R.coinMeshes.map((m, k) => {
    const from = m.position.clone(), to = land[k], up = faces[k] === 2;
    const axis = V(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(), turns = 2 + Math.floor(Math.random() * 3);
    return { m, from, to, t: -k * 0.06, dur: 0.8 + Math.random() * 0.15, axis, turns, up, yaw: Math.random() * TAU, clacked: false };
  });
  L.faces = faces;
}
function updateLiuyao(dt) {
  const L = liuyao; if (!L?.anim) return;
  let all = true;
  for (const a of L.anim) {
    a.t += dt; const k = Math.min(1, Math.max(0, a.t / a.dur)); if (k < 1) all = false;
    const e = 1 - (1 - k) * (1 - k);
    a.m.position.lerpVectors(a.from, a.to, e); a.m.position.y += Math.sin(Math.PI * k) * 0.22;
    const spin = new THREE.Quaternion().setFromAxisAngle(a.axis, (1 - easeIO(k)) * a.turns * TAU), rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(a.up ? 0 : Math.PI, a.yaw, 0, 'YXZ'));
    a.m.quaternion.copy(rest).premultiply(spin);
    if (k >= 1 && !a.clacked) { a.clacked = true; sfx('clack'); }
  }
  if (!all) return;
  L.anim = null; const v = L.faces.reduce((s, f) => s + f, 0); L.values.push(v);
  const i = L.values.length - 1, ink = studyPaper(rooms.study);
  toast(`${LINE_ORD[i]}爻 · ${COIN_WORDS[v]} · ${LINE_NAME[v]}${v === 6 || v === 9 ? '（动爻）' : ''}`);
  brushLine(ink, i, v % 2 === 1, v === 6 || v === 9).then(() => {
    if (L !== liuyao) return;
    if (L.values.length < 6) { L.phase = 'ready'; setUI('room'); return; }
    L.phase = 'done'; setUI('room');
    const r = castGua(L.values), name = guaFullName(r.ben); sfx('chime');
    brushReady(name).then(() => { if (L === liuyao) brushName(ink, name); });
    setTimeout(() => { if (L === liuyao) showGua(r); }, 700);
  });
}
function showGua(r) {
  const [, , , , image, key, line] = r.ben, moving = r.moving.map((i) => LINE_ORD[i]).join('、');
  const change = r.bian ? `<div class="gua-change"><b>动爻</b>　${moving}爻　→　<b>变卦　${guaFullName(r.bian)}</b>（${r.bian[5]}）<span>${r.bian[6]}</span></div>`
    : '<div class="gua-change"><b>六爻皆静</b>　没有动爻，只看本卦：不必找变化，先把眼前这一卦读透。</div>';
  showPanel(`<span class="seal">卦</span><small>六爻 · 本卦 · 第 ${r.ben[0]} 卦</small><h3>${guaFullName(r.ben)}${r.ben[7] ? `<span class="gua-alias">${r.ben[7]}</span>` : ''}</h3><p class="gua-image">象曰（节录）：${image}　·　${key}</p><p>${line}</p>${change}`
    + `<div class="note">卦名出自《周易》，象辞节录自《象传》（公有领域），关键词与解读为本书新写。<br>${DISCLAIM.replace('X', '卦象')}</div>`,
    [['再起一卦', () => { liuyao = null; startLiuyao(); }, true], ['收起', () => { hidePanel(); liuyao = null; setUI('room'); }]]);
  $('panel').classList.add('long');
}
function resetLiuyao() { liuyao = null; cezi = null; const R = rooms.study; if (R?.coinMeshes) R.coinMeshes.forEach((m, k) => { m.position.copy(R.coinRest[k]); m.rotation.set(0, k * 1.3, 0); }); R?.ink?.clear(); }

/* ---------- 测字: one character, chosen or typed, written large on the rice paper, then read ---------- */
let cezi = null;
/** the 字盘 and a box to type in */
function startCezi() {
  const R = rooms.study;
  if (roomId !== 'study' || !R || busy || (liuyao && liuyao.phase !== 'done') || cezi?.phase === 'write') return;
  if (!roomInside) { roomSit(); return; }
  const picks = [...CEZI_PICKS].map((c) => `<button type="button" class="zi" data-zi="${c}">${c}</button>`).join('');
  showPanel(`<span class="seal">字</span><small>测字 · 写下一个字</small><h3>心里浮现的是哪个字？</h3><p>默念你的心事，写下脑海里出现的第一个字，或者从下面挑一个。</p>`
    + `<div class="cezi-form"><input class="cezi-in" id="ceziIn" type="text" maxlength="4" autocomplete="off" spellcheck="false" placeholder="写一个字"></div><div class="zipan">${picks}</div><div class="note">只作自我观照，不是预测 · 写下的字只在这台设备上读，不会上传</div>`,
    [['写下这个字', () => writeCezi(ceziFirst($('ceziIn').value)), true], ['收起', () => { hidePanel(); setUI('room'); }]]);
  $('panel').querySelectorAll('.zi').forEach((b) => b.addEventListener('click', () => writeCezi(b.dataset.zi)));
  $('ceziIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') writeCezi(ceziFirst(e.target.value)); });
}
/** the character brushed onto the paper, then its reading */
function writeCezi(ch) {
  if (!ch) { toast('请写一个汉字'); return; }
  const ink = studyPaper(rooms.study), c = { phase: 'write', ch };
  hidePanel(); liuyao = null; cezi = c; ink.clear(); sfx('page'); setUI('room');
  brushReady(ch).then(() => { if (cezi === c) return brushChar(ink, ch); }).then(() => {
    if (cezi !== c) return;
    c.phase = 'done'; sfx('chime'); setUI('room');
    setTimeout(() => { if (cezi === c) showCezi(ceziRead(ch)); }, 600);
  });
}
/** a large character in brush script, revealed from the top down as if being written, and a seal beside it */
function brushChar(ink, ch, ms = 1400) {
  const { g, W, H } = ink, fs = Math.round(H * 0.74), off = canvas(W, H), o = off.getContext('2d');
  o.font = `${fs}px ${BRUSH}`; o.textAlign = 'center'; o.textBaseline = 'middle';
  o.fillStyle = 'rgba(18,14,12,.16)'; o.fillText(ch, W / 2 + 3, H * 0.52 + 3);                         // ink soaking into the paper round the strokes
  o.fillStyle = 'rgba(18,14,12,.93)'; o.fillText(ch, W / 2, H * 0.52);
  return new Promise((done) => {
    const t0 = performance.now(), step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms), y = H * (0.08 + 0.9 * easeIO(k));
      g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.rect(0, 0, W, y); g.clip(); g.drawImage(off, 0, 0); g.restore();
      ink.t.needsUpdate = true;
      if (k < 1) { requestAnimationFrame(step); return; }
      const s = H * 0.09; g.fillStyle = 'rgba(168,40,28,.86)'; g.fillRect(W * 0.8, H * 0.74, s, s);            // a small seal, bottom right
      g.fillStyle = 'rgba(246,236,214,.95)'; g.font = `${Math.round(s * 0.7)}px 'Noto Serif SC', serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('测', W * 0.8 + s / 2, H * 0.74 + s / 2);
      ink.t.needsUpdate = true; done();
    };
    step();
  });
}
/** the reading: how it comes apart (for the characters that have one), its radical's imagery, its stroke count; a heavy
 * character gets none of that imagery, only company */
function showCezi(r) {
  const known = !!r.strokes, heavy = r.tier === 'heavy';
  const head = known ? `测字 · ${r.rad}部 · ${r.strokes} 画` : '测字';
  const parts = r.parts ? `<p class="gua-image">拆字：${r.parts}</p>` : '';
  const main = r.line ?? (known || heavy ? r.open : `「${r.ch}」不在常用字表里，就从它给你的感觉去读吧：为什么偏偏是这个字浮上心头？`);
  const more = heavy ? `<div class="gua-change">${CEZI_CARE}</div>`
    : known ? `<div class="gua-change"><b>部首</b>　「${r.rad}${r.radAlt ? `（${r.radAlt}）` : ''}」，${r.family}<span><b>笔画</b>　${r.strokes} 画。${ceziStrokes(r.strokes)}</span></div>` : '';
  showPanel(`<span class="seal">字</span><small>${head}</small><h3 class="cezi-ch">${r.ch}</h3>${parts}<p>${main}</p>${more}`
    + `<div class="note">测字是民俗里的文字游戏：按形取象，不考声符；部首按康熙部首归类。解读为本书新写。<br>${DISCLAIM.replace('X', '字形')}</div>`,
    [['再测一字', startCezi, true], ['收起', () => { hidePanel(); setUI('room'); }]]);
  $('panel').classList.add('long');
}
