<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import * as THREE from 'three'

const PALETTE = {
  background: 0x0b1211,
  surface: 0x74868a,
  edge: 0x8fd3e8,
  ring: 0x9fdcef,
  steel: 0x5c89a3,
  grid: 0x24322f,
}

const canvas = ref(null)
const supported = ref(true)
const ctx = shallowRef(null)

/** Builds the faceted core plus the three mutually orthogonal rings. */
function buildForm() {
  const form = new THREE.Group()

  const coreGeometry = new THREE.IcosahedronGeometry(1.15, 1)
  const core = new THREE.Mesh(
    coreGeometry,
    new THREE.MeshStandardMaterial({
      color: PALETTE.surface,
      flatShading: true,
      metalness: 0.15,
      roughness: 0.62,
    }),
  )
  form.add(core)

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeometry, 1),
    new THREE.LineBasicMaterial({
      color: PALETTE.edge,
      transparent: true,
      opacity: 0.9,
    }),
  )
  edges.scale.setScalar(1.004)
  form.add(edges)

  // One ring per axis — the "orthogonal" part of the name, made literal.
  const ringGeometry = new THREE.TorusGeometry(1.72, 0.012, 3, 96)
  const axes = [
    { rotation: [0, 0, 0], color: PALETTE.ring, opacity: 0.55 },
    { rotation: [Math.PI / 2, 0, 0], color: PALETTE.steel, opacity: 0.5 },
    { rotation: [0, Math.PI / 2, 0], color: PALETTE.ring, opacity: 0.35 },
  ]
  const rings = axes.map(({ rotation, color, opacity }) => {
    const ring = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
    )
    ring.rotation.set(...rotation)
    form.add(ring)
    return ring
  })

  return { form, rings, coreGeometry, ringGeometry }
}

/** Sparse points that give the void some depth without reading as "stars". */
function buildMotes() {
  const count = 220
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 16
    positions[i * 3 + 1] = (Math.random() - 0.5) * 9
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: PALETTE.edge,
      size: 0.022,
      transparent: true,
      opacity: 0.5,
    }),
  )
  return { points, geometry }
}

