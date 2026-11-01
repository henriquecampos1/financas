// Dados de demonstração: contas, cartões e cerca de três meses de lançamentos para testar as telas.
import { addMonths, subDays } from 'date-fns'
import { deISO, hojeISO, paraISO, type DataISO } from '@/utils/datas'
import { faturaPorChave, totaisPorFatura } from '@/utils/fatura'
import { gerarLancamentos, type DadosLancamento } from '@/utils/parcelas'
import { cicloAtual, deslocarCiclo } from '@/utils/ciclo'
import { lerAjustes } from './ajustes'
import { db, novoId, type BancoFinancas } from './banco'
import { planoDoCiclo } from './planos'
import type { Cartao, Conta, Lancamento } from './tipos'

/** Sorteio repetível (sempre os mesmos "aleatórios"). */
function sorteador(semente: number) {
  let s = semente
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

export async function carregarDemonstracao(banco: BancoFinancas = db, hoje: DataISO = hojeISO()) {
  const sortear = sorteador(42)
  const entre = (min: number, max: number) => Math.round((min + sortear() * (max - min)) * 100)

  const contas: Conta[] = [
    { id: novoId(), nome: 'Nubank', cor: '#5f3dc4', saldoInicial: 250000, arquivada: false, ordem: 0 },
    { id: novoId(), nome: 'Itaú', cor: '#f08c00', saldoInicial: 120000, arquivada: false, ordem: 1 },
    { id: novoId(), nome: 'Carteira', cor: '#2f9e44', saldoInicial: 15000, arquivada: false, ordem: 2 },
  ]
  const cartoes: Cartao[] = [
    { id: novoId(), nome: 'Nubank Roxinho', cor: '#ae3ec9', limite: 800000, diaFechamento: 3, diaVencimento: 10, arquivado: false, ordem: 0 },
    { id: novoId(), nome: 'Itaú Visa', cor: '#1c7ed6', limite: 500000, diaFechamento: 28, diaVencimento: 5, arquivado: false, ordem: 1 },
  ]
  const [nubank, itau, carteira] = contas
  const [roxinho, visa] = cartoes

  const dados: DadosLancamento[] = []
  const base = { observacao: '', tags: [] as string[], parcelas: 1, tipo: 'despesa' as const }
  const add = (d: Partial<DadosLancamento> & Pick<DadosLancamento, 'valor' | 'descricao' | 'categoriaId' | 'dataCompra' | 'metodo'>) =>
    dados.push({ ...base, ...d })

  const inicio = addMonths(deISO(hoje), -3)
  for (let mes = 0; mes <= 3; mes++) {
    const noMes = (dia: number) => {
      const d = addMonths(inicio, mes)
      return paraISO(new Date(d.getFullYear(), d.getMonth(), dia))
    }
    add({ tipo: 'receita', metodo: 'transferencia', contaId: itau.id, valor: 390000, descricao: 'Salário', categoriaId: 'cat-salario', dataCompra: noMes(5) })
    add({ tipo: 'receita', metodo: 'transferencia', contaId: itau.id, valor: 260000, descricao: 'Adiantamento', categoriaId: 'cat-salario', dataCompra: noMes(20) })
    add({ metodo: 'pix', contaId: itau.id, valor: 180000, descricao: 'Aluguel', categoriaId: 'cat-moradia', dataCompra: noMes(10) })
    add({ metodo: 'debito', contaId: itau.id, valor: entre(140, 190), descricao: 'Conta de luz', categoriaId: 'cat-moradia', dataCompra: noMes(12) })
    add({ metodo: 'credito', cartaoId: roxinho.id, valor: 5590, descricao: 'Netflix', categoriaId: 'cat-assinaturas', dataCompra: noMes(8) })
    add({ metodo: 'credito', cartaoId: roxinho.id, valor: 2190, descricao: 'Spotify', categoriaId: 'cat-assinaturas', dataCompra: noMes(15) })
    add({ metodo: 'credito', cartaoId: visa.id, valor: 19900, descricao: 'Curso de inglês', categoriaId: 'cat-educacao', dataCompra: noMes(20) })
    if (mes % 2 === 1)
      add({ tipo: 'receita', metodo: 'pix', contaId: nubank.id, valor: entre(300, 900), descricao: 'Freela', categoriaId: 'cat-renda-extra', dataCompra: noMes(18) })
  }

  // Gastos do dia a dia, espalhados pelos últimos 90 dias.
  const diarios: [string, string, number, number, DadosLancamento['metodo']][] = [
    ['Mercado', 'cat-mercado', 180, 460, 'debito'],
    ['iFood', 'cat-alimentacao', 35, 95, 'credito'],
    ['Almoço', 'cat-alimentacao', 25, 48, 'pix'],
    ['Uber', 'cat-transporte', 14, 42, 'credito'],
    ['Padaria', 'cat-alimentacao', 8, 30, 'dinheiro'],
    ['Farmácia', 'cat-saude', 20, 120, 'credito'],
    ['Combustível', 'cat-transporte', 180, 280, 'debito'],
    ['Cinema', 'cat-lazer', 40, 90, 'credito'],
    ['Bar com amigos', 'cat-lazer', 60, 180, 'pix'],
    ['Roupas', 'cat-compras', 90, 320, 'credito'],
  ]
  for (let i = 1; i <= 90; i++) {
    if (sortear() < 0.35) continue
    const [descricao, categoriaId, min, max, metodo] = diarios[Math.floor(sortear() * diarios.length)]
    const dataCompra = paraISO(subDays(deISO(hoje), 90 - i))
    const credito = metodo === 'credito'
    add({
      metodo,
      valor: entre(min, max),
      descricao,
      categoriaId,
      dataCompra,
      ...(credito
        ? { cartaoId: sortear() < 0.6 ? roxinho.id : visa.id }
        : { contaId: metodo === 'dinheiro' ? carteira.id : sortear() < 0.5 ? nubank.id : itau.id }),
    })
  }

  // Compras parceladas e uma viagem com tag.
  const diasAtras = (n: number) => paraISO(subDays(deISO(hoje), n))
  add({ metodo: 'credito', cartaoId: roxinho.id, valor: 480000, parcelas: 10, descricao: 'Notebook', categoriaId: 'cat-compras', dataCompra: diasAtras(40) })
  add({ metodo: 'credito', cartaoId: visa.id, valor: 60000, parcelas: 3, descricao: 'Tênis de corrida', categoriaId: 'cat-compras', dataCompra: diasAtras(18) })
  add({ metodo: 'credito', cartaoId: roxinho.id, valor: 92000, descricao: 'Passagem aérea', categoriaId: 'cat-lazer', dataCompra: diasAtras(25), tags: ['viagem-rio'], observacao: 'Ida e volta' })
  add({ metodo: 'pix', contaId: nubank.id, valor: 64000, descricao: 'Hotel', categoriaId: 'cat-lazer', dataCompra: diasAtras(24), tags: ['viagem-rio'] })

  const agora = Date.now()
  const lancamentos: Lancamento[] = dados
    .filter((d) => d.dataCompra <= hoje)
    .flatMap((d, i) => gerarLancamentos(d, novoId, agora + i))

  // Planejamento do ciclo atual e do anterior (sem apagar planos que já existam).
  const { diaInicioCiclo } = await lerAjustes(banco)
  const cicloDeHoje = cicloAtual(diaInicioCiclo, hoje)
  const limites = [
    ['cat-alimentacao', 80000],
    ['cat-mercado', 100000],
    ['cat-transporte', 50000],
    ['cat-lazer', 40000],
    ['cat-compras', 50000],
    ['cat-saude', 20000],
    ['cat-moradia', 180000],
    ['cat-assinaturas', 10000],
    ['cat-educacao', 20000],
  ].map(([categoriaId, limite]) => ({ categoriaId: categoriaId as string, limite: limite as number }))

  await banco.transaction('rw', [banco.contas, banco.cartoes, banco.lancamentos, banco.pagamentosFatura, banco.planos], async () => {
    await banco.contas.bulkAdd(contas)
    await banco.cartoes.bulkAdd(cartoes)
    await banco.lancamentos.bulkAdd(lancamentos)
    for (const ciclo of [deslocarCiclo(cicloDeHoje, -1, diaInicioCiclo), cicloDeHoje]) {
      if (await planoDoCiclo(ciclo, banco)) continue
      await banco.planos.add({ id: novoId(), ...ciclo, limites, rendaPrevista: 650000, metaEconomia: 100000 })
    }
    // Faturas já vencidas aparecem pagas (pela conta onde cai o salário).
    for (const cartao of cartoes) {
      const totais = totaisPorFatura(lancamentos.filter((l) => l.cartaoId === cartao.id), cartao)
      for (const [chave, total] of totais) {
        const fatura = faturaPorChave(chave, cartao)
        if (fatura.vencimento >= hoje) continue
        await banco.pagamentosFatura.add({
          id: novoId(),
          cartaoId: cartao.id,
          fatura: chave,
          valor: total,
          data: fatura.vencimento,
          contaId: itau.id,
        })
      }
    }
  })
}
