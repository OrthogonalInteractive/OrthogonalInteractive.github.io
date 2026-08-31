<script setup>
// Placeholder slate — real case studies replace these entries.
const projects = [
  { code: 'OI—001', title: 'Case study', status: 'In production' },
  { code: 'OI—002', title: 'Case study', status: 'In production' },
  { code: 'OI—003', title: 'Case study', status: 'Coming soon' },
]
</script>

<template>
  <section id="work" class="section">
    <div class="shell">
      <div class="section__head reveal">
        <p class="eyebrow">03 — Work</p>
        <h2 class="section__title">Selected work</h2>
        <div class="rule" />
        <p class="section__lede">
          The first projects are still under wraps. This slate fills in as they
          ship.
        </p>
      </div>

      <div class="slate">
        <article
          v-for="(project, i) in projects"
          :key="project.code"
          class="slot reveal"
          :style="{ transitionDelay: `${i * 90}ms` }"
        >
          <div class="slot__frame">
            <span class="slot__grid" />
            <span class="slot__glyph">⌗</span>
          </div>
          <div class="slot__meta">
            <span class="slot__code">{{ project.code }}</span>
            <h3 class="slot__title">{{ project.title }}</h3>
            <span class="slot__status">{{ project.status }}</span>
          </div>
        </article>
      </div>

      <p class="note reveal">
        Open-source pieces land on
        <a href="https://github.com/OrthogonalInteractive" target="_blank" rel="noopener">
          github.com/OrthogonalInteractive</a
        >.
      </p>
    </div>
  </section>
</template>

<style scoped>
.slate {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 1.25rem;
}

.slot {
  display: grid;
  gap: 1.1rem;
  transition: opacity 0.7s var(--ease), transform 0.7s var(--ease);
}

.slot__frame {
  position: relative;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(160deg, var(--ink-700), var(--ink-900));
  display: grid;
  place-items: center;
  transition: border-color 0.35s var(--ease);
}

.slot:hover .slot__frame {
  border-color: var(--steel);
}

.slot__grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(var(--line-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--line-soft) 1px, transparent 1px);
  background-size: 34px 34px;
  opacity: 0.7;
  transform: perspective(420px) rotateX(52deg) scale(1.9);
  transform-origin: center 78%;
  transition: opacity 0.4s var(--ease);
}

.slot:hover .slot__grid {
  opacity: 1;
}

.slot__glyph {
  position: relative;
  font-size: 1.6rem;
  color: var(--steel);
  opacity: 0.55;
}

.slot__meta {
  display: grid;
  gap: 0.35rem;
}

.slot__code {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.18em;
  color: var(--steel);
}

.slot__title {
  font-size: 1.05rem;
  color: var(--fg-muted);
}

.slot__status {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fg-faint);
}

.note {
  margin-top: 2.5rem;
  font-size: 0.88rem;
  color: var(--fg-faint);
}

.note a {
  color: var(--cyan);
  border-bottom: 1px solid var(--cyan-dim);
}

.note a:hover {
  border-bottom-color: var(--cyan);
}
</style>
