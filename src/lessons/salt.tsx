import { Funnel as FunnelIcon } from 'lucide-react'
import { apply, emptyVessel, evaporate, filter, look, phOf, pour, type ReagentId, type Vessel as Contents } from '@/chem/engine'
import { AlcoholLamp, ClampArm, Funnel, GlassRod, IronStand, LIFT, PhStrip, RestingRod, WASH_TIP, WashBottle, WhiteTile } from '@/kit/apparatus'
import { Carry, originFor } from '@/kit/carry'
import { Bench, HitBox, Passthrough, Pointer, Timer, clickable, type Vec3 } from '@/kit/core'
import { SHAPES, heightFor } from '@/kit/shapes'
import { Stage } from '@/kit/Stage'
import { Vessel } from '@/kit/vessel'
import { ReagentCarry, ReagentShelf, lookOf } from './common'
import type { ActStep, Lesson, SceneProps } from './types'

interface S {
  A: Contents
  B: Contents
  dish: Contents
  residue: string | null
  wet: boolean
  strip: string | null
  lit: boolean
}

const BOTTLES: ReagentId[] = ['crudeSalt', 'BaCl2', 'NaOH', 'Na2CO3', 'HCl']
const BOTTLE_POS = Object.fromEntries(BOTTLES.map((id, i) => [id, [-40 + i * 7, 0, -14] as Vec3]))
const FUNNEL_STAND: Vec3 = [-2, 0, 2]
const DISH_STAND: Vec3 = [16, 0, 2]
const P: Record<string, Vec3> = {
  ...BOTTLE_POS,
  A: [-24, 0, 8],
  rod: [-24, 0.2, 16],
  wash: [30, 0, -12],
  B: [FUNNEL_STAND[0], 0.8, FUNNEL_STAND[2]],
  ph: [32, 0, 10],
  lamp: [DISH_STAND[0], 0.8, DISH_STAND[2]],
}
const FUNNEL_TIP = 6.4
const FUNNEL_TOP: Vec3 = [FUNNEL_STAND[0], FUNNEL_STAND[1] + FUNNEL_TIP + 7.8, FUNNEL_STAND[2]]
const DISH_Y = 12.2
const DISH: Vec3 = [DISH_STAND[0], DISH_Y, DISH_STAND[2]]
const STRIP_COLORS: Record<number, string> = { 2: '#d9443a', 7: '#8cc152', 11: '#2f8f83', 13: '#3d4fb0' }
const NAMES: Record<string, string> = {
  crudeSalt: '粗盐', BaCl2: '氯化钡溶液', NaOH: '氢氧化钠溶液', Na2CO3: '碳酸钠溶液', HCl: '稀盐酸',
  A: '烧杯（粗盐水）', B: '漏斗下的烧杯（滤液）', rod: '玻璃棒', wash: '洗瓶', funnel: '漏斗', ph: 'pH 试纸', dish: '蒸发皿', lamp: '酒精灯',
}


