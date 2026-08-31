/**
 * Why this browser cannot run the tracker, or null when it can.
 *
 * The WebGL probe matters: MindAR's start() resolves once the camera is live,
 * and the TensorFlow backend only fails afterwards, which would leave the page
 * sitting on "looking for the mark" forever with no explanation.
 */
export function unsupportedReason() {
  if (!window.isSecureContext) return 'カメラを使うには HTTPS 接続が必要です。'
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'このブラウザは Web ページにカメラを渡していません。'
  }
  if (!hasWebGL()) return 'このブラウザは WebGL に対応していないため、認識処理を実行できません。'
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
