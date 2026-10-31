/* ---------- the Nordic hearth baked in Blender (blender/build_hearth.py): a log cabin on a snowed-in island ---------- */
/*
 * Page 6's cabin in the round: logs with notched corners under a steep roof of snow and icicles, spruces, a frozen pond,
 * a snowman, a kick-sled, a reindeer by the window, the northern lights over snowy mountains and snow falling. Inside, the
 * fire in a whitewashed fireplace, a low table on a rag rug with a white cloth and the rune pouch. Two ways of asking:
 * 卢恩符文, one, three (the Norns) or nine runes cast on the cloth; and 新年浇锡, tin melted in a ladle over the fire,
 * poured into cold water and held up to the candle, its shadow on the white of the chimney breast read as an old saying.
 */
const HEARTH_ASSETS = 'hearth/', HEARTH_PRE = 'hearth_10311835';
const HEARTH_VIEW = {
  orbit: { at: V(0, 3.2, 0.3), narrowAt: V(0, 4.3, 0.3), orbit: { yaw: 0, pitch: 0.3, dist: 31, narrow: 1.2 }, yaw: 0.8, pitch: 0.2, fov: [44, 28] },
  inside: { eye: V(0, 2.25, 2.6), at: V(0, 1.5, -0.6), yaw: 0.7, pitch: 0.42, fov: [72, 50] },
};
/** the mountains beyond the island: two ranges of snowy peaks, the near one dark with forest at its foot; fading out below */
function hearthRanges() {
  const c = canvas(2048, 512), g = c.getContext('2d');
  const ridge = (base, amp, seed) => {                     // a jagged crest: the midpoint pushed up or down, halving each time
    const rr = mulberry(seed), n = 129, h = new Array(n).fill(0); h[0] = rr(); h[n - 1] = rr();
    for (let step = n - 1, a = 1; step > 1; step /= 2, a *= 0.55) for (let i = step / 2; i < n; i += step) h[i] = (h[i - step / 2] + h[i + step / 2]) / 2 + (rr() - 0.5) * a;
    return h.map((v, i) => [(i / (n - 1)) * 2048, base - amp * v]);
  };
  const range = (pts, top, bottom, y0, y1) => {
    const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 512); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(2048, 512); g.closePath(); g.fill();
  };
  range(ridge(340, 200, 61), '#66789a', '#18223a', 140, 340);
  const near = ridge(378, 90, 67); range(near, '#3c4a66', '#101828', 290, 400);
  const rr = mulberry(71); g.fillStyle = '#101a2c';
  for (let x = 0; x < 2048; x += 9 + rr() * 10) { const y = near[Math.min(128, Math.round((x / 2048) * 128))][1] + 40 + rr() * 30, h = 14 + rr() * 22; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + 6, y); g.lineTo(x - 6, y); g.fill(); }
  g.fillRect(0, 420, 2048, 92);
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(0, 400, 0, 505); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = fade; g.fillRect(0, 400, 2048, 112);
  g.globalCompositeOperation = 'source-over';
  return tex(c);
}
/*
 * The northern lights: curtains on a wide arc of sky behind the island, drawn by a shader so they keep moving. Nothing
 * in them repeats at a fixed spacing: each curtain's hem wanders, its height and brightness gather and thin by noise,
 * and its fine rays are noise too, drifting slowly sideways.
 */
