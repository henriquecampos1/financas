// Recorrências: despesas e receitas fixas (assinaturas, aluguel, salário) que acontecem todo mês.
import { format } from 'date-fns'
import type { Recorrencia } from '@/db/tipos'
import { deISO, paraISO, ultimoDiaDoMes, type DataISO } from './datas'
import type { DadosLancamento } from './parcelas'

export interface Ocorrencia {
  /** Mês da ocorrência, "aaaa-mm" (identifica a ocorrência mesmo se a data do lançamento mudar). */
  mes: string
  data: DataISO
}

export function mesDaData(data: DataISO): string {
  return data.slice(0, 7)
}

/** Data da ocorrência no mês, usando o último dia quando o mês é mais curto (dia 31 em abril → 30/04). */
export function dataNoMes(mes: string, dia: number): DataISO {
  const [ano, m] = mes.split('-').map(Number)
  return paraISO(new Date(ano, m - 1, Math.min(Math.max(1, dia), ultimoDiaDoMes(ano, m - 1))))
}

/** Ocorrências da recorrência entre as datas (inclusive), respeitando início e fim dela. */
export function ocorrencias(rec: Pick<Recorrencia, 'dia' | 'inicio' | 'fim'>, de: DataISO, ate: DataISO): Ocorrencia[] {
  const desde = de > rec.inicio ? de : rec.inicio
  const limite = rec.fim && rec.fim < ate ? rec.fim : ate
  if (desde > limite) return []
  const lista: Ocorrencia[] = []
  const cursor = deISO(desde)
  cursor.setDate(1)
  while (format(cursor, 'yyyy-MM') <= mesDaData(limite)) {
    const mes = format(cursor, 'yyyy-MM')
    const data = dataNoMes(mes, rec.dia)
    if (data >= desde && data <= limite) lista.push({ mes, data })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return lista
}

/** Ocorrências que já deviam ter sido lançadas até hoje e ainda não foram (nem puladas). */
export function ocorrenciasDevidas(
  rec: Pick<Recorrencia, 'dia' | 'inicio' | 'fim' | 'puladas'>,
  hoje: DataISO,
  mesesLancados: Set<string>,
): Ocorrencia[] {
  const puladas = new Set(rec.puladas ?? [])
  return ocorrencias(rec, rec.inicio, hoje).filter((o) => !mesesLancados.has(o.mes) && !puladas.has(o.mes))
}

/** Dados do lançamento de uma ocorrência. */
export function dadosDaOcorrencia(rec: Recorrencia, o: Ocorrencia): DadosLancamento {
  return {
    tipo: rec.metodo === 'credito' ? 'despesa' : rec.tipo,
    metodo: rec.metodo,
    valor: rec.valor,
    descricao: rec.descricao,
    categoriaId: rec.categoriaId,
    dataCompra: o.data,
    cartaoId: rec.cartaoId,
    contaId: rec.contaId,
    parcelas: 1,
    observacao: '',
    tags: rec.tags,
  }
}
