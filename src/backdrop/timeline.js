import { wholeLoops } from '../xr/sequence.js'

// Clips that carry the body from one pose to another, so they run exactly once.
const TRANSITIONS = ['GetUp', 'LieDown']

/**
 * The backdrop cat's day: lying perfectly still for `wait` seconds, so it
 * passes for the printed mark, then up through `acts` and back down to the
 * same still pose, round and round.
 *
 * `rest` names the clip whose pose it holds, and how far into that clip (`at`)
 * the pose is taken. An act can likewise start partway in (`from`) or stop
 * early (`to`), which is how a wake-up can begin from that pose and a lie-down
 * end on it, so neither end of the waking spell shows a join.
 */
export function createTimeline(
  clips,
  { wait = 20, hold = 5, rest = 'Sleep', acts = ['GetUp', 'Idle', 'Sit', 'Idle', 'LieDown'] } = {},
) {
  const byName = new Map(clips.map((clip) => [clip.name, clip]))
  const still = typeof rest === 'string' ? { name: rest, at: 0 } : rest

  const plan = [
    { name: still.name, still: true, once: false, from: still.at, seconds: wait },
    ...acts
      .map((act) => (typeof act === 'string' ? { name: act } : act))
      .filter((act) => byName.has(act.name))
      .map(({ name, from = 0, to }) => {
        const { duration } = byName.get(name)
        const once = TRANSITIONS.includes(name)
        return {
          name,
          still: false,
          once,
          from,
          seconds: once ? (to ?? duration) - from : duration * wholeLoops(duration, hold),
        }
      }),
  ]

  let index = 0
  let elapsed = 0

  return {
    get plan() {
      return plan
    },

    get current() {
      return plan[index]
    },

    /** The step to change to, or null while the current one is still running. */
    update(delta) {
      if (plan.length < 2) return null
      elapsed += delta
      if (elapsed < plan[index].seconds) return null
      elapsed -= plan[index].seconds
      index = (index + 1) % plan.length
      return plan[index]
    },
  }
}
