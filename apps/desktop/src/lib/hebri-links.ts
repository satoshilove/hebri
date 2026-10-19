export const HEBRI_SITE_URL = 'https://synapseklabs.org'
export const HEBRI_REPOSITORY_URL = 'https://github.com/satoshilove/hebri'
export const HEBRI_SUPPORT_URL = `${HEBRI_REPOSITORY_URL}/issues`
export const HEBRI_MESSAGING_GUIDE_URL = `${HEBRI_REPOSITORY_URL}#cli-vs-messaging-quick-reference`

const UPSTREAM_DOCS_HOSTS = new Set(['hermes-agent.nousresearch.com'])

/**
 * Messaging metadata comes from the inherited gateway and can still describe
 * the product as "Hermes". Keep technical identifiers such as the lowercase
 * `hermes` CLI intact, while ensuring user-facing product prose names Hebri.
 */
export function hebriOwnedProductCopy(value: string | null | undefined): string {
  return (value || '').replace(/\bHermes Agent\b/g, 'Hebri').replace(/\bHermes\b/g, 'Hebri')
}

/**
 * Keep vendor-owned setup links intact, but never send a Hebri-owned help
 * action to the upstream Hermes/Nous product by accident.
 */
export function hebriOwnedHelpUrl(value: string | null | undefined): string | null {
  const raw = value?.trim()

  if (!raw) {
    return null
  }

  try {
    const url = new URL(raw)
    const host = url.hostname.toLowerCase()

    if (UPSTREAM_DOCS_HOSTS.has(host)) {
      return HEBRI_MESSAGING_GUIDE_URL
    }

    if (host === 'portal.nousresearch.com') {
      return HEBRI_SITE_URL
    }

    if (host === 'github.com' && url.pathname.toLowerCase().startsWith('/nousresearch/hermes-agent')) {
      return url.pathname.toLowerCase().includes('/issues') ? HEBRI_SUPPORT_URL : HEBRI_REPOSITORY_URL
    }
  } catch {
    // The validated opener owns final protocol validation. Preserve unknown
    // vendor values here so this branding layer never rewrites their meaning.
  }

  return raw
}
