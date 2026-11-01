// Gravar, editar e excluir lançamentos (com parcelas) e pagamentos de fatura.
import { dadosDoLancamento, gerarLancamentos, type DadosLancamento } from '@/utils/parcelas'
import { db, novoId, type BancoFinancas } from './banco'
import type { Lancamento, PagamentoFatura } from './tipos'

/** O lançamento e, se for parcelado, todas as parcelas da mesma compra (em ordem). */
export async function lancamentosDoGrupo(l: Lancamento, banco: BancoFinancas = db): Promise<Lancamento[]> {
  if (!l.grupoParcelasId) return [l]
  const grupo = await banco.lancamentos.where('grupoParcelasId').equals(l.grupoParcelasId).toArray()
  return grupo.sort((a, b) => (a.parcela?.numero ?? 0) - (b.parcela?.numero ?? 0))
}

/** Dados do formulário para editar (a compra inteira, se for parcelada). */
export async function dadosParaEditar(l: Lancamento, banco: BancoFinancas = db): Promise<DadosLancamento> {
  return dadosDoLancamento(l, await lancamentosDoGrupo(l, banco))
}

/**
 * Grava um lançamento novo, ou substitui `original` (e todas as parcelas dele) pelos dados novos.
 * Devolve os lançamentos gravados.
 */
export async function salvarLancamento(
  dados: DadosLancamento,
  original?: Lancamento,
  banco: BancoFinancas = db,
): Promise<Lancamento[]> {
  return banco.transaction('rw', banco.lancamentos, async () => {
    let reaproveitar: { id: string; grupoParcelasId?: string; criadoEm: number } | undefined
    if (original) {
      const antigos = await lancamentosDoGrupo(original, banco)
      const primeiro = antigos[0] ?? original
      reaproveitar = { id: primeiro.id, grupoParcelasId: original.grupoParcelasId, criadoEm: primeiro.criadoEm }
      await banco.lancamentos.bulkDelete(antigos.map((l) => l.id))
    }
    const novos = gerarLancamentos(dados, novoId, Date.now(), reaproveitar)
    // Lançamento feito por uma recorrência continua ligado a ela depois de editado.
    if (original?.recorrenciaId) {
      for (const n of novos) Object.assign(n, { recorrenciaId: original.recorrenciaId, recorrenciaMes: original.recorrenciaMes })
    }
    await banco.lancamentos.bulkAdd(novos)
    return novos
  })
}

/**
 * Exclui o lançamento; se for parcelado, exclui a compra inteira. Devolve quantos foram apagados.
 * Se ele veio de uma recorrência, aquele mês fica marcado como pulado (para não ser lançado de novo).
 */
export async function excluirLancamento(l: Lancamento, banco: BancoFinancas = db): Promise<number> {
  return banco.transaction('rw', banco.lancamentos, banco.recorrencias, async () => {
    const grupo = await lancamentosDoGrupo(l, banco)
    await banco.lancamentos.bulkDelete(grupo.map((x) => x.id))
    if (l.recorrenciaId && l.recorrenciaMes) {
      const mes = l.recorrenciaMes
      await banco.recorrencias
        .where('id')
        .equals(l.recorrenciaId)
        .modify((r) => {
          r.puladas = [...new Set([...(r.puladas ?? []), mes])]
        })
    }
    return grupo.length
  })
}

export async function registrarPagamento(dados: Omit<PagamentoFatura, 'id'>, banco: BancoFinancas = db) {
  const id = novoId()
  await banco.pagamentosFatura.add({ ...dados, id })
  return id
}

export async function excluirPagamento(id: string, banco: BancoFinancas = db) {
  await banco.pagamentosFatura.delete(id)
}

/**
 * Todas as tags já usadas, em ordem alfabética.
 * Lê os lançamentos de uma vez em vez de percorrer o índice de tags: no Safari do iPhone,
 * percorrer esse índice (de vários valores) pedindo só os únicos dá "UnknownError: Unable to open cursor".
 */
export async function todasAsTags(banco: BancoFinancas = db): Promise<string[]> {
  const tags = new Set<string>()
  for (const l of await banco.lancamentos.toArray()) for (const t of l.tags ?? []) tags.add(t)
  return [...tags].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
