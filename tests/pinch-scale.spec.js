import { describe, expect, it } from 'vitest'
import { createPinchScale, fingerGap } from '../src/xr/pinchScale.js'

/** A hand whose thumb and index tips sit `gap` apart, palm length 0.2. */
function hand(gap) {
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }))
  points[0] = { x: 0.5, y: 0.7 }
  points[5] = { x: 0.5, y: 0.5 }
  points[4] = { x: 0.5, y: 0.3 }
  points[8] = { x: 0.5 + gap, y: 0.3 }
  return points
}

/** Ratio (gap / palm) of 0.1 closed, 2.0 wide. */
const closed = hand(0.02)
const wide = hand(0.4)

const make = () =>
  createPinchScale({
    closeRatio: 0.3,
    openRatio: 0.45,
    maxRatio: 1.5,
    maxScale: 2.5,
    maxSpeed: 3,
  })

/** Moves the fingers to `ratio` over `seconds`, in even steps. */
function move(pinch, from, to, seconds, steps = 6) {
  let last
  for (let i = 1; i <= steps; i += 1) {
    const ratio = from + ((to - from) * i) / steps
    last = pinch.update(hand((ratio * 0.2) / 1), seconds / steps)
  }
  return last
}

describe('fingerGap', () => {
  it('measures the tips apart, scaled by the hand itself', () => {
    expect(fingerGap(hand(0.02))).toBeCloseTo(0.1, 5)
    expect(fingerGap(hand(0.2))).toBeCloseTo(1, 5)
  })
})

describe('createPinchScale', () => {
  it('does nothing until the fingers have met once', () => {
    const pinch = make()

    expect(pinch.update(wide, 0.1)).toMatchObject({ scale: 1 })
  })

  it('grows as the fingers open slowly', () => {
    const pinch = make()
    pinch.update(closed, 0.1)

    expect(move(pinch, 0.1, 1.1, 2).scale).toBeGreaterThan(1.8)
  })

  it('ignores fingers thrown open too fast to be meant', () => {
    const pinch = make()
    pinch.update(closed, 0.1)

    expect(move(pinch, 0.1, 1.4, 0.12).scale).toBe(1)
  })

  it('keeps the size when the fingers are snapped shut', () => {
    const pinch = make()
    pinch.update(closed, 0.1)
    const grown = move(pinch, 0.1, 1.1, 2).scale

    const snapped = move(pinch, 1.1, 0.1, 0.1)

    expect(snapped.scale).toBeCloseTo(grown, 5)
    expect(snapped.closed).toBe(true)
  })

  it('carries on from the size it kept, once moving slowly again', () => {
    const pinch = make()
    pinch.update(closed, 0.1)
    const grown = move(pinch, 0.1, 0.8, 1.5).scale
    move(pinch, 0.8, 0.1, 0.08) // snapped shut, size kept

    // Re-gripping starts from where the fingers now are, at the size they left.
    const after = move(pinch, 0.1, 0.3, 0.8)

    expect(after.scale).toBeGreaterThan(grown)
  })

  it('shrinks back when the fingers close slowly', () => {
    const pinch = make()
    pinch.update(closed, 0.1)
    move(pinch, 0.1, 1.1, 2)

    expect(move(pinch, 1.1, 0.1, 2).scale).toBeCloseTo(1, 1)
  })

  it('stops at the ceiling', () => {
    const pinch = make()
    pinch.update(closed, 0.1)

    expect(move(pinch, 0.1, 1.5, 3).scale).toBe(2.5)
  })

  it('cancels when the hand leaves, and waits to be armed again', () => {
    const pinch = make()
    pinch.update(closed, 0.1)
    move(pinch, 0.1, 1.1, 2)

    expect(pinch.update(null, 0.1)).toMatchObject({ scale: 1 })
    expect(move(pinch, 1.1, 1.2, 1).scale).toBe(1)
  })

  it('reports the fingers as closed for the overlay to colour', () => {
    const pinch = make()

    expect(pinch.update(closed, 0.1).closed).toBe(true)
    expect(move(pinch, 0.1, 1.1, 2).closed).toBe(false)
  })
})
