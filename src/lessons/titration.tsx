import { Pipette } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { mix, type Reagent } from '@/chem/engine'
import { TITRATION, endpointState, equivalence, pH, phenolphthalein, round2 } from '@/chem/titration'
import { Burette, ClampArm, Dropper, DropperBottle, IronStand, LIFT, WhiteTile } from '@/kit/apparatus'
import { Carry } from '@/kit/carry'
import { Bench, Pointer, type Vec3 } from '@/kit/core'
import { SHAPES, heightFor } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import type { ControlProps, Lesson, SceneProps } from './types'

interface S {
  /** mL of NaOH run in */
  v: number
  indicator: boolean
  flowing: boolean
  lastAdd: number
}

const PHTH = { id: 'KSCN', name: '酚酞溶液', formula: '酚酞', species: [], dose: 0.1, color: '#eef3f5' } as unknown as Reagent
const PHTH_POS: Vec3 = [-14, 0, -3]
const LIFT_Y = 5.5
const FLASK: Vec3 = [0, 1.1, 0]
const FLASK_TOP = FLASK[1] + SHAPES.conical250.height
const PINK = '#f4b6cf'
const CLEAR = '#e8f1f4'
const fmt = (x: number) => x.toFixed(2)

function flaskLook(s: S) {
  return (now: number) => {
    if (!s.indicator) return { color: CLEAR, opacity: 0.45, grains: null, bubbles: 0 }
    const p = pH(s.v)
    if (p >= 8.2) return { ...phenolphthalein(p), grains: null, bubbles: 0 }
    const since = now - s.lastAdd
    if (s.v > equivalence - 2.5 && since < 0.9) return { color: mix(PINK, CLEAR, since / 0.9), opacity: 0.55, grains: null, bubbles: 0 }
    return { color: CLEAR, opacity: 0.45, grains: null, bubbles: 0 }
  }
}

function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const top: Record<string, Vec3> = { phth: [PHTH_POS[0], 15, PHTH_POS[2]], flask: [FLASK[0] + 6, FLASK_TOP, FLASK[2] + 3] }
  return (
    <Stage extent={[46, 38]} target={[-3, 16, 0]}>
      <Bench />
      <IronStand position={[0, 0, 0]} height={41}>
        <ClampArm y={LIFT_Y + 29} />
        <ClampArm y={LIFT_Y + 16} />
        <group position={[0, LIFT_Y, 0]}>
          <Burette reading={TITRATION.initial + state.v} dripping={() => state.flowing || performance.now() / 1000 - state.lastAdd < 0.5} />
        </group>
      </IronStand>
      <WhiteTile position={[0, 0.8, 0]} size={[8, 0.3, 8]} />
      <Vessel
        shape={SHAPES.conical250}
        position={FLASK}
        volume={TITRATION.vAcid + state.v + (state.indicator ? 0.1 : 0)}
        look={flaskLook(state)}
        onClick={() => onItem('flask')}
      />
      <DropperBottle reagent={PHTH} position={PHTH_POS} held={held === 'phth'} hidden={anim?.tool === 'phth'} onClick={() => onItem('phth')} />
      {anim?.tool === 'phth' && (
        <Carry key={anim.id} from={[PHTH_POS[0], LIFT, PHTH_POS[2]]} to={[FLASK[0] + 1, FLASK_TOP + 2, FLASK[2] + 1.6]} tool={<Dropper color="#eef3f5" />}
          action="drip" drops={3} color="#cfe3ea" surfaceY={FLASK[1] + heightFor(SHAPES.conical250, TITRATION.vAcid)} onCommit={onCommit} onFinish={onFinish} />
      )}
      {pointer && <Pointer position={top[pointer]} />}
    </Stage>
  )
}

/** Close-up of the burette scale around `reading` (mL; increases downwards). */
export function BuretteZoom({ reading }: { reading: number }) {
  const px = 44
  const cy = 75
  const from = Math.floor(reading - 1.6)
  const ticks = []
  for (let i = Math.max(from, 0) * 10; i <= (reading + 1.6) * 10; i++) {
    const y = cy + (i / 10 - reading) * px
    if (y < 0 || y > 150) continue
    const major = i % 10 === 0
    ticks.push(<line key={i} x1={130} x2={130 + (major ? 26 : i % 5 === 0 ? 18 : 11)} y1={y} y2={y} stroke="#1f2430" strokeWidth={major ? 2 : 1} />)
    if (major) ticks.push(<text key={`t${i}`} x={162} y={y + 4} fontSize="13" fill="#1f2430">{i / 10}</text>)
  }
  return (
    <svg viewBox="0 0 300 150" className="h-36 w-full rounded-md bg-muted">
      <rect x="110" y={cy - 6} width="80" height={150} fill="#d8ebf2" />
      <path d={`M 110 ${cy - 6} Q 150 ${cy + 6} 190 ${cy - 6}`} fill="#d8ebf2" stroke="#5b8fa3" strokeWidth="1.5" />
      <line x1="110" y1="0" x2="110" y2="150" stroke="#8aa3ad" strokeWidth="3" />
      <line x1="190" y1="0" x2="190" y2="150" stroke="#8aa3ad" strokeWidth="3" />
      {ticks}
      <text x="12" y="20" fontSize="12" fill="#566663">刻度从上往下增大</text>
    </svg>
  )
}

