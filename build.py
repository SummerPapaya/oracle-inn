# Builds index.html from the pieces in src/: the shell, styles, painters and scripts are stitched into one page.
# python3 build.py            -> public/index.html
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
             ('ART', r('_art.js')), ('ART2', r('_art2.js')), ('ART3', r('_art3.js')), ('ART4', r('_art4.js')), ('ART5', r('_art5.js')), ('FX', r('_fx.js')), ('BOOK', r('_book.js')), ('HUT', r('_hut.js')), ('ROOMS', r('_lingqian.txt') + '\n' + r('_rooms.js')), ('MAIN', r('_main.js'))]:
    out = out.replace(f'@@{k}@@', f.rstrip('\n'))
HEAD = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="description" content="借问众神明 · 魔法小屋里的一本立体占卜书：推门进屋，翻开书走进星幕帐篷与东方神龛。仅供娱乐。">'
        '<meta name="color-scheme" content="dark"><meta name="theme-color" content="#120c14">'
        '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%277%27 fill=%27%23241a3a%27/%3E%3Cpath d=%27M16 2l2.2 9.6L26 6l-5.6 7.8L30 16l-9.6 2.2L26 26l-7.8-5.6L16 30l-2.2-9.6L6 26l5.6-7.8L2 16l9.6-2.2L6 6l7.8 5.6z%27 fill=%27%23f2d78f%27/%3E%3C/svg%3E">')
(root / 'public' / 'index.html').write_text(HEAD + out)     # a complete page; public/ is what gets deployed
import sys
if '--check' not in sys.argv: print('built public/index.html', len(out)); sys.exit(0)
(d / '_check.html').write_text('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + out)
m = re.search(r'<script type="module">(.*)</script>', out, re.S)
(d / '.check.mjs').write_text(m.group(1).replace("import * as THREE from 'three';", '').replace("import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';", '').replace("import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';", '').replace("import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';", '').replace("import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';", '').replace("import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';", '').replace("import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';", '').replace("import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';", '').replace("import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';", '').replace("import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';", ''))
print(len(out))
