import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            CivicLens
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            An unexpected error interrupted this page. Reloading usually fixes
            it. If it keeps happening, please try again later.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex h-10 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Reload page
            </button>
            <a
              href="/"
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 no-underline transition hover:bg-slate-100"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    )
  }
}
