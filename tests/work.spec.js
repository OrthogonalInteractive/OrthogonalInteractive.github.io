import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkSection from '../src/components/WorkSection.vue'

const VIDEO = '/work/namecard-ar.mp4'
const POSTER = '/work/namecard-ar.jpg'

describe('work section', () => {
  it('leads with the business card AR piece', () => {
    const text = mount(WorkSection).text()

    expect(text).toContain('Business card AR')
    expect(text).toContain('8th Wall')
  })

  it('plays a capture served from the site itself', () => {
    const video = mount(WorkSection).find('video')

    expect(video.exists()).toBe(true)
    expect(video.attributes('src')).toBe(VIDEO)
    expect(video.attributes('poster')).toBe(POSTER)
  })

  it('holds the 3.8 MB download back until someone asks to watch', () => {
    const video = mount(WorkSection).find('video')

    expect(video.attributes('preload')).toBe('none')
    expect(video.attributes('autoplay')).toBeUndefined()
    expect(video.attributes('controls')).toBeDefined()
  })

  // Without this iOS takes the video full screen the moment it plays.
  it('plays inline on iOS', () => {
    expect(mount(WorkSection).find('video').attributes('playsinline')).toBeDefined()
  })

  // The capture is a phone screen recording; the frame is reserved so the
  // section does not jump once the poster arrives.
  it('reserves the portrait frame the capture is shaped to', () => {
    const video = mount(WorkSection).find('video')

    expect(video.attributes('width')).toBe('720')
    expect(video.attributes('height')).toBe('1614')
  })
})
