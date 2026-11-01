// Barras das faturas (anteriores, atual e próximas), com o valor em cima e o mês embaixo.
// Tocar numa barra abre aquela fatura.
import clsx from 'clsx'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { deISO } from '@/utils/datas'
import { formatarCompacto, formatarReais } from '@/utils/dinheiro'
import { rotuloFatura, type ResumoFatura } from '@/utils/fatura'

const ALTURA_MAXIMA = 112 // px

export function GraficoFaturas({
  resumos,
  selecionada,
  atual,
  aoEscolher,
}: {
  resumos: ResumoFatura[]
  /** Chave da fatura aberta na tela. */
  selecionada: string
  /** Chave da fatura do mês corrente (ganha a marca "atual"). */
  atual: string
  aoEscolher: (r: ResumoFatura) => void
}) {
  const trilho = useRef<HTMLDivElement>(null)
  const maior = Math.max(1, ...resumos.map((r) => Math.max(0, r.valor)))

  // Mantém a barra escolhida visível (centralizada) ao abrir e ao trocar de fatura.
  useEffect(() => {
    const el = trilho.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [selecionada])

  return (
    <div
      ref={trilho}
      role="group"
      aria-label="Faturas por mês"
      className="-mx-4 flex snap-x items-end gap-1 overflow-x-auto px-4 pb-1 pt-2 [scrollbar-width:none]"
    >
      {resumos.map((r) => {
        const ativo = r.fatura.chave === selecionada
        const valor = Math.max(0, r.valor)
        const altura = valor > 0 ? Math.max(6, Math.round((valor / maior) * ALTURA_MAXIMA)) : 3
        const vencimento = deISO(r.fatura.vencimento)
        const mostrarAno = vencimento.getMonth() === 0 || r.fatura.chave === atual
        return (
          <button
            key={r.fatura.chave}
            type="button"
            aria-pressed={ativo}
            aria-label={`Fatura de ${rotuloFatura(r.fatura)}: ${formatarReais(r.valor)}`}
            onClick={() => aoEscolher(r)}
            className="flex w-[3.75rem] shrink-0 snap-center flex-col items-center gap-1 rounded-xl pb-1 pt-1 transition active:scale-95"
          >
            <span
              className={clsx(
                'whitespace-nowrap text-[11px] font-semibold tabular-nums',
                ativo ? 'text-credito' : 'text-suave',
              )}
            >
              {valor > 0 ? formatarCompacto(valor) : '—'}
            </span>
            <span className="flex w-full items-end justify-center" style={{ height: ALTURA_MAXIMA }}>
              <motion.span
                className={clsx(
                  'w-9 rounded-t-xl rounded-b-md transition-colors duration-300',
                  ativo ? 'bg-credito' : r.situacao === 'vencida' ? 'bg-perigo/60' : 'bg-credito/25',
                )}
                initial={{ height: 3 }}
                animate={{ height: altura }}
                transition={{ type: 'spring', stiffness: 160, damping: 22 }}
              />
            </span>
            <span
              className={clsx(
                'flex flex-col items-center rounded-lg px-1.5 leading-tight',
                ativo ? 'bg-credito/12 font-bold text-credito' : 'text-suave',
              )}
            >
              <span className="text-sm">{format(vencimento, 'MMM', { locale: ptBR })}</span>
              <span className="text-[10px]">
                {r.fatura.chave === atual ? 'atual' : mostrarAno ? format(vencimento, 'yyyy') : ' '}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
