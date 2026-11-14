import { useCallback, useEffect, useState } from 'react'
import { useApp } from '../App'

/** Carga datos del backend y los recarga cuando cambia refreshKey o cada `every` ms. */
export function useLoad<T>(fn: () => Promise<T>, every?: number) {
  const { refreshKey, fail } = useApp()
  const [data, setData] = useState<T | null>(null)
  const reload = useCallback(() => fn().then(setData).catch(fail), [fn, fail])
  useEffect(() => {
    reload()
    if (!every) return
    const t = setInterval(reload, every)
    return () => clearInterval(t)
  }, [reload, every, refreshKey])
  return [data, reload] as const
}
