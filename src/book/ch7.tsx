import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { clickable, type Vec3 } from '@/kit/core'
import { Bubbles, now, Pointer } from './ch2'
import { INK, Ink, Inked, Label, Pen, PopBasic, REDUCED } from './ink'
import { useLesson, type Hands, type LessonDef } from './lesson'
import { Beaker } from './models'
import { fml, txt, type Block, type Run } from './print'
import type { Nav, SpreadDef } from './spread'

// Chapter 7: the galvanic cell. Zinc and copper in dilute sulfuric acid; join them with a wire through a bulb and
// electrons flow from zinc to copper, so the hydrogen now bubbles off the copper.

const LOW: Vec3 = [1.6, 1.1, 1.6]
const STRIP = new THREE.BoxGeometry(2, 7, 0.3)
const STRIP_Y = 4.5
const TOP = STRIP_Y + 3.5
const BULB_AT: Vec3 = [0, TOP + 3.2, 0]
const BULB = new THREE.SphereGeometry(1, 32, 20)
const BASE = new THREE.CylinderGeometry(0.55, 0.55, 0.8, 24)
const curve = (pts: Vec3[]) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)))
const LEFT = curve([
  [-2, TOP, 0],
  [-2, TOP + 2, 0],
  [-1.2, BULB_AT[1] - 0.6, 0],
  [-0.3, BULB_AT[1] - 1.2, 0],
])
const RIGHT = curve([
  [0.3, BULB_AT[1] - 1.2, 0],
  [1.2, BULB_AT[1] - 0.6, 0],
  [2, TOP + 2, 0],
  [2, TOP, 0],
])
const WIRE_L = new THREE.TubeGeometry(LEFT, 40, 0.12, 8)
const WIRE_R = new THREE.TubeGeometry(RIGHT, 40, 0.12, 8)
const ELECTRON = new THREE.SphereGeometry(0.34, 12, 8)
const ZN = '#a9b6bf'
const CU = '#c97d4e'

interface Cell {
  wired: boolean
  /** what the second strip is made of */
  second: 'Cu' | 'Zn'
}
const flowing = (c: Cell) => c.wired && c.second === 'Cu'

function CellScene({ c, onWire, onStrip }: { c: Cell; onWire?: () => void; onStrip?: () => void }) {
  const e = useRef<(THREE.Mesh | null)[]>([])
  const on = flowing(c)
  useFrame(() => {
    const t = REDUCED ? 0 : now()
    e.current.forEach((m, i) => {
      if (!m) return
      m.visible = on
      // electrons run left to right along the whole wire
      const u = (t * 0.22 + i / e.current.length) % 1
      const p = u < 0.5 ? LEFT.getPoint(u * 2) : RIGHT.getPoint(u * 2 - 1)
      m.position.copy(p)
    })
  })
  const zinc = () => (on ? 0.15 : 0.55)
  const other = () => (on ? 1 : c.second === 'Zn' ? 0.55 : 0)
  return (
    <>
      <Beaker clear scale={LOW} />
      <Inked geometry={STRIP} color={ZN} position={[-2, STRIP_Y, 0]} />
      <group position={[-2, 0, 0]}>
        <Bubbles r={1.2} y0={1.2} y1={4.8} level={zinc} />
      </group>
      <group {...clickable(onStrip)}>
        <Inked geometry={STRIP} color={c.second === 'Cu' ? CU : ZN} position={[2, STRIP_Y, 0]} />
      </group>
      <group position={[2, 0, 0]}>
        <Bubbles r={1.2} y0={1.2} y1={4.8} level={other} />
      </group>
      <group {...clickable(onWire)}>
        <Inked geometry={WIRE_L} color="#5b4b3c" pen={1} />
        {c.wired && <Inked geometry={WIRE_R} color="#5b4b3c" pen={1} />}
        <Inked geometry={BASE} color="#8d939b" position={[0, BULB_AT[1] - 1.2, 0]} />
        <mesh geometry={BULB} position={BULB_AT}>
          <Ink color={on ? '#ffe69a' : '#f1ece0'} emissive={on ? '#ffc84a' : '#000000'} emissiveIntensity={on ? 0.9 : 0} transparent opacity={0.85} />
          <Pen geometry={BULB} width={1.2} />
        </mesh>
        <mesh visible={false} position={[0, TOP + 2, 0]}>
          <boxGeometry args={[6, 5, 3]} />
        </mesh>
      </group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} ref={(m) => void (e.current[i] = m)} geometry={ELECTRON} visible={false}>
          <PopBasic color={INK} />
        </mesh>
      ))}
      <Label position={[-3.4, 0, 5.4]} text={on ? '锌片（负极）' : '锌片'} />
      <Label position={[3.6, 0, 5.4]} text={c.second === 'Cu' ? (on ? '铜片（正极）' : '铜片') : '锌片'} />
      <Label position={[0, 0, 7.2]} text="稀硫酸" />
    </>
  )
}

