import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { clickable, type Vec3 } from '@/kit/core'
import { Pointer } from './ch2'
import { Inked, Label } from './ink'
import { useLesson, type Hands, type LessonDef } from './lesson'
import { Atom } from './models'
import { fml, txt, type Block, type Run } from './print'
import type { Nav, SpreadDef } from './spread'

// Chapter 6: reaction heat from bond energies. Pull H2 and Cl2 apart (energy in), let the atoms bond as HCl (energy
// out); the released bar ends taller than the absorbed one, and the difference is the heat given off.

/** bond energies, kJ/mol */
const HH = 436
const CLCL = 243
const HCL = 431

interface State {
  hh: boolean
  clcl: boolean
  /** H–Cl bonds formed, 0–2 */
  formed: number
}

type Name = 'H0' | 'H1' | 'Cl0' | 'Cl1'
const NAMES: Name[] = ['H0', 'H1', 'Cl0', 'Cl1']
const SPOT: Record<Name, { whole: Vec3; apart: Vec3; bonded: Vec3 }> = {
  H0: { whole: [-8, 2, 0], apart: [-9, 2, -2.6], bonded: [-4.6, 2, -4.2] },
  H1: { whole: [-6.4, 2, 0], apart: [-6, 2, 2.6], bonded: [-4.6, 2, 4.2] },
  Cl0: { whole: [-1.3, 2, 0], apart: [-1.6, 2, -2.2], bonded: [-2.2, 2, -4.2] },
  Cl1: { whole: [1.3, 2, 0], apart: [1.8, 2, 2.4], bonded: [-2.2, 2, 4.2] },
}
const target = (n: Name, s: State): Vec3 => {
  const k = Number(n.at(-1))
  if (s.formed > k) return SPOT[n].bonded
  return (n[0] === 'H' ? s.hh : s.clcl) ? SPOT[n].apart : SPOT[n].whole
}
const BONDS: [Name, Name, (s: State) => boolean][] = [
  ['H0', 'H1', (s) => !s.hh],
  ['Cl0', 'Cl1', (s) => !s.clcl],
  ['H0', 'Cl0', (s) => s.formed > 0],
  ['H1', 'Cl1', (s) => s.formed > 1],
]
const absorbed = (s: State) => (s.hh ? HH : 0) + (s.clcl ? CLCL : 0)
const released = (s: State) => s.formed * HCL

const STICK = new THREE.CylinderGeometry(0.16, 0.16, 1, 12)
const BAR = new THREE.BoxGeometry(1.8, 1, 1.8).translate(0, 0.5, 0)
const UP = new THREE.Vector3(0, 1, 0)
/** bar height per kJ */
const KJ = 1 / 110

