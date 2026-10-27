import { useEffect, useState, type ReactNode } from 'react'
import { txt, type Block, type Run } from './print'
import { loadStamps, saveStamp } from './progress'
import { leftPage, rightPage, type Nav, type SpreadDef } from './spread'

// The shape most chapters share, on one spread: predict on the left page, a ▶ demonstration on the right, then
// hands-on work on the right while the left page asks the challenge question that earns the stamp.

/** What stands on the right page, and what is printed above it (usually a ledger). */
export interface Plate {
  node: ReactNode
  key: string
  extent?: [number, number]
  top?: Block[]
}

export interface DemoStep extends Plate {
  runs: Run[]
}

/** The hands-on part, owned by the chapter: its foot text, whether it is finished, and its printed controls. */
export interface Hands extends Plate {
  foot: Block[]
  done: boolean
  onHit?: (id: string, i: number) => void
}

export interface Question {
  runs: Run[]
  choices: Run[][]
  answer: number
  /** printed under the flap, or after the challenge is solved */
  why: Run[]
}

export interface LessonDef {
  n: number
  title: string
  lead: string
  /** the key idea, boxed once the demonstration reaches its end */
  law: Run[]
  predict: Question
  /** the drawing while predicting, and its caption */
  start: Plate
  figure: string
  demo: DemoStep[]
  challenge: Question
}

const NUM = '一二三四五六七八九十'

type Phase = 'predict' | 'demo' | 'try'

export function useLesson(nav: Nav, def: LessonDef, hands: Hands): SpreadDef {
  const [phase, setPhase] = useState<Phase>('predict')
  const [picked, setPicked] = useState<number | null>(null)
  const [flap, setFlap] = useState(false)
  const [demo, setDemo] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)

  // ▶ walks through the demonstration on its own
  useEffect(() => {
    if (!playing || phase !== 'demo') return
    if (demo === def.demo.length - 1) return setPlaying(false)
    const t = setTimeout(() => setDemo((d) => d + 1), 6500)
    return () => clearTimeout(t)
  }, [playing, phase, demo, def.demo.length])

  function answer(i: number) {
    if (solved) return
    if (i !== def.challenge.answer) return setWrong(wrong.includes(i) ? wrong : [...wrong, i])
    saveStamp(def.n)
    setSolved(true)
  }

  function onHit(id: string, i: number) {
    if (id === 'predict') setPicked(i)
    else if (id === 'why' && picked !== null) setFlap(true)
    else if (id === 'prev') (setPlaying(false), setDemo(Math.max(demo - 1, 0)))
    else if (id === 'next') (setPlaying(false), setDemo(demo + 1))
    else if (id === 'try') setPhase('try')
    else if (id === 'challenge') answer(i)
    else if (id === 'next-chapter') nav.toChapter(def.n + 1)
    else hands.onHit?.(id, i)
  }

  const p = def.predict
  const head: Block[] = [
    { kind: 'kicker', text: `第 ${NUM[def.n - 1]} 章` },
    { kind: 'title', text: def.title },
    { kind: 'para', size: 'lead', runs: txt(def.lead) },
  ]
  const law: Block = { kind: 'box', runs: def.law }
  const c = def.challenge
  const left: Block[] =
    phase === 'try'
      ? [
          ...head,
          law,
          { kind: 'label', text: '挑战' },
          ...(hands.done
            ? [
                { kind: 'para', runs: c.runs } as Block,
                { kind: 'choices', id: 'challenge', picked: solved ? c.answer : null, wrong, items: c.choices } as Block,
                ...(solved ? [{ kind: 'para', runs: [...txt('答对了。', { tone: 'seal', bold: true }), ...c.why] } as Block] : []),
              ]
            : [{ kind: 'para', hand: true, runs: txt('先在右页动手做一做，挑战题会出现在这里。') } as Block]),
        ]
      : [
          ...head,
          ...(phase === 'demo' && demo === def.demo.length - 1 ? [law] : []),
          { kind: 'label', text: '预测' },
          { kind: 'para', runs: p.runs },
          { kind: 'choices', id: 'predict', picked, items: p.choices },
          {
            kind: 'flap',
            id: 'why',
            open: flap,
            locked: picked === null,
            runs: [...txt(picked === p.answer ? '你的预测是对的。' : `答案是第${NUM[p.answer]}个。`, { tone: 'seal', bold: true }), ...p.why],
          },
        ]

  let plate: Plate
  let foot: Block[]
  if (phase === 'predict') {
    plate = def.start
    foot = [
      { kind: 'para', size: 'small', runs: txt(`图 ${def.n}　${def.figure}`, { tone: 'soft' }) },
      { kind: 'para', runs: txt(picked === null ? '先在左页勾选你的预测。' : '按下方的 ▶ 看演示。') },
    ]
  } else if (phase === 'demo') {
    const d = def.demo[demo]
    plate = d
    foot = [
      { kind: 'label', text: `演示 ${demo + 1} / ${def.demo.length}` },
      { kind: 'para', runs: d.runs },
      {
        kind: 'links',
        items: [
          { id: 'prev', text: '‹ 上一步', disabled: demo === 0 },
          demo < def.demo.length - 1 ? { id: 'next', text: '下一步 ›' } : { id: 'try', text: '自己动手 →' },
        ],
      },
    ]
  } else {
    plate = hands
    foot = [...hands.foot, ...(solved && def.n < 10 ? [{ kind: 'links', items: [{ id: 'next-chapter', text: '下一章 →' }] } as Block] : [])]
  }

  return {
    key: `ch${def.n}`,
    chapter: def.n,
    title: def.title,
    left: leftPage(left, def.n * 2 + 3, solved || loadStamps()[def.n] ? def.n : undefined),
    right: rightPage(plate.top ?? [], foot, def.n * 2 + 4),
    popup: { node: plate.node, extent: plate.extent ?? [30, 26], key: plate.key },
    onHit,
    play:
      picked === null
        ? undefined
        : () => {
            setPhase('demo')
            setDemo(0)
            setPlaying(true)
          },
    focus: phase === 'predict' || (phase === 'try' && hands.done && !solved) ? 'left' : 'right',
  }
}
