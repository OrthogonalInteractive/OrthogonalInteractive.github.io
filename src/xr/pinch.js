/** The MediaPipe hand landmarks this module reads. */
export const LANDMARK = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  PINKY_MCP: 17,
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

/** Wraps an angle difference into (-π, π] so ±π crossings do not jump. */
const shortestAngle = (radians) =>
  Math.atan2(Math.sin(radians), Math.cos(radians))

/**
 * Fingertip separation as a fraction of the hand's own span. Landmarks carry no
 * usable depth, so normalising by the wrist-to-knuckle distance is what keeps
 * the measure stable as the hand moves toward or away from the lens.
 */
export function pinchRatio(landmarks) {
  const span = distance(landmarks[LANDMARK.WRIST], landmarks[LANDMARK.INDEX_MCP])
  if (!span) return Infinity
  return distance(landmarks[LANDMARK.THUMB_TIP], landmarks[LANDMARK.INDEX_TIP]) / span
}

/** Roll of the knuckle line in image space — how far the wrist has turned. */
export function twistAngle(landmarks) {
  const index = landmarks[LANDMARK.INDEX_MCP]
  const pinky = landmarks[LANDMARK.PINKY_MCP]
  return Math.atan2(pinky.y - index.y, pinky.x - index.x)
}

/**
 * Turns a stream of hand landmarks into grab / twist / release events.
 *
 * The two thresholds are deliberately apart: a single one makes the grab
 * flicker while the fingers hover around it.
 */
export function createPinchTracker({ onRatio = 0.4, offRatio = 0.65 } = {}) {
  let pinching = false
  let originAngle = 0

  return {
    update(landmarks) {
      const wasPinching = pinching

      if (!landmarks) {
        pinching = false
        return {
          pinching: false,
          justGrabbed: false,
          justReleased: wasPinching,
          twist: 0,
        }
      }

      const ratio = pinchRatio(landmarks)
      pinching = pinching ? ratio <= offRatio : ratio < onRatio

      const angle = twistAngle(landmarks)
      const justGrabbed = pinching && !wasPinching
      if (justGrabbed) originAngle = angle

      return {
        pinching,
        justGrabbed,
        justReleased: !pinching && wasPinching,
        twist: pinching ? shortestAngle(angle - originAngle) : 0,
      }
    },
  }
}
