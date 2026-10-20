# The starry tent (星幕帐篷) as a small 3D diorama, built in Blender from scratch.
# v2: the pop-up book's octagonal tent with a cupola, spire and crescent finial; swags, curtains and lighting after the Tripo reference.
# Run headless:  Blender -b --factory-startup --python build_tent.py -- [--render] [--preview]
import bpy, bmesh, math, random, os, sys, time
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex') + '/'
OUT = os.path.join(HERE, 'renders') + '/'
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
TAU = math.tau
Hs = 2.2

# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.name = 'OracleTent'
sc.unit_settings.system = 'METRIC'

# ---------------------------------------------------------------- helpers
def col(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1)

MATS = {}
def principled(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')

def mat(name, base='#ffffff', rough=0.6, metal=0.0, emit=None, emit_str=0.0, sheen=0.0, coat=0.0, trans=0.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; p = principled(m)
    p.inputs['Base Color'].default_value = col(base); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if emit: p.inputs['Emission Color'].default_value = col(emit); p.inputs['Emission Strength'].default_value = emit_str
    if sheen: p.inputs['Sheen Weight'].default_value = sheen; p.inputs['Sheen Tint'].default_value = col('#ffd0f0')
    if coat: p.inputs['Coat Weight'].default_value = coat
    if trans: p.inputs['Transmission Weight'].default_value = trans
    MATS[name] = m; return m

def wood_mat(name, c1, c2, stretch=10.0, bump=0.08, planks=False):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N, L = nt.nodes, nt.links; p = principled(m)
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (stretch * 1.4, 1.0, 1.0) if planks else (1.0, stretch, 1.0)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 4.0; nz.inputs['Detail'].default_value = 6.0; nz.inputs['Distortion'].default_value = 0.4
    cr = N.new('ShaderNodeValToRGB'); e0, e1 = cr.color_ramp.elements; e0.position, e0.color = 0.35, col(c2); e1.position, e1.color = 0.7, col(c1)
    L.new(tc.outputs['Object'], mp.inputs['Vector']); L.new(mp.outputs['Vector'], nz.inputs['Vector']); L.new(nz.outputs['Fac'], cr.inputs['Fac'])
    out = cr.outputs['Color']
    if planks:
        br = N.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = 0.0025
        br.inputs['Mortar Smooth'].default_value = 0.7; br.inputs['Bias'].default_value = 0.1
        br.inputs['Brick Width'].default_value = 1.25; br.inputs['Row Height'].default_value = 0.15; br.offset = 0.37
        br.inputs['Color1'].default_value = (1, 1, 1, 1); br.inputs['Color2'].default_value = (0.86, 0.8, 0.74, 1); br.inputs['Mortar'].default_value = (0.62, 0.5, 0.42, 1)
        mp2 = N.new('ShaderNodeMapping'); mp2.inputs['Rotation'].default_value = (0, 0, math.pi / 2)
        L.new(tc.outputs['Object'], mp2.inputs['Vector']); L.new(mp2.outputs['Vector'], br.inputs['Vector'])
        mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
        L.new(out, mx.inputs['A']); L.new(br.outputs['Color'], mx.inputs['B']); out = mx.outputs['Result']
    L.new(out, p.inputs['Base Color']); p.inputs['Roughness'].default_value = 0.6
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = bump; L.new(nz.outputs['Fac'], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

def stripe_mat(name, ca, cb, count=22):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N, L = nt.nodes, nt.links; p = principled(m)
    uv = N.new('ShaderNodeUVMap'); sep = N.new('ShaderNodeSeparateXYZ')
    mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = count
    fr = N.new('ShaderNodeMath'); fr.operation = 'FRACT'
    gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.5
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['A'].default_value = col(ca); mix.inputs['B'].default_value = col(cb)
    L.new(uv.outputs['UV'], sep.inputs['Vector']); L.new(sep.outputs['X'], mul.inputs[0]); L.new(mul.outputs[0], fr.inputs[0]); L.new(fr.outputs[0], gt.inputs[0]); L.new(gt.outputs[0], mix.inputs['Factor'])
    m2 = N.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'; m2.inputs[1].default_value = math.pi * 2
    sn = N.new('ShaderNodeMath'); sn.operation = 'SINE'
    L.new(fr.outputs[0], m2.inputs[0]); L.new(m2.outputs[0], sn.inputs[0])
    shade = N.new('ShaderNodeMapRange'); shade.inputs['From Min'].default_value = -1; shade.inputs['To Min'].default_value = 0.75; shade.inputs['To Max'].default_value = 1.0
    L.new(sn.outputs[0], shade.inputs['Value'])
    cmb = N.new('ShaderNodeCombineColor'); [L.new(shade.outputs[0], cmb.inputs[i]) for i in range(3)]
    dk = N.new('ShaderNodeMix'); dk.data_type = 'RGBA'; dk.blend_type = 'MULTIPLY'; dk.inputs['Factor'].default_value = 1.0
    L.new(mix.outputs['Result'], dk.inputs['A']); L.new(cmb.outputs[0], dk.inputs['B']); L.new(dk.outputs['Result'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = 0.9; p.inputs['Sheen Weight'].default_value = 0.3
    b = N.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.3; L.new(sn.outputs[0], b.inputs['Height']); L.new(b.outputs['Normal'], p.inputs['Normal'])
    MATS[name] = m; return m

def starcloth_mat(name, base, gold='#e2bc62', scale=7.0, thr=0.09, sheen=0.9):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N, L = nt.nodes, nt.links; p = principled(m)
    tc = N.new('ShaderNodeTexCoord'); vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = scale
    lt = N.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = thr
    L.new(tc.outputs['Object'], vo.inputs['Vector']); L.new(vo.outputs['Distance'], lt.inputs[0])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['A'].default_value = col(base); mix.inputs['B'].default_value = col(gold)
    L.new(lt.outputs[0], mix.inputs['Factor']); L.new(mix.outputs['Result'], p.inputs['Base Color']); L.new(lt.outputs[0], p.inputs['Metallic'])
    p.inputs['Roughness'].default_value = 0.7; p.inputs['Sheen Weight'].default_value = sheen; p.inputs['Sheen Tint'].default_value = col('#ffb0c8')
    MATS[name] = m; return m

def imgmat(name, file, rough=0.85, sheen=0.0, emit=0.0, repeat=(1, 1)):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N, L = nt.nodes, nt.links; p = principled(m)
    im = N.new('ShaderNodeTexImage'); im.image = bpy.data.images.load(TEX + file, check_existing=True); im.interpolation = 'Cubic'
    if repeat != (1, 1):
        tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (repeat[0], repeat[1], 1)
        L.new(tc.outputs['UV'], mp.inputs['Vector']); L.new(mp.outputs['Vector'], im.inputs['Vector'])
    L.new(im.outputs['Color'], p.inputs['Base Color']); p.inputs['Roughness'].default_value = rough
    if sheen: p.inputs['Sheen Weight'].default_value = sheen; p.inputs['Sheen Tint'].default_value = col('#ffd0f0')
    if emit: L.new(im.outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = emit
    MATS[name] = m; return m

def link(o):
    sc.collection.objects.link(o); return o

def bm_obj(name, bm, m=None, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if smooth: me.shade_smooth()
    o = link(bpy.data.objects.new(name, me))
    if m: o.data.materials.append(m)
    return o

def mesh_obj(name, verts, faces, m=None, smooth=True):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    if smooth: me.shade_smooth()
    o = link(bpy.data.objects.new(name, me))
    if m: o.data.materials.append(m)
    return o

def box(name, size, loc, m=None, bevel=0.0, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    o = bm_obj(name, bm, m, smooth=False); o.location = loc; o.rotation_euler = rot
    if bevel > 0:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 2; b.limit_method = 'ANGLE'
        o.data.shade_smooth(); o.modifiers.new('wn', 'WEIGHTED_NORMAL')
    return o

def cyl(name, r, h, loc, m=None, segs=32, r2=None, rot=(0, 0, 0), cap=True):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=cap, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    o = bm_obj(name, bm, m); o.location = loc; o.rotation_euler = rot; return o

def sphere(name, r, loc, m=None, scale=(1, 1, 1), segs=24, rings=16):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    o = bm_obj(name, bm, m); o.location = loc; o.scale = scale; return o

def lathe(name, prof, loc, m=None, segs=32):
    verts, faces, n = [], [], len(prof)
    for i in range(segs):
        a = TAU * i / segs
        for (r, h) in prof: verts.append((math.cos(a) * r, math.sin(a) * r, h))
    for i in range(segs):
        j = (i + 1) % segs
        for k in range(n - 1): faces.append((i * n + k, j * n + k, j * n + k + 1, i * n + k + 1))
    o = mesh_obj(name, verts, faces, m); o.location = loc; return o

def tube(name, pts, r, m=None, res=6, poly=False):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 2; cu.use_fill_caps = True
    sp = cu.splines.new('POLY' if poly else 'NURBS'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (p[0], p[1], p[2], 1)
    if not poly: sp.use_endpoint_u = True; sp.order_u = min(4, len(pts)); sp.resolution_u = res
    o = link(bpy.data.objects.new(name, cu))
    if m: cu.materials.append(m)
    return o

def extrude_outline(name, pts2d, depth, m, bev=0.006):
    bm = bmesh.new(); vs = [bm.verts.new((x, 0, z)) for (x, z) in pts2d]; f = bm.faces.new(vs)
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ex['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.y += depth
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = bm_obj(name, bm, m, smooth=False)
    if bev: b = o.modifiers.new('bevel', 'BEVEL'); b.width = bev; b.segments = 2
    return o

def star_shape(name, R, r, n, depth, m):
    pts = [(math.cos(math.pi / 2 + i * math.pi / n) * (R if i % 2 == 0 else r), math.sin(math.pi / 2 + i * math.pi / n) * (R if i % 2 == 0 else r)) for i in range(n * 2)]
    return extrude_outline(name, pts, depth, m)

def crescent(name, R, m, off=0.42, k=0.82, depth=0.03, n=40):
    d = R * off; r = R * k; px = (R * R - r * r + d * d) / (2 * d); py = math.sqrt(R * R - px * px)
    a = math.atan2(py, px); b = math.atan2(py, px - d); pts = []
    for i in range(n + 1):
        t = a + (TAU - 2 * a) * i / n; pts.append((math.cos(t) * R, math.sin(t) * R))
    for i in range(1, n):
        t = (TAU - b) - (TAU - 2 * b) * i / n; pts.append((d + math.cos(t) * r, math.sin(t) * r))
    return extrude_outline(name, pts, depth, m)

def uvplane(name, w, h, loc, m, rot=(0, 0, 0)):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    vs = [bm.verts.new(v) for v in [(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)]]
    f = bm.faces.new(vs)
    for l, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): l[uvl].uv = uv
    o = bm_obj(name, bm, m, smooth=False); o.location = loc; o.rotation_euler = rot; return o

def uvdisc(name, r, loc, m, segs=64):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); c = bm.verts.new((0, 0, 0))
    ring = [bm.verts.new((math.cos(TAU * i / segs) * r, math.sin(TAU * i / segs) * r, 0)) for i in range(segs)]
    for i in range(segs):
        f = bm.faces.new((c, ring[i], ring[(i + 1) % segs]))
        for l in f.loops: l[uvl].uv = (0.5 + l.vert.co.x / (2 * r), 0.5 + l.vert.co.y / (2 * r))
    o = bm_obj(name, bm, m, smooth=False); o.location = loc; return o

def point_light(name, loc, energy, color=(1.0, 0.7, 0.4), radius=0.03):
    ld = bpy.data.lights.new(name, 'POINT'); ld.energy = energy; ld.color = color; ld.shadow_soft_size = radius
    o = link(bpy.data.objects.new(name, ld)); o.location = loc; return o

def grp(name, objs, loc, rz):
    e = link(bpy.data.objects.new(name, None))
    for o in objs: o.parent = e
    e.location = loc; e.rotation_euler = (0, 0, rz); return e

def leaf_into(bm, M, ln, wd, curl=0.25):
    rows, cols = 6, 4; grid = []
    for i in range(rows + 1):
        t = i / rows; w = math.sin(math.pi * (t ** 0.8)) * wd; row = []
        for j in range(cols + 1):
            u = (j / cols - 0.5) * 2
            row.append(bm.verts.new(M @ Vector((u * w, t * ln, -(t ** 2) * ln * curl + abs(u) * w * 0.25))))
        grid.append(row)
    for i in range(rows):
        for j in range(cols): bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))

def tassel_into(bm, p, s=1.0):
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.03 * s, matrix=Matrix.Translation(p + Vector((0, 0, -0.03 * s))))
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.012 * s, radius2=0.042 * s, depth=0.14 * s, matrix=Matrix.Translation(p + Vector((0, 0, -0.13 * s))))

def fringe_into(verts, faces, p, ln=0.08, r=0.0055):
    base = len(verts)
    for k in range(4):
        a = TAU * k / 4; verts.append((p.x + math.cos(a) * r, p.y + math.sin(a) * r, p.z))
    verts.append((p.x, p.y, p.z - ln))
    for k in range(4): faces.append((base + k, base + (k + 1) % 4, base + 4))

# ---------------------------------------------------------------- materials
wood = wood_mat('Wood', '#b07a48', '#7a4a26'); woodD = wood_mat('WoodDark', '#7a4a28', '#4a2a12')
planks = wood_mat('Planks', '#b88250', '#7a4a26', 14.0, planks=True)
gold = mat('Gold', '#e6bf6a', 0.3, 1.0); brass = mat('Brass', '#c99a48', 0.35, 1.0); iron = mat('Iron', '#3a3230', 0.5, 0.7)
leafM = mat('Leaf', '#3f7a44', 0.5); leaf2 = mat('Leaf2', '#5f9a50', 0.5)
BOOKC = ['#7a2e3a', '#3a4a6a', '#5a6a3a', '#8a5a2a', '#5a3a6a', '#9a7a4a']
thread = mat('Thread', '#8a7a60', 0.8)

# ---------------------------------------------------------------- octagon: the pop-up book's tent, opened towards the camera
# Faces j=0..7 look out at -45° + 45°·j, so j=0 faces the camera. j=7, 0, 1 are open; j=2..6 are walls.
RW, HW, RP = 2.3, 2.35, 2.78                 # wall radius to the corners, eave height, platform radius
RR, ZE = RW + 0.06, HW + 0.06                # roof edge radius and height
RC, ZC = 0.42, HW + 1.2                      # top of the roof cone, where the cupola sits
C8 = math.cos(math.pi / 8)
VA = [math.radians(-67.5 + 45 * k) for k in range(8)]
FA = [math.radians(-45 + 45 * j) for j in range(8)]
OPEN, WALLS = (7, 0, 1), (2, 3, 4, 5, 6)
def corner(k, r=RW, z=0.0):
    a = VA[k % 8]; return Vector((math.cos(a) * r, math.sin(a) * r, z))
def nrm(j): return Vector((math.cos(FA[j % 8]), math.sin(FA[j % 8]), 0))
def tng(j): return Vector((-math.sin(FA[j % 8]), math.cos(FA[j % 8]), 0))
def onwall(j, inset, z=0.0, along=0.0):
    # a point `inset` metres in from wall j, `along` metres sideways towards corner j+1
    return nrm(j) * (RW * C8 - inset) + tng(j) * along + Vector((0, 0, z))
def facing(j): return FA[j % 8] - math.pi / 2     # rz for parts modelled facing -y, so they face the room from wall j
def smooth(k): k = min(max(k, 0.0), 1.0); return k * k * (3 - 2 * k)

stone = mat('RoseStone', '#c48a82', 0.7); stoneD = mat('RoseStoneDeep', '#9e6a68', 0.75)
wallIn = stripe_mat('WallPeach', '#e09a7e', '#f4cfae', 7)
wallOut = stripe_mat('WallLilac', '#5a2f70', '#b496cc', 7)
roofA = starcloth_mat('RoofPurple', '#5a2a78', scale=9.0, thr=0.05, sheen=0.6)
roofB = starcloth_mat('RoofViolet', '#7c4c9c', scale=9.0, thr=0.05, sheen=0.6)
canopy = stripe_mat('Canopy', '#e6a284', '#f7d0ac', 4)
peach = mat('PeachSilk', '#eeac8c', 0.55, sheen=0.9)
valM = imgmat('ValanceImg', 'valance.png', 0.8, sheen=0.6)
vel = imgmat('CurtainVelvet', 'velvet.png', 0.75, sheen=1.0); lin = mat('Lining', '#f0bea4', 0.8, sheen=0.5)
glowWarm = mat('BulbGlow', '#ffe0a8', 0.4, emit='#ffb860', emit_str=6.0)

# ---------------------------------------------------------------- platform: rose stone plinth, wooden deck, gold spikes, front steps
def oct_prism(name, r, z0, z1, m, bevel=0.0):
    bm = bmesh.new()
    bot = [bm.verts.new((math.cos(a) * r, math.sin(a) * r, z0)) for a in VA]
    top = [bm.verts.new((math.cos(a) * r, math.sin(a) * r, z1)) for a in VA]
    bm.faces.new(top); bm.faces.new(list(reversed(bot)))
    for k in range(8): bm.faces.new((bot[k], bot[(k + 1) % 8], top[(k + 1) % 8], top[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = bm_obj(name, bm, m, smooth=False)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 2; b.limit_method = 'ANGLE'
        o.data.shade_smooth(); o.modifiers.new('wn', 'WEIGHTED_NORMAL')
    return o
oct_prism('PlinthCore', RP - 0.05, -0.36, -0.13, stoneD)
side = 2 * (RP + 0.08) * math.sin(math.pi / 8)
for j in range(8):
    for q in range(3):
        c = nrm(j) * ((RP + 0.08) * C8 - 0.12) + tng(j) * ((q - 1) * side / 3) + Vector((0, 0, -0.245))
        box(f'PlinthBlock{j}_{q}', (side / 3 - 0.025, 0.24, 0.22), tuple(c), stone, 0.02, rot=(0, 0, facing(j)))
oct_prism('Platform', RP, -0.13, -0.004, woodD, 0.02)
fl = bmesh.new(); fl.faces.new([fl.verts.new((math.cos(a) * (RP - 0.005), math.sin(a) * (RP - 0.005), 0.002)) for a in VA])
bm_obj('Floor', fl, planks, smooth=False)
sp_ = bmesh.new()
for k in range(8):
    p = corner(k, RP + 0.04)
    box(f'Pedestal{k}', (0.3, 0.3, 0.46), (p.x, p.y, -0.13), stone, 0.025, rot=(0, 0, VA[k]))
    bmesh.ops.create_uvsphere(sp_, u_segments=12, v_segments=8, radius=0.06, matrix=Matrix.Translation((p.x, p.y, 0.13)))
    bmesh.ops.create_cone(sp_, cap_ends=True, segments=12, radius1=0.065, radius2=0.0, depth=0.22, matrix=Matrix.Translation((p.x, p.y, 0.25)))
bm_obj('Spikes', sp_, gold)
for i, (dr, w, top) in enumerate([(0.16, 1.5, -0.12), (0.46, 1.8, -0.24)]):
    c = nrm(0) * ((RP + 0.08) * C8 + dr) + Vector((0, 0, (top - 0.36) / 2))
    box(f'Step{i}', (w, 0.32, top + 0.36), tuple(c), stone, 0.02, rot=(0, 0, facing(0)))
m0 = nrm(0) * ((RP + 0.08) * C8 + 0.16)
uvplane('StepMat', 0.9, 0.26, (m0.x, m0.y, -0.117), imgmat('MatM', 'mat.png', 0.95), rot=(-math.pi / 2, 0, FA[0] + math.pi / 2))

# ---------------------------------------------------------------- walls (lilac outside, peach stripes inside), posts, eave ring
bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); NU, NZ = 18, 8
for j in WALLS:
    grid = []
    for iu in range(NU + 1):
        u = iu / NU; p = corner(j).lerp(corner(j + 1), u); col_ = []
        for iz in range(NZ + 1):
            z = HW * iz / NZ; bulge = 0.05 * math.sin(math.pi * u) * (0.55 + 0.45 * math.sin(math.pi * z / HW))
            col_.append(bm.verts.new(p + nrm(j) * bulge + Vector((0, 0, z))))
        grid.append(col_)
    for iu in range(NU):
        for iz in range(NZ):
            f = bm.faces.new((grid[iu][iz], grid[iu + 1][iz], grid[iu + 1][iz + 1], grid[iu][iz + 1]))
            for l, uv in zip(f.loops, [(iu / NU, iz / NZ), ((iu + 1) / NU, iz / NZ), ((iu + 1) / NU, (iz + 1) / NZ), (iu / NU, (iz + 1) / NZ)]): l[uvl].uv = uv
o = bm_obj('Walls', bm, wallOut); o.data.materials.append(wallIn)
s = o.modifiers.new('solid', 'SOLIDIFY'); s.thickness = 0.04; s.offset = -1; s.material_offset = 1; s.material_offset_rim = 1
tube('WallTrimLow', [tuple(corner(k, RW - 0.06, 0.12)) for k in range(2, 8)], 0.014, gold, poly=True)
tube('WallTrimHigh', [tuple(corner(k, RW - 0.06, HW - 0.02)) for k in range(2, 8)], 0.018, gold, poly=True)
for k in range(2, 8):
    p = corner(k)
    cyl(f'Post{k}', 0.05, HW + 0.02, (p.x, p.y, (HW + 0.02) / 2), wood, 16, r2=0.045)
    cyl(f'PostFoot{k}', 0.075, 0.06, (p.x, p.y, 0.03), gold, 16)
tube('EaveRing', [tuple(corner(k, RR, ZE)) for k in range(2, 8)], 0.03, gold, poly=True)
eb = bmesh.new()
for k in range(2, 8):
    p = corner(k, RR, ZE)
    bmesh.ops.create_uvsphere(eb, u_segments=12, v_segments=8, radius=0.05, matrix=Matrix.Translation(p + Vector((0, 0, 0.04))))
    bmesh.ops.create_cone(eb, cap_ends=True, segments=12, radius1=0.045, radius2=0.0, depth=0.2, matrix=Matrix.Translation(p + Vector((0, 0, 0.17))))
bm_obj('EaveFinials', eb, gold)

# ---------------------------------------------------------------- roof: five drooping fabric panels over the walls, gold ribs over the open front
def roof_pt(j, u, v):
    b = corner(j, RR, ZE).lerp(corner(j + 1, RR, ZE), u); t = corner(j, RC, ZC).lerp(corner(j + 1, RC, ZC), u)
    return b.lerp(t, v)
bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); NU, NV = 16, 14
for j in WALLS:
    grid = []
    for iu in range(NU + 1):
        u = iu / NU; col_ = []
        for iv in range(NV + 1):
            v = iv / NV; p = roof_pt(j, u, v); su = math.sin(math.pi * u)
            # the cloth sags between the ribs and droops into a scallop at the eave
            p.z -= 0.11 * su * math.sin(math.pi * min(1.0, v * 1.15)) ** 0.8 * (1 - 0.6 * v) + 0.07 * su * (1 - v) ** 4
            col_.append(bm.verts.new(p))
        grid.append(col_)
    for iu in range(NU):
        for iv in range(NV):
            f = bm.faces.new((grid[iu][iv], grid[iu + 1][iv], grid[iu + 1][iv + 1], grid[iu][iv + 1])); f.material_index = j % 2
            for l, uv in zip(f.loops, [(iu / NU, iv / NV), ((iu + 1) / NU, iv / NV), ((iu + 1) / NU, (iv + 1) / NV), (iu / NU, (iv + 1) / NV)]): l[uvl].uv = uv
o = bm_obj('RoofPanels', bm, roofA)
for m in (roofB, canopy, canopy): o.data.materials.append(m)
s = o.modifiers.new('solid', 'SOLIDIFY'); s.thickness = 0.025; s.offset = -1; s.material_offset = 2; s.material_offset_rim = 2
for k in range(8):
    if k in (0, 1): continue          # no ribs across the opening, so nothing cuts through the view
    tube(f'Rib{k}', [tuple(corner(k, RR, ZE)), tuple(corner(k, RC, ZC))], 0.022, gold)

# ---------------------------------------------------------------- cupola, spire and the crescent finial
def oct_band(name, r0, r1, z0, z1, mats):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
    for k in range(8):
        a0, a1 = VA[k], VA[(k + 1) % 8]
        vs = [bm.verts.new((math.cos(a0) * r0, math.sin(a0) * r0, z0)), bm.verts.new((math.cos(a1) * r0, math.sin(a1) * r0, z0)),
              bm.verts.new((math.cos(a1) * r1, math.sin(a1) * r1, z1)), bm.verts.new((math.cos(a0) * r1, math.sin(a0) * r1, z1))]
        f = bm.faces.new(vs); f.material_index = k % len(mats)
        for l, uv in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): l[uvl].uv = uv
    o = bm_obj(name, bm, mats[0], smooth=False)
    for m in mats[1:]: o.data.materials.append(m)
    return o
ZS = ZC + 0.34                                          # spire base
oct_band('Cupola', 0.44, 0.44, ZC - 0.06, ZS, [stripe_mat('CupolaStripes', '#5a2f70', '#b496cc', 2)])
oct_band('CupolaCap', 0.52, 0.0, ZS, ZS + 0.001, [roofA])
oct_band('Spire', 0.52, 0.0, ZS, ZS + 1.1, [roofA, roofB])
tube('SpireRing', [tuple(corner(k, 0.53, ZS)) for k in range(9)], 0.02, gold, poly=True)
for k in range(8):
    for q in (-1, 1):
        sc_pts = [(0.085 * math.cos(t), 0.085 * math.sin(t)) for t in [math.pi + math.pi * i / 12 for i in range(13)]]
        sh = extrude_outline(f'Scallop{k}{q}', sc_pts, 0.01, gold, bev=0.003)
        p = nrm(k) * (0.52 * C8 + 0.012) + tng(k) * (q * 0.1) + Vector((0, 0, ZS - 0.005)); sh.location = p; sh.rotation_euler = (0, 0, facing(k))
    pw = nrm(k) * (0.44 * C8 + 0.005) + Vector((0, 0, ZC + 0.14))
    cyl(f'PortholeRim{k}', 0.075, 0.02, tuple(pw), gold, 20, rot=(math.pi / 2, 0, FA[k] + math.pi / 2))
    cyl(f'Porthole{k}', 0.058, 0.026, tuple(pw), mat('PortholeGlow', '#ffe6b0', 0.4, emit='#ffb860', emit_str=4.0), 20, rot=(math.pi / 2, 0, FA[k] + math.pi / 2))
sphere('FinialBall', 0.06, (0, 0, ZS + 1.13), gold)
cyl('FinialStem', 0.012, 0.22, (0, 0, ZS + 1.25), gold, 8)
def faceted_star(name, n, R, r, mid, depth, m):
    """a crystal star: n long points with n short ones between, every point a ridged pyramid, apexes front and back.
    Long and short points alternate, as on the tarot Star card, rather than two squares laid over each other."""
    bm = bmesh.new(); ring = []
    for i in range(n * 4):
        a = math.pi / 2 + i * math.pi / (n * 2); k = i % 4
        rad = R if k == 0 else mid if k == 2 else r            # long point, valley, short point, valley
        ring.append(bm.verts.new((math.cos(a) * rad, 0, math.sin(a) * rad)))
    f, b = bm.verts.new((0, -depth, 0)), bm.verts.new((0, depth, 0))
    for i in range(len(ring)):
        j = (i + 1) % len(ring); bm.faces.new((ring[i], ring[j], f)); bm.faces.new((ring[j], ring[i], b))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm_obj(name, bm, m, smooth=False)
# the finial: an eight-pointed crystal star, its long points up, down and to the sides
fm = faceted_star('FinialStar', 4, 0.21, 0.058, 0.155, 0.06, mat('FinialGlow', '#ffe2a0', 0.35, 0.5, emit='#ffc860', emit_str=6.0))
fm.location = (0, 0, ZS + 1.5); fm.rotation_euler = (0, 0, math.pi / 4)
point_light('FinialLight', (0.12, -0.12, ZS + 1.48), 4, (1.0, 0.8, 0.5), 0.05)

# ---------------------------------------------------------------- swags: purple outside all round, peach inside over the walls
FV, FF = [], []
def swags(name, j, r, z, nout, drop, m, inner=False):
    A, B = corner(j, r, z), corner(j + 1, r, z); M = A.lerp(B, 0.5)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); hems = []
    for (P, Q) in ((A, M), (M, B)):
        NU, NV = 26, 10; grid = []; hem = []
        for iu in range(NU + 1):
            u = iu / NU; sn = math.sin(math.pi * u); top = P.lerp(Q, u); col_ = []
            for iv in range(NV + 1):
                v = iv / NV
                dz = -v * drop * (0.2 + 0.8 * sn ** 1.2)                                    # each fold line is a deeper catenary
                push = 0.015 + v * (0.04 + 0.08 * sn) + 0.012 * math.sin(v * math.pi * 5) * sn  # gathered folds bulge outwards
                col_.append((bm.verts.new(top + nout * push + Vector((0, 0, dz))), (u, 1 - v)))
            grid.append(col_); hem.append(col_[-1][0].co.copy())
        for iu in range(NU):
            for iv in range(NV):
                vs = [grid[iu][iv], grid[iu + 1][iv], grid[iu + 1][iv + 1], grid[iu][iv + 1]]
                f = bm.faces.new([v_ for v_, _ in vs])
                for l, (_, uv) in zip(f.loops, vs): l[uvl].uv = uv
        hems.append(hem)
    o = bm_obj(name, bm, m); s = o.modifiers.new('solid', 'SOLIDIFY'); s.thickness = 0.012
    for h_, hem in enumerate(hems):
        tube(f'{name}Trim{h_}', [tuple(p + nout * 0.006 + Vector((0, 0, 0.012))) for p in hem[::2]], 0.012 if inner else 0.014, gold)
        for i in range(len(hem) - 1):
            for k in range(2): fringe_into(FV, FF, hem[i].lerp(hem[i + 1], k / 2), 0.05 if inner else 0.07)
    tb = bmesh.new()
    for P in (A, M): tassel_into(tb, P + nout * 0.04 + Vector((0, 0, -drop * 0.2 - 0.02)), 0.8 if inner else 1.2)
    bm_obj(name + 'Tassels', tb, gold)
for j in WALLS: swags(f'SwagOut{j}', j, RR + 0.01, ZE - 0.005, nrm(j), 0.3, valM)     # the open front is a clean cutaway
for j in (2, 3, 5, 6): swags(f'SwagIn{j}', j, RW - 0.07, HW - 0.04, -nrm(j), 0.3, peach, inner=True)
mesh_obj('SwagFringe', FV, FF, gold, smooth=False)

# ---------------------------------------------------------------- curtains tied back at the four posts round the opening
lilacSilk = mat('CurtainLilac', '#dcc0ec', 0.7, sheen=0.9)
def curtain(name, k, toward, w=0.95, tie=0.45):
    """A two-layer drape after the reference: purple star velvet in front, a paler lilac layer behind that shows
    along the opening and the hem, gold piping and fringe, a rope tie-back with two tassels."""
    fj = k if (toward - k) % 8 == 1 else (k - 1) % 8           # the face this curtain hangs across
    base = corner(k, RW - 0.06); along = (corner(toward) - corner(k)).normalized(); out = nrm(fj); h = HW - 0.02; tz = tie * h
    FVc, FFc = [], []
    def sheet(sname, width, depth, mats, ph, spill):
        bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); NU, NV = 36, 60; grid = []; hem = []; edge = []
        for i in range(NV + 1):
            z = h * i / NV
            g = 0.2 + 0.8 * smooth((z - tz) / (h - tz)) if z >= tz else 0.2 + 0.72 * smooth((tz - z) / tz) ** 0.8   # wide at the rod, gathered at the tie, flaring to the floor
            tb_ = math.exp(-((z - tz) / (0.07 * h)) ** 2); pool = max(0.0, 0.22 - z) / 0.22; row = []
            for jj in range(NU + 1):
                u = jj / NU; U = width * u * g
                amp = 0.055 * (1 - 0.6 * tb_) * (1.25 if z < tz else 1.0)
                pleat = math.sin(u * math.pi * 10 + ph + 0.6 * math.sin(z * 2.2 + u * 3)) * amp + 0.012 * math.sin(u * math.pi * 23 + z * 4 + ph)
                p = base + along * U + out * (depth + pleat + tb_ * 0.05 + pool * (0.16 + spill) * u) + Vector((0, 0, max(z, 0.004)))
                row.append((bm.verts.new(p), (u, z / h)))
                if i == 0: hem.append(p.copy())
                if jj == NU: edge.append(p.copy())
            grid.append(row)
        for i in range(NV):
            for jj in range(NU):
                vs = [grid[i][jj], grid[i][jj + 1], grid[i + 1][jj + 1], grid[i + 1][jj]]
                f = bm.faces.new([v for v, _ in vs])
                for l, (_, uv) in zip(f.loops, vs): l[uvl].uv = uv
        bm.faces.ensure_lookup_table(); f0 = bm.faces[len(bm.faces) // 2]; f0.normal_update()
        if f0.normal.dot(out) < 0:
            for f in bm.faces: f.normal_flip()
        o = bm_obj(sname, bm, mats[0]); o.data.materials.append(mats[1])
        sm = o.modifiers.new('solid', 'SOLIDIFY'); sm.thickness = 0.015; sm.material_offset = 1; sm.offset = -1
        for i in range(len(hem) - 1):
            for q in range(2): fringe_into(FVc, FFc, hem[i].lerp(hem[i + 1], q / 2) + Vector((0, 0, 0.012)), 0.06, 0.005)
        return hem, edge
    sheet(name + 'Back', w * 1.25, 0.015, [lilacSilk, lilacSilk], 0.8, 0.07)     # the pale layer, wider and longer, so it shows round the edge
    hem, edge = sheet(name, w, 0.06, [vel, lin], 0.0, 0.0)
    tube(name + 'EdgeTrim', [tuple(p + out * 0.012) for p in edge[::4]], 0.011, gold)
    tube(name + 'HemTrim', [tuple(p + Vector((0, 0, 0.014))) for p in hem[::3]], 0.012, gold)
    mesh_obj(name + 'Fringe', FVc, FFc, gold, smooth=False)
    # the tie-back: a gold rope looped round the gathered cloth, knotted in front, two tassels hanging from the knot
    c = base + along * (w * 0.12) + out * 0.08 + Vector((0, 0, tz)); ra, rb = w * 0.14 + 0.05, 0.11
    loop = [c + along * (math.cos(t) * ra) + out * (math.sin(t) * rb) for t in [TAU * i / 24 for i in range(25)]]
    tube(name + 'Rope', [tuple(p) for p in loop], 0.02, gold, poly=True)
    knot = c + out * rb
    sphere(name + 'Knot', 0.04, tuple(knot), gold, segs=16, rings=10)
    tb = bmesh.new()
    for dx, drop, sz in ((-0.035, 0.14, 1.8), (0.04, 0.24, 1.55)):
        end = knot + along * dx + Vector((0, 0, -drop))
        tube(f'{name}Cord{dx}', [tuple(knot), tuple(knot.lerp(end, 0.5) + out * 0.015), tuple(end)], 0.008, gold)
        tassel_into(tb, end, sz)
    bm_obj(name + 'Tassels', tb, gold)
    # a soft warm light in front, as if the lanterns inside spill onto the velvet
    ld_ = bpy.data.lights.new(name + 'Light', 'AREA'); ld_.energy = 28; ld_.size = 0.9; ld_.color = (1.0, 0.78, 0.6)
    lo = link(bpy.data.objects.new(name + 'Light', ld_)); lo.location = base + along * (w * 0.35) + out * 0.9 + Vector((0, 0, 1.3))
    lo.rotation_euler = (out * -1 + Vector((0, 0, -0.25))).to_track_quat('-Z', 'Y').to_euler(); lo.visible_camera = False; lo.visible_glossy = False

def side_canopy(name, k, toward, span):
    """The roof carried a little way past the cut at each side, as in the reference: a drooping cloth flap with a
    gold-piped cut edge and a swag along its eave, so the side curtain has somewhere to hang from."""
    fj = k if (toward - k) % 8 == 1 else (k - 1) % 8
    sw = span / (2 * RR * math.sin(math.pi / 8))
    ua, ub = (0.0, sw) if fj == k else (1.0 - sw, 1.0)
    out = nrm(fj)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); NU, NV = 10, 14; grid = []; cut = []
    for iu in range(NU + 1):
        u = ua + (ub - ua) * iu / NU; col_ = []
        for iv in range(NV + 1):
            v = iv / NV; p = roof_pt(fj, u, v); su = math.sin(math.pi * u)
            p.z -= 0.11 * su * math.sin(math.pi * min(1.0, v * 1.15)) ** 0.8 * (1 - 0.6 * v) + 0.07 * su * (1 - v) ** 4
            col_.append(bm.verts.new(p))
            if (fj == k and iu == NU) or (fj != k and iu == 0): cut.append(p.copy())
        grid.append(col_)
    for iu in range(NU):
        for iv in range(NV):
            f = bm.faces.new((grid[iu][iv], grid[iu + 1][iv], grid[iu + 1][iv + 1], grid[iu][iv + 1])); f.material_index = fj % 2
            for l, uv in zip(f.loops, [(iu / NU, iv / NV), ((iu + 1) / NU, iv / NV), ((iu + 1) / NU, (iv + 1) / NV), (iu / NU, (iv + 1) / NV)]): l[uvl].uv = uv
    o = bm_obj(name, bm, roofA)
    for m in (roofB, canopy, canopy): o.data.materials.append(m)
    sm = o.modifiers.new('solid', 'SOLIDIFY'); sm.thickness = 0.025; sm.offset = -1; sm.material_offset = 2; sm.material_offset_rim = 2
    tube(name + 'CutTrim', [tuple(p + Vector((0, 0, 0.012))) for p in cut[::2]], 0.02, gold)
    # the swag under its eave, following the same scalloped line as the roof edge
    A, B = [roof_pt(fj, u, 0) for u in (ua, ub)]
    for P in (A, B): P.z -= 0.07 * math.sin(math.pi * (ua if P is A else ub)) - 0.01
    if fj != k: A, B = B, A                                      # run from the corner outwards
    bmw = bmesh.new(); uvw = bmw.loops.layers.uv.new(); NU, NV = 26, 10; grid = []; hem = []; drop = 0.3
    for iu in range(NU + 1):
        u = iu / NU; sn = math.sin(math.pi * u); top = A.lerp(B, u); col_ = []
        for iv in range(NV + 1):
            v = iv / NV
            q = top + out * (0.03 + v * (0.04 + 0.08 * sn) + 0.012 * math.sin(v * math.pi * 5) * sn) + Vector((0, 0, -v * drop * (0.2 + 0.8 * sn ** 1.2)))
            col_.append((bmw.verts.new(q), (u, 1 - v)))
        grid.append(col_); hem.append(col_[-1][0].co.copy())
    for iu in range(NU):
        for iv in range(NV):
            vs = [grid[iu][iv], grid[iu + 1][iv], grid[iu + 1][iv + 1], grid[iu][iv + 1]]
            f = bmw.faces.new([v_ for v_, _ in vs])
            for l, (_, uv) in zip(f.loops, vs): l[uvw].uv = uv
    ow = bm_obj(name + 'Swag', bmw, valM); sm = ow.modifiers.new('solid', 'SOLIDIFY'); sm.thickness = 0.012
    tube(name + 'SwagTrim', [tuple(p + out * 0.006 + Vector((0, 0, 0.012))) for p in hem[::2]], 0.014, gold)
    FVs, FFs = [], []
    for i in range(len(hem) - 1):
        for q in range(2): fringe_into(FVs, FFs, hem[i].lerp(hem[i + 1], q / 2), 0.07)
    mesh_obj(name + 'SwagFringe', FVs, FFs, gold, smooth=False)
    tb = bmesh.new()
    for P in (A, B): tassel_into(tb, P + out * 0.05 + Vector((0, 0, -0.08)), 1.3)
    bm_obj(name + 'Tassels', tb, gold)

side_canopy('SideCanopyL', 7, 0, 0.66)
side_canopy('SideCanopyR', 2, 1, 0.66)
curtain('CurtainSideL', 7, 0, 0.5, 0.45)
curtain('CurtainSideR', 2, 1, 0.5, 0.45)

# ---------------------------------------------------------------- hangings
def hanging(name, file, w, h, j, z, along=0.0):
    inw = -nrm(j); loc = onwall(j, 0.07, z, along); rz = facing(j)
    uvplane(name, w, h, tuple(loc), imgmat(name + 'M', file, 0.85, sheen=0.4), rot=(0, 0, rz))
    top = loc + Vector((0, 0, h / 2 + 0.03)) + inw * 0.02
    cyl(name + 'Rod', 0.016, w + 0.18, tuple(top), woodD, 12, rot=(0, math.pi / 2, rz))
    tb = bmesh.new()
    for k in (-0.3, 0, 0.3): tassel_into(tb, loc + tng(j) * (k * w) + Vector((0, 0, -h / 2 + 0.01)) + inw * 0.01, 0.6)
    bm_obj(name + 'Tassels', tb, gold)
hanging('SunHanging', 'sunHanging.png', 0.7, 0.88, 5, 1.42)
hanging('MoonHanging', 'moonHanging.png', 0.66, 0.8, 2, 1.42, 0.35)   # moved in, clear of the side flap

# ---------------------------------------------------------------- rug and the table with a draped cloth
T0 = Vector((-0.12, 0.12, 0)); TH, TR = 0.72, 0.6
uvdisc('RugRound', 1.45, (T0.x, T0.y, 0.012), imgmat('RugRoundM', 'roundRug.png', 0.95)).rotation_euler.z = math.pi / 4
cyl('TableLeg', 0.07, TH, (T0.x, T0.y, TH / 2), woodD, 16, r2=0.06)
skirt = imgmat('ClothSkirt', 'skirt.png', 0.8, sheen=0.7)
bm = bmesh.new(); uvl = bm.loops.layers.uv.new(); NA, NV = 160, 16; grid = []; hem = []
for i in range(NA + 1):
    a = TAU * i / NA
    fold = 0.6 * math.sin(14 * a + 0.5 * math.sin(3 * a)) + 0.4 * math.sin(23 * a + 1.7)     # uneven soft folds
    hemw = 0.035 * math.sin(7 * a + 0.4) + 0.025 * fold                                       # the hem rises and falls with them
    row = []
    for j in range(NV + 1):
        v = j / NV
        if v < 0.15:     # rolls over the table edge
            ang = v / 0.15 * math.pi / 2; rr = TR + 0.035 * math.sin(ang); zz = TH + 0.012 - 0.035 * (1 - math.cos(ang))
        else:
            t = (v - 0.15) / 0.85; rr = TR + 0.035 + 0.13 * t ** 1.5 + 0.032 * fold * t ** 1.2; zz = TH + 0.012 - 0.035 - t * (0.45 + hemw)
        co = Vector((T0.x + math.cos(a) * rr, T0.y + math.sin(a) * rr, zz)); row.append((bm.verts.new(co), (i / NA, 1 - v)))
        if j == NV and i < NA: hem.append(co.copy())
    grid.append(row)
for i in range(NA):
    for j in range(NV):
        vs = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]
        f = bm.faces.new([v for v, _ in vs])
        for l, (_, uv) in zip(f.loops, vs): l[uvl].uv = uv
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
o = bm_obj('TableCloth', bm, skirt); s = o.modifiers.new('solid', 'SOLIDIFY'); s.thickness = 0.01
uvdisc('ClothTop', TR + 0.002, (T0.x, T0.y, TH + 0.0125), imgmat('ClothTopM', 'clothTop.png', 0.8, sheen=0.6))
FV, FF = [], []
for i in range(len(hem)):
    for k in range(3): fringe_into(FV, FF, hem[i].lerp(hem[(i + 1) % len(hem)], k / 3) + Vector((0, 0, 0.004)), 0.06, 0.006)
mesh_obj('ClothFringe', FV, FF, gold, smooth=False)

tz = TH + 0.016
bp = T0 + Vector((-0.12, 0.12, 0))
lathe('BallStand', [(0.0, 0), (0.08, 0), (0.08, 0.012), (0.05, 0.03), (0.035, 0.05), (0.055, 0.075), (0.06, 0.085), (0.0, 0.085)], (bp.x, bp.y, tz), brass)
sphere('CrystalBall', 0.115, (bp.x, bp.y, tz + 0.195), mat('Glass', '#f2eeff', 0.02, trans=1.0), segs=40, rings=24)
sphere('BallCore', 0.026, (bp.x, bp.y, tz + 0.195), mat('BallCoreM', '#c8b0ff', 0.5, emit='#9a78f0', emit_str=1.1))
bl_ = point_light('BallLight', (bp.x, bp.y, tz + 0.2), 5, (0.75, 0.6, 1.0), 0.05)
# the light sits inside the glass ball: keep it out of refractions and reflections or it shows as a white ring
bl_.visible_transmission = False; bl_.visible_glossy = False; bl_.visible_camera = False
cp = T0 + Vector((0.28, 0.22, 0))
cyl('CandleDish', 0.065, 0.016, (cp.x, cp.y, tz + 0.008), brass, 24, r2=0.055)
wax = mat('Wax', '#f2e6cc', 0.55, emit='#ff9a40', emit_str=0.15)
cyl('Candle', 0.03, 0.15, (cp.x, cp.y, tz + 0.09), wax, 20)
flameM = mat('Flame', '#ffd890', 0.5, emit='#ffb050', emit_str=30.0)
sphere('Flame', 0.013, (cp.x, cp.y, tz + 0.19), flameM, scale=(1, 1, 2.2))
point_light('CandleLight', (cp.x, cp.y, tz + 0.24), 10, (1.0, 0.68, 0.38), 0.03)
wp = T0 + Vector((-0.34, -0.1, 0))
lathe('Bowl', [(0.0, 0.012), (0.05, 0), (0.09, 0.03), (0.1, 0.055), (0.094, 0.057), (0.085, 0.035), (0.0, 0.018)], (wp.x, wp.y, tz), brass)
amy = mat('Amethyst', '#8a5ac8', 0.15, emit='#6a3ab0', emit_str=0.4)
for k, (dx, dy, h, tilt) in enumerate([(0, 0, 0.09, 0), (0.03, 0.02, 0.07, 0.3), (-0.03, 0.01, 0.06, -0.35), (0.01, -0.03, 0.065, 0.2)]):
    cyl(f'Amy{k}', 0.018, h, (wp.x + dx, wp.y + dy, tz + 0.04 + h / 2), amy, 6, r2=0.0, rot=(tilt, tilt * 0.5, 0))
mp = T0 + Vector((0.08, 0.36, 0))
cyl('MoonBase', 0.045, 0.022, (mp.x, mp.y, tz + 0.011), brass, 20)
mo = crescent('TableMoon', 0.075, gold, depth=0.018); mo.location = (mp.x, mp.y, tz + 0.1); mo.rotation_euler = (0, 0.25, math.pi / 4)
cardM = {k: imgmat(f'Card_{k}', f'{k}.png', 0.55) for k in ['card0', 'card2', 'card17', 'cardBack']}
front = math.atan2(-1, 1)
for i, k in enumerate(['card0', 'cardBack', 'card2', 'cardBack', 'card17', 'cardBack', 'card0', 'cardBack', 'card2']):
    a = front + (i - 4) * 0.22; x = T0.x + math.cos(a) * 0.41; y = T0.y + math.sin(a) * 0.41
    uvplane(f'Card{i}', 0.075, 0.12, (x, y, tz + 0.002 + i * 0.0004), cardM[k], rot=(-math.pi / 2, 0, a + math.pi / 2))
dp = T0 + Vector((0.17, -0.05, 0)); edge = mat('CardEdge', '#d8b870', 0.5, 0.4)
for i in range(6): box(f'Deck{i}', (0.075, 0.12, 0.007), (dp.x, dp.y, tz + 0.0035 + i * 0.0072), edge, rot=(0, 0, front + math.pi / 2 + i * 0.02))
uvplane('DeckTop', 0.075, 0.12, (dp.x, dp.y, tz + 0.0035 + 5 * 0.0072 + 0.0041), cardM['cardBack'], rot=(-math.pi / 2, 0, front + math.pi / 2 + 0.1))

# ---------------------------------------------------------------- poufs
f_ = Vector((1, -1, 0)).normalized(); p_ = Vector((1, 1, 0)).normalized()
puf = starcloth_mat('PoufVelvet', '#a83250')
tb = bmesh.new()
for d in (-1, 1):
    c = T0 + f_ * 1.0 + p_ * (d * 0.5)
    for (a, b) in [(-1, -1), (1, -1), (-1, 1), (1, 1)]: cyl(f'PoufLeg{d}{a}{b}', 0.022, 0.14, (c.x + a * 0.14, c.y + b * 0.14, 0.07), woodD, 10, r2=0.016)
    body = cyl(f'Pouf{d}', 0.27, 0.22, (c.x, c.y, 0.25), puf, 40); bv = body.modifiers.new('bevel', 'BEVEL'); bv.width = 0.06; bv.segments = 4; body.modifiers.new('wn', 'WEIGHTED_NORMAL')
    sphere(f'PoufTop{d}', 0.255, (c.x, c.y, 0.34), puf, scale=(1, 1, 0.3), segs=32, rings=16)
    cyl(f'PoufBand{d}', 0.275, 0.025, (c.x, c.y, 0.34), gold, 40, cap=False)
    sphere(f'PoufButton{d}', 0.022, (c.x, c.y, 0.418), gold)
    for k in range(20):
        a = TAU * k / 20; tassel_into(tb, Vector((c.x + math.cos(a) * 0.285, c.y + math.sin(a) * 0.285, 0.165)), 0.5)
bm_obj('PoufTassels', tb, gold)

# ---------------------------------------------------------------- lanterns & plants
def lantern(name, loc, s=1.0, chain=0.0, light=10.0):
    loc = Vector(loc); objs = []; hexr = 0.072 * s
    objs.append(cyl(name + 'Base', 0.085 * s, 0.03 * s, loc + Vector((0, 0, 0.015 * s)), brass, 6))
    for k in range(6):
        a = TAU * k / 6 + math.pi / 6
        objs.append(cyl(f'{name}Post{k}', 0.006 * s, 0.22 * s, loc + Vector((math.cos(a) * hexr, math.sin(a) * hexr, 0.14 * s)), brass, 6))
    objs.append(cyl(name + 'Glass', 0.066 * s, 0.2 * s, loc + Vector((0, 0, 0.14 * s)), mat('LanternGlass', '#ffd9a0', 0.15, emit='#ffb050', emit_str=3.5), 6))
    objs.append(cyl(name + 'Cap', 0.08 * s, 0.03 * s, loc + Vector((0, 0, 0.265 * s)), brass, 6, r2=0.06 * s))
    objs.append(cyl(name + 'Dome', 0.075 * s, 0.11 * s, loc + Vector((0, 0, 0.335 * s)), brass, 6, r2=0.0))
    objs.append(sphere(name + 'Fin', 0.018 * s, loc + Vector((0, 0, 0.41 * s)), brass, segs=12, rings=8))
    if chain > 0:
        cyl(name + 'Chain', 0.006 * s, chain, loc + Vector((0, 0, 0.42 * s + chain / 2)), brass, 6)
    point_light(name + 'Light', loc + Vector((0, 0, 0.14 * s)), light, (1.0, 0.66, 0.36), 0.04)
    return objs

def plant(name, loc, sc_, pot_col, n=11, flowers=False):
    loc = Vector(loc); rr = random.Random(sum(map(ord, name)))
    lathe(name + 'Pot', [(0.0, 0), (0.16 * sc_, 0), (0.2 * sc_, 0.04 * sc_), (0.23 * sc_, 0.26 * sc_), (0.25 * sc_, 0.3 * sc_), (0.21 * sc_, 0.31 * sc_), (0.0, 0.29 * sc_)], loc, mat('Pot' + pot_col, pot_col, 0.5))
    lb, sb = bmesh.new(), bmesh.new()
    for k in range(n):
        a = TAU * k / n + rr.random() * 0.4; tilt = 0.35 + rr.random() * 0.5; ln = (0.26 + rr.random() * 0.16) * sc_
        base = loc + Vector((0, 0, 0.29 * sc_)); tip = base + Vector((math.cos(a) * math.sin(tilt) * ln, math.sin(a) * math.sin(tilt) * ln, math.cos(tilt) * ln * 1.3))
        d = tip - base
        bmesh.ops.create_cone(sb, cap_ends=False, segments=4, radius1=0.006 * sc_, radius2=0.004 * sc_, depth=d.length, matrix=Matrix.Translation((base + tip) / 2) @ d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4())
        leaf_into(lb, Matrix.Translation(tip) @ Matrix.Rotation(a - math.pi / 2, 4, 'Z') @ Matrix.Rotation(-(0.9 - tilt), 4, 'X'), 0.24 * sc_, 0.075 * sc_)
    bm_obj(name + 'Leaves', lb, leafM); bm_obj(name + 'Stems', sb, leafM)
    if flowers:
        fb = bmesh.new()
        for k in range(6):
            a = rr.random() * TAU; d = (0.1 + rr.random() * 0.1) * sc_; c = loc + Vector((math.cos(a) * d, math.sin(a) * d, (0.55 + rr.random() * 0.15) * sc_))
            for q in range(5):
                b = TAU * q / 5
                bmesh.ops.create_uvsphere(fb, u_segments=6, v_segments=4, radius=0.022 * sc_, matrix=Matrix.Translation(c + Vector((math.cos(b) * 0.025 * sc_, math.sin(b) * 0.025 * sc_, 0))) @ Matrix.Rotation(b, 4, 'Z') @ Matrix.Diagonal((1.6, 1.0, 0.45, 1)))
        bm_obj(name + 'Flowers', fb, mat('Petal', '#f8f0e8', 0.6))

def trunk(name, loc, w, h, d, rz, m, trim):
    objs = [box(name, (w, d, h * 0.8), (0, 0, h * 0.4), m, 0.02)]
    lid = cyl(name + 'Lid', d / 2, w, (0, 0, h * 0.8), m, 24, rot=(0, math.pi / 2, 0)); lid.scale = (0.45, 1, 1); objs.append(lid)
    for t in (-0.35, 0.35): objs.append(box(f'{name}Band{t}', (0.05, d + 0.02, h * 0.82), (t * w, 0, h * 0.41), iron, 0.006))
    for (a, b) in [(-1, -1), (1, -1), (-1, 1), (1, 1)]: objs.append(box(f'{name}Corner{a}{b}', (0.07, 0.07, 0.07), (a * (w / 2 - 0.02), b * (d / 2 - 0.02), 0.04), trim, 0.008))
    objs.append(box(name + 'Lock', (0.07, 0.02, 0.09), (0, -d / 2 - 0.01, h * 0.68), trim, 0.006))
    return grp(name + 'Grp', objs, loc, rz)

# ---------------------------------------------------------------- wall 5 (left back): trunk with the moon lamp under the sun hanging
tw = wood_mat('TrunkWood', '#8a5230', '#4a2810')
J = 5; rz5 = facing(J)
trunk('TrunkL', tuple(onwall(J, 0.3)), 1.0, 0.55, 0.5, rz5, tw, brass)
run2 = imgmat('RunnerSmall', 'runner.png', 0.95)
uvplane('TrunkRunner', 0.42, 0.62, tuple(onwall(J, 0.3, 0.556)), run2, rot=(-math.pi / 2, 0, rz5))
uvplane('TrunkRunnerFold', 0.42, 0.24, tuple(onwall(J, 0.555, 0.43)), run2, rot=(0, 0, rz5))
ml = onwall(J, 0.3, 0.555, -0.32)
lathe('MoonLampStand', [(0.0, 0), (0.1, 0), (0.095, 0.03), (0.045, 0.07), (0.055, 0.1), (0.0, 0.1)], ml, brass)
sphere('MoonLamp', 0.16, ml + Vector((0, 0, 0.26)), imgmat('MoonFaceM', 'moonFace.png', 0.6, emit=3.0), segs=40, rings=24)
point_light('MoonLampLight', ml - nrm(J) * 0.25 + Vector((0, 0, 0.3)), 18, (1.0, 0.84, 0.6), 0.12)
for k, (dx, dy, h) in enumerate([(0, 0, 0.13), (0.04, 0.03, 0.09), (-0.03, 0.04, 0.08)]):
    p = onwall(J, 0.33, 0.555, 0.12) + Vector((dx, dy, 0)); cyl(f'AmyL{k}', 0.03, h, (p.x, p.y, 0.555 + h / 2), amy, 6, r2=0.0)
lantern('LanternTrunk', tuple(onwall(J, 0.3, 0.555, 0.38)), 0.55, 0, 5)

# ---------------------------------------------------------------- wall 6 (left): plant, book pile with a lantern, flowers, small chest
J = 6
plant('PlantL', tuple(onwall(J, 0.34, 0, -0.52)), 0.75, '#d88a90')
bp_ = onwall(J, 0.3, 0, 0.06)
for i, c in enumerate(BOOKC[:3]):
    box(f'BookPileL{i}', (0.32 - i * 0.03, 0.24 - i * 0.015, 0.06), (bp_.x, bp_.y, 0.03 + i * 0.062), mat('Book' + c, c, 0.7), 0.006, rot=(0, 0, facing(J) + 0.3 + (0.15 if i % 2 else -0.1)))
lantern('LanternBooks', (bp_.x, bp_.y, 0.186), 0.75, 0, 8)
plant('PlantFlowers', tuple(onwall(J, 0.62, 0, -0.12)), 0.45, '#c87a5a', 8, True)
trunk('ChestSmall', tuple(onwall(J, 0.24, 0, 0.6)), 0.5, 0.3, 0.36, facing(J), woodD, brass)
lantern('LanternChest', tuple(onwall(J, 0.24, 0.3, 0.6)), 0.7, 0, 8)

# wall 6, above the floor things: a little shelf of potions and curios, a garland of moon phases, a dreamcatcher.
# Modelled against a wall at local +y (local +x is to your right as you face it), then turned to face the room.
dc = []
shelfW = 0.78
for z in (1.08, 1.42):
    dc.append(box(f'Shelf6Board{z}', (shelfW, 0.18, 0.03), (0, -0.1, z), wood, 0.006))
    for x in (-0.3, 0.3): dc.append(box(f'Shelf6Bracket{z}{x}', (0.03, 0.12, 0.1), (x, -0.07, z - 0.06), woodD, 0.004))
zl, zu = 1.095, 1.435
for i, (x, c) in enumerate([(-0.29, '#6ab0a0'), (-0.2, '#c87a9a'), (-0.11, '#8a7ad8')]):
    dc.append(lathe(f'Shelf6Bottle{i}', [(0.0, 0), (0.032, 0), (0.036, 0.05), (0.032, 0.08), (0.013, 0.105), (0.012, 0.14), (0.0, 0.14)], (x, -0.1, zl), mat('BottleGlass', '#d8e8f0', 0.05, trans=0.9)))
    dc.append(lathe(f'Shelf6Potion{i}', [(0.0, 0.004), (0.029, 0.004), (0.032, 0.05), (0.029, 0.064), (0.0, 0.064)], (x, -0.1, zl), mat('Potion' + c, c, 0.2, emit=c, emit_str=1.5)))
    dc.append(cyl(f'Shelf6Cork{i}', 0.013, 0.025, (x, -0.1, zl + 0.15), mat('Cork', '#b08a5a', 0.8), 10))
for k, (dx, dy, h, tl) in enumerate([(0, 0, 0.11, 0), (0.03, 0.015, 0.08, 0.35), (-0.03, 0.01, 0.07, -0.4), (0.012, -0.03, 0.06, 0.25)]):
    dc.append(cyl(f'Shelf6Amy{k}', 0.02, h, (0.08 + dx, -0.1 + dy, zl + h / 2), amy, 6, r2=0.0, rot=(tl, tl * 0.5, 0)))
dc.append(cyl('Shelf6CandleDish', 0.04, 0.012, (0.25, -0.1, zl + 0.006), brass, 20, r2=0.034))
dc.append(cyl('Shelf6Candle', 0.018, 0.09, (0.25, -0.1, zl + 0.057), wax, 16))
dc.append(sphere('Shelf6Flame', 0.009, (0.25, -0.1, zl + 0.115), flameM, scale=(1, 1, 2.2)))
for i, c in enumerate(BOOKC[3:5]):
    dc.append(box(f'Shelf6Book{i}', (0.2 - i * 0.02, 0.13, 0.035), (-0.21, -0.1, zu + 0.018 + i * 0.036), mat('Book' + c, c, 0.7), 0.004, rot=(0, 0, 0.12 - i * 0.2)))
dc.append(lathe('Shelf6Hourglass', [(0.0, 0), (0.045, 0), (0.045, 0.012), (0.03, 0.02), (0.035, 0.05), (0.008, 0.075), (0.035, 0.1), (0.03, 0.13), (0.045, 0.138), (0.045, 0.15), (0.0, 0.15)], (0.01, -0.1, zu), mat('HourglassGlass', '#f0e6d0', 0.1, trans=0.6)))
dc.append(cyl('Shelf6HourglassSand', 0.022, 0.03, (0.01, -0.1, zu + 0.03), mat('Sand', '#e2c27a', 0.8), 12, r2=0.008))
dc.append(cyl('Shelf6GlobeFoot', 0.035, 0.015, (0.22, -0.1, zu + 0.008), brass, 16))
dc.append(cyl('Shelf6GlobeStem', 0.006, 0.05, (0.22, -0.1, zu + 0.04), brass, 8))
dc.append(sphere('Shelf6Globe', 0.06, (0.22, -0.1, zu + 0.12), mat('GlobeBlue', '#3a5a8a', 0.45), segs=24, rings=16))
gr_ = tube('Shelf6GlobeRing', [(0.22 + math.cos(t) * 0.07, -0.1, zu + 0.12 + math.sin(t) * 0.07) for t in [TAU * i / 24 for i in range(25)]], 0.004, brass, poly=True); dc.append(gr_)
# a garland of moon phases, waxing to full and back, on a thread that dips across the wall
moonGlow = mat('MoonGarland', '#ffe6a8', 0.35, 0.4, emit='#ffcf70', emit_str=1.6)
gpts = [Vector((x, -0.06, 1.93 - 0.11 * (1 - (x / 0.46) ** 2))) for x in [(-0.46 + 0.92 * i / 20) for i in range(21)]]
dc.append(tube('MoonGarlandThread', [tuple(q) for q in gpts], 0.003, thread))
for i, (x, kind) in enumerate([(-0.36, 0.62), (-0.18, 0.42), (0.0, 0.0), (0.18, 0.42), (0.36, 0.62)]):
    top = Vector((x, -0.06, 1.93 - 0.11 * (1 - (x / 0.46) ** 2)))
    dc.append(cyl(f'MoonGarlandDrop{i}', 0.0015, 0.06, tuple(top + Vector((0, 0, -0.03))), thread, 4))
    if kind == 0.0: m_ = cyl(f'MoonGarlandFull{i}', 0.052, 0.012, tuple(top + Vector((0, 0, -0.11))), moonGlow, 24, rot=(math.pi / 2, 0, 0))
    else:
        m_ = crescent(f'MoonGarlandMoon{i}', 0.05, moonGlow, off=kind, k=0.82, depth=0.012)
        m_.location = top + Vector((0, -0.006, -0.11)); m_.rotation_euler = (0, 0, 0) if x < 0 else (0, 0, math.pi)
    dc.append(m_)
# a dreamcatcher: a gold hoop, a star woven inside, beads and three lilac feathers
cx_, cz_ = 0.5, 1.52; R_ = 0.13
dc.append(tube('Dream6Hoop', [(cx_ + math.cos(t) * R_, -0.05, cz_ + math.sin(t) * R_) for t in [TAU * i / 32 for i in range(33)]], 0.008, gold, poly=True))
web = [(cx_ + math.cos(math.pi / 2 + i * 4 * math.pi / 5) * R_ * 0.96, -0.05, cz_ + math.sin(math.pi / 2 + i * 4 * math.pi / 5) * R_ * 0.96) for i in range(6)]
dc.append(tube('Dream6Web', web, 0.0018, mat('WebThread', '#f2e6d0', 0.7), poly=True))
dc.append(sphere('Dream6Bead', 0.012, (cx_, -0.05, cz_), mat('BeadLilac', '#b48ad8', 0.3), segs=12, rings=8))
dc.append(cyl('Dream6Hang', 0.0015, 0.12, (cx_, -0.04, cz_ + R_ + 0.06), thread, 4))
fb_ = bmesh.new(); feather = mat('Feather', '#e8d8f4', 0.7, sheen=0.6)
for i, dx in enumerate((-0.08, 0.0, 0.08)):
    top = Vector((cx_ + dx, -0.05, cz_ - R_ * (0.85 if dx else 1.0)))
    ln = 0.1 + (0.04 if dx == 0 else 0)
    dc.append(cyl(f'Dream6String{i}', 0.0015, ln, tuple(top + Vector((0, 0, -ln / 2))), thread, 4))
    dc.append(sphere(f'Dream6StringBead{i}', 0.01, tuple(top + Vector((0, 0, -ln * 0.45))), gold, segs=10, rings=6))
    leaf_into(fb_, Matrix.Translation(top + Vector((0, -0.005, -ln))) @ Matrix.Rotation(math.pi, 4, 'X') @ Matrix.Rotation(math.pi / 2, 4, 'X'), 0.13, 0.032, curl=0.12)
dc.append(bm_obj('Dream6Feathers', fb_, feather))
grp('Wall6Decor', dc, tuple(onwall(6, 0.0)), facing(6))
bpy.context.view_layer.update()
point_light('Shelf6CandleLight', bpy.data.objects['Shelf6Flame'].matrix_world.translation - nrm(6) * 0.06 + Vector((0, 0, 0.04)), 4, (1.0, 0.68, 0.38), 0.03)

# ---------------------------------------------------------------- wall 4 (back): arched bookcase

BW, BD, objs = 0.96, 0.42, []
for d in (-1, 1): objs.append(box(f'BCSide{d}', (0.06, BD, 1.75), (d * (BW / 2 - 0.03), 0, 0.875), wood, 0.012))
segs = 32
outer = [(math.cos(math.pi * i / segs) * BW / 2, math.sin(math.pi * i / segs) * BW / 2) for i in range(segs + 1)]
inner = [(math.cos(math.pi * i / segs) * (BW / 2 - 0.07), math.sin(math.pi * i / segs) * (BW / 2 - 0.07)) for i in range(segs + 1)]
ab = bmesh.new(); vo = [ab.verts.new((x, -BD / 2, z)) for x, z in outer]; vi = [ab.verts.new((x, -BD / 2, z)) for x, z in inner]
for i in range(segs): ab.faces.new((vo[i], vo[i + 1], vi[i + 1], vi[i]))
ex = bmesh.ops.extrude_face_region(ab, geom=list(ab.faces))
for v in [e for e in ex['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.y += BD
bmesh.ops.recalc_face_normals(ab, faces=ab.faces)
a_ = bm_obj('BCArch', ab, wood, smooth=False); a_.location = (0, 0, 1.75); objs.append(a_)
bk = bmesh.new(); pts = [(-BW / 2 + 0.05, 0), (BW / 2 - 0.05, 0), (BW / 2 - 0.05, 1.75)] + [(math.cos(math.pi * i / segs) * (BW / 2 - 0.05), 1.75 + math.sin(math.pi * i / segs) * (BW / 2 - 0.05)) for i in range(1, segs)] + [(-BW / 2 + 0.05, 1.75)]
bk.faces.new([bk.verts.new((x, BD / 2 - 0.01, z)) for x, z in pts]); objs.append(bm_obj('BCBack', bk, woodD, smooth=False))
objs.append(box('BCPlinth', (BW, BD + 0.02, 0.08), (0, 0, 0.04), wood, 0.015))
objs.append(box('BCCabinet', (BW - 0.08, BD - 0.02, 0.66), (0, 0.005, 0.42), woodD, 0.01))
for d in (-1, 1):
    objs.append(box(f'BCDoor{d}', (BW / 2 - 0.08, 0.02, 0.58), (d * (BW / 4 - 0.01), -BD / 2, 0.42), wood, 0.008))
    objs.append(sphere(f'BCKnob{d}', 0.018, (d * 0.06, -BD / 2 - 0.02, 0.45), brass, segs=12, rings=8))
for i, z in enumerate([0.76, 1.16, 1.55]): objs.append(box(f'BCShelf{i}', (BW - 0.1, BD - 0.04, 0.035), (0, 0, z), wood, 0.006))
def books(x0, x1, z, seed):
    r = random.Random(seed); x = x0
    while x < x1:
        w = 0.03 + r.random() * 0.025; h = 0.2 + r.random() * 0.1; lean = 0.2 if r.random() < 0.15 else 0; c = BOOKC[int(r.random() * len(BOOKC))]
        objs.append(box(f'Book{seed}_{x:.3f}', (w, 0.2, h), (x + w / 2 + lean * h * 0.5, 0.02, z + h / 2), mat('Book' + c, c, 0.7), 0.004, rot=(0, lean, 0)))
        x += w + 0.004 + lean * h * 0.5
books(-0.4, 0.05, 0.778, 1); books(0.08, 0.4, 1.178, 2)
porc = mat('Porcelain', '#eee6dc', 0.25)
objs.append(lathe('Teapot', [(0.0, 0), (0.07, 0), (0.09, 0.05), (0.08, 0.12), (0.04, 0.16), (0.05, 0.18), (0.0, 0.18)], (0.25, 0.0, 0.778), porc))
objs.append(tube('TeapotSpout', [(0.33, 0, 0.83), (0.38, 0, 0.87), (0.4, 0, 0.92)], 0.012, porc))
for i, (x, c) in enumerate([(-0.3, '#6ab0a0'), (-0.18, '#c87a9a'), (-0.06, '#d8b060')]):
    objs.append(lathe(f'Bottle{i}', [(0.0, 0), (0.04, 0), (0.045, 0.06), (0.04, 0.1), (0.016, 0.13), (0.015, 0.17), (0.0, 0.17)], (x, 0, 1.178), mat('BottleGlass', '#d8e8f0', 0.05, trans=0.9)))
    objs.append(lathe(f'Potion{i}', [(0.0, 0.004), (0.036, 0.004), (0.04, 0.06), (0.036, 0.08), (0.0, 0.08)], (x, 0, 1.178), mat('Potion' + c, c, 0.2, emit=c, emit_str=1.5)))
pp = Vector((0, 0, 1.57))
objs.append(lathe('BCPot', [(0.0, 0), (0.07, 0), (0.085, 0.1), (0.09, 0.12), (0.0, 0.11)], pp, mat('Terracotta', '#c87a5a', 0.6)))
lb = bmesh.new()
for k in range(9): a = TAU * k / 9; leaf_into(lb, Matrix.Translation(pp + Vector((math.cos(a) * 0.04, math.sin(a) * 0.04, 0.12))) @ Matrix.Rotation(a - math.pi / 2, 4, 'Z') @ Matrix.Rotation(-0.7, 4, 'X'), 0.12, 0.04)
objs.append(bm_obj('BCPotLeaves', lb, leafM))
cr = crescent('BCCrescent', 0.16, mat('CrescentGlow', '#ffe2a0', 0.4, emit='#ffc860', emit_str=10.0), depth=0.03); cr.location = (0.02, 0, 1.95); cr.rotation_euler = (0, 0.2, 0); objs.append(cr)
ib = bmesh.new(); ri = random.Random(11)
for k_, pts in enumerate([[(-0.5, -0.24, 2.15), (-0.53, -0.25, 1.6), (-0.49, -0.24, 1.0), (-0.5, -0.23, 0.5)], [(0.1, -0.24, 2.24), (0.4, -0.24, 2.0), (0.5, -0.25, 1.6), (0.52, -0.24, 1.25)]]):
    objs.append(tube(f'IvyVine{k_}', pts, 0.006, mat('Vine', '#3a4a2a', 0.7)))
    for k in range(36):
        t = k / 35; seg = min(int(t * 3), 2); u = t * 3 - seg; c = Vector(pts[seg]).lerp(Vector(pts[seg + 1]), u) + Vector((ri.uniform(-0.04, 0.04), ri.uniform(-0.03, 0.0), ri.uniform(-0.03, 0.03)))
        leaf_into(ib, Matrix.Translation(c) @ Matrix.Rotation(ri.uniform(0, TAU), 4, 'Y') @ Matrix.Rotation(ri.uniform(-1.6, -1.2), 4, 'X'), 0.07, 0.035)
objs.append(bm_obj('Ivy', ib, leaf2))
grp('Bookcase', objs, tuple(onwall(4, BD / 2 + 0.03)), facing(4))
bpy.context.view_layer.update()
point_light('CrescentLight', bpy.data.objects['BCCrescent'].matrix_world.translation - nrm(4) * 0.12, 12, (1.0, 0.82, 0.5), 0.1)

# ---------------------------------------------------------------- wall 3 (right back): sideboard with the cat, herbs drying above

sbo = []
sbo.append(box('SBBody', (1.5, 0.44, 0.66), (0, 0, 0.36), wood, 0.02)); sbo.append(box('SBTop', (1.58, 0.48, 0.05), (0, 0, 0.715), woodD, 0.012)); sbo.append(box('SBPlinth', (1.46, 0.42, 0.06), (0, 0, 0.03), woodD, 0.01))
for x in (-0.5, 0, 0.5):
    sbo.append(box(f'SBDoorFrame{x}', (0.44, 0.02, 0.52), (x, -0.225, 0.38), woodD, 0.006)); sbo.append(box(f'SBDoor{x}', (0.36, 0.02, 0.44), (x, -0.235, 0.38), wood, 0.006)); sbo.append(sphere(f'SBKnob{x}', 0.016, (x + 0.15, -0.25, 0.4), brass, segs=12, rings=8))
blk = mat('CatBlack', '#1c1820', 0.3, coat=0.6); cz, cx = 0.74, -0.5
sbo.append(sphere('CatBody', 0.1, (cx, 0, cz + 0.11), blk, scale=(0.9, 0.85, 1.2))); sbo.append(sphere('CatHead', 0.068, (cx, -0.03, cz + 0.27), blk))
for d in (-1, 1):
    sbo.append(cyl(f'CatEar{d}', 0.028, 0.06, (cx + d * 0.04, -0.02, cz + 0.33), blk, 4, r2=0.0, rot=(0, d * 0.3, 0)))
    sbo.append(sphere(f'CatEye{d}', 0.011, (cx + d * 0.026, -0.09, cz + 0.28), mat('CatEye', '#f2c84a', 0.3, emit='#c89020', emit_str=1.5), segs=10, rings=6))
    sbo.append(sphere(f'CatPaw{d}', 0.034, (cx + d * 0.04, -0.07, cz + 0.02), blk, scale=(1, 1.3, 0.6), segs=12, rings=8))
sbo.append(tube('CatTail', [(cx + 0.05, 0.06, cz + 0.03), (cx + 0.14, 0, cz + 0.03), (cx + 0.13, -0.08, cz + 0.04), (cx + 0.06, -0.11, cz + 0.03)], 0.016, blk))
vx = 0.1
sbo.append(lathe('Vase', [(0.0, 0), (0.07, 0), (0.1, 0.06), (0.09, 0.14), (0.05, 0.19), (0.06, 0.21), (0.0, 0.2)], (vx, 0, 0.74), mat('Slate', '#4a4e5a', 0.35)))
rl = random.Random(9); lb2, pb = bmesh.new(), bmesh.new()
for k in range(7):
    a = TAU * k / 7 + rl.random(); tip = Vector((vx + math.cos(a) * 0.12, math.sin(a) * 0.1, 0.74 + 0.42 + rl.random() * 0.08))
    sbo.append(tube(f'LilyStem{k}', [(vx, 0, 0.92), (vx + math.cos(a) * 0.04, math.sin(a) * 0.04, 1.04), tuple(tip)], 0.004, leafM))
    for q in range(6):
        b = TAU * q / 6
        bmesh.ops.create_uvsphere(pb, u_segments=8, v_segments=5, radius=0.03, matrix=Matrix.Translation(tip) @ Matrix.Rotation(b, 4, 'Z') @ Matrix.Rotation(0.9, 4, 'X') @ Matrix.Translation((0, 0, 0.035)) @ Matrix.Diagonal((0.45, 0.2, 1.6, 1)))
    leaf_into(lb2, Matrix.Translation(Vector((vx + math.cos(a) * 0.05, math.sin(a) * 0.05, 1.0))) @ Matrix.Rotation(a - math.pi / 2, 4, 'Z') @ Matrix.Rotation(-0.5, 4, 'X'), 0.12, 0.03)
sbo.append(bm_obj('LilyPetals', pb, mat('Lily', '#faf4ec', 0.5))); sbo.append(bm_obj('LilyLeaves', lb2, leaf2))
sbo.append(lathe('PinkJar', [(0.0, 0), (0.05, 0), (0.06, 0.04), (0.04, 0.08), (0.0, 0.08)], (0.32, 0.03, 0.74), mat('PinkGlaze', '#d88aa0', 0.4)))
sbo += lantern('LanternSB', (0.6, 0.0, 0.74), 0.6, 0, 0)
g_ = grp('Sideboard', sbo, tuple(onwall(3, 0.2 + 0.03)), facing(3)); g_.scale = (0.9, 0.9, 0.9)
for o in [o for o in sc.objects if o.name == 'LanternSBLight']: bpy.data.objects.remove(o, do_unlink=True)
bpy.context.view_layer.update()
point_light('LanternSBLight2', bpy.data.objects['LanternSBGlass'].matrix_world.translation + Vector((0, 0, 0.02)), 7, (1.0, 0.66, 0.36), 0.04)
# herbs, modelled against a wall at local +y and turned to face the room
hb = []
hb.append(cyl('HerbRod', 0.022, 1.2, (0, -0.1, 1.86), woodD, 12, rot=(0, math.pi / 2, 0)))
for x in (-0.62, 0.62): hb.append(box(f'HerbPeg{x}', (0.05, 0.12, 0.1), (x, -0.06, 1.86), woodD, 0.01))
twine = mat('Twine', '#c8a878', 0.8)
for i, (bud, stem) in enumerate([('#5a8a4a', '#7aa860'), ('#8a6ac8', '#6a8a4a'), ('#e8e0c8', '#8a9a6a'), ('#6a9a58', '#5a7a48'), ('#9a7ad8', '#6a8a4a')]):
    x = -0.5 + i * 0.25; top = Vector((x, -0.12, 1.83)); r = random.Random(50 + i); sb, bb = bmesh.new(), bmesh.new()
    hb.append(cyl(f'HerbTie{i}', 0.022, 0.03, top + Vector((0, 0, -0.1)), twine, 12))
    for k in range(12):
        a = TAU * k / 12; spr = 0.03 + r.random() * 0.05; tip = top + Vector((math.cos(a) * spr, math.sin(a) * spr * 0.6, -0.38 - r.random() * 0.1)); s0 = top + Vector((0, 0, -0.1)); d = tip - s0
        bmesh.ops.create_cone(sb, cap_ends=False, segments=4, radius1=0.003, radius2=0.003, depth=d.length, matrix=Matrix.Translation((s0 + tip) / 2) @ d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4())
        for j in range(5):
            c = s0.lerp(tip, 0.6 + j * 0.09)
            bmesh.ops.create_icosphere(bb, subdivisions=1, radius=0.012, matrix=Matrix.Translation(c + Vector((r.uniform(-0.01, 0.01), r.uniform(-0.01, 0.01), 0))) @ Matrix.Diagonal((1, 1, 1.6, 1)))
    hb.append(bm_obj(f'HerbStems{i}', sb, mat('Stem' + stem, stem, 0.7))); hb.append(bm_obj(f'HerbBuds{i}', bb, mat('Bud' + bud, bud, 0.7)))
grp('Herbs', hb, tuple(onwall(3, 0.0)), facing(3))

# ---------------------------------------------------------------- wall 2 (right): trunk with books under the moon hanging, a big plant by the curtain
J = 2
trunk('TrunkR', tuple(onwall(J, 0.28, 0, 0.12)), 0.82, 0.52, 0.48, facing(J), tw, iron)
bq = onwall(J, 0.3, 0, 0.06)
for i, c in enumerate(BOOKC[:4]):
    box(f'BookPileR{i}', (0.3 - i * 0.025, 0.22 - i * 0.015, 0.06), (bq.x, bq.y, 0.52 + 0.03 + i * 0.062), mat('Book' + c, c, 0.7), 0.006, rot=(0, 0, facing(J) + 0.2 + (0.15 if i % 2 else -0.1)))
plant('PlantR', tuple(onwall(J, 0.36, 0, -0.6)), 0.82, '#e8e0ec')

# ---------------------------------------------------------------- lanterns: a big one under the cupola, small ones on the back posts
lantern('LanternHang', (0.0, 0.0, 2.02), 1.15, ZC - 2.02 - 0.48, 42)
for k in (3, 4, 5, 6):
    p = corner(k, RW - 0.17, 1.6)
    lantern(f'LanternPost{k}', tuple(p), 0.6, 0.32, 7)
    tube(f'LanternHook{k}', [tuple(corner(k, RW - 0.03, 2.18)), tuple(corner(k, RW - 0.17, 2.18))], 0.008, brass)
roof_z = lambda r: ZE + (ZC - ZE) * (RR - r) / (RR - RC) - 0.08
for i, (deg, r, z) in enumerate([(100, 1.55, 2.25), (150, 1.6, 2.4), (200, 1.45, 2.3), (60, 1.7, 2.2), (128, 0.95, 2.6), (175, 1.0, 2.55)]):
    a = math.radians(deg); x, y = math.cos(a) * r, math.sin(a) * r
    s_ = star_shape(f'HangStar{i}', 0.085, 0.036, 5, 0.02, gold); s_.location = (x, y, z); s_.rotation_euler = (0, 0, math.pi / 4 + i)
    top = roof_z(r); cyl(f'StarThread{i}', 0.0015, top - z, (x, y, (top + z) / 2 + 0.05), thread, 4)

# ---------------------------------------------------------------- bunting with bulbs and pennants out to two star poles (from the pop-up book)
penn = [mat('PennantA', '#6a3a88', 0.7, sheen=0.5), mat('PennantB', '#e6bf6a', 0.4, 0.6), mat('PennantC', '#c9a6e0', 0.7, sheen=0.5)]
for side_, k in (('L', 7), ('R', 2)):
    p = corner(k, RP + 0.22); ptop = 2.95
    cyl(f'Pole{side_}', 0.035, ptop + 0.36, (p.x, p.y, (ptop - 0.36) / 2), woodD, 12, r2=0.028)
    sphere(f'PoleBall{side_}', 0.05, (p.x, p.y, ptop + 0.03), gold)
    st_ = star_shape(f'PoleStar{side_}', 0.16, 0.065, 5, 0.03, gold); st_.location = (p.x, p.y, ptop + 0.24); st_.rotation_euler = (0, 0, math.pi / 4)
    a_ = corner(k, 0.55, ZS + 0.02); b_ = Vector((p.x, p.y, ptop - 0.04))
    pts = [a_.lerp(b_, t) - Vector((0, 0, 0.32 * 4 * t * (1 - t))) for t in [i / 24 for i in range(25)]]
    tube(f'Bunting{side_}', [tuple(q) for q in pts], 0.006, thread)
    pv, pf, pm = [], [], []
    for i in range(1, 24):
        q = pts[i]
        if i % 2: sphere(f'Bulb{side_}{i}', 0.024, tuple(q - Vector((0, 0, 0.032))), glowWarm, segs=10, rings=8)
        else:
            d = (pts[i + 1] - pts[i - 1]).normalized()
            mesh_obj(f'Pennant{side_}{i}', [tuple(q - d * 0.055), tuple(q + d * 0.055), tuple(q - Vector((0, 0, 0.15)))], [(0, 1, 2)], penn[(i // 2) % 3], smooth=False)

# ---------------------------------------------------------------- a warm glow under the canopy, like light bouncing round the cloth
gl_ = bpy.data.lights.new('CanopyGlow', 'AREA'); gl_.energy = 110; gl_.size = 2.6; gl_.color = (1.0, 0.64, 0.36)
go = link(bpy.data.objects.new('CanopyGlow', gl_)); go.location = (T0.x, T0.y, 3.0)
go.visible_camera = False; go.visible_glossy = False

# ---------------------------------------------------------------- camera, world, lights, render settings
tgt = link(bpy.data.objects.new('CamTarget', None)); tgt.location = (0, 0, 1.85)
cd = bpy.data.cameras.new('TentCam'); cd.lens = 44; cd.clip_end = 200
cam = link(bpy.data.objects.new('TentCam', cd))
def place_cam(yaw_deg, pitch=0.48, dist=15.5):
    a = math.radians(yaw_deg); d = Vector((math.cos(a), math.sin(a), 0))
    cam.location = tgt.location + Vector((d.x * math.cos(pitch) * dist, d.y * math.cos(pitch) * dist, math.sin(pitch) * dist))
tc = cam.constraints.new('TRACK_TO'); tc.target = tgt; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
place_cam(-45); sc.camera = cam
w = bpy.data.worlds.new('TentWorld'); w.use_nodes = True; sc.world = w
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = col('#14122a'); bg.inputs['Strength'].default_value = 0.45
sd = bpy.data.lights.new('Key', 'SUN'); sd.energy = 1.0; sd.color = (0.72, 0.78, 1.0)   # cool moonlight from behind; sd.angle = math.radians(8)
sun = link(bpy.data.objects.new('Key', sd)); sun.rotation_euler = (math.radians(50), 0, math.radians(-135))
ld = bpy.data.lights.new('Fill', 'AREA'); ld.energy = 220; ld.size = 6; ld.color = (0.85, 0.82, 1.0)
fo = link(bpy.data.objects.new('Fill', ld)); fo.location = (8, -8, 6)
c = fo.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'

try: sc.render.engine = 'CYCLES'
except TypeError as e: print('engines', e)
# Metal kernel compilation hangs on this Mac (MTLCompilerService never answers), so CPU unless asked
if '--gpu' in ARGS:
  try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
  except Exception as e: print('gpu fallback', e)
else: sc.cycles.device = 'CPU'
sc.cycles.samples = 160; sc.cycles.use_denoising = True; sc.cycles.max_bounces = 8
try: sc.view_settings.view_transform = 'AgX'
except Exception as e: print('view', e)
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception as e: print('look', e)
sc.render.image_settings.file_format = 'PNG'

# a soft glow round the lights, done in the compositor (Blender 5 node-group API)
try:
    ng = bpy.data.node_groups.new('TentComp', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl_ = ng.nodes.new('CompositorNodeRLayers'); out_ = ng.nodes.new('NodeGroupOutput'); gl = ng.nodes.new('CompositorNodeGlare')
    for k, v in [('glare_type', 'FOG_GLOW'), ('quality', 'HIGH')]:
        try: setattr(gl, k, v)
        except Exception: pass
    for k, v in [('Type', 'Fog Glow'), ('Quality', 'High'), ('Threshold', 1.0), ('Strength', 0.6), ('Size', 0.6)]:
        if k in gl.inputs:
            try: gl.inputs[k].default_value = v
            except Exception as e: print('glare input', k, e)
    ng.links.new(rl_.outputs['Image'], gl.inputs['Image']); ng.links.new(gl.outputs['Image'], out_.inputs[0])
    sc.compositing_node_group = ng
    print('glare inputs', [i.name for i in gl.inputs])
except Exception as e: print('compositor skipped:', e)

blend = os.path.join(HERE, 'oracle_tent.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend)
print('BUILT', len(sc.objects), 'objects ->', blend)

if '--preview' in ARGS or '--render' in ARGS:
    big = '--render' in ARGS
    sc.render.resolution_x, sc.render.resolution_y = (2000, 1250) if big else (1200, 750)
    sc.cycles.samples = 160 if big else 64
    WIDE = (0, 0, 1.85)
    shots = [('front', -45, 0.48, 15.5, 44, WIDE), ('left', -63, 0.44, 15.5, 44, WIDE), ('right', -27, 0.44, 15.5, 44, WIDE),
             ('table', -45, 0.42, 4.2, 55, (T0.x, T0.y, 0.72))] if big else [('front', -45, 0.48, 15.5, 44, WIDE)]
    if '--only' in ARGS: shots = [s_ for s_ in shots if s_[0] in ARGS[ARGS.index('--only') + 1].split(',')]
    for name, yaw, pitch, dist, lens, at in shots:
        tgt.location = at; cd.lens = lens; place_cam(yaw, pitch, dist); sc.render.filepath = OUT + f'tent_{name}{"" if big else "_preview"}.png'
        t0 = time.time(); bpy.ops.render.render(write_still=True); print('RENDERED', name, round(time.time() - t0, 1), 's', flush=True)
    tgt.location = (0, 0, 1.85); cd.lens = 44; place_cam(-45)
