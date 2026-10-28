import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Link } from 'react-router'
import { pH, round2, TITRATION, equivalence } from '@/chem/titration'
import { Brand } from '@/components/Logo'
import { LessonGroups } from '@/Home'
import { cn } from '@/lib/utils'
import { LESSONS } from '@/lessons'
import { FlaskScene, type Drop } from './FlaskScene'
import { ChlorineArt, ElectrolysisArt, FountainArt, IronArt } from './SceneArt'

/** Universal indicator colours at pH 1, 3, ... 13. */
const SCALE = [
  { pH: 1, color: '#d42a2a', name: '红', desc: '强酸性' },
  { pH: 3, color: '#f26b1d', name: '橙', desc: '酸性' },
  { pH: 5, color: '#f2c014', name: '黄', desc: '弱酸性' },
  { pH: 7, color: '#3fa34d', name: '绿', desc: '中性' },
  { pH: 9, color: '#1f7fc4', name: '蓝', desc: '弱碱性' },
  { pH: 11, color: '#3b3a9e', name: '靛蓝', desc: '碱性' },
  { pH: 13, color: '#6b2a8c', name: '紫', desc: '强碱性' },
]
const GRADIENT = `linear-gradient(90deg, ${SCALE.map((s) => `${s.color} ${((s.pH / 14) * 100).toFixed(1)}%`).join(', ')})`

/** Universal indicator colour at any pH, interpolated between the SCALE stops. */
function indicator(p: number): string {
  const i = Math.min(Math.max(Math.floor((p - 1) / 2), 0), SCALE.length - 2)
  const k = Math.min(Math.max((p - SCALE[i].pH) / 2, 0), 1)
  const mix = (a: string, b: string, at: number) => Math.round(parseInt(a, 16) * (1 - at) + parseInt(b, 16) * at)
  const [a, b] = [SCALE[i].color, SCALE[i + 1].color]
  return `rgb(${[1, 3, 5].map((o) => mix(a.slice(o, o + 2), b.slice(o, o + 2), k)).join(',')})`
}
const nearest = (p: number) => SCALE.reduce((best, s) => (Math.abs(s.pH - p) < Math.abs(best.pH - p) ? s : best))

// The hero flask joins the lesson titration a few drops before the endpoint, so each drop shows the jump.
const START = 21.9
const LAST = 22.4
const volumeAt = (n: number) => round2(START + n * TITRATION.drop)
const DROPS = Math.round((LAST - START) / TITRATION.drop)

const REQUIRED = LESSONS.filter((l) => l.group === 'required').length
const STEP_COUNTS = LESSONS.map((l) => l.steps.length)
const FIRST = LESSONS[0]
const CTA = '开始做实验'

/** Four lessons drawn as looping line diagrams, each with the lesson it comes from. */
const SCENES = [
  { id: 'chlorine', Art: ChlorineArt, seen: '黄绿色的氯气经过除杂、干燥，充满集气瓶，湿润的淀粉 KI 试纸变蓝。', eq: 'MnO₂ + 4HCl(浓) =△= MnCl₂ + Cl₂↑ + 2H₂O' },
  { id: 'fountain', Art: FountainArt, seen: '挤入一滴水，烧瓶里的氨气迅速溶解，滴了酚酞的水喷成红色喷泉。', eq: 'NH₃ + H₂O ⇌ NH₃·H₂O ⇌ NH₄⁺ + OH⁻' },
  { id: 'iron', Art: IronArt, seen: '加入铁粉后溶液不再变红，滴入氯水，Fe²⁺ 被氧化，又变成血红色。', eq: '2Fe²⁺ + Cl₂ = 2Fe³⁺ + 2Cl⁻' },
  { id: 'electrolysis', Art: ElectrolysisArt, seen: '通电后阴极析出红色的铜，阳极冒出气泡，让淀粉 KI 试纸变蓝。', eq: 'CuCl₂ =电解= Cu + Cl₂↑' },
].map((s) => ({ ...s, title: LESSONS.find((l) => l.id === s.id)!.title }))

