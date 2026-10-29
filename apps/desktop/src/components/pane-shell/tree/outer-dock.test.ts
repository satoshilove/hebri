import { afterEach, expect, it } from 'vitest'

import { registry } from '@/contrib/registry'

import { allPaneIds, findGroupOfPane, group, split } from './model'
import { $layoutTree, adoptContributedPanes, resetEnforcedDocks } from './store'

const disposers: (() => void)[] = []
afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose())
  $layoutTree.set(null)
  resetEnforcedDocks()
})

it('repairs persisted middle chrome and keeps it outside new browser tiles without losing its collapsed state', () => {
  for (const id of ['workspace', 'browser', 'jobs']) {
    disposers.push(
      registry.register({
        id,
        area: 'panes',
        title: id,
        render: () => null,
        data: {
          placement: 'main',
          ...(id === 'jobs' ? { dock: { pane: 'workspace', pos: 'right', outerRight: true, enforce: true } } : {})
        }
      })
    )
  }

  const jobs = group(['jobs'], { minimized: true })
  $layoutTree.set(split('row', [group(['workspace']), jobs, group(['browser'])], [3, 1, 4]))
  adoptContributedPanes()
  expect(allPaneIds($layoutTree.get()!)).toEqual(['workspace', 'browser', 'jobs'])
  expect(findGroupOfPane($layoutTree.get()!, 'jobs')).toBe(jobs)
  const settled = $layoutTree.get()
  adoptContributedPanes()
  expect($layoutTree.get()).toBe(settled)

  // A fresh layout, with the standing pane not yet adopted.
  $layoutTree.set(split('row', [group(['workspace']), group(['browser'])], [3, 4]))
  adoptContributedPanes()
  expect(allPaneIds($layoutTree.get()!)).toEqual(['workspace', 'browser', 'jobs'])
})
