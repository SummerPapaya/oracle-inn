# Paints the shrine's flat artwork with PIL: the moonlit view in the round window, the 心安 plaque, the altar
# frontal, the painted beams, the 福/安 lanterns, palace-lantern silk, the cut-porcelain ridge band and the
# fortune-slip drawers. Everything is drawn here, nothing downloaded.  Run:  python3 shrine_tex.py
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
FONTS = os.path.join(HERE, 'fonts')        # open fonts (SIL OFL), subset to the characters these textures use
SERIF, KAI = 'NotoSerifTC-Black-subset.ttf', 'LXGWWenKaiTC-Bold-subset.ttf'
def font(px, face=SERIF): return ImageFont.truetype(os.path.join(FONTS, face), px)   # Noto Serif TC Black for carved and painted gold, LXGW WenKai TC for brushwork
def save(im, name, size=None):
    if size: im = im.resize(size, Image.LANCZOS)
    im.convert('RGB').save(os.path.join(TEX, name), quality=92); print('wrote', name, im.size if not size else size)
def hexc(h, a=255): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))
def glow_layer(S, rgb, draw, blur):
    m = Image.new('L', (S, S), 0); draw(ImageDraw.Draw(m)); m = m.filter(ImageFilter.GaussianBlur(blur))
    lay = Image.new('RGBA', (S, S), rgb + (0,)); lay.putalpha(m); return lay

# ---------------------------------------------------------------- the view through the round window: moon, ink ranges, mist, plum
def moon_panel(S=2048):
    R = random.Random(11)
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im)
    top, mid, low = hexc('#0b1532'), hexc('#1d3558'), hexc('#4a6a86')
    for y in range(S):
        t = y / S; c = lerp(top, mid, min(1, t / 0.55)) if t < 0.55 else lerp(mid, low, (t - 0.55) / 0.45)
        d.line([(0, y), (S, y)], fill=c)
    for _ in range(260):                                             # faint stars in the upper sky
        x, y = R.random() * S, R.random() * S * 0.5; r = R.choice([1, 1, 1.5, 2]); a = R.randint(60, 200)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(230, 236, 255, a))
    mx, my, mr = S * 0.6, S * 0.33, S * 0.17
    def halo(hd):
        for k in range(60, 0, -1):
            r = mr * (1 + k * 0.045); hd.ellipse([mx - r, my - r, mx + r, my + r], fill=int(4 + (60 - k) * 1.2))
    im = Image.alpha_composite(im, glow_layer(S, (255, 236, 196), halo, S * 0.02))
    moon = Image.new('RGBA', (S, S)); md = ImageDraw.Draw(moon)
    md.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=hexc('#fbf1d4'))
    im = Image.alpha_composite(im, moon.filter(ImageFilter.GaussianBlur(2)))
    def maria(md):                                                   # soft maria, laid over the disc
        for _ in range(14):
            a, rr = R.random() * math.tau, R.random() * mr * 0.6; cx, cy = mx + math.cos(a) * rr, my + math.sin(a) * rr; s = mr * (0.1 + R.random() * 0.18)
            md.ellipse([cx - s, cy - s * 0.8, cx + s, cy + s * 0.8], fill=38)
    im = Image.alpha_composite(im, glow_layer(S, (190, 172, 140), maria, 6))
    # cloud wisps crossing the moon
    def wisps(cd):
        for k in range(5):
            y = my - mr * 0.2 + k * mr * 0.32 + R.uniform(-20, 20); x0 = mx - mr * 2.4 + R.uniform(-200, 200); L = mr * (1.4 + R.random() * 1.8)
            for j in range(40):
                t = j / 39; x = x0 + t * L; h = 4 + 12 * math.sin(math.pi * t)
                cd.ellipse([x - 40, y - h, x + 40, y + h], fill=18)
    im = Image.alpha_composite(im, glow_layer(S, (176, 194, 222), wisps, 9))
    # ink ranges: far pale, near dark, each fading into mist at its foot
    layers = [(0.50, '#7f97b0', 0.10, 9, 31), (0.58, '#5d7895', 0.13, 7, 32), (0.67, '#3e5674', 0.15, 6, 33), (0.78, '#25384f', 0.13, 5, 34), (0.9, '#16233a', 0.09, 8, 35)]
    for base, colr, amp, peaks, seed in layers:
        r2 = random.Random(seed); pts = []; n = 220
        cs = [(r2.random(), r2.uniform(0.4, 1.0), r2.uniform(0.04, 0.12)) for _ in range(peaks)]
        for i in range(n + 1):
            x = i / n; h = sum(a_ * math.exp(-((x - c) / w_) ** 2) for c, a_, w_ in cs)
            h += 0.06 * math.sin(x * 37 + seed) * 0.3 + 0.015 * math.sin(x * 140 + seed * 2)
            pts.append((x * S, (base - amp * h) * S))
        lay = Image.new('RGBA', (S, S)); ld = ImageDraw.Draw(lay)
        ld.polygon(pts + [(S, S), (0, S)], fill=hexc(colr))
        # mist: the foot of each range dissolves
        mist = Image.new('L', (S, S), 0); mdd = ImageDraw.Draw(mist)
        for y in range(int((base - 0.02) * S), S):
            t = (y - (base - 0.02) * S) / (0.12 * S); mdd.line([(0, y), (S, y)], fill=int(255 * min(1, max(0.0, t)) ** 1.4 * 0.8))
        lay = Image.composite(Image.new('RGBA', (S, S), (150, 172, 198, 255)), lay, ImageChops.multiply(mist, lay.split()[3]))
        # dry-brush texture along the ridges
        tx = Image.new('L', (S, S), 255); td = ImageDraw.Draw(tx)
        for _ in range(900):
            x, y = r2.random() * S, base * S - r2.random() * amp * S; td.line([(x, y), (x + r2.uniform(-30, 30), y + r2.uniform(10, 60))], fill=r2.randint(180, 235), width=2)
        a_ = ImageChops.multiply(lay.split()[3], tx.filter(ImageFilter.GaussianBlur(1.2))); lay.putalpha(a_)
        im = Image.alpha_composite(im, lay)
        def band(mb):
            for j in range(10):
                y = (base + 0.01) * S + r2.uniform(-30, 30); x0 = r2.random() * S; L = S * r2.uniform(0.2, 0.5)
                mb.ellipse([x0 - L / 2, y - 18, x0 + L / 2, y + 18], fill=60)
        im = Image.alpha_composite(im, glow_layer(S, (190, 206, 226), band, 24))
    im = Image.alpha_composite(im, plum(S, [(S * 0.02, S * 0.36, -0.28, S * 0.5, 40, 4), (S * 0.05, S * 0.3, 0.05, S * 0.32, 22, 3)], 5).filter(ImageFilter.GaussianBlur(0.8)))
    # silk weave
    wv = Image.new('RGBA', (S, S)); wd = ImageDraw.Draw(wv)
    for y in range(0, S, 3): wd.line([(0, y), (S, y)], fill=(255, 255, 255, 7))
    for x in range(0, S, 3): wd.line([(x, 0), (x, S)], fill=(0, 0, 0, 9))
    im = Image.alpha_composite(im, wv)
    save(im, 'shrine_moon.jpg', (1024, 1024))

