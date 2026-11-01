import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useCiclo } from '@/hooks/ciclo'
import { rotuloCiclo } from '@/utils/ciclo'
import { BotaoIcone, MOLA } from './ui'

/** Setas para navegar entre ciclos; o texto desliza para o lado da seta tocada. */
export function SeletorCiclo() {
  const { ciclo, ehAtual, deslocamento, anterior, proximo, irParaAtual } = useCiclo()
  const ultimo = useRef(deslocamento)
  const lado = deslocamento >= ultimo.current ? 1 : -1
  useEffect(() => {
    ultimo.current = deslocamento
  })

  return (
    <div className="flex items-center gap-1 rounded-2xl bg-cartao p-1 shadow-cartao">
      <BotaoIcone rotulo="Ciclo anterior" onClick={anterior} className="size-10 text-texto">
        <ChevronLeft className="size-5" strokeWidth={2.4} />
      </BotaoIcone>
      <button
        type="button"
        onClick={irParaAtual}
        disabled={ehAtual}
        className="relative min-h-10 min-w-0 flex-1 overflow-hidden text-center leading-tight"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout" initial={false} custom={lado}>
          <motion.span
            key={ciclo.inicio}
            custom={lado}
            initial={{ x: 24 * lado, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24 * lado, opacity: 0 }}
            transition={{ x: MOLA, opacity: { duration: 0.18 } }}
            className="block"
          >
            <span className="block truncate text-[15px] font-semibold">{rotuloCiclo(ciclo)}</span>
            <span className="block text-xs text-suave">
              {ehAtual ? 'Ciclo atual' : `${deslocamento < 0 ? 'Ciclo passado' : 'Ciclo futuro'} · toque para voltar`}
            </span>
          </motion.span>
        </AnimatePresence>
      </button>
      <BotaoIcone rotulo="Próximo ciclo" onClick={proximo} className="size-10 text-texto">
        <ChevronRight className="size-5" strokeWidth={2.4} />
      </BotaoIcone>
    </div>
  )
}
