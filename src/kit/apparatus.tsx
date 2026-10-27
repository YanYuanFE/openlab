import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Reagent } from '@/chem/engine'
import {
  Flame,
  Passthrough,
  Glass,
  Grains,
  Tag,
  WrapLabel,
  clickable,
  darkMetal,
  lathe,
  metal,
  rand,
  useCanvasTexture,
  useEased,
  type Vec3,
} from './core'

export const LIFT = 12

// ---------- hand tools ----------

/** Dropper with its tip at the origin. */
export function Dropper({ color }: { color: string }) {
  const bulb = useMemo(
    () => lathe([[0, 0], [0.62, 0], [0.7, 0.4], [0.72, 1.5], [0.6, 2.2], [0.3, 2.5], [0, 2.55]]),
    [],
  )
  return (
    <group>
      <mesh position={[0, 3.7, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.22, 0.14, 7.4, 16]} />
        <Glass />
      </mesh>
      <mesh position={[0, 1.2, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.14, 0.1, 2.4, 12]} />
        <meshStandardMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 7.85, 0]} castShadow>
        <cylinderGeometry args={[0.95, 0.85, 0.9, 28]} />
        <meshStandardMaterial color="#dfe6e8" roughness={0.6} />
      </mesh>
      <mesh geometry={bulb} position={[0, 8.3, 0]} castShadow>
        <meshStandardMaterial color="#a8362a" roughness={0.55} />
      </mesh>
    </group>
  )
}

/** Plain rubber-bulb dropper (胶头滴管) with its tip at the origin. */
export function BulbDropper() {
  return (
    <group>
      <mesh position={[0, 3, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.25, 0.12, 6, 16]} />
        <Glass />
      </mesh>
      <mesh position={[0, 7, 0]} castShadow>
        <capsuleGeometry args={[0.55, 1.6, 6, 16]} />
        <meshStandardMaterial color="#a8362a" roughness={0.55} />
      </mesh>
    </group>
  )
}

/** Steel spatula with the scoop at the origin. */
export function Spatula({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.8, 1.4, 0.12]} />
        {metal}
      </mesh>
      <mesh position={[0, 6, 0]} castShadow>
        <boxGeometry args={[0.32, 9.2, 0.1]} />
        {metal}
      </mesh>
      <group position={[0, 0.5, 0.1]}>
        <Grains color={color} count={6} spread={0.25} y={0} />
      </group>
    </group>
  )
}

/** Glass rod with its lower end at the origin. */
export function GlassRod() {
  return (
    <mesh position={[0, 7.5, 0]} renderOrder={2} castShadow>
      <cylinderGeometry args={[0.17, 0.17, 15, 12]} />
      <Glass opacity={0.45} />
    </mesh>
  )
}

/** Wash bottle (洗瓶); nozzle tip at WASH_TIP in local space. */
export const WASH_TIP: [number, number] = [3.4, 12.1]
export function WashBottle() {
  const body = useMemo(() => lathe([[0, 0], [2.2, 0], [2.35, 0.2], [2.35, 7.6], [1.9, 8.6], [1.2, 9.0]]), [])
  const nozzle = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 9.8, 0),
          new THREE.Vector3(0, 11.6, 0),
          new THREE.Vector3(0.8, 12.6, 0),
          new THREE.Vector3(2.6, 12.7, 0),
          new THREE.Vector3(3.4, 12.1, 0),
        ]),
        32,
        0.14,
        8,
      ),
    [],
  )
  return (
    <group>
      <mesh geometry={body} castShadow>
        <meshStandardMaterial color="#f3f5f2" transparent opacity={0.9} roughness={0.5} />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <cylinderGeometry args={[2.1, 2.1, 6.6, 28]} />
        <meshStandardMaterial color="#d8ebf2" transparent opacity={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0, 9.4, 0]} castShadow>
        <cylinderGeometry args={[1.3, 1.3, 0.9, 24]} />
        <meshStandardMaterial color="#3b7fc4" roughness={0.5} />
      </mesh>
      <mesh geometry={nozzle}>
        <meshStandardMaterial color="#e9ecee" roughness={0.4} />
      </mesh>
      <WrapLabel title="H₂O" sub="蒸馏水" r={2.35} y={4.6} />
    </group>
  )
}

