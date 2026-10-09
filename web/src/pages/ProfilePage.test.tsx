import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../lib/AuthProvider'
import { ProfilePage } from './ProfilePage'

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

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as Record<string, string>
        return jsonResponse({ ...user, ...body, email: body.email ?? user.email })
      }
      return jsonResponse(user)
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const renderProfile = () =>
  render(
    <AuthProvider>
      <ProfilePage />
    </AuthProvider>,
  )

describe('profile page', () => {
  it('shows the current account details', async () => {
    renderProfile()

    expect(await screen.findByRole('heading', { name: /profile details/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Ada Lovelace')
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com')
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument()
  })

  it('does not ask for a password when only the name changes', async () => {
    renderProfile()

    const detailsForm = within(await screen.findByRole('form', { name: 'Profile details' }))
    expect(detailsForm.queryByLabelText('Current password')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada L.' } })
    fireEvent.click(detailsForm.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Profile updated.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Ada L.')
    expect(detailsForm.queryByLabelText('Current password')).not.toBeInTheDocument()
  })

  it('asks for the current password when the email changes', async () => {
    renderProfile()

    const detailsForm = within(await screen.findByRole('form', { name: 'Profile details' }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
    expect(screen.getByText(/requires your current password/i)).toBeInTheDocument()

    fireEvent.click(detailsForm.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/enter your current password/i)).toBeInTheDocument()

    fireEvent.change(detailsForm.getByLabelText('Current password'), { target: { value: 'password123' } })
    fireEvent.click(detailsForm.getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText('Profile updated.')).toBeInTheDocument()
  })

  it('saves optional contact and address details without a password', async () => {
    renderProfile()

    const detailsForm = within(await screen.findByRole('form', { name: 'Profile details' }))
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+91 98765 43210' } })
    fireEvent.change(screen.getByLabelText(/^address/i), { target: { value: '12 MG Road' } })
    fireEvent.change(screen.getByLabelText(/^city/i), { target: { value: 'Bengaluru' } })
    fireEvent.change(screen.getByLabelText(/postal code/i), { target: { value: '560001' } })
    fireEvent.click(detailsForm.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Profile updated.')).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('+91 98765 43210')
    expect(screen.getByLabelText(/^city/i)).toHaveValue('Bengaluru')
    expect(detailsForm.queryByLabelText('Current password')).not.toBeInTheDocument()
  })

  it('validates the new password fields', async () => {
    renderProfile()

    fireEvent.change(await screen.findByLabelText('Current password'), { target: { value: 'old-pass-1' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /change password/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/new password must be at least 8 characters/i)

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'brandnewpass1' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different-pass' } })
    fireEvent.click(screen.getByRole('button', { name: /change password/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i)
  })
})
