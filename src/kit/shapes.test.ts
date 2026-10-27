import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SHAPES, heightFor, profilePoints, surfaceFor, volumeUnder } from './shapes.ts'

test('beaker liquid height is volume over base area', () => {
  // 100 mL beaker, r = 2.6 cm: 30 mL -> 30 / (π·2.6²) ≈ 1.41 cm
  assert.equal(heightFor(SHAPES.beaker100, 30).toFixed(2), '1.41')
  assert.equal(heightFor(SHAPES.beaker100, 0), 0)
  assert.equal(heightFor(SHAPES.beaker100, 1000), 7.2)
})

test('volumetric flask: 100 mL mark sits in the neck, 1.6 mL below it is about 1 cm lower', () => {
  const mark = heightFor(SHAPES.volumetric100, 100)
  const below = heightFor(SHAPES.volumetric100, 98.4)
  assert.equal(mark > 6 && mark < 13, true, `mark at ${mark}`)
  // neck area π·0.7² ≈ 1.54 cm², so 1.6 mL ≈ 1.04 cm
  assert.equal((mark - below).toFixed(2), '1.04')
})

test('inverted flask holds the same volume and fills its neck first', () => {
  const up = SHAPES.round250.table
  const down = SHAPES.roundInverted.table
  assert.equal(Math.round(up[up.length - 1]), Math.round(down[down.length - 1]))
  // neck radius 0.9 cm: 5 mL rises 5 / (π·0.81) ≈ 1.96 cm
  assert.equal(heightFor(SHAPES.roundInverted, 5).toFixed(1), '2.0')
})

test('upright, the tilted surface is just the liquid height', () => {
  assert.equal(surfaceFor(SHAPES.beaker100, 30, 0), heightFor(SHAPES.beaker100, 30))
})

test('a cylinder tilted 30° keeps its volume with the surface crossing the axis at the upright height', () => {
  // 150 mL in r = 3.4: upright 4.13 cm; the plane still meets both walls, so on the axis it sits at h0, i.e. h0·cos30 up
  const h0 = heightFor(SHAPES.beaker250, 150)
  const tilt = Math.PI / 6
  assert.equal(surfaceFor(SHAPES.beaker250, 150, tilt).toFixed(2), (h0 * Math.cos(tilt)).toFixed(2))
})

test('a tilted conical flask holds the same volume under its new surface', () => {
  const s = SHAPES.conical250
  const tilt = 0.7
  const h = surfaceFor(s, 60, tilt)
  const kept = volumeUnder(s, h, tilt) / s.scale
  assert.equal(Math.abs(kept - 60) < 0.3, true, `kept ${kept} mL`)
})

test('straight walls are drawn with a few profile points, curved ones keep their detail', () => {
  assert.equal(profilePoints(SHAPES.beaker250).length, 2)
  // curved walls: far fewer than the 160 samples, yet every sample lies within 0.01 cm of the polyline
  for (const name of ['volumetric100', 'round250'] as const) {
    const s = SHAPES[name]
    const pts = profilePoints(s)
    assert.equal(pts.length < 40, true, `${name}: ${pts.length} points`)
    let worst = 0
    for (let k = 0; k <= 160; k++) {
      const p: [number, number] = [s.r((k / 160) * s.height), (k / 160) * s.height]
      const j = Math.max(pts.findIndex(([, py]) => py >= p[1]), 1)
      const [[ax, ay], [bx, by]] = [pts[j - 1], pts[j]]
      worst = Math.max(worst, Math.abs((bx - ax) * (ay - p[1]) - (ax - p[0]) * (by - ay)) / Math.hypot(bx - ax, by - ay))
    }
    assert.equal(worst <= 0.0100001, true, `${name}: off by ${worst}`)
  }
  assert.deepEqual(profilePoints(SHAPES.conical250).at(-1), [1.6, 14.5])
})
