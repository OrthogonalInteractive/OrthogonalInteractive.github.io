const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * Two fingers on the glass, resizing the model.
 *
 * Unlike the hand gesture — where closed fingers are an origin the size
 * springs back to — this is the ordinary pinch people expect from a
 * touchscreen: relative to where the gesture started, and left where it lands.
 */
export function createScreenPinch({ min = 1, max = 2.5 } = {}) {
  let scale = min
  let startDistance = 0
  let startScale = min

  return {
    get scale() {
      return scale
    },

    begin(a, b) {
      startDistance = distance(a, b)
      startScale = scale
    },

    update(a, b) {
      // Fingers that started on top of each other give no ratio to work from.
      if (!startDistance) return scale
      const factor = distance(a, b) / startDistance
      scale = Math.min(max, Math.max(min, startScale * factor))
      return scale
    },

    end() {
      startDistance = 0
    },

    reset() {
      scale = min
      startDistance = 0
      startScale = min
    },
  }
}
