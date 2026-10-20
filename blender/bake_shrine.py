# Bakes the Cycles lighting of oracle_shrine.blend into two texture atlases and exports a GLB for the real-time viewer.
# The same steps as bake_tent.py; what differs is which markers the page needs and which parts count as architecture.
# Run headless:  Blender -b --factory-startup oracle_shrine.blend --python bake_shrine.py -- [--size 4096] [--samples 48]
import bpy, bmesh, math, os, sys, time, json
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'realtime_shrine') + '/'
os.makedirs(OUT, exist_ok=True)
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(k, d):
    return type(d)(ARGS[ARGS.index(k) + 1]) if k in ARGS else d
SIZE, SAMPLES = arg('--size', 4096), arg('--samples', 48)
sc = bpy.context.scene
sc.cycles.max_bounces = 6
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)

sc.render.engine = 'CYCLES'
# Metal kernel compilation hangs on this Mac (MTLCompilerService never answers), so CPU unless asked
if '--gpu' in ARGS:
  try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'; log('devices', [d.name for d in prefs.devices if d.use])
  except Exception as e: log('gpu fallback', e)
else: sc.cycles.device = 'CPU'

# ---------------------------------------------------------------- markers for the viewer's live effects
def marker(name, loc):
    e = bpy.data.objects.new(name, None); sc.collection.objects.link(e); e.location = loc; return e
W = lambda n: bpy.data.objects[n].matrix_world.translation.copy()
for o in list(sc.objects):
    n = o.name
    if n.endswith('Flame') and o.type == 'MESH': marker('FX_candle_' + n[:-5], o.matrix_world.translation.copy())
    elif o.type == 'LIGHT' and n.startswith(('Palace', 'PorchLantern', 'StoneLantern')): marker('FX_lantern_' + n[:-5], o.matrix_world.translation.copy())
    elif n.startswith('IncenseTip') or (n.startswith('Coil') and n.endswith('Ember')): marker('FX_ember_' + n, o.matrix_world.translation.copy())
marker('FX_pearl', W('Pearl')); marker('FX_moon', W('MoonView')); marker('FX_bei', W('BeiCloth')); marker('FX_incense', W('IncenseTip1'))
for k, cx in enumerate((-0.98, 0.0, 0.98)): marker(f'FX_window_{k}', W(f'ClereWinPaper{cx}'))
# the fortune-stick cup and its sticks are drawn live (they get shaken), so they leave the bake; the slip cabinet's
# drawer front is marked so the page can slide out the right drawer
marker('FX_sticks', W('StickCup')); marker('FX_cabinet', W('SlipDrawers'))
for o in [o for o in sc.objects if o.name.startswith(('StickCup', 'Sticks', 'StickTips'))]: bpy.data.objects.remove(o, do_unlink=True)

# ---------------------------------------------------------------- to plain meshes, modifiers applied
bpy.ops.object.select_all(action='DESELECT')
geo = [o for o in sc.objects if o.type in ('MESH', 'CURVE')]
for o in geo: o.select_set(True)
bpy.context.view_layer.objects.active = geo[0]
bpy.ops.object.convert(target='MESH')
geo = [o for o in sc.objects if o.type == 'MESH']
log('meshes', len(geo))

# drop faces nobody can see: the undersides of the podium, steps, paving and floor tiles
def cull(o, test):
    bm = bmesh.new(); bm.from_mesh(o.data); mw = o.matrix_world; m3 = mw.to_3x3()
    dead = [f for f in bm.faces if test((m3 @ f.normal).normalized(), mw @ f.calc_center_median())]
    bmesh.ops.delete(bm, geom=dead, context='FACES'); bm.to_mesh(o.data); bm.free()
for o in geo:
    if o.name.startswith(('Podium', 'Forecourt', 'Step', 'Paving', 'HallFloor', 'MoonStone')): cull(o, lambda n, c: n.z < -0.5)
    if o.name.startswith(('Paving', 'HallFloor')): cull(o, lambda n, c: abs(n.z) < 0.5 and c.z < 0.05)   # tile edges are hidden in the joints

ARCH = ('Podium', 'Forecourt', 'Step', 'Paving', 'HallFloor', 'MoonStone', 'MoonRipple', 'Wall', 'Quoins', 'SideFrieze', 'BackFrieze', 'Bamboo', 'FrontFrieze',
        'Wainscot', 'Col', 'DragonCol', 'Beams', 'BeamFace', 'Bracket', 'Coffers', 'Clere', 'Roof', 'Barge', 'RidgeUp', 'RidgeLow', 'GableBand', 'GableBoss',
        'MoonFrame', 'MoonView', 'MoonReveal', 'Lattice', 'Plaque', 'Couplet', 'Scroll', 'Baxian')
