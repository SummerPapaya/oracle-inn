// Checks the texts of the readings: the tent's tarot (src/_cards.txt, src/_cards_major.txt), the shrine's slips
// (src/_lingqian.txt), the study's 六爻 (src/_liuyao.txt) and 测字 (src/_cezi.txt, src/_cezi_table.txt), and the tea table's
// 雷诺曼 and 茶叶占卜 (src/_lenormand.txt), the moonlit window's 灵摆 and 月相 (src/_pendulum.txt), and the hearth's 卢恩符文 and
// 新年浇锡 (src/_runes.txt). Those files are the one source the page is built from, and a proofreading table
// should be made from them too, never copied by hand.
// Usage: node tools/check_content.mjs           -> the checks; exits 1 if one fails
//        node tools/check_content.mjs --json    -> also prints every text as JSON, for making a proofreading table
import { readFileSync } from 'node:fs';
const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const names = 'TRIGRAM GUA guaFullName CEZI CEZI_PICKS CEZI_FAMILY CEZI_PLAIN CEZI_HEAVY CEZI_SORE CEZI_OPEN CEZI_CARE CEZI_SIMPLE CEZI_FORM CEZI_ALT CEZI_CHARS CEZI_RAD CEZI_STROKES ceziStrokes ceziRead';
const C = new Function(`${src('_liuyao.txt')}\n${src('_cezi_table.txt')}\n${src('_cezi.txt')}\nreturn { ${names.split(' ').join(', ')} };`)();
// the card files also draw the cards, so only their arrays are taken out of them
const array = (file, name) => { const t = src(file), a = t.indexOf(`const ${name} = [`); return new Function(`return ${t.slice(t.indexOf('[', a), t.indexOf('];', a) + 1)}`)(); };
const MAJOR = array('_cards.txt', 'MAJOR'), MAJOR_REV = array('_cards_major.txt', 'MAJOR_REV'), ROMAN = array('_cards.txt', 'ROMAN');
const { LINGQIAN } = new Function(`${src('_lingqian.txt')}\nreturn { LINGQIAN };`)();
const PD = new Function(`${src('_pendulum.txt')}\nreturn { PENDULUM_UI, PENDULUM_ANSWERS, PENDULUM_BOARD, MOON_PHASES };`)();
const RN = new Function(`${src('_runes.txt')}\nreturn { RUNE_UI, RUNE_SPREADS, RUNES_FUTHARK, NORNS, RUNE_CAST, TIN_UI, TIN_SHAPES, TIN_FINISH };`)();
const LN = new Function(`${src('_lenormand.txt')}\nreturn { LENORMAND, LN_SPREADS, LN_SIDES, TEA_SYMBOLS, TEA_ZONES, TEA_SIDES };`)();
let failed = 0;
const fail = (msg) => { failed++; console.log('  ✗ ' + msg); };
const dupes = (xs) => [...new Set(xs.filter((x, i) => xs.indexOf(x) !== i))];
const ends = (t) => /[。？！]$/.test(t);
const BANNED = /一定会|注定|必定|必有|吉利|运势|贵人|吉凶/;                    // no fortunes promised, no verdicts
const runs = (t, n = 4) => { const out = new Set(); for (const part of t.split(/[，。；：？！、—「」\s]+/)) for (let i = 0; i + n <= part.length; i++) out.add(part.slice(i, i + n)); return out; };

console.log('塔罗');
if (MAJOR.length !== 22 || MAJOR_REV.length !== 22 || ROMAN.length !== 22) fail(`${MAJOR.length} cards, ${MAJOR_REV.length} reversed readings, ${ROMAN.length} numerals`);
MAJOR.forEach(([name, en, , up, key], k) => {
  const rev = MAJOR_REV[k];
  if (!name || !en || !ends(up) || !ends(rev) || [...(key || '')].length !== 2) fail(`${k} ${name}: name, reading or keyword missing or unfinished`);
  const both = [...runs(up)].filter((r) => runs(rev).has(r));
  if (both.length) fail(`${k} ${name}: upright and reversed share 「${both[0]}」, so the reversal reads the same`);
  for (const t of [up, rev]) if (BANNED.test(t)) fail(`${k} ${name}: a verdict or a promise in 「${t}」`);
});
for (const d of dupes(MAJOR.map((m) => m[4]))) fail(`two cards share the keyword ${d}`);
const asks = [...MAJOR.map((m) => m[3]), ...MAJOR_REV].filter((t) => t.endsWith('？')).length;
console.log(`  22 cards, ${asks} of the 44 readings are questions`);

