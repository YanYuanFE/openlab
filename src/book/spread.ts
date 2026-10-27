import type { ReactNode } from 'react'
import { PAGE_W, type PageSpec } from './paper'
import type { Block } from './print'

/** One opening of the book: a printed left page, a right page with a drawing standing on it, and what clicks do. */
export interface SpreadDef {
  key: string
  /** chapter number; 0 for the front and back matter */
  chapter: number
  /** shown in the bottom bar */
  title: string
  left: PageSpec
  right: PageSpec
  /** the pop-up drawing on the right page; `extent` is its footprint in drawing cm, `key` remounts it so it rises again */
  popup?: { node: ReactNode; extent: [number, number]; key: string }
  onHit: (id: string, i: number) => void
  /** what ▶ in the bottom bar does */
  play?: () => void
  /** the page a phone should show right now */
  focus?: 'left' | 'right'
  /** what the drawing does on a tap, as buttons in the text version only; each calls `onHit(id, 0)` */
  actions?: { id: string; text: string; pressed?: boolean }[]
}

export interface Nav {
  toChapter: (n: number) => void
  next: () => void
}

const BOX = { x: 2.2, y: 2.4, w: PAGE_W - 4.4 }
/** where printing resumes under a pop-up */
const FOOT_Y = 20.8

export const leftPage = (blocks: Block[], folio: number, stamp?: number): PageSpec => ({ blocks, box: BOX, folio: `${folio}`, stamp })

/** `top` is printed above the pop-up (the ledger), `foot` below it (caption and instructions). */
export const rightPage = (top: Block[], foot: Block[], folio: number, popup = true): PageSpec =>
  popup ? { blocks: top, box: BOX, foot: { blocks: foot, y: FOOT_Y }, folio: `${folio}` } : { blocks: [...top, ...foot], box: BOX, folio: `${folio}` }
