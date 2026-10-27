import { useFrame } from '@react-three/fiber'
import { BatteryCharging } from 'lucide-react'
import { useRef } from 'react'
import * as THREE from 'three'
import { mix, type Look } from '@/chem/engine'
import { LIFT, PhStrip, Wire, WhiteTile } from '@/kit/apparatus'
import { Carry } from '@/kit/carry'
import { Bench, Bubbles, HitBox, Passthrough, Pointer, Tag, Timer, clickable, rand, smooth, type Vec3 } from '@/kit/core'
import { CarbonRod, PowerSupply, SUPPLY_TERMINALS } from '@/kit/lab2'
import { SHAPES, heightFor } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import type { Lesson, SceneProps } from './types'

interface S {
  rods: boolean
  poweredAt: number | null
  paperBlue: boolean
}

const BEAKER: Vec3 = [0, 0, 4]
const ML = 180
const SURFACE = heightFor(SHAPES.beaker250, ML)
const SLOT = { cathode: -1.8, anode: 1.8 }
const ROD_Y = 0.4
const SUPPLY: Vec3 = [-15, 0, -6]
const P: Record<string, Vec3> = { rods: [-17, 0.4, 9], paper: [16, 0.35, 8] }
const CUCL2 = '#4fb3a6'
const DEPOSIT_TIME = 14

const term = (i: 0 | 1): Vec3 => [SUPPLY[0] + SUPPLY_TERMINALS[i][0], SUPPLY[1] + SUPPLY_TERMINALS[i][1] + 0.4, SUPPLY[2] + SUPPLY_TERMINALS[i][2]]
const clip = (x: number): Vec3 => [BEAKER[0] + x, ROD_Y + 12.6, BEAKER[2]]

function RodPair() {
  return (
    <group>
      <group position={[SLOT.cathode, 0, 0]}>
        <CarbonRod label="C" />
      </group>
      <group position={[SLOT.anode, 0, 0]}>
        <CarbonRod label="C" />
      </group>
    </group>
  )
}

