const cross = (u, v) => u.x * v.y - u.y * v.x
const minus = (u, v) => ({ x: u.x - v.x, y: u.y - v.y })

/**
 * Where a movement from `from` to `to` passes through the segment a–b, as a
 * fraction of the way from a to b, or null if it does not pass through.
 */
export function crossing(from, to, a, b) {
  const move = minus(to, from)
  const span = minus(b, a)
  const denominator = cross(move, span)
  if (!denominator) return null

  const offset = minus(a, from)
  const along = cross(offset, move) / denominator
  const travelled = cross(offset, span) / denominator
  if (along < 0 || along > 1 || travelled < 0 || travelled > 1) return null
  return along
}

/** The shortest distance from a point to the segment a–b. */
export function distanceToSegment(point, a, b) {
  const span = minus(b, a)
  const lengthSquared = span.x ** 2 + span.y ** 2
  const t = lengthSquared
    ? Math.min(1, Math.max(0, ((point.x - a.x) * span.x + (point.y - a.y) * span.y) / lengthSquared))
    : 0
  return Math.hypot(point.x - (a.x + t * span.x), point.y - (a.y + t * span.y))
}
