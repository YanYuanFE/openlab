import { useEffect, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { clickable, lathe, rand, type Vec3 } from '@/kit/core'
import { atomsOf, ELEMENTS, elementOf, elementsIn, THINGS, thingOf } from './atoms'
import { Glass, INK, Inked, Label, PopBasic, Rise, SEAL } from './ink'
import { Atom, Beaker, Jiggle, Molecule, PowderDish, T, WATER_COLOR, type GroupProps } from './models'
import { fml, txt, type Block, type Run } from './print'
import { loadStamps, saveStamp } from './progress'
import { leftPage, rightPage, type Nav, type SpreadDef } from './spread'

// Chapter 1: matter is made of atoms. Water splits into molecules, molecules into atoms;
// eight everyday things light the jars of the elements they contain.

const DOME = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2)
const CUBE = new THREE.BoxGeometry(1, 1, 1)

// --- demonstration plates ---

function Magnifier(g: GroupProps) {
  return (
    <group {...g}>
      <Glass geometry={LENS} rotation-x={Math.PI / 2} />
      <Inked geometry={RIM} color="#8a6440" />
      <Inked geometry={HANDLE} color="#5e4630" position={[0, -5.2, 0]} />
    </group>
  )
}
const LENS = new THREE.CylinderGeometry(2.8, 2.8, 0.2, 48)
const RIM = new THREE.TorusGeometry(2.9, 0.22, 16, 64)
const HANDLE = new THREE.CylinderGeometry(0.38, 0.45, 4.6, 24)

// a jittered 6 × 2 × 2 lattice, so the molecules fill the plate evenly
const CLUSTER: Vec3[] = Array.from({ length: 24 }, (_, i) => [
  -11 + (i % 6) * 4.4 + (rand(i) - 0.5) * 1.6,
  1.8 + (i >= 12 ? 3.2 : 0) + rand(i + 40) * 1.2,
  (Math.floor(i / 6) % 2 ? 2.6 : -2.6) + (rand(i + 80) - 0.5) * 1.6,
])

function DemoPlate({ step }: { step: number }) {
  switch (step) {
    case 0:
      return (
        <>
          <Beaker scale={1.6} />
          <Label position={[0, 0, 6]} text="一杯水" />
        </>
      )
    case 1:
      return (
        <>
          <Beaker scale={0.9} position={[-11, 0, -2]} />
          <Inked geometry={DOME} color={WATER_COLOR} scale={[1.5, 0.85, 1.5]} position={[3, 0, 1]} />
          <Magnifier position={[3, 4.6, 5.2]} rotation={[-0.86, 0, 0.55]} />
          <Label position={[-3.4, 0, 2.4]} text="一滴水 →" />
        </>
      )
    case 2:
      return (
        <>
          {CLUSTER.map((p, i) => (
            <Jiggle key={i} seed={i} position={p}>
              <Molecule f="H2O" scale={1.5} />
            </Jiggle>
          ))}
          <Label position={[0, 0, 7.5]} text="水分子（约放大一亿倍）" />
        </>
      )
    case 3:
      return (
        <>
          <Molecule f="H2O" scale={3} position={[-8, 2.6, 0]} />
          <Label position={[-8, 0, 5]} text="一个水分子 " formula="H2O" />
          <Atom sym="O" r={2} position={[6, 2.2, 0]} />
          <Atom sym="H" r={1.25} position={[12, 1.4, -2]} />
          <Atom sym="H" r={1.25} position={[12, 1.4, 2.6]} />
          <Label position={[6, 0, 3.6]} text="氧原子 O" />
          <Label position={[12, 0, 5.4]} text="氢原子 H × 2" />
        </>
      )
    default:
      return (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <Atom key={i} sym="H" r={1.1} position={[-12 + (i % 3) * 2.3 + (i > 2 ? 1.15 : 0), 1.1 + (i > 2 ? 1.8 : 0), i > 2 ? -0.6 : 0.6]} />
          ))}
          {Array.from({ length: 3 }, (_, i) => (
            <Atom key={i} sym="O" r={1.6} position={[6 + i * 3.4, 1.6, 0]} />
          ))}
          <Label position={[-9.7, 0, 4]} text="氢元素：所有的氢原子" />
          <Label position={[9.4, 0, 4]} text="氧元素：所有的氧原子" />
        </>
      )
  }
}

// --- the eight things on the table ---