function BondScene({ s, onAtom }: { s: State; onAtom?: (n: Name) => void }) {
  const atoms = useRef<Partial<Record<Name, THREE.Group | null>>>({})
  const sticks = useRef<(THREE.Group | null)[]>([])
  const bars = useRef<(THREE.Group | null)[]>([])
  const v = new THREE.Vector3()
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 3)
    for (const n of NAMES) atoms.current[n]?.position.lerp(v.set(...target(n, s)), k)
    BONDS.forEach(([a, b, on], i) => {
      const g = sticks.current[i]
      const pa = atoms.current[a]?.position
      const pb = atoms.current[b]?.position
      if (!g || !pa || !pb) return
      g.visible = on(s)
      v.subVectors(pb, pa)
      g.position.copy(pa).addScaledVector(v, 0.5)
      g.scale.set(1, v.length(), 1)
      g.quaternion.setFromUnitVectors(UP, v.normalize())
    })
    ;[absorbed(s), released(s)].forEach((kj, i) => {
      const g = bars.current[i]
      if (g) g.scale.y += (Math.max(kj * KJ, 0.001) - g.scale.y) * k
    })
  })
  return (
    <>
      {NAMES.map((n) => (
        <group key={n} ref={(g) => void (atoms.current[n] = g)} position={target(n, { hh: false, clcl: false, formed: 0 })} {...clickable(onAtom && (() => onAtom(n)))}>
          <Atom sym={n[0] === 'H' ? 'H' : 'Cl'} scale={n[0] === 'H' ? 0.7 : 1.1} />
        </group>
      ))}
      {BONDS.map((_, i) => (
        <group key={i} ref={(g) => void (sticks.current[i] = g)}>
          <Inked geometry={STICK} color="#cfc6b4" pen={1} />
        </group>
      ))}
      {(
        [
          ['#7d97c9', 5.6, '吸收', absorbed(s)],
          ['#d2604f', 10.4, '放出', released(s)],
        ] as const
      ).map(([color, x, verb, kj], i) => (
        <group key={i}>
          <group ref={(g) => void (bars.current[i] = g)} position={[x, 0, 0]} scale-y={0.001}>
            <Inked geometry={BAR} color={color} />
          </group>
          <Label position={[x, 0, 2.6]} text={verb} />
          <Label position={[x, 0, 4.4]} text={`${kj} kJ`} />
        </group>
      ))}
      <Label position={[-7.2, 0, 6]} text={s.formed ? '2 HCl' : s.hh ? 'H + H' : ''} formula={s.hh ? '' : 'H2'} />
    </>
  )
}

const WHOLE: State = { hh: false, clcl: false, formed: 0 }
const APART: State = { hh: true, clcl: true, formed: 0 }
const DONE: State = { hh: true, clcl: true, formed: 2 }
const E: [number, number] = [26, 16]
const SYMS = ['H', 'Cl']
const atomLedger = (caption: string): Block => ({ kind: 'ledger', caption, lit: SYMS, counts: { H: 2, Cl: 2 }, after: { H: 2, Cl: 2 }, syms: SYMS })
const EQ: Run[] = [...fml('H2'), ...txt(' + '), ...fml('Cl2'), ...txt(' = 2'), ...fml('HCl')]

