// Rule-based reaction engine: a vessel holds a set of species (each tagged with the time it
// appears); actions add species, agitate, pour, filter or evaporate, then rules fire until stable.

export type Species =
  | 'H2O' | 'Na+' | 'Cl-' | 'H+' | 'OH-' | 'SO4^2-' | 'CO3^2-'
  | 'Fe3+' | 'Fe2+' | 'SCN-' | 'Cl2' | 'Fe' | 'Fe(SCN)3' | 'Fe(OH)2'
  | 'Ca2+' | 'Mg2+' | 'Ba2+' | 'sand' | 'BaSO4' | 'Mg(OH)2' | 'CaCO3' | 'BaCO3' | 'CO2' | 'NaCl(s)'
  | 'S2O3^2-' | 'S' | 'H2O2' | 'MnO2' | 'O2'

export type ReagentId =
  | 'water' | 'NaCl' | 'crudeSalt'
  | 'FeCl3' | 'FeSO4' | 'KSCN' | 'NaOH' | 'Cl2water' | 'Fe'
  | 'BaCl2' | 'Na2CO3' | 'HCl'
  | 'Na2S2O3' | 'H2SO4' | 'H2O2' | 'MnO2'

export interface Reagent {
  id: ReagentId
  name: string
  formula: string
  species: Species[]
  /** default mL added per action; 0 for solids */
  dose: number
  color: string
  solid?: boolean
  brownGlass?: boolean
}

const r = (id: ReagentId, name: string, formula: string, species: Species[], dose: number, color: string, extra: Partial<Reagent> = {}): Reagent =>
  ({ id, name, formula, species, dose, color, ...extra })

const CLEAR = '#eef3f5'

export const REAGENTS: Record<ReagentId, Reagent> = {
  water: r('water', '蒸馏水', 'H₂O', ['H2O'], 30, CLEAR),
  NaCl: r('NaCl', '氯化钠', 'NaCl', ['NaCl(s)'], 0, '#f4f4f0', { solid: true }),
  crudeSalt: r('crudeSalt', '粗盐', '粗盐', ['NaCl(s)', 'Ca2+', 'Mg2+', 'SO4^2-', 'sand'], 0, '#cdbf9f', { solid: true }),
  FeCl3: r('FeCl3', '氯化铁溶液', 'FeCl₃', ['Fe3+', 'Cl-'], 2, '#d9902b'),
  FeSO4: r('FeSO4', '硫酸亚铁溶液', 'FeSO₄', ['Fe2+', 'SO4^2-'], 2, '#b9d8a4'),
  KSCN: r('KSCN', '硫氰化钾溶液', 'KSCN', ['SCN-'], 0.3, CLEAR),
  NaOH: r('NaOH', '氢氧化钠溶液', 'NaOH', ['Na+', 'OH-'], 0.6, CLEAR),
  Cl2water: r('Cl2water', '氯水', 'Cl₂', ['Cl2'], 0.3, '#dfe9a8', { brownGlass: true }),
  Fe: r('Fe', '铁粉', 'Fe', ['Fe'], 0, '#4a4c52', { solid: true }),
  BaCl2: r('BaCl2', '氯化钡溶液', 'BaCl₂', ['Ba2+', 'Cl-'], 1, CLEAR),
  Na2CO3: r('Na2CO3', '碳酸钠溶液', 'Na₂CO₃', ['Na+', 'CO3^2-'], 1, CLEAR),
  HCl: r('HCl', '稀盐酸', 'HCl', ['H+', 'Cl-'], 1, CLEAR),
  Na2S2O3: r('Na2S2O3', '硫代硫酸钠溶液', 'Na₂S₂O₃', ['Na+', 'S2O3^2-'], 2, CLEAR),
  H2SO4: r('H2SO4', '稀硫酸', 'H₂SO₄', ['H+', 'SO4^2-'], 2, CLEAR),
  H2O2: r('H2O2', '过氧化氢溶液', 'H₂O₂', ['H2O2'], 3, CLEAR),
  MnO2: r('MnO2', '二氧化锰', 'MnO₂', ['MnO2'], 0, '#26262a', { solid: true }),
}

