/**
 * A single frame reporting more than a quarter turn means the finger crossed
 * the centre and the bearing flipped, not that anything was swept that far.
 */
const MAX_STEP = Math.PI / 2

/** Below this many pixels from the centre, the bearing is too noisy to use. */
const MIN_RADIUS = 12

/**
 * The angle a stroke sweeps around a point on screen.
 *
 * Rotation is limited to the mark's normal, so what matters is how far the
 * finger travelled *around* the object, not the raw direction it moved in.
 */
export function swirlAngle(from, to, centre) {
  if (!from || !to || !centre) return 0

  const r1 = Math.hypot(from.x - centre.x, from.y - centre.y)
  const r2 = Math.hypot(to.x - centre.x, to.y - centre.y)
  if (r1 < MIN_RADIUS || r2 < MIN_RADIUS) return 0

  const before = Math.atan2(from.y - centre.y, from.x - centre.x)
  const after = Math.atan2(to.y - centre.y, to.x - centre.x)
  const swept = Math.atan2(Math.sin(after - before), Math.cos(after - before))

  return Math.abs(swept) > MAX_STEP ? 0 : swept
}
