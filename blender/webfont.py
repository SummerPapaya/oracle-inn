# Lettering for the painted textures in the open fonts the site already hosts (public/vendor/fonts, SIL OFL): those are
# split into subset files by character, so every character is drawn from whichever file of its family holds it.
# Pillow reads the .woff2 files directly.
import os, re
from PIL import ImageFont

FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'vendor', 'fonts')
_faces = re.findall(r"font-family: '([^']+)';[^}]*?font-weight: ([^;]+);[^}]*?src: url\(([^?)]+)", open(os.path.join(FONTS, 'fonts.css')).read())
_cache = {}

def _font(file, px):
    k = (file, px)
    if k not in _cache: _cache[k] = ImageFont.truetype(os.path.join(FONTS, file), px)
    return _cache[k]

_notdef = {}
def has(file, ch):
    """a glyph of its own: not empty, and not the font's fallback box (what a private-use character draws as)"""
    if ch.isspace(): return True
    f = _font(file, 64)
    if file not in _notdef: _notdef[file] = bytes(f.getmask('\ue000'))
    m = f.getmask(ch); b = m.getbbox()
    return bool(b) and b[2] - b[0] > 2 and bytes(m) != _notdef[file]

def font_for(ch, family, px, weight=None):
    """the face of a family (and weight) that holds ch, at px; None if no file of the family has it"""
    for f, w, file in _faces:
        if f == family and (weight is None or w == weight) and has(file, ch): return _font(file, px)
    return None

def text_width(text, family, px, weight=None, track=0):
    w = 0
    for ch in text:
        f = font_for(ch, family, px, weight); w += (f.getlength(ch) if f else px * 0.5) + track
    return w - track if text else 0

def draw_text(d, xy, text, family, px, fill, weight=None, anchor='l', track=0, baseline=True):
    """draw text one character at a time, each from the subset that has it; anchor l, m or r on x, the baseline on y"""
    x, y = xy
    w = text_width(text, family, px, weight, track)
    x -= {'l': 0, 'm': w / 2, 'r': w}[anchor]
    for ch in text:
        f = font_for(ch, family, px, weight)
        if f is None: x += px * 0.5 + track; continue
        d.text((x, y), ch, font=f, fill=fill, anchor='ls' if baseline else 'lt')
        x += f.getlength(ch) + track
    return w