export interface Vessel {
  /** species -> time (s) it appears; may lie in the future for delayed products */
  species: Partial<Record<Species, number>>
  volume: number
  temp?: 'hot' | 'cold'
}

export interface Rule {
  id: string
  need: Species[]
  /** rule is blocked while any of these are present */
  without?: Species[]
  consume: Species[]
  produce: Species[]
  /** only fires while the vessel is shaken or stirred */
  agitate?: boolean
  /** seconds before the products appear */
  delay?: (v: Vessel) => number
  equation?: string
}

export const RULES: Rule[] = [
  { id: 'dissolve', need: ['NaCl(s)', 'H2O'], consume: ['NaCl(s)'], produce: ['Na+', 'Cl-'], agitate: true },
  { id: 'fe3-reduce', need: ['Fe3+', 'Fe'], consume: ['Fe3+'], produce: ['Fe2+'], agitate: true, equation: '2Fe³⁺ + Fe = 3Fe²⁺' },
  { id: 'fe2-oxidize', need: ['Fe2+', 'Cl2'], consume: ['Fe2+', 'Cl2'], produce: ['Fe3+', 'Cl-'], equation: '2Fe²⁺ + Cl₂ = 2Fe³⁺ + 2Cl⁻' },
  { id: 'fe3-scn', need: ['Fe3+', 'SCN-'], consume: ['SCN-'], produce: ['Fe(SCN)3'], equation: 'Fe³⁺ + 3SCN⁻ ⇌ Fe(SCN)₃' },
  { id: 'fe2-oh', need: ['Fe2+', 'OH-'], consume: ['Fe2+', 'OH-'], produce: ['Fe(OH)2'], equation: 'Fe²⁺ + 2OH⁻ = Fe(OH)₂↓\n4Fe(OH)₂ + O₂ + 2H₂O = 4Fe(OH)₃' },
  { id: 'baso4', need: ['Ba2+', 'SO4^2-'], consume: ['SO4^2-'], produce: ['BaSO4'], equation: 'Ba²⁺ + SO₄²⁻ = BaSO₄↓' },
  { id: 'mgoh2', need: ['Mg2+', 'OH-'], consume: ['Mg2+'], produce: ['Mg(OH)2'], equation: 'Mg²⁺ + 2OH⁻ = Mg(OH)₂↓' },
  { id: 'caco3', need: ['Ca2+', 'CO3^2-'], consume: ['Ca2+'], produce: ['CaCO3'], equation: 'Ca²⁺ + CO₃²⁻ = CaCO₃↓' },
  { id: 'baco3', need: ['Ba2+', 'CO3^2-'], consume: ['Ba2+'], produce: ['BaCO3'], equation: 'Ba²⁺ + CO₃²⁻ = BaCO₃↓' },
  {
    id: 's2o3-acid',
    need: ['S2O3^2-', 'H+'],
    consume: ['S2O3^2-'],
    produce: ['S'],
    delay: (v) => (v.temp === 'hot' ? 3 : v.temp === 'cold' ? 14 : 7),
    equation: 'Na₂S₂O₃ + H₂SO₄ = Na₂SO₄ + SO₂↑ + S↓ + H₂O',
  },
  { id: 'h2o2-mno2', need: ['H2O2', 'MnO2'], consume: [], produce: ['O2'], equation: '2H₂O₂ =(MnO₂)= 2H₂O + O₂↑' },
  { id: 'neutralize', need: ['H+', 'OH-'], consume: ['OH-'], produce: [], equation: 'H⁺ + OH⁻ = H₂O' },
  { id: 'co3-acid', need: ['H+', 'CO3^2-'], consume: ['CO3^2-'], produce: ['CO2'], equation: 'CO₃²⁻ + 2H⁺ = CO₂↑ + H₂O' },
  // ponytail: "add acid dropwise until neutral" is modelled as consuming leftover H+ once nothing else needs it
  { id: 'acid-to-neutral', need: ['H+', 'Na+', 'Cl-'], without: ['OH-', 'CO3^2-', 'S2O3^2-', 'SO4^2-'], consume: ['H+'], produce: [] },
]

