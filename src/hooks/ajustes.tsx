// Ajustes do app, lidos uma vez na abertura e mantidos atualizados (useLiveQuery).
import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, type ReactNode } from 'react'
import { lerAjustes } from '@/db/ajustes'
import type { Ajustes } from '@/db/tipos'

const ContextoAjustes = createContext<Ajustes | null>(null)

/** Só mostra o app depois de ler os ajustes, para não piscar um ciclo errado na abertura. */
export function ProvedorAjustes({ children, carregando }: { children: ReactNode; carregando: ReactNode }) {
  const ajustes = useLiveQuery(() => lerAjustes())
  if (!ajustes) return carregando
  return <ContextoAjustes.Provider value={ajustes}>{children}</ContextoAjustes.Provider>
}

export function useAjustes(): Ajustes {
  const ajustes = useContext(ContextoAjustes)
  if (!ajustes) throw new Error('useAjustes fora do ProvedorAjustes')
  return ajustes
}
