// Operações com categorias: criar, editar, reordenar, arquivar e excluir (com cuidado).
import { db, novoId, type BancoFinancas } from './banco'
import type { Categoria, LimiteCategoria, Tipo } from './tipos'

export type DadosCategoria = Pick<Categoria, 'nome' | 'icone' | 'cor' | 'tipo'>

/** Categorias de um tipo, na ordem da lista. */
async function doTipo(banco: BancoFinancas, tipo: Tipo): Promise<Categoria[]> {
  return (await banco.categorias.where('tipo').equals(tipo).toArray()).sort((a, b) => a.ordem - b.ordem)
}

export async function criarCategoria(dados: DadosCategoria, banco: BancoFinancas = db): Promise<string> {
  const id = novoId()
  await banco.transaction('rw', banco.categorias, async () => {
    const todas = await banco.categorias.toArray()
    const ordem = todas.reduce((max, c) => Math.max(max, c.ordem), -1) + 1
    await banco.categorias.add({ ...dados, nome: dados.nome.trim(), id, arquivada: false, ordem })
  })
  return id
}

export async function editarCategoria(
  id: string,
  dados: Partial<DadosCategoria>,
  banco: BancoFinancas = db,
): Promise<void> {
  await banco.categorias.update(id, dados.nome === undefined ? dados : { ...dados, nome: dados.nome.trim() })
}

export async function arquivarCategoria(id: string, arquivada: boolean, banco: BancoFinancas = db) {
  await banco.categorias.update(id, { arquivada })
}

/**
 * Sobe (-1) ou desce (+1) a categoria uma posição entre as do mesmo tipo e situação
 * (ativas com ativas, arquivadas com arquivadas). Também corrige ordens repetidas.
 */
export async function moverCategoria(id: string, direcao: -1 | 1, banco: BancoFinancas = db) {
  await banco.transaction('rw', banco.categorias, async () => {
    const alvo = await banco.categorias.get(id)
    if (!alvo) return
    const lista = (await doTipo(banco, alvo.tipo)).filter((c) => c.arquivada === alvo.arquivada)
    const i = lista.findIndex((c) => c.id === id)
    const j = i + direcao
    if (j < 0 || j >= lista.length) return
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
    // As ordens originais deste grupo são redistribuídas na nova sequência.
    const ordens = lista.map((c) => c.ordem).sort((a, b) => a - b)
    const unicas = new Set(ordens).size === ordens.length
    await Promise.all(
      lista.map((c, k) => banco.categorias.update(c.id, { ordem: unicas ? ordens[k] : ordens[0] + k / lista.length })),
    )
  })
}

/** Quantos lançamentos e recorrências usam a categoria. */
export async function contarUsos(id: string, banco: BancoFinancas = db): Promise<number> {
  const [lancamentos, recorrencias] = await Promise.all([
    banco.lancamentos.where('categoriaId').equals(id).count(),
    banco.recorrencias.where('categoriaId').equals(id).count(),
  ])
  return lancamentos + recorrencias
}

/** Tira a categoria dos limites de um plano, somando o limite dela ao da categoria de destino. */
export function transferirLimite(limites: LimiteCategoria[], de: string, para?: string): LimiteCategoria[] {
  const origem = limites.find((l) => l.categoriaId === de)
  const resto = limites.filter((l) => l.categoriaId !== de)
  if (!origem || !para) return resto
  const destino = resto.find((l) => l.categoriaId === para)
  if (destino) return resto.map((l) => (l === destino ? { ...l, limite: l.limite + origem.limite } : l))
  return [...resto, { categoriaId: para, limite: origem.limite }]
}

export class CategoriaEmUsoError extends Error {
  constructor(public usos: number) {
    super(`A categoria tem ${usos} lançamento(s); arquive ou mova antes de excluir.`)
  }
}

/**
 * Exclui a categoria. Se ela estiver em uso, é preciso informar `moverPara`: os lançamentos,
 * recorrências e limites de planejamento passam para essa categoria. Sem isso, dá erro.
 */
export async function excluirCategoria(id: string, moverPara?: string, banco: BancoFinancas = db) {
  await banco.transaction('rw', [banco.categorias, banco.lancamentos, banco.recorrencias, banco.planos], async () => {
    if (moverPara) {
      if (moverPara === id) throw new Error('Escolha outra categoria de destino.')
      const [origem, destino] = await Promise.all([banco.categorias.get(id), banco.categorias.get(moverPara)])
      if (!destino) throw new Error('Categoria de destino não encontrada.')
      if (origem && origem.tipo !== destino.tipo) throw new Error('A categoria de destino precisa ser do mesmo tipo.')
      await banco.lancamentos.where('categoriaId').equals(id).modify({ categoriaId: moverPara })
      await banco.recorrencias.where('categoriaId').equals(id).modify({ categoriaId: moverPara })
    } else {
      const usos = await contarUsos(id, banco)
      if (usos > 0) throw new CategoriaEmUsoError(usos)
    }
    await banco.planos.toCollection().modify((plano) => {
      plano.limites = transferirLimite(plano.limites, id, moverPara)
    })
    await banco.categorias.delete(id)
  })
}
