import { describe, expect, it } from 'vitest'
import type { Recorrencia } from '@/db/tipos'
import { compromissosFuturos } from './compromissos'
import { gerarLancamentos } from './parcelas'

let n = 0
const id = () => `id${++n}`
const nov = { inicio: '2026-11-15', fim: '2026-12-14' }
const out = { inicio: '2026-10-15', fim: '2026-11-14' }
const hoje = '2026-11-01'

const notebook = gerarLancamentos(
  {
    tipo: 'despesa',
    metodo: 'credito',
    valor: 300000,
    descricao: 'Notebook',
    categoriaId: 'cat-compras',
    dataCompra: '2026-10-20',
    cartaoId: 'c1',
    parcelas: 3,
    observacao: '',
    tags: [],
  },
  id,
  0,
)

const base: Omit<Recorrencia, 'id' | 'descricao' | 'tipo' | 'valor' | 'dia'> = {
  metodo: 'pix',
  categoriaId: 'x',
  contaId: 'a',
  inicio: '2026-01-01',
  confirmarAntes: false,
  ativa: true,
  tags: [],
}
const aluguel: Recorrencia = { ...base, id: 'r1', descricao: 'Aluguel', tipo: 'despesa', valor: 180000, dia: 10 }
const salario: Recorrencia = { ...base, id: 'r2', descricao: 'Salário', tipo: 'receita', valor: 650000, dia: 5, metodo: 'transferencia' }
const pausada: Recorrencia = { ...aluguel, id: 'r3', ativa: false }

describe('compromissosFuturos', () => {
  const futuros = notebook.filter((l) => l.data > hoje) // parcelas 2/3 (20/11) e 3/3 (20/12)

  it('no ciclo atual, só o que vem depois de hoje', () => {
    const [atual] = compromissosFuturos([out], futuros, [aluguel, salario], hoje)
    // Ciclo 15/10–14/11, a partir de 02/11: salário 05/11 e aluguel 10/11 (a parcela 2/3 cai em 20/11).
    expect(atual.itens.map((i) => [i.descricao, i.data, i.origem])).toEqual([
      ['Salário', '2026-11-05', 'fixa'],
      ['Aluguel', '2026-11-10', 'fixa'],
    ])
    expect(atual).toMatchObject({ despesas: 180000, receitas: 650000 })
  })

  it('no próximo ciclo, parcelas e fixas; ignora as pausadas', () => {
    const [proximo] = compromissosFuturos([nov], futuros, [aluguel, salario, pausada], hoje)
    expect(proximo.itens.map((i) => [i.descricao, i.data, i.rotulo ?? i.origem])).toEqual([
      ['Notebook', '2026-11-20', '2/3'],
      ['Salário', '2026-12-05', 'fixa'],
      ['Aluguel', '2026-12-10', 'fixa'],
    ])
    expect(proximo.despesas).toBe(100000 + 180000)
  })

  it('não conta de novo um mês já lançado nem um mês pulado', () => {
    const lancado = { ...notebook[0], id: 'x', data: '2026-11-10', recorrenciaId: 'r1', recorrenciaMes: '2026-11', grupoParcelasId: undefined, parcela: undefined, descricao: 'Aluguel' }
    const [atual] = compromissosFuturos([out], [lancado], [{ ...aluguel }, { ...salario, puladas: ['2026-11'] }], hoje)
    expect(atual.itens.map((i) => [i.descricao, i.origem])).toEqual([['Aluguel', 'agendado']])
  })
})
