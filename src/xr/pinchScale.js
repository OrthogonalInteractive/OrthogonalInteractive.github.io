import { LANDMARK } from './landmarks.js'

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * Thumb-to-index separation as a fraction of the hand's own span, so the
 * measure holds however near the lens the hand is.
 */
export function fingerGap(landmarks) {
  const span = distance(landmarks[LANDMARK.WRIST], landmarks[LANDMARK.INDEX_MCP])
  if (!span) return Infinity
  return distance(landmarks[LANDMARK.THUMB_TIP], landmarks[LANDMARK.INDEX_TIP]) / span
}

/**
 * Resizes the model by opening the fingers.
 *
 * Fingers held together are the origin: the object is its own size there, and
 * opening from that grows it. Nothing happens until they have met once, and a
 * hand leaving the frame cancels back to that waiting state — there is no
 * reference to measure against without a hand.
 */
export function createPinchScale({
  closeRatio = 0.3,
  openRatio = 0.45,
  maxRatio = 1.5,
  maxScale = 2.5,
} = {}) {
  let armed = false
  let closed = false

  return {
    update(landmarks) {
      if (!landmarks) {
        armed = false
        closed = false
        return { closed: false, scale: 1 }
      }

      const ratio = fingerGap(landmarks)
      // Two thresholds: one would flicker between reset and grow as the
      // fingers hover at the boundary.
      closed = closed ? ratio <= openRatio : ratio < closeRatio
      if (closed) armed = true

      if (!armed || closed) return { closed, scale: 1 }

      // Growth starts where "apart" starts, so crossing over is seamless.
      const travel = (ratio - openRatio) / (maxRatio - openRatio)
      const eased = Math.min(1, Math.max(0, travel))
      return { closed: false, scale: 1 + (maxScale - 1) * eased }
    },
  }
}
