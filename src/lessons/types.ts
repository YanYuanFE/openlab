import type { ComponentType } from 'react'

/** Visual verb a scene animates for an action step. */
export type Verb =
  | 'drip' | 'sprinkle' | 'pour' | 'stir' | 'dip' | 'place' | 'shake' | 'swirl' | 'invert' | 'heat' | 'connect' | 'open' | 'squeeze' | 'cut'

export interface Anim {
  id: number
  verb: Verb
  tool?: string
  target: string
}

export interface Applied<S> {
  state: S
  equations?: string[]
}

type Dyn<S, T> = T | ((s: S) => T)

interface BaseStep {
  title: string
  note?: string
}

/** Pick up `tool` (if any), then click `target`. */
export interface ActStep<S> extends BaseStep {
  kind: 'act'
  instruction: string
  tool?: string
  target: string
  verb: Verb
  apply: (s: S, now: number) => Applied<S>
  observe: Dyn<S, string>
  /** a hint while the target is not ready to be acted on yet (e.g. the jar still filling), or null */
  ready?: (s: S, now: number) => string | null
}

export interface QuizStep<S> extends BaseStep {
  kind: 'quiz'
  question: string
  Figure?: ComponentType<{ state: S }>
  choices: Dyn<S, string[]>
  answer: Dyn<S, number>
  explain: Dyn<S, string>
}

export interface ControlProps<S> {
  state: S
  update: (f: (s: S) => S) => void
  complete: (equations?: string[]) => void
  done: boolean
}

/** A continuous interaction driven from the step card (e.g. titrating, filling to the mark). */
export interface ControlStep<S> extends BaseStep {
  kind: 'control'
  instruction: string
  Panel: ComponentType<ControlProps<S>>
  observe: Dyn<S, string>
}

export type Step<S> = ActStep<S> | QuizStep<S> | ControlStep<S>

export interface SceneProps<S> {
  state: S
  step: Step<S> | null
  held: string | null
  anim: Anim | null
  pointer: string | null
  onItem: (id: string) => void
  onCommit: () => void
  onFinish: () => void
}

export interface Lesson<S> {
  id: string
  title: string
  goal: string
  /** required = 学生必做实验; demo = 演示与拓展实验 (dangerous or hard to do in class) */
  group: 'required' | 'demo'
  icon: ComponentType<{ className?: string }>
  /** display names of clickable items, used in hints */
  items: Record<string, string>
  initial: () => S
  steps: Step<S>[]
  summary: string[]
  Scene: ComponentType<SceneProps<S>>
}

export const dyn = <S, T>(v: Dyn<S, T>, s: S): T => (typeof v === 'function' ? (v as (s: S) => T)(s) : v)
