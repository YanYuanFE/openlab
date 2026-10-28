// Looping line drawings of four lessons for the landing page: inline SVG with SMIL animation.
import { useEffect, useRef, type ReactNode } from 'react'

const GLASS = '#566663'
const LIQUID = '#d7e6e3'
const CL2 = '#c3cf45'
const PINK = '#e0518c'
const RED = '#a3192b'
const FE2 = '#c6deb0'
const CUCL2 = '#7cc0b4'
const CU = '#b5652b'
const KI_BLUE = '#2c3f8f'

const loop = { repeatCount: 'indefinite' } as const

/** Frame shared by the drawings; with reduced motion it holds the frame at `still` seconds. */
function Art({ label, still, children }: { label: string; still: number; children: ReactNode }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) return
    ref.current!.pauseAnimations()
    ref.current!.setCurrentTime(still)
  }, [still])
  return (
    <svg ref={ref} viewBox="0 0 320 200" role="img" aria-label={label} fill="none" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
      {children}
    </svg>
  )
}

/** Gas from heated MnO₂ and conc. HCl fills the jar from the bottom; the starch KI strip turns blue; excess gas bubbles into NaOH. */
export function ChlorineArt() {
  const dur = '5s'
  return (
    <Art label="氯气制备示意：加热产生的黄绿色氯气沿导管进入集气瓶，瓶口试纸变蓝，多余气体通入氢氧化钠溶液" still={4}>
      {/* flame */}
      <path d="M60 186 q-7 -9 0 -20 q7 11 0 20z" fill="#f2a33a" stroke="none">
        <animate attributeName="opacity" values=".6;1;.7;1;.6" dur="0.8s" {...loop} />
      </path>
      {/* flask with reagents */}
      <path d="M54 64 V104 A30 30 0 1 0 66 104 V64" stroke={GLASS} strokeWidth="1.8" />
      <path d="M33 140 A30 30 0 0 0 87 140 Z" fill="#9aa04a" fillOpacity=".55" stroke="none" />
      <circle cx="52" cy="152" r="2.2" fill="#2f3332" stroke="none" />
      <circle cx="60" cy="155" r="2" fill="#2f3332" stroke="none" />
      <circle cx="68" cy="151" r="2.4" fill="#2f3332" stroke="none" />
      <circle cx="60" cy="122" r="22" fill={CL2} fillOpacity=".25" stroke="none" />
      {/* delivery tube into the bottom of the jar */}
      <path d="M60 64 V36 H150 V168" stroke={GLASS} strokeWidth="1.8" />
      <path d="M60 64 V36 H150 V168" stroke={CL2} strokeWidth="2.4" strokeDasharray="5 9">
        <animate attributeName="stroke-dashoffset" from="28" to="0" dur="0.9s" {...loop} />
      </path>
      {/* jar filling upwards with the denser gas */}
      <rect x="128" y="96" width="44" height="80" rx="3" fill={CL2} fillOpacity=".5" stroke="none">
        <animate attributeName="y" values="176;96;96;176" keyTimes="0;.6;.9;1" dur={dur} {...loop} />
        <animate attributeName="height" values="0;80;80;0" keyTimes="0;.6;.9;1" dur={dur} {...loop} />
      </rect>
      <path d="M126 88 V174 a4 4 0 0 0 4 4 H170 a4 4 0 0 0 4 -4 V88" stroke={GLASS} strokeWidth="1.8" />
      {/* starch KI strip at the mouth */}
      <rect x="133" y="70" width="7" height="24" fill="#ffffff" stroke={GLASS} strokeWidth="1">
        <animate attributeName="fill" values={`#ffffff;#ffffff;${KI_BLUE};${KI_BLUE};#ffffff`} keyTimes="0;.55;.65;.9;1" dur={dur} {...loop} />
      </rect>
      {/* tail gas into NaOH */}
      <path d="M170 98 H196 V60 H262 V168" stroke={GLASS} strokeWidth="1.8" />
      <path d="M236 116 V174 a4 4 0 0 0 4 4 H284 a4 4 0 0 0 4 -4 V116" stroke={GLASS} strokeWidth="1.8" />
      <rect x="237" y="136" width="50" height="41" fill={LIQUID} stroke="none" />
      {[0, 0.5, 1].map((b) => (
        <circle key={b} cx="262" r="2.5" stroke={GLASS} strokeWidth="1">
          <animate attributeName="cy" values="168;138" dur="1.5s" begin={`${b}s`} {...loop} />
          <animate attributeName="opacity" values="1;0" dur="1.5s" begin={`${b}s`} {...loop} />
        </circle>
      ))}
      <text x="262" y="196" fill={GLASS} stroke="none" fontSize="11" textAnchor="middle">NaOH 溶液</text>
      <text x="126" y="80" fill={KI_BLUE} stroke="none" fontSize="11" textAnchor="end">淀粉 KI</text>
    </Art>
  )
}