console.log('灵签');
if (LINGQIAN.length !== 60) fail(`${LINGQIAN.length} slips, not 60`);
const grades = {}, seen = new Map();
LINGQIAN.forEach(([grade, title, poem, jie, gist], i) => {
  const n = i + 1; grades[grade] = (grades[grade] || 0) + 1;
  if (!['上上', '上吉', '中吉', '中平', '宜守'].includes(grade)) fail(`${n} ${title}: grade ${grade}?`);
  if (!/^[^，。]{5}，[^，。]{5}。[^，。]{5}，[^，。]{5}。$/.test(poem)) fail(`${n} ${title}: not four five-character lines`);
  if (!ends(jie) || [...(gist || '')].length !== 2) fail(`${n} ${title}: reading or 签意 missing or unfinished`);
  if (BANNED.test(jie) || BANNED.test(poem)) fail(`${n} ${title}: a verdict or a promise`);
  for (const r of runs(poem)) { if (seen.has(r) && seen.get(r) !== n) fail(`「${r}」 is in both slip ${seen.get(r)} and slip ${n}`); seen.set(r, n); }
});
for (const d of dupes(LINGQIAN.map((q) => q[1]))) fail(`two slips share the title ${d}`);
for (const d of dupes(LINGQIAN.map((q) => q[4]))) fail(`two slips share the 签意 ${d}`);
console.log(`  60 slips, grades ${JSON.stringify(grades)}, ${LINGQIAN.filter((q) => q[3].includes('你')).length} readings speak to 你`);

console.log('雷诺曼');
const { LENORMAND, LN_SPREADS, LN_SIDES, TEA_SYMBOLS, TEA_ZONES, TEA_SIDES } = LN;
if (LENORMAND.length !== 36) fail(`${LENORMAND.length} cards, not 36`);
LENORMAND.forEach(([name, en, inset, key, line, phrase], i) => {
  const n = i + 1;
  if (!name || !en || !/^(10|[6-9AJQK])[HDCS]$/.test(inset || '')) fail(`${n} ${name}: name or playing card ${inset}?`);
  if ([...(key || '')].length !== 2 || !ends(line) || !phrase || /[，。？！]$/.test(phrase)) fail(`${n} ${name}: keyword, reading or phrase missing or unfinished`);
  if (BANNED.test(line) || BANNED.test(phrase)) fail(`${n} ${name}: a verdict or a promise`);
});
// the old decks print a piquet pack and four sixes in their corners: 6 to 10, J, Q, K and A of each suit, each once
for (const d of dupes(LENORMAND.map((c) => c[2]))) fail(`two cards carry the playing card ${d}`);
for (const k of [1, 3, 4, 5]) for (const d of dupes(LENORMAND.map((c) => c[k]))) fail(`two cards share ${['', 'the English name', '', 'the keyword', 'a reading', 'a phrase'][k]} ${d}`);
for (const [k, S] of Object.entries(LN_SPREADS)) if (S.slots ? S.slots.length !== S.n : S.n !== 1) fail(`spread ${k}: ${S.n} cards but ${S.slots?.length} places`);
for (const [side, , idx] of LN_SIDES) if (idx.length !== 3 || idx.some((i) => i < 0 || i > 8) || idx.includes(4)) fail(`side ${side} of the square: ${idx}`);
console.log(`  36 cards; spreads ${Object.values(LN_SPREADS).map((S) => S.name).join(' / ')}`);
console.log('茶叶占卜');
for (const [name, shape, line] of TEA_SYMBOLS) {
  if (!name || !shape || !ends(line)) fail(`${name}: shape or reading missing or unfinished`);
  if (BANNED.test(line)) fail(`${name}: a verdict or a promise`);
}
for (const k of [0, 1, 2]) for (const d of dupes(TEA_SYMBOLS.map((t) => t[k]))) fail(`two shapes share ${d}`);
for (const [k, [name, line]] of Object.entries({ ...TEA_ZONES, ...TEA_SIDES })) if (!name || (k !== 'side' && !line)) fail(`place ${k} unnamed`);
console.log(`  ${TEA_SYMBOLS.length} shapes the leaves can make`);

