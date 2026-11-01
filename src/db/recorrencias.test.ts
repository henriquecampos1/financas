import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BancoFinancas } from './banco'
import { excluirLancamento, salvarLancamento } from './lancamentos'
import {
  criarRecorrencia,
  gerarRecorrenciasAutomaticas,
  lancarOcorrencia,
  ocorrenciasPendentes,
  pularOcorrencia,
  repetirTodoMes,
  type DadosRecorrencia,
} from './recorrencias'

let banco: BancoFinancas

beforeEach(async () => {
  banco = new BancoFinancas(`teste-${crypto.randomUUID()}`)
  await banco.open()
})

afterEach(async () => {
  await banco.delete()
})

function rec(extra: Partial<DadosRecorrencia> = {}): DadosRecorrencia {
  return {
    tipo: 'despesa',
    metodo: 'pix',
    valor: 9000,
    descricao: 'Esporte',
    categoriaId: 'cat-lazer',
    contaId: 'c1',
    dia: 10,
    inicio: '2026-09-01',
    confirmarAntes: false,
    ativa: true,
    tags: [],
    ...extra,
  }
}

describe('recorrências automáticas', () => {
  it('lança cada mês devido uma única vez', async () => {
    await criarRecorrencia(rec(), banco)
    expect(await gerarRecorrenciasAutomaticas('2026-11-10', banco)).toBe(3) // set, out, nov
    expect(await gerarRecorrenciasAutomaticas('2026-11-10', banco)).toBe(0)
    const datas = (await banco.lancamentos.toArray()).map((l) => l.data).sort()
    expect(datas).toEqual(['2026-09-10', '2026-10-10', '2026-11-10'])
  })

  it('não gera as inativas nem as que pedem confirmação', async () => {
    await criarRecorrencia(rec({ ativa: false }), banco)
    await criarRecorrencia(rec({ confirmarAntes: true }), banco)
    expect(await gerarRecorrenciasAutomaticas('2026-11-10', banco)).toBe(0)
  })

  it('lançamento excluído não volta; editado continua ligado à recorrência', async () => {
    await criarRecorrencia(rec(), banco)
    await gerarRecorrenciasAutomaticas('2026-10-31', banco)
    const [set, out] = (await banco.lancamentos.toArray()).sort((a, b) => a.data.localeCompare(b.data))
    await excluirLancamento(set, banco)
    const [editado] = await salvarLancamento(
      { tipo: 'despesa', metodo: 'pix', valor: 9500, descricao: 'Esporte', categoriaId: 'cat-lazer', dataCompra: '2026-10-12', contaId: 'c1', parcelas: 1, observacao: '', tags: [] },
      out,
      banco,
    )
    expect(editado).toMatchObject({ recorrenciaId: out.recorrenciaId, recorrenciaMes: '2026-10' })
    expect(await gerarRecorrenciasAutomaticas('2026-10-31', banco)).toBe(0)
    expect(await banco.lancamentos.count()).toBe(1)
  })
})

describe('recorrências com confirmação', () => {
  it('lista as pendentes; lançar e pular tiram da lista', async () => {
    await criarRecorrencia(rec({ confirmarAntes: true, descricao: 'Aluguel', dia: 5 }), banco)
    let pendentes = await ocorrenciasPendentes('2026-11-05', banco)
    expect(pendentes.map((p) => p.ocorrencia.mes)).toEqual(['2026-09', '2026-10', '2026-11'])
    await lancarOcorrencia(pendentes[0].recorrencia, pendentes[0].ocorrencia, banco)
    await pularOcorrencia(pendentes[1].recorrencia.id, '2026-10', banco)
    pendentes = await ocorrenciasPendentes('2026-11-05', banco)
    expect(pendentes.map((p) => p.ocorrencia.mes)).toEqual(['2026-11'])
    expect(await banco.lancamentos.count()).toBe(1)
  })
})

describe('repetirTodoMes', () => {
  it('cria a recorrência a partir do lançamento, que já conta como o 1º mês', async () => {
    const [l] = await salvarLancamento(
      { tipo: 'despesa', metodo: 'debito', valor: 9000, descricao: 'Futebol', categoriaId: 'cat-lazer', dataCompra: '2026-09-15', contaId: 'c1', parcelas: 1, observacao: '', tags: [] },
      undefined,
      banco,
    )
    await repetirTodoMes(l, banco)
    expect(await banco.recorrencias.toArray()).toMatchObject([{ dia: 15, inicio: '2026-09-15', valor: 9000, metodo: 'debito' }])
    expect(await gerarRecorrenciasAutomaticas('2026-11-20', banco)).toBe(2) // out e nov
  })
})
