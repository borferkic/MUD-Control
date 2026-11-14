import {
  IconAlertTriangle, IconCalendarPause, IconCircle, IconCircleCheck, IconKey, IconLifebuoy,
  IconLoader2, IconMessage, IconShieldCheck, IconUsers, type Icon,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useApp, type TabId } from '../App'
import { Button, Prompt, tone, type Tone } from '../components/ui'
import { api, onFixStep } from '../lib/backend'
import { longDate, when } from '../lib/format'
import { useT, type Key } from '../lib/i18n'
import type { FixStep } from '../lib/types'
import { useLoad } from '../lib/useLoad'

const STEPS: FixStep[] = ['check', 'search', 'backup', 'apply', 'verify']

function Tile({ icon: I, title, sub, t, to, onClick }: { icon: Icon; title: string; sub: string; t: Tone; to?: TabId; onClick?: () => void }) {
  const { go } = useApp()
  return (
    <button onClick={onClick ?? (() => to && go(to))} style={tone(t)}
      className="cursor-pointer rounded-xl border p-3 text-left transition-colors hover:border-[var(--k)] border-[color-mix(in_srgb,var(--k)_35%,var(--line))] bg-[color-mix(in_srgb,var(--k)_7%,var(--card))]">
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--k)_18%,transparent)]">
        <I size={19} stroke={1.8} style={{ color: 'var(--k)' }} />
      </span>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="muted">{sub}</div>
    </button>
  )
}

export function Home() {
  const { notify, fail, refresh } = useApp()
  const { t, lang } = useT()
  const [status, reload] = useLoad(api.status, 30000)
  const [step, setStep] = useState<number>(-1)
  const [msg, setMsg] = useState(false)

  useEffect(() => {
    let off: (() => void) | undefined
    onFixStep(s => setStep(STEPS.indexOf(s))).then(f => (off = f))
    return () => off?.()
  }, [])

  async function fix() {
    setStep(0)
    try {
      const ok = await api.fix()
      notify(t(ok ? 'home.fixed' : 'home.notFixed'))
    } catch (e) { fail(e) }
    setStep(-1); reload(); refresh()
  }

  async function check() {
    await reload()
    notify(t('home.checked'))
  }

  if (step >= 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-5">
        <p className="m-0 text-center text-base font-semibold">{t('home.fixing')}</p>
        <p className="muted mb-3 text-center">{t('home.fixingSub')}</p>
        {STEPS.map((k, i) => {
          const I = i < step ? IconCircleCheck : i === step ? IconLoader2 : IconCircle
          return (
            <div key={k} className="row">
              <span className="flex items-center gap-2.5">
                <I size={18} className={i === step ? 'animate-spin' : ''}
                  style={{ color: i < step ? 'var(--ok)' : i === step ? 'var(--ac)' : 'var(--mu)' }} />
                {t(`step.${k}` as Key)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  if (!status) return <p className="muted">{t('home.checking')}</p>

  const bad = status.health !== 'ok'
  const n = status.connected
  const title = t(status.health === 'not_installed' ? 'home.notInstalled' : bad ? 'home.broken' : 'home.ok')
  const sub = status.health === 'not_installed' ? t('home.notInstalledSub')
    : bad ? t('home.brokenSub')
    : t('home.okSub', { n, people: t(n === 1 ? 'people.connected.one' : 'people.connected.many'), max: status.maxSessions })

  return (
    <>
      <div className="flex items-center gap-3.5 rounded-2xl border bg-card p-[18px]" style={{ borderColor: bad ? 'var(--wa)' : 'var(--line)' }}>
        {bad ? <IconAlertTriangle size={34} style={{ color: 'var(--wa)' }} /> : <IconCircleCheck size={34} style={{ color: 'var(--ok)' }} />}
        <div className="flex-1"><p className="m-0 text-base font-semibold">{title}</p><p className="muted m-0">{sub}</p></div>
        {status.health !== 'not_installed' && (
          <Button primary onClick={bad ? fix : check}>{t(bad ? 'home.fix' : 'home.check')}</Button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Tile icon={IconUsers} title={t('tile.connected')} t="cyan" to="conectados"
          sub={t('tile.connectedSub', { n, people: t(n === 1 ? 'people.one' : 'people.many') })} />
        <Tile icon={IconKey} title={t('tile.access')} t="yellow" to="accesos"
          sub={status.accessCount === 1 ? t('tile.accessSub.one') : t('tile.accessSub.many', { n: status.accessCount })} />
        <Tile icon={IconMessage} title={t('tile.notify')} t="green" sub={t('tile.notifySub')} onClick={() => setMsg(true)} />
        <Tile icon={IconShieldCheck} title={t('tile.backups')} t="pink" to="ajustes"
          sub={status.lastBackup ? t('tile.backupsSub', { when: when(status.lastBackup, lang).toLowerCase() }) : t('tile.backupsNone')} />
        <Tile icon={IconCalendarPause} title={t('tile.updates')} t="orange" to="ajustes"
          sub={status.updatesPausedUntil ? t('tile.updatesPaused', { date: longDate(status.updatesPausedUntil, lang) }) : t('tile.updatesOn')} />
        <Tile icon={IconLifebuoy} title={t('tile.help')} t="purple" sub={t('tile.helpSub')}
          onClick={() => api.supportReport().then(p => p && notify(t('report.saved', { path: p }))).catch(fail)} />
      </div>
      <Prompt open={msg} onOpenChange={setMsg} title={t('notify.title')} label={t('notify.label')}
        placeholder={t('notify.placeholder')} action={t('send')}
        onSubmit={v => api.sendMessage(null, v).then(() => notify(t('notify.sent'))).catch(fail)} />
    </>
  )
}
