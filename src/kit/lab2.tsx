import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Look } from '@/chem/engine'
import { Glass, Tag, clickable, darkMetal, lathe, metal, rand, useCanvasTexture, type Vec3 } from './core'
import { SHAPES, heightFor } from './shapes'
import { Vessel } from './vessel'

// ---------- glassware for gas experiments ----------

/** Bent glass tube through the given points; `flow` tints it while gas passes. */
export function GlassTube({ points, flow }: { points: Vec3[]; flow?: () => string | null }) {
  const geo = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i < points.length - 1; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i]), new THREE.Vector3(...points[i + 1])))
    return { outer: new THREE.TubeGeometry(path, points.length * 12, 0.2, 10), inner: new THREE.TubeGeometry(path, points.length * 12, 0.12, 8) }
    // keyed by the coordinates, so a fresh array with the same points reuses the tubes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.join(';')])
  useEffect(() => () => (geo.outer.dispose(), geo.inner.dispose()), [geo])
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (!mat.current) return
    const c = flow?.() ?? null
    mat.current.opacity = c ? 0.55 : 0
    if (c) mat.current.color.set(c)
  })
  return (
    <group>
      <mesh geometry={geo.outer} renderOrder={2}>
        <Glass opacity={0.35} />
      </mesh>
      <mesh geometry={geo.inner} renderOrder={1}>
        <meshStandardMaterial ref={mat} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Rubber stopper whose bottom sits at y. */
export function Stopper({ y, r }: { y: number; r: number }) {
  return (
    <mesh position={[0, y + 0.7, 0]} castShadow>
      <cylinderGeometry args={[r * 1.12, r * 0.92, 1.4, 24]} />
      <meshStandardMaterial color="#5a3b31" roughness={0.8} />
    </mesh>
  )
}

/**
 * Separatory funnel. Origin at the stem tip; the body sits on a 4 cm stem.
 * `open` turns the stopcock and shows a dripping stream.
 */
export function SeparatoryFunnel({ volume, look, open, onClick }: {
  volume: (now: number) => number
  look: (now: number) => Look
  /** stopcock open (also shows the drip) */
  open: boolean
  onClick?: () => void
}) {
  const drop = useRef<THREE.Mesh>(null)
  const handle = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (handle.current) handle.current.rotation.z = open ? 0 : Math.PI / 2
    if (!drop.current) return
    const t = (clock.elapsedTime * 2.4) % 1
    drop.current.visible = open && volume(performance.now() / 1000) > 0.05
    drop.current.position.y = -0.3 - t * t * 3
  })
  const color = look(0).color
  return (
    <group {...clickable(onClick)}>
      <mesh position={[0, 1.6, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.2, 0.16, 3.2, 10]} />
        <Glass opacity={0.45} />
      </mesh>
      <mesh position={[0, 3.3, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.8, 12]} />
        <Glass opacity={0.6} />
      </mesh>
      <mesh ref={handle} position={[0.9, 3.3, 0]}>
        <boxGeometry args={[0.3, 1.5, 0.3]} />
        <meshStandardMaterial color="#e9e6dc" roughness={0.5} />
      </mesh>
      <Vessel shape={SHAPES.sepFunnel} position={[0, 4, 0]} volume={volume} look={look} />
      <mesh position={[0, 12.6, 0]}>
        <cylinderGeometry args={[0.95, 0.75, 1, 16]} />
        <Glass opacity={0.6} />
      </mesh>
      <mesh ref={drop} visible={false}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color={color} transparent opacity={0.85} />
      </mesh>
    </group>
  )
}