export function PhStrip({ color }: { color: string }) {
  return (
    <mesh position={[0, 2.2, 0]} castShadow>
      <boxGeometry args={[0.8, 4.4, 0.05]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  )
}

/** Weighing paper carrying a small heap of solid. */
export function WeighPaper({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[4.4, 0.04, 4.4]} />
        <meshStandardMaterial color="#fbfaf6" roughness={0.9} />
      </mesh>
      <Grains color={color} count={26} spread={0.9} y={0.1} size={0.16} seed={3} />
    </group>
  )
}

// ---------- reagent containers ----------

export function DropperBottle({ reagent, position, held, hidden, onClick }: {
  reagent: Reagent
  position: Vec3
  held: boolean
  hidden: boolean
  onClick?: () => void
}) {
  const body = useMemo(
    () =>
      lathe([[0, 0], [2.1, 0], [2.25, 0.15], [2.25, 6.2], [2.0, 7.0], [1.4, 7.5], [1.0, 7.7], [1.0, 8.3], [1.1, 8.35], [1.1, 8.45], [0.9, 8.5]]),
    [],
  )
  const tool = useEased([0, held ? LIFT : 0.9, 0])
  return (
    <group position={position} {...clickable(onClick)}>
      <mesh position={[0, 2.25, 0]} renderOrder={1}>
        <cylinderGeometry args={[2.05, 2.05, 4.2, 32]} />
        <meshStandardMaterial color={reagent.color} transparent opacity={0.85} roughness={0.2} />
      </mesh>
      <mesh geometry={body} renderOrder={2} castShadow>
        <Glass brown={reagent.brownGlass} />
      </mesh>
      <WrapLabel title={reagent.formula} sub={reagent.name} r={2.25} y={4.4} />
      <group ref={tool} position={[0, 0.9, 0]} visible={!hidden}>
        <Passthrough active={held}>
          <Dropper color={reagent.color} />
        </Passthrough>
      </group>
    </group>
  )
}

export function PowderJar({ reagent, position, held, hidden, onClick }: {
  reagent: Reagent
  position: Vec3
  held: boolean
  hidden: boolean
  onClick?: () => void
}) {
  const body = useMemo(
    () => lathe([[0, 0], [2.55, 0], [2.7, 0.15], [2.7, 5.0], [2.4, 5.6], [1.9, 5.8], [1.9, 6.6], [2.0, 6.65], [2.0, 6.8], [1.8, 6.85]]),
    [],
  )
  const tool = useEased([0.4, held ? LIFT : 1.8, 0])
  return (
    <group position={position} {...clickable(onClick)}>
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 2.6, 32]} />
        <meshStandardMaterial color={reagent.color} roughness={1} />
      </mesh>
      <mesh geometry={body} renderOrder={2} castShadow>
        <Glass />
      </mesh>
      <WrapLabel title={reagent.formula} sub={reagent.name} r={2.7} y={3.9} />
      <group ref={tool} position={[0.4, 1.8, 0]} rotation={[0, 0, -0.22]} visible={!hidden}>
        <Passthrough active={held}>
          <Spatula color={reagent.color} />
        </Passthrough>
      </group>
    </group>
  )
}

// ---------- fixtures ----------

export function Rack({ xs, z, labels }: { xs: number[]; z: number; labels?: string[] }) {
  const wood = <meshStandardMaterial color="#c99a6b" roughness={0.7} />
  const width = xs[xs.length - 1] - xs[0] + 9
  const cx = (xs[0] + xs[xs.length - 1]) / 2
  return (
    <group position={[cx, 0, z]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[width, 1, 6]} />
        {wood}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (width - 1)) / 2, 5.5, 0]} castShadow>
          <boxGeometry args={[1, 10, 6]} />
          {wood}
        </mesh>
      ))}
      <mesh position={[0, 10, 0]} castShadow>
        <boxGeometry args={[width, 0.8, 6]} />
        {wood}
      </mesh>
      {xs.map((x, i) => (
        <group key={i}>
          <mesh position={[x - cx, 10.41, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.2, 1.5, 32]} />
            <meshStandardMaterial color="#8d6640" roughness={0.8} />
          </mesh>
          <Tag text={labels?.[i] ?? String(i + 1)} position={[x - cx, 10, 3.05]} width={1.6} dark />
        </group>
      ))}
    </group>
  )
}

