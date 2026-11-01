import { describe, expect, it } from 'vitest'
import { conferirPin, pinValido, resumirPin } from './pin'

describe('PIN', () => {
  it('aceita de 4 a 6 dígitos', () => {
    expect(pinValido('1234')).toBe(true)
    expect(pinValido('123456')).toBe(true)
    expect(pinValido('123')).toBe(false)
    expect(pinValido('1234567')).toBe(false)
    expect(pinValido('12a4')).toBe(false)
  })

  it('guarda só o resumo, com sal diferente a cada vez, e confere certo', async () => {
    const a = await resumirPin('4321')
    const b = await resumirPin('4321')
    expect(a).not.toContain('4321')
    expect(a).not.toBe(b)
    expect(await conferirPin('4321', a)).toBe(true)
    expect(await conferirPin('4321', b)).toBe(true)
    expect(await conferirPin('1234', a)).toBe(false)
    expect(await conferirPin('4321', 'lixo')).toBe(false)
  })
})
