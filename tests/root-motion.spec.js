import { describe, expect, it } from 'vitest'
import { horizontalSpread, pinHorizontal } from '../src/xr/rootMotion.js'

// A position track is a flat run of x, y, z per key.
describe('horizontalSpread', () => {
  it('measures how far the track wanders across the ground', () => {
    expect(horizontalSpread([0, 0, 0, 3, 9, 4])).toBeCloseTo(5)
  })

  it('ignores height', () => {
    expect(horizontalSpread([0, 0, 0, 0, 80, 0])).toBe(0)
  })

  it('has nothing to measure in an empty track', () => {
    expect(horizontalSpread([])).toBe(0)
  })
})

describe('pinHorizontal', () => {
  it('holds the track where it started, and leaves the height alone', () => {
    expect(pinHorizontal([1, 0, 2, 40, 80, 50, 90, 10, 70]))
      .toEqual([1, 0, 2, 1, 80, 2, 1, 10, 2])
  })

  it('leaves a track that never moved as it was', () => {
    expect(pinHorizontal([1, 5, 2, 1, 6, 2])).toEqual([1, 5, 2, 1, 6, 2])
  })

  it('does not fall over on an empty track', () => {
    expect(pinHorizontal([])).toEqual([])
  })
})
