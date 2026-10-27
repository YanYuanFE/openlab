import assert from 'node:assert/strict'
import { test } from 'node:test'
import { endpointState, equivalence, pH, phenolphthalein, round2 } from './titration.ts'

test('equivalence point is 22.00 mL', () => {
  assert.equal(round2(equivalence), 22)
})

test('pH climbs from acidic through 7 to basic', () => {
  assert.equal(pH(0).toFixed(2), '0.96')
  assert.equal(pH(22), 7)
  assert.equal(pH(21.95) < 4.7, true)
  assert.equal(pH(22.05) > 9.9, true)
})

test('one drop past equivalence is the endpoint; half a millilitre past is overshot', () => {
  assert.equal(endpointState(21.95), 'before')
  assert.equal(endpointState(22), 'before')
  assert.equal(endpointState(22.05), 'endpoint')
  assert.equal(endpointState(22.1), 'endpoint')
  assert.equal(endpointState(22.5), 'over')
})

test('phenolphthalein is colourless in acid and pale pink at the endpoint', () => {
  assert.equal(phenolphthalein(pH(10)).color, '#e8f1f4')
  assert.equal(phenolphthalein(pH(22.05)).color, '#f4b6cf')
  assert.equal(phenolphthalein(pH(30)).color, '#d03a83')
})
