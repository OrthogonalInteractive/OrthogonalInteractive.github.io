import './style.css'
import { coverRect, toScreen } from './cover.js'
import { createPinchTracker } from './pinch.js'

// Shared with the AR page, which vendors them (see `npm run fetch:hand-assets`).
const ASSET_DIR = '/xr/mediapipe'

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

function drawLine([from, to], rect) {
  const a = toScreen(from, rect, { mirrored: true })
  const b = toScreen(to, rect, { mirrored: true })
  context.save()
  context.shadowColor = '#8fd3e8'
  context.shadowBlur = 24
  context.strokeStyle = PINCH_COLOUR
  context.lineWidth = 6
  segment(a, b)
  context.restore()
  dot(a, 10, PINCH_COLOUR)
  dot(b, 10, PINCH_COLOUR)
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

function run(landmarker) {
  const tracker = createPinchTracker()
  let lastTime = -1

  const frame = () => {
    requestAnimationFrame(frame)
    if (video.readyState < 2 || video.currentTime === lastTime) return
    lastTime = video.currentTime

    const result = landmarker.detectForVideo(video, performance.now())
    const { hands, line } = tracker.update(handsOf(result))
    const rect = coverRect({ width: video.videoWidth, height: video.videoHeight }, screen)

    context.clearRect(0, 0, screen.width, screen.height)
    for (const hand of hands) drawHand(hand, rect)
    if (line) drawLine(line, rect)

    const pinching = hands.filter((h) => h.pinched).length
    say(
      hands.length === 0
        ? '手をカメラに写してください'
        : line
          ? '両手でつまんでいます'
          : `検出 ${hands.length} 手 / つまみ ${pinching}`,
    )
  }
  requestAnimationFrame(frame)
}

async function start() {
  startButton.disabled = true
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('このブラウザではカメラを使えません（HTTPS で開いてください）')
    }
    startButton.textContent = 'カメラを起動中…'
    await openCamera()
    startButton.textContent = 'モデルを読み込み中…'
    const landmarker = await loadLandmarker()
    intro.hidden = true
    run(landmarker)
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
