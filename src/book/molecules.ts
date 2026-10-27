// Schematic space-filling models: atom centres (cm, before scaling) per formula, laid out to face the reader.

type At = [string, number, number, number]

const BENT = ((104.5 / 2) * Math.PI) / 180
const TET = 0.85 / Math.sqrt(3)

export const MOLECULES: Record<string, At[]> = {
  H2O: [['O', 0, 0, 0], ['H', Math.sin(BENT) * 0.8, Math.cos(BENT) * 0.8, 0], ['H', -Math.sin(BENT) * 0.8, Math.cos(BENT) * 0.8, 0]],
  CO2: [['C', 0, 0, 0], ['O', 1.05, 0, 0], ['O', -1.05, 0, 0]],
  O2: [['O', 0.55, 0, 0], ['O', -0.55, 0, 0]],
  Cl2: [['Cl', 0.75, 0, 0], ['Cl', -0.75, 0, 0]],
  HCl: [['H', -0.66, 0, 0], ['Cl', 0.33, 0, 0]],
  NaCl: [['Na', -0.7, 0, 0], ['Cl', 0.7, 0, 0]],
  CH4: [['C', 0, 0, 0], ['H', TET, TET, TET], ['H', TET, -TET, -TET], ['H', -TET, TET, -TET], ['H', -TET, -TET, TET]],
  Fe: [['Fe', 0, 0, 0]],
  FeCl3: [['Fe', 0, 0, 0], ['Cl', 0, 1.3, 0], ['Cl', 1.13, -0.65, 0], ['Cl', -1.13, -0.65, 0]],
  N2: [['N', 0.55, 0, 0], ['N', -0.55, 0, 0]],
  H2: [['H', 0.35, 0, 0], ['H', -0.35, 0, 0]],
  NH3: [['N', 0, 0.15, 0], ['H', 0.78, -0.3, 0.2], ['H', -0.78, -0.3, 0.2], ['H', 0, -0.3, -0.8]],
  Na: [['Na', 0, 0, 0]],
  NaOH: [['Na', -0.95, 0, 0], ['O', 0.55, 0, 0], ['H', 1.1, 0.45, 0]],
  H2O2: [['O', 0.6, 0, 0], ['O', -0.6, 0, 0], ['H', 1.05, 0.6, 0.3], ['H', -1.05, -0.6, 0.3]],
  NO2: [['N', 0, 0, 0], ['O', 0.95, -0.55, 0], ['O', -0.95, -0.55, 0]],
  NO3: [['N', 0, 0, 0], ['O', 0, 1.05, 0], ['O', 0.91, -0.53, 0], ['O', -0.91, -0.53, 0]],
  N2O4: [['N', 0, 0.6, 0], ['N', 0, -0.6, 0], ['O', 0.95, 1.15, 0], ['O', -0.95, 1.15, 0], ['O', 0.95, -1.15, 0], ['O', -0.95, -1.15, 0]],
  Na2CO3: [['C', 0, 0, 0], ['O', 0, 1, 0], ['O', 0.87, -0.5, 0], ['O', -0.87, -0.5, 0], ['Na', 1.85, -1.05, 0], ['Na', -1.85, -1.05, 0]],
}

export function moleculeOf(formula: string): At[] {
  const m = MOLECULES[formula]
  if (!m) throw new Error(`no model for ${formula}`)
  return m
}
