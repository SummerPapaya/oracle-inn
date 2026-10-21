# Downloads three.js's main module and the addon modules the page imports, following their relative imports,
# into public/vendor/three/<version>/ (self-hosted, so the page needs no CDN).
# python3 tools/fetch_three.py [version]      then point the importmap in src/_shell.html at the new folder
import re, sys, os, subprocess, posixpath
VER = sys.argv[1] if len(sys.argv) > 1 else '0.169.0'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'vendor', 'three', VER); BASE = f'https://cdn.jsdelivr.net/npm/three@{VER}/'
start = ['build/three.module.js'] + ['examples/jsm/' + p for p in ['environments/RoomEnvironment.js', 'geometries/RoundedBoxGeometry.js', 'loaders/GLTFLoader.js', 'postprocessing/EffectComposer.js', 'postprocessing/GTAOPass.js', 'postprocessing/OutputPass.js', 'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js', 'utils/BufferGeometryUtils.js']]
seen, todo, total = set(), list(start), 0
while todo:
    p = todo.pop()
    if p in seen: continue
    seen.add(p)
    data = subprocess.run(['curl', '-sSfL', '--max-time', '120', BASE + p], capture_output=True, check=True).stdout     # system curl: TLS verified against the system store
    dst = os.path.join(OUT, p); os.makedirs(os.path.dirname(dst), exist_ok=True); open(dst, 'wb').write(data); total += len(data)
    for m in re.findall(rb"""(?:from|import)\s*['"](\.{1,2}/[^'"]+)['"]""", data):
        todo.append(posixpath.normpath(posixpath.join(posixpath.dirname(p), m.decode())))
open(os.path.join(OUT, 'LICENSE'), 'wb').write(subprocess.run(['curl', '-sSfL', BASE + 'LICENSE'], capture_output=True, check=True).stdout)
print(len(seen), 'files,', total // 1024, 'KB')
for p in sorted(seen): print(' ', p)
