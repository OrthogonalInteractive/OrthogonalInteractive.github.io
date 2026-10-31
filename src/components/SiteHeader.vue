<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const links = [
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Work', href: '#work' },
]

const lifted = ref(false)
const open = ref(false)

function onScroll() {
  lifted.value = window.scrollY > 24
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="masthead" :class="{ 'is-lifted': lifted }">
    <div class="masthead__inner shell">
      <a class="brand" href="#about">
        <img class="brand__mark" src="/org-icon.png" alt="" width="30" height="30" />
        <span class="brand__name">Orthogonal Interactive</span>
      </a>

      <nav class="nav" :class="{ 'is-open': open }" aria-label="Primary">
        <a
          v-for="link in links"
          :key="link.href"
          class="nav__link"
          :href="link.href"
          @click="open = false"
        >
          {{ link.label }}
        </a>
        <a
          class="nav__github"
          href="https://github.com/OrthogonalInteractive"
          target="_blank"
          rel="noopener"
        >
          GitHub
        </a>
      </nav>

      <button
        class="burger"
        type="button"
        :aria-expanded="open"
        aria-label="Toggle navigation"
        @click="open = !open"
      >
        <span /><span />
      </button>
    </div>
  </header>
</template>

<style scoped>
.masthead {
  position: fixed;
  inset: 0 0 auto;
  z-index: 20;
  transition: background 0.35s var(--ease), border-color 0.35s var(--ease);
  border-bottom: 1px solid transparent;
}

.masthead.is-lifted {
  background: rgba(19, 27, 24, 0.78);
  backdrop-filter: blur(14px);
  border-bottom-color: var(--line-soft);
}

.masthead__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand__mark {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  transition: box-shadow 0.4s var(--ease);
}

.brand:hover .brand__mark {
  box-shadow: 0 0 18px 0 var(--wire-dim);
}

.brand__name {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.nav {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav__link {
  position: relative;
  font-size: 0.9rem;
  color: var(--fg-muted);
  transition: color 0.25s var(--ease);
}

.nav__link::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -6px;
  width: 100%;
  height: 1px;
  background: var(--wire);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s var(--ease);
}

.nav__link:hover {
  color: var(--fg);
}

.nav__link:hover::after {
  transform: scaleX(1);
}

.nav__github {
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.95rem;
  border: 1px solid var(--wire-glow);
  border-radius: 999px;
  color: var(--wire);
  transition: background 0.25s var(--ease), box-shadow 0.25s var(--ease);
}

.nav__github:hover {
  background: var(--wire-dim);
  box-shadow: 0 0 16px -2px var(--wire-glow);
}

.burger {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 0.6rem;
  background: none;
  border: 1px solid var(--line);
  border-radius: 8px;
  cursor: pointer;
}

.burger span {
  display: block;
  width: 18px;
  height: 1px;
  background: var(--fg);
}

@media (max-width: 760px) {
  .burger {
    display: flex;
  }

  .nav {
    position: absolute;
    top: 100%;
    right: 1.5rem;
    left: 1.5rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.1rem;
    padding: 1.4rem;
    background: rgba(19, 27, 24, 0.96);
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    display: none;
  }

  .nav.is-open {
    display: flex;
  }
}
</style>
