import { Timer as TimerIcon } from 'lucide-react'
import { emptyVessel, type ReagentId, type Vessel as Contents } from '@/chem/engine'
import { IceCubes, Rack, Steam } from '@/kit/apparatus'
import { Bench, Pointer, Tag, type Vec3 } from '@/kit/core'
import { SHAPES, heightFor } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import { ReagentCarry, ReagentShelf, addTo, lookOf } from './common'
import type { ActStep, Lesson, SceneProps } from './types'

type Tube = 'A' | 'B' | 'C' | 'D'
interface S {
  tubes: Record<Tube, Contents>
}

const BOTTLES: ReagentId[] = ['Na2S2O3', 'H2SO4', 'H2O2', 'MnO2']
const BOTTLE_POS: Record<string, Vec3> = { Na2S2O3: [-26, 0, -14], H2SO4: [-15, 0, -14], H2O2: [6, 0, -14], MnO2: [17, 0, -14] }
const BATH: Record<'cold' | 'hot', Vec3> = { cold: [-24, 0, 4], hot: [-10, 0, 4] }
const BATH_ML = 150
const TUBE_POS: Record<Tube, Vec3> = { A: [-24, 0.4, 4], B: [-10, 0.4, 4], C: [8, 1.2, 6], D: [15, 1.2, 6] }
const BATH_LOOK = {
  cold: { color: '#cfe8f4', opacity: 0.5, grains: null, bubbles: 0 },
  hot: { color: '#f1e3cf', opacity: 0.45, grains: null, bubbles: 0 },
}
const NAMES: Record<string, string> = {
  Na2S2O3: '硫代硫酸钠溶液', H2SO4: '稀硫酸', H2O2: '过氧化氢溶液', MnO2: '二氧化锰',
  A: 'A 试管（冷水中）', B: 'B 试管（热水中）', C: 'C 试管', D: 'D 试管',
}

function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const top = (id: string): Vec3 => {
    if (id in TUBE_POS) {
      const p = TUBE_POS[id as Tube]
      return [p[0], p[1] + 19, p[2]]
    }
    const p = BOTTLE_POS[id]
    return [p[0], 15, p[2]]
  }
  const bathTop = heightFor(SHAPES.beaker400, BATH_ML)
  return (
    <Stage extent={[72, 36]} target={[-2, 6, 0]}>
      <Bench />
      {(['cold', 'hot'] as const).map((k) => (
        <group key={k}>
          <Vessel shape={SHAPES.beaker400} position={BATH[k]} volume={BATH_ML} look={() => BATH_LOOK[k]} />
          {k === 'cold' ? (
            <group position={BATH[k]}>
              <IceCubes radius={3.2} y={bathTop - 0.4} />
            </group>
          ) : (
            <group position={BATH[k]}>
              <Steam radius={3.5} y={bathTop + 1} />
            </group>
          )}
          <Tag text={k === 'cold' ? 'A · 冷水' : 'B · 热水'} position={[BATH[k][0], 1.4, BATH[k][2] + 4.6]} width={4.4} dark={k === 'hot'} />
        </group>
      ))}
      <Rack xs={[TUBE_POS.C[0], TUBE_POS.D[0]]} z={TUBE_POS.C[2]} labels={['C', 'D']} />
      {(Object.keys(TUBE_POS) as Tube[]).map((t) => (
        <Vessel key={t} shape={SHAPES.testTube} position={TUBE_POS[t]} volume={state.tubes[t].volume} look={lookOf(state.tubes[t])} onClick={() => onItem(t)} />
      ))}
      <ReagentShelf ids={BOTTLES} positions={BOTTLE_POS} held={held} anim={anim} onItem={onItem} />
      {anim?.tool && (
        <ReagentCarry
          anim={anim}
          reagent={anim.tool as ReagentId}
          bottle={BOTTLE_POS[anim.tool]}
          mouth={[TUBE_POS[anim.target as Tube][0], TUBE_POS[anim.target as Tube][1] + SHAPES.testTube.height, TUBE_POS[anim.target as Tube][2]]}
          surfaceY={TUBE_POS[anim.target as Tube][1] + Math.max(heightFor(SHAPES.testTube, state.tubes[anim.target as Tube].volume), 0.3)}
          onCommit={onCommit}
          onFinish={onFinish}
        />
      )}
      {pointer && <Pointer position={top(pointer)} />}
    </Stage>
  )
}

