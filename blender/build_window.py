# 月下窗台 · the moonlit window from page 5 of the pop-up book, built in Blender as a cut-away diorama like the tent, the
# shrine, the study and the tea room. A grassy island at night: a stream with stepping stones running down its left side
# under a round blue-green tree full of fireflies, a picket fence, a lantern on a post and an owl on a stump in front, a
# pine behind. On it a white cottage under a pyramid roof of navy scalloped tiles, and beside it a round stone tower with
# a witch's-hat cone and a gold star on the tip. The cottage is open at the front like a stage: inside, a big round moon
# window in the back wall, open to the real sky, with a cushioned window seat under it and starry curtains drawn back; a
# low round table with a pendulum board and a brass pendulum stand; shelves of crystals, jars and candles; a star chart,
# a chart of the moon's phases, a frieze of moons round the top of the walls, paper stars hanging from the beams.
# Run headless:  Blender -b --factory-startup --python build_window.py -- [--preview] [--render] [--only front,inside]
import bpy, bmesh, math, random, os, sys, time
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex') + '/'
OUT = os.path.join(HERE, 'renders') + '/'
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
TAU = math.tau
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.name = 'OracleWindow'
sc.unit_settings.system = 'METRIC'

# ---------------------------------------------------------------- helpers (as in build_tent.py)
def col(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1)

