# Paints the tea room's flat artwork with PIL: the sage-and-rose wallpaper, the gilt fascia board, the chalkboard menu,
# the tea-tin labels, the hanging teacup sign, the Persian rug, the fish-scale slates of the mansard roof, the lace of
# the tablecloth, the rose-sprigged china and the awning's stripes. Everything is drawn here, nothing downloaded; the
# lettering is in the open fonts the site hosts (webfont.py). The two silhouette portraits and the framed card prints
# come from the page's own Lenormand painter (tex/tea_card_*.png, tex/tea_portrait_*.png), exported once.
# Run:  python3 tea_tex.py
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
    """draw something that may cross an edge of a tiling texture: drawn nine times, shifted by the tile size"""
    W, H = im.size
    for dx in (-W, 0, W):
        for dy in (-H, 0, H): fn(dx, dy)
SERIF, LATIN, BRUSH = ('Noto Serif SC', '900'), ('Cormorant Garamond', '600'), ('Long Cang', None)
def text(d, xy, s, face, px, fill, anchor='m', track=0):
    return webfont.draw_text(d, xy, s, face[0], px, fill, face[1], anchor, track)

# ---------------------------------------------------------------- wallpaper: sage stripes and little rose bouquets in a diamond lattice
def rose(d, x, y, r, R, petal='#d98a9a', heart='#b85a70'):
    for k in range(6):
        a = k / 6 * math.tau + R.uniform(-0.2, 0.2); d.ellipse([x + math.cos(a) * r * 0.55 - r * 0.55, y + math.sin(a) * r * 0.55 - r * 0.55, x + math.cos(a) * r * 0.55 + r * 0.55, y + math.sin(a) * r * 0.55 + r * 0.55], fill=hexc(petal))
    d.ellipse([x - r * 0.5, y - r * 0.5, x + r * 0.5, y + r * 0.5], fill=hexc(heart))
def leafy(d, x, y, a, L, w, c):
    pts = [(x + math.cos(a) * L * t - math.sin(a) * w * math.sin(math.pi * t) * s, y + math.sin(a) * L * t + math.cos(a) * w * math.sin(math.pi * t) * s) for s in (1, -1) for t in ([i / 10 for i in range(11)] if s > 0 else [1 - i / 10 for i in range(11)])]
    d.polygon(pts, fill=hexc(c))
def wallpaper(S=1024):
    im = Image.new('RGBA', (S, S), hexc('#a9bf9f')); d = ImageDraw.Draw(im)
    for x in range(0, S, 128): d.rectangle([x + 46, 0, x + 82, S], fill=hexc('#b3c8a9')); d.line([(x + 44, 0), (x + 44, S)], fill=hexc('#c9d8bd'), width=2); d.line([(x + 84, 0), (x + 84, S)], fill=hexc('#c9d8bd'), width=2)
    R = random.Random(5)
    for gy in range(4):
        for gx in range(4):
            cx, cy = gx * 256 + (128 if gy % 2 else 0), gy * 256 + 128
            def bouquet(dx, dy, cx=cx, cy=cy):
                RR = random.Random(gx * 7 + gy)
                for a in (-2.4, -0.7, 0.7, 2.4): leafy(d, cx + dx, cy + dy + 6, a + math.pi / 2, 30, 7, '#6f8f6a')
                leafy(d, cx + dx, cy + dy + 10, math.pi / 2, 40, 3, '#5f7f5c')
                rose(d, cx + dx - 14, cy + dy - 4, 13, RR); rose(d, cx + dx + 14, cy + dy - 2, 11, RR, '#f0c8cc', '#d98a9a'); rose(d, cx + dx, cy + dy - 18, 12, RR)
                for k in range(5): a = RR.uniform(0, math.tau); d.ellipse([cx + dx + math.cos(a) * 34 - 3, cy + dy + math.sin(a) * 30 - 3, cx + dx + math.cos(a) * 34 + 3, cy + dy + math.sin(a) * 30 + 3], fill=hexc('#f4ead6'))
            wrap_draw(im, bouquet)
    save(grain(im.filter(ImageFilter.GaussianBlur(0.7)), 8), 'tea_wallpaper.jpg', (1024, 1024))

