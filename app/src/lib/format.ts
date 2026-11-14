// Fechas en lenguaje cotidiano ("hace 2 horas", "Hoy, 9:14").
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const time = new Intl.DateTimeFormat('es', { hour: 'numeric', minute: '2-digit' })
const day = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' })
const dayShort = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

export function ago(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return rtf.format(-min, 'minute')
  if (min < 1440) return rtf.format(-Math.round(min / 60), 'hour')
  return rtf.format(-Math.round(min / 1440), 'day')
}

export function when(iso: string, short = false): string {
  const d = new Date(iso)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  if (diff === 0) return `Hoy, ${time.format(d)}`
  if (diff === 1) return `Ayer, ${time.format(d)}`
  return short ? `${dayShort.format(d)}, ${time.format(d)}` : day.format(d)
}

export function longDate(yyyyMmDd: string): string {
  return day.format(new Date(yyyyMmDd + 'T12:00:00'))
}

export function initials(name: string): string {
  const p = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/)
  return ((p[0]?.[0] ?? '?') + (p[1]?.[0] ?? p[0]?.[1] ?? '')).toUpperCase()
}
