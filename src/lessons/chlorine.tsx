import { Wind } from 'lucide-react'
import { REAGENTS, type Look, type Reagent } from '@/chem/engine'
import { AlcoholLamp, ClampArm, Dropper, DropperBottle, IronStand, LIFT, PhStrip, PowderJar, Spatula, WhiteTile } from '@/kit/apparatus'
import { Carry } from '@/kit/carry'
import { Bench, HitBox, Passthrough, Pointer, Tag, Timer, clickable, smooth, type Vec3 } from '@/kit/core'
import { ClayGauze, GasWasher, GlassTube, SeparatoryFunnel, Stopper, WASHER } from '@/kit/lab2'
import { SHAPES } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import type { Lesson, SceneProps } from './types'

interface S {
  mno2: boolean
  acidInFunnel: boolean
  openAt: number | null
  heatAt: number | null
  paperBlue: boolean
}

const CL2 = '#b9cf3a'
const ACID = 30
const ACID_RATE = 12
const HCL = { id: 'HCl', name: '浓盐酸', formula: '浓 HCl', species: [], dose: ACID, color: '#f3f4e8' } as unknown as Reagent

const FLASK: Vec3 = [-30, 9.15, 0]
const NECK_TOP = FLASK[1] + SHAPES.round250.height
const FUNNEL_TIP = NECK_TOP - 3
const W1: Vec3 = [-17, 0, 0]
const W2: Vec3 = [-5, 0, 0]
const JAR: Vec3 = [7, 0, 0]
const NAOH: Vec3 = [18, 0, 0]
const JAR_CAP = SHAPES.gasJar.table[SHAPES.gasJar.table.length - 1]
const P: Record<string, Vec3> = { MnO2: [-20, 0, 9], HCl: [-10, 0, 9], paper: [23, 0.35, 7], lamp: [FLASK[0], 0.8, FLASK[2]] }

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)
const sinceHeat = (s: S, now: number) => (s.heatAt === null ? -1 : now - s.heatAt)
const acidDrained = (s: S, now: number) => (s.openAt === null ? 0 : Math.min(ACID, (now - s.openAt) * ACID_RATE))

/** seconds after heating starts when gas reaches each part of the train */
const ARRIVE = { washer1: 2, washer2: 4, jar: 5, jarFull: 15 }

const plain = (color: string, opacity: number): Look => ({ color, opacity, grains: null, bubbles: 0 })

const TUBES: Vec3[][] = [
  [[FLASK[0] + 0.5, NECK_TOP + 0.3, 0], [FLASK[0] + 0.5, 25.5, 0], [W1[0] + WASHER.inX, 25.5, 0], [W1[0] + WASHER.inX, WASHER.portY, 0]],
  [[W1[0] + WASHER.outX, WASHER.portY, 0], [W1[0] + WASHER.outX, 13, 0], [W2[0] + WASHER.inX, 13, 0], [W2[0] + WASHER.inX, WASHER.portY, 0]],
  [[W2[0] + WASHER.outX, WASHER.portY, 0], [W2[0] + WASHER.outX, 13.5, 0], [JAR[0] - 0.9, 13.5, 0], [JAR[0] - 0.9, 1, 0]],
  [[JAR[0] + 0.9, 10.2, 0], [JAR[0] + 0.9, 13.5, 0], [NAOH[0] - 0.5, 13.5, 0], [NAOH[0] - 0.5, 2.5, 0]],
]
const TUBE_START = [0, ARRIVE.washer1, ARRIVE.washer2, ARRIVE.jarFull]

