import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { lathe, type Vec3 } from '@/kit/core'
import { elementOf } from './atoms'
import { Glass, Ink, Inked, REDUCED } from './ink'
import { moleculeOf } from './molecules'

// Drawings shared between chapters: atoms, molecules and common glassware.

export type GroupProps = { position?: Vec3; rotation?: Vec3; scale?: number | Vec3 }

const SPHERE = new THREE.SphereGeometry(1, 32, 20)

/** One atom; `r` overrides the element's drawing radius. */
export function Atom({ sym, r, ...g }: { sym: string; r?: number } & GroupProps) {
  const e = elementOf(sym)
  return <Inked geometry={SPHERE} color={e.color} scale={r ?? e.r} {...g} />
}

export function Molecule({ f, ...g }: { f: string } & GroupProps) {
  return (
    <group {...g}>
      {moleculeOf(f).map(([sym, x, y, z], i) => (
        <Atom key={i} sym={sym} position={[x, y, z]} />
      ))}
    </group>
  )
}

/** Thermal motion: a small wander and tumble around the rest position. */
export function Jiggle({ seed, position, children }: { seed: number; position: Vec3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g || REDUCED) return
    const t = clock.elapsedTime + seed * 10
    g.position.set(position[0] + 0.3 * Math.sin(t * 1.7), position[1] + 0.25 * Math.sin(t * 2.3 + 1), position[2] + 0.3 * Math.sin(t * 1.3 + 2))
    g.rotation.set(t * 0.6, t * 0.8 + seed, 0)
  })
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  )
}

/** Glass wall thickness. */
export const T = 0.12
const R = 2.6
const H = 6.5
const BEAKER = lathe([[0, T], [R - T, T], [R - T, H], [R + 0.12, H + 0.05], [R, H - 0.25], [R, 0], [0, 0]], 48)
const WATER = new THREE.CylinderGeometry(R - T - 0.02, R - T - 0.02, 4.2, 48)
/** wash for water and colourless solutions */
export const WATER_COLOR = '#a9c8d6'

/** `clear` draws the water see-through, so what is in it shows. */
export function Beaker({ water = true, clear = false, ...g }: { water?: boolean; clear?: boolean } & GroupProps) {
  return (
    <group {...g}>
      {water && !clear && <Inked geometry={WATER} color={WATER_COLOR} position-y={T + 2.1} />}
      {water && clear && (
        <mesh geometry={WATER} position-y={T + 2.1} renderOrder={1}>
          <Ink color={WATER_COLOR} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
      <Glass geometry={BEAKER} />
    </group>
  )
}

const HEAP = new THREE.ConeGeometry(1.7, 1.3, 40, 1)
const DISH = new THREE.CylinderGeometry(2.5, 2.2, 0.25, 48)

/** A dish with a heap of white powder; `full={false}` leaves it empty. */
export function PowderDish({ full = true, ...g }: { full?: boolean } & GroupProps) {
  return (
    <group {...g}>
      <Inked geometry={DISH} color="#e6dfd0" position-y={0.12} />
      {full && <Inked geometry={HEAP} color="#fbfaf6" position-y={0.9} />}
    </group>
  )
}
