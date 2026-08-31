<script setup>
const stats = [
  { value: '60fps', label: 'Target frame budget' },
  { value: 'WebGL2', label: 'Baseline runtime' },
  { value: '0', label: 'Plugins required' },
]
</script>

<template>
  <section id="studio" class="section">
    <div class="grid-veil" />
    <div class="shell studio">
      <div class="studio__body">
        <div class="section__head reveal">
          <p class="eyebrow">01 — Studio</p>
          <h2 class="section__title">
            An independent studio for things that move when you touch them.
          </h2>
        </div>
        <div class="studio__copy reveal">
          <p>
            Orthogonal Interactive sits between design and engineering. We model,
            shade, and ship real-time 3D — product configurators, spatial
            interfaces, generative visuals, and the tooling that keeps them
            maintainable after launch.
          </p>
          <p>
            Every piece is built for the open web first. That constraint is the
            point: it forces work that loads fast, degrades gracefully, and
            reaches anyone with a link.
          </p>
        </div>
      </div>

      <aside class="studio__side reveal">
        <div class="mark">
          <img src="/org-icon.png" alt="Orthogonal Interactive mark" />
        </div>
        <ul class="stats">
          <li v-for="stat in stats" :key="stat.label" class="stats__row">
            <span class="stats__value">{{ stat.value }}</span>
            <span class="stats__label">{{ stat.label }}</span>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.studio {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: clamp(2.5rem, 6vw, 5rem);
  align-items: start;
}

.studio__copy {
  display: grid;
  gap: 1.25rem;
  max-width: 36rem;
  color: var(--fg-muted);
  font-weight: 300;
  transition-delay: 0.08s;
}

.studio__side {
  display: grid;
  gap: 1.75rem;
  padding: 1.75rem;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--ink-700), var(--ink-800));
  transition-delay: 0.16s;
}

.mark {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--line);
}

.mark::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 60%,
    transparent 40%,
    rgba(11, 18, 17, 0.55) 100%
  );
}

.mark img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.stats {
  display: grid;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stats__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid var(--line-soft);
}

.stats__row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.stats__value {
  font-family: var(--font-mono);
  font-size: 1.05rem;
  color: var(--cyan);
}

.stats__label {
  font-size: 0.78rem;
  color: var(--fg-faint);
  text-align: right;
}

@media (max-width: 880px) {
  .studio {
    grid-template-columns: 1fr;
  }
}
</style>
