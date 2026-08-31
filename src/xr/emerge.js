const easeOut = (t) => 1 - (1 - t) ** 3

/**
 * The rise out of the card: the model starts buried under the mark's plane and
 * climbs to its hover height. Paired with a clipping plane at the card, the
 * buried part is not drawn, so it reads as coming up out of the print.
 */
export function createEmergence({ from, to, duration }) {
  let elapsed = duration

  return {
    get done() {
      return elapsed >= duration
    },

    start() {
      elapsed = 0
    },

    /** Height for this frame. */
    update(delta) {
      elapsed = Math.min(duration, elapsed + delta)
      return from + (to - from) * easeOut(elapsed / duration)
    },
  }
}
