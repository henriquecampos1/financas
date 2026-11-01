// Ciclo escolhido nas setas. Fica o mesmo ao trocar de aba (Início, Plano, Análises...).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { cicloAtual, deslocarCiclo, type Ciclo } from '@/utils/ciclo'
import { hojeISO } from '@/utils/datas'
import { useAjustes } from './ajustes'

interface NavegacaoCiclo {
  ciclo: Ciclo
  /** 0 = ciclo atual; -1 = anterior; 1 = próximo... */
  deslocamento: number
  ehAtual: boolean
  anterior: () => void
  proximo: () => void
  irParaAtual: () => void
}

const ContextoCiclo = createContext<NavegacaoCiclo | null>(null)

export function ProvedorCiclo({ children }: { children: ReactNode }) {
  const { diaInicioCiclo } = useAjustes()
  const [deslocamento, setDeslocamento] = useState(0)
  const anterior = useCallback(() => setDeslocamento((d) => d - 1), [])
  const proximo = useCallback(() => setDeslocamento((d) => d + 1), [])
  const irParaAtual = useCallback(() => setDeslocamento(0), [])
  const hoje = hojeISO()

  const valor = useMemo<NavegacaoCiclo>(() => {
    const ciclo = deslocarCiclo(cicloAtual(diaInicioCiclo, hoje), deslocamento, diaInicioCiclo)
    return { ciclo, deslocamento, ehAtual: deslocamento === 0, anterior, proximo, irParaAtual }
  }, [diaInicioCiclo, hoje, deslocamento, anterior, proximo, irParaAtual])

  return <ContextoCiclo.Provider value={valor}>{children}</ContextoCiclo.Provider>
}

export function useCiclo(): NavegacaoCiclo {
  const valor = useContext(ContextoCiclo)
  if (!valor) throw new Error('useCiclo fora do ProvedorCiclo')
  return valor
}
