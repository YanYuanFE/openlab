import { useFrame } from '@react-three/fiber'
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { clickable, lathe, rand, smooth, type Vec3 } from '@/kit/core'
import { SHAPES } from '@/kit/shapes'
import { balanced, elementOf, massOf, sideAtoms, sides, simplest, SODA_ACID, SODA_ACID_KS, TO_BALANCE, type Reaction } from './atoms'
import { Glass, INK, Ink, Inked, Label, PopBasic, REDUCED, Rise, SEAL } from './ink'
import { Beaker, Molecule, PowderDish, T, WATER_COLOR } from './models'
import { moleculeOf } from './molecules'
import { fml, txt, type Block, type Run } from './print'
import { loadStamps, saveStamp } from './progress'
import { leftPage, rightPage, type Nav, type SpreadDef } from './spread'

// Chapter 2: conservation of mass. Soda and acid fizz on a balance: open, the reading drops by exactly the CO2 that
// escaped; sealed, it stays put until the stopper comes out. Then balance two equations atom by atom.

export const now = () => performance.now() / 1000

// 0.01 mol of Na2CO3 reacting completely
const SODA_G = 0.01 * massOf('Na2CO3')
const LOSS = 0.01 * massOf('CO2')
const OPEN_G = 50 + 20 + SODA_G
const SEALED_G = 80 + 20 + SODA_G
const grams = (g: number) => `${g.toFixed(2)} g`

/** Grams of CO2 gone from the balance `since` the gas started escaping. */
const escaped = (since: number | null, t: number, tau: number) => (since === null ? 0 : LOSS * (1 - Math.exp(-Math.max(t - since, 0) / tau)))

// --- the balance ---

const BASE = new THREE.BoxGeometry(15, 2.2, 12)
const PAN = new THREE.CylinderGeometry(5.2, 5.2, 0.25, 64)
const POST = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 24)
const PAN_Y = 2.63

/** Electronic balance; `reading` is evaluated every frame so the display can count down. */
export function Balance({ reading, children }: { reading: (t: number) => number; children: ReactNode }) {
  const display = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 96
    const g = c.getContext('2d')!
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    let shown = ''
    const draw = (v: number) => {
      const s = v.toFixed(2)
      if (s === shown) return
      shown = s
      g.fillStyle = '#d5dbc8'
      g.fillRect(0, 0, 320, 96)
      g.fillStyle = INK
      g.textBaseline = 'middle'
      g.textAlign = 'right'
      g.font = '700 60px "Courier New", monospace'
      g.fillText(s, 262, 52)
      g.font = '600 36px serif'
      g.fillText('g', 300, 56)
      tex.needsUpdate = true
    }
    return { tex, draw }
  }, [])
  useEffect(() => () => display.tex.dispose(), [display])
  useFrame(() => display.draw(reading(now())))
  return (
    <group>
      <Inked geometry={BASE} color="#ebe5d6" position-y={1.1} />
      <Inked geometry={POST} color="#9aa0a6" position-y={2.35} />
      <Inked geometry={PAN} color="#cfd3d6" position-y={2.5} />
      <mesh position={[0, 1.1, 6.01]}>
        <planeGeometry args={[6, 1.8]} />
        <PopBasic map={display.tex} />
      </mesh>
      <group position-y={PAN_Y}>{children}</group>
    </group>
  )
}

// --- fizz and escaping gas ---

const BUBBLE = new THREE.SphereGeometry(1, 12, 8)

/** Bubbles rising through a column of liquid; `level` (0–1) is how hard it fizzes at time t. */
export function Bubbles({ r, y0, y1, level }: { r: number; y0: number; y1: number; level: (t: number) => number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    const t = now()
    const a = level(t)
    refs.current.forEach((m, i) => {
      if (!m) return
      const u = (t * (0.8 + rand(i) * 0.6) + rand(i + 9)) % 1
      const d = r * Math.sqrt(rand(i + 3))
      m.position.set(Math.cos(i * 2.4) * d, y0 + u * (y1 - y0), Math.sin(i * 2.4) * d)
      m.scale.setScalar(rand(i + 5) < a ? 0.09 + 0.09 * rand(i + 6) : 0.0001)
    })
  })
  return (
    <>
      {Array.from({ length: 20 }, (_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)} geometry={BUBBLE} scale={0.0001} renderOrder={2}>
          {/* drawn over the liquid that contains them */}
          <Ink color="#f3f7f7" depthTest={false} />
        </mesh>
      ))}
    </>
  )
}

