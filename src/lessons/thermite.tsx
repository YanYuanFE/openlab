import { useFrame } from '@react-three/fiber'
import { Sparkles } from 'lucide-react'
import { useRef } from 'react'
import * as THREE from 'three'
import type { Look, Reagent } from '@/chem/engine'
import { ClampArm, IronStand, LIFT, PowderJar, Spatula, WhiteTile } from '@/kit/apparatus'
import { Carry } from '@/kit/carry'
import { Bench, Passthrough, Pointer, Tag, Timer, clickable, type Vec3 } from '@/kit/core'
import { GlowBead, MgStrip, PaperCone, Sparks } from '@/kit/lab2'
import { SHAPES } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import type { Lesson, SceneProps } from './types'

interface S {
  mix: boolean
  kclo3: boolean
  mg: boolean
  igniteAt: number | null
}

const MIX = { id: 'Fe', name: '铝粉和氧化铁', formula: '铝热剂', species: [], dose: 0, color: '#6e5a52', solid: true } as unknown as Reagent
const KCLO3 = { id: 'NaCl', name: '氯酸钾', formula: 'KClO₃', species: [], dose: 0, color: '#f2f1ec', solid: true } as unknown as Reagent
const TIP_Y = 10.6
const DISH: Vec3 = [0, 0.8, 0]
const SAND_ML = 30
const SAND_TOP = DISH[1] + 1.25
const P: Record<string, Vec3> = { mix: [-15, 0, 8], kclo3: [-7, 0, 10], mg: [10, 0.35, 9] }
/** seconds after ignition */
const T = { mgBurn: 2.4, sparks: [2, 6.5], burnt: 3, drop: [3.6, 4.3] }

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1)

/** Molten iron dripping from the burnt cone into the sand, then cooling. */
function MoltenDrop({ igniteAt }: { igniteAt: number }) {
  const g = useRef<THREE.Group>(null)
  useFrame(() => {
    const t = performance.now() / 1000 - igniteAt
    if (!g.current) return
    const k = clamp01((t - T.drop[0]) / (T.drop[1] - T.drop[0]))
    g.current.visible = t > T.drop[0]
    g.current.position.y = TIP_Y + (SAND_TOP + 0.3 - TIP_Y) * k * k
  })
  return (
    <group ref={g} visible={false}>
      <GlowBead since={() => igniteAt + T.drop[0]} cool={12} />
    </group>
  )
}

function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const s = state
  const t = (now: number) => (s.igniteAt === null ? -1 : now - s.igniteAt)
  const top: Record<string, Vec3> = {
    mix: [P.mix[0], 15, P.mix[2]],
    kclo3: [P.kclo3[0], 15, P.kclo3[2]],
    mg: [P.mg[0], 3, P.mg[2]],
    cone: [4, TIP_Y + 9, 2],
  }
  const sand: Look = { color: '#d8c49a', opacity: 1, grains: null, bubbles: 0 }

  let anims = null
  if (anim?.tool === 'mix' || anim?.tool === 'kclo3') {
    const r = anim.tool === 'mix' ? MIX : KCLO3
    const from = P[anim.tool]
    anims = (
      <Carry key={anim.id} from={[from[0] + 0.4, LIFT, from[2]]} to={[0.3, TIP_Y + 7.5, 0]} tool={<Spatula color={r.color} />}
        action="sprinkle" restRotation={-0.22} tilt={-1.3} lip={[0, 0.6]} color={r.color} surfaceY={TIP_Y + 3} onCommit={onCommit} onFinish={onFinish} />
    )
  }
  if (anim?.tool === 'mg')
    anims = <Carry key={anim.id} from={[P.mg[0], LIFT, P.mg[2]]} to={[0, TIP_Y + 2.8, 0]} tool={<MgStrip />} action="place" onCommit={onCommit} onFinish={onFinish} />
  if (anim?.verb === 'heat') anims = <Timer key={anim.id} commitAt={0.2} finishAt={8} onCommit={onCommit} onFinish={onFinish} />

  return (
    <Stage extent={[56, 36]} target={[0, 7, 0]}>
      <Bench />
      <IronStand position={[0, 0, 0]} height={22}>
        <ClampArm y={TIP_Y + 3.4} ring={2.4} />
      </IronStand>
      <group position={[0, TIP_Y, 0]}>
        <PaperCone fill={s.mix ? (s.kclo3 ? '#d9d4cb' : MIX.color) : null} burnt={() => t(performance.now() / 1000) > T.burnt} onClick={() => onItem('cone')} />
        {s.mg && (
          <group position={[0, 2.8, 0]}>
            <MgStrip burning={() => (t(performance.now() / 1000) > 0 && t(performance.now() / 1000) < T.mgBurn ? 1 : 0)} />
          </group>
        )}
        <group position={[0, 3, 0]}>
          <Sparks
            intensity={() => {
              const x = t(performance.now() / 1000)
              if (x < 0) return 0
              if (x < T.mgBurn) return 0.15
              return x < T.sparks[1] ? 1 - clamp01((x - T.sparks[1] + 1.5) / 1.5) : 0
            }}
          />
        </group>
      </group>
      <Vessel shape={SHAPES.dish} position={DISH} volume={SAND_ML} look={() => sand} glassOpacity={0.45} />
      <Tag text="细沙" position={[DISH[0], 1.4, DISH[2] + 4.8]} width={2} />
      {s.igniteAt !== null && <MoltenDrop igniteAt={s.igniteAt} />}

      <PowderJar reagent={MIX} position={P.mix} held={held === 'mix'} hidden={anim?.tool === 'mix'} onClick={() => onItem('mix')} />
      <PowderJar reagent={KCLO3} position={P.kclo3} held={held === 'kclo3'} hidden={anim?.tool === 'kclo3'} onClick={() => onItem('kclo3')} />
      <WhiteTile position={[P.mg[0], 0, P.mg[2]]} size={[8, 0.3, 4]} />
      {!s.mg && (
        <group position={held === 'mg' ? [P.mg[0], LIFT, P.mg[2]] : P.mg} visible={anim?.tool !== 'mg'} {...clickable(() => onItem('mg'))}>
          <Passthrough active={held === 'mg'}>
            <group rotation={held === 'mg' ? [0, 0, 0] : [0, 0, Math.PI / 2]} position={held === 'mg' ? [0, 0, 0] : [3, 0.05, 0]}>
              <MgStrip />
              <mesh position={[0, 3, 0]}>
                <boxGeometry args={[1.6, 6.5, 1.6]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            </group>
          </Passthrough>
        </group>
      )}
      <Tag text="镁条" position={[P.mg[0], 0.6, P.mg[2] + 2.8]} width={2} />
      {anims}
      {pointer && <Pointer position={top[pointer]} />}
    </Stage>
  )
}

