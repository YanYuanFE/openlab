import assert from 'node:assert/strict'
import { test } from 'node:test'
import { atomsOf, REVIEW, TO_BALANCE } from './atoms.ts'
import { MOLECULES, moleculeOf } from './molecules.ts'

test('every model has exactly the atoms of its formula', () => {
  for (const [f, atoms] of Object.entries(MOLECULES)) {
    const counted: Record<string, number> = {}
    for (const [sym] of atoms) counted[sym] = (counted[sym] ?? 0) + 1
    assert.deepEqual(counted, atomsOf(f), f)
  }
})

test('every species in the chapter 2 and 10 reactions can be drawn', () => {
  const used = ['Na2CO3', 'HCl', 'NaCl', 'H2O', 'CO2', ...[...TO_BALANCE, ...REVIEW].flatMap((r) => [...r.left, ...r.right])]
  for (const f of used) assert.doesNotThrow(() => moleculeOf(f), f)
  assert.throws(() => moleculeOf('C6H12O6'), /no model for C6H12O6/)
})
