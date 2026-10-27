import { RoundedBox } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'

// Units are centimetres. Bench top is y = 0.

export type Vec3 = [number, number, number]

export const lathe = (pts: [number, number][], seg = 40) =>
  new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.001), y)), seg)

/** Darkens and thickens glass at grazing angles so walls and rims read like real glass. */
const glassRim = (shader: THREE.WebGLProgramParametersWithUniforms) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <dithering_fragment>',
    `vec3 rimDir = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition);
    float rim = pow(1.0 - abs(dot(rimDir, normal)), 3.0);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.4, 0.48, 0.48), rim * 0.5);
    gl_FragColor.a = min(gl_FragColor.a + rim * 0.45, 1.0);
    #include <dithering_fragment>`,
  )
}

export function Glass({ brown = false, opacity }: { brown?: boolean; opacity?: number }) {
  return (
    <meshPhysicalMaterial
      color={brown ? '#7a4212' : '#eaf4f7'}
      transparent
      opacity={opacity ?? (brown ? 0.6 : 0.16)}
      roughness={0.04}
      clearcoat={1}
      clearcoatRoughness={0.05}
      envMapIntensity={1.4}
      depthWrite={false}
      side={THREE.DoubleSide}
      onBeforeCompile={glassRim}
      customProgramCacheKey={() => 'glass-rim'}
    />
  )
}

export const metal = <meshStandardMaterial color="#c9ced4" metalness={0.7} roughness={0.3} />
export const darkMetal = <meshStandardMaterial color="#3b4048" metalness={0.5} roughness={0.45} />

/** Click handler that ignores the end of an orbit drag. */
export const tap = (fn?: () => void) => (e: ThreeEvent<MouseEvent>) => {
  e.stopPropagation()
  if (!fn || e.delta > 5) return
  fn()
}

export const hover = {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  },
  onPointerOut: () => {
    document.body.style.cursor = ''
  },
}

/** Props that make a group clickable with a pointer cursor. */
export const clickable = (fn?: () => void) => (fn ? { onClick: tap(fn), ...hover } : {})

/** Deterministic 0..1 hash so random-looking layouts are stable across renders. */
export const rand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export const smooth = (t: number) => {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

const CJK = '"PingFang SC", "Microsoft YaHei", sans-serif'
const LATIN = '"Geist Variable", "Helvetica Neue", sans-serif'

export function useLabelTexture(title: string, sub: string) {
  return useMemo(
    () =>
      canvasTexture(512, 256, (g) => {
        g.fillStyle = '#fbf7ee'
        g.beginPath()
        g.roundRect(6, 6, 500, 244, 22)
        g.fill()
        g.lineWidth = 6
        g.strokeStyle = '#2a2f3a'
        g.stroke()
        g.textAlign = 'center'
        g.fillStyle = '#1f2430'
        g.font = `700 ${title.length > 7 ? 84 : 104}px ${title.match(/[一-龥]/) ? CJK : LATIN}`
        g.fillText(title, 256, 128)
        g.fillStyle = '#8a5a22'
        g.font = `600 50px ${CJK}`
        g.fillText(sub, 256, 215)
      }),
    [title, sub],
  )
}

/** Curved paper label wrapped around a cylinder of radius r. */
export function WrapLabel({ title, sub, r, y, h }: { title: string; sub: string; r: number; y: number; h?: number }) {
  const tex = useLabelTexture(title, sub)
  return (
    <mesh position={[0, y, 0]} renderOrder={3}>
      <cylinderGeometry args={[r + 0.03, r + 0.03, h ?? r * 0.95, 32, 1, true, -0.95, 1.9]} />
      <meshStandardMaterial map={tex} transparent roughness={0.8} side={THREE.FrontSide} />
    </mesh>
  )
}

/** Small flat tag facing the camera's default direction; `width` is the size for a short label and grows with the text. */
export function Tag({ text, position, width = 4, dark = false }: { text: string; position: Vec3; width?: number; dark?: boolean }) {
  const { tex, cw } = useMemo(() => {
    const font = `700 54px ${text.match(/[\u4e00-\u9fa5]/) ? CJK : LATIN}`
    const probe = document.createElement('canvas').getContext('2d')!
    probe.font = font
    const cw = Math.max(256, Math.ceil(probe.measureText(text).width) + 72)
    const tex = canvasTexture(cw, 96, (g) => {
      g.fillStyle = dark ? '#2a2f3a' : '#fbf7ee'
      g.beginPath()
      g.roundRect(4, 4, cw - 8, 88, 44)
      g.fill()
      g.fillStyle = dark ? '#fbf7ee' : '#1f2430'
      g.font = font
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, cw / 2, 52)
    })
    return { tex, cw }
  }, [text, dark])
  const h = (width * 96) / 256
  return (
    <mesh position={position} rotation={[-0.35, 0, 0]}>
      <planeGeometry args={[(h * cw) / 96, h]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  )
}

export function useCanvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, deps: unknown[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => canvasTexture(w, h, draw), deps)
}

