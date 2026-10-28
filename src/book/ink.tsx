import { useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Vec3 } from '@/kit/core'
import { penMaterial, ribbon, strokesFor } from './pen'
import { leafVertex, POP, POP_DEPTH, popSurface, popVertex } from './pop'

// Pen-and-ink rendering for the book: flat washes, world-space hatching for shade and cast shadows, and pen
// strokes for outlines. Everything in a pop-up folds with it (see pop.ts). Units are centimetres, the page is y = 0.

export const INK = '#2a2520'
export const SEAL = '#b23a2a'

const glslVec3 = (hex: string) => {
  const c = new THREE.Color(hex)
  return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`
}

const HATCH = /* glsl */ `
varying vec3 vInkW;
// 1 on a pen line, 0 between; fades to the average tone where lines get too dense to draw
float inkLines(float f, float w) {
  float aa = fwidth(f);
  float d = abs(fract(f) - 0.5);
  float l = smoothstep(0.5 - w - aa, 0.5 - w + aa, d);
  return mix(l, 2.0 * w, smoothstep(0.35, 0.7, aa));
}`

/** Lambert lighting turned into a flat wash plus one or two layers of hatching. */
const inkShade = (shader: THREE.WebGLProgramParametersWithUniforms) => {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vInkW;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvInkW = (modelMatrix * vec4(transformed, 1.0)).xyz;')
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${HATCH}`).replace(
    '#include <opaque_fragment>',
    `float inkLum = dot(outgoingLight, vec3(1.0)) / max(dot(diffuseColor.rgb, vec3(1.0)), 1e-3);
    float inkA = inkLines(dot(vInkW, vec3(0.62, 0.48, 0.62)) / 0.2, 0.1) * (1.0 - smoothstep(0.6, 0.78, inkLum));
    float inkB = inkLines(dot(vInkW, vec3(-0.62, 0.45, 0.64)) / 0.2, 0.08) * (1.0 - smoothstep(0.3, 0.42, inkLum));
    outgoingLight = mix(diffuseColor.rgb * mix(0.88, 1.0, smoothstep(0.3, 0.95, inkLum)), ${glslVec3(INK)}, max(inkA, inkB) * 0.88);
    #include <opaque_fragment>`,
  )
}

const inkPop = (s: THREE.WebGLProgramParametersWithUniforms) => {
  inkShade(s)
  popSurface(s)
}

/** The hatched wash; `pop={false}` for surfaces that are not part of a pop-up drawing (the pages). */
export function Ink({ color, pop = true, ...rest }: { color: string; pop?: boolean } & ThreeElements['meshLambertMaterial']) {
  return <meshLambertMaterial color={color} onBeforeCompile={pop ? inkPop : inkShade} customProgramCacheKey={() => (pop ? 'ink-pop' : 'ink')} {...rest} />
}

/** A flat-coloured material that folds with the pop-up (rings, printed labels, displays). */
export function PopBasic(props: ThreeElements['meshBasicMaterial']) {
  return <meshBasicMaterial onBeforeCompile={popSurface} customProgramCacheKey={() => 'basic-pop'} {...props} />
}

/** Glass drawn as ink only where the wall turns away from the eye, over a faint wash. */
const glassShade = (shader: THREE.WebGLProgramParametersWithUniforms) => {
  popVertex(shader)
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSurf;').replace(
    '#include <opaque_fragment>',
    `float rim = 1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0)));
    float line = smoothstep(0.86, 0.98, rim);
    gl_FragColor = vec4(mix(${glslVec3('#dfe8e6')}, ${glslVec3(INK)}, line), max(0.12, line * 0.9) * uSurf);`,
  )
}

function InkGlass() {
  return (
    <meshLambertMaterial
      transparent
      depthWrite={false}
      side={THREE.DoubleSide}
      onBeforeCompile={glassShade}
      customProgramCacheKey={() => 'ink-glass'}
    />
  )
}

/** Pen strokes for a geometry: its silhouettes, rims and creases (see pen.ts), drawn over the solid. */
export function Pen({ geometry, width = 1.5, color = INK, opacity = 1 }: { geometry: THREE.BufferGeometry; width?: number; color?: string; opacity?: number }) {
  const parts = useMemo(
    () => strokesFor(geometry).map((set, i) => ({ geo: ribbon(set, geometry.id * 7 + i), mat: penMaterial(set.mode, width, color, opacity) })),
    [geometry, width, color, opacity],
  )
  useEffect(() => () => parts.forEach((p) => (p.geo.dispose(), p.mat.dispose())), [parts])
  return (
    <>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geo} material={p.mat} frustumCulled={false} renderOrder={10} />
      ))}
    </>
  )
}

/** A glass part: rim-shaded walls and pen outlines. */
export function Glass({ geometry, ...rest }: { geometry: THREE.BufferGeometry } & ThreeElements['mesh']) {
  return (
    <mesh geometry={geometry} {...rest}>
      <InkGlass />
      <Pen geometry={geometry} width={1.1} />
    </mesh>
  )
}

type GroupProps = ThreeElements['group']

/** An inked solid: hatched wash, pen outlines (`pen` is the stroke width in px, 0 for none) and a folding shadow. */
export function Inked({ geometry, color, pen = 1.5, ...rest }: { geometry: THREE.BufferGeometry; color: string; pen?: number } & GroupProps) {
  return (
    <group {...rest}>
      <mesh geometry={geometry} castShadow receiveShadow customDepthMaterial={POP_DEPTH}>
        <Ink color={color} />
      </mesh>
      {pen > 0 && <Pen geometry={geometry} width={pen} />}
    </group>
  )
}