groups = {'arch': [o for o in geo if o.name.startswith(ARCH)], 'props': [o for o in geo if not o.name.startswith(ARCH)]}
log({k: len(v) for k, v in groups.items()})

fallback = bpy.data.materials.new('Fallback'); fallback.use_nodes = True
for o in geo:
    if not o.data.materials: o.data.materials.append(fallback)
    uv = o.data.uv_layers
    if not uv: uv.new(name='UVMap')
    uv[0].name = 'UVMap'
    for l in list(uv)[1:]: uv.remove(l)
    # remember each part's own object-space coordinates so procedural patterns survive the join
    at = o.data.attributes.new('objco', 'FLOAT_VECTOR', 'POINT')
    at.data.foreach_set('vector', [c for v in o.data.vertices for c in v.co])
for m in bpy.data.materials:
    if not m.node_tree: continue
    nt = m.node_tree
    for tc in [n for n in nt.nodes if n.type == 'TEX_COORD']:
        links = [l for l in nt.links if l.from_node == tc and l.from_socket.name == 'Object']
        if not links: continue
        an = nt.nodes.new('ShaderNodeAttribute'); an.attribute_type = 'GEOMETRY'; an.attribute_name = 'objco'
        for l in links: to = l.to_socket; nt.links.remove(l); nt.links.new(an.outputs['Vector'], to)

def select(objs):
    if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

# one mesh per group: a single bake pass instead of one scene sync per object
joined = {}
for gname, objs in groups.items():
    select(objs); bpy.ops.object.join(); o = bpy.context.view_layer.objects.active; o.name = gname.capitalize()
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw; joined[gname] = o
    uv = o.data.uv_layers; uv['UVMap'].active_render = True; b_ = uv.new(name='BakeUV'); uv.active = b_
    log(gname, 'joined', len(o.data.polygons), 'faces', len(o.data.materials), 'materials')

# surfaces people look at closely get more texels: their islands are scaled up before packing
FOCUS = {'MoonSilk': 3.0, 'PlaqueM': 3.0, 'CoupletMshrine_couplet_r': 2.5, 'CoupletMshrine_couplet_l': 2.5, 'FrontalM': 2.5, 'DrawersM': 2.5,
         'BeamPaint': 1.6, 'RidgeBand': 1.2, 'LanternFu': 2.0, 'LanternAn': 2.0, 'LanternSilk': 2.0, 'ClayTile': 1.4, 'Teak': 1.6, 'Bronze': 1.8,
         'BlueWhite': 1.8, 'Orange': 1.6, 'Bamboo': 1.6, 'StickWood': 1.4, 'RedSilk': 1.5, 'Plaster': 1.2, 'PaperMoonlit': 1.3,
         'ScrollM0': 2.0, 'ScrollM1': 2.0, 'ScrollM2': 2.0, 'ScrollM3': 2.0, 'LionStone': 1.4,
         'Baxian': 2.2,
         'Tiles': 0.8, 'TilesDark': 0.7, 'Timber': 0.6, 'Granite': 0.9, 'GranitePave': 0.8}
def unwrap(o):
    select([o]); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.select_all(action='SELECT')
    try: bpy.ops.uv.average_islands_scale()
    except Exception as e: log('average', e)
    bm = bmesh.from_edit_mesh(o.data); uvl = bm.loops.layers.uv['BakeUV']
    gain = {i: FOCUS.get(m.name.split('.')[0], 1.0) for i, m in enumerate(o.data.materials)}
    for f in bm.faces:
        g = gain.get(f.material_index, 1.0)
        if g != 1.0:
            for l in f.loops: l[uvl].uv *= g
    bmesh.update_edit_mesh(o.data)
    bpy.ops.uv.select_all(action='SELECT')
    try: bpy.ops.uv.pack_islands(margin=0.001, rotate=True, scale=True, shape_method='CONCAVE')
    except Exception as e: log('pack', e); bpy.ops.uv.pack_islands(margin=0.001, rotate=True)
    bpy.ops.object.mode_set(mode='OBJECT')

def bake_target(o, img):
    for m in o.data.materials:
        nt = m.node_tree; n = nt.nodes.get('__bake') or nt.nodes.new('ShaderNodeTexImage'); n.name = '__bake'
        n.image = img; nt.nodes.active = n; n.select = True

def bake(o, img, kind, **kw):
    bake_target(o, img); select([o])
    t = time.time(); bpy.ops.object.bake(type=kind, margin=8, margin_type='EXTEND', use_clear=True, target='IMAGE_TEXTURES', **kw)
    log('baked', img.name, kind, round(time.time() - t, 1), 's')

