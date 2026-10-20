# Splits a GLB into <prefix>_scene.json (the glTF description), <prefix>_geom.txt (the geometry buffer as base64) and
# its images as .jpg, because artifacts serve .json/.txt/.jpg but not .glb. The page decodes the text itself and
# reassembles a GLB in memory: a data: URI buffer would be fetched, and the artifact CSP blocks that.
# Usage: python3 glb_split.py in.glb outdir [prefix=tent]
import json, struct, base64, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jpeg_clean import clean            # Blender writes the .blend file's local path into exported JPEGs
src, outdir = sys.argv[1], sys.argv[2]
pre = sys.argv[3] if len(sys.argv) > 3 else 'tent'
b = open(src, 'rb').read()
magic, ver, total = struct.unpack_from('<4sII', b, 0); assert magic == b'glTF'
jl, jt = struct.unpack_from('<I4s', b, 12); gj = json.loads(b[20:20 + jl])
bl, bt = struct.unpack_from('<I4s', b, 20 + jl); bin_ = b[28 + jl:28 + jl + bl]
img_views = {}
for i, im in enumerate(gj.get('images', [])):
    v = gj['bufferViews'][im['bufferView']]; data = bin_[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    ext = '.jpg' if im.get('mimeType') == 'image/jpeg' else '.png'; name = f'{pre}_tex{i}{ext}'
    open(os.path.join(outdir, name), 'wb').write(clean(data) if ext == '.jpg' else data); img_views[im['bufferView']] = name
    del im['bufferView']; im.pop('mimeType', None); im['uri'] = name
# repack the remaining views into a fresh buffer, keeping 4-byte alignment, and renumber references
keep = [i for i in range(len(gj['bufferViews'])) if i not in img_views]
remap = {old: new for new, old in enumerate(keep)}; out = bytearray(); views = []
for old in keep:
    v = dict(gj['bufferViews'][old]); data = bin_[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
    while len(out) % 4: out.append(0)
    v['byteOffset'] = len(out); out += data; views.append(v)
gj['bufferViews'] = views
for a in gj.get('accessors', []):
    if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
gj['buffers'] = [{'byteLength': len(out)}]
json.dump(gj, open(os.path.join(outdir, f'{pre}_scene.json'), 'w'), separators=(',', ':'))
open(os.path.join(outdir, f'{pre}_geom.txt'), 'w').write(base64.b64encode(bytes(out)).decode())
print('geometry', len(out) // 1024, 'KB; images', list(img_views.values()))
