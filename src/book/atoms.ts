// Elements, everyday substances and atom counting for the book.

export interface Element {
  sym: string
  name: string
  /** watercolour wash used for atoms and jars */
  color: string
  /** relative atomic mass */
  mass: number
  /** drawing radius of the atom, cm */
  r: number
  /** wash is dark enough to need light text on it */
  dark?: boolean
}

export const ELEMENTS: Element[] = [
  { sym: 'H', name: '氢', color: '#f4f1ea', mass: 1, r: 0.42 },
  { sym: 'C', name: '碳', color: '#5b5852', mass: 12, r: 0.7, dark: true },
  { sym: 'O', name: '氧', color: '#d2604f', mass: 16, r: 0.66 },
  { sym: 'Na', name: '钠', color: '#9a82c9', mass: 23, r: 0.95 },
  { sym: 'Cl', name: '氯', color: '#8fb873', mass: 35.5, r: 0.9 },
  { sym: 'Fe', name: '铁', color: '#8d939b', mass: 56, r: 0.85 },
  { sym: 'Cu', name: '铜', color: '#c97d4e', mass: 64, r: 0.85 },
]

/** Elements met after chapter 1; they get jars only in the ledgers that ask for them. */
export const MORE_ELEMENTS: Element[] = [
  { sym: 'N', name: '氮', color: '#7d97c9', mass: 14, r: 0.68 },
  { sym: 'S', name: '硫', color: '#e0c34e', mass: 32, r: 0.88 },
  { sym: 'Zn', name: '锌', color: '#a9b6bf', mass: 65, r: 0.82 },
  { sym: 'Ag', name: '银', color: '#d4d6da', mass: 108, r: 0.9 },
]

export const elementOf = (sym: string) => {
  const e = ELEMENTS.find((x) => x.sym === sym) ?? MORE_ELEMENTS.find((x) => x.sym === sym)
  if (!e) throw new Error(`unknown element ${sym}`)
  return e
}

export interface Thing {
  id: string
  name: string
  formula: string
}

export const THINGS: Thing[] = [
  { id: 'water', name: '水', formula: 'H2O' },
  { id: 'salt', name: '食盐', formula: 'NaCl' },
  { id: 'nail', name: '铁钉', formula: 'Fe' },
  { id: 'wire', name: '铜丝', formula: 'Cu' },
  { id: 'dryice', name: '干冰', formula: 'CO2' },
  { id: 'soda', name: '小苏打', formula: 'NaHCO3' },
  { id: 'oxygen', name: '氧气', formula: 'O2' },
  { id: 'diamond', name: '金刚石', formula: 'C' },
]

export const thingOf = (id: string) => {
  const t = THINGS.find((x) => x.id === id)
  if (!t) throw new Error(`unknown thing ${id}`)
  return t
}

/** Atom counts of a formula without brackets, e.g. NaHCO3 -> {Na:1, H:1, C:1, O:3}. */
export function atomsOf(formula: string): Record<string, number> {
  const out: Record<string, number> = {}
  const re = /([A-Z][a-z]?)(\d*)/g
  let consumed = 0
  for (const m of formula.matchAll(re)) {
    elementOf(m[1])
    out[m[1]] = (out[m[1]] ?? 0) + (m[2] ? Number(m[2]) : 1)
    consumed += m[0].length
  }
  if (consumed !== formula.length) throw new Error(`cannot parse formula ${formula}`)
  return out
}

/** Elements found in the given things. */
export function elementsIn(ids: string[]): Set<string> {
  return new Set(ids.flatMap((id) => Object.keys(atomsOf(thingOf(id).formula))))
}

/** Relative formula mass, e.g. CO2 -> 44. */
export const massOf = (formula: string) =>
  Object.entries(atomsOf(formula)).reduce((m, [sym, n]) => m + elementOf(sym).mass * n, 0)

/** One side of an equation: [coefficient, formula] pairs. */
export type Side = [number, string][]

/** Total atoms on one side of an equation. */
export function sideAtoms(side: Side): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, f] of side) for (const [sym, n] of Object.entries(atomsOf(f))) out[sym] = (out[sym] ?? 0) + k * n
  return out
}

/** Every element has as many atoms on the left as on the right. */
export function balanced(left: Side, right: Side): boolean {
  const l = sideAtoms(left)
  const r = sideAtoms(right)
  const syms = new Set([...Object.keys(l), ...Object.keys(r)])
  return [...syms].every((s) => l[s] === r[s])
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** Coefficients have no common factor, so 2 4 2 4 is not simplest but 1 2 1 2 is. */
export const simplest = (ks: number[]) => ks.reduce(gcd) === 1

export interface Reaction {
  name: string
  left: string[]
  right: string[]
}

/** Chapter 2 demonstration: Na2CO3 + 2HCl -> 2NaCl + H2O + CO2. */
export const SODA_ACID: Reaction = { name: '碳酸钠与盐酸', left: ['Na2CO3', 'HCl'], right: ['NaCl', 'H2O', 'CO2'] }
export const SODA_ACID_KS = [1, 2, 2, 1, 1]

/** Chapter 2 challenge: equations to balance with coefficients 1–9. */
export const TO_BALANCE: Reaction[] = [
  { name: '甲烷燃烧', left: ['CH4', 'O2'], right: ['CO2', 'H2O'] },
  { name: '铁在氯气中燃烧', left: ['Fe', 'Cl2'], right: ['FeCl3'] },
]

/** Pairs a reaction's formulas with coefficients, left species first. */
export function sides(r: Reaction, ks: number[]): [Side, Side] {
  const n = r.left.length
  return [r.left.map((f, i) => [ks[i], f]), r.right.map((f, i) => [ks[n + i], f])]
}

/** Chapter 10 review: one equation from each kind of reaction met in the book. */
export const REVIEW: Reaction[] = [
  { name: '合成氨', left: ['N2', 'H2'], right: ['NH3'] },
  { name: '钠与水', left: ['Na', 'H2O'], right: ['NaOH', 'H2'] },
  { name: '过氧化氢分解', left: ['H2O2'], right: ['H2O', 'O2'] },
]
