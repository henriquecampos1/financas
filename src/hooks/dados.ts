// Leituras do banco que se atualizam sozinhas quando algo muda (useLiveQuery).
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/banco'
import { limitesUsados, saldosDasContas } from '@/db/contas'
import { todasAsTags } from '@/db/lancamentos'
import type { Cartao, Conta, Lancamento, PagamentoFatura } from '@/db/tipos'
import { campoDeData, paraCompetencia, type ItemCompetencia } from '@/utils/competencia'
import { hojeISO, type DataISO } from '@/utils/datas'
import { useAjustes } from './ajustes'

export function useContas(): Conta[] | undefined {
  return useLiveQuery(() => db.contas.orderBy('ordem').toArray())
}

export function useCartoes(): Cartao[] | undefined {
  return useLiveQuery(() => db.cartoes.orderBy('ordem').toArray())
}

/** Itens de competência de um período (inclusive), conforme o ajuste das compras parceladas. */
export function useItensDoPeriodo(inicio: DataISO, fim: DataISO): ItemCompetencia[] | undefined {
  const { modoParcelas } = useAjustes()
  return useLiveQuery(async () => {
    const lancamentos = await db.lancamentos.where(campoDeData(modoParcelas)).between(inicio, fim, true, true).toArray()
    return paraCompetencia(lancamentos, modoParcelas)
  }, [inicio, fim, modoParcelas])
}

/** Últimos lançamentos até hoje (no modo de competência atual). */
export function useUltimos(quantidade: number): ItemCompetencia[] | undefined {
  const { modoParcelas } = useAjustes()
  return useLiveQuery(async () => {
    const campo = campoDeData(modoParcelas)
    const lancamentos = await db.lancamentos.where(campo).belowOrEqual(hojeISO()).reverse().limit(quantidade * 4).toArray()
    return paraCompetencia(lancamentos, modoParcelas)
      .sort((a, b) => b.data.localeCompare(a.data) || b.lancamento.criadoEm - a.lancamento.criadoEm)
      .slice(0, quantidade)
  }, [quantidade, modoParcelas])
}

export function useLancamentosDoCartao(cartaoId: string | undefined): Lancamento[] | undefined {
  return useLiveQuery(
    () => (cartaoId ? db.lancamentos.where('cartaoId').equals(cartaoId).toArray() : []),
    [cartaoId],
  )
}

export function usePagamentosDoCartao(cartaoId: string | undefined): PagamentoFatura[] | undefined {
  return useLiveQuery(
    () => (cartaoId ? db.pagamentosFatura.where('cartaoId').equals(cartaoId).toArray() : []),
    [cartaoId],
  )
}

/** Todos os lançamentos no crédito e todos os pagamentos (para resumos de faturas de vários cartões). */
export function useCreditoCompleto(): { lancamentos: Lancamento[]; pagamentos: PagamentoFatura[] } | undefined {
  return useLiveQuery(async () => ({
    lancamentos: await db.lancamentos.where('metodo').equals('credito').toArray(),
    pagamentos: await db.pagamentosFatura.toArray(),
  }))
}

export function useSaldosDasContas(): Map<string, number> | undefined {
  return useLiveQuery(() => saldosDasContas(hojeISO()))
}

export function useLimitesUsados(): Map<string, number> | undefined {
  return useLiveQuery(() => limitesUsados())
}

export function useTags(): string[] | undefined {
  return useLiveQuery(() => todasAsTags())
}
