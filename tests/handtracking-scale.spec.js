import { describe, expect, it } from 'vitest'
import { midiToFrequency, noteForLength, noteName, snapToPentatonic } from '../src/handtracking/scale.js'

describe('snapToPentatonic', () => {
  it('keeps notes already in C major pentatonic', () => {
    for (const midi of [60, 62, 64, 67, 69, 72]) expect(snapToPentatonic(midi)).toBe(midi)
  })

  it('moves other notes to the nearest one', () => {
    expect(snapToPentatonic(65.2)).toBe(64) // F → E
    expect(snapToPentatonic(65.8)).toBe(67) // nearer G
    expect(snapToPentatonic(71)).toBe(72) // B → C
    expect(snapToPentatonic(63.1)).toBe(64)
  })
})

describe('noteForLength', () => {
  it('sounds a shorter string higher, as a real one would', () => {
    expect(noteForLength(0.2)).toBeGreaterThan(noteForLength(0.4))
  })

  it('halving the length raises it an octave', () => {
    expect(noteForLength(0.35)).toBe(60)
    expect(noteForLength(0.175)).toBe(72)
  })

  it('always lands on the scale', () => {
    for (let f = 0.05; f < 1.2; f += 0.013) {
      expect([0, 2, 4, 7, 9]).toContain(noteForLength(f) % 12)
    }
  })

  it('stays inside the playable range', () => {
    expect(noteForLength(0.001)).toBe(84)
    expect(noteForLength(5)).toBe(43)
  })
})

describe('midiToFrequency', () => {
  it('puts A4 at 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5)
  })
})

describe('noteName', () => {
  it('names a note with its octave', () => {
    expect(noteName(60)).toBe('C4')
    expect(noteName(69)).toBe('A4')
  })
})
