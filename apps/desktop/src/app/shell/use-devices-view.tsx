import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useState } from 'react'

import { deviceOperation, type DeviceSnapshot } from '@/api/devices'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { $activeConnectionId } from '@/store/connections'
import { $activeGatewayProfile } from '@/store/profile'

import { devicesCopy } from './devices-copy'
import { DevicesPanel } from './devices-panel'

export function useDevicesView() {
  const { locale } = useI18n()
  const copy = devicesCopy[locale]
  const profile = useStore($activeGatewayProfile) || 'default'
  const connection = useStore($activeConnectionId)
  const [state, setState] = useState<{ profile: string; value: DeviceSnapshot } | null>(null)
  const [failure, setFailure] = useState<'locked' | 'outdated' | 'unavailable' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const snapshot = state?.profile === profile ? state.value : null

  const setSnapshot = useCallback(
    (value: DeviceSnapshot | null) => setState(value ? { profile, value } : null),
    [profile]
  )

  const local = connection === 'local'

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    setSnapshot(null)
    setFailure(null)

    if (!local) {
      return
    }

    async function refresh() {
      let enabled = false

      try {
        const next = await deviceOperation<DeviceSnapshot>(profile, 'status')

        if (!stopped) {
          setSnapshot(next)
          setFailure(null)
          enabled = next.enabled
        }
      } catch (error) {
        if (!stopped) {
          setSnapshot(null)
          const message = error instanceof Error ? error.message : ''
          setFailure(
            ['secure_storage_required', 'device_identity_locked'].includes(message)
              ? 'locked'
              : /\b(404|405)\b/.test(message)
                ? 'outdated'
                : 'unavailable'
          )
        }
      }

      if (!stopped) {
        timer = setTimeout(() => void refresh(), enabled ? 10000 : 30000)
      }
    }

    void refresh()

    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [profile, local, setSnapshot, attempt])

  return {
    id: 'devices',
    label: `${copy.title}${snapshot?.enabled ? ` · ${snapshot.nearby.length}` : ''}`,
    hidden: !local,
    title: snapshot?.enabled ? copy.running : copy.disabled,
    toggleLabel: copy.title,
    variant: 'menu' as const,
    menuClassName: 'w-96 p-0',
    menuContent: snapshot ? (
      <DevicesPanel changed={setSnapshot} initial={snapshot} key={profile} profile={profile} />
    ) : (
      <div className="space-y-2 p-4" role="status">
        <p>{failure ? copy[failure] : copy.loading}</p>
        {failure && (
          <Button onClick={() => setAttempt(value => value + 1)} size="sm">
            {copy.refresh}
          </Button>
        )}
      </div>
    )
  }
}
