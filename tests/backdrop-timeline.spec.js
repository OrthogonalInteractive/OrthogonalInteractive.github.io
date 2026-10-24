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

// Up and about, with a lie-down now and then: held partway into LieDown, where
// the paws are out front, and woken from the same pose partway through GetUp.
const ACTS = [
  'Idle',
  'Walk',
  'Idle',
  'Sit',
  'Idle',
  { name: 'LieDown', to: 1.07 },
  { name: 'LieDown', still: true, from: 1.07, seconds: 10 },
  { name: 'GetUp', from: 0.77 },
]

function run(timeline, seconds, step = 0.05) {
  const seen = []
  for (let t = 0; t < seconds; t += step) {
    const next = timeline.update(step)
    if (next) seen.push(next.name + (next.still ? ':still' : ''))
  }
  return seen
}

describe('createTimeline', () => {
  it('opens on its feet and moving', () => {
    const timeline = createTimeline(CLIPS, { hold: 5, acts: ACTS })
    expect(timeline.current).toMatchObject({ name: 'Idle', still: false })
  })

  it('runs the acts in order and comes round again', () => {
    const timeline = createTimeline(CLIPS, { hold: 5, acts: ACTS })
    const lap = timeline.plan.reduce((sum, item) => sum + item.seconds, 0)

    expect(run(timeline, lap + 0.5)).toEqual([
      'Walk',
      'Idle',
      'Sit',
      'Idle',
      'LieDown',
      'LieDown:still',
      'GetUp',
      'Idle',
    ])
  })

  it('holds whole loops of the clips it stays in', () => {
    const plan = createTimeline(CLIPS, { hold: 5, acts: ACTS }).plan
    const get = (name) => plan.find((item) => item.name === name)

    expect(get('Idle').seconds).toBe(6)
    expect(get('Sit').seconds).toBe(6)
    expect(get('Walk').seconds).toBeCloseTo(1.07 * 5)
  })

  it('lies still for as long as asked, on the pose partway into the clip', () => {
    const rest = createTimeline(CLIPS, { hold: 5, acts: ACTS }).plan.find((item) => item.still)
    expect(rest).toMatchObject({ name: 'LieDown', from: 1.07, seconds: 10 })
  })

  it('plays transitions once, starting or stopping partway when asked', () => {
    const plan = createTimeline(CLIPS, { hold: 5, acts: ACTS }).plan
    const getUp = plan.find((item) => item.name === 'GetUp')
    const lieDown = plan.find((item) => item.name === 'LieDown' && !item.still)

    expect(getUp).toMatchObject({ once: true, from: 0.77 })
    expect(getUp.seconds).toBeCloseTo(1.73 - 0.77)
    expect(lieDown).toMatchObject({ once: true, from: 0 })
    expect(lieDown.seconds).toBeCloseTo(1.07)
  })

  it('drops an act the model does not have rather than stalling on it', () => {
    const timeline = createTimeline(CLIPS, { acts: ['Idle', 'Dance', 'Sit'] })
    expect(timeline.plan.map((item) => item.name)).toEqual(['Idle', 'Sit'])
  })
})
