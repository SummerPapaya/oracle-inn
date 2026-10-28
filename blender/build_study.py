# 文房书案 · the scholar's study from page 3 of the pop-up book, built in Blender as a cut-away diorama like the
# starry tent and the shrine. A Jiangnan garden: a white wall with a moon gate and two lattice leak windows, and
# behind it a small study hall in white plaster and dark chestnut timber under grey tiles, a hipped lower roof
# with sharply upturned corners and a raised pavilion roof with a gold finial above it. Bamboo on the left, a plum
# in blossom, a Taihu rock, banana plants, a stone lantern and clipped boxwood on the right, a lily pond, stepping
# stones and raked ripples in front of the gate.
# The hall is open at the front (three bays under hanging fretwork); the lower roof's front slope is cut away
# over the middle so the room shows. Inside: the scholar's desk with the four treasures, a chair, bookcases,
# a round window onto moonlit bamboo with a couplet either side, a qin under the lattice window, a lantern.
# Run headless:  Blender -b --factory-startup --python build_study.py -- [--preview] [--render] [--only front,inside]
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
sc.name = 'OracleStudy'
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

# ---------------------------------------------------------------- materials: white plaster, grey tiles and brick, dark chestnut timber
plaster = plaster_mat('Plaster', '#ece7dc', '#d6d0c2')
plasterIn = plaster_mat('PlasterIn', '#e8e2d4', '#d2cab8')
greyBrick = brick_mat('GreyBrick', '#6e706c', '#5c5e5a', '#a8a69e', bw=0.24, bh=0.055)
granite = stone_mat('Granite', '#b6b2a6', '#96928a', speck='#4a4842', speck_amt=0.07)
graniteP = stone_mat('GranitePave', '#a8a49a', '#8a867e', scale=30, speck='#4a4842', speck_amt=0.06, rough=0.7)
floorTile = stone_mat('FloorTile', '#8c867a', '#726c62', scale=25, rough=0.55, bump=0.08, speck='#4a463e', speck_amt=0.03)
tiles = tile_mat('Tiles', '#5a5e62', '#3c4044', 5.0); tilesD = tile_mat('TilesDark', '#3a3e42', '#25282c', 5.0)
chestnut = wood_mat('Chestnut', '#4a2a1c', '#28140c', 14, 0.04, 'z', 0.45, coat=0.4)
chestnutX = wood_mat('ChestnutX', '#4a2a1c', '#28140c', 14, 0.04, 'x', 0.45, coat=0.4)
chestnutY = wood_mat('ChestnutY', '#4a2a1c', '#28140c', 14, 0.04, 'y', 0.45, coat=0.4)
timber = wood_mat('Timber', '#5a3a26', '#34200f', 10, 0.06, 'y', 0.7)
huali = wood_mat('Huali', '#8a5430', '#4e2a14', 18, 0.03, 'x', 0.32, coat=0.55)          # 黄花梨 for the desk and chair
hualiZ = wood_mat('HualiZ', '#8a5430', '#4e2a14', 18, 0.03, 'z', 0.32, coat=0.55)
zitan = wood_mat('Zitan', '#3a1c16', '#1c0a08', 22, 0.02, 'x', 0.3, coat=0.6)
bamboo_m = wood_mat('BambooCulm', '#6a8a4a', '#4a6a34', 2, 0.05, 'z', 0.45, coat=0.2)
bambooNode = mat('BambooNode', '#8a9a5a', 0.5)
bambooLeaf = mat('BambooLeaf', '#3f6a3a', 0.55, sheen=0.3)
moss = stone_mat('Moss', '#4a5e34', '#34462a', scale=12, rough=0.95, bump=0.3, speck='#6a7a44', speck_amt=0.1)
earth = stone_mat('Earth', '#6e665a', '#4e483e', scale=18, rough=0.95, bump=0.25, speck='#3a342c', speck_amt=0.08)
gravel = stone_mat('Gravel', '#c2bcae', '#a8a294', scale=160, rough=0.9, bump=0.35, speck='#7a766c', speck_amt=0.16)
taihu = stone_mat('Taihu', '#b2b8b4', '#7e8684', scale=9, rough=0.8, bump=0.9, speck='#4a5250', speck_amt=0.12)
pebble = stone_mat('Pebble', '#8e8a80', '#6a665e', scale=70, rough=0.6, bump=0.4, speck='#c8c2b2', speck_amt=0.2)
water = mat('Water', '#1a2e36', 0.05, coat=1.0); padM = mat('LilyPad', '#3e6a3a', 0.45, coat=0.3)
lotus = mat('Lotus', '#f2c4d2', 0.5, sheen=0.5); lotusC = mat('LotusHeart', '#e8c050', 0.5)
blossom = mat('Blossom', '#f4c0cc', 0.6, sheen=0.5); blossomW = mat('BlossomWhite', '#fbeef0', 0.6, sheen=0.5); blossomC = mat('BlossomHeart', '#e8b050', 0.5)
twig = wood_mat('Twig', '#3a2620', '#1e1210', 6, 0.2, 'z', 0.8)
gold = mat('Gold', '#e6bf6a', 0.3, 1.0); brass = mat('Brass', '#c99a48', 0.35, 1.0)
bronze = mat('Bronze', '#4a3a26', 0.42, 0.85); copper = mat('CoinCopper', '#8a6a3a', 0.4, 0.9)
finialM = mat('Finial', '#e8902a', 0.35, 0.6, coat=0.5)
celadon = mat('Celadon', '#a8c4b0', 0.18, coat=0.8); blueWhite = bluewhite_mat('BlueWhite')
inkstone = stone_mat('Inkstone', '#2e2a30', '#1e1a20', scale=40, rough=0.35, bump=0.1, speck='#4a4450', speck_amt=0.04)
inkM = mat('Ink', '#0a0806', 0.25, coat=0.6); felt = mat('Felt', '#2a302c', 0.95, sheen=0.4)
jade = mat('Jade', '#6a9a7a', 0.2, coat=0.8); cinnabar = mat('Cinnabar', '#a8281c', 0.6)
hair = mat('BrushHair', '#2a2420', 0.7); hairW = mat('BrushHairWhite', '#d8d0c0', 0.7)
lacquerB = mat('BlackLacquer', '#141010', 0.22, coat=0.8); silkStr = mat('SilkString', '#e8dcc0', 0.5)
paperWarm = mat('PaperWarm', '#f6dcb0', 0.9, emit='#ffc078', emit_str=2.4)
paperCool = mat('PaperMoonlit', '#c8d6f0', 0.9, emit='#a8bce8', emit_str=1.4)
flameM = mat('FlameGlow', '#fff0c8', 0.4, emit='#ffb050', emit_str=12.0)
tasselM = mat('Tassel', '#8a2a24', 0.7, sheen=0.4); cord = mat('Cord', '#3a2a1a', 0.8)
viewM = imgmat('WindowView', 'study_view.jpg', 0.9, emit=1.6)
plaqueM = imgmat('PlaqueM', 'study_plaque.jpg', 0.4)
coupletL = imgmat('CoupletL', 'study_couplet_l.jpg', 0.85); coupletR = imgmat('CoupletR', 'study_couplet_r.jpg', 0.85)
paperM = imgmat('RicePaper', 'study_paper.jpg', 0.9)
BOOKS = os.path.join(TEX, 'study_books.jpg')
booksM = imgmat('BookCloth', 'study_books.jpg', 0.85)

# ---------------------------------------------------------------- dimensions (front is -y; the garden ground is z = 0)
FZ = 0.36                                   # the hall floor, up on its plinth
BW, BD, WT = 3.0, 1.75, 0.22                # hall half width and depth (outer faces), wall thickness
CH = 2.95                                   # floor to ceiling
CZ = FZ + CH                                # ceiling
COLX = (-2.82, -0.95, 0.95, 2.82)           # the front columns: three open bays
COLY = -BD + 0.14
GW = dict(y=-3.35, hx=3.9, h=1.78, t=0.26, cz=0.86, r=0.8)       # the garden wall and its moon gate
DESK = dict(x=0.0, y=0.25, w=1.7, d=0.72, h=0.8)
random.seed(11)

# ---------------------------------------------------------------- the garden ground: a block of earth with a stone edge, gravel on top
box('GroundBlock', (10.8, 9.8, 0.5), (0, -1.1, -0.25), earth, 0.04)
box('GroundEdge', (10.9, 9.9, 0.08), (0, -1.1, -0.46), granite, 0.02)
box('GroundTop', (10.6, 9.6, 0.02), (0, -1.1, 0.0), gravel)
# the courtyard between wall and hall, paved in grey brick laid on edge in a herringbone
pb = bmesh.new()
for ix in range(-26, 27):
    for iy in range(-6, 7):
        x, y = ix * 0.14, -2.55 + iy * 0.12
        if abs(x) > 3.7 or y < -3.2 or y > -1.95: continue
        rot = math.pi / 4 if (ix + iy) % 2 else -math.pi / 4
        box_into(pb, (0.15, 0.05, 0.02), Vector((x, y, 0.012)), rot)
bm_obj('CourtPaving', pb, stone_mat('CourtBrick', '#7a7a74', '#5e5e58', scale=30, rough=0.8, speck='#3a3a36', speck_amt=0.04), smooth=False)

# ---------------------------------------------------------------- the plinth: grey brick faces under granite edge stones, steps at the front
PX, PY = BW + 0.28, BD + 0.26
box('PlinthBody', (2 * PX - 0.04, 2 * PY - 0.04, FZ - 0.1), (0, 0, (FZ - 0.1) / 2), greyBrick)
box('PlinthEdge', (2 * PX, 2 * PY, 0.1), (0, 0, FZ - 0.05), granite, 0.015)
for i, (dy, top) in enumerate([(0.16, FZ - 0.12), (0.42, FZ - 0.24)]):
    box(f'Step{i}', (1.7 - i * 0.0, 0.28, top), (0, -PY - dy, top / 2), granite, 0.012)
# the hall floor: square fired tiles; the open front strip is granite
fl = bmesh.new()
for ix in range(-8, 8):
    for iy in range(-5, 5):
        cx, cy = (ix + 0.5) * 0.4, (iy + 0.5) * 0.4 + 0.02
        if abs(cx) > BW - WT + 0.001 or cy > BD - WT or cy < -BD + 0.28: continue
        box_into(fl, (0.392, 0.392, 0.02), Vector((cx, cy, FZ + 0.01)))
bm_obj('HallFloor', fl, floorTile, smooth=False)
box('FrontSill', (2 * BW, 0.3, 0.02), (0, -BD + 0.15, FZ + 0.01), graniteP)

