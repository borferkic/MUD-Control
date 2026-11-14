// npm run release: compila, firma y deja en <repo>/releases el instalador y latest.json.
// La clave privada vive fuera del repo: %USERPROFILE%\.tauri\mud-control.key
// (o en TAURI_SIGNING_PRIVATE_KEY). Sin ella las apps instaladas no aceptan la actualizacion.
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const app = resolve(import.meta.dirname, '..')
const conf = JSON.parse(readFileSync(join(app, 'src-tauri', 'tauri.conf.json'), 'utf8'))
const v = conf.version

const key = join(homedir(), '.tauri', 'mud-control.key')
if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  if (!existsSync(key)) throw new Error(`Falta la clave de firma: ${key}`)
  process.env.TAURI_SIGNING_PRIVATE_KEY = readFileSync(key, 'utf8')
}
process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ??= ''

execSync('npx tauri build', { cwd: app, stdio: 'inherit', env: process.env })

const name = `MUD-Control_${v}_x64-setup.exe`
const built = join(app, 'src-tauri', 'target', 'release', 'bundle', 'nsis', `${conf.productName}_${v}_x64-setup.exe`)
const out = resolve(app, '..', 'releases')
mkdirSync(out, { recursive: true })
copyFileSync(built, join(out, name))
const latest = {
  version: v,
  notes: `MUD Control ${v}`,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature: readFileSync(`${built}.sig`, 'utf8').trim(),
      url: `https://github.com/borferkic/MUD-Control/releases/download/v${v}/${name}`,
    },
  },
}
writeFileSync(join(out, 'latest.json'), JSON.stringify(latest, null, 2) + '\n')
console.log(`Listo en ${out}: ${name} y latest.json (sube los dos a la release v${v})`)
