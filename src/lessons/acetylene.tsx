import { Flame as FlameIcon } from 'lucide-react'
import { mix, type Look, type Reagent } from '@/chem/engine'
import { ClampArm, Dropper, DropperBottle, IronStand, LIFT, PowderJar, Spatula } from '@/kit/apparatus'
import { Carry } from '@/kit/carry'
import { Bench, Flame, HitBox, Pointer, Tag, Timer, clickable, smooth, type Vec3 } from '@/kit/core'
import { ClayGauze, GasWasher, GlassTube, SeparatoryFunnel, Smoke, Stopper, WASHER } from '@/kit/lab2'
import { SHAPES } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import type { Lesson, SceneProps } from './types'

interface S {
  carbide: boolean
  brine: boolean
  openAt: number | null
  litAt: number | null
}

const CAC2 = { id: 'Fe', name: '电石', formula: 'CaC₂', species: [], dose: 0, color: '#5d5f63', solid: true } as unknown as Reagent
const BRINE = { id: 'water', name: '饱和食盐水', formula: 'NaCl', species: [], dose: 30, color: '#eef3f5' } as unknown as Reagent
const LIQ = 30
const RATE = 6
const FLASK: Vec3 = [-30, 9.15, 0]
const NECK_TOP = FLASK[1] + SHAPES.round250.height
const FUNNEL_TIP = NECK_TOP - 3
const W: Vec3[] = [[-17, 0, 0], [-5, 0, 0], [7, 0, 0]]
const NOZZLE: Vec3 = [18, 17, 0]
const P: Record<string, Vec3> = { cac2: [-20, 0, 9], brine: [-10, 0, 9] }
/** seconds after the stopcock opens when gas reaches each bottle / the nozzle */
const ARRIVE = [1.5, 3, 4.5, 6]
const FADE = 9
const WATER = '#e8f1f4'

const drained = (s: S, now: number) => (s.openAt === null ? 0 : Math.min(LIQ, (now - s.openAt) * RATE))
const since = (s: S, now: number) => (s.openAt === null ? -1 : now - s.openAt)

const TUBES: Vec3[][] = [
  [[FLASK[0] + 0.5, NECK_TOP + 0.3, 0], [FLASK[0] + 0.5, 25.5, 0], [W[0][0] + WASHER.inX, 25.5, 0], [W[0][0] + WASHER.inX, WASHER.portY, 0]],
  [[W[0][0] + WASHER.outX, WASHER.portY, 0], [W[0][0] + WASHER.outX, 13, 0], [W[1][0] + WASHER.inX, 13, 0], [W[1][0] + WASHER.inX, WASHER.portY, 0]],
  [[W[1][0] + WASHER.outX, WASHER.portY, 0], [W[1][0] + WASHER.outX, 13, 0], [W[2][0] + WASHER.inX, 13, 0], [W[2][0] + WASHER.inX, WASHER.portY, 0]],
  [[W[2][0] + WASHER.outX, WASHER.portY, 0], [W[2][0] + WASHER.outX, 13, 0], [NOZZLE[0], 13, 0], [NOZZLE[0], NOZZLE[1], 0]],
]

