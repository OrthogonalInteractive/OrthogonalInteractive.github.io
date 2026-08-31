import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { fingertip, isTouching, landmarkToScreen, screenCircle } from '../src/xr/contact.js'

// MindAR scales the camera feed to cover the viewport, so the video box usually
// hangs outside it. Landmarks are normalised to that box, not to the screen.
const rect = { left: -100, top: 0, width: 600, height: 400 }

describe('landmarkToScreen', () => {
  it('maps through the displayed video box, overhang included', () => {
    expect(landmarkToScreen({ x: 0.5, y: 0.5 }, rect)).toEqual({ x: 200, y: 200 })
    expect(landmarkToScreen({ x: 0, y: 0 }, rect)).toEqual({ x: -100, y: 0 })
  })
})

describe('fingertip', () => {
  it('reads the index tip alone', () => {
    const landmarks = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }))
    landmarks[8] = { x: 0.5, y: 0.25 }

    expect(fingertip(landmarks, rect)).toEqual({ x: 200, y: 100 })
  })
})

describe('screenCircle', () => {
  const size = { width: 400, height: 800 }

  function sceneWith(z) {
    const camera = new THREE.PerspectiveCamera(50, size.width / size.height, 0.1, 100)
    camera.position.set(0, 0, 0)
    camera.updateMatrixWorld(true)
    const object = new THREE.Object3D()
    object.position.set(0, 0, -z)
    object.updateMatrixWorld(true)
    return { camera, object }
  }

  it('puts an object on the view axis at the centre of the screen', () => {
    const { camera, object } = sceneWith(2)

    const circle = screenCircle(object, camera, 0.3, size)

    expect(circle.x).toBeCloseTo(200, 0)
    expect(circle.y).toBeCloseTo(400, 0)
  })

  it('grows as the object comes closer', () => {
    const near = sceneWith(1)
    const far = sceneWith(4)

    expect(screenCircle(near.object, near.camera, 0.3, size).r).toBeGreaterThan(
      screenCircle(far.object, far.camera, 0.3, size).r,
    )
  })

  it('reports nothing for an object behind the camera', () => {
    const camera = new THREE.PerspectiveCamera(50, 0.5, 0.1, 100)
    camera.updateMatrixWorld(true)
    const object = new THREE.Object3D()
    object.position.set(0, 0, 3) // behind: the camera looks down -z
    object.updateMatrixWorld(true)

    expect(screenCircle(object, camera, 0.3, size)).toBeNull()
  })
})

describe('isTouching', () => {
  const circle = { x: 100, y: 100, r: 40 }

  it('accepts a point inside the object, with a little slack', () => {
    expect(isTouching({ x: 100, y: 100 }, circle)).toBe(true)
    expect(isTouching({ x: 145, y: 100 }, circle)).toBe(true)
  })

  it('rejects a point clearly away from it', () => {
    expect(isTouching({ x: 200, y: 100 }, circle)).toBe(false)
  })

  it('is false when there is nothing to touch', () => {
    expect(isTouching({ x: 0, y: 0 }, null)).toBe(false)
    expect(isTouching(null, circle)).toBe(false)
  })
})
