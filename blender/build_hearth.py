# 北欧炉边 · the Nordic hearth from page 6 of the pop-up book, built in Blender as a cut-away diorama like the tent, the
# shrine, the study, the tea room and the moonlit window. A snowed-in island under the northern lights: spruces heavy with
# snow, a frozen pond with reeds on the left, a snowman, a red kick-sled, a fence of slanted poles and a lantern post in
# front, a reindeer by the right-hand window and a woodpile under a lean-to. On it a log cabin with notched corners under a
# steep gable of snow and icicles, open at the front like a stage: inside, a whitewashed stone fireplace with the fire
# lit, a mantel with candles and a red Dala horse; a low table on a rag rug with the leather rune pouch and the candle the
# New Year's tin is held up to; the white of the chimney breast where its shadow falls; a bucket of cold water, a basket
# of birch logs, a straw Yule goat; a rocking chair with a sheepskin, a dog asleep, a ryijy, a board with the 24 runes,
# a straw himmeli, shelves of books, jars of lingonberry and blue plates, a bench with Selbu-knit cushions, a painting of
# the northern lights.
# Run headless:  Blender -b --factory-startup --python build_hearth.py -- [--preview] [--render] [--only front,inside]
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
sc.name = 'OracleHearth'
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
def slab(name, pts, thick, loc, m, rotz=0.0):
    o = outline_curve(name, pts, [], thick, m); o.location = loc; o.rotation_euler = (math.pi / 2, 0, rotz); return o
def blob_into(bm, r, loc, scale=(1, 1, 1), sub=1):
    """a little rounded lump (a pebble, a leaf cluster) added into a shared mesh"""
    mt = Matrix.Translation(loc) @ Matrix.Diagonal((scale[0] * r, scale[1] * r, scale[2] * r, 1))
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0, matrix=mt)
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

# ---------------------------------------------------------------- materials of the Nordic hearth
def snow_mat(name, c1='#f4f8ff', c2='#d8e2f0', rough=0.55):
    """snow: blue-white, softly mottled, a fine crust bump"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.6; nz.inputs['Detail'].default_value = 6.0; L.new(oc, nz.inputs['Vector'])
    L.new(ramp(N, nz.outputs['Fac'], [(0.35, c2), (0.7, c1)]), p.inputs['Base Color']); p.inputs['Roughness'].default_value = rough
    p.inputs['Sheen Weight'].default_value = 0.4; p.inputs['Sheen Tint'].default_value = col('#e8f0ff')
    fine = N.new('ShaderNodeTexNoise'); fine.inputs['Scale'].default_value = 30.0; L.new(oc, fine.inputs['Vector'])
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.12; L.new(fine.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m
def endgrain_mat(name, c1, c2):
    """the sawn end of a log: rings round its own axis (z, as it was made)"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m)
    wv = N.new('ShaderNodeTexWave')
    try: wv.wave_type = 'RINGS'; wv.rings_direction = 'Z'
    except Exception as e: print('wave', e)
    wv.inputs['Scale'].default_value = 9.0; wv.inputs['Distortion'].default_value = 2.5; L.new(objco(N), wv.inputs['Vector'])
    L.new(ramp(N, wv.outputs['Fac'], [(0.2, c2), (0.8, c1)]), p.inputs['Base Color']); p.inputs['Roughness'].default_value = 0.8
    MATS[name] = m; return m