/** Iron stand: base plate with a rod at the back; children are positioned in stand space. */
export function IronStand({ position, height = 30, children }: { position: Vec3; height?: number; children?: ReactNode }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.4, -1]} castShadow receiveShadow>
        <boxGeometry args={[9, 0.8, 13]} />
        <meshStandardMaterial color="#6b7380" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, height / 2, -6]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, height, 12]} />
        {metal}
      </mesh>
      {children}
    </group>
  )
}

/** Clamp arm from the stand rod (at z = -6) to a point above the base. */
export function ClampArm({ y, z = 0, ring }: { y: number; z?: number; ring?: number }) {
  return (
    <group>
      <mesh position={[0, y, (z - 6) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, Math.abs(z + 6), 8]} />
        {metal}
      </mesh>
      <mesh position={[0, y, -6]}>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
        {darkMetal}
      </mesh>
      {ring && (
        <mesh position={[0, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[ring, 0.18, 8, 36]} />
          {metal}
        </mesh>
      )}
    </group>
  )
}

/** Glass funnel with filter paper; origin at the stem tip. */
export function Funnel({ residue, wet, onClick }: { residue: string | null; wet: boolean; onClick?: () => void }) {
  const glass = useMemo(() => lathe([[0.32, 0], [0.38, 4], [3.3, 7.6], [3.45, 7.75]]), [])
  const paper = useMemo(() => lathe([[0.05, 4.4], [2.9, 7.4]], 32), [])
  const cake = useMemo(() => lathe([[0.05, 4.5], [1.4, 5.9]], 32), [])
  return (
    <group {...clickable(onClick)}>
      <mesh geometry={glass} renderOrder={2} castShadow>
        <Glass />
      </mesh>
      <mesh geometry={paper} renderOrder={1}>
        <meshStandardMaterial color={wet ? '#e9eef0' : '#fbfaf6'} side={THREE.DoubleSide} roughness={0.95} />
      </mesh>
      {residue && (
        <mesh geometry={cake} renderOrder={1}>
          <meshStandardMaterial color={residue} side={THREE.DoubleSide} roughness={0.95} />
        </mesh>
      )}
    </group>
  )
}

export function AlcoholLamp({ position, lit, onClick }: { position: Vec3; lit: boolean; onClick?: () => void }) {
  const body = useMemo(() => lathe([[0, 0], [2.6, 0], [2.9, 0.4], [2.9, 2.6], [2.2, 3.8], [1.0, 4.3], [1.0, 4.9]]), [])
  const cap = useMemo(() => lathe([[1.15, 0], [1.15, 1.6], [0.9, 2.3], [0, 2.5]]), [])
  return (
    <group position={position} {...clickable(onClick)}>
      <mesh position={[0, 1.4, 0]} renderOrder={1}>
        <cylinderGeometry args={[2.6, 2.6, 2.6, 28]} />
        <meshStandardMaterial color="#e9ecd8" transparent opacity={0.5} />
      </mesh>
      <mesh geometry={body} renderOrder={2} castShadow>
        <Glass />
      </mesh>
      <mesh position={[0, 5.1, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.5, 16]} />
        {metal}
      </mesh>
      <mesh position={[0, 5.6, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.6, 8]} />
        <meshStandardMaterial color="#f2efe6" />
      </mesh>
      {lit ? (
        <group position={[0, 5.8, 0]}>
          <Flame />
        </group>
      ) : (
        <mesh geometry={cap} position={[0, 4.6, 0]} renderOrder={2}>
          <Glass />
        </mesh>
      )}
      {lit && (
        <mesh geometry={cap} position={[4.2, 0, 0.5]} renderOrder={2}>
          <Glass />
        </mesh>
      )}
    </group>
  )
}

export function WhiteTile({ position, size = [10, 0.3, 10] }: { position: Vec3; size?: Vec3 }) {
  return (
    <mesh position={[position[0], position[1] + size[1] / 2, position[2]]} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#fbfbf8" roughness={0.4} />
    </mesh>
  )
}

// ---------- instruments ----------

/**
 * Trip balance (托盘天平). Weights for 5 g plus the rider at 0.9 g sit on the right;
 * the beam tips right until the left pan holds the sample.
 */
export function TripBalance({ position, sample, sampleColor, onClick }: {
  position: Vec3
  sample: boolean
  sampleColor: string
  onClick?: () => void
}) {
  const beam = useRef<THREE.Group>(null)
  const left = useRef<THREE.Group>(null)
  const right = useRef<THREE.Group>(null)
  const L = 6.5
  const pivotY = 6
  useFrame((_, dt) => {
    const target = sample ? 0 : -0.09
    if (!beam.current || !left.current || !right.current) return
    beam.current.rotation.z += (target - beam.current.rotation.z) * (1 - Math.exp(-dt * 3))
    const a = beam.current.rotation.z
    left.current.position.y = pivotY + 1.6 - Math.sin(a) * L
    right.current.position.y = pivotY + 1.6 + Math.sin(a) * L
  })
  const scale = useCanvasTexture(
    256,
    96,
    (g) => {
      g.fillStyle = '#fbf7ee'
      g.fillRect(0, 0, 256, 96)
      g.strokeStyle = '#2a2f3a'
      g.lineWidth = 4
      for (let i = -5; i <= 5; i++) {
        g.beginPath()
        g.moveTo(128 + i * 20, 96)
        g.lineTo(128 + i * 20, i === 0 ? 30 : 60)
        g.stroke()
      }
    },
    [],
  )
  const ruler = useCanvasTexture(
    512,
    64,
    (g) => {
      g.fillStyle = '#f1e7cf'
      g.fillRect(0, 0, 512, 64)
      g.fillStyle = '#2a2f3a'
      g.font = '600 26px sans-serif'
      for (let i = 0; i <= 5; i++) g.fillText(String(i), 8 + i * 98, 58)
      for (let i = 0; i <= 50; i++) g.fillRect(12 + i * 9.8, 0, 2, i % 10 === 0 ? 30 : 16)
    },
    [],
  )
  const pan = (side: 'left' | 'right') => (
    <group ref={side === 'left' ? left : right} position={[side === 'left' ? -L : L, pivotY + 1.6, 0]}>
      <mesh position={[0, -2.4, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 4.8, 8]} />
        {metal}
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[3.2, 2.9, 0.25, 36]} />
        {metal}
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[4.4, 0.04, 4.4]} />
        <meshStandardMaterial color="#fbfaf6" roughness={0.9} />
      </mesh>
      {side === 'right' && (
        <group position={[0.6, 0.2, 0]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.75, 0.75, 1.1, 20]} />
            <meshStandardMaterial color="#c8a24a" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.5, 10]} />
            <meshStandardMaterial color="#c8a24a" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      )}
      {side === 'left' && sample && <Grains color={sampleColor} count={26} spread={0.9} y={0.25} size={0.16} seed={3} />}
    </group>
  )
  return (
    <group position={position} {...clickable(onClick)}>
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[18, 2, 7]} />
        <meshStandardMaterial color="#4a5260" roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.6, 0]} castShadow>
        <boxGeometry args={[1.4, 4, 1.4]} />
        <meshStandardMaterial color="#4a5260" roughness={0.6} />
      </mesh>
      <group ref={beam} position={[0, pivotY, 0]}>
        <mesh castShadow>
          <boxGeometry args={[2 * L + 1, 0.5, 0.6]} />
          {metal}
        </mesh>
        <mesh position={[1.8, 0, 0.32]}>
          <planeGeometry args={[4.6, 0.5]} />
          <meshBasicMaterial map={ruler} toneMapped={false} />
        </mesh>
        <mesh position={[1.8 - 2.2 + 0.9 * 0.88, 0, 0.42]}>
          <boxGeometry args={[0.35, 0.8, 0.25]} />
          <meshStandardMaterial color="#c8a24a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, -2.6, 0.45]}>
          <boxGeometry args={[0.14, 5, 0.1]} />
          <meshStandardMaterial color="#1f2430" />
        </mesh>
      </group>
      <mesh position={[0, 2.05, 3.51]}>
        <planeGeometry args={[3, 1.1]} />
        <meshBasicMaterial map={scale} toneMapped={false} />
      </mesh>
      {pan('left')}
      {pan('right')}
    </group>
  )
}

