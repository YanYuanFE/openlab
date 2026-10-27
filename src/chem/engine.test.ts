import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apply, emptyVessel, evaporate, filter, look, phOf, pour, type Action, type Vessel } from './engine.ts'

function run(actions: Action[], start = emptyVessel()): { v: Vessel; fired: string[][] } {
  let v = start
  const fired: string[][] = []
  actions.forEach((a, i) => {
    const r = apply(v, a, i * 10)
    v = r.vessel
    fired.push(r.fired.map((f) => f.id))
  })
  return { v, fired }
}

test('Fe3+ with SCN- turns blood red', () => {
  const { v, fired } = run([{ type: 'add', reagent: 'FeCl3' }, { type: 'add', reagent: 'KSCN' }])
  assert.deepEqual(fired, [[], ['fe3-scn']])
  assert.equal(look(v, 20).color, '#a3101c')
  assert.equal(v.volume, 2.3)
})

test('iron reduces Fe3+ only when agitated, then chlorine re-oxidises and SCN- shows red', () => {
  const { v, fired } = run([
    { type: 'add', reagent: 'FeCl3' },
    { type: 'add', reagent: 'Fe' },
    { type: 'agitate' },
    { type: 'add', reagent: 'KSCN' },
    { type: 'add', reagent: 'Cl2water' },
  ])
  assert.deepEqual(fired, [[], [], ['fe3-reduce'], [], ['fe2-oxidize', 'fe3-scn']])
  assert.equal(look(v, 50).color, '#a3101c')
  assert.equal(look(v, 50).grains, '#3f4147')
})

test('Fe(OH)2 goes white -> grey-green -> red-brown over time', () => {
  const v = apply(apply(emptyVessel(), { type: 'add', reagent: 'FeSO4' }, 0).vessel, { type: 'add', reagent: 'NaOH' }, 100).vessel
  assert.equal(look(v, 100).color, '#f1f0e8')
  assert.equal(look(v, 102.4).color, '#f1f0e8')
  assert.equal(look(v, 102.5).color, '#8e9c78')
  assert.equal(look(v, 107).color, '#8b3f1f')
})

test('NaCl dissolves only when stirred with water', () => {
  const { v, fired } = run([{ type: 'add', reagent: 'NaCl' }, { type: 'add', reagent: 'water' }, { type: 'agitate' }])
  assert.deepEqual(fired, [[], [], ['dissolve']])
  assert.deepEqual(Object.keys(v.species).sort(), ['Cl-', 'H2O', 'Na+'])
  assert.equal(v.volume, 30)
})

test('crude salt purification removes every impurity and ends neutral NaCl', () => {
  const { v, fired } = run([
    { type: 'add', reagent: 'crudeSalt' },
    { type: 'add', reagent: 'water', dose: 40 },
    { type: 'agitate' },
    { type: 'add', reagent: 'BaCl2' },
    { type: 'add', reagent: 'NaOH' },
    { type: 'add', reagent: 'Na2CO3' },
  ])
  assert.deepEqual(fired.slice(2), [['dissolve'], ['baso4'], ['mgoh2'], ['caco3', 'baco3']])
  assert.equal(phOf(v), 13)

  const f = filter(v, emptyVessel(), 100)
  assert.deepEqual(f.residue.sort(), ['BaCO3', 'BaSO4', 'CaCO3', 'Mg(OH)2', 'sand'])
  assert.equal(f.filtrate.vessel.volume, 42.6)

  const acid = apply(f.filtrate.vessel, { type: 'add', reagent: 'HCl' }, 110)
  assert.deepEqual(acid.fired.map((r) => r.id), ['neutralize', 'co3-acid', 'acid-to-neutral'])
  assert.equal(phOf(acid.vessel), 7)
  assert.equal(look(acid.vessel, 111).bubbles > 0.5, true)
  assert.equal(look(acid.vessel, 120).bubbles, 0)

  const dry = evaporate(acid.vessel, 130)
  assert.deepEqual(Object.keys(dry.species), ['NaCl(s)'])
  assert.equal(dry.volume, 0)
})

test('Na2S2O3 + H2SO4 turns cloudy sooner when hot', () => {
  const make = (temp: 'hot' | 'cold') =>
    run([{ type: 'add', reagent: 'Na2S2O3' }, { type: 'add', reagent: 'H2SO4' }], emptyVessel(temp)).v
  const hot = make('hot')
  const cold = make('cold')
  assert.equal(hot.species.S, 13)
  assert.equal(cold.species.S, 24)
  // 2 s after the acid: neither is cloudy yet
  assert.equal(look(hot, 12).opacity, look(cold, 12).opacity)
  // fully cloudy hot tube while the cold one is still clear
  assert.equal(look(hot, 17).opacity, 0.95)
  assert.equal(look(cold, 17).opacity, 0.45)
})

test('MnO2 makes H2O2 bubble vigorously; alone it barely bubbles', () => {
  const plain = run([{ type: 'add', reagent: 'H2O2' }]).v
  const cat = run([{ type: 'add', reagent: 'H2O2' }, { type: 'add', reagent: 'MnO2' }]).v
  assert.equal(look(plain, 5).bubbles, 0.06)
  assert.equal(look(cat, 12).bubbles, 1)
})

test('pour mixes contents and empties the source', () => {
  const a = apply(emptyVessel(), { type: 'add', reagent: 'FeCl3' }, 0).vessel
  const b = apply(emptyVessel(), { type: 'add', reagent: 'KSCN' }, 0).vessel
  const p = pour(a, b, 5)
  assert.equal(p.from.volume, 0)
  assert.equal(p.to.vessel.volume, 2.3)
  assert.deepEqual(p.to.fired.map((f) => f.id), ['fe3-scn'])
})
