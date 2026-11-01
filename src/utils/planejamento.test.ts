import { describe, expect, it } from 'vitest'
import type { Lancamento } from '@/db/tipos'
import { paraCompetencia } from './competencia'
import { alertas, calcularPlano, faixaDeUso, porcentagem } from './planejamento'

const ciclo = { inicio: '2026-10-15', fim: '2026-11-14' }

let n = 0
function item(categoriaId: string, valor: number, tipo: 'despesa' | 'receita' = 'despesa') {
  const l = {
    id: `l${++n}`,
    tipo,
    metodo: 'pix',
    valor,
    descricao: '',
    categoriaId,
    data: '2026-10-20',
    dataCompra: '2026-10-20',
    tags: [],
    criadoEm: n,
  } as Lancamento
  return paraCompetencia([l], 'por-parcela')[0]
}

describe('faixaDeUso', () => {
  it('verde até 70%, amarelo até 100%, vermelho acima', () => {
    expect(faixaDeUso(0, 1000)).toBe('ok')
    expect(faixaDeUso(700, 1000)).toBe('ok')
    expect(faixaDeUso(701, 1000)).toBe('atencao')
    expect(faixaDeUso(1000, 1000)).toBe('atencao')
    expect(faixaDeUso(1001, 1000)).toBe('excedido')
  })
  it('sem limite: qualquer gasto já estoura', () => {
    expect(faixaDeUso(0, 0)).toBe('ok')
    expect(faixaDeUso(1, 0)).toBe('excedido')
    expect(porcentagem(5, 0)).toBe(100)
  })
})

describe('calcularPlano', () => {
  const plano = {
    limites: [
      { categoriaId: 'mercado', limite: 100000 },
      { categoriaId: 'lazer', limite: 30000 },
      { categoriaId: 'saude', limite: 0 }, // limite zerado não entra
    ],
  }
  const itens = [
    item('mercado', 60000),
    item('mercado', 25000),
    item('lazer', 36000),
    item('pets', 10000),
    item('salario', 500000, 'receita'),
  ]

  it('gasto, disponível e faixa por categoria', () => {
    const r = calcularPlano(plano, itens, ciclo, '2026-11-05')
    expect(r.linhas).toEqual([
      { categoriaId: 'mercado', limite: 100000, gasto: 85000, disponivel: 15000, porcentagem: 85, faixa: 'atencao' },
      { categoriaId: 'lazer', limite: 30000, gasto: 36000, disponivel: -6000, porcentagem: 120, faixa: 'excedido' },
    ])
  })

  it('o total inclui gastos de categorias sem limite', () => {
    const r = calcularPlano(plano, itens, ciclo, '2026-11-05')
    expect(r).toMatchObject({
      planejado: 130000,
      gasto: 131000,
      gastoSemLimite: 10000,
      disponivel: -1000,
      faixa: 'excedido',
      semLimite: [{ categoriaId: 'pets', gasto: 10000 }],
      receitas: 500000,
      sobra: 369000,
    })
  })

  it('quanto dá para gastar por dia = disponível ÷ dias restantes (contando hoje)', () => {
    const r = calcularPlano({ limites: [{ categoriaId: 'mercado', limite: 100000 }] }, [item('mercado', 40000)], ciclo, '2026-11-05')
    expect(r.diasRestantes).toBe(10) // 05/11 a 14/11
    expect(r.disponivel).toBe(60000)
    expect(r.porDia).toBe(6000)
  })

  it('sem sobra ou ciclo encerrado → 0 por dia', () => {
    expect(calcularPlano(plano, itens, ciclo, '2026-11-05').porDia).toBe(0)
    const encerrado = calcularPlano({ limites: [{ categoriaId: 'x', limite: 1000 }] }, [], ciclo, '2026-12-01')
    expect(encerrado).toMatchObject({ diasRestantes: 0, porDia: 0 })
  })

  it('alertas: categorias com 80% ou mais, da mais estourada para a menos', () => {
    const r = calcularPlano(plano, itens, ciclo, '2026-11-05')
    expect(alertas(r).map((l) => l.categoriaId)).toEqual(['lazer', 'mercado'])
  })
})
