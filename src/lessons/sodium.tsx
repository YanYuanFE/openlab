import { useFrame } from '@react-three/fiber'
import { Droplets } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mix, type Look, type Reagent } from '@/chem/engine'
import { Dropper, DropperBottle, LIFT, RestingTool } from '@/kit/apparatus'
import { Carry } from '@/kit/carry'
import { Bench, Passthrough, Pointer, Tag, clickable, rand, type Vec3 } from '@/kit/core'
import { KeroseneJar, Knife, SodiumPiece, Tweezers } from '@/kit/lab2'
import { SHAPES, heightFor } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import type { Lesson, SceneProps } from './types'

interface S {
  indicator: boolean
  onPaper: boolean
  cutAt: number | null
  dropAt: number | null
}

const PHTH = { id: 'KSCN', name: '酚酞溶液', formula: '酚酞', species: [], dose: 0.1, color: '#eef3f5' } as unknown as Reagent
const WATER_ML = 150
const BEAKER: Vec3 = [2, 0, 2]
const SURFACE = heightFor(SHAPES.beaker250, WATER_ML)
const P: Record<string, Vec3> = {
  phth: [-12, 0, -8],
  jar: [-20, 0, 6],
  paper: [16, 0.05, -4],
  tweezers: [14, 0.15, 5],
  knife: [25, 0.05, 2],
}
const LIFE = 9
const PINK = '#f19cbf'
const WATER = '#e8f1f4'

/** Short filtered-noise hiss for the 「响」 of sodium on water. */
function hiss() {
  const Ctx = window.AudioContext
  if (!Ctx) return
  const ctx = new Ctx()
  const len = ctx.sampleRate * 2.5
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * (0.6 + 0.4 * Math.sin(i / 900))
  const src = ctx.createBufferSource()
  src.buffer = buf
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2500
  const gain = ctx.createGain()
  gain.gain.value = 0.12
  src.connect(hp).connect(gain).connect(ctx.destination)
  src.start()
  src.onended = () => void ctx.close()
}

/** Molten sodium ball darting about on the water surface, shrinking as it reacts. */
function SodiumBall({ dropAt }: { dropAt: number }) {
  const ball = useRef<THREE.Mesh>(null)
  const trail = useRef<(THREE.Mesh | null)[]>([])
  const pos = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const t = performance.now() / 1000 - dropAt
    const k = Math.min(Math.max(t / LIFE, 0), 1)
    const r = 0.65 * (1 - k)
    const R = 2.2
    pos.set(Math.sin(t * 1.9) * Math.cos(t * 0.7) * R, SURFACE + r * 0.4, Math.sin(t * 1.3 + 1) * R * 0.8)
    if (ball.current) {
      ball.current.visible = t > 0 && k < 1
      ball.current.position.copy(pos)
      ball.current.scale.setScalar(Math.max(r, 0.001))
    }
    trail.current.forEach((m, i) => {
      if (!m) return
      const age = (t * 3 + i / 10) % 1
      m.visible = t > 0 && k < 0.97
      m.position.set(pos.x + (rand(i) - 0.5) * 0.8 * age, SURFACE + age * 1.2, pos.z + (rand(i + 5) - 0.5) * 0.8 * age)
      m.scale.setScalar(0.14 * (1 - age) + 0.02)
    })
  })
  return (
    <group position={BEAKER}>
      <mesh ref={ball} visible={false}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color="#f4f6f8" metalness={0.5} roughness={0.15} emissive="#ffffff" emissiveIntensity={0.15} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} ref={(m) => void (trail.current[i] = m)} visible={false}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Freshly cut sodium: silvery at first, tarnishing within a few seconds. */
