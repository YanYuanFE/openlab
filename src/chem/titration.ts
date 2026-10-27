// Strong acid titrated with strong base: pH curve and phenolphthalein colour.

export const TITRATION = {
  cBase: 0.1,
  vAcid: 20,
  cAcid: 0.11,
  /** burette reading before titrating, mL */
  initial: 0.5,
  /** volume of one drop, mL */
  drop: 0.05,
}

export const equivalence = (TITRATION.cAcid * TITRATION.vAcid) / TITRATION.cBase

export const round2 = (x: number) => Math.round(x * 100) / 100

/** pH after adding `v` mL of base. */
export function pH(v: number): number {
  const { cAcid, vAcid, cBase } = TITRATION
  const nH = (cAcid * vAcid) / 1000
  const nOH = (cBase * v) / 1000
  const litres = (vAcid + v) / 1000
  const diff = nH - nOH
  if (Math.abs(diff) < 1e-10) return 7
  return diff > 0 ? -Math.log10(diff / litres) : 14 + Math.log10(-diff / litres)
}

export type Endpoint = 'before' | 'endpoint' | 'over'

/** Pale pink that persists = endpoint; deeper pink = overshot. */
export function endpointState(v: number): Endpoint {
  const p = pH(v)
  if (p < 8.2) return 'before'
  return p <= 10.5 ? 'endpoint' : 'over'
}

export function phenolphthalein(p: number): { color: string; opacity: number } {
  if (p < 8.2) return { color: '#e8f1f4', opacity: 0.45 }
  if (p < 10.5) return { color: '#f4b6cf', opacity: 0.6 }
  if (p < 11.5) return { color: '#e57aaa', opacity: 0.75 }
  return { color: '#d03a83', opacity: 0.85 }
}
