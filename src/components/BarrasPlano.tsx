// Barras de progresso do planejamento (verde até 70%, amarelo até 100%, vermelho acima).
import clsx from 'clsx'
import type { Categoria } from '@/db/tipos'
import { formatarReais } from '@/utils/dinheiro'
import type { Faixa, LinhaPlano } from '@/utils/planejamento'
import { IconeCategoria } from './ui'

const COR_BARRA: Record<Faixa, string> = {
  ok: 'bg-barra-ok',
  atencao: 'bg-barra-atencao',
  excedido: 'bg-barra-excedido',
}

export const COR_TEXTO: Record<Faixa, string> = {
  ok: 'text-sucesso',
  atencao: 'text-alerta',
  excedido: 'text-perigo',
}

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
      <div
        className={clsx('h-full rounded-full transition-all duration-500', COR_BARRA[faixa])}
        style={{ width: `${Math.min(100, porcentagem)}%` }}
      />
      {marca !== undefined && marca > 0 && marca < 100 && (
        <div className="absolute inset-y-0 w-0.5 bg-texto/40" style={{ left: `${marca}%` }} aria-hidden />
      )}
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
    <button
      type="button"
      onClick={aoTocar}
      className="block w-full space-y-2 px-4 py-3 text-left active:bg-cartao-2"
    >
      <div className="flex items-center gap-3">
        <IconeCategoria icone={categoria?.icone ?? '❔'} cor={categoria?.cor ?? '#868e96'} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{categoria?.nome ?? 'Categoria excluída'}</p>
          <p className="text-sm text-suave">
            {formatarReais(linha.gasto)} de {formatarReais(linha.limite)}
          </p>
        </div>
        <div className="text-right">
          <p className={clsx('text-sm font-bold', COR_TEXTO[linha.faixa])}>{linha.porcentagem}%</p>
          <p className={clsx('text-xs', excedido ? 'font-semibold text-perigo' : 'text-suave')}>
            {excedido ? `Excedido em ${formatarReais(-linha.disponivel)}` : `Resta ${formatarReais(linha.disponivel)}`}
          </p>
        </div>
      </div>
      <BarraProgresso porcentagem={linha.porcentagem} faixa={linha.faixa} />
    </button>
  )
}
