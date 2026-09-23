"""잇룸 로그인 배경: 한반도 상공 궤도에서 본 일출.
사용: blender -b --factory-startup --python scene.py -- [still|anim] [engine] [w] [h] [frames]"""
import bpy, math, sys, os
from mathutils import Vector, Matrix

W = "/private/tmp/claude-501/-Users-nnouss-Desktop-----it-----/19faac81-546b-4034-a212-6d05364edb75/scratchpad/space"
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODE = argv[0] if len(argv) > 0 else "still"
ENGINE = argv[1] if len(argv) > 1 else "CYCLES"
RW = int(argv[2]) if len(argv) > 2 else 1920
RH = int(argv[3]) if len(argv) > 3 else 1080
FRAMES = int(argv[4]) if len(argv) > 4 else 288
OUT = argv[5] if len(argv) > 5 else f"{W}/render"
HIDE = argv[6].split(",") if len(argv) > 6 else []

# ---------- 초기화
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = RW, RH
sc.render.resolution_percentage = 100
sc.render.fps = 24
sc.frame_start, sc.frame_end = 1, FRAMES

def img(name, colorspace="sRGB"):
    im = bpy.data.images.load(f"{W}/{name}")
    im.colorspace_settings.name = colorspace
    return im

# ---------- 기하 설정
R = 1.0
CAM_H = 1.12                      # 지구 반지름 1 기준 궤도 고도
DIP = math.degrees(math.acos(R / CAM_H))   # 지평선 하강각
HORIZON_FRAC = 0.80               # 화면 위에서 80% 지점에 지평선
LENS, SENSOR = 24.0, 36.0
vfov = 2 * math.atan((SENSOR * RH / RW) / 2 / LENS)
below = math.degrees(math.atan((HORIZON_FRAC - 0.5) * 2 * math.tan(vfov / 2)))
PITCH = DIP - below

# 해: 카메라에서 본 방향, 지평선 바로 위로 살짝
SUN_ELEV = -(DIP - float(__import__('os').environ.get('SUN_UP', 0.12)))
sun_dir = Vector((math.sin(math.radians(4)), math.cos(math.radians(SUN_ELEV)), math.sin(math.radians(SUN_ELEV)))).normalized()

# ---------- 카메라
cam_data = bpy.data.cameras.new("cam"); cam_data.lens = LENS; cam_data.sensor_width = SENSOR
cam_data.clip_start = 0.0005; cam_data.clip_end = 1000
cam = bpy.data.objects.new("cam", cam_data); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0, 0, CAM_H)
cam.rotation_euler = (math.radians(90 - PITCH), 0, 0)

# ---------- 지구 방향: 서울 상공(약간 동쪽)이 발 아래, 동쪽이 +Y(화면 안쪽)
def ll(lat, lon):
    la, lo = math.radians(lat), math.radians(lon)
    up = Vector((math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)))
    east = Vector((-math.sin(lo), math.cos(lo), 0))
    north = up.cross(east)
    return east, north, up
e1, n1, u1 = ll(35.5, 128.5)
target = Vector((0, 0.10, 1)).normalized()
fwd = (Vector((0, 1, 0)) - target * target.y).normalized()
e2, u2 = fwd, target
n2 = u2.cross(e2)
A = Matrix((e1, n1, u1)).transposed()
B = Matrix((e2, n2, u2)).transposed()
ROT = (B @ A.transposed()).to_4x4()

pivot = bpy.data.objects.new("earth_pivot", None); sc.collection.objects.link(pivot)
pivot.matrix_world = ROT

def sphere(name, radius, segs=256, rings=128):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=radius)
    ob = bpy.context.active_object; ob.name = name
    bpy.ops.object.shade_smooth()
    ob.parent = pivot
    return ob

earth = sphere("earth", R)
clouds = sphere("clouds", R * 1.0045)
atmo = sphere("atmo", R * 1.03, 256, 128)
for ob in (earth, clouds, atmo):
    ob.parent = pivot

# ---------- 노드 헬퍼
def mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    return m, nt

