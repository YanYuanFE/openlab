import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { rand } from '@/kit/core'
import { Ink, REDUCED } from './ink'
import { PAGE_D, PAGE_W, useCardTexture, type PrintedPage } from './paper'
import { LEAF_N, POP } from './pop'
import { hitAt } from './print'

// The open book on the desk. World units are cm; the spine runs along z at x = 0, the reader sits at +z.

const COVER = '#c8962f'
const BLOCK = 1.3
/** Height of the page surface: low in the gutter, rising to the full page block within a few cm. */
export const surface = (u: number) => 0.35 + BLOCK * (1 - Math.exp(-u / 0.07)) - 0.12 * u
export const PAGE_TOP = surface(0.5)

/** World position of a point given in cm from a page's top-left corner. */
export function pagePoint(side: 'left' | 'right', x: number, y: number): THREE.Vector3 {
  const wx = side === 'left' ? -PAGE_W + x : x
  return new THREE.Vector3(wx, surface(Math.abs(wx) / PAGE_W), -PAGE_D / 2 + y)
}

/** A page surface bent into the gutter, uv (0,1) at its top-left. */
function pageGeometry(side: 'left' | 'right') {
  const n = 60
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= n; i++) {
    // denser near the spine where the page curves
    const t = (i / n) ** 1.6
    const u = side === 'left' ? 1 - t : t
    const x = side === 'left' ? -PAGE_W + u * PAGE_W : u * PAGE_W
    const h = surface(Math.abs(x) / PAGE_W)
    pos.push(x, h, -PAGE_D / 2, x, h, PAGE_D / 2)
    uv.push(u, 1, u, 0)
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2
    if (side === 'left') idx.push(a, a + 3, a + 1, a, a + 2, a + 3)
    else idx.push(a, a + 1, a + 3, a, a + 3, a + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** The stack of pages under one page surface, seen from its edges. */
function blockGeometry(side: 'left' | 'right') {
  const shape = new THREE.Shape()
  const sign = side === 'left' ? -1 : 1
  shape.moveTo(0, 0.25)
  for (let i = 0; i <= 40; i++) {
    const u = i / 40
    shape.lineTo(sign * u * PAGE_W, surface(u) - 0.12)
  }
  shape.lineTo(sign * PAGE_W, 0.25)
  const g = new THREE.ExtrudeGeometry(shape, { depth: PAGE_D - 0.2, bevelEnabled: false })
  g.translate(0, 0, -(PAGE_D - 0.2) / 2)
  return g
}

const LEFT = pageGeometry('left')
const RIGHT = pageGeometry('right')
const LEFT_BLOCK = blockGeometry('left')
const RIGHT_BLOCK = blockGeometry('right')

function deskTexture() {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 1024
  const g = c.getContext('2d')!
  g.fillStyle = '#e4dccd'
  g.fillRect(0, 0, 1024, 1024)
  // long planks with soft grain
  for (let i = 0; i < 900; i++) {
    const y = rand(i) * 1024
    g.strokeStyle = `rgba(${150 + rand(i + 1) * 40},${120 + rand(i + 2) * 30},90,${0.04 + rand(i + 3) * 0.06})`
    g.lineWidth = 1 + rand(i + 4) * 3
    g.beginPath()
    g.moveTo(0, y)
    g.bezierCurveTo(340, y + (rand(i + 5) - 0.5) * 30, 680, y + (rand(i + 6) - 0.5) * 30, 1024, y)
    g.stroke()
  }
  g.fillStyle = 'rgba(110,90,60,0.25)'
  for (let k = 1; k < 4; k++) g.fillRect(0, k * 256 - 1, 1024, 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 2)
  t.anisotropy = 8
  return t
}

export function Desk() {
  const wood = useMemo(deskTexture, [])
  useEffect(() => () => wood.dispose(), [wood])
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.3} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshLambertMaterial map={wood} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.15} receiveShadow>
        <planeGeometry args={[78, 54]} />
        <meshLambertMaterial color="#9fb2aa" />
      </mesh>
    </>
  )
}

/**
 * A paper card over a flap hole, hinged on its bottom edge: opening flips it towards the reader so it lies
 * face down on the blank page below, out of the way of what is printed above. Keep flaps last on a page.
 */
function FlapCard({ side, rect, open, locked, onTap }: { side: 'left' | 'right'; rect: PrintedPage['flaps'][number]; open: boolean; locked: boolean; onTap: () => void }) {
  const tex = useCardTexture(rect, locked ? '先勾选一个预测，才能掀开' : '点这里，掀开看答案', locked)
  const hinge = pagePoint(side, rect.x + rect.w / 2, rect.y + rect.h)
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const goal = open ? Math.PI * 0.985 : 0
    g.rotation.x = REDUCED ? goal : THREE.MathUtils.damp(g.rotation.x, goal, 4, dt)
  })
  return (
    <group ref={ref} position={[hinge.x, hinge.y + 0.03, hinge.z]}>
      <mesh
        position-z={-rect.h / 2}
        rotation-x={-Math.PI / 2}
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta <= 5 && !open) onTap()
        }}
        onPointerOver={() => !locked && !open && (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <planeGeometry args={[rect.w, rect.h]} />
        <meshLambertMaterial map={tex} />
      </mesh>
      {/* blank back, seen once the card lies face down */}
      <mesh position-z={-rect.h / 2} rotation-x={Math.PI / 2}>
        <planeGeometry args={[rect.w, rect.h]} />
        <meshLambertMaterial color="#f3ecdc" />
      </mesh>
    </group>
  )
}

