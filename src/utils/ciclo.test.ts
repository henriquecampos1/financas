import { describe, expect, it } from 'vitest'
import {
  cicloDaData,
  cicloDoMes,
  ciclosAte,
  dataNoCiclo,
  deslocarCiclo,
  diaInicioValido,
  diasNoCiclo,
  diasRestantes,
  rotuloCiclo,
} from './ciclo'
import { somarDias } from './datas'

describe('cicloDaData', () => {
  it('dia 15: vai do dia 15 até o dia 14 do mês seguinte', () => {
    expect(cicloDaData('2026-01-20', 15)).toEqual({ inicio: '2026-01-15', fim: '2026-02-14' })
    expect(cicloDaData('2026-02-14', 15)).toEqual({ inicio: '2026-01-15', fim: '2026-02-14' })
    expect(cicloDaData('2026-02-15', 15)).toEqual({ inicio: '2026-02-15', fim: '2026-03-14' })
  })

  it('o primeiro e o último dia pertencem ao ciclo (inclusive)', () => {
    const c = cicloDaData('2026-05-15', 15)
    expect(c.inicio).toBe('2026-05-15')
    expect(dataNoCiclo('2026-05-15', c)).toBe(true)
    expect(dataNoCiclo('2026-06-14', c)).toBe(true)
    expect(dataNoCiclo('2026-06-15', c)).toBe(false)
    expect(dataNoCiclo('2026-05-14', c)).toBe(false)
  })

  it('dia 1 equivale ao mês do calendário', () => {
    expect(cicloDaData('2026-02-10', 1)).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' })
    expect(cicloDaData('2028-02-10', 1)).toEqual({ inicio: '2028-02-01', fim: '2028-02-29' })
    expect(cicloDaData('2026-12-31', 1)).toEqual({ inicio: '2026-12-01', fim: '2026-12-31' })
  })

  it('virada de ano', () => {
    expect(cicloDaData('2027-01-05', 15)).toEqual({ inicio: '2026-12-15', fim: '2027-01-14' })
    expect(cicloDaData('2026-12-20', 15)).toEqual({ inicio: '2026-12-15', fim: '2027-01-14' })
    expect(cicloDaData('2027-01-15', 15)).toEqual({ inicio: '2027-01-15', fim: '2027-02-14' })
  })

  it('meses curtos: dia 31 usa o último dia do mês', () => {
    // Janeiro tem 31 → começa 31/01; fevereiro de 2026 tem 28 → o próximo começa 28/02.
    expect(cicloDaData('2026-02-10', 31)).toEqual({ inicio: '2026-01-31', fim: '2026-02-27' })
    expect(cicloDaData('2026-02-28', 31)).toEqual({ inicio: '2026-02-28', fim: '2026-03-30' })
    expect(cicloDaData('2026-03-31', 31)).toEqual({ inicio: '2026-03-31', fim: '2026-04-29' })
    expect(cicloDaData('2026-04-30', 31)).toEqual({ inicio: '2026-04-30', fim: '2026-05-30' })
  })

  it('meses curtos: dia 30 e 29 em fevereiro (ano comum e bissexto)', () => {
    expect(cicloDaData('2026-02-15', 30)).toEqual({ inicio: '2026-01-30', fim: '2026-02-27' })
    expect(cicloDaData('2026-02-28', 30)).toEqual({ inicio: '2026-02-28', fim: '2026-03-29' })
    expect(cicloDaData('2028-02-29', 30)).toEqual({ inicio: '2028-02-29', fim: '2028-03-29' })
    expect(cicloDaData('2026-02-28', 29)).toEqual({ inicio: '2026-02-28', fim: '2026-03-28' })
    expect(cicloDaData('2028-02-28', 29)).toEqual({ inicio: '2028-01-29', fim: '2028-02-28' })
    expect(cicloDaData('2028-02-29', 29)).toEqual({ inicio: '2028-02-29', fim: '2028-03-28' })
  })

  it('valores de dia fora da faixa são corrigidos', () => {
    expect(diaInicioValido(0)).toBe(1)
    expect(diaInicioValido(45)).toBe(31)
    expect(diaInicioValido(Number.NaN)).toBe(1)
    expect(cicloDaData('2026-03-10', 0)).toEqual({ inicio: '2026-03-01', fim: '2026-03-31' })
  })
})

describe('sequência de ciclos', () => {
  it('não deixa buracos nem sobreposição ao longo de vários anos', () => {
    for (const dia of [1, 5, 15, 28, 29, 30, 31]) {
      let c = cicloDoMes(2025, 0, dia)
      for (let i = 0; i < 60; i++) {
        const proximo = deslocarCiclo(c, 1, dia)
        expect(proximo.inicio).toBe(somarDias(c.fim, 1))
        expect(proximo.inicio > c.fim).toBe(true)
        c = proximo
      }
    }
  })

  it('deslocar para trás e para frente, inclusive pela virada do ano', () => {
    const atual = cicloDaData('2026-01-20', 15)
    expect(deslocarCiclo(atual, -1, 15)).toEqual({ inicio: '2025-12-15', fim: '2026-01-14' })
    expect(deslocarCiclo(atual, 1, 15)).toEqual({ inicio: '2026-02-15', fim: '2026-03-14' })
    expect(deslocarCiclo(atual, 12, 15)).toEqual({ inicio: '2027-01-15', fim: '2027-02-14' })
    expect(deslocarCiclo(deslocarCiclo(atual, -7, 15), 7, 15)).toEqual(atual)
  })

  it('deslocar mantém o dia escolhido depois de passar por um mês curto', () => {
    const fev = cicloDaData('2026-03-01', 31) // 28/02 a 30/03
    expect(deslocarCiclo(fev, 1, 31)).toEqual({ inicio: '2026-03-31', fim: '2026-04-29' })
  })

  it('ciclosAte devolve os últimos ciclos em ordem', () => {
    const lista = ciclosAte(cicloDaData('2026-03-20', 15), 3, 15)
    expect(lista.map((c) => c.inicio)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15'])
  })
})

describe('contagem de dias', () => {
  const c = { inicio: '2026-01-15', fim: '2026-02-14' }

  it('dias no ciclo', () => {
    expect(diasNoCiclo(c)).toBe(31)
    expect(diasNoCiclo({ inicio: '2026-02-01', fim: '2026-02-28' })).toBe(28)
  })

  it('dias restantes contam o dia de hoje', () => {
    expect(diasRestantes(c, '2026-02-14')).toBe(1)
    expect(diasRestantes(c, '2026-02-13')).toBe(2)
    expect(diasRestantes(c, '2026-01-15')).toBe(31)
    expect(diasRestantes(c, '2026-02-15')).toBe(0)
    expect(diasRestantes(c, '2026-01-01')).toBe(31)
  })
})

describe('rotuloCiclo', () => {
  it('mostra o ano uma vez quando o ciclo fica no mesmo ano', () => {
    expect(rotuloCiclo({ inicio: '2026-10-15', fim: '2026-11-14' })).toBe('15 out – 14 nov 2026')
  })
  it('mostra os dois anos na virada', () => {
    expect(rotuloCiclo({ inicio: '2026-12-15', fim: '2027-01-14' })).toBe('15 dez 2026 – 14 jan 2027')
  })
})
