// Faturas do cartão de crédito, calculadas pelo dia de fechamento e de vencimento.
// Compras feitas ANTES do dia de fechamento entram na fatura que fecha naquele mês; a partir
// do dia de fechamento, entram na seguinte. A fatura é identificada pelo mês de vencimento.
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Lancamento, PagamentoFatura } from '@/db/tipos'
import { deISO, paraISO, somarDias, ultimoDiaDoMes, type DataISO } from './datas'

export interface DiasDoCartao {
  diaFechamento: number
  diaVencimento: number
}

export interface Fatura {
  /** Mês de vencimento, "aaaa-mm". */
  chave: string
  /** Primeiro dia de compras que entram nesta fatura. */
  inicio: DataISO
  /** Último dia de compras que entram nesta fatura (véspera do fechamento). */
  fim: DataISO
  fechamento: DataISO
  vencimento: DataISO
}

export type SituacaoFatura = 'futura' | 'aberta' | 'fechada' | 'paga' | 'vencida' | 'sem-gastos'

/** Dia do mês, usando o último dia quando o mês é mais curto (dia 31 em abril → 30/04). */
function dataNoMes(ano: number, mes0: number, dia: number): Date {
  return new Date(ano, mes0, Math.min(Math.max(1, dia), ultimoDiaDoMes(ano, mes0)))
}

/** Vence no mesmo mês em que fecha só quando o dia de vencimento vem depois do fechamento. */
function venceNoMesDoFechamento(c: DiasDoCartao): boolean {
  return c.diaVencimento > c.diaFechamento
}

/** Fatura que fecha no mês informado (mes0 de 0 a 11; aceita valores fora da faixa). */
function faturaQueFechaEm(ano: number, mes0: number, c: DiasDoCartao): Fatura {
  const fechamento = paraISO(dataNoMes(ano, mes0, c.diaFechamento))
  const fechamentoAnterior = paraISO(dataNoMes(ano, mes0 - 1, c.diaFechamento))
  const vencimento = dataNoMes(ano, venceNoMesDoFechamento(c) ? mes0 : mes0 + 1, c.diaVencimento)
  return {
    chave: format(vencimento, 'yyyy-MM'),
    inicio: fechamentoAnterior,
    fim: somarDias(fechamento, -1),
    fechamento,
    vencimento: paraISO(vencimento),
  }
}

/** Fatura em que entra uma compra feita na data. */
export function faturaDaData(data: DataISO, c: DiasDoCartao): Fatura {
  const d = deISO(data)
  const fechaEsteMes = paraISO(dataNoMes(d.getFullYear(), d.getMonth(), c.diaFechamento))
  return faturaQueFechaEm(d.getFullYear(), data >= fechaEsteMes ? d.getMonth() + 1 : d.getMonth(), c)
}

/** Fatura pelo mês de vencimento ("aaaa-mm"). */
export function faturaPorChave(chave: string, c: DiasDoCartao): Fatura {
  const [ano, mes] = chave.split('-').map(Number)
  return faturaQueFechaEm(ano, mes - 1 - (venceNoMesDoFechamento(c) ? 0 : 1), c)
}

/** Fatura `n` meses à frente (n > 0) ou atrás (n < 0). */
export function deslocarFatura(f: Fatura, n: number, c: DiasDoCartao): Fatura {
  const fechamento = deISO(f.fechamento)
  return faturaQueFechaEm(fechamento.getFullYear(), fechamento.getMonth() + n, c)
}

/** Fatura de um lançamento no crédito: a parcela N cai N-1 faturas depois da compra. */
export function faturaDoLancamento(l: Pick<Lancamento, 'dataCompra' | 'parcela'>, c: DiasDoCartao): Fatura {
  const daCompra = faturaDaData(l.dataCompra, c)
  const deslocamento = (l.parcela?.numero ?? 1) - 1
  return deslocamento ? deslocarFatura(daCompra, deslocamento, c) : daCompra
}

