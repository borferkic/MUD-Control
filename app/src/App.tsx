import * as Tabs from '@radix-ui/react-tabs'
import { IconHistory, IconHome, IconKey, IconSettings, IconUsers } from '@tabler/icons-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { About } from './components/About'
import { api, inTauri } from './lib/backend'
import { I18nCtx, loadPref, savePref, systemLang, translate, type I18n, type Key, type Lang, type LangPref } from './lib/i18n'
import { Button, Toast, tone, type Tone } from './components/ui'
import { Activity } from './screens/Activity'
import { Home } from './screens/Home'
import { Connected } from './screens/Connected'
import { AccessScreen } from './screens/Access'
import { SettingsScreen } from './screens/Settings'

export type TabId = 'inicio' | 'conectados' | 'accesos' | 'ajustes'
const TABS: [TabId, Key, typeof IconHome, Tone][] = [
  ['inicio', 'tab.inicio', IconHome, 'pink'],
  ['conectados', 'tab.conectados', IconUsers, 'cyan'],
  ['accesos', 'tab.accesos', IconKey, 'yellow'],
  ['ajustes', 'tab.ajustes', IconSettings, 'green'],
]

interface AppCtx { go: (t: TabId) => void; notify: (text: string) => void; fail: (e: unknown) => void; refreshKey: number; refresh: () => void; fixRequest: number; updateRequest: number }
const Ctx = createContext<AppCtx>(null!)
export const useApp = () => useContext(Ctx)

export default function App() {
  // En el navegador (solo para disenar y sacar capturas) ?tab=ajustes&actividad&lang=en abre esa vista.
  const q = inTauri ? null : new URLSearchParams(location.search)
  const [tab, setTab] = useState<TabId>((q?.get('tab') as TabId) || 'inicio')
  const [log, setLog] = useState(q?.has('actividad') ?? false)
  const [about, setAbout] = useState(q?.has('acerca') ?? false)
  const [toast, setToast] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [fixRequest, setFixRequest] = useState(0)
  const [updateRequest, setUpdateRequest] = useState(0)

  const [pref, setPrefState] = useState<LangPref>(() => (q?.get('lang') as LangPref) || loadPref())
  const lang: Lang = pref === 'auto' ? systemLang() : pref
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  // Menu de la bandeja en el idioma elegido, y "Arreglar ahora" desde la bandeja.
  useEffect(() => {
    if (!inTauri) return
    import('@tauri-apps/api/core').then(({ invoke }) => invoke('tray_labels', {
      tooltip: 'MUD Control', open: translate(lang, 'tray.open'), fix: translate(lang, 'tray.fix'), update: translate(lang, 'tray.update'), quit: translate(lang, 'tray.quit'),
    })).catch(() => {})
  }, [lang])
  // Al abrir: el backend aplica los valores de primera vez (iniciar con Windows activado).
  useEffect(() => { api.settings().catch(() => {}) }, [])
  useEffect(() => {
    if (!inTauri) return
    let off: (() => void) | undefined
    import('@tauri-apps/api/event').then(({ listen }) => listen('tray-fix', () => { setTab('inicio'); setFixRequest(n => n + 1) })).then(f => (off = f))
    let off2: (() => void) | undefined
    import('@tauri-apps/api/event').then(({ listen }) => listen('tray-update', () => { setTab('ajustes'); setUpdateRequest(n => n + 1) })).then(f => (off2 = f))
    return () => { off?.(); off2?.() }
  }, [])
  const i18n = useMemo<I18n>(() => ({
    lang, pref,
    setPref: p => { savePref(p); setPrefState(p) },
    t: (key, p) => translate(lang, key, p),
  }), [lang, pref])

  const clear = useCallback(() => setToast(null), [])
  // Nunca mostrar excepciones crudas al usuario final: el detalle va al registro tecnico.
  const fail = useCallback((e: unknown) => { console.error(e); setToast(translate(lang, 'err.generic')) }, [lang])
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])
  const ctx = useMemo<AppCtx>(() => ({ go: setTab, notify: setToast, fail, refreshKey, refresh, fixRequest, updateRequest }), [fail, refreshKey, refresh, fixRequest, updateRequest])
  const t = i18n.t

  return (
    <I18nCtx.Provider value={i18n}>
      <Ctx.Provider value={ctx}>
        <div className="flex h-full flex-col overflow-hidden">
          <TitleBar onAbout={() => setAbout(true)} />
          <Tabs.Root value={tab} onValueChange={v => setTab(v as TabId)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2.5 px-4 pt-3">
              <Tabs.List aria-label={t('tabs.label')} className="inline-flex gap-0.5 rounded-xl border border-line bg-side p-[3px]">
                {TABS.map(([id, label, I, c]) => (
                  <Tabs.Trigger key={id} value={id} style={tone(c)}
                    className="flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[9px] px-3.5 text-[13px] text-mu data-[state=active]:bg-[color-mix(in_srgb,var(--k)_16%,var(--card))] data-[state=active]:text-fg data-[state=active]:shadow-[0_0_0_0.5px_color-mix(in_srgb,var(--k)_50%,transparent)]">
                    <I size={15} stroke={1.8} style={{ color: 'var(--k)' }} />{t(label)}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              <Button tone="purple" icon={IconHistory} lit={log} aria-pressed={log} onClick={() => setLog(v => !v)} className="ml-auto">
                {t('activity')}
              </Button>
            </div>
            {log && <div className="px-4 pt-3"><Activity /></div>}
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <Tabs.Content value="inicio"><Home /></Tabs.Content>
              <Tabs.Content value="conectados"><Connected /></Tabs.Content>
              <Tabs.Content value="accesos"><AccessScreen /></Tabs.Content>
              <Tabs.Content value="ajustes"><SettingsScreen /></Tabs.Content>
            </div>
          </Tabs.Root>
        </div>
        <Toast text={toast} onDone={clear} />
        <About open={about} onOpenChange={setAbout} />
      </Ctx.Provider>
    </I18nCtx.Provider>
  )
}
