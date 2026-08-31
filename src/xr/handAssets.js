export const HAND_CACHE = 'oi-hand-v1'

/** The vendored MediaPipe files, in the order the loader asks for them. */
export const HAND_ASSETS = [
  '/xr/mediapipe/vision_wasm_internal.js',
  '/xr/mediapipe/vision_wasm_internal.wasm',
  '/xr/mediapipe/hand_landmarker.task',
]

/** Registers the worker that serves the cached copies back to MediaPipe. */
export async function installAssetWorker() {
  if (!('serviceWorker' in navigator)) return false
  try {
    await navigator.serviceWorker.register('/xr/sw.js', { scope: '/xr/' })
    await navigator.serviceWorker.ready
    return true
  } catch {
    return false
  }
}

/**
 * Keeps the hand-tracking assets in Cache Storage, which — unlike the HTTP
 * cache — can be inspected and cleared from the page. A service worker serves
 * the stored copies back to MediaPipe, whose own fetches would otherwise miss
 * them entirely.
 */
export function createAssetStore({
  urls,
  cacheName,
  caches: cacheStorage = globalThis.caches,
  fetch: fetchImpl = globalThis.fetch,
}) {
  const available = Boolean(cacheStorage)

  async function held() {
    if (!available) return []
    const cache = await cacheStorage.open(cacheName)
    const found = await Promise.all(urls.map((url) => cache.match(url)))
    return urls.filter((_, i) => found[i])
  }

  return {
    available,

    /** True only when every asset is present — a partial set still downloads. */
    async isCached() {
      return (await held()).length === urls.length
    },

    /** Fetches whatever is missing, reporting 0..1 across the whole set. */
    async download(onProgress = () => {}) {
      if (!available) return
      const cache = await cacheStorage.open(cacheName)
      const present = new Set(await held())
      const missing = urls.filter((url) => !present.has(url))
      if (!missing.length) return onProgress(1)

      const responses = await Promise.all(missing.map((url) => fetchImpl(url)))
      const total = responses.reduce(
        (bytes, response) => bytes + Number(response.headers.get('content-length') ?? 0),
        0,
      )

      let received = 0
      await Promise.all(
        responses.map(async (response, i) => {
          if (!response.ok) throw new Error(`${missing[i]} -> ${response.status}`)
          const chunks = []
          const reader = response.body.getReader()
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value)
            received += value.length
            if (total) onProgress(Math.min(1, received / total))
          }
          await cache.put(missing[i], new Response(concat(chunks)))
        }),
      )
      onProgress(1)
    },

    async clear() {
      if (!available) return false
      return cacheStorage.delete(cacheName)
    },
  }
}

function concat(chunks) {
  const total = chunks.reduce((n, chunk) => n + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}