const NAIL_SHAFT = new THREE.CylinderGeometry(0.2, 0.2, 5.4, 20)
const NAIL_HEAD = new THREE.CylinderGeometry(0.6, 0.6, 0.18, 28)
const NAIL_TIP = new THREE.ConeGeometry(0.2, 0.7, 20)
const HELIX = new THREE.CatmullRomCurve3(
  Array.from({ length: 121 }, (_, i) => {
    const a = (i / 120) * Math.PI * 2 * 5
    return new THREE.Vector3(-2.4 + (4.8 * i) / 120, Math.sin(a) * 1.1, Math.cos(a) * 1.1)
  }),
)
const COIL = new THREE.TubeGeometry(HELIX, 240, 0.13, 10)
const JAR_R = 1.5
const JAR = lathe([[0, T], [JAR_R - T, T], [JAR_R - T, 4.2], [JAR_R + 0.18, 4.3], [JAR_R, 4.05], [JAR_R, 0], [0, 0]], 40)
const PLATE = new THREE.BoxGeometry(3.4, 0.1, 3.4)
const OCTA = new THREE.OctahedronGeometry(1.5)
const SALT: Vec3[] = [
  [0, 0.35, 0], [0.8, 0.35, 0.2], [-0.7, 0.35, 0.4], [0.2, 0.35, 0.9], [-0.2, 0.35, -0.8], [0.9, 0.35, -0.7],
  [-1.1, 0.35, -0.4], [0.3, 1, 0.1], [-0.4, 1, 0.3], [0.4, 1, -0.5], [0, 1.6, 0],
]

function ThingModel({ id }: { id: string }) {
  switch (id) {
    case 'water':
      return <Beaker scale={0.7} />
    case 'salt':
      return (
        <>
          {SALT.map((p, i) => (
            <Inked key={i} geometry={CUBE} color="#f8f6f0" position={p} rotation={[0, rand(i) * 1.5, 0]} scale={0.7} />
          ))}
        </>
      )
    case 'nail':
      return (
        <group position={[0, 0.6, 0]} rotation={[0, 0.5, Math.PI / 2]}>
          <Inked geometry={NAIL_SHAFT} color="#8d939b" />
          <Inked geometry={NAIL_HEAD} color="#8d939b" position-y={2.75} />
          <Inked geometry={NAIL_TIP} color="#8d939b" position-y={-3.05} rotation-x={Math.PI} />
        </group>
      )
    case 'wire':
      return <Inked geometry={COIL} color="#c97d4e" position={[0, 1.25, 0]} rotation-y={-0.4} />
    case 'dryice':
      return (
        <>
          {([[-0.9, 0.5, 0.3, 0.3], [0.9, 0.5, -0.2, -0.4], [0, 0.5, 1.4, 0.9], [0.1, 1.5, 0.2, 0.2]] as const).map(([x, y, z, r], i) => (
            <Inked key={i} geometry={CUBE} color="#eef3f5" position={[x, y, z]} rotation={[0, r, 0]} scale={[1.6, 1, 1.2]} />
          ))}
        </>
      )
    case 'soda':
      return <PowderDish />
    case 'oxygen':
      return (
        <>
          <Glass geometry={JAR} />
          <Glass geometry={PLATE} position-y={4.38} />
        </>
      )
    case 'diamond':
      return <Inked geometry={OCTA} color="#dceef4" position-y={1.75} scale={[1, 1.15, 1]} />
    default:
      throw new Error(`no model for ${id}`)
  }
}

const SLOT: Record<string, Vec3> = Object.fromEntries(THINGS.map((t, i) => [t.id, [-13.5 + (i % 4) * 9, 0, i < 4 ? -5.5 : 6.5]]))
const RING = new THREE.RingGeometry(2.7, 2.86, 64)

function Table({ marked, taps, onThing }: { marked: Set<string>; taps: Record<string, number>; onThing: (id: string) => void }) {
  return (
    <>
      {THINGS.map((t, i) => (
        <group key={t.id} position={SLOT[t.id]}>
          <Rise key={taps[t.id] ?? 0} delay={taps[t.id] ? 0 : i * 0.06}>
            <group {...clickable(() => onThing(t.id))}>
              <ThingModel id={t.id} />
              {/* invisible click area so thin things are easy to tap */}
              <mesh position-y={1.6} visible={false}>
                <boxGeometry args={[5.2, 3.6, 5.2]} />
              </mesh>
            </group>
          </Rise>
          {marked.has(t.id) && (
            <mesh geometry={RING} rotation-x={-Math.PI / 2} position-y={0.02}>
              <PopBasic color={SEAL} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
            </mesh>
          )}
          <Label
            position={[0, 0, 3.7]}
            text={marked.has(t.id) ? `${t.name} ` : t.name}
            formula={marked.has(t.id) ? t.formula : ''}
            color={marked.has(t.id) ? SEAL : INK}
            bold={marked.has(t.id)}
          />
        </group>
      ))}
    </>
  )
}

