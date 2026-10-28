import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing'
import { BookOpen, ChevronLeft, ChevronRight, List, Play } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useChapter1 } from './ch1'
import { useChapter2 } from './ch2'
import { useChapter3 } from './ch3'
import { useChapter4 } from './ch4'
import { useChapter5 } from './ch5'
import { useChapter6 } from './ch6'
import { useChapter7 } from './ch7'
import { useChapter8 } from './ch8'
import { useChapter9 } from './ch9'
import { useChapter10 } from './ch10'
import { CameraRig, Desk, DeskCamera, DeskLights, Leaf, OpenBook, pagePoint, TURN_SECONDS, type Framing } from './desk'
import { FOLD_SECONDS, PopUp, REDUCED } from './ink'
import { useBack, useFront } from './front'
import { PAGE_W, usePage } from './paper'
import { plain, type Block } from './print'
import type { Nav, SpreadDef } from './spread'

const BAR = 84
/** centre of the pop-up area on the right page, cm from its top-left */
const POPUP_AT = pagePoint('right', PAGE_W / 2, 13)

interface Turn {
  from: number
  to: number
  start: number
}

const noop = () => {}

/**
 * While a leaf turns forward, the old left page stays put and the new right page is already underneath;
 * the leaf carries the old right page on its front and the new left page on its back. Backward is the mirror.
 */
function Scene({ spreads, index, turn, framing }: { spreads: SpreadDef[]; index: number; turn: Turn | null; framing: Framing }) {
  const to = spreads[index]
  const from = turn ? spreads[turn.from] : to
  const forward = !turn || turn.to > turn.from
  const [l, r] = forward ? [from, to] : [to, from]
  const left = usePage(l.left)
  const right = usePage(r.right)
  const leafFront = usePage((forward ? from : to).right)
  const leafBack = usePage((forward ? to : from).left)
  const p = turn ? from.popup : to.popup
  const scale = p ? Math.min(17 / p.extent[0], 14 / p.extent[1]) : 1
  return (
    <>
      <DeskCamera />
      <CameraRig framing={framing} bottom={BAR} hero={!turn && to.popup ? POPUP_AT : null} />
      <DeskLights />
      <Desk />
      <OpenBook left={left} right={right} keys={[`${l.key}-left`, `${r.key}-right`]} onHit={turn ? noop : to.onHit}>
        {p && (
          <PopUp key={turn ? `${from.key}-folding` : p.key} position={POPUP_AT} scale={scale} folding={Boolean(turn)}>
            {p.node}
          </PopUp>
        )}
        {turn && <Leaf front={leafFront} back={leafBack} forward={forward} start={turn.start} />}
      </OpenBook>
      {/* soft contact shadow where things meet the page, and a faint darkening towards the edges, like a photo */}
      <EffectComposer multisampling={0}>
        <N8AO aoRadius={2.5} distanceFalloff={1} intensity={2.2} quality="medium" halfRes />
        <SMAA />
        <Vignette offset={0.32} darkness={0.42} />
      </EffectComposer>
    </>
  )
}

/** Reports whether the canvas is phone-narrow. */
function Narrow({ onChange }: { onChange: (narrow: boolean) => void }) {
  const narrow = useThree((s) => s.size.width < 760)
  useEffect(() => onChange(narrow), [narrow, onChange])
  return null
}

export function BookView() {
  const { n } = useParams()
  const navigate = useNavigate()
  const spreadsRef = useRef<SpreadDef[]>([])
  const [index, setIndex] = useState(0)
  const [turn, setTurn] = useState<Turn | null>(null)
  const indexRef = useRef(index)
  indexRef.current = index
  const turning = useRef(false)
  /** turns to spread `i` with a page-turn animation */
  const go = (i: number) => {
    const from = indexRef.current
    if (turning.current || i === from || i < 0 || i >= spreadsRef.current.length) return
    turning.current = true
    // the leaf waits, lying flat, while the drawing on the page it will lift folds down
    const fold = REDUCED ? 0 : FOLD_SECONDS
    setTurn({ from, to: i, start: performance.now() / 1000 + fold })
    setIndex(i)
    setTimeout(
      () => {
        turning.current = false
        setTurn(null)
      },
      (fold + TURN_SECONDS) * 1000 + 60,
    )
  }
  const nav: Nav = {
    toChapter: (c) => go(spreadsRef.current.findIndex((s) => s.chapter === c)),
    next: () => go(indexRef.current + 1),
  }
  const spreads = [...useFront(nav), ...useChapter1(nav), ...useChapter2(nav), ...useChapter3(nav), ...useChapter4(nav), ...useChapter5(nav), ...useChapter6(nav), ...useChapter7(nav), ...useChapter8(nav), ...useChapter9(nav), ...useChapter10(nav), ...useBack(nav)]
  spreadsRef.current = spreads

  // open at the chapter in the URL, and keep the URL on the chapter being read
  const opened = useRef(false)
  useEffect(() => {
    if (opened.current) return
    opened.current = true
    const i = spreads.findIndex((s) => s.chapter === Number(n ?? 0))
    if (i > 0) setIndex(i)
  }, [n, spreads])
  const spread = spreads[index]
  useEffect(() => {
    navigate(spread.chapter ? `/book/${spread.chapter}` : '/book', { replace: true })
  }, [spread.chapter, navigate])

  const [narrow, setNarrow] = useState(false)
  const [side, setSide] = useState<'left' | 'right'>('left')
  useEffect(() => setSide('left'), [index])
  useEffect(() => {
    if (spread.focus) setSide(spread.focus)
  }, [spread.focus])
  const framing: Framing = narrow ? side : 'spread'

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#e4dccd] font-serif text-pen">
      <Canvas shadows flat dpr={[1, 2]} className="!absolute inset-0" aria-label="《每一个原子》：一本打开的书。下方有文字版，可用键盘操作。">
        <Narrow onChange={setNarrow} />
        <Scene spreads={spreads} index={index} turn={turn} framing={framing} />
      </Canvas>

      <nav aria-label="翻书" className="absolute inset-x-0 bottom-4 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-1 rounded-full border border-pen/10 bg-paper/85 px-2 py-1.5 shadow-lg backdrop-blur">
        <BarButton label="目录" onClick={() => go(0)}>
          <List className="size-4" />
        </BarButton>
        <BarButton label="上一页" disabled={index === 0} onClick={() => go(index - 1)}>
          <ChevronLeft className="size-4" />
        </BarButton>
        <BarButton label="看演示" disabled={!spread.play} onClick={() => spread.play?.()}>
          <Play className="size-4" />
        </BarButton>
        <span className="min-w-0 truncate px-2 text-sm">
          {spread.chapter > 0 && <span className="mr-1.5 text-seal">{spread.chapter}</span>}
          {spread.title}
        </span>
        <BarButton label="下一页" disabled={index === spreads.length - 1} onClick={() => go(index + 1)}>
          <ChevronRight className="size-4" />
        </BarButton>
        {narrow && (
          <BarButton label={side === 'left' ? '看插图' : '看文字'} onClick={() => setSide(side === 'left' ? 'right' : 'left')}>
            <BookOpen className="size-4" />
            <span className="ml-1 text-xs">{side === 'left' ? '插图' : '文字'}</span>
          </BarButton>
        )}
      </nav>

      <TextVersion spread={spread} />
    </div>
  )
}

function BarButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-pen transition-colors hover:bg-pen/10 disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/** The spread as plain HTML for screen readers and keyboards; every printed control is a real button here. */
function TextVersion({ spread }: { spread: SpreadDef }) {
  const blocks: Block[] = [...spread.left.blocks, ...spread.right.blocks, ...(spread.right.foot?.blocks ?? [])]
  const hit = spread.onHit
  return (
    <main className="sr-only">
      {blocks.map((b, k) => {
        switch (b.kind) {
          case 'kicker':
          case 'label':
            return <p key={k}>{b.text}</p>
          case 'title':
            return <h1 key={k}>{b.text}</h1>
          case 'para':
          case 'box':
            return <p key={k}>{plain(b.runs)}</p>
          case 'terms':
            return (
              <dl key={k}>
                {b.items.map(([t, d]) => (
                  <div key={t}>
                    <dt>{t}</dt>
                    <dd>{plain(d)}</dd>
                  </div>
                ))}
              </dl>
            )
          case 'choices':
            return (
              <div key={k} role="group">
                {b.items.map((c, i) => (
                  <button key={i} type="button" aria-pressed={b.picked === i} onClick={() => hit(b.id, i)}>
                    {plain(c)}
                  </button>
                ))}
              </div>
            )
          case 'flap':
            return b.open ? (
              <p key={k}>{plain(b.runs)}</p>
            ) : (
              <button key={k} type="button" disabled={b.locked} onClick={() => hit(b.id, 0)}>
                掀开看答案
              </button>
            )
          case 'links':
            return (
              <div key={k}>
                {b.items.map((l) => (
                  <button key={l.id} type="button" disabled={l.disabled} onClick={() => hit(l.id, 0)}>
                    {l.text}
                  </button>
                ))}
              </div>
            )
          case 'toc':
            return (
              <ol key={k}>
                {b.items.map((it, i) => (
                  <li key={it.title}>
                    <button type="button" disabled={!it.enabled} onClick={() => hit(b.id, i)}>
                      {it.title}：{it.lead}
                      {it.stamped && '（已盖章）'}
                    </button>
                  </li>
                ))}
              </ol>
            )
          case 'stamps':
            return <p key={k}>{b.ns.length ? `已盖章：第 ${b.ns.join('、')} 章` : '还没有盖章'}</p>
          case 'ledger':
            return (
              <p key={k}>
                {b.caption}：
                {b.lit.map((s) => (b.after ? `${s} ${b.counts[s] ?? 0}→${b.after[s] ?? 0}` : `${s} ${b.counts[s] ?? ''}`)).join('，') || '空'}
              </p>
            )
          case 'equation':
            return (
              <div key={k} role="group" aria-label={b.head}>
                {b.formulas.map((f, i) => (
                  <span key={f}>
                    <button type="button" onClick={() => hit(b.id, i * 2)}>
                      增加 {f} 的系数
                    </button>
                    {b.ks[i]} {f}
                    <button type="button" onClick={() => hit(b.id, i * 2 + 1)}>
                      减少 {f} 的系数
                    </button>
                  </span>
                ))}
                {b.done && '配平了'}
                {b.note}
              </div>
            )
          case 'plot':
            return <p key={k}>{b.caption}{b.at && `：${b.xLabel} ${b.at[0]}，${b.yLabel} ${b.at[1].toFixed(2)}`}</p>
          case 'gap':
            return null
        }
      })}
      {spread.actions && (
        <div role="group" aria-label="插图里的操作">
          {spread.actions.map((a) => (
            <button key={a.id} type="button" aria-pressed={a.pressed} onClick={() => hit(a.id, 0)}>
              {a.text}
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
