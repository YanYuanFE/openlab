import { Zap } from 'lucide-react'
import { look } from '@/chem/engine'
import { AMMETER_TERMINALS, Ammeter, Electrode, Flow, LIFT, Wire, WhiteTile } from '@/kit/apparatus'
import { Carry } from '@/kit/carry'
import { Bench, Bubbles, Passthrough, Pointer, Tag, Timer, clickable, useEased, type Vec3 } from '@/kit/core'
import { SHAPES, heightFor } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import type { Lesson, SceneProps } from './types'

type Strip = 'zn' | 'cu' | 'cu2'
interface S {
  left: Strip | null
  right: Strip | null
  connected: boolean
}

const BEAKER: Vec3 = [0, 0, 6]
const ACID_ML = 150
const ACID = { species: { H2O: 0, 'H+': 0, 'SO4^2-': 0 }, volume: ACID_ML }
const SURFACE = heightFor(SHAPES.beaker250, ACID_ML)
const SLOT: Record<'left' | 'right', Vec3> = { left: [-1.7, 0.3, 6], right: [1.7, 0.3, 6] }
const REST: Record<Strip, Vec3> = { zn: [-17, 0.4, 10], cu: [17, 0.4, 8], cu2: [17, 0.4, 13] }
const METAL: Record<Strip, 'Zn' | 'Cu'> = { zn: 'Zn', cu: 'Cu', cu2: 'Cu' }
const AMMETER: Vec3 = [0, 0, -9]
const term = (i: 0 | 1): Vec3 => {
  const t = AMMETER_TERMINALS[i]
  return [AMMETER[0] + t[0], AMMETER[1] + t[1], AMMETER[2] + t[2]]
}

const current = (s: S) => s.connected && s.left === 'zn' && s.right === 'cu'
const slotOf = (s: S, strip: Strip): 'left' | 'right' | null => (s.left === strip ? 'left' : s.right === strip ? 'right' : null)

function StripItem({ strip, state, held, anim, onItem }: { strip: Strip; state: S; held: string | null; anim: SceneProps<S>['anim']; onItem: (id: string) => void }) {
  const slot = slotOf(state, strip)
  const lying = slot === null && held !== strip
  const pos: Vec3 = slot ? SLOT[slot] : held === strip ? [REST[strip][0], LIFT, REST[strip][2]] : REST[strip]
  const ref = useEased(pos)
  return (
    <group ref={ref} position={pos} visible={anim?.tool !== strip} {...clickable(slot ? undefined : () => onItem(strip))}>
      <Passthrough active={held === strip || slot !== null}>
        <group rotation={lying ? [-Math.PI / 2, 0, Math.PI / 2] : [0, 0, 0]} position={lying ? [5, 0.1, 0] : [0, 0, 0]}>
          <Electrode metal={METAL[strip]} />
        </group>
      </Passthrough>
    </group>
  )
}

function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const flowing = current(state)
  const top: Record<string, Vec3> = {
    zn: [REST.zn[0], 3, REST.zn[2]],
    cu: [REST.cu[0], 3, REST.cu[2]],
    cu2: [REST.cu2[0], 3, REST.cu2[2]],
    beaker: [BEAKER[0], 14.5, BEAKER[2]],
    ammeter: [AMMETER[0], 11, AMMETER[2]],
  }
  const clip = (side: 'left' | 'right'): Vec3 => [SLOT[side][0], SLOT[side][1] + 10.6, SLOT[side][2]]
  const wireL: Vec3[] = [clip('left'), [-4, 15, 2], [-4.5, 11, -6], term(0)]
  const wireR: Vec3[] = [term(1), [4.5, 11, -6], [4, 15, 2], clip('right')]
  const electrons: Vec3[] = [...wireL, [0, 9, AMMETER[2] + 0.6], ...wireR]

  let anims = null
  if (anim?.verb === 'place' && anim.tool) {
    const strip = anim.tool as Strip
    const side = strip === 'cu' ? 'right' : 'left'
    anims = (
      <Carry key={anim.id} from={[REST[strip][0], LIFT, REST[strip][2]]} to={SLOT[side]} tool={<Electrode metal={METAL[strip]} />} action="place" onCommit={onCommit} onFinish={onFinish} />
    )
  }
  if (anim?.verb === 'connect') anims = <Timer key={anim.id} commitAt={0.3} finishAt={1.4} onCommit={onCommit} onFinish={onFinish} />

  const bubbleRate = (side: 'left' | 'right') => () => {
    const strip = state[side]
    if (!strip) return 0
    if (flowing) return side === 'right' ? 1 : 0.15
    return strip === 'zn' ? 0.55 : 0
  }

  return (
    <Stage extent={[70, 42]} target={[0, 5, 0]}>
      <Bench />
      <Vessel shape={SHAPES.beaker250} position={BEAKER} volume={ACID_ML} look={(now) => look(ACID, now)} onClick={() => onItem('beaker')} />
      <Tag text="稀硫酸" position={[BEAKER[0], 1.2, BEAKER[2] + 3.6]} width={3.6} />
      {(['left', 'right'] as const).map((side) => (
        <group key={side} position={[SLOT[side][0], 0, SLOT[side][2] + 0.25]}>
          <Bubbles rate={bubbleRate(side)} radius={0.55} top={() => SURFACE} bottom={0.5} size={0.11} count={18} />
        </group>
      ))}
      <WhiteTile position={[REST.zn[0], 0, REST.zn[2]]} size={[12, 0.3, 4]} />
      <WhiteTile position={[REST.cu[0], 0, (REST.cu[2] + REST.cu2[2]) / 2]} size={[12, 0.3, 9]} />
      {(['zn', 'cu', 'cu2'] as const).map((s) => (
        <StripItem key={s} strip={s} state={state} held={held} anim={anim} onItem={onItem} />
      ))}
      <Ammeter position={AMMETER} deflect={flowing ? 0.42 : 0} onClick={() => onItem('ammeter')} />
      {state.connected && (
        <>
          <Wire points={wireL} color="#1f2430" />
          <Wire points={wireR} color="#c0262d" />
        </>
      )}
      {flowing && <Flow points={electrons} />}
      {flowing && <Tag text="e⁻ →" position={[-6, 17, 0]} width={2.6} dark />}
      {anims}
      {pointer && <Pointer position={top[pointer]} />}
    </Stage>
  )
}

