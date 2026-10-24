import { wholeLoops } from '../xr/sequence.js'

// Clips that carry the body from one pose to another, so they run exactly once.
const TRANSITIONS = ['GetUp', 'LieDown']

/**
 * The backdrop cat's day: `acts` in order, round and round.
 *
 * An act is a clip's name, or an object that can start it partway in (`from`)
 * or stop it early (`to`). A `still` act holds the clip's pose at `from` for
 * `seconds`, which is how the cat lies down for a while: a lie-down that stops
 * on that pose and a wake-up that starts from it leave no join either side.
 */
export function createTimeline(clips, { hold = 5, acts = ['Idle'] } = {}) {
  const byName = new Map(clips.map((clip) => [clip.name, clip]))

  const plan = acts
    .map((act) => (typeof act === 'string' ? { name: act } : act))
    .filter((act) => byName.has(act.name))
    .map(({ name, from = 0, to, still = false, seconds = hold }) => {
      const { duration } = byName.get(name)
      if (still) return { name, still, once: false, from, seconds }
      const once = TRANSITIONS.includes(name)
      return {
        name,
        still,
        once,
        from,
        seconds: once ? (to ?? duration) - from : duration * wholeLoops(duration, hold),
      }
    })

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
