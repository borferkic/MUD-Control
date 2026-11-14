// Barra de titulo propia (la ventana no tiene marco de Windows).
import { IconMinus, IconX } from '@tabler/icons-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { inTauri } from '../lib/backend'
import { Logo } from './Logo'

const win = () => (inTauri ? getCurrentWindow() : null)

export function TitleBar() {
  return (
    <header data-tauri-drag-region className="flex h-[42px] shrink-0 items-center gap-2.5 border-b border-line bg-side pl-3.5">
      <Logo size={20} />
      <span data-tauri-drag-region className="text-[15px] font-semibold tracking-wide">MUD Control</span>
      <div className="ml-auto flex h-full">
        <button aria-label="Minimizar" title="Minimizar" onClick={() => win()?.minimize()}
          className="flex h-full w-[46px] items-center justify-center text-mu hover:bg-[color-mix(in_srgb,var(--fg)_10%,transparent)] hover:text-fg">
          <IconMinus size={16} />
        </button>
        <button aria-label="Cerrar" title="Cerrar" onClick={() => win()?.close()}
          className="flex h-full w-[46px] items-center justify-center text-mu hover:bg-[#e81123] hover:text-white">
          <IconX size={16} />
        </button>
      </div>
    </header>
  )
}