function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const s = state
  const t = (now: number) => sinceHeat(s, now)
  const top: Record<string, Vec3> = {
    MnO2: [P.MnO2[0], 15, P.MnO2[2]],
    HCl: [P.HCl[0], 15, P.HCl[2]],
    paper: [P.paper[0], 4, P.paper[2]],
    flask: [FLASK[0] + 5, FLASK[1] + 6, FLASK[2] + 3],
    funnel: [FLASK[0] + 3.5, FUNNEL_TIP + 13, FLASK[2]],
    lamp: [P.lamp[0] + 5, 8, P.lamp[2] + 3],
    jar: [JAR[0], 16.5, JAR[2]],
  }

  const flaskLook = (now: number): Look => {
    const k = clamp01(t(now) / 3)
    const wet = acidDrained(s, now) > 0
    return {
      color: wet ? '#4b4636' : '#e8f1f4',
      opacity: wet ? 0.92 : 0.4,
      grains: s.mno2 && !wet ? '#1f1f22' : null,
      bubbles: t(now) > 0 ? 0.5 : 0,
      gas: t(now) > 0 ? CL2 : undefined,
      gasOpacity: 0.35 * k,
    }
  }
  const washerLook = (color: string, arrive: number) => (now: number): Look => {
    const on = t(now) > arrive
    return { color, opacity: 0.5, grains: null, bubbles: on ? 0.75 : 0, gas: on ? CL2 : undefined, gasOpacity: 0.3 * clamp01((t(now) - arrive) / 2) }
  }
  const jarFill = (now: number) => JAR_CAP * smooth((t(now) - ARRIVE.jar) / (ARRIVE.jarFull - ARRIVE.jar))

  let anims = null
  if (anim?.tool === 'MnO2')
    anims = (
      <Carry key={anim.id} from={[P.MnO2[0] + 0.4, LIFT, P.MnO2[2]]} to={[FLASK[0], NECK_TOP + 2.2, FLASK[2]]} tool={<Spatula color={REAGENTS.MnO2.color} />}
        action="sprinkle" restRotation={-0.22} tilt={-1.3} lip={[0, 0.6]} color={REAGENTS.MnO2.color} surfaceY={FLASK[1] + 0.4} onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.tool === 'HCl')
    anims = (
      <Carry key={anim.id} from={[P.HCl[0], LIFT, P.HCl[2]]} to={[FLASK[0], FUNNEL_TIP + 14, FLASK[2]]} tool={<Dropper color={HCL.color} />}
        action="drip" drops={7} color="#e8ecd8" surfaceY={FUNNEL_TIP + 4.5} onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.tool === 'paper')
    anims = (
      <Carry key={anim.id} from={[P.paper[0], LIFT, P.paper[2]]} to={[JAR[0] + 1.6, SHAPES.gasJar.height + 0.8, JAR[2] + 1.6]} tool={<PhStrip color="#e6dcb8" />}
        action="dip" onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.verb === 'open') anims = <Timer key={anim.id} commitAt={0.3} finishAt={2.4} onCommit={onCommit} onFinish={onFinish} />
  if (anim?.verb === 'heat') anims = <Timer key={anim.id} commitAt={0.4} finishAt={5.5} onCommit={onCommit} onFinish={onFinish} />

  const lit = s.heatAt !== null || anim?.verb === 'heat'

  return (
    <Stage extent={[76, 48]} target={[-5, 8, 0]}>
      <Bench width={100} />
      <IronStand position={[FLASK[0], 0, FLASK[2]]} height={32}>
        <ClampArm y={9} ring={3} />
        <ClayGauze y={9.05} />
        <ClampArm y={NECK_TOP - 1.5} ring={1.1} />
        {s.mno2 && <ClampArm y={FUNNEL_TIP + 8} ring={2.6} />}
      </IronStand>
      <Vessel shape={SHAPES.round250} position={FLASK} volume={(now) => acidDrained(s, now)} look={flaskLook} onClick={() => onItem('flask')} />
      {s.mno2 && (
        <group position={[FLASK[0], 0, FLASK[2]]}>
          <Stopper y={NECK_TOP - 0.6} r={0.9} />
          <group position={[0, FUNNEL_TIP, 0]}>
            <SeparatoryFunnel
              volume={(now) => (s.acidInFunnel ? ACID - acidDrained(s, now) : 0)}
              look={() => plain('#eef0dc', 0.55)}
              open={s.openAt !== null}
              onClick={() => onItem('funnel')}
            />
          </group>
        </group>
      )}
      <AlcoholLamp position={P.lamp} lit={lit} onClick={() => onItem('lamp')} />

      {TUBES.map((pts, i) => (
        <GlassTube key={i} points={pts} flow={() => (t(performance.now() / 1000) > TUBE_START[i] ? CL2 : null)} />
      ))}
      <GasWasher position={W1} volume={120} look={washerLook('#e3eef2', ARRIVE.washer1)} label="饱和食盐水" />
      <GasWasher position={W2} volume={120} look={washerLook('#efede0', ARRIVE.washer2)} label="浓硫酸" />
      <group position={JAR}>
        <Vessel shape={SHAPES.gasJar} volume={jarFill} look={() => plain(CL2, 0.4)} onClick={() => onItem('jar')}>
          <mesh position={[0, SHAPES.gasJar.height + 0.25, 0]}>
            <boxGeometry args={[6.6, 0.3, 6.6]} />
            <meshStandardMaterial color="#dfe8ea" transparent opacity={0.5} roughness={0.8} />
          </mesh>
        </Vessel>
        <Tag text="集气瓶" position={[0, 1.4, 3.1]} width={3.6} />
      </group>
      <group position={NAOH}>
        <Vessel shape={SHAPES.beaker250} volume={150} look={(now) => ({ ...plain('#e6eef2', 0.45), bubbles: t(now) > ARRIVE.jarFull ? 0.5 : 0 })} />
        <Tag text="NaOH 溶液" position={[0, 1.4, 3.7]} width={4.2} />
      </group>

      <PowderJar reagent={REAGENTS.MnO2} position={P.MnO2} held={held === 'MnO2'} hidden={anim?.tool === 'MnO2'} onClick={() => onItem('MnO2')} />
      <DropperBottle reagent={HCL} position={P.HCl} held={held === 'HCl'} hidden={anim?.tool === 'HCl'} onClick={() => onItem('HCl')} />
      <WhiteTile position={[P.paper[0], 0, P.paper[2]]} size={[6, 0.3, 6]} />
      <group position={held === 'paper' ? [P.paper[0], LIFT, P.paper[2]] : P.paper} visible={anim?.tool !== 'paper'} {...clickable(() => onItem('paper'))}>
        <Passthrough active={held === 'paper'}>
          {held !== 'paper' && <HitBox size={[4, 0.8, 5.5]} />}
          <group rotation={held === 'paper' ? [0, 0, 0] : [-Math.PI / 2, 0, 0.3]} position={held === 'paper' ? [0, 0, 0] : [0, 0, 2.2]}>
            <PhStrip color={s.paperBlue ? '#2f3f9a' : '#e6dcb8'} />
          </group>
        </Passthrough>
      </group>
      <Tag text="淀粉 KI 试纸" position={[P.paper[0], 0.6, P.paper[2] + 3.6]} width={4.6} />
      {anims}
      {pointer && <Pointer position={top[pointer]} />}
    </Stage>
  )
}

