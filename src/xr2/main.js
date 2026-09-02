import * as THREE from 'three'
import { loadCatModel } from '../xr/catModel.js'
import { fingertip, isTouching, screenCircle } from '../xr/contact.js'
import { createHandOverlay } from '../xr/handOverlay.js'
import { HAND_ASSETS, HAND_CACHE, createAssetStore, installAssetWorker } from '../xr/handAssets.js'
import { createPinchScale } from '../xr/pinchScale.js'
import { createPoseSmoother } from '../xr/poseSmoother.js'
import { createScreenPinch } from '../xr/screenPinch.js'
import { createStrokeTracker } from '../xr/stroke.js'
import { swirlAngle } from '../xr/swirl.js'
import { unsupportedReason } from '../xr/support.js'
import { createCameraFrame } from './cameraFrame.js'
import { createCarry } from './carry.js'
import { createReach } from './reach.js'
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

// How quickly the mark's pose is taken up, per second. The tracker's estimate
// moves about; following it directly is what makes the model judder.
const POSE_SMOOTHING = 9

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
// An 8th Wall image target lies in its own XY plane with +Z out of the print —
// the same convention a MindAR anchor uses, and the one their own samples rely
// on when they hang an unrotated PlaneGeometry off a target. Laying the model on
// +Y instead stood it up at right angles to the card.
//
// Which way along +Z is not a convention but a measurement: recovering a plane's
// pose from what a camera sees admits two solutions mirrored through the plane,
// so the normal can come back pointing into the desk, and the model then rises
// under the clipping plane meant to hide it while it is still buried.
const normalAxis = (params.get('axis') ?? 'z').toLowerCase()
const COLUMN = { x: 0, y: 1, z: 2 }
const heading = Number(params.get('spin')) || 0
const UP = new THREE.Vector3(0, 0, 1)

