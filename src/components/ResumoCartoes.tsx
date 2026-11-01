// Resumo da fatura atual de cada cartão (Início e Transações).
import clsx from 'clsx'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import type { Cartao } from '@/db/tipos'
import { useCartoes, useCreditoCompleto } from '@/hooks/dados'
import { dataCurta, hojeISO } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'
import {
  deslocarFatura,
  faturaDaData,
  limiteUsado,
  resumirFatura,
  rotuloFatura,
  TEXTO_SITUACAO,
  totaisPorFatura,
  type ResumoFatura,
} from '@/utils/fatura'

export interface ResumoCartao {
  cartao: Cartao
  atual: ResumoFatura
  /** Fatura anterior, se já fechou e ainda falta pagar. */
  pendente?: ResumoFatura
  usado: number
}

export function useResumoCartoes(): ResumoCartao[] | undefined {
  const cartoes = useCartoes()
  const credito = useCreditoCompleto()
  return useMemo(() => {
    if (!cartoes || !credito) return undefined
    const hoje = hojeISO()
    return cartoes
      .filter((c) => !c.arquivado)
      .map((cartao) => {
        const lancamentos = credito.lancamentos.filter((l) => l.cartaoId === cartao.id)
        const pagamentos = credito.pagamentos.filter((p) => p.cartaoId === cartao.id)
        const totais = totaisPorFatura(lancamentos, cartao)
        const atual = resumirFatura(faturaDaData(hoje, cartao), totais, pagamentos, hoje)
        const anterior = resumirFatura(deslocarFatura(atual.fatura, -1, cartao), totais, pagamentos, hoje)
        const pendente = anterior.situacao === 'fechada' || anterior.situacao === 'vencida' ? anterior : undefined
        return { cartao, atual, pendente, usado: limiteUsado(lancamentos, pagamentos) }
      })
  }, [cartoes, credito])
}

export function BarraLimite({ usado, limite }: { usado: number; limite: number }) {
  if (limite <= 0) return null
  const pct = Math.min(100, Math.round((usado / limite) * 100))
  const disponivel = limite - usado
  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-cartao-2">
        <div
          className={clsx('h-full rounded-full', pct >= 90 ? 'bg-barra-excedido' : 'bg-credito')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-suave">
        {disponivel >= 0 ? `Disponível ${formatarReais(disponivel)}` : `Acima do limite em ${formatarReais(-disponivel)}`} de{' '}
        {formatarReais(limite)}
      </p>
    </div>
  )
}

export function CartaoFatura({ resumo, className }: { resumo: ResumoCartao; className?: string }) {
  const { cartao, atual, pendente, usado } = resumo
  return (
    <Link
      to={`/fatura/${cartao.id}`}
      className={clsx(
        'block overflow-hidden rounded-2xl border border-borda bg-cartao transition active:scale-[0.99]',
        className,
      )}
    >
      <div className="h-1.5" style={{ backgroundColor: cartao.cor }} aria-hidden />
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-semibold">{cartao.nome}</span>
          <span className="rounded-full bg-cartao-2 px-2 py-0.5 text-xs font-semibold text-suave">
            {TEXTO_SITUACAO[atual.situacao]}
          </span>
          <ChevronRight className="size-5 text-suave" />
        </div>
        <div>
          <p className="text-xs text-suave">Fatura de {rotuloFatura(atual.fatura)}</p>
          <p className="text-2xl font-bold">{formatarReais(atual.valor)}</p>
          {atual.antecipado > 0 && (
            <p className="text-xs font-medium text-sucesso">
              {formatarReais(atual.antecipado)} já antecipado (compras: {formatarReais(atual.compras)})
            </p>
          )}
          <p className="text-xs text-suave">
            Fecha {dataCurta(atual.fatura.fechamento)} · vence {dataCurta(atual.fatura.vencimento)}
          </p>
        </div>
        {pendente && (
          <p
            className={clsx(
              'flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium',
              pendente.situacao === 'vencida' ? 'bg-perigo/10 text-perigo' : 'bg-alerta/10 text-alerta',
            )}
          >
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            Fatura de {rotuloFatura(pendente.fatura)} {pendente.situacao === 'vencida' ? 'vencida' : 'fechada'}:{' '}
            {formatarReais(pendente.restante)} a pagar até {dataCurta(pendente.fatura.vencimento)}
          </p>
        )}
        <BarraLimite usado={usado} limite={cartao.limite} />
      </div>
    </Link>
  )
}
