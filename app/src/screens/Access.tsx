import * as RDialog from '@radix-ui/react-dialog'
import { IconUserMinus, IconUserPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { useApp } from '../App'
import { Avatar, Button, Confirm, Heading, type Tone } from '../components/ui'
import { api } from '../lib/backend'
import { initials } from '../lib/format'
import type { Access } from '../lib/types'
import { useLoad } from '../lib/useLoad'

const TONES: Tone[] = ['cyan', 'pink', 'yellow', 'green', 'orange', 'purple']

export function AccessScreen() {
  const { notify, fail, refresh } = useApp()
  const [list, reload] = useLoad(api.access)
  const [revoke, setRevoke] = useState<Access | null>(null)
  const [adding, setAdding] = useState(false)
  const [candidates, setCandidates] = useState<Access[] | null>(null)

  function openAdd() {
    setAdding(true); setCandidates(null)
    api.localUsers().then(u => setCandidates(u.filter(x => !list?.some(a => a.name === x.name)))).catch(fail)
  }

  return (
    <>
      <Heading title="Accesos" sub="Estas personas pueden conectarse a este equipo desde otro. Cada cuenta puede estar conectada una sola vez." />
      <div className="card">
        {list?.length === 0 && <div className="row muted">Todavía nadie tiene acceso.</div>}
        {list?.map((a, i) => (
          <div key={a.name} className="row">
            <div className="flex items-center gap-2.5">
              <Avatar text={initials(a.fullName || a.name)} tone={TONES[i % TONES.length]} />
              <div><div className="font-semibold">{a.fullName || a.name}</div><div className="muted">Cuenta de este equipo</div></div>
            </div>
            <Button tone="orange" icon={IconUserMinus} onClick={() => setRevoke(a)}>Quitar acceso</Button>
          </div>
        ))}
      </div>
      <div className="mt-3"><Button tone="yellow" icon={IconUserPlus} onClick={openAdd}>Dar acceso</Button></div>

      <Confirm open={revoke !== null} onOpenChange={o => !o && setRevoke(null)}
        title={`¿Quitar el acceso a ${revoke?.fullName || revoke?.name}?`}
        text="Ya no podrá conectarse a este equipo desde otro. Su cuenta y sus archivos no se borran."
        action="Quitar acceso" danger
        onConfirm={() => revoke && api.revokeAccess(revoke.name).then(() => { notify('Acceso quitado'); reload(); refresh() }).catch(fail)} />

      <RDialog.Root open={adding} onOpenChange={setAdding}>
        <RDialog.Portal>
          <RDialog.Overlay className="fixed inset-0 bg-black/50" />
          <RDialog.Content className="fixed left-1/2 top-1/2 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-card p-5 shadow-2xl">
            <RDialog.Title className="m-0 text-base font-semibold">Dar acceso</RDialog.Title>
            <RDialog.Description className="muted mt-1.5">Elige una cuenta de este equipo. Si la persona no tiene cuenta, pide a tu especialista que la cree.</RDialog.Description>
            <div className="card mt-3">
              {!candidates && <div className="row muted">Buscando cuentas…</div>}
              {candidates?.length === 0 && <div className="row muted">Todas las cuentas ya tienen acceso.</div>}
              {candidates?.map(c => (
                <div key={c.name} className="row">
                  <span>{c.fullName || c.name}</span>
                  <Button tone="yellow" icon={IconUserPlus} onClick={() => api.grantAccess(c.name)
                    .then(() => { notify(`${c.fullName || c.name} ya puede entrar`); setAdding(false); reload(); refresh() }).catch(fail)}>
                    Dar acceso
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end"><RDialog.Close asChild><Button>Cerrar</Button></RDialog.Close></div>
          </RDialog.Content>
        </RDialog.Portal>
      </RDialog.Root>
    </>
  )
}
