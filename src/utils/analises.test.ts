import { describe, expect, it } from 'vitest'
import type { Lancamento, Metodo } from '@/db/tipos'
import {
  OUTRAS,
  diasDecorridos,
  economiaPorCiclo,
  gastosPorCategoria,
  gastosPorCiclo,
  gastosPorMetodo,
  indicadores,
  juntarOutras,
  marcasDoEixo,
  ritmoDoPeriodo,
} from './analises'
import { paraCompetencia } from './competencia'

let n = 0
function item(categoriaId: string, valor: number, data: string, metodo: Metodo = 'pix', tipo: 'despesa' | 'receita' = 'despesa') {
  const l = { id: `l${++n}`, tipo, metodo, valor, descricao: `d${n}`, categoriaId, data, dataCompra: data, tags: [], criadoEm: n } as Lancamento
  return paraCompetencia([l], 'por-parcela')[0]
}

const ciclo = { inicio: '2026-10-15', fim: '2026-11-14' } // 31 dias
const itens = [
  item('mercado', 30000, '2026-10-15', 'debito'),
  item('mercado', 10000, '2026-10-20', 'credito'),
  item('lazer', 20000, '2026-10-16', 'credito'),
  item('saude', 5000, '2026-10-17', 'pix'),
  item('salario', 500000, '2026-10-20', 'transferencia', 'receita'),
]

describe('fatias', () => {
  it('por categoria, do maior para o menor, só despesas', () => {
    expect(gastosPorCategoria(itens)).toEqual([
      { chave: 'mercado', valor: 40000, porcentagem: 61.5 },
      { chave: 'lazer', valor: 20000, porcentagem: 30.8 },
      { chave: 'saude', valor: 5000, porcentagem: 7.7 },
    ])
  })

  it('por forma de pagamento, na ordem fixa e sem as zeradas', () => {
    expect(gastosPorMetodo(itens).map((f) => [f.chave, f.valor])).toEqual([
      ['credito', 30000],
      ['pix', 5000],
      ['debito', 30000],
    ])
  })

  it('junta o resto em "Outras" quando passa do máximo', () => {
    const muitas = Array.from({ length: 9 }, (_, i) => ({ chave: `c${i}`, valor: 900 - i * 100, porcentagem: 10 }))
    const juntas = juntarOutras(muitas, 6)
    expect(juntas).toHaveLength(7)
    expect(juntas[6]).toEqual({ chave: OUTRAS, valor: 300 + 200 + 100, porcentagem: 30 })
    // Com uma só sobrando, não vale criar "Outras".
    expect(juntarOutras(muitas.slice(0, 7), 6)).toHaveLength(7)
  })
})

describe('gastosPorCiclo', () => {
  it('soma por ciclo, total ou de uma categoria', () => {
    const ciclos = [
      { inicio: '2026-09-15', fim: '2026-10-14' },
      ciclo,
    ]
    const lista = [...itens, item('mercado', 7000, '2026-10-01')]
    expect(gastosPorCiclo(lista, ciclos).map((c) => c.valor)).toEqual([7000, 65000])
    expect(gastosPorCiclo(lista, ciclos, 'mercado').map((c) => c.valor)).toEqual([7000, 40000])
  })
})

describe('marcasDoEixo', () => {
  it('passos redondos em reais, do zero até cobrir o maior valor', () => {
    expect(marcasDoEixo(260000)).toEqual([0, 100000, 200000, 300000])
    expect(marcasDoEixo(780000)).toEqual([0, 200000, 400000, 600000, 800000])
    expect(marcasDoEixo(9000)).toEqual([0, 2500, 5000, 7500, 10000])
    expect(marcasDoEixo(0)).toEqual([0, 25, 50, 75, 100])
  })
  it('com valores negativos, desce abaixo do zero no mesmo passo', () => {
    expect(marcasDoEixo(300000, 4, -120000)).toEqual([-200000, 0, 200000, 400000])
    expect(marcasDoEixo(0, 4, -50000)).toEqual([-60000, -40000, -20000, 0])
  })
})

describe('economiaPorCiclo', () => {
  it('receitas − despesas de cada ciclo, inclusive negativa', () => {
    const anterior = { inicio: '2026-09-15', fim: '2026-10-14' }
    const lista = [...itens, item('lazer', 80000, '2026-10-01'), item('salario', 50000, '2026-10-02', 'pix', 'receita')]
    expect(economiaPorCiclo(lista, [anterior, ciclo])).toEqual([
      { ciclo: anterior, receitas: 50000, despesas: 80000, economia: -30000 },
      { ciclo, receitas: 500000, despesas: 65000, economia: 435000 },
    ])
  })
})

describe('ritmo e indicadores', () => {
  it('acumulado dia a dia, sem pontos no futuro, e ritmo ideal linear', () => {
    const pontos = ritmoDoPeriodo(itens, ciclo, '2026-10-17', 310000)
    expect(pontos).toHaveLength(31)
    expect(pontos.slice(0, 4).map((p) => p.acumulado)).toEqual([30000, 50000, 55000, null])
    expect(pontos[0].ideal).toBe(10000)
    expect(pontos[30].ideal).toBe(310000)
    expect(ritmoDoPeriodo(itens, ciclo, '2026-10-17')[0].ideal).toBeNull()
  })

  it('dias decorridos', () => {
    expect(diasDecorridos(ciclo, '2026-10-14')).toBe(0)
    expect(diasDecorridos(ciclo, '2026-10-15')).toBe(1)
    expect(diasDecorridos(ciclo, '2026-12-01')).toBe(31)
  })

  it('maior gasto, média diária e projeção no ritmo atual', () => {
    // Até 24/10 (10 dias): 65.000 gastos → 6.500/dia → 31 dias = 201.500.
    const r = indicadores(itens, ciclo, '2026-10-24')
    expect(r.total).toBe(65000)
    expect(r.maior?.valor).toBe(30000)
    expect(r.mediaDiaria).toBe(6500)
    expect(r.projecao).toBe(201500)
  })

  it('parcelas com data futura entram na projeção sem acelerar o ritmo', () => {
    const comFutura = [...itens, item('compras', 20000, '2026-11-10', 'credito')]
    const r = indicadores(comFutura, ciclo, '2026-10-24')
    expect(r.mediaDiaria).toBe(6500)
    expect(r.projecao).toBe(201500 + 20000)
  })

  it('período encerrado: sem projeção, média sobre todos os dias', () => {
    const r = indicadores(itens, ciclo, '2026-12-01')
    expect(r.projecao).toBeUndefined()
    expect(r.mediaDiaria).toBe(Math.round(65000 / 31))
  })
})
