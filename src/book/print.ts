// Page typesetting: lays out blocks of rich text into draw ops and click regions, all in centimetres on the page.
// Pure: text width comes from the `measure` callback, so tests can typeset without a canvas.

import { ELEMENTS, elementOf } from './atoms.ts'

export type Tone = 'ink' | 'soft' | 'seal' | 'faint' | 'paper'

export interface Run {
  t: string
  sub?: boolean
  /** superscript, for ionic charges */
  sup?: boolean
  bold?: boolean
  tone?: Tone
}

export const txt = (t: string, o: Omit<Run, 't'> = {}): Run[] => [{ t, ...o }]
/** A formula with subscript digits and an optional charge after `^` (`SO4^2-`); leave coefficients out (write them with `txt`). */
export function fml(f: string, o: Omit<Run, 't' | 'sub' | 'sup'> = {}): Run[] {
  const [base, charge] = f.split('^')
  const runs: Run[] = base
    .split(/(\d+)/)
    .filter(Boolean)
    .map((t) => ({ t, sub: /^\d+$/.test(t), ...o }))
  return charge ? [...runs, { t: charge.replace('-', '−'), sup: true, ...o }] : runs
}

export interface Font {
  size: number
  bold?: boolean
  hand?: boolean
}
export type Measure = (t: string, f: Font) => number

export type Block =
  | { kind: 'kicker'; text: string }
  | { kind: 'title'; text: string }
  | { kind: 'para'; runs: Run[]; size?: 'lead' | 'body' | 'small'; hand?: boolean }
  /** small seal-red section label */
  | { kind: 'label'; text: string }
  /** a framed definition or key idea */
  | { kind: 'box'; runs: Run[] }
  | { kind: 'terms'; items: [string, Run[]][] }
  /** tick-box choices; `wrong` rows are struck through */
  | { kind: 'choices'; id: string; items: Run[][]; picked: number | null; wrong?: number[] }
  /** answer printed under a paper flap; the flap itself is a 3D card placed over `flaps` */
  | { kind: 'flap'; id: string; runs: Run[]; open: boolean; locked: boolean }
  /** printed links in one row, e.g. ‹ 上一步   下一步 › */
  | { kind: 'links'; items: { id: string; text: string; disabled?: boolean }[] }
  /** table of contents rows */
  | { kind: 'toc'; id: string; items: { title: string; lead: string; enabled: boolean; stamped: boolean }[] }
  /** earned chapter stamps in a grid */
  | { kind: 'stamps'; ns: number[] }
  /** element jars; `syms` picks the jars (default: the seven of chapter 1) */
  | { kind: 'ledger'; caption: string; lit: string[]; counts: Record<string, number>; after?: Record<string, number>; syms?: string[] }
  /** a line graph `h` cm tall; `at` is a dot on the curve */
  | { kind: 'plot'; caption: string; x: [number, number]; y: [number, number]; xTicks: number[]; yTicks: number[]; xLabel: string; yLabel: string; curve: [number, number][]; at?: [number, number]; h: number }
  /** a chemical equation with ▲/▼ above and below each coefficient */
  | { kind: 'equation'; id: string; head: string; formulas: string[]; ks: number[]; nLeft: number; note?: string; done?: boolean; active?: boolean }
  | { kind: 'gap'; h: number }

export type Op =
  | { kind: 'text'; x: number; y: number; t: string; font: Font; tone: Tone; align?: 'left' | 'center' }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; tone?: Tone; fill?: string; dash?: boolean; lw?: number }
  | { kind: 'check'; x: number; y: number; s: number; on: boolean }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; tone: Tone; lw: number }
  | { kind: 'jar'; x: number; y: number; w: number; h: number; fill?: string; off?: boolean; lit: boolean }
  | { kind: 'stamp'; x: number; y: number; r: number; n: number }
  | { kind: 'tri'; x: number; y: number; s: number; up: boolean }

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}
export interface Hit extends Rect {
  id: string
  i: number
  disabled?: boolean
}
export interface Laid {
  ops: Op[]
  hits: Hit[]
  flaps: (Rect & { id: string; open: boolean; locked: boolean })[]
  /** y just below the last block */
  bottom: number
}

export const SIZE = { body: 0.5, lead: 0.58, small: 0.42, title: 1.1, kicker: 0.4 }
const LINE = 1.7
const SUB = 0.62

