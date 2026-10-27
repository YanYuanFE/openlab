import { useFrame } from '@react-three/fiber'
import { FlaskRound } from 'lucide-react'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { Button } from '@/components/ui/button'
import { REAGENTS, apply, emptyVessel, pour, type Vessel as Contents } from '@/chem/engine'
import { BulbDropper, GlassRod, LIFT, PowderJar, RestingRod, TripBalance, WASH_TIP, WashBottle, WeighPaper } from '@/kit/apparatus'
import { Carry, originFor } from '@/kit/carry'
import { Bench, Passthrough, Pointer, clickable, type Vec3 } from '@/kit/core'
import { SHAPES, heightFor } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import { ReagentCarry, lookOf } from './common'
import type { ActStep, ControlProps, Lesson, SceneProps } from './types'

interface S {
  weighed: boolean
  beaker: Contents
  flask: Contents
  /** drops added while bringing the level up to the mark */
  drops: number
  dropAt: number
}

const MARK = 100
const BELOW = 98.4
const DROP = 0.2
const DROPS_TO_MARK = 8

const P: Record<string, Vec3> = {
  NaCl: [-31, 0, -10],
  balance: [-16, 0, -4],
  beaker: [3, 0, 4],
  rod: [3, 0.2, 13],
  wash: [17, 0, -12],
  flask: [29, 0, 2],
}
const FLASK_TOP = SHAPES.volumetric100.height
const BEAKER_TOP = SHAPES.beaker100.height
const PAN: Vec3 = [P.balance[0] - 6.5, 7.8, P.balance[2]]


