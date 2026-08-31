import { describe, expect, it, vi } from 'vitest'
import { createGrabSession } from '../src/xr/grabSession.js'

function setup() {
  const object = { setGrabbed: vi.fn(), setTwist: vi.fn() }
  const onLatch = vi.fn()
  const onResume = vi.fn()
  const session = createGrabSession({ object, onLatch, onResume, twistGain: 2 })
  return { session, object, onLatch, onResume }
}

const idle = { pinching: false, justGrabbed: false, justReleased: false, twist: 0 }

describe('createGrabSession', () => {
  it('freezes the image tracker the moment the hand takes hold', () => {
    const { session, object, onLatch } = setup()

    session.apply({ ...idle, pinching: true, justGrabbed: true })

    // The hand is about to cover the mark; the pose has to be latched before
    // the tracker can lose it.
    expect(onLatch).toHaveBeenCalledTimes(1)
    expect(object.setGrabbed).toHaveBeenCalledWith(true)
  })

  it('turns the object against the wrist, amplified', () => {
    const { session, object } = setup()
    session.apply({ ...idle, pinching: true, justGrabbed: true })

    session.apply({ ...idle, pinching: true, twist: 0.3 })

    // Image space has y pointing down, so the sign flips.
    expect(object.setTwist).toHaveBeenLastCalledWith(-0.6)
  })

  it('restarts the tracker on release so the mark can re-register', () => {
    const { session, object, onResume } = setup()
    session.apply({ ...idle, pinching: true, justGrabbed: true })

    session.apply({ ...idle, justReleased: true })

    expect(object.setGrabbed).toHaveBeenLastCalledWith(false)
    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it('survives being grabbed again', () => {
    const { session, onLatch, onResume } = setup()

    for (let i = 0; i < 3; i += 1) {
      session.apply({ ...idle, pinching: true, justGrabbed: true })
      session.apply({ ...idle, justReleased: true })
    }

    expect(onLatch).toHaveBeenCalledTimes(3)
    expect(onResume).toHaveBeenCalledTimes(3)
  })

  it('never resumes a tracker it did not stop', () => {
    const { session, onResume } = setup()

    session.apply({ ...idle, justReleased: true })
    session.apply(idle)

    expect(onResume).not.toHaveBeenCalled()
  })
})
