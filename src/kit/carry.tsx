import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { smooth, type Vec3 } from './core'

export type CarryAction = 'drip' | 'sprinkle' | 'pour' | 'stir' | 'dip' | 'place'

const TRAVEL = 0.9

function actionLength(action: CarryAction, drops: number) {
  switch (action) {
    case 'drip':
      return 0.2 + (drops > 4 ? 0.12 : 0.22) * (drops - 1) + 0.55
    case 'sprinkle':
      return 1.3
    case 'pour':
      return 2.2
    case 'stir':
      return 1.8
    case 'dip':
      return 1.0
    case 'place':
      return 0.05
  }
}

/**
 * Carries a tool from `from` to `to`, performs the action, and brings it back
 * (except `place`, which leaves it there). `lip` is the tool-local point liquid
 * or solid leaves from; `tilt` is the z rotation used while pouring.
 */
export function Carry({
  from,
  to,
  tool,
  action,
  color = '#cfe3ea',
  surfaceY = 0,
  drops = 3,
  tilt = -1.2,
  lip = [0, 0],
  restRotation = 0,
  streamRadius = 0.13,
  onCommit,
  onFinish,
}: {
  from: Vec3
  to: Vec3
  tool: ReactNode
  action: CarryAction
  color?: string
  surfaceY?: number
  drops?: number
  tilt?: number
  lip?: [number, number]
  restRotation?: number
  streamRadius?: number
  onCommit: () => void
  onFinish: () => void
}) {
  const A = actionLength(action, drops)
  const commitAt = TRAVEL + A - (action === 'place' ? 0 : action === 'drip' ? 0.1 : 0.4)
  const finishAt = action === 'place' ? TRAVEL + A : TRAVEL + A + TRAVEL
  const g = useRef<THREE.Group>(null)
  const stream = useRef<THREE.Mesh>(null)
  const parts = useRef<(THREE.Mesh | null)[]>([])
  const st = useRef({ t: 0, committed: false, finished: false })
  const vFrom = useMemo(() => new THREE.Vector3(...from), [from])
  const vTo = useMemo(() => new THREE.Vector3(...to), [to])
  const p = useMemo(() => new THREE.Vector3(), [])
  const lipW = useMemo(() => new THREE.Vector3(), [])
  const nParts = action === 'drip' ? drops : action === 'sprinkle' ? 9 : 0
  const solid = action === 'sprinkle'

  useFrame((_, dt) => {
    const s = st.current
    if (s.finished) return
    s.t += dt
    const t = s.t
    const local = t - TRAVEL
    const out = smooth(t / TRAVEL)
    const back = action === 'place' ? 0 : smooth((t - TRAVEL - A) / TRAVEL)
    const k = out - back
    p.lerpVectors(vFrom, vTo, k)
    p.y += Math.sin(Math.PI * k) * 4

    let rot = restRotation
    if (action === 'pour' || action === 'sprinkle') {
      const into = smooth(local / 0.4)
      const outOf = smooth((local - (A - 0.4)) / 0.4)
      rot = restRotation + (tilt - restRotation) * (into - outOf)
    }
    if (action === 'stir' && local > 0 && local < A) {
      p.x += Math.cos(local * 10) * 0.9
      p.z += Math.sin(local * 10) * 0.9
    }
    if (action === 'dip' && local > 0 && local < A) p.y -= Math.sin((local / A) * Math.PI) * 3
    const tg = g.current
    if (tg) {
      tg.position.copy(p)
      tg.rotation.z = rot
    }

    const c = Math.cos(rot)
    const sn = Math.sin(rot)
    lipW.set(p.x + lip[0] * c - lip[1] * sn, p.y + lip[0] * sn + lip[1] * c, p.z)

    if (stream.current) {
      const on = action === 'pour' && local > 0.35 && local < A - 0.35
      const len = Math.max(lipW.y - surfaceY, 0.01)
      stream.current.visible = on
      stream.current.scale.set(1, len, 1)
      stream.current.position.set(lipW.x, lipW.y - len / 2, lipW.z)
    }

    parts.current.forEach((m, i) => {
      if (!m) return
      const gap = solid ? 0.09 : drops > 4 ? 0.12 : 0.22
      const d = local - (solid ? 0.3 : 0.2) - i * gap
      const y = lipW.y - 0.2 - 0.5 * 70 * d * d
      m.visible = d > 0 && y > surfaceY
      m.position.set(lipW.x + (solid ? Math.sin(i * 7) * 0.3 : 0), y, lipW.z + (solid ? Math.cos(i * 5) * 0.3 : 0))
    })

    if (t >= commitAt && !s.committed) {
      s.committed = true
      onCommit()
    }
    if (t >= finishAt) {
      s.finished = true
      onFinish()
    }
  })

  return (
    <group>
      <group ref={g} position={from} rotation={[0, 0, restRotation]}>
        {tool}
      </group>
      <mesh ref={stream} visible={false} renderOrder={1}>
        <cylinderGeometry args={[streamRadius, streamRadius, 1, 10]} />
        <meshStandardMaterial color={color} transparent opacity={0.7} roughness={0.1} />
      </mesh>
      {Array.from({ length: nParts }, (_, i) => (
        <mesh key={i} ref={(m) => void (parts.current[i] = m)} visible={false}>
          {solid ? <dodecahedronGeometry args={[0.15]} /> : <sphereGeometry args={[0.22, 12, 8]} />}
          <meshStandardMaterial color={color} transparent={!solid} opacity={solid ? 1 : 0.85} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/** Tool origin that puts its tool-local `lip` at `point` when rotated by `tilt` about z. */
export function originFor(point: Vec3, lip: [number, number], tilt: number): Vec3 {
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  return [point[0] - (lip[0] * c - lip[1] * s), point[1] - (lip[0] * s + lip[1] * c), point[2]]
}
