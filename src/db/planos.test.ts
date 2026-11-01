import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BancoFinancas } from './banco'
import { copiarPlanoAnterior, excluirPlano, planoAnterior, planoDoCiclo, salvarPlano } from './planos'

let banco: BancoFinancas
const out = { inicio: '2026-10-15', fim: '2026-11-14' }
const nov = { inicio: '2026-11-15', fim: '2026-12-14' }
const dez = { inicio: '2026-12-15', fim: '2027-01-14' }

beforeEach(async () => {
  banco = new BancoFinancas(`teste-${crypto.randomUUID()}`)
  await banco.open()
})

afterEach(async () => {
  await banco.delete()
})

describe('planos', () => {
  it('cria e atualiza o mesmo plano do ciclo, descartando limites zerados', async () => {
    const id = await salvarPlano(
      out,
      { limites: [{ categoriaId: 'a', limite: 1000 }, { categoriaId: 'b', limite: 0 }], rendaPrevista: 500000, metaEconomia: 50000 },
      banco,
    )
    expect(await planoDoCiclo(out, banco)).toMatchObject({ id, limites: [{ categoriaId: 'a', limite: 1000 }] })
    const id2 = await salvarPlano(out, { limites: [], rendaPrevista: 1, metaEconomia: 2 }, banco)
    expect(id2).toBe(id)
    expect(await banco.planos.count()).toBe(1)
  })

  it('copia do plano anterior mais recente (mesmo pulando ciclos sem plano)', async () => {
    await salvarPlano(out, { limites: [{ categoriaId: 'a', limite: 1000 }], rendaPrevista: 9, metaEconomia: 1 }, banco)
    expect(await planoAnterior(dez, banco)).toMatchObject({ inicio: out.inicio })
    expect(await copiarPlanoAnterior(dez, banco)).toBe(true)
    expect(await planoDoCiclo(dez, banco)).toMatchObject({
      inicio: dez.inicio,
      fim: dez.fim,
      limites: [{ categoriaId: 'a', limite: 1000 }],
      rendaPrevista: 9,
      metaEconomia: 1,
    })
    expect(await planoDoCiclo(nov, banco)).toBeUndefined()
  })

  it('sem plano anterior, não copia nada', async () => {
    expect(await copiarPlanoAnterior(out, banco)).toBe(false)
    expect(await banco.planos.count()).toBe(0)
  })

  it('acha o plano mesmo se o dia de início do ciclo mudou depois', async () => {
    await salvarPlano(out, { limites: [], rendaPrevista: 0, metaEconomia: 0 }, banco)
    // Ciclo agora começa dia 10: 10/10 a 09/11 contém o início 15/10 do plano.
    const plano = await planoDoCiclo({ inicio: '2026-10-10', fim: '2026-11-09' }, banco)
    expect(plano?.inicio).toBe('2026-10-15')
  })

  it('exclui', async () => {
    const id = await salvarPlano(out, { limites: [], rendaPrevista: 0, metaEconomia: 0 }, banco)
    await excluirPlano(id, banco)
    expect(await planoDoCiclo(out, banco)).toBeUndefined()
  })
})
