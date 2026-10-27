import * as THREE from 'three'
import { POP, POP_GLSL } from './pop.ts'

// Pen strokes for the pop-up drawings, derived from each solid's geometry and drawn as screen-space ribbons:
// - static: points fixed on the object (rims, box edges)
// - side: points on an axis pushed sideways by ±r, perpendicular to the axis and the eye (silhouettes of
//   turned shapes and tubes, recomputed in the shader every frame)
// - ring: a circle that always faces the eye (silhouette of a sphere)
// Widths swell and taper along each stroke, and each stroke is drawn by the pen over a short schedule.

export type Mode = 'static' | 'side' | 'ring'
const MODE: Record<Mode, number> = { static: 0, side: 1, ring: 2 }

export interface Point {
  p: [number, number, number]
  /** axis or tangent for side mode */
  a?: [number, number, number]
  /** sideways offset (side) or radius (ring) */
  o?: number
  /** unit-circle position for ring mode */
  c?: [number, number]
}
export interface Stroke {
  pts: Point[]
  closed?: boolean
  /** width relative to the pen */
  width?: number
  taper?: boolean
}
export interface StrokeSet {
  mode: Mode
  strokes: Stroke[]
}

const circle = (n: number, f: (cos: number, sin: number) => Point): Point[] =>
  Array.from({ length: n }, (_, i) => f(Math.cos((i / n) * Math.PI * 2), Math.sin((i / n) * Math.PI * 2)))

/** Profile corners worth a rim line: ends off the axis, and interior points where the outline turns sharply. */
export function rimIndices(profile: [number, number][], turn = 0.5) {
  const out: number[] = []
  profile.forEach(([r], i) => {
    if (r < 0.05) return
    if (i === 0 || i === profile.length - 1) return void out.push(i)
    const [x0, y0] = profile[i - 1]
    const [x1, y1] = profile[i]
    const [x2, y2] = profile[i + 1]
    const a = Math.atan2(y1 - y0, x1 - x0)
    const b = Math.atan2(y2 - y1, x2 - x1)
    const d = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)))
    if (d > turn) out.push(i)
  })
  return out
}

/** Drops end segments that run flat into the axis: caps, which a silhouette must not cross. A cone's tip stays. */
export function trimCaps(profile: [number, number][]) {
  const cap = (a: [number, number], b: [number, number]) => a[0] < 0.05 && Math.abs(a[1] - b[1]) < 0.25 * Math.abs(a[0] - b[0])
  let lo = 0
  let hi = profile.length
  while (hi - lo > 2 && cap(profile[lo], profile[lo + 1])) lo++
  while (hi - lo > 2 && cap(profile[hi - 1], profile[hi - 2])) hi--
  return profile.slice(lo, hi)
}

/** Silhouettes and rims of a shape turned about the y axis, given its (radius, height) profile. */
export function latheStrokes(profile: [number, number][]): StrokeSet[] {
  const outline = trimCaps(profile)
  const side = (s: number): Stroke => ({ pts: outline.map(([r, y]) => ({ p: [0, y, 0], a: [0, 1, 0], o: s * r })) })
  const rims = rimIndices(profile).map((i): Stroke => {
    const [r, y] = profile[i]
    return { pts: circle(48, (c, s) => ({ p: [r * c, y, r * s] })), closed: true, width: 0.8 }
  })
  return [
    { mode: 'side', strokes: [side(1), side(-1)] },
    { mode: 'static', strokes: rims },
  ]
}

export const sphereStrokes = (r: number): StrokeSet[] => [{ mode: 'ring', strokes: [{ pts: circle(56, (c, s) => ({ p: [0, 0, 0], o: r, c: [c, s] })), closed: true }] }]

/** Both edges of a tube along a path, with tangents. */
export function tubeStrokes(points: THREE.Vector3[], tangents: THREE.Vector3[], r: number): StrokeSet[] {
  const edge = (s: number): Stroke => ({ pts: points.map((p, i) => ({ p: [p.x, p.y, p.z], a: [tangents[i].x, tangents[i].y, tangents[i].z], o: s * r })) })
  return [{ mode: 'side', strokes: [edge(1), edge(-1)] }]
}

/** Creases of a faceted solid, one stroke per edge. */
export function edgeStrokes(g: THREE.BufferGeometry, threshold = 20): StrokeSet[] {
  const e = new THREE.EdgesGeometry(g, threshold).getAttribute('position')
  const strokes: Stroke[] = []
  for (let i = 0; i < e.count; i += 2)
    strokes.push({ pts: [{ p: [e.getX(i), e.getY(i), e.getZ(i)] }, { p: [e.getX(i + 1), e.getY(i + 1), e.getZ(i + 1)] }], taper: false })
  return [{ mode: 'static', strokes }]
}

type Params = Record<string, unknown>

