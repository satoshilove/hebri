import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import { ambientOwnerConnectionId } from '@/api/client'
import type * as ApiClient from '@/api/client'
import * as api from '@/hermes'
import { openUpdateOverlayFor } from '@/store/updates'

import { CommandCenterView } from './index'

vi.mock('@/api/client', async importOriginal => ({
  ...(await importOriginal<typeof ApiClient>()),
  ambientOwnerConnectionId: vi.fn(() => 'local')
}))
vi.mock('@/hermes', async importOriginal => ({
  ...(await importOriginal<typeof api>()),
  getActionStatus: vi.fn(() => Promise.resolve({ running: false })),
  getLogs: vi.fn(() => Promise.resolve({ lines: [] })),
  getStatus: vi.fn(() => Promise.resolve({})),
  getUsageAnalytics: vi.fn(() => Promise.resolve({})),
  updateHermes: vi.fn(() => Promise.resolve({}))
}))
vi.mock('@/store/updates', () => ({ openUpdateOverlayFor: vi.fn() }))
vi.mock('./maintenance', () => ({ MaintenancePanel: () => null }))

afterEach(() => { cleanup(); vi.clearAllMocks() })

test.each(['local', 'remote-shinobi'])('System update targets the owner of %s', async owner => {
  vi.mocked(ambientOwnerConnectionId).mockReturnValue(owner)
  render(<MemoryRouter><CommandCenterView initialSection="system" onClose={() => {}} onDeleteSession={async () => {}} onOpenSession={() => {}} /></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Update Hebri' }))

  if (owner === 'local') {
    expect(openUpdateOverlayFor).toHaveBeenCalledWith('client')
    expect(api.updateHermes).not.toHaveBeenCalled()
  } else {
    await waitFor(() => expect(api.updateHermes).toHaveBeenCalled())
    expect(openUpdateOverlayFor).not.toHaveBeenCalled()
  }
})
