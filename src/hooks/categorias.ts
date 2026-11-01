import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/banco'
import type { Categoria } from '@/db/tipos'

/** Todas as categorias (ativas e arquivadas), na ordem da lista. `undefined` enquanto carrega. */
export function useCategorias(): Categoria[] | undefined {
  return useLiveQuery(() => db.categorias.orderBy('ordem').toArray())
}
