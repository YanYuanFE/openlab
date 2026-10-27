import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { clickable, rand, smooth, type Vec3 } from '@/kit/core'
import { now, Pointer } from './ch2'
import { INK, Inked, Label, REDUCED } from './ink'
import { useLesson, type Hands, type LessonDef } from './lesson'
import { Atom, Beaker, Molecule, T, type GroupProps } from './models'
import { fml, txt, type Block, type Run } from './print'
import type { Nav, SpreadDef } from './spread'

// Chapter 4: ionic reactions. Salt water and silver nitrate are both seas of ions; mixed, only Ag+ and Cl- meet and
// sink as silver chloride while Na+ and NO3- swim on unchanged.

const BAR = new THREE.BoxGeometry(0.5, 0.12, 0.12)
/** the beaker drawn wide and low, so the ions show from above */
const WIDE: Vec3 = [2.2, 1.25, 2.2]
const SILT = new THREE.CylinderGeometry(4.6, 4.6, 0.5, 48).translate(0, 0.25, 0)

/** An ion: its atom or group with a charge sign printed over it. */
function Ion({ kind, ...g }: { kind: Kind } & GroupProps) {
  const plus = kind === 'na' || kind === 'ag'
  return (
    <group {...g}>
      {kind === 'no3' ? <Molecule f="NO3" scale={0.8} /> : <Atom sym={kind === 'na' ? 'Na' : kind === 'cl' ? 'Cl' : 'Ag'} />}
      <group position={[0.75, 0.95, 0.4]}>
        <Inked geometry={BAR} color={INK} pen={0} />
        {plus && <Inked geometry={BAR} color={INK} pen={0} rotation-z={Math.PI / 2} />}
      </group>
    </group>
  )
}

type Kind = 'na' | 'cl' | 'ag' | 'no3'
const KINDS: Kind[] = ['na', 'cl', 'ag', 'no3']

/** where ion `i` of a kind wanders in the beaker */
const home = (kind: Kind, i: number): Vec3 => {
  const k = KINDS.indexOf(kind) * 3 + i
  const a = k * 2.4 + rand(k) * 0.8
  const d = 1.4 + 3 * rand(k + 20)
  return [Math.cos(a) * d, 1.8 + 2.8 * rand(k + 40), Math.sin(a) * d]
}
/** where pair `i` of silver chloride settles */
const FLOOR: Vec3[] = [
  [-1.6, 1.1, 0.6],
  [0.4, 1.1, -0.8],
  [2.2, 1.1, 0.8],
]

interface BeakerProps {
  counts: Partial<Record<Kind, number>>
  /** when pair i of Ag+ and Cl- met, or null */
  met?: (number | null)[]
  onIon?: (kind: Kind, i: number) => void
}

/** A beaker of solution with its ions swimming; met Ag+/Cl- pairs come together and sink. */
function IonBeaker({ counts, met = [], onIon }: BeakerProps) {
  const refs = useRef<Record<string, THREE.Group | null>>({})
  useFrame(() => {
    const t = now()
    for (const kind of KINDS)
      for (let i = 0; i < (counts[kind] ?? 0); i++) {
        const g = refs.current[`${kind}${i}`]
        if (!g) continue
        const [x, y, z] = home(kind, i)
        const k = KINDS.indexOf(kind) * 3 + i
        const w = REDUCED ? 0 : 1
        const free: Vec3 = [x + w * 0.5 * Math.sin(t * 0.9 + k), y + w * 0.3 * Math.sin(t * 1.3 + k * 2), z + w * 0.5 * Math.cos(t * 0.7 + k)]
        const at = kind === 'ag' || kind === 'cl' ? met[i] : null
        if (at === null || at === undefined) {
          g.position.set(...free)
          continue
        }
        // meet halfway, then settle on the floor side by side
        const u = t - at
        const mid = home('ag', i).map((v, j) => (v + home('cl', i)[j]) / 2)
        const side = kind === 'ag' ? -0.8 : 0.8
        const meet = smooth(u / 1.2)
        const fall = smooth((u - 1.2) / 1.5)
        const p = free.map((v, j) => v + (mid[j] + (j === 0 ? side : 0) - v) * meet)
        g.position.set(...(p.map((v, j) => v + (FLOOR[i][j] + (j === 0 ? side : 0) - v) * fall) as Vec3))
      }
  })
  return (
    <>
      <Beaker clear scale={WIDE} />
      {/* the white precipitate collecting on the bottom */}
      {met.some((m) => m !== null) && <Inked geometry={SILT} color="#f6f4ee" position-y={T * 1.25} scale-y={met.filter((m) => m !== null).length / 3} pen={1} />}
      {KINDS.flatMap((kind) =>
        Array.from({ length: counts[kind] ?? 0 }, (_, i) => (
          <group key={`${kind}${i}`} ref={(g) => void (refs.current[`${kind}${i}`] = g)} {...clickable(onIon && (() => onIon(kind, i)))}>
            <Ion kind={kind} />
          </group>
        )),
      )}
    </>
  )
}

