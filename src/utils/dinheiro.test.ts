import { describe, expect, it } from 'vitest'
import { centavosDosDigitos, formatarCompacto, formatarNumero, formatarReais, lerReais } from './dinheiro'

describe('formatarReais', () => {
  it('usa o formato brasileiro', () => {
    expect(formatarReais(123456)).toBe('R$ 1.234,56')
    expect(formatarReais(5)).toBe('R$ 0,05')
    expect(formatarReais(0)).toBe('R$ 0,00')
    expect(formatarReais(100000000)).toBe('R$ 1.000.000,00')
  })
  it('valores negativos', () => {
    expect(formatarReais(-1550)).toBe('-R$ 15,50')
  })
  it('formatarNumero não tem símbolo', () => {
    expect(formatarNumero(123456)).toBe('1.234,56')
  })
  it('formatarCompacto para gráficos', () => {
    expect(formatarCompacto(23790)).toBe('R$ 238')
    expect(formatarCompacto(173793)).toBe('R$ 1,7 mil')
    expect(formatarCompacto(1250000)).toBe('R$ 12,5 mil')
    expect(formatarCompacto(0)).toBe('R$ 0')
  })
})

describe('lerReais', () => {
  it('entende vírgula como decimal e ponto como milhar', () => {
    expect(lerReais('1.234,56')).toBe(123456)
    expect(lerReais('1234,5')).toBe(123450)
    expect(lerReais('R$ 80')).toBe(8000)
    expect(lerReais('0,1')).toBe(10)
  })
  it('ponto com 1 ou 2 casas é decimal; com 3 casas é milhar', () => {
    expect(lerReais('12.50')).toBe(1250)
    expect(lerReais('12.5')).toBe(1250)
    expect(lerReais('1.234')).toBe(123400)
    expect(lerReais('1.234.567')).toBe(123456700)
  })
  it('arredonda a terceira casa sem erro de ponto flutuante', () => {
    expect(lerReais('0,295')).toBe(30)
    expect(lerReais('0,294')).toBe(29)
    expect(lerReais('1,005')).toBe(101)
  })
  it('vazio ou inválido → null', () => {
    expect(lerReais('')).toBeNull()
    expect(lerReais('   ')).toBeNull()
    expect(lerReais('abc')).toBeNull()
    expect(lerReais('-5')).toBeNull()
    expect(lerReais('1,2,3')).toBeNull()
  })
})

describe('centavosDosDigitos (campo estilo banco)', () => {
  it('os dígitos preenchem da direita', () => {
    expect(centavosDosDigitos('1')).toBe(1)
    expect(centavosDosDigitos('12')).toBe(12)
    expect(centavosDosDigitos('1234')).toBe(1234)
    expect(centavosDosDigitos('R$ 12,34')).toBe(1234)
    expect(centavosDosDigitos('00012')).toBe(12)
    expect(centavosDosDigitos('')).toBe(0)
  })
})
