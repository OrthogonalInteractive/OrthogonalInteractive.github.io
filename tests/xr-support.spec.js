import { afterEach, describe, expect, it, vi } from 'vitest'
import { unsupportedReason } from '../src/xr/support.js'

const withCamera = () =>
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => {} } })

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('unsupportedReason', () => {
  it('demands a secure context before anything else', () => {
    // jsdom serves over http, so this is the default state.
    expect(unsupportedReason()).toMatch(/HTTPS/i)
  })

  it('reports a browser with no camera', () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', {})

    expect(unsupportedReason()).toMatch(/カメラ/)
  })

  it('reports the missing WebGL context', () => {
    // Without this check start() resolves and the page hangs on "looking for
    // the mark" while the TensorFlow backend fails asynchronously.
    vi.stubGlobal('isSecureContext', true)
    withCamera()

    expect(unsupportedReason()).toMatch(/WebGL/i)
  })

  it('passes when the page has a camera and a WebGL context', () => {
    vi.stubGlobal('isSecureContext', true)
    withCamera()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({})

    expect(unsupportedReason()).toBeNull()
  })
})
