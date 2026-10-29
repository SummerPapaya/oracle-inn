# Paints the moonlit window's flat artwork with PIL: a framed star chart, a chart of the moon's eight phases, a frieze of
# moons for the top of the walls, the sheer starry curtains, the round rug, the tower's stones and the cottage's roof
# tiles. Everything is drawn here, nothing downloaded; the lettering is in the open fonts the site hosts (webfont.py).
# Run:  python3 window_tex.py
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import webfont

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
def hexc(h, a=255): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)
def save(im, name, size=None):
    if size: im = im.resize(size, Image.LANCZOS)
    im.convert('RGB').save(os.path.join(TEX, name), quality=92); print('wrote', name, im.size if not size else size)
def grain(im, amt=10, keep=0.35):
    n = Image.effect_noise(im.size, amt).point(lambda v: max(0, min(255, int(238 + (v - 128) * keep))))
    return ImageChops.multiply(im.convert('RGB'), Image.merge('RGB', (n, n, n))).convert('RGBA')
def wrap_draw(im, fn):
    W, H = im.size
    for dx in (-W, 0, W):
        for dy in (-H, 0, H): fn(dx, dy)
SERIF, BRUSH = ('Noto Serif SC', '900'), ('Long Cang', None)
def text(d, xy, s, face, px, fill, anchor='m'):
    return webfont.draw_text(d, xy, s, face[0], px, fill, face[1], anchor)
def moon_phase(d, cx, cy, r, k, lit='#f4e8c4', dark='#2a2f52'):
    """the moon at phase k (0 new, 0.5 full, 1 new again), the lit side on the right while waxing, as seen from the north"""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hexc(dark))
    pts = []
    waxing, f = k < 0.5, math.cos(k * 2 * math.pi)             # f: 1 new .. -1 full; the terminator's x is f * r across the disc
    for i in range(65):
        a = -math.pi / 2 + math.pi * i / 64; y = cy + r * math.sin(a); half = r * math.cos(a)
        pts.append((cx + (half if waxing else -half), y))
    for i in range(64, -1, -1):
        a = -math.pi / 2 + math.pi * i / 64; y = cy + r * math.sin(a); half = r * math.cos(a)
        pts.append((cx + (f * half if waxing else -f * half), y))
    d.polygon(pts, fill=hexc(lit))

# ---------------------------------------------------------------- a star chart in a gilt frame: the northern sky in gold on indigo
def star_chart(S=1024):
    im = Image.new('RGBA', (S, S), hexc('#1c2347')); d = ImageDraw.Draw(im); R = random.Random(3); c = S / 2
    for r in range(470, 0, -1): d.ellipse([c - r, c - r, c + r, c + r], fill=hexc('#243060' if r < 440 else '#1c2347'))
    for r in (440, 330, 220, 110): d.ellipse([c - r, c - r, c + r, c + r], outline=hexc('#c8a85a', 150), width=2)
    for k in range(12): a = k / 12 * math.tau; d.line([(c, c), (c + math.cos(a) * 440, c + math.sin(a) * 440)], fill=hexc('#c8a85a', 80), width=1)
    for _ in range(420):
        a = R.uniform(0, math.tau); r = math.sqrt(R.random()) * 430; x, y = c + math.cos(a) * r, c + math.sin(a) * r; s_ = R.choice([1, 1, 1.5, 2, 3])
        d.ellipse([x - s_, y - s_, x + s_, y + s_], fill=hexc('#f6e6b0', R.randint(140, 255)))
    # a few constellations as gold lines between bright stars
    for _ in range(9):
        x, y = c + R.uniform(-330, 330), c + R.uniform(-330, 330); pts = [(x, y)]
        for _ in range(R.randint(3, 6)): x += R.uniform(-70, 70); y += R.uniform(-70, 70); pts.append((x, y))
        d.line(pts, fill=hexc('#e8c47a', 200), width=2)
        for px, py in pts: d.ellipse([px - 5, py - 5, px + 5, py + 5], fill=hexc('#fff0c8'))
    d.ellipse([c - 470, c - 470, c + 470, c + 470], outline=hexc('#e8c47a'), width=8)
    for k, w in enumerate('北西南东'):                           # a sky chart is seen looking up: east on the left, west on the right
        a = -math.pi / 2 + k * math.pi / 2; text(d, (c + math.cos(a) * 490 * 0.97, c + math.sin(a) * 490 * 0.97 + 20), w, SERIF, 44, hexc('#e8c47a'))
    save(grain(im, 8), 'window_starchart.jpg', (768, 768))

# ---------------------------------------------------------------- the moon's eight phases, named, on old paper
PHASES = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月']
def moon_chart(W=2048, H=640):
    im = Image.new('RGBA', (W, H), hexc('#efe2c4')); d = ImageDraw.Draw(im)
    d.rectangle([24, 24, W - 24, H - 24], outline=hexc('#7a5a2a'), width=6); d.rectangle([44, 44, W - 44, H - 44], outline=hexc('#b89050'), width=2)
    text(d, (W / 2, 132), '月 相', SERIF, 84, hexc('#3a2a4a'))
    for i, name in enumerate(PHASES):
        cx = 150 + i * (W - 300) / 7; cy = 330
        moon_phase(d, cx, cy, 82, i / 8, '#f4e6b4', '#3a3c64')
        d.ellipse([cx - 82, cy - 82, cx + 82, cy + 82], outline=hexc('#7a5a2a'), width=3)
        text(d, (cx, 500), name, BRUSH, 56, hexc('#3a2a4a'))
    save(grain(im, 10), 'window_moonchart.jpg', (1024, 320))