def plum(S, starts, seed, size=1.0):
    """An old plum branch, zigzagging and thinning, with five-petal blossoms along it, on a transparent layer."""
    br = Image.new('RGBA', (S, S) if isinstance(S, int) else S); bd = ImageDraw.Draw(br); R2 = random.Random(seed); blossoms = []
    def branch(x, y, ang, L, w, depth):
        if depth == 0 or w < 2: return
        segs = R2.randint(2, 4)
        for _ in range(segs):
            ang += R2.uniform(-0.45, 0.45); nx, ny = x + math.cos(ang) * L / segs, y + math.sin(ang) * L / segs
            bd.line([(x, y), (nx, ny)], fill=(28, 20, 22, 255), width=int(w)); bd.ellipse([nx - w / 2, ny - w / 2, nx + w / 2, ny + w / 2], fill=(28, 20, 22, 255))
            if R2.random() < 0.7: blossoms.append((nx + R2.uniform(-8, 8), ny + R2.uniform(-8, 8)))
            x, y = nx, ny; w *= 0.82
        for _ in range(R2.randint(1, 3)): branch(x, y, ang + R2.uniform(-0.9, 0.9), L * 0.65, w * 0.8, depth - 1)
    for st in starts: branch(*st)
    for (x, y) in blossoms:
        r = R2.uniform(9, 17) * size
        for k in range(5):
            a = k * math.tau / 5 + R2.random(); px, py = x + math.cos(a) * r * 0.62, y + math.sin(a) * r * 0.62
            bd.ellipse([px - r * 0.52, py - r * 0.52, px + r * 0.52, py + r * 0.52], fill=(250, 226, 230, 255))
        bd.ellipse([x - r * 0.28, y - r * 0.28, x + r * 0.28, y + r * 0.28], fill=(232, 170, 70, 255))
    return br

