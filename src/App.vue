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

/* Narrow screens: the copy runs the full width, so a fixed watermark would
   always sit under text or behind an opaque panel. Park the mark in reserved
   space at the foot of the document instead, where nothing covers it. */
@media (max-width: 880px) {
  .page__main {
    padding-bottom: min(46vh, 320px);
  }

  .backdrop {
    position: absolute;
    top: auto;
    bottom: 0;
    height: min(52vh, 380px);
  }

  .backdrop__mark {
    right: 50%;
    bottom: 3%;
    width: min(84vw, 420px);
    transform: translateX(50%);
    opacity: 0.62;
  }

  .backdrop__veil {
    background: linear-gradient(180deg, var(--ink-800) 0%, transparent 42%);
  }
}
</style>
