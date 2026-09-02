import * as THREE from 'three'
import { loadCatModel } from '../xr/catModel.js'
import { fingertip, isTouching, screenCircle } from '../xr/contact.js'
import { createHandOverlay } from '../xr/handOverlay.js'
import { HAND_ASSETS, HAND_CACHE, createAssetStore, installAssetWorker } from '../xr/handAssets.js'
import { createPinchScale } from '../xr/pinchScale.js'
import { createScreenPinch } from '../xr/screenPinch.js'
import { createStrokeTracker } from '../xr/stroke.js'
import { swirlAngle } from '../xr/swirl.js'
import { unsupportedReason } from '../xr/support.js'
import { createCameraFrame } from './cameraFrame.js'
import { markerSpan } from './marker.js'
import { coverRect } from './view.js'
import '../xr/xr.css'
import './xr2.css'

// XR8's three.js module reads the global rather than taking an import.
window.THREE = THREE

const TARGET_URL = '/xr2/card-target.json'

// How far the model reaches across the mark. It stands a little proud of the
// card so it reads as an object on it rather than a decal in it.
const MODEL_SIZE = 1.5

// The printed mark on the business card, in metres. Absolute scale needs a real
// measurement: monocular SLAM has no size of its own.
const MARK_WIDTH = 0.024

const MAX_SCALE = 2.5
const SPIN_GAIN = 1
const DETECT_EVERY = 2

// Longest side of the frame handed to the hand tracker. Every pixel here is a
// GPU readback on the render thread, so it stays well below the camera's own.
const HAND_FRAME = 320

const params = new URLSearchParams(location.search)
const debugging = params.has('debug')
const markWidth = Number(params.get('w')) || MARK_WIDTH
const modelSize = Number(params.get('s')) || MODEL_SIZE
const turnOverride = params.get('rot')

const intro = document.querySelector('#intro')
const startButton = document.querySelector('#start')
const note = document.querySelector('#note')
const hint = document.querySelector('#hint')
const hintText = document.querySelector('#hint-text')
const hand = document.querySelector('#hand')
const handButton = document.querySelector('#hand-enable')
const handNote = document.querySelector('#hand-note')
const handClear = document.querySelector('#hand-clear')
const debugPanel = document.querySelector('#debug')

const assets = createAssetStore({ urls: HAND_ASSETS, cacheName: HAND_CACHE })

// Every failure so far has been invisible from the phone that hit it, which is
// the only place this page runs. The stage log is on by default for that
// reason; ?debug adds the per-frame numbers underneath it.
const stages = []
let readout = []
debugPanel.hidden = false

function paint() {
  debugPanel.textContent = [...stages.slice(-12), ...readout].join('\n')
}

function say(...parts) {
  stages.push(parts.join(' '))
  paint()
}

function setNote(message, isError = false) {
  note.textContent = message
  note.classList.toggle('is-error', isError)
}

// Without these a failure anywhere in setup shows only as a button that does
// nothing at all.
window.addEventListener('error', (event) => {
  say('ERROR:', event.message)
  setNote(`エラー: ${event.message}`, true)
})
window.addEventListener('unhandledrejection', (event) => {
  say('REJECTED:', event.reason?.message ?? event.reason)
  setNote(`エラー: ${event.reason?.message ?? event.reason}`, true)
})

/** The engine and its helpers arrive as async scripts, each with its own event. */
function waitFor(name, event) {
  return new Promise((resolve) => {
    if (window[name]) return resolve(window[name])
    window.addEventListener(event, () => resolve(window[name]), { once: true })
  })
}