function TitrationCurve({ v }: { v: number }) {
  const W = 300
  const H = 150
  const x = (ml: number) => 30 + (ml / 40) * (W - 40)
  const y = (p: number) => H - 20 - (p / 14) * (H - 30)
  const pts: string[] = []
  for (let ml = 0; ml <= 40; ml += 0.05) pts.push(`${x(ml).toFixed(1)},${y(pH(ml)).toFixed(1)}`)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full rounded-md bg-muted">
      <line x1="30" y1={H - 20} x2={W - 8} y2={H - 20} stroke="#8a8172" />
      <line x1="30" y1="8" x2="30" y2={H - 20} stroke="#8a8172" />
      <rect x="30" y={y(10)} width={W - 38} height={y(8.2) - y(10)} fill="#f4b6cf" opacity="0.35" />
      <text x="36" y={y(9.1) + 4} fontSize="10" fill="#b0507a">酚酞变色范围</text>
      <polyline points={pts.join(' ')} fill="none" stroke="#1f2430" strokeWidth="2" />
      <circle cx={x(v)} cy={y(pH(v))} r="4.5" fill="#c0262d" />
      <text x={x(v) + 8} y={y(pH(v)) + 14} fontSize="11" fill="#c0262d">你的终点 {fmt(v)} mL</text>
      <text x="34" y="18" fontSize="11" fill="#566663">pH</text>
      <text x={W - 10} y={H - 26} fontSize="11" textAnchor="end" fill="#566663">V(NaOH) / mL</text>
      {[0, 10, 20, 30, 40].map((m) => (
        <text key={m} x={x(m)} y={H - 6} fontSize="10" textAnchor="middle" fill="#8a8172">{m}</text>
      ))}
    </svg>
  )
}

