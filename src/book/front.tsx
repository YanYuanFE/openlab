import { loadStamps } from './progress'
import { fml, txt, type Run } from './print'
import { leftPage, rightPage, type Nav, type SpreadDef } from './spread'

// Front matter (title page and contents) and back matter (glossary and the stamps collected).

export const CHAPTERS: { title: string; lead: string; written: boolean }[] = [
  { title: '数一数原子', lead: '一杯水能分到多小？八样东西，七种元素。', written: true },
  { title: '质量守恒', lead: '冒泡的反应放上天平：敞口和密闭不一样。', written: true },
  { title: '物质的量', lead: '一摩尔原子有多少个、有多重？', written: true },
  { title: '离子反应', lead: '溶液里真正参加反应的是谁？', written: true },
  { title: '氧化还原', lead: '电子账本：钠与水，谁给了谁电子。', written: true },
  { title: '化学能与热', lead: '断开化学键吸热，形成化学键放热。', written: true },
  { title: '原电池', lead: '让电子沿着导线流过去。', written: true },
  { title: '反应速率与平衡', lead: '可逆反应，平衡怎样移动。', written: true },
  { title: '酸、碱与 pH', lead: '一滴一滴，画出滴定曲线。', written: true },
  { title: '无一丢失', lead: '全书回顾：原子一个也不会少。', written: true },
]

const GLOSSARY: [string, Run[]][] = [
  ['原子', txt('化学变化中的最小微粒，在反应中不会被创造，也不会消失。（第一章）')],
  ['分子', [...txt('由原子构成、保持物质化学性质的一种微粒，例如水分子 '), ...fml('H2O'), ...txt('。（第一章）')]],
  ['元素', txt('同一类原子的总称，例如所有的氢原子都属于氢元素。（第一章）')],
  ['化学式', txt('用元素符号和数字表示物质组成的式子，数字是该原子的个数。（第一章）')],
  ['质量守恒', txt('参加反应的各物质的质量总和，等于反应后生成的各物质的质量总和。（第二章）')],
  ['化学方程式', txt('用化学式表示化学反应的式子，左边是反应物，右边是生成物。（第二章）')],
  ['配平', txt('在化学式前配上最简整数系数，使两边每种原子的个数相等。（第二章）')],
  ['摩尔', [...txt('物质的量的单位，1 mol 含有 6.02×10'), { t: '23', sup: true }, ...txt(' 个微粒。（第三章）')]],
  ['摩尔质量', txt('1 mol 物质的质量，单位 g/mol，数值等于相对原子质量或相对分子质量。（第三章）')],
  ['离子方程式', txt('只写实际参加反应的离子的式子；没有变化的离子叫旁观离子。（第四章）')],
  ['氧化还原', txt('有电子得失的反应：失去电子的是还原剂，得到电子的是氧化剂。（第五章）')],
  ['反应热', txt('断键吸收、成键放出的能量之差；放出的多就放热。（第六章）')],
  ['原电池', txt('把化学能转化为电能的装置，电子从负极经导线流向正极。（第七章）')],
  ['化学平衡', txt('正、逆反应速率相等，各物质浓度不再改变的动态状态。（第八章）')],
  ['中和滴定', txt('用已知浓度的碱（或酸）测定酸（或碱）浓度的方法，终点附近 pH 突跃。（第九章）')],
]

export function useFront(nav: Nav): SpreadDef[] {
  const stamps = loadStamps()
  return [
    {
      key: 'front',
      chapter: 0,
      title: '目录',
      left: leftPage(
        [
          { kind: 'gap', h: 3 },
          { kind: 'kicker', text: '一 本 关 于 原 子 的 化 学 书' },
          { kind: 'title', text: '每一个原子' },
          { kind: 'para', size: 'lead', runs: txt('追踪每一个原子去了哪里，看它们怎样重新组合，以及为什么一个也不会丢失。') },
          { kind: 'gap', h: 1.5 },
          { kind: 'label', text: '怎样读这本书' },
          {
            kind: 'para',
            runs: txt('每一章先在左页勾选你的预测，再按下方的 ▶ 看右页的图从书页上立起来。然后自己动手：右页上方的原子账本会记下每一个原子。最后完成挑战，盖上本章的印章。'),
          },
          { kind: 'para', hand: true, runs: txt('拖动可以转动书本；手机上用下方的按钮在文字和插图之间切换。') },
        ],
        1,
      ),
      right: rightPage(
        [
          { kind: 'label', text: '目录' },
          { kind: 'toc', id: 'toc', items: CHAPTERS.map((c, i) => ({ title: c.title, lead: c.lead, enabled: c.written, stamped: Boolean(stamps[i + 1]) })) },
        ],
        [],
        2,
        false,
      ),
      onHit: (id, i) => id === 'toc' && nav.toChapter(i + 1),
    },
  ]
}

export function useBack(nav: Nav): SpreadDef[] {
  const stamps = loadStamps()
  const earned = Object.keys(stamps).map(Number).sort((a, b) => a - b)
  return [
    {
      key: 'back',
      chapter: 0,
      title: '术语表与印章',
      left: leftPage([{ kind: 'title', text: '术语表' }, { kind: 'terms', items: GLOSSARY }], 25),
      right: rightPage(
        [
          { kind: 'title', text: '印章' },
          { kind: 'para', runs: txt(earned.length ? '每完成一章的挑战，就在这里盖上一枚印章。' : '还没有印章。完成一章的挑战，印章就会盖在这里。') },
          { kind: 'stamps', ns: earned },
          { kind: 'links', items: [{ id: 'start', text: '回到第一章 →' }] },
        ],
        [],
        26,
        false,
      ),
      onHit: (id) => id === 'start' && nav.toChapter(1),
    },
  ]
}
