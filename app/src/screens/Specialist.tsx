import {
  IconCpu, IconDownload, IconEdit, IconEyeOff, IconFileText, IconPackage, IconPlus, IconRefresh, IconSwitchHorizontal, IconTool, IconTrash,
} from '@tabler/icons-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useApp } from '../App'
import { Button, Confirm, Prompt, Row, Switch, tone, type Tone } from '../components/ui'
import { api } from '../lib/backend'
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
  const t = status?.technical
  const active = profiles?.find(p => p.active)

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold"><IconTool size={16} style={{ color: 'var(--purple)' }} />Opciones para especialistas</span>
        <Button icon={IconEyeOff} onClick={onHide}>Ocultar</Button>
      </div>
      <p className="muted mt-1">Cada cambio guarda antes una copia de seguridad y queda en la actividad.</p>

      <Group n={1} title="Estado del sistema" t="cyan">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ['termsrv.dll', t?.termsrvVersion],
            ['Datos (INI)', t ? (t.iniSupported ? 'Compatible' : 'Sin soporte') : undefined],
            ['Windows', t?.windowsVersion],
            ['Servicio', t ? (t.serviceRunning ? 'En marcha' : 'Detenido') : undefined],
            ['RDP Wrapper', t ? (t.wrapperLoaded ? 'Cargado' : 'No cargado') : undefined],
            ['Perfil activo', t?.profile],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-side px-2.5 py-1.5">
              <span className="muted">{k}</span>
              <b className="block font-mono text-xs font-semibold">{v ?? '…'}</b>
            </div>
          ))}
        </div>
      </Group>

      <Group n={2} title="Conexión y seguridad" t="yellow">
        <div className="card">
          <Row title="Puerto RDP">
            <input className="field" type="number" min={1} max={65535} value={cfg?.port ?? ''} onChange={e => set({ port: Number(e.target.value) })} />
          </Row>
          <Row title="Máximo de sesiones a la vez">
            <input className="field" type="number" min={1} max={999} value={cfg?.maxSessions ?? ''} onChange={e => set({ maxSessions: Number(e.target.value) })} />
          </Row>
          <Row title="Autenticación NLA" hint="Recomendado: activada">
            <Switch label="NLA" tone="yellow" checked={cfg?.nla ?? false} onChange={v => set({ nla: v })} />
          </Row>
          <Row title="Firewall en redes de dominio y privadas">
            <Switch label="Firewall privadas" tone="yellow" checked={cfg?.firewallPrivate ?? false} onChange={v => set({ firewallPrivate: v })} />
          </Row>
          <Row title="Firewall en redes públicas" hint="No recomendado">
            <Switch label="Firewall públicas" tone="yellow" checked={cfg?.firewallPublic ?? false} onChange={v => set({ firewallPublic: v })} />
          </Row>
          <Row title="Ver sesiones con permiso del usuario">
            <Switch label="Ver sesiones" tone="yellow" checked={cfg?.shadow ?? false} onChange={v => set({ shadow: v })} />
          </Row>
        </div>
        {dirty && (
          <div className="mt-2 flex justify-end gap-2">
            <Button onClick={() => { setCfg(loaded); setDirty(false) }}>Descartar</Button>
            <Button tone="yellow" lit onClick={() => cfg && run('cfg', () => api.saveSpecialist(cfg).then(() => setDirty(false)), 'Cambios aplicados')}>
              Aplicar cambios
            </Button>
          </div>
        )}
      </Group>

      <Group n={3} title="Perfiles de cliente" t="pink">
        <div className="card">
          {profiles?.map(p => (
            <Row key={p.name} title={p.name} hint={`${p.active ? 'Activo · ' : ''}${p.port} · ${p.maxSessions} sesiones · ${p.accessCount} accesos`}>
              {p.active
                ? <Button tone="pink" icon={IconEdit} onClick={() => notify('Edita el perfil desde "Conexión y seguridad" y "Accesos"')}>Editar</Button>
                : <Button tone="pink" icon={IconSwitchHorizontal} onClick={() => run('p' + p.name, () => api.activateProfile(p.name).then(reloadProfiles), `Perfil ${p.name} aplicado`)}>Aplicar</Button>}
            </Row>
          ))}
          <Row title="Crear perfil desde este equipo" hint={active ? `Copia la configuración actual (${active.name})` : undefined}>
            <Button tone="pink" icon={IconPlus} onClick={() => setNewProfile(true)}>Nuevo</Button>
          </Row>
        </div>
      </Group>

      <Group n={4} title="Reparación avanzada" t="green">
        <div className="card">
          <Row title="Actualizar datos de Windows" hint="Descarga el INI y conserva las secciones locales">
            <Button tone="green" icon={IconRefresh} disabled={busy === 'ini'} onClick={() => run('ini', api.updateIni, 'Datos actualizados')}>{busy === 'ini' ? 'Actualizando…' : 'Actualizar'}</Button>
          </Row>
          <Row title="Generar offsets en este equipo" hint="Cuando aún no hay datos públicos. Defender puede bloquearlo">
            <Button tone="green" icon={IconCpu} disabled={busy === 'off'} onClick={() => setDanger('offsets')}>{busy === 'off' ? 'Generando…' : 'Generar'}</Button>
          </Row>
          <Row title="Reparar Windows Update" hint="DISM, SFC y limpieza de caché. Puede tardar media hora">
            <Button tone="green" icon={IconTool} disabled={busy === 'wu'} onClick={() => run('wu', api.repairWindowsUpdate, 'Reparación de Windows Update terminada')}>{busy === 'wu' ? 'Reparando…' : 'Reparar'}</Button>
          </Row>
        </div>
      </Group>

      <Group n={5} title="Diagnóstico" t="purple">
        <div className="card">
          <Row title="Registro técnico" hint="Logs completos de los scripts">
            <Button tone="purple" icon={IconFileText} onClick={() => api.openLogs().catch(fail)}>Abrir</Button>
          </Row>
          <Row title="Informe de diagnóstico" hint="Para enviar a otro especialista">
            <Button tone="purple" icon={IconDownload} onClick={() => api.supportReport().then(p => p && notify(`Informe guardado en ${p}`)).catch(fail)}>Exportar</Button>
          </Row>
        </div>
      </Group>

      <Group n={6} title="Instalación" t="orange">
        <div className="rounded-xl border px-3.5 py-1" style={{ borderColor: 'color-mix(in srgb, var(--er) 45%, transparent)', background: 'color-mix(in srgb, var(--er) 6%, transparent)' }}>
          <Row title="Reinstalar RDP Wrapper" hint="Deja todo como recién instalado">
            <Button tone="orange" icon={IconPackage} disabled={busy === 're'} onClick={() => setDanger('reinstall')}>Reinstalar</Button>
          </Row>
          <Row title="Desinstalar RDP Wrapper" hint="El equipo vuelve a permitir una sola persona">
            <Button tone="er" icon={IconTrash} disabled={busy === 'un'} onClick={() => setDanger('uninstall')}>Desinstalar</Button>
          </Row>
        </div>
      </Group>

      <Confirm open={danger !== null} onOpenChange={o => !o && setDanger(null)} danger={danger === 'uninstall'}
        title={danger === 'uninstall' ? '¿Desinstalar RDP Wrapper?' : danger === 'reinstall' ? '¿Reinstalar RDP Wrapper?' : '¿Generar offsets en este equipo?'}
        text={danger === 'uninstall' ? 'Solo podrá entrar una persona a la vez. Las personas conectadas se desconectarán.'
          : danger === 'reinstall' ? 'Las personas conectadas se desconectarán unos segundos. Se guarda una copia antes.'
          : 'Descarga RDPWrapOffsetFinder (llccd). Microsoft Defender suele marcarlo como amenaza; úsalo solo si confías en la herramienta.'}
        action={danger === 'uninstall' ? 'Desinstalar' : danger === 'reinstall' ? 'Reinstalar' : 'Generar'}
        onConfirm={() => {
          if (danger === 'uninstall') run('un', api.uninstall, 'RDP Wrapper desinstalado')
          else if (danger === 'reinstall') run('re', api.reinstall, 'RDP Wrapper reinstalado')
          else run('off', api.generateOffsets, 'Offsets generados')
        }} />
      <Prompt open={newProfile} onOpenChange={setNewProfile} title="Nuevo perfil" label="Nombre del cliente o del equipo"
        placeholder="Oficina contable" action="Crear"
        onSubmit={n => run('np', () => api.profileFromMachine(n).then(reloadProfiles), `Perfil ${n} creado`)} />
    </>
  )
}
