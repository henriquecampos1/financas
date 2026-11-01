// Metas / caixinhas: quanto já foi guardado e quanto guardar por mês para chegar no prazo.
import { differenceInCalendarMonths } from 'date-fns'
import type { Meta } from '@/db/tipos'
import { deISO, type DataISO } from './datas'

export function valorGuardado(meta: Pick<Meta, 'aportes'>): number {
  return meta.aportes.reduce((s, a) => s + a.valor, 0)
}

export function progressoMeta(meta: Pick<Meta, 'aportes' | 'valorAlvo'>): number {
  if (meta.valorAlvo <= 0) return 0
  return Math.round((valorGuardado(meta) / meta.valorAlvo) * 100)
}

/** Quantos meses ainda dá para guardar, contando o atual (prazo no mês atual → 1; prazo passado → 0). */
export function mesesAtePrazo(hoje: DataISO, prazo: DataISO): number {
  if (prazo < hoje) return 0
  return differenceInCalendarMonths(deISO(prazo), deISO(hoje)) + 1
}

/** Quanto guardar por mês para atingir a meta no prazo (undefined sem prazo ou com prazo vencido). */
export function sugestaoMensal(meta: Pick<Meta, 'aportes' | 'valorAlvo' | 'prazo'>, hoje: DataISO): number | undefined {
  if (!meta.prazo) return undefined
  const falta = meta.valorAlvo - valorGuardado(meta)
  if (falta <= 0) return 0
  const meses = mesesAtePrazo(hoje, meta.prazo)
  if (!meses) return undefined
  return Math.ceil(falta / meses)
}
