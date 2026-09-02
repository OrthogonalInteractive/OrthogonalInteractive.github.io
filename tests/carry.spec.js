import { describe, expect, it } from 'vitest'
import { createCarry } from '../src/xr2/carry.js'

const run = (carry, seconds, step = 1 / 60) => {
  let last
  for (let t = 0; t < seconds; t += step) last = carry.update(step)
  return last
}

// Distances are in mark widths: the group this drives sits inside the anchor,
// which is scaled to the printed mark.
describe('createCarry', () => {
  it('rests on the plane at the origin until something picks it up', () => {
    const carry = createCarry()
    expect(carry.held).toBe(false)
    expect(run(carry, 1)).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('sticks to the point it was grabbed at, without waiting to slide there', () => {
    const carry = createCarry()
    carry.grab({ x: 2, y: -3 })
    const first = carry.update(1 / 60)
    expect(first.x).toBeCloseTo(2)
    expect(first.y).toBeCloseTo(-3)
    expect(carry.held).toBe(true)
  })

  it('climbs to the carrying height while it is held', () => {
    const carry = createCarry({ lift: 1.2 })
    carry.grab({ x: 0, y: 0 })
    expect(run(carry, 1).z).toBeCloseTo(1.2, 2)
  })

  it('follows a moving finger rather than snapping to it', () => {
    const carry = createCarry()
    carry.grab({ x: 0, y: 0 })
    carry.moveTo({ x: 4, y: 0 })
    const midway = carry.update(1 / 60)
    expect(midway.x).toBeGreaterThan(0)
    expect(midway.x).toBeLessThan(4)
    expect(run(carry, 1).x).toBeCloseTo(4, 2)
  })

  it('falls back to the plane when released, and stops on it', () => {
    const carry = createCarry({ lift: 1.2 })
    carry.grab({ x: 0, y: 0 })
    run(carry, 1)
    carry.release()
    expect(carry.held).toBe(false)
    const landed = run(carry, 2)
    expect(landed.z).toBe(0)
  })

  it('never sinks below the plane on the way down', () => {
    const carry = createCarry({ lift: 1.2 })
    carry.grab({ x: 0, y: 0 })
    run(carry, 1)
    carry.release()
    for (let i = 0; i < 240; i += 1) {
      expect(carry.update(1 / 60).z).toBeGreaterThanOrEqual(0)
    }
  })

  it('stays where it was dropped', () => {
    const carry = createCarry()
    carry.grab({ x: 5, y: 7 })
    run(carry, 1)
    carry.release()
    const landed = run(carry, 2)
    expect(landed.x).toBeCloseTo(5, 2)
    expect(landed.y).toBeCloseTo(7, 2)
  })

  it('ignores a finger that has already let go', () => {
    const carry = createCarry()
    carry.grab({ x: 1, y: 1 })
    run(carry, 1)
    carry.release()
    carry.moveTo({ x: 9, y: 9 })
    const after = run(carry, 1)
    expect(after.x).toBeCloseTo(1, 2)
    expect(after.y).toBeCloseTo(1, 2)
  })
})
