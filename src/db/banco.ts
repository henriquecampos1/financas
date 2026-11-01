// Banco de dados local (IndexedDB, via Dexie). Tudo fica guardado só neste aparelho.
import Dexie, { type EntityTable } from 'dexie'
import { AJUSTES_PADRAO, categoriasPadrao } from './padroes'
import type {
  Ajustes,
  Cartao,
  Categoria,
  Conta,
  Lancamento,
  Meta,
  PagamentoFatura,
  Plano,
  Recorrencia,
} from './tipos'

export class BancoFinancas extends Dexie {
  categorias!: EntityTable<Categoria, 'id'>
  cartoes!: EntityTable<Cartao, 'id'>
  contas!: EntityTable<Conta, 'id'>
  lancamentos!: EntityTable<Lancamento, 'id'>
  pagamentosFatura!: EntityTable<PagamentoFatura, 'id'>
  planos!: EntityTable<Plano, 'id'>
  metas!: EntityTable<Meta, 'id'>
  recorrencias!: EntityTable<Recorrencia, 'id'>
  ajustes!: EntityTable<Ajustes, 'id'>

  constructor(nome = 'financas') {
    super(nome)
    // Só os campos usados em buscas e ordenação entram aqui; o resto é guardado do mesmo jeito.
    this.version(1).stores({
      categorias: 'id, tipo, ordem',
      cartoes: 'id, ordem',
      contas: 'id, ordem',
      lancamentos:
        'id, data, dataCompra, tipo, metodo, categoriaId, cartaoId, contaId, grupoParcelasId, recorrenciaId, *tags',
      pagamentosFatura: 'id, cartaoId, [cartaoId+fatura], data',
      planos: 'id, &inicio',
      metas: 'id',
      recorrencias: 'id, categoriaId',
      ajustes: 'id',
    })

    // Primeira abertura (ou depois de apagar tudo): categorias padrão e ajustes iniciais.
    this.on('populate', (tx) => {
      void tx.table('categorias').bulkAdd(categoriasPadrao())
      void tx.table('ajustes').add(AJUSTES_PADRAO)
    })
  }
}

export const db = new BancoFinancas()

export function novoId(): string {
  return crypto.randomUUID()
}
