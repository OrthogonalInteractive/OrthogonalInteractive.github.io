import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createMotion } from '../src/xr/objectMotion.js'

const setup = () => {
  const group = new THREE.Group()
  return { group, motion: createMotion(group) }
}

describe('createMotion', () => {
  it('holds still until something drives it', () => {
    const { group, motion } = setup()
    const before = group.quaternion.clone()

    for (let i = 0; i < 60; i += 1) motion.update(1 / 60)

    expect(group.quaternion.angleTo(before)).toBe(0)
  })

  it('turns about the axis it is stroked along', () => {
    const { group, motion } = setup()
    const before = group.quaternion.clone()

    motion.spin(new THREE.Vector3(0, 1, 0), 0.4)
    motion.update(1 / 60)

    expect(group.quaternion.angleTo(before)).toBeCloseTo(0.4, 2)
  })

  it('carries on turning after the finger lifts, then stops', () => {
    const { group, motion } = setup()
    motion.spin(new THREE.Vector3(0, 1, 0), 0.3)
    motion.update(1 / 60)
    const afterStroke = group.quaternion.clone()

    motion.update(1 / 60)
    expect(group.quaternion.angleTo(afterStroke)).toBeGreaterThan(0)

    for (let i = 0; i < 600; i += 1) motion.update(1 / 60)
    const settled = group.quaternion.clone()
    motion.update(1 / 60)

    expect(group.quaternion.angleTo(settled)).toBeCloseTo(0, 6)
  })

  it('swells while a finger is on it and settles back after', () => {
    const { group, motion } = setup()
    const rest = group.scale.x

    motion.setHighlight(1)
    for (let i = 0; i < 30; i += 1) motion.update(1 / 60)
    const lit = group.scale.x
    expect(lit).toBeGreaterThan(rest)

    motion.setHighlight(0)
    for (let i = 0; i < 90; i += 1) motion.update(1 / 60)

    expect(group.scale.x).toBeCloseTo(rest, 3)
  })

  it('returns to its starting pose when reset', () => {
    const { group, motion } = setup()
    motion.spin(new THREE.Vector3(0, 1, 0), 1.2)
    motion.update(1 / 60)

    motion.reset()

    expect(group.quaternion.angleTo(new THREE.Quaternion())).toBeCloseTo(0, 6)
  })

  it('stops coasting when reset', () => {
    const { group, motion } = setup()
    motion.spin(new THREE.Vector3(0, 1, 0), 1.2)
    motion.update(1 / 60)

    motion.reset()
    motion.update(1 / 60)
    const settled = group.quaternion.clone()
    motion.update(1 / 60)

    expect(group.quaternion.angleTo(settled)).toBe(0)
  })

  it('reports how lit it is, for materials to follow', () => {
    const { motion } = setup()

    motion.setHighlight(1)
    for (let i = 0; i < 60; i += 1) motion.update(1 / 60)

    expect(motion.highlight).toBeGreaterThan(0.9)
  })
})
