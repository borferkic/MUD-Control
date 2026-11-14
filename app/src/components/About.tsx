// Ventana "Acerca de", igual que en BT Device Battery Info.
import * as RDialog from '@radix-ui/react-dialog'
import {
  IconBrandInstagram, IconBrandLinkedin, IconBrandPatreon, IconBrandPaypal, IconBrandTwitch, IconX, type Icon,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { inTauri } from '../lib/backend'
import pkg from '../../package.json'
import { Logo } from './Logo'
import { Button } from './ui'
import { useT } from '../lib/i18n'

const SOCIAL: [Icon, string, string][] = [
  [IconBrandInstagram, 'Instagram', 'https://www.instagram.com/borissdk/'],
  [IconBrandTwitch, 'Twitch', 'https://www.twitch.tv/borizillaTV'],
  [IconBrandLinkedin, 'LinkedIn', 'https://www.linkedin.com/in/borissdk/'],
]
const SUPPORT: [Icon, string, string][] = [
  [IconBrandPaypal, 'PayPal', 'https://paypal.me/borissdk'],
  [IconBrandPatreon, 'Patreon', 'https://patreon.com/borissdk'],
]

async function openUrl(url: string) {
  if (!inTauri) { window.open(url, '_blank', 'noopener'); return }
  const { openUrl } = await import('@tauri-apps/plugin-opener')
  await openUrl(url)
}

function Links({ items }: { items: [Icon, string, string][] }) {
  return (
    <div className="flex justify-center">
      {items.map(([I, label, url]) => (
        <button key={label} onClick={() => openUrl(url)} className="group flex w-[76px] cursor-pointer flex-col items-center gap-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-side transition-colors group-hover:border-ac">
            <I size={15} stroke={1.8} className="text-fg" />
          </span>
          <span className="text-xs text-fg group-hover:text-ac">{label}</span>
        </button>
      ))}
    </div>
  )
}

export function About({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useT()
  const [version, setVersion] = useState(pkg.version)
  useEffect(() => {
    if (!inTauri || !open) return
    import('@tauri-apps/api/app').then(m => m.getVersion()).then(setVersion).catch(() => {})
  }, [open])

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 bg-black/50" />
        <RDialog.Content onOpenAutoFocus={e => e.preventDefault()} className="fixed left-1/2 top-1/2 w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-card px-6 pb-6 pt-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <RDialog.Title className="m-0 text-[15px] font-semibold">{t('about.title')}</RDialog.Title>
            <RDialog.Close aria-label={t('close')} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-mu hover:bg-side hover:text-fg">
              <IconX size={16} />
            </RDialog.Close>
          </div>

          <div className="mt-5 flex flex-col items-center">
            <Logo size={76} />
            <div className="mt-3 text-xl font-semibold">MUD Control</div>
            <div className="muted text-[11px]">Multi User Desktops Control · {t('about.version', { v: version })}</div>
          </div>

          <RDialog.Description className="muted mt-4 text-center">
            {t('about.desc')}
          </RDialog.Description>

          <div className="mt-6"><Links items={SOCIAL} /></div>
          <p className="muted mt-4 text-center">{t('about.support')}</p>
          <div className="mt-3"><Links items={SUPPORT} /></div>

          <p className="muted mt-6 text-center text-[11px]">
            © 2026 Boris SdK · {t('about.based')} (Stas'M Corp., Apache-2.0)
          </p>
          <div className="mt-3 flex justify-center">
            <RDialog.Close asChild><Button>{t('close')}</Button></RDialog.Close>
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  )
}
