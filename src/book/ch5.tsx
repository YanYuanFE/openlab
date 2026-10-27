import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { clickable, smooth, type Vec3 } from '@/kit/core'
import { Bubbles, now, Pointer } from './ch2'
import { INK, Inked, Label, PopBasic, REDUCED } from './ink'
import { useLesson, type Hands, type LessonDef } from './lesson'
import { Atom, Beaker, T } from './models'
import { fml, txt, type Block, type Run } from './print'
import type { Nav, SpreadDef } from './spread'

// Chapter 5: redox as an electron ledger. Sodium in water: each Na hands its outer electron to a hydrogen of a water
// molecule; two such hydrogens pair up as H2. Electrons lost equal electrons gained.


const BAR = new THREE.BoxGeometry(0.5, 0.12, 0.12)
const ELECTRON = new THREE.SphereGeometry(0.2, 16, 12)

/** A charge sign floating by an atom; `plus` adds the upright bar. */
function Sign({ plus, ...g }: { plus: boolean; position: Vec3 }) {
  return (
    <group {...g}>
      <Inked geometry={BAR} color={INK} pen={0} />
      {plus && <Inked geometry={BAR} color={INK} pen={0} rotation-z={Math.PI / 2} />}
    </group>
  )
}

const NA: Vec3[] = [
  [-7, 2.2, -2.4],
  [-7, 2.2, 2.4],
]
const WATER: Vec3[] = [
  [2, 2, -2.4],
  [2, 2, 2.4],
]
const H_OUT: Vec3 = [0.63, 0.49, 0]
const H_IN: Vec3 = [-0.63, 0.49, 0]
const H2_AT: Vec3 = [8, 3.5, 0]
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mix = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

/** Two sodium atoms and two water molecules; `gave[i]` is when sodium i handed over its electron. */
function ElectronScene({ gave, onNa }: { gave: (number | null)[]; onNa?: (i: number) => void }) {
  const e = useRef<(THREE.Mesh | null)[]>([])
  const h = useRef<(THREE.Group | null)[]>([])
  const both = gave.every((g) => g !== null) ? Math.max(...(gave as number[])) + 1.3 : null
  useFrame(() => {
    const t = now()
    const spin = REDUCED ? 0 : t * 3
    for (let i = 0; i < 2; i++) {
      // the hydrogen that leaves its water: it pairs with the other one once both have their electrons
      const k = both === null ? 0 : smooth((t - both) / 1.4)
      const pair: Vec3 = add(H2_AT, [i ? 0.35 : -0.35, 0, 0])
      const hp = mix(add(WATER[i], H_OUT), pair, k)
      h.current[i]?.position.set(...hp)
      const m = e.current[i]
      if (!m) continue
      const orbit = (c: Vec3, r: number): Vec3 => add(c, [r * Math.cos(spin + i * 3), 0.3, r * Math.sin(spin + i * 3)])
      const g = gave[i]
      const u = g === null ? 0 : smooth((t - g) / 1)
      const p = mix(orbit(NA[i], 1.5), orbit(hp, 0.7), u)
      // a little hop over the gap
      m.position.set(p[0], p[1] + 2.5 * Math.sin(Math.PI * u), p[2])
    }
  })
  return (
    <>
      {NA.map((p, i) => (
        <group key={i} {...clickable(onNa && gave[i] === null ? () => onNa(i) : undefined)}>
          <Atom sym="Na" position={p} />
          {gave[i] !== null && <Sign plus position={add(p, [0.9, 1.1, 0.5])} />}
          <mesh visible={false} position={p}>
            <boxGeometry args={[3.4, 3, 3.4]} />
          </mesh>
        </group>
      ))}
      {WATER.map((p, i) => (
        <group key={i}>
          <Atom sym="O" position={p} />
          <Atom sym="H" position={add(p, H_IN)} />
          {gave[i] !== null && <Sign plus={false} position={add(p, [-0.2, 1.2, 0.6])} />}
        </group>
      ))}
      {[0, 1].map((i) => (
        <group key={i} ref={(g) => void (h.current[i] = g)} position={add(WATER[i], H_OUT)}>
          <Atom sym="H" />
        </group>
      ))}
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => void (e.current[i] = m)} geometry={ELECTRON}>
          <PopBasic color={INK} />
        </mesh>
      ))}
      <Label position={[-7, 0, 5.4]} text="钠原子" />
      <Label position={[2, 0, 5.4]} text={gave.some((g) => g !== null) ? '水分子 → OH' : '水分子'} formula={gave.some((g) => g !== null) ? '^-' : ''} />
      {both !== null && <Label position={[8, 0, 2.4]} text="" formula="H2" bold />}
    </>
  )
}

function Giving() {
  const [t0] = useState(now)
  return <ElectronScene gave={[t0 + 0.6, t0 + 2]} />
}

const CHUNK = new THREE.BoxGeometry(1.4, 0.7, 1.1)

/** A grain of sodium skating round the water surface, fizzing. */
function Skating() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = REDUCED ? 0 : now()
    ref.current?.position.set(1.3 * Math.cos(t * 1.4), T + 4.2 + 0.25, 1.3 * Math.sin(t * 1.9))
  })
  return (
    <>
      <Beaker />
      <group ref={ref}>
        <Inked geometry={CHUNK} color="#cfc8d8" />
        <Bubbles r={0.8} y0={-0.6} y1={0.6} level={() => 1} />
      </group>
    </>
  )
}