console.log('灵摆');
const { PENDULUM_UI, PENDULUM_ANSWERS, PENDULUM_BOARD, MOON_PHASES } = PD;
const pdLines = [];
for (const [k, [name, key, lines]] of Object.entries(PENDULUM_ANSWERS)) {
  if (!name || !key || lines.length < 3) fail(`answer ${k}: a name, a keyword and at least three readings`);
  for (const l of lines) { if (!ends(l)) fail(`answer ${k}: unfinished 「${l}」`); if (BANNED.test(l)) fail(`answer ${k}: a verdict or a promise 「${l}」`); pdLines.push(l); }
}
if (PENDULUM_BOARD.length !== 4) fail(`the board has ${PENDULUM_BOARD.length} quarters, not 4`);
const words = PENDULUM_BOARD.flatMap(([dir, season, theme, line, cells]) => {
  if (!dir || !season || [...theme].length !== 2 || !ends(line) || cells.length !== 3) fail(`quarter ${dir}${season}: name, theme, line or three words missing`);
  for (const [w, l] of cells) { if ([...w].length !== 2 || !ends(l)) fail(`board word ${w}: two characters and a finished line`); if (BANNED.test(l)) fail(`board word ${w}: a verdict or a promise`); pdLines.push(l); }
  return cells.map((c) => c[0]);
});
for (const d of dupes(words)) fail(`the board has ${d} twice`);
if (MOON_PHASES.length !== 8) fail(`${MOON_PHASES.length} moon phases, not 8`);
for (const [name, days, sky, folk, line] of MOON_PHASES) {
  if (!name || !days || !ends(sky) || !ends(folk) || !ends(line)) fail(`moon phase ${name}: a part missing or unfinished`);
  if (BANNED.test(line)) fail(`moon phase ${name}: a verdict or a promise`); pdLines.push(line);
}
for (const d of dupes(pdLines)) fail(`a line is used twice: ${d}`);
for (const [k, t] of Object.entries(PENDULUM_UI)) if (typeof t === 'string' && !t) fail(`prompt ${k} is empty`);
console.log(`  ${Object.values(PENDULUM_ANSWERS).reduce((n, a) => n + a[2].length, 0)} answers, ${words.length} board words, ${MOON_PHASES.length} moon phases`);

console.log('卢恩 · 浇锡');
const { RUNE_UI, RUNE_SPREADS, RUNES_FUTHARK, NORNS, RUNE_CAST, TIN_UI, TIN_SHAPES, TIN_FINISH } = RN;
const rnLines = [];
if (RUNES_FUTHARK.length !== 24) fail(`${RUNES_FUTHARK.length} runes, not 24`);
// a rune that reads the same upside down: its strokes, turned half round the middle of the 10 × 16 grid, are the same strokes
const segs = (strokes, turn) => strokes.flatMap((st) => st.slice(0, -2).map((_, i) => i % 2 ? null : [st[i], st[i + 1], st[i + 2], st[i + 3]]).filter(Boolean))
  .map(([a, b, c, d]) => (turn ? [10 - a, 16 - b, 10 - c, 16 - d] : [a, b, c, d])).map(([a, b, c, d]) => (a < c || (a === c && b < d) ? [a, b, c, d] : [c, d, a, b]).join(',')).sort().join(' ');