/** The pen strokes that draw a geometry, chosen by its type. */
export function strokesFor(g: THREE.BufferGeometry): StrokeSet[] {
  const p = (g as THREE.BufferGeometry & { parameters?: Params }).parameters ?? {}
  switch (g.type) {
    case 'SphereGeometry': {
      const r = p.radius as number
      const thetaLength = p.thetaLength as number
      if (thetaLength >= Math.PI - 1e-6) return sphereStrokes(r)
      // a cap: draw it as the turned arc it is
      const n = 16
      const t0 = p.thetaStart as number
      return latheStrokes(Array.from({ length: n + 1 }, (_, i) => {
        const t = t0 + (thetaLength * i) / n
        return [r * Math.sin(t), r * Math.cos(t)] as [number, number]
      }).reverse())
    }
    case 'LatheGeometry':
      return latheStrokes((p.points as THREE.Vector2[]).map((v) => [v.x, v.y]))
    case 'CylinderGeometry': {
      const h = (p.height as number) / 2
      return latheStrokes([
        [0, -h],
        [p.radiusBottom as number, -h],
        [p.radiusTop as number, h],
        [0, h],
      ])
    }
    case 'ConeGeometry': {
      const h = (p.height as number) / 2
      return latheStrokes([
        [0, -h],
        [p.radius as number, -h],
        [0, h],
      ])
    }
    case 'TubeGeometry': {
      const path = p.path as THREE.Curve<THREE.Vector3>
      const n = p.tubularSegments as number
      const pts = Array.from({ length: n + 1 }, (_, i) => path.getPointAt(i / n))
      const tan = Array.from({ length: n + 1 }, (_, i) => path.getTangentAt(i / n))
      return tubeStrokes(pts, tan, p.radius as number)
    }
    case 'TorusGeometry': {
      const R = p.radius as number
      const r = p.tube as number
      const ring = (k: number): Stroke => ({ pts: circle(64, (c, s) => ({ p: [k * c, k * s, 0] })), closed: true })
      return [{ mode: 'static', strokes: [ring(R + r), ring(R - r)] }]
    }
    case 'PlaneGeometry':
      return []
    default:
      return edgeStrokes(g)
  }
}

// --- building the ribbon ---

const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
/** Smooth 1D value noise in 0..1. */
const noise = (seed: number, t: number) => {
  const i = Math.floor(t)
  const f = t - i
  const u = f * f * (3 - 2 * f)
  return hash(seed * 17.3 + i) * (1 - u) + hash(seed * 17.3 + i + 1) * u
}

/** Pen pressure along a stroke: a slow swell, and thin ends unless the stroke is closed or untapered. */
export function pressure(seed: number, s: number, len: number, taper: boolean) {
  let w = 0.82 + 0.3 * noise(seed, s / 3) + 0.08 * noise(seed + 9, s / 0.7)
  if (taper && len > 0) {
    const end = Math.min(len * 0.12, 0.6)
    w *= Math.min(1, 0.35 + 0.65 * Math.min(1, s / end)) * Math.min(1, 0.35 + 0.65 * Math.min(1, (len - s) / end))
  }
  return w
}

/** Packs strokes into one indexed ribbon: two vertices per point, with neighbours for screen-space joins. */
export function ribbon(set: StrokeSet, seed = 0) {
  const n = set.strokes.reduce((k, s) => k + s.pts.length + (s.closed ? 1 : 0), 0) * 2
  const f = (k: number) => new Float32Array(n * k)
  const at = { position: f(3), aPrev: f(3), aNext: f(3), aAxis: f(3), aOC: f(3), aPrevOC: f(3), aNextOC: f(3), aSide: f(2), aS: f(1), aLine: f(3) }
  const index: number[] = []
  let v = 0
  set.strokes.forEach((stroke, k) => {
    const pts = stroke.closed ? [...stroke.pts, stroke.pts[0]] : stroke.pts
    // arc length on the base points (side-mode strokes add the offset change too)
    const s = [0]
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]]
      const d = Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2], (b.o ?? 0) - (a.o ?? 0)) + (set.mode === 'ring' ? Math.hypot((b.c?.[0] ?? 0) - (a.c?.[0] ?? 0), (b.c?.[1] ?? 0) - (a.c?.[1] ?? 0)) * (a.o ?? 0) : 0)
      s.push(s[i - 1] + d)
    }
    const len = s[s.length - 1]
    const id = seed * 101 + k
    const t0 = 0.15 + hash(id) * 0.7
    const dur = 0.3 + Math.min(len / 30, 0.6)
    const first = v
    pts.forEach((pt, i) => {
      const prev = pts[i > 0 ? i - 1 : stroke.closed ? pts.length - 2 : 0]
      const next = pts[i < pts.length - 1 ? i + 1 : stroke.closed ? 1 : i]
      const w = (stroke.width ?? 1) * pressure(id, s[i], len, (stroke.taper ?? true) && !stroke.closed)
      for (const side of [-1, 1]) {
        at.position.set(pt.p, v * 3)
        at.aPrev.set(prev.p, v * 3)
        at.aNext.set(next.p, v * 3)
        at.aAxis.set(pt.a ?? [0, 1, 0], v * 3)
        at.aOC.set([pt.o ?? 0, pt.c?.[0] ?? 0, pt.c?.[1] ?? 0], v * 3)
        at.aPrevOC.set([prev.o ?? 0, prev.c?.[0] ?? 0, prev.c?.[1] ?? 0], v * 3)
        at.aNextOC.set([next.o ?? 0, next.c?.[0] ?? 0, next.c?.[1] ?? 0], v * 3)
        at.aSide.set([side, w], v * 2)
        at.aS[v] = s[i]
        at.aLine.set([len, t0, dur], v * 3)
        v++
      }
    })
    for (let i = 0; i < pts.length - 1; i++) {
      const a = first + i * 2
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  })
  const g = new THREE.BufferGeometry()
  for (const [name, arr] of Object.entries(at)) g.setAttribute(name, new THREE.BufferAttribute(arr, arr.length / n))
  g.setIndex(index)
  return g
}

