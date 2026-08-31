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

  it('lifts the model so its underside clears the card', () => {
    const hover = 0.1
    const { scale, z } = fitToMarker(box, { width: 1.1, hover })

    // Model Y becomes marker Z once the glTF frame is rotated upright.
    expect(z + box.min.y * scale).toBeCloseTo(hover, 5)
  })

  it('reports the radius the footprint occupies', () => {
    const { radius, scale } = fitToMarker(box, { width: 1.1, hover: 0.1 })

    expect(radius).toBeCloseTo(((box.max.x - box.min.x) * scale) / 2, 5)
  })

  it('is unfazed by a model that is taller than it is wide', () => {
    const tall = new THREE.Box3(
      new THREE.Vector3(-0.1, -2, -0.1),
      new THREE.Vector3(0.1, 2, 0.1),
    )

    const { scale, z } = fitToMarker(tall, { width: 1, hover: 0.05 })

    expect(0.2 * scale).toBeCloseTo(1, 5)
    expect(z).toBeGreaterThan(0)
  })
})