export function situacaoFatura(f: Fatura, total: number, pago: number, hoje: DataISO): SituacaoFatura {
  if (hoje < f.inicio) return 'futura'
  if (hoje < f.fechamento) return 'aberta'
  if (total <= 0) return 'sem-gastos'
  if (pago >= total) return 'paga'
  if (hoje > f.vencimento) return 'vencida'
  return 'fechada'
}

export const TEXTO_SITUACAO: Record<SituacaoFatura, string> = {
  futura: 'Próxima',
  aberta: 'Aberta',
  fechada: 'Fechada',
  paga: 'Paga',
  vencida: 'Vencida',
  'sem-gastos': 'Sem gastos',
}

/** Total por fatura (chave → centavos) dos lançamentos de um cartão. */
export function totaisPorFatura(lancamentos: Lancamento[], c: DiasDoCartao): Map<string, number> {
  const totais = new Map<string, number>()
  for (const l of lancamentos) {
    if (l.metodo !== 'credito') continue
    const chave = faturaDoLancamento(l, c).chave
    totais.set(chave, (totais.get(chave) ?? 0) + (l.tipo === 'despesa' ? l.valor : -l.valor))
  }
  return totais
}

export interface ResumoFatura {
  fatura: Fatura
  /** Soma das compras (e parcelas) que caem nesta fatura. */
  compras: number
  /** Pagamentos feitos ANTES do fechamento: abatem o valor da fatura. */
  antecipado: number
  /** Valor da fatura: compras − antecipado (o que o banco cobraria no fechamento). */
  valor: number
  /** Todos os pagamentos desta fatura (antecipados e depois do fechamento). */
  pago: number
  /** Quanto ainda falta pagar (negativo = pago a mais). */
  restante: number
  situacao: SituacaoFatura
}

/**
 * Resumo de uma fatura. Pagamento antecipado é um pagamento comum registrado antes do fechamento:
 * não é gasto novo (as compras continuam no ciclo em que foram feitas), só diminui o valor da fatura.
 */
export function resumirFatura(
  fatura: Fatura,
  totais: Map<string, number>,
  pagamentos: PagamentoFatura[],
  hoje: DataISO,
): ResumoFatura {
  const compras = totais.get(fatura.chave) ?? 0
  let antecipado = 0
  let pago = 0
  for (const p of pagamentos) {
    if (p.fatura !== fatura.chave) continue
    pago += p.valor
    if (ehAntecipado(p, fatura)) antecipado += p.valor
  }
  return {
    fatura,
    compras,
    antecipado,
    valor: compras - antecipado,
    pago,
    restante: compras - pago,
    situacao: situacaoFatura(fatura, compras, pago, hoje),
  }
}

export function ehAntecipado(p: Pick<PagamentoFatura, 'data'>, fatura: Fatura): boolean {
  return p.data < fatura.fechamento
}

/** Pago por fatura (chave → centavos). */
export function pagoPorFatura(pagamentos: PagamentoFatura[]): Map<string, number> {
  const pagos = new Map<string, number>()
  for (const p of pagamentos) pagos.set(p.fatura, (pagos.get(p.fatura) ?? 0) + p.valor)
  return pagos
}

/**
 * Limite usado: todas as compras do cartão (inclusive parcelas futuras, que já reservam limite)
 * menos o que já foi pago. Nunca fica negativo.
 */
export function limiteUsado(lancamentos: Lancamento[], pagamentos: PagamentoFatura[]): number {
  const compras = lancamentos.reduce((s, l) => s + (l.tipo === 'despesa' ? l.valor : -l.valor), 0)
  const pago = pagamentos.reduce((s, p) => s + p.valor, 0)
  return Math.max(0, compras - pago)
}

/** "dezembro/2026" */
export function rotuloFatura(f: Fatura): string {
  return format(deISO(f.vencimento), 'MMMM/yyyy', { locale: ptBR })
}

/** "dez" */
export function rotuloCurtoFatura(f: Fatura): string {
  return format(deISO(f.vencimento), 'MMM', { locale: ptBR })
}
