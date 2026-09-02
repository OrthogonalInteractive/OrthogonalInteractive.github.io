// Shrinks a Meshy export's 2048² texture to 1024² and stores it as JPEG, which
// takes the file from megabytes to a few hundred KB with no visible loss at the
// size the model is drawn. The AR page fetches this before it can show anything,
// so the saving is the wait.
//
//   node tools/optimise-model.mjs <source.glb> [destination]
//
// Writes public/xr/cat.glb unless told otherwise. Needs no local install: it
// shells out to npx.
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const source = process.argv[2]
if (!source) throw new Error('usage: node tools/optimise-model.mjs <source.glb>')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = process.argv[3]
  ? path.resolve(root, process.argv[3])
  : path.join(root, 'public', 'xr', 'cat.glb')

const run = (...args) =>
  execFileSync('npx', ['--yes', '@gltf-transform/cli@4', ...args], { stdio: 'inherit' })

run('resize', '--width', '1024', '--height', '1024', source, output)
// Nothing here needs an alpha channel, and a photographed texture keeps none of
// PNG's advantages at a tenth of the bytes.
// --formats defaults to jpeg, which means "only re-encode what is already
// JPEG"; the whole point here is the PNGs.
run('jpeg', '--formats', '*', '--quality', '85', output, output)
