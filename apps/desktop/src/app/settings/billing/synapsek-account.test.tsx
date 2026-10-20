import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SynapsekAccountView } from '../../../../electron/synapsek-account-types'

import { SynapsekAccountSettings } from './synapsek-account'
import { accountCopy } from './synapsek-account-copy'

vi.mock('@/i18n', () => ({ useI18n: () => ({ locale: 'en' }) }))
vi.mock('@/components/ui/button', () => ({
  Button: ({ variant: _variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button {...props} />
  )
}))
const previous = window.hermesDesktop
afterEach(() => {
  cleanup()
  window.hermesDesktop = previous
})

describe('Synapsek account controls', () => {
  it('shows the server shared balance and funded-provider guidance only after consent', async () => {
    const bridge = vi.fn(async () => ({
      ok: true,
      value: {
        state: 'signed_in',
        account: {
          userId: '11111111-1111-4111-8111-111111111111',
          email: 'a@example.com',
          managedInferenceEnabled: true,
          billing: { plan: 'pro', sku: 'pro', status: 'active', accessSource: 'stripe', includedMonthlyCredits: 4000 },
          usage: {
            period: '2026-10',
            remainingIncludedCredits: 3150,
            reservedIncludedCredits: 25,
            purchasedAvailableCredits: 500,
            monthTokens: 12345,
            debtCredits: 0
          }
        }
      }
    }))

    window.hermesDesktop = { ...previous, synapsekAccount: bridge } as unknown as NonNullable<
      typeof window.hermesDesktop
    >
    render(<SynapsekAccountSettings />)
    expect(await screen.findByText('3,150')).toBeTruthy()
    expect(screen.getByText(/Choose Synapsek in the model picker/)).toBeTruthy()
    expect(screen.queryByText(/not enabled in this account preview/)).toBeNull()
  })
  it('shows verified account data and opens billing without requesting payment credentials', async () => {
    const account: SynapsekAccountView = {
      state: 'signed_in',
      account: {
        userId: '11111111-1111-4111-8111-111111111111',
        email: 'preview@example.com',
        billing: { plan: 'pro', sku: 'max', status: 'active', accessSource: 'stripe', includedMonthlyCredits: 8000 }
      }
    }

    const bridge = vi.fn(async (operation: string) => ({
      ok: true as const,
      value: operation === 'openBilling' ? null : account
    }))

    window.hermesDesktop = { ...previous, synapsekAccount: bridge } as NonNullable<typeof window.hermesDesktop>
    render(<SynapsekAccountSettings />)
    expect(await screen.findByText(/preview@example.com/)).toBeTruthy()
    expect(screen.getByText(/not enabled in this account preview/)).toBeTruthy()
    fireEvent.click(screen.getByText('Manage on Synapsek'))
    await waitFor(() => expect(bridge).toHaveBeenCalledWith('openBilling'))
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })
  it('keeps failed sign-out visible and distinguishes local removal', async () => {
    const bridge = vi.fn(async () => ({ ok: false as const, code: 'revocation_incomplete' }))
    window.hermesDesktop = { ...previous, synapsekAccount: bridge } as NonNullable<typeof window.hermesDesktop>
    render(<SynapsekAccountSettings />)
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Device revocation has not fully completed. Retry sign-out.'
    )
    expect(screen.getByText(accountCopy.en.removeNotice)).toBeTruthy()
    fireEvent.click(screen.getByText(accountCopy.en.remove))
    await waitFor(() => expect(bridge).toHaveBeenCalledWith('forgetLocal'))
  })
  it('stays hidden when the production account capability is disabled', async () => {
    const bridge = vi.fn(async () => ({ ok: false as const, code: 'not_available' }))
    window.hermesDesktop = { ...previous, synapsekAccount: bridge } as NonNullable<typeof window.hermesDesktop>
    const { container } = render(<SynapsekAccountSettings />)
    await waitFor(() => expect(bridge).toHaveBeenCalledWith('status'))
    expect(container.childElementCount).toBe(0)
  })
})
