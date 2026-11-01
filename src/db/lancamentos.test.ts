import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DadosLancamento } from '@/utils/parcelas'
import { BancoFinancas } from './banco'
import {
  EmUsoError,
  criarCartao,
  criarConta,
  editarConta,
  excluirCartao,
  excluirConta,
  limitesUsados,
  saldosDasContas,
} from './contas'
import { carregarDemonstracao } from './demo'
import { dadosParaEditar, excluirLancamento, registrarPagamento, salvarLancamento, todasAsTags } from './lancamentos'

let banco: BancoFinancas

beforeEach(async () => {
  banco = new BancoFinancas(`teste-${crypto.randomUUID()}`)
  await banco.open()
})

afterEach(async () => {
  await banco.delete()
})

function dados(extra: Partial<DadosLancamento> = {}): DadosLancamento {
  return {
    tipo: 'despesa',
    metodo: 'pix',
    valor: 10000,
    descricao: 'Teste',
    categoriaId: 'cat-outros',
    dataCompra: '2026-10-20',
    parcelas: 1,
    observacao: '',
    tags: [],
    ...extra,
  }
}

describe('salvar, editar e excluir lançamentos', () => {
  it('compra parcelada grava todas as parcelas', async () => {
    const gravados = await salvarLancamento(dados({ metodo: 'credito', cartaoId: 'c1', valor: 90000, parcelas: 3 }), undefined, banco)
    expect(gravados).toHaveLength(3)
    expect(await banco.lancamentos.count()).toBe(3)
  })

  it('editar uma parcela refaz a compra inteira (ex.: de 3x para 2x)', async () => {
    const [p1, p2] = await salvarLancamento(
      dados({ metodo: 'credito', cartaoId: 'c1', valor: 90000, parcelas: 3, tags: ['casa'] }),
      undefined,
      banco,
    )
    const paraEditar = await dadosParaEditar(p2, banco)
    expect(paraEditar).toMatchObject({ valor: 90000, parcelas: 3 })
    await salvarLancamento({ ...paraEditar, parcelas: 2, descricao: 'Sofá' }, p2, banco)
    const todos = await banco.lancamentos.toArray()
    expect(todos).toHaveLength(2)
    expect(todos.every((l) => l.descricao === 'Sofá' && l.grupoParcelasId === p1.grupoParcelasId)).toBe(true)
    expect(await banco.lancamentos.get(p1.id)).toBeDefined()
    expect(todos.map((l) => l.valor).sort()).toEqual([45000, 45000])
  })

  it('editar de parcelado para à vista e de volta', async () => {
    const [p1] = await salvarLancamento(dados({ metodo: 'credito', cartaoId: 'c1', parcelas: 4 }), undefined, banco)
    const [avista] = await salvarLancamento(dados({ metodo: 'credito', cartaoId: 'c1', parcelas: 1 }), p1, banco)
    expect(await banco.lancamentos.count()).toBe(1)
    expect(avista.id).toBe(p1.id)
    expect(avista.grupoParcelasId).toBeUndefined()
    await salvarLancamento(dados({ metodo: 'credito', cartaoId: 'c1', parcelas: 2 }), avista, banco)
    expect(await banco.lancamentos.count()).toBe(2)
  })

  it('excluir uma parcela exclui a compra inteira', async () => {
    const parcelas = await salvarLancamento(dados({ metodo: 'credito', cartaoId: 'c1', parcelas: 5 }), undefined, banco)
    await salvarLancamento(dados(), undefined, banco)
    expect(await excluirLancamento(parcelas[3], banco)).toBe(5)
    expect(await banco.lancamentos.count()).toBe(1)
  })

  it('lista as tags usadas', async () => {
    await salvarLancamento(dados({ tags: ['viagem-rio', 'trabalho'] }), undefined, banco)
    await salvarLancamento(dados({ tags: ['viagem-rio'] }), undefined, banco)
    expect(await todasAsTags(banco)).toEqual(['trabalho', 'viagem-rio'])
  })
})

describe('contas e cartões', () => {
  it('saldo = inicial + entradas − saídas − faturas pagas; crédito não mexe na conta', async () => {
    const conta = await criarConta({ nome: 'Nubank', cor: '#5f3dc4', saldoInicial: 100000 }, banco)
    const cartao = await criarCartao(
      { nome: 'Roxinho', cor: '#5f3dc4', limite: 500000, diaFechamento: 3, diaVencimento: 10 },
      banco,
    )
    await salvarLancamento(dados({ tipo: 'receita', contaId: conta, valor: 300000 }), undefined, banco)
    await salvarLancamento(dados({ contaId: conta, valor: 5000 }), undefined, banco)
    await salvarLancamento(dados({ metodo: 'credito', cartaoId: cartao, valor: 60000, parcelas: 3 }), undefined, banco)
    await salvarLancamento(dados({ contaId: conta, valor: 999, dataCompra: '2026-12-01' }), undefined, banco) // futuro
    await registrarPagamento({ cartaoId: cartao, fatura: '2026-11', valor: 20000, data: '2026-11-10', contaId: conta }, banco)

    expect((await saldosDasContas('2026-11-30', banco)).get(conta)).toBe(100000 + 300000 - 5000 - 20000)
    // Pagamento da fatura reduz o limite usado, mas não é contado como despesa nova.
    expect((await limitesUsados(banco)).get(cartao)).toBe(60000 - 20000)
  })

  it('não exclui conta ou cartão com lançamentos; arquivar continua possível', async () => {
    const conta = await criarConta({ nome: 'Itaú', cor: '#f08c00', saldoInicial: 0 }, banco)
    const cartao = await criarCartao({ nome: 'Visa', cor: '#1c7ed6', limite: 0, diaFechamento: 1, diaVencimento: 8 }, banco)
    await salvarLancamento(dados({ contaId: conta }), undefined, banco)
    await salvarLancamento(dados({ metodo: 'credito', cartaoId: cartao }), undefined, banco)
    await expect(excluirConta(conta, banco)).rejects.toBeInstanceOf(EmUsoError)
    await expect(excluirCartao(cartao, banco)).rejects.toBeInstanceOf(EmUsoError)
    await editarConta(conta, { arquivada: true }, banco)
    expect((await banco.contas.get(conta))?.arquivada).toBe(true)
  })

  it('dados de demonstração carregam e deixam as faturas vencidas pagas', async () => {
    await carregarDemonstracao(banco, '2026-11-01')
    expect(await banco.contas.count()).toBe(3)
    expect(await banco.cartoes.count()).toBe(2)
    expect(await banco.lancamentos.count()).toBeGreaterThan(60)
    expect(await banco.lancamentos.where('dataCompra').above('2026-11-01').count()).toBe(0)
    expect(await banco.pagamentosFatura.count()).toBeGreaterThan(0)
    expect(await banco.pagamentosFatura.where('data').aboveOrEqual('2026-11-01').count()).toBe(0)
    expect(await banco.planos.count()).toBe(2)
    // Carregar de novo não duplica os planos.
    await carregarDemonstracao(banco, '2026-11-01')
    expect(await banco.planos.count()).toBe(2)
  })

  it('exclui conta sem uso', async () => {
    const conta = await criarConta({ nome: 'Carteira', cor: '#2f9e44', saldoInicial: 0 }, banco)
    await excluirConta(conta, banco)
    expect(await banco.contas.count()).toBe(0)
  })
})
