import { useState } from 'react'

import { useI18n } from '@/i18n'
import { MonitorPlay, ShieldLock, Wrench } from '@/lib/icons'

import { ComputerUsePanel } from './computer-use-panel'
import { SectionHeading, SettingsContent, SettingsSection } from './primitives'
import { ToolsetConfigPanel } from './toolset-config-panel'

export function ComputerControlSettings() {
  const { t } = useI18n()
  const copy = t.settings.computerUse
  const [revision, setRevision] = useState(0)
  const refresh = () => setRevision(value => value + 1)

  return (
    <SettingsContent>
      <SectionHeading icon={MonitorPlay} page title={copy.title} />
      <p className="mb-4 max-w-3xl text-sm leading-6 text-(--ui-text-secondary)">{copy.intro}</p>

      <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-3">
        <div className="flex items-start gap-2">
          <ShieldLock className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">{copy.consentTitle}</p>
            <p className="mt-1 text-xs leading-5 text-(--ui-text-tertiary)">{copy.consentDesc}</p>
          </div>
        </div>
      </div>

      <SettingsSection icon={MonitorPlay} title={copy.readinessTitle}>
        <ComputerUsePanel key={`status:${revision}`} onConfiguredChange={refresh} />
      </SettingsSection>

      <SettingsSection icon={Wrench} title={copy.backendTitle}>
        <p className="mb-3 text-xs leading-5 text-(--ui-text-tertiary)">{copy.backendDesc}</p>
        <ToolsetConfigPanel key={`provider:${revision}`} onConfiguredChange={refresh} toolset="computer_use" />
      </SettingsSection>
    </SettingsContent>
  )
}
