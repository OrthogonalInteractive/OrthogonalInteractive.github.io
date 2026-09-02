import { Plane, Raycaster, Vector2, Vector3 } from 'three'

/**
 * Where a finger on the glass meets the card — or a plane floating above it.
 *
 * A hand landmark carries no depth, so a carried model has to take its position
 * from somewhere else. The card's own plane is that somewhere: the image target
 * gives it exactly, and since the card is lying on the desk it is the desk.
 */
export function createReach() {
  const raycaster = new Raycaster()
  const ndc = new Vector2()
  const plane = new Plane()
  const hit = new Vector3()

  return {
    /**
     * @param point screen pixels
     * @param height how far above the card to meet, in mark widths
     * @param unit one mark width, in world units
     * @returns the meeting point in the frame's coordinates, or null
     */
    at(point, { camera, frame, card, height = 0, unit = 1, viewport }) {
      ndc.set(
        (point.x / viewport.width) * 2 - 1,
        -(point.y / viewport.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)

      plane.copy(card)
      // Sliding a plane `d` along its own normal: n·(p + d n) + c = 0 leaves
      // c' = c - d.
      plane.constant -= height * unit

      if (!raycaster.ray.intersectPlane(plane, hit)) return null
      frame.worldToLocal(hit)
      return { x: hit.x, y: hit.y }
    },
  }
}