/** One printed page: clicks are mapped back to page centimetres and the printed region under them. */
function Page({ side, page, onHit }: { side: 'left' | 'right'; page: PrintedPage; onHit: (id: string, i: number) => void }) {
  const at = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    if (!e.uv) return undefined
    return hitAt(page.laid.hits, e.uv.x * PAGE_W, (1 - e.uv.y) * PAGE_D)
  }
  return (
    <>
      <mesh
        geometry={side === 'left' ? LEFT : RIGHT}
        receiveShadow
        onClick={(e) => {
          if (e.delta > 5) return
          const h = at(e)
          if (h) {
            e.stopPropagation()
            onHit(h.id, h.i)
          }
        }}
        onPointerMove={(e) => {
          document.body.style.cursor = at(e) ? 'pointer' : ''
        }}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <Ink color="#ffffff" map={page.tex} emissive="#ffffff" emissiveMap={page.spill} pop={false} />
      </mesh>
      {page.flaps.map((f) => (
        <FlapCard key={f.id} side={side} rect={f} open={f.open} locked={f.locked} onTap={() => onHit(f.id, 0)} />
      ))}
    </>
  )
}

export function OpenBook({
  left,
  right,
  keys,
  onHit,
  children,
}: {
  left: PrintedPage
  right: PrintedPage
  /** identity of each page, so a flap card belongs to its page and does not animate across a turn */
  keys: [string, string]
  onHit: (id: string, i: number) => void
  /** drawings standing on the right page, and the leaf while one is turning */
  children?: ReactNode
}) {
  return (
    <group>
      {/* boards and spine */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[PAGE_W * 2 + 1.6, 0.3, PAGE_D + 1.4]} />
        <meshLambertMaterial color={COVER} />
      </mesh>
      <mesh geometry={LEFT_BLOCK}>
        <meshLambertMaterial color="#efe6d2" />
      </mesh>
      <mesh geometry={RIGHT_BLOCK}>
        <meshLambertMaterial color="#efe6d2" />
      </mesh>
      {/* ribbon bookmark hanging out of the gutter */}
      <mesh position={[0.25, 0.3, PAGE_D / 2 + 2.2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[0.7, 5]} />
        <meshLambertMaterial color="#2c3550" side={THREE.DoubleSide} />
      </mesh>
      <Page key={keys[0]} side="left" page={left} onHit={onHit} />
      <Page key={keys[1]} side="right" page={right} onHit={onHit} />
      {children}
    </group>
  )
}

export const TURN_SECONDS = 0.9

/**
 * Thin paper: the print on the reverse shows through faintly (mirrored), and light falling on the far side
 * comes through as a warm glow.
 */
function LeafPaper({ map, reverse, side = THREE.FrontSide }: { map: THREE.Texture; reverse: THREE.Texture; side?: THREE.Side }) {
  const uniforms = useMemo(() => ({ uReverse: { value: reverse } }), [reverse])
  return (
    <meshLambertMaterial
      map={map}
      side={side}
      customProgramCacheKey={() => 'leaf-paper'}
      onBeforeCompile={(s) => {
        Object.assign(s.uniforms, uniforms)
        s.fragmentShader = s.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D uReverse;')
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            diffuseColor.rgb *= mix(vec3(1.0), texture2D(uReverse, vec2(1.0 - vMapUv.x, vMapUv.y)).rgb, 0.14);`,
          )
          .replace(
            '#include <lights_fragment_end>',
            `#include <lights_fragment_end>
            #if NUM_DIR_LIGHTS > 0
              float through = max(0.0, -dot(normal, directionalLights[0].direction));
              reflectedLight.indirectDiffuse += diffuseColor.rgb * vec3(1.0, 0.93, 0.8) * directionalLights[0].color * through * 0.12;
            #endif`,
          )
      }}
    />
  )
}

/**
 * The leaf being turned: a page pivoting about the spine from the right side (θ = 0) to the left (θ = π),
 * its free edge lagging so the paper curls. The front shows a right page, the back a left page.
 */
const n = LEAF_N