# ---------------------------------------------------------------- a frieze of moons for the top of the walls: waxing, full, waning, again and again
def frieze(W=2048, H=160):
    im = Image.new('RGBA', (W, H), hexc('#3b3f70')); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 10], fill=hexc('#d8b46a')); d.rectangle([0, H - 10, W, H], fill=hexc('#d8b46a'))
    for i in range(16):
        cx = (i + 0.5) * W / 16; moon_phase(d, cx, H / 2, 44, (i % 8) / 8, '#f2e4b8', '#2c2f58')
        for s_ in (-1, 1): d.polygon([(cx + s_ * 64, H / 2 - 8), (cx + s_ * 68, H / 2), (cx + s_ * 64, H / 2 + 8), (cx + s_ * 60, H / 2)], fill=hexc('#d8b46a'))
    save(grain(im, 6), 'window_frieze.jpg', (2048, 160))

# ---------------------------------------------------------------- the curtains: sheer lilac with little gold stars, tiling
def curtain(S=512):
    im = Image.new('RGBA', (S, S), hexc('#9e8fcc')); d = ImageDraw.Draw(im); R = random.Random(5)
    for x in range(0, S, 32): d.rectangle([x, 0, x + 14, S], fill=hexc('#aa9cd6'))
    for _ in range(46):
        x, y, r = R.uniform(0, S), R.uniform(0, S), R.uniform(4, 9)
        def star(dx, dy, x=x, y=y, r=r): d.polygon([(x + dx + math.cos(a) * (r if k % 2 == 0 else r * 0.42), y + dy + math.sin(a) * (r if k % 2 == 0 else r * 0.42)) for k, a in enumerate([-math.pi / 2 + j * math.pi / 5 for j in range(10)])], fill=hexc('#e8cc80'))
        wrap_draw(im, star)
    save(grain(im.filter(ImageFilter.GaussianBlur(0.6)), 6), 'window_curtain.jpg', (512, 512))

# ---------------------------------------------------------------- the round rug: indigo, a ring of moons, gold stars
def rug(S=1024):
    im = Image.new('RGBA', (S, S), hexc('#efe2c4')); d = ImageDraw.Draw(im); c = S / 2; R = random.Random(9)
    for r, col in ((500, '#2a2f5c'), (470, '#d8b46a'), (456, '#343a6e'), (300, '#d8b46a'), (288, '#2a2f5c')):
        d.ellipse([c - r, c - r, c + r, c + r], fill=hexc(col))
    for i in range(16): a = i / 16 * math.tau; moon_phase(d, c + math.cos(a) * 378, c + math.sin(a) * 378, 34, (i % 8) / 8, '#f2e4b8', '#22264c')
    for _ in range(60):
        a = R.uniform(0, math.tau); r = R.uniform(30, 270); x, y = c + math.cos(a) * r, c + math.sin(a) * r; s_ = R.uniform(5, 11)
        d.polygon([(x + math.cos(t) * (s_ if k % 2 == 0 else s_ * 0.4), y + math.sin(t) * (s_ if k % 2 == 0 else s_ * 0.4)) for k, t in enumerate([-math.pi / 2 + j * math.pi / 4 for j in range(8)])], fill=hexc('#e8c47a'))
    moon_phase(d, c, c, 90, 0.5, '#f4e6b4', '#2a2f5c')
    save(grain(im.filter(ImageFilter.GaussianBlur(0.8)), 12, 0.45), 'window_rug.jpg', (1024, 1024))

# ---------------------------------------------------------------- the tower's stones: grey courses of rounded blocks with dark joints, tiling
def stones(S=1024):
    im = Image.new('RGBA', (S, S), hexc('#5a5a62')); d = ImageDraw.Draw(im); R = random.Random(2); rows = 12; h = S / rows
    for j in range(rows):
        x = -R.uniform(0, 60)
        while x < S:
            w = R.uniform(70, 130); c = R.choice(['#b8b4ac', '#c6c2b8', '#a8a49e', '#bfb8aa', '#cfcac0'])
            def blk(dx, dy, x=x, w=w, c=c, j=j): d.rounded_rectangle([x + dx + 3, j * h + dy + 3, x + w + dx - 3, (j + 1) * h + dy - 3], radius=12, fill=hexc(c))
            wrap_draw(im, blk); x += w
    save(grain(im.filter(ImageFilter.GaussianBlur(1.2)), 18, 0.5), 'window_stones.jpg', (512, 512))

# ---------------------------------------------------------------- roof tiles: navy scallops with a little lilac sheen, tiling
def tiles(S=512):
    im = Image.new('RGBA', (S, S), hexc('#2a3260')); d = ImageDraw.Draw(im); R = random.Random(8); rows, cols = 14, 9; w, h = S / cols, S / rows
    for j in range(rows + 2, -3, -1):                         # laid from the eaves up, each row's rounded edge over the row below;
        for i in range(-1, cols + 1):                         # rows past both edges so the tile repeats without a seam (rows is even)
            x = i * w + (w / 2 if j % 2 else 0); y = j * h; c = R.choice(['#2e3868', '#343e72', '#2a3462', '#3a4278', '#30386a'])
            d.pieslice([x, y - h * 1.3, x + w, y + h * 0.9], 0, 180, fill=hexc(c), outline=hexc('#161a38'), width=3); d.rectangle([x, y - h * 1.3, x + w, y - h * 0.2], fill=hexc(c))
    save(grain(im, 10), 'window_tiles.jpg', (512, 512))

if __name__ == '__main__':
    os.makedirs(TEX, exist_ok=True)
    star_chart(); moon_chart(); frieze(); curtain(); rug(); stones(); tiles()
