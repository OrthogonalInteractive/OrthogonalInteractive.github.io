// Who is looking, only as far as telling one browser from another.
//
// There is no device id a web page can read, and no way to ask for one. A
// random value written into local storage is the whole of it: it survives a
// reload, it goes when site data is cleared, it says nothing about anybody, and
// it cannot be joined to anything else. Two browsers on one phone count twice;
// that is the honest limit of counting this way.

const KEY = 'oi-visitor'
const SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** A random id, from the browser's generator or by hand if it has none. */
function fresh() {
  try {
    const id = globalThis.crypto?.randomUUID?.()
    if (id) return id
  } catch {
    // Older browsers, and any page not served over https, have no generator.
  }
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * This browser's id, made once and kept.
 *
 * A browser that refuses to store — private windows do — still gets an answer,
 * a new one each time. It counts as a fresh visitor every visit, which is the
 * only thing that can be said about it.
 */
export function visitorId(storage = globalThis.localStorage) {
  let held = null
  try {
    held = storage?.getItem(KEY) ?? null
  } catch {
    return fresh()
  }
  if (held && SHAPE.test(held)) return held

  const id = fresh()
  try {
    storage?.setItem(KEY, id)
  } catch {
    // Nothing to be done, and nothing worth failing a page load over.
  }
  return id
}