# ---------------------------------------------------------------- a meander band, used on the plaque, frontal and beams
def meander(d, x0, y0, x1, y1, col, w=3):
    h = y1 - y0; u = h; x = x0
    while x + u <= x1:
        p = [(x, y1), (x, y0), (x + u, y0), (x + u, y1 - h * 0.33), (x + u * 0.33, y1 - h * 0.33), (x + u * 0.33, y0 + h * 0.33), (x + u * 0.66, y0 + h * 0.33)]
        d.line(p, fill=col, width=w, joint='curve'); x += u * 1.15

# ---------------------------------------------------------------- 心安: black lacquer, gold leaf, carved frame
def plaque(W=2048, H=720):
    im = Image.new('RGBA', (W, H), hexc('#160f0d')); d = ImageDraw.Draw(im); R = random.Random(3)
    for _ in range(4000):                                            # lacquer worn through to red-brown in places
        x, y = R.random() * W, R.random() * H; d.line([(x, y), (x + R.uniform(10, 60), y + R.uniform(-2, 2))], fill=(60 + R.randint(0, 30), 26, 20, R.randint(10, 40)), width=1)
    gold, goldD = hexc('#e6c070'), hexc('#8a6528')
    for i, (m, col_, w) in enumerate([(14, goldD, 10), (22, gold, 4), (70, gold, 3), (78, goldD, 2)]):
        d.rectangle([m, m, W - m, H - m], outline=col_, width=w)
    meander(d, 34, 30, W - 34, 62, gold, 3); meander(d, 34, H - 62, W - 34, H - 30, gold, 3)
    for side in (0, 1):
        x = 30 if side == 0 else W - 64
        for y in range(70, H - 70, 40): d.line([(x, y), (x + 34, y + 20), (x, y + 40)], fill=gold, width=3)
    f = font(470)
    for ch, cx in (('心', W * 0.69), ('安', W * 0.31)):                 # read right to left, as old plaques are
        bb = d.textbbox((0, 0), ch, font=f); w_, h_ = bb[2] - bb[0], bb[3] - bb[1]; x, y = cx - w_ / 2 - bb[0], H / 2 - h_ / 2 - bb[1] + 8
        sh = Image.new('RGBA', (W, H)); ImageDraw.Draw(sh).text((x + 8, y + 10), ch, font=f, fill=(0, 0, 0, 200)); im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(6)))
        g = Image.new('RGBA', (W, H)); gd = ImageDraw.Draw(g)
        for k in range(H):                                           # gold leaf: brighter at the top of each stroke
            t = k / H; gd.line([(0, k), (W, k)], fill=lerp(hexc('#fff0b8'), hexc('#b98a3a'), min(1, t * 1.3)))
        mask = Image.new('L', (W, H)); ImageDraw.Draw(mask).text((x, y), ch, font=f, fill=255)
        im = Image.composite(g, im, mask); d = ImageDraw.Draw(im)
    for (cx, cy, s) in ((W * 0.5, H * 0.24, 46), (W * 0.5, H * 0.76, 46)):   # two small seal marks between the characters
        d.rectangle([cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2], fill=hexc('#a8301e'))
        ImageDraw.Draw(im).text((cx - s * 0.36, cy - s * 0.46), '月', font=font(int(s * 0.72)), fill=hexc('#f2d8a0'))
    save(im, 'shrine_plaque.jpg', (1024, 360))

# ---------------------------------------------------------------- ruyi cloud, drawn as gold couching on silk
def ruyi(d, cx, cy, s, col, w):
    for (ox, oy, r, a0, a1) in [(0, 0, 1, 180, 520), (-1.25, 0.25, 0.7, 120, 430), (1.25, 0.25, 0.7, 110, 420), (-0.6, 0.85, 0.5, 200, 470), (0.6, 0.85, 0.5, 70, 340)]:
        steps = 26; pts = []
        for i in range(steps + 1):
            t = i / steps; a = math.radians(a0 + (a1 - a0) * t); rr = r * s * (1 - 0.55 * t)
            pts.append((cx + ox * s + math.cos(a) * rr, cy + oy * s + math.sin(a) * rr))
        d.line(pts, fill=col, width=w, joint='curve')
    d.line([(cx - 2.1 * s, cy + 1.25 * s), (cx + 2.1 * s, cy + 1.25 * s)], fill=col, width=w)

