import { karplusStrong } from './karplus.js'

const NOTE_SECONDS = 2.5

/**
 * The instrument's voice. Must be created from a tap or click: Safari keeps
 * an AudioContext silent unless it was started by one.
 */
export function createInstrument() {
  // Safari 17+: play even with the ringer switch set to silent.
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback'
  } catch {
    // Not supported; the default session still plays with the ringer on.
  }

  const context = new AudioContext()
  context.resume()

  // Many strings at once would otherwise clip.
  const master = context.createDynamicsCompressor()
  master.threshold.value = -12
  master.connect(context.destination)

  const buffers = new Map()
  function bufferFor(frequency) {
    let buffer = buffers.get(frequency)
    if (!buffer) {
      const samples = karplusStrong(frequency, context.sampleRate, NOTE_SECONDS)
      buffer = context.createBuffer(1, samples.length, context.sampleRate)
      buffer.copyToChannel(samples, 0)
      buffers.set(frequency, buffer)
    }
    return buffer
  }

  return {
    /**
     * @param strength 0–1, how hard the string was struck
     * @param pan -1 (left) to 1 (right)
     */
    pluck(frequency, strength, pan = 0) {
      if (context.state !== 'running') context.resume()
      const source = context.createBufferSource()
      source.buffer = bufferFor(frequency)

      const gain = context.createGain()
      gain.gain.value = 0.25 + 0.55 * strength
      const panner = context.createStereoPanner()
      panner.pan.value = Math.max(-1, Math.min(1, pan))

      source.connect(gain).connect(panner).connect(master)
      source.start()
    },

    /** Warms the cache so the first pluck of a new string has no delay. */
    prepare(frequency) {
      bufferFor(frequency)
    },
  }
}