# ---------------------------------------------------------------- walls: white plaster above a grey brick dado; the inside plaster, a dark skirting
DADO = 0.42
def wall_skin(name, outer, holes, y, thick, m, rotz=0.0, x=0.0):
    o = outline_curve(name, outer, holes, thick, m); o.rotation_euler = (math.pi / 2, 0, rotz); o.location = (x, y, FZ); return o
RW = dict(cz=1.62, r=0.78)                  # the round window in the back wall (height above the floor)
back_hole = ring_pts(0, RW['cz'], RW['r'], 96)
wall_skin('WallBack', rect(-BW, 0, BW, CH + 0.12), [back_hole], BD - WT / 2, WT, plaster)
wall_skin('WallBackDado', rect(-BW - 0.005, -0.001, BW + 0.005, DADO), [], BD + 0.006, 0.02, greyBrick)
wall_skin('WallBackIn', rect(-BW + WT, 0, BW - WT, CH), [back_hole], BD - WT - 0.003, 0.006, plasterIn)
LW = dict(cy=0.1, cz=1.5, w=1.15, h=1.0)    # the lattice window in the right wall
for sx in (-1, 1):
    holes = [rect(LW['cy'] - LW['w'] / 2, LW['cz'] - LW['h'] / 2, LW['cy'] + LW['w'] / 2, LW['cz'] + LW['h'] / 2)] if sx > 0 else []
    for nm, (y0, y1), th, m, xo in (('', (-BD, BD), WT, plaster, BW - WT / 2), ('In', (-BD + 0.14, BD - WT), 0.006, plasterIn, BW - WT - 0.003)):
        o = outline_curve(f'WallSide{nm}{sx}', rect(y0, 0, y1, CH + (0.12 if not nm else 0)), holes, th, m)
        o.rotation_euler = (math.pi / 2, 0, math.pi / 2); o.location = (sx * xo, 0, FZ)
    o = outline_curve(f'WallSideDado{sx}', rect(-BD - 0.005, -0.001, BD + 0.005, DADO), [], 0.02, greyBrick)
    o.rotation_euler = (math.pi / 2, 0, math.pi / 2); o.location = (sx * (BW + 0.006), 0, FZ)
sk = bmesh.new()
for (cx, cy, w, d, rot) in [(0, BD - WT - 0.012, 2 * (BW - WT), 0.02, 0), (-(BW - WT) + 0.012, 0.07, 2 * BD - WT - 0.14, 0.02, math.pi / 2), ((BW - WT) - 0.012, 0.07, 2 * BD - WT - 0.14, 0.02, math.pi / 2)]:
    box_into(sk, (w, d, 0.14), Vector((cx, cy, FZ + 0.07)), rot)
bm_obj('Skirting', sk, chestnutX, smooth=False)

# ---------------------------------------------------------------- columns on stone bases, the front lintel, hanging fretwork (挂落) in each bay
def column(name, x, y, h, r=0.1):
    lathe(name + 'Base', [(0, 0), (r * 1.7, 0), (r * 1.7, 0.05), (r * 1.55, 0.09), (r * 1.25, 0.12), (0, 0.12)], (x, y, FZ), granite, 32)
    cyl(name, r, h - 0.1, (x, y, FZ + 0.1 + (h - 0.1) / 2), chestnut, 28)
for k, x in enumerate(COLX): column(f'Col{k}', x, COLY, CH)
for sx in (-1, 1): column(f'ColBack{sx}', sx * 2.82, BD - 0.14, CH)
box('Lintel', (2 * BW, 0.18, 0.24), (0, COLY, CZ - 0.12), chestnutX, 0.01)
box('LintelLow', (2 * BW - 0.2, 0.12, 0.08), (0, COLY, CZ - 0.38), chestnutX, 0.005)
def fret(name, x0, x1, ztop, h, y):
    """万川挂落: an interlocking fret of slim bars under the lintel, open in the middle of the bay"""
    bm = bmesh.new(); bar = 0.022; w = x1 - x0
    def hb(xa, xb, z): box_into(bm, (xb - xa, 0.03, bar), Vector(((xa + xb) / 2, y, z)))
    def vb(x, za, zb): box_into(bm, (bar, 0.03, zb - za), Vector((x, y, (za + zb) / 2)))
    hb(x0, x1, ztop - bar / 2)
    zb = ztop - h
    hb(x0, x0 + w * 0.24, zb); hb(x1 - w * 0.24, x1, zb)               # the two hanging ends
    vb(x0 + bar / 2, zb, ztop); vb(x1 - bar / 2, zb, ztop)
    n = max(4, int(w / 0.16))
    for i in range(1, n):
        x = x0 + w * i / n; drop = h * (0.95 if i in (1, n - 1) else 0.45 + 0.25 * ((i % 2)))
        vb(x, ztop - drop, ztop)
        if i < n - 1: hb(x, x0 + w * (i + 1) / n, ztop - drop * (0.55 if i % 2 else 0.8))
    tops = [x0 + w * i / n for i in range(n + 1)]
    for a, b in zip(tops, tops[1:]): hb(a, b, ztop - h * 0.22)
    bm_obj(name, bm, chestnutX, smooth=False)
for k, (a, b) in enumerate(zip(COLX, COLX[1:])): fret(f'Fret{k}', a + 0.11, b - 0.11, CZ - 0.42, 0.34, COLY)
# the ceiling: boards between two beams that run front to back
box('Ceiling', (2 * (BW - WT), 2 * BD - WT, 0.04), (0, -WT / 2 + 0.0, CZ + 0.02), timber)
for x in (-0.95, 0.95): box(f'Beam{x}', (0.2, 2 * BD - 0.1, 0.26), (x, 0, CZ - 0.13), chestnutY, 0.01)
for y in (-0.6, 0.6): box(f'Purlin{y}', (2 * (BW - WT), 0.1, 0.1), (0, y, CZ - 0.05), chestnutX, 0.005)

# ---------------------------------------------------------------- hipped roofs: four curved slopes whose corners sweep up (发戗)
# R: ox, oy (eave half sizes), ix, iy (top: the attic wall for the lower ring, 0 for the pyramid), ze, zi (eave and top
# heights), lift (how far the corners rise), bow (how far they reach out). s = 0 at the top, 1 at the eave; u runs
# across a slope from one hip (-1) to the other (+1).
def hip_xyz(R, face, u, s):
    w = R['ix'] + (R['ox'] - R['ix']) * s; d = R['iy'] + (R['oy'] - R['iy']) * s
    if face in ('front', 'back'): p = Vector((u * w, (-1 if face == 'front' else 1) * d, 0))
    else: p = Vector(((-1 if face == 'left' else 1) * w, u * d, 0))
    c = abs(u) ** 4
    k = 1 + R['bow'] * c * s ** 2; p.x *= k; p.y *= k
    g = 0.84 * (1 - (1 - s) ** 1.65) + 0.16 * s
    p.z = R['zi'] - (R['zi'] - R['ze']) * g + R['lift'] * (abs(u) ** 1.5) * s ** 3
    return p
TP = 0.13                                   # tile row pitch
def hip_roof(name, R, keep=None, s0=0.0, nu=64, ns=26):
    bm = bmesh.new()
    for face in ('front', 'back', 'left', 'right'):
        grid = []
        for i in range(nu + 1):
            u = -1 + 2 * i / nu; row = []
            for j in range(ns + 1):
                s = s0 + (1 - s0) * j / ns; p = hip_xyz(R, face, u, s)
                t = p.x if face in ('front', 'back') else p.y
                p.z -= 0.014 * (0.5 + 0.5 * math.cos(TAU * t / TP)) * min(1, s * 6)      # pan channels between tile rows
                row.append(bm.verts.new(p))
            grid.append(row)
        for i in range(nu):
            for j in range(ns):
                um = -1 + 2 * (i + 0.5) / nu; sm = s0 + (1 - s0) * (j + 0.5) / ns
                if keep and not keep(face, hip_xyz(R, face, um, sm)): continue
                q = (grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1])
                if face in ('front', 'right'): q = q[::-1]
                try: bm.faces.new(q)
                except ValueError: pass
    for v in [v for v in bm.verts if not v.link_faces]: bm.verts.remove(v)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    o = bm_obj(name, bm, tiles, mats=(timber, timber))
    sm_ = o.modifiers.new('solid', 'SOLIDIFY'); sm_.thickness = 0.07; sm_.offset = -1; sm_.material_offset = 1; sm_.material_offset_rim = 2
    return o
def hip_ridge(name, R, sx, sy, s0=0.0, h=0.13, horn=0.36, reach=0.18, m=None):
    """the hip ridge from the top down to the corner, then the horn of the upturned eave corner"""
    face = 'front' if sy < 0 else 'back'
    path = [hip_xyz(R, face, sx, s0 + (1 - s0) * j / 20) + Vector((0, 0, 0.03)) for j in range(21)]
    e = path[-1]; d = Vector((e.x - path[-4].x, e.y - path[-4].y, 0)).normalized()
    for j in range(1, 9):
        q = j / 8; path.append(e + d * reach * q + Vector((0, 0, horn * q ** 2.2)))
    prof = [(-0.07, 0), (-0.07, h * 0.8), (-0.04, h), (0.04, h), (0.07, h * 0.8), (0.07, 0)]
    n = len(path)
    sweep(name, path, prof, m or tilesD, scale=lambda t: (1 - 0.55 * max(0, (t - 20 / (n - 1)) / (1 - 20 / (n - 1))), 1 - 0.5 * max(0, (t - 20 / (n - 1)) / (1 - 20 / (n - 1)))))
    return path[-1]
def fascia(name, R, face, keep=None):
    """the eave board and the rafter ends under the eave line"""
    pts = [hip_xyz(R, face, -1 + 2 * i / 60, 1.0) for i in range(61)]
    keepers = [p for p in pts if not keep or keep(face, p)]
    runs, cur = [], []
    for p in pts:
        if not keep or keep(face, p): cur.append(p)
        elif cur: runs.append(cur); cur = []
    if cur: runs.append(cur)
    for k, run in enumerate(runs):
        if len(run) < 2: continue
        sweep(f'{name}{k}', [p + Vector((0, 0, -0.07)) for p in run], [(-0.025, -0.07), (-0.025, 0.02), (0.025, 0.02), (0.025, -0.07)], timber, smooth_=False)
    rb = bmesh.new()
    for p in keepers[2:-2:2]:
        inward = Vector((-p.x, -p.y, 0)).normalized()
        a = p + Vector((0, 0, -0.1)); b = a + inward * 0.45 + Vector((0, 0, 0.14))
        c = (a + b) / 2; L = (b - a).length; yaw = math.atan2(inward.y, inward.x); pitch = math.atan2(b.z - a.z, (Vector((b.x, b.y, 0)) - Vector((a.x, a.y, 0))).length)
        bmesh.ops.create_cube(rb, size=1.0, matrix=Matrix.Translation(c) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(-pitch, 4, 'Y') @ Matrix.Diagonal((L, 0.05, 0.05, 1)))
    bm_obj(f'{name}Rafters', rb, timber, smooth=False)

