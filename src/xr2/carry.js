// Picking the model up, moving it, and dropping it back onto the card's plane.
//
// Distances are in mark widths, the units of the group this drives, and the
// plane is z = 0 — the card itself, which the image target gives us exactly.
// Gravity is nothing like the real thing: at this scale a true 9.8 m/s² empties
// the whole fall into under a tenth of a second, which reads as a glitch rather
// than a drop.

const LIFT = 1.2 // how far off the card a carried model floats
const GRAVITY = 20 // mark widths per second squared
const RISE = 12 // how quickly it lifts once grabbed, per second
const FOLLOW = 14 // how closely it chases the finger, per second

// How far from the mark it can be taken. A finger pointed at the far distance
// meets the card's plane at a glancing angle, where a millimetre of hand is
// metres of ground, so the reach is stopped well before that runs away.
const LIMIT = 6

export function createCarry({
  lift = LIFT,
  gravity = GRAVITY,
  rise = RISE,
  follow = FOLLOW,
  limit = LIMIT,
} = {}) {
  let x = 0
  let y = 0
  let z = 0
  let targetX = 0
  let targetY = 0
  let fall = 0
  let held = false

  /** Takes the point asked for, brought back within reach along its own line. */
  function aim(point) {
    const distance = Math.hypot(point.x, point.y)
    const scale = distance > limit ? limit / distance : 1
    targetX = point.x * scale
    targetY = point.y * scale
  }

  return {
    get held() {
      return held
    },

    get position() {
      return { x, y, z }
    },

    /** Sticks to the finger where it took hold, rather than sliding over. */
    grab(point) {
      held = true
      fall = 0
      aim(point)
      x = targetX
      y = targetY
    },

    moveTo(point) {
      if (!held) return
      aim(point)
    },

    release() {
      held = false
    },

    update(delta) {
      if (held) {
        const chase = Math.min(1, delta * follow)
        x += (targetX - x) * chase
        y += (targetY - y) * chase
        z += (lift - z) * Math.min(1, delta * rise)
      } else if (z > 0) {
        fall -= gravity * delta
        z += fall * delta
        if (z <= 0) {
          z = 0
          fall = 0
        }
      }
      return { x, y, z }
    },
  }
}
