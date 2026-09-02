import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { fitToMarker, restBounds } from '../src/xr/fit.js'

// The model as exported: a sleeping cat lying flat, Y up, centred on origin.
const box = new THREE.Box3(
  new THREE.Vector3(-0.952, -0.404, -0.749),
  new THREE.Vector3(0.95, 0.396, 0.747),
)

describe('restBounds', () => {
  it('measures the geometry, not a mesh that claims its own bounds', () => {
    // three's Box3.setFromObject prefers object.boundingBox when a mesh has
    // one — as a SkinnedMesh does — and a SkinnedMesh computes that from the
    // current pose. Read before the skeleton is updated, that collapses.
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 1.7, 3))
    mesh.boundingBox = new THREE.Box3(
      new THREE.Vector3(-0.1, -0.1, -0.1),
      new THREE.Vector3(0.1, 0.1, 0.1),
    )
    const root = new THREE.Group()
    root.add(mesh)

    const size = new THREE.Vector3()
    restBounds(root).getSize(size)

    expect(size.x).toBeCloseTo(4, 5)
    expect(size.y).toBeCloseTo(1.7, 5)
    expect(size.z).toBeCloseTo(3, 5)
  })

  it('follows the transform placed on the root', () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 3))
    const root = new THREE.Group()
    root.add(mesh)
    root.rotation.x = Math.PI / 2

    const size = new THREE.Vector3()
    restBounds(root).getSize(size)

    // A quarter turn about X swaps the vertical and depth extents.
    expect(size.y).toBeCloseTo(3, 5)
    expect(size.z).toBeCloseTo(1, 5)
  })
})

describe('fitToMarker', () => {
  it('scales the longest footprint edge to the requested width', () => {
    const { scale } = fitToMarker(box, { width: 1.1, hover: 0 })

    expect((box.max.x - box.min.x) * scale).toBeCloseTo(1.1, 5)
  })

  it('measures the footprint across the card, never up it', () => {
    // Taller than it is wide, in the glTF's own frame: the height is Y, and
    // mistaking it for a footprint fits a standing model by how tall it is.
    const standing = new THREE.Box3(
      new THREE.Vector3(-0.3, 0, -0.16),
      new THREE.Vector3(0.3, 1.7, 0.16),
    )

    const { scale } = fitToMarker(standing, { width: 1.5, hover: 0 })

    expect(0.6 * scale).toBeCloseTo(1.5, 5)
    expect(1.7 * scale).toBeCloseTo(4.25, 2) // stands well clear of the card
  })

  it('lifts the model so its underside clears the card', () => {
    const hover = 0.1
    const { scale, z } = fitToMarker(box, { width: 1.1, hover })

    // Model Y becomes marker Z once the glTF frame is rotated upright.
    expect(z + box.min.y * scale).toBeCloseTo(hover, 5)
  })

  it('rests a model already sitting at zero on the hover gap alone', () => {
    const standing = new THREE.Box3(
      new THREE.Vector3(-0.3, 0, -0.16),
      new THREE.Vector3(0.3, 1.7, 0.16),
    )

    expect(fitToMarker(standing, { width: 1.5, hover: 0.12 }).z).toBeCloseTo(0.12, 5)
  })

  it('reports the radius the footprint occupies', () => {
    const { radius, scale } = fitToMarker(box, { width: 1.1, hover: 0.1 })

    expect(radius).toBeCloseTo(((box.max.x - box.min.x) * scale) / 2, 5)
  })
})

describe('restBounds on a skinned mesh', () => {
  // `boneInverse` stands in for the file's inverse bind matrix, which is not
  // simply the joint's transform undone when the rig and the mesh were authored
  // at different scales — a centimetre rig on a metre mesh, as exports do.
  const rig = ({ boneInverse = new THREE.Matrix4(), nodeScale = 1 } = {}) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3),
    )
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0], 4))
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0], 4))

    const bone = new THREE.Bone()
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial())
    const root = new THREE.Group()
    root.scale.setScalar(nodeScale)
    root.add(mesh)
    root.add(bone)
    root.updateMatrixWorld(true)
    mesh.bind(new THREE.Skeleton([bone], [boneInverse]), mesh.matrixWorld)
    return root
  }

  const heightOf = (object) => {
    const size = new THREE.Vector3()
    restBounds(object).getSize(size)
    return size.y
  }

  it('measures a plain rig the way it is drawn', () => {
    expect(heightOf(rig())).toBeCloseTo(1, 5)
  })

  it('follows the skeleton rather than the geometry', () => {
    const boneInverse = new THREE.Matrix4().makeScale(2, 2, 2)
    expect(heightOf(rig({ boneInverse }))).toBeCloseTo(2, 5)
  })

  it('brings the matrices up to date itself', () => {
    // A skinned mesh keeps a bind matrix inverse that only updateMatrixWorld
    // refreshes, so nothing here may depend on the caller having done it.
    const rigged = rig({ boneInverse: new THREE.Matrix4().makeScale(2, 2, 2) })
    rigged.scale.setScalar(3)
    expect(heightOf(rigged)).toBeCloseTo(6, 5)
  })

})
