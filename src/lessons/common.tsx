import { REAGENTS, apply, look, type ReagentId, type Vessel as Contents } from '@/chem/engine'
import { DropperBottle, Dropper, LIFT, PowderJar, Spatula } from '@/kit/apparatus'
import { Carry } from '@/kit/carry'
import type { Vec3 } from '@/kit/core'
import type { Anim } from './types'

export const lookOf = (v: Contents) => (now: number) => look(v, now)

/** Add a reagent to one named vessel in a record of vessels. */
export function addTo<V extends Record<string, Contents>>(vessels: V, key: keyof V, reagent: ReagentId, now: number, dose?: number) {
  const r = apply(vessels[key], { type: 'add', reagent, dose }, now)
  return { vessels: { ...vessels, [key]: r.vessel } as V, equations: r.equations }
}

export function agitate<V extends Record<string, Contents>>(vessels: V, key: keyof V, now: number) {
  const r = apply(vessels[key], { type: 'agitate' }, now)
  return { vessels: { ...vessels, [key]: r.vessel } as V, equations: r.equations }
}

/** Row of dropper bottles / powder jars. */
export function ReagentShelf({ ids, positions, held, anim, onItem }: {
  ids: ReagentId[]
  positions: Record<string, Vec3>
  held: string | null
  anim: Anim | null
  onItem: (id: string) => void
}) {
  return (
    <>
      {ids.map((id) => {
        const r = REAGENTS[id]
        const props = {
          reagent: r,
          position: positions[id],
          held: held === id,
          hidden: anim?.tool === id,
          onClick: () => onItem(id),
        }
        return r.solid ? <PowderJar key={id} {...props} /> : <DropperBottle key={id} {...props} />
      })}
    </>
  )
}

/** Dropper or spatula carried from a reagent bottle to just above `mouth`. */
export function ReagentCarry({ anim, reagent, bottle, mouth, surfaceY, onCommit, onFinish }: {
  anim: Anim
  reagent: ReagentId
  bottle: Vec3
  mouth: Vec3
  surfaceY: number
  onCommit: () => void
  onFinish: () => void
}) {
  const r = REAGENTS[reagent]
  const solid = !!r.solid
  return (
    <Carry
      key={anim.id}
      from={[bottle[0] + (solid ? 0.4 : 0), LIFT, bottle[2]]}
      to={[mouth[0], mouth[1] + 2.2, mouth[2]]}
      tool={solid ? <Spatula color={r.color} /> : <Dropper color={r.color} />}
      action={solid ? 'sprinkle' : 'drip'}
      restRotation={solid ? -0.22 : 0}
      tilt={-1.3}
      lip={solid ? [0, 0.6] : [0, 0]}
      drops={r.dose >= 1 ? 7 : 3}
      color={solid ? r.color : r.color === '#eef3f5' ? '#cfe3ea' : r.color}
      surfaceY={surfaceY}
      onCommit={onCommit}
      onFinish={onFinish}
    />
  )
}
