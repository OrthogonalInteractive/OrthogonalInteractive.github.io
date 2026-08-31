import * as THREE from 'three'
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'
import { loadCatModel } from './catModel.js'
import { fingertip, isTouching, screenCircle } from './contact.js'
import { createHandOverlay, videoRect } from './handOverlay.js'
import { createPinchScale } from './pinchScale.js'
import { createScreenPinch } from './screenPinch.js'
import { HAND_ASSETS, HAND_CACHE, createAssetStore, installAssetWorker } from './handAssets.js'
import { createStrokeTracker } from './stroke.js'
import { swirlAngle } from './swirl.js'
import { unsupportedReason } from './support.js'
import './xr.css'

const TARGET_SRC = '/xr/targets.mind'

// How much of the swept angle the object takes on.
const SPIN_GAIN = 1

// The largest the model can be made, by either kind of pinch.
const MAX_SCALE = 2.5

// Hand detection every other frame keeps the interaction responsive without
// paying for it on every render.
const DETECT_EVERY = 2

const debugPanel = document.querySelector('#debug')
const headingPanel = document.querySelector('#heading')
const headingValue = document.querySelector('#heading-value')
const debugging = new URLSearchParams(location.search).has('debug')
const HEADING_KEY = 'oi-xr-heading'

const intro = document.querySelector('#intro')
const startButton = document.querySelector('#start')
const note = document.querySelector('#note')
const hint = document.querySelector('#hint')
const hintText = document.querySelector('#hint-text')
const hand = document.querySelector('#hand')
const handButton = document.querySelector('#hand-enable')
const handNote = document.querySelector('#hand-note')
const handClear = document.querySelector('#hand-clear')

const assets = createAssetStore({ urls: HAND_ASSETS, cacheName: HAND_CACHE })

function setNote(message, isError = false) {
  note.textContent = message
  note.classList.toggle('is-error', isError)
}