export function Leaf({ front, back, forward, start }: { front: PrintedPage; back: PrintedPage; forward: boolean; start: number }) {
  const frame = useRef<THREE.Group>(null)
  const geo = useMemo(() => {
    const pos = new THREE.Float32BufferAttribute(new Float32Array((n + 1) * 2 * 3), 3)
    const make = (flip: boolean) => {
      const g = new THREE.BufferGeometry()
      const uv: number[] = []
      const idx: number[] = []
      for (let i = 0; i <= n; i++) {
        const u = flip ? 1 - i / n : i / n
        uv.push(u, 1, u, 0)
      }
      for (let i = 0; i < n; i++) {
        const a = i * 2
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2)
      }
      g.setAttribute('position', pos)
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
      g.setIndex(idx)
      return g
    }
    return { pos, front: make(false), back: make(true) }
  }, [])
  useEffect(() => () => (geo.front.dispose(), geo.back.dispose()), [geo])
  useEffect(() => () => void (POP.uLeafOn.value = 0), [])
  useFrame(() => {
    const k = Math.min(Math.max((performance.now() / 1000 - start) / TURN_SECONDS, 0), 1)
    const e = k * k * (3 - 2 * k)
    const theta = Math.PI * (forward ? e : 1 - e)
    const lag = (forward ? -1 : 1) * 0.55 * Math.sin(Math.PI * e)
    let x = 0
    let y = PAGE_TOP + 0.04
    const step = PAGE_W / n
    for (let i = 0; i <= n; i++) {
      if (i > 0) {
        const phi = theta + lag * ((i - 0.5) / n) ** 1.5
        x += Math.cos(phi) * step
        y += Math.sin(phi) * step
      }
      geo.pos.setXYZ(i * 2, x, y, -PAGE_D / 2)
      geo.pos.setXYZ(i * 2 + 1, x, y, PAGE_D / 2)
      POP.uLeaf.value[i].set(x, y)
    }
    // a forward turn carries the folded drawing of the page it lifts, until that face turns away (see leafWorld in pop.ts)
    POP.uLeafOn.value = forward ? (theta < Math.PI / 2 ? 1 : 2) : 0
    POP.uLeafStep.value = step
    POP.uBook.value.copy(frame.current!.matrixWorld)
    POP.uBookInv.value.copy(POP.uBook.value).invert()
    geo.pos.needsUpdate = true
    geo.front.computeVertexNormals()
    geo.back.computeVertexNormals()
    geo.front.computeBoundingSphere()
  })
  return (
    <group ref={frame}>
      {/* soft shading, not hatching: the leaf is mostly turned away from the light */}
      <mesh geometry={geo.front} castShadow>
        <LeafPaper map={front.tex} reverse={back.tex} />
      </mesh>
      <mesh geometry={geo.back}>
        <LeafPaper map={back.tex} reverse={front.tex} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

export type Framing = 'spread' | 'left' | 'right'

/** Eases the camera to frame the spread or one page whenever `framing` changes; between moves the reader can orbit. */
export function CameraRig({ framing, bottom }: { framing: Framing; bottom: number }) {
  const { size, camera } = useThree()
  const controls = useRef<OrbitControlsImpl>(null)
  const [moving, setMoving] = useState(true)
  const goal = useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera
    const w = framing === 'spread' ? PAGE_W * 2 + 3 : PAGE_W + 1.5
    const h = PAGE_D + 3
    const aspect = size.width / Math.max(size.height - bottom, 1)
    const vfov = THREE.MathUtils.degToRad(cam.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
    // a tilted page looks shorter, so fit its projected depth
    const elev = THREE.MathUtils.degToRad(58)
    const dist = Math.max(w / 2 / Math.tan(hfov / 2), (h * Math.sin(elev)) / 2 / Math.tan(vfov / 2)) * 1.08
    const target = new THREE.Vector3(framing === 'spread' ? 0 : framing === 'left' ? -PAGE_W / 2 : PAGE_W / 2, 0.5, 0.8)
    const pos = target.clone().add(new THREE.Vector3(0, Math.sin(elev), Math.cos(elev)).multiplyScalar(dist))
    return { target, pos }
  }, [framing, size, bottom, camera])
  useEffect(() => setMoving(true), [goal])
  useEffect(() => {
    // keep the bottom bar clear by shifting the image up
    const cam = camera as THREE.PerspectiveCamera
    cam.setViewOffset(size.width, size.height, 0, bottom / 2, size.width, size.height)
    cam.updateProjectionMatrix()
  }, [camera, size, bottom])
  useFrame((_, dt) => {
    const c = controls.current
    if (!moving || !c) return
    const k = REDUCED ? 1 : 1 - Math.exp(-4 * dt)
    camera.position.lerp(goal.pos, k)
    c.target.lerp(goal.target, k)
    c.update()
    if (camera.position.distanceTo(goal.pos) < 0.05) setMoving(false)
  })
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      minPolarAngle={0.25}
      maxPolarAngle={1.2}
      minAzimuthAngle={-0.7}
      maxAzimuthAngle={0.7}
      minDistance={18}
      maxDistance={140}
      onStart={() => setMoving(false)}
    />
  )
}

export function DeskLights() {
  return (
    <>
      <ambientLight intensity={Math.PI * 0.36} />
      <directionalLight position={[-18, 46, 26]} intensity={Math.PI * 0.66} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-normalBias={0.02}>
        <orthographicCamera attach="shadow-camera" args={[-40, 40, 32, -32, 1, 140]} />
      </directionalLight>
    </>
  )
}

export function DeskCamera() {
  return <PerspectiveCamera makeDefault fov={30} near={1} far={600} position={[0, 60, 40]} />
}

