import { describe, expect, it } from 'vitest'
import { createStringBoard } from '../src/handtracking/strings.js'

const screen = { width: 1000, height: 1000 }
const p = (x, y) => ({ x, y })
// A hand reduced to what the board reads: whether it pinches, where, and
// where its index fingertip is.
const hand = (side, point, { pinched = true, tip = point } = {}) => ({ side, pinched, point, tip })

function run(board, frames) {
  let time = 0
  const events = []
  for (const hands of frames) {
    time += 1 / 30
    events.push(...board.update(hands, { ...screen, time }))
  }
  return events
}

// Stretches a string from a to b and lets go with the right hand.
function stretch(board, a, b) {
  return run(board, [
    [hand('Left', a), hand('Right', b)],
    [hand('Left', a), hand('Right', b, { pinched: false })],
    [],
  ])
}

describe('stretching a string', () => {
  it('drafts a line while both hands pinch', () => {
    const board = createStringBoard()
    run(board, [[hand('Left', p(200, 500)), hand('Right', p(600, 500))]])
    expect(board.draft).toMatchObject({ a: p(200, 500), b: p(600, 500) })
    expect(board.strings).toHaveLength(0)
  })

  it('leaves the string in place when a hand lets go', () => {
    const board = createStringBoard()
    const events = stretch(board, p(200, 500), p(600, 500))
    expect(board.draft).toBeNull()
    expect(board.strings).toHaveLength(1)
    expect(board.strings[0]).toMatchObject({ a: p(200, 500), b: p(600, 500) })
    expect(events.map((e) => e.type)).toContain('add')
  })

  it('tunes the string by its length', () => {
    const board = createStringBoard()
    stretch(board, p(100, 100), p(500, 100))
    stretch(board, p(100, 300), p(300, 300))
    const [long, short] = board.strings
    expect(short.midi).toBeGreaterThan(long.midi)
    expect(board.draft).toBeNull()
  })

  it('drops a line too short to play', () => {
    const board = createStringBoard()
    stretch(board, p(500, 500), p(520, 500))
    expect(board.strings).toHaveLength(0)
  })

  it('keeps no more than the limit, letting the oldest go', () => {
    const board = createStringBoard({ maxStrings: 2 })
    stretch(board, p(100, 100), p(500, 100))
    stretch(board, p(100, 300), p(500, 300))
    const events = stretch(board, p(100, 500), p(500, 500))
    expect(board.strings.map((s) => s.a.y)).toEqual([300, 500])
    expect(events.map((e) => e.type)).toContain('remove')
  })
})

describe('plucking', () => {
  const strung = () => {
    const board = createStringBoard()
    stretch(board, p(200, 500), p(600, 500))
    return board
  }
  const open = (tip) => hand('Right', tip, { pinched: false, tip })

  it('sounds when a fingertip passes through the string', () => {
    const board = strung()
    const events = run(board, [[open(p(300, 450))], [open(p(300, 550))]])
    const plucks = events.filter((e) => e.type === 'pluck')
    expect(plucks).toHaveLength(1)
    expect(plucks[0].string).toBe(board.strings[0])
    expect(board.strings[0].pluck.at).toBeCloseTo(0.25, 5)
  })

  it('is silent for a fingertip that stays on one side', () => {
    const board = strung()
    const events = run(board, [[open(p(300, 450))], [open(p(300, 490))]])
    expect(events.filter((e) => e.type === 'pluck')).toHaveLength(0)
  })

  it('plays harder for a faster stroke', () => {
    const slow = strung()
    const fast = strung()
    const [s] = run(slow, [[open(p(300, 495))], [open(p(300, 505))]]).filter((e) => e.type === 'pluck')
    const [f] = run(fast, [[open(p(300, 400))], [open(p(300, 600))]]).filter((e) => e.type === 'pluck')
    expect(f.strength).toBeGreaterThan(s.strength)
    expect(f.strength).toBeLessThanOrEqual(1)
  })

  it('ignores a fingertip trembling on the string', () => {
    const board = strung()
    const events = run(board, [
      [open(p(300, 495))],
      [open(p(300, 505))],
      [open(p(300, 495))],
      [open(p(300, 505))],
    ])
    expect(events.filter((e) => e.type === 'pluck')).toHaveLength(1)
  })

  it('does not pluck with a pinching hand', () => {
    const board = strung()
    const events = run(board, [
      [hand('Right', p(300, 300), { tip: p(300, 450) })],
      [hand('Right', p(300, 300), { tip: p(300, 550) })],
    ])
    expect(events.filter((e) => e.type === 'pluck')).toHaveLength(0)
  })
})

describe('pulling a string away', () => {
  const strung = () => {
    const board = createStringBoard()
    stretch(board, p(200, 500), p(600, 500))
    return board
  }

  it('carries a string pinched on it', () => {
    const board = strung()
    run(board, [[hand('Left', p(400, 505))], [hand('Left', p(400, 605))]])
    expect(board.strings[0]).toMatchObject({ a: p(200, 600), b: p(600, 600) })
  })

  it('leaves a carried string where it is let go', () => {
    const board = strung()
    run(board, [
      [hand('Left', p(400, 505))],
      [hand('Left', p(400, 605))],
      [hand('Left', p(400, 605), { pinched: false })],
      [hand('Left', p(400, 805), { pinched: false })],
    ])
    expect(board.strings[0]).toMatchObject({ a: p(200, 600), b: p(600, 600) })
  })

  it('does not grab from a pinch away from every string', () => {
    const board = strung()
    run(board, [[hand('Left', p(400, 700))], [hand('Left', p(400, 800))]])
    expect(board.strings[0]).toMatchObject({ a: p(200, 500), b: p(600, 500) })
  })

  it('removes a string dragged off the screen', () => {
    const board = strung()
    const events = run(board, [
      [hand('Left', p(400, 505))],
      [hand('Left', p(400, 800))],
      [hand('Left', p(400, 1010))],
    ])
    expect(board.strings).toHaveLength(0)
    expect(events.map((e) => e.type)).toContain('remove')
  })

  it('removes a string whose hand vanishes at the edge', () => {
    const board = strung()
    run(board, [[hand('Left', p(400, 505))], [hand('Left', p(400, 980))], []])
    expect(board.strings).toHaveLength(0)
  })

  it('keeps a string whose hand vanishes mid-screen', () => {
    const board = strung()
    run(board, [[hand('Left', p(400, 505))], [hand('Left', p(400, 600))], []])
    expect(board.strings).toHaveLength(1)
  })

  it('does not start a new string from a hand that is carrying one', () => {
    const board = strung()
    run(board, [
      [hand('Left', p(400, 505))],
      [hand('Left', p(400, 505)), hand('Right', p(800, 200))],
    ])
    expect(board.draft).toBeNull()
  })
})
