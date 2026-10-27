import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fml, hitAt, txt, typeset, wrap, type Measure } from './print.ts'

// every glyph is one size wide, except Latin letters and digits at half that
const measure: Measure = (t, f) => [...t].reduce((w, ch) => w + (/[A-Za-z0-9 ]/.test(ch) ? 0.5 : 1) * f.size, 0)
const lineText = (l: ReturnType<typeof wrap>[number]) => l.atoms.map(({ a }) => a.pieces.map((p) => p.t).join('')).join('|')

test('CJK text breaks between any two characters', () => {
  const lines = wrap(txt('一二三四五六七'), 3, 1, measure)
  assert.deepEqual(lines.map(lineText), ['一|二|三', '四|五|六', '七'])
})

test('closing punctuation hangs on the line before instead of starting a new one', () => {
  const lines = wrap(txt('一二三，四'), 3, 1, measure)
  assert.deepEqual(lines.map(lineText), ['一|二|三，', '四'])
  assert.equal(lines[0].w, 4)
})

test('opening punctuation travels with the character after it', () => {
  const lines = wrap(txt('一二「三」'), 3, 1, measure)
  assert.deepEqual(lines.map(lineText), ['一|二', '「三」'])
})

test('a formula is never split across lines and keeps its subscripts', () => {
  const runs = [...txt('一二'), ...fml('Na2CO3')]
  const lines = wrap(runs, 4, 1, measure)
  assert.deepEqual(lines.map(lineText), ['一|二', 'Na2CO3'])
  const atom = lines[1].atoms[0].a
  assert.deepEqual(
    atom.pieces.map((p) => [p.t, Boolean(p.run.sub)]),
    [['Na', false], ['2', true], ['CO', false], ['3', true]],
  )
  // Na + CO at 0.5 each per letter, the two subscripts at 62 % of that
  assert.equal(atom.w, 2 + 2 * 0.5 * 0.62)
})

test('spaces separate Latin words and add width only mid-line', () => {
  const lines = wrap(txt('ab cd ef'), 2.6, 1, measure)
  assert.deepEqual(lines.map(lineText), ['ab|cd', 'ef'])
  assert.equal(lines[0].w, 2.5)
})

test('choices give one click region per row and the flap reserves its rectangle', () => {
  const laid = typeset(
    [
      { kind: 'choices', id: 'p', items: [txt('甲'), txt('乙'), txt('丙')], picked: 1 },
      { kind: 'flap', id: 'why', runs: txt('答案'), open: false, locked: true },
    ],
    { x: 2, y: 3, w: 16 },
    measure,
  )
  assert.deepEqual(
    laid.hits.map((h) => [h.id, h.i]),
    [['p', 0], ['p', 1], ['p', 2]],
  )
  assert.deepEqual(laid.ops.filter((o) => o.kind === 'check').map((o) => o.kind === 'check' && o.on), [false, true, false])
  assert.equal(laid.flaps.length, 1)
  assert.equal(laid.flaps[0].x, 2)
  assert.equal(laid.flaps[0].w, 16)
  assert.ok(laid.flaps[0].y > laid.hits[2].y)
  // the flap's tinted ground is painted before (under) its answer text
  const ground = laid.ops.findIndex((o) => o.kind === 'rect' && o.fill)
  const answer = laid.ops.findIndex((o) => o.kind === 'text' && o.t === '答')
  assert.ok(ground >= 0 && ground < answer, `ground ${ground} should precede answer ${answer}`)
  const row1 = laid.hits[1]
  assert.equal(hitAt(laid.hits, row1.x + 1, row1.y + row1.h / 2)?.i, 1)
  assert.equal(hitAt(laid.hits, 30, 30), undefined)
})

test('equation arrows hit before the box that contains them, and disabled links never hit', () => {
  const laid = typeset(
    [
      { kind: 'equation', id: 'eq', head: '铁', formulas: ['Fe', 'Cl2', 'FeCl3'], ks: [2, 3, 2], nLeft: 2 },
      { kind: 'links', items: [{ id: 'back', text: '上一步' }, { id: 'next', text: '下一步', disabled: true }] },
    ],
    { x: 0, y: 0, w: 16 },
    measure,
  )
  const up = laid.hits.find((h) => h.id === 'eq' && h.i === 2)!
  assert.equal(hitAt(laid.hits, up.x + up.w / 2, up.y + up.h / 2)?.i, 2)
  const next = laid.hits.find((h) => h.id === 'next')!
  assert.equal(hitAt(laid.hits, next.x + 0.5, next.y + 0.5), undefined)
  const back = laid.hits.find((h) => h.id === 'back')!
  assert.equal(hitAt(laid.hits, back.x + 0.5, back.y + 0.5)?.id, 'back')
  assert.ok(next.x > back.x + back.w)
  assert.deepEqual(
    laid.ops.filter((o) => o.kind === 'text' && /^\d$/.test(o.t)).map((o) => o.kind === 'text' && o.t),
    ['2', '3', '2', '2', '3'],
  )
})

test('an ionic charge after ^ is set as a raised superscript', () => {
  assert.deepEqual(fml('SO4^2-'), [{ t: 'SO', sub: false }, { t: '4', sub: true }, { t: '2−', sup: true }])
  const { ops } = typeset([{ kind: 'para', runs: fml('Ag^+') }], { x: 0, y: 0, w: 10 }, measure)
  const [ag, plus] = ops.filter((o) => o.kind === 'text')
  assert.equal(ag.kind === 'text' && plus.kind === 'text' && Number((ag.y - plus.y).toFixed(3)), 0.2)
})

test('a ledger prints only the jars it names', () => {
  const { ops } = typeset([{ kind: 'ledger', caption: '', lit: ['Ag'], counts: {}, syms: ['Na', 'Cl', 'Ag'] }], { x: 0, y: 0, w: 12 }, measure)
  assert.equal(ops.filter((o) => o.kind === 'jar').length, 3)
  assert.deepEqual(ops.filter((o) => o.kind === 'jar').map((o) => o.kind === 'jar' && o.lit), [false, false, true])
})

test('a plot maps its curve into the box and marks the current point', () => {
  const { ops } = typeset(
    [{ kind: 'plot', caption: '', x: [0, 10], y: [0, 14], xTicks: [], yTicks: [], xLabel: '', yLabel: '', curve: [[0, 0], [5, 7], [10, 14]], at: [10, 14], h: 4 }],
    { x: 0, y: 0, w: 12 },
    measure,
  )
  const curve = ops.filter((o) => o.kind === 'line' && o.tone === 'ink')
  assert.equal(curve.length, 2)
  const last = curve[1]
  assert.ok(last.kind === 'line')
  // left edge at x 1.2, width 10; top under the caption at 0.42 * 1.6
  assert.deepEqual([last.x2, Number(last.y2.toFixed(3))], [11.2, 0.672])
  const dot = ops.find((o) => o.kind === 'rect' && o.fill)
  assert.ok(dot?.kind === 'rect')
  assert.deepEqual([Number(dot.x.toFixed(2)), Number(dot.y.toFixed(3))], [11.08, 0.552])
})
