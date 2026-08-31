import { describe, expect, it } from 'vitest'
import { createStrokeTracker } from '../src/xr/stroke.js'

const at = (x, y) => ({ x, y })

describe('createStrokeTracker', () => {
  it('gives nothing on the frame the finger lands', () => {
    const stroke = createStrokeTracker()

    // There is no previous position yet, and inventing one would fling the
    // object the moment a finger appears.
    expect(stroke.update({ point: at(10, 10), touching: true })).toMatchObject({
      dx: 0,
      dy: 0,
      from: null,
    })
  })

  it('measures the movement between consecutive touching frames', () => {
    const stroke = createStrokeTracker()
    stroke.update({ point: at(10, 10), touching: true })

    expect(stroke.update({ point: at(25, 4), touching: true })).toEqual({
      dx: 15,
      dy: -6,
      from: at(10, 10),
      to: at(25, 4),
    })
  })

  it('stops once the finger leaves the object', () => {
    const stroke = createStrokeTracker()
    stroke.update({ point: at(10, 10), touching: true })

    expect(stroke.update({ point: at(40, 10), touching: false })).toMatchObject({ dx: 0, dy: 0 })
  })

  it('does not jump when the finger comes back somewhere else', () => {
    const stroke = createStrokeTracker()
    stroke.update({ point: at(10, 10), touching: true })
    stroke.update({ point: at(10, 10), touching: false })

    expect(stroke.update({ point: at(300, 300), touching: true })).toMatchObject({ dx: 0, dy: 0 })
  })

  it('treats a lost hand as a lifted finger', () => {
    const stroke = createStrokeTracker()
    stroke.update({ point: at(10, 10), touching: true })

    expect(stroke.update({ point: null, touching: false })).toMatchObject({ dx: 0, dy: 0 })
    expect(stroke.update({ point: at(20, 10), touching: true })).toMatchObject({ dx: 0, dy: 0 })
  })
})
