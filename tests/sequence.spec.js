import { describe, expect, it } from 'vitest'
import { createSequence, wholeLoops } from '../src/xr/sequence.js'

// The clips as they come off the model, so the numbers here are the real ones.
const CLIPS = [
  { name: 'Backflip', duration: 2.13 },
  { name: 'Cardio_Dance', duration: 4.3 },
  { name: 'Personalized_Gesture', duration: 2.0 },
  { name: 'Running', duration: 0.63 },
  { name: 'Stand_Up3', duration: 6.07 },
  { name: 'Walking', duration: 1.03 },
]

describe('wholeLoops', () => {
  it('takes the count that comes nearest the time asked for', () => {
    expect(wholeLoops(0.63, 5)).toBe(8) // 5.04s
    expect(wholeLoops(1.03, 5)).toBe(5) // 5.15s
    expect(wholeLoops(2.13, 5)).toBe(2) // 4.26s
  })

  it('plays a clip longer than the slot exactly once, rather than cutting it', () => {
    expect(wholeLoops(6.07, 5)).toBe(1)
  })

  it('never asks for none of a clip', () => {
    expect(wholeLoops(9, 5)).toBe(1)
    expect(wholeLoops(100, 5)).toBe(1)
  })

  it('does not divide by a clip with no length', () => {
    expect(wholeLoops(0, 5)).toBe(1)
  })
})

describe('createSequence', () => {
  it('works out a whole number of loops for every clip', () => {
    const plan = createSequence(CLIPS, { target: 5 }).plan
    expect(plan.map((item) => item.loops)).toEqual([2, 1, 3, 8, 1, 5])
    // No clip is ever cut mid-motion, which is the whole point.
    plan.forEach((item) => {
      expect(item.seconds).toBeCloseTo(item.duration * item.loops, 5)
    })
  })

  it('stays on a clip until its loops are done', () => {
    const order = createSequence(CLIPS, { target: 5 })
    expect(order.current.name).toBe('Backflip')
    expect(order.update(4.0)).toBeNull()
    expect(order.current.name).toBe('Backflip')
  })

  it('moves to the next one when they are', () => {
    const order = createSequence(CLIPS, { target: 5 })
    order.update(4.0)
    const next = order.update(0.5) // past 2 x 2.13
    expect(next?.name).toBe('Cardio_Dance')
    expect(next?.index).toBe(1)
  })

  it('comes back round to the first', () => {
    const order = createSequence(CLIPS, { target: 5 })
    const seen = []
    for (let i = 0; i < 4000; i += 1) {
      const next = order.update(1 / 60)
      if (next) seen.push(next.name)
      if (seen.length === 7) break
    }
    expect(seen.map((n) => n)).toEqual([
      'Cardio_Dance', 'Personalized_Gesture', 'Running', 'Stand_Up3', 'Walking',
      'Backflip', 'Cardio_Dance',
    ])
  })

  it('runs the clips in the order it is given, whatever the file says', () => {
    const order = createSequence(CLIPS, { target: 5, order: ['Running', 'Backflip'] })

    expect(order.plan.map((item) => item.name).slice(0, 2)).toEqual(['Running', 'Backflip'])
    // The rest keep their own order behind the ones that were named.
    expect(order.plan).toHaveLength(CLIPS.length)
    expect(order.current.name).toBe('Running')
  })

  it('still points at each clip own place in the file', () => {
    const order = createSequence(CLIPS, { target: 5, order: ['Running'] })

    expect(order.current.index).toBe(3) // Running, as the model lists it
  })

  it('ignores a name the model does not have', () => {
    const order = createSequence(CLIPS, { target: 5, order: ['Nonesuch', 'Walking'] })

    expect(order.current.name).toBe('Walking')
    expect(order.plan).toHaveLength(CLIPS.length)
  })

  it('leaves out a clip it is told to skip', () => {
    const order = createSequence(CLIPS, { target: 5, skip: ['Backflip'] })

    expect(order.plan.map((item) => item.name)).not.toContain('Backflip')
    expect(order.plan).toHaveLength(CLIPS.length - 1)
  })

  it('skips a clip even when the order still names it', () => {
    const order = createSequence(CLIPS, {
      target: 5,
      order: ['Backflip', 'Walking'],
      skip: ['Backflip'],
    })

    expect(order.current.name).toBe('Walking')
  })

  it('has nowhere to go with a single clip', () => {
    const order = createSequence([CLIPS[0]], { target: 5 })
    expect(order.update(100)).toBeNull()
  })
})
