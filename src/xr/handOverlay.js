import { INDEX_FINGER, LANDMARK } from './landmarks.js'

const IDLE_COLOUR = '#8fd3e8'
const TOUCH_COLOUR = '#e2574c'

/** The box MindAR scaled the camera feed into, which usually overhangs the screen. */
export function videoRect(video) {
  return {
    left: Number.parseFloat(video.style.left) || 0,
    top: Number.parseFloat(video.style.top) || 0,
    width: Number.parseFloat(video.style.width) || video.videoWidth,
    height: Number.parseFloat(video.style.height) || video.videoHeight,
  }
}

/** Draws the tracked hand over the camera feed, so the tracking is visible. */
export function createHandOverlay(canvas) {
  const context = canvas.getContext('2d')
  let width = 0
  let height = 0

  function resize() {
    const ratio = Math.min(window.devicePixelRatio, 2)
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = width * ratio
    canvas.height = height * ratio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
  }

  resize()
  window.addEventListener('resize', resize)

  return {
    resize,

    clear() {
      context.clearRect(0, 0, width, height)
    },

    /** Only the index finger is drawn — it is the only part that can touch. */
    draw(landmarks, rect, { touching = false } = {}) {
      this.clear()
      if (!landmarks) return

      const point = (i) => ({
        x: rect.left + landmarks[i].x * rect.width,
        y: rect.top + landmarks[i].y * rect.height,
      })
      const colour = touching ? TOUCH_COLOUR : IDLE_COLOUR

      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = colour
      context.lineWidth = touching ? 9 : 7
      context.globalAlpha = touching ? 0.95 : 0.75
      context.beginPath()
      INDEX_FINGER.forEach((index, i) => {
        const p = point(index)
        if (i === 0) context.moveTo(p.x, p.y)
        else context.lineTo(p.x, p.y)
      })
      context.stroke()

      const tip = point(LANDMARK.INDEX_TIP)
      context.globalAlpha = 1
      context.fillStyle = colour
      context.beginPath()
      context.arc(tip.x, tip.y, touching ? 13 : 10, 0, Math.PI * 2)
      context.fill()

      if (touching) {
        context.strokeStyle = colour
        context.lineWidth = 2
        context.globalAlpha = 0.5
        context.beginPath()
        context.arc(tip.x, tip.y, 24, 0, Math.PI * 2)
        context.stroke()
      }
    },

    dispose() {
      window.removeEventListener('resize', resize)
    },
  }
}
