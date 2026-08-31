import * as THREE from 'three'
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js'
import { createBrandObject } from './brandObject.js'
import { unsupportedReason } from './support.js'
import './xr.css'

const TARGET_SRC = '/xr/targets.mind'

const intro = document.querySelector('#intro')
const startButton = document.querySelector('#start')
const note = document.querySelector('#note')
const hint = document.querySelector('#hint')
const hintText = document.querySelector('#hint-text')

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
    brand.update(clock.getElapsedTime())
    renderer.render(scene, camera)
  })

  window.addEventListener('pagehide', () => {
    renderer.setAnimationLoop(null)
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
  startButton.addEventListener('click', launch, { once: true })
}
