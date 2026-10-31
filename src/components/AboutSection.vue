<script setup>
// Business details. Services live in their own section, not in this list.
const facts = [
  { term: 'Name', value: 'Orthogonal Interactive' },
  { term: 'Principal', value: 'Jun Tachikawa / 立川 純 (jtfrom9)' },
  { term: 'Founded', value: '2026.06' },
  { term: 'Based in', value: 'Japan \u2014 remote' },
  {
    term: 'Email',
    value: 'jtachikawa.work@gmail.com',
    href: 'mailto:jtachikawa.work@gmail.com',
  },
]
</script>

<template>
  <section id="about" class="section">
    <div class="shell about">
      <div class="about__body">
        <div class="section__head reveal">
          <h2 class="section__title about__title">
            Building interactive 3D and XR/Metaverse content.
          </h2>
        </div>
        <div class="about__copy reveal">
          <p>
            Orthogonal Interactive is the trade name of a one-person practice.
            Since 2020 the work has been interactive 3D content and metaverse
            development, centred on Unity. Before that came more than twenty
            years of low-level engineering in embedded systems and semiconductor
            design.
          </p>
        </div>
      </div>

      <aside class="about__side reveal">
        <dl class="facts">
          <div v-for="fact in facts" :key="fact.term" class="facts__row">
            <dt class="facts__term">{{ fact.term }}</dt>
            <dd class="facts__value">
              <a
                v-if="fact.href"
                class="facts__link"
                :href="fact.href"
                :target="fact.external ? '_blank' : undefined"
                :rel="fact.external ? 'noopener' : undefined"
              >
                {{ fact.value }}
              </a>
              <template v-else>{{ fact.value }}</template>
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.about {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: clamp(2.5rem, 6vw, 5rem);
  /* The facts keep to the top, leaving the floor below them to the cat. */
  align-items: start;
}

/* The page opens here, so this heading does the work a hero would. */
.about__title {
  font-size: clamp(2.5rem, 5.4vw, 4.1rem);
  line-height: 1.02;
}

.about__copy {
  max-width: 34rem;
  color: var(--fg-muted);
  font-size: 1.05rem;
}

.about__side {
  padding-top: 0.6rem;
}

.facts {
  display: grid;
  margin: 0;
  padding: 0;
}

.facts__row {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  align-items: baseline;
  gap: 1rem;
  padding: 0.7rem 0;
  border-top: 1px solid var(--line-soft);
}

.facts__row:first-child {
  border-top: none;
}

.facts__term {
  font-size: 0.8rem;
  color: var(--fg-faint);
}

.facts__value {
  margin: 0;
  font-size: 0.95rem;
  color: var(--fg);
  overflow-wrap: anywhere;
}

.facts__link {
  display: inline-flex;
  align-items: baseline;
  gap: 0.45rem;
  color: var(--wire);
  border-bottom: 1px solid var(--wire-dim);
  transition: border-color 0.25s var(--ease), text-shadow 0.25s var(--ease);
}

.facts__link:hover {
  border-bottom-color: var(--wire);
  text-shadow: 0 0 12px var(--wire-glow);
}

@media (max-width: 880px) {
  .about {
    grid-template-columns: 1fr;
    align-items: start;
  }
}
</style>
