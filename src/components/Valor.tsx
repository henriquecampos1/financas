// Valor em reais que "conta" até o número novo quando muda, e respeita o olhinho de esconder valores.
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { usePrivacidade } from '@/hooks/privacidade'
import { formatarReais } from '@/utils/dinheiro'

export const OCULTO = 'R$ ••••••'

export function ValorAnimado({ centavos, className }: { centavos: number; className?: string }) {
  const { oculto } = usePrivacidade()
  const valor = useMotionValue(0)
  const texto = useTransform(valor, (v) => formatarReais(Math.round(v)))

  useEffect(() => {
    const animacao = animate(valor, centavos, { duration: 0.8, ease: [0.22, 1, 0.36, 1] })
    return () => animacao.stop()
  }, [centavos, valor])

  if (oculto) return <span className={className}>{OCULTO}</span>
  return <motion.span className={className}>{texto}</motion.span>
}

/** Valor comum (sem animação) que também some com o olhinho. */
export function ValorPrivado({ centavos, className }: { centavos: number; className?: string }) {
  const { oculto } = usePrivacidade()
  return <span className={className}>{oculto ? OCULTO : formatarReais(centavos)}</span>
}
