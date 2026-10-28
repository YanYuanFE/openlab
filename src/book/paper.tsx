import { useEffect, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { rand } from '@/kit/core'
import { typeset, type Block, type Font, type Laid, type Measure, type Op, type Rect, type Tone } from './print'

// Prints typeset blocks onto a canvas texture the size of one page.

export const PAGE_W = 20
export const PAGE_D = 27
/** canvas pixels per centimetre of page */
const PX = 64

const SERIF = '"Source Han Serif SC", "Noto Serif SC", "Songti SC", "STSong", serif'
const HAND = '"Kaiti SC", "STKaiti", "KaiTi", serif'
export const PAPER_PAGE = '#f7f2e6'
const TONES: Record<Tone, string> = { ink: '#2a2520', soft: '#6b6255', seal: '#b23a2a', faint: '#b9ae98', paper: PAPER_PAGE }

const css = (f: Font) => `${f.bold ? 700 : 500} ${f.size * PX}px ${f.hand ? HAND : SERIF}`

const probe = document.createElement('canvas').getContext('2d')!
export const measure: Measure = (t, f) => {
  probe.font = css(f)
  return probe.measureText(t).width / PX
}

/** Jar outline from the old SVG ledger, drawn into a w × w·64/56 box. */
function jarPath(g: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const k = w / 56
  const p = new Path2D('M14 6 h28 v6 c0 2 6 6 6 14 v28 c0 4 -3 6 -7 6 h-26 c-4 0 -7 -2 -7 -6 v-28 c0 -8 6 -12 6 -14z')
  g.save()
  g.translate(x, y - 4 * k)
  g.scale(k, k)
  return { p, done: () => g.restore() }
}

function paint(g: CanvasRenderingContext2D, op: Op) {
  const s = PX
  switch (op.kind) {
    case 'text':
      g.font = css(op.font)
      g.fillStyle = TONES[op.tone]
      g.textAlign = op.align ?? 'left'
      g.fillText(op.t, op.x * s, op.y * s)
      break
    case 'rect':
      if (op.fill) {
        g.fillStyle = op.fill
        g.fillRect(op.x * s, op.y * s, op.w * s, op.h * s)
      }
      if (op.tone) {
        g.strokeStyle = TONES[op.tone]
        g.lineWidth = (op.lw ?? 0.02) * s
        g.setLineDash(op.dash ? [0.12 * s, 0.1 * s] : [])
        g.strokeRect(op.x * s, op.y * s, op.w * s, op.h * s)
        g.setLineDash([])
      }
      break
    case 'line':
      g.strokeStyle = TONES[op.tone]
      g.lineWidth = op.lw * s
      g.beginPath()
      g.moveTo(op.x1 * s, op.y1 * s)
      g.lineTo(op.x2 * s, op.y2 * s)
      g.stroke()
      break
    case 'check': {
      g.strokeStyle = TONES.ink
      g.lineWidth = 0.03 * s
      g.strokeRect(op.x * s, op.y * s, op.s * s, op.s * s)
      if (op.on) {
        // a quick pen tick that overshoots the box
        g.lineWidth = 0.06 * s
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo((op.x + op.s * 0.15) * s, (op.y + op.s * 0.5) * s)
        g.lineTo((op.x + op.s * 0.42) * s, (op.y + op.s * 0.85) * s)
        g.lineTo((op.x + op.s * 1.1) * s, (op.y - op.s * 0.25) * s)
        g.stroke()
        g.lineCap = 'butt'
      }
      break
    }
    case 'tri':
      g.fillStyle = TONES.soft
      g.beginPath()
      g.moveTo((op.x - op.s / 2) * s, (op.y + (op.up ? op.s / 2 : -op.s / 2)) * s)
      g.lineTo((op.x + op.s / 2) * s, (op.y + (op.up ? op.s / 2 : -op.s / 2)) * s)
      g.lineTo(op.x * s, (op.y + (op.up ? -op.s / 2 : op.s / 2)) * s)
      g.fill()
      break
    case 'jar': {
      if (op.lit && op.fill) {
        // the jar's light tints the paper around it; the spill texture adds the brightness
        const cx = (op.x + op.w / 2) * s
        const cy = (op.y + op.w * 0.55) * s
        const r = op.w * 1.15 * s
        const halo = g.createRadialGradient(cx, cy, op.w * 0.3 * s, cx, cy, r)
        halo.addColorStop(0, op.fill)
        halo.addColorStop(1, 'rgba(255,255,255,0)')
        g.globalAlpha = 0.38
        g.fillStyle = halo
        g.fillRect(cx - r, cy - r, r * 2, r * 2)
        g.globalAlpha = 1
      }
      const { p, done } = jarPath(g, op.x * s, op.y * s, op.w * s)
      if (op.fill) {
        g.fillStyle = op.fill
        g.globalAlpha = 0.85
        g.fill(p)
        g.globalAlpha = 1
      }
      g.strokeStyle = op.off ? TONES.seal : op.lit ? TONES.ink : TONES.faint
      g.lineWidth = op.off ? 2.8 : op.lit ? 1.8 : 1.2
      g.setLineDash(op.lit ? [] : [3, 3])
      g.stroke(p)
      g.setLineDash([])
      done()
      break
    }
    case 'stamp': {
      g.save()
      g.translate(op.x * s, op.y * s)
      g.rotate(-0.2)
      g.globalAlpha = 0.85
      g.strokeStyle = g.fillStyle = TONES.seal
      g.lineWidth = 0.09 * s
      g.beginPath()
      g.arc(0, 0, op.r * s, 0, Math.PI * 2)
      g.stroke()
      g.lineWidth = 0.035 * s
      g.beginPath()
      g.arc(0, 0, op.r * 0.84 * s, 0, Math.PI * 2)
      g.stroke()
      g.textAlign = 'center'
      g.font = css({ size: op.r * 0.3 })
      g.fillText(`第${'一二三四五六七八九十'[op.n - 1]}章`, 0, -op.r * 0.12 * s)
      g.font = css({ size: op.r * 0.46, bold: true })
      g.fillText('完成', 0, op.r * 0.42 * s)
      g.restore()
      break
    }
  }
}

/** Paper fibre: faint deterministic specks so the page is not a flat fill. */
function fibre(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = PAPER_PAGE
  g.fillRect(0, 0, w, h)
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rand(i) < 0.5 ? 'rgba(120,100,70,0.05)' : 'rgba(255,255,255,0.18)'
    g.fillRect(rand(i + 0.3) * w, rand(i + 0.7) * h, 1 + rand(i + 0.9) * 2, 1)
  }
}

