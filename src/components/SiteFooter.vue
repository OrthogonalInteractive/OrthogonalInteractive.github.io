<script setup>
const year = new Date().getFullYear()

const links = [
  {
    label: 'Email',
    text: 'jtachikawa.work@gmail.com',
    href: 'mailto:jtachikawa.work@gmail.com',
    external: false,
  },
  {
    label: 'GitHub',
    text: 'github.com/OrthogonalInteractive',
    href: 'https://github.com/OrthogonalInteractive',
    external: true,
  },
]
</script>

<template>
  <footer class="footer">
    <div class="shell footer__inner">
      <div class="footer__brand">
        <img src="/org-icon.png" alt="" width="32" height="32" />
        <span>Orthogonal Interactive</span>
      </div>

      <ul class="contacts">
        <li v-for="link in links" :key="link.label" class="contacts__item">
          <a
            class="contact"
            :href="link.href"
            :target="link.external ? '_blank' : undefined"
            :rel="link.external ? 'noopener' : undefined"
          >
            <span class="contact__label">{{ link.label }}</span>
            <span class="contact__text">{{ link.text }}</span>
            <span class="contact__arrow" aria-hidden="true">↗</span>
          </a>
        </li>
      </ul>

      <p class="footer__meta">© {{ year }} · Built with Vue</p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  position: relative;
  z-index: 1;
  border-top: 1px solid var(--line-soft);
  padding: clamp(3rem, 8vh, 4.5rem) 0 3rem;
}

.footer__inner {
  display: grid;
  gap: 2.25rem;
}

.footer__brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 0.9rem;
  color: var(--fg);
}

.footer__brand img {
  border-radius: 7px;
  border: 1px solid var(--line);
}

.contacts {
  display: grid;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  list-style: none;
  justify-items: start;
}

.contact {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, auto) auto;
  align-items: baseline;
  gap: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s var(--ease), color 0.3s var(--ease);
}

.contact:hover {
  color: var(--cyan);
  border-bottom-color: var(--cyan);
}

.contact__label {
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--steel);
}

.contact__text {
  font-size: 1rem;
  overflow-wrap: anywhere;
}

.contact__arrow {
  font-size: 0.72rem;
  color: var(--cyan);
  transition: transform 0.3s var(--ease);
}

.contact:hover .contact__arrow {
  transform: translate(3px, -3px);
}

.footer__meta {
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  color: var(--fg-faint);
}

@media (min-width: 760px) {
  .footer__inner {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 2rem 3rem;
  }

  .contacts {
    grid-row: 1 / span 2;
    grid-column: 2;
    justify-items: end;
  }

  .footer__meta {
    align-self: end;
  }
}
</style>
