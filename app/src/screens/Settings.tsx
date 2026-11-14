import {
  IconArrowBackUp, IconDeviceFloppy, IconEye, IconFileExport, IconFileImport, IconLifebuoy, IconLock, IconShieldCheck, IconUsb,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useApp } from '../App'
import { Button, Confirm, Heading, Row, Switch } from '../components/ui'
import { api, inTauri } from '../lib/backend'
import { when } from '../lib/format'
import { translateReason, useT, type LangPref } from '../lib/i18n'
import type { Backup, Settings } from '../lib/types'
import { useLoad } from '../lib/useLoad'
import { Specialist } from './Specialist'

export function SettingsScreen() {
  const { notify, fail, refresh } = useApp()
  const { t, lang, pref, setPref } = useT()
  const [loaded] = useLoad(api.settings)
  const [status] = useLoad(api.status)
  const [backups, reloadBackups] = useLoad(api.backups)
  const [s, setS] = useState<Settings | null>(null)
  const [restore, setRestore] = useState<Backup | null>(null)
  const [spec, setSpec] = useState(!inTauri && location.search.includes('especialistas'))
  const [pause, setPause] = useState('')
  useEffect(() => { if (loaded) setS(loaded) }, [loaded])
  useEffect(() => { setPause(status?.updatesPausedUntil ?? '') }, [status?.updatesPausedUntil])

  const save = (patch: Partial<Settings>) => {
    if (!s) return
    const next = { ...s, ...patch }
    setS(next)
    api.saveSettings(next).catch(fail)
  }
  const done = (msg: string) => () => { notify(msg); reloadBackups(); refresh() }

  return (
    <>
      <Heading title={t('set.title')} sub={t('set.sub')} />
      <div className="card">
        <Row title={t('set.autoFix')}>
          <Switch label={t('set.autoFix')} tone="green" checked={s?.autoFix ?? false} onChange={v => save({ autoFix: v })} />
        </Row>
        <Row title={t('set.notify')}>
          <Switch label={t('set.notify')} tone="cyan" checked={s?.notify ?? false} onChange={v => save({ notify: v })} />
        </Row>
        <Row title={t('set.pause')} hint={pause ? undefined : t('set.pauseNone')}>
          <input type="date" lang={lang} className="field w-[140px]" style={{ color: 'var(--orange)' }} value={pause}
            min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
            onChange={e => {
              setPause(e.target.value)
              api.pauseUpdates(e.target.value || null)
                .then(() => notify(t(e.target.value ? 'set.paused' : 'set.resumed'))).catch(fail)
            }} />
        </Row>
        <Row title={t('set.autoUpdate')}>
          <Switch label={t('set.autoUpdate')} tone="purple" checked={s?.autoUpdateApp ?? false} onChange={v => save({ autoUpdateApp: v })} />
        </Row>
        <Row title={t('set.language')}>
          <select className="field" style={{ color: 'var(--cyan)' }} value={pref} aria-label={t('set.language')}
            onChange={e => setPref(e.target.value as LangPref)}>
            <option value="auto">{t('lang.auto')}</option>
            <option value="es">{t('lang.es')}</option>
            <option value="en">{t('lang.en')}</option>
          </select>
        </Row>
        <Row title={t('set.help')} hint={t('set.helpSub')}>
          <Button tone="purple" icon={IconLifebuoy} onClick={() => api.supportReport().then(p => p && notify(t('report.saved', { path: p }))).catch(fail)}>
            {t('set.helpBtn')}
          </Button>
        </Row>
      </div>

      <h3 className="mb-0.5 mt-4 text-[13px] font-semibold">{t('bk.title')}</h3>
      <p className="muted mb-3">{t('bk.sub')}</p>
      <div className="card">
        {backups?.length === 0 && <div className="row muted">{t('bk.none')}</div>}
        {backups?.slice(0, 5).map(b => (
          <Row key={b.id} icon={IconShieldCheck} iconTone="pink" title={<span className="font-semibold">{when(b.date, lang)}</span>} hint={translateReason(lang, b.reasonKey, b.reasonParams, b.reason)}>
            <Button tone="cyan" icon={IconArrowBackUp} onClick={() => setRestore(b)}>{t('bk.restore')}</Button>
          </Row>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button tone="pink" icon={IconDeviceFloppy} onClick={() => api.createBackup(t('bk.manual')).then(done(t('bk.saved'))).catch(fail)}>{t('bk.save')}</Button>
        <Button tone="yellow" icon={IconUsb} onClick={() => api.backupToFolder(t('file.folder')).then(p => p && done(t('bk.savedIn', { path: p }))()).catch(fail)}>{t('bk.usb')}</Button>
        <Button tone="cyan" icon={IconFileExport} onClick={() => api.exportConfig(t('file.filter')).then(p => p && done(t('bk.exported', { path: p }))()).catch(fail)}>{t('bk.export')}</Button>
        <Button tone="green" icon={IconFileImport} onClick={() => api.importConfig(t('file.filter')).then(missing => missing && done(missing.length
          ? t('bk.importedMissing', { list: missing.join(', ') })
          : t('bk.imported'))()).catch(fail)}>{t('bk.import')}</Button>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-line px-3.5 py-3">
        {spec ? <Specialist onHide={() => setSpec(false)} /> : (
          <div className="flex items-center justify-between">
            <span className="muted flex items-center gap-1.5"><IconLock size={14} />{t('spec.locked')}</span>
            <Button icon={IconEye} onClick={() => setSpec(true)}>{t('show')}</Button>
          </div>
        )}
      </div>

      <Confirm open={restore !== null} onOpenChange={o => !o && setRestore(null)}
        title={t('bk.confirmTitle')} action={t('bk.confirmAction')}
        text={t('bk.confirmText', { when: restore ? when(restore.date, lang).toLowerCase() : '' })}
        onConfirm={() => restore && api.restoreBackup(restore.id).then(done(t('bk.restored'))).catch(fail)} />
    </>
  )
}