function aurora(s) {
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: `uniform float t; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1.)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= .5; } return v; }
      void main(){
        vec3 c = vec3(0.);
        for (int k = 0; k < 3; k++) {
          float fk = float(k), x = vUv.x * 5. + fk * 5.7;
          // the hem meanders and folds, slowly; the curtain's height and its bright patches come and go along it
          float hem = .1 + .4 * fbm(vec2(x * .55 + t * .015, fk * 3.1)) + .06 * sin(x * 1.7 + 2. * fbm(vec2(x, t * .03)) + t * .05);
          float h = .1 + .38 * fbm(vec2(x * .9 - t * .01, fk + 4.));
          float b = smoothstep(.44, .7, fbm(vec2(x * .7 + t * .012, fk + 9.)));
          float y = vUv.y - hem;
          float body = smoothstep(-.008, .02, y) * exp(-max(y, 0.) / h * 2.2);
          // fine rays of any width, bent by a slow warp so they sway rather than march
          float r = fbm(vec2(x * 38. + t * .06 + 4. * fbm(vec2(x * 1.5, t * .02 + fk)), fk * 7.));
          float rays = .2 + 1.3 * pow(r, 2.2);
          vec3 tint = mix(vec3(.2, 1., .6), vec3(.72, .36, .96), smoothstep(.2, 1., max(y, 0.) / h));
          c += tint * body * b * rays * (k == 0 ? 1. : .7);
        }
        float edge = smoothstep(0., .14, vUv.x) * smoothstep(1., .86, vUv.x) * smoothstep(.98, .7, vUv.y);
        gl_FragColor = vec4(c * .75 * edge, 1.);
      }` });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(58, 58, 34, 64, 1, true, Math.PI - 1.4, 2.8), mat);
  m.position.set(0, 6, 0); m.renderOrder = -1.5; m.frustumCulled = false; s.add(m);
  return (t) => { mat.uniforms.t.value = t; };
}
/** snow falling over the island, drifting a little, round and round */
function snowfall(s) {
  const N = 900, pos = new Float32Array(N * 3), seed = new Float32Array(N), rr = mulberry(91);
  const under = (x, y, z) => Math.abs(x) < 3.2 && z > -2.6 && z < 2.5 && y < 7.6 - Math.abs(x) * 0.8;   // the cabin and its roof
  for (let i = 0; i < N; i++) { do { pos[i * 3] = rr() * 22 - 11; pos[i * 3 + 1] = rr() * 16; pos[i * 3 + 2] = rr() * 16 - 8; } while (under(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])); seed[i] = rr(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = canvas(32, 32), g = c.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.5, 'rgba(235,242,255,.6)'); r.addColorStop(1, 'rgba(235,242,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex(c), size: 0.07, transparent: true, depthWrite: false, opacity: 0.85 }));
  pts.frustumCulled = false; s.add(pts);
  return (dt, t) => {
    for (let i = 0; i < N; i++) {
      const k = i * 3, sd = seed[i];
      pos[k + 1] -= (0.35 + sd * 0.35) * dt; pos[k] += Math.sin(t * 0.6 + sd * 40) * 0.12 * dt; pos[k + 2] += Math.cos(t * 0.45 + sd * 23) * 0.08 * dt;
      if (pos[k + 1] < -0.2 || under(pos[k], pos[k + 1], pos[k + 2])) { pos[k + 1] = 15 + rr(); pos[k] = rr() * 22 - 11; pos[k + 2] = rr() * 16 - 8; }
    }
    geo.attributes.position.needsUpdate = true;
  };
}
async function buildBakedHearthRoom() {
  const gltf = await loadBakedGLB(HEARTH_ASSETS, HEARTH_PRE);
  const s = bakedScene(gltf, 0x08101e);
  s.add(new THREE.HemisphereLight(0xfff0e0, 0x403028, 1.1));               // only the live parts (runes, ladle, tin) are lit
  const fx = [], warm = tentGlow('rgba(255,236,190,1)', 'rgba(255,170,80,.45)'), cool = tentGlow('rgba(235,240,255,1)', 'rgba(150,180,255,.35)'), flame = tentFlame();
  const sprite = (map, pos, size, color, kind) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(pos); sp.scale.setScalar(size); s.add(sp); const f = { sp, size, base: color.clone(), kind, seed: Math.random() * 100 }; fx.push(f); return f;
  };
  const at = {}, chimneys = [];
  gltf.scene.traverse((o) => {
    if (!o.name.startsWith('FX_')) return;
    const p = o.getWorldPosition(new THREE.Vector3()), n = o.name;
    if (n === 'FX_candle_TinCandle') at.candle = p.clone();
    if (n.startsWith('FX_candle')) { sprite(flame, p.clone().add(V(0, 0.004, 0)), 0.045, new THREE.Color(2.2, 1.7, 1.2), 'flame'); sprite(warm, p, 0.3, new THREE.Color(0.8, 0.5, 0.25), 'glow'); }
    else if (n.startsWith('FX_lantern_LanternLightPost')) sprite(warm, p, 1.3, new THREE.Color(0.85, 0.55, 0.25), 'glow');
    else if (n.startsWith('FX_lantern')) sprite(warm, p, n.endsWith('Star') ? 0.9 : 0.5, new THREE.Color(0.75, 0.5, 0.25), 'glow');
    else if (n === 'FX_star') sprite(warm, p, 0.7, new THREE.Color(0.8, 0.55, 0.3), 'breath');
    else if (n.startsWith('FX_smoke')) chimneys.push(p.clone());
    else at[n.slice(3)] = p.clone();
  });
  const fire = at.fire ?? V(0, 0.82, -1.45), table = at.table ?? V(0, 0.9, 0), clothAt = at.cloth ?? V(-0.06, 0.902, 0.02), pouch = at.pouch ?? V(-0.52, 1.1, -0.26);
  const ladleAt = at.ladle ?? V(0.62, 0.53, -0.82), bucket = at.bucket ?? V(1.5, 0.72, -0.92), shadowAt = at.shadow ?? V(0, 2.92, -1.266);
  // the fire itself: tongues of flame of different sizes, a glow round them; a live warm light for the live things
  const tongues = [[0, 0, 0.36], [-0.11, -0.02, 0.26], [0.12, 0.02, 0.28], [0.04, 0.05, 0.2], [-0.05, 0.04, 0.22]].map(([x, z, sz]) => sprite(flame, fire.clone().add(V(x, sz * 0.32 - 0.12, z)), sz, new THREE.Color(1.9, 1.3, 0.75), 'flame'));
  sprite(warm, fire.clone().add(V(0, 0.05, 0.1)), 1.5, new THREE.Color(0.75, 0.42, 0.18), 'glow');
  const fireLight = new THREE.PointLight(0xffa058, 5, 7, 1.6); fireLight.position.copy(fire).add(V(0, 0.2, 0.5)); s.add(fireLight);
  const candleLight = new THREE.PointLight(0xffc888, 0.6, 2.5, 2); const candle = at.candle ?? V(0.52, 1.125, 0.28); candleLight.position.copy(candle); s.add(candleLight);
  const sky = nightSky(s, hearthRanges(), null, -9.6), lights = aurora(s), snow = snowfall(s);
  document.fonts.load('700 40px "Noto Serif SC"', NORNS.flat().join('')).catch(() => {});
  // what you can touch: the table to sit at, the cloth and the pouch, the ladle and the bucket, the fire, the dog, the reindeer
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const hit = (geo, p, key) => { const m = new THREE.Mesh(geo, hidden); m.position.copy(p); m.userData[key] = true; s.add(m); return m; };
  const tableHit = hit(new THREE.BoxGeometry(1.3, 0.5, 0.92), table.clone().add(V(0, -0.25, 0)), 'table');
  const pouchHit = hit(new THREE.SphereGeometry(0.13, 8, 6), pouch.clone().add(V(0, -0.1, 0)), 'pouch');
  const tinHits = [hit(new THREE.SphereGeometry(0.22, 8, 6), bucket, 'tin'), hit(new THREE.SphereGeometry(0.18, 8, 6), ladleAt, 'tin')];
  const fireHit = hit(new THREE.BoxGeometry(0.9, 0.8, 0.5), fire.clone().add(V(0, -0.05, 0.1)), 'fire');
  const dogHit = hit(new THREE.SphereGeometry(0.45, 8, 6), (at.dog ?? V(-0.73, 0.53, 0.84)).clone().add(V(-0.35, -0.1, -0.15)), 'dog');
  const deerHit = hit(new THREE.SphereGeometry(0.75, 8, 6), at.deer ?? V(4.35, 0.95, 1.35), 'deer');
  const C = hearthCloth(s, clothAt), L = hearthLadle(s, ladleAt), W = hearthShadow(s, shadowAt);
  // closer looks, each for a screen with the panel at the side and one with it below (as in the moonlit window)
  const look = (base, eye, at, fov, dx = 0) => ({ eye: base.clone().add(eye).setX(base.x + eye.x + dx), at: base.clone().add(at).setX(base.x + at.x + dx), yaw: 0.3, pitch: 0.25, fov: [fov, fov] });
  const views = {
    cloth: [look(clothAt, V(0, 0.82, 0.72), V(0, 0, -0.02), 44, 0.17), look(clothAt, V(0, 1.38, 1.02), V(0, 0, 0.5), 62)],
    hearth: [look(V(0.65, 0.68, -1.1), V(0.85, 1.05, 1.6), V(0, 0, 0), 46), look(V(0.72, 0.68, -1.1), V(0.3, 1.95, 3.15), V(0.05, -0.15, 0.3), 64)],
    shadow: [look(V(0.15, 2.4, -0.9), V(0.9, -0.15, 1.85), V(-0.15, 0.15, -0.2), 46, 0.3), look(V(0.15, 2.4, -0.9), V(0.65, 0.05, 2.7), V(-0.1, -0.15, 0.25), 66)],
  };
  let smokeT = 0;
  const update = (dt, t) => {
    fxPulse(fx, t); sky(t); lights(t); snow(dt, t);
    const fl = Math.sin(t * 9.3) * 0.5 + Math.sin(t * 23.1) * 0.3 + Math.sin(t * 3.7) * 0.2;
    fireLight.intensity = 5 * (1 + fl * 0.14); tongues.forEach((f, i) => { f.sp.position.y += Math.sin(t * (6 + i) + f.seed) * 0.0004; });
    if (Math.random() < dt * 14) sparks.emit(tmpV.copy(fire).add(V(rnd(-0.18, 0.18), 0.1, rnd(-0.08, 0.08))), tmpW.set(rnd(-0.03, 0.03), rnd(0.25, 0.5), rnd(-0.02, 0.04)), { life: rnd(0.6, 1.2), size: rnd(0.01, 0.018), color: EMBERS, drag: 0.4 });
    if ((smokeT -= dt) < 0) { smokeT = 0.22; for (const p of chimneys) smoke.emit(tmpV.copy(p).add(V(rnd(-0.04, 0.04), 0, rnd(-0.04, 0.04))), tmpW.set(rnd(0.03, 0.08), rnd(0.2, 0.3), rnd(-0.02, 0.02)), { life: rnd(3.5, 5), size: 0.24, drag: 0.15, color: new THREE.Color(0.3, 0.32, 0.4) }); }
    updateRuneStones(dt, t); updateTin(dt, t);
  };
  return { scene: s, table: tableHit, hits: [tableHit, pouchHit, C.mesh, ...tinHits, fireHit, dogHit, deerHit], warm: { intensity: 0 }, warmBase: 0, mobiles: [], flames: [], glow: [], baked: true, update,
    cloth: C, ladle: L, wall: W, at: { fire, table, cloth: clothAt, pouch, ladle: ladleAt, bucket, shadow: shadowAt, candle }, views };
}
const EMBERS = new THREE.Color(1.0, 0.55, 0.2);

