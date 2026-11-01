// Datas guardadas como texto "aaaa-mm-dd" (dia local, sem fuso): comparar texto = comparar datas.
import { addDays, format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type DataISO = string

export function paraISO(data: Date): DataISO {
  return format(data, 'yyyy-MM-dd')
}

export function deISO(data: DataISO): Date {
  return parse(data, 'yyyy-MM-dd', new Date(2000, 0, 1))
}

export function hojeISO(): DataISO {
  return paraISO(new Date())
}

export function somarDias(data: DataISO, dias: number): DataISO {
  return paraISO(addDays(deISO(data), dias))
}

/** Último dia do mês (mes0 de 0 a 11; aceita valores fora da faixa, como -1 ou 12). */
export function ultimoDiaDoMes(ano: number, mes0: number): number {
  return new Date(ano, mes0 + 1, 0).getDate()
}

/** "sábado, 14 de novembro" → "Sábado, 14 de novembro" (o CSS capitalize mudaria também o "de"). */
export function primeiraMaiuscula(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1)
}

/** "15/01/2026" */
export function dataCurta(data: DataISO): string {
  return format(deISO(data), 'dd/MM/yyyy')
}

/** "qui., 15 de jan." */
export function dataPorExtenso(data: DataISO): string {
  return format(deISO(data), "EEE, d 'de' MMM", { locale: ptBR })
}
