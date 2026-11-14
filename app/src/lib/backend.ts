// Puente con el backend. Dentro de Tauri llama a los comandos Rust; en el
// navegador (npm run dev) usa datos de ejemplo para poder disenar sin Windows.
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type {
  Access, ActivityEvent, Backup, FixStep, Profile, Session, Settings, SpecialistSettings, Status,
} from './types'
import { mock } from './mock'

export const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// Todas las acciones pasan por un unico comando Rust que ejecuta backend.ps1.
function call<T>(action: string, args?: Record<string, unknown>): Promise<T> {
  if (inTauri) return invoke<T>('backend', { action, args: args ?? {} })
  return mock(action, args) as Promise<T>
}

const today = () => new Date().toISOString().slice(0, 10)

// Dialogos de archivo nativos; en el navegador se usa una ruta de ejemplo.
const jsonFilter = (name: string) => [{ name, extensions: ['json'] }]
async function pickSave(defaultPath: string, filterName: string): Promise<string | null> {
  if (!inTauri) return defaultPath
  const { save } = await import('@tauri-apps/plugin-dialog')
  return save({ defaultPath, filters: jsonFilter(filterName) })
}
async function pickOpen(filterName: string): Promise<string | null> {
  if (!inTauri) return 'mud-control.json'
  const { open } = await import('@tauri-apps/plugin-dialog')
  const r = await open({ multiple: false, filters: jsonFilter(filterName) })
  return typeof r === 'string' ? r : null
}
async function pickFolder(title: string): Promise<string | null> {
  if (!inTauri) return 'E:\\'
  const { open } = await import('@tauri-apps/plugin-dialog')
  const r = await open({ directory: true, title })
  return typeof r === 'string' ? r : null
}

export const api = {
  status: () => call<Status>('get_status'),
  /** Repara RDP. Emite 'fix-step' con cada paso; devuelve true si quedo funcionando. */
  fix: () => call<boolean>('run_fix'),

  sessions: () => call<Session[]>('list_sessions'),
  sendMessage: (id: number | null, text: string) => call<void>('send_message', { id, text }),
  logoff: (id: number) => call<void>('logoff_session', { id }),

  access: () => call<Access[]>('list_access'),
  localUsers: () => call<Access[]>('list_local_users'),
  grantAccess: (name: string) => call<void>('grant_access', { name }),
  revokeAccess: (name: string) => call<void>('revoke_access', { name }),

  settings: () => call<Settings>('get_settings'),
  saveSettings: (s: Settings) => call<void>('save_settings', { settings: s }),
  pauseUpdates: (until: string | null) => call<void>('pause_updates', { until }),

  backups: () => call<Backup[]>('list_backups'),
  createBackup: (reason: string) => call<Backup>('create_backup', { reason }),
  restoreBackup: (id: string) => call<void>('restore_backup', { id }),
  /** Devuelve la carpeta donde quedo la copia, o null si se cancelo. */
  backupToFolder: async (title: string) => { const p = await pickFolder(title); return p ? call<string>('backup_to_folder', { path: p }) : null },
  exportConfig: async (filterName: string) => { const p = await pickSave(`mud-control-${today()}.json`, filterName); return p ? call<string>('export_config', { path: p }) : null },
  /** Devuelve las cuentas del archivo que no existen en este equipo, o null si se cancelo. */
  importConfig: async (filterName: string) => { const p = await pickOpen(filterName); return p ? (await call<{ missing: string[] }>('import_config', { path: p })).missing : null },

  activity: (limit = 50) => call<ActivityEvent[]>('get_activity', { limit }),
  supportReport: () => call<string | null>('support_report'),

  specialist: () => call<SpecialistSettings>('get_specialist'),
  saveSpecialist: (s: SpecialistSettings) => call<void>('save_specialist', { settings: s }),
  profiles: () => call<Profile[]>('list_profiles'),
  profileFromMachine: (name: string) => call<void>('profile_from_machine', { name }),
  activateProfile: (name: string) => call<void>('activate_profile', { name }),
  updateIni: () => call<boolean>('update_ini'),
  generateOffsets: () => call<boolean>('generate_offsets'),
  repairWindowsUpdate: () => call<void>('repair_windows_update'),
  openLogs: () => call<void>('open_logs'),
  reinstall: () => call<void>('reinstall'),
  uninstall: () => call<void>('uninstall'),
}

export async function onFixStep(cb: (step: FixStep) => void): Promise<() => void> {
  if (inTauri) return listen<FixStep>('fix-step', e => cb(e.payload))
  const h = (e: Event) => cb((e as CustomEvent<FixStep>).detail)
  window.addEventListener('mock-fix-step', h)
  return () => window.removeEventListener('mock-fix-step', h)
}
