import * as THREE from 'three'
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'
import { createBrandObject } from './brandObject.js'
import { createGrabSession } from './grabSession.js'
import { HAND_ASSETS, HAND_CACHE, createAssetStore, installAssetWorker } from './handAssets.js'
import { createPinchTracker } from './pinch.js'
import { unsupportedReason } from './support.js'
import './xr.css'

const TARGET_SRC = '/xr/targets.mind'

// A modest wrist turn should read as a definite spin.
const TWIST_GAIN = 2

// Hand detection every other frame keeps the interaction responsive without
// paying for it on every render.
const DETECT_EVERY = 2

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
  setNote('Starting camera…')

  const mindarThree = new MindARThree({
    container: document.querySelector('#scene'),
    imageTargetSrc: TARGET_SRC,
    uiLoading: 'no',
    uiScanning: 'no',
    uiError: 'no',
  })

  const { renderer, scene, camera } = mindarThree
  const pinch = createPinchTracker()
  let handTracker = null
  let frame = 0
  let grab = null

  scene.add(new THREE.AmbientLight(0xbcd6de, 1.1))
  const keyLight = new THREE.DirectionalLight(0xdff0f6, 2.2)
  keyLight.position.set(0.6, 0.8, 1.4)
  scene.add(keyLight)
  const rimLight = new THREE.PointLight(0x8fd3e8, 3, 6)
  rimLight.position.set(-0.8, -0.4, 1)
  scene.add(rimLight)

  const brand = createBrandObject()
  const anchor = mindarThree.addAnchor(0)

  // The object rides its own group rather than the anchor's. MindAR wipes a
  // lost anchor's matrix to zeroes, so anything parented to it vanishes the
  // instant a hand covers the mark — which is exactly when it must not.
  const holder = new THREE.Group()
  holder.matrixAutoUpdate = false
  holder.visible = false
  holder.add(brand.group)
  scene.add(holder)

  anchor.onTargetFound = () => {
    hint.classList.add('is-found')
    hintText.textContent = 'Mark found'
  }
  anchor.onTargetLost = () => {
    hint.classList.remove('is-found')
    hintText.textContent = 'Looking for the mark'
  }

  grab = createGrabSession({
    object: brand,
    twistGain: TWIST_GAIN,
    onLatch: () => mindarThree.controller.stopProcessVideo(),
    onResume: () => mindarThree.controller.processVideo(mindarThree.video),
  })

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
      hintText.textContent = 'Pinch to grab'
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
        ? 'Camera access was blocked. Allow it in the browser settings and try again.'
        : `Could not start: ${error?.message ?? error}`,
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

  const clock = new THREE.Clock()
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta()

    if (handTracker && frame++ % DETECT_EVERY === 0) {
      const landmarks = handTracker.detect(mindarThree.video, performance.now())
      const gesture = pinch.update(landmarks)
      grab.apply({ handPresent: Boolean(landmarks), gesture })

      if (gesture.justGrabbed) {
        hint.classList.add('is-found')
        hintText.textContent = 'Holding'
      }
      if (gesture.justReleased) hintText.textContent = 'Pinch to grab'
    }

    // Follow the mark only while the tracker owns it. Once frozen — or once the
    // mark is out of sight — the object simply stays where it was last seen.
    if (!grab.latched && anchor.group.visible) {
      holder.matrix.copy(anchor.group.matrix)
      holder.matrixWorldNeedsUpdate = true
      holder.visible = true
    }

    brand.update(delta)
    renderer.render(scene, camera)
  })

  // Offer hand control only once the mark has actually been registered.
  const originalFound = anchor.onTargetFound
  anchor.onTargetFound = () => {
    originalFound()
    if (hand.hidden) {
      hand.hidden = false
      showCacheState()
    }
  }

  window.addEventListener('pagehide', () => {
    renderer.setAnimationLoop(null)
    handTracker?.close()
    mindarThree.stop()
    brand.dispose()
  })
}

const reason = unsupportedReason()
if (reason) {
  startButton.disabled = true
  setNote(reason, true)
} else {
  setNote('Camera stays on your device — nothing is uploaded.')
  startButton.disabled = false
  startButton.addEventListener('click', launch, { once: true })
}
