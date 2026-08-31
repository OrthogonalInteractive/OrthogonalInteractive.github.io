<script setup>
// Business details. Services live in their own section, not in this list.
const facts = [
  { term: 'Name', value: 'Orthogonal Interactive' },
  { term: 'Principal', value: 'Jun Tachikawa (jtfrom9)' },
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
    <div class="grid-veil" />
    <div class="shell about">
      <div class="about__body">
        <div class="section__head reveal">
          <h2 class="section__title">
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
                <span class="facts__arrow" aria-hidden="true">↗</span>
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
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: clamp(2.5rem, 6vw, 5rem);
  align-items: start;
}

.about__copy {
  display: grid;
  gap: 1.25rem;
  max-width: 36rem;
  color: var(--fg-muted);
  font-weight: 300;
  transition-delay: 0.08s;
}

.about__side {
  display: grid;
  gap: 1.75rem;
  padding: 1.75rem;
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--ink-700), var(--ink-800));
  transition-delay: 0.16s;
}


.facts {
  display: grid;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
}

.facts__row {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  align-items: baseline;
  gap: 1rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--line-soft);
}

.facts__row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.facts__term {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--steel);
}

.facts__value {
  margin: 0;
  font-size: 0.92rem;
  color: var(--fg);
  overflow-wrap: anywhere;
}

.facts__link {
  display: inline-flex;
  align-items: baseline;
  gap: 0.45rem;
  border-bottom: 1px solid transparent;
  transition: color 0.25s var(--ease), border-color 0.25s var(--ease);
}

.facts__link:hover {
  color: var(--cyan);
  border-bottom-color: var(--cyan);
}

.facts__arrow {
  font-size: 0.7em;
  color: var(--cyan);
  transition: transform 0.25s var(--ease);
}

.facts__link:hover .facts__arrow {
  transform: translate(2px, -2px);
}

@media (max-width: 880px) {
  .about {
    grid-template-columns: 1fr;
  }
}
</style>
