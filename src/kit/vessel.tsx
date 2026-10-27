import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Look } from '@/chem/engine'
import { Bubbles, Glass, Grains, clickable, lathe, type Vec3 } from './core'
import { heightFor, profilePoints, surfaceFor, type Shape } from './shapes'

export type Motion = { id: number; kind: 'shake' | 'swirl' | 'invert' }

const MOTION_TIME = { shake: [0.8, 1.4], swirl: [1.0, 1.6], invert: [2.0, 2.6] } as const

/** Interior profile pushed out by `inset`, closed at the axis at height `bottom`. */
function profile(s: Shape, inset: number, bottom: number): [number, number][] {
  return [[0, bottom], ...profilePoints(s).map(([r, y]): [number, number] => [r + inset, y === 0 ? bottom : y])]
}

/** Bends the rim near +x out and up into a pouring spout (the side `originFor` pours from). */
function addSpout(geo: THREE.BufferGeometry, s: Shape) {
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const z = p.getZ(i)
    const a = Math.abs(Math.atan2(z, x))
    const up = (p.getY(i) - (s.height - 1.2)) / 1.2
    if (a > 0.5 || up <= 0) continue
    const w = (1 - a / 0.5) ** 2 * Math.min(up, 1) ** 2
    const r = Math.hypot(x, z)
    const k = (r + 0.45 * w) / r
    p.setXYZ(i, x * k, p.getY(i) + 0.15 * w, z * k)
  }
  // ponytail: the lathe's normals are kept; recomputing them would also smooth the bottom corner into the wall
  return geo
}

/** Glass with an outer and an inner wall, a rolled lip and, for beakers, a spout. */
export function glassGeometry(s: Shape, lip = true) {
  const outer = profile(s, s.t, -s.t)
  const top = s.r(s.height)
  const rim: [number, number][] = lip
    ? [[top + s.t + 0.12, s.height + 0.05], [top + s.t + 0.12, s.height + 0.16], [top, s.height + 0.18]]
    : [[top, s.height]]
  // the inner wall stops at the bottom edge: an inner floor fan shades into spokes, and the outer floor closes it anyway
  const geo = lathe([...outer, ...rim, ...profilePoints(s).reverse()], 48)
  return s.spout ? addSpout(geo, s) : geo
}

const STILL = { color: '#e8f1f4', opacity: 0 }

/**
 * A glass container whose liquid height follows `volume` and whose colour follows `look(now)`.
 * The liquid is clipped by a world-horizontal plane, so it stays level when the vessel tilts.
 */
