import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BrandMark } from '../components/BrandMark'
import { BackgroundBeams } from '../components/ui/background-beams'
import { CardBody, CardContainer, CardItem } from '../components/ui/3d-card'
import { TypewriterEffect } from '../components/ui/typewriter-effect'
import { useAuth } from '../lib/useAuth'

const heroWords = [
  { text: 'Report', className: 'text-white' },
  { text: 'it.', className: 'text-white' },
  { text: 'Track', className: 'text-white' },
  { text: 'it.', className: 'text-white' },
  { text: 'Fix', className: 'text-white' },
  { text: 'it.', className: 'text-white text-[#4f9cf9]' },
]

const features: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: 'Photo-first reporting',
    text: 'Attach up to five photos — camera or gallery — and dictate the description hands-free while you walk.',
    icon: (
      <>
        <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" />
        <circle cx="12" cy="13" r="3.2" />
      </>
    ),
  },
  {
    title: 'Pinned to the map',
    text: 'Drop an exact pin or use your current location, then find nearby reports with a map bounding-box search.',
    icon: (
      <>
        <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.6" />
      </>
    ),
  },
  {
    title: 'Live status timeline',
    text: 'Follow every transition — submitted, triaged, assigned, in progress, resolved — with a full audit trail.',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  {
    title: 'Official letters, drafted',
    text: 'Administrators generate a formal department letter from any report in a single click, ready to read aloud.',
    icon: (
      <>
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v4h4" />
        <path d="M9 12h6M9 16h6" />
      </>
    ),
  },
]

const steps = [
  {
    title: 'Report',
    text: 'Pin the location, snap photos, and describe the issue — by text or voice.',
  },
  {
    title: 'Triage & assign',
    text: 'The report is categorized and routed to the right team, with every event recorded.',
  },
  {
    title: 'Resolve',
    text: 'Track live status until closure and see exactly what changed along the way.',
  },
]

const statuses = ['Submitted', 'Triaged', 'Assigned', 'In progress', 'Resolved'] as const

const statusClass: Record<string, string> = {
  Submitted: 'badge-submitted',
  Triaged: 'badge-triaged',
  Assigned: 'badge-assigned',
  'In progress': 'badge-in_progress',
  Resolved: 'badge-resolved',
}

export function LandingPage() {
  const { user } = useAuth()
  const ctaTo = user ? '/report' : '/register'
  const ctaLabel = user ? 'Open CivicLens' : 'Get started'

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-slate-900 no-underline"
          >
            <BrandMark className="h-6 w-6 text-brand" />
            <span className="text-[1.05rem] font-bold tracking-tight">
              CivicLens
            </span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="no-underline hover:text-slate-900">
              Features
            </a>
            <a href="#how" className="no-underline hover:text-slate-900">
              How it works
            </a>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/report"
                className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white no-underline transition hover:bg-brand-dark"
              >
                {ctaLabel}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden text-sm font-medium text-slate-600 no-underline hover:text-slate-900 sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white no-underline transition hover:bg-brand-dark"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="relative isolate overflow-hidden bg-[#050914]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_-10%,rgba(22,99,208,0.35),transparent_65%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 top-1/4 h-[32rem] w-[32rem] rounded-full bg-[#1663d0]/20 blur-[140px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#7c3aed]/15 blur-[140px]"
        />
        <BackgroundBeams />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4f9cf9]" />
            Civic issue reporting, end to end
          </span>
          <div className="mt-8">
            <TypewriterEffect
              words={heroWords}
              className="max-w-3xl tracking-tight"
              cursorClassName="bg-[#4f9cf9]"
            />
          </div>
          <p className="mt-6 max-w-2xl text-base text-slate-400 md:text-lg">
            Snap the pothole, the broken streetlight, the overflowing bin —
            pin it to the map and follow it all the way to fixed. One place for
            residents and city teams.
          </p>
          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              to={ctaTo}
              className="inline-flex h-11 items-center rounded-lg bg-white px-7 text-sm font-semibold text-neutral-950 no-underline transition hover:bg-slate-200"
            >
              {ctaLabel}
            </Link>
            {!user && (
              <Link
                to="/login"
                className="inline-flex h-11 items-center rounded-lg border border-white/20 px-7 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <section id="features" className="border-b border-slate-100 bg-slate-50/60 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Everything between report and resolution
            </h2>
            <p className="mt-4 text-slate-500">
              Residents get a two-minute workflow. City teams get a structured
              queue with a complete audit trail.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <CardContainer
                key={feature.title}
                containerClassName="w-full p-0"
                className="h-full w-full"
              >
                <CardBody className="flex h-full w-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <CardItem
                    translateZ={60}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      {feature.icon}
                    </svg>
                  </CardItem>
                  <CardItem
                    translateZ={50}
                    as="h3"
                    className="mt-4 text-[0.98rem] font-semibold tracking-tight text-slate-900"
                  >
                    {feature.title}
                  </CardItem>
                  <CardItem
                    translateZ={40}
                    as="p"
                    className="mt-2 text-sm leading-relaxed text-slate-500"
                  >
                    {feature.text}
                  </CardItem>
                </CardBody>
              </CardContainer>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Three steps to a fixed problem
            </h2>
            <p className="mt-4 text-slate-500">
              Every report moves through the same transparent pipeline, visible
              to everyone involved.
            </p>
          </div>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
                  {step.title}
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-2.5">
            {statuses.map((status) => (
              <span key={status} className={`badge ${statusClass[status]}`}>
                {status}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative isolate overflow-hidden rounded-3xl bg-[#050914] px-8 py-16 text-center md:px-16 md:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_80%_at_50%_0%,rgba(22,99,208,0.4),transparent_70%)]"
            />
            <BackgroundBeams />
            <div className="relative z-10">
              <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-white md:text-4xl">
                Start reporting in under a minute
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-slate-400 md:text-base">
                Create an account, pin your first issue, and watch the city
                respond.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to={ctaTo}
                  className="inline-flex h-11 items-center rounded-lg bg-white px-7 text-sm font-semibold text-neutral-950 no-underline transition hover:bg-slate-200"
                >
                  {ctaLabel}
                </Link>
                {!user && (
                  <Link
                    to="/login"
                    className="inline-flex h-11 items-center rounded-lg border border-white/20 px-7 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-5 w-5 text-brand" />
            <span className="text-sm font-bold tracking-tight">CivicLens</span>
            <span className="text-sm text-slate-400">© 2026</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
            <a href="#features" className="no-underline hover:text-slate-900">
              Features
            </a>
            <a href="#how" className="no-underline hover:text-slate-900">
              How it works
            </a>
            <Link to="/login" className="no-underline hover:text-slate-900">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
