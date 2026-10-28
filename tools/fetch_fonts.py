# Fetches woff2 subsets from Google Fonts holding only the characters the pages use, and writes a fonts.css for them.
# Run it again whenever the pages gain new characters (build.py warns when they do):  python3 tools/fetch_fonts.py
# Then node tools/check_fonts.mjs reads the glyphs actually in the files and lists anything that would fall back.
import re, sys, os, subprocess, urllib.parse, hashlib, glob, time
PUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public'); OUT = os.path.join(PUB, 'vendor', 'fonts')
os.makedirs(OUT, exist_ok=True)
for old in [n for n in os.listdir(OUT) if n.endswith('.woff2')]: os.remove(os.path.join(OUT, old))
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
text = ''.join(open(f, encoding='utf-8').read() for f in [os.path.join(PUB, n) for n in ('index.html', 'cat-tarot-deck.html', '404.html')] + glob.glob(os.path.join(PUB, 'js', 'app.*.js')))
gb2312 = re.search(r"CEZI_CHARS = '([^']*)'", text).group(1)        # 测字's table: the 6,763 characters of GB 2312
text = re.sub(r"CEZI_(CHARS|RAD|STROKES) = '[^']*'", '', text)   # is data, not text on the page (and the radical and stroke
                                                         # tables code numbers as characters)...
import unicodedata                                       # ...but the radicals 测字 shows are worked out at run time, so add them
text += ''.join(unicodedata.normalize('NFKC', chr(c)) for c in range(0x2F00, 0x2FD6))
ascii_ = ''.join(chr(c) for c in range(32, 127))
other = sorted(set(ch for ch in text if ord(ch) > 126))
latin_extra = ''.join(ch for ch in other if ord(ch) < 0x2E80)            # ·, —, …, ’, “”, é and the like
cjk = [ch for ch in other if ord(ch) >= 0x2E80]
def in_gb(ch):
    try: ch.encode('gb2312'); return True
    except UnicodeEncodeError: return False
beyond = ''.join(ch for ch in cjk if not in_gb(ch))                      # Long Cang stops at GB 2312: WenKai brushes these in
rest = sorted(set(gb2312) - set(cjk))                                     # any character 测字 may be given, in Long Cang only
def curl(url, binary=False):
    for attempt in range(4):                     # Google now and then refuses a request outright; a pause and another try get it
        r = subprocess.run(['curl', '-sSfL', '--retry', '3', '--max-time', '120', '-A', UA, url], capture_output=True)
        if r.returncode == 0: return r.stdout if binary else r.stdout.decode()
        time.sleep(3 + attempt * 3)
    r.check_returncode()
def ranges(chars):
    cps = sorted(set(ord(c) for c in chars)); out = []; i = 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1: j += 1
        out.append(f'U+{cps[i]:X}' if i == j else f'U+{cps[i]:X}-{cps[j]:X}'); i = j + 1
    return ', '.join(out)
css, total = [], 0
def face(family, slug, axis, weight_css, style, chars, chunk_tag):
    global total
    q = urllib.parse.urlencode({'family': f'{family}:{axis}', 'text': chars, 'display': 'swap'})
    sheet = curl('https://fonts.googleapis.com/css2?' + q)
    url = re.search(r'src:\s*url\((https://fonts\.gstatic\.com/[^)]+)\)\s*format\(\'woff2\'\)', sheet).group(1)
    data = curl(url, binary=True); name = f'{slug}{chunk_tag}.woff2'
    open(os.path.join(OUT, name), 'wb').write(data); total += len(data)
    css.append(f"@font-face {{ font-family: '{family}'; font-style: {style}; font-weight: {weight_css}; font-display: swap; src: url({name}?v={hashlib.sha1(data).hexdigest()[:8]}) format('woff2'); unicode-range: {ranges(chars)}; }}")
    print(f'  {name:34s} {len(chars):5d} chars {len(data) // 1024:5d} KB')
CH = 450                                                                   # characters per request, keeps the URL a few KB
chunks = [ascii_ + latin_extra + ''.join(cjk[:CH])] + [''.join(cjk[k:k + CH]) for k in range(CH, len(cjk), CH)]
for w, wcss in ((500, '400 500'), (700, '700'), (900, '900')):
    for i, ch in enumerate(chunks): face('Noto Serif SC', f'noto-serif-sc-{w}-', f'wght@{w}', wcss, 'normal', ch, i)
# Long Cang also gets the rest of GB 2312 in chunks of their own, after the ones the pages use: a browser fetches a
# chunk only when a character in it shows up, so they cost nothing until someone writes, say, 鑫 on the paper
# (only GB 2312 goes to Long Cang: asking it for a character it lacks can leave a chunk with nothing in it, which fails)
gb_cjk = [ch for ch in cjk if in_gb(ch)]
lc_chunks = [ascii_ + latin_extra + ''.join(gb_cjk[:CH])] + [''.join(gb_cjk[k:k + CH]) for k in range(CH, len(gb_cjk), CH)]
for i, ch in enumerate(lc_chunks + [''.join(rest[k:k + CH]) for k in range(0, len(rest), CH)]): face('Long Cang', 'long-cang-', 'wght@400', '400', 'normal', ch, i)
for w in (500, 600): face('Cormorant Garamond', f'cormorant-garamond-italic-{w}', f'ital,wght@1,{w}', str(w), 'italic', ascii_ + latin_extra, '')
face('LXGW WenKai TC', 'lxgw-wenkai-tc-', 'wght@400', '400', 'normal', beyond, 'beyond')
open(os.path.join(OUT, 'fonts.css'), 'w').write('/* Self-hosted font subsets (SIL Open Font License 1.1), cut to the characters these pages use. Generated by fetch_fonts.py. */\n' + '\n'.join(css) + '\n')
print('OFL texts for these families sit alongside the files in public/vendor/fonts/');
print(len(cjk), 'CJK chars (', len(beyond), 'beyond GB 2312 ),', len(rest), 'more for 测字 in Long Cang,', len(latin_extra), 'extra Latin;', len(css), 'faces,', total // 1024, 'KB total')
