import { describe, expect, it } from 'vitest'
import { dataNoMes, ocorrencias, ocorrenciasDevidas } from './recorrencias'

describe('ocorrencias', () => {
  it('uma por mês, no dia escolhido, a partir do início', () => {
    expect(ocorrencias({ dia: 10, inicio: '2026-09-15' }, '2026-01-01', '2026-12-31')).toEqual([
      { mes: '2026-10', data: '2026-10-10' },
      { mes: '2026-11', data: '2026-11-10' },
      { mes: '2026-12', data: '2026-12-10' },
    ])
  })

  it('dia 31 vira o último dia nos meses curtos, inclusive fevereiro', () => {
    expect(ocorrencias({ dia: 31, inicio: '2027-01-01' }, '2027-01-01', '2027-04-30').map((o) => o.data)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
    ])
    expect(dataNoMes('2028-02', 30)).toBe('2028-02-29')
  })

  it('para no fim da recorrência e respeita o intervalo pedido', () => {
    const rec = { dia: 5, inicio: '2026-01-01', fim: '2026-03-31' }
    expect(ocorrencias(rec, '2026-02-01', '2026-12-31').map((o) => o.mes)).toEqual(['2026-02', '2026-03'])
    expect(ocorrencias(rec, '2026-04-01', '2026-12-31')).toEqual([])
  })

  it('vira o ano', () => {
    expect(ocorrencias({ dia: 20, inicio: '2026-11-01' }, '2026-11-01', '2027-02-01').map((o) => o.mes)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
    ])
  })
})

describe('ocorrenciasDevidas', () => {
  const rec = { dia: 8, inicio: '2026-08-01', puladas: ['2026-09'] }

  it('só até hoje, sem as já lançadas nem as puladas', () => {
    const devidas = ocorrenciasDevidas(rec, '2026-11-07', new Set(['2026-08']))
    expect(devidas).toEqual([{ mes: '2026-10', data: '2026-10-08' }])
  })

  it('no próprio dia já é devida', () => {
    expect(ocorrenciasDevidas(rec, '2026-11-08', new Set(['2026-08', '2026-10'])).map((o) => o.mes)).toEqual(['2026-11'])
  })
})