/** Gas washing bottle: long inlet tube to the bottom, short outlet. Ports are 2 cm above the stopper. */
export const WASHER = { top: SHAPES.gasBottle.height, inX: -0.9, outX: 0.9, portY: SHAPES.gasBottle.height + 2 }
export function GasWasher({ position, volume, look, label, onClick }: { position: Vec3; volume: number; look: (now: number) => Look; label: string; onClick?: () => void }) {
  return (
    <group position={position}>
      <Vessel shape={SHAPES.gasBottle} volume={volume} look={look} onClick={onClick}>
        <Stopper y={WASHER.top - 0.6} r={2.4} />
        <GlassTube points={[[WASHER.inX, WASHER.portY, 0], [WASHER.inX, 0.8, 0]]} />
        <GlassTube points={[[WASHER.outX, WASHER.portY, 0], [WASHER.outX, WASHER.top - 1.2, 0]]} />
      </Vessel>
      <Tag text={label} position={[0, 1.4, 2.7]} width={4.4} />
    </group>
  )
}

export function ClayGauze({ y, size = 7 }: { y: number; size?: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow>
        <boxGeometry args={[size, 0.12, size]} />
        <meshStandardMaterial color="#8f9296" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[size * 0.32, 32]} />
        <meshStandardMaterial color="#e8e2d6" roughness={1} />
      </mesh>
    </group>
  )
}

// ---------- electrical ----------

export const SUPPLY_TERMINALS: [Vec3, Vec3] = [[-2.4, 6.4, 1.2], [2.4, 6.4, 1.2]]
export function PowerSupply({ position, on, onClick }: { position: Vec3; on: boolean; onClick?: () => void }) {
  const face = useCanvasTexture(
    512,
    256,
    (g) => {
      g.fillStyle = '#2f3846'
      g.fillRect(0, 0, 512, 256)
      g.fillStyle = '#e8edf2'
      g.font = '600 40px "PingFang SC", sans-serif'
      g.fillText('学生电源', 28, 64)
      g.fillStyle = '#10151c'
      g.fillRect(280, 30, 200, 80)
      g.font = '700 30px sans-serif'
      g.fillStyle = '#9aa6b2'
      g.fillText('直流 DC', 28, 200)
    },
    [],
  )
  const led = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (led.current) led.current.color.set(on ? '#5cff8a' : '#2a3a2f')
  })
  return (
    <group position={position} {...clickable(onClick)}>
      <mesh position={[0, 3, 0]} castShadow>
        <boxGeometry args={[10, 6, 6]} />
        <meshStandardMaterial color="#45505f" roughness={0.6} />
      </mesh>
      <mesh position={[0, 3, 3.01]}>
        <planeGeometry args={[9.6, 4.8]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      <mesh position={[2.3, 3.95, 3.03]}>
        <planeGeometry args={[3.2, 1.2]} />
        <meshBasicMaterial ref={led} color="#2a3a2f" toneMapped={false} />
      </mesh>
      {on && <Tag text="6 V" position={[2.3, 3.95, 3.1]} width={1.8} dark />}
      {SUPPLY_TERMINALS.map((t, i) => (
        <mesh key={i} position={t}>
          <cylinderGeometry args={[0.45, 0.45, 0.8, 16]} />
          <meshStandardMaterial color={i ? '#c0262d' : '#1f2430'} roughness={0.4} />
        </mesh>
      ))}
      <Tag text="−" position={[-2.4, 7.6, 1.2]} width={1} dark />
      <Tag text="+" position={[2.4, 7.6, 1.2]} width={1} />
    </group>
  )
}

/** Graphite rod with its bottom at the origin; `copper()` (0..1) grows a copper coat on the lower half. */
export function CarbonRod({ copper, label }: { copper?: () => number; label: string }) {
  const coat = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!coat.current) return
    const k = copper?.() ?? 0
    coat.current.visible = k > 0.01
    ;(coat.current.material as THREE.MeshStandardMaterial).opacity = Math.min(k * 1.2, 1)
    coat.current.scale.set(1 + k * 0.25, 1, 1 + k * 0.25)
  })
  return (
    <group>
      <mesh position={[0, 6, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 12, 16]} />
        <meshStandardMaterial color="#2b2d31" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh ref={coat} position={[0, 2.4, 0]} visible={false}>
        <cylinderGeometry args={[0.37, 0.37, 4.6, 16]} />
        <meshStandardMaterial color="#d2662f" metalness={0.35} roughness={0.5} emissive="#5a1e05" transparent opacity={0} />
      </mesh>
      <mesh position={[0, 12.2, 0]}>
        <boxGeometry args={[1, 0.8, 0.6]} />
        {darkMetal}
      </mesh>
      <Tag text={label} position={[0, 13.5, 0]} width={2.6} dark />
    </group>
  )
}

