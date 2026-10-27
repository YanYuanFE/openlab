import { TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Brand } from '@/components/Logo'
import { LESSONS } from '@/lessons'
import type { Lesson } from '@/lessons/types'

const GROUPS = [
  { id: 'required', title: '学生必做实验', desc: '课程标准规定的学生必做实验，可以在课前预习或课后复习。' },
  { id: 'demo', title: '演示与拓展实验', desc: '有毒、危险或条件难以满足、在学校里不方便动手做的实验。' },
] as const

/** Key substance shown large on each tile, like an element symbol. */
const FORMULA: Record<string, string> = {
  solution: 'NaCl',
  iron: 'Fe³⁺',
  salt: 'BaSO₄',
  cell: 'Zn|Cu',
  rate: 'H₂O₂',
  titration: 'NaOH',
  chlorine: 'Cl₂',
  sodium: 'Na',
  thermite: 'Al',
  fountain: 'NH₃',
  acetylene: 'C₂H₂',
  electrolysis: 'CuCl₂',
}

export function Home() {
  return (
    <div className="min-h-dvh bg-background px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="inline-block">
          <Brand />
        </Link>
        <h1 className="mt-8 text-[28px] leading-tight font-semibold text-ink">全部实验</h1>
        <p className="mt-2 max-w-[38em] text-ink-soft">在 3D 实验台上一步步完成高中化学实验：取用试剂、观察现象、写出方程式。</p>
        <LessonGroups />
      </div>
    </div>
  )
}

export function LessonGroups() {
  return GROUPS.map((g) => (
    <section key={g.id} className="mt-12">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
        {g.id === 'demo' && <TriangleAlert className="size-5 fill-hazard text-ink" aria-hidden />}
        {g.title}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">{g.desc}</p>
      <div className="mt-6 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.filter((l) => l.group === g.id).map((l) => (
          <LessonTile key={l.id} lesson={l} />
        ))}
      </div>
    </section>
  ))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LessonTile({ lesson: l }: { lesson: Lesson<any> }) {
  return (
    <Link
      to={`/lessons/${l.id}`}
      className="group flex flex-col bg-card p-6 transition-colors hover:bg-bench-soft/50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
    >
      <div className="flex items-start justify-between text-sm text-ink-soft tabular-nums">
        <l.icon className="size-5 text-bench" />
        <span>{l.steps.length} 步</span>
      </div>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-bench">{FORMULA[l.id]}</p>
      <p className="mt-4 text-lg font-semibold text-ink group-hover:underline group-hover:decoration-bench/40 group-hover:underline-offset-4">{l.title}</p>
      <p className="mt-2 text-sm text-ink-soft">{l.goal}</p>
    </Link>
  )
}
