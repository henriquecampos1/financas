import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { lerAjustes, salvarAjustes } from './ajustes'
import { BancoFinancas } from './banco'
import {
  CategoriaEmUsoError,
  arquivarCategoria,
  contarUsos,
  criarCategoria,
  excluirCategoria,
  moverCategoria,
  transferirLimite,
} from './categorias'
import type { Lancamento } from './tipos'

let banco: BancoFinancas

beforeEach(async () => {
  banco = new BancoFinancas(`teste-${crypto.randomUUID()}`)
  await banco.open()
})

afterEach(async () => {
  await banco.delete()
})

function lancamento(id: string, categoriaId: string): Lancamento {
  return {
    id,
    tipo: 'despesa',
    metodo: 'pix',
    valor: 1000,
    descricao: 'Teste',
    categoriaId,
    data: '2026-01-10',
    dataCompra: '2026-01-10',
    tags: [],
    criadoEm: 0,
  }
}

async function nomesDoTipo(tipo: 'despesa' | 'receita') {
  const lista = await banco.categorias.where('tipo').equals(tipo).toArray()
  return lista.filter((c) => !c.arquivada).sort((a, b) => a.ordem - b.ordem).map((c) => c.nome)
}

describe('primeira abertura', () => {
  it('traz as categorias padrão e os ajustes iniciais', async () => {
    expect(await nomesDoTipo('despesa')).toEqual([
      'Alimentação',
      'Mercado',
      'Transporte',
      'Lazer',
      'Compras',
      'Saúde',
      'Moradia',
      'Assinaturas',
      'Educação',
      'Outros',
    ])
    expect((await nomesDoTipo('receita')).length).toBeGreaterThan(0)
    expect(await lerAjustes(banco)).toMatchObject({ diaInicioCiclo: 1, modoParcelas: 'por-parcela' })
  })

  it('salvarAjustes guarda só o que mudou', async () => {
    await salvarAjustes({ diaInicioCiclo: 15 }, banco)
    expect(await lerAjustes(banco)).toMatchObject({ diaInicioCiclo: 15, modoParcelas: 'por-parcela' })
  })
})

describe('criar, reordenar e arquivar', () => {
  it('nova categoria entra no fim da lista', async () => {
    await criarCategoria({ nome: '  Pets ', icone: '🐶', cor: '#e8590c', tipo: 'despesa' }, banco)
    const nomes = await nomesDoTipo('despesa')
    expect(nomes.at(-1)).toBe('Pets')
  })

  it('sobe e desce uma posição, sem passar das pontas', async () => {
    await moverCategoria('cat-mercado', -1, banco)
    expect((await nomesDoTipo('despesa')).slice(0, 2)).toEqual(['Mercado', 'Alimentação'])
    await moverCategoria('cat-mercado', -1, banco)
    expect((await nomesDoTipo('despesa'))[0]).toBe('Mercado')
    await moverCategoria('cat-outros', 1, banco)
    expect((await nomesDoTipo('despesa')).at(-1)).toBe('Outros')
    await moverCategoria('cat-alimentacao', 1, banco)
    expect((await nomesDoTipo('despesa')).slice(0, 3)).toEqual(['Mercado', 'Transporte', 'Alimentação'])
  })

  it('arquivada sai da lista de ativas', async () => {
    await arquivarCategoria('cat-lazer', true, banco)
    expect(await nomesDoTipo('despesa')).not.toContain('Lazer')
    await arquivarCategoria('cat-lazer', false, banco)
    expect(await nomesDoTipo('despesa')).toContain('Lazer')
  })
})

describe('excluir', () => {
  it('sem uso: exclui direto', async () => {
    await excluirCategoria('cat-educacao', undefined, banco)
    expect(await banco.categorias.get('cat-educacao')).toBeUndefined()
  })

  it('com lançamentos: não deixa excluir sem destino', async () => {
    await banco.lancamentos.add(lancamento('l1', 'cat-lazer'))
    expect(await contarUsos('cat-lazer', banco)).toBe(1)
    await expect(excluirCategoria('cat-lazer', undefined, banco)).rejects.toBeInstanceOf(CategoriaEmUsoError)
    expect(await banco.categorias.get('cat-lazer')).toBeDefined()
  })

  it('com destino: move lançamentos e limites do planejamento, depois exclui', async () => {
    await banco.lancamentos.bulkAdd([lancamento('l1', 'cat-lazer'), lancamento('l2', 'cat-lazer')])
    await banco.planos.add({
      id: 'p1',
      inicio: '2026-01-01',
      fim: '2026-01-31',
      rendaPrevista: 0,
      metaEconomia: 0,
      limites: [
        { categoriaId: 'cat-lazer', limite: 30000 },
        { categoriaId: 'cat-compras', limite: 20000 },
      ],
    })
    await excluirCategoria('cat-lazer', 'cat-compras', banco)
    expect(await banco.categorias.get('cat-lazer')).toBeUndefined()
    expect(await banco.lancamentos.where('categoriaId').equals('cat-compras').count()).toBe(2)
    expect((await banco.planos.get('p1'))?.limites).toEqual([{ categoriaId: 'cat-compras', limite: 50000 }])
  })

  it('não move para uma categoria de outro tipo', async () => {
    await banco.lancamentos.add(lancamento('l1', 'cat-lazer'))
    await expect(excluirCategoria('cat-lazer', 'cat-salario', banco)).rejects.toThrow('mesmo tipo')
    expect(await banco.lancamentos.get('l1')).toMatchObject({ categoriaId: 'cat-lazer' })
  })
})

describe('transferirLimite', () => {
  it('cria o limite no destino quando ele não existe', () => {
    expect(transferirLimite([{ categoriaId: 'a', limite: 100 }], 'a', 'b')).toEqual([{ categoriaId: 'b', limite: 100 }])
  })
  it('sem destino, só remove', () => {
    expect(transferirLimite([{ categoriaId: 'a', limite: 100 }], 'a')).toEqual([])
  })
  it('sem limite na origem, não muda nada', () => {
    const limites = [{ categoriaId: 'b', limite: 100 }]
    expect(transferirLimite(limites, 'a', 'b')).toEqual(limites)
  })
})
