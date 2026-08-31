const SPIN_DAMPING = 0.94 // per 1/60 s once the finger lifts
const SPIN_FLOOR = 0.02 // radians per second below which it has stopped
const HIGHLIGHT_RATE = 9 // how fast the glow follows the hand, per second
const FADE_RATE = 10 // how fast it fades once the mark is out of sight
const HIGHLIGHT_SWELL = 0.07 // extra scale at full highlight

/**
 * Stroke-driven rotation with inertia, plus an eased highlight level.
 *
 * Rotation is confined to the group's own Z, which is where the model's upright
 * axis lands once it is stood up on the mark. Doing it locally also sidesteps
 * three's world-axis rotation, which assumes an unrotated parent — and here the
 * parent carries the mark's pose.
 */
export function createMotion(group, { baseScale = 1 } = {}) {
  let pendingAngle = 0
  let spinSpeed = 0
  let highlight = 0
  let target = 0
  let presence = 1
  let present = true

  return {
    get highlight() {
      return highlight
    },

    /** 0..1, how faded in the object currently is. */
    get presence() {
      return presence
    },

    /** Whether the object should be on screen at all. */
    setPresent(next) {
      present = next
    },

    /** A stroke: turn by `angle` about the model's upright axis. */
    spin(angle) {
      if (!angle) return
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
      presence += ((present ? 1 : 0) - presence) * Math.min(1, delta * FADE_RATE)
      if (present && presence < 0.01) presence = 0.01
      group.visible = presence > 0.005

      highlight += (target - highlight) * Math.min(1, delta * HIGHLIGHT_RATE)
      group.scale.setScalar(baseScale * (1 + highlight * HIGHLIGHT_SWELL))

      if (pendingAngle) {
        group.rotateZ(pendingAngle)
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
      group.rotateZ(spinSpeed * delta)
    },
  }
}
