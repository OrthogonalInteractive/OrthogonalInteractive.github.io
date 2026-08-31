import { Vector3 } from 'three'

const SPIN_DAMPING = 0.94 // per 1/60 s once the finger lifts
const SPIN_FLOOR = 0.02 // radians per second below which it has stopped
const HIGHLIGHT_RATE = 9 // how fast the glow follows the hand, per second
const HIGHLIGHT_SWELL = 0.07 // extra scale at full highlight

/**
 * Stroke-driven rotation with inertia, plus an eased highlight level.
 *
 * The group's own scale is used for the swell, so whatever is being driven only
 * has to hand over a group and read `highlight` for its materials.
 */
export function createMotion(group, { baseScale = 1 } = {}) {
  const spinAxis = new Vector3(0, 1, 0)
  let pendingAngle = 0
  let spinSpeed = 0
  let highlight = 0
  let target = 0

  return {
    get highlight() {
      return highlight
    },

    /** A stroke: turn by `angle` about a world-space `axis`. */
    spin(axis, angle) {
      if (!angle) return
      spinAxis.copy(axis).normalize()
      pendingAngle += angle
    },

    /** How strongly it should read as touched, 0..1. Eased in update(). */
    setHighlight(value) {
      target = Math.min(1, Math.max(0, value))
    },

    /** Back to the pose it was built with, standing still. */
    reset() {
      group.quaternion.identity()
      pendingAngle = 0
      spinSpeed = 0
    },

    update(delta) {
      highlight += (target - highlight) * Math.min(1, delta * HIGHLIGHT_RATE)
      group.scale.setScalar(baseScale * (1 + highlight * HIGHLIGHT_SWELL))

      if (pendingAngle) {
        group.rotateOnWorldAxis(spinAxis, pendingAngle)
        // Carry the stroke's speed into the coast that follows it.
        spinSpeed = pendingAngle / Math.max(delta, 1 / 240)
        pendingAngle = 0
        return
      }

      if (Math.abs(spinSpeed) < SPIN_FLOOR) {
        spinSpeed = 0
        return
      }
      spinSpeed *= SPIN_DAMPING ** (delta * 60)
      group.rotateOnWorldAxis(spinAxis, spinSpeed * delta)
    },
  }
}