/** Burette clamped on a stand: 0 mL at y = top, `perMl` cm per mL downwards. */
export const BURETTE = { top: 34, perMl: 0.45, tipY: 9.2, stopY: 11.6 }
export function Burette({ reading, dripping }: { reading: number; dripping: () => boolean }) {
  const scale = useCanvasTexture(
    128,
    2048,
    (g) => {
      g.clearRect(0, 0, 128, 2048)
      g.fillStyle = '#1f2430'
      g.font = '600 30px sans-serif'
      const px = 2048 / 52 // 52 mL span drawn
      for (let i = 0; i <= 500; i++) {
        const y = 40 + (i / 10) * px
        const major = i % 10 === 0
        g.fillRect(0, y, major ? 60 : i % 5 === 0 ? 44 : 28, major ? 4 : 2)
        if (major && (i / 10) % 5 === 0) g.fillText(String(i / 10), 66, y + 11)
      }
    },
    [],
  )
  const drop = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!drop.current) return
    const t = (clock.elapsedTime * 2.2) % 1
    drop.current.visible = dripping()
    drop.current.position.y = BURETTE.tipY - 0.3 - t * t * 5
  })
  const len = BURETTE.top + 1.2 - BURETTE.stopY
  const level = BURETTE.top - reading * BURETTE.perMl
  // texture spans 52 mL starting 40px above "0"
  const texH = (52 * BURETTE.perMl * 2048) / (2048 - 40)
  return (
    <group>
      <mesh position={[0, BURETTE.stopY + len / 2, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.6, 0.6, len, 20, 1, true]} />
        <Glass opacity={0.3} />
      </mesh>
      <mesh position={[0, (BURETTE.stopY + level) / 2, 0]} renderOrder={1}>
        <cylinderGeometry args={[0.5, 0.5, level - BURETTE.stopY, 20]} />
        <meshStandardMaterial color="#dfeef4" transparent opacity={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[0, BURETTE.top - texH / 2 + 40 * (texH / 2048), 0]} renderOrder={3}>
        <cylinderGeometry args={[0.62, 0.62, texH, 20, 1, true, -0.5, 1]} />
        <meshBasicMaterial map={scale} transparent toneMapped={false} side={THREE.FrontSide} />
      </mesh>
      <mesh position={[0, BURETTE.stopY - 0.2, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.8, 12]} />
        <Glass opacity={0.5} />
      </mesh>
      <mesh position={[0.9, BURETTE.stopY - 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 2.2, 8]} />
        <meshStandardMaterial color="#f4f4f0" />
      </mesh>
      <mesh position={[0, (BURETTE.tipY + BURETTE.stopY) / 2 - 0.5, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.2, 0.08, BURETTE.stopY - BURETTE.tipY - 0.6, 10]} />
        <Glass opacity={0.5} />
      </mesh>
      <mesh ref={drop} visible={false}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshStandardMaterial color="#cfe3ea" transparent opacity={0.85} />
      </mesh>
    </group>
  )
}

