import { Matrix4, Quaternion, Vector3 } from 'three'

/**
 * Eases the object onto the tracked pose instead of snapping to it.
 *
 * The image tracker runs its own loop and reports a fresh, slightly different
 * pose whenever it finishes — a hand-held phone turns a few pixels of shake
 * into far larger jumps in the estimate. Following those directly is what makes
 * the object judder.
 */
export function createPoseSmoother({ rate = 10 } = {}) {
  const position = new Vector3()
  const rotation = new Quaternion()
  const scale = new Vector3(1, 1, 1)

  const targetPosition = new Vector3()
  const targetRotation = new Quaternion()
  const targetScale = new Vector3()

  const matrix = new Matrix4()
  let started = false

  return {
    get result() {
      return matrix
    },

    /** Next pose is taken as-is — for a first sighting, or one after a gap. */
    reset() {
      started = false
    },

    follow(target, delta) {
      target.decompose(targetPosition, targetRotation, targetScale)

      if (!started) {
        started = true
        position.copy(targetPosition)
        rotation.copy(targetRotation)
        scale.copy(targetScale)
      } else {
        // Exponential smoothing, expressed per second so the result does not
        // depend on how the frames happen to fall.
        const k = 1 - Math.exp(-rate * delta)
        position.lerp(targetPosition, k)
        rotation.slerp(targetRotation, k)
        scale.lerp(targetScale, k)
      }

      return matrix.compose(position, rotation, scale)
    },
  }
}
