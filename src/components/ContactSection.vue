<script setup>
const channels = [
  {
    label: 'GitHub',
    value: 'OrthogonalInteractive',
    href: 'https://github.com/OrthogonalInteractive',
    external: true,
  },
  {
    label: 'Email',
    value: 'hello@orthogonal-interactive.dev',
    href: 'mailto:hello@orthogonal-interactive.dev',
    external: false,
  },
]
</script>

<template>
  <section id="contact" class="section contact">
    <div class="grid-veil contact__veil" />
    <div class="shell contact__inner">
      <div class="section__head reveal">
        <p class="eyebrow">04 — Contact</p>
        <h2 class="section__title">
          Have something that should move?
        </h2>
        <p class="section__lede">
          Commissions, collaborations, and experiments are all welcome. A rough
          idea is enough to start.
        </p>
      </div>

      <ul class="channels reveal">
        <li v-for="channel in channels" :key="channel.label" class="channels__item">
          <a
            class="channel"
            :href="channel.href"
            :target="channel.external ? '_blank' : undefined"
            :rel="channel.external ? 'noopener' : undefined"
          >
            <span class="channel__label">{{ channel.label }}</span>
            <span class="channel__value">{{ channel.value }}</span>
            <span class="channel__arrow">↗</span>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.contact {
  overflow: hidden;
}

.contact__veil {
  mask-image: radial-gradient(ellipse 80% 70% at 50% 100%, #000 0%, transparent 75%);
}

.contact__inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(2rem, 6vw, 4.5rem);
  align-items: center;
}

.contact__inner .section__head {
  margin-bottom: 0;
}

.channels {
  display: grid;
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  overflow: hidden;
  transition-delay: 0.1s;
}

.channel {
  display: grid;
  grid-template-columns: 5.5rem 1fr auto;
  align-items: center;
  gap: 1rem;
  padding: 1.35rem 1.5rem;
  background: var(--ink-800);
  transition: background 0.3s var(--ease);
}

.channel:hover {
  background: var(--ink-700);
}

.channel__label {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--steel);
}

.channel__value {
  font-size: 0.95rem;
  overflow-wrap: anywhere;
}

.channel__arrow {
  color: var(--cyan);
  transform: translate(0, 0);
  transition: transform 0.3s var(--ease);
}

.channel:hover .channel__arrow {
  transform: translate(3px, -3px);
}

@media (max-width: 880px) {
  .contact__inner {
    grid-template-columns: 1fr;
  }

  .contact__inner .section__head {
    margin-bottom: 0.5rem;
  }
}
</style>
