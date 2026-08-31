import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'

describe('portfolio page', () => {
  it('renders the studio name', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Orthogonal')
    expect(wrapper.text()).toContain('Interactive')
  })

  it('exposes every section the navigation points at', () => {
    const wrapper = mount(App)
    const targets = wrapper
      .findAll('nav a[href^="#"]')
      .map((link) => link.attributes('href').slice(1))

    expect(targets.length).toBeGreaterThan(0)
    targets.forEach((id) => {
      expect(wrapper.find(`#${id}`).exists()).toBe(true)
    })
  })

  it('links to the GitHub organisation', () => {
    const wrapper = mount(App)
    const links = wrapper
      .findAll('a')
      .map((link) => link.attributes('href'))
      .filter(Boolean)

    expect(links).toContain('https://github.com/OrthogonalInteractive')
  })

  it('opens external links safely', () => {
    const wrapper = mount(App)
    wrapper
      .findAll('a[target="_blank"]')
      .forEach((link) => expect(link.attributes('rel')).toContain('noopener'))
  })
})
