// Shrinks the Meshy export's 2048² texture to 1024², which takes the file from
// ~3.7 MB to ~0.4 MB with no visible loss at the size the model is drawn.
//
//   node tools/optimise-model.mjs <source.glb>
//
// Writes public/xr/cat.glb. Needs no local install: it shells out to npx.
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const source = process.argv[2]
if (!source) throw new Error('usage: node tools/optimise-model.mjs <source.glb>')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'public', 'xr', 'cat.glb')

execFileSync(
  'npx',
  ['--yes', '@gltf-transform/cli@4', 'resize', '--width', '1024', '--height', '1024', source, output],
  { stdio: 'inherit' },
)
