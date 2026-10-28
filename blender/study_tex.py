# Paints the study's flat artwork with PIL: the moonlit bamboo seen through the round window, the 问字斋 plaque, the
# couplet either side of the window, the cloth book cases with their title labels, and the rice paper on the desk.
# Everything is drawn here, nothing downloaded.  Run:  python3 study_tex.py
#
# The lettering uses the system Songti for now (preview only). The textures that ship must use open fonts subset to
# their characters, as shrine_tex.py does (blender/fonts/); switch FONT_* below once those subsets are fetched.
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
SONGTI = '/System/Library/Fonts/Supplemental/Songti.ttc'
FONT_CARVE, FONT_BRUSH = (SONGTI, 0), (SONGTI, 1)          # Songti SC Black for the carved plaque, Bold for brushwork
def font(px, face=FONT_CARVE): return ImageFont.truetype(face[0], px, index=face[1])
def save(im, name, size=None):
    if size: im = im.resize(size, Image.LANCZOS)
    im.convert('RGB').save(os.path.join(TEX, name), quality=92); print('wrote', name, im.size if not size else size)
def hexc(h, a=255): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)
def lerp(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))
def glow_layer(W, H, rgb, draw, blur):
    m = Image.new('L', (W, H), 0); draw(ImageDraw.Draw(m)); m = m.filter(ImageFilter.GaussianBlur(blur))
    lay = Image.new('RGBA', (W, H), rgb + (0,)); lay.putalpha(m); return lay
def grain(im, seed, amt=10):
    """fine paper or cloth grain: gaussian speckle multiplied in (seed kept for the call sites; effect_noise is random)"""
    from PIL import ImageChops
    random.seed(seed); n = Image.effect_noise(im.size, amt).point(lambda v: max(0, min(255, int(238 + (v - 128) * 0.35))))
    return ImageChops.multiply(im.convert('RGB'), Image.merge('RGB', (n, n, n))).convert('RGBA')

# ---------------------------------------------------------------- the round window: moonlit bamboo in ink
def leaf(d, x, y, ang, L, w, fill):
    """one bamboo leaf: a slim blade, widest a third of the way, pointed at the tip"""
    pts = []
    for i in range(13):
        t = i / 12; half = w * math.sin(math.pi * min(1, t * 2.2) / 2) * (1 - t) ** 0.9
        pts.append((t, half))                                              # slim: about a twentieth as wide as long
    ca, sa = math.cos(ang), math.sin(ang)
    side = [(x + ca * L * t - sa * h, y + sa * L * t + ca * h) for t, h in pts]
    other = [(x + ca * L * t + sa * h, y + sa * L * t - ca * h) for t, h in pts[::-1]]
    d.polygon(side + other, fill=fill)

def bamboo(d, x0, ybot, ytop, w, lean, fill, R, leaves=True, leaf_fill=None, scale=1.0):
    """a culm drawn in segments with node rings, and clusters of leaves hanging off short twigs"""
    nodes = []; y = ybot; seg = (ybot - ytop) / R.randint(6, 9)
    while y > ytop:
        y2 = max(ytop, y - seg * R.uniform(0.85, 1.1))
        xa, xb = x0 + lean * (ybot - y), x0 + lean * (ybot - y2)
        d.polygon([(xa - w / 2, y), (xa + w / 2, y), (xb + w / 2 * 0.96, y2 + 3), (xb - w / 2 * 0.96, y2 + 3)], fill=fill)
        d.line([(xb - w * 0.62, y2 + 2), (xb + w * 0.62, y2 + 2)], fill=fill, width=max(2, int(w * 0.25)))
        nodes.append((xb, y2)); y = y2
    if not leaves: return
    lf = leaf_fill or fill
    for j, (nx, ny) in enumerate(nodes[1:] + [nodes[-1]]):
        if R.random() < 0.55 or j < len(nodes) * 0.25: continue          # leaves on the upper culm, with gaps between clusters
        for side in ((-1, 1) if R.random() < 0.45 else (R.choice((-1, 1)),)):
            tx, ty = nx + side * R.uniform(40, 130) * scale, ny + R.uniform(-30, 40) * scale
            d.line([(nx, ny), (tx, ty)], fill=lf, width=max(2, int(4 * scale)))
            n = R.randint(3, 5); base = math.pi / 2 + side * R.uniform(0.35, 0.9)
            for k in range(n):                                        # 个 / 介 clusters: three to five slim blades fanned down and out
                ang = base + (k - (n - 1) / 2) * R.uniform(0.28, 0.42)
                leaf(d, tx, ty, ang, R.uniform(150, 260) * scale, R.uniform(7, 11) * scale, lf)