/** surfaces dissolve, then the drawing folds flat; the page turns only after this */
export const FOLD_SECONDS = 0.5
const DISSOLVE_SECONDS = 0.15
/** a new drawing stands at once, the pen draws its lines, then its surfaces dissolve in over this span */
const SURFACE_IN: [number, number] = [1.1, 1.7]

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

/** Front edge (largest z) of everything drawn in a pop-up, in its own frame; printed captions don't count. */
function frontEdge(frame: THREE.Group) {
  const inv = frame.matrixWorld.clone().invert()
  const box = new THREE.Box3()
  const part = new THREE.Box3()
  frame.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.visible || m.userData.print || !m.geometry) return
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
    box.union(part.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld).applyMatrix4(inv))
  })
  return box.isEmpty() ? 0 : box.max.z
}

/**
 * Holds the drawing standing on the page and drives the shared pop uniforms from its own frame. Mounted normally,
 * the pen draws the drawing and its surfaces dissolve in (remount via `key` to draw again); mounted with
 * `folding`, the finished drawing dissolves to its lines and folds flat about its front edge.
 */
export function PopUp({ folding = false, children, ...rest }: { folding?: boolean; children: ReactNode } & GroupProps) {
  const ref = useRef<THREE.Group>(null)
  const born = useRef<number | null>(null)
  const hinge = useRef(0)
  const { gl } = useThree()
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    g.updateMatrixWorld()
    if (born.current === null) {
      born.current = clock.elapsedTime
      hinge.current = frontEdge(g)
    }
    POP.uPop.value.copy(g.matrixWorld)
    POP.uPopInv.value.copy(g.matrixWorld).invert()
    POP.uHinge.value = hinge.current
    gl.getDrawingBufferSize(POP.uRes.value)
    POP.uDpr.value = gl.getPixelRatio()
    const age = clock.elapsedTime - born.current
    const [lift, surf] = REDUCED
      ? [folding ? 0 : 1, folding ? 0 : 1]
      : folding
        ? [1 - smooth(DISSOLVE_SECONDS, FOLD_SECONDS, age), 1 - smooth(0, DISSOLVE_SECONDS, age)]
        : [1, smooth(...SURFACE_IN, age)]
    POP.uLift.value = lift
    POP.uSurf.value = surf
    POP.uDraw.value = REDUCED || folding ? 1e6 : age
  })
  return (
    <group ref={ref} {...rest}>
      {children}
    </group>
  )
}

export const REDUCED = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Lifts its children off the page when mounted; remount (change `key`) to lift again. */
export function Rise({ delay = 0, children, ...rest }: { delay?: number; children: ReactNode } & GroupProps) {
  const ref = useRef<THREE.Group>(null)
  const start = useRef<number | null>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    if (start.current === null) start.current = clock.elapsedTime
    const t = Math.min(Math.max((clock.elapsedTime - start.current - delay) / 0.9, 0), 1)
    // ease-out with a slight overshoot, like a pop-up page standing up
    const s = REDUCED ? 1 : 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2
    g.scale.y = Math.max(s, 0.001)
  })
  return (
    <group ref={ref} scale-y={REDUCED ? 1 : 0.001} {...rest}>
      {children}
    </group>
  )
}

const SERIF = '"Source Han Serif SC", "Noto Serif SC", "Songti SC", "STSong", serif'

/** A caption printed flat on the page (it stays put while the drawing folds); digits in `formula` are set as subscripts, a charge after `^` as a superscript. */
export function Label({ position, text, formula = '', color = INK, bold = false }: { position: Vec3; text: string; formula?: string; color?: string; bold?: boolean }) {
  const { tex, aspect } = useMemo(() => {
    const px = 64
    const [base, charge = ''] = formula.split('^')
    const runs = [
      { s: text, y: 72 },
      ...base.split(/(\d+)/).map((s, i) => ({ s, y: i % 2 ? 86 : 72 })),
      { s: charge.replace('-', '−'), y: 44 },
    ].filter((r) => r.s)
    const font = (y: number) => `${bold ? 700 : 500} ${y === 72 ? px : px * 0.62}px ${SERIF}`
    const g = document.createElement('canvas').getContext('2d')!
    const widths = runs.map((r) => ((g.font = font(r.y)), g.measureText(r.s).width))
    const c = g.canvas
    c.width = Math.ceil(widths.reduce((a, b) => a + b, 0)) + 16
    c.height = 104
    g.fillStyle = color
    let x = 8
    runs.forEach((r, i) => {
      g.font = font(r.y)
      g.fillText(r.s, x, r.y)
      x += widths[i]
    })
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    return { tex, aspect: c.width / c.height }
  }, [text, formula, color, bold])
  useEffect(() => () => tex.dispose(), [tex])
  const h = 1.5
  return (
    <mesh position={[position[0], position[1] + 0.02, position[2]]} rotation-x={-Math.PI / 2} userData={{ print: true }}>
      <planeGeometry args={[h * aspect, h]} />
      {/* print, so it does not fold with the drawing; pulled towards the camera so it never fights the page */}
      <meshBasicMaterial map={tex} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} onBeforeCompile={leafVertex} customProgramCacheKey={() => 'label-leaf'} />
    </mesh>
  )
}