/* ---------- the white cloth the runes fall on: linen, a red border stitched round it, the centre and the ring marked ---------- */
const CLOTH = 0.74, CLOTH_CENTER = 0.1, CLOTH_RING = 0.24, CLOTH_EDGE = CLOTH / 2;
function hearthCloth(s, at) {
  const c = canvas(1024, 1024), g = c.getContext('2d'), rr = mulberry(33), px = 1024 / CLOTH;
  g.fillStyle = '#f2ece0'; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1024; i += 3) { g.fillStyle = `rgba(150,130,100,${0.03 + rr() * 0.04})`; g.fillRect(i, 0, 1, 1024); g.fillRect(0, i, 1024, 1); }   // the weave
  g.strokeStyle = '#a8303a'; g.lineWidth = 10; g.strokeRect(46, 46, 932, 932);
  for (let i = 0; i < 40; i++) {                             // a band of little stitched diamonds inside the border
    for (const [x, y] of [[80 + i * 22, 80], [80 + i * 22, 944], [80, 80 + i * 22], [944, 80 + i * 22]]) { g.fillStyle = '#b8424a'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y); g.fill(); }
  }
  g.setLineDash([14, 10]); g.lineWidth = 4;
  g.strokeStyle = 'rgba(168,48,58,.55)'; g.beginPath(); g.arc(512, 512, CLOTH_CENTER * px, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(60,80,130,.45)'; g.beginPath(); g.arc(512, 512, CLOTH_RING * px, 0, TAU); g.stroke();
  g.setLineDash([]);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CLOTH, CLOTH), new THREE.MeshBasicMaterial({ map: tex(c), color: 0xe6d6c2 }));   // unlit, as the baked room is, warmed to the firelight
  mesh.rotation.x = -Math.PI / 2; mesh.position.copy(at).add(V(0, 0.002, 0)); mesh.userData.cloth = true; s.add(mesh);
  return { mesh, at: at.clone() };
}

