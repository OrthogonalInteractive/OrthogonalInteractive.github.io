<script setup>
import { ref } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import AboutSection from './components/AboutSection.vue'
import ServicesSection from './components/ServicesSection.vue'
import { useReveal } from './composables/useReveal'

const root = ref(null)
useReveal(root)
</script>

<template>
  <div ref="root" class="page">
    <!-- The mark, blown up as a fixed watermark behind the whole page. -->
    <div class="backdrop" aria-hidden="true">
      <img class="backdrop__mark" src="/org-icon.png" alt="" />
      <div class="backdrop__veil" />
    </div>

    <SiteHeader />
    <main class="page__main">
      <AboutSection />
      <ServicesSection />
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
}

.backdrop__mark {
  position: absolute;
  right: -3vw;
  bottom: -6vh;
  width: min(46vw, 600px);
  /* Screen keeps the wireframe glow; the radial mask dissolves the PNG's own
     rectangular ground so it never reads as a pasted-on box. */
  mix-blend-mode: screen;
  opacity: 0.5;
  mask-image: radial-gradient(
    ellipse 52% 52% at 50% 50%,
    #000 0%,
    rgba(0, 0, 0, 0.6) 55%,
    transparent 78%
  );
}

.backdrop__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(11, 18, 17, 0.9) 0%,
    rgba(11, 18, 17, 0.5) 42%,
    transparent 70%
  );
}

/* Narrow screens: the copy runs the full width, so the mark stays fixed behind
   everything at a low opacity, and the panels above it turn translucent so it
   reads through them. Kept faint enough to leave body text legible. */
@media (max-width: 880px) {
  .backdrop__mark {
    right: 50%;
    bottom: -10vh;
    width: min(150vw, 700px);
    transform: translateX(50%);
    opacity: 0.55;
    /* Widen the fade so more of the wireframe survives at this size. */
    mask-image: radial-gradient(
      ellipse 62% 62% at 50% 50%,
      #000 0%,
      #000 45%,
      transparent 86%
    );
  }

  .backdrop__veil {
    background: linear-gradient(
      180deg,
      rgba(11, 18, 17, 0.55) 0%,
      transparent 34%
    );
  }
}
</style>
