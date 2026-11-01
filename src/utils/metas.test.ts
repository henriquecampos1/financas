import { describe, expect, it } from 'vitest'
import { mesesAtePrazo, progressoMeta, sugestaoMensal, valorGuardado } from './metas'

const meta = {
  valorAlvo: 1200000,
  prazo: '2027-04-30',
  aportes: [
    { id: 'a', data: '2026-09-01', valor: 300000 },
    { id: 'b', data: '2026-10-01', valor: 100000 },
    { id: 'c', data: '2026-10-15', valor: -50000 }, // retirada
  ],
}

describe('metas', () => {
  it('guardado = aportes − retiradas; progresso em %', () => {
    expect(valorGuardado(meta)).toBe(350000)
    expect(progressoMeta(meta)).toBe(29)
  })

  it('meses até o prazo contam o mês atual', () => {
    expect(mesesAtePrazo('2026-11-01', '2027-04-30')).toBe(6) // nov, dez, jan, fev, mar, abr
    expect(mesesAtePrazo('2026-11-20', '2026-11-25')).toBe(1)
    expect(mesesAtePrazo('2026-11-20', '2026-11-10')).toBe(0)
  })

  it('sugestão mensal = o que falta ÷ meses, arredondado para cima', () => {
    expect(sugestaoMensal(meta, '2026-11-01')).toBe(Math.ceil(850000 / 6))
    expect(sugestaoMensal({ ...meta, prazo: undefined }, '2026-11-01')).toBeUndefined()
    expect(sugestaoMensal({ ...meta, prazo: '2026-01-01' }, '2026-11-01')).toBeUndefined()
    expect(sugestaoMensal({ ...meta, valorAlvo: 100000 }, '2026-11-01')).toBe(0)
  })
})
