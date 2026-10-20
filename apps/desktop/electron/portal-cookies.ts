export interface PortalCookie {
  name: string
  value: string
}

// Synapsek's server-managed session is a host-only opaque credential. Legacy
// NAS/Privy names remain readable for self-managed/upstream compatibility, but
// new Hebri releases use the Synapsek cookie when the portal cutover is enabled.
// Provider-routing hints and logout identifiers are not credentials; gateway
// cookies are unrelated.
const ACCESS_COOKIES = [
  '__Host-synapsek_session',
  'nas-session',
  '__Host-privy-token',
  '__Secure-privy-token',
  'privy-token'
]

const REFRESH_COOKIES = ['nas-refresh', 'privy-session', 'privy-refresh-token']

export function portalAccessCookies(cookies: PortalCookie[]): PortalCookie[] {
  return cookies.filter(cookie => cookie?.value && ACCESS_COOKIES.includes(cookie.name))
}

export function cookiesHavePortalAccessToken(cookies: unknown): boolean {
  return Array.isArray(cookies) && portalAccessCookies(cookies).length > 0
}

export function cookiesHavePortalSession(cookies: unknown): boolean {
  return (
    cookiesHavePortalAccessToken(cookies) ||
    (Array.isArray(cookies) && cookies.some(cookie => cookie?.value && REFRESH_COOKIES.includes(cookie.name)))
  )
}
