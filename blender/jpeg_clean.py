# Strips metadata from JPEGs losslessly (the image data is not touched): keeps the JFIF header and tables, drops
# EXIF, XMP, ICC, comments and the other APPn and COM segments (Blender writes the .blend file path into its JPEGs).
# Usage: python3 jpeg_clean.py file.jpg [...]      (rewrites in place)
import sys

def clean(b):
    assert b[:2] == b'\xff\xd8', 'not a JPEG'
    out, i = bytearray(b'\xff\xd8'), 2
    while i < len(b):
        if b[i] != 0xFF: raise ValueError('bad marker at %d' % i)
        m = b[i + 1]
        if m == 0xD9: out += b[i:i + 2]; break
        if m == 0xDA:                                   # start of scan: the rest is image data
            out += b[i:]; break
        if 0xD0 <= m <= 0xD7 or m == 0x01: out += b[i:i + 2]; i += 2; continue
        n = int.from_bytes(b[i + 2:i + 4], 'big'); seg = b[i:i + 2 + n]
        keep = not ((0xE1 <= m <= 0xEF) or m == 0xFE)     # APP1..APP15 and COM go; APP0 (JFIF) and the tables stay
        if keep: out += seg
        i += 2 + n
    return bytes(out)

if __name__ == '__main__':
    for f in sys.argv[1:]:
        b = open(f, 'rb').read(); c = clean(b); open(f, 'wb').write(c); print(f, len(b), '->', len(c))
