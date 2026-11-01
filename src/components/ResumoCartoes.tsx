// Resumo da fatura atual de cada cartão (Início e Transações), desenhado como um cartão de crédito.
import clsx from 'clsx'
import { AlertTriangle, Wifi } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, type CSSProperties } from 'react'
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
import { ValorPrivado } from './Valor'

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

/** Fundo do cartão: a cor escolhida, escurecida em degradê (o texto branco sempre fica legível). */
export function fundoDoCartao(cor: string): CSSProperties {
  return {
    background: `radial-gradient(120% 120% at 100% 0%, color-mix(in srgb, ${cor} 90%, white) 0%, transparent 45%), linear-gradient(135deg, color-mix(in srgb, ${cor} 78%, black) 0%, color-mix(in srgb, ${cor} 48%, black) 100%)`,
  }
}

export function BarraLimite({ usado, limite, clara }: { usado: number; limite: number; clara?: boolean }) {
  if (limite <= 0) return null
  const pct = Math.min(100, Math.round((usado / limite) * 100))
  const disponivel = limite - usado
  return (
    <div>
      <div className={clsx('h-1.5 overflow-hidden rounded-full', clara ? 'bg-white/20' : 'bg-cartao-2')}>
        <motion.div
          className={clsx('h-full rounded-full', clara ? 'bg-white' : pct >= 90 ? 'bg-barra-excedido' : 'bg-credito')}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 22 }}
        />
      </div>
      <p className={clsx('numeros mt-1.5 text-xs', clara ? 'text-white/75' : 'text-suave')}>
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
      className={clsx('tocavel relative block overflow-hidden rounded-[26px] p-5 text-white shadow-flutuante', className)}
      style={fundoDoCartao(cartao.cor)}
    >
      {/* Desenho de fundo: dois círculos translúcidos, como nos cartões de verdade. */}
      <span className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-white/10" aria-hidden />
      <span className="pointer-events-none absolute -bottom-20 -left-8 size-40 rounded-full bg-black/10" aria-hidden />

      <div className="relative space-y-3">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-semibold">{cartao.nome}</span>
          <span className="rounded-full bg-white/18 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
            {TEXTO_SITUACAO[atual.situacao]}
          </span>
          <Wifi className="size-5 rotate-90 text-white/80" aria-hidden />
        </div>
        <div>
          <p className="text-xs text-white/75">Fatura de {rotuloFatura(atual.fatura)}</p>
          <ValorPrivado centavos={atual.valor} className="block text-[28px] font-bold leading-tight tracking-tight" />
          {atual.antecipado > 0 && (
            <p className="text-xs font-medium text-white/85">{formatarReais(atual.antecipado)} já antecipado</p>
          )}
          <p className="text-xs text-white/75">
            Fecha {dataCurta(atual.fatura.fechamento).slice(0, 5)} · vence {dataCurta(atual.fatura.vencimento).slice(0, 5)}
          </p>
        </div>
        {pendente && (
          <p className="flex items-start gap-1.5 rounded-xl bg-black/25 px-2.5 py-2 text-xs font-medium">
            <AlertTriangle className="mt-px size-3.5 shrink-0" />
            Fatura de {rotuloFatura(pendente.fatura)} {pendente.situacao === 'vencida' ? 'vencida' : 'fechada'}:{' '}
            {formatarReais(pendente.restante)} até {dataCurta(pendente.fatura.vencimento).slice(0, 5)}
          </p>
        )}
        <BarraLimite usado={usado} limite={cartao.limite} clara />
      </div>
    </Link>
  )
}
