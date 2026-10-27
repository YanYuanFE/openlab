import { useState } from 'react'
import * as THREE from 'three'
import { atomsOf, massOf } from './atoms'
import { Balance } from './ch2'
import { Inked, Label } from './ink'
import { useLesson, type Hands, type LessonDef } from './lesson'
import { Beaker, WATER_COLOR } from './models'
import { fml, txt, type Block, type Run } from './print'
import type { Nav, SpreadDef } from './spread'

// Chapter 3: the mole. Equal numbers of atoms weigh their relative masses in grams; then weigh out amounts yourself.

const AVOGADRO: Run[] = [...txt('6.02×10'), { t: '23', sup: true }]

const DISH = new THREE.CylinderGeometry(3, 2.7, 0.25, 48)
const HEAP = new THREE.ConeGeometry(1.7, 1.3, 40, 1)
// water column one unit tall standing on y = 0
const WATER = new THREE.CylinderGeometry(2.45, 2.45, 1, 48).translate(0, 0.5, 0)
const POWDER: Record<string, string> = { C: '#55524c', Fe: '#8d939b', NaCl: '#fbfaf6' }

/** `g` grams of a substance: a heap on a dish, or water in a small beaker. */
function Sample({ f, g, position }: { f: string; g: number; position?: [number, number, number] }) {
  if (f === 'H2O')
    return (
      <group position={position} scale={0.75}>
        {g > 0 && <Inked geometry={WATER} color={WATER_COLOR} position-y={0.12} scale-y={Math.min(g * 0.18, 6)} />}
        <Beaker water={false} />
      </group>
    )
  // volume grows with mass, so the heap's size goes with its cube root
  const s = Math.cbrt(g / 30)
  return (
    <group position={position}>
      <Inked geometry={DISH} color="#e6dfd0" position-y={0.12} />
      {g > 0 && <Inked geometry={HEAP} color={POWDER[f]} position-y={0.25 + 0.65 * s} scale={s} />}
    </group>
  )
}

function Weighed({ f, g, label }: { f: string; g: number; label: string }) {
  return (
    <>
      <Balance reading={() => g}>
        <Sample f={f} g={g} />
      </Balance>
      <Label position={[0, 0, 8.6]} text={label} />
    </>
  )
}

/** Samples side by side with their captions. */
function Row({ items, note }: { items: [string, number, string][]; note: string }) {
  return (
    <>
      {items.map(([f, g, label], i) => (
        <group key={f}>
          <Sample f={f} g={g} position={[(i - 1) * 10, 0, 0]} />
          <Label position={[(i - 1) * 10, 0, 5]} text={label} />
        </group>
      ))}
      <Label position={[0, 0, 8.5]} text={note} bold />
    </>
  )
}

const ONE_MOL = (sym: Record<string, number>, caption: string): Block => ({ kind: 'ledger', caption, lit: Object.keys(sym), counts: sym })

