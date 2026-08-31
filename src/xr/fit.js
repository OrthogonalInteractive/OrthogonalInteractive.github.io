import { Vector3 } from 'three'

/**
 * Works out how to sit an imported model on the tracked mark.
 *
 * A MindAR anchor spans one unit across the target's width, and the glTF frame
 * is Y-up while the marker's is Z-up — so the model's Y extent is what has to
 * clear the card.
 */
export function fitToMarker(box, { width, hover }) {
  const size = new Vector3()
  box.getSize(size)
  const footprint = Math.max(size.x, size.z) || 1
  const scale = width / footprint

  return {
    scale,
    // Raise the underside to the hover gap.
    z: hover - box.min.y * scale,
    radius: (size.x * scale) / 2,
  }
}
