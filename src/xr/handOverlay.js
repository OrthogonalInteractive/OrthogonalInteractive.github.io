/** MediaPipe's hand skeleton, as pairs of landmark indices. */
export const HAND_BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [9, 10], [10, 11], [11, 12],
  [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
]

const TIPS = new Set([4, 8])

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

    draw(landmarks, rect, { touching = false } = {}) {
      this.clear()
      if (!landmarks) return

      const point = (i) => ({
        x: rect.left + landmarks[i].x * rect.width,
        y: rect.top + landmarks[i].y * rect.height,
      })
      const accent = touching ? '#c5dfe9' : '#8fd3e8'

      context.lineWidth = touching ? 2.5 : 1.75
      context.strokeStyle = accent
      context.globalAlpha = touching ? 0.95 : 0.7
      context.beginPath()
      for (const [a, b] of HAND_BONES) {
        const from = point(a)
        const to = point(b)
        context.moveTo(from.x, from.y)
        context.lineTo(to.x, to.y)
      }
      context.stroke()

      context.globalAlpha = 1
      context.fillStyle = accent
      for (let i = 0; i < landmarks.length; i += 1) {
        const p = point(i)
        context.beginPath()
        context.arc(p.x, p.y, TIPS.has(i) ? 6 : 3, 0, Math.PI * 2)
        context.fill()
      }
    },

    dispose() {
      window.removeEventListener('resize', resize)
    },
  }
}
