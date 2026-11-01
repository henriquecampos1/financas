import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCiclo } from '@/hooks/ciclo'
import { rotuloCiclo } from '@/utils/ciclo'
import { BotaoIcone } from './ui'

/** Setas para navegar entre ciclos anteriores e futuros. */
export function SeletorCiclo() {
  const { ciclo, ehAtual, deslocamento, anterior, proximo, irParaAtual } = useCiclo()
  return (
    <div className="flex items-center gap-1 rounded-xl bg-cartao-2 p-1">
      <BotaoIcone rotulo="Ciclo anterior" onClick={anterior} className="size-10 text-texto">
        <ChevronLeft className="size-6" />
      </BotaoIcone>
      <button
        type="button"
        onClick={irParaAtual}
        disabled={ehAtual}
        className="min-h-10 min-w-0 flex-1 rounded-lg text-center leading-tight"
        aria-live="polite"
      >
        <span className="block truncate text-[15px] font-semibold">{rotuloCiclo(ciclo)}</span>
        <span className="block text-xs text-suave">
          {ehAtual ? 'Ciclo atual' : `${deslocamento < 0 ? 'Ciclo passado' : 'Ciclo futuro'} · toque para voltar ao atual`}
        </span>
      </button>
      <BotaoIcone rotulo="Próximo ciclo" onClick={proximo} className="size-10 text-texto">
        <ChevronRight className="size-6" />
      </BotaoIcone>
    </div>
  )
}
