import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { clickable, lathe, rand, type Vec3 } from '@/kit/core'
import { now, Pointer } from './ch2'
import { Glass, Ink, Inked, Label, REDUCED } from './ink'
import { useLesson, type Hands, type LessonDef } from './lesson'
import { Beaker, Molecule } from './models'
import { fml, txt, type Block, type Run } from './print'
import type { Nav, SpreadDef } from './spread'

// Chapter 8: dynamic equilibrium, 2NO2 ⇌ N2O4. Six pairs of NO2 keep joining and splitting in a sealed flask; cold
// shifts the balance to colourless N2O4, heat back to brown NO2, and the swapping never stops.

type Temp = 'cold' | 'room' | 'hot'
/** pairs joined as N2O4 at each temperature, out of PAIRS */
const JOINED: Record<Temp, number> = { cold: 5, room: 3, hot: 1 }
const PAIRS = 6
const no2 = (t: Temp) => (PAIRS - JOINED[t]) * 2

const C = 4.2
const R = 3.8
const FLASK = lathe(
  [
    [0, C - R],
    ...Array.from({ length: 24 }, (_, i): [number, number] => {
      const a = -Math.PI / 2 + (i / 23) * (Math.PI / 2 + Math.asin(0.95 / R))
      return [R * Math.cos(a), C + R * Math.sin(a)]
    }),
    [0.95, 11],
    [1.2, 11.1],
  ],
  48,
)
const GAS = new THREE.SphereGeometry(R - 0.15, 32, 20)
const STOPPER = new THREE.CylinderGeometry(1.2, 0.95, 1.4, 24)
const ICE = new THREE.BoxGeometry(1.4, 1.1, 1.4)
const HOMES: Vec3[] = Array.from({ length: PAIRS }, (_, p) => {
  const a = p * 2.4
  const r = p ? 2.2 : 0
  return [Math.cos(a) * r, C - 1.8 + p * 0.7, Math.sin(a) * r]
})

/** The sealed flask in a bath at `temp`; pairs of NO2 join and split, a fixed number joined at any moment. */
function Equilibrium({ temp, onFlask }: { temp: Temp; onFlask?: () => void }) {
  const a = useRef<(THREE.Group | null)[]>([])
  const b = useRef<(THREE.Group | null)[]>([])
  const sep = useRef<number[]>(Array(PAIRS).fill(0))
  useFrame(({ clock }, dt) => {
    const t = REDUCED ? 0 : now()
    // which pairs are joined rotates every couple of seconds: one splits as another joins
    const shift = Math.floor(t / 1.8)
    for (let p = 0; p < PAIRS; p++) {
      const joined = (((p - shift) % PAIRS) + PAIRS) % PAIRS < JOINED[temp]
      sep.current[p] += ((joined ? 0 : 1) - sep.current[p]) * (1 - Math.exp(-dt * 4))
      const s = sep.current[p]
      const [x, y, z] = HOMES[p]
      const w = REDUCED ? 0 : 1
      const drift = (k: number) => w * 0.35 * Math.sin(clock.elapsedTime * (0.8 + rand(p + k)) + p * 3 + k)
      const ga = a.current[p]
      const gb = b.current[p]
      if (!ga || !gb) continue
      ga.position.set(x - 1.1 * s + drift(1), y + 0.42 + 0.3 * s + drift(2), z + drift(3))
      gb.position.set(x + 1.1 * s - drift(1), y - 0.42 - 0.3 * s - drift(2), z - drift(3))
      // joined, the two N face each other; apart, they tumble
      ga.rotation.set(s * t * 1.2, s * t * 0.7, Math.PI)
      gb.rotation.set(-s * t, s * t * 0.9, 0)
    }
  })
  const bath = temp !== 'room'
  return (
    <>
      <group {...clickable(onFlask)}>
        <mesh geometry={GAS} position-y={C} renderOrder={1}>
          <Ink color="#a5532c" transparent opacity={0.06 + 0.06 * no2(temp)} depthWrite={false} />
        </mesh>
        {HOMES.map((_, p) => (
          <group key={p}>
            <group ref={(g) => void (a.current[p] = g)}>
              <Molecule f="NO2" scale={0.52} />
            </group>
            <group ref={(g) => void (b.current[p] = g)}>
              <Molecule f="NO2" scale={0.52} />
            </group>
          </group>
        ))}
        <Glass geometry={FLASK} />
        <Inked geometry={STOPPER} color="#6e5d52" position-y={11.4} />
      </group>
      {bath && (
        <>
          <Beaker clear scale={[2.6, 0.75, 2.6]} position-y={-0.1} />
          {temp === 'cold' &&
            [0, 1, 2, 3, 4].map((i) => (
              <Inked key={i} geometry={ICE} color="#eef4f6" position={[Math.cos(i * 1.3 + 0.4) * 5, 2.4, Math.sin(i * 1.3 + 0.4) * 5]} rotation-y={i} />
            ))}
        </>
      )}
      <Label position={[0, 0, 8.4]} text={temp === 'cold' ? '冰水里' : temp === 'hot' ? '热水里' : '室温'} />
    </>
  )
}

