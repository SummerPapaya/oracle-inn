# Paints the Nordic hearth's flat artwork with PIL: a striped rag rug, a Finnish ryijy hanging, a Selbu-star knit for the
# cushions and the blanket, a little painting of the northern lights over a lake, and a board with the twenty-four runes
# of the Elder Futhark carved in three rows of eight. Everything is drawn here, nothing downloaded; the runes are drawn
# from the strokes in src/_runes.txt, the same ones the page and the proofreading table use.
# Run:  python3 hearth_tex.py
import math, os, random, re, json
from PIL import Image, ImageDraw, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
def hexc(h, a=255): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)
def save(im, name, size=None):
    if size: im = im.resize(size, Image.LANCZOS)
    im.convert('RGB').save(os.path.join(TEX, name), quality=92); print('wrote', name, im.size if not size else size)
def grain(im, amt=10, keep=0.35):
    n = Image.effect_noise(im.size, amt).point(lambda v: max(0, min(255, int(238 + (v - 128) * keep))))
    return ImageChops.multiply(im.convert('RGB'), Image.merge('RGB', (n, n, n))).convert('RGBA')
def runes():
    """each rune's strokes on its 10 × 16 grid, read out of src/_runes.txt"""
    src = open(os.path.join(HERE, '..', 'src', '_runes.txt'), encoding='utf-8').read()
    body = src[src.index('const RUNES_FUTHARK = ['):src.index('];', src.index('const RUNES_FUTHARK = ['))]
    return [json.loads(m) for m in re.findall(r"\],? '[^']*',\s*\n\s*(\[\[[\d, \[\]]+\]\])\]", body)]

# ---------------------------------------------------------------- a rag rug: woven stripes of torn cloth, a fringe at each end
def rug(W=1024, H=1536):
    im = Image.new('RGBA', (W, H), hexc('#e8dcc4')); d = ImageDraw.Draw(im); R = random.Random(4)
    band = [('#b23a2e', 70), ('#e8dcc4', 26), ('#2f4a6e', 44), ('#e8dcc4', 22), ('#c8a052', 30), ('#e8dcc4', 22), ('#6e8a6a', 38), ('#e8dcc4', 26)]
    y, k = 90, 0
    while y < H - 90:
        c, h = band[k % len(band)]; k += 1
        for yy in range(int(y), int(min(y + h, H - 90)), 6):                 # each weft row a little different, like torn strips
            cc = hexc(c); j = R.randint(-14, 14)
            d.rectangle([60, yy, W - 60, yy + 5], fill=(max(0, min(255, cc[0] + j)), max(0, min(255, cc[1] + j)), max(0, min(255, cc[2] + j)), 255))
        y += h
    for x in range(60, W - 60, 12):                                          # the warp threads showing through, the fringes
        d.line([(x, 90), (x, H - 90)], fill=hexc('#000000', 18), width=2)
        for y0, y1 in ((20, 90), (H - 90, H - 20)): d.line([(x + R.uniform(-3, 3), y0), (x + R.uniform(-3, 3), y1)], fill=hexc('#efe4cc'), width=4)
    im = im.filter(ImageFilter.GaussianBlur(0.8))
    save(grain(im, 16, 0.5), 'hearth_rug.jpg', (512, 768))

# ---------------------------------------------------------------- a ryijy: a deep red pile rug hung on the wall, a tree of life in diamonds
def ryijy(W=768, H=1024):
    im = Image.new('RGBA', (W, H), hexc('#7a1e22')); d = ImageDraw.Draw(im); R = random.Random(6)
    for y in range(0, H, 4):
        for x in range(0, W, 4):
            if R.random() < 0.35: d.rectangle([x, y, x + 3, y + 3], fill=hexc(R.choice(['#8a2428', '#6a181c', '#922c2c'])))
    cx = W / 2
    d.rectangle([40, 40, W - 40, H - 80], outline=hexc('#d8a84a'), width=14)
    d.rectangle([70, 70, W - 70, H - 110], outline=hexc('#1e2e52'), width=10)
    for k in range(7):                                                       # the trunk: a column of diamonds
        y = 200 + k * 92; s = 34
        d.polygon([(cx, y - s), (cx + s, y), (cx, y + s), (cx - s, y)], fill=hexc('#d8a84a'))
        d.polygon([(cx, y - s / 2), (cx + s / 2, y), (cx, y + s / 2), (cx - s / 2, y)], fill=hexc('#1e2e52'))
    for k in range(5):                                                       # branches: little stepped diamonds either side
        y = 250 + k * 110
        for side in (-1, 1):
            for j in range(1, 4):
                x = cx + side * (40 + j * 52); y2 = y - j * 22; s = 22 - j * 3
                d.polygon([(x, y2 - s), (x + s, y2), (x, y2 + s), (x - s, y2)], fill=hexc(['#e8c46a', '#3e7a6a', '#e8dcc4'][j % 3]))
    for side in (-1, 1):                                                     # birds at the top, a sun between them
        x = cx + side * 150; d.polygon([(x - 30, 160), (x + 30, 160), (x + side * 40, 130), (x, 145)], fill=hexc('#e8dcc4'))
    d.ellipse([cx - 34, 96, cx + 34, 164], fill=hexc('#e8b04a'))
    for x in range(48, W - 40, 10): d.line([(x, H - 80), (x + R.uniform(-4, 4), H - 10)], fill=hexc('#d8a84a'), width=5)       # the fringe
    im = im.filter(ImageFilter.GaussianBlur(1.4))
    save(grain(im, 22, 0.55), 'hearth_ryijy.jpg', (384, 512))

