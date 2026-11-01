import { describe, expect, it } from 'vitest'
import type { Lancamento } from '@/db/tipos'
import { agruparPorDia, campoDeData, paraCompetencia, totais } from './competencia'
import { gerarLancamentos } from './parcelas'

let n = 0
const id = () => `id${++n}`

const geladeira = gerarLancamentos(
  {
    tipo: 'despesa',
    metodo: 'credito',
    valor: 300000,
    descricao: 'Geladeira',
    categoriaId: 'cat-moradia',
    dataCompra: '2026-10-20',
    cartaoId: 'c1',
    parcelas: 3,
    observacao: '',
    tags: [],
  },
  id,
  10,
)
const mercado = gerarLancamentos(
  {
    tipo: 'despesa',
    metodo: 'pix',
    valor: 25000,
    descricao: 'Mercado',
    categoriaId: 'cat-mercado',
    dataCompra: '2026-10-20',
    contaId: 'a1',
    parcelas: 1,
    observacao: '',
    tags: [],
  },
  id,
  20,
)
const salario = gerarLancamentos(
  {
    tipo: 'receita',
    metodo: 'transferencia',
    valor: 500000,
    descricao: 'Salário',
    categoriaId: 'cat-salario',
    dataCompra: '2026-10-15',
    contaId: 'a1',
    parcelas: 1,
    observacao: '',
    tags: [],
  },
  id,
  5,
)
const todos: Lancamento[] = [...geladeira, ...mercado, ...salario]

describe('paraCompetencia', () => {
  it('por parcela: cada parcela é um item, na data dela', () => {
    const itens = paraCompetencia(todos, 'por-parcela')
    expect(itens).toHaveLength(5)
    expect(itens.filter((i) => i.lancamento.grupoParcelasId).map((i) => [i.data, i.valor, i.rotuloParcela])).toEqual([
      ['2026-10-20', 100000, '1/3'],
      ['2026-11-20', 100000, '2/3'],
      ['2026-12-20', 100000, '3/3'],
    ])
    expect(campoDeData('por-parcela')).toBe('data')
  })

  it('total na compra: a compra parcelada vira um item com o total, na data da compra', () => {
    // Embaralhado de propósito: o item deve representar a 1ª parcela.
    const itens = paraCompetencia([geladeira[2], ...mercado, geladeira[0], geladeira[1]], 'total-na-compra')
    expect(itens).toHaveLength(2)
    const compra = itens.find((i) => i.lancamento.grupoParcelasId)!
    expect(compra).toMatchObject({ data: '2026-10-20', valor: 300000, rotuloParcela: '3x', id: geladeira[0].grupoParcelasId })
    expect(compra.lancamento.parcela?.numero).toBe(1)
    expect(campoDeData('total-na-compra')).toBe('dataCompra')
  })
})

describe('totais e agrupamento', () => {
  it('soma receitas e despesas separadamente', () => {
    expect(totais(paraCompetencia([...mercado, ...salario, geladeira[0]], 'por-parcela'))).toEqual({
      receitas: 500000,
      despesas: 125000,
      saldo: 375000,
    })
  })

  it('agrupa por dia, do mais recente para o mais antigo', () => {
    const dias = agruparPorDia(paraCompetencia([...salario, ...mercado, geladeira[0]], 'por-parcela'))
    expect(dias.map((d) => d.data)).toEqual(['2026-10-20', '2026-10-15'])
    // No mesmo dia, o lançado por último aparece primeiro.
    expect(dias[0].itens.map((i) => i.lancamento.descricao)).toEqual(['Mercado', 'Geladeira'])
    expect(dias[0].saldo).toBe(-125000)
    expect(dias[1].saldo).toBe(500000)
  })
})
