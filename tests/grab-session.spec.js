import { describe, expect, it, vi } from 'vitest'
import { createGrabSession } from '../src/xr/grabSession.js'

function setup(options = {}) {
  const object = { setGrabbed: vi.fn(), setTwist: vi.fn() }
  const onLatch = vi.fn()
  const onResume = vi.fn()
  const session = createGrabSession({
    object,
    onLatch,
    onResume,
    twistGain: 2,
    releaseFrames: 3,
    ...options,
  })
  return { session, object, onLatch, onResume }
}

const idle = { pinching: false, justGrabbed: false, justReleased: false, twist: 0 }
const away = { handPresent: false, contact: false, gesture: idle }
const near = { handPresent: true, contact: false, gesture: idle }
const onObject = (gesture) => ({ handPresent: true, contact: true, gesture })

describe('createGrabSession', () => {
  it('freezes the tracker the moment a hand appears, before any pinch', () => {
    const { session, onLatch } = setup()

    session.apply(near)

    // The hand covers the mark on its way in, so waiting for the pinch is too
    // late — the target is already lost by then.
    expect(onLatch).toHaveBeenCalledTimes(1)
  })

  it('latches once while the hand stays in frame', () => {
    const { session, onLatch } = setup()

    session.apply(near)
    session.apply(near)
    session.apply(onObject({ ...idle, pinching: true, justGrabbed: true }))

    expect(onLatch).toHaveBeenCalledTimes(1)
  })

  it('ignores a pinch made away from the object', () => {
    const { session, object } = setup()

    session.apply({ handPresent: true, contact: false, gesture: { ...idle, pinching: true, justGrabbed: true } })

    expect(object.setGrabbed).not.toHaveBeenCalled()
  })

  it('keeps hold once taken, even as the hand wanders off it', () => {
    const { session, object } = setup()
    session.apply(onObject({ ...idle, pinching: true, justGrabbed: true }))

    session.apply({ handPresent: true, contact: false, gesture: { ...idle, pinching: true, twist: 0.5 } })

    expect(object.setGrabbed).toHaveBeenLastCalledWith(true)
    expect(object.setTwist).toHaveBeenLastCalledWith(-1)
  })

  it('lifts and turns the object against the wrist', () => {
    const { session, object } = setup()
    session.apply(onObject({ ...idle, pinching: true, justGrabbed: true }))

    session.apply(onObject({ ...idle, pinching: true, twist: 0.3 }))

    expect(object.setGrabbed).toHaveBeenCalledWith(true)
    // Image space has y pointing down, so the sign flips.
    expect(object.setTwist).toHaveBeenLastCalledWith(-0.6)
  })

  it('holds the tracker frozen while the object is still held', () => {
    const { session, onResume } = setup()
    session.apply(onObject({ ...idle, pinching: true, justGrabbed: true }))

    for (let i = 0; i < 10; i += 1) session.apply(onObject({ ...idle, pinching: true }))

    expect(onResume).not.toHaveBeenCalled()
  })

  it('waits for the hand to be gone a while before re-registering', () => {
    const { session, onResume } = setup()
    session.apply(near)

    session.apply(away)
    session.apply(away)
    expect(onResume).not.toHaveBeenCalled()

    session.apply(away)
    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it('stays frozen if the hand flickers back before the wait is up', () => {
    const { session, onLatch, onResume } = setup()
    session.apply(near)

    session.apply(away)
    session.apply(near)
    session.apply(away)
    session.apply(away)

    expect(onResume).not.toHaveBeenCalled()
    expect(onLatch).toHaveBeenCalledTimes(1)
  })

  it('drops the object when the hand leaves mid-grab', () => {
    const { session, object } = setup()
    session.apply(onObject({ ...idle, pinching: true, justGrabbed: true }))

    session.apply({ handPresent: false, contact: false, gesture: { ...idle, justReleased: true } })

    expect(object.setGrabbed).toHaveBeenLastCalledWith(false)
  })

  it('never resumes a tracker it did not freeze', () => {
    const { session, onResume } = setup()

    for (let i = 0; i < 10; i += 1) session.apply(away)

    expect(onResume).not.toHaveBeenCalled()
  })
})
