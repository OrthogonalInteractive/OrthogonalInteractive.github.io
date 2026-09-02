import { describe, expect, it } from 'vitest'
import { connectVisitLog } from '../src/xr/firestore.js'
import { countVisit } from '../src/xr/visits.js'

// The page must survive a tally it cannot reach: a project that does not exist,
// rules that refuse the write, a phone with no signal. All of it comes back as
// a visit that went uncounted, and nothing else.
describe('a tally that cannot be reached', () => {
  it('comes back as nothing, not as an error', async () => {
    const counted = await countVisit({
      config: { apiKey: 'not-a-key', projectId: 'not-a-project-9d2f1' },
      id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      connect: connectVisitLog,
    })

    expect(counted).toBeNull()
  }, 30000)
})
