// Tipos compartidos entre la interfaz y el backend (src-tauri/src/model.rs).

export type Health = 'ok' | 'broken' | 'not_installed' | 'unknown'

export interface Status {
  health: Health
  connected: number
  maxSessions: number
  /** Fecha AAAA-MM-DD hasta la que estan pausadas las actualizaciones, o null */
  updatesPausedUntil: string | null
  lastBackup: string | null
  accessCount: number
  technical: Technical
}

/** Solo se muestra en "Opciones para especialistas". */
export interface Technical {
  termsrvVersion: string
  iniSupported: boolean
  windowsVersion: string
  serviceRunning: boolean
  wrapperLoaded: boolean
  profile: string
  port: number
  nla: boolean
  firewallPrivate: boolean
  firewallPublic: boolean
  shadow: boolean
}

export interface Session {
  id: number
  user: string
  client: string
  /** ISO 8601 */
  since: string
  active: boolean
  isSelf: boolean
}

export interface Access {
  name: string
  fullName: string
}

export interface Backup {
  id: string
  date: string
  reason: string
}

export type ActivityKind = 'ok' | 'backup' | 'access' | 'export' | 'warning' | 'message' | 'update' | 'error'

export interface ActivityEvent {
  date: string
  kind: ActivityKind
  text: string
}

export interface Settings {
  autoFix: boolean
  notify: boolean
  autoUpdateApp: boolean
}

export interface SpecialistSettings {
  port: number
  maxSessions: number
  nla: boolean
  firewallPrivate: boolean
  firewallPublic: boolean
  shadow: boolean
}

export interface Profile {
  name: string
  active: boolean
  port: number
  maxSessions: number
  accessCount: number
}

export type FixStep = 'check' | 'search' | 'backup' | 'apply' | 'verify'
