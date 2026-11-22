import { describe, expect, it } from 'vitest'
import { displacement } from '../src/handtracking/vibration.js'

const pluck = { at: 0.25, strength: 1 }

describe('displacement', () => {
  it('holds the ends still', () => {
    expect(displacement(0, pluck, 0.1)).toBeCloseTo(0, 5)
    expect(displacement(1, pluck, 0.1)).toBeCloseTo(0, 5)
  })

  it('starts pulled furthest where it was plucked', () => {
    const peak = Math.abs(displacement(0.25, pluck, 0))
    for (const s of [0.1, 0.5, 0.9]) expect(Math.abs(displacement(s, pluck, 0))).toBeLessThan(peak)
  })

  it('plays out harder for a harder pluck', () => {
    expect(Math.abs(displacement(0.25, { at: 0.25, strength: 0.3 }, 0))).toBeLessThan(
      Math.abs(displacement(0.25, pluck, 0)),
    )
  })

  it('settles', () => {
    expect(Math.abs(displacement(0.25, pluck, 3))).toBeLessThan(0.01)
  })
})
