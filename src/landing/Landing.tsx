import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { Link } from 'react-router'
import { Brand } from '@/components/Logo'
import { LessonGroups } from '@/Home'
import { cn } from '@/lib/utils'
import { LESSONS } from '@/lessons'
import { FlaskScene, type Drop } from './FlaskScene'

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

const REQUIRED = LESSONS.filter((l) => l.group === 'required').length
const CTA = '免费开始做实验'

const BENEFITS = [
  { title: '危险实验也能动手', text: '氯气、钠与水、铝热反应、乙炔，这些在学校里通常只看演示的实验，这里可以自己一步步做完。' },
  { title: '现象由反应规则算出', text: '颜色、沉淀和气泡由离子反应规则实时算出，不是提前录好的视频，可以旋转实验台从各个角度看。' },
  { title: '每一步都有方程式', text: '关键步骤配上化学方程式或离子方程式，再用选择题检查你是否真的理解了现象。' },
  { title: '打开网页就能做', text: '不用安装软件，不用注册账号，课前预习、课后复习都能随时打开。' },
]

const STEPS = [
  { title: '取用试剂', text: '点击滴瓶、药匙或量筒拿起器材，再点击试管或烧杯，动画演示规范的操作手法。' },
  { title: '观察现象', text: '颜色、沉淀、气体按真实的反应规则出现，可以旋转实验台从各个角度看。' },
  { title: '写出方程式', text: '每一步给出对应的化学方程式或离子方程式，关键处用选择题检查理解。' },
]

const TAGLINE = ['每一滴试剂，都按真实的规则反应。', '危险的实验，也能亲手做一遍。']

const FAQ = [
  { q: '要花钱吗？', a: '不用。所有实验都免费，也不需要注册账号。' },
  { q: '需要安装软件吗？', a: '不需要。用较新的 Chrome、Edge、Safari 或 Firefox 打开网页即可，实验台用 WebGL 在浏览器里绘制。' },
  { q: '包含哪些实验？', a: `课程标准规定的 ${REQUIRED} 个学生必做实验，加上 ${LESSONS.length - REQUIRED} 个有毒、危险或条件难以满足的演示与拓展实验。` },
  { q: '能代替真实的实验课吗？', a: '不能，也不打算代替。它适合课前预习、课后复习，以及学校里不方便做的危险实验。真实实验的手感和安全规范，仍然要在实验室里学。' },
  { q: '第一次用会不会不知道点哪里？', a: '每一步都会说明要拿起什么器材、点击哪里，跟着步骤卡片的提示就能做完整个实验。' },
  { q: '老师可以在课堂上用吗？', a: '可以。直接投屏演示，或者让学生在机房各自操作同一个实验。' },
  { q: '《每一个原子》是什么？', a: '一本可以翻页的 3D 化学书，从原子讲到酸碱滴定，每章都有演示、动手操作和一道挑战题。' },
]

const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]'
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches

