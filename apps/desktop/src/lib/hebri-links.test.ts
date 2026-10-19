import { describe, expect, it } from 'vitest'

import {
  HEBRI_MESSAGING_GUIDE_URL,
  HEBRI_REPOSITORY_URL,
  HEBRI_SITE_URL,
  HEBRI_SUPPORT_URL,
  hebriOwnedHelpUrl,
  hebriOwnedProductCopy
} from './hebri-links'

describe('hebriOwnedProductCopy', () => {
  it('rebrands inherited product prose without breaking the legacy CLI command', () => {
    expect(hebriOwnedProductCopy('Run Hermes Agent from Telegram with `hermes gateway setup`.')).toBe(
      'Run Hebri from Telegram with `hermes gateway setup`.'
    )
  })
})

describe('hebriOwnedHelpUrl', () => {
  it('rewrites inherited Hermes and Nous product destinations', () => {
    expect(hebriOwnedHelpUrl('https://hermes-agent.nousresearch.com/docs/user-guide/messaging/teams')).toBe(
      HEBRI_MESSAGING_GUIDE_URL
    )
    expect(hebriOwnedHelpUrl('https://portal.nousresearch.com/help')).toBe(HEBRI_SITE_URL)
    expect(hebriOwnedHelpUrl('https://github.com/NousResearch/hermes-agent')).toBe(HEBRI_REPOSITORY_URL)
    expect(hebriOwnedHelpUrl('https://github.com/NousResearch/hermes-agent/issues/123')).toBe(HEBRI_SUPPORT_URL)
  })

  it('keeps third-party platform documentation unchanged', () => {
    const vendor = 'https://discord.com/developers/applications'

    expect(hebriOwnedHelpUrl(vendor)).toBe(vendor)
  })

  it('keeps an absent guide absent', () => {
    expect(hebriOwnedHelpUrl('')).toBeNull()
    expect(hebriOwnedHelpUrl(undefined)).toBeNull()
  })
})
