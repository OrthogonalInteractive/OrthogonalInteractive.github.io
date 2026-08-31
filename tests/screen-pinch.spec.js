import { describe, expect, it } from 'vitest'
import { createScreenPinch } from '../src/xr/screenPinch.js'

const at = (x, y) => ({ x, y })

describe('createScreenPinch', () => {
  const make = () => createScreenPinch({ max: 2.5 })

  it('starts at the model own size', () => {
    expect(make().scale).toBe(1)
  })

  it('grows in proportion to the fingers spreading', () => {
    const pinch = make()
    pinch.begin(at(0, 0), at(100, 0))

    expect(pinch.update(at(0, 0), at(200, 0))).toBeCloseTo(2, 5)
  })

  it('will not shrink below the model own size', () => {
    const pinch = make()
    pinch.begin(at(0, 0), at(200, 0))

    expect(pinch.update(at(0, 0), at(50, 0))).toBe(1)
  })

  it('stops at the ceiling', () => {
    const pinch = make()
    pinch.begin(at(0, 0), at(100, 0))

    expect(pinch.update(at(0, 0), at(900, 0))).toBe(2.5)
  })

  it('picks up where the last gesture left off', () => {
    const pinch = make()
    pinch.begin(at(0, 0), at(100, 0))
    pinch.update(at(0, 0), at(200, 0))
    pinch.end()

    pinch.begin(at(0, 0), at(100, 0))

    expect(pinch.update(at(0, 0), at(120, 0))).toBeCloseTo(2.4, 5)
  })

  it('keeps the size after the fingers lift', () => {
    const pinch = make()
    pinch.begin(at(0, 0), at(100, 0))
    pinch.update(at(0, 0), at(150, 0))

    pinch.end()

    expect(pinch.scale).toBeCloseTo(1.5, 5)
  })

  it('ignores a gesture that begins with the fingers together', () => {
    const pinch = make()
    pinch.begin(at(10, 10), at(10, 10))

    expect(pinch.update(at(0, 0), at(300, 0))).toBe(1)
  })

  it('goes back to the model own size when reset', () => {
    const pinch = make()
    pinch.begin(at(0, 0), at(100, 0))
    pinch.update(at(0, 0), at(200, 0))

    pinch.reset()

    expect(pinch.scale).toBe(1)
  })
})
