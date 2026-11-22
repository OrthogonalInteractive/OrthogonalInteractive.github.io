import { describe, expect, it } from 'vitest'
import { coverRect, toScreen } from '../src/handtracking/cover.js'

describe('coverRect', () => {
  it('fills a wider screen by overhanging top and bottom', () => {
    expect(coverRect({ width: 640, height: 480 }, { width: 1280, height: 720 })).toEqual({
      left: 0,
      top: -120,
      width: 1280,
      height: 960,
    })
  })

  it('fills a taller screen by overhanging the sides', () => {
    expect(coverRect({ width: 640, height: 480 }, { width: 480, height: 960 })).toEqual({
      left: -400,
      top: 0,
      width: 1280,
      height: 960,
    })
  })
})

describe('toScreen', () => {
  const rect = { left: -10, top: 20, width: 200, height: 100 }

  it('places a landmark inside the displayed feed', () => {
    expect(toScreen({ x: 0.25, y: 0.5 }, rect)).toEqual({ x: 40, y: 70 })
  })

  it('flips across for a mirrored selfie view', () => {
    expect(toScreen({ x: 0.25, y: 0.5 }, rect, { mirrored: true })).toEqual({ x: 140, y: 70 })
  })
})
