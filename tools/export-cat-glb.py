"""Export the rigged cat with every action as a glTF clip, for the page backdrop.

Usage:
  Blender -b <Orthogonals/blender/cat_anim.blend> -P tools/export-cat-glb.py -- <out.glb>
"""
import bpy, sys

dst = sys.argv[sys.argv.index("--") + 1:][0]
arm = bpy.data.objects["CatRig"]
for pb in arm.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)
arm.animation_data.action = None

bpy.ops.object.select_all(action="DESELECT")
for name in ("CatRig", "Cat"):
    bpy.data.objects[name].select_set(True)

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_force_sampling=True,
    export_materials="NONE",
)
print("EXPORTED", dst)
