<script setup>
const services = [
  {
    title: 'Real-time scenes',
    body: 'Low-poly and photoreal alike — modelling, shading, and lighting tuned to a fixed frame budget rather than an offline render.',
    tags: ['Unity', 'URP', 'Shader Graph'],
  },
  {
    title: 'Interaction design',
    body: 'Camera work, hit testing, and motion that make a scene feel like an instrument instead of a video.',
    tags: ['C#', 'Input System', 'XR'],
  },
  {
    title: 'XR/Metaverse',
    body: 'Shared 3D spaces, on a headset or a flat screen — avatars, networked state, and the world building that keeps them running with people inside.',
    tags: ['Netcode', 'Avatars', 'Worlds'],
  },
  {
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
        <p class="section__lede">
          Interactive 3D content development, centred on Unity and taken on in
          four overlapping areas — usually more than one on the same project.
        </p>
      </div>

      <div class="cards reveal">
        <article v-for="item in services" :key="item.title" class="card">
          <div class="edge" aria-hidden="true" />
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
/* The four areas overlap rather than follow one another, so they sit side by
   side, each under its own wire edge, with no order implied. */
.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(2.25rem, 4vw, 3.25rem) clamp(2rem, 5vw, 4.5rem);
  max-width: 62rem;
}

.card {
  display: grid;
  align-content: start;
  gap: 0.75rem;
}

.card .edge {
  margin-bottom: 0.6rem;
}

.card__title {
  font-size: 1.45rem;
}

.card__body {
  max-width: 30rem;
  color: var(--fg-muted);
}

.card .tags {
  margin-top: 0.15rem;
}

@media (max-width: 720px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