def window_view(S=2048):
    R = random.Random(23)
    im = Image.new('RGBA', (S, S)); d = ImageDraw.Draw(im)
    top, mid, low = hexc('#0c1730'), hexc('#20385a'), hexc('#5b7a92')
    for y in range(S):
        t = y / S; c = lerp(top, mid, min(1, t / 0.6)) if t < 0.6 else lerp(mid, low, (t - 0.6) / 0.4)
        d.line([(0, y), (S, y)], fill=c)
    for _ in range(180):
        x, y = R.random() * S, R.random() * S * 0.45; r = R.choice([1, 1, 1.5]); d.ellipse([x - r, y - r, x + r, y + r], fill=(230, 236, 255, R.randint(60, 170)))
    mx, my, mr = S * 0.68, S * 0.27, S * 0.11
    def halo(hd):
        for k in range(60, 0, -1):
            r = mr * (1 + k * 0.05); hd.ellipse([mx - r, my - r, mx + r, my + r], fill=int(3 + (60 - k) * 1.1))
    im = Image.alpha_composite(im, glow_layer(S, S, (255, 238, 200), halo, S * 0.02))
    moon = Image.new('RGBA', (S, S)); ImageDraw.Draw(moon).ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=hexc('#fbf2d8'))
    im = Image.alpha_composite(im, moon.filter(ImageFilter.GaussianBlur(2)))
    # a far misty range at the foot of the sky
    far = Image.new('RGBA', (S, S)); fd = ImageDraw.Draw(far); pts = [(0, S)]
    for i in range(121):
        x = i / 120; h = 0.62 - 0.07 * math.exp(-((x - 0.3) / 0.12) ** 2) - 0.05 * math.exp(-((x - 0.78) / 0.1) ** 2) + 0.01 * math.sin(x * 40)
        pts.append((x * S, h * S))
    pts.append((S, S)); fd.polygon(pts, fill=hexc('#6d86a0', 200))
    im = Image.alpha_composite(im, far.filter(ImageFilter.GaussianBlur(6)))
    # three depths of bamboo: pale and soft far away, then mist, then near culms in dark ink
    for depth, (colr, a, blur, n, wmin, wmax, sc) in enumerate([('#7d93ab', 150, 5, 16, 14, 22, 0.7), ('#3f5670', 220, 2, 10, 22, 34, 0.9), ('#121c2a', 255, 0, 6, 34, 52, 1.25)]):
        lay = Image.new('RGBA', (S, S)); ld = ImageDraw.Draw(lay); r2 = random.Random(40 + depth)
        for k in range(n):
            x0 = r2.uniform(-0.05, 1.05) * S
            if depth == 2 and 0.42 * S < x0 < 0.6 * S: x0 += 0.3 * S                  # keep the moon's side of the near layer open
            bamboo(ld, x0, S * 1.02, r2.uniform(-0.1, 0.25) * S, r2.uniform(wmin, wmax), r2.uniform(-0.05, 0.05), hexc(colr, a), r2, scale=sc)
        if blur: lay = lay.filter(ImageFilter.GaussianBlur(blur))
        im = Image.alpha_composite(im, lay)
        if depth == 0:                                                               # a mist band between the far and middle bamboo
            im = Image.alpha_composite(im, glow_layer(S, S, (190, 205, 225), lambda md: md.rectangle([0, S * 0.66, S, S * 0.86], fill=70), S * 0.04))
    save(im, 'study_view.jpg', (1024, 1024))

# ---------------------------------------------------------------- the plaque: 问字斋 cut into dark chestnut, filled with stone green
def wood_board(W, H, base, dark, seed):
    R = random.Random(seed); im = Image.new('RGBA', (W, H), hexc(base)); d = ImageDraw.Draw(im)
    for _ in range(int(H * 0.9)):
        y = R.uniform(0, H); a = R.randint(8, 30); amp = R.uniform(2, 9); ph = R.uniform(0, 6)
        pts = [(x, y + amp * math.sin(x / W * math.tau * R.uniform(0.6, 1.6) + ph)) for x in range(0, W + 40, 40)]
        d.line(pts, fill=hexc(dark, a), width=R.choice([1, 1, 2]))
    return im

def plaque(W=2048, H=720):
    im = wood_board(W, H, '#3a2418', '#1a0e08', 5); d = ImageDraw.Draw(im)
    d.rectangle([18, 18, W - 18, H - 18], outline=hexc('#b8903e'), width=10)
    d.rectangle([52, 52, W - 52, H - 52], outline=hexc('#8a6a30'), width=4)
    f = font(400); text = '问字斋'; step = (W - 300) / 3
    for i, ch in enumerate(text):
        x = 150 + step * (i + 0.5); y = H / 2
        d.text((x + 8, y + 10), ch, font=f, fill=hexc('#120a06'), anchor='mm')          # the cut's shadow
        d.text((x, y), ch, font=f, fill=hexc('#5e9a7a'), anchor='mm')                   # stone green fill
    save(im, 'study_plaque.jpg', (1024, 360))