/** A drop of water squeezed into the ammonia flask pulls the phenolphthalein water up as a red jet. */
export function FountainArt() {
  const dur = '4s'
  const k = '0;.15;.7;.9;1'
  return (
    <Art label="喷泉实验示意：烧杯里滴了酚酞的水沿导管喷入倒置的氨气烧瓶，变成红色喷泉" still={2.6}>
      <defs>
        <clipPath id="fountain-flask">
          <circle cx="160" cy="62" r="44" />
        </clipPath>
      </defs>
      {/* red solution rising inside the flask */}
      <rect x="110" y="20" width="100" height="90" fill={PINK} fillOpacity=".55" stroke="none" clipPath="url(#fountain-flask)">
        <animate attributeName="y" values="110;110;40;40;110" keyTimes={k} dur={dur} {...loop} />
      </rect>
      <circle cx="160" cy="62" r="44" stroke={GLASS} strokeWidth="1.8" />
      <path d="M154 104 V128 M166 104 V128" stroke={GLASS} strokeWidth="1.8" />
      <rect x="150" y="128" width="20" height="10" rx="2" fill="#5b3a2e" stroke="none" />
      {/* tube from the beaker up into the flask, with the jet at its tip */}
      <path d="M160 184 V44" stroke={GLASS} strokeWidth="1.6" />
      {[-1, 0, 1].map((d) => (
        <path key={d} d={`M160 44 q${d * 10} -16 ${d * 22} -4`} stroke={PINK} strokeWidth="2.2" strokeDasharray="30" strokeDashoffset="30">
          <animate attributeName="stroke-dashoffset" values="30;30;0;0;30" keyTimes={k} dur={dur} {...loop} />
          <animate attributeName="opacity" values="0;1;1;0;0" keyTimes={k} dur={dur} {...loop} />
        </path>
      ))}
      {/* beaker of water with phenolphthalein, level dropping as it is drawn up */}
      <rect x="112" y="156" width="96" height="31" fill={LIQUID} stroke="none">
        <animate attributeName="y" values="156;156;166;166;156" keyTimes={k} dur={dur} {...loop} />
        <animate attributeName="height" values="31;31;21;21;31" keyTimes={k} dur={dur} {...loop} />
      </rect>
      <path d="M110 146 V184 a4 4 0 0 0 4 4 H206 a4 4 0 0 0 4 -4 V146" stroke={GLASS} strokeWidth="1.8" />
      {/* dropper squeezing water in */}
      <path d="M190 100 L176 84" stroke={GLASS} strokeWidth="1.6" />
      <ellipse cx="194" cy="104" rx="5" ry="8" transform="rotate(-42 194 104)" fill="#b8323a" stroke="none">
        <animate attributeName="rx" values="5;3;5;5" keyTimes="0;.08;.16;1" dur={dur} {...loop} />
      </ellipse>
      <text x="160" y="16" fill={GLASS} stroke="none" fontSize="11" textAnchor="middle">NH₃</text>
    </Art>
  )
}

/** KSCN turns the Fe³⁺ tube red at once; the Fe²⁺ tube stays green until chlorine water oxidises it. */
export function IronArt() {
  const dur = '6s'
  const tube = (x: number) => `M${x - 12} 60 V156 a12 12 0 0 0 24 0 V60`
  const fall = (x: number, color: string, at: number) => (
    <circle cx={x} r="3.2" fill={color} stroke="none" opacity="0">
      <animate attributeName="cy" values="44;44;120;120" keyTimes={`0;${at};${at + 0.08};1`} dur={dur} {...loop} />
      <animate attributeName="opacity" values="0;1;1;0;0" keyTimes={`0;${at};${at + 0.07};${at + 0.08};1`} dur={dur} {...loop} />
    </circle>
  )
  return (
    <Art label="铁离子检验示意：滴入硫氰化钾后 Fe³⁺ 试管立即变红，Fe²⁺ 试管不变色，再滴入氯水后也变红" still={4.8}>
      {/* liquids */}
      <path d="M98 120 H122 V156 a12 12 0 0 1 -24 0z" fill="#e3b24c" fillOpacity=".8" stroke="none">
        <animate attributeName="fill" values="#e3b24c;#e3b24c;#a3192b;#a3192b;#e3b24c" keyTimes="0;.2;.24;.92;1" dur={dur} {...loop} />
      </path>
      <path d="M198 120 H222 V156 a12 12 0 0 1 -24 0z" fill={FE2} fillOpacity=".9" stroke="none">
        <animate attributeName="fill" values={`${FE2};${FE2};${RED};${RED};${FE2}`} keyTimes="0;.62;.68;.92;1" dur={dur} {...loop} />
      </path>
      <path d={tube(110)} stroke={GLASS} strokeWidth="1.8" />
      <path d={tube(210)} stroke={GLASS} strokeWidth="1.8" />
      {/* droppers: KSCN into both, then chlorine water into the right */}
      {fall(110, '#9fb3b0', 0.1)}
      {fall(210, '#9fb3b0', 0.1)}
      {fall(210, '#b88a2e', 0.52)}
      <path d="M110 40 V22 M210 40 V22" stroke={GLASS} strokeWidth="1.6" />
      <rect x="105" y="10" width="10" height="14" rx="5" fill="#b8323a" stroke="none" />
      <rect x="205" y="10" width="10" height="14" rx="5" fill="#b8323a" stroke="none" />
      <text x="110" y="192" fill={GLASS} stroke="none" fontSize="12" textAnchor="middle">Fe³⁺</text>
      <text x="210" y="192" fill={GLASS} stroke="none" fontSize="12" textAnchor="middle">Fe²⁺</text>
      <text x="160" y="40" fill={GLASS} stroke="none" fontSize="11" textAnchor="middle">
        KSCN
        <animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;.4;.45;.92;1" dur={dur} {...loop} />
      </text>
      <text x="246" y="34" fill="#8a6a1e" stroke="none" fontSize="11" textAnchor="middle" opacity="0">
        氯水
        <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;.45;.5;.92;1" dur={dur} {...loop} />
      </text>
    </Art>
  )
}

