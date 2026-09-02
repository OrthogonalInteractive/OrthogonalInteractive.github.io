// Builds the 8th Wall image target from the artwork that gets printed.
//
// The two must describe the same picture in the same orientation: the engine
// solves the card's pose by matching what the camera sees against this file, and
// every rotation, crop or aspect change between the two is a distortion the
// solver has to absorb — which it does by tilting the plane it reports.
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'

const require = createRequire(import.meta.resolve('mind-ar/package.json'))
const { createCanvas, loadImage } = require('canvas')

const SOURCE = 'public/xr2/card-artwork.png'
const TARGET = 'public/xr2/image-targets/card.png'
const DESCRIPTOR = 'public/xr2/card-target.json'

// 8th Wall wants 4:3, at least 640x480. Landscape, because the artwork is.
const WIDTH = 640
const HEIGHT = 480

const image = await loadImage(SOURCE)
if (Math.abs(image.width / image.height - WIDTH / HEIGHT) > 0.001) {
  throw new Error(`${SOURCE} is ${image.width}x${image.height}, which is not 4:3`)
}

const canvas = createCanvas(WIDTH, HEIGHT)
const context = canvas.getContext('2d')
context.drawImage(image, 0, 0, WIDTH, HEIGHT)

// Grey: the tracker works on luminance, and colour only adds bytes.
const pixels = context.getImageData(0, 0, WIDTH, HEIGHT)
for (let i = 0; i < pixels.data.length; i += 4) {
  const grey = Math.round(
    0.299 * pixels.data[i] + 0.587 * pixels.data[i + 1] + 0.114 * pixels.data[i + 2],
  )
  pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = grey
}
context.putImageData(pixels, 0, 0)
writeFileSync(TARGET, canvas.toBuffer('image/png'))

writeFileSync(
  DESCRIPTOR,
  `${JSON.stringify(
    {
      name: 'card',
      type: 'PLANAR',
      imagePath: `/${TARGET.replace('public/', '')}`,
      metadata: {},
      properties: {
        left: 0,
        top: 0,
        width: WIDTH,
        height: HEIGHT,
        originalWidth: WIDTH,
        originalHeight: HEIGHT,
        // Nothing was cropped and nothing was turned, so the frame the engine
        // builds is the frame the card is printed in.
        isRotated: false,
      },
    },
    null,
    2,
  )}\n`,
)

console.log(`${TARGET} ${WIDTH}x${HEIGHT} from ${image.width}x${image.height}`)