const SYMS = ['H', 'O', 'Na']
const ATOMS = { H: 4, O: 2, Na: 2 }
const atomLedger = (caption: string): Block => ({ kind: 'ledger', caption, lit: SYMS, counts: ATOMS, after: ATOMS, syms: SYMS })
const NA_EQ: Run[] = [...txt('2Na + 2'), ...fml('H2O'), ...txt(' = 2'), ...fml('NaOH'), ...txt(' + '), ...fml('H2'), ...txt('↑')]
const E: [number, number] = [20, 14]

const DEF: LessonDef = {
  n: 5,
  title: '氧化还原',
  lead: '一小块钠放进水里，浮在水面上四处游动，嘶嘶作响，放出氢气。反应里，原子之间除了换搭档，还交换了什么？',
  law: [
    ...txt('氧化还原　', { bold: true }),
    ...txt('失去电子的物质被氧化，是还原剂；得到电子的物质被还原，是氧化剂。一个反应里，失去的电子总数等于得到的电子总数。'),
  ],
  predict: {
    runs: [...NA_EQ, ...txt('。反应中，谁失去了电子？')],
    choices: [txt('钠'), txt('氢'), txt('氧')],
    answer: 0,
    why: [...txt('钠原子最外层只有 1 个电子，很容易失去，变成 '), ...fml('Na^+'), ...txt('。水里的氢得到电子，两个氢原子结合成氢气。氧在反应前后都没有得失电子。')],
  },
  start: { node: <Skating />, key: 'skate', extent: [24, 22] },
  figure: '钠在水面上游动',
  demo: [
    {
      node: <Skating />,
      key: 'skate',
      extent: [24, 22],
      runs: txt('钠比水轻，浮在水面上，一边熔成小球四处游动，一边放出气体。点燃这种气体会听到轻微的爆鸣：是氢气。'),
    },
    {
      node: <ElectronScene gave={[null, null]} />,
      key: 'before',
      extent: E,
      top: [atomLedger('原子账本：反应前 → 反应后')],
      runs: txt('放大来看：每个钠原子最外层有 1 个电子（小黑点），它离原子核远，很容易被拿走。'),
    },
    {
      node: <Giving />,
      key: 'giving',
      extent: E,
      top: [atomLedger('原子账本：反应前 → 反应后')],
      runs: [...txt('钠把电子交给水里的一个氢，自己变成 '), ...fml('Na^+'), ...txt('；水分子剩下 '), ...fml('OH^-'), ...txt('。两个得到电子的氢原子结合成一个 '), ...fml('H2'), ...txt(' 分子。')],
    },
    {
      node: <ElectronScene gave={[-1e6, -1e6]} />,
      key: 'after',
      extent: E,
      top: [atomLedger('原子账本：反应前 → 反应后')],
      runs: [...txt('电子账本：钠失去 2 个电子，氢得到 2 个电子，一个不多，一个不少。原子账本也一样平：'), ...NA_EQ, ...txt('。')],
    },
  ],
  challenge: {
    runs: [...txt('把铁钉放进硫酸铜溶液，铁钉表面变红：Fe + '), ...fml('CuSO4'), ...txt(' = '), ...fml('FeSO4'), ...txt(' + Cu。铁在反应中？')],
    choices: [txt('失去电子，是还原剂'), txt('得到电子，是氧化剂'), txt('既不得电子也不失电子')],
    answer: 0,
    why: [...txt('铁原子失去 2 个电子变成 '), ...fml('Fe^2+'), ...txt('，'), ...fml('Cu^2+'), ...txt(' 得到这 2 个电子变成铜。失去电子的铁是还原剂。')],
  },
}

export function useChapter5(nav: Nav): SpreadDef[] {
  const [gave, setGave] = useState<(number | null)[]>([null, null])
  const n = gave.filter((g) => g !== null).length
  const done = n === 2
  const give = (i: number) => setGave(gave.map((g, j) => (j === i ? now() : g)))
  const hands: Hands = {
    node: (
      <>
        <ElectronScene gave={gave} onNa={done ? undefined : give} />
        {!done && <Pointer position={[-7, 6.5, gave[0] === null ? -2.4 : 2.4]} />}
      </>
    ),
    key: 'try',
    extent: E,
    top: [atomLedger('原子账本：反应前 → 现在')],
    done,
    foot: [
      { kind: 'label', text: `动手　电子账本：钠失去 ${n} 个，氢得到 ${n} 个` },
      {
        kind: 'para',
        runs: done
          ? [...txt('两个氢原子都拿到了电子，结合成 '), ...fml('H2'), ...txt(' 飞走了。失去的电子和得到的电子一样多。')]
          : n === 1
            ? txt('一个氢拿到了电子，但单个氢原子还凑不成氢气。再点另一个钠原子。')
            : txt('点一个钠原子，让它交出最外层的电子。'),
      },
      ...(done ? [] : [{ kind: 'links', items: [{ id: 'give', text: '让钠交出电子' }] } as Block]),
    ],
    onHit: (id) => id === 'give' && give(gave.findIndex((g) => g === null)),
  }
  return [useLesson(nav, DEF, hands)]
}