async function launch() {
  startButton.disabled = true
  setNote('カメラを起動しています…')

  const mindarThree = new MindARThree({
    container: document.querySelector('#scene'),
    imageTargetSrc: TARGET_SRC,
    uiLoading: 'no',
    uiScanning: 'no',
    uiError: 'no',
  })

  const { renderer, scene, camera } = mindarThree
  const overlay = createHandOverlay(document.querySelector('#overlay'))
  const stroke = createStrokeTracker()
  const pinch = createPinchScale({ maxScale: MAX_SCALE })
  let lastDetectAt = 0
  let handTracker = null
  let handOn = false
  let frame = 0
  let touching = false

  scene.add(new THREE.AmbientLight(0xbcd6de, 1.1))
  const keyLight = new THREE.DirectionalLight(0xdff0f6, 2.2)
  keyLight.position.set(0.6, 0.8, 1.4)
  scene.add(keyLight)
  const rimLight = new THREE.PointLight(0x8fd3e8, 3, 6)
  rimLight.position.set(-0.8, -0.4, 1)
  scene.add(rimLight)

  const cat = await loadCatModel()
  const anchor = mindarThree.addAnchor(0)

  // The object rides its own group rather than the anchor's. MindAR wipes a
  // lost anchor's matrix to zeroes, so anything parented to it vanishes the
  // instant a hand covers the mark — which is exactly when it must not.
  const holder = new THREE.Group()
  holder.matrixAutoUpdate = false
  holder.visible = false
  holder.add(cat.group)
  scene.add(holder)

  /** Reflects whether the 19 MB is already on the device. */
  async function showCacheState() {
    if (!assets.available) {
      handNote.textContent = 'Adds a 19 MB download'
      return
    }
    const cached = await assets.isCached()
    handNote.textContent = cached ? '19 MB cached on this device' : 'Adds a 19 MB download'
    handClear.hidden = !cached
  }

  handClear.addEventListener('click', async () => {
    handClear.disabled = true
    await assets.clear()
    handClear.hidden = true
    handClear.disabled = false
    handNote.textContent = handTracker
      ? 'Cache cleared — downloads again next visit'
      : 'Adds a 19 MB download'
  })

  /** Stops reading the camera for hands without discarding the loaded model. */
  function handControlOff() {
    handOn = false
    handSeen = false
    touching = false
    pinched = false
    overlay.clear()
    screenPinch.reset()
    cat.setSize(1)
    cat.setHighlight(0)
    handButton.textContent = 'Enable hand control'
    hintText.textContent = 'Swipe it to turn'
    showCacheState()
  }

  function handControlOn() {
    handOn = true
    pointers.clear()
    screenPinching = false
    stopSwipe()
    handButton.textContent = 'Turn hand control off'
    hintText.textContent = 'Stroke it to turn'
    handNote.textContent = 'Hand control on'
  }

  handButton.addEventListener('click', async () => {
    if (handOn) return handControlOff()

    // Already loaded once this session: switching back on costs nothing.
    if (handTracker) return handControlOn()

    handButton.disabled = true
    handClear.hidden = true
    try {
      await installAssetWorker()
      handNote.textContent = 'Downloading… 0%'
      await assets.download((ratio) => {
        handNote.textContent = `Downloading… ${Math.round(ratio * 100)}%`
      })

      handNote.textContent = 'Starting hand control…'
      const { loadHandTracker } = await import('./handControl.js')
      handTracker = await loadHandTracker()

      // Resolve everything before touching the UI, so the panel never shows a
      // half-applied state.
      const cached = await assets.isCached()
      handButton.disabled = false
      handClear.hidden = !cached
      handControlOn()
    } catch (error) {
      handButton.disabled = false
      handNote.textContent = `Hand control failed: ${error?.message ?? error}`
      await showCacheState()
    }
  })

  try {
    await mindarThree.start()
  } catch (error) {
    startButton.disabled = false
    const denied = error?.name === 'NotAllowedError'
    setNote(
      denied
        ? 'カメラの使用が拒否されました。ブラウザの設定で許可してから、もう一度お試しください。'
        : `開始できませんでした: ${error?.message ?? error}`,
      true,
    )
    return
  }

  intro.classList.add('is-gone')
  hint.hidden = false

  // Nothing found after a while usually means lighting or angle, so say so
  // rather than leaving the dot blinking indefinitely.
  const nudge = setTimeout(() => {
    if (!hint.classList.contains('is-found')) {
      hintText.textContent = 'Try more light, or hold it face-on'
    }
  }, 20000)

  if (debugging) {
    debugPanel.hidden = false
    headingPanel.hidden = false

    // Lets the heading be measured against a real printed card, which is the
    // only place the artwork and the model can actually be compared.
    const stored = Number(localStorage.getItem(HEADING_KEY))
    if (Number.isFinite(stored) && stored) cat.heading = stored
    headingValue.textContent = `${cat.heading}°`

    headingPanel.addEventListener('click', (event) => {
      const turn = Number(event.target.dataset?.turn)
      if (!turn) return
      cat.heading = (((cat.heading + turn) % 360) + 360) % 360
      headingValue.textContent = `${cat.heading}°`
      localStorage.setItem(HEADING_KEY, String(cat.heading))
    })
  }
  const markerScale = new THREE.Vector3()
  const markerNormal = new THREE.Vector3()
  const objectPosition = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  const clipPlane = new THREE.Plane()
  const clock = new THREE.Clock()

  // The model climbs out from under the card, so whatever is still below the
  // mark's plane must not be drawn.
  renderer.localClippingEnabled = true
  cat.applyClipping(clipPlane)

  // A hand covering the mark and the camera being taken off it look identical
  // to the tracker, so they are told apart by how long the loss lasts — and a
  // hand in frame keeps the object regardless, since that is the occluding case.
  //
  // Tracking drops out constantly in ordinary use: a hand's shadow, motion
  // blur, an awkward angle. Without hand control there is no hand to vouch for
  // those, so the wait has to be long enough to ride them out — otherwise the
  // model blinks away and comes back up out of the card over and over.
  const HIDE_AFTER = 2000
  let lostSince = -Infinity
  let handSeen = false
  let pinched = false

  // Where the object sits on screen this frame; both the fingertip and a
  // swiping thumb are measured against it.
  let circle = null

  /** Turns a swept angle into rotation about the model's upright axis. */
  function spinBy(swept) {
    if (!swept) return
    // Screen y points down, so a sweep that reads clockwise turns the object
    // negatively when the card is facing the lens.
    toCamera.subVectors(camera.position, objectPosition)
    const facing = markerNormal.dot(toCamera) > 0 ? -1 : 1
    cat.spin(swept * facing * SPIN_GAIN)
  }

  // Until hand control is switched on, the same turntable answers to a swipe,
  // and two fingers resize the model the way a touchscreen usually does.
  const swipe = createStrokeTracker()
  const screenPinch = createScreenPinch({ max: MAX_SCALE })
  const pointers = new Map()
  let swiping = false
  let screenPinching = false

  const pair = () => [...pointers.values()]
  let handReadout = []

  const stopSwipe = () => {
    swiping = false
    swipe.update({ point: null, touching: false })
  }

  document.addEventListener('pointerdown', (event) => {
    if (handOn || event.target.closest('button, a')) return
    const point = { x: event.clientX, y: event.clientY }
    pointers.set(event.pointerId, point)

    if (pointers.size === 2) {
      // A second finger turns the gesture into a resize, not a turn.
      stopSwipe()
      screenPinching = true
      screenPinch.begin(...pair())
      return
    }
    if (pointers.size > 2 || !isTouching(point, circle)) return
    swiping = true
    swipe.update({ point, touching: true })
  })

  document.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (screenPinching && pointers.size >= 2) {
      cat.setSize(screenPinch.update(...pair()))
      return
    }
    if (!swiping) return
    const { from, to } = swipe.update({
      point: { x: event.clientX, y: event.clientY },
      touching: true,
    })
    spinBy(swirlAngle(from, to, circle))
  })

  const liftPointer = (event) => {
    pointers.delete(event.pointerId)
    if (pointers.size < 2 && screenPinching) {
      screenPinching = false
      screenPinch.end()
    }
    if (pointers.size === 0) stopSwipe()
  }
  document.addEventListener('pointerup', liftPointer)
  document.addEventListener('pointercancel', liftPointer)

  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta()

    // Follow the mark only while the tracker owns it. Once frozen — or once the
    // mark is out of sight — the object simply stays where it was last seen.
    // The tracker keeps running alongside the hand; the pose is only held
    // still while a finger is on the object, where a partly covered mark would
    // otherwise make it jitter.
    if (!touching && anchor.group.visible) {
      holder.matrix.copy(anchor.group.matrix)
      holder.matrixWorldNeedsUpdate = true
      holder.visible = true
      lostSince = Infinity
    }

    cat.setPresent(
      anchor.group.visible ||
        handSeen ||
        swiping ||
        performance.now() - lostSince < HIDE_AFTER,
    )
    holder.updateMatrixWorld(true)
    markerNormal.setFromMatrixColumn(holder.matrixWorld, 2).normalize()
    objectPosition.setFromMatrixPosition(holder.matrixWorld)
    clipPlane.setFromNormalAndCoplanarPoint(markerNormal, objectPosition)

    const size = { width: window.innerWidth, height: window.innerHeight }
    markerScale.setFromMatrixColumn(holder.matrixWorld, 0)
    circle = holder.visible
      ? screenCircle(cat.group, camera, cat.radius * markerScale.length(), size)
      : null

    if (handOn && frame++ % DETECT_EVERY === 0) {
      const landmarks = handTracker.detect(mindarThree.video, performance.now())
      // Contact is judged on screen: the landmarks carry no depth that could
      // place the finger in front of or behind the object.
      const rect = videoRect(mindarThree.video)
      const point = landmarks ? fingertip(landmarks, rect) : null
      handSeen = Boolean(landmarks)
      touching = isTouching(point, circle)

      // Opening the fingers resizes the model, but only while they move
      // slowly — the reading needs the real gap between detections, which is
      // several render frames.
      const now = performance.now()
      const sinceDetect = lastDetectAt ? (now - lastDetectAt) / 1000 : 0
      lastDetectAt = now
      const { closed, scale, speed } = pinch.update(landmarks, sinceDetect)
      pinched = closed
      cat.setSize(scale)

      // Rotation is confined to the mark's normal, so only how far the finger
      // travelled *around* the object counts.
      const { from, to } = stroke.update({ point, touching })
      const swept = swirlAngle(from, to, circle)
      spinBy(swept)

      overlay.draw(landmarks, rect, { touching, pinched })
      hint.classList.toggle('is-found', touching)
      handReadout = [
        `hand    ${landmarks ? 'yes' : 'no'}`,
        `pinch   ${closed ? 'CLOSED' : 'open'}`,
        `size    ${scale.toFixed(2)}x`,
        `speed   ${speed.toFixed(1)}/s`,
      ]
    }

    cat.setHighlight(touching || swiping || screenPinching ? 1 : 0)
    cat.update(delta)

    if (debugging) {
      debugPanel.textContent = [
        ...handReadout,
        `swipe   ${swiping ? 'YES' : screenPinching ? 'PINCH' : 'no'}`,
        `screen  ${screenPinch.scale.toFixed(2)}x`,
        `touch   ${touching ? 'YES' : 'no'}`,
        `turn    ${cat.turn}deg`,
        `anim    ${cat.animationTime.toFixed(1)}s`,
        `fit     r=${cat.radius.toFixed(2)} s=${cat.fitScale.toFixed(3)}`,
        `object  ${circle ? `${circle.x.toFixed(0)},${circle.y.toFixed(0)} r${circle.r.toFixed(0)}` : '-'}`,
      ].join('\n')
    }
    renderer.render(scene, camera)
  })

  anchor.onTargetLost = () => {
    lostSince = performance.now()
    hint.classList.remove('is-found')
    hintText.textContent = 'Looking for the mark'
  }

  anchor.onTargetFound = () => {
    clearTimeout(nudge)
    hint.classList.add('is-found')
    hintText.textContent = 'Mark found'

    // Rise again only if it had actually gone; a stutter should not restart it.
    if (cat.gone) cat.reveal()

    // Offer hand control only once the mark has actually been registered.
    if (hand.hidden) {
      hand.hidden = false
      showCacheState()
    }
  }

  window.addEventListener('pagehide', () => {
    renderer.setAnimationLoop(null)
    handTracker?.close()
    overlay.dispose()
    mindarThree.stop()
    cat.dispose()
  })
}

const reason = unsupportedReason()
if (reason) {
  startButton.disabled = true
  setNote(reason, true)
} else {
  setNote('カメラ映像は端末内で処理され、送信されません。')
  startButton.disabled = false
  startButton.addEventListener('click', launch, { once: true })
}
