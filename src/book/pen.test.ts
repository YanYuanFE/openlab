import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as THREE from 'three'
import { pressure, ribbon, rimIndices, strokesFor, trimCaps } from './pen.ts'

const shape = (g: THREE.BufferGeometry) => strokesFor(g).map((s) => [s.mode, s.strokes.length])

test('a beaker profile gets a rim at its sharp corners, not on the axis or the gentle lip curl', () => {
  const R = 2.6
  const T = 0.12
  const H = 6.5
  const profile: [number, number][] = [[0, T], [R - T, T], [R - T, H], [R + 0.12, H + 0.05], [R, H - 0.25], [R, 0], [0, 0]]
  // inner bottom, inner top, lip, outer bottom; the 22° bend under the lip is not a corner
  assert.deepEqual(rimIndices(profile), [1, 2, 3, 5])
})

test('turned solids get two silhouettes and their rims; spheres a facing ring', () => {
  assert.deepEqual(shape(new THREE.CylinderGeometry(1, 1, 4)), [['side', 2], ['static', 2]])
  assert.deepEqual(shape(new THREE.ConeGeometry(1, 2)), [['side', 2], ['static', 1]])
  assert.deepEqual(shape(new THREE.SphereGeometry(1)), [['ring', 1]])
  // a dome is drawn as the arc it is, with its base rim only
  assert.deepEqual(shape(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2)), [['side', 2], ['static', 1]])
})

test('faceted solids get their creases and tubes their two edges', () => {
  assert.deepEqual(shape(new THREE.BoxGeometry(1, 1, 1)), [['static', 12]])
  assert.deepEqual(shape(new THREE.OctahedronGeometry(1)), [['static', 12]])
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 0), new THREE.Vector3(2, 0, 0)])
  const sets = strokesFor(new THREE.TubeGeometry(curve, 10, 0.2))
  assert.deepEqual(sets.map((s) => [s.mode, s.strokes.length, s.strokes[0].pts.length]), [['side', 2, 11]])
  assert.equal(sets[0].strokes[0].pts[0].o, 0.2)
  assert.equal(sets[0].strokes[1].pts[0].o, -0.2)
  assert.deepEqual(shape(new THREE.PlaneGeometry(1, 1)), [])
})

test('pen pressure thins both ends of a tapered stroke only', () => {
  const mid = pressure(3, 5, 10, true)
  assert.ok(pressure(3, 0, 10, true) < mid * 0.6, 'start is thin')
  assert.ok(pressure(3, 10, 10, true) < mid * 0.6, 'end is thin')
  assert.equal(pressure(3, 0, 10, false), pressure(3, 0, 10, false))
  assert.ok(pressure(3, 0, 10, false) > 0.8)
})

test('a ribbon has two vertices per point and closes rings with a repeated point', () => {
  const [ring] = strokesFor(new THREE.SphereGeometry(1))
  const g = ribbon(ring)
  assert.equal(g.getAttribute('position').count, (56 + 1) * 2)
  assert.equal(g.getIndex()!.count, 56 * 6)
  const len = g.getAttribute('aLine').getX(0)
  assert.ok(Math.abs(len - 2 * Math.PI) < 0.01, `ring length ${len}`)
})

test('silhouettes stop at the rim of a cap but run to the tip of a cone', () => {
  assert.deepEqual(trimCaps([[0, -2], [1, -2], [1, 2], [0, 2]]), [[1, -2], [1, 2]])
  assert.deepEqual(trimCaps([[0, -1], [1, -1], [0, 1]]), [[1, -1], [0, 1]])
  const [side] = strokesFor(new THREE.CylinderGeometry(1, 1, 4))
  assert.deepEqual(side.strokes[0].pts.map((p) => [p.p[1], p.o]), [[-2, 1], [2, 1]])
})