/** CO2 molecules leaving an open vessel one after another, drifting up until they fade out. */
function Escaping({ from, since }: { from: Vec3; since: number | null }) {
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame(() => {
    const t = now()
    refs.current.forEach((g, i) => {
      if (!g) return
      const u = since === null ? -1 : t - since - 0.4 - i * 0.8
      if (u < 0) return void g.scale.setScalar(0.0001)
      g.position.set(from[0] + Math.sin(u * 1.4 + i) * 0.9 + u * 0.5 * (i % 2 ? 1 : -1), from[1] + u * 2.2, from[2] + Math.cos(u + i) * 0.6)
      g.rotation.set(u * 0.7, u * 1.1 + i, 0)
      g.scale.setScalar(0.8 * (1 - smooth((u - 3.5) / 2)) + 0.0001)
    })
  })
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g)} scale={0.0001}>
          <Molecule f="CO2" />
        </group>
      ))}
    </>
  )
}

// --- the open beaker ---

/** Acid in a beaker and soda on a dish; once `pouredAt` is set the soda is in the acid and CO2 leaves. */
function OpenSetup({ pouredAt }: { pouredAt: number | null }) {
  const fizz = (t: number) => (pouredAt === null || t < pouredAt ? 0 : Math.exp(-(t - pouredAt) / 3))
  return (
    <>
      <Balance reading={(t) => OPEN_G - escaped(pouredAt, t, 1.2)}>
        <Beaker scale={0.85} position={[-1.6, 0, -0.5]} />
        <group position={[-1.6, 0, -0.5]}>
          <Bubbles r={1.7} y0={0.4} y1={3.6} level={fizz} />
        </group>
        <PowderDish full={pouredAt === null} scale={0.7} position={[3, 0, 1]} />
        <Escaping from={[-1.6, 6, -0.5]} since={pouredAt} />
      </Balance>
      <Label position={[0, 0, 8.6]} text="敞口烧杯：稀盐酸，旁边一碟碳酸钠粉末" />
    </>
  )
}

/** Pours the moment it mounts. */
function PourNow() {
  const [t0] = useState(now)
  return <OpenSetup pouredAt={t0} />
}

// --- the sealed flask ---

const S = 0.75
const C = SHAPES.conical250
const steps = (h: number, n: number) => Array.from({ length: n + 1 }, (_, i) => (h * i) / n)
export const FLASK = lathe(
  [
    [0, T],
    ...steps(C.height, 40).map((y): [number, number] => [C.r(y), T + y]),
    [C.r(C.height) + T + 0.12, T + C.height],
    ...steps(C.height, 40)
      .reverse()
      .map((y): [number, number] => [C.r(y) + T, T + y]),
    [0, 0],
  ],
  48,
)
const LIQUID_H = 1.4
export const FLASK_LIQUID = lathe([[0, T], ...steps(LIQUID_H, 8).map((y): [number, number] => [C.r(y) - 0.03, T + y]), [0, T + LIQUID_H]], 48)
const HEAP = new THREE.ConeGeometry(1.6, 0.9, 40, 1)
const TUBE = lathe([[0, T], [0.5, T], [0.5, 6], [0.62, 6.05], [0.62, 0.3], [0.3, 0], [0, 0]], 32)
const TUBE_ACID = new THREE.CylinderGeometry(0.46, 0.46, 3.2, 24)
const STOPPER = new THREE.CylinderGeometry(1.75, 1.45, 1.6, 32)
const NECK_TOP = T + C.height
/** where the pulled stopper lands on the page, in flask coordinates */
// lying on its side, so its centre sits one top-radius above the page
const STOPPER_REST: Vec3 = [10.5 / S, 1.75 - PAN_Y / S, 3 / S]
const STOPPER_IN: Vec3 = [0, NECK_TOP + 0.25, 0]
const TRAPPED: Vec3[] = [
  [-1.2, 4, 0.5],
  [1.1, 5.6, -0.6],
  [-0.1, 7.4, 0.4],
]

