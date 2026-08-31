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

  it('reads larger than the mark it rises from', () => {
    const { group } = createBrandObject()
    const box = new THREE.Box3().setFromObject(group)
    const width = box.max.x - box.min.x

    // A MindAR anchor spans one unit across the target's width. The object is
    // meant to overhang the card, but not by so much that it leaves frame.
    expect(width).toBeGreaterThan(1)
    expect(width).toBeLessThan(1.4)
  })

  it('floats clear of the mark it sits on', () => {
    const { group } = createBrandObject()

    expect(group.position.z).toBeGreaterThan(0.3)
  })

  it('turns about the axis it is stroked along', () => {
    const object = createBrandObject()
    const before = object.group.quaternion.clone()

    object.spin(new THREE.Vector3(0, 1, 0), 0.4)
    object.update(1 / 60)

    expect(object.group.quaternion.angleTo(before)).toBeCloseTo(0.4, 2)
  })

  it('carries on turning after the finger lifts, then stops', () => {
    const object = createBrandObject()
    object.spin(new THREE.Vector3(0, 1, 0), 0.3)
    object.update(1 / 60)
    const afterStroke = object.group.quaternion.clone()

    object.update(1 / 60)
    object.update(1 / 60)
    const coasting = object.group.quaternion.clone()
    expect(coasting.angleTo(afterStroke)).toBeGreaterThan(0)

    for (let i = 0; i < 600; i += 1) object.update(1 / 60)
    const settled = object.group.quaternion.clone()
    object.update(1 / 60)

    expect(object.group.quaternion.angleTo(settled)).toBeCloseTo(0, 6)
  })

  it('sits still until something drives it', () => {
    const { group, update } = createBrandObject()
    const before = group.rotation.toArray()

    for (let i = 0; i < 60; i += 1) update(1 / 60)

    expect(group.rotation.toArray()).toEqual(before)
  })





  it('brightens and swells while a hand is on it', () => {
    const object = createBrandObject()
    const rings = object.rings.map((ring) => ring.material.opacity)
    const scale = object.group.scale.x

    object.setHighlight(1)
    for (let i = 0; i < 30; i += 1) object.update(1 / 60)

    expect(object.group.scale.x).toBeGreaterThan(scale)
    object.rings.forEach((ring, i) => expect(ring.material.opacity).toBeGreaterThan(rings[i]))
  })

  it('settles back once the hand leaves', () => {
    const object = createBrandObject()
    const scale = object.group.scale.x
    object.setHighlight(1)
    for (let i = 0; i < 30; i += 1) object.update(1 / 60)

    object.setHighlight(0)
    for (let i = 0; i < 60; i += 1) object.update(1 / 60)

    expect(object.group.scale.x).toBeCloseTo(scale, 3)
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
