<script setup>
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="shell footer__inner">
      <div class="footer__brand">
        <img src="/org-icon.png" alt="" width="28" height="28" />
        <span>Orthogonal Interactive</span>
      </div>
      <p class="footer__meta">
        © {{ year }} · Built with Vue &amp; Three.js · Hosted on GitHub Pages
      </p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--line-soft);
  padding: 2.25rem 0 2.75rem;
}

.footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.footer__brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 0.85rem;
  color: var(--fg-muted);
}

.footer__brand img {
  border-radius: 6px;
  border: 1px solid var(--line);
}

.footer__meta {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: var(--fg-faint);
}
</style>
