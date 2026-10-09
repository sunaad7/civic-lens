import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../lib/AuthProvider'
import { LandingPage } from './LandingPage'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'

const unauthenticated = () =>
  vi.fn(
    async () =>
      new Response(JSON.stringify({ message: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
  )

beforeEach(() => {
  vi.stubGlobal('fetch', unauthenticated())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const renderPage = (path: string, ui: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  )

describe('public pages', () => {
  it('renders the landing page', () => {
    renderPage('/', <LandingPage />)
    expect(
      screen.getByRole('heading', { level: 2, name: /everything between report and resolution/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: /three steps to a fixed problem/i }),
    ).toBeInTheDocument()
    const ctas = screen.getAllByRole('link', { name: 'Get started' })
    expect(ctas.length).toBeGreaterThan(0)
    for (const cta of ctas) expect(cta).toHaveAttribute('href', '/register')
    expect(document.body.textContent).toContain('Report it. Track it. Fix it.')
    const signIns = screen.getAllByRole('link', { name: 'Sign in' })
    expect(signIns.length).toBeGreaterThan(0)
    for (const link of signIns) expect(link).toHaveAttribute('href', '/login')
  })

  it('renders the login page', () => {
    renderPage('/login', <LoginPage />)
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
  })

  it('renders the register page', () => {
    renderPage('/register', <RegisterPage />)
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByText(/must be at least 8 characters/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled()
  })
})