# ---------------------------------------------------------------- the fascia board over the shop front: gilt letters on teal
def fascia(W=2400, H=300):
    im = Image.new('RGBA', (W, H), hexc('#2f6a66')); d = ImageDraw.Draw(im)
    for y in range(H): d.line([(0, y), (W, y)], fill=hexc('#3a7a75' if y < H * 0.5 else '#2a605c', 40))
    d.rectangle([16, 16, W - 16, H - 16], outline=hexc('#d8b46a'), width=6); d.rectangle([34, 34, W - 34, H - 34], outline=hexc('#d8b46a'), width=2)
    gold, shade = hexc('#e8c47a'), hexc('#1a3a38')
    for dx, dy, c in ((5, 6, shade), (0, 0, gold)):
        text(d, (W * 0.25 + dx, H * 0.66 + dy), 'Tea Room', LATIN, 168, c)
        text(d, (W * 0.75 + dx, H * 0.69 + dy), '茶  室', SERIF, 150, c)
    for x in (W * 0.5,):
        d.ellipse([x - 16, H / 2 - 16, x + 16, H / 2 + 16], fill=gold)
        for s in (-1, 1): d.line([(x + s * 30, H / 2), (x + s * 120, H / 2)], fill=gold, width=4); d.ellipse([x + s * 128 - 6, H / 2 - 6, x + s * 128 + 6, H / 2 + 6], fill=gold)
    save(grain(im, 6), 'tea_fascia.jpg', (2048, 256))

def steam(d, x, y, h, amp, fill, w):
    """a wisp of steam rising from (x, y): an S that fades towards the top"""
    pts = [(x + math.sin(t / 10 * math.tau) * amp, y - h * t / 10) for t in range(11)]
    d.line(pts, fill=fill, width=w, joint='curve')

# ---------------------------------------------------------------- the chalkboard menu in a wooden frame
def menu(W=768, H=1024):
    im = Image.new('RGBA', (W, H), hexc('#5a3a24')); d = ImageDraw.Draw(im)
    d.rectangle([34, 34, W - 34, H - 34], fill=hexc('#23282a'))
    R = random.Random(3)
    for _ in range(1500): x, y = R.uniform(40, W - 40), R.uniform(40, H - 40); d.point((x, y), fill=hexc('#ffffff', R.randint(10, 30)))
    chalk, pink, mint = hexc('#ecebe2'), hexc('#f2b8c6'), hexc('#bfe3cf')
    text(d, (W / 2, 150), '今日茶单', BRUSH, 96, chalk)
    text(d, (W / 2, 210), "Today's Tea", LATIN, 52, pink)
    d.line([(160, 236), (W - 160, 236)], fill=chalk, width=3)
    items = [('大吉岭', 'Darjeeling'), ('阿萨姆', 'Assam'), ('伯爵红茶', 'Earl Grey'), ('玫瑰红茶', 'Rose Black'), ('茉莉花茶', 'Jasmine'), ('司康配果酱', 'Scones & Jam')]
    for i, (zh, en) in enumerate(items):
        y = 310 + i * 88
        text(d, (90, y), zh, BRUSH, 56, chalk, 'l'); text(d, (W - 90, y), en, LATIN, 40, mint if i % 2 else pink, 'r')
        for x in range(330, W - 300, 16): d.ellipse([x, y - 14, x + 4, y - 10], fill=hexc('#ecebe2', 120))
    # a teacup with steam, chalked in the corner
    cx, cy = W / 2, 930
    d.arc([cx - 60, cy - 70, cx + 60, cy + 20], 0, 180, fill=chalk, width=5); d.line([(cx - 60, cy - 25), (cx + 60, cy - 25)], fill=chalk, width=5)
    d.arc([cx + 44, cy - 34, cx + 84, cy - 2], -90, 90, fill=chalk, width=5); d.arc([cx - 90, cy + 8, cx + 90, cy + 36], 0, 180, fill=chalk, width=4)
    for k in (-1, 0, 1): steam(d, cx + k * 24, cy - 40, 48, 7, hexc('#ecebe2', 170), 3)
    im = im.filter(ImageFilter.GaussianBlur(0.8))
    save(grain(im, 6), 'tea_menu.jpg', (576, 768))

# ---------------------------------------------------------------- tea-tin labels, eight to an atlas (4 across, 2 down), each wrapping a tin
TINS = [('#2f6a66', 'Earl Grey', '伯爵'), ('#9a2e3a', 'Darjeeling', '大吉岭'), ('#c8962e', 'Assam', '阿萨姆'), ('#2c3a62', 'Ceylon', '锡兰'),
        ('#b8607a', 'Rose', '玫瑰'), ('#4f7a4a', 'Jasmine', '茉莉'), ('#6a3a5a', 'Oolong', '乌龙'), ('#d0a050', 'Chamomile', '洋甘菊')]