function init() {
  const el = canvas.value
  if (!el) return

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: el,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
  } catch {
    supported.value = false
    return
  }

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const parent = el.parentElement
  const size = () => ({
    width: parent?.clientWidth || window.innerWidth,
    height: parent?.clientHeight || window.innerHeight,
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(PALETTE.background, 6.5, 17)

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0.55, 6.2)

  scene.add(new THREE.AmbientLight(0xbcd6de, 0.55))

  const keyLight = new THREE.DirectionalLight(0xdff0f6, 1.8)
  keyLight.position.set(3.5, 4.5, 4)
  scene.add(keyLight)

  const rimLight = new THREE.PointLight(PALETTE.edge, 22, 14)
  rimLight.position.set(-3.2, -1.4, 2.6)
  scene.add(rimLight)

  const { form, rings, coreGeometry, ringGeometry } = buildForm()
  form.rotation.set(0.35, 0.5, 0)
  form.scale.setScalar(0.92)
  scene.add(form)

  // The headline occupies the left half on wide viewports; on narrow ones it
  // spans the full width, so the form drops below the type instead.
  const layout = { offsetX: 0, offsetY: 0 }

  const grid = new THREE.GridHelper(28, 28, PALETTE.grid, PALETTE.grid)
  grid.position.y = -2.5
  grid.material.transparent = true
  grid.material.opacity = 0.5
  scene.add(grid)

  const { points, geometry: moteGeometry } = buildMotes()
  scene.add(points)

  const pointer = { x: 0, y: 0 }
  const eased = { x: 0, y: 0 }
  const drag = { active: false, lastX: 0, velocity: 0 }

  function onPointerMove(event) {
    const { width, height } = size()
    pointer.x = (event.clientX / width) * 2 - 1
    pointer.y = (event.clientY / height) * 2 - 1
    if (drag.active) {
      drag.velocity += (event.clientX - drag.lastX) * 0.00035
      drag.lastX = event.clientX
    }
  }

  function onPointerDown(event) {
    drag.active = true
    drag.lastX = event.clientX
  }

  function onPointerUp() {
    drag.active = false
  }

  function resize() {
    const { width, height } = size()
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()

    const wide = width >= 900
    layout.offsetX = wide ? 1.85 : 0
    layout.offsetY = wide ? 0 : -1.5
    form.position.x = layout.offsetX
    form.scale.setScalar(wide ? 0.92 : 0.58)
  }

  const clock = new THREE.Clock()
  let frame = 0

  function render() {
    frame = requestAnimationFrame(render)
    const elapsed = clock.getElapsedTime()

    eased.x += (pointer.x - eased.x) * 0.04
    eased.y += (pointer.y - eased.y) * 0.04

    const spin = reducedMotion ? 0 : elapsed * 0.12
    drag.velocity *= 0.94

    form.rotation.y = 0.5 + spin + eased.x * 0.55 + drag.velocity * 12
    form.rotation.x = 0.35 + eased.y * 0.3
    form.position.x = layout.offsetX
    form.position.y =
      layout.offsetY + (reducedMotion ? 0 : Math.sin(elapsed * 0.6) * 0.09)

    rings[0].rotation.z = spin * 1.6
    rings[1].rotation.z = -spin * 1.1
    rings[2].rotation.x = spin * 0.8

    points.rotation.y = spin * 0.15
    camera.position.x = eased.x * 0.35
    camera.lookAt(0, 0, 0)

    renderer.render(scene, camera)
  }

  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)

  resize()
  render()

  ctx.value = {
    dispose() {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      coreGeometry.dispose()
      ringGeometry.dispose()
      moteGeometry.dispose()
      grid.geometry.dispose()
      grid.material.dispose()
      scene.traverse((object) => {
        if (object.material) object.material.dispose?.()
      })
      renderer.dispose()
    },
  }
}

onMounted(() => {
  // WebGL is unavailable under jsdom; the CSS fallback covers that case.
  if (typeof WebGLRenderingContext === 'undefined') {
    supported.value = false
    return
  }
  init()
})

onBeforeUnmount(() => {
  ctx.value?.dispose()
  ctx.value = null
})
</script>

<template>
  <div class="scene" aria-hidden="true">
    <canvas v-show="supported" ref="canvas" class="scene__canvas" />
    <div v-if="!supported" class="scene__fallback" />
    <div class="scene__vignette" />
  </div>
</template>

<style scoped>
.scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.scene__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.scene__fallback {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      circle at 50% 45%,
      rgba(143, 211, 232, 0.22),
      transparent 55%
    ),
    linear-gradient(180deg, var(--ink-700), var(--ink-800));
}

.scene__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse 70% 55% at 60% 45%,
      transparent 35%,
      rgba(11, 18, 17, 0.7) 100%
    ),
    linear-gradient(
      180deg,
      rgba(11, 18, 17, 0.9) 0%,
      rgba(11, 18, 17, 0.45) 38%,
      transparent 62%
    ),
    linear-gradient(0deg, rgba(11, 18, 17, 0.88) 0%, transparent 16%);
}

/* Scrim under the headline so the type stays readable over the scene. */
@media (min-width: 900px) {
  .scene__vignette {
    background:
      linear-gradient(
        90deg,
        rgba(11, 18, 17, 0.92) 0%,
        rgba(11, 18, 17, 0.55) 34%,
        transparent 58%
      ),
      radial-gradient(
        ellipse 70% 55% at 62% 45%,
        transparent 38%,
        rgba(11, 18, 17, 0.7) 100%
      ),
      linear-gradient(180deg, transparent 60%, var(--ink-800) 100%);
  }
}
</style>