// --- the chapter ---

const DEMO: Run[][] = [
  txt('这是一杯水。看上去它是连成一整块的，没有一点缝隙。'),
  txt('取出一滴，用放大镜看：还是水。再分成更小的一滴，它仍然是水。'),
  txt('放大到约一亿倍：水由数不清的水分子构成，它们挨得很近，一刻不停地运动。'),
  [...txt('拆开一个水分子：一个氧原子，两个氢原子，这就是 '), ...fml('H2O'), ...txt('。账本记下：氢 2，氧 1。')],
  txt('再往下分就不是水了。所有氢原子同属氢元素，所有氧原子同属氧元素。'),
]

/** footprint of each demonstration plate, drawing cm */
const PLATE_EXTENT: [number, number][] = [
  [30, 26],
  [34, 24],
  [32, 22],
  [32, 20],
  [32, 18],
]

const PICK = 4
type Phase = 'predict' | 'demo' | 'try' | 'challenge'

export function useChapter1(nav: Nav): SpreadDef[] {
  const [phase, setPhase] = useState<Phase>('predict')
  const [picked, setPicked] = useState<number | null>(null)
  const [flap, setFlap] = useState(false)
  const [demo, setDemo] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [tapped, setTapped] = useState<string[]>([])
  const [last, setLast] = useState<string | null>(null)
  const [taps, setTaps] = useState<Record<string, number>>({})
  const [chosen, setChosen] = useState<string[]>([])
  const [stamped, setStamped] = useState(() => Boolean(loadStamps()[1]))

  // ▶ walks through the demonstration on its own
  useEffect(() => {
    if (!playing || phase !== 'demo') return
    if (demo === DEMO.length - 1) return setPlaying(false)
    const t = setTimeout(() => setDemo((d) => d + 1), 6500)
    return () => clearTimeout(t)
  }, [playing, phase, demo])

  const pop = (id: string) => setTaps((t) => ({ ...t, [id]: (t[id] ?? 0) + 1 }))
  const solved = chosen.length === PICK && elementsIn(chosen).size === ELEMENTS.length

  function onThing(id: string) {
    if (phase === 'try') {
      pop(id)
      setLast(id)
      if (!tapped.includes(id)) setTapped([...tapped, id])
    } else if (phase === 'challenge' && !solved) {
      if (chosen.includes(id)) return setChosen(chosen.filter((c) => c !== id))
      if (chosen.length === PICK) return
      pop(id)
      const next = [...chosen, id]
      setChosen(next)
      if (next.length === PICK && elementsIn(next).size === ELEMENTS.length) {
        saveStamp(1)
        setStamped(true)
      }
    }
  }

  function onHit(id: string, i: number) {
    if (id === 'predict') setPicked(i)
    else if (id === 'why' && picked !== null) setFlap(true)
    else if (id === 'prev') (setPlaying(false), setDemo(Math.max(demo - 1, 0)))
    else if (id === 'next') (setPlaying(false), setDemo(demo + 1))
    else if (id === 'try') setPhase('try')
    else if (id === 'challenge') setPhase('challenge')
    else if (id === 'again') setChosen([])
    else if (id === 'next-chapter') nav.toChapter(2)
    else if (id.startsWith('thing:')) onThing(id.slice(6))
  }

  // --- right page: ledger above, caption below ---
  let lit: string[] = []
  let counts: Record<string, number> = {}
  if (phase === 'demo' && demo >= 3) {
    lit = ['H', 'O']
    if (demo === 3) counts = { H: 2, O: 1 }
  } else if (phase === 'try') {
    lit = [...elementsIn(tapped)]
    if (last) counts = atomsOf(thingOf(last).formula)
  } else if (phase === 'challenge') lit = [...elementsIn(chosen)]

  let foot: Block[]
  if (phase === 'predict')
    foot = [
      { kind: 'para', size: 'small', runs: txt('图 1　一杯水', { tone: 'soft' }) },
      { kind: 'para', runs: txt(picked === null ? '先在左页勾选你的预测。' : '按下方的 ▶ 看演示，图会从书页上立起来。') },
    ]
  else if (phase === 'demo')
    foot = [
      { kind: 'label', text: `演示 ${demo + 1} / ${DEMO.length}` },
      { kind: 'para', runs: DEMO[demo] },
      {
        kind: 'links',
        items: [
          { id: 'prev', text: '‹ 上一步', disabled: demo === 0 },
          demo < DEMO.length - 1 ? { id: 'next', text: '下一步 ›' } : { id: 'try', text: '自己动手 →' },
        ],
      },
    ]
  else if (phase === 'try')
    foot = [
      { kind: 'label', text: `动手　已看过 ${tapped.length} / ${THINGS.length} 样` },
      {
        kind: 'para',
        runs: last
          ? [...txt(`${thingOf(last).name} `), ...fml(thingOf(last).formula, { bold: true }), ...txt('：' + Object.entries(atomsOf(thingOf(last).formula)).map(([s, n]) => `${n} 个${elementOf(s).name}原子`).join('，') + '。')]
          : txt('点一点桌上的每一样东西，看它由哪些原子构成，账本里对应的罐子会亮起来。'),
      },
      ...(tapped.length === THINGS.length
        ? [{ kind: 'para', size: 'small', runs: txt('八样东西只用到七种元素：不同的物质可以由相同的元素构成。', { tone: 'soft' }) } as Block, { kind: 'links', items: [{ id: 'challenge', text: '接受挑战 →' }] } as Block]
        : []),
    ]
  else
    foot = [
      { kind: 'label', text: `挑战　已选 ${chosen.length} / ${PICK}` },
      {
        kind: 'para',
        runs: solved
          ? [...txt('小苏打 '), ...fml('NaHCO3'), ...txt(' 一样就含钠、氢、碳、氧；氯只在食盐里，铁、铜只在铁钉和铜丝里，所以答案唯一。')]
          : chosen.length === PICK
            ? txt(`还有罐子没亮：${ELEMENTS.filter((e) => !lit.includes(e.sym)).map((e) => e.name).join('、')}。点一样把它放回去。`)
            : txt(`只许挑 ${PICK} 样东西，让 7 个罐子全部亮起来。点一下选中，再点一下放回。`),
      },
      { kind: 'links', items: solved ? [{ id: 'next-chapter', text: '下一章：质量守恒 →' }] : [{ id: 'again', text: '全部放回', disabled: !chosen.length }] },
    ]

  // --- left page ---
  const left: Block[] = [
    { kind: 'kicker', text: '第 一 章' },
    { kind: 'title', text: '数一数原子' },
    { kind: 'para', size: 'lead', runs: txt('一杯水、一撮盐、一枚铁钉……世界上的一切物质都由原子构成。这一章，把物质一层层拆开，数一数里面的原子。') },
    {
      kind: 'terms',
      items: [
        ['分子', txt('由原子构成的微粒，例如水分子。')],
        ['原子', txt('化学变化中的最小微粒。')],
        ['元素', txt('同一类原子的总称。')],
      ],
    },
    { kind: 'label', text: '预测' },
    { kind: 'para', runs: txt('把一杯水不停地分下去，一半，再一半……最后会分到什么？') },
    { kind: 'choices', id: 'predict', picked, items: [txt('永远分不完，水可以无限地分下去'), txt('分到最小的「水原子」为止'), txt('分到水分子；再分就不是水，而是氢原子和氧原子')] },
    {
      kind: 'flap',
      id: 'why',
      open: flap,
      locked: picked === null,
      runs: [
        ...txt(picked === 2 ? '你的预测是对的。' : '答案是第三个。', { tone: 'seal', bold: true }),
        ...txt('水由水分子构成，一个水分子由 1 个氧原子和 2 个氢原子构成。分到原子这一级，水就不再是水了：原子是化学变化中的最小微粒。'),
      ],
    },
  ]

  let drawing: { node: ReactNode; key: string; extent: [number, number] }
  if (phase === 'predict' || phase === 'demo') {
    const step = phase === 'demo' ? demo : 0
    drawing = { node: <DemoPlate step={step} />, key: `demo-${step}`, extent: PLATE_EXTENT[step] }
  } else drawing = { node: <Table marked={new Set(phase === 'try' ? tapped : chosen)} taps={taps} onThing={onThing} />, key: 'table', extent: [38, 22] }

  return [
    {
      key: 'ch1',
      chapter: 1,
      title: '数一数原子',
      left: leftPage(left, 3, stamped ? 1 : undefined),
      right: rightPage([{ kind: 'ledger', caption: '原子账本', lit, counts }], foot, 4),
      popup: { node: drawing.node, extent: drawing.extent, key: drawing.key },
      onHit,
      actions:
        phase === 'try' || phase === 'challenge'
          ? THINGS.map((t) => ({ id: `thing:${t.id}`, text: `${phase === 'try' ? '看' : '选'}${t.name}`, pressed: phase === 'challenge' ? chosen.includes(t.id) : undefined }))
          : undefined,
      play:
        picked === null
          ? undefined
          : () => {
              setPhase('demo')
              setDemo(0)
              setPlaying(true)
            },
      focus: phase === 'predict' ? 'left' : 'right',
    },
  ]
}
