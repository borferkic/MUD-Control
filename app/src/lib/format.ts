// Fechas en lenguaje cotidiano ("hace 2 horas", "Hoy, 9:14") en el idioma de la app.
import { translate, type Lang } from './i18n'

const loc = (l: Lang) => (l === 'es' ? 'es' : 'en')

export function ago(iso: string, lang: Lang): string {
  const rtf = new Intl.RelativeTimeFormat(loc(lang), { numeric: 'auto' })
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return translate(lang, 'date.now')
  if (min < 60) return rtf.format(-min, 'minute')
  if (min < 1440) return rtf.format(-Math.round(min / 60), 'hour')
  return rtf.format(-Math.round(min / 1440), 'day')
}

/** Duracion sin "hace": "2 horas" / "2 hours". */
export function duration(iso: string, lang: Lang): string {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  const [v, unit] = min < 60 ? [min, 'minute'] : min < 1440 ? [Math.round(min / 60), 'hour'] : [Math.round(min / 1440), 'day']
  return new Intl.NumberFormat(loc(lang), { style: 'unit', unit, unitDisplay: 'long' }).format(v)
}

export function when(iso: string, lang: Lang, short = false): string {
  const d = new Date(iso)
  const time = new Intl.DateTimeFormat(loc(lang), { hour: 'numeric', minute: '2-digit' }).format(d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  if (diff === 0) return translate(lang, 'date.today', { time })
  if (diff === 1) return translate(lang, 'date.yesterday', { time })
  const day = new Intl.DateTimeFormat(loc(lang), { day: 'numeric', month: short ? 'short' : 'long' }).format(d)
  return short ? `${day}, ${time}` : day
}

export function longDate(yyyyMmDd: string, lang: Lang): string {
  return new Intl.DateTimeFormat(loc(lang), { day: 'numeric', month: 'long' }).format(new Date(yyyyMmDd + 'T12:00:00'))
}

export function initials(name: string): string {
  const p = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/)
  return ((p[0]?.[0] ?? '?') + (p[1]?.[0] ?? p[0]?.[1] ?? '')).toUpperCase()
}
