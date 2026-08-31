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
 * Resizes the model by opening the fingers, but only while they move slowly.
 *
 * A quick movement is treated the way lifting a mouse is: the size is left
 * alone, and wherever the fingers come to rest becomes the new grip. That is
 * what lets an enlarged model be kept while the fingers are snapped shut and
 * placed again.
 */
export function createPinchScale({
  closeRatio = 0.3,
  openRatio = 0.45,
  maxRatio = 1.5,
  maxScale = 2.5,
  maxSpeed = 3,
} = {}) {
  const perRatio = (maxScale - 1) / (maxRatio - openRatio)

  let armed = false
  let closed = false
  let slipped = false
  let scale = 1
  let lastRatio = null
  let originRatio = 0
  let originScale = 1

  function release() {
    armed = false
    closed = false
    slipped = false
    scale = 1
    lastRatio = null
  }

  return {
    update(landmarks, seconds) {
      if (!landmarks) {
        release()
        return { closed: false, scale: 1, speed: 0 }
      }

      const ratio = fingerGap(landmarks)
      const speed = lastRatio === null || !seconds ? 0 : Math.abs(ratio - lastRatio) / seconds
      lastRatio = ratio

      // Two thresholds: one would flicker between reset and grow as the
      // fingers hovered at it.
      closed = closed ? ratio <= openRatio : ratio < closeRatio

      if (speed > maxSpeed) {
        // Too fast to be a deliberate resize. Hold the size, and re-grip
        // wherever the fingers settle.
        slipped = true
        return { closed, scale, speed }
      }

      if (!armed) {
        if (!closed) return { closed, scale: 1, speed }
        armed = true
        slipped = false
        originRatio = ratio
        originScale = 1
        scale = 1
        return { closed, scale, speed }
      }

      if (slipped) {
        slipped = false
        originRatio = ratio
        originScale = scale
      }

      scale = Math.min(maxScale, Math.max(1, originScale + (ratio - originRatio) * perRatio))
      return { closed, scale, speed }
    },
  }
}
