import { useFrame } from '@react-three/fiber'
import { Sprout } from 'lucide-react'
import { useRef } from 'react'
import * as THREE from 'three'
import type { Look, Reagent } from '@/chem/engine'
import { BulbDropper, ClampArm, Dropper, DropperBottle, IronStand, LIFT } from '@/kit/apparatus'
import { Carry } from '@/kit/carry'
import { Bench, HitBox, Pointer, Tag, Timer, clickable, metal, smooth, type Vec3 } from '@/kit/core'
import { GlassTube, Jet, Stopper } from '@/kit/lab2'
import { SHAPES, heightFor } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import type { Lesson, SceneProps } from './types'

interface S {
  indicator: boolean
  clampOpen: boolean
  squeezeAt: number | null
}

const PHTH = { id: 'KSCN', name: '酚酞溶液', formula: '酚酞', species: [], dose: 0.1, color: '#eef3f5' } as unknown as Reagent
const PINK = '#f08fb8'
const FLASK: Vec3 = [0, 15, 0]
const BEAKER: Vec3 = [0, 0.8, 0]
const WATER_ML = 350
const FLASK_CAP = SHAPES.roundInverted.table[SHAPES.roundInverted.table.length - 1]
const FILL = 0.85
const NOZZLE_Y = FLASK[1] + 3
const PHTH_POS: Vec3 = [-13, 0, 6]
const T = { jet: [0.6, 6.8] }

const flaskFill = (s: S, now: number) => (s.squeezeAt === null ? 0 : FLASK_CAP * FILL * smooth((now - s.squeezeAt - T.jet[0]) / (T.jet[1] - T.jet[0])))
const jetting = (s: S, now: number) => s.squeezeAt !== null && now - s.squeezeAt > T.jet[0] && now - s.squeezeAt < T.jet[1]

/** Pinch clamp on the rubber tube; swings open when released. */
function PinchClamp({ open, onClick }: { open: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += ((open ? 1.3 : 0) - ref.current.rotation.y) * (1 - Math.exp(-dt * 6))
  })
  return (
    <group position={[-0.4, 9, 0]} {...clickable(onClick)}>
      <HitBox size={[3, 2, 3]} />
      <group ref={ref}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.9, 0, s * 0.35]} castShadow>
            <boxGeometry args={[2.2, 0.5, 0.12]} />
            {metal}
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Rubber-bulb dropper pointing up into the flask; squashes when squeezed. */
function SqueezeDropper({ squeezeAt, onClick }: { squeezeAt: number | null; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const t = squeezeAt === null ? 99 : performance.now() / 1000 - squeezeAt
    const k = t >= 0 && t < 0.6 ? Math.sin((t / 0.6) * Math.PI) : 0
    ref.current.scale.set(1 + k * 0.35, 1, 1 + k * 0.35)
  })
  return (
    <group position={[0.55, FLASK[1] + 2.4, 0]} rotation={[Math.PI, 0, 0]} {...clickable(onClick)}>
      <HitBox size={[2.4, 4, 2.4]} position={[0, 7, 0]} />
      <group ref={ref}>
        <BulbDropper />
      </group>
    </group>
  )
}

function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const s = state
  const top: Record<string, Vec3> = {
    phth: [PHTH_POS[0], 15, PHTH_POS[2]],
    beaker: [BEAKER[0] + 6, 9, BEAKER[2] + 3],
    clamp: [3.5, 11, 1],
    dropper: [3.5, 7.5, 1],
  }
  const water: Look = { color: '#e8f1f4', opacity: 0.45, grains: null, bubbles: 0 }
  const pinkLook = (): Look => ({ color: s.indicator ? PINK : '#e8f1f4', opacity: 0.6, grains: null, bubbles: 0 })

  let anims = null
  if (anim?.tool === 'phth')
    anims = (
      <Carry key={anim.id} from={[PHTH_POS[0], LIFT, PHTH_POS[2]]} to={[BEAKER[0] + 2.6, SHAPES.beaker400.height + 3, BEAKER[2] + 2]} tool={<Dropper color={PHTH.color} />}
        action="drip" drops={3} surfaceY={BEAKER[1] + heightFor(SHAPES.beaker400, WATER_ML)} onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.verb === 'open') anims = <Timer key={anim.id} commitAt={0.2} finishAt={0.9} onCommit={onCommit} onFinish={onFinish} />
  if (anim?.verb === 'squeeze') anims = <Timer key={anim.id} commitAt={0.1} finishAt={7.2} onCommit={onCommit} onFinish={onFinish} />

  return (
    <Stage extent={[44, 38]} target={[0, 11, 0]}>
      <Bench />
      <IronStand position={[0, 0, 0]} height={32}>
        <ClampArm y={FLASK[1] + 1.2} ring={1.15} />
        <ClampArm y={FLASK[1] + 8} ring={4.15} />
      </IronStand>
      <Vessel shape={SHAPES.roundInverted} position={FLASK} lip={false} volume={(now) => flaskFill(s, now)} look={pinkLook} />
      <Tag text="NH₃" position={[FLASK[0], FLASK[1] + 8.5, FLASK[2] + 4.4]} width={2.4} />
      <group position={[0, 0, 0]}>
        <Stopper y={FLASK[1] - 1.2} r={0.9} />
      </group>
      <GlassTube points={[[-0.4, NOZZLE_Y, 0], [-0.4, 2, 0]]} flow={() => (jetting(s, performance.now() / 1000) ? PINK : null)} />
      <mesh position={[-0.4, 9, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 3.6, 12]} />
        <meshStandardMaterial color="#4a3a33" roughness={0.8} />
      </mesh>
      <PinchClamp open={s.clampOpen} onClick={() => onItem('clamp')} />
      <SqueezeDropper squeezeAt={s.squeezeAt} onClick={() => onItem('dropper')} />
      <group position={[-0.4, NOZZLE_Y, 0]}>
        <Jet height={FLASK[1] + SHAPES.roundInverted.height - NOZZLE_Y - 0.8} color={PINK} active={() => jetting(s, performance.now() / 1000)} />
      </group>
      <Vessel
        shape={SHAPES.beaker400}
        position={BEAKER}
        volume={(now) => WATER_ML - flaskFill(s, now)}
        look={() => water}
        onClick={() => onItem('beaker')}
      />
      <Tag text="水" position={[BEAKER[0] + 2.6, 1.6, BEAKER[2] + 4.3]} width={1.6} />
      <DropperBottle reagent={PHTH} position={PHTH_POS} held={held === 'phth'} hidden={anim?.tool === 'phth'} onClick={() => onItem('phth')} />
      {anims}
      {pointer && <Pointer position={top[pointer]} />}
    </Stage>
  )
}

