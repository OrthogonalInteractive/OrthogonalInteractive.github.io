import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SITE = 'https://orthogonalinteractive.github.io/'
const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8')
const meta = (property) =>
  html.match(new RegExp(`property="${property}"\\s+content="([^"]*)"`))?.[1]

// Link previews (Slack, X, Facebook) fetch these from outside the site, so a
// root-relative path gives them nothing to load.
describe('share preview tags', () => {
  it('points the preview image at a full URL on the site', () => {
    expect(meta('og:image')).toBe(`${SITE}org-icon.png`)
  })

  it('names the page by its full URL', () => {
    expect(meta('og:url')).toBe(SITE)
  })
})
