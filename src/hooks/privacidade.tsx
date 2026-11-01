// "Olhinho" para esconder os valores no Início (como nos apps de banco). Fica lembrado no aparelho.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { lembrar } from '@/utils/teclado'

interface Privacidade {
  oculto: boolean
  alternar: () => void
}

const Contexto = createContext<Privacidade>({ oculto: false, alternar: () => {} })

export function ProvedorPrivacidade({ children }: { children: ReactNode }) {
  const [oculto, setOculto] = useState(() => lembrar('ocultarValores') === '1')
  const alternar = useCallback(() => {
    setOculto((o) => {
      lembrar('ocultarValores', o ? '0' : '1')
      return !o
    })
  }, [])
  const valor = useMemo(() => ({ oculto, alternar }), [oculto, alternar])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function usePrivacidade(): Privacidade {
  return useContext(Contexto)
}