def equirect(nt):
    """오브젝트 좌표 -> 위경도 UV"""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nrm = nt.nodes.new("ShaderNodeVectorMath"); nrm.operation = 'NORMALIZE'
    nt.links.new(tc.outputs["Object"], nrm.inputs[0])
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(nrm.outputs[0], sep.inputs[0])
    at = nt.nodes.new("ShaderNodeMath"); at.operation = 'ARCTAN2'
    nt.links.new(sep.outputs["Y"], at.inputs[0]); nt.links.new(sep.outputs["X"], at.inputs[1])
    u = nt.nodes.new("ShaderNodeMath"); u.operation = 'MULTIPLY_ADD'
    nt.links.new(at.outputs[0], u.inputs[0]); u.inputs[1].default_value = 1 / (2 * math.pi); u.inputs[2].default_value = 0.5
    asn = nt.nodes.new("ShaderNodeMath"); asn.operation = 'ARCSINE'; nt.links.new(sep.outputs["Z"], asn.inputs[0])
    v = nt.nodes.new("ShaderNodeMath"); v.operation = 'MULTIPLY_ADD'
    nt.links.new(asn.outputs[0], v.inputs[0]); v.inputs[1].default_value = 1 / math.pi; v.inputs[2].default_value = 0.5
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(u.outputs[0], comb.inputs["X"]); nt.links.new(v.outputs[0], comb.inputs["Y"])
    return comb.outputs[0]

def tex(nt, image, vec, interp='Cubic'):
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = image; t.interpolation = interp
    t.extension = 'REPEAT'
    nt.links.new(vec, t.inputs["Vector"]); return t

def sun_dot(nt):
    """월드 법선 · 태양 방향"""
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    d = nt.nodes.new("ShaderNodeVectorMath"); d.operation = 'DOT_PRODUCT'
    nt.links.new(geo.outputs["Normal"], d.inputs[0]); d.inputs[1].default_value = sun_dir
    return d.outputs["Value"]

def maprange(nt, val, a, b, c=0.0, d=1.0, smooth=True):
    m = nt.nodes.new("ShaderNodeMapRange"); m.interpolation_type = 'SMOOTHSTEP' if smooth else 'LINEAR'
    nt.links.new(val, m.inputs["Value"])
    m.inputs["From Min"].default_value = a; m.inputs["From Max"].default_value = b
    m.inputs["To Min"].default_value = c; m.inputs["To Max"].default_value = d
    return m.outputs["Result"]

def math_op(nt, op, a, b=None):
    n = nt.nodes.new("ShaderNodeMath"); n.operation = op
    (nt.links.new(a, n.inputs[0]) if not isinstance(a, (int, float)) else n.inputs[0].__setattr__("default_value", a))
    if b is not None:
        (nt.links.new(b, n.inputs[1]) if not isinstance(b, (int, float)) else n.inputs[1].__setattr__("default_value", b))
    return n.outputs[0]

# ---------- 지구 재질
day_img = img("day_10k.jpg"); night_img = img("BlackMarble_2016_3km.jpg"); cloud_img = img("clouds_8k.jpg", "Non-Color")
m, nt = mat("earth")
uv = equirect(nt)
day = tex(nt, day_img, uv); night = tex(nt, night_img, uv); cl = tex(nt, cloud_img, uv)
out = nt.nodes.new("ShaderNodeOutputMaterial")
bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
nt.links.new(day.outputs["Color"], bsdf.inputs["Base Color"])
# 바다 마스크: 파랑 우세 + 어두움
sep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(day.outputs["Color"], sep.inputs[0])
bmr = math_op(nt, 'SUBTRACT', sep.outputs[2], sep.outputs[0])
ocean = maprange(nt, bmr, 0.02, 0.10)
rough = maprange(nt, ocean, 0, 1, 0.85, 0.28, smooth=False)
nt.links.new(rough, bsdf.inputs["Roughness"])
spec = maprange(nt, ocean, 0, 1, 0.2, 0.7, smooth=False)
nt.links.new(spec, bsdf.inputs["Specular IOR Level"])
# 밤: 도시 불빛, 태양 반대편 + 구름에 가려짐
sd = sun_dot(nt)
nightmask = maprange(nt, sd, 0.02, -0.12)
nsep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(night.outputs["Color"], nsep.inputs[0])
lum = math_op(nt, 'POWER', nsep.outputs[0], 2.2)   # 이미 sRGB에서 선형화됨, 대비 강화
cloudblock = maprange(nt, cl.outputs["Color"], 0.1, 0.9, 1.0, 0.25, smooth=False)
lights = math_op(nt, 'MULTIPLY', math_op(nt, 'MULTIPLY', lum, nightmask), cloudblock)
nt.links.new(lights, bsdf.inputs["Emission Strength"])
bsdf.inputs["Emission Color"].default_value = (1.0, 0.62, 0.28, 1)
# 전체 강도는 Emission Strength 곱으로
emul = nt.nodes.new("ShaderNodeMath"); emul.operation = 'MULTIPLY'; emul.inputs[1].default_value = 38.0
nt.links.new(lights, emul.inputs[0]); nt.links.new(emul.outputs[0], bsdf.inputs["Emission Strength"])
nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
earth.data.materials.append(m)

