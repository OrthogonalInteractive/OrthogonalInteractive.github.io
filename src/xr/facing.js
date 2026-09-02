/**
 * Heading in degrees, about the card's normal, that turns a model's front
 * towards a point lying in the card's plane.
 *
 * Laying a Y-up model down onto the card leaves its front — the glTF's +Z —
 * along the group's -Y, so a point straight ahead needs no turn at all.
 */
export function headingToward({ x, y }) {
  if (!x && !y) return 0
  return (Math.atan2(x, -y) * 180) / Math.PI
}