const DEF: LessonDef = {
  n: 3,
  title: '物质的量',
  lead: '原子太小，一个一个数不过来。化学家像论「打」卖鸡蛋那样，把一大堆微粒算作一份来数，这一份叫作 1 摩尔。',
  law: [
    ...txt('物质的量　', { bold: true }),
    ...txt('1 mol 任何物质都含有 '),
    ...AVOGADRO,
    ...txt(' 个微粒。摩尔质量 M 以 g/mol 为单位时，数值等于相对原子质量或相对分子质量；n = m / M。'),
  ],
  predict: {
    runs: [...txt('12 g 碳含有 '), ...AVOGADRO, ...txt(' 个碳原子。一个铁原子的质量是碳原子的 56/12 倍，那么 56 g 铁里有多少个铁原子？')],
    choices: [txt('更多：铁更重'), txt('一样多'), txt('更少')],
    answer: 1,
    why: txt('每个铁原子重 56/12 倍，56 g 也正好是 12 g 的 56/12 倍，所以原子一样多：都是 1 mol。'),
  },
  start: { node: <Weighed f="C" g={12} label="12 g 碳粉" />, key: 'carbon' },
  figure: '天平上的 12 g 碳粉',
  demo: [
    {
      node: <Weighed f="C" g={12} label="12 g 碳粉" />,
      key: 'carbon',
      top: [ONE_MOL({ C: 1 }, '托盘上的原子（每个点是 1 mol）')],
      runs: [...txt('天平上是 12 g 碳粉，里面恰好有 '), ...AVOGADRO, ...txt(' 个碳原子。这么多个微粒叫作 1 摩尔，写作 1 mol。')],
    },
    {
      node: <Weighed f="Fe" g={56} label="56 g 铁粉" />,
      key: 'iron',
      top: [ONE_MOL({ Fe: 1 }, '托盘上的原子（每个点是 1 mol）')],
      runs: txt('换成 56 g 铁粉：铁原子同样是 1 mol。一个铁原子比一个碳原子重，所以同样多的铁原子也更重。'),
    },
    {
      node: <Row items={[['C', 12, '12 g 碳'], ['Fe', 56, '56 g 铁'], ['H2O', 18, '18 g 水']]} note="各 1 mol" />,
      key: 'three',
      extent: [34, 22],
      top: [ONE_MOL({ C: 1, Fe: 1, H: 2, O: 1 }, '三份里的原子（每个点是 1 mol）')],
      runs: txt('1 mol 物质的质量，以克为单位时，在数值上等于它的相对原子质量或相对分子质量。这个量叫摩尔质量 M：碳 12 g/mol，铁 56 g/mol，水 18 g/mol。'),
    },
    {
      node: <Weighed f="H2O" g={18} label="18 g 水" />,
      key: 'water',
      top: [ONE_MOL({ H: 2, O: 1 }, '1 mol 水里的原子（每个点是 1 mol）')],
      runs: [...txt('水 '), ...fml('H2O'), ...txt(' 的相对分子质量是 1×2 + 16 = 18，所以 18 g 水是 1 mol 水分子，里面有 2 mol 氢原子和 1 mol 氧原子。')],
    },
  ],
  challenge: {
    runs: [...txt('二氧化碳 '), ...fml('CO2'), ...txt(' 的摩尔质量是 44 g/mol。0.5 mol 二氧化碳的质量是多少？')],
    choices: [txt('22 g'), txt('44 g'), txt('88 g')],
    answer: 0,
    why: txt('m = n × M = 0.5 mol × 44 g/mol = 22 g。'),
  },
}

const NAMES: Record<string, string> = { H2O: '水', Fe: '铁', NaCl: '食盐' }
const TARGETS: [string, number][] = [
  ['H2O', 1],
  ['Fe', 0.5],
  ['NaCl', 2],
]
const STEPS: Record<string, number> = { add10: 10, add1: 1, sub1: -1 }
const mol = (n: number) => `${Number(n.toFixed(2))} mol`

export function useChapter3(nav: Nav): SpreadDef[] {
  const [k, setK] = useState(0)
  const [g, setG] = useState(0)
  const [f, n] = TARGETS[Math.min(k, TARGETS.length - 1)]
  const M = massOf(f)
  const hit = g === M * n
  const done = k === TARGETS.length

  const hands: Hands = {
    ...(done
      ? { node: <Row items={TARGETS.map(([f, n]) => [f, massOf(f) * n, `${mol(n)} ${NAMES[f]}`])} note="称对的三份" />, key: 'weighed', extent: [34, 22] }
      : { node: <Weighed f={f} g={g} label={`称 ${NAMES[f]}`} />, key: `weigh-${k}` }),
    top: [{ kind: 'ledger', caption: `托盘上：n = ${g} g ÷ ${M} g/mol = ${mol(g / M)}`, lit: Object.keys(atomsOf(f)), counts: {} }],
    done,
    foot: done
      ? [
          { kind: 'label', text: '动手　3 / 3' },
          { kind: 'para', runs: txt('三份都称对了：同样是数微粒，用天平代替了一个一个地数。') },
        ]
      : [
          { kind: 'label', text: `动手　${k} / ${TARGETS.length}` },
          {
            kind: 'para',
            runs: [
              ...txt(`称出 ${mol(n)} ${NAMES[f]} `),
              ...fml(f),
              ...txt(hit ? `：正好 ${g} g。` : `（M = ${M} g/mol）。现在 ${g} g。`),
            ],
          },
          {
            kind: 'links',
            items: hit
              ? [{ id: 'weighed', text: k < TARGETS.length - 1 ? '下一份 →' : '完成 →' }]
              : [
                  { id: 'add10', text: '+10 g' },
                  { id: 'add1', text: '+1 g' },
                  { id: 'sub1', text: '−1 g', disabled: g === 0 },
                  { id: 'clear', text: '倒掉', disabled: g === 0 },
                ],
          },
        ],
    onHit: (id) => {
      if (id in STEPS) setG(Math.max(g + STEPS[id], 0))
      else if (id === 'clear') setG(0)
      else if (id === 'weighed') (setK(k + 1), setG(0))
    },
  }
  return [useLesson(nav, DEF, hands)]
}
