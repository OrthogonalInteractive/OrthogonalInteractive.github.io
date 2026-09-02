// The Firestore half of the visit count, kept apart so that the SDK — the
// largest thing on the page after the model — is only fetched when the build
// actually has somewhere to write to, and only after the camera is running.

/** Opens the tally. `record` returns the counts as they stand after the visit. */
export async function connectVisitLog(config) {
  const [{ initializeApp }, store] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore'),
  ])

  const app = initializeApp(config, 'visits')
  const db = store.getFirestore(app)
  const totals = store.doc(db, 'stats', 'visits')

  return {
    async record(id) {
      const visitor = store.doc(db, 'visitors', id)

      // A transaction rather than two increments: whether this is a new phone
      // is decided by whether its document is there, and that has to be read
      // and written as one thing or two phones arriving together both count as
      // new. Writing the totals out in full, rather than as increments, is
      // also what lets the rules check that a visit only ever adds one.
      return store.runTransaction(db, async (tx) => {
        const [seen, tally] = await Promise.all([tx.get(visitor), tx.get(totals)])
        const first = !seen.exists()
        const total = (tally.data()?.total ?? 0) + 1
        const unique = (tally.data()?.unique ?? 0) + (first ? 1 : 0)

        tx.set(
          visitor,
          {
            visits: store.increment(1),
            last: store.serverTimestamp(),
            ...(first ? { first: store.serverTimestamp() } : {}),
          },
          { merge: true },
        )
        tx.set(totals, { total, unique }, { merge: true })

        return { total, unique, first }
      })
    },
  }
}