async function prepare() {
  setNote('エンジンを読み込んでいます…')

  const startedAt = performance.now()
  const [XR8] = await Promise.all([
    waitFor('XR8', 'xrloaded'),
    waitFor('XRExtras', 'xrextrasloaded'),
  ])
  const { XRExtras } = window
  say(`engine ${((performance.now() - startedAt) / 1000).toFixed(1)}s | three ${THREE.REVISION}`)
  const device = XR8.XrDevice.deviceEstimate()
  say(`${device.os} ${device.osVersion} / ${device.browser?.name}`,
      `| compatible ${XR8.XrDevice.isDeviceBrowserCompatible()}`)

  setNote('モデルを読み込んでいます…')
  const [target, cat] = await Promise.all([
    fetch(TARGET_URL).then((response) => response.json()),
    loadCatModel({ size: modelSize }),
  ])
  say(`target & model ready | w ${(markWidth * 1000).toFixed(0)}mm | s ${modelSize}x`)
  target.physicalWidthInMeters = markWidth
  // The card is what the room is measured from, not something to keep chasing.
  target.moveable = false

  const canvas = document.createElement('canvas')
  document.querySelector('#scene').appendChild(canvas)

  const overlay = createHandOverlay(document.querySelector('#overlay'))
  const cameraFrame = createCameraFrame()
  const stroke = createStrokeTracker()
  const pinch = createPinchScale({ maxScale: MAX_SCALE })
  const swipe = createStrokeTracker()
  const screenPinch = createScreenPinch({ max: MAX_SCALE })

  const clock = new THREE.Clock()
  const clipPlane = new THREE.Plane()
  const markNormal = new THREE.Vector3()
  const objectPosition = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  const worldScale = new THREE.Vector3()

  let anchor = null
  let circle = null
  let span = markWidth
  let uiOrientation = 0
  let pixelModuleAdded = false
  let ticks = 0
  let status = '-'

  let handTracker = null
  let handOn = false
  let handSeen = false
  let touching = false
  let pinched = false
  let frames = 0
  let lastDetectAt = 0
  let handReadout = []

  const pointers = new Map()
  let swiping = false
  let screenPinching = false
  let fps = 0
  let fpsAt = performance.now()
  let fpsFrames = 0

  /** Degrees the raw camera frame is turned by to match the display. */
  const frameTurn = () => (turnOverride !== null ? Number(turnOverride) : -uiOrientation)

  // --- hand control -------------------------------------------------------

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

  const stopSwipe = () => {
    swiping = false
    swipe.update({ point: null, touching: false })
  }

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
    // Reading pixels back off the GPU costs a stall every frame, so the module
    // is only attached once someone actually asks for hand control.
    if (!pixelModuleAdded) {
      XR8.addCameraPipelineModule(
        XR8.CameraPixelArray.pipelineModule({ maxDimension: HAND_FRAME }),
      )
      pixelModuleAdded = true
    }
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
    if (handTracker) return handControlOn()

    handButton.disabled = true
    handClear.hidden = true
    try {
      // Scope decides which pages the worker controls, so this page needs its
      // own registration even though the assets it serves live under /xr/.
      await installAssetWorker('/xr2/sw.js', '/xr2/')
      handNote.textContent = 'Downloading… 0%'
      await assets.download((ratio) => {
        handNote.textContent = `Downloading… ${Math.round(ratio * 100)}%`
      })

      handNote.textContent = 'Starting hand control…'
      const { loadHandTracker } = await import('../xr/handControl.js')
      handTracker = await loadHandTracker()

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

  // --- touch --------------------------------------------------------------

  /** Turns a swept angle into rotation about the mark's normal. */
  function spinBy(swept) {
    if (!swept || !anchor) return
    const { camera } = XR8.Threejs.xrScene()
    toCamera.subVectors(camera.position, objectPosition)
    const facing = markNormal.dot(toCamera) > 0 ? -1 : 1
    cat.spin(swept * facing * SPIN_GAIN)
  }

  const pair = () => [...pointers.values()]

  document.addEventListener('pointerdown', (event) => {
    if (handOn || event.target.closest('button, a')) return
    const point = { x: event.clientX, y: event.clientY }
    pointers.set(event.pointerId, point)

    if (pointers.size === 2) {
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

  // --- pipeline -----------------------------------------------------------

  window.addEventListener('pagehide', () => {
    handTracker?.close()
    overlay.dispose()
    cat.dispose()
    XR8.stop()
  })

  // Everything that can be awaited is done before the button goes live, so
  // the tap that starts the camera reaches XR8.run() in the same turn. An
  // await in between spends the gesture, and the prompt never comes up.
  startButton.disabled = false
  setNote('カメラ映像は端末内で処理され、送信されません。')
  startButton.addEventListener(
    'click',
    () => {
      startButton.disabled = true
      setNote('カメラを起動しています…')
      // Out of the way at once. The engine puts its own permission and loading
      // UI up from here, and an opaque panel over it reads as a dead button.
      intro.classList.add('is-gone')
      say('XR8.run() …')

      XR8.XrController.configure({
        disableWorldTracking: false,
        // Without this the world has no size, and a mark measured in millimetres
        // cannot be told apart from one measured in metres.
        scale: 'absolute',
        imageTargetData: [target],
      })

      XR8.addCameraPipelineModules([
        XR8.GlTextureRenderer.pipelineModule(),
        XR8.Threejs.pipelineModule(),
        XR8.XrController.pipelineModule(),
        XRExtras.FullWindowCanvas.pipelineModule(),
        XRExtras.AlmostThere.pipelineModule(),
        XRExtras.Loading.pipelineModule(),
        XRExtras.RuntimeError.pipelineModule(),
        XRExtras.PauseOnHidden.pipelineModule(),
        {
          name: 'orthogonal',

          onStart: () => {
            const { scene, renderer } = XR8.Threejs.xrScene()
            scene.add(new THREE.AmbientLight(0xbcd6de, 1.1))
            const key = new THREE.DirectionalLight(0xdff0f6, 2.2)
            key.position.set(0.6, 1.4, 0.8)
            scene.add(key)
            const rim = new THREE.PointLight(0x8fd3e8, 3, 6)
            rim.position.set(-0.8, 1, -0.4)
            scene.add(rim)

            // The model climbs out from under the card, so whatever is still below
            // the mark's plane must not be drawn.
            renderer.localClippingEnabled = true
            cat.applyClipping(clipPlane)

            hint.hidden = false
            say('pipeline start')

            // A live camera over a black screen is either a canvas nobody can
            // see or a renderer wiping the feed before it reaches the glass,
            // and the only place to tell those apart is the phone it happens on.
            setTimeout(() => {
              const style = getComputedStyle(canvas)
              const drawSize = renderer.getSize(new THREE.Vector2())
              say(`canvas buf ${canvas.width}x${canvas.height}`,
                  `css ${canvas.clientWidth}x${canvas.clientHeight}`)
              say(` ${style.position} z:${style.zIndex} d:${style.display}`,
                  `o:${style.opacity} fit:${style.objectFit} in:${canvas.parentElement?.id}`)
              say(` renderer ${drawSize.x}x${drawSize.y} dpr ${renderer.getPixelRatio()}`,
                  `clear:${renderer.autoClear} own:${renderer.domElement === canvas}`)
              say(` frames ${ticks} tracking ${status} kids ${scene.children.length}`)
            }, 2000)
          },

          onCameraStatusChange: ({ status }) => {
            say('camera:', status)
            if (status === 'failed') {
              intro.classList.remove('is-gone')
              startButton.disabled = false
              setNote('カメラを開始できませんでした。ブラウザの設定で許可してから、もう一度お試しください。', true)
            }
          },

          onVideoSizeChange: ({ videoWidth, videoHeight, canvasWidth, canvasHeight, orientation }) => {
            uiOrientation = orientation
            overlay.resize()
            say(`video ${videoWidth}x${videoHeight}`,
                `canvas ${canvasWidth}x${canvasHeight} rot ${orientation}`)
          },

          onException: (error) => {
            say('EXCEPTION:', error?.message ?? error)
            setNote(`エラー: ${error?.message ?? error}`, true)
          },

          onUpdate: ({ processCpuResult, processGpuResult }) => {
            const delta = clock.getDelta()
            ticks += 1
            status = processCpuResult?.reality?.trackingStatus ?? '-'

            fpsFrames += 1
            const now = performance.now()
            if (now - fpsAt >= 500) {
              fps = (fpsFrames * 1000) / (now - fpsAt)
              fpsAt = now
              fpsFrames = 0
            }

            if (!anchor) return
            const { camera } = XR8.Threejs.xrScene()

            // The card's plane, in world space: the clip that hides the buried part
            // of the model, and the axis every stroke turns it about.
            anchor.updateMatrixWorld(true)
            markNormal.setFromMatrixColumn(anchor.matrixWorld, 1).normalize()
            objectPosition.setFromMatrixPosition(anchor.matrixWorld)
            clipPlane.setFromNormalAndCoplanarPoint(markNormal, objectPosition)

            cat.group.updateMatrixWorld(true)
            worldScale.setFromMatrixColumn(cat.group.matrixWorld, 0)
            circle = screenCircle(cat.group, camera, cat.radius * worldScale.length(), {
              width: window.innerWidth,
              height: window.innerHeight,
            })

            if (handOn && handTracker && frames++ % DETECT_EVERY === 0) {
              const pixels = processGpuResult?.camerapixelarray
              if (pixels && cameraFrame.update(pixels, frameTurn())) {
                const landmarks = handTracker.detect(cameraFrame.canvas, performance.now())
                // Contact is judged on screen: the landmarks carry no depth that
                // could place the finger in front of or behind the object.
                const rect = coverRect(cameraFrame.shape, {
                  width: window.innerWidth,
                  height: window.innerHeight,
                })
                const point = landmarks ? fingertip(landmarks, rect) : null
                handSeen = Boolean(landmarks)
                touching = isTouching(point, circle)

                const sinceDetect = lastDetectAt ? (now - lastDetectAt) / 1000 : 0
                lastDetectAt = now
                const { closed, scale, speed } = pinch.update(landmarks, sinceDetect)
                pinched = closed
                cat.setSize(scale)

                const { from, to } = stroke.update({ point, touching })
                spinBy(swirlAngle(from, to, circle))

                overlay.draw(landmarks, rect, { touching, pinched })
                hint.classList.toggle('is-found', touching)
                handReadout = [
                  `hand    ${landmarks ? 'yes' : 'no'}`,
                  `pinch   ${closed ? 'CLOSED' : 'open'}`,
                  `size    ${scale.toFixed(2)}x`,
                  `speed   ${speed.toFixed(1)}/s`,
                  `frame   ${cameraFrame.shape.width}x${cameraFrame.shape.height} @${frameTurn()}deg`,
                ]
              }
            }

            cat.setHighlight(touching || swiping || screenPinching ? 1 : 0)
            cat.update(delta)

            if (debugging) {
              readout = [
                ...handReadout,
                `mark    ${(span * 1000).toFixed(1)}u (declared ${(markWidth * 1000).toFixed(0)})`,
                `size    ${modelSize}x mark`,
                `swipe   ${swiping ? 'YES' : screenPinching ? 'PINCH' : 'no'}`,
                `touch   ${touching ? 'YES' : 'no'}`,
                `turn    ${cat.turn}deg`,
                `fps     ${fps.toFixed(0)}`,
                `object  ${circle ? `${circle.x.toFixed(0)},${circle.y.toFixed(0)} r${circle.r.toFixed(0)}` : '-'}`,
              ]
              paint()
            }
          },

          listeners: [
            {
              event: 'reality.imagescanning',
              process: () => {
                if (!anchor) hintText.textContent = 'Looking for the mark'
              },
            },
            {
              event: 'reality.imagefound',
              process: ({ detail }) => {
                // Placed once and left alone. SLAM holds the pose from here, so a
                // second sighting must not move what is already standing there.
                if (anchor) return

                const { scene } = XR8.Threejs.xrScene()
                span = markerSpan(detail, markWidth)

                anchor = new THREE.Group()
                anchor.position.copy(detail.position)
                anchor.quaternion.copy(detail.rotation)
                // One anchor unit is one mark width, which is what the model was
                // fitted against — the same footing a MindAR anchor gives it.
                anchor.scale.setScalar(span)

                // The model stands on a mark whose normal is +Z; an 8th Wall image
                // target lies in the XZ plane, so the assembly is laid back.
                const frame = new THREE.Group()
                frame.rotation.x = -Math.PI / 2
                frame.add(cat.group)
                anchor.add(frame)
                scene.add(anchor)

                cat.reveal()
                hint.classList.add('is-found')
                hintText.textContent = 'Swipe it to turn'
                hand.hidden = false
                showCacheState()
              },
            },
          ],
        },
      ])

      XR8.run({ canvas })
    },
    { once: true },
  )
}
const reason = unsupportedReason()
if (reason) {
  startButton.disabled = true
  setNote(reason, true)
} else {
  prepare().catch((error) =>
    setNote(`読み込みに失敗しました: ${error?.message ?? error}`, true),
  )
}