export const thermiteLesson: Lesson<S> = {
  id: 'thermite',
  title: '铝热反应',
  goal: '观察铝与氧化铁的剧烈反应，认识铝的强还原性和铝热反应的应用。',
  group: 'demo',
  icon: Sparkles,
  items: { mix: '铝热剂（铝粉和氧化铁）', kclo3: '氯酸钾', mg: '镁条', cone: '纸漏斗' },
  initial: () => ({ mix: false, kclo3: false, mg: false, igniteAt: null }),
  Scene,
  steps: [
    {
      kind: 'act',
      title: '装入铝热剂',
      instruction: '纸漏斗已用水润湿并架在铁圈上，下方的蒸发皿中铺有细沙。取铝热剂，加入纸漏斗中。',
      tool: 'mix',
      target: 'cone',
      verb: 'sprinkle',
      apply: (s) => ({ state: { ...s, mix: true } }),
      observe: '铝粉和氧化铁的混合物堆在纸漏斗中。',
    },
    {
      kind: 'act',
      title: '铺一层氯酸钾',
      instruction: '再取少量氯酸钾，铺在混合物的上面。',
      tool: 'kclo3',
      target: 'cone',
      verb: 'sprinkle',
      apply: (s) => ({ state: { ...s, kclo3: true } }),
      observe: '混合物表面铺上了一层白色的 KClO₃。',
    },
    {
      kind: 'act',
      title: '插入镁条',
      instruction: '拿起镁条，插在混合物中间。',
      tool: 'mg',
      target: 'cone',
      verb: 'place',
      apply: (s) => ({ state: { ...s, mg: true } }),
      observe: '镁条竖直插在混合物中。',
    },
    {
      kind: 'quiz',
      title: '想一想',
      question: '为什么要在蒸发皿中铺一层细沙？',
      choices: ['防止高温熔融物落下时使蒸发皿炸裂', '细沙能参加反应', '让铁和沙子分离', '降低反应的温度'],
      answer: 0,
      explain: '铝热反应放出大量热，生成的铁是熔融状态，直接落在蒸发皿上会使其受热不均而炸裂。实验时人要离得远一些。',
    },
    {
      kind: 'act',
      title: '点燃镁条',
      instruction: '点击纸漏斗，用燃着的木条点燃镁条，然后迅速离开。',
      target: 'cone',
      verb: 'heat',
      apply: (s, now) => ({ state: { ...s, igniteAt: now }, equations: ['2Al + Fe₂O₃ =高温= 2Fe + Al₂O₃'] }),
      observe: '镁条剧烈燃烧，发出耀眼的白光；随后混合物剧烈反应，放出大量热，发出耀眼的光芒，火星四溅。纸漏斗被烧穿，红热的熔融物落入沙中，冷却后变成黑色的铁珠。',
    },
    {
      kind: 'quiz',
      title: '引燃剂的作用',
      question: '镁条和氯酸钾在实验中起什么作用？',
      choices: ['镁条燃烧放热引发反应，KClO₃ 受热分解放出 O₂ 帮助镁条燃烧', '它们是反应物，和氧化铁反应', '吸收反应放出的热量', '防止铝粉被氧化'],
      answer: 0,
      explain: '铝热反应需要高温才能引发。镁条燃烧提供高温，KClO₃ 受热分解产生 O₂，使镁条燃烧得更剧烈。',
    },
    {
      kind: 'quiz',
      title: '应用',
      question: '铝热反应在生产上的一个重要应用是？',
      choices: ['焊接钢轨，冶炼铬、锰等难熔金属', '制取氢气', '生产铝', '制造玻璃'],
      answer: 0,
      explain: '铝热反应放出大量的热，能使生成的金属熔化，常用于野外焊接钢轨，也用来冶炼铬、锰、钒等熔点高的金属。',
    },
  ],
  summary: [
    '铝热反应：2Al + Fe₂O₃ =高温= 2Fe + Al₂O₃，放出大量的热。',
    '铝的还原性比铁强，能把铁从它的氧化物中置换出来。',
    '镁条和 KClO₃ 是引燃剂；蒸发皿中铺细沙，防止炸裂。',
    '应用：焊接钢轨、冶炼难熔金属。',
  ],
}