function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const s = state
  const t = (now: number) => since(s, now)
  const top: Record<string, Vec3> = {
    cac2: [P.cac2[0], 15, P.cac2[2]],
    brine: [P.brine[0], 15, P.brine[2]],
    flask: [FLASK[0] + 5, FLASK[1] + 6, 3],
    funnel: [FLASK[0] + 3.5, FUNNEL_TIP + 13, 0],
    nozzle: [NOZZLE[0] + 2.5, NOZZLE[1] + 3, 0],
  }
  const plain = (color: string, opacity = 0.6): Look => ({ color, opacity, grains: null, bubbles: 0 })
  const flaskLook = (now: number): Look => {
    const wet = drained(s, now) > 0
    return { color: wet ? '#cfd0c8' : WATER, opacity: wet ? 0.85 : 0.4, grains: s.carbide ? '#4c4e52' : null, bubbles: wet ? 1 : 0 }
  }
  const washer = (from: string, i: number, fades: boolean) => (now: number): Look => {
    const on = t(now) > ARRIVE[i]
    const k = fades ? smooth((t(now) - ARRIVE[i]) / FADE) : 0
    return { color: mix(from, WATER, k), opacity: 0.75 - 0.3 * k, grains: null, bubbles: on ? 0.7 : 0 }
  }
  const burning = (now: number) => s.litAt !== null && now > s.litAt

  let anims = null
  if (anim?.tool === 'cac2')
    anims = (
      <Carry key={anim.id} from={[P.cac2[0] + 0.4, LIFT, P.cac2[2]]} to={[FLASK[0], NECK_TOP + 2.2, 0]} tool={<Spatula color={CAC2.color} />}
        action="sprinkle" restRotation={-0.22} tilt={-1.3} lip={[0, 0.6]} color={CAC2.color} surfaceY={FLASK[1] + 0.4} onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.tool === 'brine')
    anims = (
      <Carry key={anim.id} from={[P.brine[0], LIFT, P.brine[2]]} to={[FLASK[0], FUNNEL_TIP + 14, 0]} tool={<Dropper color={BRINE.color} />}
        action="drip" drops={7} color="#d8e6ea" surfaceY={FUNNEL_TIP + 4.5} onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.verb === 'open') anims = <Timer key={anim.id} commitAt={0.3} finishAt={3} onCommit={onCommit} onFinish={onFinish} />
  if (anim?.verb === 'heat') anims = <Timer key={anim.id} commitAt={0.3} finishAt={3} onCommit={onCommit} onFinish={onFinish} />

  return (
    <Stage extent={[80, 48]} target={[-6, 8, 0]}>
      <Bench width={104} />
      <IronStand position={[FLASK[0], 0, FLASK[2]]} height={32}>
        <ClampArm y={9} ring={3} />
        <ClayGauze y={9.05} />
        <ClampArm y={NECK_TOP - 1.5} ring={1.1} />
        {s.carbide && <ClampArm y={FUNNEL_TIP + 8} ring={2.6} />}
      </IronStand>
      <Vessel shape={SHAPES.round250} position={FLASK} volume={(now) => drained(s, now)} look={flaskLook} onClick={() => onItem('flask')} />
      {s.carbide && (
        <group position={[FLASK[0], 0, FLASK[2]]}>
          <Stopper y={NECK_TOP - 0.6} r={0.9} />
          <group position={[0, FUNNEL_TIP, 0]}>
            <SeparatoryFunnel volume={(now) => (s.brine ? LIQ - drained(s, now) : 0)} look={() => plain('#e3edf0', 0.5)} open={s.openAt !== null} onClick={() => onItem('funnel')} />
          </group>
        </group>
      )}
      {TUBES.map((pts, i) => (
        <GlassTube key={i} points={pts} flow={() => (t(performance.now() / 1000) > (i === 0 ? 0 : ARRIVE[i - 1]) ? '#d9dee0' : null)} />
      ))}
      <GasWasher position={W[0]} volume={110} look={washer('#4f8fd1', 0, false)} label="CuSO₄ 溶液" />
      <GasWasher position={W[1]} volume={110} look={washer('#7a2c8c', 1, true)} label="酸性 KMnO₄" />
      <GasWasher position={W[2]} volume={110} look={washer('#d4772c', 2, true)} label="溴的 CCl₄ 溶液" />
      <group position={NOZZLE} {...clickable(() => onItem('nozzle'))}>
        <HitBox size={[3, 4, 3]} position={[0, -1, 0]} />
        <mesh position={[0, 0.3, 0]} renderOrder={2}>
          <coneGeometry args={[0.28, 0.9, 12]} />
          <meshStandardMaterial color="#dfe9ec" transparent opacity={0.5} />
        </mesh>
        <group position={[0, 0.7, 0]} visible={burning(performance.now() / 1000) || anim?.verb === 'heat'}>
          <Flame scale={1.6} />
          <group position={[0, 2.6, 0]}>
            <Smoke active={() => burning(performance.now() / 1000)} />
          </group>
        </group>
      </group>
      <Tag text="尖嘴导管" position={[NOZZLE[0], 1.4, 3]} width={3.6} />

      <PowderJar reagent={CAC2} position={P.cac2} held={held === 'cac2'} hidden={anim?.tool === 'cac2'} onClick={() => onItem('cac2')} />
      <DropperBottle reagent={BRINE} position={P.brine} held={held === 'brine'} hidden={anim?.tool === 'brine'} onClick={() => onItem('brine')} />
      {anims}
      {pointer && <Pointer position={top[pointer]} />}
    </Stage>
  )
}

