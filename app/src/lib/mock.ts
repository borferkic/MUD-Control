// Datos de ejemplo para desarrollar la interfaz en el navegador.
// Agregar ?problema a la URL simula que Windows rompio las conexiones.
import type { Access, ActivityEvent, Backup, FixStep, Profile, Session, Settings, SpecialistSettings, Status } from './types'

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))
const now = Date.now()
const ago = (min: number) => new Date(now - min * 60000).toISOString()

let broken = typeof location !== 'undefined' && location.search.includes('problema')
let sessions: Session[] = [
  { id: 1, user: 'Administrador', client: 'este equipo', since: ago(300), active: true, isSelf: true },
  { id: 2, user: 'Ana Torres', client: 'PC-VENTAS', since: ago(120), active: true, isSelf: false },
  { id: 3, user: 'Luis Pérez', client: 'LAPTOP-07', since: ago(40), active: true, isSelf: false },
  { id: 4, user: 'Marta Ruiz', client: 'PC-03', since: ago(1440), active: false, isSelf: false },
]
let access: Access[] = [
  { name: 'atorres', fullName: 'Ana Torres' },
  { name: 'lperez', fullName: 'Luis Pérez' },
]
const localUsers: Access[] = [...access, { name: 'mruiz', fullName: 'Marta Ruiz' }, { name: 'contabilidad', fullName: 'Contabilidad' }]
let settings: Settings = { autoFix: true, notify: true, autoUpdateApp: true, startWithWindows: true }
let spec: SpecialistSettings = { port: 3389, maxSessions: 20, nla: false, firewallPrivate: true, firewallPublic: false, shadow: true }
let paused: string | null = '2026-12-18'
let backups: Backup[] = [
  { id: 'b3', date: ago(30), reason: 'Antes de arreglar las conexiones', reasonKey: 'fix' },
  { id: 'b2', date: ago(2 * 1440), reason: 'Antes de actualizar los datos de Windows', reasonKey: 'before_ini' },
  { id: 'b1', date: ago(3 * 1440), reason: 'Guardada a mano', reasonKey: 'manual' },
]
let activity: ActivityEvent[] = [
  { date: ago(29), kind: 'ok', text: 'Las conexiones múltiples volvieron a funcionar', key: 'fix_ok' },
  { date: ago(30), kind: 'backup', text: 'Se guardó una copia de seguridad antes de arreglar', key: 'fix_backup' },
  { date: ago(1000), kind: 'access', text: 'Se dio acceso a Luis Pérez', key: 'grant', params: { name: 'Luis Pérez' } },
  { date: ago(1010), kind: 'export', text: 'Se exportó la configuración', key: 'export' },
  { date: ago(2 * 1440), kind: 'warning', text: 'Windows se actualizó: solo podía entrar una persona', key: 'fix_pending' },
  { date: ago(3 * 1440), kind: 'message', text: 'Se envió un aviso a todos los conectados', key: 'msg_all' },
]
const log = (kind: ActivityEvent['kind'], text: string) => activity.unshift({ date: new Date().toISOString(), kind, text })

function status(): Status {
  return {
    health: broken ? 'broken' : 'ok',
    connected: broken ? 1 : sessions.filter(s => s.active).length,
    maxSessions: spec.maxSessions,
    updatesPausedUntil: paused,
    lastBackup: backups[0]?.date ?? null,
    accessCount: access.length,
    technical: {
      termsrvVersion: '10.0.26100.9818', iniSupported: !broken, windowsVersion: 'Windows 11 Pro 25H2',
      serviceRunning: true, wrapperLoaded: true, profile: 'Oficina central',
      port: spec.port, nla: spec.nla, firewallPrivate: spec.firewallPrivate, firewallPublic: spec.firewallPublic, shadow: spec.shadow,
    },
  }
}

export async function mock(cmd: string, a: Record<string, any> = {}): Promise<unknown> {
  await wait(250)
  switch (cmd) {
    case 'get_status': return status()
    case 'run_fix': {
      const steps: FixStep[] = ['check', 'search', 'backup', 'apply', 'verify']
      for (const s of steps) { window.dispatchEvent(new CustomEvent('mock-fix-step', { detail: s })); await wait(900) }
      backups.unshift({ id: 'b' + Date.now(), date: new Date().toISOString(), reason: 'Antes de arreglar las conexiones' })
      broken = false; log('ok', 'Las conexiones múltiples volvieron a funcionar'); return true
    }
    case 'list_sessions': return sessions
    case 'send_message': log('message', a.id ? `Se envió un mensaje a ${sessions.find(s => s.id === a.id)?.user}` : 'Se envió un aviso a todos los conectados'); return
    case 'logoff_session': { const s = sessions.find(x => x.id === a.id); sessions = sessions.filter(x => x.id !== a.id); log('access', `Se cerró la sesión de ${s?.user}`); return }
    case 'list_access': return access
    case 'list_local_users': return localUsers
    case 'grant_access': { const u = localUsers.find(x => x.name === a.name)!; access = [...access, u]; log('access', `Se dio acceso a ${u.fullName}`); return }
    case 'revoke_access': { const u = access.find(x => x.name === a.name); access = access.filter(x => x.name !== a.name); log('access', `Se quitó el acceso a ${u?.fullName}`); return }
    case 'get_settings': return settings
    case 'save_settings': settings = a.settings; return
    case 'pause_updates': paused = a.until; log('update', a.until ? `Actualizaciones de Windows en pausa hasta el ${a.until}` : 'Se reanudaron las actualizaciónes de Windows'); return
    case 'list_backups': return backups
    case 'create_backup': { const b = { id: 'b' + Date.now(), date: new Date().toISOString(), reason: a.reason }; backups = [b, ...backups]; log('backup', 'Se guardó una copia de seguridad'); return b }
    case 'restore_backup': log('backup', 'Se volvió a una copia de seguridad'); return
    case 'backup_to_folder': log('backup', 'Se guardó una copia en E:\\'); return 'E:\\MUD-Control'
    case 'export_config': log('export', 'Se exportó la configuración'); return 'C:\\Users\\Usuario\\Documents\\mud-control.json'
    case 'import_config': log('export', 'Se importó una configuración'); return { missing: [] }
    case 'get_activity': return activity.slice(0, a.limit ?? 50)
    case 'support_report': return 'C:\\Users\\Usuario\\Desktop\\informe-mud-control.zip'
    case 'get_specialist': return spec
    case 'save_specialist': spec = a.settings; log('update', 'Se cambiaron opciones de conexión y seguridad'); return
    case 'list_profiles': return [
      { name: 'Oficina central', active: true, port: spec.port, maxSessions: spec.maxSessions, accessCount: access.length },
      { name: 'Predeterminado', active: false, port: 3389, maxSessions: 20, accessCount: 0 },
    ] satisfies Profile[]
    case 'profile_from_machine': case 'activate_profile': return
    case 'update_ini': case 'generate_offsets': await wait(1200); return true
    case 'repair_windows_update': case 'open_logs': case 'reinstall': case 'uninstall': await wait(800); return
  }
  throw new Error(`Comando desconocido: ${cmd}`)
}
