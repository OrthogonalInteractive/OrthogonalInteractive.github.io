<script setup>
const services = [
  {
    index: '01',
    title: 'Real-time scenes',
    body: 'Low-poly and photoreal alike — modelling, shading, and lighting tuned to a fixed frame budget rather than an offline render.',
    tags: ['Unity', 'URP', 'Shader Graph'],
  },
  {
    index: '02',
    title: 'Interaction design',
    body: 'Camera work, hit testing, and motion that make a scene feel like an instrument instead of a video.',
    tags: ['C#', 'Input System', 'XR'],
  },
  {
    index: '03',
    title: 'Metaverse & multiplayer',
    body: 'Shared 3D spaces — avatars, networked state, and the world building that keeps them running with people inside.',
    tags: ['Netcode', 'Avatars', 'Worlds'],
  },
  {
    index: '04',
    title: 'Pipelines & tooling',
    body: 'Asset pipelines, build automation, and editor tooling so a project stays fast and maintainable long after launch.',
    tags: ['Editor tools', 'Profiling', 'CI'],
  },
]
</script>

<template>
  <section id="services" class="section">
    <div class="shell">
      <div class="section__head reveal">
        <h2 class="section__title">What I take on</h2>
        <div class="rule" />
        <p class="section__lede">
          Interactive 3D content development, centred on Unity and taken on in
          four overlapping areas — usually more than one on the same project.
        </p>
      </div>

      <div class="cards">
        <article
          v-for="(item, i) in services"
          :key="item.index"
          class="card reveal"
          :style="{ transitionDelay: `${i * 70}ms` }"
        >
          <span class="card__index">{{ item.index }}</span>
          <h3 class="card__title">{{ item.title }}</h3>
          <p class="card__body">{{ item.body }}</p>
          <ul class="tags">
            <li v-for="tag in item.tags" :key="tag" class="tags__item">{{ tag }}</li>
          </ul>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
  gap: 1px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  overflow: hidden;
}

.card {
  position: relative;
  display: grid;
  align-content: start;
  gap: 0.85rem;
  padding: 2rem 1.75rem 1.9rem;
  background: var(--ink-800);
  transition: opacity 0.7s var(--ease), transform 0.7s var(--ease),
    background 0.35s var(--ease);
}

.card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 1px;
  background: var(--cyan);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 0.4s var(--ease);
}

.card:hover {
  background: var(--ink-700);
}

.card:hover::before {
  transform: scaleY(1);
}

.card__index {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  color: var(--steel);
}

.card__title {
  font-size: 1.15rem;
}

.card__body {
  color: var(--fg-muted);
  font-weight: 300;
  font-size: 0.92rem;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin: 0.35rem 0 0;
  padding: 0;
  list-style: none;
}

.tags__item {
  font-family: var(--font-mono);
  font-size: 0.63rem;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--fg-faint);
}
</style>
