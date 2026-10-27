// Vessel interiors as radius-by-height functions, with volume <-> liquid height lookup.

export interface Shape {
  /** inner radius at height y (cm) above the inner bottom */
  r: (y: number) => number
  height: number
  /** wall thickness */
  t: number
  /** visual exaggeration: mL are multiplied by this before filling */
  scale: number
  /** cumulative volume (cm³) at y = i * dy */
  table: number[]
  dy: number
  /** a beaker: the rim has a pouring spout at +x */
  spout?: boolean
}

export function makeShape(r: (y: number) => number, height: number, opts: { t?: number; scale?: number; spout?: boolean } = {}): Shape {
  const n = 400
  const dy = height / n
  const table = [0]
  for (let i = 1; i <= n; i++) {
    const y = (i - 0.5) * dy
    table.push(table[i - 1] + Math.PI * r(y) ** 2 * dy)
  }
  return { r, height, t: opts.t ?? 0.12, scale: opts.scale ?? 1, table, dy, spout: opts.spout }
}

/** Liquid height for `mL` of liquid. */
export function heightFor(s: Shape, mL: number): number {
  const v = mL * s.scale
  if (v <= 0) return 0
  const { table, dy } = s
  if (v >= table[table.length - 1]) return s.height
  let i = 1
  while (table[i] < v) i++
  const f = (v - table[i - 1]) / (table[i] - table[i - 1])
  return (i - 1 + f) * dy
}

const round = (R: number) => (y: number) => (y < R ? Math.sqrt(Math.max(R * R - (R - y) ** 2, 0)) : R)

const R_FLASK = 4
const roundFlask = (y: number) => {
  const sphere = Math.sqrt(Math.max(R_FLASK * R_FLASK - (y - R_FLASK) ** 2, 0))
  return y < R_FLASK ? sphere : Math.max(sphere, 0.9)
}

export const SHAPES = {
  testTube: makeShape(round(0.95), 16, { scale: 2.5 }),
  beaker100: makeShape(() => 2.6, 7.2, { spout: true }),
  beaker250: makeShape(() => 3.4, 9, { spout: true }),
  beaker400: makeShape(() => 4.1, 10, { spout: true }),
  conical250: makeShape((y) => (y < 9 ? 4.2 - 2.6 * Math.pow(y / 9, 1.3) : 1.6), 14.5, { scale: 3 }),
  // bulb: sphere of radius 2.85 centred 2.35 above a flat bottom, then a 0.7 cm neck
  volumetric100: makeShape((y) => {
    const Rb = 2.85
    const c = 2.35
    const rb = Math.sqrt(Math.max(Rb * Rb - (y - c) ** 2, 0))
    return y < c ? rb : Math.max(rb, 0.7)
  }, 17),
  dish: makeShape((y) => Math.sqrt(Math.max(4.5 * 4.5 - (4.5 - y) ** 2, 0)), 2),
  round250: makeShape(roundFlask, 13),
  /** the same flask hanging upside down: the neck is at y = 0 */
  roundInverted: makeShape((y) => roundFlask(13 - y), 13),
  gasBottle: makeShape(() => 2.4, 9),
  gasJar: makeShape(() => 2.8, 11),
  // separatory funnel body: pear shape from the stem up to a narrow neck
  sepFunnel: makeShape((y) => (y < 4.5 ? 2.6 * Math.sqrt(y / 4.5) : y < 7 ? 2.6 - ((y - 4.5) / 2.5) * 1.8 : 0.8), 8),
}

/** Interior profile [r, y] from the bottom to the rim, with points only where the wall curves (Douglas–Peucker, 0.01 cm). */
export function profilePoints(s: Shape): [number, number][] {
  const n = 160
  const pts = Array.from({ length: n + 1 }, (_, i): [number, number] => [s.r((i / n) * s.height), (i / n) * s.height])
  const keep = new Set([0, n])
  const split = (a: number, b: number) => {
    const [ax, ay] = pts[a]
    const [bx, by] = pts[b]
    const len = Math.hypot(bx - ax, by - ay)
    let far = -1
    let dist = 0.01
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len
      if (d > dist) {
        far = i
        dist = d
      }
    }
    if (far < 0) return
    keep.add(far)
    split(a, far)
    split(far, b)
  }
  split(0, n)
  return [...keep].sort((a, b) => a - b).map((i) => pts[i])
}

/** Volume (cm³) below a horizontal plane `h` above the inner bottom centre, with the vessel's axis tilted `tilt` rad from upright. */
export function volumeUnder(s: Shape, h: number, tilt: number): number {
  const n = 200
  const dy = s.height / n
  const c = Math.cos(tilt)
  const sn = Math.sin(tilt)
  let v = 0
  for (let i = 0; i < n; i++) {
    const y = (i + 0.5) * dy
    const r = s.r(y)
    // the plane cuts this slice along a chord at distance d from the axis, towards the low side
    const d = sn < 1e-6 ? (y * c < h ? Infinity : -Infinity) : (h - y * c) / sn
    if (d >= r) v += Math.PI * r * r * dy
    else if (d > -r) v += (r * r * Math.acos(-d / r) + d * Math.sqrt(r * r - d * d)) * dy
  }
  return v
}

/** Height of the liquid surface above the inner bottom centre for `mL` in a vessel tilted `tilt` rad, keeping the volume. */
export function surfaceFor(s: Shape, mL: number, tilt: number): number {
  if (tilt < 1e-4) return heightFor(s, mL)
  const v = mL * s.scale
  const c = Math.cos(tilt)
  const sn = Math.sin(tilt)
  const rMax = Math.max(...Array.from({ length: 41 }, (_, i) => s.r((i / 40) * s.height)))
  let lo = Math.min(0, s.height * c) - rMax * sn
  let hi = Math.max(0, s.height * c) + rMax * sn
  if (v <= 0) return lo
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (volumeUnder(s, mid, tilt) < v) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
