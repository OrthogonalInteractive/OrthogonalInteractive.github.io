/**
 * Why this browser cannot run the tracker, or null when it can.
 *
 * The WebGL probe matters: MindAR's start() resolves once the camera is live,
 * and the TensorFlow backend only fails afterwards, which would leave the page
 * sitting on "looking for the mark" forever with no explanation.
 */
export function unsupportedReason() {
  if (!window.isSecureContext) return 'This page needs HTTPS to reach the camera.'
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'This browser does not expose a camera to web pages.'
  }
  if (!hasWebGL()) return 'This browser cannot run WebGL, which the tracker needs.'
  return null
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
