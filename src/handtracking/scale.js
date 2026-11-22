// C major pentatonic: any handful of these sounds well together.
const PENTATONIC = [0, 2, 4, 7, 9]
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const LOWEST = 43 // G2
const HIGHEST = 84 // C6
// A string this fraction of the screen diagonal sounds middle C.
const MIDDLE_C_LENGTH = 0.35

/** The pentatonic note nearest to a (possibly fractional) MIDI pitch. */
export function snapToPentatonic(midi) {
  const octave = Math.floor(midi / 12) * 12
  let best = null
  for (const base of [octave - 12, octave, octave + 12]) {
    for (const step of PENTATONIC) {
      const note = base + step
      if (best === null || Math.abs(note - midi) < Math.abs(best - midi)) best = note
    }
  }
  return best
}

/**
 * The note a string sounds, from its length as a fraction of the screen
 * diagonal. Like a real string, halving the length raises it an octave.
 */
export function noteForLength(fraction) {
  const midi = 60 + 12 * Math.log2(MIDDLE_C_LENGTH / Math.max(fraction, 1e-6))
  return Math.min(HIGHEST, Math.max(LOWEST, snapToPentatonic(midi)))
}

export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function noteName(midi) {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
}
