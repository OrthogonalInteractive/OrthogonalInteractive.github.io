// Vendors the MediaPipe hand-tracking assets into public/ so the AR page has
// no third-party runtime dependency. Run with `npm run fetch:hand-assets`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'xr', 'mediapipe')
const wasmDir = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')

// FilesetResolver asks for the plain (SIMD) build whenever WebAssembly SIMD is
// available, which covers Safari 16.4+ and Chrome 91+. The nosimd and module
// variants are another 21 MB and would never be requested by those browsers.
const WASM_FILES = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm']

const MODEL = {
  name: 'hand_landmarker.task',
  url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
}

fs.mkdirSync(outDir, { recursive: true })

for (const file of WASM_FILES) {
  const source = path.join(wasmDir, file)
  if (!fs.existsSync(source)) throw new Error(`missing ${source} — run npm install first`)
  fs.copyFileSync(source, path.join(outDir, file))
  console.log(`copied ${file} (${(fs.statSync(source).size / 1048576).toFixed(1)} MB)`)
}

const response = await fetch(MODEL.url)
if (!response.ok) throw new Error(`${MODEL.url} -> ${response.status}`)
const model = Buffer.from(await response.arrayBuffer())
fs.writeFileSync(path.join(outDir, MODEL.name), model)
console.log(`fetched ${MODEL.name} (${(model.length / 1048576).toFixed(1)} MB)`)
