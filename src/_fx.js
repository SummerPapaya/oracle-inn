/* ================= magic: sparks, smoke, rune circles and a soft bloom ================= */

const SPARK_SCALE = { value: 400 };
const SPARK_VS = /* glsl */ `
attribute float aSize; attribute float aLife; attribute vec3 aColor; attribute float aSeed;
uniform float uScale; uniform float uTime; uniform float uSoft;
varying float vAlpha; varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float life = clamp(aLife, 0.0, 1.0);
  float tw = uSoft > 0.5 ? 1.0 : 0.65 + 0.35 * sin(uTime * 11.0 + aSeed * 60.0);
  vAlpha = (uSoft > 0.5 ? life * (1.0 - life) * 3.2 : min(1.0, life * 3.0)) * tw;
  vColor = aColor;
  float grow = uSoft > 0.5 ? 1.0 + (1.0 - life) * 2.6 : 0.45 + 0.55 * min(1.0, life * 2.0);
  gl_PointSize = life <= 0.0 ? 0.0 : max(1.0, aSize * grow * uScale / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const SPARK_FS = /* glsl */ `
uniform float uSoft; uniform float uFade;
varying float vAlpha; varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  if (r > 1.0) discard;
  float core = (1.0 - r) * (1.0 - r);
  float star = uSoft > 0.5 ? 0.0 : (max(0.0, 1.0 - abs(d.x) * 18.0) + max(0.0, 1.0 - abs(d.y) * 18.0)) * (1.0 - r);
  gl_FragColor = vec4(vColor, (core + star * 0.9) * vAlpha * uFade);
}`;
const GOLD = new THREE.Color(1.7, 1.25, 0.55), LILAC = new THREE.Color(1.15, 0.9, 1.8), MINT = new THREE.Color(0.8, 1.6, 1.25), ROSE = new THREE.Color(1.7, 0.9, 1.0), SMOKE = new THREE.Color(0.62, 0.6, 0.66);
const SPARK_COLORS = [GOLD, GOLD, LILAC, new THREE.Color(1.5, 1.45, 1.2)];

/** a pool of little lights: emitted, drifting, fading */
class Sparks {
  constructor(n, soft = false) {
    this.n = n; this.i = 0;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3);
    this.life = new Float32Array(n); this.rate = new Float32Array(n); this.size = new Float32Array(n);
    this.col = new Float32Array(n * 3); this.acc = new Float32Array(n); this.drag = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3));
    g.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(Float32Array.from({ length: n }, Math.random), 1));
    this.mat = new THREE.ShaderMaterial({ uniforms: { uScale: SPARK_SCALE, uTime: TIME, uSoft: { value: soft ? 1 : 0 }, uFade: { value: 1 } }, vertexShader: SPARK_VS, fragmentShader: SPARK_FS, transparent: true, depthWrite: false, blending: soft ? THREE.NormalBlending : THREE.AdditiveBlending });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }
  emit(p, v, o = {}) {
    const i = this.i++ % this.n, c = o.color ?? SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
    this.p[i * 3] = p.x; this.p[i * 3 + 1] = p.y; this.p[i * 3 + 2] = p.z;
    this.v[i * 3] = v.x; this.v[i * 3 + 1] = v.y; this.v[i * 3 + 2] = v.z;
    this.life[i] = 1; this.rate[i] = 1 / (o.life ?? 1.4); this.size[i] = o.size ?? 0.03; this.acc[i] = o.acc ?? 0; this.drag[i] = o.drag ?? 0.8;
    this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
  }
  update(dt) {
    const p = this.p, v = this.v;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= this.rate[i] * dt;
      if (this.life[i] <= 0) { this.life[i] = 0; continue; }
      const k = Math.max(0, 1 - this.drag[i] * dt);
      v[i * 3] *= k; v[i * 3 + 1] = v[i * 3 + 1] * k + this.acc[i] * dt; v[i * 3 + 2] *= k;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = a.aLife.needsUpdate = a.aSize.needsUpdate = a.aColor.needsUpdate = true;
  }
}
const rnd = (a, b) => a + Math.random() * (b - a);
const tmpV = new THREE.Vector3(), tmpW = new THREE.Vector3();
/** a puff of gold dust going up and out from a point */
function burstAt(sp, at, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rnd(0.2, 1) * (o.speed ?? 0.6);
    sp.emit(at, tmpW.set(Math.cos(a) * s, rnd(0.3, 1.2) * (o.up ?? 0.8), Math.sin(a) * s), { life: rnd(0.9, 1.8) * (o.life ?? 1), size: rnd(0.6, 1.4) * (o.size ?? 0.03), acc: o.acc ?? -0.25, drag: 1.4, color: o.color });
  }
}

/* ---------- the bloom ---------- */
let composer, renderPass, bloom, gtao, grade;
const lowPower = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;
/** a gentle grade before tone mapping: shadows a touch cooler, highlights a touch warmer, a little more colour */
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 1 } },
  vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float uAmount; varying vec2 vUv;\nvoid main() {\n  vec4 c = texture2D(tDiffuse, vUv);\n  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));\n  vec3 g = c.rgb;\n  g += (1.0 - smoothstep(0.0, 0.35, l)) * vec3(-0.006, 0.0, 0.018);\n  g *= mix(vec3(1.0), vec3(1.05, 1.0, 0.93), smoothstep(0.45, 1.6, l));\n  g = mix(vec3(l), g, 1.1);\n  g = max(g, 0.0);\n  gl_FragColor = vec4(mix(c.rgb, g, uAmount), c.a);\n}',
};
function setupComposer() {
  composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: lowPower ? 0 : 4 }));
  renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  // soft shadows where things meet, in the hut only (it costs a second pass of the scene)
  if (!lowPower) {
    gtao = new GTAOPass(scene, camera, 512, 512);
    gtao.blendIntensity = 0.85;
    gtao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.6, thickness: 2, scale: 1.1, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 });
    composer.addPass(gtao);
  }
  grade = new ShaderPass(GRADE); composer.addPass(grade);
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 1.12);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}