def frontal(W=2048, H=1536):
    im = Image.new('RGBA', (W, H), hexc('#6e1414')); d = ImageDraw.Draw(im); R = random.Random(8)
    for y in range(0, H, 2): d.line([(0, y), (W, y)], fill=(0, 0, 0, 12 if (y // 2) % 2 else 0))
    gold, goldD, teal, ink = hexc('#e2b860'), hexc('#9a7230'), hexc('#1f4a4c'), hexc('#2a0808')
    d.rectangle([0, 0, W, 230], fill=teal); meander(d, 20, 70, W - 20, 160, gold, 6)
    d.rectangle([0, 230, W, 246], fill=gold)
    # waves and rocks along the bottom (海水江崖)
    for k, colr in enumerate(['#1b3e5c', '#e8dcc0', '#2a6070', '#e8dcc0', '#1f4a4c', '#e8dcc0', '#24577a']):
        y0 = H - 300 + k * 38
        for x0 in range(-60, W + 60, 120):
            d.arc([x0, y0 - 40, x0 + 120, y0 + 40], 180, 360, fill=hexc(colr), width=18)
    for x in (W * 0.22, W * 0.78):
        d.polygon([(x - 90, H - 300), (x - 30, H - 470), (x + 20, H - 430), (x + 80, H - 300)], fill=hexc('#2a5a5a'), outline=gold)
    # medallion: a full moon over clouds, ringed in gold
    cx, cy, r = W / 2, 720, 330
    d.ellipse([cx - r - 20, cy - r - 20, cx + r + 20, cy + r + 20], outline=gold, width=10)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hexc('#5a1010'), outline=goldD, width=4)
    d.ellipse([cx - 150, cy - 230, cx + 150, cy + 70], fill=hexc('#f0ddb0'), outline=gold, width=6)
    for (ox, oy, s) in ((-140, 160, 52), (120, 140, 60), (0, 230, 46)): ruyi(d, cx + ox, cy + oy, s, gold, 7)
    for (x, y, s) in ((300, 520, 60), (1750, 520, 60), (330, 980, 48), (1720, 980, 48), (620, 1080, 40), (1430, 1080, 40)): ruyi(d, x, y, s, gold, 7)
    # satin-stitch sheen on the gold
    sheen = Image.new('RGBA', (W, H)); sd = ImageDraw.Draw(sheen)
    for x in range(0, W, 6): sd.line([(x, 0), (x + 40, H)], fill=(255, 255, 255, 10))
    im = Image.alpha_composite(im, sheen)
    d = ImageDraw.Draw(im)
    for x in range(0, W, 64): d.line([(x, H - 26), (x + 32, H)], fill=gold, width=10)   # fringe
    save(im, 'shrine_frontal.jpg', (1024, 768))

# ---------------------------------------------------------------- painted beam: indigo heart panel, teal rosettes, gold lines
def beam(W=4096, H=512):
    im = Image.new('RGBA', (W, H), hexc('#173a3c')); d = ImageDraw.Draw(im)
    gold, white, blue, green, teal = hexc('#d9b45e'), hexc('#e8e2cc'), hexc('#1f3f78'), hexc('#2f6a4a'), hexc('#2a7a7a')
    d.rectangle([0, 0, W, 36], fill=gold); d.rectangle([0, H - 36, W, H], fill=gold)
    for x0 in (0, W - 300):                                          # end bands
        d.rectangle([x0, 36, x0 + 300, H - 36], fill=blue); d.rectangle([x0 + 40, 36, x0 + 60, H - 36], fill=gold); d.rectangle([x0 + 240, 36, x0 + 260, H - 36], fill=gold)
    for side in (0, 1):                                              # rosettes
        for k in range(3):
            cx = (520 + k * 300) if side == 0 else (W - 520 - k * 300); cy = H / 2
            for rr, colr in ((150, white), (138, green if k % 2 else teal), (96, white), (84, blue), (40, gold)):
                d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=colr)
            for j in range(12):
                a = j * math.tau / 12; d.line([(cx + math.cos(a) * 44, cy + math.sin(a) * 44), (cx + math.cos(a) * 136, cy + math.sin(a) * 136)], fill=white, width=6)
    x0, x1 = 1450, W - 1450                                          # the heart panel, pointed at both ends
    d.polygon([(x0, H / 2), (x0 + 150, 70), (x1 - 150, 70), (x1, H / 2), (x1 - 150, H - 70), (x0 + 150, H - 70)], fill=blue, outline=gold)
    d.line([(x0, H / 2), (x0 + 150, 70), (x1 - 150, 70), (x1, H / 2), (x1 - 150, H - 70), (x0 + 150, H - 70), (x0, H / 2)], fill=gold, width=12)
    for k in range(5): ruyi(d, x0 + 260 + k * (x1 - x0 - 520) / 4, H / 2 - 30, 52, gold, 8)
    save(im, 'shrine_beam.jpg', (2048, 256))

# ---------------------------------------------------------------- the round 福/安 lanterns at the porch (wrapped round a sphere: u around, v down)
def lantern(ch, W=2048, H=1024):
    im = Image.new('RGBA', (W, H), hexc('#d8323a')); d = ImageDraw.Draw(im)
    for y in range(H):
        t = abs(y / H - 0.5) * 2; d.line([(0, y), (W, y)], fill=lerp(hexc('#e8404a'), hexc('#8a1820'), t ** 1.6))
    for k in range(24): x = k * W / 24; d.line([(x, 0), (x, H)], fill=(120, 20, 24, 120), width=6)
    gold = hexc('#e8c060')
    d.rectangle([0, 0, W, 70], fill=hexc('#2a1a10')); d.rectangle([0, H - 70, W, H], fill=hexc('#2a1a10'))
    d.rectangle([0, 70, W, 84], fill=gold); d.rectangle([0, H - 84, W, H - 70], fill=gold)
    f = font(400)
    for cx in (W * 0.25, W * 0.75):
        bb = d.textbbox((0, 0), ch, font=f); w_, h_ = bb[2] - bb[0], bb[3] - bb[1]
        d.ellipse([cx - 250, H / 2 - 250, cx + 250, H / 2 + 250], outline=gold, width=10)
        txt = Image.new('RGBA', (W, H)); ImageDraw.Draw(txt).text((cx - w_ / 2 - bb[0], H / 2 - h_ / 2 - bb[1]), ch, font=f, fill=hexc('#1a0a08'))
        im = Image.alpha_composite(im, txt)
    save(im, f'shrine_lantern_{ {"福": "fu", "安": "an"}[ch] }.jpg', (1024, 512))

# ---------------------------------------------------------------- palace-lantern silk: an ink orchid on cream, a red border
def palace_silk(W=768, H=1024):
    im = Image.new('RGBA', (W, H), hexc('#f2e2c0')); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, H], outline=hexc('#a82a24'), width=46); d.rectangle([60, 60, W - 60, H - 60], outline=hexc('#c99a48'), width=6)
    d.ellipse([W * 0.3, H * 0.16, W * 0.82, H * 0.16 + W * 0.52], fill=hexc('#f8eccc'), outline=hexc('#e2c890'), width=4)
    im = Image.alpha_composite(im, plum((W, H), [(60, H * 0.82, -0.62, H * 0.5, 26, 4), (90, H * 0.7, -0.2, H * 0.3, 16, 3)], 23, 1.6))
    save(im.filter(ImageFilter.GaussianBlur(0.6)), 'shrine_silk.jpg', (384, 512))