const intro = document.querySelector('#intro')
const startButton = document.querySelector('#start')
const note = document.querySelector('#note')
const hint = document.querySelector('#hint')
const hintText = document.querySelector('#hint-text')
const hand = document.querySelector('#hand')
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
  cat.heading = heading
  say(`target & model ready | w ${(markWidth * 1000).toFixed(0)}mm | s ${modelSize}x`,
      `| axis ${normalAxis}`)
  target.physicalWidthInMeters = markWidth
  // The card is what the room is measured from, not something to keep chasing.
  target.moveable = false

  const canvas = document.createElement('canvas')
  document.querySelector('#scene').appendChild(canvas)

  const overlay = createHandOverlay(document.querySelector('#overlay'))
  const cameraFrame = createCameraFrame()
  const pinch = createPinchScale({ maxScale: MAX_SCALE })
  const swipe = createStrokeTracker()
  const screenPinch = createScreenPinch({ max: MAX_SCALE })
  const carry = createCarry()
  const reach = createReach()
  const smoother = createPoseSmoother({ rate: POSE_SMOOTHING })

  const clock = new THREE.Clock()
  const clipPlane = new THREE.Plane()
  const markNormal = new THREE.Vector3()
  const objectPosition = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  const worldScale = new THREE.Vector3()
  const markPose = new THREE.Matrix4()
  const markPosition = new THREE.Vector3()
  const markRotation = new THREE.Quaternion()
  const markScale = new THREE.Vector3()

  let anchor = null
  let frame = null
  let carrier = null
  let circle = null
  let span = markWidth
  let normalColumn = 1
  let normalSign = 1
  let tracked = false
  let sightings = 0
  let aspect = 0
  let uiOrientation = 0
  let status = '-'

  let handTracker = null
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

  /**
   * Takes the mark's latest reported pose.
   *
   * A first sighting can be a poor one — grazing, blurred, half in frame — and
   * its estimate can be tilted well off the card. Keeping the anchor on the
   * mark for as long as the mark is visible lets a bad first look correct
   * itself; freezing on loss is what leaves the model standing in the room.
   */
  function noteMark(detail) {
    sightings += 1
    span = markerSpan(detail, markWidth)
    aspect = detail.scaledWidth && detail.scaledHeight
      ? detail.scaledWidth / detail.scaledHeight
      : 0
    markPosition.copy(detail.position)
    markRotation.copy(detail.rotation)
    markScale.setScalar(span)
    markPose.compose(markPosition, markRotation, markScale)
    tracked = true
  }

  /** Degrees the raw camera frame is turned by to match the display. */
  const frameTurn = () => (turnOverride !== null ? Number(turnOverride) : -uiOrientation)

  // --- hand control -------------------------------------------------------

  async function showCacheState() {
    if (!assets.available) {
      handNote.textContent = 'Hand control on'
      return
    }
    const cached = await assets.isCached()
    handNote.textContent = cached ? 'Hand control on — 19 MB cached' : 'Hand control on'
    handClear.hidden = !cached
  }

  handClear.addEventListener('click', async () => {
    handClear.disabled = true
    await assets.clear()
    handClear.hidden = true
    handClear.disabled = false
    handNote.textContent = 'Cache cleared — downloads again next visit'
  })

  /**
   * Brings up hand tracking in the background. It is 19 MB, so the camera opens
   * first and the page stays usable by touch whether this arrives or not.
   */
  async function startHandControl(XR8) {
    hand.hidden = false
    try {
      // Scope decides which pages the worker controls, so this page needs its
      // own registration even though the assets it serves live under /xr/.
      await installAssetWorker('/xr2/sw.js', '/xr2/')
      await assets.download((ratio) => {
        handNote.textContent = `Hand control — downloading ${Math.round(ratio * 100)}%`
      })

      handNote.textContent = 'Hand control — starting'
      const { loadHandTracker } = await import('../xr/handControl.js')
      handTracker = await loadHandTracker()

      // Reading pixels back off the GPU costs a stall every frame, so the
      // module only goes on once there is something to read them for.
      XR8.addCameraPipelineModule(
        XR8.CameraPixelArray.pipelineModule({ maxDimension: HAND_FRAME }),
      )
      say('hand control ready')
      await showCacheState()
    } catch (error) {
      say('hand control failed:', error?.message ?? error)
      handNote.textContent = `Hand control unavailable: ${error?.message ?? error}`
    }
  }

  // --- touch --------------------------------------------------------------

  /** Turns a swept angle into rotation about the mark's normal. */
  function spinBy(swept) {
    if (!swept || !anchor) return
    const { camera } = XR8.Threejs.xrScene()
    toCamera.subVectors(camera.position, objectPosition)
    const facing = markNormal.dot(toCamera) > 0 ? -1 : 1
    cat.spin(swept * facing * SPIN_GAIN)
  }

  const stopSwipe = () => {
    swiping = false
    swipe.update({ point: null, touching: false })
  }

  const pair = () => [...pointers.values()]

  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button, a')) return
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
            startHandControl(XR8)

          },

          onCameraStatusChange: ({ status }) => {
            say('camera:', status)
            if (status === 'failed') {
              intro.classList.remove('is-gone')
              startButton.disabled = false
              setNote('カメラを開始できませんでした。ブラウザの設定で許可してから、もう一度お試しください。', true)
            }
          },

          onVideoSizeChange: ({ videoWidth, videoHeight, orientation }) => {
            uiOrientation = orientation
            overlay.resize()
            say(`video ${videoWidth}x${videoHeight} rot ${orientation}`)
          },

          onException: (error) => {
            say('EXCEPTION:', error?.message ?? error)
            setNote(`エラー: ${error?.message ?? error}`, true)
          },

          onUpdate: ({ processCpuResult, processGpuResult }) => {
            const delta = clock.getDelta()
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
            if (tracked) anchor.matrix.copy(smoother.follow(markPose, delta))
            anchor.matrixWorldNeedsUpdate = true
            anchor.updateMatrixWorld(true)
            markNormal
              .setFromMatrixColumn(anchor.matrixWorld, normalColumn)
              .normalize()
              .multiplyScalar(normalSign)
            objectPosition.setFromMatrixPosition(anchor.matrixWorld)
            clipPlane.setFromNormalAndCoplanarPoint(markNormal, objectPosition)

            cat.group.updateMatrixWorld(true)
            worldScale.setFromMatrixColumn(cat.group.matrixWorld, 0)
            circle = screenCircle(cat.group, camera, cat.radius * worldScale.length(), {
              width: window.innerWidth,
              height: window.innerHeight,
            })

            if (handTracker && frames++ % DETECT_EVERY === 0) {
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
                // A hand pinch is how the model is picked up, so it no longer
                // resizes it; two fingers on the glass still do.
                const { closed, speed } = pinch.update(landmarks, sinceDetect)
                pinched = closed

                const held = carry.held
                const grabbing = point && (held ? closed : closed && touching)
                const grip = grabbing
                  ? reach.at(point, {
                      camera,
                      frame,
                      card: clipPlane,
                      height: carry.position.z,
                      unit: span,
                      viewport: { width: window.innerWidth, height: window.innerHeight },
                    })
                  : null

                if (!closed) {
                  carry.release()
                } else if (grip) {
                  if (held) carry.moveTo(grip)
                  else carry.grab(grip)
                }

                overlay.draw(landmarks, rect, { touching, pinched })
                hint.classList.toggle('is-found', touching || carry.held)
                hintText.textContent = carry.held
                  ? 'Let go to drop it'
                  : touching
                    ? 'Pinch to pick it up'
                    : 'Swipe it to turn'
                handReadout = [
                  `hand    ${landmarks ? 'yes' : 'no'}`,
                  `pinch   ${closed ? 'CLOSED' : 'open'}`,
                  `speed   ${speed.toFixed(1)}/s`,
                  `frame   ${cameraFrame.shape.width}x${cameraFrame.shape.height} @${frameTurn()}deg`,
                ]
              }
            }

            // The carried offset rides its own group, so the model's own rise
            // out of the card and its spin are left entirely alone.
            if (carrier) {
              const { x, y, z } = carry.update(delta)
              carrier.position.set(x, y, z)
            }

            cat.setHighlight(touching || carry.held || swiping || screenPinching ? 1 : 0)
            cat.update(delta)

            if (debugging) {
              readout = [
                ...handReadout,
                `mark    ${(span * 1000).toFixed(1)}u (declared ${(markWidth * 1000).toFixed(0)})`,
                `sight   ${sightings} ${tracked ? 'TRACKED' : 'held'}`,
                `aspect  ${aspect.toFixed(3)} (printed 4:3 = 1.333)`,
                `size    ${modelSize}x mark`,
                `swipe   ${swiping ? 'YES' : screenPinching ? 'PINCH' : 'no'}`,
                `touch   ${touching ? 'YES' : 'no'}`,
                `carry   ${carry.held ? 'HELD' : 'free'} ${carry.position.x.toFixed(1)},${carry.position.y.toFixed(1)},${carry.position.z.toFixed(2)}`,
                `turn    ${cat.turn}deg`,
                `track   ${status}`,
                `fps     ${fps.toFixed(0)}`,
                `object  ${circle ? `${circle.x.toFixed(0)},${circle.y.toFixed(0)} r${circle.r.toFixed(0)}` : '-'}`,
              ]
              paint()
            }
          },

          listeners: [
            {
              event: 'reality.imageupdated',
              process: ({ detail }) => noteMark(detail),
            },
            {
              event: 'reality.imagelost',
              // Frozen where it was last seen, and held there by SLAM.
              process: () => {
                tracked = false
              },
            },
            {
              event: 'reality.imagescanning',
              process: () => {
                if (!anchor) hintText.textContent = 'Looking for the mark'
              },
            },
            {
              event: 'reality.imagefound',
              process: ({ detail }) => {
                const first = !anchor
                noteMark(detail)
                // Only the very first sighting is taken whole; a re-acquisition
                // eases across so the model does not jump where SLAM has drifted.
                if (first) smoother.reset()
                if (!first) return

                const { scene } = XR8.Threejs.xrScene()
                anchor = new THREE.Group()
                // One anchor unit is one mark width, which is what the model was
                // fitted against — the same footing a MindAR anchor gives it.
                // The pose is written straight onto the matrix each frame, so
                // the first one goes on now rather than a frame late at origin.
                anchor.matrixAutoUpdate = false
                anchor.matrix.copy(markPose)

                // Laid onto the card's normal once that has been measured, just
                // below.
                frame = new THREE.Group()
                // Where a carried model is held. Keeping it off the model's own
                // group leaves the rise out of the card to work as it always did.
                carrier = new THREE.Group()
                carrier.add(cat.group)
                frame.add(carrier)
                anchor.add(frame)
                scene.add(anchor)

                // The card is being looked at, or it could not have been found:
                // its normal is the axis leaning nearest the camera, pointing
                // the way the camera is.
                anchor.updateMatrixWorld(true)
                const { camera } = XR8.Threejs.xrScene()
                const here = new THREE.Vector3().setFromMatrixPosition(anchor.matrixWorld)
                const toCamera = new THREE.Vector3().subVectors(camera.position, here).normalize()
                const lean = [0, 1, 2].map((column) =>
                  new THREE.Vector3()
                    .setFromMatrixColumn(anchor.matrixWorld, column)
                    .normalize()
                    .dot(toCamera),
                )

                // ?axis=auto takes whichever leans nearest the camera, which is
                // only a fallback: the convention is fixed, and picking it per
                // sighting wanders when the card is seen at a glancing angle.
                normalColumn = COLUMN[normalAxis] ?? lean.reduce(
                  (best, value, column) => (Math.abs(value) > Math.abs(lean[best]) ? column : best),
                  0,
                )
                normalSign = lean[normalColumn] < 0 ? -1 : 1

                // The model's own +Z is up out of the card, so the frame turns
                // to put it on the normal we just measured.
                frame.quaternion.setFromUnitVectors(
                  UP,
                  new THREE.Vector3().setComponent(normalColumn, normalSign),
                )

                say(`lean ${lean.map((v) => v.toFixed(2)).join(' ')}`,
                    `| normal ${'xyz'[normalColumn]}${normalSign < 0 ? '-' : '+'}`)

                cat.reveal()
                hint.classList.add('is-found')
                hintText.textContent = 'Swipe it to turn'
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
