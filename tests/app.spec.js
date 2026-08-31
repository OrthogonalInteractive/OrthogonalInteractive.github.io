import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'

const EMAIL = 'jtachikawa.work@gmail.com'
const GITHUB = 'https://github.com/OrthogonalInteractive'

describe('portfolio page', () => {
  it('renders the trade name', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Orthogonal')
    expect(wrapper.text()).toContain('Interactive')
  })

  it('is reduced to About and Services', () => {
    const wrapper = mount(App)
    const labels = wrapper.findAll('nav a[href^="#"]').map((link) => link.text())

    expect(labels).toEqual(['About', 'Services'])
    expect(wrapper.find('#about').exists()).toBe(true)
    expect(wrapper.find('#services').exists()).toBe(true)
    expect(wrapper.find('#work').exists()).toBe(false)
    expect(wrapper.find('#contact').exists()).toBe(false)
  })

  it('drops the hero screen and opens on About', () => {
    const wrapper = mount(App)

    expect(wrapper.find('#top').exists()).toBe(false)
    expect(wrapper.find('main').element.firstElementChild.id).toBe('about')
  })

  it('carries no rendered 3D scene', () => {
    const wrapper = mount(App)
    expect(wrapper.find('canvas').exists()).toBe(false)
  })

  it('lists the business facts in the About section', () => {
    const wrapper = mount(App)
    const text = wrapper.find('#about').text()

    expect(text).toContain('Orthogonal Interactive')
    expect(text).toContain('Jun Tachikawa')
    expect(text).toContain('2026.06')
    expect(text).toContain('Japan')
  })

  it('introduces the principal background in the About copy', () => {
    const wrapper = mount(App)
    const about = wrapper.find('#about').text()

    expect(about).toContain('embedded')
    expect(about).toContain('semiconductor')
    expect(about).toContain('Unity')
    // The current work leads; the earlier career follows it.
    expect(about.indexOf('Unity')).toBeLessThan(about.indexOf('embedded'))
  })

  it('keeps the service list out of the About facts', () => {
    const wrapper = mount(App)
    expect(wrapper.find('#about').text()).not.toContain('Services')
  })

  it('describes the services around Unity, not the web stack', () => {
    const wrapper = mount(App)
    const services = wrapper.find('#services').text()

    expect(services).toContain('Unity')
    expect(services).not.toContain('Three.js')
    expect(services).not.toContain('GLSL')
  })

  it('collects mail and GitHub in the footer', () => {
    const wrapper = mount(App)
    const footer = wrapper.find('footer')

    expect(footer.find(`a[href="mailto:${EMAIL}"]`).exists()).toBe(true)
    expect(footer.find(`a[href="${GITHUB}"]`).exists()).toBe(true)
  })

  it('opens external links safely', () => {
    const wrapper = mount(App)
    wrapper
      .findAll('a[target="_blank"]')
      .forEach((link) => expect(link.attributes('rel')).toContain('noopener'))
  })
})
