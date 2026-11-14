import * as RDialog from '@radix-ui/react-dialog'
import { IconUserMinus, IconUserPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { useApp } from '../App'
import { Avatar, Button, Confirm, Heading, type Tone } from '../components/ui'
import { api } from '../lib/backend'
import { initials } from '../lib/format'
import { useT } from '../lib/i18n'
import type { Access } from '../lib/types'
import { useLoad } from '../lib/useLoad'

const TONES: Tone[] = ['cyan', 'pink', 'yellow', 'green', 'orange', 'purple']
const nameOf = (a?: Access | null) => a?.fullName || a?.name || ''

export function AccessScreen() {
  const { notify, fail, refresh } = useApp()
  const { t } = useT()
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
      <Heading title={t('acc.title')} sub={t('acc.sub')} />
      <div className="card">
        {list?.length === 0 && <div className="row muted">{t('acc.none')}</div>}
        {list?.map((a, i) => (
          <div key={a.name} className="row">
            <div className="flex items-center gap-2.5">
              <Avatar text={initials(nameOf(a))} tone={TONES[i % TONES.length]} />
              <div><div className="font-semibold">{nameOf(a)}</div><div className="muted">{t('acc.local')}</div></div>
            </div>
            <Button tone="orange" icon={IconUserMinus} onClick={() => setRevoke(a)}>{t('acc.revoke')}</Button>
          </div>
        ))}
      </div>
      <div className="mt-3"><Button tone="yellow" icon={IconUserPlus} onClick={openAdd}>{t('acc.grant')}</Button></div>

      <Confirm open={revoke !== null} onOpenChange={o => !o && setRevoke(null)}
        title={t('acc.confirmRevoke', { name: nameOf(revoke) })} text={t('acc.confirmRevokeText')}
        action={t('acc.revoke')} danger
        onConfirm={() => revoke && api.revokeAccess(revoke.name).then(() => { notify(t('acc.revoked')); reload(); refresh() }).catch(fail)} />

      <RDialog.Root open={adding} onOpenChange={setAdding}>
        <RDialog.Portal>
          <RDialog.Overlay className="fixed inset-0 bg-black/50" />
          <RDialog.Content className="fixed left-1/2 top-1/2 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-card p-5 shadow-2xl">
            <RDialog.Title className="m-0 text-base font-semibold">{t('acc.grant')}</RDialog.Title>
            <RDialog.Description className="muted mt-1.5">{t('acc.pickText')}</RDialog.Description>
            <div className="card mt-3">
              {!candidates && <div className="row muted">{t('acc.searching')}</div>}
              {candidates?.length === 0 && <div className="row muted">{t('acc.allHave')}</div>}
              {candidates?.map(c => (
                <div key={c.name} className="row">
                  <span>{nameOf(c)}</span>
                  <Button tone="yellow" icon={IconUserPlus} onClick={() => api.grantAccess(c.name)
                    .then(() => { notify(t('acc.granted', { name: nameOf(c) })); setAdding(false); reload(); refresh() }).catch(fail)}>
                    {t('acc.grant')}
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end"><RDialog.Close asChild><Button>{t('close')}</Button></RDialog.Close></div>
          </RDialog.Content>
        </RDialog.Portal>
      </RDialog.Root>
    </>
  )
}
