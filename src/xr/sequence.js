/**
 * Whole loops of a clip that come nearest to filling `target` seconds.
 *
 * Cutting a clip at a fixed number of seconds cuts it mid-motion — a backflip
 * stopped in the air, a stand-up that never reaches its feet. Rounding to whole
 * loops keeps every slot near the length asked for while letting each motion
 * finish, and a clip longer than the slot simply plays once.
 */
export function wholeLoops(duration, target) {
  if (!(duration > 0)) return 1
  return Math.max(1, Math.round(target / duration))
}

/**
 * Runs a model's clips one at a time, each for a whole number of loops.
 *
 * `order` names the clips in the order they should run. A crossfade hides a
 * small difference between where one clip leaves the body and where the next
 * picks it up, never a large one, so which clip follows which is worth choosing
 * — see tools/order-clips.mjs, which measures it. Anything the model has and
 * the order does not name still gets played, behind the ones that were named.
 */
export function createSequence(clips, { target = 5, order = [] } = {}) {
  const numbered = clips.map((clip, index) => ({ ...clip, index }))
  const named = order
    .map((name) => numbered.find((clip) => clip.name === name))
    .filter(Boolean)
  const rest = numbered.filter((clip) => !named.includes(clip))

  const plan = [...named, ...rest].map((clip) => {
    const loops = wholeLoops(clip.duration, target)
    return {
      ...clip,
      loops,
      seconds: clip.duration > 0 ? clip.duration * loops : target,
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

    /** The clip to change to, or null while the current one is still running. */
    update(delta) {
      if (plan.length < 2) return null
      elapsed += delta
      if (elapsed < plan[index].seconds) return null
      elapsed = 0
      index = (index + 1) % plan.length
      return plan[index]
    },
  }
}
