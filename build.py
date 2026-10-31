# Builds index.html from the pieces in src/: the shell, styles, painters and scripts are stitched into one page, whose
# script then goes out to its own file, public/js/app.<hash>.js.
# python3 build.py            -> public/index.html, public/js/app.<hash>.js
# python3 build.py --check    -> also src/_check.html and src/.check.mjs, for a syntax check with node --check
import re, pathlib
root = pathlib.Path(__file__).parent
d = root / 'src'
r = lambda n: (d / n).read_text()
css = r('_css.txt')
a, b = css.index('/* ---------- a room'), css.index('.loading {')
css = css[:a] + css[b:]
out = r('_shell.html')
for k, f in [('CSS', css), ('KIT', r('_kit.txt')), ('CARDS', r('_cards.txt') + '\n' + r('_cards_major.txt')), ('TEX', r('_tex.txt')), ('MAT', r('_mat.txt')),
             ('ART', r('_art.js')), ('ART2', r('_art2.js')), ('ART3', r('_art3.js')), ('ART4', r('_art4.js')), ('ART5', r('_art5.js')), ('FX', r('_fx.js')), ('BOOK', r('_book.js')), ('HUT', r('_hut.js')), ('ROOMS', r('_lingqian.txt') + '\n' + r('_rooms.js') + '\n' + r('_liuyao.txt') + '\n' + r('_cezi_table.txt') + '\n' + r('_cezi.txt') + '\n' + r('_study.js') + '\n' + r('_lenormand.txt') + '\n' + r('_lenormand_art.js') + '\n' + r('_tea.js') + '\n' + r('_pendulum.txt') + '\n' + r('_window.js') + '\n' + r('_runes.txt') + '\n' + r('_hearth.js')), ('MAIN', r('_main.js'))]:
    out = out.replace(f'@@{k}@@', f.rstrip('\n'))
HEAD = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="description" content="魔法小屋里的一本立体占卜书：推开悬在夜空里的门，翻开立体书，走进六间小屋——星幕帐篷、东方神龛、文房书案、维多利亚茶桌、月下窗台和北欧炉边。东西方民俗文化的趣味科普演示，仅供娱乐。">'
        '<meta name="color-scheme" content="dark"><meta name="theme-color" content="#120c14">'
        # tab and home-screen icons
        '<link rel="icon" href="favicon.ico" sizes="48x48"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="manifest" href="site.webmanifest">'
        # the card a shared link shows (Open Graph, Twitter/X; itemprop for WeChat and QQ)
        '<link rel="canonical" href="https://oracle-inn.summercommences.com/"><meta property="og:type" content="website"><meta property="og:site_name" content="借问众神明 · Oracle Inn"><meta property="og:locale" content="zh_CN"><meta property="og:title" content="借问众神明 · Oracle Inn"><meta property="og:description" content="魔法小屋里的一本立体占卜书：推开悬在夜空里的门，翻开立体书，走进六间小屋——星幕帐篷、东方神龛、文房书案、维多利亚茶桌、月下窗台和北欧炉边。东西方民俗文化的趣味科普演示，仅供娱乐。"><meta property="og:url" content="https://oracle-inn.summercommences.com/"><meta property="og:image" content="https://oracle-inn.summercommences.com/og-image.jpg?v=2"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="借问众神明 · Oracle Inn：拱形金框窗里拼着六间小屋：星幕帐篷、东方神龛、文房书案、维多利亚茶桌、月下窗台和北欧炉边"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="借问众神明 · Oracle Inn"><meta name="twitter:description" content="魔法小屋里的一本立体占卜书：推开悬在夜空里的门，翻开立体书，走进六间小屋——星幕帐篷、东方神龛、文房书案、维多利亚茶桌、月下窗台和北欧炉边。东西方民俗文化的趣味科普演示，仅供娱乐。"><meta name="twitter:image" content="https://oracle-inn.summercommences.com/og-image.jpg?v=2"><meta name="twitter:image:alt" content="借问众神明 · Oracle Inn：拱形金框窗里拼着六间小屋：星幕帐篷、东方神龛、文房书案、维多利亚茶桌、月下窗台和北欧炉边"><meta itemprop="name" content="借问众神明 · Oracle Inn"><meta itemprop="description" content="魔法小屋里的一本立体占卜书：推开悬在夜空里的门，翻开立体书，走进六间小屋——星幕帐篷、东方神龛、文房书案、维多利亚茶桌、月下窗台和北欧炉边。东西方民俗文化的趣味科普演示，仅供娱乐。"><meta itemprop="image" content="https://oracle-inn.summercommences.com/share-square.jpg?v=2">')