const add = (reagent: ReagentId, tube: Tube, title: string, instruction: string, observe: string, note?: string): ActStep<S> => ({
  kind: 'act',
  title,
  instruction,
  tool: reagent,
  target: tube,
  verb: reagent === 'MnO2' ? 'sprinkle' : 'drip',
  apply: (s, now) => {
    const r = addTo(s.tubes, tube, reagent, now)
    return { state: { tubes: r.vessels }, equations: r.equations }
  },
  observe,
  note,
})

export const rateLesson: Lesson<S> = {
  id: 'rate',
  title: '化学反应速率的影响因素',
  goal: '通过对比实验，观察温度和催化剂对化学反应速率的影响。',
  group: 'required',
  icon: TimerIcon,
  items: NAMES,
  initial: () => ({ tubes: { A: emptyVessel('cold'), B: emptyVessel('hot'), C: emptyVessel(), D: emptyVessel() } }),
  Scene,
  steps: [
    add('Na2S2O3', 'A', 'A 中加 Na₂S₂O₃', '取「硫代硫酸钠溶液」，向冷水中的 A 试管加入约 2 mL。', 'A 试管中是无色透明的溶液。'),
    add('Na2S2O3', 'B', 'B 中加 Na₂S₂O₃', '再向热水中的 B 试管加入等量的硫代硫酸钠溶液。', 'B 试管中也是无色透明的溶液。', '两支试管中的溶液浓度和体积都相同，只有温度不同，这是控制变量。'),
    add('H2SO4', 'A', 'A 中加稀硫酸', '取「稀硫酸」，向 A 试管中加入约 2 mL，同时开始观察。', 'A 试管暂时没有明显变化。'),
    add('H2SO4', 'B', 'B 中加稀硫酸', '再向 B 试管中加入等量的稀硫酸，比较两支试管出现浑浊的先后。', 'B 试管很快变得浑浊，出现淡黄色沉淀；A 试管过了一段时间才浑浊。'),
    {
      kind: 'quiz',
      title: '比较：温度',
      question: '哪支试管先出现浑浊？这说明了什么？',
      choices: ['A 先浑浊，温度越低反应越快', 'B 先浑浊，温度越高反应越快', '同时浑浊，温度不影响反应速率', '都不浑浊'],
      answer: 1,
      explain: '热水中的 B 先出现浑浊。其他条件相同时，升高温度，化学反应速率增大。',
    },
    add('H2O2', 'C', 'C 中加 H₂O₂', '取「过氧化氢溶液」，向 C 试管加入约 3 mL。', '只有极少量的小气泡。'),
    add('H2O2', 'D', 'D 中加 H₂O₂', '向 D 试管加入等量的过氧化氢溶液。', '同样只有极少量的小气泡。'),
    add('MnO2', 'D', 'D 中加 MnO₂', '点击二氧化锰试剂瓶取出药匙，向 D 试管中加入少量 MnO₂ 粉末。', 'D 试管中立即产生大量气泡，C 试管仍然只有少量气泡。'),
    {
      kind: 'quiz',
      title: '比较：催化剂',
      question: 'MnO₂ 在这个反应中起什么作用？',
      choices: ['反应物，被消耗掉了', '催化剂，加快反应但本身不被消耗', '氧化剂，把 H₂O₂ 氧化了', '只是让溶液变黑'],
      answer: 1,
      explain: 'MnO₂ 是 H₂O₂ 分解的催化剂。它能加快反应速率，而本身的质量和化学性质在反应前后不变。',
    },
  ],
  summary: [
    '其他条件相同时，升高温度，反应速率增大。',
    '使用合适的催化剂，能显著加快反应速率。',
    '增大反应物浓度、增大固体反应物的表面积，也能加快反应速率。',
    '比较某个因素的影响时，要控制其他条件相同（控制变量法）。',
  ],
}
