// Ciclo financeiro: do dia de início de um mês até a véspera do dia de início do mês seguinte.
// Ex.: dia 15 → 15/01 a 14/02, 15/02 a 14/03... Se o mês não tem o dia escolhido (29, 30, 31),
// o ciclo começa no último dia daquele mês.
import { differenceInCalendarDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { deISO, paraISO, somarDias, ultimoDiaDoMes, type DataISO } from './datas'

export interface Ciclo {
  /** Primeiro dia do ciclo (inclusive). */
  inicio: DataISO
  /** Último dia do ciclo (inclusive). */
  fim: DataISO
}

export function diaInicioValido(dia: number): number {
  return Math.min(31, Math.max(1, Math.trunc(dia) || 1))
}

/** Data em que o ciclo começa no mês informado (mes0 de 0 a 11; aceita valores fora da faixa). */
function inicioNoMes(ano: number, mes0: number, diaInicio: number): Date {
  const dia = Math.min(diaInicioValido(diaInicio), ultimoDiaDoMes(ano, mes0))
  return new Date(ano, mes0, dia)
}

/** Ciclo que começa no mês informado. */
export function cicloDoMes(ano: number, mes0: number, diaInicio: number): Ciclo {
  const inicio = inicioNoMes(ano, mes0, diaInicio)
  const proximo = inicioNoMes(ano, mes0 + 1, diaInicio)
  return { inicio: paraISO(inicio), fim: somarDias(paraISO(proximo), -1) }
}

/** Ciclo que contém a data. */
export function cicloDaData(data: DataISO, diaInicio: number): Ciclo {
  const d = deISO(data)
  const inicioDoMes = paraISO(inicioNoMes(d.getFullYear(), d.getMonth(), diaInicio))
  const mes0 = data >= inicioDoMes ? d.getMonth() : d.getMonth() - 1
  return cicloDoMes(d.getFullYear(), mes0, diaInicio)
}

/** Ciclo `n` posições à frente (n > 0) ou atrás (n < 0). */
export function deslocarCiclo(ciclo: Ciclo, n: number, diaInicio: number): Ciclo {
  // O início sempre cai no próprio mês do ciclo, então o mês do início identifica o ciclo.
  const inicio = deISO(ciclo.inicio)
  return cicloDoMes(inicio.getFullYear(), inicio.getMonth() + n, diaInicio)
}

/** Os `quantidade` ciclos que terminam no ciclo informado, do mais antigo para o mais novo. */
export function ciclosAte(ciclo: Ciclo, quantidade: number, diaInicio: number): Ciclo[] {
  return Array.from({ length: quantidade }, (_, i) => deslocarCiclo(ciclo, i - quantidade + 1, diaInicio))
}

export function dataNoCiclo(data: DataISO, ciclo: Ciclo): boolean {
  return data >= ciclo.inicio && data <= ciclo.fim
}

export function mesmoCiclo(a: Ciclo, b: Ciclo): boolean {
  return a.inicio === b.inicio && a.fim === b.fim
}

export function diasNoCiclo(ciclo: Ciclo): number {
  return differenceInCalendarDays(deISO(ciclo.fim), deISO(ciclo.inicio)) + 1
}

/**
 * Dias que faltam, contando hoje. Ciclo já encerrado → 0; ciclo futuro → todos os dias dele.
 */
export function diasRestantes(ciclo: Ciclo, hoje: DataISO): number {
  if (hoje > ciclo.fim) return 0
  if (hoje < ciclo.inicio) return diasNoCiclo(ciclo)
  return differenceInCalendarDays(deISO(ciclo.fim), deISO(hoje)) + 1
}

/** "15 out – 14 nov 2026" (ou "28 dez 2026 – 27 jan 2027" quando vira o ano). */
export function rotuloCiclo(ciclo: Ciclo): string {
  const inicio = deISO(ciclo.inicio)
  const fim = deISO(ciclo.fim)
  const mesmoAno = inicio.getFullYear() === fim.getFullYear()
  const fmtInicio = format(inicio, mesmoAno ? 'd MMM' : 'd MMM yyyy', { locale: ptBR })
  return `${fmtInicio} – ${format(fim, 'd MMM yyyy', { locale: ptBR })}`
}

/** Nome curto do ciclo para gráficos: "15/10". */
export function rotuloCurtoCiclo(ciclo: Ciclo): string {
  return format(deISO(ciclo.inicio), 'dd/MM')
}

/** Ciclo de hoje. */
export function cicloAtual(diaInicio: number, hoje: DataISO = paraISO(new Date())): Ciclo {
  return cicloDaData(hoje, diaInicio)
}