// --- the pen material ---

const VERT = /* glsl */ `
${POP_GLSL}
uniform float uMode; uniform float uWidthPx; uniform float uBias; uniform vec2 uRes; uniform float uDpr; uniform float uDraw;
attribute vec3 aPrev; attribute vec3 aNext; attribute vec3 aAxis;
attribute vec3 aOC; attribute vec3 aPrevOC; attribute vec3 aNextOC;
attribute vec2 aSide; attribute float aS; attribute vec3 aLine;
varying float vD; varying float vHalf; varying float vS; varying float vHead;

vec3 place(vec3 p, vec3 oc) {
  vec3 w = (modelMatrix * vec4(p, 1.0)).xyz;
  if (uMode > 0.5) {
    vec3 eye = normalize(cameraPosition - w);
    float scale = length(modelMatrix[0].xyz);
    if (uMode < 1.5) {
      vec3 ax = normalize(mat3(modelMatrix) * aAxis);
      w += normalize(cross(ax, eye)) * oc.x * scale;
    } else {
      vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), eye));
      vec3 up = cross(eye, right);
      w += (right * oc.y + up * oc.z) * oc.x * scale;
    }
  }
  return popWorld(w);
}
vec4 clip(vec3 w) {
  vec4 v = viewMatrix * vec4(w, 1.0);
  v.xyz += normalize(-v.xyz) * uBias;   // pull towards the eye so lines win against their own surface
  return projectionMatrix * v;
}
vec2 px(vec4 c) { return c.xy / c.w * 0.5 * uRes; }

void main() {
  vec4 cP = clip(place(position, aOC));
  vec2 sP = px(cP), sA = px(clip(place(aPrev, aPrevOC))), sB = px(clip(place(aNext, aNextOC)));
  vec2 t1 = sP - sA, t2 = sB - sP;
  float l1 = length(t1), l2 = length(t2);
  vec2 dir = vec2(1.0, 0.0);
  float miter = 1.0;
  if (l1 > 1e-4 && l2 > 1e-4) {
    vec2 a = t1 / l1, b = t2 / l2;
    dir = dot(a, b) < -0.6 ? b : normalize(a + b);
    miter = 1.0 / max(0.45, abs(dot(vec2(-dir.y, dir.x), vec2(-a.y, a.x))));
  } else if (l2 > 1e-4) dir = t2 / l2;
  else if (l1 > 1e-4) dir = t1 / l1;
  float hw = max(0.5 * uWidthPx * uDpr * aSide.y, 0.5);
  float ext = hw + 1.0;
  vD = aSide.x * ext;
  vHalf = hw;
  cP.xy += vec2(-dir.y, dir.x) * aSide.x * ext * min(miter, 2.5) / (0.5 * uRes) * cP.w;
  vS = aS;
  vHead = clamp((uDraw - aLine.y) / aLine.z, 0.0, 1.0) * aLine.x + step(aLine.y + aLine.z, uDraw);
  gl_Position = cP;
}`

const FRAG = /* glsl */ `
uniform vec3 uInk; uniform float uOpacity;
varying float vD; varying float vHalf; varying float vS; varying float vHead;
void main() {
  if (vS > vHead) discard;   // the pen has not reached this part yet
  float cov = clamp(vHalf + 0.5 - abs(vD), 0.0, 1.0) * uOpacity;
  if (cov < 0.003) discard;
  gl_FragColor = vec4(uInk, cov);
  #include <colorspace_fragment>
}`

export function penMaterial(mode: Mode, widthPx: number, ink: string, opacity = 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...POP,
      uMode: { value: MODE[mode] },
      uWidthPx: { value: widthPx },
      uBias: { value: 0.06 },
      uInk: { value: new THREE.Color(ink) },
      uOpacity: { value: opacity },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  })
}
