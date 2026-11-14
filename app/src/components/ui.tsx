// Componentes base sobre Radix Primitives, con estilo Synthwave.
import * as RSwitch from '@radix-ui/react-switch'
import * as RDialog from '@radix-ui/react-dialog'
import { clsx } from 'clsx'
import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { useT } from '../lib/i18n'
import type { Icon } from '@tabler/icons-react'

export type Tone = 'pink' | 'cyan' | 'green' | 'yellow' | 'orange' | 'purple' | 'er'
export const tone = (t?: Tone): CSSProperties | undefined => (t ? ({ '--k': `var(--${t})` } as CSSProperties) : undefined)

export function Button({ children, icon: I, tone: t, lit, primary, className, ...p }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: Icon; tone?: Tone; lit?: boolean; primary?: boolean }) {
  return (
    <button {...p} style={{ ...tone(t), ...p.style }}
      className={clsx(primary ? 'btn btn-primary' : 'btn', lit && 'btn-lit', className)}>
      {I && <I stroke={1.8} />}{children}
    </button>
  )
}

export function Switch({ checked, onChange, tone: t = 'pink', label }:
  { checked: boolean; onChange: (v: boolean) => void; tone?: Tone; label: string }) {
  return (
    <RSwitch.Root checked={checked} onCheckedChange={onChange} aria-label={label} style={tone(t)}
      className="relative h-[18px] w-8 shrink-0 cursor-pointer rounded-full bg-line transition-colors data-[state=checked]:bg-[var(--k)]">
      <RSwitch.Thumb className="block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-on transition-transform data-[state=checked]:translate-x-[16px]" />
    </RSwitch.Root>
  )
}

export function Row({ title, hint, icon: I, iconTone, children }:
  { title: ReactNode; hint?: ReactNode; icon?: Icon; iconTone?: Tone; children?: ReactNode }) {
  return (
    <div className="row">
      <div className="flex min-w-0 items-center gap-2.5">
        {I && <I size={18} stroke={1.8} style={{ color: `var(--${iconTone ?? 'pink'})` }} className="shrink-0" />}
        <div className="min-w-0"><div>{title}</div>{hint && <div className="muted">{hint}</div>}</div>
      </div>
      {children && <div className="flex shrink-0 items-center gap-1.5">{children}</div>}
    </div>
  )
}

export function Avatar({ text, tone: t = 'pink' }: { text: string; tone?: Tone }) {
  return (
    <span style={tone(t)} className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-semibold text-[var(--k)] bg-[color-mix(in_srgb,var(--k)_20%,transparent)]">
      {text}
    </span>
  )
}

export function Heading({ title, sub }: { title: string; sub?: string }) {
  return <div className="mb-3"><h2 className="m-0 text-base font-semibold">{title}</h2>{sub && <p className="muted m-0">{sub}</p>}</div>
}

/** Dialogo de confirmacion para acciones que molestan a alguien o no se deshacen. */
export function Confirm({ open, onOpenChange, title, text, action, danger, onConfirm }:
  { open: boolean; onOpenChange: (v: boolean) => void; title: string; text: ReactNode; action: string; danger?: boolean; onConfirm: () => void }) {
  const { t } = useT()
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 bg-black/50" />
        <RDialog.Content className="fixed left-1/2 top-1/2 w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-card p-5 shadow-2xl">
          <RDialog.Title className="m-0 text-base font-semibold">{title}</RDialog.Title>
          <RDialog.Description className="muted mt-1.5 text-[13px]">{text}</RDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <RDialog.Close asChild><Button>{t('cancel')}</Button></RDialog.Close>
            <Button tone={danger ? 'er' : 'pink'} lit onClick={() => { onConfirm(); onOpenChange(false) }}>{action}</Button>
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}

/** Pide un texto (mensaje, nombre de perfil...). */
export function Prompt({ open, onOpenChange, title, label, placeholder, action, onSubmit }:
  { open: boolean; onOpenChange: (v: boolean) => void; title: string; label: string; placeholder?: string; action: string; onSubmit: (v: string) => void }) {
  const { t } = useT()
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 bg-black/50" />
        <RDialog.Content className="fixed left-1/2 top-1/2 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-card p-5 shadow-2xl">
          <form onSubmit={e => {
            e.preventDefault()
            const v = String(new FormData(e.currentTarget).get('v') ?? '').trim()
            if (v) { onSubmit(v); onOpenChange(false) }
          }}>
            <RDialog.Title className="m-0 text-base font-semibold">{title}</RDialog.Title>
            <RDialog.Description className="muted mt-1.5">{label}</RDialog.Description>
            <textarea name="v" required autoFocus placeholder={placeholder} rows={3}
              className="mt-3 w-full resize-none rounded-lg border border-line bg-transparent p-2.5 text-[13px] text-fg" />
            <div className="mt-4 flex justify-end gap-2">
              <RDialog.Close asChild><Button type="button">{t('cancel')}</Button></RDialog.Close>
              <Button type="submit" tone="green" lit>{action}</Button>
            </div>
          </form>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}

/** Aviso breve abajo de la ventana. */
export function Toast({ text, onDone }: { text: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!text) return
    const t = setTimeout(onDone, 3200)
    return () => clearTimeout(t)
  }, [text, onDone])
  if (!text) return null
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-line bg-side px-4 py-2.5 shadow-xl">
      {text}
    </div>
  )
}