# ---------------------------------------------------------------- a Selbu knit: eight-petalled stars in red on cream, tiling
def knit(S=512):
    im = Image.new('RGBA', (S, S), hexc('#efe6d6')); d = ImageDraw.Draw(im); n = 32; st = S / n           # 32 × 32 stitches, two stars across
    def on(dx, dy):
        """an eight-petalled star: a diamond petal along each of the eight directions, a thin gap between petals"""
        for k in range(8):
            a = k * math.pi / 4; t = dx * math.cos(a) + dy * math.sin(a); u = -dx * math.sin(a) + dy * math.cos(a)
            if 0.8 <= t <= 7.2 and abs(u) <= 0.33 * min(t - 0.8, 7.2 - t) + 0.2: return True
        return False
    for j in range(n):
        for i in range(n):
            # stars on a diamond lattice: one in each 16 × 16 cell, every other row shifted half a cell
            cx = 8 + 16 * round((i - 8 - (8 if (j // 16) % 2 else 0)) / 16) + (8 if (j // 16) % 2 else 0); cy = 8 + 16 * (j // 16)
            x_ = ((i - cx + 16) % 32) - 16; y_ = j - cy
            c = '#b2262e' if on(x_, y_) else ('#e6dcc8' if (i * 3 + j * 5) % 11 == 0 else '#efe6d6')
            d.ellipse([i * st, j * st, i * st + st, j * st + st * 1.2], fill=hexc(c))       # a stitch is a little upright V
    save(grain(im.filter(ImageFilter.GaussianBlur(0.5)), 10, 0.4), 'hearth_knit.jpg', (512, 512))

# ---------------------------------------------------------------- a painting: the northern lights over a still lake, pines along the shore
def painting(W=1024, H=768):
    im = Image.new('RGB', (W, H), hexc('#0e1a30')[:3]); d = ImageDraw.Draw(im); R = random.Random(12)
    for y in range(H):                                                        # the sky darkest at the top
        k = min(1, y / (H * 0.62)); d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * k) for a, b in zip((10, 18, 36), (26, 52, 74))))
    glow = Image.new('RGB', (W, H), (0, 0, 0)); g = ImageDraw.Draw(glow)
    def noise1(seed, scale, octaves=3):
        """smooth 1D value noise, 0..1: random knots scale px apart, eased between, a few octaves; never periodic"""
        rr = random.Random(seed); knots = [[rr.random() for _ in range(W // max(1, int(scale / 2 ** o)) + 3)] for o in range(octaves)]
        def f(x):
            v, amp, tot = 0.0, 1.0, 0.0
            for o in range(octaves):
                sc_ = scale / 2 ** o; u = x / sc_; i = int(u); t = u - i; t = t * t * (3 - 2 * t); k = knots[o]
                v += amp * (k[i] * (1 - t) + k[i + 1] * t); tot += amp; amp *= 0.5
            return v / tot
        return f
    # two or three ribbons of light, each hanging from a hem that wanders across the sky: the hem and the height drift by noise,
    # the brightness gathers into patches of any width, and fine rays of random strength run up from the hem
    for k, (base, seed) in enumerate(((300, 21), (250, 37), (345, 53))):
        layer = Image.new('RGB', (W, H), (0, 0, 0)); g = ImageDraw.Draw(layer)       # each ribbon on its own, added together after
        hem, tall, bright, fold = noise1(seed, 420), noise1(seed + 1, 260), noise1(seed + 2, 300, 4), noise1(seed + 3, 600)
        rays = [R.random() ** 2 for _ in range(W + 2)]
        for x in range(0, W, 1):
            y = base + 170 * (hem(x) - 0.5) + 60 * (fold(x) - 0.5) * math.sin(x / 200 + k)
            b0 = max(0.0, bright(x) - 0.32) / 0.68
            if b0 <= 0: continue
            ray = 0.55 + 0.45 * (rays[x] * 0.6 + rays[x + 1] * 0.4); h = 90 + 220 * tall(x)
            for j in range(0, int(h), 3):
                f = (1 - j / h) ** 1.6 * b0 * ray; top = j / h
                c = (int(40 + 120 * top), int(235 * (1 - 0.6 * top)), int(140 + 60 * top))
                g.line([(x, y - j - 3), (x, y - j)], fill=tuple(int(v * min(1.0, f * 1.3)) for v in c))
        glow = ImageChops.add(glow, layer)
    im = ImageChops.screen(im, glow.filter(ImageFilter.GaussianBlur(3.5))).convert('RGBA')
    d = ImageDraw.Draw(im)
    for _ in range(160): x, y = R.uniform(0, W), R.uniform(0, H * 0.45); d.point((x, y), fill=hexc('#ffffff', R.randint(120, 255)))
    hz = H * 0.62
    d.polygon([(0, hz), (180, hz - 90), (330, hz - 40), (520, hz - 130), (700, hz - 50), (860, hz - 100), (W, hz - 30), (W, hz), (0, hz)], fill=hexc('#1a2a3c'))
    d.rectangle([0, hz, W, H], fill=hexc('#122238'))
    refl = im.crop((0, int(hz - 300), W, int(hz))).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(3))
    im.paste(Image.blend(Image.new('RGBA', refl.size, hexc('#122238')), refl, 0.45), (0, int(hz)))
    d = ImageDraw.Draw(im)
    for x in range(-20, W + 40, 34):                                          # pines along the near shore
        h = R.uniform(70, 150); y0 = hz + 30
        d.polygon([(x, y0 - h), (x + 22, y0), (x - 22, y0)], fill=hexc('#08121c'))
    d.rectangle([0, hz + 28, W, hz + 60], fill=hexc('#08121c'))
    save(grain(im.filter(ImageFilter.GaussianBlur(1.0)), 14, 0.45), 'hearth_painting.jpg', (512, 384))

# ---------------------------------------------------------------- the futhark board: pale birch, the 24 runes burnt in, three rows of eight
def futhark(W=2048, H=768):
    im = Image.new('RGBA', (W, H), hexc('#d8c09a')); d = ImageDraw.Draw(im); R = random.Random(14)
    for y in range(0, H, 3): d.line([(0, y), (W, y + R.uniform(-2, 2))], fill=hexc(R.choice(['#d2b890', '#dcc6a2', '#ceb48a', '#d8c09a'])), width=3)   # grain along the board
    for _ in range(5): x, y = R.uniform(100, W - 100), R.uniform(100, H - 100); d.ellipse([x - 26, y - 12, x + 26, y + 12], outline=hexc('#a88a60'), width=3)   # knots
    d.rectangle([20, 20, W - 20, H - 20], outline=hexc('#6a4a2a'), width=10)
    RS = runes(); assert len(RS) == 24, len(RS)
    cw, ch = (W - 160) / 8, (H - 120) / 3
    for k, strokes in enumerate(RS):
        x0, y0 = 80 + (k % 8) * cw + cw / 2 - 50, 60 + (k // 8) * ch + ch / 2 - 80
        for st in strokes:
            pts = [(x0 + st[i] * 10, y0 + st[i + 1] * 10) for i in range(0, len(st), 2)]
            d.line(pts, fill=hexc('#3a2614'), width=16, joint='curve')
            for x, y in pts: d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=hexc('#3a2614'))
    for j in (1, 2): d.line([(60, 60 + j * ch), (W - 60, 60 + j * ch)], fill=hexc('#8a6a40'), width=4)
    save(grain(im.filter(ImageFilter.GaussianBlur(0.7)), 10, 0.4), 'hearth_futhark.jpg', (1024, 384))

# ---------------------------------------------------------------- a kurbits panel painted on the lime over the fire: a vase of flowers, scrolling stems, an ochre frame
def kurbits(W=1536, H=384):
    im = Image.new('RGBA', (W, H), hexc('#ebe3d4')); d = ImageDraw.Draw(im); R = random.Random(19)
    RED, BLUE, GREEN, OCHRE, CREAM = '#b23a2e', '#2e4e7a', '#4c7a4a', '#d29a3e', '#f4ead8'
    d.rounded_rectangle([14, 14, W - 14, H - 14], radius=40, outline=hexc('#a8452e'), width=10)
    d.rounded_rectangle([34, 34, W - 34, H - 34], radius=28, outline=hexc(BLUE, 200), width=4)
    for x, y in ((60, 60), (W - 60, 60), (60, H - 60), (W - 60, H - 60)): d.ellipse([x - 10, y - 10, x + 10, y + 10], fill=hexc(RED))
    cx, cy = W / 2, H / 2 + 10
    def leaf(x, y, a, L, col):
        pts = [(x + math.cos(a + t) * L * (1 - abs(t) / 0.6) * (k / 10) , y + math.sin(a + t) * L * (k / 10)) for k, t in ((0, 0), (5, 0.35), (10, 0), (5, -0.35))]
        d.polygon([(x, y)] + [(x + math.cos(a) * L * 0.5 + math.cos(a + 1.57) * L * 0.18, y + math.sin(a) * L * 0.5 + math.sin(a + 1.57) * L * 0.18), (x + math.cos(a) * L, y + math.sin(a) * L), (x + math.cos(a) * L * 0.5 - math.cos(a + 1.57) * L * 0.18, y + math.sin(a) * L * 0.5 - math.sin(a + 1.57) * L * 0.18)], fill=hexc(col))
    def flower(x, y, r, petal, centre):
        for k in range(8):
            a = k * math.pi / 4; d.ellipse([x + math.cos(a) * r * 0.62 - r * 0.42, y + math.sin(a) * r * 0.62 - r * 0.42, x + math.cos(a) * r * 0.62 + r * 0.42, y + math.sin(a) * r * 0.62 + r * 0.42], fill=hexc(petal))
        d.ellipse([x - r * 0.45, y - r * 0.45, x + r * 0.45, y + r * 0.45], fill=hexc(centre)); d.ellipse([x - r * 0.18, y - r * 0.18, x + r * 0.18, y + r * 0.18], fill=hexc(OCHRE))
    def tulip(x, y, s, col):
        d.polygon([(x - s, y), (x - s * 0.7, y - s * 1.5), (x - s * 0.25, y - s * 0.9), (x, y - s * 1.7), (x + s * 0.25, y - s * 0.9), (x + s * 0.7, y - s * 1.5), (x + s, y), (x, y + s * 0.5)], fill=hexc(col))
        d.line([(x, y - s * 1.2), (x, y + s * 0.2)], fill=hexc(CREAM), width=3)
    # the stems: S-scrolls running out from the vase to either side, leaves along them, flowers and tulips at their ends
    for side in (-1, 1):
        pts = [(cx + side * (60 + t * 520), cy + 18 - 70 * math.sin(t * math.pi * 1.6) * (1 - 0.3 * t)) for t in [k / 40 for k in range(41)]]
        d.line(pts, fill=hexc(GREEN), width=12, joint='curve')
        for k in range(3, 40, 3):
            x, y = pts[k]; a = math.atan2(pts[k + 1][1] - y, pts[k + 1][0] - x) + side * (1.2 if k % 2 else -1.2) * (1 if side > 0 else -1)
            leaf(x, y, a, 64, GREEN if k % 2 else '#6a9a5a')
            if k % 9 == 0:                                                     # a curled tendril off the stem
                cur = [(x + side * (6 + j * 2.2) * math.cos(j * 0.5), y - 10 - (6 + j * 2.2) * math.sin(j * 0.5)) for j in range(14)]
                d.line(cur, fill=hexc(GREEN), width=5, joint='curve')
        for k, (x, y) in enumerate((pts[14], pts[27], pts[40])):
            if k == 1: tulip(x, y - 26, 26, BLUE)
            else: flower(x, y - 8, 40 if k == 2 else 32, RED if k == 2 else BLUE, CREAM)
        sx, sy = pts[40]; d.arc([sx - 60 + side * 30, sy - 80, sx + 60 + side * 30, sy + 40], 200 if side > 0 else -20, 340 if side > 0 else 120, fill=hexc(GREEN), width=7)
    # the vase, and the big flower over it
    d.polygon([(cx - 56, cy + 110), (cx + 56, cy + 110), (cx + 40, cy + 60), (cx + 64, cy + 20), (cx - 64, cy + 20), (cx - 40, cy + 60)], fill=hexc(BLUE))
    d.rectangle([cx - 70, cy + 12, cx + 70, cy + 24], fill=hexc(OCHRE))
    for k in range(5): d.ellipse([cx - 44 + k * 22 - 5, cy + 70, cx - 44 + k * 22 + 5, cy + 80], fill=hexc(CREAM))
    for side in (-1, 1): leaf(cx + side * 10, cy + 10, -math.pi / 2 + side * 0.9, 80, GREEN)
    flower(cx, cy - 60, 62, RED, CREAM)
    for side in (-1, 1): tulip(cx + side * 92, cy - 20, 24, RED)
    for _ in range(40):                                                         # little dots of paint, the painter's flourishes
        x, y = R.uniform(80, W - 80), R.uniform(70, H - 70)
        if abs(x - cx) > 140: d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=hexc(R.choice([RED, BLUE, OCHRE]), 220))
    im = im.filter(ImageFilter.GaussianBlur(1.1))
    save(grain(im, 14, 0.45), 'hearth_kurbits.jpg', (1024, 256))

if __name__ == '__main__':
    os.makedirs(TEX, exist_ok=True)
    rug(); ryijy(); knit(); painting(); futhark(); kurbits()