const E: [number, number] = [20, 22]
const SYMS = ['N', 'O']
const atoms = (caption: string): Block => ({ kind: 'ledger', caption, lit: SYMS, counts: { N: 12, O: 24 }, after: { N: 12, O: 24 }, syms: SYMS })
const EQ: Run[] = [...txt('2'), ...fml('NO2'), ...txt(' ⇌ '), ...fml('N2O4')]
const count = (t: Temp): Run[] => [...fml('NO2'), ...txt(` ${no2(t)} 个，`), ...fml('N2O4'), ...txt(` ${JOINED[t]} 个`)]

const DEF: LessonDef = {
  n: 8,
  title: '反应速率与平衡',
  lead: '二氧化氮是红棕色的气体。两个二氧化氮分子可以结合成无色的四氧化二氮，四氧化二氮又会分开。两个方向同时进行的反应，叫可逆反应。',
  law: [
    ...txt('化学平衡　', { bold: true }),
    ...txt('正反应和逆反应的速率相等，各物质的浓度不再改变，但反应并没有停止。改变温度，平衡向减弱这种改变的方向移动。'),
  ],
  predict: {
    runs: [...txt('把装着 '), ...fml('NO2'), ...txt(' 的密闭烧瓶放进冰水里（'), ...fml('NO2'), ...txt(' 结合成 '), ...fml('N2O4'), ...txt(' 会放热）。瓶里的颜色会？')],
    choices: [txt('变深'), txt('变浅'), txt('不变')],
    answer: 1,
    why: [...txt('降温时，平衡向放热的方向移动：更多 '), ...fml('NO2'), ...txt(' 结合成无色的 '), ...fml('N2O4'), ...txt('，颜色变浅。但不会完全变成无色，因为两个方向一直都在进行。')],
  },
  start: { node: <Equilibrium temp="room" />, key: 'room', extent: E },
  figure: '密闭烧瓶里的二氧化氮',
  demo: [
    {
      node: <Equilibrium temp="room" />,
      key: 'room',
      extent: E,
      top: [atoms('瓶里的原子：一直是这么多')],
      runs: [...txt('室温下，瓶里的分子两两结合、又不停分开：'), ...EQ, ...txt('。每一刻结合的和分开的一样多，所以颜色不变。')],
    },
    {
      node: <Equilibrium temp="cold" />,
      key: 'cold',
      extent: E,
      top: [atoms('瓶里的原子：一直是这么多')],
      runs: [...txt('放进冰水：结合的多了，'), ...count('cold'), ...txt('。红棕色的分子少了，颜色变浅。')],
    },
    {
      node: <Equilibrium temp="hot" />,
      key: 'hot',
      extent: E,
      top: [atoms('瓶里的原子：一直是这么多')],
      runs: [...txt('放进热水：分开的多了，'), ...count('hot'), ...txt('。颜色变深。')],
    },
    {
      node: <Equilibrium temp="room" />,
      key: 'room',
      extent: E,
      top: [atoms('瓶里的原子：一直是这么多')],
      runs: txt('降温，平衡向放热的方向（结合）移动；升温，向吸热的方向（分开）移动。原子还是那 12 个氮、24 个氧，变的只是它们怎样搭配。'),
    },
  ],
  challenge: {
    runs: [...txt('烧瓶的颜色不再变化时，'), ...fml('NO2'), ...txt(' 结合成 '), ...fml('N2O4'), ...txt(' 的反应停止了吗？')],
    choices: [txt('停止了，所以颜色不变'), txt('没有停止，正、逆反应速率相等'), txt('只剩逆反应在进行')],
    answer: 1,
    why: txt('平衡是动态的：每一刻都有分子在结合、有分子在分开，两边速率相等，所以看起来什么都没变。'),
  },
}

const NEXT: Record<Temp, Temp> = { room: 'cold', cold: 'hot', hot: 'room' }
const NAME: Record<Temp, string> = { cold: '冰水', room: '室温', hot: '热水' }

export function useChapter8(nav: Nav): SpreadDef[] {
  const [temp, setTemp] = useState<Temp>('room')
  const [seen, setSeen] = useState<Temp[]>([])
  const done = seen.includes('cold') && seen.includes('hot')
  function set(t: Temp) {
    setTemp(t)
    if (!seen.includes(t)) setSeen([...seen, t])
  }
  const hands: Hands = {
    node: (
      <>
        <Equilibrium temp={temp} onFlask={() => set(NEXT[temp])} />
        {!done && <Pointer left position={[5.6, C + 2, 0]} />}
      </>
    ),
    key: 'try',
    extent: E,
    top: [atoms('瓶里的原子：一直是这么多')],
    done,
    foot: [
      { kind: 'label', text: `动手　现在在${NAME[temp]}里` },
      {
        kind: 'para',
        runs: [
          ...count(temp),
          ...txt(
            done
              ? '。冷了变浅，热了变深，回到室温又恢复原样。'
              : '。点烧瓶换一个水浴，或者用下面的按钮。冰水和热水都试一试。',
          ),
        ],
      },
      {
        kind: 'links',
        items: (['cold', 'room', 'hot'] as Temp[]).map((t) => ({ id: t, text: t === 'room' ? '放回室温' : `放进${NAME[t]}`, disabled: t === temp })),
      },
    ],
    onHit: (id) => id in NAME && set(id as Temp),
  }
  return [useLesson(nav, DEF, hands)]
}
