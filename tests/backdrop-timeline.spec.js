import { describe, expect, it } from 'vitest'
import { createTimeline } from '../src/backdrop/timeline.js'

// The clips as they come off public/cat.glb.
const CLIPS = [
  { name: 'GetUp', duration: 1.73 },
  { name: 'Idle', duration: 3 },
  { name: 'LieDown', duration: 1.73 },
  { name: 'Sit', duration: 3 },
  { name: 'Sleep', duration: 4 },
  { name: 'TailWag', duration: 0.8 },
  { name: 'Walk', duration: 1.07 },
]

const ACTS = ['GetUp', 'Idle', 'Sit', 'Idle', 'LieDown']

// Lying with the paws out front, as in the mark: partway into LieDown, and the
// same pose partway through GetUp.
const REST = { name: 'LieDown', at: 1.07 }
const LYING = [{ name: 'GetUp', from: 0.77 }, 'Idle', 'Sit', 'Idle', { name: 'LieDown', to: 1.07 }]

function run(timeline, seconds, step = 0.1) {
  const seen = []
  for (let t = 0; t < seconds; t += step) {
    const next = timeline.update(step)
    if (next) seen.push(next.name + (next.still ? ':still' : ''))
  }
  return seen
}

describe('createTimeline', () => {
  it('opens on the sleeping pose held still, so it reads as a picture', () => {
    const timeline = createTimeline(CLIPS, { wait: 20, acts: ACTS })
    expect(timeline.current).toMatchObject({ name: 'Sleep', still: true })
  })

  it('stays still for the whole wait', () => {
    const timeline = createTimeline(CLIPS, { wait: 20, acts: ACTS })
    expect(run(timeline, 19.9)).toEqual([])
  })

  it('wakes after the wait and runs the acts in order', () => {
    const timeline = createTimeline(CLIPS, { wait: 20, hold: 5, acts: ACTS })
    expect(run(timeline, 20 + 1.73 + 6 + 6 + 6 + 0.5)).toEqual([
      'GetUp',
      'Idle',
      'Sit',
      'Idle',
      'LieDown',
    ])
  })

  it('goes back to sleep and holds still again once lain down', () => {
    const timeline = createTimeline(CLIPS, { wait: 20, hold: 5, acts: ACTS })
    const seen = run(timeline, 20 + 1.73 + 6 * 3 + 1.73 + 0.5)
    expect(seen.at(-1)).toBe('Sleep:still')
    expect(timeline.current.still).toBe(true)
  })

  it('plays transitions once and holds the rest for whole loops', () => {
    const plan = createTimeline(CLIPS, { wait: 20, hold: 5, acts: ACTS }).plan
    const get = (name) => plan.find((item) => item.name === name)

    expect(get('GetUp')).toMatchObject({ once: true, seconds: 1.73 })
    expect(get('LieDown')).toMatchObject({ once: true, seconds: 1.73 })
    expect(get('Idle').seconds).toBe(6)
    expect(get('Sit').seconds).toBe(6)
  })

  it('drops an act the model does not have rather than stalling on it', () => {
    const timeline = createTimeline(CLIPS, { wait: 1, acts: ['GetUp', 'Dance', 'LieDown'] })
    expect(timeline.plan.map((item) => item.name)).toEqual(['Sleep', 'GetUp', 'LieDown'])
  })

  it('can rest partway through a clip, held still there', () => {
    const timeline = createTimeline(CLIPS, { wait: 20, rest: REST, acts: LYING })
    expect(timeline.current).toMatchObject({ name: 'LieDown', still: true, from: 1.07 })
  })

  it('wakes from partway through a clip and lies down only as far as the rest', () => {
    const plan = createTimeline(CLIPS, { wait: 20, rest: REST, acts: LYING }).plan
    const getUp = plan.find((item) => item.name === 'GetUp')
    const lieDown = plan.find((item) => item.name === 'LieDown' && !item.still)

    expect(getUp).toMatchObject({ once: true, from: 0.77 })
    expect(getUp.seconds).toBeCloseTo(1.73 - 0.77)
    expect(lieDown).toMatchObject({ once: true, from: 0 })
    expect(lieDown.seconds).toBeCloseTo(1.07)
  })
})
