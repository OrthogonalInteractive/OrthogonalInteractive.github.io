import { describe, expect, it } from 'vitest'
import { createEmergence } from '../src/xr/emerge.js'

const make = () => createEmergence({ from: -0.5, to: 0.4, duration: 1 })

describe('createEmergence', () => {
  it('sits at its resting height until asked to rise', () => {
    const rise = make()

    expect(rise.update(0.5)).toBe(0.4)
    expect(rise.done).toBe(true)
  })

  it('starts from below the card and arrives at the hover height', () => {
    const rise = make()
    rise.start()

    expect(rise.update(0)).toBe(-0.5)
    expect(rise.update(1)).toBeCloseTo(0.4, 6)
    expect(rise.done).toBe(true)
  })

  it('only ever climbs', () => {
    const rise = make()
    rise.start()
    let previous = -Infinity

    for (let i = 0; i < 60; i += 1) {
      const height = rise.update(1 / 60)
      expect(height).toBeGreaterThanOrEqual(previous)
      previous = height
    }
  })

  it('eases out, covering most of the way early', () => {
    const rise = make()
    rise.start()

    const halfway = rise.update(0.5)

    expect(halfway).toBeGreaterThan(-0.5 + 0.9 * 0.5)
  })

  it('holds at the top however long it runs', () => {
    const rise = make()
    rise.start()
    rise.update(5)

    expect(rise.update(5)).toBeCloseTo(0.4, 6)
  })
})
