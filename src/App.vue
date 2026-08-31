<script setup>
import { ref } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import HeroSection from './components/HeroSection.vue'
import StudioSection from './components/StudioSection.vue'
import CraftSection from './components/CraftSection.vue'
import WorkSection from './components/WorkSection.vue'
import ContactSection from './components/ContactSection.vue'
import SiteFooter from './components/SiteFooter.vue'
import { useReveal } from './composables/useReveal'

const root = ref(null)
useReveal(root)
</script>

<template>
  <div ref="root" class="page">
    <SiteHeader />
    <main>
      <HeroSection />
      <StudioSection />
      <CraftSection />
      <WorkSection />
      <ContactSection />
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.page {
  position: relative;
  min-height: 100vh;
}
</style>