const FAQ = [
  { q: '要花钱吗？', a: '不用。所有实验都免费，也不需要注册账号。' },
  { q: '需要安装软件吗？', a: '不需要。用较新的 Chrome、Edge、Safari 或 Firefox 打开网页即可，实验台用 WebGL 在浏览器里绘制。' },
  { q: '包含哪些实验？', a: `课程标准规定的 ${REQUIRED} 个学生必做实验，加上 ${LESSONS.length - REQUIRED} 个有毒、危险或条件难以满足的演示与拓展实验。` },
  { q: '能代替真实的实验课吗？', a: '不能，也不打算代替。它适合课前预习、课后复习，以及学校里不方便做的危险实验。真实实验的手感和安全规范，仍然要在实验室里学。' },
  { q: '第一次用会不会不知道点哪里？', a: '每一步都会说明要拿起什么器材、点击哪里，跟着步骤卡片的提示就能做完整个实验。' },
  { q: '老师可以在课堂上用吗？', a: `可以。直接投屏演示，或者让学生在机房各自操作同一个实验。每个实验 ${Math.min(...STEP_COUNTS)}～${Math.max(...STEP_COUNTS)} 步，可以拖动实验台换个角度给全班看。` },
  { q: '《每一个原子》是什么？', a: '一本可以翻页的 3D 化学书，从原子讲到酸碱滴定，每章都有演示、动手操作和一道挑战题。' },
]

const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]'
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches

/** Main call to action; the same button opens and closes the page. */
function Cta({ className }: { className?: string }) {
  return (
    <Link
      to={`/lessons/${FIRST.id}`}
      className={cn(
        'inline-flex items-center rounded-lg bg-bench px-6 py-3 text-lg font-semibold text-white transition-[background-color,transform] duration-300 hover:bg-bench/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        EASE,
        className,
      )}
    >
      {CTA}
    </Link>
  )
}

/** A section that rises in once when it scrolls into view. */
function Reveal({ className, children, ...rest }: ComponentProps<'section'>) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        setShown(true)
        io.disconnect()
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])
  return (
    <section
      ref={ref}
      className={cn('transition-[opacity,transform] duration-700', EASE, shown ? 'opacity-100' : 'translate-y-8 opacity-0 motion-reduce:translate-y-0', className)}
      {...rest}
    >
      {children}
    </section>
  )
}

const NAV = [
  { href: '#lessons', text: '实验' },
  { href: '#book', text: '化学书' },
  { href: '#faq', text: '常见问题' },
]

