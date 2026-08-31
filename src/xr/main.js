import * as THREE from 'three'
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'
import { loadCatModel } from './catModel.js'
import { fingertip, isTouching, screenCircle } from './contact.js'
import { createHandOverlay, videoRect } from './handOverlay.js'
import { HAND_ASSETS, HAND_CACHE, createAssetStore, installAssetWorker } from './handAssets.js'
import { createStrokeTracker } from './stroke.js'
import { swirlAngle } from './swirl.js'
import { unsupportedReason } from './support.js'
import './xr.css'

const TARGET_SRC = '/xr/targets.mind'

// How much of the swept angle the object takes on.
const SPIN_GAIN = 1

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
  let handTracker = null
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

  anchor.onTargetFound = () => {
    hint.classList.add('is-found')
    hintText.textContent = 'Mark found'
  }
  anchor.onTargetLost = () => {
    hint.classList.remove('is-found')
    hintText.textContent = 'Looking for the mark'
  }

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

  handButton.addEventListener('click', async () => {
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
      handButton.hidden = true
      handClear.hidden = !cached
      hintText.textContent = 'Stroke it to turn'
      handNote.textContent = 'Hand control on'
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
  anchor.onTargetFound = () => {
    clearTimeout(nudge)
    hint.classList.add('is-found')
    hintText.textContent = 'Mark found'
  }

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
    }
    holder.updateMatrixWorld(true)
    markerNormal.setFromMatrixColumn(holder.matrixWorld, 2).normalize()
    objectPosition.setFromMatrixPosition(holder.matrixWorld)
    clipPlane.setFromNormalAndCoplanarPoint(markerNormal, objectPosition)

    if (handTracker && frame++ % DETECT_EVERY === 0) {
      const landmarks = handTracker.detect(mindarThree.video, performance.now())
      // Contact is judged on screen: the landmarks carry no depth that could
      // place the finger in front of or behind the object.
      const rect = videoRect(mindarThree.video)
      const size = { width: window.innerWidth, height: window.innerHeight }
      markerScale.setFromMatrixColumn(holder.matrixWorld, 0)
      const circle = holder.visible
        ? screenCircle(cat.group, camera, cat.radius * markerScale.length(), size)
        : null
      const point = landmarks ? fingertip(landmarks, rect) : null
      touching = isTouching(point, circle)

      // Rotation is confined to the mark's normal, so only how far the finger
      // travelled *around* the object counts.
      const { from, to } = stroke.update({ point, touching })
      const swept = swirlAngle(from, to, circle)
      if (swept) {
        // Screen y points down, so a sweep that reads clockwise turns the
        // object negatively about a normal facing the lens.
        toCamera.subVectors(camera.position, objectPosition)
        const facing = markerNormal.dot(toCamera) > 0 ? -1 : 1
        cat.spin(markerNormal, swept * facing * SPIN_GAIN)
      }

      cat.setHighlight(touching ? 1 : 0)
      overlay.draw(landmarks, rect, { touching })
      hint.classList.toggle('is-found', touching)

      if (debugging) {
        debugPanel.textContent = [
          `hand    ${landmarks ? 'yes' : 'no'}`,
          `touch   ${touching ? 'YES' : 'no'}`,
          `swirl   ${((swept * 180) / Math.PI).toFixed(0)}deg`,
          `object  ${circle ? `${circle.x.toFixed(0)},${circle.y.toFixed(0)} r${circle.r.toFixed(0)}` : '-'}`,
          `finger  ${point ? `${point.x.toFixed(0)},${point.y.toFixed(0)}` : '-'}`,
        ].join('\n')
      }
    }

    cat.update(delta)
    renderer.render(scene, camera)
  })

  // Offer hand control only once the mark has actually been registered.
  let revealed = false
  const originalFound = anchor.onTargetFound
  anchor.onTargetFound = () => {
    originalFound()
    if (!revealed) {
      revealed = true
      cat.reveal()
    }
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
