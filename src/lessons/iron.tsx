import { TestTubes } from 'lucide-react'
import { emptyVessel, type ReagentId, type Vessel as Contents } from '@/chem/engine'
import { Rack } from '@/kit/apparatus'
import { Bench, Pointer, type Vec3 } from '@/kit/core'
import { SHAPES, heightFor } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import { ReagentCarry, ReagentShelf, addTo, agitate, lookOf } from './common'
import type { ActStep, Lesson, SceneProps } from './types'

type Tube = 't1' | 't2' | 't3'
interface S {
  tubes: Record<Tube, Contents>
}

const TUBES: Tube[] = ['t1', 't2', 't3']
const BOTTLES: ReagentId[] = ['FeCl3', 'FeSO4', 'KSCN', 'NaOH', 'Cl2water', 'Fe']
const TUBE_Z = 8
const BASE_Y = 1.2
const TUBE_POS: Record<Tube, Vec3> = { t1: [-7, BASE_Y, TUBE_Z], t2: [0, BASE_Y, TUBE_Z], t3: [7, BASE_Y, TUBE_Z] }
const BOTTLE_POS = Object.fromEntries(BOTTLES.map((id, i) => [id, [(i - 2.5) * 11.5, 0, -14] as Vec3]))
const NAMES: Record<string, string> = { FeCl3: '氯化铁溶液', FeSO4: '硫酸亚铁溶液', KSCN: '硫氰化钾溶液', NaOH: '氢氧化钠溶液', Cl2water: '氯水', Fe: '铁粉' }

const add = (reagent: ReagentId, tube: Tube, title: string, instruction: string, observe: string, note?: string): ActStep<S> => ({
  kind: 'act',
  title,
  instruction,
  tool: reagent,
  target: tube,
  verb: reagent === 'Fe' ? 'sprinkle' : 'drip',
  apply: (s, now) => {
    const r = addTo(s.tubes, tube, reagent, now)
    return { state: { tubes: r.vessels }, equations: r.equations }
  },
  observe,
  note,
})

function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const top = (id: string): Vec3 => {
    if (id in TUBE_POS) {
      const p = TUBE_POS[id as Tube]
      return [p[0], BASE_Y + 19, p[2]]
    }
    const p = BOTTLE_POS[id]
    return [p[0], 15, p[2]]
  }
  return (
    <Stage extent={[76, 34]}>
      <Bench />
      <Rack xs={TUBES.map((t) => TUBE_POS[t][0])} z={TUBE_Z} />
      {TUBES.map((t) => (
        <Vessel
          key={t}
          shape={SHAPES.testTube}
          position={TUBE_POS[t]}
          volume={state.tubes[t].volume}
          look={lookOf(state.tubes[t])}
          pivotY={10 - BASE_Y}
          onClick={() => onItem(t)}
          motion={anim?.verb === 'shake' && anim.target === t ? { id: anim.id, kind: 'shake' } : null}
          onCommit={onCommit}
          onFinish={onFinish}
        />
      ))}
      <ReagentShelf ids={BOTTLES} positions={BOTTLE_POS} held={held} anim={anim} onItem={onItem} />
      {anim?.tool && (
        <ReagentCarry
          anim={anim}
          reagent={anim.tool as ReagentId}
          bottle={BOTTLE_POS[anim.tool]}
          mouth={[TUBE_POS[anim.target as Tube][0], BASE_Y + SHAPES.testTube.height, TUBE_Z]}
          surfaceY={BASE_Y + Math.max(heightFor(SHAPES.testTube, state.tubes[anim.target as Tube].volume), 0.3)}
          onCommit={onCommit}
          onFinish={onFinish}
        />
      )}
      {pointer && <Pointer position={top(pointer)} />}
    </Stage>
  )
}

export const ironLesson: Lesson<S> = {
  id: 'iron',
  title: '铁及其化合物的性质',
  goal: '认识 Fe³⁺ 的检验方法，以及 Fe²⁺ 与 Fe³⁺ 之间的相互转化。',
  group: 'required',
  icon: TestTubes,
  items: { ...NAMES, t1: '1 号试管', t2: '2 号试管', t3: '3 号试管' },
  initial: () => ({ tubes: { t1: emptyVessel(), t2: emptyVessel(), t3: emptyVessel() } }),
  Scene,
  steps: [
    add('FeCl3', 't1', '取 FeCl₃ 溶液', '点击「氯化铁溶液」滴瓶取用，再点击 1 号试管，加入约 2 mL。', '溶液呈棕黄色，这是 Fe³⁺ 在溶液中的颜色。'),
    add('KSCN', 't1', '滴加 KSCN 溶液', '取「硫氰化钾溶液」，向 1 号试管中滴加几滴。', '溶液立即变成血红色。', '这是检验 Fe³⁺ 最灵敏、最常用的方法。'),
    add('FeCl3', 't2', '再取 FeCl₃ 溶液', '向 2 号试管中加入约 2 mL 氯化铁溶液。', '2 号试管中的溶液也是棕黄色。'),
    add('Fe', 't2', '加入铁粉', '点击铁粉试剂瓶取出药匙，向 2 号试管中加入少量铁粉。', '黑灰色的铁粉沉在试管底部，暂时看不出明显变化。'),
    {
      kind: 'act',
      title: '振荡试管',
      instruction: '手中不拿任何试剂，直接点击 2 号试管进行振荡，让铁粉与溶液充分接触。',
      target: 't2',
      verb: 'shake',
      apply: (s, now) => {
        const r = agitate(s.tubes, 't2', now)
        return { state: { tubes: r.vessels }, equations: r.equations }
      },
      observe: '棕黄色逐渐褪去，溶液变成浅绿色。',
      note: '铁把 Fe³⁺ 还原成了 Fe²⁺，浅绿色是 Fe²⁺ 的颜色。',
    },
    add('KSCN', 't2', '检验 Fe³⁺ 是否还在', '向 2 号试管中滴加几滴硫氰化钾溶液。', '溶液没有变红。', '说明溶液中的 Fe³⁺ 已经被完全还原，Fe²⁺ 遇 SCN⁻ 不显红色。'),
    add('Cl2water', 't2', '滴加氯水', '取「氯水」（装在棕色瓶中，见光易分解），向 2 号试管中滴加几滴。', '溶液变成血红色。', '氯气把 Fe²⁺ 氧化成 Fe³⁺，Fe³⁺ 立即与已有的 SCN⁻ 结合显红色。'),
    add('FeSO4', 't3', '取 FeSO₄ 溶液', '向 3 号试管中加入约 2 mL 硫酸亚铁溶液。', '溶液呈浅绿色。'),
    add('NaOH', 't3', '滴加 NaOH 溶液', '向 3 号试管中滴加氢氧化钠溶液，然后观察颜色随时间的变化。', '先生成白色絮状沉淀，很快变成灰绿色，最后变成红褐色。', 'Fe(OH)₂ 极易被空气中的氧气氧化成红褐色的 Fe(OH)₃。'),
  ],
  summary: [
    'Fe³⁺ 遇 SCN⁻ 显血红色，可用于检验 Fe³⁺。',
    'Fe³⁺ 有氧化性，能被铁等还原剂还原成 Fe²⁺。',
    'Fe²⁺ 有还原性，能被氯气等氧化剂氧化成 Fe³⁺。',
    'Fe(OH)₂ 是白色沉淀，在空气中迅速被氧化成红褐色的 Fe(OH)₃。',
  ],
}
