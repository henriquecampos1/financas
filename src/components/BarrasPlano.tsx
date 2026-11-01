// Barras e anéis de progresso do planejamento (verde até 70%, amarelo até 100%, vermelho acima).
import clsx from 'clsx'
import { motion } from 'motion/react'
import type { Categoria } from '@/db/tipos'
import { formatarReais } from '@/utils/dinheiro'
import type { Faixa, LinhaPlano } from '@/utils/planejamento'
import { IconeCategoria } from './ui'

const COR_BARRA: Record<Faixa, string> = {
  ok: 'bg-barra-ok',
  atencao: 'bg-barra-atencao',
  excedido: 'bg-barra-excedido',
}

const COR_TRACO: Record<Faixa, string> = {
  ok: 'var(--barra-ok)',
  atencao: 'var(--barra-atencao)',
  excedido: 'var(--barra-excedido)',
}

export const COR_TEXTO: Record<Faixa, string> = {
  ok: 'text-sucesso',
  atencao: 'text-alerta',
  excedido: 'text-perigo',
}

const ENCHER = { type: 'spring', stiffness: 120, damping: 22, mass: 1 } as const

export function BarraProgresso({
  porcentagem,
  faixa,
  grossa,
  marca,
}: {
  porcentagem: number
  faixa: Faixa
  grossa?: boolean
  /** Posição (0–100) de uma marca vertical, ex.: quanto do ciclo já passou. */
  marca?: number
}) {
  return (
    <div
      className={clsx('relative overflow-hidden rounded-full bg-cartao-2', grossa ? 'h-3' : 'h-2')}
      role="progressbar"
      aria-valuenow={porcentagem}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={clsx('h-full rounded-full', COR_BARRA[faixa])}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, porcentagem))}%` }}
        transition={ENCHER}
      />
      {marca !== undefined && marca > 0 && marca < 100 && (
        <div className="absolute inset-y-0 w-0.5 rounded-full bg-texto/35" style={{ left: `${marca}%` }} aria-hidden />
      )}
    </div>
  )
}

/** Anel de progresso com a porcentagem no meio. */
export function AnelProgresso({
  porcentagem,
  faixa,
  tamanho = 68,
}: {
  porcentagem: number
  faixa: Faixa
  tamanho?: number
}) {
  const espessura = 7
  const raio = (tamanho - espessura) / 2
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }} role="img" aria-label={`${porcentagem}% usado`}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} fill="none" stroke="var(--cartao-2)" strokeWidth={espessura} />
        <motion.circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={COR_TRACO[faixa]}
          strokeWidth={espessura}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.min(1, Math.max(0, porcentagem / 100)) }}
          transition={ENCHER}
        />
      </svg>
      <span className={clsx('absolute inset-0 flex items-center justify-center text-sm font-bold', COR_TEXTO[faixa])}>
        {porcentagem}%
      </span>
    </div>
  )
}

export function LinhaCategoriaPlano({
  linha,
  categoria,
  aoTocar,
}: {
  linha: LinhaPlano
  categoria?: Categoria
  aoTocar?: () => void
}) {
  const excedido = linha.disponivel < 0
  return (
    <button type="button" onClick={aoTocar} className="block w-full space-y-2.5 px-4 py-3.5 text-left transition-colors active:bg-cartao-2">
      <div className="flex items-center gap-3">
        <IconeCategoria icone={categoria?.icone ?? '❔'} cor={categoria?.cor ?? '#868e96'} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{categoria?.nome ?? 'Categoria excluída'}</p>
          <p className="numeros text-[13px] text-suave">
            {formatarReais(linha.gasto)} de {formatarReais(linha.limite)}
          </p>
        </div>
        <div className="text-right">
          <p className={clsx('text-sm font-bold', COR_TEXTO[linha.faixa])}>{linha.porcentagem}%</p>
          <p className={clsx('numeros text-xs', excedido ? 'font-semibold text-perigo' : 'text-suave')}>
            {excedido ? `Excedido em ${formatarReais(-linha.disponivel)}` : `Resta ${formatarReais(linha.disponivel)}`}
          </p>
        </div>
      </div>
      <BarraProgresso porcentagem={linha.porcentagem} faixa={linha.faixa} />
    </button>
  )
}
