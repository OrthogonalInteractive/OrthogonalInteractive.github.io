/**
 * Turns fingertip positions into stroke deltas.
 *
 * A delta is only produced between two frames that were both in contact, so a
 * finger arriving or returning elsewhere never registers as a huge sweep.
 */
export function createStrokeTracker() {
  let previous = null

  return {
    update({ point, touching }) {
      if (!touching || !point) {
        previous = null
        return { dx: 0, dy: 0, from: null, to: null }
      }

      const from = previous
      const delta = from
        ? { dx: point.x - from.x, dy: point.y - from.y }
        : { dx: 0, dy: 0 }
      previous = point
      return { ...delta, from, to: point }
    },
  }
}