# the lower roof: a ring of four slopes from the eave up to the attic walls; its front slope is cut away over the
# middle bays so the room shows, keeping the two corners with their horns
AX = 1.18                                   # the attic: a square that rises through the lower roof
LO = dict(ox=3.62, oy=2.36, ix=AX, iy=AX, ze=CZ + 0.12, zi=CZ + 1.0, lift=0.26, bow=0.12)
CUT = 1.95
keep_lo = lambda face, p: not (face == 'front' and abs(p.x) < CUT)
hip_roof('RoofLow', LO, keep_lo)
for sx in (-1, 1):
    for sy in (-1, 1): hip_ridge(f'HipLow{sx}{sy}', LO, sx, sy)
for face in ('front', 'back', 'left', 'right'): fascia(f'EaveLow{face}', LO, face, keep_lo)
# the attic: plaster walls with a glowing lattice window on each side, standing on the hall's beams
AZ0, AZ1 = CZ - 0.05, CZ + 1.72
for k, (face, rot, pos) in enumerate([('front', 0, (0, -AX + 0.07, 0)), ('back', 0, (0, AX - 0.07, 0)), ('left', math.pi / 2, (-AX + 0.07, 0, 0)), ('right', math.pi / 2, (AX - 0.07, 0, 0))]):
    hole = rect(-0.42, AZ0 + 0.95, 0.42, AZ0 + 1.42)
    o = outline_curve(f'Attic{face}', rect(-AX, AZ0, AX, AZ1), [hole], 0.14, plaster); o.rotation_euler = (math.pi / 2, 0, rot); o.location = pos
    lp = Vector(pos) + (Vector((0, -0.04, 0)) if face == 'front' else Vector((0, 0.04, 0)) if face == 'back' else Vector((-0.04, 0, 0)) if face == 'left' else Vector((0.04, 0, 0)))
    pane = uvplane(f'AtticPaper{face}', 0.84, 0.47, (lp.x * 0.98, lp.y * 0.98, AZ0 + 1.185), paperWarm, rot=(0, 0, rot))
    lb = bmesh.new()
    for i in range(1, 6): box_into(lb, (0.018, 0.02, 0.47), Vector((-0.42 + 0.84 * i / 6, 0, 0)))
    for i in range(1, 3): box_into(lb, (0.84, 0.02, 0.018), Vector((0, 0, -0.235 + 0.47 * i / 3)))
    lo_ = bm_obj(f'AtticLattice{face}', lb, chestnutX, smooth=False); lo_.location = (lp.x * 1.01, lp.y * 1.01, AZ0 + 1.185); lo_.rotation_euler = (0, 0, rot)
box('AtticFloor', (2 * AX - 0.1, 2 * AX - 0.1, 0.06), (0, 0, CZ + 0.08), timber)
# the upper roof: a pyramid with upturned corners and a gold finial
UP = dict(ox=1.78, oy=1.78, ix=0.0, iy=0.0, ze=AZ1 - 0.02, zi=AZ1 + 1.22, lift=0.22, bow=0.1)
hip_roof('RoofUp', UP, s0=0.04, nu=48, ns=22)
for sx in (-1, 1):
    for sy in (-1, 1): hip_ridge(f'HipUp{sx}{sy}', UP, sx, sy, s0=0.04, h=0.11, horn=0.3, reach=0.14)
for face in ('front', 'back', 'left', 'right'): fascia(f'EaveUp{face}', UP, face)
TOP = UP['zi']
lathe('FinialBase', [(0, 0), (0.2, 0), (0.22, 0.04), (0.16, 0.1), (0.12, 0.16), (0.16, 0.2), (0.14, 0.24), (0, 0.24)], (0, 0, TOP - 0.06), tilesD, 32)
lathe('Finial', [(0, 0), (0.08, 0), (0.12, 0.05), (0.15, 0.13), (0.13, 0.22), (0.06, 0.28), (0.07, 0.32), (0.1, 0.38), (0.11, 0.46), (0.08, 0.54), (0.03, 0.58), (0.012, 0.66), (0, 0.68)], (0, 0, TOP + 0.16), finialM, 40)

# ---------------------------------------------------------------- the garden wall: white plaster on a grey brick dado, a moon gate, two lattice leak windows
GY = GW['y']
gate = [(math.cos(a) * GW['r'], GW['cz'] + math.sin(a) * GW['r']) for a in [-math.pi / 2 + math.asin(min(1, (GW['cz'] - 0.0) / GW['r'])) * 0 + TAU * i / 96 for i in range(96)]]
gate = [(x, max(0.0, z)) for (x, z) in gate]
gate_pts = []
for (x, z) in gate:
    if not gate_pts or (abs(gate_pts[-1][0] - x) > 1e-4 or abs(gate_pts[-1][1] - z) > 1e-4): gate_pts.append((x, z))
leak = [rect(sx * 2.5 - 0.32, 0.72, sx * 2.5 + 0.32, 1.36) for sx in (-1, 1)]
o = outline_curve('GardenWall', [(-GW['hx'], -0.001), (-0.6, -0.001), (0.6, -0.001), (GW['hx'], -0.001), (GW['hx'], GW['h']), (-GW['hx'], GW['h'])], [], GW['t'], plaster)
o.rotation_euler = (math.pi / 2, 0, 0); o.location = (0, GY, 0)
def to_mesh(ob):
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.convert(target='MESH'); ob.select_set(False); return ob
o = to_mesh(o)
# cut the gate and the windows with booleans (the outline curve can't take a hole touching its edge)
def cutter(name, outline, depth=1.0):
    c = outline_curve(name, outline, [], depth, plaster); c.rotation_euler = (math.pi / 2, 0, 0); c.location = (0, GY, 0)
    bpy.context.view_layer.objects.active = c; c.select_set(True); bpy.ops.object.convert(target='MESH'); c.select_set(False)
    c.hide_render = True; c.hide_viewport = True; return c
for nm, ol in [('GateCut', ring_pts(0, GW['cz'], GW['r'], 96))] + [(f'LeakCut{k}', l) for k, l in enumerate(leak)]:
    cu = cutter(nm, ol)
    b = o.modifiers.new(nm, 'BOOLEAN'); b.object = cu; b.operation = 'DIFFERENCE'; b.solver = 'EXACT'
dado = outline_curve('GardenWallDado', rect(-GW['hx'] - 0.01, -0.001, GW['hx'] + 0.01, 0.32), [], GW['t'] + 0.02, greyBrick); dado.rotation_euler = (math.pi / 2, 0, 0); dado.location = (0, GY, 0); dado = to_mesh(dado)
b = dado.modifiers.new('GateCut', 'BOOLEAN'); b.object = bpy.data.objects['GateCut']; b.operation = 'DIFFERENCE'; b.solver = 'EXACT'
# a grey brick surround round the gate on both faces, and a stone threshold
for fy in (-1, 1):
    ring = [Vector((math.cos(a) * (GW['r'] + 0.05), GY + fy * (GW['t'] / 2 + 0.008), GW['cz'] + math.sin(a) * (GW['r'] + 0.05))) for a in [TAU * i / 96 for i in range(97)]]
    ring = [p for p in ring if p.z > 0.02]
    sweep(f'GateSurround{fy}', ring, [(-0.05, -0.008), (-0.05, 0.008), (0.05, 0.008), (0.05, -0.008)], stone_mat('GateBrick', '#7a7c78', '#666864', scale=20, rough=0.7, speck='#4a4c48', speck_amt=0.03), closed=True, smooth_=False)
box('GateSill', (1.5, GW['t'] + 0.12, 0.06), (0, GY, 0.03), granite, 0.01)
# the leak windows: a square frame and a grid of slim bars, as on the book page
for k, sx in enumerate((-1, 1)):
    cx = sx * 2.5; fb = bmesh.new()
    for (w, h, dx, dz) in [(0.76, 0.06, 0, 0.35), (0.76, 0.06, 0, -0.35), (0.06, 0.76, 0.35, 0), (0.06, 0.76, -0.35, 0)]:
        box_into(fb, (w, GW['t'] + 0.04, h), Vector((cx + dx, GY, 1.04 + dz)))
    bm_obj(f'LeakFrame{k}', fb, stone_mat('GateBrick', '#7a7c78', '#666864'), smooth=False)
    lb = bmesh.new()
    for i in range(1, 4):
        box_into(lb, (0.025, 0.05, 0.64), Vector((cx - 0.32 + 0.64 * i / 4, GY, 1.04)))
        box_into(lb, (0.64, 0.05, 0.025), Vector((cx, GY, 0.72 + 0.64 * i / 4)))
    bm_obj(f'LeakLattice{k}', lb, chestnutX, smooth=False)
# the coping: a little double-pitched tiled roof along the top, its ends lifting
def coping(name, x0, x1, z, half=0.34, rise=0.16):
    bm = bmesh.new(); nx = int((x1 - x0) / 0.04)
    for side in (-1, 1):
        rows = []
        for i in range(nx + 1):
            x = x0 + (x1 - x0) * i / nx; a = abs(2 * (x - x0) / (x1 - x0) - 1); lift = 0.12 * a ** 6
            row = []
            for j in range(7):
                s = j / 6; zz = z + rise * (1 - s) + lift * s - 0.012 * (0.5 + 0.5 * math.cos(TAU * x / 0.1)) * (s > 0.05)
                row.append(bm.verts.new((x, GY + side * half * s, zz)))
            rows.append(row)
        for i in range(nx):
            for j in range(6):
                q = (rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1])
                bm.faces.new(q if side > 0 else q[::-1])
    o = bm_obj(name, bm, tiles, mats=(timber, timber)); sm_ = o.modifiers.new('solid', 'SOLIDIFY'); sm_.thickness = 0.04; sm_.offset = -1
    sweep(name + 'Ridge', [Vector((x0 + (x1 - x0) * i / 40, GY, z + rise + 0.02 + 0.12 * abs(2 * i / 40 - 1) ** 6)) for i in range(41)], [(-0.05, 0), (-0.05, 0.07), (0.05, 0.07), (0.05, 0)], tilesD)
coping('WallCoping', -GW['hx'] - 0.12, GW['hx'] + 0.12, GW['h'] - 0.02)

