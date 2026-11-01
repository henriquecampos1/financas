import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '@/db/banco'
import { gerarRecorrenciasAutomaticas, ocorrenciasPendentes, type Pendente } from '@/db/recorrencias'
import type { Recorrencia } from '@/db/tipos'
import { hojeISO } from '@/utils/datas'

export function useRecorrencias(): Recorrencia[] | undefined {
  return useLiveQuery(() => db.recorrencias.toArray())
}

/** Recorrências "confirmar antes" que já chegaram (atualiza sozinho). */
export function usePendentes(): Pendente[] | undefined {
  return useLiveQuery(() => ocorrenciasPendentes(hojeISO()))
}

/** Lança as recorrências automáticas ao abrir o app e sempre que ele volta para a frente. */
export function useGeradorRecorrencias() {
  useEffect(() => {
    const gerar = () => {
      if (document.visibilityState === 'visible') void gerarRecorrenciasAutomaticas(hojeISO())
    }
    gerar()
    document.addEventListener('visibilitychange', gerar)
    return () => document.removeEventListener('visibilitychange', gerar)
  }, [])
}
