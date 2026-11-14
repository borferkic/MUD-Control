import {
  IconAlertTriangle, IconCalendarPause, IconCircle, IconCircleCheck, IconKey, IconLifebuoy,
  IconLoader2, IconMessage, IconShieldCheck, IconUsers, type Icon,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useApp, type TabId } from '../App'
import { Button, Prompt, tone, type Tone } from '../components/ui'
import { api, onFixStep } from '../lib/backend'
import { longDate, when } from '../lib/format'
import type { FixStep } from '../lib/types'
import { useLoad } from '../lib/useLoad'

const STEPS: [FixStep, string][] = [
  ['check', 'Revisando el equipo'],
  ['search', 'Buscando la solución'],
  ['backup', 'Guardando una copia de seguridad'],
  ['apply', 'Aplicando la solución'],
  ['verify', 'Comprobando que funciona'],
]

function Tile({ icon: I, title, sub, t, to, onClick }: { icon: Icon; title: string; sub: string; t: Tone; to?: TabId; onClick?: () => void }) {
  const { go } = useApp()
  return (
    <button onClick={onClick ?? (() => to && go(to))} style={tone(t)}
      className="cursor-pointer rounded-xl border p-3 text-left transition-colors hover:border-[var(--k)] border-[color-mix(in_srgb,var(--k)_35%,var(--line))] bg-[color-mix(in_srgb,var(--k)_7%,var(--card))]">
      <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--k)_18%,transparent)]">
        <I size={19} stroke={1.8} style={{ color: 'var(--k)' }} />
      </span>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="muted">{sub}</div>
    </button>
  )
}

export function Home() {
  const { notify, fail, refresh } = useApp()
  const [status, reload] = useLoad(api.status, 30000)
  const [step, setStep] = useState<number>(-1)
  const [msg, setMsg] = useState(false)

  useEffect(() => {
    let off: (() => void) | undefined
    onFixStep(s => setStep(STEPS.findIndex(x => x[0] === s))).then(f => (off = f))
    return () => off?.()
  }, [])

  async function fix() {
    setStep(0)
    try {
      const ok = await api.fix()
      notify(ok ? 'Listo: ya pueden entrar varias personas otra vez' : 'No se pudo arreglar todavía. Se volverá a intentar solo.')
    } catch (e) { fail(e) }
    setStep(-1); reload(); refresh()
  }

  async function check() {
    await reload()
    notify('Comprobado')
  }

  if (step >= 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-5">
        <p className="m-0 text-center text-base font-semibold">Arreglando…</p>
        <p className="muted mb-3 text-center">Las personas conectadas se desconectarán unos segundos y podrán volver a entrar.</p>
        {STEPS.map(([k, label], i) => {
          const I = i < step ? IconCircleCheck : i === step ? IconLoader2 : IconCircle
          return (
            <div key={k} className="row">
              <span className="flex items-center gap-2.5">
                <I size={18} className={i === step ? 'animate-spin' : ''}
                  style={{ color: i < step ? 'var(--ok)' : i === step ? 'var(--ac)' : 'var(--mu)' }} />
                {label}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  if (!status) return <p className="muted">Revisando el equipo…</p>

  const bad = status.health !== 'ok'
  const title = status.health === 'not_installed' ? 'MUD Control aún no está instalado en este equipo'
    : bad ? 'Ahora solo puede entrar una persona' : 'Todo funciona bien'
  const sub = status.health === 'not_installed' ? 'Pide a tu especialista que haga la instalación.'
    : bad ? 'Windows se actualizó y desactivó las conexiones múltiples. Se arregla con un clic.'
    : `${status.connected} ${status.connected === 1 ? 'persona conectada' : 'personas conectadas'} ahora · pueden entrar hasta ${status.maxSessions} a la vez`

  return (
    <>
      <div className="flex items-center gap-3.5 rounded-2xl border bg-card p-[18px]" style={{ borderColor: bad ? 'var(--wa)' : 'var(--line)' }}>
        {bad ? <IconAlertTriangle size={34} style={{ color: 'var(--wa)' }} /> : <IconCircleCheck size={34} style={{ color: 'var(--ok)' }} />}
        <div className="flex-1"><p className="m-0 text-base font-semibold">{title}</p><p className="muted m-0">{sub}</p></div>
        {status.health !== 'not_installed' && (
          <Button primary onClick={bad ? fix : check}>{bad ? 'Arreglar ahora' : 'Comprobar'}</Button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Tile icon={IconUsers} title="Conectados" t="cyan" to="conectados" sub={`${status.connected} ${status.connected === 1 ? 'persona' : 'personas'} ahora`} />
        <Tile icon={IconKey} title="Accesos" t="yellow" to="accesos" sub={`${status.accessCount} ${status.accessCount === 1 ? 'persona puede' : 'personas pueden'} entrar`} />
        <Tile icon={IconMessage} title="Avisar a todos" t="green" sub="Enviar un mensaje" onClick={() => setMsg(true)} />
        <Tile icon={IconShieldCheck} title="Copias de seguridad" t="pink" to="ajustes" sub={status.lastBackup ? `La última es de ${when(status.lastBackup).toLowerCase()}` : 'Aún no hay copias'} />
        <Tile icon={IconCalendarPause} title="Actualizaciones de Windows" t="orange" to="ajustes"
          sub={status.updatesPausedUntil ? `En pausa hasta el ${longDate(status.updatesPausedUntil)}` : 'Se instalan con normalidad'} />
        <Tile icon={IconLifebuoy} title="Pedir ayuda" t="purple" sub="Crear un informe para soporte"
          onClick={() => api.supportReport().then(p => p && notify(`Informe guardado en ${p}`)).catch(fail)} />
      </div>
      <Prompt open={msg} onOpenChange={setMsg} title="Avisar a todos" label="Les aparecerá este mensaje en su pantalla."
        placeholder="En 5 minutos se reinicia el equipo. Guarden su trabajo." action="Enviar"
        onSubmit={t => api.sendMessage(null, t).then(() => notify('Aviso enviado')).catch(fail)} />
    </>
  )
}
