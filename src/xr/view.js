// Where the camera feed lands on screen.
//
// 8th Wall draws the feed to cover the canvas and turns it to keep the world
// upright as the device rotates, so a landmark measured against the raw frame
// is not yet a point on the screen. These two steps are what close that gap:
// first the shape the frame is displayed at, then the box it is drawn into.

/** The camera frame as displayed, once the UI's rotation is taken into account. */
export function orientedSize({ videoWidth, videoHeight, orientation = 0 }) {
  const quarterTurned = Math.abs(orientation % 180) === 90
  return quarterTurned
    ? { width: videoHeight, height: videoWidth }
    : { width: videoWidth, height: videoHeight }
}

/**
 * The box the image is drawn into, covering the canvas.
 *
 * Cover means one axis fits and the other overhangs, so the returned box
 * routinely starts off screen — which is the whole reason it has to be
 * measured rather than assumed to be the viewport.
 */
export function coverRect(image, canvas) {
  if (!(image.width > 0) || !(image.height > 0)) {
    return { left: 0, top: 0, width: 0, height: 0 }
  }
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height)
  const width = image.width * scale
  const height = image.height * scale
  return {
    left: (canvas.width - width) / 2,
    top: (canvas.height - height) / 2,
    width,
    height,
  }
}
