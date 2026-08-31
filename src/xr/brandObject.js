import * as THREE from 'three'

// Sampled from the printed mark: a faceted grey surface under a cyan glow.
const PALETTE = {
  surface: 0x74868a,
  edge: 0x8fd3e8,
  ring: 0x9fdcef,
  steel: 0x5c89a3,
}

// A MindAR anchor spans one unit across the width of the tracked image, so
// everything here is sized as a fraction of the printed mark.
const CORE_RADIUS = 0.15
const RING_RADIUS = 0.28

/**
 * The studio's form — a low-poly core inside three mutually orthogonal rings —
 * built to sit on top of the tracked image.
 */
export function createBrandObject() {
  const group = new THREE.Group()
  // Lift it clear of the card so it reads as standing on the print.
  group.position.z = CORE_RADIUS

  const coreGeometry = new THREE.IcosahedronGeometry(CORE_RADIUS, 1)
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.surface,
    flatShading: true,
    metalness: 0.15,
    roughness: 0.62,
  })
  const core = new THREE.Mesh(coreGeometry, coreMaterial)
  group.add(core)

  const edgesGeometry = new THREE.EdgesGeometry(coreGeometry, 1)
  const edges = new THREE.LineSegments(
    edgesGeometry,
    new THREE.LineBasicMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.95 }),
  )
  edges.scale.setScalar(1.01)
  group.add(edges)

  const ringGeometry = new THREE.TorusGeometry(RING_RADIUS, 0.003, 3, 96)
  const axes = [
    { rotation: [0, 0, 0], color: PALETTE.ring, opacity: 0.75 },
    { rotation: [Math.PI / 2, 0, 0], color: PALETTE.steel, opacity: 0.7 },
    { rotation: [0, Math.PI / 2, 0], color: PALETTE.ring, opacity: 0.5 },
  ]
  const rings = axes.map(({ rotation, color, opacity }) => {
    const ring = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
    )
    ring.rotation.set(...rotation)
    group.add(ring)
    return ring
  })

  return {
    group,
    rings,

    /**
     * Per-frame hook. The object holds still on its own — rotation comes from
     * whatever is driving it.
     */
    update() {},

    dispose() {
      coreGeometry.dispose()
      edgesGeometry.dispose()
      ringGeometry.dispose()
      coreMaterial.dispose()
      edges.material.dispose()
      rings.forEach((ring) => ring.material.dispose())
    },
  }
}
