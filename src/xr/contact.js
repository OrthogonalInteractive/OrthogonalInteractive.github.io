import * as THREE from 'three'
import { LANDMARK } from './pinch.js'

/** How far outside its own radius the object still counts as touched. */
const SLACK = 1.15

const centre = new THREE.Vector3()
const edge = new THREE.Vector3()
const right = new THREE.Vector3()

/**
 * Landmarks are normalised to the camera feed, which MindAR scales to cover the
 * viewport — so the video box usually hangs outside the screen and cannot be
 * treated as if it filled it.
 */
export function landmarkToScreen({ x, y }, rect) {
  return { x: rect.left + x * rect.width, y: rect.top + y * rect.height }
}

/** Where the fingers meet, in screen pixels. */
export function pinchPoint(landmarks, rect) {
  const thumb = landmarkToScreen(landmarks[LANDMARK.THUMB_TIP], rect)
  const index = landmarkToScreen(landmarks[LANDMARK.INDEX_TIP], rect)
  return { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 }
}

/**
 * The object as a circle on screen. Landmarks carry no usable depth, so contact
 * is decided in two dimensions; this is what makes that comparable.
 */
export function screenCircle(object, camera, radius, size) {
  centre.setFromMatrixPosition(object.matrixWorld)
  const depth = centre.clone().applyMatrix4(camera.matrixWorldInverse).z
  if (depth >= 0) return null // behind the lens

  right.setFromMatrixColumn(camera.matrixWorld, 0)
  edge.copy(centre).addScaledVector(right, radius)

  centre.project(camera)
  edge.project(camera)

  const toPixels = (v) => ({
    x: ((v.x + 1) / 2) * size.width,
    y: ((1 - v.y) / 2) * size.height,
  })
  const c = toPixels(centre)
  const e = toPixels(edge)
  return { x: c.x, y: c.y, r: Math.hypot(e.x - c.x, e.y - c.y) }
}

export function isTouching(point, circle) {
  if (!point || !circle) return false
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.r * SLACK
}
