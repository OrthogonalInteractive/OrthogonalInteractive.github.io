// Sizing arithmetic for the image target, kept apart from the engine so it can
// be reasoned about — and tested — without a camera.

const positive = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

/**
 * The width of the printed mark in scene units.
 *
 * 8th Wall hands back scaledWidth/scaledHeight as ratios, not lengths: the
 * docs are explicit that they are "the width of the image in the scene, when
 * multiplied by scale". Taking either one alone sizes the model to an aspect
 * ratio; taking our own declared width instead only holds if the scene really
 * is in metres, which absolute scale does not always deliver. The product is
 * the one figure that is a length in the same units as everything else.
 */
export function markerSpan(detail, declaredWidth) {
  const scale = positive(detail?.scale)
  const ratio = Math.max(positive(detail?.scaledWidth), positive(detail?.scaledHeight))
  return positive(ratio * scale) || declaredWidth
}

/** Uniform scale that lays the model's footprint across `factor` marks. */
export function spanToScale(span, footprint, factor) {
  return positive(footprint) ? (span * factor) / footprint : 0
}
