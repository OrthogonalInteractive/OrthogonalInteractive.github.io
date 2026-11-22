/**
 * A plucked string by Karplus–Strong synthesis: a burst of noise circulating
 * through a delay line one period long, softened a little on every pass.
 *
 * @returns mono samples in [-1, 1]
 */
export function karplusStrong(frequency, sampleRate, seconds, random = Math.random, ring = 1.6) {
  const period = Math.max(2, Math.round(sampleRate / frequency))
  const length = Math.round(sampleRate * seconds)
  const out = new Float32Array(length)

  const line = new Float32Array(period)
  let mean = 0
  for (let i = 0; i < period; i += 1) {
    line[i] = random() * 2 - 1
    mean += line[i]
  }
  // Noise that does not average to zero leaves a DC offset that never decays.
  mean /= period
  let peak = 0
  for (let i = 0; i < period; i += 1) {
    line[i] -= mean
    peak = Math.max(peak, Math.abs(line[i]))
  }
  if (peak > 1) for (let i = 0; i < period; i += 1) line[i] /= peak

  // Loss per pass, chosen so the note falls by 60 dB over `ring` seconds.
  const loss = 10 ** (-3 / (ring * frequency))
  for (let i = 0; i < length; i += 1) {
    const here = i % period
    const next = (i + 1) % period
    out[i] = line[here]
    line[here] = loss * 0.5 * (line[here] + line[next])
  }

  // Fade the tail so a note cut off by the buffer end does not click.
  const fade = Math.min(length, Math.round(sampleRate * 0.05))
  for (let i = 0; i < fade; i += 1) out[length - 1 - i] *= i / fade
  return out
}