export function Bench({ width = 92, depth = 50 }: { width?: number; depth?: number }) {
  return (
    <group>
      <RoundedBox args={[width, 1.4, depth]} radius={0.5} smoothness={4} position={[0, -0.7, 0]} userData={{ noCastShadow: true }}>
        <meshStandardMaterial color="#e2ece8" roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, -2.3, -0.8]}>
        <boxGeometry args={[width - 1.6, 1.8, depth - 1.6]} />
        <meshStandardMaterial color="#9fb4ae" roughness={0.8} />
      </mesh>
    </group>
  )
}

export function Pointer({ position }: { position: Vec3 }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.set(position[0], position[1] + Math.sin(clock.elapsedTime * 4) * 0.5, position[2])
    ref.current.rotation.y = clock.elapsedTime * 1.5
  })
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.9, 2, 4]} />
        <meshStandardMaterial color="#f26b1d" emissive="#f26b1d" emissiveIntensity={0.35} flatShading />
      </mesh>
    </group>
  )
}

/** Loose grains (powder, crystals) scattered in a disc. */
export function Grains({ color, count = 22, spread = 0.75, y = 0.2, size = 0.13, seed = 0 }: {
  color: string
  count?: number
  spread?: number
  y?: number
  size?: number
  seed?: number
}) {
  const grains = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const k = seed * 100 + i * 3
        const a = rand(k) * Math.PI * 2
        const r = Math.sqrt(rand(k + 1)) * spread
        return [Math.cos(a) * r, y + rand(k + 2) * size * 2, Math.sin(a) * r] as Vec3
      }),
    [count, spread, y, size, seed],
  )
  return (
    <group>
      {grains.map((p, i) => (
        <mesh key={i} position={p} rotation={[i, i * 2, 0]}>
          <dodecahedronGeometry args={[size]} />
          <meshStandardMaterial color={color} roughness={0.6} metalness={color === '#3f4147' ? 0.4 : 0} />
        </mesh>
      ))}
    </group>
  )
}

/** Bubbles rising through a column of radius `radius` up to `top()`. */
export function Bubbles({ rate, radius, top, bottom = 0.3, size = 0.12, count = 26 }: {
  rate: () => number
  radius: number
  top: () => number
  bottom?: number
  size?: number
  count?: number
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const m = useMemo(() => new THREE.Matrix4(), [])
  useFrame(({ clock }) => {
    const im = mesh.current
    if (!im) return
    const t = clock.elapsedTime
    const shown = Math.round(rate() * count)
    const h = top() - bottom
    for (let i = 0; i < count; i++) {
      const speed = 2 + rand(i) * 2
      const y = bottom + ((rand(i + 50) * h + t * speed) % Math.max(h, 0.01))
      const a = rand(i + 9) * Math.PI * 2
      const rr = rand(i + 17) * radius
      const s = i < shown && h > 0.3 ? size * (0.6 + rand(i + 3)) : 0
      m.makeScale(s, s, s).setPosition(Math.cos(a) * rr, y, Math.sin(a) * rr)
      im.setMatrixAt(i, m)
    }
    im.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} renderOrder={2}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.75} roughness={0.1} />
    </instancedMesh>
  )
}

export function Flame({ scale = 1 }: { scale?: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.scale.set(scale * (1 + Math.sin(t * 23) * 0.05), scale * (1 + Math.sin(t * 17) * 0.12), scale)
  })
  return (
    <group ref={ref}>
      <mesh position={[0, 1.1, 0]}>
        <coneGeometry args={[0.55, 2.4, 16]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.75} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <coneGeometry args={[0.28, 1.2, 12]} />
        <meshBasicMaterial color="#6fa8ff" transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.5, 0]} color="#ffb347" intensity={30} distance={14} />
    </group>
  )
}

/** Fires onCommit then onFinish after the given delays (s); remount with a new key to restart. */
export function Timer({ commitAt, finishAt, onCommit, onFinish }: {
  commitAt: number
  finishAt: number
  onCommit: () => void
  onFinish: () => void
}) {
  const s = useRef({ t: 0, committed: false, finished: false })
  useFrame((_, dt) => {
    const st = s.current
    if (st.finished) return
    st.t += dt
    if (st.t >= commitAt && !st.committed) {
      st.committed = true
      onCommit()
    }
    if (st.t >= finishAt) {
      st.finished = true
      onFinish()
    }
  })
  return null
}

/** Eases a group's position toward `target` every frame. */
export function useEased(target: Vec3, speed = 8) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const k = 1 - Math.exp(-dt * speed)
    g.position.x += (target[0] - g.position.x) * k
    g.position.y += (target[1] - g.position.y) * k
    g.position.z += (target[2] - g.position.z) * k
  })
  return ref
}

/** While `active`, descendant meshes ignore pointer rays (e.g. a lifted tool must not block its target). */
export function Passthrough({ active, children }: { active: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh & { __raycast?: THREE.Mesh['raycast'] }
      if (!m.isMesh) return
      m.__raycast ??= m.raycast
      m.raycast = active ? () => {} : m.__raycast
    })
  }, [active])
  return <group ref={ref}>{children}</group>
}

/** Invisible box that enlarges the click target of a thin object. */
export function HitBox({ size, position = [0, 0, 0] }: { size: Vec3; position?: Vec3 }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}