function Scene({ state, step, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const top: Record<string, Vec3> = {
    NaCl: [P.NaCl[0], 15, P.NaCl[2]],
    balance: [PAN[0], 12, PAN[2]],
    beaker: [P.beaker[0], 12, P.beaker[2]],
    rod: [P.rod[0], 3.5, P.rod[2]],
    wash: [P.wash[0], 17, P.wash[2]],
    flask: [P.flask[0], FLASK_TOP + 3, P.flask[2]],
  }
  const beakerSurface = Math.max(heightFor(SHAPES.beaker100, state.beaker.volume), 0.3)
  const flaskSurface = Math.max(heightFor(SHAPES.volumetric100, state.flask.volume), 0.3)
  const controlling = step?.kind === 'control'

  let carry = null
  if (anim?.tool === 'NaCl')
    carry = <ReagentCarry anim={anim} reagent="NaCl" bottle={P.NaCl} mouth={[PAN[0], PAN[1] - 2, PAN[2]]} surfaceY={PAN[1]} onCommit={onCommit} onFinish={onFinish} />
  if (anim?.tool === 'balance')
    carry = (
      <Carry key={anim.id} from={[PAN[0], LIFT, PAN[2]]} to={[P.beaker[0] - 2, BEAKER_TOP + 3, P.beaker[2]]} tool={<WeighPaper color="#fbfbf8" />}
        action="sprinkle" tilt={-0.9} lip={[2.2, 0]} color="#fbfbf8" surfaceY={0.4} onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.tool === 'wash') {
    const tgt = anim.target === 'flask' ? P.flask : P.beaker
    const mouthY = anim.target === 'flask' ? FLASK_TOP : BEAKER_TOP
    carry = (
      <Carry key={anim.id} from={[P.wash[0], LIFT - 8, P.wash[2]]} to={originFor([tgt[0], mouthY + 1.5, tgt[2]], WASH_TIP, -0.35)} tool={<WashBottle />}
        action="pour" tilt={-0.35} lip={WASH_TIP} streamRadius={0.06} color="#d8ebf2"
        surfaceY={anim.target === 'flask' ? flaskSurface : beakerSurface} onCommit={onCommit} onFinish={onFinish} />
    )
  }
  if (anim?.tool === 'rod')
    carry = (
      <Carry key={anim.id} from={[P.rod[0], LIFT, P.rod[2]]} to={[P.beaker[0], 0.5, P.beaker[2]]} tool={<GlassRod />} action="stir" onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.tool === 'beaker')
    carry = (
      <>
        <Carry key={anim.id} from={[P.beaker[0], 3, P.beaker[2]]} to={originFor([P.flask[0] - 0.3, FLASK_TOP + 1.2, P.flask[2]], [2.6, 7.2], -1.25)}
          tool={<Vessel shape={SHAPES.beaker100} volume={state.beaker.volume} look={lookOf(state.beaker)} />}
          action="pour" tilt={-1.25} lip={[2.6, 7.2]} color="#d8ebf2" surfaceY={P.flask[1] + flaskSurface} onCommit={onCommit} onFinish={onFinish} />
        <group position={[P.flask[0], FLASK_TOP - 5, P.flask[2]]} rotation={[0, 0, 0.05]}>
          <GlassRod />
        </group>
      </>
    )

  return (
    <Stage extent={[76, 36]}>
      <Bench />
      <PowderJar reagent={REAGENTS.NaCl} position={P.NaCl} held={held === 'NaCl'} hidden={anim?.tool === 'NaCl'} onClick={() => onItem('NaCl')} />
      <TripBalance position={P.balance} sample={state.weighed && held !== 'balance' && anim?.tool !== 'balance'} sampleColor="#fbfbf8" onClick={() => onItem('balance')} />
      {held === 'balance' && (
        <group position={[PAN[0], LIFT, PAN[2]]}>
          <WeighPaper color="#fbfbf8" />
        </group>
      )}
      <group visible={anim?.tool !== 'beaker'}>
        <Passthrough active={held === 'beaker'}>
        <Vessel
          shape={SHAPES.beaker100}
          position={held === 'beaker' ? [P.beaker[0], 3, P.beaker[2]] : P.beaker}
          volume={state.beaker.volume}
          look={lookOf(state.beaker)}
          onClick={() => onItem('beaker')}
        />
        </Passthrough>
      </group>
      <RestingRod position={P.rod} held={held === 'rod'} hidden={anim?.tool === 'rod'} onClick={() => onItem('rod')} />
      <group position={held === 'wash' ? [P.wash[0], LIFT - 8, P.wash[2]] : P.wash} visible={anim?.tool !== 'wash'} {...clickable(() => onItem('wash'))}>
        <Passthrough active={held === 'wash'}>
          <WashBottle />
        </Passthrough>
      </group>
      <Vessel
        shape={SHAPES.volumetric100}
        position={P.flask}
        volume={state.flask.volume}
        look={lookOf(state.flask)}
        mark={MARK}
        pivotY={6}
        onClick={() => onItem('flask')}
        motion={anim?.verb === 'invert' ? { id: anim.id, kind: 'invert' } : null}
        onCommit={onCommit}
        onFinish={onFinish}
      >
        {state.flask.volume >= MARK - 0.01 && (
          <mesh position={[0, FLASK_TOP + 0.6, 0]}>
            <cylinderGeometry args={[0.85, 0.7, 1.4, 20]} />
            <meshStandardMaterial color="#f4f4f0" roughness={0.5} />
          </mesh>
        )}
      </Vessel>
      {controlling && (
        <group position={[P.flask[0], FLASK_TOP + 1.5, P.flask[2]]}>
          <BulbDropper />
          <FallingDrop key={state.drops} at={state.dropAt} toY={P.flask[1] + flaskSurface - FLASK_TOP - 1.5} />
        </group>
      )}
      {carry}
      {pointer && <Pointer position={top[pointer]} />}
    </Stage>
  )
}

function FallingDrop({ at, toY }: { at: number; toY: number }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!ref.current) return
    const d = performance.now() / 1000 - at
    const y = -0.3 - 0.5 * 70 * d * d
    ref.current.visible = at > 0 && d > 0 && y > toY
    ref.current.position.y = y
  })
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[0.18, 10, 8]} />
      <meshStandardMaterial color="#cfe3ea" transparent opacity={0.85} />
    </mesh>
  )
}

/** Close-up of the flask neck around the graduation mark. */
function NeckZoom({ volume }: { volume: number }) {
  const px = 36 // pixels per mL in the neck
  const markY = 70
  const level = markY + (MARK - volume) * px
  const left = 110
  const right = 190
  const dip = 9
  return (
    <svg viewBox="0 0 300 150" className="h-36 w-full rounded-md bg-muted">
      <rect x={left} y={Math.min(level, 150)} width={right - left} height={150} fill="#cfe6ef" />
      <path d={`M ${left} ${level - 4} Q ${(left + right) / 2} ${level + dip} ${right} ${level - 4} L ${right} ${level + 2} L ${left} ${level + 2} Z`} fill="#cfe6ef" />
      <path d={`M ${left} ${level - 4} Q ${(left + right) / 2} ${level + dip} ${right} ${level - 4}`} stroke="#5b8fa3" strokeWidth="2" fill="none" />
      <line x1={left} y1="0" x2={left} y2="150" stroke="#8aa3ad" strokeWidth="3" />
      <line x1={right} y1="0" x2={right} y2="150" stroke="#8aa3ad" strokeWidth="3" />
      <line x1={left - 12} y1={markY} x2={right + 12} y2={markY} stroke="#1f2430" strokeWidth="2.5" />
      <text x={right + 18} y={markY + 5} fontSize="13" fill="#1f2430">刻度线</text>
      <g transform={`translate(40 ${markY})`}>
        <ellipse rx="16" ry="9" fill="#fff" stroke="#1f2430" strokeWidth="2" />
        <circle r="4.5" fill="#1f2430" />
        <line x1="20" y1="0" x2={left - 18} y2="0" stroke="#1f2430" strokeDasharray="3 4" />
      </g>
    </svg>
  )
}

