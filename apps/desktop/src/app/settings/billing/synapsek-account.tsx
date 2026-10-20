import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

import type { SynapsekAccountView } from '../../../../electron/synapsek-account-types'

import { accountCopy } from './synapsek-account-copy'
import { usageCopy } from './synapsek-usage-copy'

const messages: Record<string, string> = {
  not_available: 'Synapsek desktop sign-in is not enabled on this server yet.',
  secure_storage_unavailable: 'Enable your operating system credential store to sign in securely.',
  stored_session_unavailable:
    'The saved session cannot be opened. Unlock your operating system credential store and retry.',
  reauthentication_required: 'Your session needs attention. Retry sign-out when the service is available.',
  sign_out_before_switching: 'Sign out before connecting another account.',
  revocation_incomplete: 'Device revocation has not fully completed. Retry sign-out.',
  callback_unavailable: 'The sign-in callback port is unavailable. Close another sign-in attempt and retry.'
}

export function SynapsekAccountSettings() {
  const { locale } = useI18n()
  const copy = accountCopy[locale]
  const usageText = usageCopy[locale]
  const [view, setView] = useState<SynapsekAccountView>({ state: 'signed_out' })
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bridge = window.hermesDesktop?.synapsekAccount
  useEffect(() => {
    let alive = true

    if (bridge) {
      void bridge('status')
        .then(result => {
          if (!alive) {
            return
          }

          if (result.ok && result.value) {
            setAvailable(true)
            setView(result.value)
          } else if (!result.ok && result.code !== 'not_available') {
            setAvailable(true)
            setError(result.code)
          }
        })
        .catch(() => {
          if (alive) {
            setAvailable(true)
            setError('account_operation_failed')
          }
        })
    }

    return () => {
      alive = false
    }
  }, [bridge])

  if (!bridge || !available) {
    return null
  }

  async function run(operation: 'status' | 'signIn' | 'signOut' | 'openBilling' | 'forgetLocal') {
    setBusy(true)
    setError('')

    try {
      const result = await bridge!(operation)

      if (!result.ok && result.code === 'not_available') {
        setAvailable(false)
      } else if (!result.ok) {
        setError(result.code)
      } else if (result.value) {
        setView(result.value)
      }
    } catch {
      setError('account_operation_failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label={copy.title} className="m-4 space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">{copy.title}</h2>
      <p className="text-sm text-muted-foreground">{copy.introduction}</p>
      {view.account && (
        <p className="text-sm">
          {view.account.email} · {view.account.billing.sku || view.account.billing.plan} · {view.account.billing.status}
          <br />
          {copy.credits}: {view.account.billing.includedMonthlyCredits.toLocaleString(locale)}
        </p>
      )}
      {view.account?.usage && (
        <dl className="text-sm">
          {(
            [
              ['remaining', 'remainingIncludedCredits'],
              ['held', 'reservedIncludedCredits'],
              ['purchased', 'purchasedAvailableCredits'],
              ['tokens', 'monthTokens'],
              ['debt', 'debtCredits']
            ] as const
          ).map(([label, key]) => (
            <div className="flex justify-between gap-4" key={key}>
              <dt>{usageText[label]}</dt>
              <dd>{view.account!.usage![key].toLocaleString(locale)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-sm text-muted-foreground">
        {view.account?.managedInferenceEnabled ? usageText.enabled : copy.preview}
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {locale === 'en' ? messages[error] || copy.error : copy.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void run(view.state === 'signed_in' ? 'signOut' : 'signIn')}>
          {busy ? copy.working : view.state === 'signed_in' ? copy.signOut : copy.signIn}
        </Button>
        <Button disabled={busy} onClick={() => void run('status')} variant="outline">
          {copy.refresh}
        </Button>
        <Button disabled={busy} onClick={() => void run('openBilling')} variant="outline">
          {copy.manage}
        </Button>
        {error && (
          <Button disabled={busy} onClick={() => void run('forgetLocal')} variant="outline">
            {copy.remove}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-muted-foreground">{copy.removeNotice}</p>}
    </section>
  )
}