/** Centre-zero galvanometer; `deflect` in radians, positive = right. */
export function Ammeter({ position, deflect, onClick }: { position: Vec3; deflect: number; onClick?: () => void }) {
  const needle = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!needle.current) return
    const wobble = deflect ? Math.sin(performance.now() / 90) * 0.01 : 0
    needle.current.rotation.z += (-deflect + wobble - needle.current.rotation.z) * (1 - Math.exp(-dt * 4))
  })
  const face = useCanvasTexture(
    512,
    384,
    (g) => {
      g.fillStyle = '#fbf7ee'
      g.fillRect(0, 0, 512, 384)
      g.strokeStyle = '#1f2430'
      g.lineWidth = 4
      g.beginPath()
      g.arc(256, 340, 230, Math.PI * 1.22, Math.PI * 1.78)
      g.stroke()
      g.fillStyle = '#1f2430'
      g.font = '600 34px sans-serif'
      g.textAlign = 'center'
      for (let i = -5; i <= 5; i++) {
        const a = -Math.PI / 2 + i * 0.1 * 1.0
        const r1 = 230
        const r2 = i % 5 === 0 ? 195 : 212
        g.beginPath()
        g.moveTo(256 + Math.cos(a) * r1, 340 + Math.sin(a) * r1)
        g.lineTo(256 + Math.cos(a) * r2, 340 + Math.sin(a) * r2)
        g.stroke()
        if (i % 5 === 0) g.fillText(String(i === 0 ? 0 : i > 0 ? '+' : '−'), 256 + Math.cos(a) * 170, 352 + Math.sin(a) * 170)
      }
      g.font = '700 40px sans-serif'
      g.fillText('G', 256, 300)
    },
    [],
  )
  return (
    <group position={position} {...clickable(onClick)}>
      <mesh position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[9, 6.4, 4]} />
        <meshStandardMaterial color="#3d4656" roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.6, 2.01]}>
        <planeGeometry args={[7.6, 5.2]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      <group ref={needle} position={[0, 1.4, 2.05]}>
        <mesh position={[0, 2.1, 0]}>
          <boxGeometry args={[0.08, 4.2, 0.02]} />
          <meshBasicMaterial color="#c0262d" />
        </mesh>
      </group>
      {[-2.6, 2.6].map((x, i) => (
        <mesh key={x} position={[x, 6.8, 0.6]}>
          <cylinderGeometry args={[0.45, 0.45, 0.8, 16]} />
          <meshStandardMaterial color={i ? '#c0262d' : '#1f2430'} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export const AMMETER_TERMINALS: [Vec3, Vec3] = [[-2.6, 7.2, 0.6], [2.6, 7.2, 0.6]]

/** Metal electrode strip with its bottom edge at the origin. */
export function Electrode({ metal: kind }: { metal: 'Zn' | 'Cu' }) {
  return (
    <group>
      <mesh position={[0, 5, 0]} castShadow>
        <boxGeometry args={[1.4, 10, 0.14]} />
        <meshStandardMaterial color={kind === 'Zn' ? '#bcc3c9' : '#dc8a57'} metalness={0.45} roughness={kind === 'Zn' ? 0.45 : 0.32} />
      </mesh>
      <mesh position={[0, 10.3, 0]}>
        <boxGeometry args={[1.0, 0.8, 0.6]} />
        {darkMetal}
      </mesh>
      <Tag text={kind} position={[0, 11.6, 0]} width={1.8} dark={kind === 'Zn'} />
    </group>
  )
}

export function Wire({ points, color }: { points: Vec3[]; color: string }) {
  // keyed by the coordinates, so a fresh array with the same points reuses the tube
  const key = points.join(';')
  const geo = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 64, 0.13, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  )
}

/** Little spheres flowing along a polyline, used for electron flow. */
export function Flow({ points, color = '#ffd23f', count = 14, speed = 0.25, size = 0.24 }: {
  points: Vec3[]
  color?: string
  count?: number
  speed?: number
  size?: number
}) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), [points])
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return
      m.position.copy(curve.getPointAt((clock.elapsedTime * speed + i / count) % 1))
    })
  })
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)}>
          <sphereGeometry args={[size, 10, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export function IceCubes({ radius, y }: { radius: number; y: number }) {
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + 0.3
        const r = radius * (0.6 + rand(i) * 0.25)
        return (
          <mesh key={i} position={[Math.cos(a) * r, y + rand(i + 4) * 0.6, Math.sin(a) * r]} rotation={[i, i * 0.7, 0]}>
            <boxGeometry args={[1.1, 1.1, 1.1]} />
            <meshStandardMaterial color="#eef8ff" transparent opacity={0.7} roughness={0.1} />
          </mesh>
        )
      })}
    </group>
  )
}