const CONE = new THREE.ConeGeometry(0.55, 1.4, 24)

/** A bobbing seal-red arrow pointing at what to tap next: down, or left when `left`. */
export function Pointer({ position, left = false }: { position: Vec3; left?: boolean }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current && !REDUCED) ref.current.position.y = position[1] + 0.4 * Math.sin(now() * 4)
  })
  return (
    <group ref={ref} position={position}>
      <Inked geometry={CONE} color={SEAL} rotation={left ? [0, 0, Math.PI / 2] : [Math.PI, 0, 0]} />
    </group>
  )
}

function SealedFlask({
  mixedAt,
  openedAt,
  onFlask,
  onStopper,
}: {
  mixedAt: number | null
  openedAt: number | null
  onFlask?: () => void
  onStopper?: () => void
}) {
  const body = useRef<THREE.Group>(null)
  const stopper = useRef<THREE.Group>(null)
  const gas = useRef<(THREE.Group | null)[]>([])
  useFrame(() => {
    const t = now()
    // two wobbles when shaken
    const w = mixedAt === null ? 2 : t - mixedAt
    if (body.current) body.current.rotation.z = w < 1.8 ? 0.16 * Math.sin((w / 0.9) * Math.PI * 2) * (1 - w / 1.8) : 0
    // the stopper arcs off and lands on the page
    if (stopper.current) {
      const u = openedAt === null ? 0 : Math.min((t - openedAt) / 0.9, 1)
      const p = STOPPER_IN.map((a, i) => a + (STOPPER_REST[i] - a) * smooth(u))
      stopper.current.position.set(p[0], p[1] + 5 * Math.sin(Math.PI * u), p[2])
      stopper.current.rotation.z = (smooth(u) * Math.PI) / 2
    }
    // CO2 fills the flask once mixed, then streams out of the neck when opened
    gas.current.forEach((g, i) => {
      if (!g) return
      const grown = mixedAt === null ? 0 : smooth((t - mixedAt - 0.8 - i * 0.4) / 1)
      const [x, y, z] = TRAPPED[i]
      const u = openedAt === null ? -1 : t - openedAt - i * 0.35
      if (u > 0) {
        const k = smooth(u)
        g.position.set(x * (1 - k), y + (NECK_TOP + 1 - y) * k + Math.max(u - 1, 0) * 3, z * (1 - k))
      } else if (!REDUCED) {
        g.position.set(x + 0.3 * Math.sin(t * 1.7 + i * 3), y + 0.25 * Math.sin(t * 2.3 + i), z + 0.3 * Math.sin(t * 1.3 + i * 2))
      }
      g.rotation.set(t * 0.6, t * 0.8 + i, 0)
      g.scale.setScalar(0.85 * grown * (1 - smooth(u - 3)) + 0.0001)
    })
  })
  const mixed = mixedAt !== null
  const fizz = (t: number) => (mixedAt === null || t < mixedAt + 0.6 ? 0 : Math.exp(-(t - mixedAt - 0.6) / 3))
  return (
    <group scale={S}>
      <group ref={body} {...clickable(onFlask)}>
        {mixed ? (
          <>
            <Inked geometry={FLASK_LIQUID} color={WATER_COLOR} />
            <Bubbles r={2.6} y0={T + 0.2} y1={T + LIQUID_H} level={fizz} />
          </>
        ) : (
          <Inked geometry={HEAP} color="#fbfaf6" position-y={T + 0.45} />
        )}
        <group position={[2.2, 0, 0.3]} rotation-z={0.22}>
          {!mixed && <Inked geometry={TUBE_ACID} color={WATER_COLOR} position-y={T + 1.6} />}
          <Glass geometry={TUBE} />
        </group>
        <Glass geometry={FLASK} />
        {TRAPPED.map((_, i) => (
          <group key={i} ref={(g) => void (gas.current[i] = g)} scale={0.0001}>
            <Molecule f="CO2" />
          </group>
        ))}
        <mesh position-y={6} visible={false}>
          <boxGeometry args={[9, 12, 9]} />
        </mesh>
      </group>
      <group ref={stopper} position={STOPPER_IN} {...clickable(onStopper)}>
        <Inked geometry={STOPPER} color="#6e5d52" />
        <mesh visible={false}>
          <boxGeometry args={[4.5, 3, 4.5]} />
        </mesh>
      </group>
      {onFlask && <Pointer position={[5.6, 5, 0]} left />}
      {onStopper && <Pointer position={[0, NECK_TOP + 3.4, 0]} />}
    </group>
  )
}

