import { crossing, distanceToSegment } from './geometry.js'
import { midiToFrequency, noteForLength } from './scale.js'

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

/**
 * The strings stretched across the screen, and the gestures that play them.
 *
 * - Pinch with both hands and let one go: a string is left between them,
 *   tuned by its length.
 * - Pass an open hand's index fingertip through a string: it is plucked.
 * - Pinch on a string: it is carried. Pull it off the screen to remove it.
 *
 * Works in screen pixels. `update` returns the events of the frame:
 * `{ type: 'add' | 'remove' | 'pluck', string, strength? }`.
 */
export function createStringBoard({
  minLength = 0.08, // of the screen diagonal
  grabRadius = 0.04, // of the screen diagonal
  edgeMargin = 0.06, // of the screen's shorter side
  pluckInterval = 0.15, // seconds a string ignores further crossings
  maxStrings = 12,
} = {}) {
  const strings = []
  const grabs = new Map() // side -> { string, last }
  const tips = new Map() // side -> { tip, time }
  let pinchedBefore = new Set()
  let draft = null
  let nextId = 1

  function remove(string, events) {
    const index = strings.indexOf(string)
    if (index < 0) return
    strings.splice(index, 1)
    events.push({ type: 'remove', string })
  }

  return {
    get strings() {
      return strings
    },

    get draft() {
      return draft
    },

    /** Whether a string is being carried, for drawing it differently. */
    isHeld(string) {
      for (const grab of grabs.values()) if (grab.string === string) return true
      return false
    },

    /**
     * @param hands `[{ side, pinched, point, tip }]` in screen pixels, point
     *   being the pinch point and tip the index fingertip
     */
    update(hands, { width, height, time }) {
      const events = []
      const diagonal = Math.hypot(width, height)
      const margin = edgeMargin * Math.min(width, height)
      const present = new Set(hands.map((h) => h.side))
      const inside = (p) => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height
      const nearEdge = (p) =>
        p.x < margin || p.x > width - margin || p.y < margin || p.y > height - margin

      // A hand lost while carrying a string near the edge took it off screen.
      for (const [side, grab] of grabs) {
        if (present.has(side)) continue
        if (nearEdge(grab.last)) remove(grab.string, events)
        grabs.delete(side)
      }

      for (const hand of hands) {
        const grab = grabs.get(hand.side)
        if (grab && !hand.pinched) {
          grabs.delete(hand.side)
        } else if (grab) {
          const dx = hand.point.x - grab.last.x
          const dy = hand.point.y - grab.last.y
          grab.string.a = { x: grab.string.a.x + dx, y: grab.string.a.y + dy }
          grab.string.b = { x: grab.string.b.x + dx, y: grab.string.b.y + dy }
          grab.last = hand.point
          if (!inside(hand.point)) {
            remove(grab.string, events)
            grabs.delete(hand.side)
          }
        } else if (hand.pinched && !pinchedBefore.has(hand.side)) {
          let nearest = null
          let best = grabRadius * diagonal
          for (const string of strings) {
            const d = distanceToSegment(hand.point, string.a, string.b)
            if (d <= best) {
              best = d
              nearest = string
            }
          }
          if (nearest) grabs.set(hand.side, { string: nearest, last: hand.point })
        }
      }

      const drafting = hands.filter((h) => h.pinched && !grabs.has(h.side))
      if (drafting.length >= 2) {
        const [a, b] = [drafting[0].point, drafting[1].point]
        draft = { a, b, midi: noteForLength(distance(a, b) / diagonal) }
      } else if (draft) {
        if (distance(draft.a, draft.b) >= minLength * diagonal) {
          const string = {
            id: nextId++,
            a: draft.a,
            b: draft.b,
            midi: draft.midi,
            frequency: midiToFrequency(draft.midi),
            pluck: null,
          }
          strings.push(string)
          events.push({ type: 'add', string })
          while (strings.length > maxStrings) remove(strings[0], events)
        }
        draft = null
      }

      for (const hand of hands) {
        if (hand.pinched) {
          tips.delete(hand.side)
          continue
        }
        const previous = tips.get(hand.side)
        tips.set(hand.side, { tip: hand.tip, time })
        if (!previous || time <= previous.time) continue

        const speed = distance(previous.tip, hand.tip) / (time - previous.time) / diagonal
        for (const string of strings) {
          if (this.isHeld(string)) continue
          const at = crossing(previous.tip, hand.tip, string.a, string.b)
          if (at === null) continue
          if (string.pluck && time - string.pluck.time < pluckInterval) continue
          const strength = Math.min(1, Math.max(0.15, speed / 2))
          string.pluck = { at, time, strength }
          events.push({ type: 'pluck', string, strength })
        }
      }
      for (const side of tips.keys()) if (!present.has(side)) tips.delete(side)

      pinchedBefore = new Set(hands.filter((h) => h.pinched).map((h) => h.side))
      return events
    },
  }
}