export const cellLesson: Lesson<S> = {
  id: 'cell',
  title: '化学能转化成电能',
  goal: '用锌片、铜片和稀硫酸组装原电池，观察电流和电极现象，理解原电池的构成条件。',
  group: 'required',
  icon: Zap,
  items: { zn: '锌片', cu: '铜片', cu2: '另一块铜片', beaker: '盛稀硫酸的烧杯', ammeter: '电流表' },
  initial: () => ({ left: null, right: null, connected: false }),
  Scene,
  steps: [
    {
      kind: 'act',
      title: '插入锌片',
      instruction: '点击锌片拿起来，再点击烧杯，把锌片插入稀硫酸中。',
      tool: 'zn',
      target: 'beaker',
      verb: 'place',
      apply: (s) => ({ state: { ...s, left: 'zn' }, equations: ['Zn + 2H⁺ = Zn²⁺ + H₂↑'] }),
      observe: '锌片表面产生气泡。',
    },
    {
      kind: 'act',
      title: '插入铜片',
      instruction: '再把铜片插入稀硫酸中，注意不要让两块金属片接触。',
      tool: 'cu',
      target: 'beaker',
      verb: 'place',
      apply: (s) => ({ state: { ...s, right: 'cu' } }),
      observe: '铜片表面没有气泡。',
      note: '在金属活动性顺序中，铜排在氢后面，不能置换出稀硫酸中的氢。',
    },
    {
      kind: 'act',
      title: '用导线连接',
      instruction: '点击电流表，用导线把锌片、电流表和铜片连接起来。',
      target: 'ammeter',
      verb: 'connect',
      apply: (s) => ({
        state: { ...s, connected: true },
        equations: ['负极（锌片）：Zn − 2e⁻ = Zn²⁺', '正极（铜片）：2H⁺ + 2e⁻ = H₂↑'],
      }),
      observe: '电流表指针发生偏转；铜片表面产生大量气泡，锌片表面的气泡明显减少。',
      note: '黄色小球表示电子沿导线从锌片流向铜片。',
    },
    {
      kind: 'quiz',
      title: '电子的流向',
      question: '这个原电池中，电子是怎样流动的？',
      choices: ['从锌片经导线流向铜片', '从铜片经导线流向锌片', '从锌片经稀硫酸流向铜片', '电子不移动，移动的是 H⁺'],
      answer: 0,
      explain: '锌比铜活泼，锌失去电子作负极；电子经导线流到铜片（正极），溶液中的 H⁺ 在铜片上得到电子生成 H₂。电子不能在溶液中移动，溶液中靠离子导电。',
    },
    {
      kind: 'act',
      title: '换成两块铜片',
      instruction: '拿起另一块铜片，点击烧杯，用它替换锌片。',
      tool: 'cu2',
      target: 'beaker',
      verb: 'place',
      apply: (s) => ({ state: { ...s, left: 'cu2' } }),
      observe: '电流表指针回到零，两块铜片表面都没有气泡。',
    },
    {
      kind: 'quiz',
      title: '构成条件',
      question: '根据上面的实验，构成原电池需要哪些条件？',
      choices: [
        '两种活泼性不同的电极、电解质溶液、形成闭合回路',
        '两块相同的金属插在电解质溶液里',
        '只要有电解质溶液就可以',
        '两种不同的金属，不需要用导线连接',
      ],
      answer: 0,
      explain: '两极材料相同时没有电流，断开导线也没有电流。原电池需要：活泼性不同的两个电极、电解质溶液、闭合回路，以及一个能自发进行的氧化还原反应。',
    },
  ],
  summary: [
    '原电池把化学能直接转化为电能。',
    '较活泼的金属作负极，失去电子，发生氧化反应；正极上发生还原反应。',
    '电子从负极经导线流向正极；溶液中阳离子移向正极，阴离子移向负极。',
    '构成条件：两个活泼性不同的电极、电解质溶液、闭合回路、自发的氧化还原反应。',
  ],
}