# ---------- 구름 재질
m, nt = mat("clouds")
uv = equirect(nt); cl = tex(nt, cloud_img, uv)
out = nt.nodes.new("ShaderNodeOutputMaterial")
dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); dif.inputs["Color"].default_value = (0.95, 0.96, 1.0, 1)
tr = nt.nodes.new("ShaderNodeBsdfTransparent")
mix = nt.nodes.new("ShaderNodeMixShader")
alpha = maprange(nt, cl.outputs["Color"], 0.05, 0.85, 0, 0.95, smooth=False)
nt.links.new(alpha, mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(dif.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], out.inputs["Surface"])
clouds.data.materials.append(m)

# ---------- 대기 재질: 시선의 최저 접선 고도로 밀도 계산 (지표 근처가 가장 밝고 위로 지수 감쇠)
m, nt = mat("atmo")
out = nt.nodes.new("ShaderNodeOutputMaterial")
geo = nt.nodes.new("ShaderNodeNewGeometry")
cr = nt.nodes.new("ShaderNodeVectorMath"); cr.operation = 'CROSS_PRODUCT'
nt.links.new(geo.outputs["Position"], cr.inputs[0]); nt.links.new(geo.outputs["Incoming"], cr.inputs[1])
ln = nt.nodes.new("ShaderNodeVectorMath"); ln.operation = 'LENGTH'; nt.links.new(cr.outputs[0], ln.inputs[0])
alt = math_op(nt, 'SUBTRACT', ln.outputs["Value"], R)            # 접선 고도 (지구 반지름 단위)
H = float(os.environ.get("SCALE_H", 0.0035))
pos = math_op(nt, 'MAXIMUM', alt, 0.0); neg = math_op(nt, 'MINIMUM', alt, 0.0)
dens_up = math_op(nt, 'EXPONENT', math_op(nt, 'MULTIPLY', pos, -1.0 / H))
dens_in = math_op(nt, 'EXPONENT', math_op(nt, 'MULTIPLY', neg, 1.0 / float(os.environ.get('IN_H', 0.0012))))
dens = math_op(nt, 'MULTIPLY', dens_up, dens_in)
# 접선 지점 T = P - (P·I) I 의 법선으로 태양 조명 판정
pdi = nt.nodes.new("ShaderNodeVectorMath"); pdi.operation = 'DOT_PRODUCT'
nt.links.new(geo.outputs["Position"], pdi.inputs[0]); nt.links.new(geo.outputs["Incoming"], pdi.inputs[1])
sc_i = nt.nodes.new("ShaderNodeVectorMath"); sc_i.operation = 'SCALE'
nt.links.new(geo.outputs["Incoming"], sc_i.inputs[0]); nt.links.new(pdi.outputs["Value"], sc_i.inputs["Scale"])
tp = nt.nodes.new("ShaderNodeVectorMath"); tp.operation = 'SUBTRACT'
nt.links.new(geo.outputs["Position"], tp.inputs[0]); nt.links.new(sc_i.outputs[0], tp.inputs[1])
tn = nt.nodes.new("ShaderNodeVectorMath"); tn.operation = 'NORMALIZE'; nt.links.new(tp.outputs[0], tn.inputs[0])
sdv = nt.nodes.new("ShaderNodeVectorMath"); sdv.operation = 'DOT_PRODUCT'
nt.links.new(tn.outputs[0], sdv.inputs[0]); sdv.inputs[1].default_value = sun_dir
sd = sdv.outputs["Value"]
lit = maprange(nt, sd, float(os.environ.get("LIT_A", -0.10)), float(os.environ.get("LIT_B", 0.18)))
twilight = maprange(nt, math_op(nt, 'ABSOLUTE', sd), 0.12, 0.0)
low = math_op(nt, 'EXPONENT', math_op(nt, 'MULTIPLY', pos, -1.0 / 0.0018))   # 낮은 층일수록 1
redness = math_op(nt, 'MULTIPLY', twilight, low)
neg_in = nt.nodes.new("ShaderNodeVectorMath"); neg_in.operation = 'SCALE'; neg_in.inputs["Scale"].default_value = -1.0
nt.links.new(geo.outputs["Incoming"], neg_in.inputs[0])
vd = nt.nodes.new("ShaderNodeVectorMath"); vd.operation = 'DOT_PRODUCT'
nt.links.new(neg_in.outputs[0], vd.inputs[0]); vd.inputs[1].default_value = sun_dir
halo = math_op(nt, 'POWER', math_op(nt, 'MAXIMUM', vd.outputs["Value"], 0.0), float(os.environ.get("HALO_POW", 300.0)))
halo_gain = math_op(nt, 'ADD', math_op(nt, 'MULTIPLY', halo, float(os.environ.get("HALO", 8.0))), 1.0)
blue = nt.nodes.new("ShaderNodeRGB"); blue.outputs[0].default_value = (0.08, 0.30, 1.0, 1)
orange = nt.nodes.new("ShaderNodeRGB"); orange.outputs[0].default_value = (1.0, 0.28, 0.05, 1)
cm = nt.nodes.new("ShaderNodeMix"); cm.data_type = 'RGBA'
nt.links.new(redness, cm.inputs["Factor"]); nt.links.new(blue.outputs[0], cm.inputs[6]); nt.links.new(orange.outputs[0], cm.inputs[7])
em = nt.nodes.new("ShaderNodeEmission"); nt.links.new(cm.outputs[2], em.inputs["Color"])
strength = math_op(nt, 'MULTIPLY', math_op(nt, 'MULTIPLY', math_op(nt, 'MULTIPLY', dens, lit), halo_gain), float(os.environ.get("ATMO", 2.5)))
nt.links.new(strength, em.inputs["Strength"])
# 야간 녹색 대기광: 약 95km(0.0149) 고도의 얇은 띠
night = maprange(nt, sd, -0.02, -0.25)
d = math_op(nt, 'DIVIDE', math_op(nt, 'SUBTRACT', alt, 0.0149), 0.0008)
gauss = math_op(nt, 'EXPONENT', math_op(nt, 'MULTIPLY', math_op(nt, 'MULTIPLY', d, d), -1.0))
airglow = math_op(nt, 'MULTIPLY', math_op(nt, 'MULTIPLY', gauss, night), float(os.environ.get("AIRGLOW", 0.05)))
ag = nt.nodes.new("ShaderNodeEmission"); ag.inputs["Color"].default_value = (0.3, 1.0, 0.5, 1)
nt.links.new(airglow, ag.inputs["Strength"])
tr = nt.nodes.new("ShaderNodeBsdfTransparent")
add = nt.nodes.new("ShaderNodeAddShader"); add2 = nt.nodes.new("ShaderNodeAddShader")
nt.links.new(tr.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
nt.links.new(add.outputs[0], add2.inputs[0]); nt.links.new(ag.outputs[0], add2.inputs[1])
nt.links.new(add2.outputs[0], out.inputs["Surface"])
atmo.data.materials.append(m)
atmo.visible_shadow = False
atmo.visible_diffuse = False; atmo.visible_glossy = False

# ---------- 태양
sun = bpy.data.lights.new("sun", 'SUN'); sun.energy = 5.0; sun.angle = math.radians(0.53)
sun.color = (1.0, 0.96, 0.9)
sun_ob = bpy.data.objects.new("sun", sun); sc.collection.objects.link(sun_ob)
sun_ob.rotation_euler = sun_dir.to_track_quat('Z', 'Y').to_euler()  # 빛은 -Z로 나간다 = 태양에서 지구 쪽
# 보이는 태양 원반
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.9, location=tuple(Vector((0, 0, CAM_H)) + sun_dir * 200))
disk = bpy.context.active_object; disk.name = "sun_disk"
m, nt = mat("sun_disk"); out = nt.nodes.new("ShaderNodeOutputMaterial")
em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = float(__import__("os").environ.get("SUN_DISK", 120.0))
em.inputs["Color"].default_value = (1.0, 0.93, 0.82, 1)
nt.links.new(em.outputs[0], out.inputs["Surface"]); disk.data.materials.append(m)
disk.visible_shadow = False