function FillPanel({ state, update, complete, done }: ControlProps<S>) {
  const over = state.drops > DROPS_TO_MARK
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      <NeckZoom volume={state.flask.volume} />
      {over && !done && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          液面超过了刻度线。实际实验中加水过量只能倒掉重新配制，不能用滴管吸出。这里允许你重做这一步。
        </p>
      )}
      {!done && (
        <div className="flex flex-wrap gap-2">
          {over ? (
            <Button variant="outline" onClick={() => update((s) => ({ ...s, drops: 0, flask: { ...s.flask, volume: BELOW } }))}>
              重做这一步
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setMsg(null)
                  update((s) => ({ ...s, drops: s.drops + 1, dropAt: performance.now() / 1000 + 0.05, flask: { ...s.flask, volume: BELOW + (s.drops + 1) * DROP } }))
                }}
              >
                滴一滴
              </Button>
              <Button onClick={() => (state.drops === DROPS_TO_MARK ? complete() : setMsg('凹液面最低处还没有到达刻度线，继续逐滴加水。'))}>
                定容完成
              </Button>
            </>
          )}
        </div>
      )}
      {!done && !over && msg && <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">{msg}</p>}
    </div>
  )
}

const act = (s: Omit<ActStep<S>, 'kind'>): ActStep<S> => ({ kind: 'act', ...s })

