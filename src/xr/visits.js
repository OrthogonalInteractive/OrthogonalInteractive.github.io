// Counting how often the card gets scanned, and by how many different phones.
//
// Nothing here may cost the page anything. A visit that fails to record is a
// number that goes unread; a visit that fails to start the camera is the whole
// point of the page missed. So this runs after the camera is up, swallows
// everything, and does not exist at all unless the build was given somewhere to
// write to.

const REQUIRED = ['apiKey', 'projectId']

/**
 * The Firebase settings the page was built with, or null.
 *
 * Half of them is worse than none: it would fail on every visit, slowly, in the
 * background, where nobody would see it.
 */
export function readConfig(raw) {
  if (!raw) return null
  try {
    const config = JSON.parse(raw)
    if (!config || typeof config !== 'object') return null
    return REQUIRED.every((key) => typeof config[key] === 'string' && config[key]) ? config : null
  } catch {
    return null
  }
}

/** Records one visit. Returns what it counted, or null if it could not. */
export async function countVisit({ config, id, connect }) {
  if (!config || !id) return null
  try {
    const log = await connect(config)
    return await log.record(id)
  } catch {
    return null
  }
}

/** The tally as it stands, and this phone's share of it. Null if unreadable. */
export async function readVisits({ config, id, connect }) {
  if (!config || !id) return null
  try {
    const log = await connect(config)
    return await log.read(id)
  } catch {
    return null
  }
}