# ---------------------------------------------------------------- the back wall: the round window onto moonlit bamboo, the couplet, the 问字斋 plaque
ring_in = [Vector((math.cos(a) * RW['r'], BD - WT / 2, FZ + RW['cz'] + math.sin(a) * RW['r'])) for a in [TAU * i / 96 for i in range(97)]]
sweep('RoundWinReveal', ring_in, [(-WT / 2 - 0.01, -0.012), (WT / 2 + 0.01, -0.012), (WT / 2 + 0.01, 0.0), (-WT / 2 - 0.01, 0.0)], chestnutY, up=Vector((0, 1, 0)), smooth_=True)
for nm, r0, r1, yy in (('RoundWinFrameIn', RW['r'] - 0.01, RW['r'] + 0.07, BD - WT - 0.01), ('RoundWinFrameOut', RW['r'] - 0.01, RW['r'] + 0.06, BD + 0.008)):
    o = outline_curve(nm, ring_pts(0, FZ + RW['cz'], r1, 96), [ring_pts(0, FZ + RW['cz'], r0, 96)], 0.02, chestnutX); o.location = (0, yy, 0)
uvdisc('WindowView', RW['r'] + 0.02, (0, BD + 0.09, FZ + RW['cz']), viewM, rot=(0, 0, math.pi))
# a few slim bamboo-joint bars across the bottom of the round window, like a sill rail
for k, dz in enumerate((-0.52,)):
    hw = math.sqrt(RW['r'] ** 2 - dz ** 2)
    box(f'RoundWinRail{k}', (2 * hw, 0.04, 0.03), (0, BD - WT / 2, FZ + RW['cz'] + dz), chestnutX)
uvplane('Plaque', 1.18, 0.42, (0, BD - WT - 0.035, FZ + 2.6), plaqueM)
box('PlaqueBack', (1.22, 0.04, 0.46), (0, BD - WT - 0.012, FZ + 2.6), chestnutX, 0.008)
for sx, m in ((-1, coupletL), (1, coupletR)):
    uvplane(f'Couplet{sx}', 0.26, 1.3, (sx * 1.24, BD - WT - 0.012, FZ + 1.58), m)
    for dz in (0.66, -0.66): cyl(f'CoupletRod{sx}{dz}', 0.012, 0.32, (sx * 1.24, BD - WT - 0.018, FZ + 1.58 + dz), zitan, 12, rot=(0, math.pi / 2, 0))

# ---------------------------------------------------------------- the right wall: a 步步锦 lattice window, moonlight through the paper
LX = BW - WT - 0.012
lb = bmesh.new(); W_, H_ = LW['w'], LW['h']; y0, z0 = LW['cy'], FZ + LW['cz']
for (w, h, dy, dz) in [(W_ + 0.1, 0.05, 0, H_ / 2), (W_ + 0.1, 0.05, 0, -H_ / 2), (0.05, H_ + 0.1, W_ / 2, 0), (0.05, H_ + 0.1, -W_ / 2, 0)]:
    box_into(lb, (0.05, w, h), Vector((LX, y0 + dy, z0 + dz)))
for i in range(1, 4):                                     # 步步锦: nested frames joined by short bars, stepping inward
    iw, ih = W_ * (1 - 0.24 * i), H_ * (1 - 0.24 * i)
    for (w, h, dy, dz) in [(iw, 0.022, 0, ih / 2), (iw, 0.022, 0, -ih / 2), (0.022, ih, iw / 2, 0), (0.022, ih, -iw / 2, 0)]:
        box_into(lb, (0.03, w, h), Vector((LX, y0 + dy, z0 + dz)))
    pw, ph = W_ * (1 - 0.24 * (i - 1)), H_ * (1 - 0.24 * (i - 1))
    for (dy, dz, w, h) in [(0, (ih / 2 + ph / 2) / 2, 0.022, (ph - ih) / 2), (0, -(ih / 2 + ph / 2) / 2, 0.022, (ph - ih) / 2), ((iw / 2 + pw / 2) / 2, 0, (pw - iw) / 2, 0.022), (-(iw / 2 + pw / 2) / 2, 0, (pw - iw) / 2, 0.022)]:
        box_into(lb, (0.03, w, h), Vector((LX, y0 + dy, z0 + dz)))
bm_obj('LatticeWindow', lb, chestnutY, smooth=False)
uvplane('LatticePaper', W_, H_, (BW - WT / 2, y0, z0), paperCool, rot=(0, 0, math.pi / 2))

# ---------------------------------------------------------------- the desk (画案): 黄花梨, round legs set in, aprons and double side stretchers
dx, dy, TZ = DESK['x'], DESK['y'], FZ + DESK['h']
box('DeskTop', (DESK['w'], DESK['d'], 0.045), (dx, dy, TZ - 0.0225), huali, 0.008)
for sx in (-1, 1):
    for sy in (-1, 1): cyl(f'DeskLeg{sx}{sy}', 0.024, DESK['h'] - 0.045, (dx + sx * (DESK['w'] / 2 - 0.12), dy + sy * (DESK['d'] / 2 - 0.07), FZ + (DESK['h'] - 0.045) / 2), hualiZ, 16)
    for zz in (0.17, 0.25): box(f'DeskStretcher{sx}{zz}', (0.03, DESK['d'] - 0.14, 0.025), (dx + sx * (DESK['w'] / 2 - 0.12), dy, FZ + zz), huali)
for sy in (-1, 1):
    box(f'DeskApron{sy}', (DESK['w'] - 0.2, 0.02, 0.07), (dx, dy + sy * (DESK['d'] / 2 - 0.07), TZ - 0.08), huali)
    for sx in (-1, 1):                                   # 牙头: a little cloud-shaped bracket where each leg meets the apron
        o = outline_curve(f'DeskSpandrel{sx}{sy}', [(0, 0), (0.16, 0), (0.12, -0.03), (0.06, -0.04), (0.02, -0.09), (0, -0.1)], [], 0.018, huali)
        o.location = (dx + sx * (DESK['w'] / 2 - 0.12) - sx * 0.02, dy + sy * (DESK['d'] / 2 - 0.07), TZ - 0.045); o.scale = (-sx, 1, 1)
# the chair behind it (南官帽椅), empty, turned to the desk
CYc = dy + DESK['d'] / 2 + 0.32; SZ = FZ + 0.48
box('ChairSeat', (0.58, 0.46, 0.04), (dx, CYc, SZ), huali, 0.006)
for sx in (-1, 1):
    for sy, top in ((-1, SZ + 0.24), (1, SZ + 0.62)):
        x, y = dx + sx * 0.27, CYc + sy * 0.2
        cyl(f'ChairLeg{sx}{sy}', 0.016, SZ - FZ, (x, y, FZ + (SZ - FZ) / 2), hualiZ, 12)
        tube(f'ChairPost{sx}{sy}', [(x, y, SZ), (x, y + sy * 0.01, (SZ + top) / 2), (x + sx * 0.01, y + (0.04 if sy > 0 else -0.03), top)], 0.014, hualiZ, res=4)
    tube(f'ChairArm{sx}', [(dx + sx * 0.28, CYc + 0.22, SZ + 0.28), (dx + sx * 0.3, CYc, SZ + 0.25), (dx + sx * 0.28, CYc - 0.23, SZ + 0.24)], 0.013, huali, res=6)
    for zz in (0.12, 0.2): box(f'ChairStretcher{sx}{zz}', (0.025, 0.4, 0.02), (dx + sx * 0.27, CYc, FZ + zz), huali)
tube('ChairCrest', [(dx - 0.3, CYc + 0.24, SZ + 0.6), (dx, CYc + 0.27, SZ + 0.64), (dx + 0.3, CYc + 0.24, SZ + 0.6)], 0.016, huali, res=8)
sweep('ChairSplat', [Vector((dx, CYc + 0.2 + 0.05 * math.sin(math.pi * t) ** 1.5 - 0.02 * t, SZ + 0.02 + 0.6 * t)) for t in [i / 16 for i in range(17)]],
      [(-0.09, -0.008), (0.09, -0.008), (0.09, 0.008), (-0.09, 0.008)], huali, up=Vector((0, -1, 0)), smooth_=True)

# ---------------------------------------------------------------- on the desk: felt and rice paper, paperweights, inkstone and ink, water dropper, brushes, seal
P0 = Vector((dx + 0.02, dy - 0.06, TZ))
box('DeskFelt', (0.96, 0.55, 0.004), (P0.x, P0.y + 0.02, TZ + 0.002), felt)
uvplane('DeskPaper', 0.62, 0.42, (P0.x, P0.y, TZ + 0.0045), paperM, rot=(-math.pi / 2, 0, 0))      # face up: a plane facing down bakes black
for sx in (-1, 1): box(f'Paperweight{sx}', (0.032, 0.4, 0.02), (P0.x + sx * 0.335, P0.y, TZ + 0.0145), bronze, 0.005)
IS = Vector((dx + 0.6, dy + 0.04, TZ))
box('Inkstone', (0.17, 0.25, 0.035), (IS.x, IS.y, TZ + 0.0175), inkstone, 0.008)
box('InkWell', (0.12, 0.06, 0.004), (IS.x, IS.y + 0.08, TZ + 0.034), inkM)
box('InkPool', (0.11, 0.1, 0.002), (IS.x, IS.y - 0.03, TZ + 0.035), mat('InkSheen', '#1a1614', 0.15, coat=0.9))
box('InkStick', (0.026, 0.11, 0.013), (IS.x + 0.035, IS.y - 0.02, TZ + 0.042), lacquerB, 0.003, rot=(0, 0, 0.35))
lathe('WaterDropper', [(0, 0), (0.025, 0), (0.038, 0.02), (0.04, 0.035), (0.03, 0.05), (0.012, 0.056), (0.014, 0.062), (0, 0.062)], (dx + 0.67, dy + 0.27, TZ), celadon, 28)
def brush(name, base, d, L=0.2, white=False):
    d = Vector(d).normalized(); a = Vector(base); b = a + d * L
    tube(name + 'Handle', [tuple(a), tuple(b)], 0.0065, bamboo_m, poly=True)
    tube(name + 'Ferrule', [tuple(b), tuple(b + d * 0.012)], 0.0085, zitan, poly=True)
    tip = b + d * 0.05
    tube(name + 'Hair', [tuple(b + d * 0.01), tuple(b + d * 0.03), tuple(tip)], 0.009, hairW if white else hair, res=4, taper=lambda t: 1 - 0.85 * t ** 1.6)