const same = [];
for (const [name, sound, meaning, key, image, reading, lines, phrase, strokes] of RUNES_FUTHARK) {
  if (!name || !sound || !meaning || [...key].length !== 2 || !ends(image) || !ends(reading) || lines.length < 3 || !phrase || /[，。；：？！]$/.test(phrase)) fail(`rune ${name}: a part missing or unfinished`);
  for (const t of [reading, ...lines]) { if (!ends(t)) fail(`rune ${name}: unfinished 「${t}」`); if (BANNED.test(t)) fail(`rune ${name}: a verdict or a promise 「${t}」`); rnLines.push(t); }
  for (const st of strokes) if (st.length < 4 || st.length % 2 || st.some((v, i) => v < 0 || v > (i % 2 ? 16 : 10))) fail(`rune ${name}: a stroke off the grid`);
  if (segs(strokes, false) === segs(strokes, true)) same.push(name);
}
// the knowledge card says nine runes look the same upside down, and these are the nine: a changed stroke must change it too
if (same.join(' ') !== 'Gebo Hagalaz Naudiz Isa Jera Eihwaz Sowilo Ingwaz Dagaz') fail(`the runes that read the same upside down are now ${same.join(' ')}; the knowledge card names nine`);
for (const d of dupes(RUNES_FUTHARK.map((r) => r[0]))) fail(`two runes are called ${d}`);
for (const d of dupes(RUNES_FUTHARK.map((r) => r[3]))) fail(`two runes share the keyword ${d}`);
for (const d of dupes(RUNES_FUTHARK.map((r) => r[7]))) fail(`two runes share the phrase ${d}`);
if (NORNS.length !== 3 || NORNS.some((n) => n.length !== 4 || !n[3].includes('X'))) fail('the three Norns: a name, a name in Old Norse, a gloss and a clause with X');
for (const [k, v] of Object.entries(RUNE_CAST)) if (!(Array.isArray(v) ? v[0] && v[1] : ends(v))) fail(`cast ${k}: missing or unfinished`);
for (const [k, v] of Object.entries(RUNE_SPREADS)) if (v.length !== 3 || !ends(v[2])) fail(`spread ${k}: a count, a name and a finished prompt`);
if (TIN_SHAPES.length < 30) fail(`only ${TIN_SHAPES.length} tin shapes`);
for (const [name, shape, line] of TIN_SHAPES) { if (!name || !shape || !ends(line)) fail(`tin ${name}: a part missing`); if (BANNED.test(line)) fail(`tin ${name}: a verdict or a promise`); rnLines.push(line); }
for (const d of dupes(TIN_SHAPES.map((t) => t[0]))) fail(`two tin shapes are called ${d}`);
for (const d of dupes(TIN_SHAPES.map((t) => t[1]))) fail(`two tin shapes are drawn as ${d}`);
for (const [name, shape] of TIN_SHAPES) if (!/^[a-z]+$/.test(shape)) fail(`tin ${name}: the outline key ${shape} is not a plain word`);
// every shape needs an outline to be cast and to throw its shadow (TIN_ART in src/_hearth.js, some borrowed from the tea leaves)
const artSrc = src('_hearth.js'), art = artSrc.slice(artSrc.indexOf('const TIN_ART'), artSrc.indexOf('})();', artSrc.indexOf('const TIN_ART')));
const artKeys = new Set([...art.matchAll(/\b(\w+): (?:T\.\w+|\{)/g)].map((m) => m[1]));
for (const [name, shape] of TIN_SHAPES) if (!artKeys.has(shape)) fail(`tin ${name}: no outline ${shape} in TIN_ART`);
for (const k of artKeys) if (!TIN_SHAPES.some((t) => t[1] === k)) fail(`TIN_ART has ${k}, which no tin shape uses`);
for (const [name, line] of TIN_FINISH) { if (!name || !ends(line)) fail(`tin finish ${name}: missing or unfinished`); rnLines.push(line); }
for (const d of dupes(rnLines)) fail(`a line is used twice: ${d}`);
for (const [k, t] of Object.entries({ ...RUNE_UI, ...TIN_UI })) if (!ends(t) && !t.endsWith('——')) fail(`prompt ${k} is empty or unfinished`);   // the tin's lead runs on into the reading
console.log(`  ${RUNES_FUTHARK.length} runes (${same.length} the same upside down), ${RUNES_FUTHARK.reduce((n, r) => n + r[6].length, 0)} short lines, ${TIN_SHAPES.length} tin shapes, ${TIN_FINISH.length} finishes`);

console.log('六爻');
const { GUA, TRIGRAM } = C;
if (GUA.length !== 64) fail(`${GUA.length} hexagrams, not 64`);
GUA.forEach((g, i) => {
  const [no, name, up, lo, image, key, line] = g;
  if (no !== i + 1) fail(`row ${i + 1} is numbered ${no}`);
  if (!TRIGRAM[up] || !TRIGRAM[lo]) fail(`${no} ${name}: unknown trigram ${up}/${lo}`);
  if (up === lo && name !== up) fail(`${no} ${name}: a doubled trigram should carry its name`);
  if (!image || !key || !ends(line)) fail(`${no} ${name}: image, keyword or reading missing or unfinished`);
});
for (const d of dupes(GUA.map((g) => g[2] + g[3]))) fail(`two hexagrams share the trigrams ${d}`);
for (const d of dupes(GUA.map((g) => g[5]))) fail(`two hexagrams share the keyword ${d}`);
for (const d of dupes(GUA.map((g) => g[6]))) fail(`two hexagrams share a reading: ${d}`);

console.log('测字');
const { CEZI, CEZI_PICKS, CEZI_FAMILY, CEZI_CHARS, CEZI_HEAVY, CEZI_SORE, CEZI_OPEN } = C;
const chars = Object.keys(CEZI);
for (const ch of chars) {
  const [parts, line] = CEZI[ch];
  if ([...ch].length !== 1) fail(`key ${ch} is not one character`);
  if (!CEZI_CHARS.includes(ch)) fail(`${ch} is not in the radical and stroke table`);
  if (!parts || !ends(line)) fail(`${ch}: 拆字 or reading missing or unfinished`);
}
for (const d of dupes(chars.map((c) => CEZI[c][1]))) fail(`two characters share a reading: ${d}`);
const picks = [...CEZI_PICKS];
if (picks.length !== 24) fail(`the 字盘 has ${picks.length} characters, not 24`);
for (const d of dupes(picks)) fail(`${d} is twice on the 字盘`);
for (const c of picks) if (!CEZI[c]) fail(`${c} is on the 字盘 but has no reading of its own`);
const rads = CEZI_FAMILY.flatMap(([ns]) => ns);
for (const n of rads) if (!(n >= 1 && n <= 214)) fail(`radical ${n} is not a Kangxi radical`);
for (const d of dupes(rads)) fail(`radical ${d} is in two families`);
for (const d of dupes(CEZI_FAMILY.map((f) => f[1]))) fail(`two families share a line: ${d}`);
for (const n of Object.keys({ ...C.CEZI_SIMPLE, ...C.CEZI_FORM, ...C.CEZI_ALT }).map(Number)) if (!(n >= 1 && n <= 214)) fail(`radical form for ${n}?`);
for (const c of CEZI_HEAVY + CEZI_SORE) if (!CEZI_CHARS.includes(c)) fail(`${c} (heavy or sore) is not in the table`);
for (const c of CEZI_HEAVY) if (CEZI_SORE.includes(c)) fail(`${c} is both heavy and sore`);
for (const d of dupes([...CEZI_HEAVY, ...CEZI_SORE])) fail(`${d} is listed twice`);
for (const c of CEZI_SORE) if (CEZI[c]) fail(`${c} has a reading of its own, so the sore opening never shows`);
for (const [tier, lines] of Object.entries(CEZI_OPEN)) {
  if (lines.length < 5) fail(`only ${lines.length} openings for ${tier}`);
  for (const l of lines) if (!l.includes('「X」')) fail(`an opening for ${tier} never names the character: ${l}`);
}
// how the readings end: a run of the same ending reads flat
const tails = {}; for (const c of chars) { const t = CEZI[c][1].slice(-3, -1); tails[t] = (tails[t] || 0) + 1; }
const common = Object.entries(tails).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, n]) => `…${t}。×${n}`).join(' ');
const covered = [...CEZI_CHARS].filter((_, i) => { const r = C.CEZI_RAD.charCodeAt(i) - 0x100; return rads.includes(r > 0x100 ? r - 0x100 : r); }).length;
console.log(`  ${chars.length} characters with a reading of their own, ${picks.length} on the 字盘; commonest endings ${common}`);
console.log(`  ${CEZI_FAMILY.length} radical families, covering ${covered} of the ${CEZI_CHARS.length} characters in the table`);
console.log(failed ? `${failed} problem(s)` : 'all good');

