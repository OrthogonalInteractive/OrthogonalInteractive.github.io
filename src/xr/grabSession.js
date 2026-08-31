/**
 * Drives the object from hand input, and decides when the image tracker runs.
 *
 * A hand reaching in covers the printed mark, and MindAR does not merely hide a
 * lost anchor — it overwrites the anchor matrix with zeroes, so the pose cannot
 * be recovered afterwards. The freeze therefore has to happen while the mark is
 * still readable: the moment a hand enters frame, well before it pinches.
 */
export function createGrabSession({
  object,
  onLatch,
  onResume,
  twistGain = 2,
  releaseFrames = 12,
}) {
  let latched = false
  let holding = false
  let absent = 0

  return {
    apply({ handPresent, contact, gesture }) {
      if (handPresent) {
        absent = 0
        if (!latched) {
          latched = true
          onLatch()
        }
      } else {
        absent += 1
      }

      // Only a pinch made on the object takes hold; once held, the hand is
      // free to move off it.
      if (gesture.justGrabbed && contact) {
        holding = true
        object.setGrabbed(true)
      }

      // Image space has y pointing down, so the sign flips to make a clockwise
      // wrist turn read as a clockwise spin.
      if (holding && gesture.pinching) object.setTwist(-gesture.twist * twistGain)

      if (gesture.justReleased && holding) {
        holding = false
        object.setGrabbed(false)
      }

      // Only hand the mark back once the hand has stayed away — detection
      // flickers, and re-registering on every dropped frame would jitter.
      if (latched && !holding && absent >= releaseFrames) {
        latched = false
        absent = 0
        onResume()
      }
    },

    get latched() {
      return latched
    },

    get holding() {
      return holding
    },
  }
}
