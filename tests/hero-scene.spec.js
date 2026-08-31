import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import HeroScene from '../src/components/HeroScene.vue'

describe('HeroScene', () => {
  it('falls back to a static backdrop when WebGL is unavailable', async () => {
    // jsdom has no WebGL, which is the same code path as an unsupported browser.
    const wrapper = mount(HeroScene)
    await nextTick()

    expect(wrapper.find('.scene__fallback').exists()).toBe(true)
  })

  it('stays out of the accessibility tree', () => {
    const wrapper = mount(HeroScene)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })
})