const ION: Record<Kind, string> = { na: 'Na^+', cl: 'Cl^-', ag: 'Ag^+', no3: 'NO3^-' }
const ion = (k: Kind) => fml(ION[k])
const SYMS = ['Na', 'Cl', 'Ag', 'N', 'O']
const ATOMS = { Na: 3, Cl: 3, Ag: 3, N: 3, O: 9 }
const ledger = (caption: string, counts: Record<string, number>, after?: Record<string, number>): Block => ({
  kind: 'ledger',
  caption,
  lit: Object.keys(counts),
  counts,
  after,
  syms: SYMS,
})
const ARROW: Run[] = txt(' = ')
const E: [number, number] = [22, 24]

function Mixing() {
  const [t0] = useState(now)
  return <IonBeaker counts={{ na: 3, cl: 3, ag: 3, no3: 3 }} met={[t0 + 0.6, t0 + 1.4, t0 + 2.2]} />
}

const DEF: LessonDef = {
  n: 4,
  title: '离子反应',
  lead: '食盐、硝酸银溶进水里，就分成了带电的离子，在水中四处游动。把两种溶液倒在一起，真正发生反应的是哪些离子？',
  law: [
    ...txt('离子方程式　', { bold: true }),
    ...ion('ag'),
    ...txt(' + '),
    ...ion('cl'),
    ...ARROW,
    ...fml('AgCl'),
    ...txt('↓。只写实际参加反应的离子；没有变化的 '),
    ...ion('na'),
    ...txt(' 和 '),
    ...ion('no3'),
    ...txt(' 叫旁观离子。'),
  ],
  predict: {
    runs: [
      ...txt('把硝酸银溶液倒进食盐水，立刻生成白色沉淀。溶液里有 '),
      ...ion('na'),
      ...txt('、'),
      ...ion('cl'),
      ...txt('、'),
      ...ion('ag'),
      ...txt('、'),
      ...ion('no3'),
      ...txt(' 四种离子，真正参加反应的是哪些？'),
    ],
    choices: [txt('四种离子都参加'), [...txt('只有 '), ...ion('ag'), ...txt(' 和 '), ...ion('cl')], [...txt('只有 '), ...ion('na'), ...txt(' 和 '), ...ion('no3')]],
    answer: 1,
    why: [...ion('ag'), ...txt(' 和 '), ...ion('cl'), ...txt(' 结合成难溶的氯化银沉了下去；'), ...ion('na'), ...txt(' 和 '), ...ion('no3'), ...txt(' 反应前后都在水里游动，什么也没变。')],
  },
  start: {
    node: (
      <>
        <IonBeaker counts={{ na: 3, cl: 3 }} />
        <Label position={[0, 0, 8]} text="食盐水" />
      </>
    ),
    key: 'salt',
    extent: E,
  },
  figure: '一杯食盐水里的离子',
  demo: [
    {
      node: (
        <>
          <IonBeaker counts={{ na: 3, cl: 3 }} />
          <Label position={[0, 0, 8]} text="食盐水" />
        </>
      ),
      key: 'salt',
      extent: E,
      top: [ledger('食盐水里的原子', { Na: 3, Cl: 3 })],
      runs: [...txt('食盐溶于水，分成带正电的钠离子 '), ...ion('na'), ...txt(' 和带负电的氯离子 '), ...ion('cl'), ...txt('，在水里各自游动。')],
    },
    {
      node: (
        <>
          <IonBeaker counts={{ ag: 3, no3: 3 }} />
          <Label position={[0, 0, 8]} text="硝酸银溶液" />
        </>
      ),
      key: 'silver',
      extent: E,
      top: [ledger('硝酸银溶液里的原子', { Ag: 3, N: 3, O: 9 })],
      runs: [...txt('硝酸银溶液里是银离子 '), ...ion('ag'), ...txt(' 和硝酸根离子 '), ...ion('no3'), ...txt('。一个硝酸根由 1 个氮原子和 3 个氧原子构成，整体带一个负电荷。')],
    },
    {
      node: <Mixing />,
      key: 'mixing',
      extent: E,
      top: [ledger('烧杯里的原子：反应前 → 反应后', ATOMS, ATOMS)],
      runs: [...txt('倒在一起：'), ...ion('ag'), ...txt(' 一碰到 '), ...ion('cl'), ...txt(' 就结合成氯化银，沉到杯底，这就是白色沉淀。')],
    },
    {
      node: (
        <>
          <IonBeaker counts={{ na: 3, cl: 3, ag: 3, no3: 3 }} met={[-1e6, -1e6, -1e6]} />
          <Label position={[0, 0, 8]} text="杯底的白色沉淀是氯化银" />
        </>
      ),
      key: 'settled',
      extent: E,
      top: [ledger('烧杯里的原子：反应前 → 反应后', ATOMS, ATOMS)],
      runs: [...ion('na'), ...txt(' 和 '), ...ion('no3'), ...txt(' 从头到尾没有变化。所以只写真正反应的离子：'), ...ion('ag'), ...txt(' + '), ...ion('cl'), ...ARROW, ...fml('AgCl'), ...txt('↓。')],
    },
  ],
  challenge: {
    runs: [...txt('把氯化钡溶液和硫酸钠溶液混合，生成白色沉淀硫酸钡 '), ...fml('BaSO4'), ...txt('。这个反应的离子方程式是？')],
    choices: [
      [...fml('Ba^2+'), ...txt(' + '), ...fml('SO4^2-'), ...ARROW, ...fml('BaSO4'), ...txt('↓')],
      [...ion('na'), ...txt(' + '), ...ion('cl'), ...ARROW, ...fml('NaCl')],
      [...fml('BaCl2'), ...txt(' + '), ...fml('Na2SO4'), ...ARROW, ...fml('BaSO4'), ...txt('↓ + 2'), ...fml('NaCl')],
    ],
    answer: 0,
    why: [...txt('真正结合的只有 '), ...fml('Ba^2+'), ...txt(' 和 '), ...fml('SO4^2-'), ...txt('；'), ...ion('na'), ...txt(' 和 '), ...ion('cl'), ...txt(' 是旁观离子。第三个是化学方程式，不是离子方程式。')],
  },
}

