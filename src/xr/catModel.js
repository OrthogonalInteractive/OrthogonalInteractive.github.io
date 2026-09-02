import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone as cloneRigged } from 'three/addons/utils/SkeletonUtils.js'
import { createEmergence } from './emerge.js'
import { fitToMarker, restBounds } from './fit.js'
import { createMotion } from './objectMotion.js'

const MODEL_URL = '/xr/cat.glb'

// Fractions of the mark's width: the model overhangs the card, and floats clear
// of the print rather than resting on it.
const WIDTH = 1.1
const HOVER = 0.12

// The glow is baked into the base colour, so lighting it as plain albedo would
// sink it into shadow. Feeding the same map to emissive keeps it self-lit.
const EMISSIVE_REST = 0.55
const EMISSIVE_LIT = 1.15

// Heading on the card, in degrees about the mark's normal. Tuned against the
// printed artwork; /xr/?debug=1 exposes a control to re-measure it on a device.
const HEADING = 0

// Seconds for the model to climb out of the card.
const RISE_SECONDS = 1.4

/**
 * Loads the studio's cat once, ready to be stood on the mark as often as needed.
 *
 * `size` is how far it should reach across the mark, as a multiple of the
 * mark's width — the anchor spans one unit, so the fit is the same whether that
 * unit came from an image tracker or from a measured world-space anchor.
 */
export async function loadCatFactory({ size = WIDTH } = {}) {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL)
  const template = gltf.scene

  // glTF is Y-up; a MindAR anchor's Z points out of the card.
  template.rotation.x = Math.PI / 2

  // Measured once, off the model as it was authored: every copy is the same
  // shape, and the rest pose is the only pose these bounds are valid for.
  const box = restBounds(template)
  const { scale, z, radius } = fitToMarker(box, { width: size, hover: HOVER })

  return {
    /** Another cat, with its own materials, animation clock and motion. */
    create: () => build({ gltf, template, box, scale, z, radius }),

    /** The geometry and textures every copy shares. */
    dispose() {
      template.traverse((child) => {
        if (!child.isMesh) return
        child.geometry.dispose()
        child.material.map?.dispose()
        child.material.dispose()
      })
    },
  }
}

/** One cat on the mark. Kept for callers that only ever want the one. */
export async function loadCatModel(options) {
  const factory = await loadCatFactory(options)
  const cat = factory.create()
  const disposeOne = cat.dispose
  return Object.assign(cat, {
    dispose() {
      disposeOne()
      factory.dispose()
    },
  })
}

function build({ gltf, template, box, scale, z, radius }) {
  // A SkinnedMesh cannot be copied with Object3D.clone: the copy's bones are
  // the originals', so every cat would be posed by whichever skeleton moved
  // last. SkeletonUtils rebuilds the binding against the cloned bones.
  const model = cloneRigged(template)
  model.scale.setScalar(scale)

  // Heading sits on its own group: the outer one carries the stroke rotation,
  // so folding the two together would make them fight.
  const heading = new THREE.Group()
  heading.rotation.z = (HEADING * Math.PI) / 180
  heading.add(model)

  const group = new THREE.Group()
  group.position.z = z
  group.add(heading)

  // Starts buried: the top of the model sits just under the mark's plane, where
  // the clipping plane hides it entirely.
  const buried = -box.max.y * scale - 0.02
  const rise = createEmergence({ from: buried, to: z, duration: RISE_SECONDS })

  const materials = []
  model.traverse((child) => {
    if (!child.isMesh) return
    // Cloning shares materials, and these are written to every frame — one
    // shared copy would make every cat light up and fade as one.
    const material = child.material.clone()
    child.material = material
    material.emissiveMap = material.map
    material.emissive = new THREE.Color(0xffffff)
    material.emissiveIntensity = EMISSIVE_REST
    materials.push(material)
    // The skinned bounds are computed from the rest pose, and the idle motion
    // is small enough that culling on them would only ever be wrong.
    child.frustumCulled = false
  })

  // The sleeping cat breathes and flicks its tail on a five second loop. Copies
  // start at their own point in it: three cats breathing in step read as one
  // object drawn three times.
  const mixer = gltf.animations.length ? new THREE.AnimationMixer(model) : null
  gltf.animations.forEach((clip) => {
    const action = mixer.clipAction(clip).play()
    action.time = Math.random() * clip.duration
  })

  const motion = createMotion(group)

  return {
    group,
    radius,
    fitScale: scale,

    spin: motion.spin,
    setHighlight: motion.setHighlight,
    setPresent: motion.setPresent,
    setSize: motion.setSize,

    /** True once it has faded out of sight entirely. */
    get gone() {
      return motion.presence <= 0.01
    },

    /** Play the climb out of the card, from the pose it was built with. */
    reveal() {
      motion.reset()
      rise.start()
    },

    /** Hides whatever is still below the card, so the model rises out of it. */
    applyClipping(plane) {
      materials.forEach((material) => {
        material.clippingPlanes = [plane]
        material.needsUpdate = true
      })
    },

    /** How far the object has been turned from its starting pose, in degrees. */
    get turn() {
      return Math.round((2 * Math.acos(Math.min(1, Math.abs(group.quaternion.w))) * 180) / Math.PI)
    },

    /** Heading on the card in degrees — the debug control drives this. */
    get heading() {
      return Math.round((heading.rotation.z * 180) / Math.PI)
    },
    set heading(degrees) {
      heading.rotation.z = (degrees * Math.PI) / 180
    },

    /** How faded in the object is, 0..1. */
    get presence() {
      return motion.presence
    },

    /** Seconds into the idle loop — the debug readout reports this. */
    get animationTime() {
      return mixer ? mixer.time : 0
    },

    update(delta) {
      mixer?.update(delta)
      motion.update(delta)
      group.position.z = rise.update(delta)
      const intensity =
        EMISSIVE_REST + (EMISSIVE_LIT - EMISSIVE_REST) * motion.highlight
      materials.forEach((material) => {
        material.emissiveIntensity = intensity
        material.opacity = motion.presence
        material.transparent = motion.presence < 1
      })
    },

    /** Only what this copy owns; the geometry and textures are the factory's. */
    dispose() {
      mixer?.stopAllAction()
      materials.forEach((material) => material.dispose())
    },
  }
}
