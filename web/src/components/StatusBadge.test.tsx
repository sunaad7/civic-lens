import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders a human label for known statuses', () => {
    render(<StatusBadge status="in_progress" />)
    expect(screen.getByText('In progress')).toBeInTheDocument()
  })

  it('falls back to the raw status for unknown values', () => {
    render(<StatusBadge status="mystery" />)
    expect(screen.getByText('mystery')).toBeInTheDocument()
  })

  it('applies a status class', () => {
    render(<StatusBadge status="resolved" />)
    expect(screen.getByText('Resolved')).toHaveClass('badge-resolved')
  })
})
