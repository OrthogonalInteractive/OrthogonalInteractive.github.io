import { Object3D, PerspectiveCamera, Plane, Vector3 } from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import { createReach } from '../src/xr/reach.js'

const VIEWPORT = { width: 100, height: 100 }

// Mirrors the page: the card lies in the world's XZ plane, and the frame the
// model hangs off is laid back a quarter turn so its own +Z is the card's
// normal.
let camera
let frame
let card
let reach

beforeEach(() => {
  camera = new PerspectiveCamera(60, 1, 0.1, 100)
  // Off to one side: looking straight down leaves lookAt's basis degenerate
  // against the default up vector, and the arithmetic loses its last digits.
  camera.position.set(0, 2, 1.5)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
  frame = new Object3D()
  frame.rotation.x = -Math.PI / 2
  frame.updateMatrixWorld(true)
  card = new Plane(new Vector3(0, 1, 0), 0)
  reach = createReach()
})

const at = (point, height = 0, unit = 1) =>
  reach.at(point, { camera, frame, card, height, unit, viewport: VIEWPORT })

describe('createReach', () => {
  it('puts the middle of the screen on the middle of the card', () => {
    const point = at({ x: 50, y: 50 })
    expect(point.x).toBeCloseTo(0, 5)
    expect(point.y).toBeCloseTo(0, 5)
  })

  it('reads across the card in the frame it is measured in', () => {
    expect(at({ x: 75, y: 50 }).x).toBeGreaterThan(0)
    expect(at({ x: 25, y: 50 }).x).toBeLessThan(0)
  })

  it('meets a raised plane sooner, so the same finger reaches less far', () => {
    const onCard = at({ x: 75, y: 50 }).x
    const raised = at({ x: 75, y: 50 }, 1).x
    expect(raised).toBeGreaterThan(0)
    expect(raised).toBeLessThan(onCard)
  })

  it('measures the height in mark widths, not in world units', () => {
    const one = at({ x: 75, y: 50 }, 2, 1).x
    const other = at({ x: 75, y: 50 }, 1, 2).x
    expect(one).toBeCloseTo(other, 6)
  })

  it('gives nothing back when the look never meets the plane', () => {
    camera.position.set(0, 2, 0)
    camera.lookAt(0, 2, -1) // level with the plane, looking along it
    camera.updateMatrixWorld(true)
    expect(at({ x: 50, y: 50 })).toBeNull()
  })
})
