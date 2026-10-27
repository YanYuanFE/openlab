import { cn } from '@/lib/utils'

/** OpenLab mark: an open-mouthed flask with a drop falling in. Same drawing as public/favicon.svg. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--bench)" />
      <g transform="translate(0 2)">
        <path d="M10.4 18H21.6L24.4 23.2Q25.2 25 23.2 25H8.8Q6.8 25 7.6 23.2Z" fill="#9fd3c0" />
        <path
          d="M13 6.5V13.2L7.6 23.2Q6.8 25 8.8 25H23.2Q25.2 25 24.4 23.2L19 13.2V6.5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M16 7.4C16 7.4 14.5 9.3 14.5 10.4A1.5 1.5 0 0 0 17.5 10.4C17.5 9.3 16 7.4 16 7.4Z" fill="#9fd3c0" />
      </g>
    </svg>
  )
}

/** Mark plus wordmark. */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold text-ink', className)}>
      <Logo className="size-7" />
      OpenLab
    </span>
  )
}
