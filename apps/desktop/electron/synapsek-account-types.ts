/** Renderer-safe account projection. Never put credentials in this contract. */
export interface AccountSnapshot {
  userId: string
  email: string
  billing: { plan: string; sku: string | null; status: string; includedMonthlyCredits: number; accessSource: string }
}
export interface SynapsekAccountView {
  state: 'signed_out' | 'signed_in' | 'unavailable'
  account?: AccountSnapshot
}
