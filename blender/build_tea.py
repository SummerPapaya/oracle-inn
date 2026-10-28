# 维多利亚茶桌 · the Victorian tea room from page 4 of the pop-up book, built in Blender as a cut-away diorama like the
# tent, the shrine and the study. A corner of a night street: cobbles and a kerb, a gas lamp, rose topiaries in stone
# urns, geraniums and a red pillar box. The shop is painted teal with cream mouldings, a gilt fascia (Tea Room · 茶室)
# between console brackets, a rose-striped awning and a teacup sign on a scrolled bracket; above it a slate mansard
# with two lit dormers, iron cresting and two brick chimneys. The shopfront is open like a stage: inside, a checker
# floor, sage rose wallpaper over a mahogany dado, a marble fireplace with a gilt mirror, a dresser of china and tea
# tins between two silhouette portraits, a counter with a till, cakes and a chalkboard menu, a parlour palm, a fringed
# lamp, a canary in its cage and a gasolier over the round tea table, laid with lace, china and a stand of cakes.
# Run headless:  Blender -b --factory-startup --python build_tea.py -- [--preview] [--render] [--only front,inside]
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
sc.name = 'OracleTea'
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

# ---------------------------------------------------------------- materials of the tea room
def boxmat(name, file, scale=1.0, rough=0.8, coat=0.0, sheen=0.0, blend=0.15):
    """an image laid on by box projection in object space: wallpaper, slates, anything flat without UVs"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m)
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (scale, scale, scale); L.new(objco(N), mp.inputs['Vector'])
    im = N.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(TEX + file, check_existing=True); im.projection = 'BOX'; im.projection_blend = blend; im.interpolation = 'Cubic'
    L.new(mp.outputs['Vector'], im.inputs['Vector']); L.new(im.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = rough
    if coat: p.inputs['Coat Weight'].default_value = coat
    if sheen: p.inputs['Sheen Weight'].default_value = sheen
    MATS[name] = m; return m

def checker_mat(name, c1, c2, scale=3.0):
    """black and cream marble squares set on the diagonal, polished"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m)
    mp = N.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, 0, math.radians(45)); mp.inputs['Scale'].default_value = (scale, scale, scale)
    L.new(objco(N), mp.inputs['Vector'])
    ck = N.new('ShaderNodeTexChecker'); ck.inputs['Scale'].default_value = 1.0; ck.inputs['Color1'].default_value = col(c1); ck.inputs['Color2'].default_value = col(c2)
    L.new(mp.outputs['Vector'], ck.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 9.0; nz.inputs['Detail'].default_value = 8.0; L.new(objco(N), nz.inputs['Vector'])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'OVERLAY'; mx.inputs['Factor'].default_value = 0.25
    L.new(ck.outputs['Color'], mx.inputs['A']); L.new(nz.outputs['Color'], mx.inputs['B']); L.new(mx.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.18; p.inputs['Coat Weight'].default_value = 0.5
    MATS[name] = m; return m

def upright_brick(name, c1, c2, mortar, bw=0.22, bh=0.07):
    """bricks on the faces of a box: courses run round it (x + y) and rise with z"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    sp = N.new('ShaderNodeSeparateXYZ'); L.new(oc, sp.inputs['Vector'])
    ad = N.new('ShaderNodeMath'); ad.operation = 'ADD'; L.new(sp.outputs['X'], ad.inputs[0]); L.new(sp.outputs['Y'], ad.inputs[1])
    cb = N.new('ShaderNodeCombineXYZ'); L.new(ad.outputs[0], cb.inputs['X']); L.new(sp.outputs['Z'], cb.inputs['Y'])
    br = N.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 1.0; br.inputs['Brick Width'].default_value = bw; br.inputs['Row Height'].default_value = bh
    br.inputs['Mortar Size'].default_value = 0.008; br.inputs['Color1'].default_value = col(c1); br.inputs['Color2'].default_value = col(c2); br.inputs['Mortar'].default_value = col(mortar)
    L.new(cb.outputs['Vector'], br.inputs['Vector']); L.new(br.outputs['Color'], p.inputs['Base Color']); p.inputs['Roughness'].default_value = 0.85
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.3; b.invert = True; L.new(br.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

def cobble_mat(name):
    """rounded setts with dark joints between them"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = 7.0; L.new(oc, vo.inputs['Vector'])
    vc = N.new('ShaderNodeTexVoronoi'); vc.inputs['Scale'].default_value = 7.0; L.new(oc, vc.inputs['Vector'])
    base = ramp(N, vc.outputs['Color'], [(0.0, '#6e6a66'), (1.0, '#8e8a84')])
    edge = N.new('ShaderNodeMath'); edge.operation = 'SMOOTH_MIN' if False else 'LESS_THAN'; edge.inputs[1].default_value = 0.05; L.new(vo.outputs['Distance'], edge.inputs[0])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['B'].default_value = col('#2a2826'); L.new(base, mx.inputs['A']); L.new(edge.outputs[0], mx.inputs['Factor']); L.new(mx.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.6
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.6; L.new(vo.outputs['Distance'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

TEAL = plaster_mat('Teal', '#3f807b', '#35706b', rough=0.6)
TEALW = wood_mat('TealWood', '#418580', '#377570', stretch=6, bump=0.01, axis='z', rough=0.45)
CREAM = plaster_mat('Cream', '#f0e2c4', '#e0cfac', rough=0.55)
GILT = mat('Gilt', '#d8b06a', rough=0.3, metal=0.85)
BRASS = mat('Brass', '#c99e4e', rough=0.28, metal=0.9)
IRON = mat('Iron', '#1c2022', rough=0.5, metal=0.6)
MAHOG = wood_mat('Mahogany', '#6e3222', '#4a1e14', stretch=8, bump=0.02, axis='z', rough=0.38, coat=0.5)
MAHOGX = wood_mat('MahoganyX', '#6e3222', '#4a1e14', stretch=8, bump=0.02, axis='x', rough=0.38, coat=0.5)
MAHOGY = wood_mat('MahoganyY', '#6e3222', '#4a1e14', stretch=8, bump=0.02, axis='y', rough=0.38, coat=0.5)
WALLP = boxmat('Wallpaper', 'tea_wallpaper.jpg', scale=1.15, rough=0.85)
SLATE = boxmat('Slate', 'tea_slate.jpg', scale=0.85, rough=0.55, blend=0.3)
FLOOR = checker_mat('FloorTile', '#1c1a1c', '#ece4d4', scale=2.4)
MARBLE = stone_mat('Marble', '#f2eee6', '#d6cfc2', scale=6.0, rough=0.22, bump=0.02, speck='#9a948a', speck_amt=0.015)
GRANITE = stone_mat('Granite', '#8e8c88', '#6e6c6a')
PAVE = brick_mat('Pave', '#9a968e', '#8c887f', '#55524c', bw=0.9, bh=0.6, rough=0.75)
COBBLE = cobble_mat('Cobble')
BRICK = upright_brick('Brick', '#9e4f3a', '#87402e', '#c8b8a0')
CHINA = imgmat('China', 'tea_china.jpg', rough=0.15)
LACE = imgmat('Lace', 'tea_lace.jpg', rough=0.85, sheen=0.5, repeat=(3, 3))
ROSECLOTH = mat('RoseCloth', '#d98a9a', rough=0.75, sheen=0.5)
VELVET = mat('RoseVelvet', '#a8455a', rough=0.7, sheen=0.9)
SHADE = mat('LampShade', '#f3b4b8', rough=0.6, emit='#ffc49a', emit_str=4.0)
TULIP = mat('TulipGlass', '#fff0d0', rough=0.3, emit='#ffd8a0', emit_str=7.0)
PANE = mat('PaneWarm', '#ffd68a', rough=0.3, emit='#ffc870', emit_str=3.0)
NIGHT = mat('PaneNight', '#1d2640', rough=0.08, metal=0.2)
TERRA = mat('Terracotta', '#b8653e', rough=0.8)
LEAF = mat('Leaf', '#3d6a3a', rough=0.6); LEAFD = mat('LeafDark', '#2c4f2e', rough=0.6)
ROSEP = mat('RosePink', '#ea9fb4', rough=0.6); ROSEW = mat('RoseWhite', '#f6efe2', rough=0.6); GERANIUM = mat('Geranium', '#d23838', rough=0.6)
POSTRED = mat('PostRed', '#b3262b', rough=0.3, coat=0.7)
COAL = mat('Coal', '#ff7a30', emit='#ff6420', emit_str=10)
SOOT = mat('Soot', '#141212', rough=0.9)
MIRROR = mat('Mirror', '#b8c4ca', rough=0.1, metal=0.85)
GLASSPLAIN = mat('Crystal', '#dfe8ec', rough=0.05, metal=0.0, coat=1.0)
CANARY = mat('Canary', '#f4d040', rough=0.6)
WHITE = mat('Porcelain', '#fbf7f0', rough=0.15, coat=0.6)
CAKES = {k: mat('Cake' + k, c, rough=0.7) for k, c in [('Pink', '#f2b8c8'), ('Mint', '#bfe3cf'), ('Lemon', '#f6e2a0'), ('Scone', '#d6ac74'), ('Cream', '#fff4e0'), ('Jam', '#9a2030'), ('Choc', '#5a3020'), ('Lav', '#cdb8e6')]}
FASCIA = imgmat('FasciaBoard', 'tea_fascia.jpg', rough=0.4)
SIGNM = imgmat('SignBoard', 'tea_sign.jpg', rough=0.45)
TINS = imgmat('TeaTins', 'tea_tins.jpg', rough=0.3, metal=0.35)
MENU = imgmat('Menu', 'tea_menu.jpg', rough=0.9)
RUG = imgmat('Rug', 'tea_rug.jpg', rough=0.95, sheen=0.6)
AWNING = imgmat('Awning', 'tea_awning.jpg', rough=0.85, sheen=0.3)
PORTRAIT = {k: imgmat('Portrait' + k, f'tea_portrait_{k}.png', rough=0.8) for k in ('m', 'f')}
ABOARD = imgmat('ABoard', 'tea_aboard.jpg', rough=0.9)
PRINTS = {k: imgmat('Print' + k, f'tea_card_{k}.png', rough=0.6) for k in ('clover', 'stars', 'key')}
BLUEWHITE = bluewhite_mat('BlueWhite')

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

# ---------------------------------------------------------------- dimensions (front is -y; the street is z = 0)
PL = 0.40                       # the pavement
F = 0.58                        # the shop floor, one step up
BX, BY0, BY1, WT = 3.0, -2.0, 1.8, 0.2
IX, IY1 = BX - WT, BY1 - WT     # inside: x within +-2.8, back wall face at y = 1.6
CEIL = 4.3                      # the shop's ceiling, and the foot of the fascia
COR = 5.15                      # top of the cornice, where the mansard starts
T = F + 0.75                    # the tea table's top

# ---------------------------------------------------------------- the street corner: a block of pavement on a cobbled road, a kerb between
box('Plinth', (10.4, 8.0, PL), (0, -0.2, PL / 2), GRANITE)
o = box('PaveTop', (10.2, 6.7, 0.02), (0, 0.35, PL + 0.01), PAVE)
box('RoadCobbles', (10.2, 1.25, 0.03), (0, -3.6, PL - 0.1), COBBLE)
box('Kerb', (10.2, 0.16, 0.14), (0, -2.95, PL - 0.03), GRANITE, bev=0.02)
box('Step', (6.2, 0.36, F - PL), (0, BY0 - 0.08, PL + (F - PL) / 2), GRANITE, bev=0.015)

# ---------------------------------------------------------------- the shop: teal walls outside, the floor and ceiling, the inside skins
box('WallLeft', (WT, BY1 - BY0, COR - PL), (-BX + WT / 2, (BY0 + BY1) / 2, (COR + PL) / 2), TEAL)
box('WallRight', (WT, BY1 - BY0, COR - PL), (BX - WT / 2, (BY0 + BY1) / 2, (COR + PL) / 2), TEAL)
box('WallBack', (2 * BX, WT, COR - PL), (0, BY1 - WT / 2, (COR + PL) / 2), TEAL)
box('FloorSlab', (2 * IX, IY1 - BY0, 0.04), (0, (IY1 + BY0) / 2, F - 0.02), FLOOR)
box('FloorFront', (2 * IX, 0.04, F - PL), (0, BY0 + 0.02, PL + (F - PL) / 2), MAHOGX)
box('Ceiling', (2 * IX, IY1 - BY0, 0.1), (0, (IY1 + BY0) / 2, CEIL + 0.05), CREAM)
for nm, size, loc in [('Left', (0.01, IY1 - BY0, None), (-IX + 0.005, (IY1 + BY0) / 2)), ('Right', (0.01, IY1 - BY0, None), (IX - 0.005, (IY1 + BY0) / 2)), ('Back', (2 * IX, 0.01, None), (0, IY1 - 0.005))]:
    sx, sy, _ = size
    box(f'WallPaper{nm}', (sx, sy, CEIL - F - 1.0), (loc[0], loc[1], F + 1.0 + (CEIL - F - 1.0) / 2), WALLP)
    box(f'WallDado{nm}', (sx + 0.03 if sx < 0.1 else sx, sy + 0.03 if sy < 0.1 else sy, 1.0), (loc[0], loc[1], F + 0.5), MAHOGX if sy < 0.1 else MAHOGY)
    box(f'WallRail{nm}', (sx + 0.06 if sx < 0.1 else sx, sy + 0.06 if sy < 0.1 else sy, 0.05), (loc[0], loc[1], F + 1.0), MAHOGX if sy < 0.1 else MAHOGY)
    box(f'WallCornice{nm}', (sx + 0.14 if sx < 0.1 else sx, sy + 0.14 if sy < 0.1 else sy, 0.12), (loc[0], loc[1], CEIL - 0.06), CREAM)
    box(f'WallPicRail{nm}', (sx + 0.04 if sx < 0.1 else sx, sy + 0.04 if sy < 0.1 else sy, 0.03), (loc[0], loc[1], F + 3.1), MAHOGX if sy < 0.1 else MAHOGY)
# raised panels on the dado, front of the back wall and both side walls
for k in range(9):
    x = -IX + 0.31 + k * 0.62
    if abs(x) < 1.0: continue                           # the dresser stands there
    box(f'WallDadoPanel{k}', (0.5, 0.025, 0.66), (x, IY1 - 0.02, F + 0.48), MAHOGX, bev=0.01)
for s in (-1, 1):
    for k in range(6):
        y = BY0 + 0.32 + k * 0.62
        if s < 0 and -0.75 < y < 1.05: continue         # the chimney breast
        if s > 0 and -1.6 < y < 0.75: continue          # the counter
        box(f'WallDadoPanelS{s}{k}', (0.025, 0.5, 0.66), (s * (IX - 0.02), y, F + 0.48), MAHOGY, bev=0.01)
cyl('CeilingRose', 0.34, 0.05, (0, -0.2, CEIL - 0.025), CREAM, segs=48); cyl('CeilingRose2', 0.2, 0.08, (0, -0.2, CEIL - 0.04), CREAM, segs=48)

# ---------------------------------------------------------------- the shopfront: pilasters with console brackets, the gilt fascia, the cornice
for s in (-1, 1):
    x = s * (BX - 0.17)
    box(f'PilasterBase{s}', (0.44, 0.34, 0.3), (x, BY0 - 0.06, PL + 0.15), GRANITE)
    box(f'Pilaster{s}', (0.36, 0.26, CEIL - F), (x, BY0 - 0.06, F + (CEIL - F) / 2), TEALW)
    for k in range(3): box(f'PilasterFlute{s}{k}', (0.04, 0.02, CEIL - F - 0.5), (x - 0.1 + k * 0.1, BY0 - 0.195, F + (CEIL - F) / 2), CREAM)
    box(f'PilasterCap{s}', (0.46, 0.34, 0.12), (x, BY0 - 0.08, CEIL), CREAM, bev=0.02)
    o = sweep(f'PilasterConsole{s}', [Vector((x, BY0 - 0.12, CEIL + 0.06)), Vector((x, BY0 - 0.18, CEIL + 0.3)), Vector((x, BY0 - 0.26, CEIL + 0.55)), Vector((x, BY0 - 0.3, COR - 0.24))],
              [(-0.14, -0.05), (0.14, -0.05), (0.14, 0.05), (-0.14, 0.05)], CREAM, scale=lambda t: (1.0, 1.0 + t * 1.6), up=Vector((1, 0, 0)))
box('FasciaBack', (2 * BX - 0.5, 0.1, COR - 0.24 - CEIL), (0, BY0 - 0.02, (CEIL + COR - 0.24) / 2), TEALW)
o = uvbox('FasciaBoard', (2 * BX - 0.8, 0.02, 0.56), (0, BY0 - 0.08, CEIL + 0.33), FASCIA)
for z in (CEIL + 0.02, COR - 0.26): box(f'FasciaMould{z:.2f}', (2 * BX - 0.6, 0.12, 0.05), (0, BY0 - 0.09, z), GILT if z > CEIL + 0.1 else CREAM)
# the cornice all round, with dentils under it at the front
for nm, size, loc in [('Front', (2 * BX + 0.5, 0.36, 0.24), (0, BY0 - 0.12, COR - 0.12)), ('Back', (2 * BX + 0.5, 0.36, 0.24), (0, BY1 + 0.08, COR - 0.12)),
                      ('L', (0.36, BY1 - BY0 + 0.5, 0.24), (-BX - 0.08, (BY0 + BY1) / 2, COR - 0.12)), ('R', (0.36, BY1 - BY0 + 0.5, 0.24), (BX + 0.08, (BY0 + BY1) / 2, COR - 0.12))]:
    box(f'Cornice{nm}', size, loc, CREAM, bev=0.03)
for k in range(30): box(f'CorniceDentil{k}', (0.08, 0.1, 0.07), (-BX + 0.1 + k * (2 * BX - 0.2) / 29, BY0 - 0.24, COR - 0.28), CREAM)

# two brass gooseneck lamps over the fascia, lighting the gilt letters and the awning below them
for x in (-2.42, 2.42):
    tube(f'FasciaLampArm{x}', [(x, BY0 - 0.1, COR - 0.18), (x, BY0 - 0.35, COR - 0.02), (x, BY0 - 0.62, COR - 0.08), (x, BY0 - 0.7, COR - 0.22)], 0.016, BRASS)
    lathe(f'FasciaLampShade{x}', [(0.0, 0.0), (0.04, 0.0), (0.11, -0.1), (0.12, -0.12), (0.0, -0.06)], (x, BY0 - 0.7, COR - 0.2), BRASS, segs=24)
    sphere(f'FasciaLampBulb{x}', 0.035, (x, BY0 - 0.7, COR - 0.29), TULIP, segs=12, rings=8)
    point_light(f'LanternLightFascia{x}', (x, BY0 - 0.68, COR - 0.36), 26, (1.0, 0.76, 0.5), 0.05)
# ---------------------------------------------------------------- the striped awning over the front, its scalloped valance, iron arms
def awning_mesh():
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    x0, x1, nx, ns = -BX + 0.38, BX - 0.38, 48, 8
    back, front = (BY0 - 0.14, CEIL - 0.02), (BY0 - 0.78, CEIL - 0.36)
    grid = []
    for j in range(ns + 1):
        t = j / ns; y = back[0] + (front[0] - back[0]) * t; z = back[1] + (front[1] - back[1]) * t - math.sin(math.pi * t) * 0.03
        grid.append([bm.verts.new((x0 + (x1 - x0) * i / nx, y, z)) for i in range(nx + 1)])
    for j in range(ns):
        for i in range(nx):
            f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            for l, (a, b) in zip(f.loops, [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]): l[uvl].uv = ((x0 + (x1 - x0) * a / nx) * 1.0, b / ns * 0.6)
    # the valance: a hanging strip, its foot cut into scallops
    y, ztop, sc = front[0], front[1], 0.26
    n_sc = int(round((x1 - x0) / sc)); top = [bm.verts.new((x0 + (x1 - x0) * i / (n_sc * 6), y, ztop)) for i in range(n_sc * 6 + 1)]
    bot = []
    for i in range(n_sc * 6 + 1):
        k = (i % 6) / 6; bot.append(bm.verts.new((x0 + (x1 - x0) * i / (n_sc * 6), y, ztop - 0.13 - 0.07 * math.sin(math.pi * k))))
    for i in range(n_sc * 6):
        f = bm.faces.new((top[i], top[i + 1], bot[i + 1], bot[i]))
        for l, v in zip(f.loops, (top[i], top[i + 1], bot[i + 1], bot[i])): l[uvl].uv = (v.co.x, 0.62 + (ztop - v.co.z))
    orient(bm, lambda c: Vector((0, 0, 1)) if c.z > CEIL - 0.37 else Vector((0, -1, 0)))
    return bm_obj('AwningCanvas', bm, AWNING, smooth=False)
awning_mesh()
for s in (-1, 1):
    tube(f'AwningArm{s}', [(s * (BX - 0.42), BY0 - 0.16, CEIL - 0.9), (s * (BX - 0.42), BY0 - 0.5, CEIL - 0.6), (s * (BX - 0.4), BY0 - 0.78, CEIL - 0.37)], 0.015, IRON)
cyl('AwningRoll', 0.07, 2 * BX - 0.7, (0, BY0 - 0.14, CEIL - 0.02), TEALW, segs=16, rot=(0, math.pi / 2, 0))

# ---------------------------------------------------------------- the teacup sign on its scrolled bracket at the left corner
tube('SignBracket', [(-BX - 0.02, BY0 - 0.12, 3.75), (-BX - 0.45, BY0 - 0.12, 3.78), (-BX - 0.85, BY0 - 0.12, 3.74)], 0.022, IRON, poly=True)
tube('SignScroll', [(-BX - 0.02, BY0 - 0.12, 3.35), (-BX - 0.3, BY0 - 0.12, 3.5), (-BX - 0.45, BY0 - 0.12, 3.7), (-BX - 0.35, BY0 - 0.12, 3.6), (-BX - 0.3, BY0 - 0.12, 3.66)], 0.014, IRON)
for x in (-BX - 0.5, -BX - 0.8): tube(f'SignChain{x:.1f}', [(x, BY0 - 0.12, 3.74), (x, BY0 - 0.12, 3.5)], 0.008, IRON, poly=True)
o = disc('SignFace', 0.27, (-BX - 0.65, BY0 - 0.152, 3.24), SIGNM); o.scale = (1.0, 1.0, 0.86)
o = disc('SignBack', 0.27, (-BX - 0.65, BY0 - 0.088, 3.24), SIGNM, rotz=math.pi); o.scale = (1.0, 1.0, 0.86)
o = cyl('SignRim', 0.285, 0.06, (-BX - 0.65, BY0 - 0.12, 3.24), GILT, segs=48, rot=(math.pi / 2, 0, 0), cap=False); o.scale = (1.0, 0.86, 1.0)
box('SignCore', (0.54, 0.05, 0.46), (-BX - 0.65, BY0 - 0.12, 3.24), TEALW)

# ---------------------------------------------------------------- the side windows: arched, lit from within; a window box of flowers under each outside
def side_window(s, y, w=0.72, z0=F + 0.95, z1=F + 2.55):
    x_out, x_in = s * (BX + 0.005), s * (IX - 0.012)
    for nm, x, inside in (('Out', x_out, False), ('In', x_in, True)):
        bm = bmesh.new(); r = w / 2
        prof = [(y - r, z0), (y + r, z0)] + [(y + r * math.cos(a), z1 - r + r * math.sin(a)) for a in [math.pi * k / 16 for k in range(17)]]
        vs = [bm.verts.new((x, py, pz)) for py, pz in prof]; bm.faces.new(vs)
        orient(bm, lambda c: Vector((-s if inside else s, 0, 0)))
        bm_obj(f'WindowPane{nm}{s}', bm, NIGHT if inside else PANE, smooth=False)
        path = [Vector((x + s * 0.01 * (1 if not inside else -1), py, pz)) for py, pz in prof] + [Vector((x + s * 0.01 * (1 if not inside else -1), prof[0][0], prof[0][1]))]
        sweep(f'WindowFrame{nm}{s}', path, [(-0.03, -0.03), (0.03, -0.03), (0.03, 0.03), (-0.03, 0.03)], CREAM if not inside else MAHOGX, up=Vector((s, 0, 0)))
        for dz in (0.55, 1.05): box(f'WindowBar{nm}{s}{dz}', (0.02, w, 0.025), (x + s * 0.012 * (-1 if inside else 1), y, z0 + dz), CREAM if not inside else MAHOGX)
        box(f'WindowMullion{nm}{s}', (0.02, 0.025, z1 - z0 - 0.05), (x + s * 0.012 * (-1 if inside else 1), y, (z0 + z1) / 2 - 0.02), CREAM if not inside else MAHOGX)
    box(f'WindowSill{s}', (0.22, w + 0.2, 0.06), (s * (BX + 0.08), y, z0 - 0.05), CREAM)
    box(f'WindowBox{s}', (0.24, w + 0.1, 0.2), (s * (BX + 0.15), y, z0 - 0.2), TEALW)
    rr = random.Random(int(y * 10) + s)
    for k in range(9):
        p = (s * (BX + 0.17 + rr.uniform(-0.05, 0.05)), y - w / 2 + 0.05 + k * (w - 0.1) / 8, z0 - 0.06 + rr.uniform(0, 0.08))
        sphere(f'WindowBoxLeaf{s}{k}', 0.07, p, LEAF, segs=10, rings=8)
        sphere(f'WindowBoxFlower{s}{k}', 0.035, (p[0], p[1], p[2] + 0.07), [ROSEP, ROSEW, GERANIUM][k % 3], segs=8, rings=6)
    # lace curtains inside, drawn back either side
    for side in (-1, 1):
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); rows, cols = 10, 6; grid = []
        for j in range(rows + 1):
            t = j / rows; zc = z1 + 0.08 - t * (z1 - z0 + 0.25); tie = math.exp(-((t - 0.62) / 0.16) ** 2)
            width = 0.3 * (1 - 0.55 * tie)
            grid.append([bm.verts.new((s * (IX - 0.13) - s * 0.02 * math.sin(i * 2.2), y + side * (w / 2 + 0.08) - side * width * i / cols, zc)) for i in range(cols + 1)])
        for j in range(rows):
            for i in range(cols):
                f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
                for l, (a, b) in zip(f.loops, [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]): l[uvl].uv = (a / cols, b / rows * 2)
        orient(bm, lambda c: Vector((-s, 0, 0)))
        bm_obj(f'Curtain{s}{side}', bm, LACE)
    tube(f'CurtainRod{s}', [(s * (IX - 0.13), y - w / 2 - 0.32, z1 + 0.1), (s * (IX - 0.13), y + w / 2 + 0.32, z1 + 0.1)], 0.014, BRASS, poly=True)
    for e in (-1, 1): tube(f'CurtainRodBracket{s}{e}', [(s * (IX - 0.005), y + e * (w / 2 + 0.28), z1 + 0.1), (s * (IX - 0.13), y + e * (w / 2 + 0.28), z1 + 0.1)], 0.009, BRASS, poly=True)
side_window(-1, -1.3); side_window(1, 1.05)

# ---------------------------------------------------------------- the corners and sides: cream quoins, a gutter and downpipe, hanging baskets of flowers
for sx in (-1, 1):
    for sy in (BY0, BY1):
        for k in range(11):
            z = PL + 0.2 + k * 0.42; long_ = k % 2 == 0
            box(f'WallQuoin{sx}{sy}{k}', (0.06, 0.34 if long_ else 0.22, 0.3), (sx * (BX + 0.02), sy + (0.17 if long_ else 0.11) * (1 if sy == BY0 else -1), z), CREAM, bev=0.012)
    tube(f'Downpipe{sx}', [(sx * (BX + 0.06), BY1 - 0.12, COR - 0.1), (sx * (BX + 0.06), BY1 - 0.12, PL + 0.08), (sx * (BX + 0.16), BY1 - 0.12, PL + 0.02)], 0.035, IRON, poly=True)
    box(f'DownpipeHopper{sx}', (0.12, 0.12, 0.1), (sx * (BX + 0.06), BY1 - 0.12, COR - 0.05), IRON)
def hanging_basket(x, y, z, seed):
    tube(f'BasketBracket{x}', [(x, BY0 - 0.05, z + 0.5), (x, y - 0.12, z + 0.56), (x, y, z + 0.46)], 0.012, IRON)
    tube(f'BasketScroll{x}', [(x, BY0 - 0.05, z + 0.2), (x, y + 0.2, z + 0.32), (x, y - 0.05, z + 0.52)], 0.009, IRON)
    for k in range(3): a = k / 3 * math.tau; tube(f'BasketChain{x}{k}', [(x, y, z + 0.46), (x + math.cos(a) * 0.17, y + math.sin(a) * 0.17, z + 0.1)], 0.004, IRON, poly=True)
    lathe(f'BasketBowl{x}', [(0.0, -0.12), (0.12, -0.1), (0.2, 0.0), (0.2, 0.1), (0.0, 0.1)], (x, y, z), mat('Moss', '#4a5a34', rough=0.9), segs=20)
    rr = random.Random(seed)
    leafy_ball(f'BasketLeaves{x}', 0.22, (x, y, z + 0.08), LEAF, seed)
    for i in range(22):
        a, b = rr.uniform(0, math.tau), rr.uniform(-0.9, 0.7)
        sphere(f'BasketFlower{x}{i}', 0.035, (x + math.cos(a) * math.cos(b) * 0.24, y + math.sin(a) * math.cos(b) * 0.24, z + 0.08 + math.sin(b) * 0.2), [ROSEP, GERANIUM, ROSEW, mat('Lobelia', '#5a5ad0', rough=0.6)][i % 4], segs=8, rings=6)
    for i in range(6):
        a = i / 6 * math.tau; tube(f'BasketTrail{x}{i}', [(x + math.cos(a) * 0.18, y + math.sin(a) * 0.18, z + 0.02), (x + math.cos(a) * 0.24, y + math.sin(a) * 0.24, z - 0.2), (x + math.cos(a) * 0.22, y + math.sin(a) * 0.22, z - 0.38)], 0.012, LEAF)
for sx in (-1, 1): hanging_basket(sx * (BX - 0.17), BY0 - 0.55, CEIL - 1.25, 30 + sx)

# ---------------------------------------------------------------- the mansard roof: steep slates, a low hipped top with iron cresting, two dormers, two chimneys
def mansard():
    bm = bmesh.new()
    b0 = [(-BX - 0.12, BY0 - 0.12), (BX + 0.12, BY0 - 0.12), (BX + 0.12, BY1 + 0.12), (-BX - 0.12, BY1 + 0.12)]
    b1 = [(-BX + 0.45, BY0 + 0.45), (BX - 0.45, BY0 + 0.45), (BX - 0.45, BY1 - 0.45), (-BX + 0.45, BY1 - 0.45)]
    z0, z1, z2 = COR, COR + 1.75, COR + 2.2
    lo = [bm.verts.new((x, y, z0)) for x, y in b0]; hi = [bm.verts.new((x, y, z1)) for x, y in b1]
    ym = (BY0 + BY1) / 2
    ridge = [bm.verts.new((-1.6, ym, z2)), bm.verts.new((1.6, ym, z2))]
    for i in range(4): bm.faces.new((lo[i], lo[(i + 1) % 4], hi[(i + 1) % 4], hi[i]))
    bm.faces.new((hi[0], hi[1], ridge[1], ridge[0])); bm.faces.new((hi[2], hi[3], ridge[0], ridge[1]))
    bm.faces.new((hi[1], hi[2], ridge[1])); bm.faces.new((hi[3], hi[0], ridge[0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm_obj('MansardSlates', bm, SLATE, smooth=False)
    # a lead-grey roll along the break of the slope, and the cresting along the ridge
    for i in range(4):
        a, b = b1[i], b1[(i + 1) % 4]
        tube(f'MansardRoll{i}', [(a[0], a[1], z1), (b[0], b[1], z1)], 0.04, IRON, poly=True)
    tube('MansardRidge', [(-1.6, ym, z2), (1.6, ym, z2)], 0.045, IRON, poly=True)
    for k in range(17):
        x = -1.6 + k * 0.2
        tube(f'MansardCrest{k}', [(x, ym, z2), (x, ym, z2 + 0.16)], 0.008, IRON, poly=True)
        sphere(f'MansardCrestBall{k}', 0.022, (x, ym, z2 + 0.17), IRON, segs=8, rings=6)
        if k < 16: tube(f'MansardCrestArc{k}', [(x, ym, z2 + 0.12), (x + 0.1, ym, z2 + 0.06), (x + 0.2, ym, z2 + 0.12)], 0.006, IRON)
    return z0, z1
MZ0, MZ1 = mansard()
def dormer(x):
    w, y0, zb, zt = 0.92, BY0 - 0.02, COR + 0.18, COR + 1.45
    box(f'DormerCheek{x}', (w + 0.1, 0.9, zt - zb), (x, y0 + 0.45, (zb + zt) / 2), SLATE)
    box(f'DormerFace{x}', (w + 0.12, 0.06, zt - zb), (x, y0, (zb + zt) / 2), CREAM)
    r = 0.3
    bm = bmesh.new(); prof = [(x - r, zb + 0.18), (x + r, zb + 0.18)] + [(x + r * math.cos(a), zt - 0.42 + r * math.sin(a)) for a in [math.pi * k / 16 for k in range(17)]]
    bm.faces.new([bm.verts.new((px, y0 - 0.035, pz)) for px, pz in prof]); bm_obj(f'DormerPane{x}', bm, PANE, smooth=False)
    box(f'DormerMullion{x}', (0.025, 0.02, zt - zb - 0.5), (x, y0 - 0.045, zb + 0.18 + (zt - zb - 0.5) / 2), CREAM)
    box(f'DormerTransom{x}', (2 * r, 0.02, 0.025), (x, y0 - 0.045, zt - 0.42), CREAM)
    box(f'DormerSill{x}', (2 * r + 0.16, 0.12, 0.05), (x, y0 - 0.07, zb + 0.15), CREAM)
    # a segmental pediment on top, slated behind
    sweep(f'DormerPediment{x}', [Vector((x + (w / 2 + 0.1) * math.cos(a), y0 - 0.04, zt - 0.05 + 0.2 * math.sin(a))) for a in [math.pi * k / 16 for k in range(17)]],
          [(-0.05, -0.05), (0.05, -0.05), (0.05, 0.05), (-0.05, 0.05)], CREAM, up=Vector((0, -1, 0)))
    o = cyl(f'DormerCap{x}', w / 2 + 0.08, 0.9, (x, y0 + 0.45, zt - 0.05), SLATE, segs=24, rot=(math.pi / 2, 0, 0)); o.scale = (1, 0.42, 1)
for x in (-1.25, 1.25): dormer(x)
def chimney(x, y):
    box(f'ChimneyStack{x}', (0.6, 0.45, 8.2 - COR + 0.3), (x, y, (8.2 + COR - 0.3) / 2), BRICK)
    for k, h in enumerate((0.06, 0.1)): box(f'ChimneyCap{x}{k}', (0.72 + k * 0.04, 0.57 + k * 0.04, h), (x, y, 8.2 + k * 0.08), CREAM if k else BRICK)
    for dx in (-0.14, 0.14):
        lathe(f'ChimneyPot{x}{dx}', [(0.075, 0), (0.09, 0.05), (0.07, 0.12), (0.065, 0.3), (0.075, 0.34), (0.06, 0.34)], (x + dx, y, 8.31), TERRA, segs=16)
        empty = bpy.data.objects.new(f'SmokeAt{x}{dx}', None); sc.collection.objects.link(empty); empty.location = (x + dx, y, 8.66)
for s in (-1, 1): chimney(s * 2.25, 0.95)

# ---------------------------------------------------------------- outside on the pavement: the gas lamp, rose topiaries, geraniums, a pillar box
def gas_lamp(x, y):
    lathe('GasLampBase', [(0.18, 0), (0.18, 0.08), (0.12, 0.14), (0.1, 0.4), (0.07, 0.5), (0.0, 0.5)], (x, y, PL), IRON, segs=24)
    cyl('GasLampPost', 0.05, 2.6, (x, y, PL + 1.75), IRON, segs=12, r2=0.04)
    box('GasLampLadderBar', (0.6, 0.04, 0.04), (x, y, PL + 2.7), IRON); [sphere(f'GasLampBarEnd{s}', 0.03, (x + s * 0.3, y, PL + 2.7), IRON, segs=8, rings=6) for s in (-1, 1)]
    zl = PL + 3.05
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        tube(f'GasLampFrame{k}', [(x + math.cos(a) * 0.1, y + math.sin(a) * 0.1, zl - 0.15), (x + math.cos(a) * 0.17, y + math.sin(a) * 0.17, zl + 0.2)], 0.008, IRON, poly=True)
    o = cyl('GasLampGlass', 0.15, 0.36, (x, y, zl + 0.02), PANE, segs=4, r2=0.11); o.rotation_euler = (0, 0, math.pi / 4)
    o = cyl('GasLampCap', 0.2, 0.12, (x, y, zl + 0.26), IRON, segs=4, r2=0.05); o.rotation_euler = (0, 0, math.pi / 4)
    sphere('GasLampFinial', 0.04, (x, y, zl + 0.36), IRON, segs=8, rings=6)
    point_light('LanternLightGas', (x, y, zl + 0.02), 60, (1.0, 0.72, 0.42), 0.08)
gas_lamp(-4.3, -2.55)
def topiary(x, y, rose_m, seed):
    lathe(f'TopiaryUrn{x}', [(0.16, 0), (0.2, 0.06), (0.12, 0.16), (0.14, 0.24), (0.3, 0.42), (0.33, 0.5), (0.28, 0.52), (0.0, 0.52)], (x, y, PL), GRANITE, segs=32)
    cyl(f'TopiaryStem{x}', 0.03, 1.1, (x, y, PL + 1.0), MAHOG, segs=8)
    rr = random.Random(seed)
    for k, (r, z) in enumerate(((0.34, PL + 0.95), (0.27, PL + 1.62))):
        leafy_ball(f'TopiaryBall{x}{k}', r, (x, y, z), LEAFD, seed + k)
        for i in range(16):
            a, b = rr.uniform(0, math.tau), rr.uniform(-1.1, 1.1)
            sphere(f'TopiaryRose{x}{k}{i}', 0.04, (x + math.cos(a) * math.cos(b) * r * 1.05, y + math.sin(a) * math.cos(b) * r * 1.05, z + math.sin(b) * r * 1.05), rose_m, segs=8, rings=6)
topiary(-3.75, -2.45, ROSEP, 3); topiary(3.75, -2.45, ROSEW, 4)
for k, x in enumerate((3.55, 3.95, 4.35)):
    y = -3.15 + (k % 2) * 0.14
    lathe(f'PotTerracotta{k}', [(0.1, 0), (0.15, 0.24), (0.17, 0.26), (0.0, 0.26)], (x, y + 0.6, PL), TERRA, segs=20)
    leafy_ball(f'PotLeaves{k}', 0.15, (x, y + 0.6, PL + 0.36), LEAF, k)
    for i in range(6): sphere(f'PotGeranium{k}{i}', 0.04, (x + math.cos(i) * 0.09, y + 0.6 + math.sin(i) * 0.09, PL + 0.5 + (i % 2) * 0.04), GERANIUM, segs=8, rings=6)
# a chalked A-board on the pavement, and a cast-iron bench along the left wall
for s in (-1, 1):
    o = uvbox(f'ABoard{s}', (0.5, 0.025, 0.72), (1.95, -2.62 + s * 0.12, PL + 0.4), ABOARD, rot=(s * math.radians(14), 0, 0 if s < 0 else math.pi))
    for k in (-1, 1): box(f'ABoardLeg{s}{k}', (0.03, 0.03, 0.78), (1.95 + k * 0.26, -2.62 + s * 0.12, PL + 0.38), MAHOGX, rot=(s * math.radians(14), 0, 0))
    box(f'ABoardTop{s}', (0.58, 0.04, 0.04), (1.95, -2.62 + s * 0.03, PL + 0.77), MAHOGX)
def bench(x, y):
    for k in range(4): box(f'BenchSlat{k}', (0.08, 1.4, 0.03), (x - 0.12 + k * 0.09, y, PL + 0.45), MAHOGY, bev=0.006)
    for k in range(3): o = box(f'BenchBack{k}', (0.03, 1.4, 0.07), (x + 0.2 + k * 0.012, y, PL + 0.6 + k * 0.11), MAHOGY, bev=0.006)
    for dy in (-0.6, 0.6):
        tube(f'BenchFrame{dy}', [(x - 0.2, y + dy, PL), (x - 0.15, y + dy, PL + 0.2), (x - 0.18, y + dy, PL + 0.44), (x + 0.2, y + dy, PL + 0.44), (x + 0.16, y + dy, PL + 0.2), (x + 0.22, y + dy, PL)], 0.02, IRON)
        tube(f'BenchArm{dy}', [(x - 0.18, y + dy, PL + 0.44), (x - 0.16, y + dy, PL + 0.62), (x + 0.1, y + dy, PL + 0.66), (x + 0.24, y + dy, PL + 0.92)], 0.018, IRON)
bench(-3.65, 0.35)
# a ginger cat asleep on the bench, curled nose to tail
GINGER = mat('Ginger', '#d8843c', rough=0.8, sheen=0.6)
cx, cy, cz = -3.7, 0.55, PL + 0.53
sphere('CatBody', 0.14, (cx, cy, cz + 0.07), GINGER, scale=(1.0, 1.25, 0.62), segs=20, rings=12)
sphere('CatHead', 0.075, (cx + 0.02, cy - 0.15, cz + 0.08), GINGER, segs=16, rings=10)
for s_ in (-1, 1): cyl(f'CatEar{s_}', 0.026, 0.05, (cx + 0.02 + s_ * 0.04, cy - 0.17, cz + 0.15), GINGER, segs=8, r2=0.0, rot=(0.25, s_ * 0.25, 0))
tube('CatTail', [(cx - 0.05, cy + 0.16, cz + 0.05), (cx - 0.12, cy + 0.02, cz + 0.05), (cx - 0.08, cy - 0.14, cz + 0.06), (cx + 0.03, cy - 0.22, cz + 0.06)], 0.025, GINGER, taper=lambda t: 1.0 - 0.4 * t)
lathe('PillarBox', [(0.24, 0), (0.25, 0.08), (0.22, 0.12), (0.22, 1.25), (0.26, 1.3), (0.26, 1.36), (0.2, 1.48), (0.1, 1.55), (0.0, 1.56)], (4.55, -1.1, PL), POSTRED, segs=40)
box('PillarBoxSlot', (0.2, 0.03, 0.03), (4.55, -1.33, PL + 1.15), SOOT); box('PillarBoxPlate', (0.16, 0.02, 0.1), (4.55, -1.33, PL + 0.92), GILT)

# ---------------------------------------------------------------- inside, left: the fireplace, its mirror and the things on the mantel
FY = 0.15
box('ChimneyBreast', (0.36, 1.6, CEIL - F), (-IX + 0.18, FY, F + (CEIL - F) / 2), WALLP)
box('ChimneyBreastDado', (0.38, 1.62, 1.0), (-IX + 0.18, FY, F + 0.5), MAHOGY)
xf = -IX + 0.37
box('FireSurroundL', (0.1, 0.22, 1.1), (xf + 0.04, FY - 0.6, F + 0.55), MARBLE, bev=0.01); box('FireSurroundR', (0.1, 0.22, 1.1), (xf + 0.04, FY + 0.6, F + 0.55), MARBLE, bev=0.01)
box('FireSurroundTop', (0.1, 1.42, 0.2), (xf + 0.04, FY, F + 1.0), MARBLE, bev=0.01)
box('Mantel', (0.3, 1.6, 0.06), (xf + 0.04, FY, F + 1.13), MARBLE, bev=0.015)
box('FireInsert', (0.04, 1.0, 0.92), (xf - 0.01, FY, F + 0.46), IRON)
o = cyl('FireArch', 0.36, 0.05, (xf + 0.005, FY, F + 0.58), SOOT, segs=32, rot=(0, math.pi / 2, 0))
box('FireOpening', (0.05, 0.72, 0.58), (xf + 0.005, FY, F + 0.29), SOOT)
for k in range(5): box(f'FireGrate{k}', (0.03, 0.56, 0.02), (xf + 0.06, FY, F + 0.12 + k * 0.05), IRON)
rr = random.Random(7)
for k in range(14):
    p = (xf + 0.02 + rr.uniform(-0.03, 0.04), FY + rr.uniform(-0.24, 0.24), F + 0.22 + rr.uniform(0, 0.08))
    sphere(f'FireCoal{k}', rr.uniform(0.035, 0.055), p, COAL if k % 3 else SOOT, segs=8, rings=6)
empty = bpy.data.objects.new('FireGlowAt', None); sc.collection.objects.link(empty); empty.location = (xf + 0.04, FY, F + 0.3)
point_light('FireLight', (xf + 0.2, FY, F + 0.32), 40, (1.0, 0.45, 0.18), 0.2)
tube('Fender', [(xf + 0.2, FY - 0.62, F + 0.08), (xf + 0.32, FY - 0.4, F + 0.08), (xf + 0.34, FY, F + 0.08), (xf + 0.32, FY + 0.4, F + 0.08), (xf + 0.2, FY + 0.62, F + 0.08)], 0.018, BRASS)
# the overmantel mirror, gilt and arched
r_, z0m, z1m = 0.5, F + 1.3, F + 2.65
path = [Vector((xf + 0.012, FY - r_, z0m)), Vector((xf + 0.012, FY + r_, z0m))] + [Vector((xf + 0.012, FY + r_ * math.cos(a), z1m - r_ + r_ * math.sin(a))) for a in [math.pi * k / 20 for k in range(21)]] + [Vector((xf + 0.012, FY - r_, z0m))]
bm = bmesh.new(); bm.faces.new([bm.verts.new((p.x - 0.004, p.y, p.z)) for p in path[:-1]]); orient(bm, lambda c: Vector((1, 0, 0))); bm_obj('MirrorGlass', bm, MIRROR, smooth=False)
sweep('MirrorFrame', path, [(-0.05, -0.03), (0.05, -0.03), (0.05, 0.03), (-0.05, 0.03)], GILT, up=Vector((1, 0, 0)))
# the mantel: a domed clock, candlesticks with candles, a pair of china dogs
lathe('MantelClock', [(0.14, 0), (0.14, 0.04), (0.11, 0.06), (0.11, 0.2), (0.08, 0.28), (0.0, 0.3)], (xf + 0.04, FY, F + 1.16), MAHOG, segs=24)
disc('MantelClockFace', 0.07, (xf + 0.155, FY, F + 1.33), WHITE, rotz=math.pi / 2)
tube('ClockHandH', [(xf + 0.16, FY, F + 1.33), (xf + 0.16, FY + 0.03, F + 1.36)], 0.004, IRON, poly=True); tube('ClockHandM', [(xf + 0.16, FY, F + 1.33), (xf + 0.16, FY - 0.01, F + 1.39)], 0.003, IRON, poly=True)
for s in (-1, 1):
    lathe(f'Candlestick{s}', [(0.05, 0), (0.05, 0.015), (0.015, 0.03), (0.02, 0.18), (0.035, 0.2), (0.0, 0.2)], (xf + 0.04, FY + s * 0.5, F + 1.16), BRASS, segs=16)
    cyl(f'CandleWax{s}', 0.014, 0.16, (xf + 0.04, FY + s * 0.5, F + 1.44), WHITE, segs=12)
    o = sphere(f'Candle{s}Flame', 0.012, (xf + 0.04, FY + s * 0.5, F + 1.54), mat('Flame', '#ffd890', emit='#ffb050', emit_str=20), segs=8, rings=6); o.scale = (1, 1, 2)
    point_light(f'CandleLight{s}', (xf + 0.08, FY + s * 0.5, F + 1.56), 3, (1.0, 0.7, 0.4), 0.02)
    d0, dx = FY + s * 0.28, xf + 0.04                                 # a Staffordshire spaniel, sitting up, looking into the room
    sphere(f'ChinaDogBody{s}', 0.05, (dx, d0, F + 1.2), WHITE, scale=(0.9, 0.8, 1.15), segs=16, rings=10)
    sphere(f'ChinaDogHaunch{s}', 0.045, (dx - 0.02, d0, F + 1.18), WHITE, scale=(1.1, 0.95, 0.8), segs=14, rings=8)
    sphere(f'ChinaDogHead{s}', 0.034, (dx + 0.025, d0, F + 1.285), WHITE, segs=14, rings=10)
    sphere(f'ChinaDogMuzzle{s}', 0.017, (dx + 0.055, d0, F + 1.275), WHITE, segs=10, rings=8)
    for e in (-1, 1):
        sphere(f'ChinaDogEar{s}{e}', 0.016, (dx + 0.018, d0 + e * 0.03, F + 1.265), mat('ChinaRed', '#a8402a', rough=0.2), scale=(0.7, 0.5, 1.6), segs=8, rings=6)
        cyl(f'ChinaDogLeg{s}{e}', 0.009, 0.08, (dx + 0.03, d0 + e * 0.018, F + 1.2), WHITE, segs=8)
    sphere(f'ChinaDogSpot{s}', 0.02, (dx - 0.01, d0 + s * 0.035, F + 1.21), MATS['ChinaRed'], scale=(1, 0.4, 1), segs=8, rings=6)
    tube(f'ChinaDogChain{s}', [(dx + 0.03, d0 - 0.022, F + 1.245), (dx + 0.045, d0, F + 1.235), (dx + 0.03, d0 + 0.022, F + 1.245)], 0.003, GILT)

# ---------------------------------------------------------------- the back wall: the dresser of china and tea tins, the two silhouette portraits
DX, DW = 0.0, 1.9
yb = IY1
box('DresserBase', (DW, 0.5, 0.88), (DX, yb - 0.25, F + 0.44), MAHOGX, bev=0.01)
box('DresserTop', (DW + 0.08, 0.56, 0.05), (DX, yb - 0.27, F + 0.9), MAHOGX, bev=0.01)
for k in range(3):
    x = DX - DW / 3 + k * DW / 3
    box(f'DresserDrawer{k}', (DW / 3 - 0.06, 0.02, 0.16), (x, yb - 0.51, F + 0.76), MAHOGX, bev=0.005); sphere(f'DresserKnob{k}', 0.018, (x, yb - 0.53, F + 0.76), BRASS, segs=8, rings=6)
    box(f'DresserDoor{k}', (DW / 3 - 0.08, 0.02, 0.5), (x, yb - 0.51, F + 0.36), MAHOGX, bev=0.005)
box('DresserBack', (DW, 0.04, 1.6), (DX, yb - 0.04, F + 1.72), MAHOGX)
for s in (-1, 1): box(f'DresserSide{s}', (0.05, 0.28, 1.6), (DX + s * (DW / 2 - 0.025), yb - 0.15, F + 1.72), MAHOGX)
o = box('DresserCrest', (DW + 0.12, 0.32, 0.12), (DX, yb - 0.15, F + 2.56), MAHOGX, bev=0.02)
for k, z in enumerate((F + 1.3, F + 1.75, F + 2.2)):
    box(f'DresserShelf{k}', (DW - 0.1, 0.26, 0.03), (DX, yb - 0.15, z), MAHOGX)
    box(f'DresserRail{k}', (DW - 0.1, 0.015, 0.04), (DX, yb - 0.26, z + 0.06), MAHOGX)
# tea tins on the lowest shelf, plates standing on the two above, cups hanging under them
for k in range(8):
    x = DX - 0.8 + k * 0.23
    o = lathe(f'TeaTin{k}', [(0.075, 0), (0.075, 0.2), (0.0, 0.2)], (x, yb - 0.15, F + 0.95), TINS, segs=24, uv=True)
    remap_uv(o, (k % 4) / 4, 1 - (k // 4 + 1) / 2, (k % 4 + 1) / 4, 1 - (k // 4) / 2)
    lathe(f'TeaTinLid{k}', [(0.079, 0), (0.079, 0.035), (0.0, 0.035)], (x, yb - 0.15, F + 1.14), mat('TinGold', '#c9a050', rough=0.3, metal=0.8), segs=24)
for k, z in enumerate((F + 1.33, F + 1.78)):
    for i in range(6):
        x = DX - 0.75 + i * 0.3; r = 0.12 if i % 2 else 0.1
        o = lathe(f'Plate{k}{i}', [(0.0, 0), (r * 0.6, 0.004), (r, 0.014), (r, 0.018), (0.0, 0.01)], (x, yb - 0.12, z + r), BLUEWHITE if (i + k) % 2 else CHINA, segs=32, uv=True)
        o.rotation_euler = (math.radians(-78), 0, 0)
    for i in range(5):
        x = DX - 0.6 + i * 0.3
        lathe(f'HangingCup{k}{i}', [(0.0, 0), (0.03, 0.0), (0.045, 0.05), (0.05, 0.07), (0.046, 0.07), (0.04, 0.05), (0.0, 0.01)], (x, yb - 0.24, z + 0.36), CHINA, segs=16, uv=True).rotation_euler = (math.pi, 0, 0)
# the portraits either side, in oval gilt frames
for s, k in ((-1, 'm'), (1, 'f')):
    x = s * 1.5
    o = disc(f'Portrait{k}', 0.26, (x, yb - 0.02, F + 2.0), PORTRAIT[k]); o.scale = (0.8, 1, 1.04)
    o = sweep(f'PortraitFrame{k}', [Vector((x + 0.215 * math.cos(a), yb - 0.03, F + 2.0 + 0.275 * math.sin(a))) for a in [math.tau * i / 48 for i in range(49)]], [(-0.035, -0.02), (0.035, -0.02), (0.035, 0.02), (-0.035, 0.02)], GILT, up=Vector((0, -1, 0)))
    tube(f'PortraitCord{k}', [(x, yb - 0.02, F + 2.28), (x - 0.1, yb - 0.02, F + 3.1)], 0.004, BRASS, poly=True); tube(f'PortraitCord2{k}', [(x, yb - 0.02, F + 2.28), (x + 0.1, yb - 0.02, F + 3.1)], 0.004, BRASS, poly=True)

# ---------------------------------------------------------------- inside, right: the counter with the till and cakes, the chalkboard menu, the card prints
CY0, CY1 = -1.62, 0.62
box('CounterBody', (0.55, CY1 - CY0, 0.92), (IX - 0.3, (CY0 + CY1) / 2, F + 0.46), MAHOGY, bev=0.01)
for k in range(4): box(f'CounterPanel{k}', (0.02, (CY1 - CY0) / 4 - 0.08, 0.6), (IX - 0.585, CY0 + (k + 0.5) * (CY1 - CY0) / 4, F + 0.46), MAHOGY, bev=0.006)
box('CounterTop', (0.62, CY1 - CY0 + 0.06, 0.05), (IX - 0.3, (CY0 + CY1) / 2, F + 0.945), MARBLE, bev=0.01)
ct = F + 0.97
box('TillBody', (0.3, 0.32, 0.22), (IX - 0.32, 0.25, ct + 0.11), BRASS, bev=0.02)
o = box('TillKeys', (0.2, 0.3, 0.12), (IX - 0.5, 0.25, ct + 0.08), BRASS, bev=0.01); o.rotation_euler = (0, math.radians(-35), 0)
box('TillTop', (0.1, 0.24, 0.12), (IX - 0.3, 0.25, ct + 0.28), BRASS, bev=0.02)
for i in range(4):
    for j in range(3): sphere(f'TillKey{i}{j}', 0.012, (IX - 0.56 + j * 0.035, 0.15 + i * 0.065, ct + 0.13 + j * 0.025), WHITE, segs=8, rings=6)
def cake_stand(name, x, y, z, cake):
    lathe(name, [(0.06, 0), (0.03, 0.02), (0.02, 0.1), (0.15, 0.11), (0.15, 0.12), (0.0, 0.12)], (x, y, z), CHINA, segs=32, uv=True)
    if cake == 'layer':
        cyl(name + 'Cake', 0.11, 0.1, (x, y, z + 0.17), CAKES['Pink'], segs=32); cyl(name + 'CakeTop', 0.112, 0.02, (x, y, z + 0.23), CAKES['Cream'], segs=32)
        for i in range(10): sphere(f'{name}Berry{i}', 0.012, (x + math.cos(i * 0.63) * 0.085, y + math.sin(i * 0.63) * 0.085, z + 0.25), CAKES['Jam'], segs=8, rings=6)
    else:
        cyl(name + 'Cake', 0.11, 0.12, (x, y, z + 0.18), CAKES['Choc'], segs=32)
        for i in range(8): sphere(f'{name}Rosette{i}', 0.018, (x + math.cos(i * 0.785) * 0.08, y + math.sin(i * 0.785) * 0.08, z + 0.245), CAKES['Cream'], segs=8, rings=6)
cake_stand('CakeStandA', IX - 0.3, -0.35, ct, 'layer'); cake_stand('CakeStandB', IX - 0.3, -1.0, ct, 'choc')
lathe('BiscuitJar', [(0.06, 0), (0.08, 0.04), (0.08, 0.2), (0.05, 0.24), (0.06, 0.26), (0.0, 0.27)], (IX - 0.32, -1.45, ct), BLUEWHITE, segs=24)
o = uvbox('Menu', (0.78, 0.02, 1.04), (IX - 0.02, -0.75, F + 2.05), MENU, rot=(0, 0, -math.pi / 2))
for nm, size, loc in [('T', (0.04, 0.86, 0.05), (IX - 0.03, -0.75, F + 2.59)), ('B', (0.04, 0.86, 0.05), (IX - 0.03, -0.75, F + 1.51)), ('L', (0.04, 0.05, 1.12), (IX - 0.03, -1.17, F + 2.05)), ('R', (0.04, 0.05, 1.12), (IX - 0.03, -0.33, F + 2.05))]:
    box(f'MenuFrame{nm}', size, loc, MAHOG)
for k, (key, y) in enumerate((('clover', 0.0), ('stars', 0.32), ('key', 0.64))):
    if y > 0.5: continue
    uvbox(f'Print{key}', (0.2, 0.01, 0.31), (IX - 0.02, y, F + 2.0), PRINTS[key], rot=(0, 0, -math.pi / 2))
    for nm, size, loc in [('T', (0.03, 0.27, 0.03), (IX - 0.025, y, F + 2.17)), ('B', (0.03, 0.27, 0.03), (IX - 0.025, y, F + 1.83)), ('L', (0.03, 0.03, 0.37), (IX - 0.025, y - 0.12, F + 2.0)), ('R', (0.03, 0.03, 0.37), (IX - 0.025, y + 0.12, F + 2.0))]:
        box(f'PrintFrame{key}{nm}', size, loc, GILT)

# ---------------------------------------------------------------- corners: a parlour palm in a jardinière, a standard lamp with a fringed shade
def palm(x, y):
    lathe('PalmStand', [(0.16, 0), (0.16, 0.03), (0.04, 0.06), (0.05, 0.45), (0.14, 0.5), (0.14, 0.53), (0.0, 0.53)], (x, y, F), MAHOG, segs=24)
    lathe('PalmJardiniere', [(0.12, 0), (0.18, 0.06), (0.22, 0.2), (0.24, 0.3), (0.2, 0.34), (0.0, 0.34)], (x, y, F + 0.53), BLUEWHITE, segs=32)
    rr = random.Random(11); bm = bmesh.new()
    for f_ in range(9):
        a = f_ / 9 * math.tau + rr.uniform(-0.2, 0.2); up = rr.uniform(0.9, 1.5); L = rr.uniform(0.75, 1.05)
        rib = [Vector((x + math.cos(a) * L * t * 0.8, y + math.sin(a) * L * t * 0.8, F + 0.85 + up * t - 1.25 * t * t * L)) for t in [i / 12 for i in range(13)]]
        tube(f'PalmRib{f_}', [tuple(p) for p in rib], 0.007, LEAF)
        side = Vector((-math.sin(a), math.cos(a), 0))
        for i in range(2, 12):
            p = rib[i]; ln = 0.22 * (1 - i / 13) + 0.05
            for s in (-1, 1):
                tip = p + side * s * ln + Vector((0, 0, -0.08)) + (rib[min(12, i + 1)] - p) * 0.8
                w = side * s * 0.012
                v = [bm.verts.new(p - w * 0.2), bm.verts.new(p + (rib[min(12, i + 1)] - p) * 0.4), bm.verts.new(tip)]
                bm.faces.new(v)
    bm_obj('PalmLeaflets', bm, LEAF, smooth=False)
palm(-2.25, 1.15)
def standard_lamp(x, y):
    lathe('LampFoot', [(0.2, 0), (0.2, 0.03), (0.08, 0.08), (0.03, 0.12), (0.0, 0.12)], (x, y, F), BRASS, segs=24)
    cyl('LampStem', 0.016, 1.5, (x, y, F + 0.85), BRASS, segs=12)
    lathe('LampShade', [(0.16, 0.0), (0.24, 0.02), (0.26, 0.04), (0.2, 0.2), (0.1, 0.32), (0.0, 0.34)], (x, y, F + 1.48), SHADE, segs=32)
    lathe('LampFringe', [(0.26, 0.0), (0.27, -0.09), (0.255, -0.09), (0.245, 0.0)], (x, y, F + 1.52), mat('Fringe', '#e9a0a8', rough=0.8, emit='#ffb0a0', emit_str=1.0), segs=64)
    point_light('LanternLightStand', (x, y, F + 1.58), 22, (1.0, 0.7, 0.55), 0.1)
standard_lamp(2.3, 1.15)

# ---------------------------------------------------------------- overhead: the brass gasolier with tulip shades; a birdcage with a canary
def gasolier(x, y):
    tube('GasolierChain', [(x, y, CEIL), (x, y, CEIL - 0.45)], 0.01, BRASS, poly=True)
    lathe('GasolierBody', [(0.0, 0), (0.06, 0.02), (0.08, 0.08), (0.04, 0.14), (0.03, 0.4), (0.05, 0.44), (0.0, 0.46)], (x, y, CEIL - 0.95), BRASS, segs=24)
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4; ex, ey = x + math.cos(a) * 0.42, y + math.sin(a) * 0.42
        tube(f'GasolierArm{k}', [(x, y, CEIL - 0.85), (x + math.cos(a) * 0.2, y + math.sin(a) * 0.2, CEIL - 0.92), (ex, ey, CEIL - 0.82)], 0.012, BRASS)
        lathe(f'GasolierTulip{k}', [(0.0, 0), (0.03, 0.0), (0.07, 0.08), (0.08, 0.15), (0.065, 0.16), (0.0, 0.05)], (ex, ey, CEIL - 0.83), TULIP, segs=16)
        point_light(f'LanternLightChand{k}', (ex, ey, CEIL - 0.72), 14, (1.0, 0.76, 0.5), 0.05)
gasolier(0, -0.2)
def birdcage(x, y, z):
    tube('BirdcageChain', [(x, y, CEIL), (x, y, z + 0.62)], 0.006, BRASS, poly=True)
    lathe('BirdcageTray', [(0.0, 0), (0.2, 0.0), (0.21, 0.04), (0.0, 0.04)], (x, y, z), BRASS, segs=32)
    for k in range(20):
        a = k / 20 * math.tau
        tube(f'BirdcageBar{k}', [(x + math.cos(a) * 0.19 * r, y + math.sin(a) * 0.19 * r, z + h) for r, h in ((1, 0.04), (1, 0.32), (0.85, 0.46), (0.5, 0.56), (0.0, 0.6))], 0.004, BRASS)
    for h in (0.04, 0.2): tube(f'BirdcageRing{h}', [(x + math.cos(a) * 0.19, y + math.sin(a) * 0.19, z + h) for a in [math.tau * i / 24 for i in range(25)]], 0.005, BRASS, poly=True)
    sphere('BirdcageTop', 0.03, (x, y, z + 0.6), BRASS, segs=8, rings=6)
    tube('BirdcagePerch', [(x - 0.15, y, z + 0.2), (x + 0.15, y, z + 0.2)], 0.005, MAHOG, poly=True)
    sphere('CanaryBody', 0.04, (x, y, z + 0.25), CANARY, scale=(1.4, 0.9, 1), segs=12, rings=8); sphere('CanaryHead', 0.026, (x + 0.045, y, z + 0.29), CANARY, segs=12, rings=8)
    o = cyl('CanaryBeak', 0.008, 0.02, (x + 0.075, y, z + 0.29), mat('Beak', '#e8a040'), segs=8, r2=0.0, rot=(0, math.pi / 2, 0))
    o = box('CanaryTail', (0.07, 0.03, 0.01), (x - 0.07, y, z + 0.23), CANARY, rot=(0, math.radians(-25), 0))
birdcage(-1.85, -1.25, F + 2.25)

# ---------------------------------------------------------------- the tea table: lace over a rose skirt, the china and the cakes, two chairs
TX, TY = 0.0, -0.15
def tablecloth():
    bm = bmesh.new(); n, rings = 96, 12; grid = []
    for j in range(rings + 1):
        t = j / rings; z = T - 0.02 - t * (T - F - 0.01)
        grid.append([bm.verts.new((TX + math.cos(a) * r, TY + math.sin(a) * r, z)) for a, r in [(i / n * math.tau, 0.53 + 0.1 * t * t + 0.025 * t * math.sin(i / n * math.tau * 14)) for i in range(n)]])
    for j in range(rings):
        for i in range(n): bm.faces.new((grid[j][i], grid[j][(i + 1) % n], grid[j + 1][(i + 1) % n], grid[j + 1][i]))
    top = [bm.verts.new((TX + math.cos(i / n * math.tau) * 0.535, TY + math.sin(i / n * math.tau) * 0.535, T - 0.005)) for i in range(n)]
    c = bm.verts.new((TX, TY, T - 0.005))
    for i in range(n): bm.faces.new((c, top[i], top[(i + 1) % n]))
    orient(bm, lambda c: Vector((0, 0, 1)) if c.z > T - 0.01 else Vector((c.x - TX, c.y - TY, 0)))
    bm_obj('TableSkirt', bm, ROSECLOTH)
    # the lace topper: flat over the top, then hanging in scallops
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); radial = [0.0, 0.2, 0.4, 0.55, 0.6, 0.66, 0.72]
    grid = []
    for j, r0 in enumerate(radial):
        row = []
        for i in range(n):
            a = i / n * math.tau
            if r0 <= 0.55: r, z = r0, T + 0.002
            else: drop = (r0 - 0.55) / 0.17; r, z = 0.555 + 0.01 * drop, T - 0.24 * drop - 0.06 * drop * (1 - abs(math.cos(a * 8)))
            row.append(bm.verts.new((TX + math.cos(a) * r, TY + math.sin(a) * r, z)))
        grid.append(row)
    for j in range(len(radial) - 1):
        for i in range(n):
            f = bm.faces.new((grid[j][i], grid[j][(i + 1) % n], grid[j + 1][(i + 1) % n], grid[j + 1][i]))
            for l, (ii, jj) in zip(f.loops, [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]):
                v = l.vert.co
                l[uvl].uv = ((v.x - TX) * 0.8, (v.y - TY) * 0.8) if radial[min(jj, len(radial) - 1)] <= 0.55 else (ii / n * math.tau * 0.555 * 0.8, 0.44 + (T - v.z) * 0.8)
    orient(bm, lambda c: Vector((0, 0, 1)) if c.z > T - 0.002 else Vector((c.x - TX, c.y - TY, 0)))
    bm_obj('TableLace', bm, LACE)
tablecloth()
uvbox('Rug', (2.6, 0.006, 1.9), (TX, TY - 0.1, F + 0.004), RUG, rot=(math.pi / 2, 0, 0))
def cup(name, x, y, z, m=CHINA, saucer=True):
    if saucer: lathe(name + 'Saucer', [(0.0, 0), (0.05, 0.0), (0.075, 0.012), (0.078, 0.016), (0.0, 0.008)], (x, y, z), m, segs=32, uv=True)
    lathe(name + 'Cup', [(0.0, 0.008), (0.022, 0.008), (0.024, 0.012), (0.04, 0.04), (0.046, 0.065), (0.044, 0.066), (0.038, 0.042), (0.0, 0.014)], (x, y, z + 0.006), m, segs=32, uv=True)
    tube(name + 'Handle', [(x + 0.04, y, z + 0.06), (x + 0.065, y, z + 0.055), (x + 0.066, y, z + 0.035), (x + 0.042, y, z + 0.025)], 0.005, m)
    cyl(name + 'Tea', 0.036, 0.002, (x, y, z + 0.056), mat('Tea', '#6a3214', rough=0.05), segs=24)
# the china on the table (the visitor's own cup and the deck are live, added by the page)
lathe('Teapot', [(0.0, 0), (0.05, 0.0), (0.07, 0.02), (0.085, 0.06), (0.08, 0.1), (0.06, 0.13), (0.035, 0.14), (0.0, 0.14)], (TX - 0.22, TY + 0.14, T), CHINA, segs=40, uv=True)
lathe('TeapotLid', [(0.04, 0), (0.042, 0.01), (0.025, 0.03), (0.012, 0.035), (0.015, 0.05), (0.0, 0.055)], (TX - 0.22, TY + 0.14, T + 0.135), CHINA, segs=24, uv=True)
tube('TeapotSpout', [(TX - 0.16, TY + 0.14, T + 0.04), (TX - 0.11, TY + 0.14, T + 0.08), (TX - 0.08, TY + 0.14, T + 0.13)], 0.012, CHINA, taper=lambda t: 1.2 - 0.6 * t)
tube('TeapotHandle', [(TX - 0.29, TY + 0.14, T + 0.11), (TX - 0.33, TY + 0.14, T + 0.09), (TX - 0.33, TY + 0.14, T + 0.05), (TX - 0.295, TY + 0.14, T + 0.03)], 0.01, CHINA)
lathe('SugarBowl', [(0.0, 0), (0.03, 0.0), (0.045, 0.03), (0.042, 0.05), (0.03, 0.06), (0.0, 0.06)], (TX - 0.3, TY - 0.08, T), CHINA, segs=24, uv=True)
lathe('MilkJug', [(0.0, 0), (0.03, 0.0), (0.035, 0.03), (0.028, 0.07), (0.034, 0.09), (0.0, 0.09)], (TX + 0.3, TY + 0.12, T), CHINA, segs=24, uv=True)
cup('FarCup', TX + 0.02, TY + 0.33, T)
# the three-tier stand of cakes in the middle
lathe('CakeStandRod', [(0.006, 0), (0.006, 0.36), (0.02, 0.37), (0.0, 0.4)], (TX + 0.05, TY + 0.05, T), BRASS, segs=12)
o = sweep('CakeStandRing', [Vector((TX + 0.05 + 0.025 * math.cos(a), TY + 0.05, T + 0.42 + 0.025 * math.sin(a))) for a in [math.tau * i / 16 for i in range(17)]], [(-0.004, -0.004), (0.004, -0.004), (0.004, 0.004), (-0.004, 0.004)], BRASS)
rr = random.Random(21)
for k, (r, z) in enumerate(((0.14, 0.02), (0.11, 0.15), (0.08, 0.27))):
    lathe(f'CakePlate{k}', [(0.0, 0), (r * 0.7, 0.0), (r, 0.012), (r, 0.015), (0.0, 0.008)], (TX + 0.05, TY + 0.05, T + z), CHINA, segs=32, uv=True)
    for i in range(int(r * 50)):
        a = i / int(r * 50) * math.tau + rr.uniform(-0.1, 0.1); d = r * rr.uniform(0.45, 0.75)
        p = (TX + 0.05 + math.cos(a) * d, TY + 0.05 + math.sin(a) * d, T + z + 0.02)
        if k == 0: cyl(f'Scone{i}', 0.022, 0.026, (p[0], p[1], p[2] + 0.012), CAKES['Scone'], segs=12); sphere(f'SconeCream{i}', 0.012, (p[0], p[1], p[2] + 0.03), CAKES['Cream'] if i % 2 else CAKES['Jam'], segs=8, rings=6)
        elif k == 1: cyl(f'Cupcake{i}', 0.016, 0.02, (p[0], p[1], p[2] + 0.01), WHITE, segs=12, r2=0.02); sphere(f'Frosting{i}', 0.02, (p[0], p[1], p[2] + 0.03), CAKES['Pink'] if i % 2 else CAKES['Lav'], segs=10, rings=8)
        else:
            m_ = [CAKES['Pink'], CAKES['Mint'], CAKES['Lemon'], CAKES['Lav']][i % 4]
            for dz in (0.0, 0.016): cyl(f'Macaron{i}{dz}', 0.018, 0.01, (p[0], p[1], p[2] + 0.006 + dz), m_, segs=12)
            cyl(f'MacaronFill{i}', 0.016, 0.006, (p[0], p[1], p[2] + 0.014), CAKES['Cream'], segs=12)
# a candle in a glass, a little vase of roses
lathe('CandleHolder', [(0.0, 0), (0.035, 0.0), (0.03, 0.015), (0.0, 0.015)], (TX + 0.32, TY - 0.08, T), BRASS, segs=16)
cyl('TableCandleWax', 0.016, 0.1, (TX + 0.32, TY - 0.08, T + 0.065), WHITE, segs=12)
o = sphere('TableCandleFlame', 0.011, (TX + 0.32, TY - 0.08, T + 0.128), MATS['Flame'], segs=8, rings=6); o.scale = (1, 1, 2)
point_light('CandleLightTable', (TX + 0.32, TY - 0.12, T + 0.15), 4, (1.0, 0.7, 0.4), 0.02)
lathe('RoseVase', [(0.0, 0), (0.025, 0.0), (0.035, 0.04), (0.02, 0.09), (0.026, 0.1), (0.0, 0.1)], (TX + 0.2, TY + 0.28, T), BLUEWHITE, segs=20)
for i in range(5): sphere(f'VaseRose{i}', 0.024, (TX + 0.2 + math.cos(i * 1.3) * 0.03, TY + 0.28 + math.sin(i * 1.3) * 0.03, T + 0.13 + (i % 2) * 0.02), ROSEP if i % 2 else ROSEW, segs=10, rings=8)
# a letter sealed in red wax, a teaspoon by the far cup, a pocket watch with its chain by the candle
o = box('TableLetter', (0.13, 0.085, 0.003), (TX - 0.33, TY - 0.24, T + 0.0035), mat('LetterPaper', '#f4ead2', rough=0.8), rot=(0, 0, 0.35))
cyl('TableLetterSeal', 0.014, 0.004, (TX - 0.32, TY - 0.24, T + 0.006), mat('WaxRed', '#a82c2c', rough=0.4), segs=16)
o = box('TeaspoonHandle', (0.1, 0.008, 0.003), (TX + 0.13, TY + 0.36, T + 0.003), mat('Silver', '#c8ccd0', rough=0.35, metal=0.6), rot=(0, 0, 0.3))
sphere('TeaspoonBowl', 0.012, (TX + 0.075, TY + 0.343, T + 0.004), MATS['Silver'], scale=(1.6, 1, 0.35), segs=12, rings=8).rotation_euler = (0, 0, 0.3)
cyl('PocketWatch', 0.026, 0.008, (TX + 0.36, TY + 0.06, T + 0.004), BRASS, segs=24)
disc('PocketWatchFace', 0.021, (TX + 0.36, TY + 0.06, T + 0.0085), WHITE).rotation_euler = (-math.pi / 2, 0, 0)
tube('PocketWatchChain', [(TX + 0.36, TY + 0.087, T + 0.004), (TX + 0.33, TY + 0.15, T + 0.003), (TX + 0.38, TY + 0.2, T + 0.003), (TX + 0.43, TY + 0.17, T + 0.003)], 0.0025, BRASS)
# the visitor's place: a saucer and cup the page lifts (left out of the bake), where the deck will lie
cup('LiveCup', TX + 0.12, TY - 0.36, T)
e = bpy.data.objects.new('DeckAt', None); sc.collection.objects.link(e); e.location = (TX - 0.16, TY - 0.36, T + 0.004)
e = bpy.data.objects.new('TableAt', None); sc.collection.objects.link(e); e.location = (TX, TY, T)
def balloon_chair(name, x, y, rotz):
    """a Victorian balloon-back chair facing -y before rotz: the back legs rise on into the uprights of the oval back, a seat
    rail joins all four legs under the cushion and a ring stretcher braces them lower down"""
    c, s_ = math.cos(rotz), math.sin(rotz)
    P = lambda px, py, pz: (x + px * c - py * s_, y + px * s_ + py * c, pz)
    SZ = F + 0.45                                                     # the top of the seat rail
    for sx in (-1, 1):
        tube(f'{name}LegFront{sx}', [P(sx * 0.17, -0.16, SZ), P(sx * 0.18, -0.18, F + 0.22), P(sx * 0.17, -0.2, F)], 0.019, MAHOG, taper=lambda t: 1.0 - 0.35 * t)
        tube(f'{name}LegBack{sx}', [P(sx * 0.15, 0.24, F), P(sx * 0.155, 0.19, F + 0.22), P(sx * 0.16, 0.16, SZ), P(sx * 0.165, 0.19, F + 0.68)], 0.019, MAHOG)
    rail = [P(0.2 * math.cos(a), -0.01 + 0.18 * math.sin(a), SZ - 0.03) for a in [math.tau * i / 40 for i in range(41)]]
    tube(f'{name}SeatRail', rail, 0.026, MAHOG, poly=True)
    ring_ = [P(0.175 * math.cos(a), -0.02 + 0.185 * math.sin(a), F + 0.2) for a in [math.tau * i / 40 for i in range(41)]]
    tube(f'{name}Stretcher', ring_, 0.011, MAHOG, poly=True)
    o = cyl(f'{name}Seat', 0.215, 0.07, P(0, -0.01, SZ + 0.03), VELVET, segs=32, rot=(0, 0, rotz)); o.scale = (1, 0.88, 1)
    o = cyl(f'{name}SeatTop', 0.19, 0.03, P(0, -0.01, SZ + 0.075), VELVET, segs=32, rot=(0, 0, rotz)); o.scale = (1, 0.86, 1)
    # the balloon: an oval loop on top of the uprights, leaning back a little, the velvet pad inside it
    back = [P(0.17 * math.cos(a), 0.2 + 0.04 * (math.sin(a) + 1) / 2, F + 0.9 + 0.23 * math.sin(a)) for a in [math.tau * i / 40 - math.pi / 2 for i in range(41)]]
    tube(f'{name}Back', back, 0.022, MAHOG, poly=True)
    tube(f'{name}WaistRail', [P(-0.16, 0.19, F + 0.68), P(0, 0.2, F + 0.66), P(0.16, 0.19, F + 0.68)], 0.016, MAHOG)
    o = cyl(f'{name}BackPad', 0.13, 0.03, P(0, 0.215, F + 0.9), VELVET, segs=32, rot=(math.pi / 2 - 0.08, 0, rotz)); o.scale = (1, 1.4, 1)
balloon_chair('ChairBack', TX, TY + 0.66, 0.0)
balloon_chair('ChairLeft', TX - 0.78, TY + 0.02, math.pi / 2)
balloon_chair('ChairRight', TX + 0.78, TY + 0.02, -math.pi / 2)

# ---------------------------------------------------------------- lights, camera, render
w = bpy.data.worlds.new('TeaWorld'); w.use_nodes = True; sc.world = w
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = col('#1a1430'); bg.inputs['Strength'].default_value = 0.5
sd = bpy.data.lights.new('Moon', 'SUN'); sd.energy = 2.0; sd.color = (0.68, 0.74, 1.0); sd.angle = math.radians(3)
sun = link(bpy.data.objects.new('Moon', sd)); sun.rotation_euler = (math.radians(55), 0, math.radians(205))
tgt = link(bpy.data.objects.new('CamTarget', None)); tgt.location = (0, -0.4, 2.7)
fill = area_light('Fill', (7, -10, 6.5), 150, 6, (0.8, 0.82, 1.0))
c = fill.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
key = area_light('FrontKey', (-6, -9, 7), 160, 5, (0.82, 0.84, 1.0))
c = key.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
area_light('ShopGlow', (0, -0.3, CEIL - 0.25), 160, 3.4, (1.0, 0.74, 0.5), shape='RECTANGLE', size_y=2.6)
area_light('FrontSpill', (0, BY0 + 0.6, F + 1.6), 120, 3.0, (1.0, 0.7, 0.45), rot=(math.radians(-62), 0, 0), shape='RECTANGLE', size_y=1.0)
area_light('CounterGlow', (IX - 0.5, -0.5, F + 2.6), 30, 1.2, (1.0, 0.78, 0.55))
for x in (-1.25, 1.25): point_light(f'AtticLamp{x}', (x, BY0 + 0.5, COR + 0.7), 14, (1.0, 0.68, 0.4), 0.15)
for s in (-1, 1): point_light(f'AtticLampWin{s}', (s * (BX - 0.6), (-1.3 if s < 0 else 1.05), F + 1.8), 10, (1.0, 0.7, 0.45), 0.2)

cd = bpy.data.cameras.new('TeaCam'); cd.lens = 44; cd.clip_end = 200
cam = link(bpy.data.objects.new('TeaCam', cd))
def place_cam(yaw_deg, pitch=0.4, dist=19.0):
    a = math.radians(yaw_deg); d = Vector((math.cos(a), math.sin(a), 0))
    cam.location = tgt.location + Vector((d.x * math.cos(pitch) * dist, d.y * math.cos(pitch) * dist, math.sin(pitch) * dist))
tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
place_cam(-90, 0.4, 19.0); sc.camera = cam

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
    ng = bpy.data.node_groups.new('TeaComp', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl_ = ng.nodes.new('CompositorNodeRLayers'); out_ = ng.nodes.new('NodeGroupOutput'); gl = ng.nodes.new('CompositorNodeGlare')
    for k, v in [('Type', 'Fog Glow'), ('Quality', 'High'), ('Threshold', 1.0), ('Strength', 0.6), ('Size', 0.6)]:
        if k in gl.inputs:
            try: gl.inputs[k].default_value = v
            except Exception as e: print('glare input', k, e)
    ng.links.new(rl_.outputs['Image'], gl.inputs['Image']); ng.links.new(gl.outputs['Image'], out_.inputs[0])
    sc.compositing_node_group = ng
except Exception as e: print('compositor skipped:', e)

blend = os.path.join(HERE, 'oracle_tea.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend)
print('BUILT', len(sc.objects), 'objects ->', blend, flush=True)

if '--preview' in ARGS or '--render' in ARGS:
    big = '--render' in ARGS
    sc.render.resolution_x, sc.render.resolution_y = (2000, 1250) if big else (1200, 750)
    sc.cycles.samples = 160 if big else int(ARGS[ARGS.index('--samples') + 1]) if '--samples' in ARGS else 48
    WIDE = (0, -0.4, 3.4)
    shots = [('front', -90, 0.4, 22.0, 44, WIDE), ('left', -130, 0.4, 22.0, 44, WIDE), ('right', -50, 0.4, 22.0, 44, WIDE),
             ('inside', -90, 0.22, 2.6, 26, (0, 0.3, F + 1.2)), ('table', -90, 0.62, 1.5, 30, (TX, TY, T)),
             ('menu', 180, 0.08, 2.4, 30, (IX, -0.45, F + 2.0)), ('mantel', 0, 0.08, 2.4, 30, (-IX + 0.4, FY, F + 1.7)),
             ('window', 195, 0.05, 2.0, 30, (IX, 1.05, F + 1.75)), ('chairs', -90, 0.4, 3.6, 30, (TX, TY, F + 0.6))]
    if '--only' in ARGS: shots = [s_ for s_ in shots if s_[0] in ARGS[ARGS.index('--only') + 1].split(',')]
    for name, yaw, pitch, dist, lens, at in shots:
        tgt.location = at; cd.lens = lens; place_cam(yaw, pitch, dist); sc.render.filepath = OUT + f'tea_{name}{"" if big else "_preview"}.png'
        t0 = time.time(); bpy.ops.render.render(write_still=True); print('RENDERED', name, round(time.time() - t0, 1), 's', flush=True)
    tgt.location = WIDE; cd.lens = 44; place_cam(-90, 0.4, 19.0)