function SealedSetup(props: Parameters<typeof SealedFlask>[0]) {
  return (
    <>
      <Balance reading={(t) => SEALED_G - escaped(props.openedAt, t, 1.5)}>
        <SealedFlask {...props} />
      </Balance>
      <Label position={[0, 0, 8.6]} text="塞紧的锥形瓶：瓶底是碳酸钠，小试管里是稀盐酸" />
    </>
  )
}

// --- an equation drawn as molecules ---

/** Half-width of a molecule model, for spacing. */
const halfWidth = (f: string) => Math.max(...moleculeOf(f).map(([s, x]) => Math.abs(x) + elementOf(s).r))

/** Each species as a column of `k` molecules (three abreast), `+` and `→` printed on the page between them. */
/** Columns left to right, and the total width, of an equation drawn as molecules. */
function layoutEquation(r: Reaction, ks: number[], scale: number) {
  const species = [...r.left.map((f) => ({ f, right: false })), ...r.right.map((f) => ({ f, right: true }))]
  let x = 0
  const cols = species.map((s, i) => {
    if (i > 0) x += species[i - 1].right !== s.right ? 4.5 : 2.6
    const cell = Math.max(2.8, halfWidth(s.f) * 2 * scale + 0.5)
    const w = cell * Math.min(Math.max(ks[i], 1), 3)
    const col = { ...s, k: ks[i], x0: x, w, cell }
    x += w
    return col
  })
  return { cols, width: x }
}

/** Page extent that fits an equation plate, so short equations are drawn larger. */
export const equationExtent = (r: Reaction, ks: number[], scale: number): [number, number] => [Math.max(layoutEquation(r, ks, scale).width + 4, 26), 18]

export function EquationPlate({ r, ks, scale }: { r: Reaction; ks: number[]; scale: number }) {
  const { cols, width } = layoutEquation(r, ks, scale)
  const shift = -width / 2
  return (
    <>
      {cols.map((c, i) => {
        const rows = Math.ceil(c.k / 3)
        const left = c.x0 + shift
        return (
          <Fragment key={c.f}>
            {Array.from({ length: c.k }, (_, j) => (
              <Rise key={j} position={[left + c.cell * ((j % 3) + 0.5), 0, (Math.floor(j / 3) - (rows - 1) / 2) * c.cell]}>
                <Molecule f={c.f} scale={scale} position-y={1.6} rotation={[0, (rand(j + i * 10) - 0.5) * 0.8, 0]} />
              </Rise>
            ))}
            <Label position={[left + c.w / 2, 0, (rows - 1) * c.cell * 0.5 + 3.4]} text={c.k === 1 ? '' : `${c.k}`} formula={c.f} bold />
            {i > 0 && <Label position={[left - (cols[i - 1].right !== c.right ? 2.25 : 1.3), 0, 0]} text={cols[i - 1].right !== c.right ? '→' : '+'} bold />}
          </Fragment>
        )
      })}
    </>
  )
}