// ---------- sodium ----------

export function Tweezers({ holding }: { holding?: boolean }) {
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.18, 4, 0]} rotation={[0, 0, s * 0.04]} castShadow>
          <boxGeometry args={[0.16, 8, 0.4]} />
          {metal}
        </mesh>
      ))}
      {holding && <SodiumPiece size={0.6} />}
    </group>
  )
}

export function Knife() {
  return (
    <group>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[4.5, 0.08, 1.1]} />
        {metal}
      </mesh>
      <mesh position={[-3.6, 0.15, 0]} castShadow>
        <boxGeometry args={[3, 0.3, 0.9]} />
        <meshStandardMaterial color="#3b2f2a" roughness={0.7} />
      </mesh>
    </group>
  )
}

/** Sodium lump: dull grey crust, or silvery when freshly cut. */
export function SodiumPiece({ size, fresh = false }: { size: number; fresh?: boolean }) {
  return (
    <mesh position={[0, size / 2, 0]} rotation={[0.2, 0.6, 0.1]} castShadow>
      <boxGeometry args={[size, size * 0.8, size]} />
      <meshStandardMaterial color={fresh ? '#e8ecef' : '#9aa0a3'} metalness={fresh ? 0.9 : 0.3} roughness={fresh ? 0.15 : 0.7} />
    </mesh>
  )
}

/** Wide-mouth jar of kerosene with sodium lumps at the bottom. */
export function KeroseneJar({ position, onClick }: { position: Vec3; onClick?: () => void }) {
  const kerosene = { color: '#efe2b0', opacity: 0.5, grains: null, bubbles: 0 }
  return (
    <group position={position}>
      <Vessel shape={SHAPES.beaker100} volume={90} look={() => kerosene} onClick={onClick}>
        {[0, 1, 2].map((i) => (
          <group key={i} position={[(i - 1) * 1.1, 0.05, rand(i) - 0.5]}>
            <SodiumPiece size={0.9} />
          </group>
        ))}
      </Vessel>
      <Tag text="钠 · 煤油中" position={[0, 1.2, 3]} width={4.4} />
    </group>
  )
}

// ---------- thermite ----------

/** Paper cone funnel (two layers, wet with water underneath); origin at the tip. */
export function PaperCone({ fill, burnt, onClick }: { fill: string | null; burnt: () => boolean; onClick?: () => void }) {
  const cone = useMemo(() => lathe([[0.25, 0], [3.4, 5]], 32), [])
  const heap = useMemo(() => lathe([[0.2, 0.3], [2.2, 3.3], [1.6, 3.6], [0, 3.8]], 32), [])
  const paper = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f3efe6', side: THREE.DoubleSide, roughness: 0.95 }), [])
  const heapRef = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const b = burnt()
    paper.color.set(b ? '#3a2e26' : '#f3efe6')
    if (heapRef.current) heapRef.current.visible = !!fill && !b
  })
  return (
    <group {...clickable(onClick)}>
      <mesh geometry={cone} material={paper} castShadow />
      <mesh ref={heapRef} geometry={heap} visible={!!fill}>
        <meshStandardMaterial color={fill ?? '#000000'} roughness={1} />
      </mesh>
    </group>
  )
}

