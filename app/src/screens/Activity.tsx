import {
  IconAlertTriangle, IconCircleCheck, IconFileExport, IconKey, IconList, IconMessage, IconRefresh, IconShieldCheck, IconX, type Icon,
} from '@tabler/icons-react'
import { useCallback, useState } from 'react'
import { Button } from '../components/ui'
import { api } from '../lib/backend'
import { when } from '../lib/format'
import { translateActivity, useT } from '../lib/i18n'
import type { ActivityKind } from '../lib/types'
import { useLoad } from '../lib/useLoad'

const ICON: Record<ActivityKind, [Icon, string]> = {
  ok: [IconCircleCheck, 'green'], backup: [IconShieldCheck, 'pink'], access: [IconKey, 'yellow'],
  export: [IconFileExport, 'cyan'], warning: [IconAlertTriangle, 'orange'], message: [IconMessage, 'green'],
  update: [IconRefresh, 'purple'], error: [IconX, 'er'],
}

export function Activity() {
  const { t, lang } = useT()
  const [all, setAll] = useState(false)
  const load = useCallback(() => api.activity(all ? 500 : 6), [all])
  const [list] = useLoad(load, 15000)
  return (
    <div className="rounded-xl border bg-side px-4 py-3" style={{ borderColor: 'color-mix(in srgb, var(--purple) 40%, var(--line))' }}>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold">{t('act.title')}</span>
        <Button tone="purple" icon={IconList} onClick={() => setAll(v => !v)}>{t(all ? 'act.less' : 'act.all')}</Button>
      </div>
      <div className={all ? 'max-h-72 overflow-y-auto' : ''}>
        {list?.length === 0 && <p className="muted">{t('act.none')}</p>}
        {list?.map((e, i) => {
          const [I, c] = ICON[e.kind] ?? ICON.update
          return (
            <div key={i} className="flex items-start gap-2.5 py-1.5">
              <I size={16} className="mt-0.5 shrink-0" style={{ color: `var(--${c})` }} />
              <span className="flex-1">{translateActivity(lang, e.key, e.params, e.text)}</span>
              <span className="muted whitespace-nowrap">{when(e.date, lang, true)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