/** Cu²⁺ (blue) drifting to the cathode and Cl⁻ (green) drifting to the anode. */
function IonMigration({ on }: { on: () => boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const N = 16
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const active = on()
    refs.current.forEach((m, i) => {
      if (!m) return
      const cu = i < N / 2
      const phase = (t * 0.25 + rand(i)) % 1
      const span = SLOT.anode - SLOT.cathode - 0.8
      const x = cu ? SLOT.anode - 0.4 - phase * span : SLOT.cathode + 0.4 + phase * span
      m.visible = active
      m.position.set(x, 0.8 + rand(i + 9) * (SURFACE - 1.4), (rand(i + 3) - 0.5) * 3.2)
    })
  })
  return (
    <group position={BEAKER}>
      {Array.from({ length: N }, (_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)} visible={false} renderOrder={3}>
          <sphereGeometry args={[i < N / 2 ? 0.2 : 0.26, 10, 8]} />
          <meshBasicMaterial color={i < N / 2 ? '#2f6fe0' : '#3fbf5a'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const s = state
  const t = (now: number) => (s.poweredAt === null ? -1 : now - s.poweredAt)
  const top: Record<string, Vec3> = {
    rods: [P.rods[0], 3, P.rods[2]],
    paper: [P.paper[0], 4, P.paper[2]],
    beaker: [BEAKER[0] + 5, 10, BEAKER[2] + 3],
    power: [SUPPLY[0] + 6, 9, SUPPLY[2] + 3],
  }
  const look = (now: number): Look => ({ color: mix(CUCL2, '#9fd6cf', 0.5 * smooth(t(now) / DEPOSIT_TIME)), opacity: 0.6, grains: null, bubbles: 0 })
  const powered = s.poweredAt !== null

  let anims = null
  if (anim?.tool === 'rods')
    anims = <Carry key={anim.id} from={[P.rods[0], LIFT, P.rods[2]]} to={[BEAKER[0], ROD_Y, BEAKER[2]]} tool={<RodPair />} action="place" onCommit={onCommit} onFinish={onFinish} />
  if (anim?.tool === 'paper')
    anims = (
      <Carry key={anim.id} from={[P.paper[0], LIFT, P.paper[2]]} to={[BEAKER[0] + SLOT.anode + 0.9, SURFACE + 1.2, BEAKER[2] + 0.6]} tool={<PhStrip color="#e6dcb8" />}
        action="dip" onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.verb === 'connect') anims = <Timer key={anim.id} commitAt={0.3} finishAt={4} onCommit={onCommit} onFinish={onFinish} />

  return (
    <Stage extent={[54, 36]} target={[0, 5, 0]}>
      <Bench />
      <Vessel shape={SHAPES.beaker250} position={BEAKER} volume={ML} look={look} onClick={() => onItem('beaker')} />
      <Tag text="CuCl₂ 溶液" position={[BEAKER[0], 1.4, BEAKER[2] + 3.7]} width={3.6} />
      {s.rods && (
        <group position={[BEAKER[0], ROD_Y, BEAKER[2]]}>
          <group position={[SLOT.cathode, 0, 0]}>
            <CarbonRod label="阴极" copper={() => smooth(t(performance.now() / 1000) / DEPOSIT_TIME)} />
          </group>
          <group position={[SLOT.anode, 0, 0]}>
            <CarbonRod label="阳极" />
          </group>
          <mesh position={[0, SHAPES.beaker250.height + 0.2, 0]}>
            <boxGeometry args={[8.4, 0.4, 1.4]} />
            <meshStandardMaterial color="#e9e4d8" roughness={0.7} />
          </mesh>
        </group>
      )}
      <group position={[BEAKER[0] + SLOT.anode, 0, BEAKER[2]]}>
        <Bubbles rate={() => (t(performance.now() / 1000) > 0.5 ? 0.7 : 0)} radius={0.45} top={() => SURFACE} bottom={0.8} size={0.11} count={18} />
      </group>
      <IonMigration on={() => t(performance.now() / 1000) > 0} />
      {powered && (
        <>
          <Wire points={[term(0), [-12, 11, -4], [-5, 15, 2], clip(SLOT.cathode)]} color="#1f2430" />
          <Wire points={[term(1), [-9, 12, -4], [2, 16.5, 2], clip(SLOT.anode)]} color="#c0262d" />
          <Tag text="蓝球 Cu²⁺ → 阴极" position={[-8.5, 7, BEAKER[2] + 1]} width={3.2} />
          <Tag text="阳极 ← Cl⁻ 绿球" position={[8.5, 7, BEAKER[2] + 1]} width={3.2} />
        </>
      )}
      <PowerSupply position={SUPPLY} on={powered} onClick={() => onItem('power')} />

      <WhiteTile position={[P.rods[0], 0, P.rods[2]]} size={[16, 0.3, 7]} />
      {!s.rods && (
        <group position={held === 'rods' ? [P.rods[0], LIFT, P.rods[2]] : P.rods} visible={anim?.tool !== 'rods'} {...clickable(() => onItem('rods'))}>
          <Passthrough active={held === 'rods'}>
            <group rotation={held === 'rods' ? [0, 0, 0] : [-Math.PI / 2, 0, Math.PI / 2]} position={held === 'rods' ? [0, 0, 0] : [6.5, 0.4, 0]}>
              <RodPair />
            </group>
            {held !== 'rods' && <HitBox size={[14, 1.5, 6]} />}
          </Passthrough>
        </group>
      )}
      <Tag text="碳棒" position={[P.rods[0], 0.6, P.rods[2] + 4]} width={2} />
      <WhiteTile position={[P.paper[0], 0, P.paper[2]]} size={[6, 0.3, 6]} />
      <group position={held === 'paper' ? [P.paper[0], LIFT, P.paper[2]] : P.paper} visible={anim?.tool !== 'paper'} {...clickable(() => onItem('paper'))}>
        <Passthrough active={held === 'paper'}>
          {held !== 'paper' && <HitBox size={[4, 0.8, 5.5]} />}
          <group rotation={held === 'paper' ? [0, 0, 0] : [-Math.PI / 2, 0, 0.3]} position={held === 'paper' ? [0, 0, 0] : [0, 0, 2.2]}>
            <PhStrip color={s.paperBlue ? '#2f3f9a' : '#e6dcb8'} />
          </group>
        </Passthrough>
      </group>
      <Tag text="湿润的淀粉 KI 试纸" position={[P.paper[0], 0.6, P.paper[2] + 3.6]} width={3.4} />
      {anims}
      {pointer && <Pointer position={top[pointer]} />}
    </Stage>
  )
}

export const electrolysisLesson: Lesson<S> = {
  id: 'electrolysis',
  title: '电解氯化铜溶液',
  goal: '用惰性电极电解 CuCl₂ 溶液，观察两极现象和离子的定向移动，理解电解池的工作原理。',
  group: 'demo',
  icon: BatteryCharging,
  items: { rods: '两根碳棒', beaker: '盛 CuCl₂ 溶液的烧杯', power: '学生电源', paper: '湿润的淀粉 KI 试纸' },
  initial: () => ({ rods: false, poweredAt: null, paperBlue: false }),
  Scene,
  steps: [
    {
      kind: 'act',
      title: '插入碳棒',
      instruction: '拿起两根碳棒，点击烧杯，把它们插入 CuCl₂ 溶液中，两根碳棒不要接触。',
      tool: 'rods',
      target: 'beaker',
      verb: 'place',
      apply: (s) => ({ state: { ...s, rods: true } }),
      observe: '两根碳棒插在蓝绿色的 CuCl₂ 溶液中，暂时没有变化。',
    },
    {
      kind: 'act',
      title: '接通电源',
      instruction: '点击学生电源，用导线把左边的碳棒接电源负极、右边的碳棒接电源正极，接通电源。',
      target: 'power',
      verb: 'connect',
      apply: (s, now) => ({ state: { ...s, poweredAt: now }, equations: ['阴极：Cu²⁺ + 2e⁻ = Cu', '阳极：2Cl⁻ − 2e⁻ = Cl₂↑'] }),
      observe: '与负极相连的碳棒（阴极）表面逐渐覆盖一层红色物质；与正极相连的碳棒（阳极）表面有气泡产生，可闻到刺激性气味。溶液的颜色逐渐变浅。',
      note: '蓝色小球表示 Cu²⁺，绿色小球表示 Cl⁻。通电后它们分别向阴极和阳极定向移动。',
    },
    {
      kind: 'act',
      title: '检验阳极产物',
      instruction: '拿起湿润的淀粉 KI 试纸，放在阳极附近检验产生的气体。',
      tool: 'paper',
      target: 'beaker',
      verb: 'dip',
      apply: (s) => ({ state: { ...s, paperBlue: true }, equations: ['Cl₂ + 2KI = 2KCl + I₂'] }),
      observe: '试纸变蓝，说明阳极产生的气体是氯气。',
    },
    {
      kind: 'quiz',
      title: '阴极产物',
      question: '阴极碳棒表面析出的红色物质是什么？',
      choices: ['铜', '氧化铜', '氢气', '氯化铜晶体'],
      answer: 0,
      explain: '阴极与电源负极相连，溶液中的 Cu²⁺ 在阴极得到电子被还原成 Cu，覆盖在碳棒表面。',
    },
    {
      kind: 'quiz',
      title: '离子的移动',
      question: '通电时，溶液中的离子怎样移动？',
      choices: ['Cu²⁺ 移向阴极，Cl⁻ 移向阳极', 'Cu²⁺ 移向阳极，Cl⁻ 移向阴极', '离子都不移动，只有电子在溶液中移动', '所有离子都移向阴极'],
      answer: 0,
      explain: '电解池中，阳离子移向阴极，阴离子移向阳极。电子只在导线中移动，溶液中靠离子的定向移动导电。',
    },
    {
      kind: 'quiz',
      title: '总反应',
      question: '电解 CuCl₂ 溶液的总反应是？',
      choices: ['CuCl₂ =电解= Cu + Cl₂↑', '2CuCl₂ + 2H₂O =电解= 2Cu + O₂↑ + 4HCl', 'CuCl₂ = Cu²⁺ + 2Cl⁻', 'Cu + Cl₂ =点燃= CuCl₂'],
      answer: 0,
      explain: '把两极的电极反应相加：Cu²⁺ + 2Cl⁻ =电解= Cu + Cl₂↑，即 CuCl₂ =电解= Cu + Cl₂↑。注意电离不需要通电，电解才需要通电。',
    },
    {
      kind: 'quiz',
      title: '能量转化',
      question: '电解池中的能量转化形式是？',
      choices: ['电能转化为化学能', '化学能转化为电能', '热能转化为电能', '化学能转化为热能'],
      answer: 0,
      explain: '电解池借助外加电源使不能自发进行的氧化还原反应发生，把电能转化为化学能；原电池则相反，把化学能转化为电能。',
    },
  ],
  summary: [
    '与电源负极相连的是阴极，发生还原反应；与正极相连的是阳极，发生氧化反应。',
    '阴极：Cu²⁺ + 2e⁻ = Cu；阳极：2Cl⁻ − 2e⁻ = Cl₂↑；总反应：CuCl₂ =电解= Cu + Cl₂↑。',
    '阳离子移向阴极，阴离子移向阳极；电子只在外电路中流动。',
    '电解池把电能转化为化学能。',
  ],
}