export function Steam({ radius, y }: { radius: number; y: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return
      const t = (clock.elapsedTime * 0.35 + i / 6) % 1
      m.position.set(Math.cos(i * 2.1) * radius * 0.5, y + t * 6, Math.sin(i * 2.1) * radius * 0.5)
      m.scale.setScalar(0.6 + t * 1.6)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 0.35 * Math.sin(t * Math.PI)
    })
  })
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)}>
          <sphereGeometry args={[0.8, 12, 10]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** A long hand tool lying on the bench (along x); stands upright and lifts when held. */
export function RestingTool({ position, held, hidden, onClick, length, children }: {
  position: Vec3
  held: boolean
  hidden: boolean
  onClick: () => void
  length: number
  children: ReactNode
}) {
  const ref = useEased(held ? [position[0], LIFT, position[2]] : position)
  const rot = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (rot.current) rot.current.rotation.z += ((held ? 0 : Math.PI / 2) - rot.current.rotation.z) * (1 - Math.exp(-dt * 8))
  })
  return (
    <group ref={ref} position={position} visible={!hidden} {...clickable(onClick)}>
      <Passthrough active={held}>
        <group ref={rot} rotation={[0, 0, Math.PI / 2]} position={[held ? 0 : length / 2, 0, 0]}>
          {children}
          <mesh position={[0, length / 2, 0]}>
            <cylinderGeometry args={[0.9, 0.9, length, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </Passthrough>
    </group>
  )
}

/** Glass rod lying on the bench; stands upright and lifts when held. */
export function RestingRod(props: { position: Vec3; held: boolean; hidden: boolean; onClick: () => void }) {
  return (
    <RestingTool {...props} length={15}>
      <GlassRod />
    </RestingTool>
  )
}