/** An equation as printed runs; coefficient 1 is left out. */
export const eqRuns = (r: Reaction, ks: number[]): Run[] =>
  [...r.left, ...r.right].flatMap((f, i) => [...(i > 0 ? txt(i === r.left.length ? ' → ' : ' + ') : []), ...(ks[i] > 1 ? txt(`${ks[i]}`) : []), ...fml(f)])

// --- the chapter ---

const DEMO: Run[][] = [
  txt(`天平上：一杯稀盐酸，一碟碳酸钠粉末，读数 ${grams(OPEN_G)}。`),
  txt('把粉末倒进盐酸：立刻冒出大量气泡。看天平的读数，它在往下掉。'),
  txt(`停在 ${grams(OPEN_G - LOSS)}，少了 ${grams(LOSS)}，正是跑进空气的二氧化碳。原子没有消失，只是离开了天平。`),
  [...eqRuns(SODA_ACID, SODA_ACID_KS), ...txt('：两边钠 2、碳 1、氧 3、氢 2、氯 2，一个不差。')],
  txt('有气体参加或生成的反应，要在密闭容器里称才看得出守恒。下面自己试一试。'),
]

const SODA_ATOMS = sideAtoms(sides(SODA_ACID, SODA_ACID_KS)[0])
const SODA_LIT = Object.keys(SODA_ATOMS)
const WITHOUT_CO2 = { ...SODA_ATOMS, C: 0, O: SODA_ATOMS.O - 2 }
const START_KS = TO_BALANCE.map((r) => Array<number>(r.left.length + r.right.length).fill(1))

type Phase = 'predict' | 'demo' | 'try'