export function Vessel({
  shape,
  look,
  volume,
  position = [0, 0, 0],
  rotation,
  onClick,
  motion,
  onCommit,
  onFinish,
  pivotY,
  mark,
  children,
  glassOpacity,
  lip = true,
}: {
  shape: Shape
  look: (now: number) => Look
  /** mL, or a function of time for contents that change on their own */
  volume: number | ((now: number) => number)
  position?: Vec3
  rotation?: Vec3
  onClick?: () => void
  motion?: Motion | null
  onCommit?: () => void
  onFinish?: () => void
  pivotY?: number
  /** mL at which to etch a graduation ring */
  mark?: number
  children?: ReactNode
  glassOpacity?: number
  lip?: boolean
}) {
  const glass = useMemo(() => glassGeometry(shape, lip), [shape, lip])
  // just inside the inner wall, so the two never fight
  const liquidGeo = useMemo(() => {
    const geo = lathe(profile(shape, -0.02, 0), 48)
    return shape.spout ? addSpout(geo, shape) : geo
  }, [shape])
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: STILL.color,
        transparent: true,
        opacity: STILL.opacity,
        roughness: 0.2,
        side: THREE.DoubleSide,
        clippingPlanes: [plane],
        depthWrite: false,
      }),
    [plane],
  )
  const gasPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const gasMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0,
        roughness: 0.6,
        side: THREE.DoubleSide,
        clippingPlanes: [gasPlane],
        depthWrite: false,
      }),
    [gasPlane],
  )
  const capMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: STILL.color, transparent: true, opacity: 0, roughness: 0.15, depthWrite: false }),
    [],
  )
  const pY = pivotY ?? shape.height / 2
  const root = useRef<THREE.Group>(null)
  const pivot = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const cap = useRef<THREE.Mesh>(null)
  const volumeAt = (now: number) => (typeof volume === 'function' ? volume(now) : volume)
  const vol = useRef(volumeAt(performance.now() / 1000))
  /** upright liquid height for the eased volume */
  const level = useRef(heightFor(shape, vol.current))
  const surface = useRef({ vol: -1, tilt: -1, h: 0 })
  const lookNow = useRef<Look>({ color: STILL.color, opacity: 0, grains: null, bubbles: 0 })
  const mstate = useRef({ id: null as number | null, t: 0, committed: false, ended: false })
  const target = useMemo(() => new THREE.Color(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(), [])
  const quat = useMemo(() => new THREE.Quaternion(), [])

  useFrame((_, dt) => {
    const now = performance.now() / 1000
    const l = look(now)
    lookNow.current = l
    const k = 1 - Math.exp(-dt * 2.5)
    vol.current += (volumeAt(now) - vol.current) * k
    level.current = heightFor(shape, vol.current)
    const lv = level.current
    target.set(l.color)
    mat.color.lerp(target, k)
    capMat.color.copy(mat.color)
    const op = lv > 0.02 ? l.opacity : 0
    mat.opacity += (op - mat.opacity) * Math.min(k * 2, 1)
    capMat.opacity = mat.opacity

    if (l.gas) gasMat.color.set(l.gas)
    gasMat.opacity += ((l.gas ? (l.gasOpacity ?? 0.3) : 0) - gasMat.opacity) * k

    if (inner.current) {
      // the surface stays level and the volume under it stays the same however the vessel is tilted
      inner.current.getWorldPosition(tmp)
      up.set(0, 1, 0).applyQuaternion(inner.current.getWorldQuaternion(quat).invert())
      const tilt = Math.acos(Math.min(Math.max(up.y, -1), 1))
      const sf = surface.current
      if (Math.abs(sf.vol - vol.current) > 1e-3 || Math.abs(sf.tilt - tilt) > 1e-3) Object.assign(sf, { vol: vol.current, tilt, h: surfaceFor(shape, vol.current, tilt) })
      plane.constant = tmp.y + sf.h
      gasPlane.constant = -(tmp.y + sf.h)
      if (cap.current) setCap(cap.current, shape, sf.h, tilt, up, lv > 0.02)
    }

    // motion
    const s = mstate.current
    const id = motion?.id ?? null
    if (id !== s.id) Object.assign(s, { id, t: 0, committed: false, ended: false })
    const p = pivot.current
    if (p && motion && !s.ended) {
      s.t += dt
      const [commitAt, endAt] = MOTION_TIME[motion.kind]
      const env = Math.sin(Math.min(s.t / endAt, 1) * Math.PI)
      if (motion.kind === 'shake') p.rotation.z = Math.sin(s.t * 28) * 0.14 * env
      if (motion.kind === 'swirl') {
        p.rotation.x = Math.sin(s.t * 12) * 0.08 * env
        p.rotation.z = Math.cos(s.t * 12) * 0.08 * env
      }
      if (motion.kind === 'invert') p.rotation.x = Math.sin(Math.min(s.t / endAt, 1) * Math.PI * 2) ** 2 * Math.PI * 0.9
      if (s.t > commitAt && !s.committed) {
        s.committed = true
        onCommit?.()
      }
      if (s.t > endAt) {
        s.ended = true
        p.rotation.set(0, 0, 0)
        onFinish?.()
      }
    }
  })

  const markY = mark !== undefined ? heightFor(shape, mark) : null

  return (
    <group ref={root} position={position} rotation={rotation}>
      <group position={[0, pY, 0]}>
        <group ref={pivot}>
          <group ref={inner} position={[0, -pY, 0]}>
            <mesh geometry={liquidGeo} material={mat} renderOrder={1} />
            <mesh geometry={liquidGeo} material={gasMat} renderOrder={1} />
            <mesh ref={cap} material={capMat} matrixAutoUpdate={false} renderOrder={1}>
              <circleGeometry args={[1, 40]} />
            </mesh>
            <GrainsFor look={look} shape={shape} />
            <Bubbles
              rate={() => (level.current > 0.3 ? lookNow.current.bubbles : 0)}
              radius={shape.r(Math.min(1, shape.height)) * 0.7}
              top={() => level.current}
            />
            {markY !== null && (
              <mesh position={[0, markY, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[shape.r(markY) + shape.t + 0.01, 0.025, 6, 48]} />
                <meshBasicMaterial color="#2a2f3a" />
              </mesh>
            )}
            <mesh geometry={glass} renderOrder={2} {...clickable(onClick)}>
              <Glass opacity={glassOpacity} />
            </mesh>
            {children}
          </group>
        </group>
      </group>
    </group>
  )
}

const AXIS_X = new THREE.Vector3(1, 0, 0)
const u = new THREE.Vector3()
const b = new THREE.Vector3()
const n = new THREE.Vector3()

/**
 * Places the liquid surface: the plane `h` above the inner bottom, cutting the vessel tilted `tilt` with local up `up`.
 * Where the plane crosses the walls the cut is an ellipse, wider by 1/cos(tilt) down the slope; when it would meet the
 * bottom or the rim it is hidden and the clipped liquid shows its own edge.
 */
function setCap(cap: THREE.Mesh, s: Shape, h: number, tilt: number, up: THREE.Vector3, wet: boolean) {
  const c = Math.cos(tilt)
  const y = c > 0.2 ? h / c : -1
  const r = y > 0 && y < s.height ? s.r(y) - 0.02 : 0
  const reach = r * Math.tan(tilt)
  cap.visible = wet && r > 0 && y - reach > 0 && y + reach < s.height
  if (!cap.visible) return
  n.copy(up)
  // down-slope direction in the surface plane
  u.set(up.x, 0, up.z)
  if (u.lengthSq() < 1e-8) u.copy(AXIS_X)
  u.normalize().addScaledVector(n, -u.dot(n)).normalize()
  b.crossVectors(n, u)
  cap.matrix.makeBasis(u.multiplyScalar(r / c), b.multiplyScalar(r), n)
  cap.matrix.setPosition(0, y - 0.01, 0)
}

/** Grains need React re-renders (count/colour), so they read the look at render time. */
function GrainsFor({ look, shape }: { look: (now: number) => Look; shape: Shape }) {
  const g = look(performance.now() / 1000).grains
  if (!g) return null
  const spread = Math.max(shape.r(0.4) * 0.75, 0.4)
  return <Grains color={g} spread={spread} count={Math.round(14 + spread * 10)} y={0.1} />
}