// --- breaking lines ---

const CJK = /[　-〿㐀-鿿＀-￯—…→“”‘’]/
/** may not start a line: hangs on the previous one */
const CLOSING = /^[，。、；：？！）」』”’》…—,.;:?!)]/
/** may not end a line: travels with the next atom */
const OPENING = /^[（「『“‘《(]$/

interface Piece {
  t: string
  run: Run
}
interface Atom {
  pieces: Piece[]
  w: number
  /** width of trailing closing punctuation, allowed to hang past the line end */
  hang: number
  /** a space precedes this atom; it is a break opportunity and takes a space's width mid-line */
  space: boolean
}

const fontOf = (run: Run, size: number, hand?: boolean): Font => ({ size: run.sub || run.sup ? size * SUB : size, bold: run.bold, hand })
/** baseline shift of subscripts and superscripts */
const rise = (run: Run, size: number) => (run.sub ? size * 0.22 : run.sup ? -size * 0.4 : 0)

/** Splits runs into unbreakable atoms: one per CJK character, one per Latin word or formula. */
function atomize(runs: Run[], size: number, measure: Measure, hand?: boolean): Atom[] {
  const atoms: Atom[] = []
  let word: Piece[] | null = null
  let space = false
  const push = (pieces: Piece[]) => {
    atoms.push({ pieces, w: pieces.reduce((s, p) => s + measure(p.t, fontOf(p.run, size, hand)), 0), hang: 0, space })
    space = false
  }
  const flush = () => {
    if (word) push(word)
    word = null
  }
  for (const run of runs) {
    for (const ch of run.t) {
      if (ch === ' ') {
        flush()
        space = true
      } else if (CJK.test(ch)) {
        flush()
        push([{ t: ch, run }])
      } else {
        const last: Piece | undefined = word?.[word.length - 1]
        if (word && last && last.run === run) last.t += ch
        else (word ??= []).push({ t: ch, run })
      }
    }
  }
  flush()
  // kinsoku: closing punctuation joins the atom before it, opening punctuation the atom after it
  const out: Atom[] = []
  for (const a of atoms) {
    const prev = out[out.length - 1]
    const first = a.pieces[0].t
    if (prev && !a.space && (CLOSING.test(first) || OPENING.test(prev.pieces[prev.pieces.length - 1].t))) {
      prev.pieces.push(...a.pieces)
      prev.hang = CLOSING.test(first) ? prev.hang + a.w : 0
      prev.w += a.w
    } else out.push({ ...a, pieces: [...a.pieces] })
  }
  return out
}

/** Greedy line breaking; returns lines of atoms with their x offsets. */
export function wrap(runs: Run[], width: number, size: number, measure: Measure, hand?: boolean) {
  const spaceW = measure(' ', { size, hand })
  const lines: { atoms: { a: Atom; x: number }[]; w: number }[] = [{ atoms: [], w: 0 }]
  for (const a of atomize(runs, size, measure, hand)) {
    let line = lines[lines.length - 1]
    const gap = line.atoms.length && a.space ? spaceW : 0
    if (line.atoms.length && line.w + gap + a.w - a.hang > width) {
      line = { atoms: [], w: 0 }
      lines.push(line)
    }
    const x = line.w + (line.atoms.length && a.space ? spaceW : 0)
    line.atoms.push({ a, x })
    line.w = x + a.w
  }
  return lines
}

/** Plain text of runs, for the screen-reader version. */
export const plain = (runs: Run[]) => runs.map((r) => r.t).join('')

// --- laying out blocks ---

export function typeset(blocks: Block[], box: { x: number; y: number; w: number }, measure: Measure): Laid {
  const ops: Op[] = []
  const hits: Hit[] = []
  const flaps: Laid['flaps'] = []
  let y = box.y

  /** Paragraph of runs from (x, y) in a column of width w; returns its height. */
  const para = (runs: Run[], x: number, top: number, w: number, size: number, tone: Tone = 'ink', hand?: boolean) => {
    const lines = wrap(runs, w, size, measure, hand)
    lines.forEach((line, i) => {
      const base = top + size * (i * LINE + 1)
      for (const { a, x: ax } of line.atoms) {
        let px = x + ax
        for (const p of a.pieces) {
          const f = fontOf(p.run, size, hand)
          ops.push({ kind: 'text', x: px, y: base + rise(p.run, size), t: p.t, font: f, tone: p.run.tone ?? tone })
          px += measure(p.t, f)
        }
      }
    })
    return size * (lines.length * LINE - (LINE - 1.25))
  }

  for (const b of blocks) {
    switch (b.kind) {
      case 'kicker':
        ops.push({ kind: 'text', x: box.x, y: y + SIZE.kicker, t: b.text, font: { size: SIZE.kicker }, tone: 'seal' })
        y += SIZE.kicker * 2.2
        break
      case 'title':
        ops.push({ kind: 'text', x: box.x, y: y + SIZE.title, t: b.text, font: { size: SIZE.title, bold: true }, tone: 'ink' })
        y += SIZE.title * 1.9
        break
      case 'para': {
        const size = SIZE[b.size ?? 'body']
        y += para(b.runs, box.x, y, box.w, size, b.hand ? 'soft' : 'ink', b.hand) + size * 0.8
        break
      }
      case 'label':
        ops.push({ kind: 'text', x: box.x, y: y + SIZE.small, t: b.text, font: { size: SIZE.small, bold: true }, tone: 'seal' })
        y += SIZE.small * 2
        break
      case 'box': {
        const pad = 0.45
        const h = para(b.runs, box.x + pad, y + pad, box.w - pad * 2, SIZE.body) + pad * 2
        ops.push({ kind: 'rect', x: box.x, y, w: box.w, h, tone: 'soft', lw: 0.03 })
        y += h + SIZE.body
        break
      }
      case 'terms':
        for (const [term, def] of b.items) {
          const tw = 2.6
          ops.push({ kind: 'text', x: box.x, y: y + SIZE.small, t: term, font: { size: SIZE.small, bold: true }, tone: 'ink' })
          y += para(def, box.x + tw, y, box.w - tw, SIZE.small, 'soft') + SIZE.small * 0.5
        }
        y += SIZE.small * 0.6
        break
      case 'choices': {
        const s = SIZE.body * 0.95
        b.items.forEach((runs, i) => {
          const top = y
          const h = para(runs, box.x + s + 0.4, y, box.w - s - 0.4, SIZE.body)
          ops.push({ kind: 'check', x: box.x, y: top + SIZE.body * 0.32, s, on: b.picked === i })
          if (b.wrong?.includes(i)) ops.push({ kind: 'line', x1: box.x + s + 0.4, y1: top + SIZE.body * 0.85, x2: box.x + box.w * 0.9, y2: top + SIZE.body * 0.85, tone: 'seal', lw: 0.03 })
          hits.push({ id: b.id, i, x: box.x - 0.2, y: top - 0.15, w: box.w + 0.2, h: h + 0.3 })
          y += h + SIZE.body * 0.55
        })
        y += SIZE.body * 0.5
        break
      }
      case 'flap': {
        const pad = 0.45
        const at = ops.length
        const h = Math.max(para(b.runs, box.x + pad, y + pad, box.w - pad * 2, SIZE.small) + pad * 2, 3.2)
        // the tinted ground goes under the answer text
        ops.splice(at, 0, { kind: 'rect', x: box.x, y, w: box.w, h, fill: '#ece2cc' })
        flaps.push({ id: b.id, x: box.x, y, w: box.w, h, open: b.open, locked: b.locked })
        y += h + SIZE.body
        break
      }
      case 'links': {
        let x = box.x
        for (const l of b.items) {
          const f = { size: SIZE.body, bold: true }
          const w = measure(l.text, f)
          ops.push({ kind: 'text', x, y: y + SIZE.body, t: l.text, font: f, tone: l.disabled ? 'faint' : 'seal' })
          if (!l.disabled) ops.push({ kind: 'line', x1: x, y1: y + SIZE.body * 1.3, x2: x + w, y2: y + SIZE.body * 1.3, tone: 'seal', lw: 0.025 })
          hits.push({ id: l.id, i: 0, x: x - 0.2, y: y - 0.15, w: w + 0.4, h: SIZE.body * 1.8, disabled: l.disabled })
          x += w + 1.2
        }
        y += SIZE.body * 2.4
        break
      }
      case 'toc':
        b.items.forEach((it, i) => {
          const top = y
          const tone: Tone = it.enabled ? 'ink' : 'faint'
          ops.push({ kind: 'text', x: box.x, y: y + SIZE.lead, t: `${'一二三四五六七八九十'[i]}`, font: { size: SIZE.lead }, tone: it.enabled ? 'seal' : 'faint' })
          ops.push({ kind: 'text', x: box.x + 1.2, y: y + SIZE.lead, t: it.title, font: { size: SIZE.lead, bold: it.enabled }, tone })
          const mark = it.stamped ? '已盖章' : it.enabled ? '' : '撰写中'
          if (mark) ops.push({ kind: 'text', x: box.x + box.w - measure(mark, { size: SIZE.small }), y: y + SIZE.lead, t: mark, font: { size: SIZE.small }, tone: it.stamped ? 'seal' : 'faint' })
          ops.push({ kind: 'text', x: box.x + 1.2, y: y + SIZE.lead + SIZE.small * 1.6, t: it.lead, font: { size: SIZE.small }, tone: it.enabled ? 'soft' : 'faint' })
          y += SIZE.lead + SIZE.small * 2.6
          ops.push({ kind: 'line', x1: box.x, y1: y - 0.15, x2: box.x + box.w, y2: y - 0.15, tone: 'faint', lw: 0.015 })
          hits.push({ id: b.id, i, x: box.x - 0.2, y: top - 0.1, w: box.w + 0.4, h: y - top, disabled: !it.enabled })
          y += 0.25
        })
        break
      case 'stamps':
        b.ns.forEach((n, i) => {
          ops.push({ kind: 'stamp', x: box.x + 1.8 + (i % 4) * 3.9, y: y + 1.8 + Math.floor(i / 4) * 3.9, r: 1.5, n })
        })
        y += Math.ceil(Math.max(b.ns.length, 1) / 4) * 3.9
        break
      case 'ledger': {
        ops.push({ kind: 'text', x: box.x + box.w / 2, y: y + SIZE.small, t: b.caption, font: { size: SIZE.small }, tone: 'soft', align: 'center' })
        y += SIZE.small * 1.8
        const els = b.syms ? b.syms.map(elementOf) : ELEMENTS
        const n = els.length
        const w = Math.min(1.8, box.w / n - 0.3)
        const step = box.w / n
        els.forEach((e, i) => {
          const x = box.x + step * i + (step - w) / 2
          const lit = b.lit.includes(e.sym)
          const c = b.counts[e.sym] ?? 0
          const m = b.after?.[e.sym] ?? 0
          const off = b.after !== undefined && lit && c !== m
          ops.push({ kind: 'jar', x, y, w, h: w * 1.15, fill: lit ? e.color : undefined, off, lit })
          const cx = x + w / 2
          const tone: Tone = !lit ? 'faint' : e.dark ? 'paper' : 'ink'
          ops.push({ kind: 'text', x: cx, y: y + w * 0.62, t: e.sym, font: { size: SIZE.small * 1.1, bold: true }, tone, align: 'center' })
          if (lit && (b.after !== undefined || c > 0))
            ops.push({ kind: 'text', x: cx, y: y + w * 0.98, t: b.after !== undefined ? `${c}→${m}` : '•'.repeat(c), font: { size: SIZE.small * 0.8, bold: off }, tone: e.dark ? 'paper' : off ? 'seal' : 'ink', align: 'center' })
          ops.push({ kind: 'text', x: cx, y: y + w * 1.15 + SIZE.small * 1.1, t: e.name, font: { size: SIZE.small * 0.9 }, tone: lit ? 'ink' : 'faint', align: 'center' })
        })
        y += w * 1.15 + SIZE.small * 2.4
        break
      }
      case 'equation': {
        const size = SIZE.lead
        const pad = 0.35
        const top = y
        ops.push({ kind: 'text', x: box.x + pad, y: y + pad + SIZE.small, t: b.head, font: { size: SIZE.small }, tone: 'soft' })
        if (b.done) ops.push({ kind: 'text', x: box.x + box.w - pad - measure('✓ 配平了', { size: SIZE.small }), y: y + pad + SIZE.small, t: '✓ 配平了', font: { size: SIZE.small }, tone: 'seal' })
        y += pad + SIZE.small * 1.8
        const tri = size * 0.55
        const row = y + tri + 0.25 + size
        let x = box.x + pad
        b.formulas.forEach((f, i) => {
          if (i > 0) {
            const sep = i === b.nLeft ? '→' : '+'
            ops.push({ kind: 'text', x: x + 0.15, y: row, t: sep, font: { size }, tone: 'soft' })
            x += measure(sep, { size }) + 0.3
          }
          const kw = measure('9', { size, bold: true })
          const cx = x + kw / 2
          ops.push({ kind: 'tri', x: cx, y: y + tri / 2, s: tri, up: true })
          ops.push({ kind: 'text', x: cx, y: row, t: `${b.ks[i]}`, font: { size, bold: true }, tone: 'ink', align: 'center' })
          ops.push({ kind: 'tri', x: cx, y: row + 0.3 + tri / 2, s: tri, up: false })
          hits.push({ id: b.id, i: i * 2, x: cx - 0.45, y: y - 0.15, w: 0.9, h: tri + 0.35 })
          hits.push({ id: b.id, i: i * 2 + 1, x: cx - 0.45, y: row + 0.15, w: 0.9, h: tri + 0.35 })
          x += kw + 0.12
          for (const r of fml(f)) {
            const fo = fontOf(r, size)
            ops.push({ kind: 'text', x, y: row + rise(r, size), t: r.t, font: fo, tone: 'ink' })
            x += measure(r.t, fo)
          }
          x += 0.2
        })
        y = row + 0.3 + tri + 0.3
        if (b.note) y += para(txt(b.note), box.x + pad, y, box.w - pad * 2, SIZE.small, 'soft') + 0.1
        y += pad
        ops.push({ kind: 'rect', x: box.x, y: top, w: box.w, h: y - top, tone: b.active ? 'ink' : 'faint', lw: b.active ? 0.035 : 0.02 })
        hits.push({ id: `${b.id}:focus`, i: 0, x: box.x, y: top, w: box.w, h: y - top })
        y += SIZE.body * 0.8
        break
      }
      case 'plot': {
        const f = { size: SIZE.small * 0.8 }
        ops.push({ kind: 'text', x: box.x + box.w / 2, y: y + SIZE.small, t: b.caption, font: { size: SIZE.small }, tone: 'soft', align: 'center' })
        y += SIZE.small * 1.6
        const left = box.x + 1.2
        const w = box.w - 2
        const px = (v: number) => left + ((v - b.x[0]) / (b.x[1] - b.x[0])) * w
        const py = (v: number) => y + b.h - ((v - b.y[0]) / (b.y[1] - b.y[0])) * b.h
        ops.push({ kind: 'line', x1: left, y1: y, x2: left, y2: y + b.h, tone: 'soft', lw: 0.025 })
        ops.push({ kind: 'line', x1: left, y1: y + b.h, x2: left + w, y2: y + b.h, tone: 'soft', lw: 0.025 })
        for (const t of b.yTicks) ops.push({ kind: 'text', x: left - 0.2 - measure(`${t}`, f), y: py(t) + 0.12, t: `${t}`, font: f, tone: 'soft' })
        for (const t of b.xTicks) ops.push({ kind: 'text', x: px(t), y: y + b.h + 0.45, t: `${t}`, font: f, tone: 'soft', align: 'center' })
        ops.push({ kind: 'text', x: left + 0.2, y: y + 0.3, t: b.yLabel, font: f, tone: 'soft' })
        ops.push({ kind: 'text', x: left + w - measure(b.xLabel, f), y: y + b.h - 0.2, t: b.xLabel, font: f, tone: 'soft' })
        b.curve.slice(1).forEach(([x2, y2], i) => {
          const [x1, y1] = b.curve[i]
          ops.push({ kind: 'line', x1: px(x1), y1: py(y1), x2: px(x2), y2: py(y2), tone: 'ink', lw: 0.04 })
        })
        if (b.at) ops.push({ kind: 'rect', x: px(b.at[0]) - 0.12, y: py(b.at[1]) - 0.12, w: 0.24, h: 0.24, fill: '#b23a2a' })
        y += b.h + SIZE.small * 2
        break
      }
      case 'gap':
        y += b.h
        break
    }
  }
  return { ops, hits, flaps, bottom: y }
}

/** The topmost enabled region under a point; specific regions are listed before the boxes that contain them. */
export const hitAt = (hits: Hit[], x: number, y: number) => hits.find((h) => !h.disabled && x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h)