export interface PageSpec {
  blocks: Block[]
  /** where text starts, cm from the page's top-left */
  box: { x: number; y: number; w: number }
  /** more blocks printed lower down (under a pop-up) */
  foot?: { blocks: Block[]; y: number }
  folio?: string
  stamp?: number
}

export interface PrintedPage {
  tex: THREE.CanvasTexture
  /** light the page gives off (lit jars), added on top of its shading */
  spill: THREE.CanvasTexture
  laid: Laid
  /** holes left for 3D cards */
  flaps: Laid['flaps']
}

/** Prints a page; the texture is redrawn in place whenever the content changes. */
export function usePage(spec: PageSpec): PrintedPage {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = PAGE_W * PX
    c.height = PAGE_D * PX
    return c
  }, [])
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [canvas])
  useEffect(() => () => tex.dispose(), [tex])
  const spill = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = (PAGE_W * PX) / 4
    c.height = (PAGE_D * PX) / 4
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => spill.dispose(), [spill])

  const key = JSON.stringify(spec)
  const laid = useMemo(() => {
    const main = typeset(spec.blocks, spec.box, measure)
    if (!spec.foot) return main
    const foot = typeset(spec.foot.blocks, { ...spec.box, y: spec.foot.y }, measure)
    return { ops: [...main.ops, ...foot.ops], hits: [...main.hits, ...foot.hits], flaps: [...main.flaps, ...foot.flaps], bottom: foot.bottom }
    // the serialised spec is the dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // painted before the frame that shows it, so a page never flashes its previous print (e.g. when a turn ends)
  useLayoutEffect(() => {
    const g = canvas.getContext('2d')!
    fibre(g, canvas.width, canvas.height)
    g.textBaseline = 'alphabetic'
    for (const op of laid.ops) paint(g, op)
    if (spec.folio) paint(g, { kind: 'text', x: PAGE_W / 2, y: PAGE_D - 1.1, t: spec.folio, font: { size: 0.36 }, tone: 'soft', align: 'center' })
    if (spec.stamp) paint(g, { kind: 'stamp', x: PAGE_W - 3.2, y: 3.4, r: 1.5, n: spec.stamp })
    tex.needsUpdate = true
    // lit jars glow in their element's colour on the paper around them
    const sg = spill.image.getContext('2d') as CanvasRenderingContext2D
    const k = PX / 4
    sg.globalCompositeOperation = 'source-over'
    sg.fillStyle = '#000'
    sg.fillRect(0, 0, sg.canvas.width, sg.canvas.height)
    sg.globalCompositeOperation = 'lighter'
    for (const op of laid.ops) {
      if (op.kind !== 'jar' || !op.lit || !op.fill) continue
      const x = (op.x + op.w / 2) * k
      const y = (op.y + op.w * 0.55) * k
      const r = op.w * 1.25 * k
      const glow = sg.createRadialGradient(x, y, 0, x, y, r)
      glow.addColorStop(0, op.fill)
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      sg.globalAlpha = 0.55
      sg.fillStyle = glow
      sg.fillRect(x - r, y - r, r * 2, r * 2)
      sg.globalAlpha = 1
    }
    spill.needsUpdate = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laid, canvas, tex, spill])

  return { tex, spill, laid, flaps: laid.flaps }
}

/** Prints a flap card's face. */
export function useCardTexture(rect: Rect, text: string, faint: boolean) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = Math.round(rect.w * PX)
    c.height = Math.round(rect.h * PX)
    const g = c.getContext('2d')!
    fibre(g, c.width, c.height)
    g.strokeStyle = TONES.faint
    g.lineWidth = 2
    g.strokeRect(1, 1, c.width - 2, c.height - 2)
    paint(g, { kind: 'text', x: 0.5, y: 0.9, t: '为什么？', font: { size: 0.42, bold: true }, tone: 'seal' })
    paint(g, { kind: 'text', x: rect.w / 2, y: rect.h / 2 + 0.35, t: text, font: { size: 0.5 }, tone: faint ? 'faint' : 'ink', align: 'center' })
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [rect.w, rect.h, text, faint])
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}
