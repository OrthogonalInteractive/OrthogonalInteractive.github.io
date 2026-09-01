import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createPoseSmoother } from '../src/xr/poseSmoother.js'

const matrixAt = (x, angle = 0) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, 0, 0),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle),
    new THREE.Vector3(1, 1, 1),
  )

const xOf = (m) => new THREE.Vector3().setFromMatrixPosition(m).x

describe('createPoseSmoother', () => {
  it('snaps straight onto the first pose it is given', () => {
    const smoother = createPoseSmoother({ rate: 10 })

    expect(xOf(smoother.follow(matrixAt(5), 1 / 60))).toBeCloseTo(5, 6)
  })

  it('eases toward a pose that jumps, rather than following it', () => {
    const smoother = createPoseSmoother({ rate: 10 })
    smoother.follow(matrixAt(0), 1 / 60)

    const after = xOf(smoother.follow(matrixAt(10), 1 / 60))

    // The tracker's step is what makes the object judder, so most of a single
    // jump has to be absorbed.
    expect(after).toBeGreaterThan(0)
    expect(after).toBeLessThan(2)
  })

  it('arrives once the pose holds still', () => {
    const smoother = createPoseSmoother({ rate: 10 })
    smoother.follow(matrixAt(0), 1 / 60)
    for (let i = 0; i < 120; i += 1) smoother.follow(matrixAt(10), 1 / 60)

    expect(xOf(smoother.follow(matrixAt(10), 1 / 60))).toBeCloseTo(10, 3)
  })

  it('covers the same ground however the frames are cut', () => {
    const fast = createPoseSmoother({ rate: 10 })
    const slow = createPoseSmoother({ rate: 10 })
    fast.follow(matrixAt(0), 1 / 60)
    slow.follow(matrixAt(0), 1 / 60)

    for (let i = 0; i < 60; i += 1) fast.follow(matrixAt(10), 1 / 60)
    for (let i = 0; i < 20; i += 1) slow.follow(matrixAt(10), 1 / 20)

    // One second of smoothing, whether it arrived in 60 frames or 20.
    expect(xOf(fast.result)).toBeCloseTo(xOf(slow.result), 3)
  })

  it('turns the short way round', () => {
    const smoother = createPoseSmoother({ rate: 10 })
    smoother.follow(matrixAt(0, -3.0), 1 / 60)
    for (let i = 0; i < 240; i += 1) smoother.follow(matrixAt(0, 3.0), 1 / 60)

    const q = new THREE.Quaternion().setFromRotationMatrix(smoother.result)
    const target = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 3.0)
    expect(q.angleTo(target)).toBeCloseTo(0, 3)
  })

  it('snaps again after being told the object went away', () => {
    const smoother = createPoseSmoother({ rate: 10 })
    smoother.follow(matrixAt(0), 1 / 60)

    smoother.reset()

    expect(xOf(smoother.follow(matrixAt(9), 1 / 60))).toBeCloseTo(9, 6)
  })
})
