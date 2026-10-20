# 东方神龛 · the shrine from page 2 of the pop-up book, built in Blender as a cut-away diorama like the starry tent.
# A Quanzhou-style temple: white granite podium, red brick and granite walls, a lower roof and a raised clerestory
# under an upper roof, both with swallowtail ridges in orange tile; cut-porcelain dragons chase a pearl on the top
# ridge and stone dragons coil round the porch columns. The front is cut open: two short walls are kept at the
# ends, the lower roof keeps its outer bays and the upper roof a strip below the ridge. Inside, a quiet hall under
# the moon rather than an altar to a god: a round window onto a moonlit range, 心安 above it, an offering table
# with the incense burner, the fortune sticks and the moon blocks, sixty slip drawers, an ice-crack window,
# palace lanterns and hanging incense coils.
# Run headless:  Blender -b --factory-startup --python build_shrine.py -- [--preview] [--render] [--only front,inside]
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
sc.name = 'OracleShrine'
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

def brick_mat(name, c1, c2, mortar, bw=0.24, bh=0.06, rough=0.8):
    """bricks on an upright outline wall, whose own x runs along it and y up it"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    br = N.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 1.0
    br.inputs['Brick Width'].default_value = bw; br.inputs['Row Height'].default_value = bh; br.inputs['Mortar Size'].default_value = 0.006
    br.inputs['Color1'].default_value = col(c1); br.inputs['Color2'].default_value = col(c2); br.inputs['Mortar'].default_value = col(mortar); br.inputs['Bias'].default_value = 0.0
    L.new(oc, br.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 18.0; L.new(oc, nz.inputs['Vector'])
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 0.25
    L.new(br.outputs['Color'], mul.inputs['A']); L.new(nz.outputs['Color'], mul.inputs['B']); L.new(mul.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rough
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.35; b.invert = True; L.new(br.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

def plaster_mat(name, c1, c2, rough=0.9):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.2; nz.inputs['Detail'].default_value = 10.0; nz.inputs['Roughness'].default_value = 0.65
    L.new(oc, nz.inputs['Vector']); L.new(ramp(N, nz.outputs['Fac'], [(0.35, c2), (0.65, c1)]), p.inputs['Base Color']); p.inputs['Roughness'].default_value = rough
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.05; L.new(nz.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

def tile_mat(name, c1, c2, scale=6.0):
    """roof tiles: fired orange with a little variation and soot"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 4.0
    L.new(oc, nz.inputs['Vector']); L.new(ramp(N, nz.outputs['Fac'], [(0.3, c2), (0.7, c1)]), p.inputs['Base Color']); p.inputs['Roughness'].default_value = 0.62
    MATS[name] = m; return m

def shard_mat(name, cols, scale=60.0, coat=0.8):
    """cut porcelain: a mosaic of glazed shards in several colours with pale gaps"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = scale; L.new(oc, vo.inputs['Vector'])
    stops = [(i / (len(cols) - 1) * 0.98, c) for i, c in enumerate(cols)]
    cr = N.new('ShaderNodeValToRGB'); els = cr.color_ramp.elements; cr.color_ramp.interpolation = 'CONSTANT'
    while len(els) < len(stops): els.new(0.5)
    for e, (pos, c) in zip(els, stops): e.position = pos; e.color = col(c)
    L.new(vo.outputs['Color'], cr.inputs['Fac'])
    ve = N.new('ShaderNodeTexVoronoi'); ve.feature = 'DISTANCE_TO_EDGE'; ve.inputs['Scale'].default_value = scale; L.new(oc, ve.inputs['Vector'])
    gap = N.new('ShaderNodeMath'); gap.operation = 'LESS_THAN'; gap.inputs[1].default_value = 0.06; L.new(ve.outputs['Distance'], gap.inputs[0])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['B'].default_value = col('#e8e0cc')
    L.new(cr.outputs['Color'], mx.inputs['A']); L.new(gap.outputs[0], mx.inputs['Factor']); L.new(mx.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.22; p.inputs['Coat Weight'].default_value = coat
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.3; L.new(gap.outputs[0], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

def bluewhite_mat(name):
    """blue-and-white porcelain: cobalt rings round the neck, shoulder and foot, and scattered rosettes with a dot
    and a ring of petals over the body, on a clear glossy white glaze"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    sp = N.new('ShaderNodeSeparateXYZ'); L.new(oc, sp.inputs['Vector'])
    def math_(op, a, b=None, v=None):
        n = N.new('ShaderNodeMath'); n.operation = op
        L.new(a, n.inputs[0]) if not isinstance(a, (int, float)) else setattr(n.inputs[0], 'default_value', a)
        if b is not None: (L.new(b, n.inputs[1]) if not isinstance(b, (int, float)) else setattr(n.inputs[1], 'default_value', b))
        return n.outputs[0]
    ring = math_('LESS_THAN', math_('ABSOLUTE', math_('SUBTRACT', math_('FRACT', math_('MULTIPLY', sp.outputs['Z'], 7.0)), 0.5)), 0.05)   # thin rings every 14 cm
    vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 34.0; L.new(oc, vo.inputs['Vector'])
    d = vo.outputs['Distance']
    dot = math_('LESS_THAN', d, 0.12)
    petals = math_('LESS_THAN', math_('ABSOLUTE', math_('SUBTRACT', d, 0.3)), 0.06)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 60.0; L.new(oc, nz.inputs['Vector'])
    vine = math_('LESS_THAN', math_('ABSOLUTE', math_('SUBTRACT', nz.outputs['Fac'], 0.5)), 0.018)                  # thin scrolling stems
    blue = math_('MAXIMUM', math_('MAXIMUM', ring, dot), math_('MAXIMUM', petals, vine))
    c = N.new('ShaderNodeMix'); c.data_type = 'RGBA'; c.inputs['A'].default_value = col('#f3f2ec'); c.inputs['B'].default_value = col('#22408a')
    L.new(blue, c.inputs['Factor']); L.new(c.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.12; p.inputs['Coat Weight'].default_value = 0.6
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
def mesh_obj(name, verts, faces, m=None, smooth=True):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if smooth: me.shade_smooth()
    o = link(bpy.data.objects.new(name, me))
    if m: o.data.materials.append(m)
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
def box_into(bm, size, loc, rot=0.0):
    M = Matrix.Translation(loc) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Diagonal((size[0], size[1], size[2], 1))
    bmesh.ops.create_cube(bm, size=1.0, matrix=M)
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
def uvplane(name, w, h, loc, m, rot=(0, 0, 0)):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    vs = [bm.verts.new(v) for v in [(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)]]
    f = bm.faces.new(vs)
    for l, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): l[uvl].uv = uv
    o = bm_obj(name, bm, m, smooth=False); o.location = loc; o.rotation_euler = rot; return o
def uvdisc(name, r, loc, m, segs=96, rot=(0, 0, 0)):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); c = bm.verts.new((0, 0, 0))
    ring = [bm.verts.new((math.cos(TAU * i / segs) * r, 0, math.sin(TAU * i / segs) * r)) for i in range(segs)]
    for i in range(segs):
        f = bm.faces.new((c, ring[(i + 1) % segs], ring[i]))
        for l in f.loops: l[uvl].uv = (0.5 + l.vert.co.x / (2 * r), 0.5 + l.vert.co.z / (2 * r))
    o = bm_obj(name, bm, m, smooth=False); o.location = loc; o.rotation_euler = rot; return o
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

def circle(r, n=12): return [(math.cos(TAU * i / n) * r, math.sin(TAU * i / n) * r) for i in range(n)]

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