if (process.argv.includes('--json')) {
  // a radical by its Kangxi form, and beside it the form the page shows or the one it usually takes in a character: 金（钅）
  const radName = (n) => { const k = String.fromCodePoint(0x2f00 + n - 1).normalize('NFKC'), alt = C.CEZI_FORM[n] || C.CEZI_SIMPLE[n] || C.CEZI_ALT[n]; return alt && alt !== k ? `${k}（${alt}）` : k; };
  console.log(JSON.stringify({
    tarot: MAJOR.map(([name, en, , up, key], k) => ({ no: k, roman: ROMAN[k], name, en, key, up, rev: MAJOR_REV[k] })),
    lingqian: LINGQIAN.map(([grade, title, poem, jie, gist], i) => ({ no: i + 1, grade, title, poem, jie, gist })),
    lenormand: LENORMAND.map(([name, en, inset, key, line, phrase], i) => ({ no: i + 1, name, en, inset, key, line, phrase })),
    lnSpreads: LN_SPREADS, lnSides: LN_SIDES,
    tea: TEA_SYMBOLS.map(([name, shape, line]) => ({ name, shape, line })), teaZones: TEA_ZONES, teaSides: TEA_SIDES,
    pendulumUi: PENDULUM_UI, pendulumAnswers: PENDULUM_ANSWERS,
    board: PENDULUM_BOARD.map(([dir, season, theme, line, cells]) => ({ dir, season, theme, line, cells: cells.map(([word, l]) => ({ word, line: l })) })),
    moon: MOON_PHASES.map(([name, days, sky, folk, line]) => ({ name, days, sky, folk, line })),
    runeUi: RUNE_UI, runeSpreads: RUNE_SPREADS, norns: NORNS, runeCast: RUNE_CAST,
    runes: RUNES_FUTHARK.map(([name, sound, meaning, key, image, reading, lines, phrase, strokes], i) => ({ no: i + 1, name, sound, meaning, key, image, reading, lines, phrase, strokes })),
    tinUi: TIN_UI, tin: TIN_SHAPES.map(([name, shape, line]) => ({ name, shape, line })), tinFinish: TIN_FINISH.map(([name, line]) => ({ name, line })),
    gua: GUA.map(([no, name, up, lo, image, key, line, note]) => ({ no, name, full: C.guaFullName(GUA[no - 1]), up, low: lo, image, key, line, note: note || '' })),
    cezi: chars.map((ch) => ({ ch, parts: CEZI[ch][0], line: CEZI[ch][1], pick: picks.includes(ch), heavy: CEZI_HEAVY.includes(ch) })),
    picks: CEZI_PICKS,
    family: CEZI_FAMILY.map(([ns, line]) => ({ nums: ns, rads: ns.map(radName), line })),
    plain: C.CEZI_PLAIN,
    strokes: [1, 5, 9, 13, 17].map((n) => C.ceziStrokes(n)),
    heavy: CEZI_HEAVY, sore: CEZI_SORE, open: CEZI_OPEN, care: C.CEZI_CARE,
  }, null, 1));
}
process.exitCode = failed ? 1 : 0;           // not process.exit(): that can cut off a long --json on its way down a pipe
