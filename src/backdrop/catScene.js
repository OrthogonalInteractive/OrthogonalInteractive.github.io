import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { createTimeline } from './timeline.js'

const MODEL_URL = '/cat.glb'

// A crossfade between matching poses only needs to hide the change of clip.
// Sit and Walk start some way from Idle, so changes to and from them get longer.
const FADE_SECONDS = 0.25
const FAR_FADE_SECONDS = 0.8
const FAR_APART = ['Sit', 'Walk']

// Room left around the cat beyond the furthest any of its poses reaches.
const MARGIN = 1.05

// Up and about, with a lie-down now and then. Lying, the paws are out front as
// in the mark: that is partway into LieDown, and the same pose comes partway
// through GetUp, which plays LieDown backwards. Measured off public/cat.glb.
const LYING = 1.0667
const ACTS = [
  'Idle',
  'Walk',
  'Idle',
  'Sit',
  'Idle',
  'Walk',
  'Idle',
  { name: 'LieDown', to: LYING },
  { name: 'LieDown', still: true, from: LYING, seconds: 10 },
  { name: 'GetUp', from: 0.7667 },
]

// Looking down at the cat from the side its face is turned to, as the mark was
// drawn: head to the lower left, back and tail off to the right.
const VIEW = new THREE.Vector3(0.9, 0.75, 1).normalize()

// The mark's colours: a dark, faintly lit body under a glowing cyan mesh.
const BODY = 0x9cbcc0
const WIRE = 0x7fdcff

/** Whether this browser should get the moving cat rather than the still mark. */
export function canAnimate(win = window) {
  if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return Boolean(win.document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

function dress(root) {
  const body = new THREE.MeshStandardMaterial({
    color: BODY,
    flatShading: true,
    roughness: 0.85,
    // Pushed back a touch so the mesh lines sit cleanly on the faces.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  })
  const wire = new THREE.MeshBasicMaterial({
    color: WIRE,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const skinned = []
  root.traverse((node) => {
    if (node.isSkinnedMesh) skinned.push(node)
  })
  skinned.forEach((mesh) => {
    mesh.material = body
    // Same geometry and skeleton, so the mesh lines follow every bend.
    const lines = new THREE.SkinnedMesh(mesh.geometry, wire)
    lines.bind(mesh.skeleton, mesh.bindMatrix)
    lines.frustumCulled = false
    mesh.frustumCulled = false
    mesh.parent.add(lines)
  })
}

/** Bounds over the poses each clip passes through. */
function reach(root, mixer, clips) {
  const box = new THREE.Box3()
  clips.forEach((clip) => {
    const action = mixer.clipAction(clip)
    action.play()
    for (let i = 0; i <= 4; i += 1) {
      action.time = (clip.duration * i) / 4
      mixer.update(0)
      root.updateMatrixWorld(true)
      box.union(new THREE.Box3().setFromObject(root, true))
    }
    action.stop()
  })
  return box
}

/**
 * Puts the animated cat into `host`, returning a function that tears it down.
 * `onReady` fires once the first frame is drawn, which is when the still mark
 * can step aside.
 */
export async function mountCat(host, { onReady = () => {} } = {}) {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL)
  const root = gltf.scene
  dress(root)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.add(root)
  // Low fill and a strong key from above the camera's shoulder, so each facet
  // takes its own shade and the low-poly body reads as a shape, not a blur.
  scene.add(new THREE.HemisphereLight(0x9fe8ff, 0x0b1211, 0.35))
  const key = new THREE.DirectionalLight(0xdff8ff, 2.6)
  key.position.copy(VIEW).add(new THREE.Vector3(-0.6, 1.2, 0))
  scene.add(key)

  const mixer = new THREE.AnimationMixer(root)
  const clips = Object.fromEntries(gltf.animations.map((clip) => [clip.name, clip]))
  const timeline = createTimeline(
    gltf.animations.map((clip) => ({ name: clip.name, duration: clip.duration })),
    { acts: ACTS },
  )

  // Framed on every pose it takes, so walking, sitting or lying it stays whole.
  const bounds = reach(root, mixer, timeline.plan.map((step) => clips[step.name]))
  const centre = bounds.getCenter(new THREE.Vector3())
  const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius * MARGIN

  const camera = new THREE.PerspectiveCamera(30, 1, radius / 10, radius * 20)
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))
  camera.position.copy(centre).addScaledVector(VIEW, distance)
  camera.lookAt(centre)

  function play(step) {
    const action = mixer.clipAction(clips[step.name])
    action.reset()
    action.setLoop(step.once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
    action.clampWhenFinished = step.once
    action.time = step.from
    action.paused = step.still
    action.play()
    // Shows on the element which part of the day the cat is in, for anyone
    // inspecting the page.
    host.dataset.step = step.still ? `${step.name}:still` : step.name
    return action
  }

  let current = play(timeline.current)
  mixer.update(0)
  // Seconds left of the last crossfade, which still needs drawing to the end.
  let fading = 0

  function resize() {
    const { clientWidth: width, clientHeight: height } = host
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  onReady()

  const clock = new THREE.Clock()
  let frame = 0
  function tick() {
    frame = requestAnimationFrame(tick)
    // A tab in the background stops the clock; picking up from there should
    // not leap the cat through everything it missed.
    const delta = Math.min(clock.getDelta(), 0.1)
    const next = timeline.update(delta)
    if (next && next.name === current.getClip().name) {
      // Lying down stops on the very pose it rests in, so the clip just halts.
      current.time = next.from
      current.paused = next.still
      host.dataset.step = next.still ? `${next.name}:still` : next.name
      fading = delta
    } else if (next) {
      const far = FAR_APART.includes(next.name) || FAR_APART.includes(current.getClip().name)
      const action = play(next)
      fading = far ? FAR_FADE_SECONDS : FADE_SECONDS
      current.crossFadeTo(action, fading, false)
      current = action
    }
    // Asleep and still, nothing on screen moves, so there is nothing to draw.
    if (timeline.current.still && fading <= 0) return
    fading -= delta
    mixer.update(delta)
    renderer.render(scene, camera)
  }
  tick()

  return () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    renderer.dispose()
    renderer.domElement.remove()
  }
}
