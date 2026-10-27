import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { lathe, smooth } from '@/kit/core'
import { endpointState, equivalence, pH, phenolphthalein, round2, TITRATION } from '@/chem/titration'
import { FLASK, FLASK_LIQUID, now } from './ch2'
import { Glass, Ink, Inked, Label } from './ink'
import { useLesson, type Hands, type LessonDef } from './lesson'
import { WATER_COLOR } from './models'
import { fml, txt, type Block, type Run } from './print'
import type { Nav, SpreadDef } from './spread'

// Chapter 9: acid–base titration. NaOH drips into HCl with phenolphthalein; the pH curve is printed on the page as
// it is traced, flat for most of the way and then a near-vertical jump at the endpoint.

const S = 0.6
const TIP = 15.2 * S
const BURETTE = lathe(
  [
    [0, 0],
    [0.1, 0],
    [0.1, 0.9],
    [0.42, 1.6],
    [0.42, 6],
    [0.52, 6.1],
  ],
  24,
)
/** NaOH column in the burette: full at 0 mL, a cm per 9 mL lower after that */
const COLUMN = new THREE.CylinderGeometry(0.36, 0.36, 1, 20).translate(0, 0.5, 0)
const TAP = new THREE.BoxGeometry(1.4, 0.3, 0.3)
const DROP = new THREE.SphereGeometry(0.16, 12, 8)
const FULL = 4.4

/** A drop that falls from the burette tip into the flask once, when mounted. */
function Drop() {
  const ref = useRef<THREE.Mesh>(null)
  const [t0] = useState(now)
  useFrame(() => {
    const u = Math.min((now() - t0) / 0.45, 1)
    ref.current?.position.set(0, TIP - smooth(u) * (TIP - 1.4 * S), 0)
    ref.current?.scale.setScalar(u < 1 ? 1 : 0.0001)
  })
  return (
    <mesh ref={ref} geometry={DROP} position-y={TIP}>
      <Ink color={WATER_COLOR} />
    </mesh>
  )
}

function Titration({ v, drip = 0 }: { v: number; drip?: number }) {
  const look = phenolphthalein(pH(v))
  return (
    <>
      <group scale={S}>
        <mesh geometry={FLASK_LIQUID}>
          <Ink color={look.color} transparent opacity={Math.max(look.opacity, 0.6)} />
        </mesh>
        <Glass geometry={FLASK} />
      </group>
      <group position-y={TIP}>
        <Inked geometry={COLUMN} color={WATER_COLOR} position-y={1.6} scale-y={Math.max(FULL - v / 9, 0.01)} pen={0} />
        <Glass geometry={BURETTE} />
        <Inked geometry={TAP} color="#5e4630" position-y={0.6} />
      </group>
      {drip > 0 && <Drop key={drip} />}
      <Label position={[0, 0, 6.2]} text={`已滴入 ${v.toFixed(2)} mL　pH ${pH(v).toFixed(2)}`} />
    </>
  )
}

/** sample volumes, dense around the endpoint */
const VS = [...Array.from({ length: 44 }, (_, i) => i * 0.5), ...Array.from({ length: 21 }, (_, i) => 21.5 + i * 0.05), ...Array.from({ length: 36 }, (_, i) => 22.5 + i * 0.5)]
  .map(round2)
  .sort((a, b) => a - b)
const plot = (v: number, caption = '滴定曲线'): Block => ({
  kind: 'plot',
  caption,
  x: [0, 40],
  y: [0, 14],
  xTicks: [0, 10, 20, 30, 40],
  yTicks: [0, 7, 14],
  xLabel: 'V(NaOH)/mL',
  yLabel: 'pH',
  curve: [...VS.filter((x) => x < v), v].map((x) => [x, pH(x)]),
  at: [v, pH(v)],
  h: 4,
})
const E: [number, number] = [18, 30]
const H: Run[] = fml('H^+')
const OH: Run[] = fml('OH^-')
const EQ = equivalence.toFixed(2)