/** Cu²⁺ drifts to the cathode and plates as copper; Cl⁻ drifts to the anode and leaves as gas. */
export function ElectrolysisArt() {
  const ion = (from: [number, number], to: [number, number], color: string, begin: number) => (
    <circle r="3.6" fill={color} stroke="none">
      <animateMotion path={`M${from[0]} ${from[1]} L${to[0]} ${to[1]}`} dur="3s" begin={`${begin}s`} {...loop} />
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.85;1" dur="3s" begin={`${begin}s`} {...loop} />
    </circle>
  )
  return (
    <Art label="电解氯化铜示意：蓝色的铜离子移向阴极析出铜，绿色的氯离子移向阳极放出氯气" still={6}>
      {/* power supply and wires */}
      <path d="M128 66 V30 H150 M170 30 H192 V66" stroke={GLASS} strokeWidth="1.6" />
      <path d="M150 20 V40 M156 25 V35 M164 20 V40 M170 25 V35" stroke={GLASS} strokeWidth="2" />
      <text x="118" y="26" fill={GLASS} stroke="none" fontSize="12" textAnchor="middle">−</text>
      <text x="202" y="26" fill={GLASS} stroke="none" fontSize="12" textAnchor="middle">+</text>
      {/* solution, electrodes, copper growing on the cathode */}
      <rect x="92" y="92" width="136" height="92" fill={CUCL2} fillOpacity=".4" stroke="none" />
      <path d="M90 76 V182 a4 4 0 0 0 4 4 H226 a4 4 0 0 0 4 -4 V76" stroke={GLASS} strokeWidth="1.8" />
      <rect x="124" y="66" width="8" height="100" rx="1" fill="#3a3f44" stroke="none" />
      <rect x="188" y="66" width="8" height="100" rx="1" fill="#3a3f44" stroke="none" />
      <rect x="122" y="96" width="12" height="70" rx="2" fill={CU} stroke="none">
        <animate attributeName="opacity" values=".1;.9;.9;.1" keyTimes="0;.8;.95;1" dur="9s" {...loop} />
      </rect>
      {ion([180, 110], [136, 120], '#2f6fb5', 0)}
      {ion([176, 150], [136, 146], '#2f6fb5', 1.5)}
      {ion([140, 128], [184, 118], '#2f9a5a', 0.7)}
      {ion([144, 160], [184, 152], '#2f9a5a', 2.2)}
      {/* chlorine bubbles at the anode */}
      {[0, 0.6, 1.2].map((b) => (
        <circle key={b} cx="200" r="2.6" stroke={GLASS} strokeWidth="1">
          <animate attributeName="cy" values="158;96" dur="1.8s" begin={`${b}s`} {...loop} />
          <animate attributeName="opacity" values="1;0" dur="1.8s" begin={`${b}s`} {...loop} />
        </circle>
      ))}
      {/* starch KI strip above the anode turns blue in the chlorine */}
      <rect x="206" y="58" width="7" height="26" fill="#ffffff" stroke={GLASS} strokeWidth="1">
        <animate attributeName="fill" values={`#ffffff;#ffffff;${KI_BLUE};${KI_BLUE};#ffffff`} keyTimes="0;.3;.4;.95;1" dur="9s" {...loop} />
      </rect>
      <text x="220" y="54" fill={KI_BLUE} stroke="none" fontSize="11">淀粉 KI</text>
      <text x="128" y="200" fill={GLASS} stroke="none" fontSize="11" textAnchor="middle">阴极</text>
      <text x="192" y="200" fill={GLASS} stroke="none" fontSize="11" textAnchor="middle">阳极</text>
      <text x="64" y="128" fill="#2f6fb5" stroke="none" fontSize="11" textAnchor="middle">Cu²⁺</text>
      <text x="258" y="128" fill="#2f9a5a" stroke="none" fontSize="11" textAnchor="middle">Cl⁻</text>
    </Art>
  )
}
