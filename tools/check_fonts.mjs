// Lists the characters that would fall back to a system font: reads the glyphs actually in public/vendor/fonts/*.woff2
// (their cmap tables) rather than the unicode-range fonts.css claims, and checks them against what the pages show.
// The serif (Noto Serif SC) must hold every character on the pages; the brush hand (Long Cang, then LXGW WenKai TC) must
// hold them too, and all of GB 2312 besides, for whatever is written on 测字's paper.
// Usage: node tools/check_fonts.mjs        (after python3 build.py; exits 1 if something falls back)
import { readFileSync, readdirSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
const pub = new URL('../public/', import.meta.url), fonts = new URL('vendor/fonts/', pub);

/** the code points a woff2 file maps to a glyph: its cmap (stored untransformed) out of the brotli stream */
function cmapOf(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not woff2');
  const n = buf.readUInt16BE(12), packed = buf.readUInt32BE(20);
  let p = 48, at = 0, cmap = null;
  const base128 = () => { let v = 0; for (let k = 0; k < 5; k++) { const b = buf[p++]; v = v * 128 + (b & 0x7f); if (!(b & 0x80)) return v; } throw new Error('bad UIntBase128'); };
  for (let k = 0; k < n; k++) {
    const flags = buf[p++], tagIndex = flags & 0x3f, version = flags >> 6;
    if (tagIndex === 63) p += 4;
    const length = base128(), glyfOrLoca = tagIndex === 10 || tagIndex === 11;
    const stored = (glyfOrLoca ? version !== 3 : version !== 0) ? base128() : length;
    if (tagIndex === 0) cmap = [at, length];
    at += stored;
  }
  const data = brotliDecompressSync(buf.subarray(p, p + packed)), c = data.subarray(cmap[0], cmap[0] + cmap[1]), out = new Set();
  // the Unicode subtable: format 12 (all planes) if there is one, else format 4 (the BMP); format 14 is variation sequences
  const subs = Array.from({ length: c.readUInt16BE(2) }, (_, k) => c.subarray(c.readUInt32BE(8 + k * 8)));
  const t = subs.find((s) => s.readUInt16BE(0) === 12) || subs.find((s) => s.readUInt16BE(0) === 4), format = t.readUInt16BE(0);
  if (format === 12) {
    for (let g = 0, ng = t.readUInt32BE(12); g < ng; g++) for (let u = t.readUInt32BE(16 + g * 12), e = t.readUInt32BE(20 + g * 12); u <= e; u++) out.add(u);
  } else if (format === 4) {
    const seg = t.readUInt16BE(6) / 2, ends = 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2;
    for (let s = 0; s < seg; s++) {
      const end = t.readUInt16BE(ends + s * 2), start = t.readUInt16BE(starts + s * 2), delta = t.readInt16BE(deltas + s * 2), ro = t.readUInt16BE(ranges + s * 2);
      for (let u = start; u <= end && u !== 0xffff; u++) {
        const g = ro ? t.readUInt16BE(ranges + s * 2 + ro + (u - start) * 2) : u;
        if (g && (g + delta) & 0xffff) out.add(u);
      }
    }
  }
  return out;
}

// every face in fonts.css, with the glyphs its file really has
const faces = [];
for (const m of readFileSync(new URL('fonts.css', fonts), 'utf8').matchAll(/font-family: '([^']+)';[^}]*?font-weight: ([^;]+);[^}]*?src: url\(([^?)]+)/g)) faces.push({ family: m[1], weight: m[2], file: m[3], glyphs: cmapOf(readFileSync(new URL(m[3], fonts))) });
const has = (family, weight) => { const s = new Set(); for (const f of faces) if (f.family === family && (!weight || f.weight === weight)) for (const u of f.glyphs) s.add(u); return s; };

// what the pages show: their text, the radicals 测字 works out at run time, and for the brush every character of GB 2312
const files = ['index.html', 'cat-tarot-deck.html', '404.html', ...readdirSync(new URL('js/', pub)).filter((f) => /^app\.[0-9a-f]+\.js$/.test(f)).map((f) => 'js/' + f)];
let text = files.map((f) => readFileSync(new URL(f, pub), 'utf8')).join('\n');
const gb = text.match(/CEZI_CHARS = '([^']*)'/)?.[1] ?? '';
text = text.replace(/CEZI_(CHARS|RAD|STROKES) = '[^']*'/g, '');
const radicals = Array.from({ length: 214 }, (_, k) => String.fromCodePoint(0x2f00 + k).normalize('NFKC')).join('');
const cjk = (s) => new Set([...s].map((ch) => ch.codePointAt(0)).filter((u) => u >= 0x2e80));
const shown = cjk(text + radicals), written = cjk(gb);
const where = (u) => { const ch = String.fromCodePoint(u), i = text.indexOf(ch); return i < 0 ? `${ch}(${radicals.includes(ch) ? '部首' : '测字'})` : `${ch}「${text.slice(Math.max(0, i - 6), i + 6).replace(/\s+/g, ' ')}」`; };

let bad = 0;
const report = (label, need, sets) => {
  const miss = [...need].filter((u) => !sets.some((s) => s.has(u))).sort((a, b) => a - b);
  console.log(`${label}: ${need.size} characters, ${miss.length ? miss.length + ' fall back' : 'all covered'}`);
  if (miss.length) { bad += miss.length; console.log('  ' + miss.slice(0, 60).map(where).join('  ')); }
};
for (const w of [...new Set(faces.filter((f) => f.family === 'Noto Serif SC').map((f) => f.weight))]) report(`Noto Serif SC ${w}`, shown, [has('Noto Serif SC', w)]);
report('brush hand (Long Cang → LXGW WenKai TC), the pages', shown, [has('Long Cang'), has('LXGW WenKai TC')]);
report('brush hand, the rest of GB 2312 for 测字', new Set([...written].filter((u) => !shown.has(u))), [has('Long Cang'), has('LXGW WenKai TC')]);
console.log(`${faces.length} faces, ${files.length} pages read`);
process.exit(bad ? 1 : 0);
