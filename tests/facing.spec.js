import { describe, expect, it } from 'vitest'
import { headingToward } from '../src/xr2/facing.js'

// Laying a Y-up model onto the card puts its front along the group's -Y, and
// the heading turns it from there within the card's plane.
describe('headingToward', () => {
  it('leaves a model that already faces the point alone', () => {
    expect(headingToward({ x: 0, y: -1 })).toBeCloseTo(0)
  })

  it('turns it right round for a point behind it', () => {
    expect(Math.abs(headingToward({ x: 0, y: 1 }))).toBeCloseTo(180)
  })

  it('turns a quarter each way for a point to either side', () => {
    expect(headingToward({ x: 1, y: 0 })).toBeCloseTo(90)
    expect(headingToward({ x: -1, y: 0 })).toBeCloseTo(-90)
  })

  it('splits the difference for a point between two', () => {
    expect(headingToward({ x: 1, y: -1 })).toBeCloseTo(45)
  })

  it('does not turn towards nowhere', () => {
    expect(headingToward({ x: 0, y: 0 })).toBe(0)
  })

  it('cares about the direction, not how far away it is', () => {
    expect(headingToward({ x: 30, y: -30 })).toBeCloseTo(headingToward({ x: 1, y: -1 }))
  })
})
