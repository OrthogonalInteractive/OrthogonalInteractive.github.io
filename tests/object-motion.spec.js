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

  it('turns about its own upright axis', () => {
    const { group, motion } = setup()

    motion.spin(0.4)
    motion.update(1 / 60)

    expect(group.rotation.z).toBeCloseTo(0.4, 5)
    expect(group.rotation.x).toBeCloseTo(0, 6)
    expect(group.rotation.y).toBeCloseTo(0, 6)
  })

  it('keeps to that axis even under a rotated parent', () => {
    // The mark's pose sits on the parent. three's world-axis rotation assumes
    // an unrotated parent, which is how the axis drifted before.
    const parent = new THREE.Group()
    parent.rotation.set(0.6, -0.4, 0.9)
    const { group, motion } = setup()
    parent.add(group)

    motion.spin(0.5)
    motion.update(1 / 60)
    motion.spin(0.5)
    motion.update(1 / 60)

    expect(group.rotation.z).toBeCloseTo(1, 5)
    expect(group.rotation.x).toBeCloseTo(0, 6)
    expect(group.rotation.y).toBeCloseTo(0, 6)
  })

  it('carries on turning after the finger lifts, then stops', () => {
    const { group, motion } = setup()
    motion.spin(0.3)
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
    motion.spin(1.2)
    motion.update(1 / 60)

    motion.reset()

    expect(group.quaternion.angleTo(new THREE.Quaternion())).toBeCloseTo(0, 6)
  })

  it('stops coasting when reset', () => {
    const { group, motion } = setup()
    motion.spin(1.2)
    motion.update(1 / 60)

    motion.reset()
    motion.update(1 / 60)
    const settled = group.quaternion.clone()
    motion.update(1 / 60)

    expect(group.quaternion.angleTo(settled)).toBe(0)
  })

  it('fades out when it is no longer present, and hides once faded', () => {
    const { group, motion } = setup()

    motion.setPresent(false)
    for (let i = 0; i < 90; i += 1) motion.update(1 / 60)

    expect(motion.presence).toBeLessThan(0.01)
    expect(group.visible).toBe(false)
  })

  it('comes back the moment it is present again', () => {
    const { group, motion } = setup()
    motion.setPresent(false)
    for (let i = 0; i < 90; i += 1) motion.update(1 / 60)

    motion.setPresent(true)
    motion.update(1 / 60)

    // Visible again straight away, so the rise out of the card is not missed.
    expect(group.visible).toBe(true)
  })

  it('starts out present', () => {
    const { group, motion } = setup()
    motion.update(1 / 60)

    expect(motion.presence).toBe(1)
    expect(group.visible).toBe(true)
  })

  it('eases to the size it is given', () => {
    const { group, motion } = setup()

    motion.setSize(2.5)
    for (let i = 0; i < 60; i += 1) motion.update(1 / 60)

    expect(group.scale.x).toBeCloseTo(2.5, 2)
  })

  it('comes back to its own size on reset', () => {
    const { group, motion } = setup()
    motion.setSize(2.5)
    for (let i = 0; i < 60; i += 1) motion.update(1 / 60)

    motion.reset()
    motion.update(1 / 60)

    expect(group.scale.x).toBeCloseTo(1, 5)
  })

  it('reports how lit it is, for materials to follow', () => {
    const { motion } = setup()

    motion.setHighlight(1)
    for (let i = 0; i < 60; i += 1) motion.update(1 / 60)

    expect(motion.highlight).toBeGreaterThan(0.9)
  })
})