def tins(TW=512, TH=320):
    im = Image.new('RGBA', (TW * 4, TH * 2)); d = ImageDraw.Draw(im)
    for i, (c, en, zh) in enumerate(TINS):
        x0, y0 = (i % 4) * TW, (i // 4) * TH
        d.rectangle([x0, y0, x0 + TW, y0 + TH], fill=hexc(c))
        for k in range(0, TW, 22): d.line([(x0 + k, y0), (x0 + k, y0 + 18)], fill=hexc('#e8c47a', 160), width=3); d.line([(x0 + k, y0 + TH - 18), (x0 + k, y0 + TH)], fill=hexc('#e8c47a', 160), width=3)
        lx0, lx1 = x0 + TW * 0.2, x0 + TW * 0.8
        d.rounded_rectangle([lx0, y0 + 50, lx1, y0 + TH - 50], radius=28, fill=hexc('#f4ead2'), outline=hexc('#e8c47a'), width=6)
        text(d, ((lx0 + lx1) / 2, y0 + 140), en, LATIN, 52 if len(en) < 10 else 42, hexc(c))
        text(d, ((lx0 + lx1) / 2, y0 + 228), zh, BRUSH, 62, hexc('#3a2a20'))
    save(grain(im, 6), 'tea_tins.jpg', (2048, 640))

# ---------------------------------------------------------------- the hanging sign: a teacup in gold on a teal oval, gold edge
def sign(S=512):
    im = Image.new('RGBA', (S, S), hexc('#e8c47a')); d = ImageDraw.Draw(im)
    d.ellipse([20, 40, S - 20, S - 40], fill=hexc('#2f6a66')); d.ellipse([36, 56, S - 36, S - 56], outline=hexc('#e8c47a'), width=4)
    cx, cy = S / 2, S / 2 + 20
    d.chord([cx - 110, cy - 120, cx + 110, cy + 80], 0, 180, fill=hexc('#f4ead2')); d.rectangle([cx - 110, cy - 22, cx + 110, cy - 18], fill=hexc('#f4ead2'))
    d.arc([cx + 84, cy - 40, cx + 150, cy + 20], -90, 90, fill=hexc('#f4ead2'), width=16)
    d.ellipse([cx - 150, cy + 64, cx + 150, cy + 96], fill=hexc('#f4ead2'))
    R = random.Random(1)
    for x, y in ((cx - 50, cy + 20), (cx, cy + 34), (cx + 50, cy + 20)): rose(d, x, y, 16, R)
    for k in (-1, 0, 1): steam(d, cx + k * 38, cy - 40, 80, 10, hexc('#e8c47a'), 7)
    text(d, (cx, 118), 'TEA', LATIN, 60, hexc('#e8c47a'), track=10)
    save(grain(im, 5), 'tea_sign.jpg', (512, 512))

# ---------------------------------------------------------------- a Persian rug: madder field of little flowers and vines, indigo borders, a lobed medallion
def rug(W=1536, H=1152):
    R = random.Random(4); im = Image.new('RGBA', (W, H), hexc('#23304c')); d = ImageDraw.Draw(im)
    d.rectangle([110, 110, W - 110, H - 110], fill=hexc('#8a2a2e'))
    for (x0, y0, x1, y1), c in (((60, 60, W - 60, H - 60), '#e2c48a'), ((104, 104, W - 104, H - 104), '#e2c48a'), ((126, 126, W - 126, H - 126), '#c8803c')):
        d.rectangle([x0, y0, x1, y1], outline=hexc(c), width=5)
    for k in range(0, 2 * (W + H), 46):                                     # the border's running flowers
        t = k / (2 * (W + H)); per = 2 * (W + H)
        if k < W: x, y = k, 84
        elif k < W + H: x, y = W - 84, k - W
        elif k < 2 * W + H: x, y = W - (k - W - H), H - 84
        else: x, y = 84, H - (k - 2 * W - H)
        if 70 < x < W - 70 and 70 < y < H - 70: rose(d, x, y, 9, R, '#d8a050', '#8a2a2e')
    for _ in range(900):                                                    # the field: little blossoms and stems
        x, y = R.uniform(140, W - 140), R.uniform(140, H - 140)
        if ((x - W / 2) / 1.35) ** 2 + (y - H / 2) ** 2 < 330 ** 2: continue
        if R.random() < 0.35: d.line([(x, y), (x + R.uniform(-14, 14), y + R.uniform(-14, 14))], fill=hexc('#c8803c', 200), width=2)
        else: rose(d, x, y, R.uniform(3.5, 6.5), R, R.choice(['#e2c48a', '#d8805a', '#5a7a9a', '#f0e0c0']), R.choice(['#23304c', '#8a2a2e', '#5a1a20']))
    cx, cy = W / 2, H / 2
    for r, c in ((320, '#e2c48a'), (304, '#23304c'), (250, '#c8803c'), (236, '#a83a3a'), (150, '#e2c48a'), (138, '#23304c'), (70, '#e2c48a'), (58, '#8a2a2e')):
        pts = []
        for i in range(96):
            a = i / 96 * math.tau; lob = 1 + 0.12 * abs(math.sin(a * 6))
            pts.append((cx + math.cos(a) * r * lob * 1.35, cy + math.sin(a) * r * lob))
        d.polygon(pts, fill=hexc(c))
    for k in range(12):
        a = k / 12 * math.tau; rose(d, cx + math.cos(a) * 190 * 1.35, cy + math.sin(a) * 190, 14, R, '#e2c48a', '#23304c'); rose(d, cx + math.cos(a) * 100 * 1.35, cy + math.sin(a) * 100, 10, R, '#d8805a', '#e2c48a')
    for (qx, qy) in ((126, 126), (W - 126, 126), (126, H - 126), (W - 126, H - 126)):
        d.pieslice([qx - 200, qy - 200, qx + 200, qy + 200], 0, 360, fill=hexc('#23304c'))
        for k in range(10): a = k / 10 * math.tau; rose(d, qx + math.cos(a) * 120, qy + math.sin(a) * 120, 9, R, '#e2c48a', '#8a2a2e')
    for x in range(30, W, 18):                                              # the fringe at the two ends
        d.line([(x, 0), (x, 52)], fill=hexc('#efe4cc'), width=6); d.line([(x, H - 52), (x, H)], fill=hexc('#efe4cc'), width=6)
    im = im.filter(ImageFilter.GaussianBlur(1.1))
    save(grain(im, 16, 0.45), 'tea_rug.jpg', (1024, 768))

# ---------------------------------------------------------------- the pavement A-board: chalk on slate, a scrolled frame
def aboard(W=512, H=740):
    im = Image.new('RGBA', (W, H), hexc('#5a3a24')); d = ImageDraw.Draw(im)
    d.rectangle([24, 24, W - 24, H - 24], fill=hexc('#24292b')); R = random.Random(6)
    for _ in range(900): d.point((R.uniform(30, W - 30), R.uniform(30, H - 30)), fill=hexc('#ffffff', R.randint(10, 26)))
    chalk, pink = hexc('#ecebe2'), hexc('#f2b8c6')
    text(d, (W / 2, 210), '下午茶', BRUSH, 128, chalk)
    text(d, (W / 2, 300), 'Afternoon Tea', LATIN, 58, pink)
    d.line([(110, 336), (W - 110, 336)], fill=chalk, width=3)
    text(d, (W / 2, 450), '一杯茶 · 一张牌', BRUSH, 56, chalk)
    cx, cy = W / 2, 600
    d.arc([cx - 64, cy - 70, cx + 64, cy + 20], 0, 180, fill=chalk, width=5); d.line([(cx - 64, cy - 25), (cx + 64, cy - 25)], fill=chalk, width=5)
    d.arc([cx + 46, cy - 34, cx + 88, cy - 2], -90, 90, fill=chalk, width=5); d.arc([cx - 96, cy + 8, cx + 96, cy + 36], 0, 180, fill=chalk, width=4)
    for k in (-1, 0, 1): steam(d, cx + k * 26, cy - 44, 46, 7, hexc('#ecebe2', 170), 3)
    for x, y in ((80, 90), (W - 80, 90), (80, H - 90), (W - 80, H - 90)):
        for k in range(8): a = k / 8 * math.tau; d.line([(x, y), (x + math.cos(a) * 16, y + math.sin(a) * 16)], fill=pink, width=3)
    save(grain(im.filter(ImageFilter.GaussianBlur(0.8)), 6), 'tea_aboard.jpg', (384, 555))

# ---------------------------------------------------------------- slates for the mansard roof: rows of fish-scale shingles, blue-grey to plum
def slate(S=512):
    im = Image.new('RGBA', (S, S), hexc('#3e4456')); d = ImageDraw.Draw(im); R = random.Random(8)
    rows, cols = 16, 8; w, h = S / cols, S / rows
    for j in range(rows + 1):
        for i in range(-1, cols + 1):
            x = i * w + (w / 2 if j % 2 else 0); y = j * h
            c = R.choice(['#4a5266', '#545a70', '#5a5068', '#46506a', '#606680'])
            def scale(dx, dy, x=x, y=y, c=c):
                d.pieslice([x + dx, y + dy - h * 1.2, x + w + dx, y + dy + h * 1.0], 0, 180, fill=hexc(c), outline=hexc('#262a36'), width=3)
                d.rectangle([x + dx, y + dy - h * 1.2, x + w + dx, y + dy - h * 0.1], fill=hexc(c))
            wrap_draw(im, scale)
    for j in range(rows + 1):
        for i in range(-1, cols + 1):
            x = i * w + (w / 2 if j % 2 else 0); y = j * h
            wrap_draw(im, lambda dx, dy, x=x, y=y: d.arc([x + dx, y + dy - h * 1.2, x + w + dx, y + dy + h * 1.0], 0, 180, fill=hexc('#262a36'), width=3))
    save(grain(im, 10), 'tea_slate.jpg', (512, 512))

# ---------------------------------------------------------------- lace: white crochet rings and holes, the rose underskirt showing through
def lace(S=1024):
    im = Image.new('RGBA', (S, S), hexc('#f6f0e6')); d = ImageDraw.Draw(im); hole = hexc('#d9909e')
    for gy in range(4):
        for gx in range(4):
            cx, cy = gx * 256 + 128, gy * 256 + 128
            def motif(dx, dy, cx=cx, cy=cy):
                for k in range(12):
                    a = k / 12 * math.tau; d.ellipse([cx + dx + math.cos(a) * 70 - 14, cy + dy + math.sin(a) * 70 - 14, cx + dx + math.cos(a) * 70 + 14, cy + dy + math.sin(a) * 70 + 14], fill=hole)
                    d.ellipse([cx + dx + math.cos(a) * 36 - 7, cy + dy + math.sin(a) * 36 - 7, cx + dx + math.cos(a) * 36 + 7, cy + dy + math.sin(a) * 36 + 7], fill=hole)
                d.ellipse([cx + dx - 12, cy + dy - 12, cx + dx + 12, cy + dy + 12], fill=hole)
                for k in range(4):
                    a = k / 4 * math.tau + math.pi / 4; px, py = cx + dx + math.cos(a) * 181, cy + dy + math.sin(a) * 181
                    d.ellipse([px - 20, py - 20, px + 20, py + 20], fill=hole)
            wrap_draw(im, motif)
    for x in range(0, S, 16):
        for y in range(0, S, 16):
            if (x // 16 + y // 16) % 2: d.ellipse([x + 5, y + 5, x + 9, y + 9], fill=hexc('#e8c4c8'))
    save(im.filter(ImageFilter.GaussianBlur(0.8)), 'tea_lace.jpg', (1024, 1024))

# ---------------------------------------------------------------- rose-sprigged china: wraps round a lathe (u round, v up), gold bands at rim and foot
def china(W=1024, H=256):
    im = Image.new('RGBA', (W, H), hexc('#fbf7f0')); d = ImageDraw.Draw(im); R = random.Random(12)
    for k in range(8):
        x, y = k * W / 8 + 64, H * 0.5 + (16 if k % 2 else -16)
        for a in (-2.4, -0.6, 0.8, 2.6): leafy(d, x, y, a, 26, 7, '#7a9a6a')
        rose(d, x - 9, y, 12, R); rose(d, x + 10, y + 4, 9, R, '#f0c0c8', '#d98a9a')
    d.rectangle([0, 0, W, 10], fill=hexc('#d8b46a')); d.rectangle([0, H - 12, W, H], fill=hexc('#d8b46a')); d.rectangle([0, 22, W, 25], fill=hexc('#d8b46a'))
    save(im.filter(ImageFilter.GaussianBlur(0.5)), 'tea_china.jpg', (1024, 256))

# ---------------------------------------------------------------- the awning's canvas: rose and cream stripes with a little weave
def awning(S=512):
    im = Image.new('RGBA', (S, S), hexc('#f6efe2')); d = ImageDraw.Draw(im)
    for k in range(4): d.rectangle([k * 128, 0, k * 128 + 64, S], fill=hexc('#e39aae'))
    for y in range(0, S, 4): d.line([(0, y), (S, y)], fill=hexc('#000000', 10))
    save(grain(im, 8), 'tea_awning.jpg', (512, 512))

if __name__ == '__main__':
    os.makedirs(TEX, exist_ok=True)
    wallpaper(); fascia(); menu(); tins(); sign(); rug(); aboard(); slate(); lace(); china(); awning()
