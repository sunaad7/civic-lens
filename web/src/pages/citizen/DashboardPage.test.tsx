import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../lib/AuthProvider'
import { DashboardPage } from './DashboardPage'

const user = {
  id: 'u1',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  role: 'citizen' as const,
  address_line: null,
  city: null,
  pincode: null,
  phone: null,
}

const complaints = [
  {
    id: 'c1',
    title: 'Broken streetlight on 5th Ave',
    category: 'lighting',
    status: 'resolved',
    location_label: '5th Ave',
    lat: 12.9,
    lng: 77.6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'c2',
    title: 'Overflowing bin near the park',
    category: 'waste',
    status: 'submitted',
    location_label: 'Central Park',
    lat: 12.91,
    lng: 77.61,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/me')) return jsonResponse(user)
      if (url.includes('/complaints')) return jsonResponse(complaints)
      return jsonResponse([])
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('citizen dashboard', () => {
  it('shows summary stats and recent reports', async () => {
    renderDashboard()

    expect(await screen.findByText('Total reports')).toBeInTheDocument()
    expect(screen.getByText(/resolution rate/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /status breakdown/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent reports/i })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /broken streetlight on 5th ave/i })).toHaveAttribute(
      'href',
      '/complaints/c1',
    )
  })

  it('prompts the citizen to complete their profile', async () => {
    renderDashboard()

    expect(await screen.findByRole('heading', { name: /profile completeness/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /profile 0% complete/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /add your details/i })).toHaveAttribute('href', '/profile')
  })
})