export const fountainLesson: Lesson<S> = {
  id: 'fountain',
  title: '氨的喷泉实验',
  goal: '利用氨气极易溶于水的性质形成红色喷泉，理解喷泉形成的原理和氨水的碱性。',
  group: 'demo',
  icon: Sprout,
  items: { phth: '酚酞溶液', beaker: '烧杯中的水', clamp: '止水夹', dropper: '胶头滴管' },
  initial: () => ({ indicator: false, clampOpen: false, squeezeAt: null }),
  Scene,
  steps: [
    {
      kind: 'act',
      title: '滴加酚酞',
      instruction: '干燥的烧瓶中已充满氨气并倒置，胶头滴管中预先吸有水。取酚酞溶液，向烧杯的水中滴加几滴。',
      tool: 'phth',
      target: 'beaker',
      verb: 'drip',
      apply: (s) => ({ state: { ...s, indicator: true } }),
      observe: '烧杯中的水仍然是无色的。',
    },
    {
      kind: 'quiz',
      title: '想一想',
      question: '做这个实验时，烧瓶为什么必须是干燥的？',
      choices: ['氨气极易溶于水，瓶内有水会先溶解一部分氨气，喷泉就不明显了', '水会和酚酞反应', '潮湿的烧瓶容易破裂', '氨气遇水会爆炸'],
      answer: 0,
      explain: '1 体积水大约能溶解 700 体积氨气。烧瓶里如果有水，会提前吸收氨气，瓶内外的压强差就不够大。装置的气密性也必须良好。',
    },
    {
      kind: 'act',
      title: '打开止水夹',
      instruction: '点击橡胶管上的止水夹，把它打开。',
      target: 'clamp',
      verb: 'open',
      apply: (s) => ({ state: { ...s, clampOpen: true } }),
      observe: '止水夹打开了，暂时没有明显变化。',
    },
    {
      kind: 'act',
      title: '挤压胶头滴管',
      instruction: '点击胶头滴管，挤压胶头，使少量水进入烧瓶。',
      target: 'dropper',
      verb: 'squeeze',
      apply: (s, now) => ({ state: { ...s, squeezeAt: now }, equations: ['NH₃ + H₂O ⇌ NH₃·H₂O ⇌ NH₄⁺ + OH⁻'] }),
      observe: '烧杯中的水沿玻璃管迅速进入烧瓶，形成红色喷泉，烧瓶中的液体呈红色。',
    },
    {
      kind: 'quiz',
      title: '喷泉的原理',
      question: '为什么会形成喷泉？',
      choices: ['氨气极易溶于水，烧瓶内压强迅速减小，大气压把烧杯中的水压进烧瓶', '酚酞和氨气反应产生了大量气体', '胶头滴管把水挤进了烧瓶', '烧瓶受热，内部压强增大'],
      answer: 0,
      explain: '少量水溶解了大量氨气，烧瓶内的压强急剧下降，外界大气压把烧杯里的水压了上来。胶头滴管只是「引发」，喷泉的动力是内外的压强差。',
    },
    {
      kind: 'quiz',
      title: '为什么变红',
      question: '喷进烧瓶的溶液为什么呈红色？',
      choices: ['氨水呈碱性，酚酞遇碱变红', '氨气是红色的', '酚酞遇水变红', '烧瓶中有红色杂质'],
      answer: 0,
      explain: 'NH₃ 溶于水生成 NH₃·H₂O，它部分电离出 OH⁻，溶液呈碱性，所以酚酞变红。',
    },
    {
      kind: 'quiz',
      title: '举一反三',
      question: '下列哪一组气体和液体，也能做成喷泉实验？',
      choices: ['CO₂ 和 NaOH 溶液', 'O₂ 和水', 'H₂ 和水', 'N₂ 和水'],
      answer: 0,
      explain: '只要气体能被液体大量吸收、使瓶内压强迅速减小，就能形成喷泉。CO₂ 能被 NaOH 溶液大量吸收；HCl 和水也可以。O₂、H₂、N₂ 都难溶于水。',
    },
  ],
  summary: [
    '氨气极易溶于水（1 : 700），溶于水使烧瓶内压强迅速减小，形成喷泉。',
    '氨水呈弱碱性：NH₃ + H₂O ⇌ NH₃·H₂O ⇌ NH₄⁺ + OH⁻。',
    '成功的关键：烧瓶干燥、气密性好、氨气充满。',
    '能形成喷泉的组合：气体能被液体大量吸收，如 HCl 和水、CO₂ 和 NaOH 溶液。',
  ],
}
