import { IconLogout, IconMessage, IconPlugOff, IconSpeakerphone } from '@tabler/icons-react'
import { useState } from 'react'
import { useApp } from '../App'
import { Avatar, Button, Confirm, Heading, Prompt, type Tone } from '../components/ui'
import { api } from '../lib/backend'
import { ago, duration, initials } from '../lib/format'
import { useT } from '../lib/i18n'
import type { Session } from '../lib/types'
import { useLoad } from '../lib/useLoad'

const TONES: Tone[] = ['cyan', 'pink', 'yellow', 'green', 'orange', 'purple']

export function Connected() {
  const { notify, fail } = useApp()
  const { t, lang } = useT()
  const [list, reload] = useLoad(api.sessions, 10000)
  const [msgTo, setMsgTo] = useState<Session | 'all' | null>(null)
  const [kick, setKick] = useState<Session | null>(null)

  const describe = (s: Session) =>
    s.isSelf ? t('conn.self', { ago: duration(s.since, lang) })
    : s.active ? t('conn.from', { client: s.client === 'este equipo' ? t('conn.thisPc') : s.client, ago: ago(s.since, lang) })
    : t('conn.left', { ago: ago(s.since, lang) })

  return (
    <>
      <Heading title={t('conn.title')} sub={t('conn.sub')} />
      <div className="card">
        {!list && <div className="row muted">{t('loading')}</div>}
        {list?.length === 0 && <div className="row muted">{t('conn.none')}</div>}
        {list?.map((s, i) => (
          <div key={s.id} className="row">
            <div className="flex items-center gap-2.5">
              <Avatar text={initials(s.user)} tone={s.isSelf ? 'purple' : TONES[i % TONES.length]} />
              <div><div className="font-semibold">{s.user}</div><div className="muted">{describe(s)}</div></div>
            </div>
            {s.isSelf ? <span className="muted w-[262px] text-right">{t('conn.you')}</span>
              : s.active ? (
                <div className="flex gap-1.5">
                  <Button tone="green" icon={IconMessage} onClick={() => setMsgTo(s)}>{t('conn.message')}</Button>
                  <Button tone="orange" icon={IconPlugOff} onClick={() => setKick(s)}>{t('conn.disconnect')}</Button>
                </div>
              ) : <Button tone="orange" icon={IconLogout} onClick={() => setKick(s)}>{t('conn.logoff')}</Button>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button tone="green" icon={IconSpeakerphone} onClick={() => setMsgTo('all')}>{t('conn.notifyAll')}</Button>
      </div>

      <Prompt open={msgTo !== null} onOpenChange={o => !o && setMsgTo(null)}
        title={msgTo === 'all' ? t('notify.title') : t('conn.msgTo', { name: msgTo?.user ?? '' })}
        label={t('conn.msgLabel')} action={t('send')} placeholder={t('conn.msgPlaceholder')}
        onSubmit={v => api.sendMessage(msgTo === 'all' ? null : msgTo!.id, v).then(() => notify(t('conn.msgSent'))).catch(fail)} />
      <Confirm open={kick !== null} onOpenChange={o => !o && setKick(null)}
        title={t(kick?.active ? 'conn.confirmDisconnect' : 'conn.confirmLogoff', { name: kick?.user ?? '' })}
        text={t(kick?.active ? 'conn.confirmDisconnectText' : 'conn.confirmLogoffText')}
        action={t(kick?.active ? 'conn.disconnect' : 'conn.logoff')} danger
        onConfirm={() => kick && api.logoff(kick.id).then(() => { notify(t('conn.closed')); reload() }).catch(fail)} />
    </>
  )
}
