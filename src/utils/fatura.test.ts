import { describe, expect, it } from 'vitest'
import type { Lancamento, PagamentoFatura } from '@/db/tipos'
import {
  deslocarFatura,
  faturaDaData,
  faturaDoLancamento,
  faturaPorChave,
  limiteUsado,
  pagoPorFatura,
  resumirFatura,
  situacaoFatura,
  totaisPorFatura,
} from './fatura'
import { gerarLancamentos } from './parcelas'

// Fecha dia 3 e vence dia 10 (mesmo mês).
const nubank = { diaFechamento: 3, diaVencimento: 10 }
// Fecha dia 28 e vence dia 5 (mês seguinte).
const itau = { diaFechamento: 28, diaVencimento: 5 }

describe('faturaDaData', () => {
  it('compra antes do fechamento entra na fatura que fecha no mês', () => {
    expect(faturaDaData('2026-11-02', nubank)).toEqual({
      chave: '2026-11',
      inicio: '2026-10-03',
      fim: '2026-11-02',
      fechamento: '2026-11-03',
      vencimento: '2026-11-10',
    })
  })

  it('compra no dia do fechamento já vai para a fatura seguinte', () => {
    expect(faturaDaData('2026-11-03', nubank).chave).toBe('2026-12')
    expect(faturaDaData('2026-11-30', nubank).chave).toBe('2026-12')
  })

  it('vencimento no mês seguinte ao fechamento', () => {
    expect(faturaDaData('2026-11-27', itau)).toEqual({
      chave: '2026-12',
      inicio: '2026-10-28',
      fim: '2026-11-27',
      fechamento: '2026-11-28',
      vencimento: '2026-12-05',
    })
    expect(faturaDaData('2026-11-28', itau).chave).toBe('2027-01')
  })

  it('virada de ano', () => {
    expect(faturaDaData('2026-12-20', nubank)).toMatchObject({ chave: '2027-01', fechamento: '2027-01-03' })
    expect(faturaDaData('2026-12-29', itau)).toMatchObject({ chave: '2027-02', vencimento: '2027-02-05' })
  })

  it('dia de fechamento 31 em mês curto usa o último dia', () => {
    const cartao = { diaFechamento: 31, diaVencimento: 8 }
    expect(faturaDaData('2026-02-27', cartao)).toMatchObject({ fechamento: '2026-02-28', inicio: '2026-01-31' })
    expect(faturaDaData('2026-02-28', cartao)).toMatchObject({ fechamento: '2026-03-31', inicio: '2026-02-28' })
  })

  it('as faturas se encaixam sem buracos', () => {
    for (const c of [nubank, itau, { diaFechamento: 31, diaVencimento: 10 }, { diaFechamento: 1, diaVencimento: 1 }]) {
      let f = faturaDaData('2026-01-15', c)
      for (let i = 0; i < 30; i++) {
        const proxima = deslocarFatura(f, 1, c)
        expect(proxima.inicio).toBe(f.fechamento)
        expect(faturaPorChave(proxima.chave, c)).toEqual(proxima)
        f = proxima
      }
    }
  })
})

describe('faturaDoLancamento', () => {
  it('cada parcela cai uma fatura depois da anterior', () => {
    const parcelas = gerarLancamentos(
      {
        tipo: 'despesa',
        metodo: 'credito',
        valor: 30000,
        descricao: 'Tênis',
        categoriaId: 'x',
        dataCompra: '2026-11-05',
        cartaoId: 'c',
        parcelas: 3,
        observacao: '',
        tags: [],
      },
      () => crypto.randomUUID(),
      0,
    )
    expect(parcelas.map((l) => faturaDoLancamento(l, nubank).chave)).toEqual(['2026-12', '2027-01', '2027-02'])
  })
})

describe('situação, totais e limite', () => {
  const f = faturaPorChave('2026-11', nubank) // 03/10 a 02/11, fecha 03/11, vence 10/11

  it('situação ao longo do tempo', () => {
    expect(situacaoFatura(f, 5000, 0, '2026-09-20')).toBe('futura')
    expect(situacaoFatura(f, 5000, 0, '2026-10-20')).toBe('aberta')
    expect(situacaoFatura(f, 5000, 0, '2026-11-03')).toBe('fechada')
    expect(situacaoFatura(f, 5000, 0, '2026-11-11')).toBe('vencida')
    expect(situacaoFatura(f, 5000, 5000, '2026-11-11')).toBe('paga')
    expect(situacaoFatura(f, 0, 0, '2026-11-11')).toBe('sem-gastos')
  })

  const lancamentos = [
    { metodo: 'credito', tipo: 'despesa', valor: 1000, dataCompra: '2026-10-10' },
    { metodo: 'credito', tipo: 'despesa', valor: 2000, dataCompra: '2026-11-02' },
    { metodo: 'credito', tipo: 'despesa', valor: 500, dataCompra: '2026-11-03' },
  ] as Lancamento[]
  const pagamentos = [{ fatura: '2026-11', valor: 3000 }] as PagamentoFatura[]

  it('total e pago por fatura', () => {
    expect(Object.fromEntries(totaisPorFatura(lancamentos, nubank))).toEqual({ '2026-11': 3000, '2026-12': 500 })
    expect(pagoPorFatura(pagamentos).get('2026-11')).toBe(3000)
  })

  it('pagamento antes do fechamento é antecipação: diminui o valor da fatura', () => {
    const totais = totaisPorFatura(lancamentos, nubank) // nov: 3000
    const pags = [
      { fatura: '2026-11', valor: 1000, data: '2026-10-25' }, // antecipado (fecha 03/11)
      { fatura: '2026-11', valor: 1500, data: '2026-11-08' }, // pagamento normal
    ] as PagamentoFatura[]
    expect(resumirFatura(f, totais, pags, '2026-10-26')).toMatchObject({
      compras: 3000,
      antecipado: 1000,
      valor: 2000,
      pago: 2500,
      restante: 500,
      situacao: 'aberta',
    })
    expect(resumirFatura(f, totais, pags, '2026-11-09').situacao).toBe('fechada')
    const quitada = [...pags, { fatura: '2026-11', valor: 500, data: '2026-11-09' }] as PagamentoFatura[]
    expect(resumirFatura(f, totais, quitada, '2026-11-20')).toMatchObject({ restante: 0, situacao: 'paga' })
  })

  it('pagamento de outra fatura não entra na conta', () => {
    const pags = [{ fatura: '2026-12', valor: 999, data: '2026-10-25' }] as PagamentoFatura[]
    expect(resumirFatura(f, new Map([['2026-11', 3000]]), pags, '2026-10-26')).toMatchObject({ antecipado: 0, valor: 3000 })
  })

  it('limite usado = compras − pagamentos (pagamento da fatura não é gasto novo)', () => {
    expect(limiteUsado(lancamentos, [])).toBe(3500)
    expect(limiteUsado(lancamentos, pagamentos)).toBe(500)
    expect(limiteUsado([], pagamentos)).toBe(0)
  })
})
