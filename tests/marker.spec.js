import { describe, expect, it } from 'vitest'
import { markerSpan, spanToScale } from '../src/xr/marker.js'

// 8th Wall reports scaledWidth/scaledHeight as ratios that only become a
// length once multiplied by scale, so the product is the mark's real span.
describe('markerSpan', () => {
  it('multiplies the reported ratio by the scale factor', () => {
    expect(markerSpan({ scaledWidth: 1, scale: 0.1 }, 0.024)).toBeCloseTo(0.1)
    expect(markerSpan({ scaledWidth: 0.75, scale: 0.4 }, 0.024)).toBeCloseTo(0.3)
  })

  it('takes the longer of the two sides, whichever way the target is rotated', () => {
    expect(markerSpan({ scaledWidth: 0.75, scaledHeight: 1, scale: 0.4 }, 0.024))
      .toBeCloseTo(0.4)
  })

  it('falls back to the declared width when the engine reports nothing usable', () => {
    expect(markerSpan({}, 0.024)).toBeCloseTo(0.024)
    expect(markerSpan({ scaledWidth: 1, scale: 0 }, 0.024)).toBeCloseTo(0.024)
    expect(markerSpan(null, 0.024)).toBeCloseTo(0.024)
  })
})

describe('spanToScale', () => {
  it('sizes the footprint to the requested multiple of the mark', () => {
    expect(spanToScale(0.1, 4, 1.5)).toBeCloseTo(0.0375)
  })

  it('refuses to divide by a model with no footprint', () => {
    expect(spanToScale(0.1, 0, 1.5)).toBe(0)
  })
})
