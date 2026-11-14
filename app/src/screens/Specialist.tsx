import {
  IconCpu, IconDownload, IconEdit, IconEyeOff, IconFileText, IconPackage, IconPlus, IconRefresh, IconSwitchHorizontal, IconTool, IconTrash,
} from '@tabler/icons-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useApp } from '../App'
import { Button, Confirm, Prompt, Row, Switch, tone, type Tone } from '../components/ui'
import { api } from '../lib/backend'
import { useT } from '../lib/i18n'
import type { SpecialistSettings } from '../lib/types'
import { useLoad } from '../lib/useLoad'

function Group({ n, title, t, children }: { n: number; title: string; t: Tone; children: ReactNode }) {
  return (
    <>
      <div style={tone(t)} className="mb-1.5 mt-3.5 flex items-center gap-2 text-xs font-semibold text-[var(--k)]">
        <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] bg-[color-mix(in_srgb,var(--k)_20%,transparent)]">{n}</span>
        {title}
      </div>
      {children}
    </>
  )
}

type Danger = 'reinstall' | 'uninstall' | 'offsets' | null

export function Specialist({ onHide }: { onHide: () => void }) {
  const { notify, fail, refresh } = useApp()
  const { t } = useT()
  const [status, reloadStatus] = useLoad(api.status)
  const [loaded] = useLoad(api.specialist)
  const [profiles, reloadProfiles] = useLoad(api.profiles)
  const [cfg, setCfg] = useState<SpecialistSettings | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [danger, setDanger] = useState<Danger>(null)
  const [newProfile, setNewProfile] = useState(false)
  useEffect(() => { if (loaded) setCfg(loaded) }, [loaded])

  const set = (p: Partial<SpecialistSettings>) => { setCfg(c => c && { ...c, ...p }); setDirty(true) }
  const run = (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key)
    fn().then(() => { notify(ok); reloadStatus(); refresh() }).catch(fail).finally(() => setBusy(null))
  }
  const tech = status?.technical
  const active = profiles?.find(p => p.active)

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold"><IconTool size={16} style={{ color: 'var(--purple)' }} />{t('spec.title')}</span>
        <Button icon={IconEyeOff} onClick={onHide}>{t('hide')}</Button>
      </div>
      <p className="muted mt-1">{t('spec.sub')}</p>

      <Group n={1} title={t('spec.g1')} t="cyan">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ['termsrv.dll', tech?.termsrvVersion],
            [t('spec.ini'), tech ? t(tech.iniSupported ? 'spec.iniOk' : 'spec.iniNo') : undefined],
            ['Windows', tech?.windowsVersion],
            [t('spec.service'), tech ? t(tech.serviceRunning ? 'spec.running' : 'spec.stopped') : undefined],
            ['RDP Wrapper', tech ? t(tech.wrapperLoaded ? 'spec.loaded' : 'spec.notLoaded') : undefined],
            [t('spec.profile'), tech?.profile],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-side px-2.5 py-1.5">
              <span className="muted">{k}</span>
              <b className="block font-mono text-xs font-semibold">{v ?? '…'}</b>
            </div>
          ))}
        </div>
      </Group>

      <Group n={2} title={t('spec.g2')} t="yellow">
        <div className="card">
          <Row title={t('spec.port')}>
            <input className="field" type="number" min={1} max={65535} value={cfg?.port ?? ''} onChange={e => set({ port: Number(e.target.value) })} />
          </Row>
          <Row title={t('spec.max')}>
            <input className="field" type="number" min={1} max={999} value={cfg?.maxSessions ?? ''} onChange={e => set({ maxSessions: Number(e.target.value) })} />
          </Row>
          <Row title={t('spec.nla')} hint={t('spec.nlaHint')}>
            <Switch label={t('spec.nla')} tone="yellow" checked={cfg?.nla ?? false} onChange={v => set({ nla: v })} />
          </Row>
          <Row title={t('spec.fwPrivate')}>
            <Switch label={t('spec.fwPrivate')} tone="yellow" checked={cfg?.firewallPrivate ?? false} onChange={v => set({ firewallPrivate: v })} />
          </Row>
          <Row title={t('spec.fwPublic')} hint={t('spec.fwPublicHint')}>
            <Switch label={t('spec.fwPublic')} tone="yellow" checked={cfg?.firewallPublic ?? false} onChange={v => set({ firewallPublic: v })} />
          </Row>
          <Row title={t('spec.shadow')}>
            <Switch label={t('spec.shadow')} tone="yellow" checked={cfg?.shadow ?? false} onChange={v => set({ shadow: v })} />
          </Row>
        </div>
        {dirty && (
          <div className="mt-2 flex justify-end gap-2">
            <Button onClick={() => { setCfg(loaded); setDirty(false) }}>{t('spec.discard')}</Button>
            <Button tone="yellow" lit onClick={() => cfg && run('cfg', () => api.saveSpecialist(cfg).then(() => setDirty(false)), t('spec.applied'))}>
              {t('spec.apply')}
            </Button>
          </div>
        )}
      </Group>

      <Group n={3} title={t('spec.g3')} t="pink">
        <div className="card">
          {profiles?.map(p => (
            <Row key={p.name} title={p.name}
              hint={t('spec.profileHint', { active: p.active ? t('spec.activePrefix') : '', port: p.port, max: p.maxSessions, n: p.accessCount })}>
              {p.active
                ? <Button tone="pink" icon={IconEdit} onClick={() => notify(t('spec.editHint'))}>{t('spec.edit')}</Button>
                : <Button tone="pink" icon={IconSwitchHorizontal} onClick={() => run('p' + p.name, () => api.activateProfile(p.name).then(reloadProfiles), t('spec.profileApplied', { name: p.name }))}>{t('spec.applyProfile')}</Button>}
            </Row>
          ))}
          <Row title={t('spec.newProfile')} hint={active ? t('spec.newProfileHint', { name: active.name }) : undefined}>
            <Button tone="pink" icon={IconPlus} onClick={() => setNewProfile(true)}>{t('spec.new')}</Button>
          </Row>
        </div>
      </Group>

      <Group n={4} title={t('spec.g4')} t="green">
        <div className="card">
          <Row title={t('spec.updateIni')} hint={t('spec.updateIniHint')}>
            <Button tone="green" icon={IconRefresh} disabled={busy === 'ini'} onClick={() => run('ini', api.updateIni, t('spec.updated'))}>{t(busy === 'ini' ? 'spec.updating' : 'spec.update')}</Button>
          </Row>
          <Row title={t('spec.offsets')} hint={t('spec.offsetsHint')}>
            <Button tone="green" icon={IconCpu} disabled={busy === 'off'} onClick={() => setDanger('offsets')}>{t(busy === 'off' ? 'spec.generating' : 'spec.generate')}</Button>
          </Row>
          <Row title={t('spec.wu')} hint={t('spec.wuHint')}>
            <Button tone="green" icon={IconTool} disabled={busy === 'wu'} onClick={() => run('wu', api.repairWindowsUpdate, t('spec.wuDone'))}>{t(busy === 'wu' ? 'spec.repairing' : 'spec.repair')}</Button>
          </Row>
        </div>
      </Group>

      <Group n={5} title={t('spec.g5')} t="purple">
        <div className="card">
          <Row title={t('spec.logs')} hint={t('spec.logsHint')}>
            <Button tone="purple" icon={IconFileText} onClick={() => api.openLogs().catch(fail)}>{t('spec.open')}</Button>
          </Row>
          <Row title={t('spec.report')} hint={t('spec.reportHint')}>
            <Button tone="purple" icon={IconDownload} onClick={() => api.supportReport().then(p => p && notify(t('report.saved', { path: p }))).catch(fail)}>{t('spec.export')}</Button>
          </Row>
        </div>
      </Group>

      <Group n={6} title={t('spec.g6')} t="orange">
        <div className="rounded-xl border px-3.5 py-1" style={{ borderColor: 'color-mix(in srgb, var(--er) 45%, transparent)', background: 'color-mix(in srgb, var(--er) 6%, transparent)' }}>
          <Row title={t('spec.reinstall')} hint={t('spec.reinstallHint')}>
            <Button tone="orange" icon={IconPackage} disabled={busy === 're'} onClick={() => setDanger('reinstall')}>{t('spec.reinstallBtn')}</Button>
          </Row>
          <Row title={t('spec.uninstall')} hint={t('spec.uninstallHint')}>
            <Button tone="er" icon={IconTrash} disabled={busy === 'un'} onClick={() => setDanger('uninstall')}>{t('spec.uninstallBtn')}</Button>
          </Row>
        </div>
      </Group>

      <Confirm open={danger !== null} onOpenChange={o => !o && setDanger(null)} danger={danger === 'uninstall'}
        title={t(danger === 'uninstall' ? 'spec.confirmUninstall' : danger === 'reinstall' ? 'spec.confirmReinstall' : 'spec.confirmOffsets')}
        text={t(danger === 'uninstall' ? 'spec.confirmUninstallText' : danger === 'reinstall' ? 'spec.confirmReinstallText' : 'spec.confirmOffsetsText')}
        action={t(danger === 'uninstall' ? 'spec.uninstallBtn' : danger === 'reinstall' ? 'spec.reinstallBtn' : 'spec.generate')}
        onConfirm={() => {
          if (danger === 'uninstall') run('un', api.uninstall, t('spec.uninstalled'))
          else if (danger === 'reinstall') run('re', api.reinstall, t('spec.reinstalled'))
          else run('off', api.generateOffsets, t('spec.generated'))
        }} />
      <Prompt open={newProfile} onOpenChange={setNewProfile} title={t('spec.newTitle')} label={t('spec.newLabel')}
        placeholder={t('spec.newPlaceholder')} action={t('spec.create')}
        onSubmit={n => run('np', () => api.profileFromMachine(n).then(reloadProfiles), t('spec.created', { name: n }))} />
    </>
  )
}