# self-hosted fonts: the sheet's URL carries its hash, so it (and the files it names) can be cached for good
import hashlib
pub = root / 'public'; fcss = (pub / 'vendor' / 'fonts' / 'fonts.css').read_text()
furl = 'vendor/fonts/fonts.css?v=' + hashlib.sha1(fcss.encode()).hexdigest()[:8]
out = out.replace('@@FONTS@@', furl)
# the script in a file of its own, named by its hash: the edge compresses it (the page itself goes out exactly as built,
# see _headers) and browsers keep it until the next build
m = re.search(r'<script type="module">\n(.*?)\n</script>', out, re.S)
js = m.group(1) + '\n'; app = 'app.' + hashlib.sha1(js.encode()).hexdigest()[:10] + '.js'
jd = pub / 'js'; jd.mkdir(exist_ok=True)
for old in jd.glob('app.*.js'):
    if old.name != app: old.unlink()
(jd / app).write_text(js)
page = out[:m.start()] + f'<script type="module" src="js/{app}"></script>' + out[m.end():]
three = '<link rel="modulepreload" href="vendor/three/0.169.0/build/three.module.js">'
assert page.count(three) == 1; page = page.replace(three, three + f'<link rel="modulepreload" href="js/{app}">')
(pub / 'index.html').write_text(HEAD + page)     # a complete page; public/ is what gets deployed
deck = pub / 'cat-tarot-deck.html'; dt = deck.read_text(); deck.write_text(re.sub(r'vendor/fonts/fonts\.css(\?v=[0-9a-f]+)?', furl, dt))
# the subsets only hold the characters the pages used when they were cut: warn about any new ones
covered = set()
for fam, rng in re.findall(r"font-family: '([^']+)';[^}]*unicode-range: ([^;]+);", fcss):
    if fam != 'Noto Serif SC': continue
    for part in rng.split(','):
        a_, _, b_ = part.strip()[2:].partition('-'); covered.update(range(int(a_, 16), int(b_ or a_, 16) + 1))
# (测字's tables are data, not text on the page: its 6,763 characters sit in Long Cang's extra chunks, see fetch_fonts.py)
unshown = lambda t: re.sub(r"CEZI_(CHARS|RAD|STROKES) = '[^']*'", '', t)
used = set(ord(c) for f in ('index.html', 'cat-tarot-deck.html', '404.html', 'js/' + app) for c in unshown((pub / f).read_text()) if ord(c) >= 0x2E80)
missing = ''.join(sorted(chr(c) for c in used - covered))
if missing: print(f'note: {len(missing)} characters are not in the font subsets ({missing[:40]}…); run python3 tools/fetch_fonts.py')
import sys
if '--check' not in sys.argv: print(f'built public/index.html {len(page)}, public/js/{app} {len(js)}'); sys.exit(0)
(d / '_check.html').write_text('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + out)
m = re.search(r'<script type="module">(.*)</script>', out, re.S)
(d / '.check.mjs').write_text(m.group(1).replace("import * as THREE from 'three';", '').replace("import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';", '').replace("import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';", '').replace("import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';", '').replace("import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';", '').replace("import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';", '').replace("import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';", '').replace("import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';", '').replace("import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';", '').replace("import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';", ''))
print(len(out))
