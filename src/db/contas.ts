// Contas (Nubank, Itaú, Carteira...) e cartões de crédito.
import type { DataISO } from '@/utils/datas'
import { limiteUsado } from '@/utils/fatura'
import { db, novoId, type BancoFinancas } from './banco'
import type { Cartao, Conta } from './tipos'

export type DadosConta = Pick<Conta, 'nome' | 'cor' | 'saldoInicial'>
export type DadosCartao = Pick<Cartao, 'nome' | 'cor' | 'limite' | 'diaFechamento' | 'diaVencimento'>

async function proximaOrdem(tabela: { toArray(): Promise<{ ordem: number }[]> }): Promise<number> {
  return (await tabela.toArray()).reduce((max, x) => Math.max(max, x.ordem), -1) + 1
}

export async function criarConta(dados: DadosConta, banco: BancoFinancas = db): Promise<string> {
  const id = novoId()
  await banco.transaction('rw', banco.contas, async () => {
    await banco.contas.add({ ...dados, nome: dados.nome.trim(), id, arquivada: false, ordem: await proximaOrdem(banco.contas) })
  })
  return id
}

export async function editarConta(id: string, dados: Partial<DadosConta & { arquivada: boolean }>, banco: BancoFinancas = db) {
  await banco.contas.update(id, dados.nome === undefined ? dados : { ...dados, nome: dados.nome.trim() })
}

export async function criarCartao(dados: DadosCartao, banco: BancoFinancas = db): Promise<string> {
  const id = novoId()
  await banco.transaction('rw', banco.cartoes, async () => {
    await banco.cartoes.add({ ...dados, nome: dados.nome.trim(), id, arquivado: false, ordem: await proximaOrdem(banco.cartoes) })
  })
  return id
}

export async function editarCartao(id: string, dados: Partial<DadosCartao & { arquivado: boolean }>, banco: BancoFinancas = db) {
  await banco.cartoes.update(id, dados.nome === undefined ? dados : { ...dados, nome: dados.nome.trim() })
}

/** Lançamentos e pagamentos de fatura ligados à conta. */
export async function usosDaConta(id: string, banco: BancoFinancas = db): Promise<number> {
  const [lancamentos, pagamentos] = await Promise.all([
    banco.lancamentos.where('contaId').equals(id).count(),
    banco.pagamentosFatura.filter((p) => p.contaId === id).count(),
  ])
  return lancamentos + pagamentos
}

export async function usosDoCartao(id: string, banco: BancoFinancas = db): Promise<number> {
  const [lancamentos, pagamentos] = await Promise.all([
    banco.lancamentos.where('cartaoId').equals(id).count(),
    banco.pagamentosFatura.where('cartaoId').equals(id).count(),
  ])
  return lancamentos + pagamentos
}

export class EmUsoError extends Error {}

/** Só exclui conta sem lançamentos; com histórico, o caminho é arquivar. */
export async function excluirConta(id: string, banco: BancoFinancas = db) {
  await banco.transaction('rw', [banco.contas, banco.lancamentos, banco.pagamentosFatura], async () => {
    if (await usosDaConta(id, banco)) throw new EmUsoError('A conta tem lançamentos; arquive em vez de excluir.')
    await banco.contas.delete(id)
  })
}

export async function excluirCartao(id: string, banco: BancoFinancas = db) {
  await banco.transaction('rw', [banco.cartoes, banco.lancamentos, banco.pagamentosFatura], async () => {
    if (await usosDoCartao(id, banco)) throw new EmUsoError('O cartão tem lançamentos; arquive em vez de excluir.')
    await banco.cartoes.delete(id)
  })
}

/**
 * Saldo de cada conta até `ate` (inclusive): saldo inicial + entradas − saídas − faturas pagas
 * com ela. Compras no crédito não mexem na conta; só o pagamento da fatura.
 */
export async function saldosDasContas(ate: DataISO, banco: BancoFinancas = db): Promise<Map<string, number>> {
  const [contas, lancamentos, pagamentos] = await Promise.all([
    banco.contas.toArray(),
    banco.lancamentos.where('data').belowOrEqual(ate).filter((l) => !!l.contaId).toArray(),
    banco.pagamentosFatura.where('data').belowOrEqual(ate).toArray(),
  ])
  const saldos = new Map(contas.map((c) => [c.id, c.saldoInicial]))
  for (const l of lancamentos) {
    if (!saldos.has(l.contaId!)) continue
    saldos.set(l.contaId!, saldos.get(l.contaId!)! + (l.tipo === 'receita' ? l.valor : -l.valor))
  }
  for (const p of pagamentos) {
    if (p.contaId && saldos.has(p.contaId)) saldos.set(p.contaId, saldos.get(p.contaId)! - p.valor)
  }
  return saldos
}

/** Limite usado de cada cartão (compras, inclusive parcelas futuras, menos o que já foi pago). */
export async function limitesUsados(banco: BancoFinancas = db): Promise<Map<string, number>> {
  const [cartoes, lancamentos, pagamentos] = await Promise.all([
    banco.cartoes.toArray(),
    banco.lancamentos.where('metodo').equals('credito').toArray(),
    banco.pagamentosFatura.toArray(),
  ])
  return new Map(
    cartoes.map((c) => [
      c.id,
      limiteUsado(
        lancamentos.filter((l) => l.cartaoId === c.id),
        pagamentos.filter((p) => p.cartaoId === c.id),
      ),
    ]),
  )
}
