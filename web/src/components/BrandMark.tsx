import { cn } from '../lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('h-6 w-6', className)}
    >
      <circle cx="10" cy="10" r="6.75" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M10 5.75c-1.9 0-3.4 1.47-3.4 3.26 0 2.17 2.42 4.58 3.4 5.83.98-1.25 3.4-3.66 3.4-5.83 0-1.79-1.5-3.26-3.4-3.26Z"
        fill="currentColor"
      />
      <path
        d="M14.9 14.9 20.5 20.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
