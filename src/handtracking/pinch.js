import { fingerGap } from '../xr/pinchScale.js'
import { LANDMARK } from '../xr/landmarks.js'

/** Where the thumb and index meet: the midpoint of their tips. */
export function pinchPoint(landmarks) {
  const thumb = landmarks[LANDMARK.THUMB_TIP]
  const index = landmarks[LANDMARK.INDEX_TIP]
  return { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 }
}

/**
 * Tracks which hands are pinching, each by its own side.
 *
 * Two thresholds, relative to the hand's own span, keep the state from
 * flickering while the fingers hover at the edge. A hand that leaves the frame
 * is forgotten, so it has to close properly again when it returns.
 */
export function createPinchTracker({ closeRatio = 0.3, openRatio = 0.45 } = {}) {
  let closed = new Map()

  return {
    /**
     * @param hands `[{ side, landmarks }]`, side being MediaPipe's handedness
     * @returns `{ hands: [...{ side, landmarks, pinched, point }], line }`, where
     *   line is the two pinch points while two hands are pinched, else null
     */
    update(hands) {
      const next = new Map()
      const tracked = hands.map(({ side, landmarks }) => {
        const ratio = fingerGap(landmarks)
        const pinched = closed.get(side) ? ratio <= openRatio : ratio < closeRatio
        next.set(side, pinched)
        return { side, landmarks, pinched, point: pinchPoint(landmarks) }
      })
      closed = next

      const pinching = tracked.filter((h) => h.pinched)
      const line = pinching.length >= 2 ? [pinching[0].point, pinching[1].point] : null
      return { hands: tracked, line }
    },
  }
}
