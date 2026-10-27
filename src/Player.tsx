import { ArrowLeft, Check, Hand, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { saveDone } from '@/book/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { dyn, type Anim, type Lesson } from '@/lessons/types'
import { cn } from '@/lib/utils'

export function Player<S>({ lesson }: { lesson: Lesson<S> }) {
  const navigate = useNavigate()
  const [state, setState] = useState(lesson.initial)
  const stateRef = useRef(state)
  stateRef.current = state
  const [stepIdx, setStepIdx] = useState(0)
  const [stepDone, setStepDone] = useState(false)
  const [held, setHeld] = useState<string | null>(null)
  const [anim, setAnim] = useState<Anim | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [equations, setEquations] = useState<string[]>([])
  const [wrong, setWrong] = useState<number[]>([])

  const finished = stepIdx >= lesson.steps.length
  const step = finished ? null : lesson.steps[stepIdx]
  const locked = finished || stepDone || anim !== null
  useEffect(() => {
    if (finished) saveDone(lesson.id)
  }, [finished, lesson.id])
  const name = (id: string) => lesson.items[id] ?? id

  function onItem(id: string) {
    if (locked || !step) return
    if (step.kind !== 'act') {
      setHint(step.kind === 'quiz' ? '先回答下面的问题。' : '用下方面板里的按钮操作。')
      return
    }
    if (step.tool) {
      if (id === step.tool) {
        setHeld(held === id ? null : id)
        setHint(null)
        return
      }
      if (id === step.target) {
        if (held !== step.tool) return setHint(`先点击「${name(step.tool)}」拿起来。`)
        const wait = step.ready?.(stateRef.current, performance.now() / 1000)
        if (wait) return setHint(wait)
        setHint(null)
        return setAnim({ id: Date.now(), verb: step.verb, tool: step.tool, target: id })
      }
      return setHint(held === step.tool ? `把它用在「${name(step.target)}」上。` : `这一步需要的是「${name(step.tool)}」。`)
    }
    if (id === step.target) {
      if (held) return setHint('先把手里的东西放回去（再点一次它）。')
      const wait = step.ready?.(stateRef.current, performance.now() / 1000)
      if (wait) return setHint(wait)
      setHint(null)
      return setAnim({ id: Date.now(), verb: step.verb, target: id })
    }
    if (held && id === held) return setHeld(null)
    setHint(`这一步请操作「${name(step.target)}」。`)
  }

  function onCommit() {
    if (!step || step.kind !== 'act') return
    const r = step.apply(stateRef.current, performance.now() / 1000)
    stateRef.current = r.state
    setState(r.state)
    setEquations(r.equations ?? [])
  }

  function onFinish() {
    setAnim(null)
    setHeld(null)
    setStepDone(true)
  }

  function choose(i: number) {
    if (!step || step.kind !== 'quiz' || stepDone) return
    if (i === dyn(step.answer, state)) {
      setStepDone(true)
      setHint(null)
    } else {
      setWrong((w) => [...w, i])
      setHint('不对，再想想。')
    }
  }

  function next() {
    setStepIdx((s) => s + 1)
    setStepDone(false)
    setEquations([])
    setWrong([])
    setHint(null)
  }

  function restart() {
    setState(lesson.initial())
    setStepIdx(0)
    setStepDone(false)
    setHeld(null)
    setAnim(null)
    setHint(null)
    setEquations([])
    setWrong([])
  }

  let pointer: string | null = null
  if (!locked && step?.kind === 'act') pointer = step.tool && held !== step.tool ? step.tool : step.target

  const Scene = lesson.Scene
  const Icon = lesson.icon

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <Scene
        state={state}
        step={step}
        held={held}
        anim={anim}
        pointer={pointer}
        onItem={onItem}
        onCommit={onCommit}
        onFinish={onFinish}
      />

      <header className="pointer-events-none absolute top-4 right-4 left-4 flex items-start justify-between gap-4">
        <div className="pointer-events-auto max-w-md">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="-ml-2 h-7 px-2" onClick={() => navigate('/lessons')}>
              <ArrowLeft />
              全部实验
            </Button>
            <Icon className="size-4 text-bench" />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{lesson.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{lesson.goal}</p>
        </div>
        {held && !anim && (
          <Button size="sm" className="pointer-events-auto gap-1.5" onClick={() => setHeld(null)} title="放回原处">
            <Hand className="size-4" />
            手中：{name(held)}
            <X className="size-3.5 opacity-70" />
          </Button>
        )}
      </header>

      <Card size="sm" className="absolute top-36 left-4 hidden max-h-[calc(100dvh-20rem)] w-64 overflow-y-auto bg-card/90 backdrop-blur md:flex">
        <CardHeader>
          <CardTitle>实验步骤</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1">
            {lesson.steps.map((s, i) => {
              const done = i < stepIdx || (i === stepIdx && stepDone)
              const current = i === stepIdx && !finished
              return (
                <li
                  key={i}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted-foreground',
                    current && 'bg-bench-soft font-medium text-ink',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums',
                      done && 'border-transparent bg-bench text-white',
                    )}
                  >
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  {s.title}
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>

      <div className="absolute inset-x-4 bottom-4 mx-auto max-w-xl">
        {finished || !step ? (
          <Card className="bg-card/95 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">实验完成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {lesson.summary.map((s) => (
                  <li key={s} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-bench" />
                    {s}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button onClick={restart} variant="outline">
                  <RotateCcw />
                  重新开始
                </Button>
                <Button onClick={() => navigate('/lessons')}>返回实验列表</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-h-[60dvh] overflow-y-auto bg-card/95 backdrop-blur">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                <span className="shrink-0">
                  第 {stepIdx + 1} / {lesson.steps.length} 步
                </span>
                <Progress value={((stepIdx + (stepDone ? 1 : 0)) / lesson.steps.length) * 100} className="flex-1" />
              </div>
              <div>
                <p className="font-medium text-ink">{step.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{step.kind === 'quiz' ? step.question : step.instruction}</p>
              </div>

              {step.kind === 'quiz' && (
                <>
                  {step.Figure && <step.Figure state={state} />}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {dyn(step.choices, state).map((c, i) => {
                      const right = stepDone && i === dyn(step.answer, state)
                      return (
                        <Button
                          key={c}
                          variant="outline"
                          className={cn(
                            'h-auto justify-start py-2 text-left whitespace-normal',
                            wrong.includes(i) && 'border-red-300 bg-red-50 text-red-700',
                            right && 'border-bench bg-bench-soft text-bench',
                          )}
                          onClick={() => choose(i)}
                        >
                          {c}
                        </Button>
                      )
                    })}
                  </div>
                </>
              )}

              {step.kind === 'control' && (
                <step.Panel
                  state={state}
                  update={(f) => setState((s) => (stateRef.current = f(s)))}
                  complete={(eqs) => {
                    setEquations(eqs ?? [])
                    setStepDone(true)
                  }}
                  done={stepDone}
                />
              )}

              {hint && !stepDone && <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">{hint}</p>}

              {stepDone && (
                <div className="space-y-2 rounded-md border-l-4 border-bench bg-bench-soft/60 p-3 text-sm text-ink">
                  <p>
                    {step.kind === 'quiz' ? (
                      dyn(step.explain, state)
                    ) : (
                      <>
                        <span className="font-medium">现象：</span>
                        {dyn(step.observe, state)}
                      </>
                    )}
                  </p>
                  {equations.map((eq) => (
                    <p key={eq} className="text-[15px] font-medium whitespace-pre-line text-bench">
                      {eq}
                    </p>
                  ))}
                  {step.note && <p className="text-ink-soft">{step.note}</p>}
                </div>
              )}
              {stepDone && (
                <div className="flex justify-end">
                  <Button onClick={next}>{stepIdx === lesson.steps.length - 1 ? '完成实验' : '下一步'}</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
