<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import AboutSection from './components/AboutSection.vue'
import ServicesSection from './components/ServicesSection.vue'
import WorkSection from './components/WorkSection.vue'
import { useReveal } from './composables/useReveal'

const root = ref(null)
useReveal(root)

// The mark comes to life where the browser can manage it; everywhere else, and
// until the model has loaded, the still image stands in.
const stage = ref(null)
const awake = ref(false)
let teardown = null

onMounted(async () => {
  const { canAnimate, mountCat } = await import('./backdrop/catScene.js')
  if (!canAnimate() || !stage.value) return
  try {
    teardown = await mountCat(stage.value, { onReady: () => (awake.value = true) })
  } catch (error) {
    console.warn('Backdrop cat stays still:', error)
  }
})

onBeforeUnmount(() => teardown?.())
</script>

<template>
  <div ref="root" class="page">
    <!-- The mark, blown up as a fixed watermark behind the whole page. -->
    <div class="backdrop" aria-hidden="true">
      <!-- The ground the mark lies on: a lit diagonal grid, seen from above. -->
      <div class="backdrop__floor"><div class="backdrop__plane" /></div>
      <div class="backdrop__pool" />
      <div class="backdrop__art">
        <img class="backdrop__mark" :class="{ 'is-hidden': awake }" src="/org-icon.png" alt="" />
        <div ref="stage" class="backdrop__stage" :class="{ 'is-shown': awake }" />
      </div>
      <div class="backdrop__veil" />
      <div class="backdrop__grain" />
    </div>

    <SiteHeader />
    <main class="page__main">
      <AboutSection />
      <ServicesSection />
      <WorkSection />
    </main>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  min-height: 100vh;
  isolation: isolate;
}

.page__main {
  position: relative;
  z-index: 1;
  /* Clears the fixed masthead now that no hero sits above the first section. */
  padding-top: 4.5rem;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  /* Darker toward the top, as the mark's ground falls off away from the light. */
  background: linear-gradient(180deg, var(--ground-deep) 0%, var(--ground) 45%, var(--ground-lit) 100%);
}

/* The floor is a flat grid tilted away from the viewer and turned 45 degrees,
   so its lines run on the diagonals the mark's do. */
.backdrop__floor {
  position: absolute;
  inset: 0;
  perspective: 900px;
  perspective-origin: 70% 10%;
  mask-image: linear-gradient(180deg, transparent 18%, #000 70%);
}

.backdrop__plane {
  position: absolute;
  left: 50%;
  top: 55%;
  width: 260vmax;
  height: 260vmax;
  margin: -130vmax 0 0 -130vmax;
  transform: rotateX(62deg) rotateZ(45deg);
  background-image: linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.7;
}

/* The light the cat lies in. */
.backdrop__pool {
  position: absolute;
  right: -12vw;
  bottom: -30vh;
  width: 70vw;
  height: 80vh;
  background: radial-gradient(closest-side, rgba(159, 220, 255, 0.07), transparent);
}

/* Film grain, as in the mark's render. */
.backdrop__grain {
  position: absolute;
  inset: 0;
  opacity: 0.09;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.backdrop__art {
  position: absolute;
  right: -2vw;
  bottom: -4vh;
  width: min(48vw, 640px);
  aspect-ratio: 1;
  /* Screen keeps the wireframe glow; the radial mask dissolves the PNG's own
     rectangular ground so it never reads as a pasted-on box. */
  mix-blend-mode: screen;
  opacity: 0.72;
  mask-image: radial-gradient(
    ellipse 52% 52% at 50% 50%,
    #000 0%,
    rgba(0, 0, 0, 0.6) 55%,
    transparent 78%
  );
}

.backdrop__mark,
.backdrop__stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: opacity 1.2s var(--ease);
}

.backdrop__mark.is-hidden {
  opacity: 0;
}

.backdrop__stage {
  opacity: 0;
  filter: drop-shadow(0 0 6px rgba(127, 220, 255, 0.55));
}

.backdrop__stage.is-shown {
  opacity: 1;
}

.backdrop__stage :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.backdrop__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(19, 27, 24, 0.82) 0%,
    rgba(19, 27, 24, 0.4) 42%,
    transparent 66%
  );
}

/* Narrow screens: the copy runs the full width, so the mark stays fixed behind
   everything, faint enough to leave the text over it legible. */
@media (max-width: 880px) {
  .backdrop__art {
    right: 50%;
    bottom: -10vh;
    width: min(150vw, 700px);
    transform: translateX(50%);
    /* Text runs straight over it here, with no panel between, so it stays faint. */
    opacity: 0.32;
    /* Widen the fade so more of the wireframe survives at this size. */
    mask-image: radial-gradient(
      ellipse 62% 62% at 50% 50%,
      #000 0%,
      #000 45%,
      transparent 86%
    );
  }

  .backdrop__floor {
    perspective-origin: 50% 10%;
  }

  .backdrop__pool {
    right: -20vw;
    width: 140vw;
  }

  .backdrop__veil {
    background: linear-gradient(
      180deg,
      rgba(19, 27, 24, 0.6) 0%,
      transparent 40%
    );
  }
}
</style>
