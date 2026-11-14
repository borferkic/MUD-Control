// Reune en src-tauri/resources lo que la app instala y usa sin Internet:
//   scripts/  -> mud/scripts/*.bat
//   kit/      -> mud/kit (kit.ps1, instalar.bat, LEEME) + payload.zip con el rdpwrap.ini actual
//   rdpwrap.ini -> res/rdpwrap.ini (datos para "Arreglar ahora" sin conexion)
// backend.ps1 ya vive en src-tauri/resources.
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const repo = resolve(import.meta.dirname, '..', '..')
const out = resolve(import.meta.dirname, '..', 'src-tauri', 'resources')
const ps = (cmd) => execFileSync('powershell.exe', ['-NoProfile', '-Command', cmd], { stdio: 'inherit' })

for (const d of ['scripts', 'kit']) rmSync(join(out, d), { recursive: true, force: true })
mkdirSync(join(out, 'scripts'), { recursive: true })
mkdirSync(join(out, 'kit'), { recursive: true })

cpSync(join(repo, 'mud', 'scripts'), join(out, 'scripts'), { recursive: true })
for (const f of ['kit.ps1', 'instalar.bat', 'LEEME.txt']) copyFileSync(join(repo, 'mud', 'kit', f), join(out, 'kit', f))
for (const f of ['fix-rdpwrap.bat', 'reparar-windowsupdate.bat', 'bloquear-actualizaciones.bat'])
  copyFileSync(join(repo, 'mud', 'scripts', f), join(out, 'kit', f))
copyFileSync(join(repo, 'res', 'rdpwrap.ini'), join(out, 'rdpwrap.ini'))

// payload.zip: binarios de RDP Wrapper + el rdpwrap.ini mas reciente del repo
const src = join(repo, 'mud', 'payload')
const srcZip = join(repo, 'mud', 'payload.zip')
const tmp = mkdtempSync(join(tmpdir(), 'mud-payload-'))
if (existsSync(src)) cpSync(src, tmp, { recursive: true })
else if (existsSync(srcZip)) ps(`Expand-Archive -LiteralPath '${srcZip}' -DestinationPath '${tmp}' -Force`)
else throw new Error('No hay payload: falta mud/payload/')
copyFileSync(join(repo, 'res', 'rdpwrap.ini'), join(tmp, 'rdpwrap.ini'))
ps(`Compress-Archive -Path '${tmp}\\*' -DestinationPath '${join(out, 'kit', 'payload.zip')}' -Force`)
rmSync(tmp, { recursive: true, force: true })
console.log('Recursos preparados en', out)
