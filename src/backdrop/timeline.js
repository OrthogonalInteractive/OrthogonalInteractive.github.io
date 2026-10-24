import { wholeLoops } from '../xr/sequence.js'

// Clips that carry the body from one pose to another, so they run exactly once.
const TRANSITIONS = ['GetUp', 'LieDown']

/**
 * The backdrop cat's day: asleep and perfectly still for `wait` seconds, so it
 * passes for the printed mark, then up through `acts` and back down to the
 * same still pose, round and round.
 *
 * The still pose is the first frame of `rest`, which is where GetUp starts and
 * LieDown ends, so neither end of the waking spell shows a join.
 */
export function createTimeline(
  clips,
  { wait = 20, hold = 5, rest = 'Sleep', acts = ['GetUp', 'Idle', 'Sit', 'Idle', 'LieDown'] } = {},
) {
  const byName = new Map(clips.map((clip) => [clip.name, clip]))

  const plan = [
    { name: rest, still: true, once: false, seconds: wait },
    ...acts
      .filter((name) => byName.has(name))
      .map((name) => {
        const { duration } = byName.get(name)
        const once = TRANSITIONS.includes(name)
        return {
          name,
          still: false,
          once,
          seconds: once ? duration : duration * wholeLoops(duration, hold),
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
