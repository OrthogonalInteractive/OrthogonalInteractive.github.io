import { describe, expect, it, vi } from 'vitest'
import { createAssetStore } from '../src/xr/handAssets.js'

const URLS = ['/a.js', '/b.wasm']

function fakeCache(initial = []) {
  const held = new Set(initial)
  return {
    held,
    match: vi.fn(async (url) => (held.has(url) ? { ok: true } : undefined)),
    put: vi.fn(async (url) => held.add(url)),
  }
}

function fakeCaches(cache) {
  return {
    open: vi.fn(async () => cache),
    delete: vi.fn(async () => {
      cache.held.clear()
      return true
    }),
  }
}

/** A Response whose body streams `size` bytes in four chunks. */
function fakeResponse(size) {
  let sent = 0
  return {
    ok: true,
    headers: { get: (name) => (name === 'content-length' ? String(size) : null) },
    body: {
      getReader: () => ({
        read: async () => {
          if (sent >= size) return { done: true }
          const chunk = Math.min(size / 4, size - sent)
          sent += chunk
          return { done: false, value: new Uint8Array(chunk) }
        },
      }),
    },
  }
}

const store = (cache, fetchImpl) =>
  createAssetStore({
    urls: URLS,
    cacheName: 'test',
    caches: fakeCaches(cache),
    fetch: fetchImpl,
  })

describe('createAssetStore', () => {
  it('reports cached only when every asset is present', async () => {
    expect(await store(fakeCache(URLS), vi.fn()).isCached()).toBe(true)
    expect(await store(fakeCache(['/a.js']), vi.fn()).isCached()).toBe(false)
    expect(await store(fakeCache(), vi.fn()).isCached()).toBe(false)
  })

  it('reports progress across the combined download', async () => {
    const fetchImpl = vi.fn(async () => fakeResponse(1000))
    const seen = []

    await store(fakeCache(), fetchImpl).download((ratio) => seen.push(ratio))

    expect(seen.at(-1)).toBeCloseTo(1, 5)
    expect(seen.every((r) => r >= 0 && r <= 1)).toBe(true)
    expect(seen).toEqual([...seen].sort((a, b) => a - b))
  })

  it('stores what it downloaded so the worker can serve it', async () => {
    const cache = fakeCache()

    await store(cache, vi.fn(async () => fakeResponse(400))).download(() => {})

    expect([...cache.held]).toEqual(URLS)
  })

  it('skips assets it already holds', async () => {
    const cache = fakeCache(['/a.js'])
    const fetchImpl = vi.fn(async () => fakeResponse(400))

    await store(cache, fetchImpl).download(() => {})

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith('/b.wasm')
  })

  it('empties the cache on clear', async () => {
    const cache = fakeCache(URLS)
    const assets = store(cache, vi.fn())

    await assets.clear()

    expect(await assets.isCached()).toBe(false)
  })

  it('degrades to uncached when the browser has no cache storage', async () => {
    const assets = createAssetStore({ urls: URLS, cacheName: 'test', caches: undefined })

    expect(assets.available).toBe(false)
    expect(await assets.isCached()).toBe(false)
    await expect(assets.clear()).resolves.toBe(false)
  })
})