/** Floating bar; on phones the links open in a full height panel. */
function Nav() {
  const [open, setOpen] = useState(false)
  // the open menu covers the page: lock its scroll and close on Escape
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      removeEventListener('keydown', onKey)
    }
  }, [open])
  const link = 'rounded-full px-3 py-2 text-sm font-semibold text-ink-soft transition-colors duration-300 hover:text-ink focus-visible:outline-2 focus-visible:outline-ring'
  return (
    <>
      <nav aria-label="主导航" className="fixed inset-x-0 top-4 z-20 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-border bg-card/70 py-2 pr-2 pl-4 shadow-sm backdrop-blur-md">
        <a href="#top" className="mr-2 flex rounded-lg py-1.5 focus-visible:outline-2 focus-visible:outline-ring">
          <Brand />
        </a>
        <div className="hidden items-center md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={link}>
              {n.text}
            </a>
          ))}
        </div>
        <Link to={`/lessons/${FIRST.id}`} className={cn('hidden rounded-full bg-bench px-3 py-2 text-sm font-semibold text-white transition-[background-color,transform] duration-300 hover:bg-bench/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:inline-flex', EASE)}>
          {CTA}
        </Link>
        <button
          type="button"
          aria-label={open ? '关闭菜单' : '打开菜单'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="relative size-11 rounded-full focus-visible:outline-2 focus-visible:outline-ring md:hidden"
        >
          {/* two lines that turn into a cross */}
          <span className={cn('absolute left-3.5 h-0.5 w-4 rounded-full bg-ink transition-transform duration-500', EASE, open ? 'top-1/2 rotate-45' : 'top-4')} />
          <span className={cn('absolute left-3.5 h-0.5 w-4 rounded-full bg-ink transition-transform duration-500', EASE, open ? 'top-1/2 -rotate-45' : 'top-6')} />
        </button>
      </nav>
      <div inert={!open} className={cn('fixed inset-0 z-10 flex flex-col gap-2 bg-background/95 px-6 pt-24 backdrop-blur-xl transition-opacity duration-300 md:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}>
        {NAV.map((n, i) => (
          <a
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            style={{ transitionDelay: open ? `${i * 60}ms` : '0ms' }}
            className={cn('py-3 text-2xl font-semibold text-ink transition-[opacity,transform] duration-500', EASE, open ? 'opacity-100' : 'translate-y-6 opacity-0 motion-reduce:translate-y-0')}
          >
            {n.text}
          </a>
        ))}
        <div style={{ transitionDelay: open ? `${NAV.length * 60}ms` : '0ms' }} className={cn('mt-4 transition-[opacity,transform] duration-500', EASE, open ? 'opacity-100' : 'translate-y-6 opacity-0 motion-reduce:translate-y-0')}>
          <Cta />
        </div>
      </div>
    </>
  )
}

export function Landing() {
  // drops landed in the flask; `run` remounts the flask with fresh acid
  const [landed, setLanded] = useState(0)
  const [run, setRun] = useState(0)
  const [drop, setDrop] = useState<Drop | null>(null)
  const sent = useRef(0)
  const touched = useRef(false)

  function add() {
    touched.current = true
    if (sent.current >= DROPS) return
    sent.current++
    setDrop({ id: sent.current, color: indicator(pH(volumeAt(sent.current))) })
  }

  function restart() {
    sent.current = 0
    setLanded(0)
    setDrop(null)
    setRun(run + 1)
  }

  // One demo drop after the flask fills, unless the visitor already acted.
  useEffect(() => {
    if (REDUCED) return
    const t = setTimeout(() => touched.current || add(), 2600)
    return () => clearTimeout(t)
  }, [])

  const v = volumeAt(landed)
  const p = pH(v)
  const s = nearest(p)
  const left = round2(equivalence - v)
  const jump = [pH(equivalence - TITRATION.drop), pH(equivalence + TITRATION.drop)].map((x) => x.toFixed(1))
  const status =
    left > 0
      ? `离终点还差 ${Math.round(left / TITRATION.drop)} 滴（${left.toFixed(2)}\u00a0mL）。`
      : left === 0
        ? '盐酸恰好被中和。'
        : left === -TITRATION.drop
          ? `终点前后只差两滴，pH 就从 ${jump[0]} 跳到 ${jump[1]}。`
          : '突跃已经过去，再滴 pH 只缓慢升高。'
  const small = 'rounded-lg px-3 py-3 text-sm font-semibold transition-[background-color,transform] duration-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
  return (
    <div id="top" className="bg-background text-ink">
      <a href="#main" className="sr-only rounded-lg bg-card px-3 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-30">
        跳到正文
      </a>
      <Nav />

      <main id="main">
        <section className="relative flex flex-col overflow-hidden md:h-svh md:min-h-160">
          <div className="relative order-2 h-[44svh] md:absolute md:inset-0 md:h-auto">
            <FlaskScene key={run} base={indicator(pH(START))} drop={drop} intro={!REDUCED} onLand={(d) => setLanded(d.id)} onClick={add} />
          </div>
          <div className="pointer-events-none relative z-[1] order-1 mx-auto flex w-full max-w-6xl flex-col px-4 pt-24 sm:px-8 md:h-full md:justify-center md:pt-0">
            <div className="pointer-events-auto">
              <h1 className="max-w-[680px] text-3xl leading-tight font-semibold text-balance sm:text-5xl sm:leading-tight md:text-6xl md:leading-tight">
                高中化学实验，
                <br />
                在浏览器里亲手做一遍
              </h1>
              <p className="mt-6 max-w-[680px] text-lg text-pretty text-ink-soft md:max-w-xl">
                {LESSONS.length} 个实验搭在可以旋转的 3D 实验台上：取试剂、看现象、写方程式。有毒和危险的实验，也能放心做完。
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Cta />
                <a href="#lessons" className="py-3 text-base font-semibold text-bench underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  看全部 {LESSONS.length} 个实验
                </a>
              </div>
              <p className="mt-4 text-sm text-ink-soft">
                含 {REQUIRED} 个课标必做实验 · 免注册 · 打开即用
              </p>
            </div>
          </div>

          <aside aria-label="试一试：往盐酸里滴加氢氧化钠溶液" className="relative z-[1] order-3 mx-4 mb-8 rounded-xl border border-border bg-card/90 p-4 backdrop-blur md:absolute md:right-8 md:bottom-8 md:m-0 md:w-80 lg:right-16 lg:bottom-12">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm text-ink-soft">
                盐酸 + 通用指示剂
                <br />
                已滴入 NaOH <span className="font-mono">{v.toFixed(2)}</span> mL
              </p>
              <p className="text-3xl font-semibold">
                pH <span className="font-mono">{p.toFixed(1)}</span>
              </p>
            </div>
            <div className="relative mt-3 h-2.5 rounded-full" style={{ background: GRADIENT }}>
              <div className={cn('absolute inset-0 transition-transform duration-700 motion-reduce:transition-none', EASE)} style={{ transform: `translateX(${(p / 14) * 100}%)` }}>
                <span className="absolute top-1/2 left-0 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ background: indicator(p) }} />
              </div>
            </div>
            <p className="mt-3 text-sm" aria-live="polite">
              {s.desc}，溶液呈{s.name}色。{status}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" disabled={landed >= DROPS} className={cn(small, EASE, 'bg-bench-soft text-bench hover:bg-bench-soft/70 disabled:opacity-50 disabled:hover:bg-bench-soft')} onClick={add}>
                {landed >= DROPS ? '已滴够了' : '滴一滴 NaOH'}
              </button>
              <button type="button" className={cn(small, EASE, 'border border-border text-ink hover:bg-bench-soft/50')} onClick={restart}>
                换一瓶盐酸
              </button>
            </div>
            <p className="mt-3 text-sm text-bench">H⁺ + OH⁻ = H₂O</p>
          </aside>
        </section>

        <Reveal className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
          <h2 className="max-w-[680px] text-3xl font-semibold text-balance">
            <span className="inline-block">学校里只看视频的实验，</span>
            <span className="inline-block">在这里亲手做</span>
          </h2>
          <p className="mt-4 max-w-[680px] text-lg text-pretty text-ink-soft">
            实验台上的颜色、沉淀和气体按离子反应规则算出来，不是录好的视频。下面是其中四个实验，每一步都配有方程式，关键处用选择题检查理解。
          </p>
          <ul className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2">
            {SCENES.map((sc) => (
              <li key={sc.id}>
                <Link to={`/lessons/${sc.id}`} className={cn('group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring')}>
                  <div className={cn('aspect-[8/5] rounded-xl border border-border bg-card p-4 transition-[border-color,transform] duration-500 group-hover:-translate-y-1 group-hover:border-bench/40', EASE)}>
                    <sc.Art />
                  </div>
                  <p className="mt-4 text-lg font-semibold group-hover:text-bench">{sc.title}</p>
                  <p className="mt-2 text-pretty text-ink-soft">{sc.seen}</p>
                  <p className="mt-2 text-sm text-bench">{sc.eq}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal id="lessons" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8">
          <h2 className="text-3xl font-semibold text-balance">{LESSONS.length} 个实验，挑一个开始</h2>
          <LessonGroups />
        </Reveal>

        <Reveal id="book" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8">
          <div className="grid gap-6 rounded-xl border border-border bg-paper p-8 md:grid-cols-[1fr_auto] md:items-end md:p-12">
            <div>
              <p className="text-sm font-semibold text-seal">配套读物</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-balance text-pen">《每一个原子》</h2>
              <p className="mt-4 max-w-[680px] text-lg text-pretty text-pen-soft">一本摊开在桌上的 3D 化学书。十章从原子讲到酸碱滴定，插图会从书页上立起来，每章都有演示、动手操作和一道挑战题。</p>
            </div>
            <Link
              to="/book"
              className={cn('inline-flex w-fit items-center rounded-lg border border-pen/20 px-4 py-3 text-base font-semibold text-pen transition-[background-color,transform] duration-300 hover:bg-paper-deep active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', EASE)}
            >
              翻开这本书
            </Link>
          </div>
        </Reveal>

        <Reveal id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-24 sm:px-8">
          <h2 className="text-3xl font-semibold text-balance">常见问题</h2>
          <div className="mt-8 border-t border-border">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className={cn('text-2xl text-ink-soft transition-transform duration-300 group-open:rotate-45', EASE)}>
                    +
                  </span>
                </summary>
                <p className="pb-4 text-pretty text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>

        <Reveal className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-8">
          <h2 className="mx-auto max-w-[680px] text-4xl leading-tight font-semibold text-balance">先做第一个实验</h2>
          <p className="mt-4 text-lg text-pretty text-ink-soft">
            {FIRST.title}，共 {FIRST.steps.length} 步，跟着提示就能做完。免费，免注册。
          </p>
          <Cta className="mt-8" />
        </Reveal>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-soft sm:px-8">
          <Brand />
          <div className="flex gap-6">
            <Link to="/lessons" className="py-3 hover:text-ink">
              全部实验
            </Link>
            <Link to="/book" className="py-3 hover:text-ink">
              《每一个原子》
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