# a brush rest shaped like a little range of five peaks, a brush laid across it
bm = bmesh.new()
for k, (px, h) in enumerate([(-0.06, 0.03), (-0.03, 0.045), (0.0, 0.06), (0.03, 0.045), (0.06, 0.03)]):
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.02, matrix=Matrix.Translation((dx + 0.48 + px, dy - 0.27, TZ + h * 0.5)) @ Matrix.Diagonal((0.9, 0.7, h / 0.04, 1)))
box('BrushRestFoot', (0.15, 0.03, 0.008), (dx + 0.48, dy - 0.27, TZ + 0.004), jade)
bm_obj('BrushRest', bm, jade)
brush('BrushLaid', (dx + 0.35, dy - 0.25, TZ + 0.04), (1, -0.15, 0.02))
# seal and seal paste
box('Seal', (0.026, 0.026, 0.06), (dx + 0.78, dy - 0.2, TZ + 0.03), jade, 0.004)
lathe('SealPaste', [(0, 0), (0.034, 0), (0.036, 0.012), (0.034, 0.026), (0.02, 0.032), (0, 0.033)], (dx + 0.7, dy - 0.3, TZ), celadon, 28)
# brush hanger behind the paper, with four brushes hanging tip down
HX, HY = dx - 0.18, dy + 0.27
for sx in (-1, 1):
    box(f'HangerPost{sx}', (0.02, 0.02, 0.34), (HX + sx * 0.2, HY, TZ + 0.17), zitan)
    box(f'HangerFoot{sx}', (0.03, 0.12, 0.02), (HX + sx * 0.2, HY, TZ + 0.01), zitan)
tube('HangerBar', [(HX - 0.24, HY, TZ + 0.33), (HX - 0.1, HY, TZ + 0.345), (HX + 0.1, HY, TZ + 0.345), (HX + 0.24, HY, TZ + 0.33)], 0.012, zitan, res=6)
for k in range(4):
    x = HX - 0.12 + k * 0.08
    tube(f'HangLoop{k}', [(x, HY, TZ + 0.335), (x, HY, TZ + 0.3)], 0.002, cord, poly=True)
    brush(f'BrushHung{k}', (x, HY, TZ + 0.3), (0, 0, -1), L=0.17 + 0.02 * (k % 2), white=(k == 2))
# brush pot (笔筒) with brushes standing in it, a little stack of thread-bound books, the coin dish, the lamp
lathe('BrushPot', [(0, 0), (0.058, 0), (0.06, 0.005), (0.06, 0.15), (0.064, 0.155), (0.054, 0.155), (0.052, 0.01), (0, 0.01)], (dx - 0.64, dy + 0.22, TZ), zitan, 32)
for k in range(6):
    a = TAU * k / 6
    brush(f'BrushPot{k}', (dx - 0.64 + math.cos(a) * 0.025, dy + 0.22 + math.sin(a) * 0.025, TZ + 0.02), (math.cos(a) * 0.05, math.sin(a) * 0.05, 1), L=0.2 + 0.015 * (k % 3), white=(k == 4))
DISH = Vector((dx - 0.5, dy - 0.25, TZ))
lathe('CoinDish', [(0, 0), (0.05, 0), (0.07, 0.008), (0.085, 0.022), (0.08, 0.024), (0.065, 0.012), (0, 0.006)], (DISH.x, DISH.y, TZ), celadon, 36)
def coin(name, loc, rot=(0, 0, 0)):
    o = outline_curve(name, ring_pts(0, 0, 0.017, 40), [rect(-0.0045, -0.0045, 0.0045, 0.0045)], 0.003, copper, rotx=0.0)
    o.location = loc; o.rotation_euler = rot; return o
for k, (ox, oy, rz) in enumerate([(-0.02, 0.01, 0.2), (0.02, 0.012, 1.1), (0.0, -0.022, 0.6)]): coin(f'Coin{k}', (DISH.x + ox, DISH.y + oy, TZ + 0.012 + k * 0.0035), (0, 0, rz))
LAMP = Vector((dx - 0.74, dy - 0.02, TZ))
lathe('LampStand', [(0, 0), (0.06, 0), (0.06, 0.012), (0.02, 0.03), (0.016, 0.12), (0.03, 0.13), (0.065, 0.135), (0.065, 0.15), (0, 0.15)], (LAMP.x, LAMP.y, TZ), zitan, 6)
sphere('LampFlame', 0.008, (LAMP.x, LAMP.y, TZ + 0.2), flameM, scale=(1, 1, 1.9), segs=10, rings=6)
lb_ = bmesh.new(); ub_ = bmesh.new(); uvl_ = ub_.loops.layers.uv.new(); r_, z0_, z1_ = 0.06, TZ + 0.15, TZ + 0.3
for k in range(6):
    a0, a1 = TAU * k / 6, TAU * (k + 1) / 6
    f = ub_.faces.new([ub_.verts.new((LAMP.x + math.cos(a) * r_, LAMP.y + math.sin(a) * r_, z)) for a, z in ((a0, z0_), (a1, z0_), (a1, z1_), (a0, z1_))])
    box_into(lb_, (0.008, 0.008, z1_ - z0_ + 0.02), Vector((LAMP.x + math.cos(a0) * (r_ + 0.004), LAMP.y + math.sin(a0) * (r_ + 0.004), (z0_ + z1_) / 2)))
bmesh.ops.create_cone(lb_, cap_ends=True, segments=6, radius1=r_ + 0.012, radius2=r_ * 0.55, depth=0.03, matrix=Matrix.Translation((LAMP.x, LAMP.y, z1_ + 0.015)))
bm_obj('LampShade', ub_, paperWarm, smooth=False).visible_shadow = False
bm_obj('LampFrame', lb_, zitan, smooth=False)
point_light('LampLight', (LAMP.x, LAMP.y - 0.02, TZ + 0.27), 9, (1.0, 0.68, 0.38), 0.03)

# ---------------------------------------------------------------- books: cloth cases and thread-bound volumes, mapped onto the study_books atlas
def atlas_box(bm, uvl, size, loc, rot, uv_front, uv_rest, front_axis='+x', uv_top=None):
    """a box whose face towards front_axis shows uv_front (u0, v0, u1, v1) of the atlas, the top uv_top, the rest uv_rest"""
    M = Matrix.Translation(loc) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Diagonal((size[0], size[1], size[2], 1))
    res = bmesh.ops.create_cube(bm, size=1.0, matrix=M); fs = [f for f in {f for v in res['verts'] for f in v.link_faces}]
    R3 = Matrix.Rotation(rot, 3, 'Z'); ax = {'+x': Vector((1, 0, 0)), '-x': Vector((-1, 0, 0)), '+y': Vector((0, 1, 0)), '-y': Vector((0, -1, 0))}[front_axis]
    for f in fs:
        n = f.normal.normalized()
        if n.dot(R3 @ ax) > 0.9: u0, v0, u1, v1 = uv_front
        elif n.z > 0.9 and uv_top: u0, v0, u1, v1 = uv_top
        else: u0, v0, u1, v1 = uv_rest
        loops = list(f.loops)
        for l, (uu, vv) in zip(loops, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]): l[uvl].uv = (uu, vv)
T8 = lambda i: (i / 8 + 0.004, 0.004, (i + 1) / 8 - 0.004, 0.996)
CLOTH = lambda i: (i / 8 + 0.01, 0.6, i / 8 + 0.03, 0.95)
EDGE, COVER = (6 / 8 + 0.01, 0.05, 7 / 8 - 0.01, 0.95), (7 / 8 + 0.004, 0.004, 1 - 0.004, 0.996)
bkb = bmesh.new(); bkuv = bkb.loops.layers.uv.new()
# the bookcases on the left wall: open shelves facing into the room
BX = -(BW - WT) + 0.2
for u, cy in enumerate((-0.48, 0.66)):
    cw, cd_, chh = 1.02, 0.38, 2.02
    fb = bmesh.new()
    for sy in (-1, 1):
        for sx in (-1, 1): box_into(fb, (0.04, 0.04, chh), Vector((BX + sx * (cd_ / 2 - 0.02), cy + sy * (cw / 2 - 0.02), FZ + chh / 2)))
    shelves = [0.06, 0.52, 0.98, 1.44, 1.98]
    for zz in shelves: box_into(fb, (cd_, cw, 0.025), Vector((BX, cy, FZ + zz)))
    box_into(fb, (0.015, cw, chh), Vector((BX - cd_ / 2 + 0.008, cy, FZ + chh / 2)))
    bm_obj(f'Bookcase{u}', fb, zitan, smooth=False)
    R = random.Random(30 + u)
    for k, zz in enumerate(shelves[:-1]):
        base = FZ + zz + 0.0125; y = cy - cw / 2 + 0.05
        if (k + u) % 3 == 2:                             # a shelf of thread-bound volumes lying flat, in stacks
            while y < cy + cw / 2 - 0.25:
                n = R.randint(4, 9)
                for j in range(n): atlas_box(bkb, bkuv, (0.27, 0.19, 0.011), Vector((BX + 0.02, y + 0.1, base + 0.0055 + j * 0.0115)), R.uniform(-0.04, 0.04), EDGE, EDGE, '+x', uv_top=COVER)
                y += 0.23
            continue
        while y < cy + cw / 2 - 0.08:                    # cloth cases standing upright, label out
            t = R.randrange(6); w = R.uniform(0.07, 0.12); h = R.uniform(0.3, 0.38)
            if y + w > cy + cw / 2 - 0.05: break
            atlas_box(bkb, bkuv, (0.28, w, h), Vector((BX + 0.03, y + w / 2, base + h / 2)), 0, T8(t), CLOTH(t), '+x')
            y += w + R.uniform(0.002, 0.012)
            if R.random() < 0.12: y += 0.08
# a few volumes on the desk's back corner
for j in range(5): atlas_box(bkb, bkuv, (0.19, 0.27, 0.011), Vector((dx + 0.33, dy + 0.24, TZ + 0.0055 + j * 0.0115)), 0.06 * (j % 2), EDGE, EDGE, '-y', uv_top=COVER)
bm_obj('Books', bkb, booksM, smooth=False)
# a blue-and-white scroll jar by the front corner, scrolls standing in it
SJ = Vector((-2.2, -1.2, FZ))
lathe('ScrollJar', [(0, 0), (0.15, 0), (0.17, 0.04), (0.19, 0.2), (0.18, 0.34), (0.16, 0.38), (0.17, 0.4), (0.15, 0.41), (0, 0.4)], tuple(SJ), blueWhite, 40)
for k in range(6):
    a = TAU * k / 6 + 0.3; r = 0.07
    p0 = SJ + Vector((math.cos(a) * r, math.sin(a) * r, 0.05)); d = Vector((math.cos(a) * 0.12, math.sin(a) * 0.12, 1)).normalized()
    tube(f'Scroll{k}', [tuple(p0), tuple(p0 + d * 0.62)], 0.026, mat(f'ScrollSilk{k%3}', ['#c8b88a', '#9ab0a8', '#b89a7a'][k % 3], 0.7, sheen=0.4), poly=True)
    for e in (0.0, 0.62): cyl(f'ScrollKnob{k}{e}', 0.012, 0.03, tuple(p0 + d * (e + (0.01 if e else -0.01))), zitan, 10, rot=(math.atan2(math.hypot(d.x, d.y), d.z) * 0 , 0, 0))