# ---------- 별 배경
world = bpy.data.worlds.new("space"); sc.world = world; world.use_nodes = True
nt = world.node_tree; nt.nodes.clear()
tc = nt.nodes.new("ShaderNodeTexCoord")
mp = nt.nodes.new("ShaderNodeMapping")
from mathutils import Quaternion
import os
C = Vector((0.0, -math.cos(math.radians(-26)), math.sin(math.radians(-26)))).normalized()  # 텍스처 공간의 은하 중심
az, el = math.radians(float(os.environ.get("GC_AZ", -28))), math.radians(float(os.environ.get("GC_EL", -8)))
Dc = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el))).normalized()
q = Dc.rotation_difference(C)
q = Quaternion(C, math.radians(float(os.environ.get("ROLL", 0)))) @ q
mp.inputs["Rotation"].default_value = q.to_euler('XYZ')
nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
st = nt.nodes.new("ShaderNodeTexEnvironment"); st.image = img("stars_8k.png"); st.interpolation = 'Cubic'
nt.links.new(mp.outputs[0], st.inputs["Vector"])
bg = nt.nodes.new("ShaderNodeBackground"); bg.inputs["Strength"].default_value = float(os.environ.get("STARS", 2.2))
nt.links.new(st.outputs["Color"], bg.inputs["Color"])
lp = nt.nodes.new("ShaderNodeLightPath")
bl = nt.nodes.new("ShaderNodeBackground"); bl.inputs["Color"].default_value = (0, 0, 0, 1)
mx = nt.nodes.new("ShaderNodeMixShader")
nt.links.new(lp.outputs["Is Camera Ray"], mx.inputs[0]); nt.links.new(bl.outputs[0], mx.inputs[1]); nt.links.new(bg.outputs[0], mx.inputs[2])
wo = nt.nodes.new("ShaderNodeOutputWorld"); nt.links.new(mx.outputs[0], wo.inputs["Surface"])