# ---------------------------------------------------------------- cut-porcelain ridge band: shards in jade, ochre, rose and white on lime plaster
def ridge_band(W=4096, H=512):
    im = Image.new('RGBA', (W, H), hexc('#e8dcc4')); d = ImageDraw.Draw(im); R = random.Random(31)
    d.rectangle([0, 0, W, 40], fill=hexc('#2f6a5a')); d.rectangle([0, H - 40, W, H], fill=hexc('#2f6a5a'))
    pal = ['#2f8a6a', '#4aa88a', '#1f6a7a', '#e8b84a', '#d86a5a', '#f2e8d8', '#3a7ab8']
    def shard(cx, cy, r, colr):
        n = R.randint(3, 5); pts = [(cx + math.cos(a) * r * R.uniform(0.6, 1.1), cy + math.sin(a) * r * R.uniform(0.6, 1.1)) for a in sorted(R.uniform(0, math.tau) for _ in range(n))]
        d.polygon(pts, fill=hexc(colr), outline=(255, 255, 255, 140))
    for k in range(9):
        cx = 230 + k * (W - 460) / 8; cy = H / 2
        for j in range(18):                                          # leaves
            a = R.uniform(0, math.tau); rr = R.uniform(110, 190); shard(cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.55, R.uniform(16, 26), R.choice(['#2f8a6a', '#4aa88a', '#1f6a7a']))
        petal = R.choice(['#d86a5a', '#e8b84a', '#f2e8d8', '#3a7ab8'])
        for ring, (rr, n, s) in enumerate(((110, 14, 26), (72, 10, 22), (36, 6, 18))):
            for j in range(n):
                a = j * math.tau / n + ring * 0.3; shard(cx + math.cos(a) * rr, cy + math.sin(a) * rr * 0.8, s, petal if ring != 1 else R.choice(pal))
        shard(cx, cy, 18, '#e8b84a')
    save(im, 'shrine_ridge.jpg', (2048, 256))