function CutPiece({ cutAt }: { cutAt: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f6f8', metalness: 0.45, roughness: 0.18 }), [])
  const fresh = useMemo(() => new THREE.Color('#f4f6f8'), [])
  const dull = useMemo(() => new THREE.Color('#9aa0a3'), [])
  useFrame(() => {
    const k = Math.min(Math.max((performance.now() / 1000 - cutAt - 1.5) / 4, 0), 1)
    mat.color.copy(fresh).lerp(dull, k)
    mat.metalness = 0.45 - 0.25 * k
    mat.roughness = 0.18 + 0.5 * k
  })
  return (
    <mesh material={mat} position={[1.4, 0.25, 0.3]} castShadow>
      <boxGeometry args={[0.6, 0.5, 0.6]} />
    </mesh>
  )
}

function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const s = state
  useEffect(() => {
    if (s.dropAt !== null) hiss()
  }, [s.dropAt])
  const top: Record<string, Vec3> = {
    phth: [P.phth[0], 15, P.phth[2]],
    jar: [P.jar[0], 11, P.jar[2]],
    paper: [P.paper[0], 4, P.paper[2]],
    tweezers: [P.tweezers[0], 3, P.tweezers[2]],
    knife: [P.knife[0] - 1.5, 3, P.knife[2]],
    beaker: [BEAKER[0], 13, BEAKER[2]],
  }
  const beakerLook = (now: number): Look => {
    if (!s.indicator || s.dropAt === null) return { color: WATER, opacity: 0.45, grains: null, bubbles: 0 }
    const k = Math.min(Math.max((now - s.dropAt - 0.5) / 6, 0), 1)
    return { color: mix(WATER, PINK, k), opacity: 0.45 + 0.15 * k, grains: null, bubbles: 0 }
  }
  const inPaper = s.onPaper && s.dropAt === null

  let carry = null
  if (anim?.tool === 'phth')
    carry = (
      <Carry key={anim.id} from={[P.phth[0], LIFT, P.phth[2]]} to={[BEAKER[0] + 1, SHAPES.beaker250.height + 2, BEAKER[2] + 1]} tool={<Dropper color={PHTH.color} />}
        action="drip" drops={3} surfaceY={SURFACE} onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.tool === 'tweezers' && anim.target === 'jar')
    carry = <Carry key={anim.id} from={[P.tweezers[0], LIFT, P.tweezers[2]]} to={[P.jar[0], 9, P.jar[2]]} tool={<Tweezers />} action="dip" onCommit={onCommit} onFinish={onFinish} />
  if (anim?.tool === 'tweezers' && anim.target === 'beaker')
    carry = (
      <Carry key={anim.id} from={[P.paper[0], LIFT, P.paper[2]]} to={[BEAKER[0], SHAPES.beaker250.height + 3, BEAKER[2]]} tool={<Tweezers holding />}
        action="dip" onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.tool === 'knife')
    carry = <Carry key={anim.id} from={[P.knife[0], LIFT - 4, P.knife[2]]} to={[P.paper[0] + 0.8, 3.4, P.paper[2]]} tool={<Knife />} action="dip" onCommit={onCommit} onFinish={onFinish} />

  return (
    <Stage extent={[60, 34]} target={[0, 5, 0]}>
      <Bench />
      <Vessel shape={SHAPES.beaker250} position={BEAKER} volume={WATER_ML} look={beakerLook} onClick={() => onItem('beaker')} />
      <Tag text="水" position={[BEAKER[0], 1.4, BEAKER[2] + 3.7]} width={1.6} />
      {s.dropAt !== null && <SodiumBall dropAt={s.dropAt} />}
      <DropperBottle reagent={PHTH} position={P.phth} held={held === 'phth'} hidden={anim?.tool === 'phth'} onClick={() => onItem('phth')} />
      <KeroseneJar position={P.jar} onClick={() => onItem('jar')} />

      <group position={P.paper} {...clickable(() => onItem('paper'))}>
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <boxGeometry args={[5, 0.04, 5]} />
          <meshStandardMaterial color="#fbfaf6" roughness={0.95} />
        </mesh>
        {inPaper && <SodiumPiece size={1.1} />}
        {inPaper && s.cutAt !== null && <CutPiece cutAt={s.cutAt} />}
      </group>
      <Tag text="滤纸" position={[P.paper[0], 0.6, P.paper[2] + 3]} width={2} />
      <RestingTool position={P.tweezers} held={held === 'tweezers'} hidden={anim?.tool === 'tweezers'} onClick={() => onItem('tweezers')} length={8}>
        <Tweezers />
      </RestingTool>
      <group position={held === 'knife' ? [P.knife[0], LIFT - 4, P.knife[2]] : P.knife} visible={anim?.tool !== 'knife'} {...clickable(() => onItem('knife'))}>
        <Passthrough active={held === 'knife'}>
          <Knife />
          <mesh position={[-1.5, 0.3, 0]}>
            <boxGeometry args={[8, 1, 2.4]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </Passthrough>
      </group>
      {carry}
      {pointer && <Pointer position={top[pointer]} />}
    </Stage>
  )
}

export const sodiumLesson: Lesson<S> = {
  id: 'sodium',
  title: '钠与水的反应',
  goal: '观察金属钠的物理性质，以及钠与水反应的「浮、熔、游、响、红」现象。',
  group: 'demo',
  icon: Droplets,
  items: { phth: '酚酞溶液', jar: '盛钠的煤油瓶', paper: '滤纸', tweezers: '镊子', knife: '小刀', beaker: '盛水的烧杯' },
  initial: () => ({ indicator: false, onPaper: false, cutAt: null, dropAt: null }),
  Scene,
  steps: [
    {
      kind: 'act',
      title: '滴加酚酞',
      instruction: '取酚酞溶液，向盛水的烧杯中滴加 2～3 滴。',
      tool: 'phth',
      target: 'beaker',
      verb: 'drip',
      apply: (s) => ({ state: { ...s, indicator: true } }),
      observe: '水仍然是无色的。',
    },
    {
      kind: 'act',
      title: '取出钠块',
      instruction: '拿起镊子，点击煤油瓶，夹出一小块钠，放在滤纸上吸干表面的煤油。',
      tool: 'tweezers',
      target: 'jar',
      verb: 'dip',
      apply: (s) => ({ state: { ...s, onPaper: true } }),
      observe: '钠块表面是一层灰暗的物质。',
      note: '钠不能用手拿，要用镊子夹取；表面的煤油要用滤纸吸干。',
    },
    {
      kind: 'quiz',
      title: '钠的保存',
      question: '为什么钠要保存在煤油中？',
      choices: ['隔绝空气和水，且钠的密度比煤油大，沉在底部', '煤油能和钠反应，生成保护层', '钠在煤油中会溶解，便于取用', '钠的密度比煤油小，浮在上面'],
      answer: 0,
      explain: '钠很活泼，能与空气中的氧气和水反应。钠不与煤油反应，密度又比煤油大，沉在煤油底部就与空气和水隔绝了。',
    },
    {
      kind: 'act',
      title: '切开钠块',
      instruction: '拿起小刀，点击滤纸上的钠块，切下绿豆大小的一块。',
      tool: 'knife',
      target: 'paper',
      verb: 'cut',
      apply: (s, now) => ({ state: { ...s, cutAt: now }, equations: ['4Na + O₂ = 2Na₂O'] }),
      observe: '钠很软，很容易切开。切面呈银白色，有金属光泽，但很快就变暗了。',
      note: '切面变暗是因为钠与空气中的氧气反应生成了 Na₂O。',
    },
    {
      kind: 'act',
      title: '放入水中',
      instruction: '用镊子夹起切下的小块钠，点击烧杯，把它放入水中。',
      tool: 'tweezers',
      target: 'beaker',
      verb: 'dip',
      apply: (s, now) => ({ state: { ...s, dropAt: now }, equations: ['2Na + 2H₂O = 2NaOH + H₂↑'] }),
      observe: '钠浮在水面上，熔成一个闪亮的小球，在水面上四处游动，发出嘶嘶的响声，逐渐变小直到消失；溶液从钠球周围开始变红。',
      note: '记忆口诀：浮、熔、游、响、红。',
    },
    {
      kind: 'quiz',
      title: '现象解释',
      question: '钠「熔成小球」说明了什么？',
      choices: ['钠与水反应放出热量，且钠的熔点低', '钠的密度比水小', '反应生成了气体', '反应生成了碱'],
      answer: 0,
      explain: '「浮」说明钠的密度比水小；「熔」说明反应放热且钠的熔点低；「游」和「响」说明产生了气体；「红」说明生成了碱（NaOH）。',
    },
    {
      kind: 'quiz',
      title: '安全',
      question: '下列做法中，正确的是？',
      choices: ['取用的钠块越大，现象越明显越好', '用手直接拿取钠块', '实验中剩余的钠要放回原试剂瓶', '钠着火时用水扑灭'],
      answer: 2,
      explain: '钠的取用量要小（绿豆大小），大块钠与水反应剧烈，可能爆炸；不能用手拿；剩余的钠放回原瓶；钠着火要用干燥的沙土盖灭，不能用水。',
    },
  ],
  summary: [
    '钠是银白色的软金属，密度比水小、熔点低，保存在煤油中。',
    '钠在空气中很快变暗：4Na + O₂ = 2Na₂O。',
    '钠与水反应：2Na + 2H₂O = 2NaOH + H₂↑，现象是浮、熔、游、响、红。',
    '钠着火不能用水灭，要用干燥的沙土盖灭。',
  ],
}