/* ---------- the rune stones: 24 pebbles, each with its letter in gold on one face ---------- */
const RUNE_TEX = {};
function runeGlyphTex(i) {
  return (RUNE_TEX[i] ??= (() => {
    const c = canvas(128, 192), g = c.getContext('2d');
    g.strokeStyle = '#ffdc96'; g.lineWidth = 13; g.lineCap = g.lineJoin = 'round'; g.shadowColor = '#ffb050'; g.shadowBlur = 12;
    for (const st of RUNES_FUTHARK[i][8]) { g.beginPath(); for (let k = 0; k < st.length; k += 2) { const x = 14 + st[k] * 10, y = 16 + st[k + 1] * 10; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
    return tex(c);
  })());
}
const STONE_GEO = new THREE.SphereGeometry(1, 20, 12), GLYPH_GEO = new THREE.PlaneGeometry(0.034, 0.051).rotateX(-Math.PI / 2);
function runeStone(s, i) {
  const g = new THREE.Group(), tint = 0.9 + Math.random() * 0.2;
  const body = new THREE.Mesh(STONE_GEO, new THREE.MeshStandardMaterial({ color: new THREE.Color(0.52 * tint, 0.5 * tint, 0.47 * tint), roughness: 0.7 }));
  body.scale.set(0.029, 0.012, 0.037);
  const glyph = new THREE.Mesh(GLYPH_GEO, new THREE.MeshBasicMaterial({ map: runeGlyphTex(i), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.22, 0.18, 0.13) }));
  glyph.position.y = 0.0123; g.add(body, glyph); s.add(g);
  return { g, glyph, i, glow: 0, glowTo: 0 };
}
let rune = null;                           // the draw under way: { kind, phase, stones }
let runeForce = null;                      // tests can fix the next draw: a list of rune indices (and for nine, landings)
const RUNE_LAST = {};
function runeLine(i) { const lines = RUNES_FUTHARK[i][6]; let k; do k = Math.floor(Math.random() * lines.length); while (lines.length > 1 && k === RUNE_LAST[i]); RUNE_LAST[i] = k; return lines[k]; }
/** n different runes: the bag holds one stone of each */
function drawRunes(n) { const pool = RUNES_FUTHARK.map((_, i) => i); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; } return pool.slice(0, n); }
/** a stone's flight from the pouch to where it lands: an arc, turning over as it goes, then a little settle */
function flyStone(st, from, to, up, dur, delay, spins) {
  st.fly = { from: from.clone(), to: to.clone(), up, dur, t: -delay, spins, yaw: rnd(-0.5, 0.5) + (st.yaw ?? 0) };
  st.g.position.copy(from); st.g.visible = false;
}
function updateRuneStones(dt) {
  if (!rune) return;
  for (const st of rune.stones) {
    const f = st.fly;
    if (f) {
      f.t += dt; if (f.t < 0) continue;
      st.g.visible = true; const k = Math.min(1, f.t / f.dur), e = easeIO(k);
      st.g.position.lerpVectors(f.from, f.to, e); st.g.position.y += f.up * 4 * k * (1 - k);
      st.g.rotation.set(Math.PI * f.spins * (1 - e) + (st.down ? Math.PI : 0), f.yaw, 0);
      if (k >= 1) { st.fly = null; st.g.position.copy(f.to); sfx('clack'); if (rune.kind === 'nine') burstAt(sparks, f.to, 5, { speed: 0.03, up: 0.04, size: 0.006, life: 0.5 }); }
    }
    st.glow += (st.glowTo - st.glow) * Math.min(1, dt * 3);
    st.glyph.material.color.setRGB(0.22 + 1.58 * st.glow, 0.18 + 1.24 * st.glow, 0.13 + 0.67 * st.glow);   // a faint carving until it is read
  }
}
function clearRunes() {
  if (!rune) return;
  for (const st of rune.stones) { st.g.parent?.remove(st.g); st.g.children.forEach((m) => m.material.dispose()); }
  for (const m of rune.tags ?? []) { m.parent?.remove(m); m.material.map?.dispose(); m.material.dispose(); }
  rune = null;
}
async function flyHearth(kind) {
  const v = rooms.hearth.views[kind][matchMedia('(max-aspect-ratio: 1/1), (max-width: 760px)').matches ? 1 : 0];
  if (ROOM_VIEW.hearth === v || roomFly) return;
  busy = true; setUI('moving'); await flyRoom(v, 1000); busy = false;
}
function backToHearth() { return roomId === 'hearth' && roomInside && ROOM_VIEW.hearth !== HEARTH_VIEW.inside && !roomFly ? flyRoom(HEARTH_VIEW.inside, 900) : Promise.resolve(); }
function runeIntro() {
  if (roomId !== 'hearth' || busy || (rune && rune.phase !== 'done') || (tin && tin.phase !== 'done')) return;
  if (!roomInside) { roomSit(); return; }
  endTin(false);
  const [one, three, nine] = ['one', 'three', 'nine'].map((k) => RUNE_SPREADS[k]);
  showPanel(`<span class="seal">符</span><small>卢恩符文 · Runes</small><h3>摸几颗？</h3><p class="spread-pick"><b>${one[0]} · ${one[1]}</b>　${one[2]}<br><b>${three[0]} · ${three[1]}</b>　${three[2]}<br><b>${nine[0]} · ${nine[1]}</b>　${nine[2]}</p>`,
    [[`${one[0]} · ${one[1]}`, () => runeDraw('one')], [`${three[0]} · ${three[1]}`, () => runeDraw('three'), true], [`${nine[0]} · ${nine[1]}`, () => runeDraw('nine')]]);
}
async function runeDraw(kind) {
  if (roomId !== 'hearth' || !roomInside || busy) return;
  hidePanel(); clearRunes(); endTin(false);
  const R = rooms.hearth, c = R.at.cloth, from = R.at.pouch.clone().add(V(0, 0.04, 0)), n = { one: 1, three: 3, nine: 9 }[kind];
  const ids = runeForce?.ids ?? drawRunes(n), my = (rune = { kind, phase: 'drawing', stones: ids.map((i) => runeStone(R.scene, i)) });
  await flyHearth('cloth'); if (rune !== my) return;
  sfx('rattle'); setUI('room');
  if (kind === 'nine') {
    // a handful cast at once: they land scattered, some face down, a few off the cloth altogether
    const spots = runeForce?.spots ?? castSpots(9);
    my.stones.forEach((st, k) => { const [x, z, down] = spots[k]; st.down = down; st.yaw = rnd(-0.9, 0.9); st.spot = [x, z]; flyStone(st, from, c.clone().add(V(x, 0.012, z)), 0.22, 0.75 + Math.random() * 0.25, k * 0.05, 1 + Math.floor(Math.random() * 3)); });
    await wait(1600); if (rune !== my) return;
    my.stones.forEach((st) => { if (!st.down && onCloth(st.spot)) st.glowTo = 1; });
  } else {
    const xs = n === 1 ? [0] : [-0.2, 0, 0.2];
    for (let k = 0; k < n; k++) { flyStone(my.stones[k], from, c.clone().add(V(xs[k], 0.012, 0.02)), 0.16, 0.8, k * 0.55, 2); }
    await wait(900 + n * 550); if (rune !== my) return;
    for (const st of my.stones) { st.glowTo = 1; sfx('pop'); await wait(n === 1 ? 300 : 420); if (rune !== my) return; }
    if (n === 3) normTags(my);
  }
  runeForce = null; await wait(500); if (rune !== my) return;
  my.phase = 'done'; showRuneReading(my); setUI('room');
}
/** nine landing places: spread round the middle of the cloth, none on top of another; about half face up */
function castSpots(n) {
  const out = [];
  for (let tries = 0; out.length < n && tries < 400; tries++) {
    const r = Math.abs(rnd(-1, 1) + rnd(-1, 1)) * 0.2 + 0.02, a = rnd(0, TAU), x = Math.cos(a) * r, z = Math.sin(a) * r * 0.95;
    if (out.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.075)) continue;
    out.push([x, z, Math.random() < 0.45]);
  }
  return out;
}
const onCloth = ([x, z]) => Math.abs(x) < CLOTH_EDGE - 0.015 && Math.abs(z) < CLOTH_EDGE - 0.015;
function zoneOf([x, z]) { const d = Math.hypot(x, z); return !onCloth([x, z]) ? 'off' : d < CLOTH_CENTER ? 'center' : d < CLOTH_RING ? 'ring' : 'edge'; }
/** the Norns' names under the three stones, small, on the cloth */
function normTags(my) {
  my.tags = NORNS.map(([name, , gloss], k) => {
    const c = canvas(256, 96), g = c.getContext('2d'); g.textAlign = 'center'; g.fillStyle = '#7a2a30'; g.font = '700 40px "Noto Serif SC", serif'; g.fillText(name, 128, 44);
    g.fillStyle = '#6a5a48'; g.font = '500 28px "Noto Serif SC", serif'; g.fillText(gloss, 128, 84);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.064).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false }));
    m.position.copy(rooms.hearth.cloth.mesh.position).add(V(my.stones[k].g.position.x - rooms.hearth.cloth.mesh.position.x, 0.0015, my.stones[k].g.position.z - rooms.hearth.cloth.mesh.position.z + 0.075)); rooms.hearth.scene.add(m); return m;
  });
}
function showRuneReading(my) {
  sfx('chime');
  const R = (st) => RUNES_FUTHARK[st.i], btns = [['再摸一次', () => runeDraw(my.kind), true], ['换个抽法', () => { endRunes(false); runeIntro(); }], ['收起', () => endRunes()]];
  if (my.kind === 'one') {
    const [name, sound, meaning, key, image, reading] = R(my.stones[0]);
    showPanel(`<span class="seal">符</span><small>卢恩符文 · ${name} · 读作 ${sound}</small><h3>${key}</h3><p class="gua-image">${meaning}</p><p>${reading}</p><p class="ln-sentence">${runeLine(my.stones[0].i)}</p><p class="gua-image">${image}</p><div class="note">${RUNE_UI.note}</div>`, btns);
  } else if (my.kind === 'three') {
    const rows = my.stones.map((st, k) => `<b>${NORNS[k][0]} · ${NORNS[k][2]}</b>　${R(st)[0]}「${R(st)[3]}」`).join('<br>');
    const sentence = NORNS.map((n, k) => n[3].replace('X', R(my.stones[k])[7])).join('；') + '。';
    showPanel(`<span class="seal">符</span><small>卢恩符文 · 诺伦三女神</small><h3 style="letter-spacing:.04em">${my.stones.map((st) => R(st)[3]).join(' · ')}</h3><p class="spread-pick">${rows}</p><p class="ln-sentence">${sentence}</p><div class="note">${RUNE_UI.note}</div>`, btns);
  } else {
    const up = my.stones.filter((st) => !st.down && onCloth(st.spot)), by = { center: [], ring: [], edge: [] };
    up.forEach((st) => by[zoneOf(st.spot)]?.push(st));
    by.ring.sort((a, b) => clockOf(a.spot) - clockOf(b.spot));
    const lines = [];
    if (!up.length) lines.push(RUNE_CAST.none);
    else {
      for (const z of ['center', 'ring', 'edge']) { if (by[z].length) lines.push(`${RUNE_CAST[z][1]}：${by[z].map((st) => R(st)[7]).join('、')}。`); else if (z === 'center') lines.push(RUNE_CAST.emptyCenter); }
      if (up.length < 9) lines.push(RUNE_CAST.down);
    }
    const head = by.center.length ? by.center.map((st) => R(st)[3]).join(' · ') : up.length ? '先看四周' : '改天再撒';
    const list = up.map((st) => `${R(st)[0]}「${R(st)[3]}」`).join('　');
    showPanel(`<span class="seal">符</span><small>卢恩符文 · 白布撒落 · 朝上 ${up.length} 颗</small><h3>${head}</h3>${list ? `<p class="gua-image">${list}</p>` : ''}${lines.map((l) => `<p class="ln-sentence">${l}</p>`).join('')}<div class="note">${RUNE_UI.note}</div>`, btns);
    $('panel').classList.add('long');
  }
}
/** a ring position as a clock hand from twelve (the far side of the cloth), clockwise */
function clockOf([x, z]) { const a = Math.atan2(x, -z); return a < 0 ? a + TAU : a; }
function endRunes(fly = true) {
  clearRunes(); hidePanel();
  if (fly) backToHearth().then(() => setUI('room')); setUI('room');
}