export function useChapter4(nav: Nav): SpreadDef[] {
  const [met, setMet] = useState<(number | null)[]>([null, null, null])
  const [note, setNote] = useState<Run[] | null>(null)
  const left = met.findIndex((m) => m === null)
  const done = left === -1

  function meet() {
    if (done) return
    setMet(met.map((m, i) => (i === left ? now() : m)))
    setNote([...ion('ag'), ...txt(' 和 '), ...ion('cl'), ...txt(' 结合成氯化银，沉了下去。')])
  }
  function onIon(kind: Kind) {
    if (kind === 'ag' || kind === 'cl') meet()
    else setNote([...ion(kind), ...txt(' 是旁观离子：它不和任何离子结合，一直在水里游动。')])
  }

  const sunk = met.filter((m) => m !== null).length
  const hands: Hands = {
    node: (
      <>
        <IonBeaker counts={{ na: 3, cl: 3, ag: 3, no3: 3 }} met={met} onIon={done ? undefined : onIon} />
        {!done && <Pointer position={[7.6, 4, 0]} left />}
      </>
    ),
    key: 'try',
    extent: E,
    top: [ledger('烧杯里的原子：反应前 → 现在', ATOMS, ATOMS)],
    done,
    foot: [
      { kind: 'label', text: `动手　沉淀 ${sunk} / 3` },
      {
        kind: 'para',
        runs: done
          ? txt('三对都沉下去了。账本里每种原子的个数都没变：离子只是换了位置，原子一个也没少。')
          : (note ?? txt('两种溶液刚倒在一起。点烧杯里的离子，看谁会和谁结合。')),
      },
      ...(done ? [] : [{ kind: 'links', items: [{ id: 'meet', text: '让一对离子结合' }] } as Block]),
    ],
    onHit: (id) => id === 'meet' && meet(),
  }
  return [useLesson(nav, DEF, hands)]
}

