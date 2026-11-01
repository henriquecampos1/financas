// Metas / caixinhas de economia e seus aportes (guardar ou retirar).
import { db, novoId, type BancoFinancas } from './banco'
import type { Aporte, Meta } from './tipos'

export type DadosMeta = Pick<Meta, 'nome' | 'icone' | 'cor' | 'valorAlvo' | 'prazo'>

export async function criarMeta(dados: DadosMeta, valorInicial = 0, data?: string, banco: BancoFinancas = db) {
  const id = novoId()
  const aportes: Aporte[] = valorInicial > 0 && data ? [{ id: novoId(), data, valor: valorInicial, observacao: 'Valor inicial' }] : []
  await banco.metas.add({ ...dados, nome: dados.nome.trim(), id, aportes, criadaEm: Date.now() })
  return id
}

export async function editarMeta(id: string, dados: Partial<DadosMeta>, banco: BancoFinancas = db) {
  await banco.metas.update(id, dados)
}

export async function excluirMeta(id: string, banco: BancoFinancas = db) {
  await banco.metas.delete(id)
}

/** Guarda (valor positivo) ou retira (valor negativo) dinheiro da meta. */
export async function registrarAporte(metaId: string, aporte: Omit<Aporte, 'id'>, banco: BancoFinancas = db) {
  await banco.metas
    .where('id')
    .equals(metaId)
    .modify((m) => {
      m.aportes = [...m.aportes, { ...aporte, id: novoId() }].sort((a, b) => a.data.localeCompare(b.data))
    })
}

export async function excluirAporte(metaId: string, aporteId: string, banco: BancoFinancas = db) {
  await banco.metas
    .where('id')
    .equals(metaId)
    .modify((m) => {
      m.aportes = m.aportes.filter((a) => a.id !== aporteId)
    })
}
