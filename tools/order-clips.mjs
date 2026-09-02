// Works out an order for a model's animation clips that keeps the joins quiet.
//
//   node tools/order-clips.mjs <model.glb> [first-clip]
//
// A crossfade hides a small difference between where one clip leaves the body
// and where the next one picks it up. It cannot hide a large one: a clip that
// ends lying on the ground followed by one that starts upright reads as the
// figure being teleported. The distance between those two poses is measurable,
// so the order is chosen rather than guessed — nearest next pose each time,
// starting from whichever clip should open.
import { readFileSync } from 'node:fs'

const source = process.argv[2]
if (!source) throw new Error('usage: node tools/order-clips.mjs <model.glb> [first-clip]')
const opening = process.argv[3] ?? 'Backflip'

const glb = readFileSync(source)
const json = JSON.parse(glb.slice(20, 20 + glb.readUInt32LE(12)).toString())
const binary = 20 + glb.readUInt32LE(12) + 8

const componentsOf = { SCALAR: 1, VEC3: 3, VEC4: 4 }

function readAccessor(index) {
  const accessor = json.accessors[index]
  const view = json.bufferViews[accessor.bufferView]
  const start = binary + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const width = componentsOf[accessor.type]
  const out = []
  for (let i = 0; i < accessor.count; i += 1) {
    const value = []
    for (let c = 0; c < width; c += 1) value.push(glb.readFloatLE(start + (i * width + c) * 4))
    out.push(value)
  }
  return out
}

/** The body's configuration at one end of a clip: a rotation per joint. */
function poses(animation) {
  const first = new Map()
  const last = new Map()
  for (const channel of animation.channels) {
    if (channel.target.path !== 'rotation') continue
    const values = readAccessor(animation.samplers[channel.sampler].output)
    if (!values.length) continue
    first.set(channel.target.node, values[0])
    last.set(channel.target.node, values[values.length - 1])
  }
  return { first, last }
}

/** Mean angle between two poses, in degrees. */
function apart(a, b) {
  let total = 0
  let counted = 0
  for (const [node, q] of a) {
    const r = b.get(node)
    if (!r) continue
    const dot = Math.min(1, Math.abs(q[0] * r[0] + q[1] * r[1] + q[2] * r[2] + q[3] * r[3]))
    total += (2 * Math.acos(dot) * 180) / Math.PI
    counted += 1
  }
  return counted ? total / counted : Infinity
}

const clips = json.animations.map((animation) => {
  let seconds = 0
  for (const sampler of animation.samplers) {
    const input = json.accessors[sampler.input]
    if (input?.max) seconds = Math.max(seconds, input.max[0])
  }
  return { name: animation.name, seconds, ...poses(animation) }
})

const start = clips.findIndex((clip) => clip.name === opening)
if (start < 0) throw new Error(`no clip named ${opening}`)

const order = [clips[start]]
const left = clips.filter((_, i) => i !== start)
while (left.length) {
  const from = order[order.length - 1]
  let best = 0
  let bestGap = Infinity
  left.forEach((clip, i) => {
    const gap = apart(from.last, clip.first)
    if (gap < bestGap) {
      bestGap = gap
      best = i
    }
  })
  order.push(Object.assign(left[best], { gap: bestGap }))
  left.splice(best, 1)
}
order[0].gap = apart(order[order.length - 1].last, order[0].first) // closing the loop

console.log('order'.padEnd(28), 'length  join from previous')
let cycle = 0
order.forEach((clip, i) => {
  const loops = Math.max(1, Math.round(5 / clip.seconds))
  cycle += clip.seconds * loops
  console.log(
    `${String(i + 1).padStart(2)}. ${clip.name.padEnd(24)}`,
    `${clip.seconds.toFixed(2)}s`,
    `${clip.gap.toFixed(1)}deg`,
  )
})
console.log(`\nfull cycle ${cycle.toFixed(0)}s`)
console.log(`\n${JSON.stringify(order.map((c) => c.name), null, 2)}`)
