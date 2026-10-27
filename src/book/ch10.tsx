import { useState } from 'react'
import { balanced, REVIEW, sideAtoms, sides, simplest } from './atoms'
import { EquationPlate, equationExtent, eqRuns } from './ch2'
import { txt, type Block } from './print'
import { loadStamps, saveStamp } from './progress'
import { leftPage, rightPage, type Nav, type SpreadDef } from './spread'

// Chapter 10: the review. One equation for each kind of change met in the book, balanced atom by atom.

const START = REVIEW.map((r) => Array<number>(r.left.length + r.right.length).fill(1))
const KINDS = ['化合', '置换（氧化还原）', '分解']

export function useChapter10(nav: Nav): SpreadDef[] {
  const [ks, setKs] = useState(START)
  const [active, setActive] = useState(0)
  const solved = REVIEW.map((r, i) => balanced(...sides(r, ks[i])) && simplest(ks[i]))
  const all = solved.every(Boolean)

  function bump(eq: number, i: number, d: number) {
    const next = ks.map((row, e) => (e === eq ? row.map((k, j) => (j === i ? Math.min(Math.max(k + d, 1), 9) : k)) : row))
    setKs(next)
    setActive(eq)
    if (REVIEW.every((r, e) => balanced(...sides(r, next[e])) && simplest(next[e]))) saveStamp(10)
  }
  function onHit(id: string, i: number) {
    if (id === 'stamps') nav.next()
    else if (id.endsWith(':focus')) setActive(Number(id[2]))
    else if (id.startsWith('eq')) bump(Number(id[2]), Math.floor(i / 2), i % 2 ? -1 : 1)
  }

  const r = REVIEW[active]
  const [l, rt] = sides(r, ks[active])
  const left: Block[] = [
    { kind: 'kicker', text: '第 十 章' },
    { kind: 'title', text: '无一丢失' },
    {
      kind: 'para',
      size: 'lead',
      runs: txt('称量、离子、电子、能量、平衡……这本书里的每一种变化，原子都只是换了搭档。最后一次，亲手把账算平。'),
    },
    { kind: 'label', text: '挑战' },
    ...REVIEW.map((re, e): Block => {
      const ok = balanced(...sides(re, ks[e]))
      return {
        kind: 'equation',
        id: `eq${e}`,
        head: `${re.name}　${KINDS[e]}`,
        formulas: [...re.left, ...re.right],
        ks: ks[e],
        nLeft: re.left.length,
        done: solved[e],
        active: active === e,
        note: active === e && !solved[e] ? (ok ? '两边相等了，但系数还能约简：要用最简整数比。' : '账本里标红的罐子，两边还不相等。') : undefined,
      }
    }),
    { kind: 'para', size: 'small', hand: true, runs: txt('点 ▲ ▼ 改系数；点方框切换方程式。') },
  ]
  const syms = [...new Set([...Object.keys(sideAtoms(l)), ...Object.keys(sideAtoms(rt))])]
  const foot: Block[] = [
    { kind: 'para', size: 'small', runs: txt(`图 10　${r.name}`, { tone: 'soft' }) },
    {
      kind: 'para',
      runs: all ? txt('三个方程式都配平了。从第一章数原子到这里，每一个原子都还在：无一丢失。') : [...txt('现在：'), ...eqRuns(r, ks[active])],
    },
    ...(all ? [{ kind: 'links', items: [{ id: 'stamps', text: '看看你的印章 →' }] } as Block] : []),
  ]
  return [
    {
      key: 'ch10',
      chapter: 10,
      title: '无一丢失',
      left: leftPage(left, 23, all || loadStamps()[10] ? 10 : undefined),
      right: rightPage([{ kind: 'ledger', caption: '原子账本：左边 → 右边', lit: syms, counts: sideAtoms(l), after: sideAtoms(rt), syms }], foot, 24),
      popup: { node: <EquationPlate r={r} ks={ks[active]} scale={0.9} />, extent: equationExtent(r, ks[active], 0.9), key: `eq-${active}` },
      onHit,
      focus: 'left',
    },
  ]
}