# ---------------------------------------------------------------- the couplet: brush characters on gold-flecked celadon paper, mounted on silk
def couplet(text, name, W=400, H=2000):
    R = random.Random(hash(name) & 0xffff)
    im = Image.new('RGBA', (W, H), hexc('#9fb4b0')); d = ImageDraw.Draw(im)
    d.rectangle([28, 70, W - 28, H - 70], fill=hexc('#e9e4cf'))
    for _ in range(260):                                            # 洒金: scattered gold flecks
        x, y = R.uniform(34, W - 34), R.uniform(76, H - 76); r = R.uniform(1, 4)
        d.polygon([(x + r * math.cos(a), y + r * math.sin(a)) for a in [R.uniform(0, 6.3) for _ in range(5)]], fill=hexc('#c8a654', R.randint(90, 200)))
    f = font(int(W * 0.62), FONT_BRUSH); n = len(text); step = (H - 220) / n
    for i, ch in enumerate(text):
        d.text((W / 2, 110 + step * (i + 0.5)), ch, font=f, fill=hexc('#1a1410'), anchor='mm')
    d.rectangle([0, 0, W, 60], fill=hexc('#6c8582')); d.rectangle([0, H - 60, W, H], fill=hexc('#6c8582'))
    save(grain(im, 7, 8), name, (200, 1000))

# ---------------------------------------------------------------- book cases: blue cloth with title labels; book blocks; a thread-bound cover
def books(W=2048, H=1024):
    im = Image.new('RGBA', (W, H), hexc('#24344c')); d = ImageDraw.Draw(im)
    titles = ['字说', '易图', '诗选', '琴谱', '花谱', '墨林']
    cloth = ['#24344c', '#2e4056', '#3a3a4a', '#283c44', '#40342c', '#2a3a52']
    tw = W // 8
    for i, (t, c) in enumerate(zip(titles, cloth)):                  # six case fronts, a tall label on each
        x0 = i * tw; d.rectangle([x0, 0, x0 + tw, H], fill=hexc(c))
        R = random.Random(i)
        for _ in range(900): x, y = R.uniform(x0, x0 + tw), R.uniform(0, H); d.point((x, y), fill=hexc('#000000', 40))
        lx0, lx1 = x0 + tw * 0.3, x0 + tw * 0.7; d.rectangle([lx0, 60, lx1, 60 + H * 0.5], fill=hexc('#ece2c8'))
        d.rectangle([lx0 + 6, 66, lx1 - 6, 54 + H * 0.5], outline=hexc('#9a3020'), width=3)
        f = font(int(tw * 0.32), FONT_BRUSH)
        for k, ch in enumerate(t): d.text(((lx0 + lx1) / 2, 60 + H * 0.5 * (k + 0.5) / len(t)), ch, font=f, fill=hexc('#1a1410'), anchor='mm')
        d.rectangle([x0 + 8, 8, x0 + tw - 8, H - 8], outline=hexc('#0e1420', 120), width=6)
    x0 = 6 * tw                                                      # page edges of a stack: thin cream lines
    d.rectangle([x0, 0, x0 + tw, H], fill=hexc('#e2d6b8'))
    for y in range(0, H, 5): d.line([(x0, y), (x0 + tw, y)], fill=hexc('#b8aa88', 120))
    x0 = 7 * tw                                                      # a thread-bound cover: indigo paper, white stitching, title slip
    d.rectangle([x0, 0, x0 + tw, H], fill=hexc('#2c3c5e'))
    for k in range(6):
        y = 70 + k * (H - 140) / 5; d.ellipse([x0 + 22, y - 6, x0 + 34, y + 6], fill=hexc('#ddd6c4')); d.line([(x0, y), (x0 + 28, y)], fill=hexc('#ddd6c4'), width=4)
    d.rectangle([x0 + tw * 0.55, 50, x0 + tw * 0.85, H * 0.55], fill=hexc('#ece2c8'))
    save(grain(im, 3, 10), 'study_books.jpg', (1024, 512))

# ---------------------------------------------------------------- rice paper: warm white with long soft fibres
def paper(S=1024):
    R = random.Random(9); im = Image.new('RGBA', (S, S), hexc('#efe8d6')); d = ImageDraw.Draw(im)
    for _ in range(2400):
        x, y = R.uniform(0, S), R.uniform(0, S); a = R.uniform(0, math.pi); L = R.uniform(6, 30)
        d.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], fill=hexc(R.choice(['#d9cfb6', '#f8f3e6']), R.randint(60, 140)), width=1)
    save(grain(im.filter(ImageFilter.GaussianBlur(0.6)), 11, 6), 'study_paper.jpg', (512, 512))

if __name__ == '__main__':
    os.makedirs(TEX, exist_ok=True)
    window_view(); plaque()
    couplet('一点墨痕通远意', 'study_couplet_r.jpg')        # 上联, hung on the right as you face the window
    couplet('半窗竹影写心声', 'study_couplet_l.jpg')        # 下联, on the left
    books(); paper()