MATS = {}
def principled(m): return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
def mat(name, base='#ffffff', rough=0.6, metal=0.0, emit=None, emit_str=0.0, sheen=0.0, coat=0.0, trans=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; p = principled(m)
    p.inputs['Base Color'].default_value = col(base); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if emit: p.inputs['Emission Color'].default_value = col(emit); p.inputs['Emission Strength'].default_value = emit_str
    if sheen: p.inputs['Sheen Weight'].default_value = sheen; p.inputs['Sheen Tint'].default_value = col('#ffe0d0')
    if coat: p.inputs['Coat Weight'].default_value = coat
    if trans: p.inputs['Transmission Weight'].default_value = trans
    MATS[name] = m; return m

def nodes(m): nt = m.node_tree; return nt.nodes, nt.links
def objco(N):
    return N.new('ShaderNodeTexCoord').outputs['Object']

def ramp(N, fac, stops):
    cr = N.new('ShaderNodeValToRGB'); els = cr.color_ramp.elements
    while len(els) < len(stops): els.new(0.5)
    for e, (pos, c) in zip(els, stops): e.position = pos; e.color = col(c)
    N.id_data.links.new(fac, cr.inputs['Fac']); return cr.outputs['Color']

def wood_mat(name, c1, c2, stretch=10.0, bump=0.08, axis='y', rough=0.55, coat=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m)
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = {'x': (stretch, 1, 1), 'y': (1, stretch, 1), 'z': (1, 1, stretch)}[axis]
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 4.0; nz.inputs['Detail'].default_value = 6.0; nz.inputs['Distortion'].default_value = 0.4
    L.new(objco(N), mp.inputs['Vector']); L.new(mp.outputs['Vector'], nz.inputs['Vector'])
    L.new(ramp(N, nz.outputs['Fac'], [(0.35, c2), (0.7, c1)]), p.inputs['Base Color']); p.inputs['Roughness'].default_value = rough
    if coat: p.inputs['Coat Weight'].default_value = coat; p.inputs['Coat Roughness'].default_value = 0.25
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = bump; L.new(nz.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

def stone_mat(name, c1, c2, scale=40.0, rough=0.75, bump=0.15, speck='#2a2a2a', speck_amt=0.06):
    """granite: mottled with fine dark specks"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 8.0
    L.new(oc, nz.inputs['Vector']); base = ramp(N, nz.outputs['Fac'], [(0.3, c2), (0.75, c1)])
    vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = scale; L.new(oc, vo.inputs['Vector'])
    lt = N.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = speck_amt; L.new(vo.outputs['Distance'], lt.inputs[0])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['B'].default_value = col(speck)
    L.new(base, mx.inputs['A']); L.new(lt.outputs[0], mx.inputs['Factor']); L.new(mx.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rough
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = bump; L.new(nz.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

def plaster_mat(name, c1, c2, rough=0.9):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.2; nz.inputs['Detail'].default_value = 10.0; nz.inputs['Roughness'].default_value = 0.65
    L.new(oc, nz.inputs['Vector']); L.new(ramp(N, nz.outputs['Fac'], [(0.35, c2), (0.65, c1)]), p.inputs['Base Color']); p.inputs['Roughness'].default_value = rough
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.05; L.new(nz.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

def imgmat(name, file, rough=0.85, sheen=0.0, emit=0.0, repeat=(1, 1), metal=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m)
    im = N.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(TEX + file, check_existing=True); im.interpolation = 'Cubic'
    if repeat != (1, 1):
        tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (repeat[0], repeat[1], 1)
        L.new(tc.outputs['UV'], mp.inputs['Vector']); L.new(mp.outputs['Vector'], im.inputs['Vector'])
    L.new(im.outputs['Color'], p.inputs['Base Color']); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if sheen: p.inputs['Sheen Weight'].default_value = sheen
    if emit: L.new(im.outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = emit
    MATS[name] = m; return m

def link(o): sc.collection.objects.link(o); return o
def bm_obj(name, bm, m=None, smooth=True, mats=()):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth: me.shade_smooth()
    o = link(bpy.data.objects.new(name, me))
    if m: o.data.materials.append(m)
    for mm in mats: o.data.materials.append(mm)
    return o
def bevel(o, w, seg=2):
    b = o.modifiers.new('bevel', 'BEVEL'); b.width = w; b.segments = seg; b.limit_method = 'ANGLE'
    o.data.shade_smooth(); o.modifiers.new('wn', 'WEIGHTED_NORMAL'); return o
def box(name, size, loc, m=None, bev=0.0, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    o = bm_obj(name, bm, m, smooth=False); o.location = loc; o.rotation_euler = rot
    if bev > 0: bevel(o, bev)
    return o
def cyl(name, r, h, loc, m=None, segs=32, r2=None, rot=(0, 0, 0), cap=True):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=cap, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    o = bm_obj(name, bm, m); o.location = loc; o.rotation_euler = rot; return o
def sphere(name, r, loc, m=None, scale=(1, 1, 1), segs=24, rings=16):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    o = bm_obj(name, bm, m); o.location = loc; o.scale = scale; return o
def lathe(name, prof, loc, m=None, segs=32, uv=False):
    """profile [(r, z)] spun round z; with uv=True u runs round, v up the profile"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); n = len(prof); cols_ = segs + 1
    vs = [[bm.verts.new((math.cos(TAU * i / segs) * r, math.sin(TAU * i / segs) * r, h)) for (r, h) in prof] for i in range(cols_)]
    for i in range(segs):
        for k in range(n - 1):
            a, b, c, d = vs[i][k], vs[i + 1][k], vs[i + 1][k + 1], vs[i][k + 1]
            try: f = bm.faces.new((a, b, c, d))
            except ValueError: continue
            for l, (uu, vv) in zip(f.loops, [(i / segs, k / (n - 1)), ((i + 1) / segs, k / (n - 1)), ((i + 1) / segs, (k + 1) / (n - 1)), (i / segs, (k + 1) / (n - 1))]): l[uvl].uv = (uu, vv)
    o = bm_obj(name, bm, m); o.location = loc; return o
def tube(name, pts, r, m=None, res=6, poly=False, taper=None):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 2; cu.use_fill_caps = True
    sp = cu.splines.new('POLY' if poly else 'NURBS'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (p[0], p[1], p[2], 1)
        if taper: sp.points[i].radius = taper(i / max(1, len(pts) - 1))
    if not poly: sp.use_endpoint_u = True; sp.order_u = min(4, len(pts)); sp.resolution_u = res
    o = link(bpy.data.objects.new(name, cu))
    if m: cu.materials.append(m)
    return o
def point_light(name, loc, energy, color=(1.0, 0.7, 0.4), radius=0.03):
    ld = bpy.data.lights.new(name, 'POINT'); ld.energy = energy; ld.color = color; ld.shadow_soft_size = radius
    o = link(bpy.data.objects.new(name, ld)); o.location = loc; return o
def area_light(name, loc, energy, size, color, rot=(0, 0, 0), shape='SQUARE', size_y=None, cam=False):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = size; ld.color = color; ld.shape = shape
    if size_y: ld.size_y = size_y
    o = link(bpy.data.objects.new(name, ld)); o.location = loc; o.rotation_euler = rot
    o.visible_camera = cam; o.visible_glossy = False; return o
def smooth(k): k = min(max(k, 0.0), 1.0); return k * k * (3 - 2 * k)

def frames(path, up=Vector((0, 0, 1))):
    """tangent, side and up for each point of a path; side stays horizontal where it can"""
    out = []
    for i in range(len(path)):
        a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]; T = (b - a).normalized()
        S = up.cross(T)
        if S.length < 1e-4: S = Vector((0, 1, 0)).cross(T)
        S.normalize(); U = T.cross(S).normalized(); out.append((T, S, U))
    return out

def sweep(name, path, prof, m=None, mats=(), seg_mat=None, scale=None, closed=True, cap=True, up=Vector((0, 0, 1)), smooth_=True):
    """sweep a 2D profile [(s, u)] along a path; scale(t) shrinks it; each profile segment can take its own
    material, and gets UVs running 0..1 across it and along the path by length"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); fr = frames(path, up)
    lens = [0.0]
    for i in range(1, len(path)): lens.append(lens[-1] + (path[i] - path[i - 1]).length)
    tot = lens[-1] or 1.0; rings = []
    for i, p in enumerate(path):
        t = i / (len(path) - 1); T, S, U = fr[i]; k = scale(t) if scale else 1.0
        if isinstance(k, (int, float)): k = (k, k)
        rings.append([bm.verts.new(p + S * (s * k[0]) + U * (u * k[1])) for (s, u) in prof])
    n = len(prof); segs = n if closed else n - 1
    for i in range(len(path) - 1):
        for j in range(segs):
            j2 = (j + 1) % n
            try: f = bm.faces.new((rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j]))
            except ValueError: continue
            if seg_mat: f.material_index = seg_mat[j]
            u0, u1 = lens[i] / tot, lens[i + 1] / tot
            for l, uv in zip(f.loops, [(u0, 0), (u0, 1), (u1, 1), (u1, 0)]): l[uvl].uv = uv
    if cap and closed:
        for r_ in (rings[0], rings[-1][::-1]):
            try: bm.faces.new(r_[::-1] if r_ is rings[0] else r_)
            except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm_obj(name, bm, m, smooth=smooth_, mats=mats)


# ---------------------------------------------------------------- image boards, round pictures, faces turned the right way (as in build_tea.py)
def uvbox(name, size, loc, m, rot=(0, 0, 0)):
    """a box whose front face (-y) carries the whole image, for boards, frames' pictures and signs"""
    o = box(name, size, loc, m, rot=rot)
    me = o.data; uv = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (v.x / size[0] + 0.5, v.z / size[2] + 0.5)
    return o
def orient(bm, want):
    """turn each face so its normal points the way want(centre) says: a face baked from its back comes out black"""
    bm.normal_update()
    bad = [f for f in bm.faces if f.normal.dot(want(f.calc_center_median())) < 0]
    if bad: bmesh.ops.reverse_faces(bm, faces=bad)
def disc(name, r, loc, m, rotz=0.0, segs=64):
    """a round picture facing -y (turned by rotz), its image the right way round from the side it faces"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); c = bm.verts.new((0, 0, 0))
    ring = [bm.verts.new((math.cos(TAU * i / segs) * r, 0, math.sin(TAU * i / segs) * r)) for i in range(segs)]
    for i in range(segs):
        f = bm.faces.new((c, ring[i], ring[(i + 1) % segs]))
        for l in f.loops: l[uvl].uv = (0.5 + l.vert.co.x / (2 * r), 0.5 + l.vert.co.z / (2 * r))
    o = bm_obj(name, bm, m, smooth=False); o.location = loc; o.rotation_euler = (0, 0, rotz); return o
def remap_uv(o, u0, v0, u1, v1):
    for d in o.data.uv_layers[0].data: d.uv = (u0 + d.uv[0] * (u1 - u0), v0 + d.uv[1] * (v1 - v0))
def leafy_ball(name, r, loc, m, seed):
    o = sphere(name, r, loc, m, segs=24, rings=16)
    tx = bpy.data.textures.new(name + 'Tx', 'CLOUDS'); tx.noise_scale = r * 0.35
    dm = o.modifiers.new('leafy', 'DISPLACE'); dm.texture = tx; dm.strength = r * 0.3
    return o

# ---------------------------------------------------------------- walls with holes in them, stars and crescents (as in build_study.py)
def outline_curve(name, outer, holes, thick, m, rotx=math.pi / 2):
    """a flat slab from a 2D outline with holes (lists of (x, y)), extruded both ways by thick/2; stood upright"""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.extrude = thick / 2
    for pts in [outer] + holes:
        sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
        for i, (x, y) in enumerate(pts): sp.points[i].co = (x, y, 0, 1)
        sp.use_cyclic_u = True
    o = link(bpy.data.objects.new(name, cu)); cu.materials.append(m); o.rotation_euler = (rotx, 0, 0); return o
def rect(x0, y0, x1, y1): return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
def ring_pts(cx, cy, r, n=72): return [(cx + math.cos(-TAU * i / n) * r, cy + math.sin(-TAU * i / n) * r) for i in range(n)]
def arch_pts(cx, z0, w, h, n=20):
    """a round-headed opening: straight sides from z0, a half circle on top, h high in all"""
    r = w / 2; zs = z0 + h - r
    return [(cx - r, z0), (cx + r, z0)] + [(cx + r * math.cos(math.pi * k / n), zs + r * math.sin(math.pi * k / n)) for k in range(n + 1)]
def star_pts(r, k=0.42, n=5):
    return [(math.cos(math.pi / 2 + i * math.pi / n) * (r if i % 2 == 0 else r * k), math.sin(math.pi / 2 + i * math.pi / n) * (r if i % 2 == 0 else r * k)) for i in range(2 * n)]
def crescent_pts(r, d=0.45, r2=0.85, n=32):
    """a crescent: a disc of radius r with a disc of r2 * r, d * r to the right, taken out of it"""
    xi = (1 - r2 * r2 + d * d) / (2 * d); yi = math.sqrt(1 - xi * xi); a0 = math.atan2(yi, xi); b0 = math.atan2(yi, xi - d)
    outer = [(math.cos(a0 + (TAU - 2 * a0) * k / n) * r, math.sin(a0 + (TAU - 2 * a0) * k / n) * r) for k in range(n + 1)]
    inner = [((d + r2 * math.cos(-b0 - (TAU - 2 * b0) * k / n)) * r, r2 * math.sin(-b0 - (TAU - 2 * b0) * k / n) * r) for k in range(1, n)]
    return outer + inner
def slab(name, pts, thick, loc, m, rotz=0.0):
    o = outline_curve(name, pts, [], thick, m); o.location = loc; o.rotation_euler = (math.pi / 2, 0, rotz); return o
def blob_into(bm, r, loc, scale=(1, 1, 1), sub=1):
    """a little rounded lump (a pebble, a leaf cluster) added into a shared mesh"""
    mt = Matrix.Translation(loc) @ Matrix.Diagonal((scale[0] * r, scale[1] * r, scale[2] * r, 1))
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0, matrix=mt)
def crystal_into(bm, base, d, r, h):
    """a six-sided crystal point growing from base along d"""
    d = Vector(d).normalized(); a = d.orthogonal().normalized(); b = d.cross(a)
    ring0 = [bm.verts.new(base + (a * math.cos(TAU * k / 6) + b * math.sin(TAU * k / 6)) * r) for k in range(6)]
    ring1 = [bm.verts.new(base + d * h + (a * math.cos(TAU * k / 6) + b * math.sin(TAU * k / 6)) * r * 0.92) for k in range(6)]
    tip = bm.verts.new(base + d * (h + r * 1.7))
    for k in range(6):
        bm.faces.new((ring0[k], ring0[(k + 1) % 6], ring1[(k + 1) % 6], ring1[k])); bm.faces.new((ring1[k], ring1[(k + 1) % 6], tip))
    bm.faces.new(ring0[::-1])
def cluster(name, loc, m, n, seed, size=1.0, spread=0.5):
    bm = bmesh.new(); rr = random.Random(seed)
    for k in range(n):
        tilt = rr.uniform(0, spread) if k else 0.0; az = rr.uniform(0, TAU)
        d = (math.sin(tilt) * math.cos(az), math.sin(tilt) * math.sin(az), math.cos(tilt))
        crystal_into(bm, Vector((rr.uniform(-0.3, 0.3) * size * 0.1, rr.uniform(-0.3, 0.3) * size * 0.1, 0)), d, size * rr.uniform(0.012, 0.022), size * rr.uniform(0.05, 0.12) * (1.4 if not k else 1))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = bm_obj(name, bm, m, smooth=False); o.location = loc; return o
def ribbon(name, pts, w, m, up=Vector((0, 0, 1))):
    """a flat strip w wide along a path, facing up"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); rows = []
    for i, p in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]; t = (b - a).normalized(); s = up.cross(t).normalized()
        rows.append((bm.verts.new(p - s * w / 2), bm.verts.new(p + s * w / 2)))
    for i in range(len(pts) - 1):
        f = bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
        for l, uv in zip(f.loops, [(0, i), (1, i), (1, i + 1), (0, i + 1)]): l[uvl].uv = (uv[0], uv[1] * 0.25)
    orient(bm, lambda c: up)
    return bm_obj(name, bm, m)

# ---------------------------------------------------------------- materials of the moonlit window
def grass_mat(name):
    """moonlit turf: blue-green, mottled, with darker hollows"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.9; nz.inputs['Detail'].default_value = 6.0; L.new(oc, nz.inputs['Vector'])
    base = ramp(N, nz.outputs['Fac'], [(0.32, '#264a40'), (0.5, '#33604f'), (0.7, '#457562')])
    fine = N.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 60.0; fine.inputs['Detail'].default_value = 3.0; L.new(oc, fine.inputs['Vector'])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'OVERLAY'; mx.inputs['Factor'].default_value = 0.35
    L.new(base, mx.inputs['A']); L.new(fine.outputs['Color'], mx.inputs['B']); L.new(mx.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.85
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.3; L.new(fine.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m
def planks_mat(name, c1, c2, gap):
    """floorboards along x: staggered boards with dark joints, a little grain"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    br = N.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 1.0; br.inputs['Brick Width'].default_value = 1.35; br.inputs['Row Height'].default_value = 0.15
    br.inputs['Mortar Size'].default_value = 0.004; br.inputs['Color1'].default_value = col(c1); br.inputs['Color2'].default_value = col(c2); br.inputs['Mortar'].default_value = col(gap)
    br.offset = 0.37; L.new(oc, br.inputs['Vector'])
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.5, 22, 1); L.new(oc, mp.inputs['Vector'])
    gr = N.new('ShaderNodeTexNoise'); gr.inputs['Scale'].default_value = 3.0; gr.inputs['Detail'].default_value = 6.0; L.new(mp.outputs['Vector'], gr.inputs['Vector'])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 0.3
    L.new(br.outputs['Color'], mx.inputs['A']); L.new(gr.outputs['Color'], mx.inputs['B']); L.new(mx.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.45; p.inputs['Coat Weight'].default_value = 0.3
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.25; b.invert = True; L.new(br.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

PLASTER = plaster_mat('Plaster', '#efe9de', '#dcd4c6', rough=0.85)
PLASTERIN = plaster_mat('PlasterIn', '#e8e0f0', '#d6cce4', rough=0.85)
FOOT = stone_mat('Footing', '#8e8c90', '#6e6c72', scale=30, rough=0.8, speck='#3a3a3e', speck_amt=0.05)
INDIGO = wood_mat('IndigoWood', '#363e80', '#2c326c', stretch=6, bump=0.01, axis='z', rough=0.45)
INDIGOX = wood_mat('IndigoWoodX', '#363e80', '#2c326c', stretch=6, bump=0.01, axis='x', rough=0.45)
INDIGOY = wood_mat('IndigoWoodY', '#363e80', '#2c326c', stretch=6, bump=0.01, axis='y', rough=0.45)
WALNUT = wood_mat('Walnut', '#6e452a', '#46291a', stretch=8, bump=0.02, axis='z', rough=0.4, coat=0.4)
WALNUTX = wood_mat('WalnutX', '#6e452a', '#46291a', stretch=8, bump=0.02, axis='x', rough=0.4, coat=0.4)
WALNUTY = wood_mat('WalnutY', '#6e452a', '#46291a', stretch=8, bump=0.02, axis='y', rough=0.4, coat=0.4)
FLOOR = planks_mat('Floorboards', '#a8774c', '#946540', '#3a2618')
GILT = mat('Gilt', '#d8b06a', rough=0.3, metal=0.85)
BRASS = mat('Brass', '#c99e4e', rough=0.28, metal=0.9)
IRON = mat('Iron', '#24272e', rough=0.5, metal=0.6)
SILVER = mat('Silver', '#c8ccd4', rough=0.25, metal=0.8)
STONES = imgmat('TowerStones', 'window_stones.jpg', rough=0.8)
TILES = imgmat('RoofTiles', 'window_tiles.jpg', rough=0.75)
RIDGE = mat('RidgeTile', '#262c5a', rough=0.4)
CURTAIN = imgmat('StarCurtain', 'window_curtain.jpg', rough=0.8, sheen=0.5)
RUG = imgmat('MoonRug', 'window_rug.jpg', rough=0.95, sheen=0.6)
STARCHART = imgmat('StarChart', 'window_starchart.jpg', rough=0.5)
MOONCHART = imgmat('MoonChart', 'window_moonchart.jpg', rough=0.8)
FRIEZE = imgmat('MoonFrieze', 'window_frieze.jpg', rough=0.6)
LILAC = mat('LilacVelvet', '#b9a2dc', rough=0.7, sheen=0.9)
NAVYV = mat('IndigoVelvet', '#3c4290', rough=0.7, sheen=0.9)
GOLDV = mat('GoldVelvet', '#d6b06a', rough=0.65, sheen=0.8)
AMETHYST = mat('Amethyst', '#8a58c8', rough=0.12, emit='#6a3ab0', emit_str=0.6, coat=1.0)
QUARTZ = mat('Quartz', '#ece8f6', rough=0.08, emit='#cfc6ff', emit_str=0.4, coat=1.0)
ROSEQ = mat('RoseQuartz', '#f2c2d0', rough=0.1, emit='#e0a0b8', emit_str=0.3, coat=1.0)
ORB = mat('CrystalBall', '#c8b8f4', rough=0.05, emit='#9a80f0', emit_str=1.6, coat=1.0)
FLAME = mat('Flame', '#ffd890', emit='#ffb050', emit_str=20)
WAX = mat('Wax', '#f4ecdc', rough=0.5); WAXL = mat('WaxLilac', '#d8c8f0', rough=0.5)
PANE = mat('PaneWarm', '#ffd68a', rough=0.3, emit='#ffc870', emit_str=3.0)
GLOWPANE = mat('LanternGlass', '#fff0d0', rough=0.3, emit='#ffd8a0', emit_str=6.0)
GRASS = grass_mat('Grass')
EARTH = stone_mat('Earth', '#4e3c30', '#3a2c24', scale=14, rough=0.9, bump=0.4, speck='#7a7670', speck_amt=0.09)
BLADE = mat('GrassBlade', '#3c6c56', rough=0.7)
WATER = mat('Water', '#1c2a5c', rough=0.03, metal=0.3, coat=1.0, emit='#2a3c78', emit_str=0.35)
FOAM = mat('Foam', '#c8d4f0', rough=0.4, emit='#a8b8e8', emit_str=0.6)
PEBBLE = stone_mat('Pebble', '#9a9a9c', '#78787c', scale=8, rough=0.6, bump=0.1, speck='#505054', speck_amt=0.04)
ROCK = stone_mat('Rock', '#7e7c82', '#5e5c64', scale=12, rough=0.8, bump=0.3)
PICKET = mat('Picket', '#ebe7df', rough=0.6)
LEAF = mat('NightLeaf', '#356a6c', rough=0.6); LEAFL = mat('NightLeafLight', '#4a8880', rough=0.6); PINE = mat('PineNeedle', '#1f4042', rough=0.7)
BARK = wood_mat('Bark', '#4e3e34', '#2e241e', stretch=4, bump=0.35, axis='z', rough=0.9)
OWLM = mat('Owl', '#8a6e56', rough=0.8, sheen=0.4); OWLFACE = mat('OwlFace', '#dccaa8', rough=0.8); OWLEYE = mat('OwlEye', '#f2c440', rough=0.2, emit='#f0b030', emit_str=1.5)
LAVENDER = mat('Lavender', '#9a7ed4', rough=0.6); STEM = mat('Stem', '#3e6a48', rough=0.7)
MOONFLOWER = mat('MoonFlower', '#f6f4ec', rough=0.5, emit='#e6e8ff', emit_str=0.25)
SHROOM = mat('GlowShroom', '#cdbcf4', rough=0.4, emit='#a48cff', emit_str=2.2); SHROOMSTEM = mat('ShroomStem', '#e8e2d4', rough=0.6)
CAT = mat('CatBlack', '#2e2c3a', rough=0.75, sheen=0.7)
BOOKS = [mat('Book' + k, c, rough=0.7) for k, c in [('Plum', '#6a3a6e'), ('Navy', '#2e3a70'), ('Teal', '#2e6a6a'), ('Rust', '#8a4a32'), ('Sage', '#7a8a62'), ('Wine', '#7a2a3a'), ('Sand', '#c8b088')]]
POTION = [mat('Potion' + k, c, rough=0.08, emit=c, emit_str=0.5, coat=1.0) for k, c in [('Violet', '#8a6ad8'), ('Teal', '#4ab0a8'), ('Rose', '#d87aa0'), ('Amber', '#d8a04a')]]
PAPER = mat('Paper', '#f2e8d2', rough=0.85)
STARGOLD = mat('StarGold', '#f0c860', rough=0.3, metal=0.6, emit='#f0b840', emit_str=2.0)
HANGSTAR = mat('PaperStar', '#e8c870', rough=0.5, metal=0.3, emit='#e8b850', emit_str=0.5)
BULB = mat('FairyBulb', '#fff2c8', emit='#ffd890', emit_str=8)
SHUTTER = wood_mat('Shutter', '#8a7ab8', '#7a6aa8', stretch=6, bump=0.01, axis='z', rough=0.5)
TERRA = mat('Terracotta', '#b0643e', rough=0.8); MUG = mat('Mug', '#e8e0d0', rough=0.3, coat=0.5)
HERB = mat('DriedHerb', '#7a8a5a', rough=0.8); SOOT = mat('Soot', '#141212', rough=0.9)

# ---------------------------------------------------------------- dimensions (front is -y; the grass is z = 0)
F = 0.3                         # the cottage floor, on a stone footing
BX, BY0, BY1, WT = 2.6, -1.7, 1.9, 0.2
IX, IY1 = BX - WT, BY1 - WT     # inside: x within +-2.4, back wall face at y = 1.7
EAV = F + 3.6                   # the top of the walls, under the eaves
CEIL = F + 3.4                  # the ceiling
OV, RISE = 0.32, 2.5            # the roof's overhang, and its peak's height over the eaves
T = F + 0.5                     # the low table's top
TX, TY = 0.0, 0.42              # the table's middle
MW = dict(cz=F + 1.45, r=0.78)  # the moon window, round, in the back wall
TW = dict(x=3.55, y=0.95, r=1.08, h=5.6)   # the tower
IC, IA, IB, IN = (0.2, 0.1), 6.2, 4.3, 4.0  # the island: a rounded oblong (a superellipse of power 4)
def island_y(x, s=-1):
    k = max(0.0, 1 - abs((x - IC[0]) / IA) ** IN); return IC[1] + s * IB * k ** (1 / IN)

# ---------------------------------------------------------------- the island: turf on top, earth round its sides
def island():
    n = 160; bm = bmesh.new(); rr = random.Random(5); rings = []
    for k, (z, s_) in enumerate([(0.0, 1.0), (-0.14, 1.008), (-0.55, 0.985), (-1.0, 0.95)]):
        ring = []
        for i in range(n):
            a = TAU * i / n; c, s = math.cos(a), math.sin(a); j = 1.0 if k < 2 else 1 + rr.uniform(-0.012, 0.012)
            ring.append(bm.verts.new((IC[0] + IA * s_ * j * math.copysign(abs(c) ** (2 / IN), c), IC[1] + IB * s_ * j * math.copysign(abs(s) ** (2 / IN), s), z + (rr.uniform(-0.06, 0.06) if k == 3 else 0))))
        rings.append(ring)
    bm.faces.new(rings[0]).material_index = 0
    for k in range(3):
        for i in range(n): bm.faces.new((rings[k][i], rings[k][(i + 1) % n], rings[k + 1][(i + 1) % n], rings[k + 1][i])).material_index = 0 if k == 0 else 1
    bm.faces.new(rings[3][::-1]).material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm_obj('IslandGround', bm, smooth=False, mats=(GRASS, EARTH))
island()

# the stream down the left side, over the front edge in a little fall; pebbles along its banks, stepping stones across
STREAM = [Vector(p) for p in [(-3.5, 4.7, 0.012), (-3.4, 3.4, 0.012), (-3.9, 2.0, 0.012), (-3.6, 0.6, 0.012), (-4.05, -0.9, 0.012), (-3.7, -2.3, 0.012), (-3.85, -3.4, 0.012)]]
STREAM.append(Vector((-3.85, island_y(-3.85) + 0.02, 0.012)))
SW = 0.72
ribbon('StreamWater', STREAM, SW, WATER)
fy = island_y(-3.85)
bm = bmesh.new(); rows = []
for (dy, z) in [(0.02, 0.012), (-0.06, -0.05), (-0.05, -0.16), (0.0, -0.55), (0.14, -1.02)]:
    rows.append((bm.verts.new((-3.85 - SW / 2, fy + dy, z)), bm.verts.new((-3.85 + SW / 2, fy + dy, z))))
for i in range(len(rows) - 1): bm.faces.new((rows[i][0], rows[i][1], rows[i + 1][1], rows[i + 1][0]))
orient(bm, lambda c: Vector((0, -1, 0.3))); bm_obj('StreamFall', bm, WATER)
for k, (x, z) in enumerate([(-0.2, -0.3), (0.05, -0.7), (0.22, -0.45)]): sphere(f'StreamFoam{k}', 0.06, (-3.85 + x, fy - 0.07 + 0.05 * (z + 0.5), z), FOAM, scale=(1.6, 0.4, 1), segs=10, rings=6)
bm = bmesh.new(); rr = random.Random(31)
for i in range(len(STREAM) - 1):
    a, b = STREAM[i], STREAM[i + 1]; L_ = (b - a).length; t = (b - a).normalized(); s = Vector((-t.y, t.x, 0))
    for k in range(int(L_ / 0.2)):
        p = a + (b - a) * (k / int(L_ / 0.2))
        for side in (-1, 1):
            r = rr.uniform(0.05, 0.11); blob_into(bm, r, p + s * side * (SW / 2 + rr.uniform(0.0, 0.08)) + Vector((0, 0, r * 0.15)), (1.0, rr.uniform(0.7, 1.1), 0.45))
bm_obj('StreamBankPebbles', bm, PEBBLE, smooth=True)
for k, x in enumerate((-4.1, -3.78, -3.46)):
    o = cyl(f'SteppingStone{k}', 0.15, 0.08, (x, -2.25 + 0.06 * (k % 2), 0.03), ROCK, segs=12); o.scale = (1.15, 0.9, 1)

# ---------------------------------------------------------------- the cottage: a stone footing, a floor of boards, white walls, an open front
box('FootingStone', (2 * BX + 0.1, BY1 - BY0 + 0.1, F - 0.02), (0, (BY0 + BY1) / 2, (F - 0.02) / 2), FOOT)
box('FloorBoards', (2 * BX, BY1 - BY0, 0.04), (0, (BY0 + BY1) / 2, F - 0.02), FLOOR)
box('FrontStep', (1.5, 0.36, F * 0.5), (0, BY0 - 0.18, F * 0.25), FOOT, bev=0.02)
def wall(name, outer, holes, m, thick, rotz, loc):
    o = outline_curve(name, outer, holes, thick, m); o.rotation_euler = (math.pi / 2, 0, rotz); o.location = loc; return o
H, HC = EAV - F, CEIL - F
win_hole = ring_pts(0, MW['cz'] - F, MW['r'], 128)
wall('WallBack', rect(-BX, 0, BX, H), [win_hole], PLASTER, WT, 0, (0, BY1 - WT / 2, F))
wall('WallBackIn', rect(-IX, 0, IX, HC), [win_hole], PLASTERIN, 0.006, 0, (0, IY1 - 0.003, F))
LWIN = dict(y=-0.15, w=0.8, z0=1.05, h=1.25)                                  # the side window in the left wall, above the floor
lw_hole = arch_pts(LWIN['y'], LWIN['z0'], LWIN['w'], LWIN['h'])
for s in (-1, 1):
    holes = [lw_hole] if s < 0 else []
    wall(f'WallSide{s}', rect(BY0, 0, BY1, H), holes, PLASTER, WT, math.pi / 2, (s * (BX - WT / 2), 0, F))
    wall(f'WallSideIn{s}', rect(BY0, 0, IY1, HC), holes, PLASTERIN, 0.006, math.pi / 2, (s * (IX - 0.003), 0, F))
    box(f'CornerPost{s}', (0.26, 0.26, H + 0.02), (s * (BX - 0.1), BY0 + 0.1, F + H / 2), INDIGO, bev=0.015)
box('FrontLintel', (2 * BX + 0.06, 0.26, EAV - CEIL + 0.14), (0, BY0 + 0.1, (CEIL + EAV) / 2 - 0.07), INDIGOX, bev=0.015)
box('FrontLintelTrim', (2 * BX - 0.2, 0.04, 0.04), (0, BY0 - 0.04, CEIL - 0.04), GILT)
# the wainscot: indigo boards to the dado rail, a thin gilt line along it, framed panels
for nm, size, loc in [('Left', (0.024, IY1 - BY0 - 0.26), (-IX + 0.012, (IY1 + BY0 + 0.26) / 2)), ('Right', (0.024, IY1 - BY0 - 0.26), (IX - 0.012, (IY1 + BY0 + 0.26) / 2)),
                      ('BackL', (IX - 1.37, 0.024), (-(IX + 1.37) / 2, IY1 - 0.012)), ('BackR', (IX - 1.37, 0.024), ((IX + 1.37) / 2, IY1 - 0.012))]:
    sx, sy = size; side = sy > 0.1
    box(f'Dado{nm}', (sx, sy, 0.85), (loc[0], loc[1], F + 0.425), INDIGOY if side else INDIGOX)
    box(f'DadoRail{nm}', (sx + 0.04 if side else sx, sy if side else sy + 0.04, 0.04), (loc[0], loc[1], F + 0.86), WALNUTY if side else WALNUTX)
    box(f'DadoGilt{nm}', (sx + 0.05 if side else sx, sy if side else sy + 0.05, 0.012), (loc[0], loc[1], F + 0.835), GILT)
    box(f'DadoSkirt{nm}', (sx + 0.03 if side else sx, sy if side else sy + 0.03, 0.12), (loc[0], loc[1], F + 0.06), WALNUTY if side else WALNUTX)
for s in (-1, 1):
    for k in range(5):
        y = BY0 + 0.55 + k * 0.62
        if s < 0 and (-0.65 < y < 0.35 or y > 0.45): continue                 # the chest under the window, the shelves
        if s > 0 and (0.4 < y < 1.5): continue                                 # the door to the tower
        box(f'DadoPanel{s}{k}', (0.02, 0.48, 0.5), (s * (IX - 0.03), y, F + 0.47), INDIGOY, bev=0.008)
# the frieze of moons round the top of the walls
o = uvbox('FriezeBack', (2 * IX, 0.012, 0.36), (0, IY1 - 0.012, CEIL - 0.19), FRIEZE)
for s in (-1, 1):
    o = uvbox(f'FriezeSide{s}', (IY1 - BY0 - 0.26, 0.012, 0.36), (s * (IX - 0.012), (IY1 + BY0 + 0.26) / 2, CEIL - 0.19), FRIEZE, rot=(0, 0, -s * math.pi / 2))
    remap_uv(o, 0, 0, 0.74, 1)
box('Ceiling', (2 * IX, IY1 - BY0, 0.06), (0, (IY1 + BY0) / 2, CEIL + 0.03), PLASTERIN)
for k, y in enumerate((-1.05, -0.05, 0.95)): box(f'CeilingBeam{k}', (2 * IX, 0.15, 0.17), (0, y, CEIL - 0.085), WALNUTX, bev=0.01)

# ---------------------------------------------------------------- the pyramid roof of scalloped navy tiles, an indigo fascia, a little chimney
def pyramid_roof():
    x0, x1, y0, y1 = -BX - OV, BX + OV, BY0 - OV, BY1 + OV; yc = (y0 + y1) / 2; tile = 2.2
    apex = Vector((0, yc, EAV + RISE)); C = [Vector((x0, y0, EAV)), Vector((x1, y0, EAV)), Vector((x1, y1, EAV)), Vector((x0, y1, EAV))]
    for nm, lift, m, want in (('Roof', 0.0, TILES, 1), ('RoofUnder', -0.14, PLASTER, -1)):
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
        for k in range(4):
            a, b = C[k] + Vector((0, 0, lift)), C[(k + 1) % 4] + Vector((0, 0, lift)); top = apex + Vector((0, 0, lift))
            mid = (a + b) / 2; L_ = (b - a).length; slant = (top - mid).length
            f = bm.faces.new((bm.verts.new(a), bm.verts.new(b), bm.verts.new(top)))
            for l, uv in zip(f.loops, [(0, 0), (L_, 0), (L_ / 2, slant)]): l[uvl].uv = (uv[0] / tile, uv[1] / tile)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        orient(bm, lambda c, w=want: Vector((0, 0, w)))
        bm_obj(nm, bm, m, smooth=False)
    for k in range(4):
        a, b = C[k], C[(k + 1) % 4]; mid = (a + b) / 2 + Vector((0, 0, -0.07)); L_ = (b - a).length
        box(f'EaveFascia{k}', (L_ + 0.06, 0.05, 0.16), mid, INDIGOX, rot=(0, 0, math.atan2(b.y - a.y, b.x - a.x)))
        tube(f'RidgeHip{k}', [C[k] + Vector((0, 0, 0.03)), apex + Vector((0, 0, 0.03))], 0.045, RIDGE, poly=True)
    sphere('RoofFinialBall', 0.09, apex + Vector((0, 0, 0.1)), GILT, segs=16, rings=10)
    slab('RoofFinialMoon', crescent_pts(0.22), 0.04, apex + Vector((0, 0, 0.42)), GILT)
pyramid_roof()
def roof_z(x, y):
    hx, hy, yc = BX + OV, (BY1 - BY0) / 2 + OV, (BY0 + BY1) / 2
    return EAV + RISE * (1 - max(abs(x) / hx, abs(y - yc) / hy))
cx_, cy_ = -1.35, 1.15
box('ChimneyStack', (0.42, 0.42, 1.4), (cx_, cy_, roof_z(cx_, cy_) + 0.3), FOOT)
box('ChimneyCap', (0.52, 0.52, 0.08), (cx_, cy_, roof_z(cx_, cy_) + 1.03), FOOT, bev=0.01)
cyl('ChimneyPot', 0.09, 0.22, (cx_, cy_, roof_z(cx_, cy_) + 1.18), TERRA, segs=16)
e = bpy.data.objects.new('SmokeAt', None); sc.collection.objects.link(e); e.location = (cx_, cy_, roof_z(cx_, cy_) + 1.32)

# ---------------------------------------------------------------- the round window: open to the sky, a brass ring, fairy lights, crystals in it
bm = bmesh.new(); n = 128
rv = [[bm.verts.new((math.cos(TAU * i / n) * (MW['r'] - 0.008), y, MW['cz'] + math.sin(TAU * i / n) * (MW['r'] - 0.008))) for i in range(n)] for y in (IY1 - 0.03, BY1 + 0.01)]
for i in range(n): bm.faces.new((rv[0][i], rv[0][(i + 1) % n], rv[1][(i + 1) % n], rv[1][i]))
orient(bm, lambda c: Vector((-c.x, 0, MW['cz'] - c.z))); bm_obj('MoonWindowReveal', bm, WALNUTY)
ring = [Vector((math.cos(a) * (MW['r'] + 0.02), IY1 - 0.035, MW['cz'] + math.sin(a) * (MW['r'] + 0.02))) for a in [TAU * i / 128 for i in range(129)]]
sweep('MoonWindowFrame', ring, [(-0.028, -0.018), (0.028, -0.018), (0.028, 0.018), (-0.028, 0.018)], BRASS, up=Vector((0, 1, 0)))
ring = [Vector((math.cos(a) * (MW['r'] + 0.17), IY1 - 0.01, MW['cz'] + math.sin(a) * (MW['r'] + 0.17))) for a in [TAU * i / 128 for i in range(129)]]
sweep('MoonWindowRing', ring, [(-0.01, -0.01), (0.01, -0.01), (0.01, 0.01), (-0.01, 0.01)], GILT, up=Vector((0, 1, 0)))
ring = [Vector((math.cos(a) * (MW['r'] + 0.1), BY1 + 0.02, MW['cz'] + math.sin(a) * (MW['r'] + 0.1))) for a in [TAU * i / 128 for i in range(129)]]
sweep('MoonWindowSurround', ring, [(-0.1, -0.035), (0.1, -0.035), (0.1, 0.035), (-0.1, 0.035)], FOOT, up=Vector((0, 1, 0)))
ring = [Vector((math.cos(a) * (MW['r'] + 0.1), IY1 - 0.05, MW['cz'] + math.sin(a) * (MW['r'] + 0.1) - 0.01 * (1 + math.cos(a * 15)))) for a in [TAU * i / 128 for i in range(129)]]
tube('MoonWindowLightWire', [tuple(p) for p in ring], 0.004, IRON, poly=True)
for k in range(30):
    a = TAU * (k + 0.5) / 30; sphere(f'FairyBulb{k}', 0.017, (math.cos(a) * (MW['r'] + 0.1), IY1 - 0.055, MW['cz'] + math.sin(a) * (MW['r'] + 0.1) - 0.02), BULB, segs=8, rings=6)
for k, (x, drop) in enumerate(((-0.5, 0.42), (-0.36, 0.26), (0.46, 0.34))):
    zt = MW['cz'] + math.sqrt(MW['r'] ** 2 - x * x)
    tube(f'SuncatcherThread{k}', [(x, IY1 - 0.04, zt), (x, IY1 - 0.04, zt - drop)], 0.002, SILVER, poly=True)
    o = sphere(f'SuncatcherCrystal{k}', 0.035, (x, IY1 - 0.04, zt - drop - 0.04), QUARTZ, segs=4, rings=2); o.scale = (1, 1, 1.8)
    sphere(f'SuncatcherBead{k}', 0.012, (x, IY1 - 0.04, zt - drop * 0.5), AMETHYST, segs=8, rings=6)
e = bpy.data.objects.new('MoonWinAt', None); sc.collection.objects.link(e); e.location = (0, IY1, MW['cz'])
# the starry sheers on a brass rod, drawn back either side with gold cords
ROD = MW['cz'] + MW['r'] + 0.24
tube('CurtainRod', [(-1.62, IY1 - 0.13, ROD), (1.62, IY1 - 0.13, ROD)], 0.016, BRASS, poly=True)
for s in (-1, 1):
    sphere(f'CurtainRodEnd{s}', 0.035, (s * 1.65, IY1 - 0.13, ROD), BRASS, segs=12, rings=8)
    tube(f'CurtainRodBracket{s}', [(s * 1.5, IY1 - 0.005, ROD), (s * 1.5, IY1 - 0.13, ROD)], 0.01, BRASS, poly=True)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); rows, cols = 18, 12; grid = []; z1, z0 = ROD - 0.03, F + 0.57
    for j in range(rows + 1):
        t = j / rows; z = z1 - t * (z1 - z0); tie = math.exp(-((t - 0.56) / 0.17) ** 2)
        xi = 0.6 + 0.48 * tie + 0.22 * max(0, t - 0.56); xo = 1.52 - 0.06 * tie; amp = 0.025 + 0.04 * tie
        grid.append([bm.verts.new((s * (xi + (xo - xi) * i / cols), IY1 - 0.16 + amp * math.sin(i * 2.7 + 0.6 * s), z)) for i in range(cols + 1)])
    for j in range(rows):
        for i in range(cols):
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            for l, (a, b) in zip(f.loops, [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]): l[uvl].uv = (a / cols * 1.6, 1.0 - b / rows * 1.8)
    orient(bm, lambda c: Vector((0, -1, 0)))
    bm_obj(f'CurtainSheer{s}', bm, CURTAIN)
    zt = z1 - 0.56 * (z1 - z0)
    tube(f'CurtainCord{s}', [(s * 1.6, IY1 - 0.02, zt + 0.04), (s * 1.42, IY1 - 0.26, zt), (s * 1.14, IY1 - 0.24, zt - 0.02), (s * 1.04, IY1 - 0.12, zt)], 0.012, GILT)
    cyl(f'CurtainTassel{s}', 0.03, 0.12, (s * 1.08, IY1 - 0.24, zt - 0.1), GILT, segs=12, r2=0.008)

# ---------------------------------------------------------------- the window seat: an indigo box with panels, a lilac cushion, pillows, a cat asleep
SEATD = 0.6
box('SeatBase', (2.7, SEATD, 0.4), (0, IY1 - SEATD / 2, F + 0.2), INDIGOX)
for k in range(4): box(f'SeatPanel{k}', (0.56, 0.02, 0.24), (-0.99 + k * 0.66, IY1 - SEATD - 0.008, F + 0.21), INDIGOX, bev=0.008)
box('SeatTop', (2.74, SEATD + 0.04, 0.03), (0, IY1 - SEATD / 2 - 0.02, F + 0.415), WALNUTX, bev=0.006)
box('SeatCushion', (2.62, SEATD - 0.06, 0.1), (0, IY1 - SEATD / 2 - 0.01, F + 0.48), LILAC, bev=0.04)
for s, m in ((-1, NAVYV), (1, NAVYV)):
    o = sphere(f'SeatPillow{s}', 0.22, (s * 1.0, IY1 - 0.4, F + 0.7), m, scale=(1.0, 0.34, 0.85), segs=20, rings=12); o.rotation_euler = (0.25, 0, s * 0.12)
o = sphere('SeatPillowGold', 0.15, (-0.86, IY1 - 0.5, F + 0.64), GOLDV, scale=(1.0, 0.36, 0.85), segs=16, rings=10); o.rotation_euler = (0.35, 0, -0.3)
box('SeatThrow', (0.52, SEATD - 0.02, 0.035), (1.0, IY1 - SEATD / 2 - 0.02, F + 0.545), GOLDV, bev=0.012)
box('SeatThrowFlap', (0.52, 0.035, 0.34), (1.0, IY1 - SEATD - 0.035, F + 0.39), GOLDV, bev=0.012)
for k in range(6): cyl(f'SeatThrowFringe{k}', 0.008, 0.06, (0.78 + k * 0.088, IY1 - SEATD - 0.04, F + 0.19), GOLDV, segs=6)
cx, cy, cz = -0.42, IY1 - 0.3, F + 0.53                                       # a black cat asleep, curled nose to tail
sphere('CatBody', 0.14, (cx, cy, cz + 0.075), CAT, scale=(1.3, 0.95, 0.62), segs=20, rings=12)
sphere('CatHead', 0.085, (cx + 0.16, cy - 0.09, cz + 0.1), CAT, scale=(1.05, 0.95, 0.9), segs=18, rings=12)
for s_ in (-1, 1):
    o = cyl(f'CatEar{s_}', 0.03, 0.065, (cx + 0.16 + s_ * 0.045, cy - 0.1, cz + 0.18), CAT, segs=8, r2=0.0); o.rotation_euler = (0.15, s_ * 0.32, 0)
    o = sphere(f'CatEarInner{s_}', 0.014, (cx + 0.16 + s_ * 0.045, cy - 0.118, cz + 0.17), mat('CatEarPink', '#a87888', rough=0.7), scale=(1, 0.4, 1.6), segs=8, rings=6); o.rotation_euler = (0.15, s_ * 0.32, 0)
    tube(f'CatEyeShut{s_}', [(cx + 0.16 + s_ * 0.045 - 0.014, cy - 0.17, cz + 0.112), (cx + 0.16 + s_ * 0.045, cy - 0.176, cz + 0.106), (cx + 0.16 + s_ * 0.045 + 0.014, cy - 0.17, cz + 0.112)], 0.0025, mat('CatLash', '#6a6878', rough=0.6))
sphere('CatNose', 0.009, (cx + 0.16, cy - 0.17, cz + 0.088), mat('CatEarPink', '#a87888'), segs=8, rings=6)
for s_ in (-1, 1): sphere(f'CatPaw{s_}', 0.03, (cx + 0.1 + s_ * 0.04, cy - 0.17, cz + 0.02), CAT, scale=(1.2, 1.4, 0.6), segs=10, rings=6)
tube('CatTail', [(cx - 0.17, cy + 0.02, cz + 0.05), (cx - 0.16, cy - 0.12, cz + 0.035), (cx - 0.02, cy - 0.17, cz + 0.03), (cx + 0.06, cy - 0.18, cz + 0.03)], 0.026, CAT, taper=lambda t: 1.0 - 0.35 * t)
zb = F + 0.53
for k, (h, m) in enumerate(((0.05, BOOKS[1]), (0.04, BOOKS[0]), (0.045, BOOKS[6]))):
    box(f'SeatBook{k}', (0.24 - k * 0.02, 0.17, h), (0.55, IY1 - 0.3, zb + h / 2), m, rot=(0, 0, 0.1 * (k - 1))); zb += h
lathe('SeatMug', [(0.0, 0), (0.04, 0.0), (0.042, 0.09), (0.038, 0.09), (0.036, 0.012), (0.0, 0.012)], (0.3, IY1 - 0.22, F + 0.53), MUG, segs=20)

# ---------------------------------------------------------------- the low round table: the pendulum board, the brass stand the pendulum hangs from
lathe('TableTop', [(0, 0), (0.56, 0), (0.578, 0.014), (0.578, 0.034), (0.556, 0.05), (0, 0.05)], (TX, TY, T - 0.05), WALNUTX, segs=64)
lathe('TableApron', [(0.46, 0), (0.48, 0.0), (0.48, 0.07), (0.46, 0.07)], (TX, TY, T - 0.12), WALNUT, segs=48)
for k in range(3):
    a = math.radians(90 + 120 * k); x, y = TX + math.cos(a) * 0.4, TY + math.sin(a) * 0.4
    lathe(f'TableLeg{k}', [(0.0, 0), (0.035, 0.0), (0.03, 0.08), (0.022, 0.16), (0.034, 0.22), (0.026, 0.3), (0.03, T - F - 0.08), (0.0, T - F - 0.05)], (x, y, F), WALNUT, segs=16)
lathe('BoardBase', [(0, 0), (0.4, 0), (0.405, 0.006), (0.405, 0.018), (0.395, 0.024), (0, 0.024)], (TX, TY, T), WALNUTY, segs=64)
tube('BoardRim', [(TX + math.cos(a) * 0.401, TY + math.sin(a) * 0.401, T + 0.021) for a in [TAU * i / 96 for i in range(97)]], 0.006, BRASS, poly=True)
e = bpy.data.objects.new('BoardAt', None); sc.collection.objects.link(e); e.location = (TX, TY, T + 0.025)
SFX, HOOKZ = TX + 0.48, T + 0.64
lathe('StandFoot', [(0, 0), (0.06, 0), (0.06, 0.012), (0.04, 0.022), (0.014, 0.034), (0, 0.034)], (SFX, TY, T), BRASS, segs=32)
arm = [(SFX, TY, T + 0.03), (SFX, TY, T + 0.3)] + [(TX + 0.24 + 0.24 * math.cos(a), TY, HOOKZ + 0.2 * math.sin(a)) for a in [math.pi * i / 32 for i in range(33)]]
tube('StandArm', arm, 0.009, BRASS, poly=True)
tube('StandHook', [(TX + 0.012 * math.sin(a), TY, HOOKZ - 0.012 - 0.012 * math.cos(a)) for a in [TAU * i / 16 for i in range(17)]], 0.0035, BRASS, poly=True)
slab('StandMoon', crescent_pts(0.055), 0.012, (TX + 0.24, TY, HOOKZ + 0.25), GILT)
e = bpy.data.objects.new('PendulumAt', None); sc.collection.objects.link(e); e.location = (TX, TY, HOOKZ - 0.024)
# on the table: a lilac candle, a cluster of amethyst, a dish of moonstones
lathe('TableCandleDish', [(0.0, 0), (0.05, 0.0), (0.055, 0.012), (0.0, 0.006)], (TX - 0.44, TY + 0.2, T), BRASS, segs=20)
cyl('TableCandleWax', 0.02, 0.12, (TX - 0.44, TY + 0.2, T + 0.07), WAXL, segs=16)
o = sphere('TableCandleFlame', 0.011, (TX - 0.44, TY + 0.2, T + 0.145), FLAME, segs=8, rings=6); o.scale = (1, 1, 2)
point_light('CandleLightTable', (TX - 0.44, TY + 0.16, T + 0.17), 3, (1.0, 0.7, 0.4), 0.02)
cluster('TableAmethyst', (TX - 0.4, TY - 0.3, T), AMETHYST, 7, 11, 1.0)
sphere('TableAmethystRock', 0.05, (TX - 0.4, TY - 0.3, T + 0.005), ROCK, scale=(1.2, 1, 0.4), segs=10, rings=6)
lathe('TableDish', [(0.0, 0), (0.06, 0.0), (0.075, 0.02), (0.07, 0.022), (0.0, 0.008)], (TX + 0.3, TY - 0.42, T), SILVER, segs=24)
for k in range(4): sphere(f'Moonstone{k}', 0.014, (TX + 0.3 + math.cos(k * 1.7) * 0.03, TY - 0.42 + math.sin(k * 1.7) * 0.03, T + 0.02), QUARTZ, scale=(1.2, 1, 0.6), segs=10, rings=6)
e = bpy.data.objects.new('TableAt', None); sc.collection.objects.link(e); e.location = (TX, TY, T)
o = disc('Rug', 1.12, (TX, TY - 0.14, F + 0.004), RUG); o.rotation_euler = (-math.pi / 2, 0, 0)
lathe('Pouf', [(0, 0), (0.28, 0), (0.32, 0.05), (0.33, 0.18), (0.3, 0.28), (0.2, 0.31), (0, 0.32)], (TX - 1.0, TY + 0.05, F), LILAC, segs=32)
for k in range(8): a = TAU * k / 8; tube(f'PoufTuft{k}', [(TX - 1.0 + math.cos(a) * 0.12, TY + 0.05 + math.sin(a) * 0.12, F + 0.32), (TX - 1.0, TY + 0.05, F + 0.322)], 0.006, GOLDV, poly=True)

# ---------------------------------------------------------------- the left wall: the side window with its chest, the shelves of crystals, the star chart, a broom
y_, w_, z0_, h_ = LWIN['y'], LWIN['w'], F + LWIN['z0'], LWIN['h']
path = [Vector((-IX + 0.02, py, F + pz)) for py, pz in arch_pts(y_, LWIN['z0'], w_ + 0.08, h_ + 0.04)]
sweep('LeftWindowFrameIn', path + [path[0]], [(-0.04, -0.03), (0.04, -0.03), (0.04, 0.03), (-0.04, 0.03)], WALNUTY, up=Vector((1, 0, 0)))
path = [Vector((-BX - 0.02, py, F + pz)) for py, pz in arch_pts(y_, LWIN['z0'], w_ + 0.1, h_ + 0.05)]
sweep('LeftWindowFrameOut', path + [path[0]], [(-0.05, -0.03), (0.05, -0.03), (0.05, 0.03), (-0.05, 0.03)], INDIGOY, up=Vector((-1, 0, 0)))
box('LeftWindowSillIn', (0.2, w_ + 0.2, 0.04), (-IX + 0.08, y_, z0_ - 0.02), WALNUTY)
box('LeftWindowSillOut', (0.2, w_ + 0.2, 0.05), (-BX - 0.08, y_, z0_ - 0.02), FOOT)
box('LeftWindowMullion', (WT + 0.02, 0.03, h_ - w_ / 2), (-BX + WT / 2, y_, z0_ + (h_ - w_ / 2) / 2), WALNUTY)
box('LeftWindowTransom', (WT + 0.02, w_, 0.03), (-BX + WT / 2, y_, z0_ + h_ - w_ / 2), WALNUTY)
for s in (-1, 1):                                                             # lilac shutters, folded back against the wall outside
    yy = y_ + s * (w_ / 2 + 0.24)
    box(f'Shutter{s}', (0.035, 0.42, h_ - 0.1), (-BX - 0.04, yy, z0_ + (h_ - 0.1) / 2), SHUTTER, bev=0.006)
    for dz in (0.2, h_ - 0.3): box(f'ShutterBatten{s}{dz}', (0.02, 0.38, 0.05), (-BX - 0.065, yy, z0_ + dz), SHUTTER)
    slab(f'ShutterMoon{s}', crescent_pts(0.07), 0.012, (-BX - 0.064, yy, z0_ + h_ * 0.55), GILT, rotz=-math.pi / 2)
box('LeftWindowBox', (0.24, w_ + 0.12, 0.2), (-BX - 0.14, y_, z0_ - 0.15), SHUTTER, bev=0.01)
rr = random.Random(41); bm = bmesh.new(); bmL = bmesh.new()
for k in range(11):
    p = Vector((-BX - 0.14 + rr.uniform(-0.05, 0.05), y_ - w_ / 2 + k * w_ / 10, z0_ - 0.04)); blob_into(bm, 0.06, p, (1, 1, 0.8))
    for j in range(3): blob_into(bmL, 0.022, p + Vector((rr.uniform(-0.03, 0.03), rr.uniform(-0.03, 0.03), 0.09 + j * 0.05)), (0.8, 0.8, 1.6))
bm_obj('LeftWindowBoxLeaves', bm, STEM); bm_obj('LeftWindowBoxLavender', bmL, LAVENDER)
box('ChestBody', (0.42, 0.8, 0.36), (-IX + 0.24, y_, F + 0.18), WALNUTY, bev=0.01)
box('ChestLid', (0.44, 0.82, 0.07), (-IX + 0.24, y_, F + 0.395), WALNUTY, bev=0.015)
for dy in (-0.3, 0.3): box(f'ChestBand{dy}', (0.45, 0.04, 0.44), (-IX + 0.24, y_ + dy, F + 0.215), BRASS)
box('ChestLock', (0.02, 0.07, 0.08), (-IX + 0.455, y_, F + 0.33), BRASS)
for k in range(3): box(f'ChestBook{k}', (0.2, 0.15 - k * 0.015, 0.04), (-IX + 0.24, y_ + 0.18, F + 0.45 + k * 0.04), BOOKS[(k + 2) % 7], rot=(0, 0, 0.15 * k))
lathe('ChestLantern', [(0, 0), (0.06, 0), (0.06, 0.02), (0.05, 0.02), (0.05, 0.16), (0.06, 0.17), (0.03, 0.22), (0.0, 0.24)], (-IX + 0.25, y_ - 0.2, F + 0.43), BRASS, segs=8)
cyl('ChestLanternGlass', 0.045, 0.13, (-IX + 0.25, y_ - 0.2, F + 0.535), GLOWPANE, segs=8)
o = sphere('ChestLanternFlame', 0.01, (-IX + 0.25, y_ - 0.2, F + 0.54), FLAME, segs=8, rings=6); o.scale = (1, 1, 2)
point_light('CandleLightChest', (-IX + 0.32, y_ - 0.2, F + 0.56), 3, (1.0, 0.7, 0.4), 0.03)
# the shelves in the back corner: crystals, jars, potions, candles and books
SX0, SY0, SY1, SH = -IX, 0.52, IY1 - 0.04, 2.36
for k, y in enumerate((SY0, SY1)): box(f'ShelfSide{k}', (0.34, 0.03, SH), (SX0 + 0.17, y, F + SH / 2), INDIGOY)
box('ShelfBack', (0.02, SY1 - SY0, SH), (SX0 + 0.012, (SY0 + SY1) / 2, F + SH / 2), INDIGOY)
box('ShelfCrown', (0.38, SY1 - SY0 + 0.08, 0.06), (SX0 + 0.19, (SY0 + SY1) / 2, F + SH + 0.03), WALNUTY, bev=0.01)
rr = random.Random(77)
for j, z in enumerate((0.06, 0.56, 1.06, 1.56, 2.02)):
    zz = F + z; box(f'ShelfBoard{j}', (0.34, SY1 - SY0 - 0.03, 0.03), (SX0 + 0.17, (SY0 + SY1) / 2, zz), WALNUTY)
    y = SY0 + 0.06; zt = zz + 0.015
    while y < SY1 - 0.12:
        kind = rr.choice(['books', 'books', 'jar', 'crystal', 'potion', 'candle'] if j else ['books', 'crystal', 'jar'])
        if kind == 'books':
            n = rr.randint(3, 6)
            for b in range(n):
                hb = rr.uniform(0.2, 0.32) if j < 4 else rr.uniform(0.18, 0.26); tb = rr.uniform(0.03, 0.05)
                box(f'ShelfBook{j}_{b}_{int(y * 100)}', (rr.uniform(0.18, 0.24), tb, hb), (SX0 + 0.15, y + tb / 2, zt + hb / 2), rr.choice(BOOKS), rot=(rr.uniform(-0.03, 0.03), 0, 0))
                y += tb + 0.004
        elif kind == 'jar':
            lathe(f'ShelfJar{j}_{int(y * 100)}', [(0, 0), (0.045, 0), (0.05, 0.02), (0.05, 0.12), (0.035, 0.14), (0.03, 0.16), (0, 0.16)], (SX0 + 0.16, y + 0.05, zt), rr.choice(POTION), segs=16)
            cyl(f'ShelfJarLid{j}_{int(y * 100)}', 0.034, 0.025, (SX0 + 0.16, y + 0.05, zt + 0.17), WALNUT, segs=16); y += 0.12
        elif kind == 'potion':
            lathe(f'ShelfPotion{j}_{int(y * 100)}', [(0, 0), (0.05, 0), (0.055, 0.04), (0.04, 0.09), (0.014, 0.12), (0.014, 0.16), (0, 0.16)], (SX0 + 0.16, y + 0.05, zt), rr.choice(POTION), segs=16)
            cyl(f'ShelfCork{j}_{int(y * 100)}', 0.016, 0.03, (SX0 + 0.16, y + 0.05, zt + 0.17), mat('Cork', '#b08860'), segs=8); y += 0.12
        elif kind == 'crystal':
            cluster(f'ShelfCrystal{j}_{int(y * 100)}', (SX0 + 0.16, y + 0.06, zt), rr.choice([AMETHYST, QUARTZ, ROSEQ]), rr.randint(4, 7), int(y * 1000) + j, rr.uniform(0.9, 1.4)); y += 0.14
        else:
            cyl(f'ShelfCandle{j}_{int(y * 100)}', 0.022, 0.1, (SX0 + 0.16, y + 0.04, zt + 0.05), WAX, segs=12)
            o = sphere(f'ShelfCandle{j}_{int(y * 100)}Flame', 0.01, (SX0 + 0.16, y + 0.04, zt + 0.115), FLAME, segs=8, rings=6); o.scale = (1, 1, 2)
            point_light(f'CandleLightShelf{j}{int(y * 100)}', (SX0 + 0.22, y + 0.04, zt + 0.14), 1.5, (1.0, 0.7, 0.4), 0.02); y += 0.1
        y += rr.uniform(0.02, 0.05)
# the star chart in a gilt frame, a broom leaning by it, a fern in the front corner
SCY, SCZ = -1.05, F + 1.9
o = uvbox('StarChartPicture', (0.68, 0.01, 0.68), (-IX + 0.02, SCY, SCZ), STARCHART, rot=(0, 0, math.pi / 2))
for (dy, dz, w, h) in ((0, 0.37, 0.8, 0.06), (0, -0.37, 0.8, 0.06), (0.37, 0, 0.06, 0.8), (-0.37, 0, 0.06, 0.8)):
    box(f'StarChartFrame{dy}{dz}', (0.04, w, h), (-IX + 0.03, SCY + dy, SCZ + dz), GILT, bev=0.008)
tube('BroomStick', [(-IX + 0.1, -1.55, F + 0.05), (-IX + 0.02, -1.48, F + 1.45)], 0.016, WALNUT, poly=True)
o = cyl('BroomBristles', 0.09, 0.34, (-IX + 0.1, -1.555, F + 0.17), HERB, segs=16, r2=0.03); o.rotation_euler = (0.05, 0.055, 0)
lathe('FernPot', [(0, 0), (0.14, 0), (0.17, 0.26), (0.18, 0.28), (0, 0.28)], (-IX + 0.35, BY0 + 0.5, F), TERRA, segs=24)
bm = bmesh.new(); rr = random.Random(9)
for k in range(14):
    a = TAU * k / 14 + rr.uniform(-0.2, 0.2); r = rr.uniform(0.12, 0.3)
    blob_into(bm, 0.1, Vector((math.cos(a) * r, math.sin(a) * r, 0.3 + rr.uniform(0.0, 0.3) - r * 0.4)), (1.8, 0.7, 0.35))
o = bm_obj('FernLeaves', bm, LEAFL); o.location = (-IX + 0.35, BY0 + 0.5, F)

# ---------------------------------------------------------------- the right wall: the door into the tower, the moon chart, a little table with a crystal ball, a telescope
DY = TW['y']
slab('DoorTower', arch_pts(0, 0, 0.82, 1.95), 0.05, (IX - 0.03, DY, F), WALNUT, rotz=-math.pi / 2)
o = outline_curve('DoorFrame', arch_pts(0, -0.001, 1.04, 2.06), [arch_pts(0, -0.002, 0.82, 1.95)], 0.05, INDIGO); o.rotation_euler = (math.pi / 2, 0, -math.pi / 2); o.location = (IX - 0.03, DY, F)
for dz in (0.35, 1.15): box(f'DoorStrap{dz}', (0.012, 0.74, 0.05), (IX - 0.058, DY, F + dz), IRON)
for k in range(3): box(f'DoorPlankLine{k}', (0.006, 0.012, 1.5 if k != 1 else 1.88), (IX - 0.056, DY - 0.205 + k * 0.205, F + (0.75 if k != 1 else 0.94)), mat('DoorGroove', '#2a1a10', rough=0.9))
tube('DoorRing', [(IX - 0.07, DY - 0.28 + 0.04 * math.sin(a), F + 0.95 - 0.04 * math.cos(a)) for a in [TAU * i / 16 for i in range(17)]], 0.006, IRON, poly=True)
slab('DoorMoonPane', crescent_pts(0.11), 0.02, (IX - 0.06, DY, F + 1.55), GLOWPANE, rotz=-math.pi / 2)
MCY, MCZ = -0.72, F + 2.2
uvbox('MoonChartPicture', (1.38, 0.01, 0.43), (IX - 0.02, MCY, MCZ), MOONCHART, rot=(0, 0, -math.pi / 2))
for (dy, dz, w, h) in ((0, 0.245, 1.5, 0.05), (0, -0.245, 1.5, 0.05), (0.725, 0, 0.05, 0.54), (-0.725, 0, 0.05, 0.54)):
    box(f'MoonChartFrame{dy}{dz}', (0.04, w, h), (IX - 0.03, MCY + dy, MCZ + dz), WALNUTY, bev=0.008)
STX, STY = IX - 0.38, MCY
lathe('SideTableTop', [(0, 0), (0.3, 0), (0.31, 0.02), (0.3, 0.035), (0, 0.035)], (STX, STY, F + 0.72), WALNUTX, segs=48)
lathe('SideTableStem', [(0, 0), (0.18, 0), (0.18, 0.03), (0.05, 0.08), (0.035, 0.3), (0.05, 0.5), (0.035, 0.66), (0.08, 0.72), (0, 0.72)], (STX, STY, F), WALNUT, segs=24)
lathe('OrbStand', [(0, 0), (0.07, 0), (0.07, 0.02), (0.03, 0.05), (0.05, 0.09), (0.0, 0.08)], (STX, STY, F + 0.755), BRASS, segs=24)
sphere('CrystalOrb', 0.1, (STX, STY, F + 0.92), ORB, segs=32, rings=20)
point_light('OrbLight', (STX - 0.15, STY, F + 0.95), 3, (0.7, 0.6, 1.0), 0.05)
for k, dy in enumerate((-0.2, 0.18)):
    cyl(f'SideCandle{k}', 0.02, 0.14 - k * 0.04, (STX + 0.05, STY + dy, F + 0.755 + (0.14 - k * 0.04) / 2), WAX, segs=12)
    o = sphere(f'SideCandle{k}Flame', 0.01, (STX + 0.05, STY + dy, F + 0.755 + (0.14 - k * 0.04) + 0.015), FLAME, segs=8, rings=6); o.scale = (1, 1, 2)
    point_light(f'CandleLightSide{k}', (STX - 0.02, STY + dy, F + 0.95), 2, (1.0, 0.7, 0.4), 0.02)
lathe('Hourglass', [(0, 0), (0.05, 0), (0.05, 0.012), (0.035, 0.02), (0.01, 0.07), (0.035, 0.12), (0.05, 0.128), (0.05, 0.14), (0, 0.14)], (STX - 0.14, STY - 0.16, F + 0.755), QUARTZ, segs=16)
tp = Vector((IX - 0.6, 0.08, F + 1.02)); aim = (Vector((0, IY1, MW['cz'] + 0.3)) - tp).normalized()
for k in range(3):
    a = TAU * k / 3 + 0.4; tube(f'TelescopeLeg{k}', [tuple(tp), (tp.x + math.cos(a) * 0.3, tp.y + math.sin(a) * 0.3, F)], 0.012, WALNUT, poly=True)
tube('TelescopeTube', [tuple(tp - aim * 0.28), tuple(tp + aim * 0.42)], 0.04, BRASS, poly=True, taper=lambda t: 1.0 - 0.3 * t)
tube('TelescopeEyepiece', [tuple(tp - aim * 0.28), tuple(tp - aim * 0.4)], 0.016, BRASS, poly=True)
tube('TelescopeBand', [tuple(tp + aim * 0.36), tuple(tp + aim * 0.42)], 0.046, IRON, poly=True)
# a pierced brass lantern on the floor in the front corner
lathe('FloorLantern', [(0, 0), (0.12, 0), (0.12, 0.03), (0.09, 0.05), (0.11, 0.22), (0.07, 0.32), (0.03, 0.38), (0.0, 0.42)], (IX - 0.35, BY0 + 0.5, F), BRASS, segs=12)
cyl('FloorLanternGlow', 0.085, 0.16, (IX - 0.35, BY0 + 0.5, F + 0.14), GLOWPANE, segs=12)
point_light('LanternLightFloor', (IX - 0.45, BY0 + 0.4, F + 0.3), 10, (1.0, 0.72, 0.45), 0.08)

# ---------------------------------------------------------------- from the beams: a star lantern, paper stars, bundles of herbs
LX, LY = -1.2, -0.45
tube('HangLanternChain', [(LX, LY, CEIL - 0.17), (LX, LY, CEIL - 0.6)], 0.006, BRASS, poly=True)
lathe('HangLanternCap', [(0, 0.12), (0.12, 0.04), (0.14, 0.0), (0.0, 0.0)], (LX, LY, CEIL - 0.74), BRASS, segs=10)
lathe('HangLanternBase', [(0, 0), (0.12, 0), (0.13, 0.03), (0, 0.03)], (LX, LY, CEIL - 1.04), BRASS, segs=10)
cyl('HangLanternGlass', 0.1, 0.27, (LX, LY, CEIL - 0.875), GLOWPANE, segs=10)
for k in range(5): tube(f'HangLanternBar{k}', [(LX + math.cos(TAU * k / 5) * 0.11, LY + math.sin(TAU * k / 5) * 0.11, CEIL - 1.01), (LX + math.cos(TAU * k / 5) * 0.11, LY + math.sin(TAU * k / 5) * 0.11, CEIL - 0.74)], 0.005, BRASS, poly=True)
point_light('LanternLightHang', (LX, LY, CEIL - 0.88), 28, (1.0, 0.74, 0.48), 0.1)
rr = random.Random(17)
for k, (x, y, drop, r) in enumerate(((-0.4, -0.8, 0.45, 0.1), (0.5, -0.5, 0.62, 0.08), (1.3, -0.1, 0.4, 0.11), (-1.8, 0.4, 0.55, 0.08), (0.95, 0.75, 0.7, 0.07), (-0.6, 0.55, 0.35, 0.09), (1.75, -1.0, 0.5, 0.08), (0.1, -1.3, 0.3, 0.07))):
    tube(f'HangStarThread{k}', [(x, y, CEIL - 0.17 if abs(y + 0.05) < 0.1 or abs(y - 0.95) < 0.1 or abs(y + 1.05) < 0.1 else CEIL), (x, y, CEIL - drop)], 0.0018, SILVER, poly=True)
    slab(f'HangStar{k}', star_pts(r), 0.012, (x, y, CEIL - drop - r * 0.95), HANGSTAR, rotz=rr.uniform(-0.6, 0.6))
for k, x in enumerate((-2.05, -1.8, -1.55)):
    tube(f'HerbString{k}', [(x, -1.05, CEIL - 0.17), (x, -1.05, CEIL - 0.32)], 0.003, PAPER, poly=True)
    o = cyl(f'HerbBundle{k}', 0.05, 0.26, (x, -1.05, CEIL - 0.45), [HERB, LAVENDER, HERB][k], segs=10, r2=0.015); o.rotation_euler = (math.pi, 0, 0)

# ---------------------------------------------------------------- the tower: a round stone tower, lit windows, a witch's-hat cone with a gold star
TX0, TY0, TR, TH = TW['x'], TW['y'], TW['r'], TW['h']
lathe('TowerPlinth', [(TR + 0.1, -0.05), (TR + 0.1, 0.28), (TR + 0.02, 0.34), (0.0, 0.34)], (TX0, TY0, 0), FOOT, segs=64)
o = lathe('TowerWall', [(TR, 0), (TR * 0.985, TH / 2), (TR * 0.97, TH)], (TX0, TY0, 0.3), STONES, segs=64, uv=True); remap_uv(o, 0, 0, 3, 2)
lathe('TowerCrown', [(TR * 0.97, 0), (TR + 0.08, 0.12), (TR + 0.13, 0.32), (0.0, 0.32)], (TX0, TY0, TH + 0.2), FOOT, segs=64)
def witch_cone():
    prof = [(1.42, 0.0), (1.3, 0.14), (1.06, 0.7), (0.78, 1.45), (0.5, 2.25), (0.27, 3.0), (0.1, 3.55), (0.0, 3.85)]
    z0 = TH + 0.5; o = lathe('TowerCone', prof, (TX0, TY0, z0), TILES, segs=48, uv=True); me = o.data
    for poly in me.polygons:
        for li in poly.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co; uv = me.uv_layers[0].data[li].uv; me.uv_layers[0].data[li].uv = (uv[0] * 8, v.z / 0.95)
    for v in me.vertices: k = v.co.z / 3.85; v.co.x += 0.6 * k ** 2.4; v.co.z -= 0.1 * k ** 2
    sweep('TowerConeBrim', [Vector((TX0 + math.cos(a) * 1.4, TY0 + math.sin(a) * 1.4, z0 + 0.02)) for a in [TAU * i / 64 for i in range(65)]], [(-0.05, -0.03), (0.05, -0.03), (0.05, 0.03), (-0.05, 0.03)], GILT)
    return Vector((TX0 + 0.6, TY0, z0 + 3.75))
TIP = witch_cone()
sphere('TowerTipBall', 0.07, TIP, GILT, segs=12, rings=8)
tube('TowerTipRod', [tuple(TIP), tuple(TIP + Vector((0.02, 0, 0.32)))], 0.014, GILT, poly=True)
slab('StarFinial', star_pts(0.3), 0.07, TIP + Vector((0.03, 0, 0.6)), STARGOLD)
def on_tower(ang, z, out=0.0):
    """a point on the tower's face at angle ang (0 faces -y, growing round towards +x), and the face's outward normal"""
    n = Vector((math.sin(ang), -math.cos(ang), 0)); r = TR * (1 - 0.03 * (z - 0.3) / TH) + out
    return Vector((TX0, TY0, z)) + n * r, n
for k, (ang, z) in enumerate(((0.15, 2.6), (0.85, 3.9), (-0.45, 4.6), (1.6, 2.3))):
    p, n = on_tower(ang, z, 0.0); w, h = 0.34, 0.62
    o = slab(f'TowerWindowPane{k}', arch_pts(0, 0, w, h), 0.04, p - n * 0.005 - Vector((0, 0, h / 2)), PANE, rotz=ang)
    o = outline_curve(f'TowerWindowSurround{k}', arch_pts(0, -0.06, w + 0.2, h + 0.14), [arch_pts(0, -0.001, w, h)], 0.08, FOOT)
    o.rotation_euler = (math.pi / 2, 0, ang); o.location = p + n * 0.02 - Vector((0, 0, h / 2))
    box(f'TowerWindowBar{k}', (0.025, 0.03, h - 0.05), p + n * 0.025, IRON, rot=(0, 0, ang))
    box(f'TowerWindowSill{k}', (w + 0.24, 0.16, 0.05), p + n * 0.06 - Vector((0, 0, h / 2 + 0.05)), FOOT, rot=(0, 0, ang))
    point_light(f'LanternLightTower{k}', tuple(p + n * 0.4), 5, (1.0, 0.72, 0.45), 0.15)
p, n = on_tower(0.0, 0.34, 0.0)
slab('TowerDoor', arch_pts(0, 0, 0.74, 1.6), 0.06, p + n * 0.0, WALNUT)
o = outline_curve('TowerDoorSurround', arch_pts(0, -0.001, 0.98, 1.76), [arch_pts(0, -0.002, 0.74, 1.6)], 0.1, FOOT); o.rotation_euler = (math.pi / 2, 0, 0); o.location = p + n * 0.02
for dz in (0.35, 1.05): box(f'TowerDoorHinge{dz}', (0.5, 0.012, 0.05), p + n * 0.035 + Vector((-0.1, 0, dz)), IRON)
tube('TowerDoorRing', [tuple(p + n * 0.045 + Vector((0.22 + 0.035 * math.sin(a), 0, 0.85 - 0.035 * math.cos(a)))) for a in [TAU * i / 16 for i in range(17)]], 0.006, IRON, poly=True)
box('TowerDoorStep', (1.1, 0.5, 0.12), p + n * 0.25 + Vector((0, 0, -0.29)), FOOT, bev=0.02)
lp = p + n * 0.12 + Vector((0.62, 0, 1.55))
tube('TowerDoorLanternArm', [tuple(lp + Vector((0, 0.1, 0.22))), tuple(lp + Vector((0, -0.04, 0.24))), tuple(lp + Vector((0, -0.04, 0.16)))], 0.01, IRON)
lathe('TowerDoorLantern', [(0, 0), (0.07, 0), (0.07, 0.02), (0.06, 0.02), (0.06, 0.15), (0.08, 0.16), (0.03, 0.2), (0, 0.21)], tuple(lp + Vector((0, -0.04, -0.06))), IRON, segs=6)
cyl('TowerDoorLanternGlass', 0.055, 0.13, tuple(lp + Vector((0, -0.04, 0.025))), GLOWPANE, segs=6)
point_light('LanternLightTowerDoor', tuple(lp + Vector((0, -0.16, 0.02))), 8, (1.0, 0.72, 0.45), 0.08)

# ---------------------------------------------------------------- outside: a path of stepping stones, the fence, the lantern post, the owl on its stump
for k in range(8):
    t = k / 7; x = 3.6 + 0.25 * math.sin(t * 2.6); y = -4.0 + t * 3.15
    o = cyl(f'PathStone{k}', 0.2 + 0.03 * (k % 2), 0.06, (x, y, 0.02), ROCK, segs=12); o.scale = (1.15, 0.85, 1); o.rotation_euler = (0, 0, k * 0.7)
for k in range(3): o = cyl(f'StageStone{k}', 0.22, 0.06, (0.05 * (k % 2 * 2 - 1), -2.55 - k * 0.55, 0.02), ROCK, segs=12); o.scale = (1.2, 0.85, 1)
def fence(x0, x1, y):
    n = int((x1 - x0) / 0.17)
    for k in range(n + 1):
        x = x0 + (x1 - x0) * k / n
        box(f'FencePicket{x0}_{k}', (0.07, 0.03, 0.62), (x, y, 0.31), PICKET)
        o = cyl(f'FencePicketTip{x0}_{k}', 0.05, 0.08, (x, y, 0.66), PICKET, segs=4, r2=0.0); o.rotation_euler = (0, 0, math.pi / 4); o.scale = (1, 0.42, 1)
    for z in (0.2, 0.5): box(f'FenceRail{x0}_{z}', (x1 - x0 + 0.08, 0.035, 0.06), ((x0 + x1) / 2, y + 0.03, z), PICKET)
    for x in (x0, x1): box(f'FencePost{x0}_{x}', (0.1, 0.1, 0.78), (x, y + 0.02, 0.39), PICKET, bev=0.01)
fence(0.95, 3.05, -3.5); fence(4.2, 5.7, -3.5)
lathe('LanternPostBase', [(0, 0), (0.12, 0), (0.12, 0.06), (0.06, 0.1), (0.04, 0.3), (0, 0.3)], (2.55, -3.0, 0), IRON, segs=16)
tube('LanternPost', [(2.55, -3.0, 0.3), (2.55, -3.0, 1.55), (2.55, -3.12, 1.68), (2.55, -3.28, 1.66)], 0.03, IRON)
lathe('PostLantern', [(0, 0), (0.09, 0), (0.09, 0.03), (0.07, 0.03), (0.07, 0.22), (0.1, 0.24), (0.04, 0.3), (0, 0.32)], (2.55, -3.3, 1.3), IRON, segs=6)
cyl('PostLanternGlass', 0.065, 0.19, (2.55, -3.3, 1.425), GLOWPANE, segs=6)
point_light('LanternLightPost', (2.55, -3.36, 1.43), 22, (1.0, 0.72, 0.45), 0.1)
OX, OY = 5.25, -2.4
lathe('OwlStump', [(0, 0), (0.3, 0), (0.26, 0.08), (0.24, 0.42), (0, 0.42)], (OX, OY, 0), BARK, segs=20)
cyl('OwlStumpTop', 0.235, 0.01, (OX, OY, 0.425), mat('StumpRings', '#b8946a', rough=0.8), segs=20)
oz = 0.43
sphere('OwlBody', 0.17, (OX, OY, oz + 0.17), OWLM, scale=(0.95, 0.85, 1.15), segs=20, rings=14)
sphere('OwlHead', 0.13, (OX, OY - 0.01, oz + 0.42), OWLM, scale=(1.1, 0.95, 0.9), segs=20, rings=12)
for s in (-1, 1):
    o = sphere(f'OwlEyeDisc{s}', 0.06, (OX + s * 0.055, OY - 0.115, oz + 0.43), OWLFACE, scale=(1, 0.4, 1), segs=14, rings=8)
    sphere(f'OwlEye{s}', 0.026, (OX + s * 0.055, OY - 0.14, oz + 0.435), OWLEYE, segs=10, rings=8)
    sphere(f'OwlPupil{s}', 0.012, (OX + s * 0.055, OY - 0.162, oz + 0.437), SOOT, segs=8, rings=6)
    o = cyl(f'OwlTuft{s}', 0.03, 0.09, (OX + s * 0.09, OY - 0.01, oz + 0.53), OWLM, segs=8, r2=0.0); o.rotation_euler = (0, s * -0.4, 0)
    o = sphere(f'OwlWing{s}', 0.12, (OX + s * 0.14, OY + 0.01, oz + 0.16), OWLM, scale=(0.4, 0.8, 1.2), segs=14, rings=10); o.rotation_euler = (0, s * 0.15, 0)
sphere('OwlChest', 0.12, (OX, OY - 0.07, oz + 0.15), OWLFACE, scale=(0.9, 0.5, 1.1), segs=16, rings=10)
o = cyl('OwlBeak', 0.018, 0.05, (OX, OY - 0.14, oz + 0.39), mat('Beak', '#d8a040'), segs=8, r2=0.0); o.rotation_euler = (math.pi, 0, 0)

# ---------------------------------------------------------------- the round tree by the stream, full of fireflies; the pine behind the tower; flowers, mushrooms, rocks
RTX, RTY = -5.0, 1.3
tube('RoundTreeTrunk', [(RTX, RTY, -0.05), (RTX + 0.05, RTY, 1.0), (RTX + 0.2, RTY - 0.05, 2.0), (RTX + 0.15, RTY, 2.8)], 0.2, BARK, taper=lambda t: 1.1 - 0.6 * t)
for k, (dx, dy, dz) in enumerate(((0.6, 0.1, 2.3), (-0.5, -0.2, 2.5), (0.2, 0.4, 2.9))):
    tube(f'RoundTreeBranch{k}', [(RTX + 0.1, RTY, 1.8), (RTX + dx * 0.6, RTY + dy * 0.6, dz - 0.2), (RTX + dx, RTY + dy, dz)], 0.07, BARK, taper=lambda t: 1.0 - 0.6 * t)
for k, (dx, dy, dz, r) in enumerate(((0.0, 0.0, 3.2, 1.15), (0.85, -0.1, 2.75, 0.75), (-0.8, -0.2, 2.85, 0.8), (0.3, 0.55, 3.6, 0.8), (-0.3, -0.6, 3.5, 0.72), (0.5, -0.5, 2.5, 0.6))):
    leafy_ball(f'RoundTreeLeaves{k}', r, (RTX + dx, RTY + dy, dz), LEAF if k % 2 else LEAFL, k)
PX, PY = 5.6, 2.7
tube('PineTrunk', [(PX, PY, 0), (PX, PY, 1.2)], 0.13, BARK, poly=True)
for k, (z, r, h) in enumerate(((0.6, 1.2, 1.6), (1.5, 0.95, 1.5), (2.35, 0.7, 1.35), (3.1, 0.46, 1.2))):
    cyl(f'PineTier{k}', r, h, (PX, PY, z + h / 2), PINE, segs=14, r2=0.04)
cyl('PineSmall', 0.6, 2.0, (-2.8, 3.55, 1.0), PINE, segs=12, r2=0.03)
rr = random.Random(55); bm = bmesh.new(); bmF = bmesh.new(); bmL = bmesh.new()
for (x, y) in [(-2.95, -1.45), (-2.95, -0.9), (-2.95, 0.6), (2.85, -1.5), (2.85, -2.2), (1.3, -2.1), (-1.6, -2.1), (-4.7, -1.5), (5.0, 0.2), (-5.4, 3.0)]:
    for k in range(6):
        p = Vector((x + rr.uniform(-0.2, 0.2), y + rr.uniform(-0.2, 0.2), 0.0)); blob_into(bm, 0.07, p + Vector((0, 0, 0.05)), (1, 1, 0.8))
        for j in range(2): blob_into(bmL, 0.02, p + Vector((rr.uniform(-0.03, 0.03), rr.uniform(-0.03, 0.03), 0.14 + j * 0.05)), (0.8, 0.8, 1.7))
    for k in range(3): blob_into(bmF, 0.035, Vector((x + rr.uniform(-0.25, 0.25), y + rr.uniform(-0.25, 0.25), 0.12)), (1, 1, 0.5))
bm_obj('GardenLeaves', bm, STEM); bm_obj('GardenLavender', bmL, LAVENDER); bm_obj('GardenMoonflowers', bmF, MOONFLOWER)
for k, (x, y, s) in enumerate(((-4.55, 0.4, 1.0), (-4.4, 0.7, 0.7), (-5.5, 1.9, 0.9), (-4.6, -0.3, 0.6), (-2.95, 2.6, 0.8), (4.95, -1.6, 0.7))):
    cyl(f'ShroomStem{k}', 0.022 * s, 0.1 * s, (x, y, 0.05 * s), SHROOMSTEM, segs=10)
    o = sphere(f'ShroomCap{k}', 0.06 * s, (x, y, 0.1 * s), SHROOM, scale=(1, 1, 0.55), segs=14, rings=8)
for k, (x, y, r) in enumerate(((-4.5, -2.8, 0.28), (-2.2, 3.4, 0.22), (5.5, -1.2, 0.25), (1.5, 3.6, 0.3), (-5.3, -0.6, 0.2))):
    o = leafy_ball(f'Rock{k}', r, (x, y, r * 0.3), ROCK, k + 20); o.scale = (1.2, 1.0, 0.65)
bm = bmesh.new(); rr = random.Random(66)                                       # tufts of longer grass
for k in range(170):
    x, y = rr.uniform(-6.0, 6.3), rr.uniform(-4.1, 4.3)
    if abs(x) < BX + 0.4 and BY0 - 0.5 < y < BY1 + 0.4: continue
    if math.hypot(x - TX0, y - TY0) < TR + 0.35: continue
    if abs(x - 3.65) < 0.45 and y < -0.6: continue
    if -4.5 < x < -3.0 and abs(x - (-3.75 + 0.2 * math.sin(y))) < 0.55: continue
    if abs((x - IC[0]) / IA) ** IN + abs((y - IC[1]) / IB) ** IN > 0.9: continue
    for j in range(6):
        a = rr.uniform(0, TAU); h = rr.uniform(0.12, 0.24); bx, by = x + math.cos(a) * 0.04, y + math.sin(a) * 0.04
        lean = Vector((math.cos(a) * 0.05, math.sin(a) * 0.05, h)); side = Vector((-math.sin(a), math.cos(a), 0)) * 0.014
        g = Vector((bx, by, 0)); v0, v1, v2 = bm.verts.new(g - side), bm.verts.new(g + side), bm.verts.new(g + lean)
        bm.faces.new((v0, v1, v2))
orient(bm, lambda c: Vector((0, -1, 0.4)))
bm_obj('GrassTufts', bm, BLADE, smooth=False)
for k in range(16):                                                           # where the page lets fireflies drift
    a = TAU * k / 16; r = 1.2 + 0.5 * (k % 3)
    e = bpy.data.objects.new(f'FireflyAt{k}', None); sc.collection.objects.link(e)
    e.location = (RTX + math.cos(a) * r * 0.9, RTY + math.sin(a) * r * 0.7, 0.6 + 2.6 * ((k * 7) % 16) / 16) if k < 11 else (-3.8 + 0.3 * math.sin(k), -3.0 + 0.9 * (k - 11), 0.4 + 0.2 * (k % 2))

# ---------------------------------------------------------------- lights, camera, render
w = bpy.data.worlds.new('WindowWorld'); w.use_nodes = True; sc.world = w
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = col('#1a2046'); bg.inputs['Strength'].default_value = 0.55
# the moon is behind the cottage, up to the left: its light comes in through the round window and lies on the seat and the table
sd = bpy.data.lights.new('Moon', 'SUN'); sd.energy = 2.6; sd.color = (0.7, 0.76, 1.0); sd.angle = math.radians(2)
sun = link(bpy.data.objects.new('Moon', sd)); sun.rotation_euler = Vector((0, 0, -1)).rotation_difference(Vector((0.18, -0.78, -0.6)).normalized()).to_euler()
tgt = link(bpy.data.objects.new('CamTarget', None)); tgt.location = (0.4, 0, 4.2)
fill = area_light('Fill', (8, -11, 7), 280, 6, (0.78, 0.8, 1.0))
c = fill.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
key = area_light('FrontKey', (-7, -10, 7.5), 260, 5, (0.8, 0.82, 1.0))
c = key.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
area_light('RoomGlow', (0, 0, CEIL - 0.22), 110, 3.6, (1.0, 0.76, 0.55), shape='RECTANGLE', size_y=2.6)
area_light('FrontSpill', (0, BY0 + 0.5, F + 1.7), 70, 3.0, (0.95, 0.78, 0.7), rot=(math.radians(-62), 0, 0), shape='RECTANGLE', size_y=1.0)
area_light('SeatGlow', (0, IY1 - 0.9, F + 1.6), 25, 1.6, (1.0, 0.8, 0.62), rot=(math.radians(-30), 0, 0))

cd = bpy.data.cameras.new('WindowCam'); cd.lens = 44; cd.clip_end = 200
cam = link(bpy.data.objects.new('WindowCam', cd))
def place_cam(yaw_deg, pitch=0.4, dist=19.0):
    a = math.radians(yaw_deg); d = Vector((math.cos(a), math.sin(a), 0))
    cam.location = tgt.location + Vector((d.x * math.cos(pitch) * dist, d.y * math.cos(pitch) * dist, math.sin(pitch) * dist))
tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
place_cam(-90, 0.4, 24.0); sc.camera = cam

try: sc.render.engine = 'CYCLES'
except TypeError as e: print('engines', e)
sc.cycles.device = 'CPU'                     # Metal kernel compilation hangs on this Mac
sc.cycles.samples = 160; sc.cycles.use_denoising = True; sc.cycles.max_bounces = 8
try: sc.view_settings.view_transform = 'AgX'
except Exception as e: print('view', e)
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception as e: print('look', e)
sc.render.image_settings.file_format = 'PNG'
try:
    ng = bpy.data.node_groups.new('WindowComp', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl_ = ng.nodes.new('CompositorNodeRLayers'); out_ = ng.nodes.new('NodeGroupOutput'); gl = ng.nodes.new('CompositorNodeGlare')
    for k, v in [('Type', 'Fog Glow'), ('Quality', 'High'), ('Threshold', 1.0), ('Strength', 0.6), ('Size', 0.6)]:
        if k in gl.inputs:
            try: gl.inputs[k].default_value = v
            except Exception as e: print('glare input', k, e)
    ng.links.new(rl_.outputs['Image'], gl.inputs['Image']); ng.links.new(gl.outputs['Image'], out_.inputs[0])
    sc.compositing_node_group = ng
except Exception as e: print('compositor skipped:', e)

blend = os.path.join(HERE, 'oracle_window.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend)
print('BUILT', len(sc.objects), 'objects ->', blend, flush=True)

if '--preview' in ARGS or '--render' in ARGS:
    big = '--render' in ARGS
    sc.render.resolution_x, sc.render.resolution_y = (2000, 1250) if big else (1200, 750)
    sc.cycles.samples = 160 if big else int(ARGS[ARGS.index('--samples') + 1]) if '--samples' in ARGS else 48
    WIDE = (0.4, 0, 4.4)
    shots = [('front', -90, 0.32, 30.0, 44, WIDE), ('left', -130, 0.32, 30.0, 44, WIDE), ('right', -50, 0.32, 30.0, 44, WIDE),
             ('inside', -90, 0.2, 2.9, 26, (0, 0.7, F + 1.25)), ('table', -90, 0.62, 1.5, 30, (TX, TY, T)),
             ('window', -90, 0.04, 2.4, 30, (0, IY1, MW['cz'])), ('shelves', 0, 0.1, 2.4, 30, (-IX, 0.5, F + 1.4)),
             ('charts', 180, 0.1, 2.6, 30, (IX, -0.2, F + 1.5)), ('tower', -60, 0.25, 10.0, 40, (TW['x'], TW['y'], 5.2))]
    if '--only' in ARGS: shots = [s_ for s_ in shots if s_[0] in ARGS[ARGS.index('--only') + 1].split(',')]
    for name, yaw, pitch, dist, lens, at in shots:
        tgt.location = at; cd.lens = lens; place_cam(yaw, pitch, dist); sc.render.filepath = OUT + f'window_{name}{"" if big else "_preview"}.png'
        t0 = time.time(); bpy.ops.render.render(write_still=True); print('RENDERED', name, round(time.time() - t0, 1), 's', flush=True)
    tgt.location = WIDE; cd.lens = 44; place_cam(-90, 0.4, 24.0)