function TitratePanel({ state, update, complete, done }: ControlProps<S>) {
  const timer = useRef<number | null>(null)
  const [pending, setPending] = useState(false)
  const status = endpointState(state.v)

  const add = (dv: number) =>
    update((s) => (endpointState(s.v) === 'over' ? s : { ...s, v: round2(s.v + dv), lastAdd: performance.now() / 1000 }))

  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
    update((s) => ({ ...s, flowing: false }))
  }
  const start = () => {
    if (timer.current !== null || done) return
    update((s) => ({ ...s, flowing: true }))
    timer.current = window.setInterval(() => add(0.1), 60)
  }

  useEffect(() => () => {
    if (timer.current !== null) window.clearInterval(timer.current)
  }, [])

  // stop the flow automatically once the solution is overshot
  useEffect(() => {
    if (status === 'over' && timer.current !== null) stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // pale pink that lasts (compressed "half a minute") = endpoint
  useEffect(() => {
    if (done || state.flowing || status !== 'endpoint') return setPending(false)
    setPending(true)
    const t = window.setTimeout(() => complete(), 2000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.v, state.flowing, status, done])

  if (done) return <TitrationCurve v={state.v} />

  return (
    <div className="space-y-3">
      {status === 'over' ? (
        <>
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">溶液变成了较深的红色，说明 NaOH 已经过量，滴定失败。要重新取一份待测液再滴定。</p>
          <Button variant="outline" onClick={() => update((s) => ({ ...s, v: 0, flowing: false, lastAdd: 0 }))}>
            重新滴定
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              className="select-none"
              onPointerDown={start}
              onPointerUp={stop}
              onPointerLeave={() => timer.current !== null && stop()}
            >
              按住放液
            </Button>
            <Button variant="outline" onClick={() => add(TITRATION.drop)}>
              滴一滴
            </Button>
          </div>
          {pending && <p className="rounded-md bg-pink-50 px-3 py-2 text-sm text-pink-900">溶液变成浅红色……观察半分钟内是否褪色。</p>}
        </>
      )}
    </div>
  )
}

export const titrationLesson: Lesson<S> = {
  id: 'titration',
  title: '强酸与强碱的中和滴定',
  goal: '用 0.1000 mol/L NaOH 标准溶液滴定 20.00 mL 未知浓度的盐酸，学会读数、判断终点和计算浓度。',
  group: 'required',
  icon: Pipette,
  items: { phth: '酚酞溶液', flask: '锥形瓶' },
  initial: () => ({ v: 0, indicator: false, flowing: false, lastAdd: 0 }),
  Scene,
  steps: [
    {
      kind: 'quiz',
      title: '读初始读数',
      question: '碱式滴定管中装有 0.1000 mol/L NaOH 溶液。下图是滴定前液面附近的放大图，读数应记为多少？',
      Figure: () => <BuretteZoom reading={TITRATION.initial} />,
      choices: ['0.5 mL', '0.50 mL', '0.05 mL', '1.50 mL'],
      answer: 1,
      explain: '读数时视线与凹液面最低处相平。滴定管能精确到 0.01 mL，所以要记为 0.50 mL，不能写成 0.5 mL。',
    },
    {
      kind: 'act',
      title: '加指示剂',
      instruction: '锥形瓶中已有 20.00 mL 待测盐酸。取酚酞溶液，向锥形瓶中滴加 2～3 滴。',
      tool: 'phth',
      target: 'flask',
      verb: 'drip',
      apply: (s) => ({ state: { ...s, indicator: true } }),
      observe: '溶液仍然无色，酚酞在酸性溶液中不变色。',
    },
    {
      kind: 'control',
      title: '滴定',
      instruction: '先按住「按住放液」较快地滴加，同时摇动锥形瓶；当局部出现粉红色、摇动后才褪去时，改为「滴一滴」。溶液变成浅红色且半分钟内不褪色，即为终点。',
      Panel: TitratePanel,
      observe: (s) => `加入最后一滴 NaOH 溶液后，溶液由无色变为浅红色，且半分钟内不褪色。滴定管读数为 ${fmt(TITRATION.initial + s.v)} mL。`,
      note: '曲线在终点附近陡然上升：一滴 NaOH 就能让 pH 从 4 左右跳到 10 左右，所以酚酞能准确指示终点。',
    },
    {
      kind: 'quiz',
      title: '计算消耗体积',
      question: '滴定前读数为 0.50 mL，下图是终点时的读数。消耗 NaOH 溶液的体积是多少？',
      Figure: ({ state }) => <BuretteZoom reading={TITRATION.initial + state.v} />,
      choices: (s) => [`${fmt(TITRATION.initial + s.v)} mL`, `${fmt(s.v)} mL`, `${s.v.toFixed(1)} mL`],
      answer: 1,
      explain: (s) => `V(NaOH) = 终点读数 − 初始读数 = ${fmt(TITRATION.initial + s.v)} mL − 0.50 mL = ${fmt(s.v)} mL。`,
    },
    {
      kind: 'quiz',
      title: '计算浓度',
      question: '待测盐酸的物质的量浓度是多少？',
      choices: (s) => [
        `${((0.1 * (TITRATION.initial + s.v)) / 20).toFixed(4)} mol/L`,
        `${((0.1 * 20) / s.v).toFixed(4)} mol/L`,
        `${((0.1 * s.v) / 20).toFixed(4)} mol/L`,
      ],
      answer: 2,
      explain: (s) =>
        `c(HCl) = c(NaOH)·V(NaOH) / V(HCl) = 0.1000 mol/L × ${fmt(s.v)} mL ÷ 20.00 mL = ${((0.1 * s.v) / 20).toFixed(4)} mol/L。实际实验要平行滴定 2～3 次，取平均值。`,
    },
    {
      kind: 'quiz',
      title: '误差分析',
      question: '如果滴定前碱式滴定管尖嘴处有气泡，滴定后气泡消失，测得的盐酸浓度会怎样？',
      choices: ['偏高', '偏低', '没有影响'],
      answer: 0,
      explain: '气泡占据的体积被当成消耗的 NaOH 溶液记了下来，V(NaOH) 读数偏大，所以算出的 c(HCl) 偏高。',
    },
  ],
  summary: [
    '滴定管要先用待装溶液润洗 2～3 次，读数精确到 0.01 mL，刻度从上往下增大。',
    '强碱滴定强酸可以用酚酞作指示剂，终点时溶液由无色变为浅红色，且半分钟内不褪色。',
    '终点附近 pH 发生突变，一滴溶液就能引起颜色变化，所以要逐滴加入。',
    'c(待测) = c(标准)·V(标准) / V(待测)；分析误差时看 V(标准) 是偏大还是偏小。',
  ],
}
