import { describe, expect, it } from 'vitest'
import { karplusStrong } from '../src/handtracking/karplus.js'

// Deterministic noise so the tests do not depend on Math.random.
const seeded = () => {
  let s = 1
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

const rms = (samples, from, to) => {
  let sum = 0
  for (let i = from; i < to; i += 1) sum += samples[i] ** 2
  return Math.sqrt(sum / (to - from))
}

describe('karplusStrong', () => {
  const rate = 48000
  const samples = karplusStrong(440, rate, 2, seeded())

  it('lasts as long as asked', () => {
    expect(samples.length).toBe(rate * 2)
  })

  it('repeats at the period of the note', () => {
    const period = Math.round(rate / 440)
    const start = rate / 4
    let same = 0
    let shifted = 0
    for (let i = start; i < start + 2000; i += 1) {
      same += samples[i] * samples[i + period]
      shifted += samples[i] * samples[i + Math.round(period / 2)]
    }
    expect(same).toBeGreaterThan(0)
    expect(same).toBeGreaterThan(shifted)
  })

  it('dies away', () => {
    expect(rms(samples, rate * 1.5, rate * 2)).toBeLessThan(rms(samples, 0, rate * 0.1) / 4)
  })

  it('stays within full scale', () => {
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1)
  })
})