export const emptyVessel = (temp?: Vessel['temp']): Vessel => ({ species: {}, volume: 0, ...(temp ? { temp } : {}) })

export type Action = { type: 'add'; reagent: ReagentId; dose?: number } | { type: 'agitate' } | { type: 'none' }

const has = (v: Vessel, s: Species) => v.species[s] !== undefined

function canFire(v: Vessel, r: Rule, agitating: boolean) {
  if (r.agitate && !agitating) return false
  if (!r.need.every((s) => has(v, s))) return false
  if (r.without?.some((s) => has(v, s))) return false
  return r.consume.length > 0 || r.produce.some((s) => !has(v, s))
}

/** Fire rules until nothing changes. Mutates `v`. */
function settle(v: Vessel, now: number, agitating: boolean): Rule[] {
  const fired: Rule[] = []
  // ponytail: first-match fixpoint over a short rule list; fine for dozens of rules
  for (let guard = 0; guard < 30; guard++) {
    const rule = RULES.find((r) => canFire(v, r, agitating))
    if (!rule) break
    const at = now + (rule.delay?.(v) ?? 0)
    for (const s of rule.consume) delete v.species[s]
    for (const s of rule.produce) if (!has(v, s)) v.species[s] = at
    fired.push(rule)
  }
  return fired
}

const clone = (v: Vessel): Vessel => ({ ...v, species: { ...v.species } })

export interface Result {
  vessel: Vessel
  fired: Rule[]
  equations: string[]
}

const result = (vessel: Vessel, fired: Rule[]): Result => ({
  vessel,
  fired,
  equations: fired.flatMap((f) => (f.equation ? [f.equation] : [])),
})

export function apply(vessel: Vessel, action: Action, now: number): Result {
  const v = clone(vessel)
  if (action.type === 'add') {
    const re = REAGENTS[action.reagent]
    const species: Species[] = re.solid ? re.species : [...re.species, 'H2O']
    for (const s of species) if (!has(v, s)) v.species[s] = now
    v.volume += action.dose ?? re.dose
  }
  return result(v, settle(v, now, action.type === 'agitate'))
}

/** Pour all of `from` into `to`; returns the emptied source and the mixed target. */
export function pour(from: Vessel, to: Vessel, now: number): { from: Vessel; to: Result } {
  const v = clone(to)
  for (const [s, t] of Object.entries(from.species) as [Species, number][]) {
    const cur = v.species[s]
    v.species[s] = cur === undefined ? t : Math.min(cur, t)
  }
  v.volume += from.volume
  return { from: { ...emptyVessel(from.temp) }, to: result(v, settle(v, now, false)) }
}

const SOLIDS: Species[] = ['sand', 'BaSO4', 'Mg(OH)2', 'CaCO3', 'BaCO3', 'Fe(OH)2', 'S', 'Fe', 'MnO2', 'NaCl(s)']

/** Filter `src` into `into`: solids stay on the paper, the rest passes through. */
export function filter(src: Vessel, into: Vessel, now: number): { residue: Species[]; filtrate: Result; source: Vessel } {
  const passing: Vessel = clone(src)
  const residue: Species[] = []
  for (const s of SOLIDS) {
    if (has(passing, s)) {
      residue.push(s)
      delete passing.species[s]
    }
  }
  delete passing.species.CO2
  const { to } = pour(passing, into, now)
  return { residue, filtrate: to, source: emptyVessel(src.temp) }
}

/** Boil off the water: dissolved Na+ and Cl- crystallise as NaCl. */
export function evaporate(v: Vessel, now: number): Vessel {
  const out = emptyVessel(v.temp)
  if (has(v, 'Na+') && has(v, 'Cl-')) out.species['NaCl(s)'] = now
  for (const s of SOLIDS) if (has(v, s) && s !== 'NaCl(s)') out.species[s] = v.species[s]
  return out
}

/** Rough pH bucket of a solution, for pH paper. */
export function phOf(v: Vessel): number {
  if (has(v, 'OH-')) return 13
  if (has(v, 'CO3^2-')) return 11
  if (has(v, 'H+')) return 2
  return 7
}

// ---------- appearance ----------