/* ---------- 新年浇锡: the ladle, the tin melting in it, the cold water, the shadow on the wall ---------- */
function hearthLadle(s, rest) {
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 0.7, roughness: 0.45 }), wood = new THREE.MeshStandardMaterial({ color: 0x7a5034, roughness: 0.7 });
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 10, 0, TAU, Math.PI / 2, Math.PI / 2), iron); bowl.material.side = THREE.DoubleSide;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.004, 6, 24).rotateX(Math.PI / 2), iron);
  // the handle runs from the rim up and away to the wooden grip (tilted -(π/2 - 0.25) about z, so its near end meets the rim)
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 6).rotateZ(0.25 - Math.PI / 2).translate(0.3, 0.06, 0), iron);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.16, 8).rotateZ(0.25 - Math.PI / 2).translate(0.6, 0.135, 0), wood);
  // the tin in the bowl: a little horseshoe first, then a bright pool as it melts
  const shoe = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0075, 8, 20, Math.PI * 1.35).rotateX(Math.PI / 2).rotateY(0.6), new THREE.MeshStandardMaterial({ color: 0xd0d4dc, metalness: 0.35, roughness: 0.3, emissive: 0x24262c }));
  shoe.position.y = -0.03;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.044, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe0e4ea, metalness: 0.4, roughness: 0.15, emissive: 0xff7a30, emissiveIntensity: 0 }));
  pool.position.y = -0.012; pool.scale.setScalar(0.01);
  g.add(bowl, rim, handle, grip, shoe, pool); g.position.copy(rest).add(V(0, 0.05, 0)); g.rotation.order = 'YXZ'; g.rotation.y = -0.6; s.add(g);
  return { g, shoe, pool, rest: g.position.clone(), restYaw: -0.6, tw: null };
}
/** move the ladle to a place, turned (yaw) and tipped about its own handle (tip), over ms */
function ladleTo(L, pos, yaw, tip, ms) {
  return new Promise((done) => { L.tw = { t: 0, ms, from: L.g.position.clone(), to: pos.clone(), y0: L.g.rotation.y, y1: yaw, x0: L.g.rotation.x, x1: tip, done }; });
}
/** the wall where the shadow falls: a warm patch of candlelight, the shadow drawn over it */
function hearthShadow(s, at) {
  const lit = canvas(256, 256), g = lit.getContext('2d'), r = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,200,130,.5)'); r.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), new THREE.MeshBasicMaterial({ map: tex(lit), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  const c = canvas(512, 512), map = tex(c);
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, color: 0x2a1c14, opacity: 0 }));
  glow.position.copy(at).add(V(0, 0, 0.004)); shade.position.copy(at).add(V(0, 0, 0.006)); s.add(glow, shade);
  return { glow, shade, c, map, at: at.clone(), show: 0, showTo: 0 };
}
/* the outlines the shadow can take, in a box -1..1, y up: some borrowed from the tea leaves, the rest drawn here */
const TIN_ART = (() => {
  const arc = (cx, cy, r, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * (i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const T = TEA_SHAPES;
  return {
    ship: T.boat, heart: T.heart, ring: T.ring, star: T.star, crescent: T.moon, sun: T.sun, bird: T.bird, fish: T.fish, key: T.key, house: T.house, mountain: T.mountain,
    bridge: T.bridge, flower: T.flower, feather: T.feather, crown: T.crown,
    horse: { fill: [[[-0.6, 0.0], [0.25, 0.05], [0.45, 0.55], [0.75, 0.6], [0.7, 0.4], [0.45, 0.3], [0.4, -0.15], [-0.55, -0.2]]], strokes: [[[-0.5, -0.15], [-0.6, -0.8]], [[-0.3, -0.15], [-0.25, -0.8]], [[0.15, -0.1], [0.12, -0.8]], [[0.35, -0.1], [0.42, -0.8]], [[-0.6, 0.0], [-0.85, -0.35]]] },
    reindeer: { fill: [[[-0.6, -0.15], [0.3, -0.1], [0.5, 0.25], [0.72, 0.28], [0.68, 0.1], [0.42, -0.05], [0.38, -0.35], [-0.55, -0.4]]], strokes: [[[-0.5, -0.35], [-0.52, -0.95]], [[-0.3, -0.35], [-0.28, -0.95]], [[0.15, -0.3], [0.13, -0.95]], [[0.32, -0.3], [0.36, -0.95]], [[0.5, 0.3], [0.4, 0.65], [0.2, 0.85]], [[0.45, 0.5], [0.62, 0.7]], [[0.6, 0.3], [0.72, 0.62], [0.95, 0.75]]] },
    bear: { fill: [arc(-0.05, -0.1, 0.55, 0, TAU, 24), arc(0.55, 0.15, 0.28, 0, TAU, 16), arc(0.48, 0.42, 0.1, 0, TAU, 8), arc(0.72, 0.38, 0.1, 0, TAU, 8), [[-0.45, -0.4], [-0.3, -0.85], [-0.1, -0.85], [-0.1, -0.4]], [[0.15, -0.4], [0.25, -0.85], [0.45, -0.85], [0.4, -0.35]]] },
    swan: { fill: [[[-0.85, -0.2], [0.2, -0.25], [0.55, -0.05], [0.3, 0.05], [-0.4, 0.05]], [[0.1, -0.1], [0.25, 0.3], [0.2, 0.65], [0.38, 0.8], [0.6, 0.72], [0.4, 0.62], [0.36, 0.3], [0.3, -0.1]]] },
    pine: { fill: [[[0, 0.95], [0.35, 0.45], [0.18, 0.45], [0.55, -0.05], [0.3, -0.05], [0.72, -0.55], [-0.72, -0.55], [-0.3, -0.05], [-0.55, -0.05], [-0.18, 0.45], [-0.35, 0.45]]], strokes: [[[0, -0.55], [0, -0.95]]] },
    door: { fill: [[[-0.45, -0.9], [0.45, -0.9], [0.45, 0.45], ...arc(0, 0.45, 0.45, 0, Math.PI, 14).slice(1), [-0.45, 0.45]]], strokes: [[[0.25, -0.15], [0.3, -0.15]]] },
    cloud: { fill: [arc(-0.45, -0.1, 0.32, 0, TAU, 16), arc(0, 0.12, 0.42, 0, TAU, 18), arc(0.45, -0.05, 0.34, 0, TAU, 16), [[-0.75, -0.42], [0.8, -0.42], [0.8, -0.1], [-0.75, -0.1]]] },
    wave: { strokes: [Array.from({ length: 30 }, (_, i) => { const x = -0.95 + i * 0.066; return [x, 0.15 * Math.sin(x * 4.2) + 0.1]; }), Array.from({ length: 30 }, (_, i) => { const x = -0.9 + i * 0.062; return [x, 0.15 * Math.sin(x * 4.2 + 1) - 0.35]; })] },
    flame: { fill: [[[0, 0.95], [0.25, 0.5], [0.5, 0.15], [0.48, -0.35], [0.25, -0.7], [0, -0.8], [-0.25, -0.7], [-0.48, -0.35], [-0.45, 0.05], [-0.2, 0.3], [-0.12, 0.62]]] },
    snowflake: { strokes: Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * TAU; return [[0, 0], [Math.cos(a) * 0.9, Math.sin(a) * 0.9]]; }).concat(Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * TAU, p = [Math.cos(a) * 0.55, Math.sin(a) * 0.55]; return [[p[0] + Math.cos(a + 0.9) * 0.22, p[1] + Math.sin(a + 0.9) * 0.22], p, [p[0] + Math.cos(a - 0.9) * 0.22, p[1] + Math.sin(a - 0.9) * 0.22]]; })) },
    book: { fill: [[[-0.9, -0.5], [-0.05, -0.62], [-0.05, 0.55], [-0.9, 0.62]], [[0.05, -0.62], [0.9, -0.5], [0.9, 0.62], [0.05, 0.55]]] },
    cup: { fill: [[[-0.5, 0.45], [0.5, 0.45], [0.4, -0.55], [-0.4, -0.55]], [[-0.6, -0.55], [0.6, -0.55], [0.6, -0.7], [-0.6, -0.7]]], strokes: [arc(0.55, 0.0, 0.25, -Math.PI / 2, Math.PI / 2, 12)] },
    lantern: { fill: [[[-0.35, -0.7], [0.35, -0.7], [0.4, 0.35], [-0.4, 0.35]], [[-0.5, 0.35], [0.5, 0.35], [0, 0.65]]], strokes: [arc(0, 0.72, 0.15, 0, TAU, 12), [[-0.42, -0.75], [0.42, -0.75]]] },
    egg: { fill: [Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * TAU, y = Math.sin(a); return [Math.cos(a) * 0.55 * (1 - 0.18 * y), y * 0.8]; })] },
    blob: { fill: [Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * TAU, r = 0.55 + 0.18 * Math.sin(a * 3 + 1) + 0.1 * Math.sin(a * 5); return [Math.cos(a) * r, Math.sin(a) * r * 0.85]; })] },
  };
})();
/** a shape's silhouette into a canvas, s pixels across, as poured metal: thick, its ends blobbed, a few drips; pieces cut */
function paintTin(g, shape, size, rr, finish) {
  const P = ([x, y]) => [size / 2 + x * size * 0.42, size / 2 - y * size * 0.42];
  g.fillStyle = g.strokeStyle = '#fff'; g.lineCap = g.lineJoin = 'round'; g.lineWidth = size * 0.1;
  for (const line of shape.strokes ?? []) { g.beginPath(); line.forEach((p, i) => { const [x, y] = P(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); const [ex, ey] = P(line[line.length - 1]); g.beginPath(); g.arc(ex, ey, size * 0.06, 0, TAU); g.fill(); }
  for (const poly of shape.fill ?? []) { g.beginPath(); poly.forEach((p, i) => { const [x, y] = P(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); g.fill(); g.stroke(); }
  for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(size * (0.2 + rr() * 0.6), size * (0.2 + rr() * 0.6), size * (0.02 + rr() * 0.03), 0, TAU); g.fill(); }
  if (finish === '碎成几块') { g.globalCompositeOperation = 'destination-out'; g.lineWidth = size * 0.035; for (let k = 0; k < 2; k++) { const a = rr() * Math.PI; g.beginPath(); g.moveTo(size / 2 - Math.cos(a) * size, size / 2 - Math.sin(a) * size + (k - 0.5) * size * 0.3); g.lineTo(size / 2 + Math.cos(a) * size, size / 2 + Math.sin(a) * size + (k - 0.5) * size * 0.3); g.stroke(); } g.globalCompositeOperation = 'source-over'; }
  if (finish === '满是小气泡') { g.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 26; k++) { g.beginPath(); g.arc(size * rr(), size * rr(), size * (0.006 + rr() * 0.01), 0, TAU); g.fill(); } g.globalCompositeOperation = 'source-over'; }
}
/** the cast tin: a little relief of the silhouette, thicker where the metal pooled, cut out by the same mask */
function tinPiece(s, shapeKey, finish) {
  const rr = mulberry(Math.floor(Math.random() * 1e6)), N = 96, mc = canvas(N, N), mg = mc.getContext('2d');
  paintTin(mg, TIN_ART[shapeKey], N, rr, finish);
  // blur the mask a little by drawing it small and back up, then use it as both the cut-out and the height
  const sm = canvas(24, 24), sg = sm.getContext('2d'); sg.drawImage(mc, 0, 0, 24, 24);
  const bl = canvas(N, N), bg = bl.getContext('2d'); bg.imageSmoothingEnabled = true; bg.drawImage(sm, 0, 0, N, N);
  const hd = bg.getImageData(0, 0, N, N).data, md = mg.getImageData(0, 0, N, N).data;
  const thick = { 又厚又沉: 0.018, 薄得透光: 0.005 }[finish] ?? 0.01, size = 0.2, seg = 48;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / size + 0.5, v = 0.5 - pos.getY(i) / size, px = Math.max(0, Math.min(N - 1, Math.floor(u * N))), py = Math.max(0, Math.min(N - 1, Math.floor(v * N))), k = (py * N + px) * 4;
    const h = (hd[k + 3] / 255) * 0.6 + (md[k + 3] / 255) * 0.4;
    pos.setZ(i, h * thick * (0.75 + 0.5 * rr()) - thick * 0.3);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xd4d8e0, metalness: 0.35, roughness: finish === '光滑发亮' ? 0.2 : finish === '满是小气泡' ? 0.55 : 0.34, emissive: 0x2a2c32, alphaMap: tex(mc), alphaTest: 0.45, side: THREE.DoubleSide }));
  s.add(m); return { m, mask: mc };
}
/** draw the shadow: the silhouette, soft-edged, a little bigger than the tin and a little blurred, on the wall */
function paintShadow(W, mask) {
  const g = W.c.getContext('2d'); g.clearRect(0, 0, 512, 512);
  const sm = canvas(64, 64); sm.getContext('2d').drawImage(mask, 0, 0, 64, 64);
  g.imageSmoothingEnabled = true; g.globalAlpha = 0.55; g.drawImage(sm, 40, 40, 432, 432); g.globalAlpha = 0.9; g.drawImage(mask, 56, 56, 400, 400); g.globalAlpha = 1;
  W.map.needsUpdate = true;
}
let tin = null;                            // the casting under way: { phase, shape, finish, piece }
let tinForce = null;                       // tests can fix the next casting: [shape index, finish index]
function tinIntro() {
  if (roomId !== 'hearth' || busy || (tin && tin.phase !== 'done') || (rune && rune.phase !== 'done')) return;
  if (!roomInside) { roomSit(); return; }
  endRunes(false); endTin(false);
  showPanel(`<span class="seal">锡</span><small>新年浇锡 · Uudenvuodentina</small><h3>浇一勺新年的锡</h3><p>${TIN_UI.intro}</p>`, [['熔锡', tinMelt, true], ['收起', hidePanel]]);
}
async function tinMelt() {
  if (roomId !== 'hearth' || !roomInside || busy || (tin && tin.phase !== 'done')) return;
  hidePanel(); endTin(false); endRunes(false);
  const R = rooms.hearth, L = R.ladle, my = (tin = { phase: 'melting' });
  L.shoe.visible = true; L.shoe.scale.setScalar(1); L.pool.scale.setScalar(0.01); L.pool.material.emissiveIntensity = 0;
  await flyHearth('hearth'); if (tin !== my) return; setUI('room');
  sfx('soft'); await ladleTo(L, R.at.fire.clone().add(V(0.04, -0.1, 0.1)), -0.9, 0, 1300); if (tin !== my) return;
  sfx('crackle'); my.melt = 0; await wait(2600); if (tin !== my) return;
  my.phase = 'molten'; sfx('pop'); setUI('room');
}
async function tinPour() {
  const my = tin; if (!my || my.phase !== 'molten' || busy) return;
  const R = rooms.hearth, L = R.ladle; my.phase = 'pouring'; setUI('room');
  await ladleTo(L, R.at.bucket.clone().add(V(-0.04, 0.28, 0.02)), -1.2, 0, 1000); if (tin !== my) return;
  await ladleTo(L, L.g.position.clone(), -1.2, -1.1, 450); if (tin !== my) return;
  L.pool.scale.setScalar(0.01); sfx('hiss');
  for (let k = 0; k < 26; k++) sparks.emit(tmpV.copy(R.at.bucket).add(V(rnd(-0.03, 0.03), 0.18 + rnd(0, 0.06), rnd(-0.03, 0.03))), tmpW.set(rnd(-0.05, 0.05), rnd(-0.6, -0.3), rnd(-0.05, 0.05)), { life: 0.35, size: 0.012, color: EMBERS });
  for (let k = 0; k < 10; k++) smoke.emit(tmpV.copy(R.at.bucket).add(V(rnd(-0.08, 0.08), 0.02, rnd(-0.08, 0.08))), tmpW.set(rnd(-0.04, 0.04), rnd(0.25, 0.45), rnd(-0.04, 0.04)), { life: rnd(1.2, 2), size: 0.16, drag: 0.4, color: new THREE.Color(0.8, 0.82, 0.86) });
  await wait(700); if (tin !== my) return;
  await ladleTo(L, L.rest, L.restYaw, 0, 900); if (tin !== my) return;
  my.phase = 'cast'; setUI('room');
}
async function tinLift() {
  const my = tin; if (!my || my.phase !== 'cast' || busy) return;
  const R = rooms.hearth, [si, fi] = tinForce ?? [Math.floor(Math.random() * TIN_SHAPES.length), Math.floor(Math.random() * TIN_FINISH.length)];
  tinForce = null; my.shape = si; my.finish = fi; my.phase = 'lifting'; setUI('room');
  const P = tinPiece(R.scene, TIN_SHAPES[si][1], TIN_FINISH[fi][0]); my.piece = P;
  // held up in front of the candle, over the mantel, so its shadow falls on the white of the chimney breast
  const from = R.at.bucket.clone().add(V(0, 0.05, 0)), hold = R.at.shadow.clone().add(V(0.24, -0.4, 0.8));
  P.m.position.copy(from); P.m.lookAt(camera.position); my.lift = { t: 0, ms: 1700, from, to: hold };
  paintShadow(R.wall, P.mask);
  await flyHearth('shadow'); if (tin !== my) return;
  await wait(1000); if (tin !== my) return;
  R.wall.showTo = 1; sfx('pop'); await wait(1400); if (tin !== my) return;
  my.phase = 'done'; showTinReading(my); setUI('room');
}
function showTinReading(my) {
  const [name, , line] = TIN_SHAPES[my.shape], [fname, fline] = TIN_FINISH[my.finish];
  sfx('chime');
  showPanel(`<span class="seal">锡</span><small>新年浇锡 · 墙上的影子像</small><h3>${name}</h3><p class="gua-image">${TIN_UI.lead}</p><p>${line}</p><p class="gua-image">锡面 · ${fname}</p><p>${fline}</p><div class="note">${TIN_UI.note}</div>`,
    [['再浇一勺', tinMelt, true], ['收起', () => endTin()]]);
}
function updateTin(dt, t) {
  const R = rooms.hearth; if (!R) return;
  const L = R.ladle, tw = L.tw;
  if (tw) {
    tw.t += dt * 1000; const k = Math.min(1, tw.t / tw.ms), e = easeIO(k);
    L.g.position.lerpVectors(tw.from, tw.to, e); L.g.position.y += Math.sin(Math.PI * k) * 0.08 * tw.from.distanceTo(tw.to);
    L.g.rotation.y = tw.y0 + (tw.y1 - tw.y0) * e; L.g.rotation.x = tw.x0 + (tw.x1 - tw.x0) * e;
    if (k >= 1) { L.tw = null; tw.done(); }
  }
  if (tin?.melt !== undefined && tin.melt < 1) {
    tin.melt = Math.min(1, tin.melt + dt / 2.4); const m = tin.melt;
    L.shoe.scale.setScalar(Math.max(0.01, 1 - m)); L.shoe.visible = m < 0.98; L.pool.scale.setScalar(0.2 + 0.8 * m); L.pool.material.emissiveIntensity = 0.9 * m;
    if (m >= 1) delete tin.melt;
  }
  if (tin?.phase === 'molten' && Math.random() < dt * 6) sparks.emit(tmpV.copy(L.g.position).add(V(0, 0.01, 0)), tmpW.set(rnd(-0.02, 0.02), rnd(0.05, 0.12), rnd(-0.02, 0.02)), { life: 0.6, size: 0.008, color: EMBERS });
  const lf = tin?.lift, P = tin?.piece;
  if (lf && P) {
    lf.t += dt * 1000; const k = Math.min(1, lf.t / lf.ms), e = easeIO(k);
    P.m.position.lerpVectors(lf.from, lf.to, e); P.m.position.y += Math.sin(Math.PI * k) * 0.15;
    P.m.lookAt(camera.position); P.m.rotateZ(Math.sin(t * 0.8) * 0.05);       // turned to you, the same way round as its shadow
    if (k >= 1) { P.m.position.y = lf.to.y + Math.sin(t * 1.3) * 0.004; }
    if (Math.random() < dt * 3) sparks.emit(tmpV.copy(P.m.position), tmpW.set(0, 0.02, 0), { life: 0.7, size: 0.005, color: MINT, drag: 0.4 });
  }
  const W = R.wall; W.show += (W.showTo - W.show) * Math.min(1, dt * 2.5);
  const fl = 1 + Math.sin(t * 11) * 0.025 + Math.sin(t * 4.3) * 0.02;   // the candle flickers, and the shadow with it
  W.shade.material.opacity = 0.85 * W.show; W.glow.material.opacity = W.show; W.shade.scale.setScalar(fl); W.shade.position.x = W.at.x + Math.sin(t * 5.1) * 0.004;
}
/** the tin put by: the shadow fades, the piece goes, the ladle back on the hearth */
function endTin(fly = true) {
  const R = rooms.hearth;
  if (tin?.piece) { tin.piece.m.parent?.remove(tin.piece.m); tin.piece.m.geometry.dispose(); tin.piece.m.material.alphaMap?.dispose(); tin.piece.m.material.dispose(); }
  tin = null; hidePanel();
  if (R) { R.wall.showTo = 0; const L = R.ladle; L.tw = null; L.g.position.copy(L.rest); L.g.rotation.set(0, L.restYaw, 0, 'YXZ'); L.shoe.visible = true; L.shoe.scale.setScalar(1); L.pool.scale.setScalar(0.01); L.pool.material.emissiveIntensity = 0; }
  if (fly) backToHearth().then(() => setUI('room')); setUI('room');
}
function resetHearth() { endRunes(false); endTin(false); }
/** the buttons along the bottom while a reading is under way; true when they take the place of the room's own */
function hearthButtons(act, hint) {
  if (rune && rune.phase !== 'done') { hint.textContent = rune.kind === 'nine' ? '九颗符文石撒在了白布上……' : '符文石一颗一颗从皮袋里出来……'; return true; }
  if (!tin || tin.phase === 'done') return false;
  if (tin.phase === 'melting') { hint.textContent = TIN_UI.melt; return true; }
  if (tin.phase === 'molten') { hint.textContent = TIN_UI.pour; act.append(button('倒进水里', tinPour, true), button('放下锡勺', () => endTin())); return true; }
  if (tin.phase === 'pouring') { hint.textContent = '嗤——'; return true; }
  if (tin.phase === 'cast') { hint.textContent = TIN_UI.lift; act.append(button('举到烛光前', tinLift, true), button('放下锡勺', () => endTin())); return true; }
  if (tin.phase === 'lifting') { hint.textContent = TIN_UI.shadow; return true; }
  return false;
}
/** a tap in the cabin: the dog, the reindeer, the fire, the cloth or the pouch, the ladle or the bucket, or the table */
function hearthTap(hit) {
  const u = hit.object.userData;
  if (u.dog) { sfx('thump'); toast('大狗翻了个身，尾巴在地板上拍了两下'); return; }
  if (u.deer) { sfx('jingle'); toast('驯鹿抬起头，鼻尖上落了一片雪'); return; }
  if (u.fire) { sfx('crackle'); burstAt(sparks, rooms.hearth.at.fire.clone().add(V(0, 0.15, 0.1)), 24, { speed: 0.12, up: 0.4, size: 0.012, life: 0.9, color: EMBERS }); toast('炉火噼啪响了一声，飞起几点火星'); return; }
  if (!roomInside) { roomSit(); return; }
  if (tin && tin.phase !== 'done') { if (tin.phase === 'molten') tinPour(); else if (tin.phase === 'cast') tinLift(); return; }
  if (rune && rune.phase !== 'done') return;
  if (u.tin) tinIntro(); else runeIntro();
}
