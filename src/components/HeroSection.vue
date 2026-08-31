<script setup>
import { defineAsyncComponent } from 'vue'

// Three.js is the heaviest dependency on the page; keep it out of the initial
// bundle so the headline paints before the scene boots.
const HeroScene = defineAsyncComponent(() => import('./HeroScene.vue'))

const marks = ['WebGL / WebGPU', 'Real-time rendering', 'Procedural systems', 'Browser-native']
</script>

<template>
  <section id="top" class="hero">
    <HeroScene />

    <div class="hero__content shell">
      <p class="eyebrow hero__eyebrow">Real-time 3D Studio</p>
      <h1 class="hero__title">
        Interactive 3D,<br />
        engineered for<span class="hero__accent"> the browser.</span>
      </h1>
      <p class="hero__lede">
        Orthogonal Interactive builds real-time 3D experiences — things that
        respond to a cursor, render at sixty frames, and run anywhere a browser
        does. No plugin, no download, no waiting.
      </p>

      <div class="hero__actions">
        <a class="btn btn--solid" href="#work">See the work</a>
        <a class="btn btn--ghost" href="#contact">Start a project</a>
      </div>
    </div>

    <div class="hero__foot shell">
      <ul class="marks">
        <li v-for="mark in marks" :key="mark" class="marks__item">{{ mark }}</li>
      </ul>
      <p class="hero__hint">
        <span class="hero__dot" />
        Drag the scene
      </p>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8rem 0 2.5rem;
  isolation: isolate;
}

.hero__content {
  position: relative;
  z-index: 2;
}

.hero__eyebrow {
  margin-bottom: 1.4rem;
}

.hero__title {
  max-width: 15ch;
  font-size: clamp(2.5rem, 6vw, 4.4rem);
  font-weight: 300;
  letter-spacing: -0.035em;
}

.hero__accent {
  color: var(--cyan);
  text-shadow: 0 0 34px rgba(143, 211, 232, 0.35);
}

.hero__lede {
  margin-top: 1.75rem;
  max-width: 34rem;
  color: var(--fg-muted);
  font-weight: 300;
  font-size: clamp(1rem, 1.7vw, 1.1rem);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 2.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.8rem 1.5rem;
  border-radius: 999px;
  font-size: 0.87rem;
  letter-spacing: 0.01em;
  border: 1px solid transparent;
  transition: transform 0.25s var(--ease), background 0.25s var(--ease),
    border-color 0.25s var(--ease), box-shadow 0.25s var(--ease);
}

.btn:hover {
  transform: translateY(-2px);
}

.btn--solid {
  background: var(--cyan);
  color: var(--ink-900);
  font-weight: 500;
}

.btn--solid:hover {
  box-shadow: 0 10px 34px -12px var(--cyan);
}

.btn--ghost {
  border-color: var(--line);
  color: var(--fg);
}

.btn--ghost:hover {
  border-color: var(--cyan);
  background: var(--cyan-dim);
}

.hero__foot {
  position: relative;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
  padding-top: 4rem;
}

.marks {
  display: flex;
  flex-wrap: wrap;
  gap: 1.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.marks__item {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--fg-faint);
}

.hero__hint {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--steel);
}

.hero__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 12px var(--cyan);
  animation: pulse 2.4s var(--ease) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero__dot {
    animation: none;
  }
}
</style>