const OPEN: Cell = { wired: false, second: 'Cu' }
const SHUT: Cell = { wired: true, second: 'Cu' }
const E: [number, number] = [17, 17]
const ion = (f: string): Run[] => fml(f)

const DEF: LessonDef = {
  n: 7,
  title: '原电池',
  lead: '锌片放进稀硫酸会冒出氢气，铜片却不会。把两片金属一起插进去，再用导线把它们连起来，会发生什么？',
  law: [
    ...txt('原电池　', { bold: true }),
    ...txt('把化学能转化为电能的装置。较活泼的锌失去电子作负极，电子沿导线流到铜片（正极），溶液中的 '),
    ...ion('H^+'),
    ...txt(' 在铜片上得到电子放出氢气。'),
  ],
  predict: {
    runs: txt('用导线连接锌片和铜片，中间接一个小灯泡。连好以后，氢气泡主要从哪一片上冒出？'),
    choices: [txt('锌片'), txt('铜片'), txt('两片都不冒')],
    answer: 1,
    why: [...txt('锌失去的电子沿导线跑到铜片上，'), ...ion('H^+'), ...txt(' 在铜片表面得到电子变成氢气。铜本身并不参加反应，只是电子的「码头」。')],
  },
  start: { node: <CellScene c={OPEN} />, key: 'open', extent: E },
  figure: '稀硫酸里的锌片和铜片',
  demo: [
    {
      node: <CellScene c={OPEN} />,
      key: 'open',
      extent: E,
      runs: txt('导线没有接通：锌片表面冒出氢气，铜片上什么也没有，因为铜不和稀硫酸反应。'),
    },
    {
      node: <CellScene c={SHUT} />,
      key: 'shut',
      extent: E,
      runs: txt('接通导线：小灯泡亮了，而且气泡改从铜片上大量冒出。'),
    },
    {
      node: <CellScene c={SHUT} />,
      key: 'shut',
      extent: E,
      runs: [...txt('锌原子失去电子变成 '), ...ion('Zn^2+'), ...txt(' 溶进溶液；电子（小黑点）沿导线流向铜片，'), ...ion('H^+'), ...txt(' 在铜片上得到电子变成氢气。')],
    },
    {
      node: <CellScene c={SHUT} />,
      key: 'shut',
      extent: E,
      runs: txt('电子流出的锌片是负极，电子流入的铜片是正极。反应放出的化学能没有变成热，而是推着电子流过灯泡，变成了电能。'),
    },
  ],
  challenge: {
    runs: txt('在锌、铜和稀硫酸组成的原电池里，电子经导线怎样流动？'),
    choices: [txt('从锌片流向铜片'), txt('从铜片流向锌片'), txt('从溶液流进导线')],
    answer: 0,
    why: txt('锌比铜活泼，失去电子；电子从锌片出发，经过导线和灯泡流到铜片。'),
  },
}

export function useChapter7(nav: Nav): SpreadDef[] {
  const [c, setC] = useState<Cell>(OPEN)
  const [seen, setSeen] = useState<string[]>([])
  const done = seen.includes('Cu') && seen.includes('Zn')
  function set(next: Cell) {
    setC(next)
    if (next.wired && !seen.includes(next.second)) setSeen([...seen, next.second])
  }
  const wire = () => set({ ...c, wired: !c.wired })
  const swap = () => set({ ...c, second: c.second === 'Cu' ? 'Zn' : 'Cu' })
  const hands: Hands = {
    node: (
      <>
        <CellScene c={c} onWire={wire} onStrip={swap} />
        {!done && <Pointer left position={seen.includes('Cu') && c.second === 'Cu' ? [4.6, STRIP_Y + 2, 0] : [2.8, BULB_AT[1], 0]} />}
      </>
    ),
    key: 'try',
    extent: E,
    done,
    foot: [
      { kind: 'label', text: `动手　${seen.length} / 2` },
      {
        kind: 'para',
        runs: flowing(c)
          ? txt(seen.includes('Zn') ? '换回铜片，灯又亮了。两片金属必须一个活泼、一个不活泼。' : '灯亮了，电子从锌片流向铜片。现在点右边的金属片，把它换成锌片试试。')
          : c.wired
            ? txt('两片都是锌：两边都冒气泡，可灯不亮。两极一样，电子没有理由从一边流到另一边。')
            : txt('点灯泡接通导线。点右边的金属片可以换成锌片。'),
      },
      {
        kind: 'links',
        items: [
          { id: 'wire', text: c.wired ? '断开导线' : '接通导线' },
          { id: 'swap', text: c.second === 'Cu' ? '右边换成锌片' : '右边换回铜片' },
        ],
      },
    ] as Block[],
    onHit: (id) => (id === 'wire' ? wire() : id === 'swap' && swap()),
  }
  return [useLesson(nav, DEF, hands)]
}
