import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Adds `is-visible` to every `.reveal` element inside `rootRef` once it
 * scrolls into view. No-ops when IntersectionObserver is unavailable (or in
 * jsdom), leaving the elements visible via the fallback below.
 */
export function useReveal(rootRef, { threshold = 0.18 } = {}) {
  let observer = null

  onMounted(() => {
    const root = rootRef.value
    if (!root) return

    const targets = root.querySelectorAll('.reveal')

    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('is-visible'))
      return
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )

    targets.forEach((el) => observer.observe(el))
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })
}
