// Locomotion baked into a clip moves the model off the spot it was put on, and
// then snaps it back when the clip changes. Height is worth keeping — a jump
// should leave the ground — but travel across the card is not.

/** How far a position track wanders across the ground, in its own units. */
export function horizontalSpread(values) {
  if (!values.length) return 0
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (let i = 0; i < values.length; i += 3) {
    minX = Math.min(minX, values[i])
    maxX = Math.max(maxX, values[i])
    minZ = Math.min(minZ, values[i + 2])
    maxZ = Math.max(maxZ, values[i + 2])
  }
  return Math.hypot(maxX - minX, maxZ - minZ)
}

/** Holds a position track where it started, keeping only its height. */
export function pinHorizontal(values) {
  if (!values.length) return values
  const x = values[0]
  const z = values[2]
  for (let i = 0; i < values.length; i += 3) {
    values[i] = x
    values[i + 2] = z
  }
  return values
}
