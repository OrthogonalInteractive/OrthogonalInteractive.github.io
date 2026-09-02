import { visitorId } from './visitor.js'
import { readVisits, readConfig } from './visits.js'
import './stats.css'

// Looking at the numbers is not a visit to the card, so this page only reads.
const config = readConfig(import.meta.env.VITE_FIREBASE)

const note = document.querySelector('#note')
const show = (id, value) => {
  document.querySelector(`#${id}`).textContent = value.toLocaleString('ja-JP')
}

const when = (date) =>
  date?.toLocaleString?.('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) ?? null

if (!config) {
  note.textContent = 'アクセス計測は設定されていません。'
  note.classList.add('is-quiet')
} else {
  const counted = await readVisits({
    config,
    id: visitorId(),
    connect: (settings) => import('./firestore.js').then((m) => m.connectVisitLog(settings)),
  })

  if (!counted) {
    note.textContent = '集計を読み込めませんでした。'
    note.classList.add('is-error')
  } else {
    show('total', counted.total)
    show('unique', counted.unique)
    show('mine', counted.mine)

    const first = when(counted.first)
    const last = when(counted.last)
    note.textContent = counted.mine
      ? `初回 ${first} ／ 最終 ${last}`
      : 'この端末からはまだ AR ページを開いていません。'
    note.classList.add('is-quiet')
  }
}
