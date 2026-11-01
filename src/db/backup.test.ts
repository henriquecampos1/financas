import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { diasDesdeBackup, gerarCSV, nomeDoArquivo, validarBackup } from '@/utils/backup'
import { salvarAjustes } from './ajustes'
import { BancoFinancas } from './banco'
import { exportarBackup, importarBackup } from './backup'
import { criarConta } from './contas'
import { carregarDemonstracao } from './demo'
import { salvarLancamento } from './lancamentos'

let origem: BancoFinancas
let destino: BancoFinancas

beforeEach(async () => {
  origem = new BancoFinancas(`teste-${crypto.randomUUID()}`)
  destino = new BancoFinancas(`teste-${crypto.randomUUID()}`)
  await Promise.all([origem.open(), destino.open()])
})

afterEach(async () => {
  await Promise.all([origem.delete(), destino.delete()])
})

describe('backup', () => {
  it('exporta tudo e restaura igual em outro aparelho (passando por JSON)', async () => {
    await salvarAjustes({ diaInicioCiclo: 15 }, origem)
    await carregarDemonstracao(origem, '2026-11-01')
    const arquivo = JSON.parse(JSON.stringify(await exportarBackup(origem)))
    await criarConta({ nome: 'Vai sumir', cor: '#000000', saldoInicial: 0 }, destino)
    await importarBackup(arquivo, destino)
    for (const t of ['categorias', 'cartoes', 'contas', 'lancamentos', 'pagamentosFatura', 'planos', 'ajustes'] as const) {
      expect(await destino.table(t).count()).toBe(await origem.table(t).count())
    }
    expect((await destino.contas.toArray()).map((c) => c.nome)).not.toContain('Vai sumir')
    expect((await destino.ajustes.get('app'))?.diaInicioCiclo).toBe(15)
  })

  it('recusa arquivo que não é backup, sem apagar nada', async () => {
    await criarConta({ nome: 'Fica', cor: '#000000', saldoInicial: 0 }, destino)
    await expect(importarBackup({ qualquer: 1 }, destino)).rejects.toThrow('não é um backup')
    await expect(importarBackup({ app: 'minhas-financas', versao: 1, dados: { categorias: [] } }, destino)).rejects.toThrow('incompleto')
    expect(await destino.contas.count()).toBe(1)
  })

  it('valida itens sem id', () => {
    const dados = Object.fromEntries(
      ['categorias', 'cartoes', 'contas', 'lancamentos', 'pagamentosFatura', 'planos', 'metas', 'recorrencias', 'ajustes'].map((t) => [t, []]),
    )
    expect(() => validarBackup({ app: 'minhas-financas', versao: 1, dados: { ...dados, contas: [{ nome: 'x' }] } })).toThrow('danificados')
    expect(validarBackup({ app: 'minhas-financas', versao: 1, dados }).versao).toBe(1)
  })

  it('dias desde o último backup e nome do arquivo', () => {
    const agora = new Date(2026, 10, 1, 12).getTime()
    expect(diasDesdeBackup(undefined, agora)).toBeUndefined()
    expect(diasDesdeBackup(agora - 16 * 86_400_000, agora)).toBe(16)
    expect(nomeDoArquivo('financas-backup', 'json', new Date(2026, 10, 1))).toBe('financas-backup-2026-11-01.json')
  })
})

describe('CSV para Excel', () => {
  it('separador ";", vírgula decimal, despesa negativa, aspas quando precisa e BOM', async () => {
    const [l] = await salvarLancamento(
      {
        tipo: 'despesa',
        metodo: 'credito',
        valor: 123456,
        descricao: 'Jantar; "especial"',
        categoriaId: 'cat-alimentacao',
        dataCompra: '2026-10-20',
        cartaoId: 'c1',
        parcelas: 2,
        observacao: '',
        tags: ['viagem-rio'],
      },
      undefined,
      origem,
    )
    const categorias = new Map((await origem.categorias.toArray()).map((c) => [c.id, c]))
    const cartoes = new Map([['c1', { id: 'c1', nome: 'Nubank' } as never]])
    const csv = gerarCSV([l], { categorias, cartoes, contas: new Map() })
    expect(csv.startsWith('﻿Data;Data da compra;Tipo;')).toBe(true)
    const linha = csv.split('\r\n')[1]
    expect(linha).toBe('20/10/2026;20/10/2026;Despesa;Crédito;"Jantar; ""especial""";Alimentação;Nubank;1/2;-617,28;#viagem-rio;')
  })
})