const DEF: LessonDef = {
  n: 6,
  title: '化学能与热',
  lead: '氢气在氯气中安静地燃烧，发出苍白色火焰，放出大量的热。原子还是那几个原子，热量从哪里来？',
  law: [
    ...txt('反应热　', { bold: true }),
    ...txt('断开化学键要吸收能量，形成化学键要放出能量。放出的比吸收的多，反应放热；吸收的比放出的多，反应吸热。'),
  ],
  predict: {
    runs: [
      ...EQ,
      ...txt(`。断开 1 mol H–H 键和 1 mol Cl–Cl 键共吸收 ${HH + CLCL} kJ；形成 2 mol H–Cl 键放出 ${2 * HCL} kJ。这个反应？`),
    ],
    choices: [txt(`放热 ${2 * HCL - HH - CLCL} kJ`), txt(`吸热 ${2 * HCL - HH - CLCL} kJ`), txt('不吸热也不放热')],
    answer: 0,
    why: txt(`成键放出的 ${2 * HCL} kJ 比断键吸收的 ${HH + CLCL} kJ 多，多出的 ${2 * HCL - HH - CLCL} kJ 以热的形式放出来。`),
  },
  start: { node: <BondScene s={WHOLE} />, key: 'whole', extent: E },
  figure: '一个氢分子和一个氯分子',
  demo: [
    {
      node: <BondScene s={WHOLE} />,
      key: 'whole',
      extent: E,
      top: [atomLedger('原子账本：反应前 → 反应后')],
      runs: [...txt('一个氢分子 '), ...fml('H2'), ...txt('、一个氯分子 '), ...fml('Cl2'), ...txt('。原子之间的小棍是化学键，它把两个原子拉在一起。')],
    },
    {
      node: <BondScene s={APART} />,
      key: 'apart',
      extent: E,
      top: [atomLedger('原子账本：反应前 → 反应后')],
      runs: txt(`先把键拉断：断开 H–H 要吸收 ${HH} kJ，断开 Cl–Cl 要吸收 ${CLCL} kJ（都按 1 mol 计），一共 ${HH + CLCL} kJ。`),
    },
    {
      node: <BondScene s={DONE} />,
      key: 'bonded',
      extent: E,
      top: [atomLedger('原子账本：反应前 → 反应后')],
      runs: txt(`散开的原子重新成键，变成 2 个 HCl。每形成 1 mol H–Cl 键放出 ${HCL} kJ，两个一共放出 ${2 * HCL} kJ。`),
    },
    {
      node: <BondScene s={DONE} />,
      key: 'bonded',
      extent: E,
      top: [atomLedger('原子账本：反应前 → 反应后')],
      runs: [...txt(`红柱比蓝柱高 ${2 * HCL - HH - CLCL} kJ：这就是 `), ...EQ, ...txt(' 放出的热。原子一个没少，变的是化学键里储存的能量。')],
    },
  ],
  challenge: {
    runs: [
      ...txt('合成氨 '),
      ...fml('N2'),
      ...txt(' + 3'),
      ...fml('H2'),
      ...txt(' = 2'),
      ...fml('NH3'),
      ...txt('：断开 1 mol N≡N 吸收 946 kJ，断开 1 mol H–H 吸收 436 kJ，形成 1 mol N–H 放出 391 kJ。生成 2 mol 氨气时？'),
    ],
    choices: [txt('放热 92 kJ'), txt('吸热 92 kJ'), txt('放热 2346 kJ')],
    answer: 0,
    why: [...txt('吸收 946 + 3 × 436 = 2254 kJ；2 个 '), ...fml('NH3'), ...txt(' 有 6 个 N–H 键，放出 6 × 391 = 2346 kJ。放出的多 92 kJ，所以放热 92 kJ。')],
  },
}

export function useChapter6(nav: Nav): SpreadDef[] {
  const [s, setS] = useState<State>(WHOLE)
  const done = s.formed === 2
  const apart = s.hh && s.clcl
  function act(id: string) {
    if (id === 'break-hh') setS({ ...s, hh: true })
    else if (id === 'break-clcl') setS({ ...s, clcl: true })
    else if (id === 'form' && apart && !done) setS({ ...s, formed: s.formed + 1 })
  }
  const onAtom = (n: Name) => act(apart ? 'form' : n[0] === 'H' ? 'break-hh' : 'break-clcl')
  const net = released(s) - absorbed(s)
  const hands: Hands = {
    node: (
      <>
        <BondScene s={s} onAtom={done ? undefined : onAtom} />
        {!done && <Pointer position={apart ? [-4.6, 5, s.formed ? 4.2 : -4.2] : s.hh ? [0, 5, 0] : [-7.2, 5, 0]} />}
      </>
    ),
    key: 'try',
    extent: E,
    top: [atomLedger('原子账本：反应前 → 现在')],
    done,
    foot: [
      { kind: 'label', text: `动手　吸收 ${absorbed(s)} kJ，放出 ${released(s)} kJ` },
      {
        kind: 'para',
        runs: done
          ? txt(`净放出 ${net} kJ。先付出能量断键，再从成键里收回更多：这个反应放热。`)
          : apart
            ? txt('两个分子都拆开了。点原子，让一个 H 和一个 Cl 成键。')
            : txt('点分子里的原子，把它的化学键拉断。'),
      },
      {
        kind: 'links',
        items: [
          { id: 'break-hh', text: '断开 H–H', disabled: s.hh },
          { id: 'break-clcl', text: '断开 Cl–Cl', disabled: s.clcl },
          { id: 'form', text: '形成 H–Cl', disabled: !apart || done },
        ],
      },
    ],
    onHit: act,
  }
  return [useLesson(nav, DEF, hands)]
}
