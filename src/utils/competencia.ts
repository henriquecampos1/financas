// "Competência": em que data cada lançamento conta no planejamento, nas listas e nas análises.
// Compras no crédito contam na data da compra, nunca na do pagamento da fatura. Para as
// parceladas, depende do ajuste: cada parcela na sua data, ou o total na data da compra.
import type { Lancamento, ModoParcelas } from '@/db/tipos'
import type { DataISO } from './datas'

export interface ItemCompetencia {
  /** Chave única na lista (id do lançamento ou do grupo de parcelas). */
  id: string
  /** Lançamento que representa o item (a 1ª parcela, no modo "total na compra"). */
  lancamento: Lancamento
  data: DataISO
  valor: number
  /** "2/10" (uma parcela) ou "10x" (compra inteira). */
  rotuloParcela?: string
}

/** Campo de data usado para buscar os lançamentos de um período. */
export function campoDeData(modo: ModoParcelas): 'data' | 'dataCompra' {
  return modo === 'total-na-compra' ? 'dataCompra' : 'data'
}

/**
 * Converte lançamentos em itens de competência. No modo "total na compra", as parcelas de uma
 * mesma compra viram um item só, com o valor somado, na data da compra (para isso a lista precisa
 * trazer todas as parcelas — buscando pela `dataCompra`, elas vêm juntas).
 */
export function paraCompetencia(lancamentos: Lancamento[], modo: ModoParcelas): ItemCompetencia[] {
  if (modo === 'por-parcela') {
    return lancamentos.map((l) => ({
      id: l.id,
      lancamento: l,
      data: l.data,
      valor: l.valor,
      rotuloParcela: l.parcela ? `${l.parcela.numero}/${l.parcela.total}` : undefined,
    }))
  }
  const itens: ItemCompetencia[] = []
  const grupos = new Map<string, ItemCompetencia>()
  for (const l of lancamentos) {
    if (!l.grupoParcelasId) {
      itens.push({ id: l.id, lancamento: l, data: l.dataCompra, valor: l.valor })
      continue
    }
    const existente = grupos.get(l.grupoParcelasId)
    if (existente) {
      existente.valor += l.valor
      if ((l.parcela?.numero ?? 1) < (existente.lancamento.parcela?.numero ?? 1)) existente.lancamento = l
    } else {
      const item: ItemCompetencia = {
        id: l.grupoParcelasId,
        lancamento: l,
        data: l.dataCompra,
        valor: l.valor,
        rotuloParcela: `${l.parcela?.total ?? 1}x`,
      }
      grupos.set(l.grupoParcelasId, item)
      itens.push(item)
    }
  }
  return itens
}

export function totais(itens: ItemCompetencia[]): { receitas: number; despesas: number; saldo: number } {
  let receitas = 0
  let despesas = 0
  for (const i of itens) {
    if (i.lancamento.tipo === 'receita') receitas += i.valor
    else despesas += i.valor
  }
  return { receitas, despesas, saldo: receitas - despesas }
}

export interface Dia {
  data: DataISO
  itens: ItemCompetencia[]
  /** Receitas − despesas do dia. */
  saldo: number
}

/** Agrupa por dia, do mais recente para o mais antigo; no mesmo dia, o lançado por último primeiro. */
export function agruparPorDia(itens: ItemCompetencia[]): Dia[] {
  const ordenados = [...itens].sort(
    (a, b) => b.data.localeCompare(a.data) || b.lancamento.criadoEm - a.lancamento.criadoEm,
  )
  const dias: Dia[] = []
  for (const item of ordenados) {
    let dia = dias.at(-1)
    if (dia?.data !== item.data) {
      dia = { data: item.data, itens: [], saldo: 0 }
      dias.push(dia)
    }
    dia.itens.push(item)
    dia.saldo += item.lancamento.tipo === 'receita' ? item.valor : -item.valor
  }
  return dias
}
