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
  const config = parse(raw) ?? parse(asJson(raw))
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null
  return REQUIRED.every((key) => typeof config[key] === 'string' && config[key]) ? config : null
}

function parse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * The Firebase console shows its settings as a JavaScript declaration, and that
 * is what anybody will paste. Enough of it is turned into JSON here to be read:
 * the declaration itself, keys without quotes, quotes of the wrong kind, and a
 * comma before the closing brace.
 */
function asJson(text) {
  return text
    .trim()
    .replace(/^(?:const|let|var)\s+\w+\s*=\s*/, '')
    .replace(/;\s*$/, '')
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    .replace(/'([^'\\]*)'/g, '"$1"')
    .replace(/,(\s*[}\]])/g, '$1')
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
