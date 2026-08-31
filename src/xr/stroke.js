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
        return { dx: 0, dy: 0 }
      }

      const delta = previous
        ? { dx: point.x - previous.x, dy: point.y - previous.y }
        : { dx: 0, dy: 0 }
      previous = point
      return delta
    },
  }
}
