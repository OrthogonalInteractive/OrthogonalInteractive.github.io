/**
 * Drives the object from pinch gestures, and — the point of the whole design —
 * decides when the image tracker runs.
 *
 * A hand reaching in to grab covers the printed mark, which would make the
 * tracker lose the target and throw the object away. So the pose is latched and
 * the tracker stopped as the grab begins, and only restarted once the hand has
 * let go and the mark can be seen again.
 */
export function createGrabSession({ object, onLatch, onResume, twistGain = 2 }) {
  let holding = false

  return {
    apply(gesture) {
      if (gesture.justGrabbed) {
        holding = true
        onLatch()
        object.setGrabbed(true)
      }

      // Image space has y pointing down, so the sign flips to make a clockwise
      // wrist turn read as a clockwise spin.
      if (gesture.pinching) object.setTwist(-gesture.twist * twistGain)

      if (gesture.justReleased && holding) {
        holding = false
        object.setGrabbed(false)
        onResume()
      }
    },

    get holding() {
      return holding
    },
  }
}