export interface Look {
  color: string
  opacity: number
  /** colour of loose solid grains at the bottom, if any */
  grains: string | null
  /** 0..1 gas evolution */
  bubbles: number
  /** coloured gas filling the space above the liquid */
  gas?: string
  gasOpacity?: number
}

type Kind = 'solution' | 'precipitate' | 'grains' | 'gas'
interface SpeciesLook {
  kind: Kind
  color?: string
  opacity?: number
  timeline?: [number, string][]
  /** seconds for a precipitate to fully develop */
  ramp?: number
  rate?: number
  /** seconds for gas evolution to die away */
  decay?: number
}

const LOOKS: Partial<Record<Species, SpeciesLook>> = {
  'Fe(SCN)3': { kind: 'solution', color: '#a3101c', opacity: 0.9 },
  'Fe3+': { kind: 'solution', color: '#d9902b', opacity: 0.72 },
  'Fe2+': { kind: 'solution', color: '#b9d8a4', opacity: 0.6 },
  Cl2: { kind: 'solution', color: '#dfe9a8', opacity: 0.5 },
  'Fe(OH)2': { kind: 'precipitate', timeline: [[0, '#f1f0e8'], [2.5, '#8e9c78'], [7, '#8b3f1f']] },
  S: { kind: 'precipitate', color: '#e6d26e', ramp: 4 },
  sand: { kind: 'precipitate', color: '#a8916a' },
  BaSO4: { kind: 'precipitate', color: '#f3f2ee' },
  'Mg(OH)2': { kind: 'precipitate', color: '#f3f2ee' },
  CaCO3: { kind: 'precipitate', color: '#f3f2ee' },
  BaCO3: { kind: 'precipitate', color: '#f3f2ee' },
  'NaCl(s)': { kind: 'grains', color: '#fbfbf8' },
  Fe: { kind: 'grains', color: '#3f4147' },
  MnO2: { kind: 'grains', color: '#1f1f22' },
  O2: { kind: 'gas', rate: 1, decay: 40 },
  CO2: { kind: 'gas', rate: 0.9, decay: 5 },
  H2O2: { kind: 'gas', rate: 0.06 },
}

const SOLUTION_ORDER: Species[] = ['Fe(SCN)3', 'Fe3+', 'Fe2+', 'Cl2']
const WATER = { color: '#e8f1f4', opacity: 0.45 }

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
export function mix(a: string, b: string, k: number): string {
  const [x, y] = [hex(a), hex(b)]
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('')
}

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)

function timelineColor(tl: [number, string][], t: number): string {
  let c = tl[0][1]
  for (const [at, col] of tl) if (t >= at) c = col
  return c
}

/** Visible appearance of a vessel's contents at time `now` (s). */
export function look(v: Vessel, now: number): Look {
  const present = (Object.entries(v.species) as [Species, number][]).filter(([, t]) => t <= now)
  const at = (s: Species) => present.find(([p]) => p === s)?.[1]

  const sol = SOLUTION_ORDER.find((s) => at(s) !== undefined)
  let color = sol ? LOOKS[sol]!.color! : WATER.color
  let opacity = sol ? LOOKS[sol]!.opacity! : WATER.opacity

  const ppts = present.filter(([s]) => LOOKS[s]?.kind === 'precipitate')
  if (ppts.length) {
    let pc = ''
    let k = 0
    ppts.forEach(([s, t], i) => {
      const l = LOOKS[s]!
      const c = l.timeline ? timelineColor(l.timeline, now - t) : l.color!
      pc = i === 0 ? c : mix(pc, c, 1 / (i + 1))
      k = Math.max(k, l.ramp ? clamp01((now - t) / l.ramp) : 1)
    })
    color = mix(color, pc, k)
    opacity = opacity + (0.95 - opacity) * k
  }

  const grain = present.find(([s]) => LOOKS[s]?.kind === 'grains')
  let bubbles = 0
  for (const [s, t] of present) {
    const l = LOOKS[s]
    if (l?.kind === 'gas') bubbles += l.rate! * (l.decay ? clamp01(1 - (now - t) / l.decay) : 1)
  }
  return { color, opacity, grains: grain ? LOOKS[grain[0]]!.color! : null, bubbles: Math.min(bubbles, 1) }
}
