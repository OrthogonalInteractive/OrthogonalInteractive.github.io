import { describe, expect, it } from 'vitest'
import { LANDMARK, createPinchTracker, pinchRatio, twistAngle } from '../src/xr/pinch.js'

/**
 * Builds the handful of landmarks the reader looks at. `gap` is the thumb/index
 * separation and `angle` the roll of the knuckle line, both in the normalised
 * image space MediaPipe reports.
 */
function hand({ gap = 0.2, angle = 0 } = {}) {
  const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  points[LANDMARK.WRIST] = { x: 0.5, y: 0.7, z: 0 }
  points[LANDMARK.INDEX_MCP] = { x: 0.5, y: 0.5, z: 0 }
  points[LANDMARK.PINKY_MCP] = {
    x: 0.5 + 0.2 * Math.cos(angle),
    y: 0.5 + 0.2 * Math.sin(angle),
    z: 0,
  }
  points[LANDMARK.THUMB_TIP] = { x: 0.5, y: 0.3, z: 0 }
  points[LANDMARK.INDEX_TIP] = { x: 0.5 + gap, y: 0.3, z: 0 }
  return points
}

describe('pinchRatio', () => {
  it('shrinks as the fingertips close, scaled by the hand itself', () => {
    // Normalising by the wrist-to-knuckle span keeps the measure usable
    // whether the hand is near the lens or far from it.
    expect(pinchRatio(hand({ gap: 0.02 }))).toBeLessThan(0.2)
    expect(pinchRatio(hand({ gap: 0.4 }))).toBeGreaterThan(1)
  })
})

describe('twistAngle', () => {
  it('follows the knuckle line', () => {
    expect(twistAngle(hand({ angle: 0 }))).toBeCloseTo(0, 5)
    expect(twistAngle(hand({ angle: Math.PI / 3 }))).toBeCloseTo(Math.PI / 3, 5)
  })
})

describe('createPinchTracker', () => {
  const closed = hand({ gap: 0.02 })
  const open = hand({ gap: 0.4 })

  it('reports the grab once, not on every frame', () => {
    const tracker = createPinchTracker()

    expect(tracker.update(open).pinching).toBe(false)
    const first = tracker.update(closed)
    expect(first.pinching).toBe(true)
    expect(first.justGrabbed).toBe(true)
    expect(tracker.update(closed).justGrabbed).toBe(false)
  })

  it('holds its state through the gap between thresholds', () => {
    const tracker = createPinchTracker({ onRatio: 0.4, offRatio: 0.7 })
    const ambiguous = hand({ gap: 0.11 }) // ratio ~0.55, between the thresholds

    expect(tracker.update(ambiguous).pinching).toBe(false)
    tracker.update(closed)
    expect(tracker.update(ambiguous).pinching).toBe(true)
  })

  it('measures twist from the angle at which the grab started', () => {
    const tracker = createPinchTracker()
    tracker.update(hand({ gap: 0.02, angle: 1 }))

    const turned = tracker.update(hand({ gap: 0.02, angle: 1.4 }))

    expect(turned.twist).toBeCloseTo(0.4, 5)
  })

  it('takes the short way round when the knuckle line crosses ±π', () => {
    const tracker = createPinchTracker()
    tracker.update(hand({ gap: 0.02, angle: Math.PI - 0.1 }))

    const turned = tracker.update(hand({ gap: 0.02, angle: -Math.PI + 0.1 }))

    expect(turned.twist).toBeCloseTo(0.2, 5)
  })

  it('releases when the hand leaves the frame', () => {
    const tracker = createPinchTracker()
    tracker.update(closed)

    const gone = tracker.update(null)

    expect(gone.pinching).toBe(false)
    expect(gone.justReleased).toBe(true)
  })
})
