import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { BrandMark } from './BrandMark'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  topLeft,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
  topLeft?: ReactNode
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {topLeft && <div className="absolute top-4 left-4 z-10 sm:top-6 sm:left-6">{topLeft}</div>}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#dbeafe,transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)] opacity-40"
      />
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mx-auto mb-7 flex w-fit items-center gap-2.5 text-slate-900 no-underline"
        >
          <span className="brand-logo">
            <BrandMark className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight">CivicLens</span>
        </Link>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.35)]">
          <div className="mb-6">
            <span className="page-eyebrow">CivicLens account</span>
            <h1 className="text-[1.4rem] font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
      </div>
    </div>
  )
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  hintId,
  hint,
  required = true,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  placeholder: string
  hintId?: string
  hint?: ReactNode
  required?: boolean
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`${inputClass} pr-11`}
          aria-describedby={hintId}
          required={required}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {hint}
    </div>
  )
}

export const inputClass =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[0.95rem] text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none'

export const labelClass = 'text-[0.88rem] font-semibold text-slate-700'

export const submitClass =
  'mt-1 h-11 w-full rounded-xl bg-brand text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark hover:-translate-y-px focus-visible:ring-4 focus-visible:ring-brand/25 focus-visible:outline-none disabled:opacity-60 disabled:translate-y-0'