export function useChapter2(nav: Nav): SpreadDef[] {
  const [phase, setPhase] = useState<Phase>('predict')
  const [picked, setPicked] = useState<number | null>(null)
  const [flap, setFlap] = useState(false)
  const [demo, setDemo] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [mixedAt, setMixedAt] = useState<number | null>(null)
  const [openedAt, setOpenedAt] = useState<number | null>(null)
  const [run, setRun] = useState(0)
  const [ks, setKs] = useState(START_KS)
  const [active, setActive] = useState(0)
  const [stamped, setStamped] = useState(() => Boolean(loadStamps()[2]))

  useEffect(() => {
    if (!playing || phase !== 'demo') return
    if (demo === DEMO.length - 1) return setPlaying(false)
    const t = setTimeout(() => setDemo((d) => d + 1), 6500)
    return () => clearTimeout(t)
  }, [playing, phase, demo])

  const solved = TO_BALANCE.map((r, i) => balanced(...sides(r, ks[i])) && simplest(ks[i]))

  function bump(eq: number, i: number, d: number) {
    const next = ks.map((row, e) => (e === eq ? row.map((k, j) => (j === i ? Math.min(Math.max(k + d, 1), 9) : k)) : row))
    setKs(next)
    setActive(eq)
    if (TO_BALANCE.every((r, e) => balanced(...sides(r, next[e])) && simplest(next[e]))) {
      saveStamp(2)
      setStamped(true)
    }
  }

  function onHit(id: string, i: number) {
    if (id === 'predict') setPicked(i)
    else if (id === 'why' && picked !== null) setFlap(true)
    else if (id === 'prev') (setPlaying(false), setDemo(Math.max(demo - 1, 0)))
    else if (id === 'next') (setPlaying(false), setDemo(demo + 1))
    else if (id === 'try') setPhase('try')
    else if (id === 'again') (setMixedAt(null), setOpenedAt(null), setRun((r) => r + 1))
    else if (id === 'shake' && phase === 'try' && mixedAt === null) setMixedAt(now())
    else if (id === 'unplug' && phase === 'try' && mixedAt !== null && openedAt === null) setOpenedAt(now())
    else if (id === 'turn') nav.next()
    else if (id === 'contents') nav.toChapter(0)
    else if (id.endsWith(':focus')) setActive(Number(id[2]))
    else if (id.startsWith('eq')) bump(Number(id[2]), Math.floor(i / 2), i % 2 ? -1 : 1)
  }

  // --- spread A: the balance ---
  let ledger: Block = { kind: 'ledger', caption: '原子账本', lit: [], counts: {} }
  let drawing: { node: ReactNode; key: string }
  let foot: Block[]
  if (phase === 'predict') {
    drawing = { node: <OpenSetup pouredAt={null} />, key: 'open' }
    foot = [
      { kind: 'para', size: 'small', runs: txt('图 2　敞口烧杯放在天平上', { tone: 'soft' }) },
      { kind: 'para', runs: txt(picked === null ? '先在左页勾选你的预测。' : '按下方的 ▶ 看演示。') },
    ]
  } else if (phase === 'demo') {
    drawing =
      demo === 0
        ? { node: <OpenSetup pouredAt={null} />, key: 'open' }
        : demo === 1
          ? { node: <PourNow />, key: 'pour' }
          : demo === 2
            ? { node: <OpenSetup pouredAt={-1e6} />, key: 'poured' }
            : demo === 3
              ? { node: <EquationPlate r={SODA_ACID} ks={SODA_ACID_KS} scale={1} />, key: 'equation' }
              : { node: <SealedSetup mixedAt={null} openedAt={null} />, key: 'sealed' }
    if (demo <= 1) ledger = { kind: 'ledger', caption: '天平上参加反应的原子（按一份反应计）', lit: SODA_LIT, counts: SODA_ATOMS }
    else if (demo === 2) ledger = { kind: 'ledger', caption: '天平上的原子：开始 → 现在', lit: SODA_LIT, counts: SODA_ATOMS, after: WITHOUT_CO2 }
    else if (demo === 3) ledger = { kind: 'ledger', caption: '原子账本：反应前 → 反应后', lit: SODA_LIT, counts: SODA_ATOMS, after: sideAtoms(sides(SODA_ACID, SODA_ACID_KS)[1]) }
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
  } else {
    drawing = {
      node: (
        <SealedSetup
          mixedAt={mixedAt}
          openedAt={openedAt}
          onFlask={mixedAt === null ? () => setMixedAt(now()) : undefined}
          onStopper={mixedAt !== null && openedAt === null ? () => setOpenedAt(now()) : undefined}
        />
      ),
      key: `try-${run}`,
    }
    ledger =
      mixedAt === null
        ? { kind: 'ledger', caption: '天平上参加反应的原子（按一份反应计）', lit: SODA_LIT, counts: SODA_ATOMS }
        : { kind: 'ledger', caption: '天平上的原子：开始 → 现在', lit: SODA_LIT, counts: SODA_ATOMS, after: openedAt === null ? SODA_ATOMS : WITHOUT_CO2 }
    foot = [
      { kind: 'label', text: '动手' },
      {
        kind: 'para',
        runs: txt(
          mixedAt === null
            ? `锥形瓶塞紧了橡胶塞，读数 ${grams(SEALED_G)}。点锥形瓶摇一摇，让盐酸和碳酸钠反应。`
            : openedAt === null
              ? '气泡冒得厉害，读数却没变：二氧化碳被关在瓶里。现在点橡胶塞，把它拔掉。'
              : '读数变小了：二氧化碳从瓶口跑了出去。质量没有消失，它跟着气体离开了天平。',
        ),
      },
      ...(openedAt !== null
        ? [{ kind: 'links', items: [{ id: 'again', text: '重新做一次' }, { id: 'turn', text: '翻页：配平 →' }] } as Block]
        : []),
    ]
  }

  const law = phase === 'try' || (phase === 'demo' && demo === DEMO.length - 1)
  const leftA: Block[] = [
    { kind: 'kicker', text: '第 二 章' },
    { kind: 'title', text: '质量守恒' },
    { kind: 'para', size: 'lead', runs: txt('化学反应里，原子只是换了搭档。那反应前后，物质的总质量会变吗？把冒泡的反应放到天平上称一称。') },
    ...(law
      ? [{ kind: 'box', runs: [...txt('质量守恒定律　', { bold: true }), ...txt('参加化学反应的各物质的质量总和，等于反应后生成的各物质的质量总和。')] } as Block]
      : []),
    { kind: 'label', text: '预测' },
    { kind: 'para', runs: txt(`天平上一杯稀盐酸和一碟碳酸钠粉末，读数 ${grams(OPEN_G)}。把粉末倒进盐酸，立刻冒出大量气泡。反应结束后，读数会怎样？`) },
    { kind: 'choices', id: 'predict', picked, items: [txt('变大：生成了新物质'), txt('不变：反应前后质量守恒'), txt('变小')] },
    {
      kind: 'flap',
      id: 'why',
      open: flap,
      locked: picked === null,
      runs: [
        ...txt(picked === 2 ? '你的预测是对的。' : '答案是变小。', { tone: 'seal', bold: true }),
        ...txt('生成的二氧化碳是气体，从敞口烧杯跑进了空气。质量没有消失，只是有一部分离开了天平。'),
      ],
    },
  ]

  // --- spread B: balancing ---
  const r = TO_BALANCE[active]
  const [l, rt] = sides(r, ks[active])
  const leftB: Block[] = [
    { kind: 'kicker', text: '第 二 章 · 续' },
    { kind: 'title', text: '配平化学方程式' },
    { kind: 'para', size: 'lead', runs: txt('原子不会凭空出现，也不会凭空消失。在化学式前配上系数，让左右两边每种原子都一样多。') },
    { kind: 'label', text: '挑战' },
    ...TO_BALANCE.map((re, e): Block => {
      const ok = balanced(...sides(re, ks[e]))
      return {
        kind: 'equation',
        id: `eq${e}`,
        head: re.name,
        formulas: [...re.left, ...re.right],
        ks: ks[e],
        nLeft: re.left.length,
        done: solved[e],
        active: active === e,
        note: active === e && !solved[e] ? (ok ? '两边相等了，但系数还能约简：要用最简整数比。' : '账本里标红的罐子，两边还不相等。') : undefined,
      }
    }),
    { kind: 'para', size: 'small', hand: true, runs: txt('点 ▲ ▼ 改系数；点方框切换方程式。') },
  ]
  const footB: Block[] = [
    { kind: 'para', size: 'small', runs: txt(`图 3　${r.name}：每个系数就是分子的个数`, { tone: 'soft' }) },
    {
      kind: 'para',
      runs: solved.every(Boolean)
        ? txt('两个方程式都配平了。系数改变的是分子的个数，原子的种类和数目始终不变。')
        : [...txt('现在：'), ...eqRuns(r, ks[active])],
    },
    ...(solved.every(Boolean) ? [{ kind: 'links', items: [{ id: 'contents', text: '回到目录 →' }] } as Block] : []),
  ]

  return [
    {
      key: 'ch2-balance',
      chapter: 2,
      title: '质量守恒',
      left: leftPage(leftA, 5),
      right: rightPage([ledger], foot, 6),
      popup: { node: drawing.node, extent: drawing.key === 'equation' ? equationExtent(SODA_ACID, SODA_ACID_KS, 1) : [30, 26], key: drawing.key },
      onHit,
      actions:
        phase !== 'try'
          ? undefined
          : mixedAt === null
            ? [{ id: 'shake', text: '摇一摇锥形瓶' }]
            : openedAt === null
              ? [{ id: 'unplug', text: '拔掉橡胶塞' }]
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
    {
      key: 'ch2-equations',
      chapter: 2,
      title: '配平化学方程式',
      left: leftPage(leftB, 7, stamped ? 2 : undefined),
      right: rightPage([{ kind: 'ledger', caption: '原子账本：左边 → 右边', lit: [...new Set([...Object.keys(sideAtoms(l)), ...Object.keys(sideAtoms(rt))])], counts: sideAtoms(l), after: sideAtoms(rt) }], footB, 8),
      popup: { node: <EquationPlate r={r} ks={ks[active]} scale={0.9} />, extent: equationExtent(r, ks[active], 0.9), key: `eq-${active}` },
      onHit,
    },
  ]
}
