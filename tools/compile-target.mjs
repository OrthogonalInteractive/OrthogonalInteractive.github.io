// Compiles the printed marker artwork into the .mind target MindAR loads at
// runtime. Run with `npm run compile:target` whenever the artwork changes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js'

// mind-ar keeps its own nested copy of node-canvas. Resolving the module the
// same way it does keeps both on one native binding, otherwise drawImage
// rejects the Image with "Image or Canvas expected".
const requireFromMindAr = createRequire(
  import.meta.resolve('mind-ar/src/image-target/offline-compiler.js'),
)
const { loadImage } = requireFromMindAr('canvas')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'public', 'org-icon.png')
const output = path.join(root, 'public', 'xr', 'targets.mind')

const image = await loadImage(source)
console.log(`source ${path.relative(root, source)} ${image.width}x${image.height}`)

const compiler = new OfflineCompiler()
let lastReported = -10
await compiler.compileImageTargets([image], (percent) => {
  if (percent - lastReported < 10) return
  lastReported = percent
  process.stdout.write(`  ${percent.toFixed(0)}%\n`)
})

const buffer = Buffer.from(compiler.exportData())
fs.writeFileSync(output, buffer)
console.log(`wrote ${path.relative(root, output)} (${(buffer.length / 1024).toFixed(1)} kB)`)