# ---------------------------------------------------------------- sixty fortune-slip drawers, each with a paper label 一 … 六十
NUM = '一二三四五六七八九十'
def cn(n):
    if n <= 10: return NUM[n - 1]
    t, o = divmod(n, 10); return (NUM[t - 1] if t > 1 else '') + '十' + (NUM[o - 1] if o else '')
def drawers(cols=10, rows=6, cw=200, ch=240):
    W, H = cols * cw, rows * ch; im = Image.new('RGBA', (W, H), hexc('#3a2316')); d = ImageDraw.Draw(im); R = random.Random(41)
    f, f3 = font(46, KAI), font(36, KAI)       # three-character numbers get a smaller brush so they fit the label
    for r in range(rows):
        for c in range(cols):
            x0, y0 = c * cw, r * ch; n = r * cols + c + 1
            base = lerp(hexc('#5a3820'), hexc('#6e4628'), R.random())
            d.rectangle([x0 + 8, y0 + 8, x0 + cw - 8, y0 + ch - 8], fill=base, outline=hexc('#24140c'), width=6)
            for k in range(18):                                     # grain
                yy = y0 + 14 + R.random() * (ch - 28); d.line([(x0 + 14, yy), (x0 + cw - 14, yy + R.uniform(-4, 4))], fill=(40, 22, 12, 60), width=1)
            lx, ly, lw, lh = x0 + cw / 2 - 34, y0 + 26, 68, 130
            d.rectangle([lx, ly, lx + lw, ly + lh], fill=hexc('#efe2c2'), outline=hexc('#a8301e'), width=3)
            s = cn(n); fs = f if len(s) < 3 else f3; step = lh / len(s); yy = ly
            for chh in s:
                bb = d.textbbox((0, 0), chh, font=fs); d.text((lx + lw / 2 - (bb[2] - bb[0]) / 2 - bb[0], yy + step / 2 - (bb[3] - bb[1]) / 2 - bb[1]), chh, font=fs, fill=hexc('#2a1a12')); yy += step
    save(im, 'shrine_drawers.jpg', (1000, 720))

# ---------------------------------------------------------------- the couplet beside the round window: gold on black lacquer, read top to bottom
def couplet(text, name, W=320, H=1600):
    im = Image.new('RGBA', (W, H), hexc('#1a1210')); d = ImageDraw.Draw(im); R = random.Random(len(text))
    for _ in range(900):
        x, y = R.random() * W, R.random() * H; d.line([(x, y), (x + R.uniform(-1, 1), y + R.uniform(8, 40))], fill=(70, 30, 22, R.randint(10, 40)), width=1)
    gold = hexc('#e2bc6a'); d.rectangle([12, 12, W - 12, H - 12], outline=gold, width=6); d.rectangle([26, 26, W - 26, H - 26], outline=hexc('#8a6528'), width=2)
    f = font(200, KAI); step = (H - 140) / len(text)
    for i, ch in enumerate(text):
        bb = d.textbbox((0, 0), ch, font=f); x = W / 2 - (bb[2] - bb[0]) / 2 - bb[0]; y = 70 + i * step + step / 2 - (bb[3] - bb[1]) / 2 - bb[1]
        g = Image.new('RGBA', (W, H)); gd = ImageDraw.Draw(g)
        for k in range(H): gd.line([(0, k), (W, k)], fill=lerp(hexc('#fff0b8'), hexc('#b98a3a'), ((k - y) / (bb[3] - bb[1] + 1)) % 1.0))
        mask = Image.new('L', (W, H)); ImageDraw.Draw(mask).text((x, y), ch, font=f, fill=255)
        im = Image.composite(g, im, mask); d = ImageDraw.Draw(im)
    save(im, name, (160, 800))

# ---------------------------------------------------------------- four hanging scrolls: plum, orchid, bamboo, chrysanthemum in ink on silk, mounted in brocade
def blade(d, pts, w, fill):
    left, right = [], []
    n = len(pts)
    for i in range(n):
        j = min(i, n - 2); dx, dy = pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]; l = math.hypot(dx, dy) or 1
        ww = w * math.sin(math.pi * min(1, (i / (n - 1)) * 1.1 + 0.04)) ** 0.8; nx, ny = -dy / l * ww, dx / l * ww
        left.append((pts[i][0] + nx, pts[i][1] + ny)); right.append((pts[i][0] - nx, pts[i][1] - ny))
    d.polygon(left + right[::-1], fill=fill)