export const chlorineLesson: Lesson<S> = {
  id: 'chlorine',
  title: '氯气的实验室制法',
  goal: '用 MnO₂ 和浓盐酸加热制取氯气，认识气体制备的完整装置：发生、除杂、干燥、收集、尾气处理。',
  group: 'demo',
  icon: Wind,
  items: { MnO2: '二氧化锰', HCl: '浓盐酸', paper: '湿润的淀粉 KI 试纸', flask: '圆底烧瓶', funnel: '分液漏斗', lamp: '酒精灯', jar: '集气瓶' },
  initial: () => ({ mno2: false, acidInFunnel: false, openAt: null, heatAt: null, paperBlue: false }),
  Scene,
  steps: [
    {
      kind: 'quiz',
      title: '检查气密性',
      question: '装置已经连接好。装入药品之前，首先要做什么？',
      choices: ['检查装置的气密性', '点燃酒精灯预热', '向烧瓶中加浓盐酸', '收集一瓶空气'],
      answer: 0,
      explain: '制取气体前都要先检查气密性。可以把导管末端浸入水中，微热烧瓶，导管口有气泡冒出、停止加热后导管内形成一段水柱，说明气密性良好。',
    },
    {
      kind: 'act',
      title: '加入 MnO₂',
      instruction: '点击二氧化锰试剂瓶取出药匙，向圆底烧瓶中加入 MnO₂ 粉末。',
      tool: 'MnO2',
      target: 'flask',
      verb: 'sprinkle',
      apply: (s) => ({ state: { ...s, mno2: true } }),
      observe: '黑色的 MnO₂ 粉末落入烧瓶，塞好带分液漏斗的橡胶塞。',
    },
    {
      kind: 'act',
      title: '加入浓盐酸',
      instruction: '取浓盐酸，加到分液漏斗中（此时活塞关闭）。',
      tool: 'HCl',
      target: 'funnel',
      verb: 'drip',
      apply: (s) => ({ state: { ...s, acidInFunnel: true } }),
      observe: '浓盐酸装在分液漏斗中。',
      note: '用分液漏斗可以控制加入盐酸的量和速率。',
    },
    {
      kind: 'act',
      title: '打开活塞',
      instruction: '点击分液漏斗，打开活塞，让浓盐酸流入烧瓶。',
      target: 'funnel',
      verb: 'open',
      apply: (s, now) => ({ state: { ...s, openAt: now } }),
      observe: '浓盐酸流入烧瓶，与 MnO₂ 混合成黑色浆液。常温下几乎不反应。',
    },
    {
      kind: 'act',
      title: '加热',
      instruction: '点击酒精灯点燃，隔着陶土网加热烧瓶。',
      target: 'lamp',
      verb: 'heat',
      apply: (s, now) => ({ state: { ...s, heatAt: now }, equations: ['MnO₂ + 4HCl(浓) =△= MnCl₂ + Cl₂↑ + 2H₂O'] }),
      observe: '烧瓶中产生黄绿色气体，依次经过饱和食盐水和浓硫酸，集气瓶中的黄绿色从下往上逐渐充满。',
    },
    {
      kind: 'quiz',
      title: '饱和食盐水的作用',
      question: '气体先通过饱和食盐水，目的是什么？',
      choices: ['除去 Cl₂ 中混有的 HCl', '除去 Cl₂ 中的水蒸气', '吸收多余的 Cl₂', '让 Cl₂ 溶解得更多'],
      answer: 0,
      explain: '浓盐酸易挥发，Cl₂ 中混有 HCl。HCl 极易溶于水，而 Cl₂ 在饱和食盐水中溶解度很小，所以用饱和食盐水除 HCl。',
    },
    {
      kind: 'quiz',
      title: '浓硫酸的作用',
      question: '接着通过浓硫酸，目的是什么？',
      choices: ['除去 HCl', '干燥氯气，除去水蒸气', '和氯气反应', '吸收尾气'],
      answer: 1,
      explain: '浓硫酸有吸水性，可以干燥 Cl₂。顺序是「先除杂、后干燥」，否则从食盐水中带出的水蒸气又会混进来。',
    },
    {
      kind: 'act',
      title: '验满',
      instruction: '拿起湿润的淀粉 KI 试纸，放在集气瓶口。',
      tool: 'paper',
      target: 'jar',
      verb: 'dip',
      ready: (s, now) => (sinceHeat(s, now) < ARRIVE.jarFull ? '集气瓶还没集满：等黄绿色充满整个瓶子，再放试纸。' : null),
      apply: (s) => ({ state: { ...s, paperBlue: true }, equations: ['Cl₂ + 2KI = 2KCl + I₂'] }),
      observe: '试纸变蓝，说明氯气已经集满。',
      note: 'Cl₂ 把 I⁻ 氧化成 I₂，I₂ 遇淀粉变蓝。',
    },
    {
      kind: 'quiz',
      title: '收集方法',
      question: '为什么用向上排空气法收集氯气（导管伸到集气瓶底部）？',
      choices: ['Cl₂ 的密度比空气大', 'Cl₂ 的密度比空气小', 'Cl₂ 极易溶于水', 'Cl₂ 有颜色'],
      answer: 0,
      explain: 'Cl₂ 的相对分子质量是 71，比空气的平均值 29 大得多，会沉在瓶底把空气向上赶出去。',
    },
    {
      kind: 'quiz',
      title: '尾气处理',
      question: '最后用 NaOH 溶液吸收多余的氯气，反应的化学方程式是？',
      choices: ['Cl₂ + 2NaOH = NaCl + NaClO + H₂O', 'Cl₂ + NaOH = NaCl + HClO', 'Cl₂ + 2NaOH = 2NaCl + H₂O₂', 'Cl₂ + H₂O = 2HCl + O₂'],
      answer: 0,
      explain: 'Cl₂ 有毒，不能直接排放。它与 NaOH 反应生成 NaCl、NaClO 和水，这也是制取「84」消毒液的原理。',
    },
  ],
  summary: [
    '原理：MnO₂ + 4HCl(浓) =△= MnCl₂ + Cl₂↑ + 2H₂O，稀盐酸不能反应。',
    '装置顺序：发生 → 除杂（饱和食盐水除 HCl）→ 干燥（浓硫酸）→ 收集（向上排空气法）→ 尾气处理（NaOH 溶液）。',
    '验满：湿润的淀粉 KI 试纸放在瓶口变蓝。',
    '氯气有毒，实验要在通风橱中进行。',
  ],
}