export function MgStrip({ burning }: { burning?: () => number }) {
  const glow = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!glow.current) return
    const k = burning?.() ?? 0
    glow.current.visible = k > 0
    glow.current.scale.setScalar(0.6 + k * 0.8 + Math.sin(clock.elapsedTime * 40) * 0.08)
  })
  return (
    <group>
      <mesh position={[0, 3, 0]} castShadow>
        <boxGeometry args={[0.35, 6, 0.06]} />
        <meshStandardMaterial color="#c8ccd0" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh ref={glow} position={[0, 6, 0]} visible={false}>
        <sphereGeometry args={[0.8, 16, 12]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Shower of sparks from the origin while `intensity()` > 0. */
export function Sparks({ intensity, count = 140, spread = 7, color = '#ffcf6b' }: { intensity: () => number; count?: number; spread?: number; color?: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const m = useMemo(() => new THREE.Matrix4(), [])
  useFrame(({ clock }) => {
    const im = mesh.current
    if (!im) return
    const k = intensity()
    const t = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const life = 0.9 + rand(i) * 0.6
      const age = (t + rand(i + 7) * life) % life
      const a = rand(i + 13) * Math.PI * 2
      const up = 4 + rand(i + 21) * 9
      const out = (0.3 + rand(i + 31)) * spread
      const x = Math.cos(a) * out * age
      const z = Math.sin(a) * out * age
      const y = up * age - 0.5 * 20 * age * age
      const s = k > 0 && i < count * k ? 0.15 * (1 - age / life) + 0.04 : 0
      m.makeScale(s, s, s).setPosition(x, y, z)
      im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
    if (light.current) light.current.intensity = k * (600 + Math.sin(t * 50) * 200)
  })
  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
      <pointLight ref={light} color="#ffd9a0" intensity={0} distance={60} />
    </group>
  )
}

/** Molten iron bead that glows white-orange and cools to dark grey over `cool` seconds after `since`. */
export function GlowBead({ since, cool = 10, size = 0.9 }: { since: () => number | null; cool?: number; size?: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a3a3c', emissive: '#ff8a2a', emissiveIntensity: 0, metalness: 0.6, roughness: 0.4 }), [])
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const s = since()
    if (ref.current) ref.current.visible = s !== null
    if (s === null) return
    const k = Math.min(Math.max((performance.now() / 1000 - s) / cool, 0), 1)
    mat.emissiveIntensity = 3 * (1 - k)
    mat.emissive.set(k < 0.3 ? '#ffd27a' : '#ff6a1a')
  })
  return (
    <mesh ref={ref} material={mat} scale={[1, 0.6, 1]} visible={false}>
      <sphereGeometry args={[size, 20, 14]} />
    </mesh>
  )
}

// ---------- fountain & smoke ----------

/** Jet of liquid rising from the origin to `height`, splashing back down. */
export function Jet({ height, color, active }: { height: number; color: string; active: () => boolean }) {
  const col = useRef<THREE.Mesh>(null)
  const drops = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const on = active()
    const t = clock.elapsedTime
    if (col.current) {
      col.current.visible = on
      col.current.scale.set(1 + Math.sin(t * 30) * 0.15, 1, 1)
    }
    drops.current.forEach((d, i) => {
      if (!d) return
      const age = (t * 1.3 + i / 12) % 1
      const a = (i / 12) * Math.PI * 2
      d.visible = on
      d.position.set(Math.cos(a) * age * 2.2, height - age * age * 4, Math.sin(a) * age * 2.2)
    })
  })
  return (
    <group>
      <mesh ref={col} position={[0, height / 2, 0]} visible={false} renderOrder={1}>
        <cylinderGeometry args={[0.16, 0.2, height, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.85} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} ref={(m) => void (drops.current[i] = m)} visible={false}>
          <sphereGeometry args={[0.18, 8, 6]} />
          <meshStandardMaterial color={color} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  )
}

export function Smoke({ active, color = '#1d1d1f' }: { active: () => boolean; color?: string }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const on = active()
    refs.current.forEach((m, i) => {
      if (!m) return
      const t = (clock.elapsedTime * 0.5 + i / 10) % 1
      m.visible = on
      m.position.set(Math.sin(i * 1.7 + t * 3) * t * 1.5, 2 + t * 9, Math.cos(i * 2.3) * t)
      m.scale.setScalar(0.5 + t * 1.8)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t)
    })
  })
  return (
    <group>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)} visible={false}>
          <sphereGeometry args={[0.7, 10, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Height of liquid in a shape, for placing things on its surface. */
export const surfaceOf = (shape: keyof typeof SHAPES, mL: number) => heightFor(SHAPES[shape], mL)