export const acetyleneLesson: Lesson<S> = {
  id: 'acetylene',
  title: '乙炔的实验室制法与性质',
  goal: '用电石和饱和食盐水制取乙炔，观察它使酸性高锰酸钾溶液和溴的四氯化碳溶液褪色，以及燃烧的现象。',
  group: 'demo',
  icon: FlameIcon,
  items: { cac2: '电石', brine: '饱和食盐水', flask: '圆底烧瓶', funnel: '分液漏斗', nozzle: '尖嘴导管' },
  initial: () => ({ carbide: false, brine: false, openAt: null, litAt: null }),
  Scene,
  steps: [
    {
      kind: 'act',
      title: '加入电石',
      instruction: '装置的气密性已检查完毕。取电石（CaC₂），加入圆底烧瓶中。',
      tool: 'cac2',
      target: 'flask',
      verb: 'sprinkle',
      apply: (s) => ({ state: { ...s, carbide: true } }),
      observe: '灰黑色的电石块落入烧瓶，塞好带分液漏斗的橡胶塞。',
    },
    {
      kind: 'act',
      title: '加入饱和食盐水',
      instruction: '取饱和食盐水，加到分液漏斗中。',
      tool: 'brine',
      target: 'funnel',
      verb: 'drip',
      apply: (s) => ({ state: { ...s, brine: true } }),
      observe: '饱和食盐水装在分液漏斗中。',
    },
    {
      kind: 'quiz',
      title: '为什么不用水',
      question: '为什么用饱和食盐水代替水和电石反应？',
      choices: ['减缓反应速率，得到平稳的乙炔气流', '食盐是反应的催化剂', '防止乙炔溶解在水中', '让生成的乙炔更纯'],
      answer: 0,
      explain: '电石与水反应非常剧烈。用饱和食盐水，水的含量相对减少，反应变得平缓，便于控制。同时用分液漏斗控制滴加速度。',
    },
    {
      kind: 'act',
      title: '滴加食盐水',
      instruction: '点击分液漏斗，打开活塞，让饱和食盐水逐滴流入烧瓶。',
      target: 'funnel',
      verb: 'open',
      apply: (s, now) => ({ state: { ...s, openAt: now }, equations: ['CaC₂ + 2H₂O → Ca(OH)₂ + CH≡CH↑'] }),
      observe: '烧瓶中剧烈反应，产生大量气泡。气体依次通过三个洗气瓶。',
    },
    {
      kind: 'quiz',
      title: 'CuSO₄ 溶液的作用',
      question: '气体先通过 CuSO₄ 溶液，目的是什么？',
      choices: ['除去 H₂S 等杂质气体', '干燥乙炔', '检验乙炔', '吸收多余的乙炔'],
      answer: 0,
      explain: '电石中含有硫化钙等杂质，反应会生成 H₂S 等气体，它们也能使酸性 KMnO₄ 溶液褪色，会干扰后面的检验。CuSO₄ 与 H₂S 反应生成黑色 CuS 沉淀，可以除去它。',
    },
    {
      kind: 'quiz',
      title: '两种溶液褪色',
      question: '酸性 KMnO₄ 溶液和溴的 CCl₄ 溶液都褪色了，分别发生了什么反应？',
      choices: ['前者是氧化反应，后者是加成反应', '两者都是加成反应', '两者都是取代反应', '前者是取代反应，后者是氧化反应'],
      answer: 0,
      explain: '乙炔含碳碳三键，能被酸性 KMnO₄ 氧化；也能与溴发生加成反应：CH≡CH + 2Br₂ → CHBr₂–CHBr₂。',
    },
    {
      kind: 'act',
      title: '点燃',
      instruction: '验纯后，点击尖嘴导管处，点燃乙炔。',
      target: 'nozzle',
      verb: 'heat',
      apply: (s, now) => ({ state: { ...s, litAt: now }, equations: ['2C₂H₂ + 5O₂ =点燃= 4CO₂ + 2H₂O'] }),
      observe: '乙炔燃烧，火焰明亮，并伴有浓烈的黑烟。',
      note: '点燃可燃性气体前一定要先检验纯度，防止爆炸。',
    },
    {
      kind: 'quiz',
      title: '为什么冒黑烟',
      question: '乙炔燃烧时为什么会产生浓烈的黑烟？',
      choices: ['乙炔的含碳量高，燃烧不充分，生成了炭黑', '乙炔中混有杂质', '空气中有灰尘', '生成的 CO₂ 是黑色的'],
      answer: 0,
      explain: '乙炔中碳的质量分数约为 92%，比甲烷、乙烯都高。在空气中燃烧时氧气不足，部分碳没有完全燃烧，以炭黑的形式冒出。',
    },
  ],
  summary: [
    '原理：CaC₂ + 2H₂O → Ca(OH)₂ + CH≡CH↑，用饱和食盐水减缓反应速率。',
    'CuSO₄ 溶液除去 H₂S 等杂质，防止干扰检验。',
    '乙炔能使酸性 KMnO₄ 溶液褪色（氧化反应），也能使溴的 CCl₄ 溶液褪色（加成反应）。',
    '乙炔燃烧火焰明亮并伴有浓烟，点燃前要验纯。',
  ],
}
