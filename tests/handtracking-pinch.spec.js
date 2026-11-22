import { describe, expect, it } from 'vitest'
import { createPinchTracker, pinchPoint } from '../src/handtracking/pinch.js'

// A hand whose span (wrist to index knuckle) is 0.2 and whose thumb and index
// tips sit `gap` apart, centred on (cx, cy).
const hand = (gap, cx = 0.5, cy = 0.5) => {
  const points = Array.from({ length: 21 }, () => ({ x: cx, y: cy, z: 0 }))
  points[0] = { x: cx, y: cy + 0.2, z: 0 }
  points[5] = { x: cx, y: cy, z: 0 }
  points[4] = { x: cx - gap / 2, y: cy, z: 0 }
  points[8] = { x: cx + gap / 2, y: cy, z: 0 }
  return points
}

describe('pinchPoint', () => {
  it('is midway between the thumb and index tips', () => {
    expect(pinchPoint(hand(0.1, 0.3, 0.4))).toEqual({ x: 0.3, y: 0.4 })
  })
})

describe('createPinchTracker', () => {
  it('reports a hand as pinched once the tips close', () => {
    const tracker = createPinchTracker()
    const [h] = tracker.update([{ side: 'Left', landmarks: hand(0.02) }])
    expect(h.pinched).toBe(true)
  })

  it('reports an open hand as not pinched', () => {
    const tracker = createPinchTracker()
    const [h] = tracker.update([{ side: 'Left', landmarks: hand(0.15) }])
    expect(h.pinched).toBe(false)
  })

  it('holds a pinch while the gap hovers between the thresholds', () => {
    const tracker = createPinchTracker()
    tracker.update([{ side: 'Left', landmarks: hand(0.02) }])
    const [h] = tracker.update([{ side: 'Left', landmarks: hand(0.08) }])
    expect(h.pinched).toBe(true)
  })

  it('does not start a pinch in the hover band', () => {
    const tracker = createPinchTracker()
    const [h] = tracker.update([{ side: 'Left', landmarks: hand(0.08) }])
    expect(h.pinched).toBe(false)
  })

  it('keeps each hand state separate', () => {
    const tracker = createPinchTracker()
    tracker.update([{ side: 'Left', landmarks: hand(0.02) }])
    const [, right] = tracker.update([
      { side: 'Left', landmarks: hand(0.08) },
      { side: 'Right', landmarks: hand(0.08) },
    ])
    expect(right.pinched).toBe(false)
  })

  it('forgets a hand that leaves the frame', () => {
    const tracker = createPinchTracker()
    tracker.update([{ side: 'Left', landmarks: hand(0.02) }])
    tracker.update([])
    const [h] = tracker.update([{ side: 'Left', landmarks: hand(0.08) }])
    expect(h.pinched).toBe(false)
  })
})