def birch_mat(name):
    """birch bark: chalk white with dark dashes across the log"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (22, 22, 3.0); L.new(oc, mp.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; nz.inputs['Detail'].default_value = 4.0; L.new(mp.outputs['Vector'], nz.inputs['Vector'])
    L.new(ramp(N, nz.outputs['Fac'], [(0.56, '#ece6da'), (0.6, '#2a2420')]), p.inputs['Base Color']); p.inputs['Roughness'].default_value = 0.7
    MATS[name] = m; return m

def limestone_mat(name):
    """whitewash over fieldstone: rounded stones showing through the lime, their joints a little darker and sunk"""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; N, L = nodes(m); p = principled(m); oc = objco(N)
    # stones: the joints between neighbouring cells, bent by a little noise so no joint runs straight, lime-washed pale
    wp = N.new('ShaderNodeTexNoise'); wp.inputs['Scale'].default_value = 3.0; L.new(oc, wp.inputs['Vector'])
    mixv = N.new('ShaderNodeMix'); mixv.data_type = 'VECTOR'; mixv.inputs['Factor'].default_value = 0.16
    L.new(oc, mixv.inputs['A']); L.new(wp.outputs['Color'], mixv.inputs['B'])
    vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 4.6; L.new(mixv.outputs['Result'], vo.inputs['Vector'])
    try: vo.feature = 'DISTANCE_TO_EDGE'
    except Exception as e: print('voronoi', e)
    joints = ramp(N, vo.outputs['Distance'], [(0.0, '#c9bca5'), (0.05, '#ebe3d4')])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 5.0; nz.inputs['Detail'].default_value = 8.0; L.new(oc, nz.inputs['Vector'])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 0.18
    L.new(joints, mx.inputs['A']); L.new(ramp(N, nz.outputs['Fac'], [(0.3, '#d8cfbe'), (0.7, '#ffffff')]), mx.inputs['B']); L.new(mx.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.92
    inv = N.new('ShaderNodeMath'); inv.operation = 'MINIMUM'; inv.inputs[1].default_value = 0.07; L.new(vo.outputs['Distance'], inv.inputs[0])
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.35; L.new(inv.outputs[0], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

LOG = wood_mat('Log', '#8e5e38', '#6a4226', stretch=7, bump=0.12, axis='z', rough=0.7)
LOGEND = endgrain_mat('LogEnd', '#d2a46a', '#a87a48')
BOARDS = wood_mat('Boards', '#7a5034', '#5a3824', stretch=9, bump=0.06, axis='z', rough=0.7)
PINEW = wood_mat('PineWood', '#c8925a', '#a8743e', stretch=8, bump=0.03, axis='x', rough=0.5, coat=0.2)
PINEWY = wood_mat('PineWoodY', '#c8925a', '#a8743e', stretch=8, bump=0.03, axis='y', rough=0.5, coat=0.2)
PINEWZ = wood_mat('PineWoodZ', '#c8925a', '#a8743e', stretch=8, bump=0.03, axis='z', rough=0.5, coat=0.2)
WALNUT = wood_mat('Walnut', '#6e452a', '#46291a', stretch=8, bump=0.02, axis='x', rough=0.4, coat=0.4)
FLOOR = planks_mat('Floorboards', '#b08458', '#9a7048', '#3a2618')
SNOW = snow_mat('Snow'); PACKED = snow_mat('PackedSnow', '#dfe6f0', '#c4cedc', rough=0.7)
ICE = mat('Ice', '#b6daee', rough=0.05, coat=1.0, emit='#9cc8f0', emit_str=0.25)
FOOT = stone_mat('Footing', '#8a8a8e', '#6a6a70', scale=30, rough=0.8, speck='#3a3a3e', speck_amt=0.05)
HEARTHSTONE = stone_mat('HearthStone', '#7e7872', '#5c5650', scale=18, rough=0.7, bump=0.2)
ROCK = stone_mat('Rock', '#7a7880', '#5a5862', scale=12, rough=0.8, bump=0.3)
EARTH = stone_mat('Earth', '#4a3a30', '#362a22', scale=14, rough=0.9, bump=0.4, speck='#7a7670', speck_amt=0.09)
WHITEWASH = plaster_mat('Whitewash', '#efe9de', '#dcd3c4', rough=0.9); LIMESTONE = limestone_mat('LimeStone')
ARCHSTONE = stone_mat('ArchStone', '#a8a298', '#8a847a', scale=22, rough=0.75, bump=0.25, speck='#5a5650', speck_amt=0.05)
KURBITS = imgmat('Kurbits', 'hearth_kurbits.jpg', rough=0.85)
SOOT = mat('Soot', '#0c0908', rough=1.0); CHAR = mat('Char', '#1a1310', rough=0.95)
EMBER = mat('Ember', '#ff7a2a', emit='#ff5010', emit_str=9)
IRON = mat('Iron', '#24262c', rough=0.5, metal=0.6); BRASS = mat('Brass', '#c99e4e', rough=0.28, metal=0.9); COPPER = mat('Copper', '#c87850', rough=0.3, metal=0.9)
FLAME = mat('Flame', '#ffd890', emit='#ffb050', emit_str=20)
WAX = mat('Wax', '#f4ecdc', rough=0.5)
FROST = mat('FrostPane', '#e8f0ff', rough=0.4, emit='#ffcf8a', emit_str=1.4)              # lit from inside, seen from out
FROSTIN = mat('FrostPaneIn', '#cfdcef', rough=0.4, emit='#9ab4e0', emit_str=0.5)          # moonlit frost, seen from in
PAPERGLOW = mat('PaperStar', '#ffe8b8', rough=0.6, emit='#ffc870', emit_str=7)
WINFRAME = mat('WindowFrame', '#ece8e0', rough=0.5)
GINGHAM = mat('Gingham', '#b8423a', rough=0.8, sheen=0.5)
RUG = imgmat('RagRug', 'hearth_rug.jpg', rough=0.95, sheen=0.5)
RYIJY = imgmat('Ryijy', 'hearth_ryijy.jpg', rough=0.95, sheen=0.7)
KNIT = imgmat('Knit', 'hearth_knit.jpg', rough=0.9, sheen=0.6, repeat=(2, 2))
PAINTING = imgmat('Painting', 'hearth_painting.jpg', rough=0.6)
FUTHARK = imgmat('FutharkBoard', 'hearth_futhark.jpg', rough=0.6)
SHEEP = mat('Sheepskin', '#efe8dc', rough=0.95, sheen=1.0)
LEATHER = mat('Leather', '#7a4a2a', rough=0.6, sheen=0.35); CORD = mat('Cord', '#c8a868', rough=0.7)
DALA = mat('DalaRed', '#c0282a', rough=0.3, coat=0.6); DALAW = mat('DalaWhite', '#f2ece0', rough=0.4); DALAB = mat('DalaBlue', '#2a4a8a', rough=0.4); DALAG = mat('DalaGreen', '#3a7a4a', rough=0.4)
STRAW = mat('Straw', '#d8b45a', rough=0.6, sheen=0.3); RIBBON = mat('RedRibbon', '#b8282c', rough=0.5, sheen=0.4)
BIRCH = birch_mat('BirchBark')
PINE = mat('PineNeedle', '#1e3e3a', rough=0.75); GREYWOOD = wood_mat('GreyWood', '#8a8478', '#6a6458', stretch=6, bump=0.1, axis='z', rough=0.85); BARK = wood_mat('Bark', '#4e3e34', '#2e241e', stretch=4, bump=0.35, axis='z', rough=0.9)
DOG = mat('DogFur', '#b07a44', rough=0.85, sheen=0.8); DOGW = mat('DogCream', '#ead6b4', rough=0.85, sheen=0.8); NOSE = mat('Nose', '#1a1614', rough=0.3)
DEER = mat('DeerFur', '#7a6454', rough=0.9, sheen=0.6); DEERW = mat('DeerRuff', '#e6ded2', rough=0.9, sheen=0.8); ANTLER = mat('Antler', '#cbb498', rough=0.7)
CARROT = mat('Carrot', '#e8742a', rough=0.6); SCARF = mat('Scarf', '#2a5a8a', rough=0.85, sheen=0.5); HATRED = mat('HatRed', '#b3262c', rough=0.85, sheen=0.5)
SLEDRED = mat('SledRed', '#a8282a', rough=0.45, coat=0.4)
BOOKS = [mat('Book' + k, c, rough=0.7) for k, c in [('Red', '#8a2a2a'), ('Navy', '#2e3a6a'), ('Green', '#2e5a46'), ('Ochre', '#b0802e'), ('Cream', '#d8ccb0')]]
JAR = mat('JarGlass', '#cfe0e0', rough=0.05, coat=1.0, emit='#a8c0c0', emit_str=0.1); JAM = mat('Lingonberry', '#8a1a22', rough=0.3)
MUG = mat('Mug', '#e8e0d0', rough=0.3, coat=0.5); GLOGG = mat('Glogg', '#5a1418', rough=0.1, coat=1.0)
GLOWPANE = mat('LanternGlass', '#fff0d0', rough=0.3, emit='#ffd8a0', emit_str=6.0)
WATER = mat('BucketWater', '#1a2a3a', rough=0.03, coat=1.0)

# ---------------------------------------------------------------- dimensions (front is -y; the snow is z = 0)
F = 0.4                           # the cabin floor, on a stone footing
BX, BY0, BY1 = 2.7, -1.8, 2.0     # outside of the log walls: x within +-2.7, the open front at y = -1.8, the back at 2.0
LR, LH, NC = 0.115, 0.2, 16       # a log's radius, the height of a course, sixteen courses
IX, IY1 = BX - 2 * LR, BY1 - 2 * LR   # the inside faces of the walls: x = +-2.47, back y = 1.77
EAV = F + NC * LH                 # the top of the walls, 3.6
RISE, OV = 2.4, 0.4               # the roof: 2.4 over the eaves at the ridge, 0.4 out past the walls
SL = RISE / BX; TH = math.atan(SL)
ZR = EAV + RISE                   # the ridge
T = F + 0.5                       # the low table's top
TX, TY = 0.0, 0.0                 # the table's middle
FP = dict(w=0.95, d=0.7, h=1.9, bw=0.62, bd=0.5)      # the fireplace: half-width, depth, height of the body; the chimney breast
FY = IY1 - FP['d']                # the fireplace's front face, 1.07
IC, IA, IB, IN = (0.0, 0.2), 6.6, 4.8, 4.0               # the island: a rounded oblong (a superellipse of power 4)
def island_y(x, s=-1):
    k = max(0.0, 1 - abs((x - IC[0]) / IA) ** IN); return IC[1] + s * IB * k ** (1 / IN)

def log_(name, a, b, r, m=LOG, segs=16, end=LOGEND):
    """a round log from a to b, its sides smooth and its sawn ends flat, ringed"""
    a, b = Vector(a), Vector(b); d = b - a
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=d.length)
    for f in bm.faces:
        cap = abs(f.normal.z) > 0.9; f.material_index = 1 if cap else 0; f.smooth = not cap
    o = bm_obj(name, bm, smooth=False, mats=(m, end)); o.location = (a + b) / 2
    o.rotation_euler = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler(); return o
def marker(name, loc):
    e = bpy.data.objects.new(name, None); sc.collection.objects.link(e); e.location = loc; return e

# ---------------------------------------------------------------- the island: snow on top, earth and rock round its sides, a snow lip at the rim
def island():
    n = 160; bm = bmesh.new(); rr = random.Random(5); rings = []
    for k, (z, s_) in enumerate([(0.0, 1.0), (-0.1, 1.012), (-0.2, 1.0), (-0.6, 0.982), (-1.05, 0.94)]):
        ring = []
        for i in range(n):
            a = TAU * i / n; c, s = math.cos(a), math.sin(a); j = 1.0 if k < 3 else 1 + rr.uniform(-0.014, 0.014)
            ring.append(bm.verts.new((IC[0] + IA * s_ * j * math.copysign(abs(c) ** (2 / IN), c), IC[1] + IB * s_ * j * math.copysign(abs(s) ** (2 / IN), s), z + (rr.uniform(-0.07, 0.07) if k == 4 else 0))))
        rings.append(ring)
    bm.faces.new(rings[0]).material_index = 0
    for k in range(4):
        for i in range(n): bm.faces.new((rings[k][i], rings[k][(i + 1) % n], rings[k + 1][(i + 1) % n], rings[k + 1][i])).material_index = 0 if k < 2 else 1
    bm.faces.new(rings[4][::-1]).material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm_obj('IslandGround', bm, smooth=False, mats=(SNOW, EARTH))
    # icicles hanging off the front of the rim
    x = -6.1
    for k in range(40):
        x += rr.uniform(0.12, 0.6); y = island_y(x) - 0.02
        if abs(x) > 6.2: break
        cyl(f'RimIcicle{k}', rr.uniform(0.03, 0.06), (L_ := rr.uniform(0.18, 0.5)), (x, y, -0.22 - L_ / 2), ICE, segs=8, r2=0.0, rot=(math.pi, 0, 0))
island()
# soft drifts heaped against the cabin and round the island
bm = bmesh.new(); rr = random.Random(17)
for (x, y, r, sx, sy) in [(-BX - 0.25, 1.2, 0.5, 0.8, 2.4), (BX + 0.95, 1.9, 0.45, 0.8, 0.9), (-1.6, BY1 + 0.3, 0.45, 2.4, 0.7), (1.6, BY1 + 0.3, 0.45, 2.2, 0.7), (-BX - 0.3, -1.4, 0.35, 0.7, 0.9),
                          (-5.2, 1.6, 0.5, 1.4, 1.0), (5.0, -0.6, 0.4, 1.2, 0.9), (0.6, 3.9, 0.45, 1.8, 0.6), (-2.8, 3.6, 0.4, 1.2, 0.6), (3.2, 3.6, 0.4, 1.4, 0.6)]:
    blob_into(bm, r, Vector((x, y, -r * 0.55)), (sx, sy, 1.0), sub=3)
bm_obj('SnowDrifts', bm, SNOW, smooth=True)

# a shovelled path from the step to the front edge, packed snow, and the frozen pond on the left
ribbon('SnowPath', [Vector((0.15 * math.sin(k * 0.9), BY0 - 0.5 - k * 0.45, 0.012)) for k in range(int((BY0 - 0.5 - island_y(0) - 0.05) / 0.45) + 1)], 1.0, PACKED)
o = cyl('PondIce', 1.0, 0.04, (-4.3, -1.5, 0.01), ICE, segs=48); o.scale = (1.25, 0.8, 1)
ring = [Vector((-4.3 + math.cos(a) * 1.27, -1.5 + math.sin(a) * 0.83, 0.02)) for a in [TAU * i / 64 for i in range(65)]]
sweep('PondRim', ring, [(-0.12, 0), (0.12, 0), (0, 0.09)], SNOW)
for k, (x, y) in enumerate([(-5.2, -1.2), (-5.1, -1.0), (-5.25, -1.05), (-3.3, -2.05), (-3.2, -2.15)]):
    tube(f'PondReed{k}', [(x, y, 0.0), (x + 0.02, y, 0.35 + 0.1 * (k % 2)), (x + 0.06 * (1 if k % 2 else -1), y, 0.55)], 0.008, mat('Reed', '#8a7a5a', rough=0.8))

# ---------------------------------------------------------------- the cabin: a stone footing, a floor of boards, log walls with notched corners
box('FootingStone', (2 * BX + 0.2, BY1 - BY0 + 0.2, F - 0.02), (0, (BY0 + BY1) / 2, (F - 0.02) / 2), FOOT)
box('FloorBoards', (2 * BX - 0.1, BY1 - BY0 - 0.05, 0.04), (0, (BY0 + BY1) / 2, F - 0.02), FLOOR)
for k, (w, dz) in enumerate(((1.6, 0.0), (1.3, F * 0.5))):
    box(f'FrontStep{k}', (w, 0.34, F * 0.5), (0, BY0 - 0.17 - 0.3 * (1 - k), F * 0.25 + dz), PINEW, bev=0.02)
LWIN = dict(y0=-0.45, y1=0.45, z0=F + 1.25, z1=F + 2.25)     # the left window: wide, over the rocking chair
RWIN = dict(y0=-1.25, y1=-0.45, z0=F + 1.3, z1=F + 2.15)     # the right window, near the front, the reindeer outside it
rr = random.Random(23)
for k in range(NC):
    zb = F + LR + k * LH; zs = zb + LH / 2                     # the back wall's courses, and the sides' half a course higher
    jit = lambda: rr.uniform(-0.008, 0.008)
    log_(f'WallBackLog{k}', (-BX - 0.26, BY1 - LR, zb + jit()), (BX + 0.26, BY1 - LR, zb + jit()), LR * rr.uniform(0.96, 1.04))
    if zs > EAV: continue
    for s, W_ in ((-1, LWIN), (1, RWIN)):
        x = s * (BX - LR); r_ = LR * rr.uniform(0.96, 1.04)
        if W_['z0'] - LR < zs < W_['z1'] + LR:
            log_(f'WallSideLog{s}_{k}a', (x, BY0, zs), (x, W_['y0'], zs), r_)
            log_(f'WallSideLog{s}_{k}b', (x, W_['y1'], zs), (x, BY1 + 0.26, zs), r_)
        else: log_(f'WallSideLog{s}_{k}', (x, BY0, zs), (x, BY1 + 0.26, zs), r_)
# the windows: white frames with a cross of glazing bars, frosted panes lit warm from inside, red gingham curtains
for s, W_, nm in ((-1, LWIN, 'Left'), (1, RWIN, 'Right')):
    x = s * (BX - LR); yc, zc = (W_['y0'] + W_['y1']) / 2, (W_['z0'] + W_['z1']) / 2; wy, hz = W_['y1'] - W_['y0'], W_['z1'] - W_['z0']
    for k, (sz, loc) in enumerate((((0.3, wy + 0.1, 0.08), (x, yc, W_['z0'] - 0.04)), ((0.3, wy + 0.1, 0.08), (x, yc, W_['z1'] + 0.04)),
                                    ((0.3, 0.08, hz), (x, W_['y0'] - 0.04, zc)), ((0.3, 0.08, hz), (x, W_['y1'] + 0.04, zc)))):
        box(f'{nm}WindowFrame{k}', sz, loc, WINFRAME, bev=0.01)
    box(f'{nm}WindowBarV', (0.06, 0.035, hz), (x, yc, zc), WINFRAME); box(f'{nm}WindowBarH', (0.06, wy, 0.035), (x, yc, zc), WINFRAME)
    box(f'{nm}WindowPane', (0.008, wy, hz), (x + s * 0.02, yc, zc), FROST); box(f'{nm}WindowPaneIn', (0.008, wy, hz), (x - s * 0.02, yc, zc), FROSTIN)
    box(f'{nm}WindowSill', (0.22, wy + 0.2, 0.05), (x - s * 0.17, yc, W_['z0'] - 0.07), WINFRAME, bev=0.01)
    ix = s * (IX - 0.06)
    tube(f'{nm}CurtainRod', [(ix, W_['y0'] - 0.22, W_['z1'] + 0.16), (ix, W_['y1'] + 0.22, W_['z1'] + 0.16)], 0.012, IRON, poly=True)
    for j, (ya, yb) in enumerate(((W_['y0'] - 0.22, W_['y0'] + 0.06), (W_['y1'] - 0.06, W_['y1'] + 0.22))):
        bm = bmesh.new(); grid = []; rows, cols = 10, 6
        for rj in range(rows + 1):
            t = rj / rows; z = W_['z1'] + 0.14 - t * (hz + 0.5); pinch = 0.5 * math.exp(-((t - 0.62) / 0.16) ** 2)
            y0_, y1_ = (ya, yb - pinch * (yb - ya) * 0.6) if j == 0 else (ya + pinch * (yb - ya) * 0.6, yb)
            grid.append([bm.verts.new((ix - s * 0.03 * math.sin(ci * 2.4), y0_ + (y1_ - y0_) * ci / cols, z)) for ci in range(cols + 1)])
        for rj in range(rows):
            for ci in range(cols): bm.faces.new((grid[rj][ci], grid[rj][ci + 1], grid[rj + 1][ci + 1], grid[rj + 1][ci]))
        orient(bm, lambda c, s=s: Vector((-s, 0, 0))); bm_obj(f'{nm}Curtain{j}', bm, GINGHAM)
# a paper star lantern in the left window, as in Swedish windows in winter
sx_ = -(IX - 0.16); slab('WindowStar', star_pts(0.2, 0.45, 8), 0.06, (sx_, 0.0, F + 1.85), PAPERGLOW, rotz=math.pi / 2)
tube('WindowStarCord', [(sx_, 0.0, F + 2.05), (sx_, 0.0, LWIN['z1'] + 0.16)], 0.004, CORD, poly=True)
point_light('LanternLightStar', (sx_ + 0.05, 0.0, F + 1.85), 25, (1.0, 0.78, 0.5), radius=0.1)

# ---------------------------------------------------------------- the roof: a steep gable of boards under deep snow, icicles along the eaves
YR0, YR1 = BY0 - 0.55, BY1 + 0.45                              # the roof runs out over the open front and the back
def slope_point(s, x, z_off=0.0):
    """a point on the s side's roof plane at height over the walls' line, pushed out along its normal by z_off"""
    nrm = Vector((s * math.sin(TH), 0, math.cos(TH)))
    return Vector((s * x, 0, EAV + RISE - x * SL)) + nrm * z_off
Lsl = (BX + OV) / math.cos(TH)
for s in (-1, 1):
    for nm, thick, off, m, extra in (('RoofBoards', 0.14, 0.07, BOARDS, 0.0), ('RoofSnow', 0.24, 0.07 + 0.07 + 0.12, SNOW, 0.08)):
        c = slope_point(s, (BX + OV + extra) / 2, off)
        o = box(f'{nm}{s}', (Lsl + extra / math.cos(TH), YR1 - YR0 + (0.1 if nm == 'RoofSnow' else 0), thick), (c.x, (YR0 + YR1) / 2, c.z), m, rot=(0, s * TH, 0))
        if nm == 'RoofSnow': bevel(o, 0.1, 3)
    e = slope_point(s, BX + OV + 0.06, 0.2)                      # the snow's rounded lip over the eave, and icicles under it
    tube(f'RoofSnowLip{s}', [(e.x, YR0 + 0.05, e.z), (e.x, YR1 - 0.05, e.z)], 0.13, SNOW, poly=True)
    for k in range(int((YR1 - YR0) / 0.17)):
        y = YR0 + 0.12 + k * 0.17 + rr.uniform(-0.04, 0.04); L_ = rr.uniform(0.12, 0.55) * (0.5 if rr.random() < 0.3 else 1)
        cyl(f'RoofIcicle{s}_{k}', rr.uniform(0.025, 0.045), L_, (e.x + s * 0.02, y, e.z - 0.1 - L_ / 2), ICE, segs=8, r2=0.0, rot=(math.pi, 0, 0))
log_('RidgeBeam', (0, YR0 + 0.2, ZR - 0.1), (0, YR1 - 0.1, ZR - 0.1), 0.13)
tube('RoofSnowRidge', [(0, YR0 + 0.05, ZR + 0.22), (0, YR1 - 0.05, ZR + 0.22)], 0.2, SNOW, poly=True)
for s in (-1, 1):
    for k, x in enumerate((0.95, 1.95)):
        p = slope_point(s, x, -0.13); log_(f'Purlin{s}_{k}', (p.x, BY0 + 0.05, p.z), (p.x, BY1 - 0.1, p.z), 0.1)
for k, y in enumerate((-0.9, 0.75)): log_(f'TieBeam{k}', (-BX + 0.1, y, EAV - 0.05), (BX - 0.1, y, EAV - 0.05), 0.11)
log_('FrontLintel', (-BX - 0.05, BY0 + 0.13, EAV - 0.02), (BX + 0.05, BY0 + 0.13, EAV - 0.02), 0.14)
# the gables: vertical boards, a round attic window lit in the front one; crossed barge boards at the front peak
tri = [(-BX, 0), (BX, 0), (0, RISE)]
attic = ring_pts(0, RISE * 0.42, 0.26, 40)
o = outline_curve('GableFront', tri, [attic], 0.08, BOARDS); o.location = (0, BY0 + 0.1, EAV + 0.08)
o = outline_curve('GableBack', tri, [], 0.08, BOARDS); o.location = (0, BY1 - 0.05, EAV + 0.08)
o = disc('GableAtticPane', 0.27, (0, BY0 + 0.12, EAV + 0.08 + RISE * 0.42), FROST)
ring = [Vector((math.cos(a) * 0.3, BY0 + 0.06, EAV + 0.08 + RISE * 0.42 + math.sin(a) * 0.3)) for a in [TAU * i / 48 for i in range(49)]]
sweep('GableAtticFrame', ring, [(-0.04, -0.03), (0.04, -0.03), (0.04, 0.03), (-0.04, 0.03)], WINFRAME, up=Vector((0, 1, 0)))
for s in (-1, 1):
    a = slope_point(s, BX + OV + 0.05, 0.12); b = slope_point(s, -0.42, 0.12)
    c = (a + b) / 2; L_ = (b - a).length
    box(f'GableBargeBoard{s}', (L_, 0.06, 0.24), (c.x, YR0 - 0.03, c.z), PINEW, rot=(0, s * TH, 0), bev=0.01)
# the chimney: fieldstone through the ridge, snow on its cap
box('ChimneyStack', (0.72, 0.72, 2.0), (0, BY1 - 0.55, ZR + 0.1), HEARTHSTONE, bev=0.02)
box('ChimneyCap', (0.86, 0.86, 0.1), (0, BY1 - 0.55, ZR + 1.15), HEARTHSTONE, bev=0.02)
o = box('ChimneySnow', (0.84, 0.84, 0.1), (0, BY1 - 0.55, ZR + 1.24), SNOW); bevel(o, 0.05, 3)
marker('SmokeAt', (0, BY1 - 0.55, ZR + 1.3))

# ---------------------------------------------------------------- the fireplace: whitewashed stone, an arched firebox, a mantel, the hearthstone
fw, fd, fh = FP['w'], FP['d'], FP['h']
arch = arch_pts(0, 0.1, 0.92, 0.88, 24)
o = outline_curve('FireplaceBody', rect(-fw, 0, fw, fh), [arch], fd, LIMESTONE); o.location = (0, FY + fd / 2, F)
o = outline_curve('FireboxLining', arch, [arch_pts(0, 0.14, 0.84, 0.78, 24)], fd - 0.02, SOOT); o.location = (0, FY + fd / 2 + 0.01, F)
box('FireboxBack', (0.92, 0.04, 0.9), (0, IY1 - 0.04, F + 0.55), SOOT)
o = outline_curve('ChimneyBreast', rect(-FP['bw'], fh, FP['bw'], ZR - F - 0.55), [], FP['bd'], WHITEWASH); o.location = (0, IY1 - FP['bd'] / 2, F)
box('HearthSlab', (2.5, IY1 - FY + 0.5, 0.1), (0, (IY1 + FY - 0.5) / 2, F + 0.05), HEARTHSTONE, bev=0.01)
box('MantelBeam', (2.2, 0.3, 0.12), (0, FY + 0.08, F + fh + 0.04), WALNUT, bev=0.012)
for s in (-1, 1): box(f'MantelCorbel{s}', (0.1, 0.16, 0.22), (s * 0.95, FY - 0.0, F + fh - 0.12), WALNUT, bev=0.01)
# round the firebox, below the mantel: an arch of dressed stones with a keystone, jambs under it, a kurbits panel painted
# over it, a scalloped valance carved under the mantel; the white above the mantel is left bare for the tin's shadow
spring, ar = 0.1 + 0.88 - 0.46, 0.46                         # as arch_pts above: springing 0.52 over the floor, radius 0.46
for k in range(9):
    g_ = 0.014; a0, a1 = math.pi * k / 9 + g_, math.pi * (k + 1) / 9 - g_; r1 = 0.66 if k == 4 else 0.6
    pts = [(math.cos(a0 + (a1 - a0) * j / 6) * r1, math.sin(a0 + (a1 - a0) * j / 6) * r1) for j in range(7)] + [(math.cos(a1 - (a1 - a0) * j / 6) * (ar + 0.01), math.sin(a1 - (a1 - a0) * j / 6) * (ar + 0.01)) for j in range(7)]
    o = outline_curve(f'ArchStone{k}', pts, [], 0.05, ARCHSTONE); o.location = (0, FY - 0.022, F + spring)
for s_ in (-1, 1):
    for j, (z0, z1) in enumerate(((0.1, 0.31), (0.32, spring - 0.01))):
        box(f'ArchJamb{s_}{j}', (0.13, 0.05, z1 - z0), (s_ * (ar + 0.075), FY - 0.022, F + (z0 + z1) / 2), ARCHSTONE, bev=0.008)
uvbox('KurbitsPanel', (1.5, 0.008, 0.375), (0, FY - 0.005, F + 1.43), KURBITS)
sc_r, sc_n = 0.044, 20; vx = sc_r * sc_n                     # the valance: a board with a scalloped hem and a hole over each scallop
hem = [(vx - sc_r - 2 * sc_r * k + math.cos(math.pi * j / 8) * sc_r * (1 if True else 0), -0.05 - math.sin(math.pi * j / 8) * sc_r) for k in range(sc_n) for j in range(9)]
o = outline_curve('MantelValance', [(-vx, 0), (vx, 0), (vx, -0.05)] + hem + [(-vx, -0.05)], [ring_pts(vx - sc_r - 2 * sc_r * k, -0.035, 0.011, 12) for k in range(sc_n)], 0.025, WALNUT)
o.location = (0, FY - 0.07, F + fh - 0.02)
tx_, ty_ = 1.08, FY - 0.32                                   # the fire irons on their stand: a poker, a shovel, a brush
cyl('FireToolBase', 0.075, 0.02, (tx_, ty_, F + 0.11), IRON, segs=16)
cyl('FireToolRod', 0.008, 0.6, (tx_, ty_, F + 0.42), IRON, segs=8)
sphere('FireToolKnob', 0.016, (tx_, ty_, F + 0.73), BRASS, segs=10, rings=8)
tube('FireToolBar', [(tx_ - 0.075, ty_, F + 0.66), (tx_ + 0.075, ty_, F + 0.66)], 0.005, IRON, poly=True)
for k, dx in enumerate((-0.06, 0.0, 0.06)):
    x = tx_ + dx; y = ty_ - 0.014
    sphere(f'FireToolHandle{k}', 0.013, (x, y, F + 0.68), BRASS, segs=10, rings=8)
    tube(f'FireToolShaft{k}', [(x, y, F + 0.67), (x, y, F + 0.2)], 0.0045, IRON, poly=True)
    if k == 0: tube('FireToolPokerHook', [(x, y, F + 0.2), (x, y, F + 0.15), (x + 0.025, y, F + 0.17)], 0.0045, IRON, poly=True)
    elif k == 1: box('FireToolShovel', (0.07, 0.008, 0.08), (x, y - 0.004, F + 0.17), IRON, rot=(0.15, 0, 0))
    else: cyl('FireToolBrush', 0.022, 0.08, (x, y, F + 0.17), mat('Bristle', '#3a2a1e', rough=0.95), segs=10)

# the fire: birch logs crossed on an iron grate, embers under them
fz = F + 0.1
box('FireGrate', (0.6, 0.3, 0.03), (0, FY + 0.38, fz + 0.06), IRON)
for s in (-1, 1): box(f'FireDog{s}', (0.04, 0.4, 0.14), (s * 0.3, FY + 0.36, fz + 0.07), IRON)
for k, (a, b) in enumerate((((-0.32, FY + 0.28, fz + 0.12), (0.3, FY + 0.46, fz + 0.14)), ((-0.28, FY + 0.48, fz + 0.13), (0.33, FY + 0.3, fz + 0.12)), ((-0.15, FY + 0.38, fz + 0.24), (0.2, FY + 0.4, fz + 0.26)))):
    log_(f'FireLog{k}', a, b, 0.06, CHAR, end=EMBER)
bm = bmesh.new()
for k in range(14): blob_into(bm, rr.uniform(0.02, 0.04), Vector((rr.uniform(-0.25, 0.25), FY + 0.38 + rr.uniform(-0.1, 0.1), fz + 0.06)), (1.3, 1.0, 0.6))
bm_obj('FireEmbers', bm, EMBER, smooth=True)
marker('FireAt', (0, FY + 0.38, fz + 0.32))
# on the mantel: two candles, a red Dala horse, a birch-bark box
for s in (-1, 1):
    x = s * 0.82; zt = F + fh + 0.1
    lathe(f'MantelCandlestick{s}', [(0.0, 0), (0.05, 0), (0.05, 0.015), (0.014, 0.03), (0.014, 0.12), (0.032, 0.13), (0.032, 0.14), (0.0, 0.14)], (x, FY + 0.1, zt), BRASS, segs=16)
    cyl(f'MantelCandle{s}', 0.017, 0.2, (x, FY + 0.1, zt + 0.24), WAX, segs=12)
    o = sphere(f'MantelCandle{s}Flame', 0.009, (x, FY + 0.1, zt + 0.36), FLAME, segs=8, rings=6); o.scale = (1, 1, 2.0)
def dala(name, loc, h, rotz=0.0):
    """a carved Dalarna horse: a red block body, a stout neck, a painted saddle cloth"""
    x, y, z = loc; u = h / 0.2; parts = []
    parts.append(box(name + 'Body', (0.16 * u, 0.05 * u, 0.06 * u), (x, y, z + 0.1 * u), DALA, bev=0.01 * u))
    o = box(name + 'Neck', (0.06 * u, 0.045 * u, 0.1 * u), (x + 0.07 * u, y, z + 0.16 * u), DALA, bev=0.01 * u); o.rotation_euler = (0, -0.4, 0); parts.append(o)
    parts.append(box(name + 'Head', (0.07 * u, 0.04 * u, 0.04 * u), (x + 0.1 * u, y, z + 0.2 * u), DALA, bev=0.01 * u))
    for dx in (-0.055, 0.055):
        parts.append(box(name + f'Leg{dx}', (0.035 * u, 0.045 * u, 0.08 * u), (x + dx * u, y, z + 0.04 * u), DALA, bev=0.006 * u))
    parts.append(box(name + 'Saddle', (0.07 * u, 0.052 * u, 0.04 * u), (x - 0.01 * u, y, z + 0.115 * u), DALAB, bev=0.006 * u))
    for k in range(3): parts.append(sphere(name + f'Dot{k}', 0.007 * u, (x - 0.035 * u + k * 0.035 * u, y - 0.027 * u, z + 0.085 * u), DALAW, segs=8, rings=6))
    tube(name + 'Mane', [(x + 0.04 * u, y, z + 0.2 * u), (x + 0.075 * u, y, z + 0.215 * u)], 0.008 * u, DALAG, poly=True)
    for o in parts: o.rotation_euler = (o.rotation_euler[0], o.rotation_euler[1], rotz)
dala('DalaHorse', (-0.45, FY + 0.1, F + fh + 0.1), 0.22)
o = cyl('TineBox', 0.07, 0.09, (0.45, FY + 0.1, F + fh + 0.145), BIRCH, segs=20); o.scale = (1.3, 1, 1)
o = cyl('TineBoxLid', 0.075, 0.02, (0.45, FY + 0.1, F + fh + 0.2), PINEW, segs=20); o.scale = (1.3, 1, 1)
# the white of the chimney breast above the mantel is where the tin's shadow falls
marker('ShadowAt', (0, IY1 - FP['bd'] - 0.004, F + fh + 0.62))
# by the fire: a copper kettle, a basket of birch logs, a straw Yule goat; a wooden bucket of cold water
lathe('Kettle', [(0.0, 0), (0.11, 0.0), (0.14, 0.06), (0.14, 0.12), (0.1, 0.19), (0.05, 0.21), (0.04, 0.24), (0.0, 0.24)], (-0.75, FY - 0.22, F + 0.1), COPPER, segs=24)
tube('KettleSpout', [(-0.64, FY - 0.22, F + 0.2), (-0.56, FY - 0.22, F + 0.26), (-0.52, FY - 0.22, F + 0.3)], 0.016, COPPER)
tube('KettleHandle', [(-0.84, FY - 0.22, F + 0.3), (-0.75, FY - 0.22, F + 0.42), (-0.66, FY - 0.22, F + 0.3)], 0.008, BRASS)
lathe('WoodBasket', [(0.0, 0), (0.26, 0.0), (0.3, 0.32), (0.31, 0.34), (0.27, 0.34), (0.24, 0.04), (0.0, 0.04)], (-1.55, FY - 0.05, F), mat('Wicker', '#a07a48', rough=0.85), segs=24)
for k in range(6):
    a = k * 1.1; log_(f'BasketLog{k}', (-1.55 + math.cos(a) * 0.12, FY - 0.05 + math.sin(a) * 0.12 - 0.05, F + 0.2), (-1.55 + math.cos(a) * 0.06, FY - 0.05 + math.sin(a) * 0.06 + 0.12, F + 0.62), 0.05, BIRCH)
gx, gy, gz = -1.08, FY - 0.36, F + 0.1                                              # the Yule goat, bound straw with red ribbon
tube('GoatBody', [(gx - 0.12, gy, gz + 0.22), (gx + 0.12, gy, gz + 0.22)], 0.05, STRAW, poly=True)
for dx in (-0.1, 0.1):
    for dy in (-0.03, 0.03): tube(f'GoatLeg{dx}{dy}', [(gx + dx, gy + dy, gz + 0.22), (gx + dx * 1.15, gy + dy, gz)], 0.014, STRAW, poly=True)
tube('GoatNeck', [(gx + 0.11, gy, gz + 0.22), (gx + 0.17, gy, gz + 0.34), (gx + 0.24, gy, gz + 0.33)], 0.03, STRAW)
for dy in (-0.025, 0.025): tube(f'GoatHorn{dy}', [(gx + 0.17, gy + dy, gz + 0.36), (gx + 0.12, gy + dy * 2, gz + 0.44), (gx + 0.08, gy + dy * 2.4, gz + 0.38)], 0.009, STRAW)
for dx in (-0.06, 0.06, 0.15): o = cyl(f'GoatRibbon{dx}', 0.054, 0.025, (gx + dx, gy, gz + 0.22), RIBBON, segs=12, rot=(0, math.pi / 2, 0))
bx_, by_ = 1.5, FY - 0.15
lathe('Bucket', [(0.0, 0), (0.17, 0.0), (0.2, 0.36), (0.185, 0.36), (0.155, 0.03), (0.0, 0.03)], (bx_, by_, F), PINEWZ, segs=28)
for k, z in enumerate((0.06, 0.28)):
    r_ = 0.17 + 0.03 * z / 0.36 + 0.006; ring = [Vector((bx_ + math.cos(a) * r_, by_ + math.sin(a) * r_, F + z)) for a in [TAU * i / 40 for i in range(41)]]
    sweep(f'BucketHoop{k}', ring, [(-0.008, -0.012), (0.008, -0.012), (0.008, 0.012), (-0.008, 0.012)], IRON)
o = cyl('BucketWater', 0.185, 0.01, (bx_, by_, F + 0.31), WATER, segs=28)
tube('BucketHandle', [(bx_ - 0.2, by_, F + 0.34), (bx_, by_, F + 0.56), (bx_ + 0.2, by_, F + 0.34)], 0.008, IRON)
marker('BucketAt', (bx_, by_, F + 0.32))
marker('LadleAt', (0.62, FY - 0.25, F + 0.13))

# ---------------------------------------------------------------- the low table on a rag rug; the rune pouch, the candle for the tin's shadow, a cup of glögg
o = box('RagRug', (2.3, 1.6, 0.012), (TX, TY + 0.05, F + 0.006), RUG)
uv = o.data.uv_layers.new(name='UVMap')
for poly in o.data.polygons:
    for li in poly.loop_indices: v = o.data.vertices[o.data.loops[li].vertex_index].co; uv.data[li].uv = (v.y / 1.6 + 0.5, v.x / 2.3 + 0.5)
box('TableTop', (1.3, 0.92, 0.06), (TX, TY, T - 0.03), PINEW, bev=0.012)
box('TableApron', (1.16, 0.78, 0.08), (TX, TY, T - 0.1), PINEW)
for sx in (-1, 1):
    for sy in (-1, 1): lathe(f'TableLeg{sx}{sy}', [(0.0, 0), (0.035, 0), (0.03, 0.1), (0.04, 0.18), (0.028, 0.26), (0.034, 0.38), (0.034, 0.44), (0.0, 0.44)], (TX + sx * 0.55, TY + sy * 0.36, F), PINEWZ, segs=12)
marker('TableAt', (TX, TY, T)); marker('ClothAt', (TX - 0.06, TY - 0.02, T + 0.002))
px, py = TX - 0.52, TY + 0.26                                                   # the leather pouch, drawn shut, its cord trailing
bm = bmesh.new(); n_, prof = 28, [(0.0, 0.0), (0.07, 0.004), (0.105, 0.03), (0.118, 0.07), (0.108, 0.11), (0.075, 0.14), (0.045, 0.155), (0.05, 0.175), (0.075, 0.2), (0.07, 0.205)]
vs = [[bm.verts.new((math.cos(TAU * i / n_) * r * (1 + (0.12 * math.sin(i * 2.0) if h > 0.16 else 0.035 * math.sin(i * 3.1 + h * 40))), math.sin(TAU * i / n_) * r * (1 + (0.12 * math.sin(i * 2.0) if h > 0.16 else 0.035 * math.sin(i * 3.1 + h * 40))), h + (0.012 * math.sin(i * 1.7) if h > 0.19 else 0))) for (r, h) in prof] for i in range(n_)]
for i in range(n_):
    for k in range(len(prof) - 1):
        try: bm.faces.new((vs[i][k], vs[(i + 1) % n_][k], vs[(i + 1) % n_][k + 1], vs[i][k + 1]))
        except ValueError: pass
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
o = bm_obj('RunePouch', bm, LEATHER); o.location = (px, py, T); o.scale = (1.0, 0.92, 1.0)
ring = [Vector((px + math.cos(a) * 0.048, py + math.sin(a) * 0.046, T + 0.158)) for a in [TAU * i / 24 for i in range(25)]]
sweep('RunePouchCord', ring, [(-0.006, -0.006), (0.006, -0.006), (0.006, 0.006), (-0.006, 0.006)], CORD)
tube('RunePouchTie', [(px + 0.045, py - 0.02, T + 0.158), (px + 0.08, py - 0.05, T + 0.11), (px + 0.1, py - 0.07, T + 0.06)], 0.005, CORD)
tube('RunePouchTie2', [(px + 0.04, py - 0.03, T + 0.158), (px + 0.06, py - 0.08, T + 0.12), (px + 0.055, py - 0.1, T + 0.08)], 0.005, CORD)
marker('PouchAt', (px, py, T + 0.2))
cx2, cy2 = TX + 0.52, TY - 0.28                                                 # the candle the tin is held up to
lathe('TinCandleHolder', [(0.0, 0), (0.06, 0), (0.065, 0.012), (0.02, 0.025), (0.02, 0.05), (0.035, 0.055), (0.0, 0.055)], (cx2, cy2, T), BRASS, segs=18)
cyl('TinCandle', 0.022, 0.16, (cx2, cy2, T + 0.13), WAX, segs=14)
o = sphere('TinCandleFlame', 0.011, (cx2, cy2, T + 0.225), FLAME, segs=8, rings=6); o.scale = (1, 1, 2.0)
lathe('GloggCup', [(0.0, 0), (0.035, 0), (0.042, 0.075), (0.039, 0.075), (0.033, 0.006), (0.0, 0.006)], (TX + 0.5, TY + 0.28, T), MUG, segs=18)
cyl('GloggCupDrink', 0.036, 0.004, (TX + 0.5, TY + 0.28, T + 0.064), GLOGG, segs=18)
tube('GloggCupHandle', [(TX + 0.54, TY + 0.28, T + 0.06), (TX + 0.575, TY + 0.28, T + 0.04), (TX + 0.54, TY + 0.28, T + 0.018)], 0.006, MUG)

# ---------------------------------------------------------------- the rocking chair with a sheepskin, the dog asleep in front of the fire
def rocking_chair(cx, cy, rotz):
    parts = []; R_ = Matrix.Rotation(rotz, 4, 'Z'); P = lambda x, y, z: tuple(Vector((cx, cy, 0)) + R_ @ Vector((x, y, z)))
    for s in (-0.26, 0.26):
        parts.append(tube(f'RockerRunner{s}', [P(s, -0.45, F + 0.08), P(s, -0.15, F + 0.01), P(s, 0.25, F + 0.01), P(s, 0.5, F + 0.1)], 0.022, PINEWZ))
        parts.append(tube(f'RockerFrontLeg{s}', [P(s, -0.22, F + 0.03), P(s, -0.22, F + 0.46)], 0.022, PINEWZ, poly=True))
        parts.append(tube(f'RockerBackPost{s}', [P(s, 0.25, F + 0.03), P(s, 0.3, F + 0.46), P(s, 0.42, F + 1.12)], 0.025, PINEWZ))
        parts.append(tube(f'RockerArm{s}', [P(s, -0.28, F + 0.66), P(s, 0.3, F + 0.68)], 0.022, PINEWZ, poly=True))
        parts.append(tube(f'RockerArmPost{s}', [P(s, -0.22, F + 0.46), P(s, -0.24, F + 0.66)], 0.018, PINEWZ, poly=True))
    o = box('RockerSeat', (0.56, 0.5, 0.04), P(0, 0.02, F + 0.46), PINEWZ, rot=(0, 0, rotz)); parts.append(o)
    for k in range(5): parts.append(tube(f'RockerSpindle{k}', [P(-0.2 + k * 0.1, 0.3, F + 0.48), P(-0.2 + k * 0.1, 0.4, F + 1.04)], 0.012, PINEWZ, poly=True))
    parts.append(tube('RockerCrest', [P(-0.27, 0.41, F + 1.06), P(0, 0.43, F + 1.1), P(0.27, 0.41, F + 1.06)], 0.028, PINEWZ))
    o = sphere('RockerSheepskin', 0.3, P(0, 0.12, F + 0.62), SHEEP, scale=(0.95, 1.0, 0.35), segs=24, rings=12); o.rotation_euler = (0.9, 0, rotz)
    tx = bpy.data.textures.new('FleeceTx', 'CLOUDS'); tx.noise_scale = 0.05; dm = o.modifiers.new('fleece', 'DISPLACE'); dm.texture = tx; dm.strength = 0.03
    o = box('RockerBlanket', (0.5, 0.36, 0.05), P(0.02, -0.12, F + 0.5), KNIT, rot=(0, 0, rotz)); bevel(o, 0.02)
rocking_chair(-1.95, 0.22, 1.84)
dx_, dy_ = -1.15, -0.62                                                         # the dog: a big tan dog curled on the floor
sphere('DogBody', 0.3, (dx_, dy_, F + 0.16), DOG, scale=(1.4, 0.85, 0.5), segs=24, rings=14)
sphere('DogChest', 0.16, (dx_ + 0.28, dy_ - 0.12, F + 0.14), DOGW, scale=(1.0, 0.9, 0.7), segs=16, rings=10)
sphere('DogHead', 0.13, (dx_ + 0.42, dy_ - 0.22, F + 0.13), DOG, scale=(1.15, 0.95, 0.75), segs=20, rings=12)
sphere('DogMuzzle', 0.07, (dx_ + 0.55, dy_ - 0.28, F + 0.1), DOGW, scale=(1.3, 0.9, 0.7), segs=14, rings=10)
sphere('DogNose', 0.022, (dx_ + 0.63, dy_ - 0.3, F + 0.12), NOSE, segs=10, rings=8)
dfwd = Vector((0.9, -0.42, 0)).normalized(); dside = Vector((-dfwd.y, dfwd.x, 0))  # the way the head faces, and across it
for s in (-1, 1):
    # an ear either side of the head, lying back over it and flopping outward
    p = Vector((dx_ + 0.42, dy_ - 0.22, F + 0.19)) + dside * (0.1 * s) - dfwd * 0.03
    o = sphere(f'DogEar{s}', 0.07, tuple(p), DOG, scale=(0.6, 1.0, 0.25), segs=12, rings=8); o.rotation_euler = (-0.6, 0, math.atan2(dside.y * s, dside.x * s) - math.pi / 2)
    tube(f'DogEye{s}', [(dx_ + 0.5, dy_ - 0.28 - 0.05 * s + 0.02, F + 0.17), (dx_ + 0.51, dy_ - 0.3 - 0.05 * s, F + 0.165), (dx_ + 0.5, dy_ - 0.32 - 0.05 * s - 0.0, F + 0.17)], 0.004, NOSE)
for k, (x, y) in enumerate(((0.36, -0.32), (0.3, -0.36))): sphere(f'DogPaw{k}', 0.05, (dx_ + x, dy_ + y, F + 0.04), DOGW, scale=(1.6, 0.9, 0.6), segs=12, rings=8)
tube('DogTail', [(dx_ - 0.38, dy_ + 0.05, F + 0.1), (dx_ - 0.42, dy_ - 0.2, F + 0.05), (dx_ - 0.2, dy_ - 0.36, F + 0.04), (dx_ + 0.02, dy_ - 0.38, F + 0.04)], 0.05, DOG, taper=lambda t: 1.0 - 0.5 * t)
o = cyl('DogRug', 0.55, 0.012, (dx_ + 0.05, dy_ - 0.05, F + 0.018), SHEEP, segs=32); o.scale = (1.25, 0.9, 1)

# ---------------------------------------------------------------- the walls inside: the ryijy and the futhark board on the back wall, shelves, a bench, the painting
def wall_picture(name, w, h, loc, m, face):
    """a flat picture w by h, facing face (a unit vector in the xy plane), its image the right way round"""
    o = uvbox(name, (w, 0.02, h), loc, m, rot=(0, 0, math.atan2(-face[0], face[1]) + math.pi)); return o
o = wall_picture('RyijyHanging', 0.9, 1.2, (-1.72, IY1 - 0.02, F + 1.95), RYIJY, (0, -1))
log_('RyijyRod', (-2.22, IY1 - 0.05, F + 2.58), (-1.22, IY1 - 0.05, F + 2.58), 0.02, WALNUT)
o = wall_picture('FutharkBoard', 1.36, 0.51, (1.72, IY1 - 0.03, F + 2.25), FUTHARK, (0, -1))
for k, z in enumerate((F + 1.2, F + 1.62)):                                      # a little plate shelf under the board
    box(f'BackShelf{k}', (1.1, 0.22, 0.04), (1.75, IY1 - 0.11, z), PINEW, bev=0.006)
for k, (x, m) in enumerate(((1.35, BOOKS[0]), (1.42, BOOKS[1]), (1.49, BOOKS[3]), (1.56, BOOKS[2]))):
    box(f'ShelfBook{k}', (0.05, 0.16, 0.22 - 0.02 * (k % 2)), (x, IY1 - 0.1, F + 1.33 - 0.01 * (k % 2)), m)
for k, x in enumerate((1.85, 2.02, 2.18)):
    lathe(f'ShelfJar{k}', [(0.0, 0), (0.05, 0), (0.055, 0.1), (0.04, 0.13), (0.04, 0.15), (0.0, 0.15)], (x, IY1 - 0.1, F + 1.22), JAR, segs=16)
    cyl(f'ShelfJam{k}', 0.048, 0.07, (x, IY1 - 0.1, F + 1.26), JAM if k != 1 else mat('Cloudberry', '#e0a040', rough=0.3), segs=14)
    cyl(f'ShelfJarLid{k}', 0.045, 0.02, (x, IY1 - 0.1, F + 1.38), GINGHAM, segs=14)
for k, x in enumerate((1.4, 1.65, 1.9, 2.15)):
    o = cyl(f'ShelfPlate{k}', 0.1, 0.012, (x, IY1 - 0.06, F + 1.76), mat('PlateBlue', '#e8ecf2', rough=0.25, coat=0.5), segs=24, rot=(1.35, 0, 0))
    cyl(f'ShelfPlateRim{k}', 0.085, 0.014, (x, IY1 - 0.064, F + 1.76), DALAB, segs=24, rot=(1.35, 0, 0))
# the left wall's back half: shelves with books, a lantern, a stack of knitted things
for k, z in enumerate((F + 1.0, F + 1.5, F + 2.0)):
    box(f'LeftShelf{k}', (0.26, 1.0, 0.04), (-IX + 0.13, 1.15, z), PINEWY, bev=0.006)
rr2 = random.Random(41); y = 0.72
for k in range(9):
    h = rr2.uniform(0.18, 0.26); w = rr2.uniform(0.04, 0.06)
    box(f'LeftBook{k}', (0.17, w, h), (-IX + 0.12, y + w / 2, F + 1.52 + h / 2), BOOKS[k % 5]); y += w + 0.004
lathe('ShelfLantern', [(0.0, 0), (0.07, 0), (0.07, 0.02), (0.06, 0.02), (0.06, 0.2), (0.07, 0.2), (0.05, 0.25), (0.0, 0.27)], (-IX + 0.13, 1.45, F + 1.02), IRON, segs=4)
cyl('ShelfLanternGlass', 0.05, 0.16, (-IX + 0.13, 1.45, F + 1.13), GLOWPANE, segs=12)
point_light('LanternLightShelf', (-IX + 0.2, 1.45, F + 1.14), 6, (1.0, 0.75, 0.45), radius=0.05)
for k in range(3):
    o = box(f'KnitStack{k}', (0.2, 0.3, 0.06), (-IX + 0.13, 0.95, F + 2.05 + k * 0.06), KNIT if k != 1 else mat('Wool', '#3a4a6a', rough=0.95, sheen=0.6)); bevel(o, 0.02)
# the right wall: a bench with cushions under the window, the painting, a chest, skis
box('BenchSeat', (0.46, 1.3, 0.06), (IX - 0.24, -0.85, F + 0.44), PINEWY, bev=0.01)
for y in (-1.4, -0.3): box(f'BenchEnd{y}', (0.42, 0.06, 0.44), (IX - 0.24, y, F + 0.22), PINEWY, bev=0.01)
for k, y in enumerate((-1.15, -0.6)):
    o = box(f'BenchCushion{k}', (0.38, 0.42, 0.14), (IX - 0.24, y, F + 0.55), KNIT); bevel(o, 0.05, 3)
o = box('BenchThrow', (0.42, 0.34, 0.06), (IX - 0.22, -0.88, F + 0.5), mat('WoolRed', '#9a2a2a', rough=0.95, sheen=0.6)); bevel(o, 0.02)
o = wall_picture('PaintingCanvas', 0.82, 0.62, (IX - 0.03, 0.75, F + 1.95), PAINTING, (-1, 0))
for k, (sz, d) in enumerate((((0.05, 0.94, 0.07), (0, 0.75, F + 2.29)), ((0.05, 0.94, 0.07), (0, 0.75, F + 1.61)), ((0.05, 0.07, 0.75), (0, 0.32, F + 1.95)), ((0.05, 0.07, 0.75), (0, 1.18, F + 1.95)))):
    box(f'PaintingFrame{k}', sz, (IX - 0.04, d[1], d[2]), WALNUT, bev=0.008)
box('Chest', (0.5, 0.95, 0.5), (IX - 0.28, 0.85, F + 0.25), mat('ChestBlue', '#2e4a6a', rough=0.6), bev=0.02)
o = box('ChestLid', (0.54, 0.99, 0.08), (IX - 0.28, 0.85, F + 0.54), mat('ChestBlue', '#2e4a6a'), bev=0.03)
for y in (0.5, 1.2): box(f'ChestStrap{y}', (0.52, 0.04, 0.6), (IX - 0.28, y, F + 0.29), IRON)
for k, (sz, loc) in enumerate((((0.2, 0.3, 0.05), (IX - 0.32, 0.65, F + 0.62)), ((0.2, 0.28, 0.05), (IX - 0.3, 0.67, F + 0.67)))):
    o = box(f'ChestMittens{k}', sz, loc, KNIT); bevel(o, 0.02)
# the himmeli: a straw mobile of linked diamonds, hanging from the tie beam over the rocking chair
hx, hy, hz = -1.25, -0.9, F + 2.62
def octa(name, c, r):
    v = [Vector(c) + Vector(d) * r for d in ((0, 0, 1.4), (1, 0, 0), (0, 1, 0), (-1, 0, 0), (0, -1, 0), (0, 0, -1.4))]
    for a, b in ((0, 1), (0, 2), (0, 3), (0, 4), (5, 1), (5, 2), (5, 3), (5, 4), (1, 2), (2, 3), (3, 4), (4, 1)):
        tube(f'{name}{a}{b}', [tuple(v[a]), tuple(v[b])], 0.005, STRAW, poly=True)
octa('Himmeli', (hx, hy, hz), 0.22)
for k, (dx, dy) in enumerate(((0.22, 0), (-0.22, 0), (0, 0.22), (0, -0.22))): octa(f'HimmeliSmall{k}', (hx + dx * 1.0, hy + dy * 1.0, hz - 0.36), 0.08)
tube('HimmeliCord', [(hx, hy, hz + 0.31), (hx, hy, EAV - 0.1)], 0.003, CORD, poly=True)
# dried herbs and a string of dried orange slices along the front tie beam
for k in range(4):
    x = 1.35 + k * 0.28; tube(f'HerbString{k}', [(x, 0.75, EAV - 0.16), (x, 0.75, EAV - 0.3)], 0.003, CORD, poly=True)
    o = cyl(f'HerbBundle{k}', 0.05, 0.22, (x, 0.75, EAV - 0.42), mat('DriedHerb', '#7a8a5a', rough=0.8), segs=8, r2=0.012)

# ---------------------------------------------------------------- outside: a woodpile under a lean-to, skis, a kick-sled, the lantern post, the snowman
wx0 = BX + 0.12
for k in range(5):
    for j in range(9):
        y = 0.1 + j * 0.15 + (0.07 if k % 2 else 0); z = 0.08 + k * 0.14
        if y > 1.5: continue
        log_(f'WoodpileLog{k}_{j}', (wx0, y, z), (wx0 + 0.55, y, z), 0.07 * rr.uniform(0.85, 1.1), BIRCH if (k + j) % 3 == 0 else LOG)
for y in (0.0, 1.62): log_(f'WoodshedPost{y}', (wx0 + 0.66, y, 0), (wx0 + 0.66, y, 1.0), 0.05)
o = box('WoodshedRoof', (0.95, 1.85, 0.06), (wx0 + 0.36, 0.81, 1.0), BOARDS, rot=(0, 0.35, 0))
o = box('WoodshedSnow', (0.95, 1.85, 0.12), (wx0 + 0.34, 0.81, 1.09), SNOW, rot=(0, 0.35, 0)); bevel(o, 0.05, 3)
for s in (-1, 1):                                                               # skis and poles against the front corner
    o = box(f'Ski{s}', (0.08, 0.02, 1.9), (BX + 0.1 + 0.1 * s, BY0 - 0.12, 0.95), PINEWZ, rot=(0.12, 0, 0.06 * s), bev=0.006)
    tube(f'SkiPole{s}', [(BX + 0.42 + 0.06 * s, BY0 - 0.25, 0.0), (BX + 0.3 + 0.04 * s, BY0 - 0.1, 1.35)], 0.012, IRON, poly=True)
    cyl(f'SkiPoleBasket{s}', 0.06, 0.012, (BX + 0.41 + 0.06 * s, BY0 - 0.24, 0.12), mat('Basket', '#3a3030', rough=0.7), segs=12)
kx, ky = 3.3, -2.4                                                              # a red kick-sled: a chair on long steel runners
for s in (-1, 1):
    tube(f'SledRunner{s}', [(kx - 0.55, ky + s * 0.22, 0.03), (kx + 0.75, ky + s * 0.22, 0.03), (kx + 0.85, ky + s * 0.22, 0.1)], 0.012, IRON)
    tube(f'SledHandle{s}', [(kx - 0.45, ky + s * 0.2, 0.03), (kx - 0.5, ky + s * 0.2, 0.95)], 0.016, SLEDRED, poly=True)
    tube(f'SledLeg{s}', [(kx + 0.15, ky + s * 0.2, 0.03), (kx + 0.15, ky + s * 0.2, 0.45)], 0.016, SLEDRED, poly=True)
tube('SledBar', [(kx - 0.5, ky - 0.2, 0.95), (kx - 0.5, ky + 0.2, 0.95)], 0.018, SLEDRED, poly=True)
box('SledSeat', (0.42, 0.44, 0.04), (kx + 0.0, ky, 0.46), SLEDRED, bev=0.01)
box('SledBack', (0.04, 0.42, 0.34), (kx - 0.42, ky, 0.66), SLEDRED, bev=0.01)
lx, ly = 1.6, -3.3                                                              # the lantern post at the path's end
cyl('LanternPost', 0.04, 1.7, (lx, ly, 0.85), IRON, segs=10)
tube('LanternArm', [(lx, ly, 1.65), (lx - 0.22, ly, 1.68), (lx - 0.26, ly, 1.6)], 0.015, IRON)
lathe('LanternCage', [(0.0, 0), (0.09, 0), (0.09, 0.02), (0.075, 0.02), (0.075, 0.2), (0.09, 0.22), (0.05, 0.28), (0.0, 0.3)], (lx - 0.26, ly, 1.3), IRON, segs=4)
cyl('LanternGlassPost', 0.065, 0.18, (lx - 0.26, ly, 1.41), GLOWPANE, segs=12)
o = box('LanternPostSnow', (0.16, 0.16, 0.05), (lx - 0.26, ly, 1.6), SNOW); bevel(o, 0.02)
point_light('LanternLightPost', (lx - 0.26, ly, 1.41), 60, (1.0, 0.72, 0.4), radius=0.06)
nx, ny = -2.7, -3.0                                                             # the snowman: three balls, coal eyes and buttons, a carrot, a blue scarf
for k, (r, z) in enumerate(((0.42, 0.36), (0.3, 0.98), (0.21, 1.4))): sphere(f'Snowman{k}', r, (nx, ny, z), SNOW, segs=28, rings=18)
for s in (-1, 1):
    sphere(f'SnowmanEye{s}', 0.025, (nx + 0.07 * s, ny - 0.19, 1.47), SOOT, segs=8, rings=6)
    tube(f'SnowmanArm{s}', [(nx + 0.25 * s, ny, 1.02), (nx + 0.55 * s, ny - 0.05, 1.22), (nx + 0.68 * s, ny - 0.02, 1.36)], 0.014, BARK, poly=True)
for k in range(3): sphere(f'SnowmanButton{k}', 0.03, (nx, ny - 0.29 + 0.01 * k, 1.12 - k * 0.14), SOOT, segs=8, rings=6)
o = cyl('SnowmanNose', 0.03, 0.18, (nx, ny - 0.29, 1.41), CARROT, segs=10, r2=0.0, rot=(math.pi / 2 + 0.1, 0, 0))
ring = [Vector((nx + math.cos(a) * 0.21, ny + math.sin(a) * 0.21, 1.22)) for a in [TAU * i / 32 for i in range(33)]]
sweep('SnowmanScarf', ring, [(-0.05, -0.03), (0.05, -0.03), (0.05, 0.03), (-0.05, 0.03)], SCARF)
tube('SnowmanScarfEnd', [(nx + 0.12, ny - 0.17, 1.2), (nx + 0.18, ny - 0.24, 1.0), (nx + 0.16, ny - 0.27, 0.86)], 0.04, SCARF, poly=True)
# and a red knitted hat, set back on the head above the eyes: a cream cuff and a bobble
lathe('SnowmanHat', [(0.178, 0.0), (0.176, 0.05), (0.16, 0.1), (0.12, 0.15), (0.06, 0.18), (0.0, 0.19)], (nx, ny, 1.53), HATRED, segs=28)
cyl('SnowmanHatCuff', 0.188, 0.06, (nx, ny, 1.55), SHEEP, segs=28)
sphere('SnowmanHatBobble', 0.055, (nx, ny, 1.74), SHEEP, segs=16, rings=10)
# a fence of slanted poles (a skigard) along the front right
for k in range(5):
    x = 3.0 + k * 0.62; y = -3.55 + k * 0.28
    for s in (-1, 1): tube(f'FencePost{k}{s}', [(x, y + s * 0.05, 0.0), (x, y + s * 0.05, 1.0)], 0.024, GREYWOOD, poly=True)
    if k < 4:
        for j in range(3): tube(f'FencePole{k}_{j}', [(x + 0.04 + j * 0.2, y + 0.02 + j * 0.09, 0.2), (x + 0.52 + j * 0.2 - 0.12, y + 0.24 + j * 0.09, 0.92)], 0.018, GREYWOOD, poly=True)
    o = box(f'FenceSnow{k}', (0.1, 0.16, 0.05), (x, y, 1.02), SNOW); bevel(o, 0.02)

# ---------------------------------------------------------------- spruce trees, each tier with its own load of snow; rocks; the reindeer
def skirt_into(bm, c, rad, ht, rr, n=16, droop=0.18, lift=0.0, jag=0.22):
    """one tier of a spruce: a cone whose hem is ragged, the branch tips hanging lower than the hollows between them"""
    apex = bm.verts.new(c + Vector((0, 0, ht))); ring = []
    for i in range(n):
        a = TAU * i / n + rr.uniform(-0.08, 0.08); tip = i % 2 == 0
        r = rad * (1.0 if tip else 0.72) * (1 + rr.uniform(-jag, jag) * 0.5)
        ring.append(bm.verts.new(c + Vector((math.cos(a) * r, math.sin(a) * r, lift + (-droop * ht if tip else 0.05 * ht) + rr.uniform(-0.03, 0.03) * ht))))
    for i in range(n): bm.faces.new((apex, ring[i], ring[(i + 1) % n]))
    bm.faces.new(ring[::-1])
def spruce(name, x, y, h, seed):
    r_ = random.Random(seed); log_(name + 'Trunk', (x, y, 0), (x, y, h * 0.3), h * 0.035, BARK, end=LOGEND)
    bm, bs = bmesh.new(), bmesh.new(); tiers = 6
    for k in range(tiers):
        t = k / tiers; z0 = h * (0.12 + 0.8 * t); rad = h * 0.29 * (1 - t * 0.8); ht = h * 0.27 * (1 - t * 0.3)
        skirt_into(bm, Vector((x, y, z0)), rad, ht, r_)
        # the snow: a smaller, flatter, more ragged cap over the upper part of the tier, sitting just on it
        f = r_.uniform(0.66, 0.84); e = 0.035 * ht                           # the same slope as the boughs, a little above them,
        skirt_into(bs, Vector((x, y, z0 + ht * (1 - f) + e)), rad * f, ht * f, r_, n=14, droop=0.12, jag=0.55)   # its hem dipping into them
    blob_into(bs, h * 0.03, Vector((x, y, z0 + ht * 1.0)), (1, 1, 1.4))
    for b_, nm, m in ((bm, 'Boughs', PINE), (bs, 'Snow', SNOW)):
        bmesh.ops.recalc_face_normals(b_, faces=b_.faces); bm_obj(name + nm, b_, m, smooth=False)
for k, (x, y, h) in enumerate(((-4.8, 2.6, 5.2), (-5.6, 0.6, 3.6), (-3.4, 3.7, 3.0), (5.0, 2.7, 5.6), (5.8, 0.8, 3.7), (3.6, 3.9, 3.1), (-1.6, 4.1, 2.4))):
    spruce(f'Spruce{k}', x, y, h, 60 + k)
bm = bmesh.new(); bs = bmesh.new()
for k, (x, y, r) in enumerate(((-6.0, -1.0, 0.35), (-5.4, -2.6, 0.25), (6.1, -1.4, 0.32), (5.4, -2.8, 0.22), (-6.2, 1.8, 0.3), (6.3, 1.9, 0.28), (-1.2, -4.2, 0.2), (1.0, -4.3, 0.18))):
    blob_into(bm, r, Vector((x, y, r * 0.35)), (1.2, 1.0, 0.8), sub=2)
    blob_into(bs, r * 0.95, Vector((x, y, r * 0.75)), (1.15, 0.95, 0.35), sub=2)
bm_obj('Rocks', bm, ROCK, smooth=True); bm_obj('RockSnow', bs, SNOW, smooth=True)
rx, ry, rz = 4.35, -1.35, 0.0                                                   # the reindeer, facing the cabin's window
def deer():
    yaw = 2.6; Rz = Matrix.Rotation(yaw, 4, 'Z'); P = lambda x, y, z: tuple(Vector((rx, ry, rz)) + Rz @ Vector((x, y, z)))
    o = sphere('DeerBody', 0.42, P(0, 0, 0.95), DEER, scale=(1.45, 0.62, 0.66), segs=24, rings=14); o.rotation_euler = (0, 0, yaw)
    o = sphere('DeerRump', 0.11, P(-0.56, 0, 1.0), DEERW, scale=(0.5, 1.1, 1.1), segs=14, rings=10); o.rotation_euler = (0, 0, yaw)
    tube('DeerNeck', [P(0.48, 0, 1.05), P(0.66, 0, 1.3), P(0.74, 0, 1.45)], 0.13, DEER, taper=lambda t: 1.0 - 0.35 * t)
    o = sphere('DeerRuff', 0.17, P(0.6, 0, 1.12), DEERW, scale=(0.8, 1.0, 1.25), segs=16, rings=10); o.rotation_euler = (0, 0.3, yaw)
    o = sphere('DeerHead', 0.13, P(0.86, 0, 1.47), DEER, scale=(1.45, 0.75, 0.8), segs=18, rings=12); o.rotation_euler = (0, 0.35, yaw)
    sphere('DeerNose', 0.05, P(1.02, 0, 1.4), mat('DeerMuzzle', '#3a2e28', rough=0.6), scale=(1.2, 1.0, 0.9), segs=12, rings=8)
    for s in (-1, 1):
        sphere(f'DeerEye{s}', 0.018, P(0.92, s * 0.075, 1.52), NOSE, segs=8, rings=6)
        o = sphere(f'DeerEar{s}', 0.05, P(0.8, s * 0.11, 1.58), DEER, scale=(0.5, 1.4, 0.4), segs=10, rings=8); o.rotation_euler = (s * 0.4, 0, yaw)
        base = Vector(P(0.78, s * 0.06, 1.6)); up = Vector((0, 0, 1)); side = Rz @ Vector((0, s, 0)); back = Rz @ Vector((-1, 0, 0))
        pts = [base, base + up * 0.2 + side * 0.08 + back * 0.08, base + up * 0.42 + side * 0.16 + back * 0.12, base + up * 0.6 + side * 0.12 + back * 0.02]
        tube(f'DeerAntler{s}', [tuple(p) for p in pts], 0.022, ANTLER, taper=lambda t: 1.0 - 0.6 * t)
        for j, (k, d) in enumerate(((1, back * -0.12 + up * 0.14), (2, back * -0.16 + up * 0.1), (2, side * 0.12 + up * 0.12), (3, up * 0.1 + back * 0.06))):
            tube(f'DeerTine{s}{j}', [tuple(pts[k]), tuple(pts[k] + d)], 0.011, ANTLER, poly=True, taper=lambda t: 1.0 - 0.7 * t)
    for k, (x, s) in enumerate(((0.38, -1), (0.38, 1), (-0.42, -1), (-0.42, 1))):
        tube(f'DeerLeg{k}', [P(x, s * 0.14, 0.8), P(x + 0.02, s * 0.15, 0.4), P(x, s * 0.15, 0.04)], 0.05, DEER, taper=lambda t: 1.0 - 0.45 * t)
        sphere(f'DeerHoof{k}', 0.04, P(x + 0.01, s * 0.15, 0.03), NOSE, scale=(1.3, 1.0, 0.6), segs=8, rings=6)
    sphere('DeerTail', 0.05, P(-0.62, 0, 1.08), DEERW, segs=8, rings=6)
deer()

# ---------------------------------------------------------------- lights, camera, render
w = bpy.data.worlds.new('HearthWorld'); w.use_nodes = True; sc.world = w
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = col('#122038'); bg.inputs['Strength'].default_value = 0.5
# a cold half moon behind the cabin, up to the left; the northern lights a green glow from high behind
sd = bpy.data.lights.new('Moon', 'SUN'); sd.energy = 1.6; sd.color = (0.72, 0.8, 1.0); sd.angle = math.radians(2)
sun = link(bpy.data.objects.new('Moon', sd)); sun.rotation_euler = Vector((0, 0, -1)).rotation_difference(Vector((0.3, -0.7, -0.62)).normalized()).to_euler()
tgt = link(bpy.data.objects.new('CamTarget', None)); tgt.location = (0, 0, 2.6)
def aimed(o):
    c = o.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'; return o
aimed(area_light('Fill', (8, -12, 7), 150, 6, (0.76, 0.82, 1.0)))
aimed(area_light('FrontKey', (-7, -11, 7.5), 150, 5, (0.78, 0.84, 1.0)))
aimed(area_light('AuroraGlow', (-2, 12, 11), 260, 12, (0.45, 1.0, 0.75)))
# the fire: a flickerless warm source in the firebox, and its glow spilling out into the room; candles and a soft room fill
point_light('FireLight', (0, FY + 0.3, F + 0.5), 110, (1.0, 0.52, 0.2), radius=0.25)
area_light('FireGlow', (0, FY - 0.08, F + 0.55), 90, 0.9, (1.0, 0.6, 0.3), rot=(-math.pi / 2 + 0.25, 0, 0))
area_light('RoomGlow', (0, 0.0, EAV - 0.25), 70, 3.0, (1.0, 0.74, 0.5), shape='RECTANGLE', size_y=2.6)
for s in (-1, 1): point_light(f'MantelCandleLight{s}', (s * 0.82, FY - 0.02, F + FP['h'] + 0.48), 6, (1.0, 0.7, 0.4), radius=0.02)
point_light('TinCandleLight', (TX + 0.52, TY - 0.32, T + 0.24), 5, (1.0, 0.7, 0.4), radius=0.02)

cd = bpy.data.cameras.new('HearthCam'); cd.lens = 44; cd.clip_end = 200
cam = link(bpy.data.objects.new('HearthCam', cd))
def place_cam(yaw_deg, pitch=0.4, dist=19.0):
    a = math.radians(yaw_deg); d = Vector((math.cos(a), math.sin(a), 0))
    cam.location = tgt.location + Vector((d.x * math.cos(pitch) * dist, d.y * math.cos(pitch) * dist, math.sin(pitch) * dist))
tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
place_cam(-90, 0.4, 26.0); sc.camera = cam

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
    ng = bpy.data.node_groups.new('HearthComp', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl_ = ng.nodes.new('CompositorNodeRLayers'); out_ = ng.nodes.new('NodeGroupOutput'); gl = ng.nodes.new('CompositorNodeGlare')
    for k, v in [('Type', 'Fog Glow'), ('Quality', 'High'), ('Threshold', 1.0), ('Strength', 0.6), ('Size', 0.6)]:
        if k in gl.inputs:
            try: gl.inputs[k].default_value = v
            except Exception as e: print('glare input', k, e)
    ng.links.new(rl_.outputs['Image'], gl.inputs['Image']); ng.links.new(gl.outputs['Image'], out_.inputs[0])
    sc.compositing_node_group = ng
except Exception as e: print('compositor skipped:', e)

blend = os.path.join(HERE, 'oracle_hearth.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend)
print('BUILT', len(sc.objects), 'objects ->', blend, flush=True)

if '--preview' in ARGS or '--render' in ARGS:
    big = '--render' in ARGS
    sc.render.resolution_x, sc.render.resolution_y = (2000, 1250) if big else (1200, 750)
    sc.cycles.samples = 160 if big else int(ARGS[ARGS.index('--samples') + 1]) if '--samples' in ARGS else 48
    WIDE = (0, 0, 3.0)
    shots = [('front', -90, 0.38, 27.0, 44, WIDE), ('left', -128, 0.36, 27.0, 44, WIDE), ('right', -52, 0.36, 27.0, 44, WIDE),
             ('inside', -90, 0.22, 3.4, 26, (0, 0.4, F + 1.2)), ('table', -90, 0.75, 1.9, 30, (TX, TY, T)),
             ('hearth', -90, 0.06, 2.9, 30, (0, FY, F + 1.5)), ('leftwall', 0, 0.12, 2.6, 30, (-IX, 0.3, F + 1.5)),
             ('rightwall', 180, 0.12, 2.6, 30, (IX, 0.2, F + 1.5)), ('deer', -60, 0.2, 6.5, 40, (4.0, -1.6, 1.0)),
             ('dog', -40, 1.0, 1.5, 40, (dx_ + 0.35, dy_ - 0.2, F + 0.15)), ('snowman', -95, 0.12, 3.2, 40, (nx, ny, 1.05))]
    if '--only' in ARGS: shots = [s_ for s_ in shots if s_[0] in ARGS[ARGS.index('--only') + 1].split(',')]
    for name, yaw, pitch, dist, lens, at in shots:
        tgt.location = at; cd.lens = lens; place_cam(yaw, pitch, dist); sc.render.filepath = OUT + f'hearth_{name}{"" if big else "_preview"}.png'
        t0 = time.time(); bpy.ops.render.render(write_still=True); print('RENDERED', name, round(time.time() - t0, 1), 's', flush=True)
    tgt.location = WIDE; cd.lens = 44; place_cam(-90, 0.4, 26.0)