function Scene({ state, held, anim, pointer, onItem, onCommit, onFinish }: SceneProps<S>) {
  const top: Record<string, Vec3> = {
    ...Object.fromEntries(BOTTLES.map((id) => [id, [BOTTLE_POS[id][0], 15, BOTTLE_POS[id][2]] as Vec3])),
    A: [P.A[0], 13, P.A[2]],
    rod: [P.rod[0], 3.5, P.rod[2]],
    wash: [P.wash[0], 17, P.wash[2]],
    B: [P.B[0], FUNNEL_TOP[1] + 3, P.B[2]],
    funnel: [FUNNEL_TOP[0], FUNNEL_TOP[1] + 3, FUNNEL_TOP[2]],
    ph: [P.ph[0], 4, P.ph[2]],
    dish: [DISH[0], DISH_Y + 6, DISH[2]],
    lamp: [P.lamp[0] + 5, 9, P.lamp[2] + 3],
  }
  const surf = (c: Contents, shape = SHAPES.beaker250) => Math.max(heightFor(shape, c.volume), 0.3)
  const A_TOP = SHAPES.beaker250.height
  const B_TOP = SHAPES.beaker100.height

  let carry = null
  if (anim?.tool && BOTTLES.includes(anim.tool as ReagentId)) {
    const intoB = anim.target === 'B'
    carry = (
      <ReagentCarry
        anim={anim}
        reagent={anim.tool as ReagentId}
        bottle={BOTTLE_POS[anim.tool]}
        mouth={intoB ? [P.B[0] + 2.2, P.B[1] + B_TOP, P.B[2] + 1.6] : [P.A[0], A_TOP, P.A[2]]}
        surfaceY={intoB ? P.B[1] + surf(state.B, SHAPES.beaker100) : surf(state.A)}
        onCommit={onCommit}
        onFinish={onFinish}
      />
    )
  }
  if (anim?.tool === 'wash')
    carry = (
      <Carry key={anim.id} from={[P.wash[0], LIFT - 8, P.wash[2]]} to={originFor([P.A[0], A_TOP + 1.5, P.A[2]], WASH_TIP, -0.35)}
        tool={<WashBottle />} action="pour" tilt={-0.35} lip={WASH_TIP} streamRadius={0.06} color="#d8ebf2" surfaceY={surf(state.A)}
        onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.tool === 'rod')
    carry = <Carry key={anim.id} from={[P.rod[0], LIFT, P.rod[2]]} to={[P.A[0], 0.5, P.A[2]]} tool={<GlassRod />} action="stir" onCommit={onCommit} onFinish={onFinish} />
  if (anim?.tool === 'A')
    carry = (
      <>
        <Carry key={anim.id} from={[P.A[0], 3, P.A[2]]} to={originFor([FUNNEL_TOP[0] - 0.6, FUNNEL_TOP[1] + 1, FUNNEL_TOP[2]], [3.4, 9], -1.2)}
          tool={<Vessel shape={SHAPES.beaker250} volume={state.A.volume} look={lookOf(state.A)} />}
          action="pour" tilt={-1.2} lip={[3.4, 9]} color={look(state.A, performance.now() / 1000).color} surfaceY={FUNNEL_TOP[1] - 3}
          onCommit={onCommit} onFinish={onFinish} />
        <group position={[FUNNEL_TOP[0], FUNNEL_TOP[1] - 4, FUNNEL_TOP[2]]} rotation={[0, 0, 0.08]}>
          <GlassRod />
        </group>
      </>
    )
  if (anim?.tool === 'B')
    carry = (
      <Carry key={anim.id} from={[P.B[0], P.B[1] + 3, P.B[2]]} to={originFor([DISH[0] - 0.5, DISH_Y + 3, DISH[2]], [2.6, 7.2], -1.2)}
        tool={<Vessel shape={SHAPES.beaker100} volume={state.B.volume} look={lookOf(state.B)} />}
        action="pour" tilt={-1.2} lip={[2.6, 7.2]} color="#dfeef4" surfaceY={DISH_Y + 0.5} onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.tool === 'ph')
    carry = (
      <Carry key={anim.id} from={[P.ph[0], LIFT, P.ph[2]]} to={[P.B[0] + 1.5, P.B[1] + surf(state.B, SHAPES.beaker100) + 1.5, P.B[2] + 1.5]}
        tool={<PhStrip color="#e9d27a" />} action="dip" onCommit={onCommit} onFinish={onFinish} />
    )
  if (anim?.verb === 'heat') carry = <Timer key={anim.id} commitAt={2.6} finishAt={3.4} onCommit={onCommit} onFinish={onFinish} />

  const lit = state.lit || anim?.verb === 'heat'

  return (
    <Stage extent={[84, 38]} target={[-3, 6, 0]}>
      <Bench width={100} />
      <ReagentShelf ids={BOTTLES} positions={BOTTLE_POS} held={held} anim={anim} onItem={onItem} />
      <group visible={anim?.tool !== 'A'}>
        <Passthrough active={held === 'A'}>
          <Vessel shape={SHAPES.beaker250} position={held === 'A' ? [P.A[0], 3, P.A[2]] : P.A} volume={state.A.volume} look={lookOf(state.A)} onClick={() => onItem('A')} />
        </Passthrough>
      </group>
      <RestingRod position={P.rod} held={held === 'rod'} hidden={anim?.tool === 'rod'} onClick={() => onItem('rod')} />
      <group position={held === 'wash' ? [P.wash[0], LIFT - 8, P.wash[2]] : P.wash} visible={anim?.tool !== 'wash'} {...clickable(() => onItem('wash'))}>
        <Passthrough active={held === 'wash'}>
          <WashBottle />
        </Passthrough>
      </group>

      <IronStand position={FUNNEL_STAND} height={24}>
        <ClampArm y={FUNNEL_TIP + 5.4} ring={2.3} />
        <group position={[0, FUNNEL_TIP, 0]}>
          <Funnel residue={state.residue} wet={state.wet} onClick={() => onItem('funnel')} />
        </group>
      </IronStand>
      <group visible={anim?.tool !== 'B'}>
        <Passthrough active={held === 'B'}>
          <Vessel shape={SHAPES.beaker100} position={held === 'B' ? [P.B[0], P.B[1] + 3, P.B[2]] : P.B} volume={state.B.volume} look={lookOf(state.B)} onClick={() => onItem('B')} />
        </Passthrough>
      </group>

      <IronStand position={DISH_STAND} height={20}>
        <ClampArm y={DISH_Y - 0.1} ring={3.2} />
      </IronStand>
      <Vessel shape={SHAPES.dish} position={DISH} volume={state.dish.volume} look={lookOf(state.dish)} glassOpacity={0.9} onClick={() => onItem('dish')} />
      <AlcoholLamp position={P.lamp} lit={lit} onClick={() => onItem('lamp')} />

      <WhiteTile position={[P.ph[0], 0, P.ph[2]]} size={[6, 0.3, 6]} />
      <group position={[P.ph[0], 0.35, P.ph[2]]} visible={anim?.tool !== 'ph'} {...clickable(() => onItem('ph'))}>
        <HitBox size={[4, 0.8, 5.5]} />
      </group>
      <group position={[P.ph[0], 0.35, P.ph[2]]} rotation={[-Math.PI / 2, 0, 0.3]} visible={anim?.tool !== 'ph'} {...clickable(() => onItem('ph'))}>
        <group position={[0, -2.2, 0]}>
          <PhStrip color={state.strip ?? '#e9d27a'} />
        </group>
      </group>
      {held === 'ph' && (
        <group position={[P.ph[0], LIFT, P.ph[2]]}>
          <PhStrip color="#e9d27a" />
        </group>
      )}

      {carry}
      {pointer && <Pointer position={top[pointer]} />}
    </Stage>
  )
}

