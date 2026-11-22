import { describe, expect, it } from 'vitest'
import { crossing, distanceToSegment } from '../src/handtracking/geometry.js'

const p = (x, y) => ({ x, y })

describe('crossing', () => {
  const a = p(0, 0)
  const b = p(100, 0)

  it('finds where a movement passes through a segment, as a fraction along it', () => {
    expect(crossing(p(25, -10), p(25, 10), a, b)).toBeCloseTo(0.25, 5)
  })

  it('is null for a movement that stays on one side', () => {
    expect(crossing(p(25, -10), p(25, -1), a, b)).toBeNull()
  })

  it('is null for a movement that passes beyond the ends', () => {
    expect(crossing(p(120, -10), p(120, 10), a, b)).toBeNull()
  })

  it('is null for no movement at all', () => {
    expect(crossing(p(25, 0), p(25, 0), a, b)).toBeNull()
  })
})

describe('distanceToSegment', () => {
  const a = p(0, 0)
  const b = p(100, 0)

  it('is the perpendicular distance alongside the segment', () => {
    expect(distanceToSegment(p(50, 30), a, b)).toBeCloseTo(30, 5)
  })

  it('is the distance to the nearer end beyond it', () => {
    expect(distanceToSegment(p(130, 40), a, b)).toBeCloseTo(50, 5)
  })
})
