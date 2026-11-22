import './style.css'
import { createInstrument } from './audio.js'
import { coverRect, toScreen } from './cover.js'
import { createPinchTracker } from './pinch.js'
import { noteName } from './scale.js'
import { createStringBoard } from './strings.js'
import { displacement } from './vibration.js'

// Shared with the AR page, which vendors them (see `npm run fetch:hand-assets`).
const ASSET_DIR = '/xr/mediapipe'
const INDEX_TIP = 8

// MediaPipe's 21-point hand, as bone pairs grouped by finger.
const FINGERS = [
  { colour: '#e8c34a', bones: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  { colour: '#8fd3e8', bones: [[0, 5], [5, 6], [6, 7], [7, 8]] },
  { colour: '#7fd99a', bones: [[9, 10], [10, 11], [11, 12]] },
  { colour: '#c59be8', bones: [[13, 14], [14, 15], [15, 16]] },
  { colour: '#e88f8f', bones: [[0, 17], [17, 18], [18, 19], [19, 20]] },
]
const PALM = [[5, 9], [9, 13], [13, 17]]
const TIPS = [4, 8, 12, 16, 20]
const PINCH_COLOUR = '#ffffff'

// One colour per note of the pentatonic scale, by pitch class.
const NOTE_COLOURS = { 0: '#8fd3e8', 2: '#7fd99a', 4: '#e8c34a', 7: '#c59be8', 9: '#e88f8f' }
const SEGMENTS = 32
const SWING_PX = 28

const video = document.getElementById('feed')
const canvas = document.getElementById('overlay')
const context = canvas.getContext('2d')
const intro = document.getElementById('intro')
const startButton = document.getElementById('start')
const status = document.getElementById('status')

let screen = { width: 0, height: 0 }

function resize() {
  const ratio = Math.min(window.devicePixelRatio, 2)
  screen = { width: window.innerWidth, height: window.innerHeight }
  canvas.width = screen.width * ratio
  canvas.height = screen.height * ratio
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
}

function say(text) {
  status.hidden = !text
  status.textContent = text
}

async function loadLandmarker() {
  const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
  const fileset = await FilesetResolver.forVisionTasks(ASSET_DIR)
  const create = (delegate) =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${ASSET_DIR}/hand_landmarker.task`, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
    })
  // Some drivers refuse the GPU delegate outright.
  try {
    return await create('GPU')
  } catch {
    return await create('CPU')
  }
}

async function openCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
  })
  video.srcObject = stream
  await video.play()
}

/** MediaPipe's result as `[{ side, landmarks }]`, keeping sides unique. */
function handsOf(result) {
  const sides = result.handedness ?? result.handednesses ?? []
  const seen = new Set()
  return (result.landmarks ?? []).map((landmarks, i) => {
    let side = sides[i]?.[0]?.categoryName ?? `hand${i}`
    // Both hands are occasionally given the same side; keep them apart.
    if (seen.has(side)) side = `${side}${i}`
    seen.add(side)
    return { side, landmarks }
  })
}

function drawHand(hand, rect) {
  const at = (i) => toScreen(hand.landmarks[i], rect, { mirrored: true })

  context.lineCap = 'round'
  context.lineWidth = 4
  context.globalAlpha = 0.85
  context.strokeStyle = 'rgba(219, 231, 230, 0.6)'
  for (const [a, b] of PALM) segment(at(a), at(b))

  for (const { colour, bones } of FINGERS) {
    context.strokeStyle = colour
    for (const [a, b] of bones) segment(at(a), at(b))
  }

  context.globalAlpha = 1
  TIPS.forEach((tip, i) => dot(at(tip), 7, FINGERS[i].colour))

  if (hand.pinched) {
    const p = toScreen(hand.point, rect, { mirrored: true })
    context.lineWidth = 3
    context.strokeStyle = PINCH_COLOUR
    context.beginPath()
    context.arc(p.x, p.y, 18, 0, Math.PI * 2)
    context.stroke()
  }
}

function drawString(string, held, now) {
  const { a, b } = string
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length }
  const age = string.pluck ? now - string.pluck.time : Infinity
  const colour = NOTE_COLOURS[string.midi % 12]
  const ringing = age < 1.5

  context.save()
  context.strokeStyle = colour
  context.lineWidth = held ? 6 : 4
  context.shadowColor = colour
  context.shadowBlur = ringing ? 26 : 10
  context.beginPath()
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const s = i / SEGMENTS
    const offset = Number.isFinite(age) ? displacement(s, string.pluck, age) * SWING_PX : 0
    const x = a.x + (b.x - a.x) * s + normal.x * offset
    const y = a.y + (b.y - a.y) * s + normal.y * offset
    if (i === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }
  context.stroke()
  context.restore()

  dot(a, 6, colour)
  dot(b, 6, colour)
  label(noteName(string.midi), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, normal, colour)
}

function drawDraft(draft) {
  context.save()
  context.setLineDash([14, 10])
  context.strokeStyle = PINCH_COLOUR
  context.lineWidth = 4
  context.shadowColor = '#8fd3e8'
  context.shadowBlur = 18
  segment(draft.a, draft.b)
  context.restore()
  dot(draft.a, 10, PINCH_COLOUR)
  dot(draft.b, 10, PINCH_COLOUR)
  const length = Math.hypot(draft.b.x - draft.a.x, draft.b.y - draft.a.y) || 1
  const normal = { x: -(draft.b.y - draft.a.y) / length, y: (draft.b.x - draft.a.x) / length }
  const mid = { x: (draft.a.x + draft.b.x) / 2, y: (draft.a.y + draft.b.y) / 2 }
  label(noteName(draft.midi), mid, normal, PINCH_COLOUR)
}

function label(text, at, normal, colour) {
  // Above the line, whichever way the line runs.
  const side = normal.y > 0 ? -1 : 1
  context.font = '500 15px "JetBrains Mono", ui-monospace, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = colour
  context.fillText(text, at.x + normal.x * 22 * side, at.y + normal.y * 22 * side)
}

function segment(a, b) {
  context.beginPath()
  context.moveTo(a.x, a.y)
  context.lineTo(b.x, b.y)
  context.stroke()
}

function dot(p, radius, colour) {
  context.fillStyle = colour
  context.beginPath()
  context.arc(p.x, p.y, radius, 0, Math.PI * 2)
  context.fill()
}

function run(landmarker, instrument) {
  const tracker = createPinchTracker()
  const board = createStringBoard()
  let lastVideoTime = -1
  let hands = []
  let rect = null

  const frame = () => {
    requestAnimationFrame(frame)
    const now = performance.now() / 1000

    // Track only on a new camera frame; draw every frame so strings keep moving.
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime
      const result = landmarker.detectForVideo(video, performance.now())
      hands = tracker.update(handsOf(result))
      rect = coverRect({ width: video.videoWidth, height: video.videoHeight }, screen)

      const onScreen = hands.map((h) => ({
        side: h.side,
        pinched: h.pinched,
        point: toScreen(h.point, rect, { mirrored: true }),
        tip: toScreen(h.landmarks[INDEX_TIP], rect, { mirrored: true }),
      }))
      for (const event of board.update(onScreen, { ...screen, time: now })) {
        const { string } = event
        if (event.type === 'add') instrument.prepare(string.frequency)
        if (event.type === 'pluck') {
          const centre = ((string.a.x + string.b.x) / 2 / screen.width) * 2 - 1
          instrument.pluck(string.frequency, event.strength, centre * 0.7)
        }
      }

      const count = board.strings.length
      say(
        board.draft
          ? `${noteName(board.draft.midi)} — 片手を離すと弦が残ります`
          : hands.length === 0
            ? '手をカメラに写してください'
            : count === 0
              ? '両手でつまんで広げ、片手を離して弦を張る'
              : `弦 ${count} 本 — 人差し指ではじく`,
      )
    }

    context.clearRect(0, 0, screen.width, screen.height)
    for (const string of board.strings) drawString(string, board.isHeld(string), now)
    if (board.draft) drawDraft(board.draft)
    if (rect) for (const hand of hands) drawHand(hand, rect)
  }
  requestAnimationFrame(frame)
}

let instrument = null

async function start() {
  startButton.disabled = true
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('このブラウザではカメラを使えません（HTTPS で開いてください）')
    }
    // Created inside the click, before any await, so Safari lets it play.
    instrument ??= createInstrument()
    startButton.textContent = 'カメラを起動中…'
    await openCamera()
    startButton.textContent = 'モデルを読み込み中…'
    const landmarker = await loadLandmarker()
    intro.hidden = true
    run(landmarker, instrument)
  } catch (error) {
    startButton.disabled = false
    startButton.textContent = 'もう一度試す'
    const denied = error?.name === 'NotAllowedError'
    say(denied ? 'カメラの使用が許可されませんでした' : String(error?.message ?? error))
  }
}

resize()
window.addEventListener('resize', resize)
startButton.addEventListener('click', start)
