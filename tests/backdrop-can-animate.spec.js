import { describe, expect, it } from 'vitest'
import { canAnimate } from '../src/backdrop/catScene.js'

function fakeWindow({ reduce = false, webgl = true } = {}) {
  return {
    matchMedia: (query) => ({ matches: reduce && query.includes('reduce') }),
    document: {
      createElement: () => ({ getContext: () => (webgl ? {} : null) }),
    },
  }
}

describe('canAnimate', () => {
  it('moves the cat where WebGL is there and motion is welcome', () => {
    expect(canAnimate(fakeWindow())).toBe(true)
  })

  it('leaves the still mark for anyone who asked for less motion', () => {
    expect(canAnimate(fakeWindow({ reduce: true }))).toBe(false)
  })

  it('leaves the still mark where WebGL is missing', () => {
    expect(canAnimate(fakeWindow({ webgl: false }))).toBe(false)
  })
})
