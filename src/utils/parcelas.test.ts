import { describe, expect, it } from 'vitest'
import { dadosDoLancamento, dataDaParcela, dividirEmParcelas, gerarLancamentos, lerTags, type DadosLancamento } from './parcelas'

function ids() {
  let n = 0
  return () => `id${++n}`
}

const compra: DadosLancamento = {
  tipo: 'despesa',
  metodo: 'credito',
  valor: 100000,
  descricao: ' Notebook ',
  categoriaId: 'cat-compras',
  dataCompra: '2026-01-31',
  cartaoId: 'c1',
  contaId: 'conta-ignorada',
  parcelas: 3,
  observacao: '',
  tags: ['trabalho'],
}

describe('dividirEmParcelas', () => {
  it('divide em centavos inteiros e a sobra vai na primeira', () => {
    expect(dividirEmParcelas(100000, 3)).toEqual([33334, 33333, 33333])
    expect(dividirEmParcelas(60000, 3)).toEqual([20000, 20000, 20000])
    expect(dividirEmParcelas(5, 3)).toEqual([3, 1, 1])
    expect(dividirEmParcelas(1999, 1)).toEqual([1999])
  })
  it('a soma das parcelas é sempre o total', () => {
    for (const [total, n] of [[123457, 7], [1, 24], [99999, 24], [100, 12]]) {
      expect(dividirEmParcelas(total, n).reduce((a, b) => a + b)).toBe(total)
    }
  })
})

describe('dataDaParcela', () => {
  it('soma meses e usa o último dia nos meses curtos', () => {
    expect(dataDaParcela('2026-01-31', 0)).toBe('2026-01-31')
    expect(dataDaParcela('2026-01-31', 1)).toBe('2026-02-28')
    expect(dataDaParcela('2026-01-31', 2)).toBe('2026-03-31')
    expect(dataDaParcela('2026-11-15', 3)).toBe('2027-02-15')
  })
})

describe('gerarLancamentos', () => {
  it('crédito parcelado: uma linha por parcela, ligadas pelo mesmo grupo', () => {
    const lista = gerarLancamentos(compra, ids(), 1000)
    expect(lista).toHaveLength(3)
    expect(lista.map((l) => l.valor)).toEqual([33334, 33333, 33333])
    expect(lista.map((l) => l.data)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    expect(lista.every((l) => l.dataCompra === '2026-01-31')).toBe(true)
    expect(lista.map((l) => l.parcela)).toEqual([
      { numero: 1, total: 3 },
      { numero: 2, total: 3 },
      { numero: 3, total: 3 },
    ])
    const grupo = lista[0].grupoParcelasId
    expect(grupo).toBeTruthy()
    expect(lista.every((l) => l.grupoParcelasId === grupo)).toBe(true)
    expect(lista[0]).toMatchObject({ descricao: 'Notebook', cartaoId: 'c1', tipo: 'despesa', criadoEm: 1000 })
    expect(lista[0].contaId).toBeUndefined()
  })

  it('à vista: um lançamento só, sem grupo', () => {
    const [l, ...resto] = gerarLancamentos({ ...compra, parcelas: 1 }, ids(), 1)
    expect(resto).toHaveLength(0)
    expect(l.parcela).toBeUndefined()
    expect(l.grupoParcelasId).toBeUndefined()
    expect(l.valor).toBe(100000)
  })

  it('pix ignora parcelas e usa a conta', () => {
    const lista = gerarLancamentos({ ...compra, metodo: 'pix', tipo: 'receita' }, ids(), 1)
    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatchObject({ metodo: 'pix', tipo: 'receita', contaId: 'conta-ignorada' })
    expect(lista[0].cartaoId).toBeUndefined()
  })

  it('limita a 24 parcelas', () => {
    expect(gerarLancamentos({ ...compra, parcelas: 40 }, ids(), 1)).toHaveLength(24)
  })

  it('ao editar, mantém id, grupo e data de criação', () => {
    const lista = gerarLancamentos(compra, ids(), 999, { id: 'antigo', grupoParcelasId: 'g-antigo', criadoEm: 5 })
    expect(lista[0].id).toBe('antigo')
    expect(lista.every((l) => l.grupoParcelasId === 'g-antigo' && l.criadoEm === 5)).toBe(true)
  })

  it('dadosDoLancamento refaz o total a partir das parcelas', () => {
    const lista = gerarLancamentos(compra, ids(), 1)
    expect(dadosDoLancamento(lista[1], lista)).toMatchObject({ valor: 100000, parcelas: 3, dataCompra: '2026-01-31' })
  })
})

describe('lerTags', () => {
  it('aceita # opcional, vírgulas e espaços, sem repetir', () => {
    expect(lerTags('#Viagem-Rio, trabalho  #viagem-rio')).toEqual(['viagem-rio', 'trabalho'])
    expect(lerTags('  ')).toEqual([])
  })
})
