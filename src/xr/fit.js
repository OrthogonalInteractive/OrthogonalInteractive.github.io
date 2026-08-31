import { Box3, Vector3 } from 'three'

const _box = new Box3()

/**
 * The object's bounds in its rest pose.
 *
 * Box3.setFromObject cannot be used here: it prefers `object.boundingBox` when
 * a mesh carries one, and a SkinnedMesh computes that from the current pose —
 * which, before the skeleton has been updated, collapses to almost nothing.
 */
export function restBounds(object) {
  object.updateWorldMatrix(false, true)
  const bounds = new Box3()
  object.traverse((child) => {
    if (!child.isMesh) return
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
    _box.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld)
    bounds.union(_box)
  })
  return bounds
}

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