# ---------------------------------------------------------------- the right side: a qin on its table under the lattice window, an incense stand, an orchid
QX, QY, QZ = BW - WT - 0.28, LW['cy'], FZ + 0.7
box('QinTableTop', (0.4, 1.32, 0.04), (QX, QY, QZ - 0.02), zitan, 0.006)
for sx in (-1, 1):
    for sy in (-1, 1): box(f'QinTableLeg{sx}{sy}', (0.035, 0.035, QZ - FZ - 0.04), (QX + sx * 0.16, QY + sy * 0.6, FZ + (QZ - FZ - 0.04) / 2), zitan)
    box(f'QinTableApron{sx}', (0.02, 1.2, 0.06), (QX + sx * 0.18, QY, QZ - 0.07), zitan)
sweep('Qin', [Vector((QX, QY - 0.6 + 1.2 * t, QZ + 0.025 + 0.012 * math.sin(math.pi * t))) for t in [i / 24 for i in range(25)]],
      [(-0.095, -0.02), (0.095, -0.02), (0.09, 0.01), (0.05, 0.022), (-0.05, 0.022), (-0.09, 0.01)], lacquerB, up=Vector((0, 0, 1)),
      scale=lambda t: (0.82 + 0.18 * math.sin(math.pi * min(1, t * 1.2)) if t < 0.9 else 0.85, 1.0))
for k in range(13):                                      # 徽: thirteen mother-of-pearl studs along the player's side
    t = 0.12 + 0.68 * (k / 12) ** 1.15
    sphere(f'Hui{k}', 0.005, (QX - 0.07, QY - 0.6 + 1.2 * t, QZ + 0.05 + 0.012 * math.sin(math.pi * t)), mat('Pearl', '#f2eee4', 0.2, coat=0.8), segs=8, rings=6)
for k in range(7):
    xs = QX - 0.04 + k * 0.0135
    tube(f'QinString{k}', [(xs, QY - 0.58, QZ + 0.052), (xs, QY + 0.6, QZ + 0.052)], 0.0012, silkStr, poly=True)
for k in range(2): tube(f'QinTassel{k}', [(QX - 0.02 + k * 0.04, QY + 0.62, QZ + 0.03), (QX - 0.02 + k * 0.05, QY + 0.66, QZ - 0.12)], 0.006, tasselM, poly=True)
# the incense stand (香几) by the front right column, a bronze censer, one stick of incense
IX, IY = BW - WT - 0.32, -1.18
lathe('IncenseStand', [(0, 0), (0.17, 0), (0.17, 0.03), (0.06, 0.06), (0.05, 0.7), (0.17, 0.72), (0.19, 0.76), (0, 0.76)], (IX, IY, FZ), zitan, 32)
lathe('Censer', [(0, 0), (0.05, 0), (0.06, 0.02), (0.09, 0.06), (0.095, 0.09), (0.08, 0.11), (0.085, 0.12), (0.07, 0.12), (0, 0.1)], (IX, IY, FZ + 0.76), bronze, 32)
for k in range(3): cyl(f'CenserFoot{k}', 0.01, 0.03, (IX + math.cos(TAU * k / 3) * 0.05, IY + math.sin(TAU * k / 3) * 0.05, FZ + 0.765), bronze, 8)
tube('IncenseStick', [(IX, IY, FZ + 0.86), (IX + 0.01, IY, FZ + 1.06)], 0.002, mat('IncenseRed', '#6a2418', 0.8), poly=True)
sphere('IncenseTip', 0.004, (IX + 0.01, IY, FZ + 1.062), mat('Ember', '#ff6a2a', 0.5, emit='#ff5a1a', emit_str=8), segs=8, rings=6)
# an orchid in a celadon pot on a little stand in the back right corner
OX, OY = BW - WT - 0.25, BD - WT - 0.25
lathe('OrchidStand', [(0, 0), (0.13, 0), (0.13, 0.02), (0.05, 0.05), (0.045, 0.6), (0.13, 0.62), (0.14, 0.65), (0, 0.65)], (OX, OY, FZ), zitan, 6)
lathe('OrchidPot', [(0, 0), (0.07, 0), (0.09, 0.08), (0.095, 0.1), (0, 0.1)], (OX, OY, FZ + 0.65), celadon, 28)
R = random.Random(5)
for k in range(14):
    a = TAU * k / 14 + R.uniform(-0.2, 0.2); L = R.uniform(0.25, 0.42); lean = R.uniform(0.5, 1.1)
    base = Vector((OX + math.cos(a) * 0.02, OY + math.sin(a) * 0.02, FZ + 0.74))
    pts = [base + Vector((math.cos(a) * L * lean * t, math.sin(a) * L * lean * t, L * (1.2 * t - 0.9 * t * t))) for t in [i / 10 for i in range(11)]]
    sweep(f'OrchidLeaf{k}', pts, [(-0.006, 0), (0, 0.002), (0.006, 0), (0, -0.002)], bambooLeaf, scale=lambda t: 1 - 0.85 * t)
for k in range(3):
    p = Vector((OX + R.uniform(-0.08, 0.08), OY + R.uniform(-0.08, 0.08), FZ + 0.9 + R.uniform(0, 0.08)))
    for j in range(5): sphere(f'OrchidFlower{k}{j}', 0.008, tuple(p + Vector((math.cos(TAU * j / 5) * 0.012, math.sin(TAU * j / 5) * 0.012, 0))), mat('OrchidPetal', '#e6edcc', 0.5, sheen=0.4), scale=(1, 1, 0.4), segs=8, rings=6)
# a scholar's rock on a stand in the back left corner
SRX, SRY = -(BW - WT) + 0.2, BD - WT - 0.22
lathe('RockStand', [(0, 0), (0.12, 0), (0.12, 0.04), (0.1, 0.06), (0, 0.06)], (SRX, SRY, FZ + 0.0), zitan, 8)
sr = sphere('ScholarRock', 0.1, (SRX, SRY, FZ + 0.26), taihu, scale=(0.9, 0.7, 2.0), segs=24, rings=16)
dm = sr.modifiers.new('disp', 'DISPLACE'); tx_ = bpy.data.textures.new('SRNoise', 'CLOUDS'); tx_.noise_scale = 0.08; dm.texture = tx_; dm.strength = 0.07
# the hanging lantern in the middle bay, a round gauze lantern on a cord from the purlin
LN = Vector((0, -0.75, CZ - 0.78))
o = lathe('Lantern', [(r, h) for (r, h) in [(0.02, -0.17), (0.1, -0.15), (0.16, -0.08), (0.18, 0.0), (0.16, 0.08), (0.1, 0.15), (0.02, 0.17)]], tuple(LN), paperWarm, 36); o.visible_shadow = False
for zz in (0.165, -0.165): cyl(f'LanternCap{zz}', 0.06, 0.03, (LN.x, LN.y, LN.z + zz), zitan, 20)
tube('LanternCord', [(LN.x, LN.y, LN.z + 0.18), (LN.x, LN.y, CZ - 0.1)], 0.004, cord, poly=True)
tube('LanternTassel', [(LN.x, LN.y, LN.z - 0.18), (LN.x, LN.y, LN.z - 0.42)], 0.016, tasselM, poly=True)
point_light('LanternLight', tuple(LN), 26, (1.0, 0.66, 0.38), 0.12)

# ---------------------------------------------------------------- the garden: bamboo, a plum in blossom, a Taihu rock, a lily pond, stepping stones, raked ripples
def seg_into(bm, a, b, r):
    """a slim four-sided rod from a to b, added to bm (for the many small twigs, as one mesh instead of hundreds of curves)"""
    a, b = Vector(a), Vector(b); d = b - a; L = d.length
    if L < 1e-5: return
    z = d.normalized(); x = z.cross(Vector((0, 0, 1)) if abs(z.z) < 0.95 else Vector((1, 0, 0))).normalized(); y = z.cross(x)
    M = Matrix((x, y, z)).transposed().to_4x4(); M.translation = (a + b) / 2
    bmesh.ops.create_cone(bm, cap_ends=False, segments=4, radius1=r, radius2=r * 0.7, depth=L, matrix=M)
TWIGS = bmesh.new()
def bamboo_culm(name, base, h, r, lean, seed, leafy=True, bmL=None):
    R = random.Random(seed); n = int(h / 0.32)
    pts = [Vector(base) + Vector((lean[0] * (k / n) ** 1.6 * h, lean[1] * (k / n) ** 1.6 * h, h * k / n)) for k in range(n + 1)]
    tube(name, [tuple(p) for p in pts], r, bamboo_m, res=2, poly=True, taper=lambda t: 1 - 0.55 * t)
    nb = bmesh.new()
    for k, p in enumerate(pts[1:-1], 1):
        rr = r * (1 - 0.55 * k / n) * 1.25
        bmesh.ops.create_cone(nb, cap_ends=True, segments=10, radius1=rr, radius2=rr, depth=0.012, matrix=Matrix.Translation(p))
    bm_obj(name + 'Nodes', nb, bambooNode)
    if not leafy: return
    for k, p in enumerate(pts):
        if k < n * 0.4 or R.random() < 0.15: continue
        for side in range(R.randint(2, 3)):
            a = R.uniform(0, TAU); rr = R.uniform(0.2, 0.5); twig_end = p + Vector((math.cos(a) * rr, math.sin(a) * rr, R.uniform(-0.05, 0.12)))
            seg_into(TWIGS, p, twig_end, 0.004)
            for j in range(R.randint(5, 8)):                       # slim leaves fanned down and out from the twig
                b = a + R.uniform(-1.0, 1.0); L = R.uniform(0.2, 0.32); W = L * 0.12; droop = R.uniform(0.3, 0.8)
                d = Vector((math.cos(b), math.sin(b), -droop)).normalized(); s = Vector((-math.sin(b), math.cos(b), 0)) * W
                q0 = twig_end; q1 = q0 + d * L * 0.35 + s; q2 = q0 + d * L; q3 = q0 + d * L * 0.35 - s
                vs = [bmL.verts.new(q) for q in (q0, q1, q2, q3)]; bmL.faces.new(vs)
leafbm = bmesh.new()
R = random.Random(77)
culms = [(-4.4 + R.uniform(-0.5, 0.6), -2.8 + R.uniform(-0.3, 5.6)) for _ in range(24)] + [(-3.6 + R.uniform(-0.3, 0.3), 2.3 + R.uniform(-0.4, 0.8)) for _ in range(8)]
for k, (x, y) in enumerate(culms):
    h = R.uniform(3.8, 6.4); bamboo_culm(f'Bamboo{k}', (x, y, 0), h, R.uniform(0.028, 0.045), (R.uniform(0.0, 0.06), R.uniform(-0.03, 0.03)), 100 + k, bmL=leafbm)
