import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '@/db/banco'
import { planoAnterior, planoDoCiclo } from '@/db/planos'
import type { Plano } from '@/db/tipos'
import type { Ciclo } from '@/utils/ciclo'
import type { ItemCompetencia } from '@/utils/competencia'
import { hojeISO, type DataISO } from '@/utils/datas'
import { calcularPlano, type ResumoPlano } from '@/utils/planejamento'
import { useItensDoPeriodo } from './dados'

/** Plano do ciclo: `undefined` enquanto carrega, `null` se não existe. */
export function usePlano(ciclo: Ciclo): Plano | null | undefined {
  return useLiveQuery(async () => (await planoDoCiclo(ciclo)) ?? null, [ciclo.inicio, ciclo.fim])
}

/** Planos que começam entre as datas (para mostrar as metas de economia de vários ciclos). */
export function usePlanosEntre(inicio: DataISO, fim: DataISO): Plano[] | undefined {
  return useLiveQuery(() => db.planos.where('inicio').between(inicio, fim, true, true).toArray(), [inicio, fim])
}

export function usePlanoAnterior(ciclo: Ciclo): Plano | null | undefined {
  return useLiveQuery(async () => (await planoAnterior(ciclo)) ?? null, [ciclo.inicio])
}

export interface PlanoComResumo {
  plano: Plano | null
  resumo?: ResumoPlano
  itens: ItemCompetencia[]
}

/** Plano do ciclo já com os gastos calculados (atualiza sozinho a cada lançamento). */
export function useResumoPlano(ciclo: Ciclo): PlanoComResumo | undefined {
  const plano = usePlano(ciclo)
  const itens = useItensDoPeriodo(ciclo.inicio, ciclo.fim)
  return useMemo(() => {
    if (plano === undefined || !itens) return undefined
    return { plano, itens, resumo: plano ? calcularPlano(plano, itens, ciclo, hojeISO()) : undefined }
  }, [plano, itens, ciclo])
}