def curve(x0, y0, x1, y1, bend, n=24):
    mx, my = (x0 + x1) / 2 - (y1 - y0) * bend, (y0 + y1) / 2 + (x1 - x0) * bend
    return [((1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1) for t in [i / (n - 1) for i in range(n)]]
def scroll(kind, title, name, W=600, H=1800):
    R = random.Random(hash(kind) % 1000)
    im = Image.new('RGBA', (W, H), hexc('#3a5a5a')); d = ImageDraw.Draw(im)
    for y in range(0, H, 6): d.line([(0, y), (W, y)], fill=(255, 255, 255, 10))              # brocade
    for k in range(0, H, 60):
        for x in range(0, W, 60): d.ellipse([x + 22, k + 22, x + 38, k + 38], outline=hexc('#7a9a90', 120), width=2)
    px0, py0, px1, py1 = 60, 260, W - 60, H - 240
    d.rectangle([px0 - 8, py0 - 8, px1 + 8, py1 + 8], fill=hexc('#c9a45a'))
    silk = Image.new('RGBA', (px1 - px0, py1 - py0), hexc('#ece0c4')); sd = ImageDraw.Draw(silk); sw, sh = silk.size
    for _ in range(1600): x, y = R.random() * sw, R.random() * sh; sd.point((x, y), fill=(180, 160, 120, 60))
    ink, inkL = (34, 32, 30, 255), (90, 92, 88, 255)
    if kind == 'bamboo':
        for k, (x, lean) in enumerate(((sw * 0.42, 0.04), (sw * 0.62, -0.03), (sw * 0.3, 0.06))):
            col_ = ink if k < 2 else inkL; y = sh; seg = R.uniform(130, 170)
            while y > sh * 0.08:
                ny = y - seg; d2 = lean * seg
                sd.line([(x, y), (x + d2, ny + 6)], fill=col_, width=18 - 4 * k); x += d2; y = ny
                sd.line([(x - 12, y + 4), (x + 12, y)], fill=col_, width=4)
        for _ in range(26):
            bx, by = sw * R.uniform(0.25, 0.75), sh * R.uniform(0.1, 0.6); a = R.uniform(-0.6, 0.6) + (math.pi if R.random() < 0.5 else 0)
            blade(sd, curve(bx, by, bx + math.cos(a) * 110, by + math.sin(a) * 50 + 40, 0.15), 11, ink if R.random() < 0.7 else inkL)
    elif kind == 'orchid':
        bx, by = sw * 0.45, sh * 0.82
        for k in range(9):
            a = math.radians(-160 + k * 16 + R.uniform(-6, 6)); L = R.uniform(260, 460)
            blade(sd, curve(bx, by, bx + math.cos(a) * L, by + math.sin(a) * L * 0.9, 0.25 * (1 if k % 2 else -1)), 9, ink)
        for (fx, fy) in ((sw * 0.55, sh * 0.5), (sw * 0.38, sh * 0.56), (sw * 0.64, sh * 0.6)):
            sd.line(curve(bx, by, fx, fy, 0.1), fill=inkL, width=3)
            for j in range(5):
                a = j * math.tau / 5 - math.pi / 2; blade(sd, curve(fx, fy, fx + math.cos(a) * 36, fy + math.sin(a) * 30, 0.2, 10), 8, (150, 96, 120, 255))
        sd.ellipse([bx - 70, by - 10, bx + 70, by + 30], fill=inkL)
    elif kind == 'chrys':
        sd.line(curve(sw * 0.5, sh, sw * 0.45, sh * 0.35, 0.05), fill=ink, width=8); sd.line(curve(sw * 0.5, sh * 0.8, sw * 0.68, sh * 0.48, -0.1), fill=ink, width=6)
        for _ in range(10):
            lx, ly = sw * R.uniform(0.3, 0.7), sh * R.uniform(0.45, 0.9); blade(sd, curve(lx, ly, lx + R.uniform(-80, 80), ly + R.uniform(-40, 40), 0.3, 10), 24, inkL)
        for (fx, fy, r, colr) in ((sw * 0.45, sh * 0.33, 70, (214, 160, 50, 255)), (sw * 0.68, sh * 0.46, 56, (200, 120, 60, 255)), (sw * 0.36, sh * 0.5, 48, (214, 160, 50, 255))):
            for j in range(34):
                a = j * math.tau / 34 + R.random() * 0.1; rr = r * R.uniform(0.75, 1.0)
                sd.line([(fx + math.cos(a) * 10, fy + math.sin(a) * 10), (fx + math.cos(a) * rr, fy + math.sin(a) * rr * 0.8)], fill=colr, width=5)
            sd.ellipse([fx - 12, fy - 10, fx + 12, fy + 10], fill=(140, 80, 30, 255))
    else:                                                             # plum
        silk = Image.alpha_composite(silk, plum(silk.size, [(sw * 0.15, sh * 0.95, -1.3, sh * 0.75, 30, 4), (sw * 0.2, sh * 0.7, -0.6, sh * 0.35, 18, 3)], 41, 1.4))
        sd = ImageDraw.Draw(silk)
    f = font(54, KAI); y = 50
    for ch in title:                                                  # a short title down the right edge, and a red seal
        bb = sd.textbbox((0, 0), ch, font=f); sd.text((sw - 80 - bb[0], y - bb[1]), ch, font=f, fill=(40, 34, 30, 230)); y += 62
    sd.rectangle([sw - 82, y + 10, sw - 32, y + 60], fill=hexc('#b02a1e'))
    im.paste(silk, (px0, py0))
    d = ImageDraw.Draw(im)
    for yy in (0, H - 40): d.rectangle([0, yy, W, yy + 40], fill=hexc('#2a1a10'))
    save(im, name, (200, 600))

# ---------------------------------------------------------------- 八仙彩: the red embroidered banner hung across a Minnan temple's front, scalloped below
def baxian(W=4096, H=640):
    im = Image.new('RGBA', (W, H), hexc('#4a0e0c')); d = ImageDraw.Draw(im); R = random.Random(77)    # opaque: a bake keeps no alpha
    gold, goldD, red, redD, teal = hexc('#e6be62'), hexc('#9a7030'), hexc('#a8201c'), hexc('#6e1210'), hexc('#1f5a5a')
    d.rectangle([0, 0, W, 110], fill=teal); meander(d, 10, 30, W - 10, 84, gold, 5); d.rectangle([0, 110, W, 124], fill=gold)
    d.rectangle([0, 124, W, 470], fill=red)
    for y in range(124, 470, 3): d.line([(0, y), (W, y)], fill=(0, 0, 0, 14 if (y // 3) % 2 else 0))
    n = 7
    for k in range(n):                                               # medallions of clouds and blossoms in gold couching
        cx = (k + 0.5) * W / n; cy = 297
        d.ellipse([cx - 150, cy - 140, cx + 150, cy + 140], outline=gold, width=8); d.ellipse([cx - 132, cy - 122, cx + 132, cy + 122], fill=redD)
        if k % 2: ruyi(d, cx, cy - 10, 46, gold, 8)
        else:
            for j in range(8):
                a = j * math.tau / 8; d.ellipse([cx + math.cos(a) * 55 - 30, cy + math.sin(a) * 55 - 30, cx + math.cos(a) * 55 + 30, cy + math.sin(a) * 55 + 30], fill=hexc('#e89a8a'), outline=gold, width=4)
            d.ellipse([cx - 28, cy - 28, cx + 28, cy + 28], fill=gold)
        if k < n - 1: ruyi(d, (k + 1) * W / n, 297, 30, goldD, 6)
    d.rectangle([0, 466, W, 480], fill=gold)
    sw = W / 28                                                      # scallops with a gold edge, a tassel at each point
    for k in range(28):
        x0 = k * sw; d.pieslice([x0, 480 - sw / 2, x0 + sw, 480 + sw / 2], 0, 180, fill=teal, outline=gold, width=5)
        for q in range(6): d.line([(x0 + q * sw / 6, 480 + sw / 2 * math.sin(math.pi * q / 6)), (x0 + q * sw / 6, 640)], fill=goldD if q % 2 else gold, width=4)
        d.line([(x0, 480), (x0, 640)], fill=gold, width=8)
    sheen = Image.new('RGBA', (W, H)); sd = ImageDraw.Draw(sheen)
    for x in range(0, W, 7): sd.line([(x, 124), (x + 30, 470)], fill=(255, 255, 255, 9))
    im = Image.alpha_composite(im, sheen)
    im.save(os.path.join(TEX, 'shrine_baxian.png')); print('wrote shrine_baxian.png')

if __name__ == '__main__':
    os.makedirs(TEX, exist_ok=True)
    moon_panel(); plaque(); frontal(); beam(); lantern('福'); lantern('安'); palace_silk(); ridge_band(); drawers(); couplet('月明心自靜', 'shrine_couplet_r.jpg'); couplet('風定意常安', 'shrine_couplet_l.jpg')
    baxian()
    for k, (kind, title) in enumerate((('plum', '暗香浮動'), ('orchid', '空谷幽蘭'), ('bamboo', '清風高節'), ('chrys', '東籬秋色'))): scroll(kind, title, f'shrine_scroll{k}.jpg')