const drip = (reagent: ReagentId, title: string, instruction: string, observe: string, note?: string): ActStep<S> => ({
  kind: 'act',
  title,
  instruction,
  tool: reagent,
  target: 'A',
  verb: 'drip',
  apply: (s, now) => {
    const r = apply(s.A, { type: 'add', reagent }, now)
    return { state: { ...s, A: r.vessel }, equations: r.equations }
  },
  observe,
  note,
})

const residueColor = (species: Contents['species']) => look({ species, volume: 1 }, Infinity).color

export const saltLesson: Lesson<S> = {
  id: 'salt',
  title: '用化学沉淀法去除粗盐中的杂质离子',
  goal: '用 BaCl₂、NaOH、Na₂CO₃ 和盐酸除去粗盐中的 SO₄²⁻、Mg²⁺、Ca²⁺，得到精盐。',
  group: 'required',
  icon: FunnelIcon,
  items: NAMES,
  initial: () => ({ A: emptyVessel(), B: emptyVessel(), dish: emptyVessel(), residue: null, wet: false, strip: null, lit: false }),
  Scene,
  steps: [
    {
      kind: 'act',
      title: '取粗盐',
      instruction: '点击粗盐试剂瓶取出药匙，向烧杯中加入粗盐。',
      tool: 'crudeSalt',
      target: 'A',
      verb: 'sprinkle',
      apply: (s, now) => ({ state: { ...s, A: apply(s.A, { type: 'add', reagent: 'crudeSalt' }, now).vessel } }),
      observe: '灰白色的粗盐颗粒落在烧杯底部。粗盐中除了 NaCl，还含有泥沙和 Ca²⁺、Mg²⁺、SO₄²⁻ 等杂质。',
    },
    {
      kind: 'act',
      title: '加水',
      instruction: '拿起洗瓶，向烧杯中加入约 40 mL 水。',
      tool: 'wash',
      target: 'A',
      verb: 'pour',
      apply: (s, now) => ({ state: { ...s, A: apply(s.A, { type: 'add', reagent: 'water', dose: 40 }, now).vessel } }),
      observe: '粗盐浸在水中。',
    },
    {
      kind: 'act',
      title: '搅拌溶解',
      instruction: '拿起玻璃棒搅拌，使粗盐全部溶解。',
      tool: 'rod',
      target: 'A',
      verb: 'stir',
      apply: (s, now) => ({ state: { ...s, A: apply(s.A, { type: 'agitate' }, now).vessel } }),
      observe: '可溶物全部溶解，泥沙使溶液变得浑浊。',
    },
    drip('BaCl2', '除 SO₄²⁻', '向粗盐水中滴加过量的 BaCl₂ 溶液。', '生成白色沉淀。', '加入「过量」试剂，是为了把杂质离子除干净。'),
    drip('NaOH', '除 Mg²⁺', '再滴加过量的 NaOH 溶液。', '又有白色沉淀生成。'),
    drip('Na2CO3', '除 Ca²⁺ 和过量的 Ba²⁺', '再滴加过量的 Na₂CO₃ 溶液。', '继续生成白色沉淀。'),
    {
      kind: 'quiz',
      title: '想一想',
      question: '为什么 Na₂CO₃ 溶液必须在 BaCl₂ 溶液之后加入？',
      choices: ['Na₂CO₃ 要除去 Ca²⁺ 和前面加入的过量 Ba²⁺', 'Na₂CO₃ 和 BaCl₂ 不能同时存在', '顺序无所谓，只是习惯', '先加 Na₂CO₃ 会产生气体'],
      answer: 0,
      explain: '过量的 BaCl₂ 会引入新的杂质 Ba²⁺，后加的 Na₂CO₃ 能把它变成 BaCO₃ 沉淀除去。如果顺序反过来，多余的 Ba²⁺ 就留在溶液里了。NaOH 的顺序比较自由。',
    },
    {
      kind: 'act',
      title: '过滤',
      instruction: '静置后，拿起烧杯，点击漏斗，用玻璃棒引流把混合物倒入过滤器。',
      tool: 'A',
      target: 'funnel',
      verb: 'pour',
      apply: (s, now) => {
        const f = filter(s.A, s.B, now)
        const residue = Object.fromEntries(f.residue.map((r) => [r, 0]))
        return { state: { ...s, A: f.source, B: f.filtrate.vessel, residue: residueColor(residue), wet: true } }
      },
      observe: '泥沙和白色沉淀留在滤纸上，下面的烧杯中得到澄清的滤液。',
      note: '过滤要做到「一贴二低三靠」：滤纸紧贴漏斗；滤纸边缘低于漏斗边缘，液面低于滤纸边缘；烧杯靠玻璃棒，玻璃棒靠三层滤纸，漏斗下端靠烧杯内壁。',
    },
    {
      kind: 'act',
      title: '加盐酸',
      instruction: '向滤液中滴加稀盐酸，直到不再产生气泡。',
      tool: 'HCl',
      target: 'B',
      verb: 'drip',
      apply: (s, now) => {
        const r = apply(s.B, { type: 'add', reagent: 'HCl' }, now)
        return { state: { ...s, B: r.vessel }, equations: r.equations }
      },
      observe: '溶液中冒出气泡，一会儿后气泡消失。',
      note: '盐酸除去了过量的 OH⁻ 和 CO₃²⁻。',
    },
    {
      kind: 'act',
      title: '检验酸碱性',
      instruction: '拿起 pH 试纸，蘸取滤液检验酸碱性。',
      tool: 'ph',
      target: 'B',
      verb: 'dip',
      apply: (s) => ({ state: { ...s, strip: STRIP_COLORS[phOf(s.B)] } }),
      observe: (s) => (phOf(s.B) === 7 ? 'pH 试纸显绿色，pH ≈ 7，溶液呈中性。' : `pH 试纸显示 pH ≈ ${phOf(s.B)}。`),
      note: '规范操作是用玻璃棒蘸取溶液点在试纸上，这里为了演示直接蘸取。',
    },
    {
      kind: 'act',
      title: '转移到蒸发皿',
      instruction: '拿起盛滤液的烧杯，把滤液倒入蒸发皿。',
      tool: 'B',
      target: 'dish',
      verb: 'pour',
      apply: (s, now) => {
        const p = pour(s.B, s.dish, now)
        return { state: { ...s, B: p.from, dish: p.to.vessel } }
      },
      observe: '滤液倒入了蒸发皿。',
    },
    {
      kind: 'act',
      title: '蒸发结晶',
      instruction: '点击酒精灯点燃，加热蒸发皿。',
      target: 'lamp',
      verb: 'heat',
      apply: (s, now) => ({ state: { ...s, dish: evaporate(s.dish, now), lit: false } }),
      observe: '水分逐渐蒸发，蒸发皿中出现白色的 NaCl 晶体。',
      note: '加热时要用玻璃棒不断搅拌，防止液体局部过热飞溅。出现较多固体时就停止加热，用余热蒸干。',
    },
  ],
  summary: [
    'BaCl₂ 除 SO₄²⁻，NaOH 除 Mg²⁺，Na₂CO₃ 除 Ca²⁺ 和过量的 Ba²⁺。',
    'Na₂CO₃ 必须在 BaCl₂ 之后加入；过滤之后再加盐酸。',
    '盐酸除去过量的 OH⁻ 和 CO₃²⁻，用 pH 试纸控制溶液呈中性。',
    '除杂原则：不增（不引入新杂质）、不减（不减少被提纯物）、易分离。',
  ],
}