/** Main call to action; the same button opens and closes the page. */
function Cta({ className }: { className?: string }) {
  return (
    <Link
      to="/lessons"
      className={cn(
        'inline-flex items-center rounded-lg bg-bench px-3 py-2 text-base font-semibold text-white transition-[background-color,transform] duration-300 hover:bg-bench/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
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

/** The tagline lights up word by word, in reading order, as it scrolls through the viewport. */
function Tagline() {
  const ref = useRef<HTMLParagraphElement>(null)
  const lines = useMemo(() => {
    const seg = new Intl.Segmenter('zh', { granularity: 'word' })
    return TAGLINE.map((l) => [...seg.segment(l)].map((s) => s.segment))
  }, [])
  const total = lines.flat().length
  const [lit, setLit] = useState(REDUCED ? total : 0)
  useEffect(() => {
    if (REDUCED) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = ref.current!.getBoundingClientRect()
      // 0 when the top reaches 85% of the viewport, 1 when the bottom reaches 45%
      const p = (innerHeight * 0.85 - r.top) / (innerHeight * 0.4 + r.height)
      setLit(Math.round(Math.min(Math.max(p, 0), 1) * total))
    }
    const onScroll = () => {
      raf ||= requestAnimationFrame(update)
    }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [total])
  let k = 0
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
      <p ref={ref} className="max-w-[680px] text-4xl font-semibold text-balance sm:text-5xl">
        {lines.map((words, i) => (
          <span key={i} className="block">
            {words.map((w, j) => (
              <span key={j} className={cn('transition-colors duration-500', EASE, k++ < lit ? 'text-ink' : 'text-ink/30')}>
                {w}
              </span>
            ))}
          </span>
        ))}
      </p>
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
  const link = 'rounded-full px-3 py-2 text-sm font-semibold text-ink-soft transition-colors duration-300 hover:text-ink focus-visible:outline-2 focus-visible:outline-ring'
  return (
    <>
      <nav aria-label="主导航" className="fixed inset-x-0 top-4 z-20 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-border bg-card/70 py-2 pr-2 pl-4 shadow-sm backdrop-blur-md">
        <a href="#top" className="mr-2 rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
          <Brand />
        </a>
        <div className="hidden items-center md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={link}>
              {n.text}
            </a>
          ))}
        </div>
        <Link to="/lessons" className={cn('hidden rounded-full bg-bench px-3 py-2 text-sm font-semibold text-white transition-[background-color,transform] duration-300 hover:bg-bench/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:inline-flex', EASE)}>
          开始实验
        </Link>
        <button
          type="button"
          aria-label={open ? '关闭菜单' : '打开菜单'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="relative size-10 rounded-full focus-visible:outline-2 focus-visible:outline-ring md:hidden"
        >
          {/* two lines that turn into a cross */}
          <span className={cn('absolute left-3 h-0.5 w-4 rounded-full bg-ink transition-transform duration-500', EASE, open ? 'top-1/2 rotate-45' : 'top-4')} />
          <span className={cn('absolute left-3 h-0.5 w-4 rounded-full bg-ink transition-transform duration-500', EASE, open ? 'top-1/2 -rotate-45' : 'top-6')} />
        </button>
      </nav>
      <div className={cn('fixed inset-0 z-10 flex flex-col gap-2 bg-background/95 px-6 pt-24 backdrop-blur-xl transition-opacity duration-300 md:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}>
        {[...NAV, { href: '/lessons', text: '开始实验' }].map((n, i) => (
          <a
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            tabIndex={open ? 0 : -1}
            style={{ transitionDelay: open ? `${i * 60}ms` : '0ms' }}
            className={cn('py-3 text-2xl font-semibold text-ink transition-[opacity,transform] duration-500', EASE, open ? 'opacity-100' : 'translate-y-6 opacity-0 motion-reduce:translate-y-0')}
          >
            {n.text}
          </a>
        ))}
      </div>
    </>
  )
}

export function Landing() {
  const [level, setLevel] = useState(0)
  const [drop, setDrop] = useState<Drop | null>(null)
  const target = useRef(0)
  const touched = useRef(false)
  const lastDir = useRef(1)

  function add(dir: number) {
    touched.current = true
    lastDir.current = dir
    target.current = Math.min(Math.max(target.current + dir, 0), SCALE.length - 1)
    setDrop({ id: Date.now(), color: SCALE[target.current].color })
  }

  // One demo drop after the flask fills, unless the visitor already acted.
  useEffect(() => {
    if (REDUCED) return
    const t = setTimeout(() => touched.current || add(1), 2600)
    return () => clearTimeout(t)
  }, [])

  const s = SCALE[level]
  const small = 'rounded-lg px-3 py-2 text-sm font-semibold transition-[background-color,transform] duration-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
  return (
    <div id="top" className="bg-background text-ink">
      <a href="#main" className="sr-only rounded-lg bg-card px-3 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-30">
        跳到正文
      </a>
      <Nav />

      <main id="main">
        <section className="relative flex flex-col overflow-hidden md:h-svh md:min-h-160">
          <div className="relative order-2 h-[56svh] md:absolute md:inset-0 md:h-auto">
            <FlaskScene
              base={SCALE[0].color}
              drop={drop}
              intro={!REDUCED}
              onLand={(d) => setLevel(SCALE.findIndex((x) => x.color === d.color))}
              onClick={() => add(lastDir.current)}
            />
          </div>
          <div className="pointer-events-none relative z-[1] order-1 flex w-full flex-col px-4 pt-24 sm:px-8 md:h-full md:justify-center md:pt-0 lg:px-16">
            <div className="pointer-events-auto">
              <h1 className="max-w-[680px] bg-linear-to-r from-ink to-ink-soft bg-clip-text text-4xl font-semibold tracking-tight text-balance text-transparent sm:text-6xl">
                高中化学实验，
                <br />
                在浏览器里亲手做一遍
              </h1>
              <p className="mt-6 max-w-[680px] text-lg text-pretty text-ink-soft md:max-w-xl">
                {LESSONS.length} 个实验搭在可以旋转的 3D 实验台上：取试剂、看现象、写方程式。有毒和危险的实验，也能放心做完。
              </p>
              <Cta className="mt-8" />
              <p className="mt-4 text-sm text-ink-soft">
                含 {REQUIRED} 个课标必做实验 · 免注册 · 打开即用
              </p>
            </div>
          </div>

          <aside aria-label="试一试：往盐酸里滴加氢氧化钠" className="order-3 mx-4 mb-8 rounded-xl border border-border bg-card/85 p-4 backdrop-blur md:absolute md:right-8 md:bottom-8 md:m-0 md:w-80 lg:right-16 lg:bottom-12">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-ink-soft">盐酸 + 通用指示剂</p>
              <p className="text-3xl font-semibold tabular-nums">pH {s.pH}</p>
            </div>
            <div className="relative mt-3 h-2.5 rounded-full" style={{ background: GRADIENT }}>
              <div className={cn('absolute inset-0 transition-transform duration-700 motion-reduce:transition-none', EASE)} style={{ transform: `translateX(${(s.pH / 14) * 100}%)` }}>
                <span className="absolute top-1/2 left-0 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ background: s.color }} />
              </div>
            </div>
            <p className="mt-3 text-sm">
              {s.desc}，溶液呈{s.name}色。点击烧瓶继续滴加。
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" className={cn(small, EASE, 'bg-bench-soft text-bench hover:bg-bench-soft/70')} onClick={() => add(1)}>
                滴加 NaOH 溶液
              </button>
              <button type="button" className={cn(small, EASE, 'border border-border text-ink hover:bg-bench-soft/50')} onClick={() => add(-1)}>
                滴加盐酸
              </button>
            </div>
            <p className="mt-3 text-sm text-bench">H⁺ + OH⁻ = H₂O</p>
          </aside>
        </section>

        <Reveal className="mx-auto grid max-w-6xl gap-6 px-4 py-24 sm:px-8 md:grid-cols-2 md:gap-12">
          <h2 className="text-3xl font-semibold text-balance">实验课的时间，总是不够</h2>
          <div className="space-y-4 text-lg text-pretty text-ink-soft">
            <p>课时有限，很多实验只能看老师演示一遍。氯气有毒，钠遇水会剧烈反应，铝热反应温度超过两千摄氏度，学校里通常只放视频。</p>
            <p>OpenLab 把这些实验搬到 3D 实验台上，每个人都能按自己的节奏，从取试剂到写方程式完整做一遍。</p>
          </div>
        </Reveal>

        <Reveal className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
          <h2 className="text-3xl font-semibold text-balance">预习和复习，换一种做法</h2>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <li key={b.title} className="rounded-xl border border-border bg-card p-6">
                <p className="text-lg font-semibold">{b.title}</p>
                <p className="mt-2 text-pretty text-ink-soft">{b.text}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Tagline />

        <Reveal className="mx-auto max-w-6xl px-4 py-24 sm:px-8">
          <h2 className="text-3xl font-semibold text-balance">做一个实验，分三步</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((st, i) => (
              <li key={st.title} className="border-t-2 border-bench pt-4">
                <p className="text-sm text-bench tabular-nums">第 {i + 1} 步</p>
                <p className="mt-1 text-lg font-semibold">{st.title}</p>
                <p className="mt-2 text-pretty text-ink-soft">{st.text}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal id="lessons" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8">
          <h2 className="text-3xl font-semibold text-balance">{LESSONS.length} 个实验，挑一个开始</h2>
          <LessonGroups />
        </Reveal>

        <Reveal id="book" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8">
          <div className="grid gap-6 rounded-xl border border-border bg-paper p-8 md:grid-cols-[1fr_auto] md:items-end md:p-12">
            <div>
              <p className="text-sm font-semibold text-seal">配套读物</p>
              <h2 className="mt-2 text-3xl font-semibold text-balance text-pen">《每一个原子》</h2>
              <p className="mt-4 max-w-[680px] text-lg text-pretty text-pen-soft">一本摊开在桌上的 3D 化学书。十章从原子讲到酸碱滴定，插图会从书页上立起来，每章都有演示、动手操作和一道挑战题。</p>
            </div>
            <Link
              to="/book"
              className={cn('inline-flex w-fit items-center rounded-lg border border-pen/20 px-3 py-2 text-base font-semibold text-pen transition-[background-color,transform] duration-300 hover:bg-paper-deep active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', EASE)}
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
          <h2 className="mx-auto max-w-[680px] text-4xl font-semibold text-balance">现在就做第一个实验</h2>
          <p className="mt-4 text-lg text-ink-soft">免费，免注册，打开浏览器就能做。</p>
          <Cta className="mt-8" />
        </Reveal>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-soft sm:px-8">
          <Brand />
          <div className="flex gap-6">
            <Link to="/lessons" className="hover:text-ink">
              全部实验
            </Link>
            <Link to="/book" className="hover:text-ink">
              《每一个原子》
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
