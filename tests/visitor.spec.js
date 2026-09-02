import { beforeEach, describe, expect, it, vi } from 'vitest'
import { visitorId } from '../src/xr/visitor.js'

const store = () => {
  const held = new Map()
  return {
    getItem: (k) => (held.has(k) ? held.get(k) : null),
    setItem: (k, v) => held.set(k, v),
    get size() { return held.size },
  }
}

describe('visitorId', () => {
  let storage
  beforeEach(() => { storage = store() })

  it('gives the same phone the same id twice', () => {
    const first = visitorId(storage)
    expect(visitorId(storage)).toBe(first)
  })

  it('writes it down so it survives the page being closed', () => {
    const id = visitorId(storage)
    expect(storage.size).toBe(1)
    expect(visitorId(store())).not.toBe(id) // a different phone, a different id
  })

  it('keeps an id that was already there', () => {
    const kept = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
    storage.setItem('oi-visitor', kept)
    expect(visitorId(storage)).toBe(kept)
  })

  it('replaces something that is not an id', () => {
    storage.setItem('oi-visitor', 'not-an-id')
    const id = visitorId(storage)
    expect(id).not.toBe('not-an-id')
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('still answers when the browser refuses to store anything', () => {
    // Safari in private browsing throws on setItem rather than failing quietly.
    const hostile = {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    }
    const id = visitorId(hostile)
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('answers when there is no storage at all', () => {
    expect(visitorId(null)).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('makes an id without crypto.randomUUID', () => {
    const uuid = globalThis.crypto?.randomUUID
    if (uuid) vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => { throw new Error('no') })
    expect(visitorId(store())).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    vi.restoreAllMocks()
  })
})
