// Recorrências: criar, editar, gerar os lançamentos de cada mês e confirmar/pular os que pedem confirmação.
import { gerarLancamentos } from '@/utils/parcelas'
import { dadosDaOcorrencia, mesDaData, ocorrenciasDevidas, type Ocorrencia } from '@/utils/recorrencias'
import type { DataISO } from '@/utils/datas'
import { db, novoId, type BancoFinancas } from './banco'
import type { Lancamento, Recorrencia } from './tipos'

export type DadosRecorrencia = Omit<Recorrencia, 'id' | 'puladas'>

export async function criarRecorrencia(dados: DadosRecorrencia, banco: BancoFinancas = db): Promise<string> {
  const id = novoId()
  await banco.recorrencias.add({ ...dados, descricao: dados.descricao.trim(), id, puladas: [] })
  return id
}

export async function editarRecorrencia(id: string, dados: Partial<DadosRecorrencia>, banco: BancoFinancas = db) {
  await banco.recorrencias.update(id, dados)
}

/** Exclui a recorrência; os lançamentos já feitos por ela continuam. */
export async function excluirRecorrencia(id: string, banco: BancoFinancas = db) {
  await banco.recorrencias.delete(id)
}

async function mesesLancados(recorrenciaId: string, banco: BancoFinancas): Promise<Set<string>> {
  const feitos = await banco.lancamentos.where('recorrenciaId').equals(recorrenciaId).toArray()
  return new Set(feitos.map((l) => l.recorrenciaMes).filter((m): m is string => !!m))
}

function lancamentoDaOcorrencia(rec: Recorrencia, o: Ocorrencia): Lancamento {
  const [lancamento] = gerarLancamentos(dadosDaOcorrencia(rec, o), novoId, Date.now())
  return { ...lancamento, recorrenciaId: rec.id, recorrenciaMes: o.mes }
}

/**
 * Lança sozinhas as ocorrências devidas até hoje das recorrências automáticas.
 * Devolve quantos lançamentos foram criados.
 */
export async function gerarRecorrenciasAutomaticas(hoje: DataISO, banco: BancoFinancas = db): Promise<number> {
  return banco.transaction('rw', banco.recorrencias, banco.lancamentos, async () => {
    const recorrencias = (await banco.recorrencias.toArray()).filter((r) => r.ativa && !r.confirmarAntes)
    let criados = 0
    for (const rec of recorrencias) {
      const devidas = ocorrenciasDevidas(rec, hoje, await mesesLancados(rec.id, banco))
      if (!devidas.length) continue
      await banco.lancamentos.bulkAdd(devidas.map((o) => lancamentoDaOcorrencia(rec, o)))
      criados += devidas.length
    }
    return criados
  })
}

export interface Pendente {
  recorrencia: Recorrencia
  ocorrencia: Ocorrencia
}

/** Ocorrências das recorrências "confirmar antes" que já chegaram e esperam um toque. */
export async function ocorrenciasPendentes(hoje: DataISO, banco: BancoFinancas = db): Promise<Pendente[]> {
  const recorrencias = (await banco.recorrencias.toArray()).filter((r) => r.ativa && r.confirmarAntes)
  const pendentes: Pendente[] = []
  for (const recorrencia of recorrencias) {
    for (const ocorrencia of ocorrenciasDevidas(recorrencia, hoje, await mesesLancados(recorrencia.id, banco))) {
      pendentes.push({ recorrencia, ocorrencia })
    }
  }
  return pendentes.sort((a, b) => a.ocorrencia.data.localeCompare(b.ocorrencia.data))
}

export async function lancarOcorrencia(rec: Recorrencia, o: Ocorrencia, banco: BancoFinancas = db) {
  await banco.transaction('rw', banco.lancamentos, async () => {
    if ((await mesesLancados(rec.id, banco)).has(o.mes)) return
    await banco.lancamentos.add(lancamentoDaOcorrencia(rec, o))
  })
}

/** Pula o mês: não lança e não pergunta de novo. */
export async function pularOcorrencia(recorrenciaId: string, mes: string, banco: BancoFinancas = db) {
  await banco.recorrencias
    .where('id')
    .equals(recorrenciaId)
    .modify((r) => {
      r.puladas = [...new Set([...(r.puladas ?? []), mes])]
    })
}

/**
 * Transforma um lançamento recém-gravado em recorrência mensal (botão "Repetir todo mês"):
 * a recorrência começa na data dele, no mesmo dia do mês, e ele já conta como a 1ª ocorrência.
 */
export async function repetirTodoMes(lancamento: Lancamento, banco: BancoFinancas = db): Promise<string> {
  return banco.transaction('rw', banco.recorrencias, banco.lancamentos, async () => {
    const id = await criarRecorrencia(
      {
        tipo: lancamento.tipo,
        metodo: lancamento.metodo,
        valor: lancamento.valor,
        descricao: lancamento.descricao,
        categoriaId: lancamento.categoriaId,
        cartaoId: lancamento.cartaoId,
        contaId: lancamento.contaId,
        dia: Number(lancamento.dataCompra.slice(8, 10)),
        inicio: lancamento.dataCompra,
        confirmarAntes: false,
        ativa: true,
        tags: lancamento.tags,
      },
      banco,
    )
    await banco.lancamentos.update(lancamento.id, { recorrenciaId: id, recorrenciaMes: mesDaData(lancamento.dataCompra) })
    return id
  })
}
