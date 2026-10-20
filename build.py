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
        '<meta name="description" content="魔法小屋里的一本立体占卜书：推开悬在夜空里的门，翻开立体书，走进星幕帐篷与东方神龛。东西方民俗文化的趣味科普演示，仅供娱乐。">'
        '<meta name="color-scheme" content="dark"><meta name="theme-color" content="#120c14">'
        # tab and home-screen icons
        '<link rel="icon" href="favicon.ico" sizes="48x48"><link rel="icon" href="favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="apple-touch-icon.png"><link rel="manifest" href="site.webmanifest">'
        # the card a shared link shows (Open Graph, Twitter/X; itemprop for WeChat and QQ)
        '<link rel="canonical" href="https://oracle-inn.summercommences.com/"><meta property="og:type" content="website"><meta property="og:site_name" content="借问众神明 · Oracle Inn"><meta property="og:locale" content="zh_CN"><meta property="og:title" content="借问众神明 · Oracle Inn"><meta property="og:description" content="魔法小屋里的一本立体占卜书：推开悬在夜空里的门，翻开立体书，走进星幕帐篷与东方神龛。东西方民俗文化的趣味科普演示，仅供娱乐。"><meta property="og:url" content="https://oracle-inn.summercommences.com/"><meta property="og:image" content="https://oracle-inn.summercommences.com/og-image.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="借问众神明 · Oracle Inn：拱形金框窗里是一本摊开的立体书，书页上立着紫色的星幕帐篷"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="借问众神明 · Oracle Inn"><meta name="twitter:description" content="魔法小屋里的一本立体占卜书：推开悬在夜空里的门，翻开立体书，走进星幕帐篷与东方神龛。东西方民俗文化的趣味科普演示，仅供娱乐。"><meta name="twitter:image" content="https://oracle-inn.summercommences.com/og-image.jpg"><meta name="twitter:image:alt" content="借问众神明 · Oracle Inn：拱形金框窗里是一本摊开的立体书，书页上立着紫色的星幕帐篷"><meta itemprop="name" content="借问众神明 · Oracle Inn"><meta itemprop="description" content="魔法小屋里的一本立体占卜书：推开悬在夜空里的门，翻开立体书，走进星幕帐篷与东方神龛。东西方民俗文化的趣味科普演示，仅供娱乐。"><meta itemprop="image" content="https://oracle-inn.summercommences.com/share-square.jpg">')
(root / 'public' / 'index.html').write_text(HEAD + out)     # a complete page; public/ is what gets deployed
import sys
if '--check' not in sys.argv: print('built public/index.html', len(out)); sys.exit(0)
(d / '_check.html').write_text('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' + out)
m = re.search(r'<script type="module">(.*)</script>', out, re.S)
(d / '.check.mjs').write_text(m.group(1).replace("import * as THREE from 'three';", '').replace("import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';", '').replace("import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';", '').replace("import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';", '').replace("import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';", '').replace("import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';", '').replace("import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';", '').replace("import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';", '').replace("import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';", '').replace("import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';", ''))
print(len(out))