# a scene used only to run the denoiser over a baked image
def denoise(img, alb, path):
    ds = bpy.data.scenes.new('Denoise'); ds.render.resolution_x = ds.render.resolution_y = img.size[0]; ds.render.resolution_percentage = 100
    ds.render.engine = 'BLENDER_WORKBENCH'
    # bake straight to display colours with the render's own view transform, so the web page needs no tone mapping
    ds.view_settings.view_transform = sc.view_settings.view_transform; ds.view_settings.look = sc.view_settings.look
    ds.view_settings.exposure = sc.view_settings.exposure; ds.view_settings.gamma = sc.view_settings.gamma
    cam = bpy.data.objects.new('dcam', bpy.data.cameras.new('dcam')); ds.collection.objects.link(cam); ds.camera = cam
    ng = bpy.data.node_groups.new('DN', 'CompositorNodeTree'); ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    a = ng.nodes.new('CompositorNodeImage'); a.image = img; b = ng.nodes.new('CompositorNodeImage'); b.image = alb
    dn = ng.nodes.new('CompositorNodeDenoise'); o = ng.nodes.new('NodeGroupOutput')
    for k, v in [('Quality', 'High'), ('HDR', True), ('Prefilter', 'Accurate')]:
        if k in dn.inputs:
            try: dn.inputs[k].default_value = v
            except Exception as e: log('dn', k, e)
    ng.links.new(a.outputs['Image'], dn.inputs['Image']); ng.links.new(b.outputs['Image'], dn.inputs['Albedo']); ng.links.new(dn.outputs['Image'], o.inputs[0])
    ds.compositing_node_group = ng; ds.render.use_compositing = True
    ds.render.image_settings.file_format = 'PNG'; ds.render.image_settings.color_depth = '8'; ds.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=ds.name)
    bpy.data.scenes.remove(ds)

sc.render.bake.use_selected_to_active = False
results = {}
for gname, o in joined.items():
    unwrap(o); log('unwrapped', gname)
    alb = bpy.data.images.new(gname + '_albedo', SIZE, SIZE, float_buffer=True)
    sc.cycles.samples = 4
    bake(o, alb, 'DIFFUSE', pass_filter={'COLOR'})
    img = bpy.data.images.new(gname + '_light', SIZE, SIZE, float_buffer=True)
    sc.cycles.samples = SAMPLES
    bake(o, img, 'COMBINED')
    raw = OUT + gname + '_raw.exr'; img.filepath_raw = raw; img.file_format = 'OPEN_EXR'; img.save()
    path = OUT + gname + '.png'
    try: denoise(img, alb, path); log('denoised', path)
    except Exception as e:
        log('denoise failed, saving raw:', e)
        s = bpy.data.scenes.new('Save'); s.view_settings.view_transform = sc.view_settings.view_transform; s.view_settings.look = sc.view_settings.look; s.render.image_settings.file_format = 'PNG'
        img.save_render(path, scene=s); bpy.data.scenes.remove(s)
    results[gname] = path

# ---------------------------------------------------------------- swap in the baked atlases, export
for gname, o in joined.items():
    im = bpy.data.images.load(results[gname]); m = bpy.data.materials.new('Baked_' + gname); m.use_nodes = True
    nt = m.node_tree; p = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); t = nt.nodes.new('ShaderNodeTexImage'); t.image = im
    nt.links.new(t.outputs['Color'], p.inputs['Base Color']); p.inputs['Roughness'].default_value = 1.0
    o.data.materials.clear(); o.data.materials.append(m)
    uv = o.data.uv_layers; uv.remove(uv['UVMap']); uv['BakeUV'].active_render = True
    o.data.attributes.remove(o.data.attributes['objco'])

for o in [o for o in sc.objects if o.type in ('LIGHT', 'CAMERA') or (o.type == 'EMPTY' and not o.name.startswith('FX_'))]:
    for c in o.children: c.parent = None
for o in [o for o in sc.objects if o.type in ('LIGHT', 'CAMERA') or (o.type == 'EMPTY' and not o.name.startswith('FX_'))]:
    bpy.data.objects.remove(o, do_unlink=True)

glb = OUT + 'oracle_shrine.glb'
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', export_normals=False, export_tangents=False, export_materials='EXPORT',
                          export_image_format='JPEG', export_jpeg_quality=90, export_cameras=False, export_lights=False, export_apply=True)
log('exported', glb, round(os.path.getsize(glb) / 1e6, 2), 'MB')
json.dump({'size': SIZE, 'samples': SAMPLES}, open(OUT + 'bake_info.json', 'w'))
