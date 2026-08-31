import { describe, expect, it } from 'vitest'
import { swirlAngle } from '../src/xr/swirl.js'

const centre = { x: 100, y: 100 }

describe('swirlAngle', () => {
  it('measures the angle swept around the centre', () => {
    // From straight above the centre, an eighth of a turn round it.
    const r = 100
    const to = { x: 100 + r * Math.SQRT1_2, y: 100 - r * Math.SQRT1_2 }

    expect(Math.abs(swirlAngle({ x: 100, y: 0 }, to, centre))).toBeCloseTo(Math.PI / 4, 5)
  })

  it('reverses when the finger goes the other way', () => {
    const a = { x: 100, y: 0 }
    const b = { x: 100 + 100 * Math.SQRT1_2, y: 100 - 100 * Math.SQRT1_2 }

    expect(swirlAngle(a, b, centre)).toBeCloseTo(-swirlAngle(b, a, centre), 5)
  })

  it('ignores a stroke that only moves toward the centre', () => {
    const swept = swirlAngle({ x: 200, y: 100 }, { x: 150, y: 100 }, centre)

    expect(swept).toBeCloseTo(0, 5)
  })

  it('discards the half turn a stroke through the middle reports', () => {
    // Crossing the centre flips the bearing by π. That is the geometry being
    // degenerate, not a gesture, so it must not spin the object at all.
    const swept = swirlAngle({ x: 60, y: 100 }, { x: 140, y: 100 }, centre)

    expect(swept).toBe(0)
  })

  it('gives nothing without two points and a centre', () => {
    expect(swirlAngle(null, { x: 1, y: 1 }, centre)).toBe(0)
    expect(swirlAngle({ x: 1, y: 1 }, null, centre)).toBe(0)
    expect(swirlAngle({ x: 1, y: 1 }, { x: 2, y: 2 }, null)).toBe(0)
  })
})
