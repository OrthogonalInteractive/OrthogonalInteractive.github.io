/**
 * The box a feed of `source` size occupies when scaled to cover `screen`
 * (CSS `object-fit: cover`), overhanging on whichever axis is longer.
 */
export function coverRect(source, screen) {
  const scale = Math.max(screen.width / source.width, screen.height / source.height)
  const width = source.width * scale
  const height = source.height * scale
  return {
    left: (screen.width - width) / 2,
    top: (screen.height - height) / 2,
    width,
    height,
  }
}

/** A normalised landmark in screen pixels, flipped when the feed is mirrored. */
export function toScreen(point, rect, { mirrored = false } = {}) {
  const x = mirrored ? 1 - point.x : point.x
  return { x: rect.left + x * rect.width, y: rect.top + point.y * rect.height }
}