lo_ = bm_obj('BambooLeaves', leafbm, bambooLeaf, smooth=False)
bm_obj('BambooTwigs', TWIGS, bamboo_m, smooth=False)
for k in range(10):                                         # bamboo shoots and a few stalks behind the hall
    x, y = R.uniform(-2.4, 2.8), R.uniform(2.1, 3.5); bamboo_culm(f'BambooBack{k}', (x, y, 0), R.uniform(4.5, 6.2), R.uniform(0.03, 0.042), (R.uniform(-0.03, 0.03), R.uniform(0.0, 0.05)), 200 + k, bmL=None, leafy=False)
lb2 = bmesh.new()
for k in range(10):
    x, y = R.uniform(-2.4, 2.8), R.uniform(2.1, 3.5)
    for j in range(160):
        p = Vector((x + R.uniform(-0.6, 0.6), y + R.uniform(-0.5, 0.5), R.uniform(3.2, 6.0))); b = R.uniform(0, TAU); L = R.uniform(0.2, 0.3); W = L * 0.12
        d = Vector((math.cos(b), math.sin(b), -0.5)).normalized(); s = Vector((-math.sin(b), math.cos(b), 0)) * W
        vs = [lb2.verts.new(q) for q in (p, p + d * L * 0.35 + s, p + d * L, p + d * L * 0.35 - s)]; lb2.faces.new(vs)
bm_obj('BambooLeavesBack', lb2, bambooLeaf, smooth=False)

def plum_tree(name, base, seed):
    """a gnarled old plum: a leaning trunk that forks into crooked branches, blossoms clustered along the twigs"""
    R = random.Random(seed); bl = []
    def branch(p, d, L, r, depth):
        pts = [p]
        for k in range(4):
            d = (d + Vector((R.uniform(-0.45, 0.45), R.uniform(-0.45, 0.45), R.uniform(-0.15, 0.35)))).normalized(); p = p + d * L / 4; pts.append(p)
        tube(f'{name}B{depth}_{len(bl)}', [tuple(q) for q in pts], r, twig, res=3, poly=False, taper=lambda t: 1 - 0.5 * t)
        for q in pts[1:]:
            if depth <= 2:
                for _ in range(R.randint(2, 4)): bl.append(q + Vector((R.uniform(-0.06, 0.06), R.uniform(-0.06, 0.06), R.uniform(-0.03, 0.05))))
        if depth > 0:
            for _ in range(R.randint(2, 3)): branch(p, (d + Vector((R.uniform(-1, 1), R.uniform(-1, 1), R.uniform(0.0, 0.7)))).normalized(), L * 0.62, r * 0.6, depth - 1)
    branch(Vector(base), Vector((-0.45, -0.25, 1)).normalized(), 1.9, 0.13, 4)
    fb = bmesh.new(); fw = bmesh.new(); hb = bmesh.new()
    for i, p in enumerate(bl):                       # each blossom a flat five-petal flower, tilted at random, a gold dot at its heart
        tgtbm = fw if i % 4 == 0 else fb
        M = Matrix.Translation(p) @ Matrix.Rotation(R.uniform(-1.2, 1.2), 4, 'X') @ Matrix.Rotation(R.uniform(-1.2, 1.2), 4, 'Y') @ Matrix.Rotation(R.uniform(0, TAU), 4, 'Z')
        c = tgtbm.verts.new(M @ Vector((0, 0, 0.004)))
        for k in range(5):
            a = TAU * k / 5; tip = [tgtbm.verts.new(M @ Vector((math.cos(a + d) * rr, math.sin(a + d) * rr, 0))) for d, rr in ((-0.45, 0.03), (0, 0.044), (0.45, 0.03))]
            tgtbm.faces.new((c, tip[0], tip[1])); tgtbm.faces.new((c, tip[1], tip[2]))
        bmesh.ops.create_cone(hb, cap_ends=True, segments=6, radius1=0.009, radius2=0.004, depth=0.008, matrix=M @ Matrix.Translation((0, 0, 0.006)))
    bm_obj(name + 'Blossom', fb, blossom); bm_obj(name + 'BlossomW', fw, blossomW); bm_obj(name + 'Heart', hb, blossomC)
plum_tree('Plum', (3.45, -2.55, 0.0), 12)

def taihu_rock(name, loc, size, seed):
    """a Taihu rock: a tall eroded stone, pierced through in a few places"""
    o = sphere(name, 1.0, loc, taihu, scale=size, segs=64, rings=48)
    tx = bpy.data.textures.new(name + 'N', 'VORONOI'); tx.noise_scale = 0.16; tx.distance_metric = 'DISTANCE'
    dm = o.modifiers.new('disp', 'DISPLACE'); dm.texture = tx; dm.strength = 0.5 * min(size); dm.mid_level = 0.6
    tx2 = bpy.data.textures.new(name + 'N2', 'CLOUDS'); tx2.noise_scale = 0.12; tx2.noise_depth = 4
    dm2 = o.modifiers.new('disp2', 'DISPLACE'); dm2.texture = tx2; dm2.strength = 0.25 * min(size)
    R = random.Random(seed)
    for k, (fx, fz, sx_, sz_) in enumerate([(-0.25, 0.35, 0.32, 0.16), (0.3, -0.05, 0.28, 0.2), (-0.1, -0.45, 0.36, 0.14), (0.2, 0.62, 0.2, 0.1)]):
        hole = sphere(f'{name}Hole{k}', 1.0, (loc[0] + fx * size[0], loc[1], loc[2] + fz * size[2]), taihu, scale=(size[0] * sx_ * 2.2, size[1] * 3.0, size[2] * sz_ * 2.2), segs=16, rings=10)
        hole.rotation_euler = (R.uniform(-0.4, 0.4), 0, R.uniform(-0.8, 0.8)); hole.hide_render = True; hole.hide_viewport = True
        b = o.modifiers.new(f'hole{k}', 'BOOLEAN'); b.object = hole; b.operation = 'DIFFERENCE'; b.solver = 'EXACT'
    return o
taihu_rock('TaihuRock', (2.55, -4.55, 0.62), (0.34, 0.26, 0.68), 8)
box('TaihuBase', (0.7, 0.55, 0.06), (2.55, -4.55, 0.03), moss, 0.03)

# raked ripples round the rock: low rings of gravel
for k in range(9):
    r = 0.45 + k * 0.17
    pts = [(2.55 + math.cos(TAU * i / 96) * r * 1.15, -4.55 + math.sin(TAU * i / 96) * r * 0.85, 0.012) for i in range(97)]
    pts = [p for p in pts if -5.75 < p[1] < -3.55 and p[0] < 4.9]
    if len(pts) > 2: tube(f'Ripple{k}', pts, 0.008, gravel, res=2, poly=True)
# the lily pond: a stone-edged pool, still dark water, pads and two flowers
PC = Vector((-2.6, -4.65, 0)); prx, pry = 1.15, 0.72
pond_out = [(PC.x + math.cos(a) * prx * (1 + 0.08 * math.sin(3 * a + 1)), PC.y + math.sin(a) * pry * (1 + 0.1 * math.cos(2 * a))) for a in [TAU * i / 64 for i in range(64)]]
o = outline_curve('PondWater', pond_out, [], 0.02, water, rotx=0.0); o.location = (0, 0, -0.06)
R = random.Random(21)
for i in range(0, 64, 2):
    x, y = pond_out[i]; s = R.uniform(0.12, 0.2)
    st = sphere(f'PondStone{i}', 1.0, (x, y, 0.02), pebble, scale=(s, s * 0.8, s * 0.45), segs=12, rings=8); st.rotation_euler = (0, 0, R.uniform(0, 3))
pb = bmesh.new()
for k in range(9):
    a = R.uniform(0, TAU); rr = R.uniform(0.1, 0.75); x, y = PC.x + math.cos(a) * rr * prx, PC.y + math.sin(a) * rr * pry
    r = R.uniform(0.08, 0.13); notch = R.uniform(0, TAU)
    c = pb.verts.new((x, y, -0.035)); ring = []
    for j in range(25):
        t = notch + 0.35 + (TAU - 0.7) * j / 24; ring.append(pb.verts.new((x + math.cos(t) * r, y + math.sin(t) * r, -0.036)))
    for j in range(24): pb.faces.new((c, ring[j], ring[j + 1]))
bm_obj('LilyPads', pb, padM, smooth=False)
for k, (fx, fy) in enumerate([(-2.9, -4.5), (-2.25, -4.85)]):
    for j in range(8):
        a = TAU * j / 8
        p = sphere(f'Lotus{k}_{j}', 0.035, (fx + math.cos(a) * 0.03, fy + math.sin(a) * 0.03, -0.01), lotus, scale=(1.4, 0.7, 0.5), segs=10, rings=6); p.rotation_euler = (0.5, 0, a)
    sphere(f'LotusHeart{k}', 0.018, (fx, fy, 0.0), lotusC, segs=10, rings=6)
# stepping stones from the front edge up to the moon gate
for k, (x, y) in enumerate([(0.1, -5.45), (-0.12, -5.0), (0.08, -4.55), (-0.08, -4.1), (0.0, -3.7)]):
    s = 0.24 - k * 0.006
    st = sphere(f'SteppingStone{k}', 1.0, (x, y, 0.02), graniteP, scale=(s * 1.3, s, 0.05), segs=16, rings=8); st.rotation_euler = (0, 0, R.uniform(-0.6, 0.6))
# moss and low grass along the wall foot and round the bamboo
mb = bmesh.new()
for k in range(14):
    x, y = (R.uniform(-5.0, -3.2), R.uniform(-2.8, 3.4)) if k < 9 else (R.uniform(3.6, 4.9), R.uniform(-1.0, 3.3))
    for j in range(5):                                       # a patch is a few overlapping low lumps
        s = R.uniform(0.08, 0.2)
        bmesh.ops.create_uvsphere(mb, u_segments=8, v_segments=5, radius=1.0, matrix=Matrix.Translation((x + R.uniform(-0.25, 0.25), y + R.uniform(-0.2, 0.2), 0.0)) @ Matrix.Diagonal((s, s * R.uniform(0.5, 1.0), 0.03, 1)))