# ---------- 애니메이션: 자전(동쪽으로 흘러감), 구름은 조금 다르게
def spin(ob, deg):
    ob.rotation_euler = (0, 0, 0); ob.keyframe_insert("rotation_euler", frame=1)
    ob.rotation_euler = (0, 0, math.radians(deg)); ob.keyframe_insert("rotation_euler", frame=FRAMES)
    for fc in ob.animation_data.action.fcurves if hasattr(ob.animation_data.action, "fcurves") else []:
        for k in fc.keyframe_points: k.interpolation = 'LINEAR'
# 지구 자전축(로컬 Z)을 중심으로 회전 -> 오브젝트 좌표 텍스처가 함께 돈다
spin(earth, -2.0); spin(clouds, -2.1)
try:
    for ob in (earth, clouds):
        act = ob.animation_data.action
        for layer in getattr(act, "layers", []):
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for k in fc.keyframe_points: k.interpolation = 'LINEAR'
except Exception as e:
    print("interp", e)

# ---------- 렌더 설정
sc.render.engine = 'CYCLES' if ENGINE == "CYCLES" else 'BLENDER_EEVEE'
if ENGINE == "CYCLES":
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = (d.type == 'METAL')
    sc.cycles.device = 'GPU'
    sc.cycles.samples = int(__import__("os").environ.get("SAMPLES", 96 if MODE == "still" else 48))
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 3
    sc.cycles.use_adaptive_sampling = True
else:
    sc.eevee.taa_render_samples = 64
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Medium High Contrast'
except Exception: pass
sc.view_settings.exposure = 0.0

# 컴포지터: 블룸 + 약한 스트릭
ng = bpy.data.node_groups.new("comp", "CompositorNodeTree"); sc.compositing_node_group = ng
rl = ng.nodes.new("CompositorNodeRLayers")
g1 = ng.nodes.new("CompositorNodeGlare"); g1.inputs["Type"].default_value = 'Bloom'
g1.inputs["Threshold"].default_value = 1.2; g1.inputs["Strength"].default_value = 0.35; g1.inputs["Size"].default_value = 0.8
g2 = ng.nodes.new("CompositorNodeGlare"); g2.inputs["Type"].default_value = 'Streaks'
g2.inputs["Threshold"].default_value = 40.0; g2.inputs["Strength"].default_value = 0.12; g2.inputs["Streaks"].default_value = 8
g2.inputs["Streaks Angle"].default_value = math.radians(12)
g2.inputs["Fade"].default_value = 0.93
go = ng.interface.new_socket("Image", in_out='OUTPUT', socket_type='NodeSocketColor')
gout = ng.nodes.new("NodeGroupOutput")
ng.links.new(rl.outputs["Image"], g1.inputs["Image"])
ng.links.new(g1.outputs[0], gout.inputs[0])

for name in HIDE:
    if name in bpy.data.objects: bpy.data.objects[name].hide_render = True
if "comp" in HIDE: sc.compositing_node_group = None
if MODE == "still":
    sc.frame_set(1)
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = OUT + ".png"
    bpy.ops.render.render(write_still=True)
else:
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = OUT + "/f_"
    sc.render.use_overwrite = False; sc.render.use_placeholder = True
    bpy.ops.render.render(animation=True)
print("DONE", PITCH, DIP)
