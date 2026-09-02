import { describe, expect, it, vi } from 'vitest'
import { countVisit, readConfig } from '../src/xr/visits.js'

const CONFIG = { apiKey: 'k', projectId: 'p' }

describe('readConfig', () => {
  it('takes the settings the page was built with', () => {
    expect(readConfig(JSON.stringify(CONFIG))).toEqual(CONFIG)
  })

  it('counts nothing when the page was built without any', () => {
    expect(readConfig(undefined)).toBeNull()
    expect(readConfig('')).toBeNull()
  })

  it('counts nothing rather than half-configured', () => {
    expect(readConfig(JSON.stringify({ apiKey: 'k' }))).toBeNull()
    expect(readConfig(JSON.stringify({ projectId: 'p' }))).toBeNull()
  })

  it('counts nothing when the settings are not settings', () => {
    expect(readConfig('{oops')).toBeNull()
    expect(readConfig('"a string"')).toBeNull()
  })
})

describe('countVisit', () => {
  const log = (record) => vi.fn().mockResolvedValue({ record })

  it('records the visit and hands back what it counted', async () => {
    const record = vi.fn().mockResolvedValue({ total: 12, unique: 5, first: false })
    const connect = log(record)

    expect(await countVisit({ config: CONFIG, id: 'abc', connect }))
      .toEqual({ total: 12, unique: 5, first: false })
    expect(connect).toHaveBeenCalledWith(CONFIG)
    expect(record).toHaveBeenCalledWith('abc')
  })

  it('does not reach for the network with nothing to reach it with', async () => {
    const connect = log(vi.fn())
    expect(await countVisit({ config: null, id: 'abc', connect })).toBeNull()
    expect(connect).not.toHaveBeenCalled()
  })

  it('gives up quietly when it cannot connect', async () => {
    const connect = vi.fn().mockRejectedValue(new Error('offline'))
    expect(await countVisit({ config: CONFIG, id: 'abc', connect })).toBeNull()
  })

  it('gives up quietly when the write is refused', async () => {
    const connect = log(vi.fn().mockRejectedValue(new Error('permission-denied')))
    expect(await countVisit({ config: CONFIG, id: 'abc', connect })).toBeNull()
  })
})