bm_obj('Moss', mb, moss)
gb = bmesh.new()
for k in range(260):
    x, y = (R.uniform(-5.1, -2.8), R.uniform(-5.7, 3.6)) if k < 150 else (R.uniform(3.2, 5.1), R.uniform(-3.2, 3.6)) if k < 220 else (R.uniform(-3.5, 3.5), R.uniform(2.0, 3.6))
    for j in range(5):
        a = R.uniform(0, TAU); L = R.uniform(0.08, 0.2); b = Vector((x, y, 0)); t = b + Vector((math.cos(a) * L * 0.4, math.sin(a) * L * 0.4, L)); s = Vector((-math.sin(a), math.cos(a), 0)) * 0.006
        vs = [gb.verts.new(q) for q in (b - s, b + s, t)]; gb.faces.new(vs)
bm_obj('Grass', gb, mat('Grass', '#4a6a38', 0.7), smooth=False)

# ---------------------------------------------------------------- the right side, to answer the bamboo: banana plants by the lattice window (窗外芭蕉),
# a stone lantern at the end of the garden wall, clipped boxwood in the front corner
bananaLeaf = mat('BananaLeaf', '#4a7036', 0.55, sheen=0.2); bananaRib = mat('BananaRib', '#a4b878', 0.55)
bananaStem = wood_mat('BananaStem', '#6f8a4a', '#4e6634', 3, 0.05, 'z', 0.6)
def banana(name, base, h, seed):
    """a banana plant: a short thick trunk of leaf sheaths, broad blunt-tipped blades rising out of its top and bending over
    under their own weight, one young leaf still rolled"""
    R = random.Random(seed); top = Vector(base) + Vector((R.uniform(-0.05, 0.05), R.uniform(-0.05, 0.05), h)); up = Vector((0, 0, 1))
    tube(name + 'Stem', [tuple(Vector(base)), tuple(Vector(base).lerp(top, 0.5) + Vector((0.015, 0, 0))), tuple(top)], 0.11, bananaStem, res=3, poly=False, taper=lambda t: 1 - 0.4 * t)
    tube(name + 'Furl', [tuple(top), tuple(top + Vector((0.03, 0.01, 0.7)))], 0.035, bananaLeaf, res=2, poly=True, taper=lambda t: 1 - 0.8 * t)
    n = R.randint(7, 9)
    for k in range(n):
        a = TAU * k / n + R.uniform(-0.3, 0.3); d = Vector((math.cos(a), math.sin(a), 0)); L = R.uniform(1.6, 2.1)
        e = R.uniform(0.7, 1.25); g = R.uniform(0.22, 0.34); start = top - up * R.uniform(0.0, 0.25)
        path = [start + (d * math.cos(e) + up * math.sin(e)) * (L * t) - up * g * (L * t) ** 2 for t in [i / 16 for i in range(17)]]
        width = lambda t: min(1.0, 0.12 + t * 4.4) if t < 0.2 else 1.0 if t < 0.8 else 1.0 - (t - 0.8) / 0.2 * 0.62
        sweep(f'{name}Leaf{k}', path, [(-0.27, -0.025), (0, 0.012), (0.27, -0.025), (0, -0.004)], bananaLeaf, scale=width)
        tube(f'{name}Rib{k}', [tuple(p + Vector((0, 0, 0.012))) for p in path[:15]], 0.012, bananaRib, res=2, poly=True, taper=lambda t: 1 - 0.7 * t)
for k, (x, y, h) in enumerate([(4.3, -1.5, 2.2), (4.75, -0.65, 1.8), (4.1, -0.1, 2.0), (4.7, 0.6, 1.6)]): banana(f'Banana{k}', (x, y, 0), h, 300 + k)

def stone_lantern(name, x, y):
    """a granite lantern: plinth, shaft and a hexagonal fire chamber whose warm panes glow between six posts, under a flared cap"""
    cyl(name + 'Plinth', 0.27, 0.1, (x, y, 0.05), granite, segs=6); cyl(name + 'Foot', 0.2, 0.12, (x, y, 0.16), granite, segs=6, r2=0.15)
    cyl(name + 'Shaft', 0.075, 0.56, (x, y, 0.5), granite, segs=12, r2=0.065)
    cyl(name + 'Deck', 0.21, 0.08, (x, y, 0.82), granite, segs=6, r2=0.17)
    cyl(name + 'Glow', 0.12, 0.24, (x, y, 0.98), paperWarm, segs=6)
    for k in range(6):
        a = TAU * k / 6
        box(f'{name}Post{k}', (0.04, 0.04, 0.26), (x + math.cos(a) * 0.15, y + math.sin(a) * 0.15, 0.98), granite, rot=(0, 0, a))
    cyl(name + 'Lintel', 0.17, 0.035, (x, y, 1.12), granite, segs=6)
    lathe(name + 'Cap', [(0.0, 0.3), (0.06, 0.28), (0.17, 0.2), (0.29, 0.1), (0.31, 0.075), (0.29, 0.06), (0.0, 0.06)], (x, y, 1.08), granite, segs=6)
    sphere(name + 'Jewel', 0.055, (x, y, 1.42), granite, segs=12, rings=8); cyl(name + 'JewelFoot', 0.04, 0.04, (x, y, 1.37), granite, segs=12)
    point_light('LanternLightGarden', (x, y, 0.98), 14, (1.0, 0.66, 0.38), 0.08)
stone_lantern('StoneLantern', 4.62, -3.05)

boxwood = mat('Boxwood', '#3c5c30', 0.8, sheen=0.2)
for k, (x, y, r) in enumerate([(4.95, -5.25, 0.27), (4.98, -4.5, 0.22), (4.62, -5.65, 0.18)]):
    o = sphere(f'Boxwood{k}', r, (x, y, r * 0.75), boxwood, scale=(1, 1, 0.8), segs=24, rings=16)
    tx = bpy.data.textures.new(f'Boxwood{k}N', 'CLOUDS'); tx.noise_scale = 0.07; tx.noise_depth = 2
    dm = o.modifiers.new('leafy', 'DISPLACE'); dm.texture = tx; dm.strength = r * 0.35

# ---------------------------------------------------------------- lights, camera, render
w = bpy.data.worlds.new('StudyWorld'); w.use_nodes = True; sc.world = w
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = col('#0f1830'); bg.inputs['Strength'].default_value = 0.5
sd = bpy.data.lights.new('Moon', 'SUN'); sd.energy = 2.4; sd.color = (0.66, 0.76, 1.0); sd.angle = math.radians(3)
sun = link(bpy.data.objects.new('Moon', sd)); sun.rotation_euler = (math.radians(58), 0, math.radians(200))     # high behind on the left: a cool rim on roofs and bamboo
tgt = link(bpy.data.objects.new('CamTarget', None)); tgt.location = (0, -0.6, 2.25)
fill = area_light('Fill', (7, -10, 6.5), 170, 6, (0.78, 0.84, 1.0))
c = fill.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
key = area_light('FrontKey', (-6, -9, 7), 190, 5, (0.8, 0.86, 1.0))
c = key.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'
area_light('WindowLight', (0, BD + 0.12, FZ + RW['cz']), 50, 1.4, (0.72, 0.8, 1.0), rot=(-math.pi / 2, 0, 0), shape='DISK')
area_light('LatticeLight', (BW + 0.1, LW['cy'], FZ + LW['cz']), 26, 1.0, (0.72, 0.8, 1.0), rot=(0, -math.pi / 2, 0))
area_light('HallGlow', (0, 0.1, CZ - 0.15), 70, 2.4, (1.0, 0.68, 0.42))
area_light('FrontSpill', (0, -BD - 0.2, CZ - 0.3), 160, 3.0, (1.0, 0.66, 0.4), rot=(math.radians(-50), 0, 0), shape='RECTANGLE', size_y=1.2)
for k, face in enumerate(('front', 'back', 'left', 'right')):
    v = {'front': (0, -AX + 0.3, 0), 'back': (0, AX - 0.3, 0), 'left': (-AX + 0.3, 0, 0), 'right': (AX - 0.3, 0, 0)}[face]
    point_light(f'AtticLamp{face}', (v[0], v[1], AZ0 + 1.15), 12, (1.0, 0.66, 0.38), 0.15)

cd = bpy.data.cameras.new('StudyCam'); cd.lens = 44; cd.clip_end = 200
cam = link(bpy.data.objects.new('StudyCam', cd))
def place_cam(yaw_deg, pitch=0.42, dist=17.0):
    a = math.radians(yaw_deg); d = Vector((math.cos(a), math.sin(a), 0))
    cam.location = tgt.location + Vector((d.x * math.cos(pitch) * dist, d.y * math.cos(pitch) * dist, math.sin(pitch) * dist))
tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
place_cam(-90, 0.42, 18.0); sc.camera = cam

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
    ng = bpy.data.node_groups.new('StudyComp', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl_ = ng.nodes.new('CompositorNodeRLayers'); out_ = ng.nodes.new('NodeGroupOutput'); gl = ng.nodes.new('CompositorNodeGlare')
    for k, v in [('Type', 'Fog Glow'), ('Quality', 'High'), ('Threshold', 1.0), ('Strength', 0.6), ('Size', 0.6)]:
        if k in gl.inputs:
            try: gl.inputs[k].default_value = v
            except Exception as e: print('glare input', k, e)
    ng.links.new(rl_.outputs['Image'], gl.inputs['Image']); ng.links.new(gl.outputs['Image'], out_.inputs[0])
    sc.compositing_node_group = ng
except Exception as e: print('compositor skipped:', e)

blend = os.path.join(HERE, 'oracle_study.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend)
print('BUILT', len(sc.objects), 'objects ->', blend, flush=True)

if '--preview' in ARGS or '--render' in ARGS:
    big = '--render' in ARGS
    sc.render.resolution_x, sc.render.resolution_y = (2000, 1250) if big else (1200, 750)
    sc.cycles.samples = 160 if big else int(ARGS[ARGS.index('--samples') + 1]) if '--samples' in ARGS else 48
    WIDE = (0, -0.6, 2.25)
    shots = [('front', -90, 0.42, 18.0, 44, WIDE), ('left', -115, 0.42, 18.0, 44, WIDE), ('right', -65, 0.42, 18.0, 44, WIDE),
             ('inside', -90, 0.1, 2.2, 24, (0, 0.35, FZ + 1.0)), ('desk', -90, 0.55, 1.6, 30, (0, DESK['y'], FZ + DESK['h']))]
    if '--only' in ARGS: shots = [s_ for s_ in shots if s_[0] in ARGS[ARGS.index('--only') + 1].split(',')]
    for name, yaw, pitch, dist, lens, at in shots:
        tgt.location = at; cd.lens = lens; place_cam(yaw, pitch, dist); sc.render.filepath = OUT + f'study_{name}{"" if big else "_preview"}.png'
        t0 = time.time(); bpy.ops.render.render(write_still=True); print('RENDERED', name, round(time.time() - t0, 1), 's', flush=True)
    tgt.location = WIDE; cd.lens = 44; place_cam(-90, 0.42, 18.0)
