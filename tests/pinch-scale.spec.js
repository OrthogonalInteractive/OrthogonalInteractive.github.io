import { describe, expect, it } from 'vitest'
import { createPinchScale, fingerGap } from '../src/xr/pinchScale.js'

/** A hand whose thumb and index tips sit `gap` apart, palm length 0.2. */
function hand(gap) {
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }))
  points[0] = { x: 0.5, y: 0.7 } // wrist
  points[5] = { x: 0.5, y: 0.5 } // index knuckle
  points[4] = { x: 0.5, y: 0.3 } // thumb tip
  points[8] = { x: 0.5 + gap, y: 0.3 } // index tip
  return points
}

const closed = hand(0.02) // ratio 0.1
const open = hand(0.1) // ratio 0.5
const wide = hand(0.4) // ratio 2.0

describe('fingerGap', () => {
  it('measures the tips apart, scaled by the hand itself', () => {
    expect(fingerGap(hand(0.02))).toBeCloseTo(0.1, 5)
    expect(fingerGap(hand(0.2))).toBeCloseTo(1, 5)
  })
})

describe('createPinchScale', () => {
  const make = () =>
    createPinchScale({ closeRatio: 0.3, openRatio: 0.45, maxRatio: 1.5, maxScale: 2.5 })

  it('does nothing until the fingers have met once', () => {
    const pinch = make()

    expect(pinch.update(wide)).toEqual({ closed: false, scale: 1 })
  })

  it('takes the closed fingers as its origin', () => {
    const pinch = make()

    expect(pinch.update(closed)).toEqual({ closed: true, scale: 1 })
  })

  it('grows as the fingers open, from the moment they count as apart', () => {
    const pinch = make()
    pinch.update(closed)

    // Just past the open threshold the object is still its own size, so
    // crossing the threshold does not make it jump.
    expect(pinch.update(hand(0.091)).scale).toBeCloseTo(1, 1)
    expect(pinch.update(hand(0.2)).scale).toBeGreaterThan(1.4)
  })

  it('stops growing at the full spread', () => {
    const pinch = make()
    pinch.update(closed)

    expect(pinch.update(hand(0.3)).scale).toBe(2.5)
    expect(pinch.update(hand(0.6)).scale).toBe(2.5)
  })

  it('returns to its own size when the fingers meet again', () => {
    const pinch = make()
    pinch.update(closed)
    pinch.update(wide)

    expect(pinch.update(closed)).toEqual({ closed: true, scale: 1 })
    // Still armed, so the next opening grows it again.
    expect(pinch.update(wide).scale).toBe(2.5)
  })

  it('holds its state between the two thresholds', () => {
    const pinch = make()
    const between = hand(0.075) // ratio 0.375

    pinch.update(closed)
    expect(pinch.update(between).closed).toBe(true)
    pinch.update(wide)
    expect(pinch.update(between).closed).toBe(false)
  })

  it('cancels when the hand leaves, and waits to be armed again', () => {
    const pinch = make()
    pinch.update(closed)
    pinch.update(wide)

    expect(pinch.update(null)).toEqual({ closed: false, scale: 1 })
    expect(pinch.update(wide)).toEqual({ closed: false, scale: 1 })
  })
})
