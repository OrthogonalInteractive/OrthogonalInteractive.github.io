// How the drawn string moves: slower than the sound, so the eye can follow it.
const SWING_HZ = 9
const SETTLE_PER_SECOND = 2.2

/**
 * How far a point a fraction `s` along a plucked string stands off its rest
 * line, `age` seconds after the pluck, as a fraction of the full swing.
 * It starts in the shape it was pulled into — a tent peaked at the pluck —
 * and swings back and forth as it settles.
 */
export function displacement(s, pluck, age) {
  const at = Math.min(0.95, Math.max(0.05, pluck.at))
  const shape = s <= at ? s / at : (1 - s) / (1 - at)
  const swing = Math.cos(2 * Math.PI * SWING_HZ * age)
  return pluck.strength * shape * swing * Math.exp(-SETTLE_PER_SECOND * age)
}