const DEF: LessonDef = {
  n: 9,
  title: '酸、碱与 pH',
  lead: '往盐酸里一滴一滴加氢氧化钠溶液，氢离子和氢氧根离子结合成水。溶液的 pH 怎样变化？酚酞又会在什么时候变红？',
  law: [
    ...txt('中和滴定　', { bold: true }),
    ...txt('中和反应的实质是 '),
    ...H,
    ...txt(' + '),
    ...OH,
    ...txt(' = '),
    ...fml('H2O'),
    ...txt('。恰好完全反应时 n('),
    ...H,
    ...txt(') = n('),
    ...OH,
    ...txt(')；终点附近一滴碱就能让 pH 突跃。'),
  ],
  predict: {
    runs: txt('向盐酸中一滴一滴加入氢氧化钠溶液，pH 随加入的体积怎样变化？'),
    choices: [txt('均匀地慢慢升高'), txt('开始变化很小，接近终点时突然跃升'), txt('一直不变')],
    answer: 1,
    why: [...txt('pH 看的是 '), ...H, ...txt(' 浓度的数量级。开始时 '), ...H, ...txt(' 很多，中和掉一半也只让 pH 升高零点几；到终点附近，剩下的一点点 '), ...H, ...txt(' 被一滴碱中和掉，pH 一下子跳过好几个单位。')],
  },
  start: { node: <Titration v={0} />, key: 'v0', extent: E, top: [plot(0)] },
  figure: '滴定管和锥形瓶',
  demo: [
    {
      node: <Titration v={0} />,
      key: 'v0',
      extent: E,
      top: [plot(0)],
      runs: txt(`锥形瓶里是 ${TITRATION.vAcid.toFixed(2)} mL 未知浓度的盐酸，滴了两滴酚酞，无色。滴定管里是 ${TITRATION.cBase.toFixed(4)} mol/L 的氢氧化钠溶液。`),
    },
    {
      node: <Titration v={20} />,
      key: 'v20',
      extent: E,
      top: [plot(20)],
      runs: [...txt(`已经加了 20 mL，pH 才到 ${pH(20).toFixed(1)}：大部分 `), ...H, ...txt(' 已经被中和，剩下的一点点仍让溶液保持强酸性。')],
    },
    {
      node: <Titration v={equivalence + TITRATION.drop} />,
      key: 'end',
      extent: E,
      top: [plot(equivalence + TITRATION.drop)],
      runs: txt(`再加不到 2 mL 就到了终点：最后一滴让 pH 从 4 左右跳到 ${pH(equivalence + TITRATION.drop).toFixed(0)}，溶液变成浅红色，半分钟不褪色。共用去 ${(equivalence + TITRATION.drop).toFixed(2)} mL。`),
    },
    {
      node: <Titration v={30} />,
      key: 'v30',
      extent: E,
      top: [plot(30)],
      runs: txt('继续加碱，溶液变成深红色，pH 又变得平缓。曲线中间那段几乎竖直的「突跃」，就是判断终点的依据。'),
    },
  ],
  challenge: {
    runs: txt(`滴定 ${TITRATION.vAcid.toFixed(2)} mL 盐酸，恰好中和时用去 ${TITRATION.cBase.toFixed(4)} mol/L 氢氧化钠溶液 ${EQ} mL。盐酸的浓度是多少？`),
    choices: [txt(`${TITRATION.cAcid.toFixed(2)} mol/L`), txt('0.10 mol/L'), txt(`${(TITRATION.cAcid * 2).toFixed(2)} mol/L`)],
    answer: 0,
    why: [...txt(`n(`), ...OH, ...txt(`) = ${TITRATION.cBase} × ${EQ} mL = n(`), ...H, ...txt(`)，所以 c(HCl) = ${TITRATION.cBase} × ${EQ} ÷ ${TITRATION.vAcid.toFixed(2)} = ${TITRATION.cAcid.toFixed(2)} mol/L。`)],
  },
}

const ADD: Record<string, number> = { ml5: 5, ml1: 1, drop: TITRATION.drop }

export function useChapter9(nav: Nav): SpreadDef[] {
  const [v, setV] = useState(0)
  const [drips, setDrips] = useState(0)
  const [reached, setReached] = useState(false)
  const state = endpointState(v)
  function add(dv: number) {
    const next = round2(v + dv)
    setV(next)
    setDrips(drips + 1)
    if (endpointState(next) === 'endpoint') setReached(true)
  }
  const hands: Hands = {
    node: <Titration v={v} drip={drips} />,
    key: 'try',
    extent: E,
    top: [plot(v, '你画出的滴定曲线')],
    done: reached,
    foot: [
      { kind: 'label', text: `动手　${v.toFixed(2)} mL，pH ${pH(v).toFixed(2)}` },
      {
        kind: 'para',
        runs: txt(
          state === 'endpoint'
            ? `浅红色，半分钟不褪：到终点了，用去 ${v.toFixed(2)} mL。`
            : state === 'over'
              ? '深红色：加过头了。终点前要一滴一滴地加，点「重来」再试一次。'
              : pH(v) > 3
                ? '快到了！pH 开始上升，现在改成一滴一滴地加。'
                : '滴入氢氧化钠溶液，看曲线怎样长出来。目标：让溶液刚好变成浅红色。',
        ),
      },
      {
        kind: 'links',
        items: [
          { id: 'ml5', text: '+5 mL', disabled: state !== 'before' },
          { id: 'ml1', text: '+1 mL', disabled: state !== 'before' },
          { id: 'drop', text: '+1 滴', disabled: state === 'over' },
          { id: 'reset', text: '重来', disabled: v === 0 },
        ],
      },
    ],
    onHit: (id) => {
      if (id in ADD) add(ADD[id])
      else if (id === 'reset') setV(0)
    },
  }
  return [useLesson(nav, DEF, hands)]
}
