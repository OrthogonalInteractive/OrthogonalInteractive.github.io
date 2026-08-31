import * as THREE from 'three'
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'
import { createBrandObject } from './brandObject.js'
import { createGrabSession } from './grabSession.js'
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
  anchor.group.add(brand.group)

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
    onLatch: () => {
      mindarThree.controller.stopProcessVideo()
      hint.classList.add('is-found')
      hintText.textContent = 'Holding'
    },
    onResume: () => {
      mindarThree.controller.processVideo(mindarThree.video)
      hintText.textContent = 'Pinch to grab'
    },
  })

  handButton.addEventListener('click', async () => {
    handButton.disabled = true
    handNote.textContent = 'Loading hand control…'
    try {
      const { loadHandTracker } = await import('./handControl.js')
      handTracker = await loadHandTracker()
      hand.hidden = true
      hintText.textContent = 'Pinch to grab'
    } catch (error) {
      handButton.disabled = false
      handNote.textContent = `Hand control failed: ${error?.message ?? error}`
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
      grab.apply(pinch.update(landmarks))
    }

    brand.update(delta)
    renderer.render(scene, camera)
  })

  // Offer hand control only once the mark has actually been registered.
  const originalFound = anchor.onTargetFound
  anchor.onTargetFound = () => {
    originalFound()
    if (!handTracker) hand.hidden = false
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
