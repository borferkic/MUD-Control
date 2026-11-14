import {
  IconArrowBackUp, IconDeviceFloppy, IconEye, IconFileExport, IconFileImport, IconLifebuoy, IconLock, IconShieldCheck, IconUsb,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useApp } from '../App'
import { Button, Confirm, Heading, Row, Switch } from '../components/ui'
import { api, inTauri } from '../lib/backend'
import { when } from '../lib/format'
import type { Backup, Settings } from '../lib/types'
import { useLoad } from '../lib/useLoad'
import { Specialist } from './Specialist'

export function SettingsScreen() {
  const { notify, fail, refresh } = useApp()
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
      <Heading title="Ajustes" sub="Lo normal es no tener que tocar nada aquí" />
      <div className="card">
        <Row title="Arreglar solo cuando Windows se actualice">
          <Switch label="Arreglar solo" tone="green" checked={s?.autoFix ?? false} onChange={v => save({ autoFix: v })} />
        </Row>
        <Row title="Avisarme si algo deja de funcionar">
          <Switch label="Avisarme" tone="cyan" checked={s?.notify ?? false} onChange={v => save({ notify: v })} />
        </Row>
        <Row title="Pausar actualizaciones de Windows hasta" hint={pause ? undefined : 'Sin pausa: Windows se actualiza con normalidad'}>
          <input type="date" className="field w-[140px]" style={{ color: 'var(--orange)' }} value={pause}
            min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
            onChange={e => {
              setPause(e.target.value)
              api.pauseUpdates(e.target.value || null)
                .then(() => notify(e.target.value ? 'Actualizaciones en pausa' : 'Actualizaciones reanudadas')).catch(fail)
            }} />
        </Row>
        <Row title="Actualizar MUD Control automáticamente">
          <Switch label="Actualizar la app" tone="purple" checked={s?.autoUpdateApp ?? false} onChange={v => save({ autoUpdateApp: v })} />
        </Row>
        <Row title="Pedir ayuda" hint="Crea un archivo con lo necesario para que soporte vea qué pasa">
          <Button tone="purple" icon={IconLifebuoy} onClick={() => api.supportReport().then(p => p && notify(`Informe guardado en ${p}`)).catch(fail)}>
            Crear informe
          </Button>
        </Row>
      </div>

      <h3 className="mb-0.5 mt-4 text-[13px] font-semibold">Copias de seguridad</h3>
      <p className="muted mb-3">Antes de cada cambio se guarda cómo estaba todo. Exportar sirve para llevar los accesos y ajustes a otro equipo (sin contraseñas).</p>
      <div className="card">
        {backups?.length === 0 && <div className="row muted">Todavía no hay copias.</div>}
        {backups?.slice(0, 5).map(b => (
          <Row key={b.id} icon={IconShieldCheck} iconTone="pink" title={<span className="font-semibold">{when(b.date)}</span>} hint={b.reason}>
            <Button tone="cyan" icon={IconArrowBackUp} onClick={() => setRestore(b)}>Volver a esta</Button>
          </Row>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button tone="pink" icon={IconDeviceFloppy} onClick={() => api.createBackup('Guardada a mano').then(done('Copia guardada')).catch(fail)}>Guardar copia</Button>
        <Button tone="yellow" icon={IconUsb} onClick={() => api.backupToFolder().then(p => p && done(`Copia guardada en ${p}`)()).catch(fail)}>Guardar en USB</Button>
        <Button tone="cyan" icon={IconFileExport} onClick={() => api.exportConfig().then(p => p && done(`Configuración exportada a ${p}`)()).catch(fail)}>Exportar configuración</Button>
        <Button tone="green" icon={IconFileImport} onClick={() => api.importConfig().then(missing => missing && done(missing.length
          ? `Configuración importada. Faltan estas cuentas en este equipo: ${missing.join(', ')}`
          : 'Configuración importada')()).catch(fail)}>Importar configuración</Button>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-line px-3.5 py-3">
        {spec ? <Specialist onHide={() => setSpec(false)} /> : (
          <div className="flex items-center justify-between">
            <span className="muted flex items-center gap-1.5"><IconLock size={14} />Opciones para especialistas: estado, conexión, perfiles, reparación y diagnóstico</span>
            <Button icon={IconEye} onClick={() => setSpec(true)}>Mostrar</Button>
          </div>
        )}
      </div>

      <Confirm open={restore !== null} onOpenChange={o => !o && setRestore(null)}
        title="¿Volver a esta copia?" action="Volver a esta copia"
        text={<>Todo quedará como estaba el {restore && when(restore.date).toLowerCase()}. Antes se guarda una copia de cómo está ahora, por si quieres deshacerlo. Las personas conectadas se desconectarán unos segundos.</>}
        onConfirm={() => restore && api.restoreBackup(restore.id).then(done('Listo: se volvió a la copia')).catch(fail)} />
    </>
  )
}