# ---------------------------------------------------------------- materials
granite = stone_mat('Granite', '#c6beb0', '#a39b8d', speck='#4a4640', speck_amt=0.08)
graniteP = stone_mat('GranitePave', '#bab2a4', '#958d80', scale=30, speck='#4a4640', speck_amt=0.07, rough=0.7)
bluestone = stone_mat('Bluestone', '#4e5a5c', '#323c3e', scale=55, rough=0.42, bump=0.25, speck='#26302f', speck_amt=0.05)
def scale_mat(name, c1, c2, rough=0.4, scale=110.0):
    """carved stone with fish-scale relief: voronoi cells read as overlapping scales"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 4.0; nz.inputs['Detail'].default_value = 6.0; L.new(oc, nz.inputs['Vector'])
    vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = scale; L.new(oc, vo.inputs['Vector'])
    L.new(ramp(N, nz.outputs['Fac'], [(0.3, c2), (0.75, c1)]), p.inputs['Base Color']); p.inputs['Roughness'].default_value = rough
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.55; L.new(vo.outputs['Distance'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m
dragonStone = scale_mat('DragonStone', '#8aaa9e', '#5a7a70')
dragonBelly = stone_mat('DragonBelly', '#b8c8b8', '#90a498', scale=60, rough=0.45, bump=0.3, speck='#4a5a54', speck_amt=0.04)
cloudStone = stone_mat('CloudStone', '#6e7e80', '#4e5c5e', scale=60, rough=0.45, bump=0.2, speck='#2a3434', speck_amt=0.05)
brick = brick_mat('RedBrick', '#b8482e', '#9a3a24', '#e6d6bc')
plaster = plaster_mat('Plaster', '#e4d8c0', '#c6b89c')
plasterW = plaster_mat('PlasterWhite', '#e8e0d0', '#cec4b2')
tiles = tile_mat('Tiles', '#e2683a', '#bf4c26'); tilesD = tile_mat('TilesDark', '#b84a26', '#8a3418')
lacquer = wood_mat('Lacquer', '#5e1a14', '#3a0e0a', 30, 0.02, 'z', 0.32, coat=0.6)
teak = wood_mat('Teak', '#5a3420', '#2e180c', 12, 0.05, 'x', 0.5, coat=0.3)
teakV = wood_mat('TeakV', '#5a3420', '#2e180c', 12, 0.05, 'z', 0.5, coat=0.3)
timber = wood_mat('Timber', '#6a4428', '#3a2414', 10, 0.06, 'y', 0.7)
porcelain = shard_mat('CutPorcelain', ['#1f6a5a', '#2f8a6a', '#3aa080', '#1f5a7a', '#58b090', '#e8c050', '#2f8a6a', '#246e64'])
porcelainY = shard_mat('CutPorcelainGold', ['#e8b84a', '#f2d070', '#d89a30', '#f6e0a0'], 80)
gold = mat('Gold', '#e6bf6a', 0.3, 1.0); brass = mat('Brass', '#c99a48', 0.35, 1.0)
bronze = mat('Bronze', '#4a3a26', 0.42, 0.85); pewter = mat('Pewter', '#9a9890', 0.35, 0.9)
ridgeM = imgmat('RidgeBand', 'shrine_ridge.jpg', 0.5)
beamM = imgmat('BeamPaint', 'shrine_beam.jpg', 0.6)
moonM = imgmat('MoonSilk', 'shrine_moon.jpg', 0.9, emit=2.2)
plaqueM = imgmat('PlaqueM', 'shrine_plaque.jpg', 0.35)
frontalM = imgmat('FrontalM', 'shrine_frontal.jpg', 0.75, sheen=0.6)
drawerM = imgmat('DrawersM', 'shrine_drawers.jpg', 0.6)
silkM = imgmat('LanternSilk', 'shrine_silk.jpg', 0.8, emit=1.6)
fuM = imgmat('LanternFu', 'shrine_lantern_fu.jpg', 0.7, emit=1.4); anM = imgmat('LanternAn', 'shrine_lantern_an.jpg', 0.7, emit=1.4)
paperCool = mat('PaperMoonlit', '#c8d6f0', 0.9, emit='#a8bce8', emit_str=1.6)
paperWarm = mat('PaperWarm', '#f6dcb0', 0.9, emit='#ffc078', emit_str=2.5)
flameM = mat('FlameGlow', '#fff0c8', 0.4, emit='#ffb050', emit_str=12.0)
wax = mat('RedWax', '#a81c14', 0.45, coat=0.3); incense = mat('Incense', '#5a2418', 0.8); emberM = mat('Ember', '#ff6a2a', 0.5, emit='#ff5a1a', emit_str=8)
straw = wood_mat('Straw', '#c8a060', '#8a6a38', 3, 0.3, 'z', 0.85)
orange = mat('Orange', '#e8801a', 0.45, coat=0.4); leafM = mat('Leaf', '#2f5a34', 0.5)
blossom = mat('Blossom', '#f6dfe4', 0.6, sheen=0.5); blossomC = mat('BlossomHeart', '#e8b050', 0.5); twig = wood_mat('Twig', '#3a2620', '#1e1210', 6, 0.2, 'z', 0.8)
blueWhite = bluewhite_mat('BlueWhite')
redSilk = mat('RedSilk', '#7e1212', 0.6, sheen=0.4); tasselM = mat('Tassel', '#b82424', 0.7, sheen=0.4)
coffer = mat('Coffer', '#1d3a3c', 0.7)
glowPearl = mat('PearlGlow', '#fff0c0', 0.3, 0.3, emit='#ffc860', emit_str=9.0)

# ---------------------------------------------------------------- dimensions (front is -y, platform top z = 0)
PW, PD, PH = 2.95, 2.05, 0.5                 # podium half sizes and height
BW, BD, BH, WT = 2.15, 1.30, 2.3, 0.2        # body half sizes, wall height to the ceiling, wall thickness
XS = 1.45                                    # the kept front walls run from |x| = XS to BW
XC, YC = 1.45, 0.92                          # the clerestory: half sizes, and where the inner columns stand
ZC2 = 3.6                                    # clerestory wall top = upper eave
LO = dict(hx=2.62, ye=1.78, ze=2.36, zr=3.12, bow=0.12, lift=0.36, rise=0.10)      # lower roof
UP = dict(hx=1.88, ye=1.34, ze=3.6, zr=4.42, bow=0.10, lift=0.4, rise=0.14)        # upper roof
IN_Y = BD - WT                               # inner face of the back wall
random.seed(7)

# ---------------------------------------------------------------- podium: a granite base with a waist, paving, front steps
def slab(name, x, y, z0, z1, m, bev=0.02, dx=0.0, dy=0.0):
    return box(name, (2 * x, 2 * y, z1 - z0), (dx, dy, (z0 + z1) / 2), m, bev)
slab('PodiumFoot', PW + 0.08, PD + 0.08, -PH, -PH + 0.1, granite)
slab('PodiumWaist', PW - 0.06, PD - 0.06, -PH + 0.1, -0.13, granite, 0.01)
slab('PodiumCushion', PW + 0.02, PD + 0.02, -0.16, -0.1, granite, 0.03)
slab('PodiumTop', PW + 0.06, PD + 0.06, -0.1, 0.0, granite, 0.02)
# carved panels round the waist: a sunk frame with a cloud boss in each
pb = bmesh.new()
for side, (L, ax) in enumerate([(2 * PW, 'x'), (2 * PD, 'y')]):
    n = 6 if ax == 'x' else 4
    for sgn in (-1, 1):
        for k in range(n):
            c = -L / 2 + (k + 0.5) * L / n
            if ax == 'x': loc = Vector((c, sgn * (PD - 0.055), -0.315)); rot = 0.0
            else: loc = Vector((sgn * (PW - 0.055), c, -0.315)); rot = math.pi / 2
            for (w, h, d) in ((L / n - 0.12, 0.2, 0.012), (L / n - 0.2, 0.13, 0.024)):
                box_into(pb, (w, d, h) if ax == 'x' else (w, d, h), loc, rot)
bm_obj('PodiumPanels', pb, granite, smooth=False)
for i, (dy, w, top) in enumerate([(0.18, 1.9, -0.13), (0.46, 2.1, -0.3)]):
    box(f'Step{i}', (w, 0.3, top + PH), (0, -PD - dy, (top - PH) / 2), granite, 0.015)
for sx in (-1, 1):
    pts = [(sx * 1.12, -PD - 0.02, 0.0), (sx * 1.12, -PD - 0.64, -0.3)]
    box(f'StepCheek{sx}', (0.2, 0.68, 0.2), (sx * 1.16, -PD - 0.32, -0.25), granite, 0.02, rot=(math.atan2(0.3, 0.62), 0, 0))
pv = bmesh.new()                                   # paving slabs on the podium top, outside the walls
for ix in range(-6, 6):
    for iy in range(-4, 4):
        x0, y0 = ix * 0.5 + 0.004, iy * 0.52 + 0.004
        cx, cy = x0 + 0.246, y0 + 0.256
        if abs(cx) < BW - 0.05 and abs(cy) < BD - 0.05: continue
        if abs(cx) > PW or abs(cy) > PD: continue
        box_into(pv, (0.492, 0.512, 0.02), Vector((cx, cy, 0.01)))
bm_obj('Paving', pv, graniteP, smooth=False)

# ---------------------------------------------------------------- the hall floor: granite slabs, a round moon stone under the table
fl = bmesh.new()
for ix in range(-7, 7):
    for iy in range(-5, 5):
        cx, cy = (ix + 0.5) * 0.3, (iy + 0.5) * 0.3 - 0.05
        if abs(cx) > BW - WT or cy > BD - WT or cy < -BD - 0.05: continue
        box_into(fl, (0.292, 0.292, 0.03), Vector((cx, cy, 0.015)))
bm_obj('HallFloor', fl, stone_mat('ClayTile', '#9a6248', '#7a4a36', scale=25, rough=0.6, bump=0.1, speck='#5a3424', speck_amt=0.04), smooth=False)
moonstone = lathe('MoonStone', [(0, 0.031), (0.52, 0.031), (0.55, 0.024), (0.55, 0.0)], (0, -0.1, 0), stone_mat('MoonStoneM', '#d6d0c2', '#bab2a2', speck_amt=0.05, rough=0.5), 64)
for k, r in enumerate((0.18, 0.3, 0.42)):
    tb = tube(f'MoonRipple{k}', [(math.cos(TAU * i / 64) * r, -0.1 + math.sin(TAU * i / 64) * r, 0.033) for i in range(65)], 0.005, graniteP, poly=True)

# ---------------------------------------------------------------- walls: red brick above white granite outside, plaster above teak inside
DADO = 0.72
def wall_skin(name, outer, holes, y, thick, m, rotz=0.0, x=0.0):
    o = outline_curve(name, outer, holes, thick, m); o.rotation_euler = (math.pi / 2, 0, rotz); o.location = (x, y, 0) if rotz == 0 else (x, y, 0); return o
# back wall with the round window
MW = dict(cz=1.22, r=0.62)
back_hole = ring_pts(0, MW['cz'], MW['r'])
wall_skin('WallBack', rect(-BW, 0, BW, BH + 0.25), [back_hole], BD - WT / 2, WT, brick)
wall_skin('WallBackDado', rect(-BW - 0.005, 0, BW + 0.005, DADO), [], BD - WT / 2, WT + 0.02, granite)
wall_skin('WallBackPlaster', rect(-BW + WT, 0, BW - WT, BH), [back_hole], IN_Y - 0.004, 0.006, plaster)
# side walls (gable ends): the left one blank, the right one with an ice-crack window
LWIN = dict(cy=0.1, cz=1.35, w=1.0, h=0.95)
def gable_outline(y0, y1, z_eave, z_top):
    return [(y0, 0), (y1, 0), (y1, z_eave), (0.0, z_top), (y0, z_eave)]
for sx in (-1, 1):
    holes = [rect(LWIN['cy'] - LWIN['w'] / 2, LWIN['cz'] - LWIN['h'] / 2, LWIN['cy'] + LWIN['w'] / 2, LWIN['cz'] + LWIN['h'] / 2)] if sx > 0 else []
    o = outline_curve(f'WallSide{sx}', gable_outline(-BD, BD, BH + 0.05, LO['zr'] - 0.05), holes, WT, brick)
    o.rotation_euler = (math.pi / 2, 0, math.pi / 2); o.location = (sx * (BW - WT / 2), 0, 0)
    o = outline_curve(f'WallSideDado{sx}', rect(-BD - 0.005, 0, BD + 0.005, DADO), [], WT + 0.02, granite); o.rotation_euler = (math.pi / 2, 0, math.pi / 2); o.location = (sx * (BW - WT / 2), 0, 0)
    o = outline_curve(f'WallSidePlaster{sx}', rect(-BD + WT, 0, BD - WT, BH), [h_ for h_ in holes], 0.006, plaster)
    o.rotation_euler = (math.pi / 2, 0, math.pi / 2); o.location = (sx * (BW - WT - 0.004), 0, 0)
    # white plaster bands following the gable edge (规带) and a round boss at the apex
    ge = [(sx * (BW + 0.003), -BD - 0.02, BH + 0.05), (sx * (BW + 0.003), 0, LO['zr'] - 0.05), (sx * (BW + 0.003), BD + 0.02, BH + 0.05)]
    tube(f'GableBand{sx}', ge, 0.035, plasterW, poly=True)
    cyl(f'GableBoss{sx}', 0.16, 0.03, (sx * (BW + 0.01), 0, LO['zr'] - 0.42), plasterW, 32, rot=(0, math.pi / 2, 0))
    cyl(f'GableBossIn{sx}', 0.1, 0.035, (sx * (BW + 0.012), 0, LO['zr'] - 0.42), porcelain, 32, rot=(0, math.pi / 2, 0))
qb = bmesh.new()
for sx in (-1, 1):
    for sy in (-1, 1):
        for k in range(int(BH / 0.3)):
            z = DADO + k * 0.3; w = 0.34 if k % 2 else 0.22
            if z + 0.28 > BH: break
            box_into(qb, (w, 0.025, 0.28), Vector((sx * (BW - w / 2 + 0.01), sy * (BD + 0.012), z + 0.14)))
            box_into(qb, (0.025, w, 0.28), Vector((sx * (BW + 0.012), sy * (BD - w / 2 + 0.01), z + 0.14)))
o = bm_obj('Quoins', qb, granite, smooth=False)
for sx in (-1, 1):
    uvplane(f'SideFrieze{sx}', 2 * BD - 0.1, 0.24, (sx * (BW + 0.014), 0, BH - 0.08), ridgeM, rot=(0, 0, sx * math.pi / 2))
    tube(f'SideFriezeTrim{sx}', [(sx * (BW + 0.02), -BD + 0.05, BH - 0.21), (sx * (BW + 0.02), BD - 0.05, BH - 0.21)], 0.014, granite, poly=True)
uvplane('BackFrieze', 2 * BW - 0.1, 0.24, (0, BD + 0.014, BH - 0.08), ridgeM, rot=(0, 0, math.pi))

# the kept ends of the front wall, each with a granite bamboo window
for sx in (-1, 1):
    x0, x1 = sorted((sx * XS, sx * BW))
    wall_skin(f'WallFront{sx}', rect(x0, 0, x1, BH + 0.25), [], -BD + WT / 2, WT, brick)
    wall_skin(f'WallFrontDado{sx}', rect(x0 - 0.005, 0, x1 + 0.005, DADO), [], -BD + WT / 2, WT + 0.02, granite)
    wall_skin(f'WallFrontPlaster{sx}', rect(x0 + (0 if sx > 0 else WT), 0, x1 - (WT if sx > 0 else 0), BH), [], -BD + WT + 0.004, 0.006, plaster)
    cx = (x0 + x1) / 2; fy = -BD - 0.012
    box(f'BambooFrame{sx}', (0.5, 0.06, 0.62), (cx, fy, 1.42), granite, 0.01)
    box(f'BambooRecess{sx}', (0.4, 0.02, 0.52), (cx, fy + 0.02, 1.42), mat('Recess', '#1a1612', 0.9))
    for k in range(5):
        bx = cx - 0.16 + k * 0.08
        cyl(f'Bamboo{sx}_{k}', 0.016, 0.52, (bx, fy - 0.005, 1.42), granite, 10)
        for zz in (1.27, 1.42, 1.57): cyl(f'BambooNode{sx}_{k}_{zz}', 0.02, 0.012, (bx, fy - 0.005, zz), granite, 10)
    uvplane(f'FrontFrieze{sx}', x1 - x0 + 0.02, 0.22, (cx, -BD - 0.004, BH - 0.06), beamM)
# teak wainscot round the inside
wb = bmesh.new()
for (cx, cy, w, d, rot) in [(0, IN_Y - 0.012, 2 * (BW - WT), 0.024, 0), (-(BW - WT) + 0.012, 0, 2 * (BD - WT), 0.024, math.pi / 2), ((BW - WT) - 0.012, 0, 2 * (BD - WT), 0.024, math.pi / 2)]:
    box_into(wb, (w, d, 0.86), Vector((cx, cy, 0.43)), rot)
for sx in (-1, 1):
    box_into(wb, (BW - XS - WT, 0.024, 0.86), Vector((sx * (XS + (BW - XS - WT) / 2), -BD + WT + 0.012, 0.43)))
bm_obj('Wainscot', wb, teak, smooth=False)
wr = bmesh.new()
for (cx, cy, w, rot) in [(0, IN_Y - 0.03, 2 * (BW - WT), 0), (-(BW - WT) + 0.03, 0, 2 * (BD - WT), math.pi / 2), ((BW - WT) - 0.03, 0, 2 * (BD - WT), math.pi / 2)]:
    box_into(wr, (w, 0.05, 0.05), Vector((cx, cy, 0.88)), rot)
bm_obj('WainscotRail', wr, teak, smooth=False)

# ---------------------------------------------------------------- columns: lacquered wood inside on granite drums; stone dragons coil the porch pair
def column(name, x, y, h, r, m):
    cyl(name, r, h, (x, y, h / 2), m, 24, r2=r * 0.94)
    lathe(name + 'Base', [(0, 0), (r * 1.6, 0), (r * 1.62, 0.05), (r * 1.45, 0.1), (r * 1.55, 0.16), (r * 1.25, 0.22), (r * 1.05, 0.24), (0, 0.24)], (x, y, 0), granite, 28)
for sx in (-1, 1):
    for sy in (-1, 1): column(f'Col{sx}{sy}', sx * XC, sy * YC, BH - 0.72, 0.1, lacquer)

def dragon(name, path, r0, m, head_m, spikes_m, horn_m, up=Vector((0, 0, 1)), s=1.0, legs=(0.22, 0.55), head=1.0, belly_m=None):
    """a dragon whose head is at path[0]: a tapering body with a crest of spikes, four legs, a horned head"""
    P = [Vector(p) for p in path]; n = len(P)
    prof = circle(1.0, 10)
    def rad(t): return r0 * (0.72 + 0.4 * math.sin(math.pi * min(1.0, t * 1.7 + 0.08))) * (1 - 0.86 * t ** 1.6)
    sweep(name + 'Body', P, prof, m, scale=lambda t: (rad(t), rad(t) * 0.88), up=up)
    fr = frames(P, up); sb = bmesh.new()
    # a paler belly band of broad plates along the underside
    belly = [P[i] - fr[i][2] * rad(i / (n - 1)) * 0.62 for i in range(n)]
    sweep(name + 'Belly', belly, circle(1.0, 8), belly_m or horn_m, scale=lambda t: (rad(t) * 0.62, rad(t) * 0.3), up=up)
    for i in range(2, n - 2):                                  # the crest: flames swept back towards the tail, big and small in turn
        t = i / (n - 1); T, S, U = fr[i]; r = rad(t); h = r * (1.35 if i % 2 else 0.75) + 0.008 * s
        ax = (U * 0.82 + T * 0.5).normalized(); Y = ax.cross(S).normalized()
        base = P[i] + U * r * 0.8
        cone = bmesh.ops.create_cone(sb, cap_ends=True, segments=4, radius1=r * 0.42, radius2=0.0, depth=h)
        rot = Matrix((S, Y, ax)).transposed().to_4x4()
        bmesh.ops.transform(sb, matrix=Matrix.Translation(base + ax * h * 0.45) @ rot @ Matrix.Diagonal((0.55, 1.6, 1.0, 1.0)), verts=cone['verts'])
    bm_obj(name + 'Crest', sb, spikes_m)
    for lt in legs:                                          # legs: a bent tube each side ending in three claws
        i = int(lt * (n - 1)); T, S, U = fr[i]; r = rad(lt)
        for side in (-1, 1):
            a = P[i] + S * side * r * 0.7; b = a + S * side * r * 1.2 - U * r * 1.4 + T * r * 0.6; c = b - U * r * 1.1 + T * r * 0.9
            tube(f'{name}Leg{lt}{side}', [tuple(a), tuple(b), tuple(c)], r * 0.32, m, res=4)
            for k in (-1, 0, 1):
                tip = c + T * r * 0.5 + S * k * r * 0.35 - U * r * 0.2
                tube(f'{name}Claw{lt}{side}{k}', [tuple(c), tuple(tip)], r * 0.12, horn_m, poly=True)
    # head, looking along -T at the first point
    T, S, U = fr[0]; F = -T; h0 = P[0] + F * r0 * 0.4
    def ell(nm, c, sz, mm, rotm=None):
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=1.0)
        R = Matrix((F, S, U)).transposed().to_4x4() if rotm is None else rotm
        bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ R @ Matrix.Diagonal((sz[0], sz[1], sz[2], 1.0)), verts=bm.verts)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return bm_obj(name + nm, bm, mm)
    k = r0 * 2.1 * head
    ell('Skull', h0, (k * 0.62, k * 0.5, k * 0.48), head_m)
    ell('Snout', h0 + F * k * 0.62 - U * k * 0.06, (k * 0.55, k * 0.36, k * 0.28), head_m)
    jaw_dir = (F * math.cos(0.45) - U * math.sin(0.45)).normalized()
    ell('Jaw', h0 + F * k * 0.4 - U * k * 0.32, (k * 0.55, k * 0.3, k * 0.13), head_m, Matrix((jaw_dir, S, S.cross(jaw_dir))).transposed().to_4x4())
    ell('Nose', h0 + F * k * 1.08 + U * k * 0.02, (k * 0.16, k * 0.26, k * 0.14), head_m)
    ell('Tongue', h0 + F * k * 0.75 - U * k * 0.3, (k * 0.3, k * 0.1, k * 0.04), mat('Tongue', '#b03a30', 0.5))
    for side in (-1, 1):
        ell(f'Eye{side}', h0 + F * k * 0.3 + U * k * 0.3 + S * side * k * 0.3, (k * 0.1, k * 0.1, k * 0.1), gold)
        hb = h0 + U * k * 0.4 + S * side * k * 0.2 - F * k * 0.05
        mid = hb - F * k * 0.5 + U * k * 0.45 + S * side * k * 0.12
        tube(f'{name}Horn{side}', [tuple(hb), tuple(mid), tuple(hb - F * k * 1.1 + U * k * 0.55 + S * side * k * 0.3)], k * 0.07, horn_m, res=6, taper=lambda t: 1 - 0.85 * t)
        tube(f'{name}Tine{side}', [tuple(mid), tuple(mid + U * k * 0.32 + F * k * 0.12 + S * side * k * 0.05)], k * 0.04, horn_m, res=4, taper=lambda t: 1 - 0.85 * t)   # antlers branch like a deer's
        ell(f'Brow{side}', h0 + F * k * 0.28 + U * k * 0.42 + S * side * k * 0.26, (k * 0.2, k * 0.1, k * 0.06), head_m)
        for q in range(3):                                     # teeth along the upper jaw
            tb_ = h0 + F * k * (0.72 + q * 0.13) - U * k * 0.24 + S * side * k * (0.22 - q * 0.04)
            tube(f'{name}Tooth{side}{q}', [tuple(tb_), tuple(tb_ - U * k * 0.12)], k * 0.035, mat('Ivory', '#efe6d0', 0.4), poly=True, taper=lambda t: 1 - 0.9 * t)
        wb_ = h0 + F * k * 0.95 - U * k * 0.05 + S * side * k * 0.2
        tube(f'{name}Whisker{side}', [tuple(wb_), tuple(wb_ + F * k * 0.4 + S * side * k * 0.4 - U * k * 0.2), tuple(wb_ + F * k * 0.3 + S * side * k * 0.9 + U * k * 0.2), tuple(wb_ - F * k * 0.2 + S * side * k * 1.2 + U * k * 0.55)], k * 0.035, horn_m, res=6, taper=lambda t: 1 - 0.8 * t)
        for j in range(4):                                     # mane
            mb = h0 - F * k * 0.3 + U * k * 0.2 + S * side * k * 0.25
            tip = mb - F * k * (0.7 + j * 0.12) + U * k * (0.5 - j * 0.3) + S * side * k * (0.35 + j * 0.05)
            tube(f'{name}Mane{side}{j}', [tuple(mb), tuple(mb.lerp(tip, 0.5) + U * k * 0.1), tuple(tip)], k * 0.09, spikes_m, res=4, taper=lambda t: 1 - 0.9 * t)
    return h0 + F * k * 1.2

DC = dict(r=0.13, y=-1.68, h=1.85)
for sx in (-1, 1):
    x = sx * 1.5; y = DC['y']; R = DC['r']
    cyl(f'DragonCol{sx}', R, DC['h'], (x, y, DC['h'] / 2), bluestone, 32)
    lathe(f'DragonColBase{sx}', [(0, 0), (0.25, 0), (0.26, 0.06), (0.21, 0.12), (0.24, 0.2), (0.17, 0.3), (0.14, 0.32), (0, 0.32)], (x, y, 0), granite, 32)
    lathe(f'DragonColCap{sx}', [(0, 0), (0.15, 0), (0.2, 0.06), (0.22, 0.12), (0, 0.12)], (x, y, DC['h']), granite, 32)
    for k, zz in enumerate((0.36, 0.41, 0.46)):                 # rolling waves round the foot of the shaft
        tube(f'DragonColWave{sx}{k}', [(x + math.cos(TAU * i / 64) * (R + 0.022 + 0.016 * math.sin(TAU * i / 64 * 9 + k * 1.3)), y + math.sin(TAU * i / 64) * (R + 0.022 + 0.016 * math.sin(TAU * i / 64 * 9 + k * 1.3)), zz + 0.012 * math.cos(TAU * i / 64 * 9 + k)) for i in range(65)], 0.017, cloudStone, poly=True)
    for k in range(6):                                          # ruyi clouds carved in low relief between the coils
        th, zc = sx * (0.5 + k * 1.15), 0.62 + k * 0.2
        for side in (-1, 1):
            pts = []
            for i in range(26):
                t = i / 25; ph = t * 2.3 * math.pi; rs = 0.05 * (1 - 0.7 * t)
                a = th + side * (0.05 + rs * math.cos(ph)) / R; zz = zc + rs * math.sin(ph) * side
                pts.append((x + math.cos(a) * (R + 0.012), y + math.sin(a) * (R + 0.012), zz))
            tube(f'DragonColCloud{sx}{k}{side}', pts, 0.01, cloudStone, poly=True)
        tube(f'DragonColCloudTail{sx}{k}', [(x + math.cos(th + d / R) * (R + 0.012), y + math.sin(th + d / R) * (R + 0.012), zc - 0.055 + 0.01 * abs(d) * 8) for d in (-0.13, -0.06, 0.0, 0.06, 0.13)], 0.009, cloudStone)
    pts = []
    for i in range(80):
        t = i / 79; a = (-math.pi / 2 + sx * 0.6) - sx * t * TAU * 2.1; rr = R + 0.065 + 0.02 * math.sin(t * 9)
        pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr, DC['h'] - 0.12 - t * 1.25))
    # head near the top, out to the front and in towards the doorway, the pearl just before its open jaw
    pts.insert(0, (x - sx * 0.09, y - R - 0.16, DC['h'] - 0.04))
    dragon(f'ColDragon{sx}', pts, 0.078, dragonStone, dragonStone, dragonStone, gold, legs=(0.22, 0.5), head=1.45, belly_m=dragonBelly)
    sphere(f'ColPearl{sx}', 0.05, (x - sx * 0.22, y - R - 0.27, DC['h'] + 0.0), gold)

# ---------------------------------------------------------------- beams, brackets and the coffered ceiling
bb = bmesh.new()
BEAMS = [((0, YC, BH - 0.17), (2 * XC + 0.2, 0.18, 0.3), 0), ((0, IN_Y - 0.09, BH - 0.17), (2 * (BW - WT), 0.18, 0.3), 0)]
for sx in (-1, 1): BEAMS.append(((sx * XC, (YC - BD + WT) / 2 - 0.0, BH - 0.17), (2 * YC + (BD - WT - YC) + 0.1, 0.18, 0.3), math.pi / 2))
for (c, sz, rot) in BEAMS: box_into(bb, sz, Vector(c), rot)
beams = bm_obj('Beams', bb, timber, smooth=False)
for i, (c, sz, rot) in enumerate(BEAMS):                     # painted faces facing the room
    L = sz[0]
    if rot == 0: uvplane(f'BeamFace{i}', L, sz[2] - 0.04, (c[0], c[1] - sz[1] / 2 - 0.003, c[2]), beamM)
    else:
        sx = 1 if c[0] > 0 else -1
        uvplane(f'BeamFace{i}', L, sz[2] - 0.04, (c[0] - sx * (sz[1] / 2 + 0.003), c[1], c[2]), beamM, rot=(0, 0, -sx * math.pi / 2))
def arm_into(bm, L, h, w, M):
    """one bracket arm: flat on top, the lower ends rounded off in the 卷杀 curve"""
    cut = min(0.08, L * 0.16); pts = [(-L / 2, h), (L / 2, h), (L / 2, 0.45 * h)]
    for i in range(1, 7): a = i / 6 * math.pi / 2; pts.append((L / 2 - cut * (1 - math.cos(a)), 0.45 * h * (1 - math.sin(a))))
    for i in range(6, 0, -1): a = i / 6 * math.pi / 2; pts.append((-(L / 2 - cut * (1 - math.cos(a))), 0.45 * h * (1 - math.sin(a))))
    pts.append((-L / 2, 0.45 * h))
    vf = [bm.verts.new(M @ Vector((x_, -w / 2, z_))) for x_, z_ in pts]; vb = [bm.verts.new(M @ Vector((x_, w / 2, z_))) for x_, z_ in pts]
    bm.faces.new(vf); bm.faces.new(vb[::-1])
    for i in range(len(pts)): j = (i + 1) % len(pts); bm.faces.new((vf[j], vf[i], vb[i], vb[j]))
def cube_into(bm, size, M):
    bmesh.ops.create_cube(bm, size=1.0, matrix=M @ Matrix.Diagonal((size[0], size[1], size[2], 1)))
def dougong(name, loc, rotz=0.0, proj=False, s=1.0):
    """a two-tier bracket set (斗拱); with proj it reaches out to the front (local -y) under a slanting lever arm (昂)"""
    M0 = Matrix.Translation(loc) @ Matrix.Rotation(rotz, 4, 'Z') @ Matrix.Scale(s, 4); T = lambda x_, y_, z_: Matrix.Translation((x_, y_, z_))
    Rz = Matrix.Rotation(math.pi / 2, 4, 'Z'); arms = bmesh.new(); blocks = bmesh.new()
    cube_into(blocks, (0.2, 0.2, 0.06), M0 @ T(0, 0, 0.03)); cube_into(blocks, (0.27, 0.27, 0.07), M0 @ T(0, 0, 0.095))
    z1, ah, aw = 0.13, 0.1, 0.085
    y1 = -0.3 if proj else 0.3
    arm_into(arms, 0.64, ah, aw, M0 @ T(0, 0, z1))
    if proj: arm_into(arms, 0.42, ah, aw, M0 @ T(0, -0.09, z1) @ Rz)
    else: arm_into(arms, 0.64, ah, aw, M0 @ T(0, 0, z1) @ Rz)
    ends = [(0.27, 0), (-0.27, 0), (0, y1), (0, 0)] + ([] if proj else [(0, -y1)])
    for (bx, by) in ends: cube_into(blocks, (0.11, 0.11, 0.06), M0 @ T(bx, by, z1 + ah + 0.03))
    z2 = z1 + ah + 0.06
    arm_into(arms, 0.92, ah, aw, M0 @ T(0, 0, z2))
    if proj:
        arm_into(arms, 0.8, ah, aw, M0 @ T(0, y1, z2))
        arm_into(arms, 0.62, ah, aw, M0 @ T(0, -0.2, z2) @ Rz)
        y2 = -0.5
        for (bx, by) in ((0.43, 0), (-0.43, 0), (0.37, y1), (-0.37, y1), (0, y2)): cube_into(blocks, (0.11, 0.11, 0.06), M0 @ T(bx, by, z2 + ah + 0.03))
        # the lever arm slanting down to a pointed beak at the front
        a_, b_ = M0 @ Vector((0, 0.18, z2 + 0.16)), M0 @ Vector((0, y2 - 0.12, z2 - 0.07)); d = (b_ - a_); L = d.length
        Mq = Matrix.Translation((a_ + b_) / 2) @ d.to_track_quat('Y', 'Z').to_matrix().to_4x4()
        cube_into(arms, (aw * s, L, 0.075 * s), Mq)
        cone = bmesh.ops.create_cone(arms, cap_ends=True, segments=4, radius1=0.055 * s, radius2=0.0, depth=0.12 * s)
        bmesh.ops.transform(arms, matrix=Matrix.Translation(b_ + d.normalized() * 0.05 * s) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4() @ Matrix.Rotation(math.pi / 4, 4, 'Z'), verts=cone['verts'])
    else:
        arm_into(arms, 0.92, ah, aw, M0 @ T(0, 0, z2) @ Rz)
        for (bx, by) in ((0.43, 0), (-0.43, 0), (0, 0.43), (0, -0.43)): cube_into(blocks, (0.11, 0.11, 0.06), M0 @ T(bx, by, z2 + ah + 0.03))
    bmesh.ops.recalc_face_normals(arms, faces=arms.faces)
    o = bm_obj(name + 'Arms', arms, mat('BracketTeal', '#1f4a4c', 0.6), smooth=False); bevel(o, 0.006)
    o2 = bm_obj(name + 'Blocks', blocks, mat('BlockRed', '#6e1c16', 0.45, coat=0.4), smooth=False); bevel(o2, 0.008)
    return o
for sx in (-1, 1):
    for sy in (-1, 1): dougong(f'Bracket{sx}{sy}', (sx * XC, sy * YC, BH - 0.72), s=0.95)
    dougong(f'PorchBracket{sx}', (sx * 1.5, DC['y'], DC['h'] + 0.12), proj=True, s=0.82)      # on each dragon column, holding up the eave
cf = bmesh.new()                                           # coffers over the side bays
for sx in (-1, 1):
    x0, x1 = sorted((sx * (XC + 0.09), sx * (BW - WT)))
    box_into(cf, (x1 - x0, 2 * (BD - WT) + 0.02, 0.04), Vector(((x0 + x1) / 2, 0, BH + 0.02)))
    for k in range(9):
        y = -BD + WT + (k + 0.5) * 2 * (BD - WT) / 9
        box_into(cf, (x1 - x0, 0.03, 0.06), Vector(((x0 + x1) / 2, y, BH - 0.02)))
bm_obj('Coffers', cf, coffer, smooth=False)

# ---------------------------------------------------------------- clerestory walls: painted band, high lattice windows, plaster
def clere_wall(name, outer, holes, loc, rotz, thick=0.14, m_out=plaster):
    o = outline_curve(name, outer, holes, thick, m_out); o.rotation_euler = (math.pi / 2, 0, rotz); o.location = loc; return o
CW = [(-0.98, 2.62, 0.4, 0.4), (0.0, 2.62, 0.56, 0.4), (0.98, 2.62, 0.4, 0.4)]
clere_wall('ClereBack', rect(-XC - 0.07, BH, XC + 0.07, ZC2 + 0.02), [rect(cx - w / 2, cz - h / 2, cx + w / 2, cz + h / 2) for (cx, cz, w, h) in CW], (0, YC + 0.07, 0), 0)
for sx in (-1, 1):
    y0_, y1_ = -YC - 0.07, YC + 0.07       # it stands on the beam, not on the floor: the side bays stay open to the hall
    clere_wall(f'ClereSide{sx}', [(y0_, BH - 0.02), (y1_, BH - 0.02), (y1_, ZC2 + 0.02), (0.0, UP['zr'] - 0.06), (y0_, ZC2 + 0.02)], [], (sx * (XC + 0.0), 0, 0), math.pi / 2)
    uvplane(f'ClereSideBand{sx}', 2 * YC + 0.14, 0.26, (sx * (XC + 0.073), 0, ZC2 - 0.2), beamM, rot=(0, 0, sx * math.pi / 2))
uvplane('ClereBackBand', 2 * XC + 0.14, 0.2, (0, YC - 0.003, ZC2 - 0.2), beamM)
for (cx, cz, w, h) in CW:
    uvplane(f'ClereWinPaper{cx}', w, h, (cx, YC + 0.12, cz), paperCool)
# the high windows' lattice is built with the others below

# ---------------------------------------------------------------- 八仙彩 across the top of the opening, hung in three shallow swags like the tent's valance
def banner_mat():
    if 'Baxian' in MATS: return MATS['Baxian']
    m = bpy.data.materials.new('Baxian'); m.use_nodes = True; N, L = nodes(m); p = principled(m)
    im = N.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(TEX + 'shrine_baxian.png', check_existing=True); im.interpolation = 'Cubic'
    L.new(im.outputs['Color'], p.inputs['Base Color']); L.new(im.outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = 0.35
    p.inputs['Roughness'].default_value = 0.7; p.inputs['Sheen Weight'].default_value = 0.6
    MATS['Baxian'] = m; return m
BX0, BX1, BZ, BY_ = -XC + 0.05, XC - 0.05, 3.56, -YC - 0.09
bb_ = bmesh.new(); uvl = bb_.loops.layers.uv.new(); NX, NZ = 90, 10; grid = []
for i in range(NX + 1):
    u = i / NX; x = BX0 + (BX1 - BX0) * u; sag = 0.07 * abs(math.sin(u * math.pi * 3)) ** 0.0 * math.sin(u * math.pi * 3) ** 2; row = []
    for j in range(NZ + 1):
        v = j / NZ; z = BZ - sag * (1 - v * 0.3) - (1 - v) * 0.42
        y = BY_ - 0.03 * math.sin(u * math.pi * 3) ** 2 * (1 - v) - 0.012 * math.sin(u * math.pi * 40) * (1 - v)
        row.append(bb_.verts.new((x, y, z)))
    grid.append(row)
for i in range(NX):
    for j in range(NZ):
        f = bb_.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
        for l, uv in zip(f.loops, [(i / NX, j / NZ), ((i + 1) / NX, j / NZ), ((i + 1) / NX, (j + 1) / NZ), (i / NX, (j + 1) / NZ)]): l[uvl].uv = uv
bm_obj('Baxian', bb_, banner_mat())
tube('BaxianRod', [(BX0 - 0.04, BY_ + 0.01, BZ + 0.01), (BX1 + 0.04, BY_ + 0.01, BZ + 0.01)], 0.02, gold, poly=True)
for sx in (-1, 1): sphere(f'BaxianKnob{sx}', 0.035, (sx * (XC - 0.01), BY_ + 0.01, BZ + 0.01), gold)

# ---------------------------------------------------------------- the plaque: 心安 on black lacquer in a carved gold frame
PQ = dict(w=1.2, h=0.36, z=2.15, y=YC - 0.13)      # hung in front of the beam, over the round window, where the banner never hides it
box('PlaqueBoard', (PQ['w'], 0.05, PQ['h']), (0, PQ['y'] + 0.01, PQ['z']), mat('LacquerBlack', '#140e0c', 0.3, coat=0.8), 0.01)
uvplane('PlaqueFace', PQ['w'] - 0.04, PQ['h'] - 0.04, (0, PQ['y'] - 0.017, PQ['z']), plaqueM)
fb = bmesh.new()
for (cx, cz, w, h) in [(0, PQ['z'] + PQ['h'] / 2 + 0.03, PQ['w'] + 0.16, 0.07), (0, PQ['z'] - PQ['h'] / 2 - 0.03, PQ['w'] + 0.16, 0.07), (-PQ['w'] / 2 - 0.05, PQ['z'], 0.07, PQ['h'] + 0.12), (PQ['w'] / 2 + 0.05, PQ['z'], 0.07, PQ['h'] + 0.12)]:
    box_into(fb, (w, 0.07, h), Vector((cx, PQ['y'] - 0.005, cz)))
o = bm_obj('PlaqueFrame', fb, gold, smooth=False); bevel(o, 0.012, 3)

# ---------------------------------------------------------------- the round window: a carved frame, the moonlit view inside the wall
mf = lathe('MoonFrame', [(MW['r'] - 0.005, -0.04), (MW['r'] - 0.03, 0.03), (MW['r'] - 0.01, 0.065), (MW['r'] + 0.05, 0.075), (MW['r'] + 0.1, 0.06), (MW['r'] + 0.13, 0.03), (MW['r'] + 0.13, 0.0)], (0, IN_Y - 0.004, MW['cz']), teak, 96)
mf.rotation_euler = (math.pi / 2, 0, 0)
tube('MoonFrameGold', [(math.cos(TAU * i / 96) * (MW['r'] + 0.02), IN_Y - 0.075, MW['cz'] + math.sin(TAU * i / 96) * (MW['r'] + 0.02)) for i in range(97)], 0.009, gold, poly=True)
uvdisc('MoonView', MW['r'] + 0.02, (0, BD - 0.04, MW['cz']), moonM)
cyl('MoonReveal', MW['r'], WT + 0.02, (0, BD - WT / 2, MW['cz']), plasterW, 96, rot=(math.pi / 2, 0, 0), cap=False)

for sx, f_ in ((1, 'shrine_couplet_r.jpg'), (-1, 'shrine_couplet_l.jpg')):      # 上联 on the right as you face it
    box(f'CoupletBoard{sx}', (0.26, 0.04, 1.12), (sx * 1.16, IN_Y - 0.02, 1.42), mat('LacquerBlack', '#140e0c', 0.3, coat=0.8), 0.008)
    uvplane(f'Couplet{sx}', 0.22, 1.08, (sx * 1.16, IN_Y - 0.042, 1.42), imgmat('CoupletM' + f_, f_, 0.35))
    for zz in (2.0, 0.84): cyl(f'CoupletKnob{sx}{zz}', 0.018, 0.3, (sx * 1.16, IN_Y - 0.03, zz), gold, 12, rot=(0, math.pi / 2, 0))

# four hanging scrolls on the side walls: plum and orchid on the left, bamboo and chrysanthemum on the right
for k, (sx, y) in enumerate(((-1, -0.88), (-1, 0.9), (1, 0.9), (1, -0.8))):
    x = sx * (BW - WT - 0.012); rz = -sx * math.pi / 2
    uvplane(f'Scroll{k}', 0.3, 0.9, (x, y, 1.5), imgmat(f'ScrollM{k}', f'shrine_scroll{k}.jpg', 0.7, sheen=0.3), rot=(0, 0, rz))
    for zz in (1.955, 1.045): cyl(f'ScrollRod{k}{zz}', 0.012, 0.36, (x - sx * 0.01, y, zz), teak, 10, rot=(math.pi / 2, 0, 0))
    tube(f'ScrollCord{k}', [(x - sx * 0.005, y - 0.13, 1.96), (x - sx * 0.002, y, 2.08), (x - sx * 0.005, y + 0.13, 1.96)], 0.003, mat('Cord', '#3a2a1a', 0.8), poly=True)

# ---------------------------------------------------------------- ice-crack lattice (冰裂纹): random cracks that split cells, as thin wooden bars
def cracks(w, h, n, seed):
    R = random.Random(seed); polys = [[(0, 0), (w, 0), (w, h), (0, h)]]
    def area(p): return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) / 2
    for _ in range(n):
        polys.sort(key=area); p = polys.pop()
        cx = sum(q[0] for q in p) / len(p) + R.uniform(-0.1, 0.1) * w; cy = sum(q[1] for q in p) / len(p) + R.uniform(-0.1, 0.1) * h
        a = R.uniform(0, math.pi); dx, dy = math.cos(a), math.sin(a); A, B = [], []; side = lambda q: (q[0] - cx) * dy - (q[1] - cy) * dx
        for i in range(len(p)):
            q0, q1 = p[i], p[(i + 1) % len(p)]; s0, s1 = side(q0), side(q1)
            (A if s0 >= 0 else B).append(q0)
            if (s0 >= 0) != (s1 >= 0):
                t = s0 / (s0 - s1); x = (q0[0] + (q1[0] - q0[0]) * t, q0[1] + (q1[1] - q0[1]) * t); A.append(x); B.append(x)
        if len(A) >= 3 and len(B) >= 3: polys += [A, B]
        else: polys.append(p)
    segs = set()
    for p in polys:
        for i in range(len(p)):
            a, b = p[i], p[(i + 1) % len(p)]; k = tuple(sorted((tuple(round(c, 4) for c in a), tuple(round(c, 4) for c in b))))
            segs.add(k)
    return list(segs)
def lattice(name, w, h, n, seed, M, bar=0.02, depth=0.03, frame=0.05, m=teak):
    bm = bmesh.new()
    for (a, b) in cracks(w, h, n, seed):
        ax, ay = a[0] - w / 2, a[1] - h / 2; bx, by = b[0] - w / 2, b[1] - h / 2; L = math.hypot(bx - ax, by - ay)
        if L < 1e-3: continue
        ang = math.atan2(by - ay, bx - ax)
        Mb = M @ Matrix.Translation(((ax + bx) / 2, 0, (ay + by) / 2)) @ Matrix.Rotation(-ang, 4, 'Y') @ Matrix.Diagonal((L + bar, depth, bar, 1))
        bmesh.ops.create_cube(bm, size=1.0, matrix=Mb)
    for (cx, cz, ww, hh) in [(0, h / 2, w + frame * 2, frame), (0, -h / 2, w + frame * 2, frame), (-w / 2, 0, frame, h), (w / 2, 0, frame, h)]:
        bmesh.ops.create_cube(bm, size=1.0, matrix=M @ Matrix.Translation((cx, 0, cz)) @ Matrix.Diagonal((ww, depth * 1.4, hh, 1)))
    return bm_obj(name, bm, m, smooth=False)
# right wall window, lit by the moon from outside
lattice('LatticeR', LWIN['w'], LWIN['h'], 34, 51, Matrix.Translation((BW - WT / 2, LWIN['cy'], LWIN['cz'])) @ Matrix.Rotation(math.pi / 2, 4, 'Z'))
uvplane('LatticeRPaper', LWIN['w'], LWIN['h'], (BW - 0.035, LWIN['cy'], LWIN['cz']), paperCool, rot=(0, 0, math.pi / 2)).visible_shadow = False
# seen from outside: a dim pane in a granite frame, warm from the lamps within
uvplane('LatticeROuter', LWIN['w'], LWIN['h'], (BW + 0.004, LWIN['cy'], LWIN['cz']), mat('PaperOut', '#46506a', 0.85, emit='#ffcf90', emit_str=0.35), rot=(0, 0, math.pi / 2)).visible_shadow = False
wf = bmesh.new()
for (dy, dz, ly, lz) in [(0, LWIN['h'] / 2 + 0.05, LWIN['w'] + 0.2, 0.1), (0, -LWIN['h'] / 2 - 0.05, LWIN['w'] + 0.3, 0.12), (LWIN['w'] / 2 + 0.05, 0, 0.1, LWIN['h']), (-LWIN['w'] / 2 - 0.05, 0, 0.1, LWIN['h'])]:
    box_into(wf, (0.05, ly, lz), Vector((BW + 0.025, LWIN['cy'] + dy, LWIN['cz'] + dz)))
o = bm_obj('LatticeRFrame', wf, granite, smooth=False); bevel(o, 0.01)
for (cx, cz, w, h) in CW:
    lattice(f'LatticeHigh{cx}', w, h, 12, 61 + int(cx * 10), Matrix.Translation((cx, YC + 0.07, cz)), bar=0.016, frame=0.035)

# ---------------------------------------------------------------- roofs: curved slopes of pan tiles under rows of tube tiles, upturned corners
def roof_xyz(R, x, s, side):
    """a point on a roof: s = 0 at the ridge, 1 at the eave; side -1 front, +1 back"""
    a = min(1.0, abs(x) / R['hx'])
    zr = R['zr'] + R['rise'] * a ** 2.5; ze = R['ze'] + R['lift'] * a ** 3
    ye = R['ye'] + R['bow'] * a ** 4
    g = 0.84 * (1 - (1 - s) ** 1.65) + 0.16 * s
    return Vector((x, side * ye * s, zr - (zr - ze) * g))
TP = 0.12                                                   # tube tile pitch
def roof(name, R, side, x0, x1, s0, s1, keep=None, tube_r=0.028):
    """pan surface, tube tiles, eave caps; only the cells keep(x, s) allows"""
    nx = max(2, int((x1 - x0) / 0.05)); ns = 26
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); grid = []
    for i in range(nx + 1):
        x = x0 + (x1 - x0) * i / nx; row = []
        for j in range(ns + 1):
            s = s0 + (s1 - s0) * j / ns; p = roof_xyz(R, x, s, side)
            p.z -= 0.012 * (0.5 + 0.5 * math.cos(TAU * (x / TP)))      # the pan channels between tube rows
            row.append(bm.verts.new(p))
        grid.append(row)
    for i in range(nx):
        for j in range(ns):
            xm = x0 + (x1 - x0) * (i + 0.5) / nx; sm = s0 + (s1 - s0) * (j + 0.5) / ns
            if keep and not keep(xm, sm): continue
            f = bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]) if side > 0 else (grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    for v in [v for v in bm.verts if not v.link_faces]: bm.verts.remove(v)
    o = bm_obj(name, bm, tiles, mats=(timber, timber))
    sm_ = o.modifiers.new('solid', 'SOLIDIFY'); sm_.thickness = 0.06; sm_.offset = -1; sm_.material_offset = 1; sm_.material_offset_rim = 2
    # tube tiles on the ridges between channels, with round end caps and drip tiles at the eave
    tb = bmesh.new(); k0 = math.ceil(x0 / TP - 0.5); k1 = math.floor(x1 / TP - 0.5)
    caps = bmesh.new()
    for k in range(k0, k1 + 1):
        x = (k + 0.5) * TP
        if x - tube_r < x0 or x + tube_r > x1: continue
        ss = [s0 + (s1 - s0) * j / 24 for j in range(25)]
        ss = [s for s in ss if not keep or keep(x, s)]
        if len(ss) < 2: continue
        path = [roof_xyz(R, x, s, side) + Vector((0, 0, 0.004)) for s in ss]
        fr = frames(path, Vector((0, 0, 1)))
        rings = []
        for i, p in enumerate(path):
            T, S, U = fr[i]; rings.append([tb.verts.new(p + S * math.cos(a) * tube_r + U * math.sin(a) * tube_r * 0.9) for a in [math.pi * q / 6 for q in range(7)]])
        for i in range(len(rings) - 1):
            for q in range(6): tb.faces.new((rings[i][q], rings[i + 1][q], rings[i + 1][q + 1], rings[i][q + 1]))
        if ss[-1] >= 0.999:                               # eave end cap and a drip tile beside it
            T, S, U = fr[-1]; e = path[-1]
            bmesh.ops.create_cone(caps, cap_ends=True, segments=14, radius1=tube_r * 1.12, radius2=tube_r * 1.12, depth=0.016,
                                  matrix=Matrix.Translation(e + T * 0.006) @ Matrix((S, U, T)).transposed().to_4x4())
            d0 = roof_xyz(R, x + TP / 2, 1.0, side); dz = Vector((0, 0, -0.035)); w = TP * 0.36
            v = [caps.verts.new(d0 + Vector((-w, 0, 0)) - T * 0.0), caps.verts.new(d0 + Vector((w, 0, 0))), caps.verts.new(d0 + dz + T * 0.02)]
            try: caps.faces.new(v)
            except ValueError: pass
    bm_obj(name + 'Tubes', tb, tiles)
    bm_obj(name + 'Caps', caps, tilesD, smooth=False)
    # rafters under the slope, seen from inside and at the cut
    rb = bmesh.new()
    for k in range(int(x0 / 0.22), int(x1 / 0.22) + 1):
        x = k * 0.22
        if x < x0 + 0.04 or x > x1 - 0.04: continue
        ss = [s0 + (s1 - s0) * j / 10 for j in range(11)]; ss = [s for s in ss if not keep or keep(x, s)]
        if len(ss) < 2: continue
        for a_, b_ in zip(ss, ss[1:]):
            p, q = roof_xyz(R, x, a_, side) - Vector((0, 0, 0.09)), roof_xyz(R, x, b_, side) - Vector((0, 0, 0.09))
            c = (p + q) / 2; L = (q - p).length; ang = math.atan2(q.z - p.z, q.y - p.y)
            bmesh.ops.create_cube(rb, size=1.0, matrix=Matrix.Translation(c) @ Matrix.Rotation(ang, 4, 'X') @ Matrix.Diagonal((0.05, L + 0.002, 0.06, 1)))
    bm_obj(name + 'Rafters', rb, timber, smooth=False)
    return o

def s_at(R, y):
    """the roof parameter where a slope passes over a given distance from the ridge"""
    lo, hi = 0.0, 1.0
    for _ in range(30):
        m = (lo + hi) / 2; (lo, hi) = (m, hi) if roof_xyz(R, 0.0, m, 1).y < y else (lo, m)
    return (lo + hi) / 2

# lower roof: the back slope all along; in the middle it starts where the clerestory wall stands
sYC = s_at(LO, YC)
roof('RoofLowBack', LO, 1, -LO['hx'], LO['hx'], 0.0, 1.0, keep=lambda x, s: abs(x) > XC or s >= sYC - 0.02)
for sx in (-1, 1):                                          # the outer bays keep their front slope
    x0, x1 = sorted((sx * XC, sx * LO['hx']))
    roof(f'RoofLowFront{sx}', LO, -1, x0, x1, 0.0, 1.0)
# upper roof: the back slope, and a strip under the ridge at the front
roof('RoofUpBack', UP, 1, -UP['hx'], UP['hx'], 0.0, 1.0)
roof('RoofUpFront', UP, -1, -UP['hx'], UP['hx'], 0.0, 1.0)
# barge rolls along the gable edges
for R_, nm, spans in ((LO, 'Low', [(-1, (0.0, 1.0)), (1, (0.0, 1.0))]), (UP, 'Up', [(1, (0.0, 1.0)), (-1, (0.0, 1.0))])):
    for sx in (-1, 1):
        for side, (a_, b_) in spans:
            pts = [roof_xyz(R_, sx * R_['hx'], a_ + (b_ - a_) * j / 16, side) + Vector((0, 0, 0.03)) for j in range(17)]
            sweep(f'Barge{nm}{sx}{side}', pts, [(-0.05, 0), (-0.05, 0.05), (0, 0.075), (0.05, 0.05), (0.05, 0)], tiles, cap=True)

# ---------------------------------------------------------------- swallowtail ridges
def ridge(name, R, x_in, x_out, h=0.3, t=0.18, tail=0.55, rise=0.62, splay=0.2, band=True, both=True):
    """a ridge band from x_in to x_out (x_out > 0 side), curving up, then forking into two tails that rise and splay"""
    def zr(x): return R['zr'] + R['rise'] * min(1.0, abs(x) / R['hx']) ** 2.5 + 0.02
    prof = [(-t / 2, 0), (-t / 2, h * 0.88), (-t * 0.3, h), (t * 0.3, h), (t / 2, h * 0.88), (t / 2, 0)]
    segm = [1, 2, 2, 2, 1, 2]                                 # front and back faces carry the porcelain band
    for sx in ((-1, 1) if both else (1,)):
        xs = [x_in + (x_out - x_in) * i / 30 for i in range(31)]
        path = [Vector((sx * x, 0, zr(x))) for x in xs]
        if sx < 0: path = path[::-1]
        sweep(f'{name}Band{sx}', path, prof, plasterW, mats=(ridgeM, tiles), seg_mat=segm)
        e = Vector((sx * x_out, 0, zr(x_out)))
        for fy in (-1, 1):                                     # the two tails
            tp = []
            for i in range(16):
                q = i / 15
                tp.append(e + Vector((sx * tail * (q ** 0.8), fy * splay * q ** 2.2, rise * q ** 2.4 + 0.0)))
            sweep(f'{name}Tail{sx}{fy}', tp, [(-t * 0.25, 0), (-t * 0.25, h * 0.8), (0, h), (t * 0.25, h * 0.8), (t * 0.25, 0)], tiles,
                  scale=lambda q: (1 - 0.75 * q, 1 - 0.8 * q), cap=True)
    return zr
zr_up = ridge('RidgeUp', UP, 0.0, UP['hx'] + 0.05, h=0.34, t=0.2, tail=0.6, rise=0.75, splay=0.22)
zr_lo = ridge('RidgeLow', LO, XC + 0.05, LO['hx'] + 0.05, h=0.22, t=0.15, tail=0.42, rise=0.48, splay=0.15)

# ---------------------------------------------------------------- two cut-porcelain dragons chasing the flaming pearl on the top ridge
RT = UP['zr'] + 0.02 + 0.34                                   # top of the ridge band at the centre
for sx in (-1, 1):
    pts = []
    for i in range(48):
        t = i / 47; x = sx * (0.3 + t * 1.32); z = RT + 0.14 + 0.13 * math.sin(t * 9.0 + 0.6) * (1 - 0.5 * t) + 0.08 * (1 - t)
        pts.append((x, 0.02 * math.sin(t * 13), z))
    dragon(f'RidgeDragon{sx}', pts, 0.07, porcelain, porcelain, porcelainY, porcelainY, legs=(0.25, 0.62))
    for lt in (0.25, 0.62):                                    # posts that hold the body up off the ridge
        i = int(lt * 47); p = Vector(pts[i])
        cyl(f'RidgeDragonPost{sx}{lt}', 0.022, p.z - RT, (p.x, 0, (p.z + RT) / 2), porcelain, 8)
sphere('Pearl', 0.11, (0, 0, RT + 0.3), glowPearl, segs=32, rings=20)
fl_pts = []
for i in range(25):
    a = math.pi * (0.1 + 0.8 * i / 24); r = 0.17 + 0.05 * math.sin(i * 1.7) ** 2
    fl_pts.append((math.cos(a) * r, math.sin(a) * r * 1.25))
o = outline_curve('PearlFlames', [(0.15, -0.02)] + [(math.cos(-0.3 + 3.74 * i / 24) * (0.16 + 0.06 * (i % 2)), math.sin(-0.3 + 3.74 * i / 24) * (0.16 + 0.06 * (i % 2)) * 1.2) for i in range(25)] + [(-0.15, -0.02)], [], 0.02, porcelainY)
o.location = (0, 0.02, RT + 0.3); o.rotation_euler = (math.pi / 2, 0, 0)
lathe('PearlCloud', [(0, 0), (0.12, 0), (0.15, 0.04), (0.1, 0.09), (0.04, 0.1), (0, 0.1)], (0, 0, RT - 0.01), porcelain, 24)
point_light('PearlLight', (0, -0.3, RT + 0.3), 12, (1.0, 0.8, 0.45), 0.08)

# ---------------------------------------------------------------- the long altar table against the back wall, with candles and plum vases
def table_long(name, cx, cy, w, d, h, m):
    bm = bmesh.new()
    box_into(bm, (w, d, 0.05), Vector((cx, cy, h - 0.025)))
    for s in (-1, 1):                                          # upturned ends
        box_into(bm, (0.1, d, 0.05), Vector((cx + s * (w / 2 - 0.05), cy, h + 0.01)))
        box_into(bm, (0.06, d * 0.98, 0.06), Vector((cx + s * (w / 2 + 0.01), cy, h + 0.04)))
        for sy in (-1, 1): box_into(bm, (0.06, 0.06, h - 0.05), Vector((cx + s * (w / 2 - 0.16), cy + sy * (d / 2 - 0.05), (h - 0.05) / 2)))
        box_into(bm, (0.04, d - 0.1, 0.2), Vector((cx + s * (w / 2 - 0.16), cy, h * 0.42)))
    box_into(bm, (w - 0.3, 0.025, 0.12), Vector((cx, cy - d / 2 + 0.02, h - 0.11)))      # apron
    o = bm_obj(name, bm, m, smooth=False); bevel(o, 0.006); return o
AT = dict(y=IN_Y - 0.3, w=1.9, d=0.4, h=0.92)
table_long('AltarTable', 0, AT['y'], AT['w'], AT['d'], AT['h'], teak)
def candle(name, x, y, z):
    lathe(name + 'Stick', [(0, 0), (0.07, 0), (0.07, 0.015), (0.025, 0.04), (0.02, 0.18), (0.05, 0.2), (0.055, 0.215), (0.02, 0.22), (0, 0.22)], (x, y, z), pewter, 24)
    cyl(name + 'Wax', 0.028, 0.2, (x, y, z + 0.32), wax, 20)
    sphere(name + 'Flame', 0.016, (x, y, z + 0.45), flameM, scale=(1, 1, 2.0), segs=12, rings=8)
    point_light(name + 'Light', (x, y - 0.05, z + 0.48), 5, (1.0, 0.68, 0.36), 0.02)
for s in (-1, 1): candle(f'Candle{s}', s * 0.62, AT['y'], AT['h'])

def plum3d(name, base, ang, L, seed, w=0.012):
    R = random.Random(seed); bm = bmesh.new(); bl = []
    def br(p, d, L, w, depth):
        if depth == 0: return
        pts = [p]
        for k in range(3):
            d = (d + Vector((R.uniform(-0.5, 0.5), R.uniform(-0.5, 0.5), R.uniform(-0.1, 0.4)))).normalized(); p = p + d * L / 3; pts.append(p)
            if R.random() < 0.8: bl.append(p + Vector((R.uniform(-0.02, 0.02), R.uniform(-0.02, 0.02), R.uniform(-0.01, 0.02))))
        tube(f'{name}Br{len(bl)}{depth}', [tuple(q) for q in pts], w, twig, res=3, poly=True)
        for _ in range(R.randint(2, 3)): br(p, d + Vector((R.uniform(-0.8, 0.8), R.uniform(-0.8, 0.8), 0.3)), L * 0.6, w * 0.7, depth - 1)
        for q in pts[1:]:
            for _ in range(2): bl.append(q + Vector((R.uniform(-0.03, 0.03), R.uniform(-0.03, 0.03), R.uniform(-0.02, 0.03))))
    br(Vector(base), Vector(ang).normalized(), L, w, 3)
    fb_ = bmesh.new(); hb = bmesh.new()
    for p in bl:
        for k in range(5):
            a = TAU * k / 5 + R.random(); q = p + Vector((math.cos(a) * 0.015, math.sin(a) * 0.015, 0))
            bmesh.ops.create_uvsphere(fb_, u_segments=6, v_segments=4, radius=0.014, matrix=Matrix.Translation(q) @ Matrix.Rotation(R.uniform(-0.8, 0.8), 4, 'X') @ Matrix.Diagonal((1, 1, 0.45, 1)))
        bmesh.ops.create_uvsphere(hb, u_segments=6, v_segments=4, radius=0.007, matrix=Matrix.Translation(p + Vector((0, 0, 0.004))))
    bm_obj(name + 'Blossom', fb_, blossom); bm_obj(name + 'Heart', hb, blossomC)
for s in (-1, 1):                                              # plum vases on the altar
    x = s * 0.3
    lathe(f'Vase{s}', [(0, 0), (0.05, 0), (0.07, 0.04), (0.09, 0.14), (0.085, 0.2), (0.05, 0.26), (0.03, 0.3), (0.04, 0.32), (0.03, 0.33), (0, 0.33)], (x, AT['y'] + 0.02, AT['h']), blueWhite, 32)
    plum3d(f'Plum{s}', (x, AT['y'] + 0.02, AT['h'] + 0.3), (s * 0.6, -0.2, 1.0), 0.5, 70 + s)
# a small lamp that never goes out, on the altar's centre
lathe('EverLamp', [(0, 0), (0.06, 0), (0.07, 0.03), (0.03, 0.06), (0.03, 0.12), (0.08, 0.14), (0.09, 0.17), (0, 0.15)], (0, AT['y'], AT['h']), brass, 28)
sphere('EverLampFlame', 0.012, (0, AT['y'], AT['h'] + 0.185), flameM, scale=(1, 1, 1.8), segs=10, rings=6)
point_light('EverLampLight', (0, AT['y'] - 0.06, AT['h'] + 0.2), 3, (1.0, 0.7, 0.4), 0.02)

# ---------------------------------------------------------------- the offering table: frontal, incense burner, fortune sticks, room for the moon blocks
OT = dict(x=0.0, y=-0.05, w=0.92, d=0.78, h=0.82)
tb_ = bmesh.new()
box_into(tb_, (OT['w'], OT['d'], 0.05), Vector((OT['x'], OT['y'], OT['h'] - 0.025)))
for sx in (-1, 1):
    for sy in (-1, 1): box_into(tb_, (0.06, 0.06, OT['h'] - 0.05), Vector((OT['x'] + sx * (OT['w'] / 2 - 0.05), OT['y'] + sy * (OT['d'] / 2 - 0.05), (OT['h'] - 0.05) / 2)))
box_into(tb_, (OT['w'] - 0.06, OT['d'] - 0.06, 0.08), Vector((OT['x'], OT['y'], OT['h'] - 0.09)))
o = bm_obj('OfferTable', tb_, teak, smooth=False); bevel(o, 0.006)
# the frontal hangs from the front edge in soft folds
fr_b = bmesh.new(); uvl = fr_b.loops.layers.uv.new(); NX, NZ = 40, 16; g_ = []
for i in range(NX + 1):
    u = i / NX; row = []
    for j in range(NZ + 1):
        v = j / NZ; x = OT['x'] - OT['w'] / 2 - 0.01 + u * (OT['w'] + 0.02); z = OT['h'] - 0.005 - (1 - v) * (OT['h'] - 0.05)
        y = OT['y'] - OT['d'] / 2 - 0.012 - 0.012 * math.sin(u * math.pi * 7) * (1 - v) ** 1.5 - 0.02 * (1 - v) ** 2
        row.append(fr_b.verts.new((x, y, z)))
    g_.append(row)
for i in range(NX):
    for j in range(NZ):
        f = fr_b.faces.new((g_[i][j], g_[i + 1][j], g_[i + 1][j + 1], g_[i][j + 1]))
        for l, uv in zip(f.loops, [(i / NX, j / NZ), ((i + 1) / NX, j / NZ), ((i + 1) / NX, (j + 1) / NZ), (i / NX, (j + 1) / NZ)]): l[uvl].uv = uv
bm_obj('Frontal', fr_b, frontalM)
TT = OT['h']
# incense burner: a bronze ding on three legs with two loop handles, ash, three sticks with glowing tips
BX, BY = OT['x'] + 0.04, OT['y'] + 0.14
lathe('Burner', [(0, 0.05), (0.1, 0.05), (0.15, 0.07), (0.18, 0.11), (0.19, 0.16), (0.175, 0.2), (0.17, 0.215), (0.205, 0.225), (0.21, 0.24), (0.165, 0.24), (0.16, 0.22), (0, 0.21)], (BX, BY, TT), bronze, 48)
for zz, rr in ((0.115, 0.183), (0.185, 0.18)): tube(f'BurnerBand{zz}', [(BX + math.cos(TAU * i / 48) * rr, BY + math.sin(TAU * i / 48) * rr, TT + zz) for i in range(49)], 0.006, gold, poly=True)
cyl('BurnerAsh', 0.163, 0.01, (BX, BY, TT + 0.225), mat('Ash', '#8a8278', 0.95), 32)
for k in range(3):
    a = TAU * k / 3 + math.pi / 2
    tube(f'BurnerLeg{k}', [(BX + math.cos(a) * 0.12, BY + math.sin(a) * 0.12, TT + 0.07), (BX + math.cos(a) * 0.15, BY + math.sin(a) * 0.15, TT + 0.03), (BX + math.cos(a) * 0.15, BY + math.sin(a) * 0.15, TT)], 0.018, bronze, res=4)
for s in (-1, 1):                                              # upright ears standing on the rim
    tube(f'BurnerEar{s}', [(BX + s * 0.17, BY - 0.045, TT + 0.235), (BX + s * 0.175, BY - 0.045, TT + 0.33), (BX + s * 0.175, BY + 0.045, TT + 0.33), (BX + s * 0.17, BY + 0.045, TT + 0.235)], 0.012, bronze, poly=True)
for k, (dx, dy, tilt) in enumerate([(-0.03, 0.0, -0.08), (0.0, 0.01, 0.0), (0.03, -0.005, 0.07)]):
    base = Vector((BX + dx, BY + dy, TT + 0.23)); top = base + Vector((tilt * 0.3, 0, 0.3))
    tube(f'Incense{k}', [tuple(base), tuple(top)], 0.0035, incense, poly=True)
    sphere(f'IncenseTip{k}', 0.006, tuple(top + Vector((0, 0, 0.004))), emberM, segs=8, rings=6)
# fortune sticks in a bamboo cup
SX_, SY_ = OT['x'] - 0.3, OT['y'] + 0.16
lathe('StickCup', [(0, 0), (0.07, 0), (0.072, 0.01), (0.068, 0.24), (0.074, 0.25), (0.064, 0.25), (0.06, 0.03), (0, 0.03)], (SX_, SY_, TT), mat('Bamboo', '#c8a868', 0.5, coat=0.4), 32)
for zz in (0.06, 0.15, 0.22): cyl(f'StickCupBand{zz}', 0.073, 0.012, (SX_, SY_, TT + zz), mat('BambooBand', '#8a6a30', 0.5), 32)
R7 = random.Random(9); sb_ = bmesh.new(); st_tips = bmesh.new()
for k in range(34):
    a = R7.uniform(0, TAU); r = R7.uniform(0, 0.045); tl = Vector((math.cos(a) * r * 0.9, math.sin(a) * r * 0.9, 0)) * 0.9
    b0 = Vector((SX_ + math.cos(a) * r * 0.5, SY_ + math.sin(a) * r * 0.5, TT + 0.04)); h = R7.uniform(0.3, 0.36); t0 = b0 + Vector((tl.x, tl.y, h))
    d = (t0 - b0); L = d.length; M = Matrix.Translation((b0 + t0) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.create_cube(sb_, size=1.0, matrix=M @ Matrix.Diagonal((0.008, 0.003, L, 1)))
    bmesh.ops.create_cube(st_tips, size=1.0, matrix=Matrix.Translation(t0 - d.normalized() * 0.02) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4() @ Matrix.Diagonal((0.0085, 0.0035, 0.04, 1)))
bm_obj('Sticks', sb_, mat('StickWood', '#d8b880', 0.6), smooth=False); bm_obj('StickTips', st_tips, wax, smooth=False)
# a small red cloth where the moon blocks rest (the blocks themselves are drawn live)
JB = Vector((OT['x'], OT['y'] - 0.2, TT + 0.004))
box('BeiCloth', (0.46, 0.26, 0.006), tuple(JB), redSilk, 0.002)
tube('BeiClothTrim', [(JB.x - 0.23, JB.y - 0.13, TT + 0.008), (JB.x + 0.23, JB.y - 0.13, TT + 0.008), (JB.x + 0.23, JB.y + 0.13, TT + 0.008), (JB.x - 0.23, JB.y + 0.13, TT + 0.008), (JB.x - 0.23, JB.y - 0.13, TT + 0.008)], 0.004, gold, poly=True)
# a plate of oranges
PL = (-0.82, AT['y'] - 0.02, AT['h'])
lathe('Plate', [(0, 0), (0.06, 0), (0.12, 0.02), (0.13, 0.03), (0, 0.012)], PL, blueWhite, 32)
for k, (dx, dy, dz) in enumerate([(-0.035, 0.0, 0.05), (0.035, 0.01, 0.05), (0.0, -0.03, 0.05), (0.0, 0.0, 0.1)]):
    sphere(f'Orange{k}', 0.042, (PL[0] + dx, PL[1] + dy, PL[2] + dz), orange, scale=(1, 1, 0.92), segs=18, rings=12)

# ---------------------------------------------------------------- kneeling cushions of woven straw
for s in (-1, 1):
    lathe(f'Cushion{s}', [(0, 0), (0.2, 0), (0.24, 0.03), (0.25, 0.07), (0.23, 0.11), (0.18, 0.125), (0, 0.13)], (s * 0.3, -0.72, 0.03), straw, 40)
    for k, r in enumerate((0.08, 0.14, 0.2)): tube(f'CushionRing{s}{k}', [(s * 0.3 + math.cos(TAU * i / 48) * r, -0.72 + math.sin(TAU * i / 48) * r, 0.03 + 0.128 - 0.01 * k) for i in range(49)], 0.006, wood_mat('StrawDark', '#9a7038', '#6a4a20', 3, 0.2, 'z'), poly=True)

# ---------------------------------------------------------------- left wall: sixty drawers of fortune slips
CB = dict(x=-(BW - WT) + 0.2, y=0.05, w=1.32, h=1.62, d=0.36)
box('SlipCabinet', (CB['d'], CB['w'] + 0.06, CB['h']), (CB['x'], CB['y'], CB['h'] / 2 + 0.12), teak, 0.01)
box('SlipCabinetTop', (CB['d'] + 0.06, CB['w'] + 0.14, 0.06), (CB['x'], CB['y'], CB['h'] + 0.15), teak, 0.012)
uvplane('SlipDrawers', CB['w'], CB['h'] * 0.92, (CB['x'] + CB['d'] / 2 + 0.003, CB['y'], CB['h'] / 2 + 0.12), drawerM, rot=(0, 0, math.pi / 2))
kb = bmesh.new()
for r in range(6):
    for c in range(10):
        y = CB['y'] + CB['w'] / 2 - (c + 0.5) * CB['w'] / 10; z = 0.12 + CB['h'] * 0.04 + CB['h'] * 0.92 * (1 - (r + 0.5) / 6) - 0.045
        bmesh.ops.create_uvsphere(kb, u_segments=8, v_segments=6, radius=0.012, matrix=Matrix.Translation((CB['x'] + CB['d'] / 2 + 0.015, y, z)))
bm_obj('SlipKnobs', kb, brass)
# a slip box and a stack of slips on top
box('SlipBox', (0.22, 0.32, 0.1), (CB['x'], CB['y'] + 0.25, CB['h'] + 0.23), redSilk, 0.008)
lathe('SlipJar', [(0, 0), (0.07, 0), (0.09, 0.08), (0.08, 0.16), (0.05, 0.2), (0.055, 0.22), (0, 0.22)], (CB['x'], CB['y'] - 0.3, CB['h'] + 0.18), blueWhite, 28)

# ---------------------------------------------------------------- right wall: under the ice-crack window, a tall stand with a blue-and-white vase of plum
SD = dict(x=(BW - WT) - 0.24, y=LWIN['cy'])
sb2 = bmesh.new()
box_into(sb2, (0.34, 0.34, 0.04), Vector((SD['x'], SD['y'], 0.78)))
for sx in (-1, 1):
    for sy in (-1, 1): box_into(sb2, (0.035, 0.035, 0.78), Vector((SD['x'] + sx * 0.14, SD['y'] + sy * 0.14, 0.39)))
box_into(sb2, (0.3, 0.3, 0.025), Vector((SD['x'], SD['y'], 0.12)))
o = bm_obj('VaseStand', sb2, teak, smooth=False); bevel(o, 0.005)
lathe('BigVase', [(0, 0), (0.08, 0), (0.1, 0.03), (0.14, 0.14), (0.15, 0.24), (0.11, 0.34), (0.06, 0.4), (0.05, 0.46), (0.07, 0.48), (0, 0.48)], (SD['x'], SD['y'], 0.8), blueWhite, 40)
plum3d('PlumBig', (SD['x'], SD['y'], 1.26), (-0.4, -0.3, 1.0), 0.8, 90, 0.016)
plum3d('PlumBig2', (SD['x'], SD['y'], 1.26), (-0.2, 0.5, 0.9), 0.6, 91, 0.012)

# ---------------------------------------------------------------- palace lanterns under the clerestory beams, porch lanterns, hanging incense coils
def palace_lantern(name, x, y, z, s=1.0):
    r = 0.2 * s; h = 0.36 * s; bm = bmesh.new(); ub = bmesh.new(); uvl = ub.loops.layers.uv.new()
    for k in range(6):                                         # silk panels
        a0, a1 = TAU * k / 6, TAU * (k + 1) / 6
        v = [ub.verts.new((x + math.cos(a0) * r, y + math.sin(a0) * r, z - h / 2)), ub.verts.new((x + math.cos(a1) * r, y + math.sin(a1) * r, z - h / 2)),
             ub.verts.new((x + math.cos(a1) * r, y + math.sin(a1) * r, z + h / 2)), ub.verts.new((x + math.cos(a0) * r, y + math.sin(a0) * r, z + h / 2))]
        f = ub.faces.new(v)
        for l, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): l[uvl].uv = uv
    bm_obj(name + 'Silk', ub, silkM, smooth=False).visible_shadow = False
    for k in range(6):                                         # frame posts with little curled corner pieces
        a = TAU * k / 6; px, py = x + math.cos(a) * (r + 0.012), y + math.sin(a) * (r + 0.012)
        box_into(bm, (0.026 * s, 0.026 * s, h + 0.06 * s), Vector((px, py, z)))
        tube(f'{name}Curl{k}', [(px, py, z + h / 2 + 0.03 * s), (x + math.cos(a) * (r + 0.1 * s), y + math.sin(a) * (r + 0.1 * s), z + h / 2 + 0.08 * s), (x + math.cos(a) * (r + 0.13 * s), y + math.sin(a) * (r + 0.13 * s), z + h / 2 + 0.02 * s)], 0.011 * s, gold, res=4)
        tube(f'{name}Tassel{k}', [(x + math.cos(a) * (r + 0.13 * s), y + math.sin(a) * (r + 0.13 * s), z + h / 2 + 0.02 * s), (x + math.cos(a) * (r + 0.13 * s), y + math.sin(a) * (r + 0.13 * s), z - h * 0.2)], 0.012 * s, tasselM, poly=True)
    for zz, rr in ((z + h / 2 + 0.03 * s, r + 0.04 * s), (z - h / 2 - 0.03 * s, r + 0.03 * s)):
        bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=rr, radius2=rr, depth=0.06 * s, matrix=Matrix.Translation((x, y, zz)) @ Matrix.Rotation(0, 4, 'Z'))
    bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r * 0.7, radius2=r * 0.25, depth=0.1 * s, matrix=Matrix.Translation((x, y, z + h / 2 + 0.11 * s)))
    o = bm_obj(name + 'Frame', bm, teakV, smooth=False)
    tube(name + 'TasselBottom', [(x, y, z - h / 2 - 0.06 * s), (x, y, z - h / 2 - 0.3 * s)], 0.025 * s, tasselM, poly=True)
    point_light(name + 'Light', (x, y, z), 34 * s, (1.0, 0.66, 0.38), 0.1)
    return o
for s in (-1, 1):
    palace_lantern(f'Palace{s}', s * 0.82, 0.25, 2.02)
    tube(f'PalaceCord{s}', [(s * 0.82, 0.25, 2.3), (s * 0.82, 0.25, 3.3)], 0.006, mat('Cord', '#3a2a1a', 0.8), poly=True)

def round_lantern(name, x, y, z, m, s=1.0):
    prof = [(0.02, -0.22), (0.12, -0.2), (0.2, -0.13), (0.23, 0.0), (0.2, 0.13), (0.12, 0.2), (0.02, 0.22)]
    o = lathe(name, [(r * s, h * s) for (r, h) in prof], (x, y, z), m, 36, uv=True); o.rotation_euler = (0, 0, math.pi); o.visible_shadow = False
    for zz in (0.21, -0.21): cyl(f'{name}Cap{zz}', 0.08 * s, 0.04 * s, (x, y, z + zz * s), mat('LanternCap', '#2a1a10', 0.5), 20)
    tube(name + 'Tassel', [(x, y, z - 0.24 * s), (x, y, z - 0.5 * s)], 0.03 * s, tasselM, poly=True)
    point_light(name + 'Light', (x, y, z), 18 * s, (1.0, 0.45, 0.3), 0.12)
for sx, m in ((-1, fuM), (1, anM)):
    x = sx * 2.06; y = -LO['ye'] + 0.18; z = 1.72
    round_lantern(f'PorchLantern{sx}', x, y, z, m, 0.9)
    tube(f'PorchCord{sx}', [(x, y, z + 0.22), (x, y, LO['ze'] + 0.06)], 0.006, mat('Cord', '#3a2a1a', 0.8), poly=True)

def coil(name, x, y, ztop, turns=7, r0=0.04, r1=0.26, drop=0.22):
    pts = []
    for i in range(turns * 24 + 1):
        t = i / (turns * 24); a = t * turns * TAU; r = r0 + (r1 - r0) * t
        pts.append((x + math.cos(a) * r, y + math.sin(a) * r, ztop - drop * t))
    tube(name, pts, 0.006, incense, res=2, poly=True)
    sphere(name + 'Ember', 0.009, pts[-1], emberM, segs=8, rings=6)
    for k in range(3):                                         # hanging threads
        a = TAU * k / 3; tube(f'{name}Thread{k}', [(x + math.cos(a) * r1, y + math.sin(a) * r1, ztop - drop), (x, y, ztop + 0.25)], 0.002, mat('Cord', '#3a2a1a', 0.8), poly=True)
    tube(name + 'Hanger', [(x, y, ztop + 0.25), (x, y, ztop + 0.7)], 0.003, mat('Cord', '#3a2a1a', 0.8), poly=True)
    return pts[-1]
coil_tips = [coil('CoilL', -0.5, -0.35, 3.1), coil('CoilR', 0.52, -0.2, 3.15, 8, 0.04, 0.28, 0.25)]      # high, in front of the clerestory windows

# ---------------------------------------------------------------- stone lions: the male with his embroidered ball on the right as you face the hall, the female with a cub
lionStone = stone_mat('LionStone', '#cfc8b8', '#a9a192', scale=45, rough=0.6, bump=0.3, speck='#4a4640', speck_amt=0.06)
def ell_into(bm, c, sz, M=Matrix.Identity(4), segs=14, rings=10):
    v = bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)['verts']
    bmesh.ops.transform(bm, matrix=M @ Matrix.Translation(c) @ Matrix.Diagonal((sz[0], sz[1], sz[2], 1.0)), verts=v)
def lion(name, x, y, turn, male, z=0.0):
    M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(turn, 4, 'Z') @ Matrix.Scale(1.15, 4); bm = bmesh.new(); dk = bmesh.new()
    box_into(bm, (0.44, 0.58, 0.24), Vector((0, 0, 0.12)))
    box_into(bm, (0.5, 0.64, 0.05), Vector((0, 0, 0.265))); box_into(bm, (0.5, 0.64, 0.05), Vector((0, 0, 0.025)))
    z = 0.29; side = 1 if male else -1
    ell_into(bm, Vector((0, 0.09, z + 0.15)), (0.16, 0.19, 0.16))                    # haunches
    ell_into(bm, Vector((0, -0.03, z + 0.3)), (0.14, 0.13, 0.19))                     # chest
    for sx in (-1, 1):
        ell_into(bm, Vector((sx * 0.14, 0.07, z + 0.09)), (0.06, 0.13, 0.09))          # hind legs folded
        ell_into(bm, Vector((sx * 0.1, 0.2, z + 0.03)), (0.05, 0.06, 0.03))
        up = 0.09 if sx == side else 0.0                                            # one paw rests on the ball or the cub
        tb = Vector((sx * 0.08, -0.08, z + 0.28)); tp = Vector((sx * 0.08, -0.14, z + 0.03 + up))
        n = 8
        for i in range(n + 1):
            q = tb.lerp(tp, i / n); r = 0.045 - 0.008 * i / n
            ell_into(bm, q, (r, r, r * 1.4), segs=10, rings=6)
        ell_into(bm, tp + Vector((0, -0.02, -0.005)), (0.055, 0.065, 0.032))
    hc = Vector((0, -0.1, z + 0.55))
    ell_into(bm, hc, (0.15, 0.135, 0.14))                                            # the big round head
    ell_into(bm, hc + Vector((0, -0.12, -0.05)), (0.1, 0.07, 0.07))                   # muzzle
    ell_into(bm, hc + Vector((0, -0.19, -0.02)), (0.04, 0.03, 0.03))                  # nose
    ell_into(dk, hc + Vector((0, -0.17, -0.11)), (0.065, 0.03, 0.03))                 # the open mouth
    for sx in (-1, 1):
        ell_into(bm, hc + Vector((sx * 0.065, -0.12, 0.05)), (0.035, 0.03, 0.033))    # bulging eyes
        ell_into(bm, hc + Vector((sx * 0.07, -0.1, 0.09)), (0.05, 0.025, 0.02))       # brows
        ell_into(bm, hc + Vector((sx * 0.14, -0.02, 0.08)), (0.025, 0.04, 0.05))      # ears
    for row in range(3):                                                             # rows of curls for the mane
        for k in range(11):
            a = math.radians(-120 + 240 * k / 10); r = 0.15 + 0.012 * row
            q = hc + Vector((math.sin(a) * r, 0.02 + math.cos(a) * r * 0.75 + row * 0.03, 0.1 - row * 0.1))
            ell_into(bm, q, (0.034, 0.034, 0.034), segs=8, rings=6)
    for k in range(6):                                                               # a curly tail up the back
        ell_into(bm, Vector((0.02 * math.sin(k), 0.27 + 0.01 * k, z + 0.12 + k * 0.06)), (0.045 - 0.003 * k,) * 3, segs=8, rings=6)
    tube_pts = [(math.cos(TAU * i / 24) * 0.12, -0.04 + math.sin(TAU * i / 24) * 0.1, z + 0.4) for i in range(25)]
    o = bm_obj(name, bm, lionStone)
    d = bm_obj(name + 'Mouth', dk, mat('LionMouth', '#3a2a24', 0.8))
    tube(name + 'Collar', tube_pts, 0.012, redSilk, poly=True)
    sphere(name + 'Bell', 0.025, (0, -0.15, z + 0.37), gold)
    if male:
        sphere(name + 'Ball', 0.075, (side * 0.08, -0.15, z + 0.075), lionStone, segs=16, rings=12)
        for k in range(3): tube(f'{name}Ribbon{k}', [(side * 0.08 + math.cos(k * 2.1) * 0.08, -0.15 + math.sin(k * 2.1) * 0.08, z + 0.075), (side * 0.08 + math.cos(k * 2.1 + 0.8) * 0.11, -0.15 + math.sin(k * 2.1 + 0.8) * 0.11, z + 0.02)], 0.012, lionStone, poly=True)
        parts = [name + 'Ball'] + [f'{name}Ribbon{k}' for k in range(3)]
    else:
        cb = bmesh.new(); ell_into(cb, Vector((side * 0.09, -0.15, z + 0.05)), (0.05, 0.07, 0.045)); ell_into(cb, Vector((side * 0.09, -0.2, z + 0.1)), (0.045, 0.04, 0.04))
        bm_obj(name + 'Cub', cb, lionStone); parts = [name + 'Cub']
    for n in [name, name + 'Mouth', name + 'Collar', name + 'Bell'] + parts:
        ob = bpy.data.objects[n]; ob.matrix_world = M @ ob.matrix_world
# a granite forecourt in front of the podium, and the lions on it either side of the steps, each in front of a dragon column
FY0, FY1, FZ = -PD - 0.08, -PD - 1.0, -PH
slab('Forecourt', PW + 0.08, (FY0 - FY1) / 2, FZ - 0.07, FZ, graniteP, 0.015, dy=(FY0 + FY1) / 2)
fc = bmesh.new()                                              # joints between the paving stones
for ix in range(-6, 7): box_into(fc, (0.006, FY0 - FY1, 0.004), Vector((ix * 0.48, (FY0 + FY1) / 2, FZ + 0.001)))
for iy in range(1, 3): box_into(fc, (2 * PW + 0.16, 0.006, 0.004), Vector((0, FY0 - iy * (FY0 - FY1) / 3, FZ + 0.001)))
bm_obj('ForecourtJoints', fc, mat('Joint', '#8a8478', 0.9), smooth=False)
for sx in (-1, 1): lion(f'Lion{sx}', sx * 1.5, -PD - 0.56, 0.0, sx > 0, z=FZ)      # square to the front, the male with his ball on the right

# ---------------------------------------------------------------- stone lanterns at the podium's front corners
def stone_lantern(name, x, y):
    lathe(name + 'Foot', [(0, 0), (0.2, 0), (0.2, 0.06), (0.16, 0.1), (0.07, 0.12), (0, 0.12)], (x, y, 0.02), granite, 6)
    cyl(name + 'Post', 0.06, 0.46, (x, y, 0.37), granite, 6)
    lathe(name + 'Seat', [(0, 0), (0.08, 0), (0.18, 0.06), (0.18, 0.1), (0, 0.1)], (x, y, 0.58), granite, 6)
    b = bmesh.new(); box_into(b, (0.26, 0.26, 0.24), Vector((x, y, 0.8))); fo = bm_obj(name + 'Box', b, granite, smooth=False)
    for k, (dx, dy) in enumerate([(0, -0.131), (0, 0.131), (-0.131, 0), (0.131, 0)]):
        uvplane(f'{name}Glow{k}', 0.12, 0.14, (x + dx, y + dy, 0.8), paperWarm, rot=(0, 0, 0 if dy else math.pi / 2)).visible_shadow = False
    rb = bmesh.new(); bmesh.ops.create_cone(rb, cap_ends=True, segments=4, radius1=0.3, radius2=0.04, depth=0.18, matrix=Matrix.Translation((x, y, 1.01)) @ Matrix.Rotation(math.pi / 4, 4, 'Z'))
    bm_obj(name + 'Roof', rb, granite, smooth=False)
    sphere(name + 'Knob', 0.045, (x, y, 1.13), granite, scale=(1, 1, 1.3), segs=12, rings=8)
    point_light(name + 'Light', (x, y, 0.8), 9, (1.0, 0.7, 0.4), 0.05)
for sx in (-1, 1): stone_lantern(f'StoneLantern{sx}', sx * 2.58, -1.78)

# ---------------------------------------------------------------- lights, camera, render
w = bpy.data.worlds.new('ShrineWorld'); w.use_nodes = True; sc.world = w
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = col('#0f1830'); bg.inputs['Strength'].default_value = 0.5
sd = bpy.data.lights.new('Moon', 'SUN'); sd.energy = 2.6; sd.color = (0.66, 0.76, 1.0); sd.angle = math.radians(3)
sun = link(bpy.data.objects.new('Moon', sd)); sun.rotation_euler = (math.radians(62), 0, math.radians(160))      # behind and above: a cool rim on ridges, tails and dragons
tgt = link(bpy.data.objects.new('CamTarget', None)); tgt.location = (0, 0, 1.95)
fill = area_light('Fill', (7, -9, 6.5), 150, 6, (0.78, 0.84, 1.0))
c = fill.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
key = area_light('FrontKey', (-6, -8, 7), 200, 5, (0.8, 0.86, 1.0))
c = key.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
area_light('MoonWindowLight', (0, BD - 0.08, MW['cz']), 60, 1.2, (0.72, 0.8, 1.0), rot=(-math.pi / 2, 0, 0), shape='DISK')
area_light('LatticeLight', (BW - WT - 0.08, LWIN['cy'], LWIN['cz']), 30, 0.9, (0.72, 0.8, 1.0), rot=(0, math.pi / 2, 0))     # just inside, shining in
area_light('HallGlow', (0, 0.2, 2.25), 70, 2.2, (1.0, 0.66, 0.4), rot=(0, 0, 0))
# lamplight spilling out of the open front onto the porch, the lions and the steps
area_light('PorchSpill', (0, -1.0, 2.05), 210, 2.6, (1.0, 0.66, 0.38), rot=(math.radians(-38), 0, 0), shape='RECTANGLE', size_y=1.2)
area_light('ClereGlow', (0, 0.2, 3.3), 40, 1.8, (1.0, 0.7, 0.45))

cd = bpy.data.cameras.new('ShrineCam'); cd.lens = 44; cd.clip_end = 200
cam = link(bpy.data.objects.new('ShrineCam', cd))
def place_cam(yaw_deg, pitch=0.48, dist=15.5):
    a = math.radians(yaw_deg); d = Vector((math.cos(a), math.sin(a), 0))
    cam.location = tgt.location + Vector((d.x * math.cos(pitch) * dist, d.y * math.cos(pitch) * dist, math.sin(pitch) * dist))
tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
place_cam(-90, 0.3); sc.camera = cam

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
    ng = bpy.data.node_groups.new('ShrineComp', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl_ = ng.nodes.new('CompositorNodeRLayers'); out_ = ng.nodes.new('NodeGroupOutput'); gl = ng.nodes.new('CompositorNodeGlare')
    for k, v in [('Type', 'Fog Glow'), ('Quality', 'High'), ('Threshold', 1.0), ('Strength', 0.6), ('Size', 0.6)]:
        if k in gl.inputs:
            try: gl.inputs[k].default_value = v
            except Exception as e: print('glare input', k, e)
    ng.links.new(rl_.outputs['Image'], gl.inputs['Image']); ng.links.new(gl.outputs['Image'], out_.inputs[0])
    sc.compositing_node_group = ng
except Exception as e: print('compositor skipped:', e)

blend = os.path.join(HERE, 'oracle_shrine.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend)
print('BUILT', len(sc.objects), 'objects ->', blend, flush=True)

if '--preview' in ARGS or '--render' in ARGS:
    big = '--render' in ARGS
    sc.render.resolution_x, sc.render.resolution_y = (2000, 1250) if big else (1200, 750)
    sc.cycles.samples = 160 if big else int(ARGS[ARGS.index('--samples') + 1]) if '--samples' in ARGS else 48
    WIDE = (0, 0, 1.95)
    shots = [('front', -90, 0.3, 15.5, 44, WIDE), ('left', -115, 0.3, 15.5, 44, WIDE), ('right', -65, 0.3, 15.5, 44, WIDE),
             ('inside', -90, 0.08, 1.9, 24, (0, 0.3, 1.25)),
             ('column', -62, 0.12, 3.4, 40, (1.5, -1.68, 1.35)), ('bracket', -120, 0.25, 2.2, 35, (1.45, -1.0, 1.95))]
    if '--only' in ARGS: shots = [s_ for s_ in shots if s_[0] in ARGS[ARGS.index('--only') + 1].split(',')]
    for name, yaw, pitch, dist, lens, at in shots:
        tgt.location = at; cd.lens = lens; place_cam(yaw, pitch, dist); sc.render.filepath = OUT + f'shrine_{name}{"" if big else "_preview"}.png'
        t0 = time.time(); bpy.ops.render.render(write_still=True); print('RENDERED', name, round(time.time() - t0, 1), 's', flush=True)
    tgt.location = WIDE; cd.lens = 44; place_cam(-90)