export const solutionLesson: Lesson<S> = {
  id: 'solution',
  title: '配制一定物质的量浓度的溶液',
  goal: '用容量瓶配制 100 mL 1.00 mol/L 的 NaCl 溶液，掌握定容操作和误差分析。',
  group: 'required',
  icon: FlaskRound,
  items: { NaCl: '氯化钠', balance: '托盘天平上称好的氯化钠', beaker: '烧杯', rod: '玻璃棒', wash: '洗瓶', flask: '容量瓶' },
  initial: () => ({ weighed: false, beaker: emptyVessel(), flask: emptyVessel(), drops: 0, dropAt: 0 }),
  Scene,
  steps: [
    {
      kind: 'quiz',
      title: '计算',
      question: '配制 100 mL 1.00 mol/L NaCl 溶液，用托盘天平应称取 NaCl 多少克？（NaCl 的摩尔质量为 58.5 g/mol）',
      choices: ['5.85 g', '5.9 g', '58.5 g', '0.585 g'],
      answer: 1,
      explain: 'm = c·V·M = 1.00 mol/L × 0.100 L × 58.5 g/mol = 5.85 g。托盘天平只能精确到 0.1 g，所以称取 5.9 g。',
    },
    act({
      title: '称量',
      instruction: '天平右盘已放好 5 g 砝码，游码拨到 0.9 g。点击氯化钠试剂瓶取出药匙，再点击天平左盘的称量纸，加入 NaCl 直到天平平衡。',
      tool: 'NaCl',
      target: 'balance',
      verb: 'sprinkle',
      apply: (s) => ({ state: { ...s, weighed: true } }),
      observe: '天平指针回到中央，左盘称得 5.9 g NaCl。',
      note: '托盘天平遵循「左物右码」，药品放在称量纸上，不能直接放在托盘上。',
    }),
    act({
      title: '溶解：倒入烧杯',
      instruction: '点击天平上称好的 NaCl 拿起称量纸，再点击烧杯，把 NaCl 倒进去。',
      tool: 'balance',
      target: 'beaker',
      verb: 'sprinkle',
      apply: (s, now) => ({ state: { ...s, weighed: false, beaker: apply(s.beaker, { type: 'add', reagent: 'NaCl' }, now).vessel } }),
      observe: '白色 NaCl 晶体落在烧杯底部。',
    }),
    act({
      title: '溶解：加水',
      instruction: '拿起洗瓶，向烧杯中加入约 30 mL 蒸馏水。',
      tool: 'wash',
      target: 'beaker',
      verb: 'pour',
      apply: (s, now) => ({ state: { ...s, beaker: apply(s.beaker, { type: 'add', reagent: 'water', dose: 30 }, now).vessel } }),
      observe: '晶体浸在水中，还没有完全溶解。',
    }),
    act({
      title: '溶解：搅拌',
      instruction: '拿起玻璃棒，点击烧杯进行搅拌。',
      tool: 'rod',
      target: 'beaker',
      verb: 'stir',
      apply: (s, now) => ({ state: { ...s, beaker: apply(s.beaker, { type: 'agitate' }, now).vessel } }),
      observe: 'NaCl 全部溶解，得到无色透明的溶液。',
      note: '溶解后要等溶液冷却到室温再转移，因为容量瓶的容积是在 20 °C 时标定的。',
    }),
    act({
      title: '转移',
      instruction: '拿起烧杯，点击容量瓶，用玻璃棒引流，把溶液转移到 100 mL 容量瓶中。',
      tool: 'beaker',
      target: 'flask',
      verb: 'pour',
      apply: (s, now) => {
        const p = pour(s.beaker, s.flask, now)
        return { state: { ...s, beaker: p.from, flask: p.to.vessel } }
      },
      observe: '溶液沿玻璃棒流入容量瓶，没有洒出。',
      note: '玻璃棒下端要靠在容量瓶刻度线以下的内壁上。',
    }),
    act({
      title: '洗涤',
      instruction: '用洗瓶向烧杯中加入少量蒸馏水，洗涤烧杯内壁和玻璃棒。',
      tool: 'wash',
      target: 'beaker',
      verb: 'pour',
      apply: (s, now) => ({ state: { ...s, beaker: apply(s.beaker, { type: 'add', reagent: 'water', dose: 10 }, now).vessel } }),
      observe: '烧杯壁上残留的溶液被冲洗下来。',
    }),
    act({
      title: '转移洗涤液',
      instruction: '把洗涤液也转移到容量瓶中。',
      tool: 'beaker',
      target: 'flask',
      verb: 'pour',
      apply: (s, now) => {
        const p = pour(s.beaker, s.flask, now)
        return { state: { ...s, beaker: p.from, flask: p.to.vessel } }
      },
      observe: '洗涤液也进入容量瓶，溶质没有损失。',
      note: '实际操作中要洗涤 2～3 次，每次的洗涤液都要转入容量瓶。',
    }),
    act({
      title: '加水',
      instruction: '用洗瓶向容量瓶中加蒸馏水，到液面离刻度线 1～2 cm 时停止。',
      tool: 'wash',
      target: 'flask',
      verb: 'pour',
      apply: (s, now) => ({
        state: { ...s, flask: apply(s.flask, { type: 'add', reagent: 'water', dose: BELOW - s.flask.volume }, now).vessel },
      }),
      observe: '液面上升到刻度线下方约 1 cm 处。',
    }),
    {
      kind: 'control',
      title: '定容',
      instruction: '改用胶头滴管逐滴加水。眼睛平视刻度线，凹液面最低处与刻度线相切时，点击「定容完成」。',
      Panel: FillPanel,
      observe: '凹液面最低处恰好与刻度线相切。',
    },
    act({
      title: '摇匀',
      instruction: '盖好瓶塞，点击容量瓶，反复上下颠倒摇匀。',
      target: 'flask',
      verb: 'invert',
      apply: (s) => ({ state: s }),
      observe: '溶液混合均匀，配制完成。',
    }),
    {
      kind: 'quiz',
      title: '误差分析',
      question: '如果定容时仰视刻度线，所配溶液的浓度会怎样？',
      choices: ['偏高', '偏低', '没有影响'],
      answer: 1,
      explain: '仰视时，实际液面已经超过刻度线，溶液体积偏大，所以浓度偏低。反过来，俯视会使浓度偏高。',
    },
  ],
  summary: [
    '步骤：计算 → 称量 → 溶解 → 转移 → 洗涤 → 定容 → 摇匀。',
    '容量瓶只能配制规定体积的溶液，不能用来溶解固体或长期存放溶液。',
    '定容时平视刻度线，凹液面最低处与刻度线相切。',
    '误差看 c = n / V：溶质损失使 n 偏小，加水过多使 V 偏大，都会让浓度偏低。',
  ],
}
