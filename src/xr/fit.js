import { Box3, Vector3 } from 'three'

const _box = new Box3()
const _point = new Vector3()

/**
 * The object's bounds in its rest pose, as it will actually be drawn.
 *
 * Box3.setFromObject cannot be used here: it prefers `object.boundingBox` when
 * a mesh carries one, and a SkinnedMesh computes that from the current pose —
 * which, before the skeleton has been updated, collapses to almost nothing.
 *
 * Nor can a skinned mesh be measured through its own world matrix. glTF says
 * the node transform of a skinned mesh is ignored and the joints place the
 * vertices, so a rig whose armature carries a scale — as an export from a
 * centimetre-authored rig does — reports a size nobody ever sees. Pushing the
 * vertices through the skeleton is the only measurement that agrees with the
 * renderer.
 */
export function restBounds(object) {
  object.updateWorldMatrix(false, true)
  const bounds = new Box3()
  object.traverse((child) => {
    if (!child.isMesh) return

    if (child.isSkinnedMesh) {
      const position = child.geometry.attributes.position
      for (let i = 0; i < position.count; i += 1) {
        _point.fromBufferAttribute(position, i)
        child.applyBoneTransform(i, _point)
        bounds.expandByPoint(_point.applyMatrix4(child.matrixWorld))
      }
      return
    }

    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
    _box.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld)
    bounds.union(_box)
  })
  return bounds
}

/**
 * Works out how to sit an imported model on the tracked mark.
 *
 * An anchor spans one unit across the target's width. The box arrives in the
 * mark's own frame — already stood upright, so Z is the height and X and Y are
 * what rests on the card. Taking the footprint across X and Z instead mistakes
 * a standing model's height for its width and fits it by how tall it is.
 */
export function fitToMarker(box, { width, hover }) {
  const size = new Vector3()
  box.getSize(size)
  const footprint = Math.max(size.x, size.y) || 1
  const scale = width / footprint

  return {
    scale,
    // Raise the underside to the hover gap.
    z: hover - box.min.z * scale,
    radius: (Math.max(size.x, size.y) * scale) / 2,
  }
}
