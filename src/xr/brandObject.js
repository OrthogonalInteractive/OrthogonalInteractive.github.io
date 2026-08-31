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

const REST_Z = CORE_RADIUS
const LIFT_Z = CORE_RADIUS + 0.19
const LIFT_RATE = 12 // approach speed while held, per second
const GRAVITY = 4 // fall acceleration once let go, in mark widths per second²
const RESTITUTION = 0.28 // how much of the impact speed the bounce keeps
const SETTLE_SPEED = 0.02 // below this the bounce is over

const HIGHLIGHT_RATE = 9 // how fast the glow follows the hand, per second
const HIGHLIGHT_SWELL = 0.09 // extra scale at full highlight
const HIGHLIGHT_EMISSIVE = 0x1b3d47

/**
 * The studio's form — a low-poly core inside three mutually orthogonal rings —
 * built to sit on top of the tracked image.
 */
export function createBrandObject() {
  const group = new THREE.Group()
  // Lift it clear of the card so it reads as standing on the print.
  group.position.z = REST_Z

  let grabbed = false
  let velocity = 0
  let baseRotation = 0
  let twist = 0
  let highlight = 0
  let highlightTarget = 0

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
    ring.userData.restOpacity = opacity
    group.add(ring)
    return ring
  })

  return {
    group,
    rings,

    /**
     * How strongly the object should read as touched, 0..1. The response is
     * eased in update() so a flickering detection does not strobe.
     */
    setHighlight(value) {
      highlightTarget = Math.min(1, Math.max(0, value))
    },

    /** Held or let go. Releasing folds the current twist into the resting pose. */
    setGrabbed(next) {
      if (next === grabbed) return
      grabbed = next
      if (grabbed) {
        velocity = 0
      } else {
        baseRotation += twist
        twist = 0
      }
    },

    /** Rotation the hand is applying right now, in radians. */
    setTwist(radians) {
      twist = radians
      group.rotation.z = baseRotation + twist
    },

    /** Advances the highlight, the lift and the drop. `delta` is in seconds. */
    update(delta) {
      highlight += (highlightTarget - highlight) * Math.min(1, delta * HIGHLIGHT_RATE)
      group.scale.setScalar(1 + highlight * HIGHLIGHT_SWELL)
      edges.material.opacity = 0.9 + highlight * 0.1
      coreMaterial.emissive.setHex(HIGHLIGHT_EMISSIVE).multiplyScalar(highlight)
      rings.forEach((ring) => {
        const rest = ring.userData.restOpacity
        ring.material.opacity = rest + (1 - rest) * highlight
      })

      if (grabbed) {
        group.position.z += (LIFT_Z - group.position.z) * Math.min(1, delta * LIFT_RATE)
        return
      }

      if (group.position.z <= REST_Z && Math.abs(velocity) < SETTLE_SPEED) {
        group.position.z = REST_Z
        velocity = 0
        return
      }

      velocity -= GRAVITY * delta
      group.position.z += velocity * delta

      if (group.position.z <= REST_Z) {
        group.position.z = REST_Z
        velocity = Math.abs(velocity) * RESTITUTION
        if (velocity < SETTLE_SPEED) velocity = 0
      }
    },

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
