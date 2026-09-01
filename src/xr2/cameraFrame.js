import { orientedSize } from './view.js'

/**
 * The camera feed as a canvas, turned to match what is on screen.
 *
 * 8th Wall hands out camera pixels in the sensor's own frame, which is not the
 * frame the user is looking at. Turning them here rather than unpicking the
 * rotation afterwards means the landmarks come back already in the same
 * orientation as the display, and only need scaling into place.
 */
export function createCameraFrame() {
  const source = document.createElement('canvas')
  const sourceContext = source.getContext('2d', { willReadFrequently: true })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  let shape = { width: 0, height: 0 }

  return {
    canvas,

    /** The displayed shape of the frame, for placing it on screen. */
    get shape() {
      return shape
    },

    /**
     * @param frame `processGpuResult.camerapixelarray`
     * @param turn degrees to rotate the frame by, clockwise
     */
    update(frame, turn) {
      const { pixels, rows, cols, rowBytes } = frame
      if (!pixels || !rows || !cols) return false

      // rowBytes need not be cols * 4; a padded array has to be unpacked row by
      // row or every line lands shifted from the one above it.
      const packed = rowBytes === cols * 4
        ? new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, cols * rows * 4)
        : unpack(pixels, rows, cols, rowBytes)

      source.width = cols
      source.height = rows
      sourceContext.putImageData(new ImageData(packed, cols, rows), 0, 0)

      shape = orientedSize({ videoWidth: cols, videoHeight: rows, orientation: turn })
      canvas.width = shape.width
      canvas.height = shape.height
      context.save()
      context.translate(shape.width / 2, shape.height / 2)
      context.rotate((turn * Math.PI) / 180)
      context.drawImage(source, -cols / 2, -rows / 2)
      context.restore()
      return true
    },
  }
}

function unpack(pixels, rows, cols, rowBytes) {
  const out = new Uint8ClampedArray(cols * rows * 4)
  for (let y = 0; y < rows; y += 1) {
    out.set(pixels.subarray(y * rowBytes, y * rowBytes + cols * 4), y * cols * 4)
  }
  return out
}
