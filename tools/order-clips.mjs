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

/**
 * The body's configuration at one end of a clip: a rotation per joint, and
 * where the root sits. Rotations alone cannot tell a figure lying on the floor
 * from one standing up — the joints can be folded much the same either way, and
 * it is the root that has dropped.
 */
function poses(animation) {
  const first = new Map()
  const last = new Map()
  let firstRoot = null
  let lastRoot = null
  for (const channel of animation.channels) {
    const values = readAccessor(animation.samplers[channel.sampler].output)
    if (!values.length) continue
    if (channel.target.path === 'rotation') {
      first.set(channel.target.node, values[0])
      last.set(channel.target.node, values[values.length - 1])
    } else if (channel.target.path === 'translation') {
      firstRoot = values[0]
      lastRoot = values[values.length - 1]
    }
  }
  return { first, last, firstRoot, lastRoot }
}

// A centimetre of root height counts for as much as a degree of joint. Enough
// that standing up out of a heap never reads as the cheaper join. Only the
// height counts: travel across the ground is taken out of these clips before
// they are played, so a clip that ends far downfield still ends standing.
const ROOT_WEIGHT = 1

/** How far apart two poses are, in degrees with the root folded in. */
function apart(from, to) {
  let total = 0
  let counted = 0
  for (const [node, q] of from.pose) {
    const r = to.pose.get(node)
    if (!r) continue
    const dot = Math.min(1, Math.abs(q[0] * r[0] + q[1] * r[1] + q[2] * r[2] + q[3] * r[3]))
    total += (2 * Math.acos(dot) * 180) / Math.PI
    counted += 1
  }
  if (!counted) return Infinity
  const a = from.root
  const b = to.root
  const root = a && b ? Math.abs(a[1] - b[1]) : 0
  return total / counted + root * ROOT_WEIGHT
}

const dropped = (process.env.DROP ?? '').split(',').filter(Boolean)
const clips = json.animations.filter((a) => !dropped.includes(a.name)).map((animation) => {
  let seconds = 0
  for (const sampler of animation.samplers) {
    const input = json.accessors[sampler.input]
    if (input?.max) seconds = Math.max(seconds, input.max[0])
  }
  return { name: animation.name, seconds, ...poses(animation) }
})

const start = clips.findIndex((clip) => clip.name === opening)
if (start < 0) throw new Error(`no clip named ${opening}`)

// A story is not the cheapest path through these poses, so an order written by
// hand can be scored here rather than searched for: ORDER=a,b,c reports what
// each join costs and leaves the choosing to whoever wrote it.
const given = (process.env.ORDER ?? '').split(',').map((n) => n.trim()).filter(Boolean)

function report(list) {
  console.log('order'.padEnd(28), 'length  join from previous')
  let cycle = 0
  list.forEach((clip, i) => {
    const loops = Math.max(1, Math.round(5 / clip.seconds))
    cycle += clip.seconds * loops
    console.log(
      `${String(i + 1).padStart(2)}. ${clip.name.padEnd(24)}`,
      `${clip.seconds.toFixed(2)}s`,
      `${clip.gap.toFixed(1)}deg`,
    )
  })
  console.log(`\nfull cycle ${cycle.toFixed(0)}s`)
  console.log(`\n${JSON.stringify(list.map((c) => c.name), null, 2)}`)
  console.log('worst join', Math.max(...list.map((c) => c.gap)).toFixed(1) + 'deg')
}

const at = (clip) => ({ pose: clip.first, root: clip.firstRoot })
const after = (clip) => ({ pose: clip.last, root: clip.lastRoot })
const cost = (a, b) => apart(after(a), at(b))

if (given.length) {
  const listed = given.map((name) => {
    const clip = clips.find((c) => c.name === name)
    if (!clip) throw new Error(`no clip named ${name}`)
    return clip
  })
  const missing = clips.filter((c) => !listed.includes(c)).map((c) => c.name)
  if (missing.length) console.log(`not in this order: ${missing.join(', ')}\n`)
  listed.forEach((clip, i) => {
    clip.gap = cost(listed[(i - 1 + listed.length) % listed.length], clip)
  })
  report(listed)
  process.exit(0)
}

// Nearest next pose each time, which is quick but spends the good joins early
// and leaves whatever is left to collide at the end.
const order = [clips[start]]
const left = clips.filter((_, i) => i !== start)
while (left.length) {
  const from = order[order.length - 1]
  let best = 0
  let bestGap = Infinity
  left.forEach((clip, i) => {
    const gap = cost(from, clip)
    if (gap < bestGap) {
      bestGap = gap
      best = i
    }
  })
  order.push(left[best])
  left.splice(best, 1)
}

/**
 * What a round of the whole cycle costs, the loop back to the opening clip
 * included. Squared, because one join of ninety degrees is seen and four of
 * twenty are not, and a plain sum happily trades the second for the first.
 */
const roundTrip = (list) =>
  list.reduce((sum, clip, i) => {
    const gap = cost(list[(i - 1 + list.length) % list.length], clip)
    return sum + gap * gap
  }, 0)

// Then move single clips wherever they fit better. The cost of a join depends
// on which way round it is taken, so segments cannot simply be reversed; moving
// one clip at a time is the improvement that stays honest about that.
let total = roundTrip(order)
for (let pass = 0; pass < 40; pass += 1) {
  let improved = false
  for (let from = 1; from < order.length; from += 1) {
    for (let to = 1; to < order.length; to += 1) {
      if (to === from) continue
      const candidate = order.slice()
      candidate.splice(to, 0, ...candidate.splice(from, 1))
      const sum = roundTrip(candidate)
      if (sum < total - 1e-6) {
        order.length = 0
        order.push(...candidate)
        total = sum
        improved = true
      }
    }
  }
  if (!improved) break
}

order.forEach((clip, i) => {
  clip.gap = cost(order[(i - 1 + order.length) % order.length], clip)
})

if (process.env.MATRIX) {
  const rows = clips.map((c) => c.name)
  console.log('cost of A-end -> B-start, in degrees\n')
  console.log('from \\ to'.padEnd(24) + clips.map((c) => c.name.slice(0, 7).padStart(8)).join(''))
  for (const name of rows) {
    const a = clips.find((c) => c.name === name)
    console.log(name.padEnd(24) + clips.map((b) => cost(a, b).toFixed(0).padStart(8)).join(''))
  }
  console.log()
}
report(order)
