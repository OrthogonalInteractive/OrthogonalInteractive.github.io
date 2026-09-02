import { describe, expect, it } from 'vitest'
import { coverRect, orientedSize } from '../src/xr/view.js'

// The camera sensor delivers a fixed frame while the UI turns under it, so the
// image as displayed is not always the shape the camera reported.
describe('orientedSize', () => {
  it('leaves the frame alone when the UI is upright', () => {
    expect(orientedSize({ videoWidth: 640, videoHeight: 480, orientation: 0 }))
      .toEqual({ width: 640, height: 480 })
  })

  it('leaves it alone when the UI is upside down', () => {
    expect(orientedSize({ videoWidth: 640, videoHeight: 480, orientation: 180 }))
      .toEqual({ width: 640, height: 480 })
  })

  it('swaps the sides on a quarter turn, either way', () => {
    expect(orientedSize({ videoWidth: 640, videoHeight: 480, orientation: 90 }))
      .toEqual({ width: 480, height: 640 })
    expect(orientedSize({ videoWidth: 640, videoHeight: 480, orientation: -90 }))
      .toEqual({ width: 480, height: 640 })
  })
})

// The feed is drawn to cover the screen, so it overhangs on one axis and the
// landmarks that ride on it have to be placed against that overhang.
describe('coverRect', () => {
  it('hangs off the sides when the image is the wider shape', () => {
    const rect = coverRect({ width: 640, height: 480 }, { width: 400, height: 800 })
    expect(rect.height).toBeCloseTo(800)
    expect(rect.width).toBeCloseTo(1066.667)
    expect(rect.left).toBeCloseTo(-333.333)
    expect(rect.top).toBeCloseTo(0)
  })

  it('hangs off the top and bottom when the image is the taller shape', () => {
    const rect = coverRect({ width: 480, height: 640 }, { width: 800, height: 400 })
    expect(rect.width).toBeCloseTo(800)
    expect(rect.height).toBeCloseTo(1066.667)
    expect(rect.left).toBeCloseTo(0)
    expect(rect.top).toBeCloseTo(-333.333)
  })

  it('fills the screen exactly when the shapes agree', () => {
    expect(coverRect({ width: 640, height: 480 }, { width: 1280, height: 960 }))
      .toEqual({ left: 0, top: 0, width: 1280, height: 960 })
  })

  it('yields an empty box rather than a NaN one when nothing has loaded yet', () => {
    expect(coverRect({ width: 0, height: 0 }, { width: 400, height: 800 }))
      .toEqual({ left: 0, top: 0, width: 0, height: 0 })
  })
})
