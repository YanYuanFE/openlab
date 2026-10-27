import assert from 'node:assert/strict'
import { test } from 'node:test'
import { atomsOf, balanced, ELEMENTS, elementsIn, massOf, sideAtoms, sides, simplest, SODA_ACID, SODA_ACID_KS, THINGS, TO_BALANCE, REVIEW, type Side } from './atoms.ts'

test('atomsOf counts every atom of a formula', () => {
  assert.deepEqual(atomsOf('NaHCO3'), { Na: 1, H: 1, C: 1, O: 3 })
  assert.deepEqual(atomsOf('H2O'), { H: 2, O: 1 })
  assert.deepEqual(atomsOf('Fe'), { Fe: 1 })
  assert.throws(() => atomsOf('Xy2'), /unknown element Xy/)
  assert.throws(() => atomsOf('h2o'), /cannot parse/)
})

test('the four-thing challenge has exactly one answer', () => {
  const ids = THINGS.map((t) => t.id)
  const all = ELEMENTS.length
  const subsets = (k: number, from = 0): string[][] =>
    k === 0 ? [[]] : ids.slice(from).flatMap((id, i) => subsets(k - 1, from + i + 1).map((s) => [id, ...s]))
  const full = (s: string[]) => elementsIn(s).size === all
  assert.equal(subsets(3).filter(full).length, 0)
  assert.deepEqual(subsets(4).filter(full), [['salt', 'nail', 'wire', 'soda']])
})

test('massOf adds relative atomic masses', () => {
  assert.equal(massOf('Na2CO3'), 106)
  assert.equal(massOf('CO2'), 44)
  assert.equal(massOf('HCl'), 36.5)
  assert.equal(massOf('FeCl3'), 162.5)
})

test('Na2CO3 + 2HCl -> 2NaCl + H2O + CO2 conserves atoms and mass', () => {
  const [left, right] = sides(SODA_ACID, SODA_ACID_KS)
  assert.deepEqual(sideAtoms(left), { Na: 2, C: 1, O: 3, H: 2, Cl: 2 })
  assert.equal(balanced(left, right), true)
  const mass = (s: Side) => s.reduce((m, [k, f]) => m + k * massOf(f), 0)
  assert.equal(mass(left), 179)
  assert.equal(mass(right), 179)
})

test('balanced spots a missing element on one side', () => {
  assert.equal(balanced([[2, 'Fe'], [3, 'Cl2']], [[2, 'FeCl3']]), true)
  assert.equal(balanced([[1, 'Fe'], [1, 'Cl2']], [[1, 'FeCl3']]), false)
  assert.equal(balanced([[1, 'CH4']], [[1, 'CO2']]), false)
})

test('simplest rejects a common factor', () => {
  assert.equal(simplest([1, 2, 1, 2]), true)
  assert.equal(simplest([2, 4, 2, 4]), false)
  assert.equal(simplest([2, 3, 2]), true)
  assert.equal(simplest([3, 3, 3]), false)
})

test('each equation to balance has exactly one simplest answer within 1-9', () => {
  const tuples = (n: number): number[][] => (n === 0 ? [[]] : tuples(n - 1).flatMap((t) => Array.from({ length: 9 }, (_, i) => [...t, i + 1])))
  const answers = TO_BALANCE.map((r) =>
    tuples(r.left.length + r.right.length).filter((ks) => balanced(...sides(r, ks)) && simplest(ks)),
  )
  assert.deepEqual(answers, [[[1, 2, 1, 2]], [[2, 3, 2]]])
  const review = REVIEW.map((r) => tuples(r.left.length + r.right.length).filter((ks) => balanced(...sides(r, ks)) && simplest(ks)))
  assert.deepEqual(review, [[[1, 3, 2]], [[2, 2, 2, 1]], [[2, 2, 1]]])
})

test('later elements are known but stay out of the chapter 1 ledger', () => {
  assert.equal(massOf('AgNO3'), 170)
  assert.equal(massOf('ZnSO4'), 161)
  assert.equal(ELEMENTS.length, 7)
})
