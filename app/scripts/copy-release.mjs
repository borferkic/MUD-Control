// Copia el instalador recien compilado a <repo>/releases para no buscarlo en target/.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const nsis = resolve(import.meta.dirname, '..', 'src-tauri', 'target', 'release', 'bundle', 'nsis')
const out = resolve(import.meta.dirname, '..', '..', 'releases')
mkdirSync(out, { recursive: true })
for (const f of readdirSync(nsis).filter(f => f.endsWith('-setup.exe'))) {
  copyFileSync(join(nsis, f), join(out, f))
  console.log('Instalador en', join(out, f))
}
