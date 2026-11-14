import { IconLogout, IconMessage, IconPlugOff, IconSpeakerphone } from '@tabler/icons-react'
import { useState } from 'react'
import { useApp } from '../App'
import { Avatar, Button, Confirm, Heading, Prompt, type Tone } from '../components/ui'
import { api } from '../lib/backend'
import { ago, initials } from '../lib/format'
import type { Session } from '../lib/types'
import { useLoad } from '../lib/useLoad'

const TONES: Tone[] = ['cyan', 'pink', 'yellow', 'green', 'orange', 'purple']

export function Connected() {
  const { notify, fail } = useApp()
  const [list, reload] = useLoad(api.sessions, 10000)
  const [msgTo, setMsgTo] = useState<Session | 'all' | null>(null)
  const [kick, setKick] = useState<Session | null>(null)

  const describe = (s: Session) =>
    s.isSelf ? `En este equipo · ${ago(s.since).replace('hace', 'desde hace')}`
    : s.active ? `Desde ${s.client} · ${ago(s.since)}`
    : `Se fue sin cerrar sesión · ${ago(s.since)}`

  return (
    <>
      <Heading title="Conectados ahora" sub="Personas usando este equipo a distancia" />
      <div className="card">
        {!list && <div className="row muted">Cargando…</div>}
        {list?.length === 0 && <div className="row muted">No hay nadie conectado.</div>}
        {list?.map((s, i) => (
          <div key={s.id} className="row">
            <div className="flex items-center gap-2.5">
              <Avatar text={initials(s.user)} tone={s.isSelf ? 'purple' : TONES[i % TONES.length]} />
              <div><div className="font-semibold">{s.user}</div><div className="muted">{describe(s)}</div></div>
            </div>
            {s.isSelf ? <span className="muted w-[262px] text-right">Tú</span>
              : s.active ? (
                <div className="flex gap-1.5">
                  <Button tone="green" icon={IconMessage} onClick={() => setMsgTo(s)}>Mensaje</Button>
                  <Button tone="orange" icon={IconPlugOff} onClick={() => setKick(s)}>Desconectar</Button>
                </div>
              ) : <Button tone="orange" icon={IconLogout} onClick={() => setKick(s)}>Cerrar sesión</Button>}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button tone="green" icon={IconSpeakerphone} onClick={() => setMsgTo('all')}>Avisar a todos</Button>
      </div>

      <Prompt open={msgTo !== null} onOpenChange={o => !o && setMsgTo(null)}
        title={msgTo === 'all' ? 'Avisar a todos' : `Mensaje para ${msgTo?.user ?? ''}`}
        label="Le aparecerá este mensaje en su pantalla." action="Enviar"
        placeholder="En 5 minutos se reinicia el equipo. Guarda tu trabajo."
        onSubmit={t => api.sendMessage(msgTo === 'all' ? null : msgTo!.id, t).then(() => notify('Mensaje enviado')).catch(fail)} />
      <Confirm open={kick !== null} onOpenChange={o => !o && setKick(null)}
        title={kick?.active ? `¿Desconectar a ${kick?.user}?` : `¿Cerrar la sesión de ${kick?.user}?`}
        text={kick?.active ? 'Perderá lo que no haya guardado. Conviene avisarle antes con un mensaje.' : 'Se cerrarán los programas que dejó abiertos.'}
        action={kick?.active ? 'Desconectar' : 'Cerrar sesión'} danger
        onConfirm={() => kick && api.logoff(kick.id).then(() => { notify('Sesión cerrada'); reload() }).catch(fail)} />
    </>
  )
}
