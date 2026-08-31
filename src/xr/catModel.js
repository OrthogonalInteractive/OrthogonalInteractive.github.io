import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { fitToMarker } from './fit.js'
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

/** Loads the studio's cat and sits it upright on the tracked mark. */
export async function loadCatModel() {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL)
  const model = gltf.scene

  // glTF is Y-up; a MindAR anchor's Z points out of the card.
  model.rotation.x = Math.PI / 2

  const box = new THREE.Box3().setFromObject(model)
  const { scale, z, radius } = fitToMarker(box, { width: WIDTH, hover: HOVER })

  const group = new THREE.Group()
  group.position.z = z
  group.add(model)
  model.scale.setScalar(scale)

  const materials = []
  model.traverse((child) => {
    if (!child.isMesh) return
    const material = child.material
    material.emissiveMap = material.map
    material.emissive = new THREE.Color(0xffffff)
    material.emissiveIntensity = EMISSIVE_REST
    materials.push(material)
  })

  const motion = createMotion(group)

  return {
    group,
    radius,

    spin: motion.spin,
    setHighlight: motion.setHighlight,

    update(delta) {
      motion.update(delta)
      const intensity =
        EMISSIVE_REST + (EMISSIVE_LIT - EMISSIVE_REST) * motion.highlight
      materials.forEach((material) => {
        material.emissiveIntensity = intensity
      })
    },

    dispose() {
      model.traverse((child) => {
        if (!child.isMesh) return
        child.geometry.dispose()
        child.material.map?.dispose()
        child.material.dispose()
      })
    },
  }
}
