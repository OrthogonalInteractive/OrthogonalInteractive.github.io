import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { fitToMarker } from '../src/xr/fit.js'

// The model as exported: a sleeping cat lying flat, Y up, centred on origin.
const box = new THREE.Box3(
  new THREE.Vector3(-0.952, -0.404, -0.749),
  new THREE.Vector3(0.95, 0.396, 0.747),
)

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
