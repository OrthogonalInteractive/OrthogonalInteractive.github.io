import { describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { createBrandObject } from '../src/xr/brandObject.js'

describe('createBrandObject', () => {
  it('builds a faceted core wrapped in glowing edges', () => {
    const { group } = createBrandObject()

    expect(group).toBeInstanceOf(THREE.Group)

    const core = group.children.find((child) => child instanceof THREE.Mesh)
    expect(core.material.flatShading).toBe(true)

    const edges = group.children.find((child) => child instanceof THREE.LineSegments)
    expect(edges).toBeDefined()
  })

  it('carries one ring per axis, mutually orthogonal', () => {
    const { rings } = createBrandObject()

    expect(rings).toHaveLength(3)
    const axes = rings.map((ring) =>
      new THREE.Vector3(0, 0, 1).applyEuler(ring.rotation).round(),
    )
    axes.forEach((a, i) =>
      axes.slice(i + 1).forEach((b) => expect(Math.abs(a.dot(b))).toBe(0)),
    )
  })

  it('lies flat on the tracked image, sized to sit within it', () => {
    const { group } = createBrandObject()
    const box = new THREE.Box3().setFromObject(group)

    // MindAR anchors span 1 unit across the target's width; leave a margin so
    // the object sits inside the printed mark rather than overhanging it.
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(0.62)
    expect(group.position.z).toBeGreaterThan(0)
  })

  it('sits still until something drives it', () => {
    const { group, update } = createBrandObject()
    const before = group.rotation.toArray()

    for (let i = 0; i < 60; i += 1) update(1 / 60)

    expect(group.rotation.toArray()).toEqual(before)
  })

  it('rises off the card while held', () => {
    const object = createBrandObject()
    const rest = object.group.position.z

    object.setGrabbed(true)
    for (let i = 0; i < 30; i += 1) object.update(1 / 60)

    expect(object.group.position.z).toBeGreaterThan(rest + 0.1)
  })

  it('drops back and settles when let go', () => {
    const object = createBrandObject()
    const rest = object.group.position.z
    object.setGrabbed(true)
    for (let i = 0; i < 30; i += 1) object.update(1 / 60)

    object.setGrabbed(false)
    let lowest = Infinity
    for (let i = 0; i < 180; i += 1) {
      object.update(1 / 60)
      lowest = Math.min(lowest, object.group.position.z)
    }

    // It lands on the card and stays there — never sinking through it.
    expect(lowest).toBeGreaterThanOrEqual(rest - 1e-6)
    expect(object.group.position.z).toBeCloseTo(rest, 3)
  })

  it('bounces once instead of stopping dead', () => {
    const object = createBrandObject()
    const rest = object.group.position.z
    object.setGrabbed(true)
    for (let i = 0; i < 30; i += 1) object.update(1 / 60)
    object.setGrabbed(false)

    const heights = []
    for (let i = 0; i < 120; i += 1) {
      object.update(1 / 60)
      heights.push(object.group.position.z)
    }
    const landed = heights.findIndex((z) => z <= rest + 1e-6)
    const afterLanding = heights.slice(landed)

    expect(Math.max(...afterLanding)).toBeGreaterThan(rest + 0.005)
  })

  it('keeps the rotation the twist produced after release', () => {
    const object = createBrandObject()
    object.setGrabbed(true)
    object.setTwist(0.8)
    object.update(1 / 60)

    object.setGrabbed(false)
    for (let i = 0; i < 120; i += 1) object.update(1 / 60)

    expect(object.group.rotation.z).toBeCloseTo(0.8, 2)
  })

  it('releases every geometry and material on dispose', () => {
    const { group, dispose } = createBrandObject()
    const spies = []
    group.traverse((child) => {
      // three's dispose() only signals the renderer, so watch the calls.
      if (child.geometry) spies.push(vi.spyOn(child.geometry, 'dispose'))
      if (child.material) spies.push(vi.spyOn(child.material, 'dispose'))
    })

    dispose()

    expect(spies.length).toBeGreaterThan(0)
    spies.forEach((spy) => expect(spy).toHaveBeenCalled())
  })
})
