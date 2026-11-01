// Compromissos futuros: parcelas e contas fixas que ainda vão cair em cada ciclo, para ver quanto
// da renda dos próximos meses já está comprometido.
import type { Lancamento, Recorrencia, Tipo } from '@/db/tipos'
import type { Ciclo } from './ciclo'
import { somarDias, type DataISO } from './datas'
import { ocorrencias } from './recorrencias'

export interface Compromisso {
  id: string
  tipo: Tipo
  origem: 'parcela' | 'agendado' | 'fixa'
  descricao: string
  categoriaId: string
  valor: number
  data: DataISO
  /** "4/10" para parcelas. */
  rotulo?: string
}

export interface CompromissosDoCiclo {
  ciclo: Ciclo
  itens: Compromisso[]
  despesas: number
  /** Receitas fixas previstas (ex.: salário recorrente). */
  receitas: number
}

/**
 * Para cada ciclo, o que ainda vai acontecer depois de hoje: lançamentos com data futura (parcelas
 * já geradas ou agendados) e as ocorrências das recorrências ativas que ainda não foram lançadas.
 */
export function compromissosFuturos(
  ciclos: Ciclo[],
  lancamentosFuturos: Lancamento[],
  recorrencias: Recorrencia[],
  hoje: DataISO,
): CompromissosDoCiclo[] {
  const amanha = somarDias(hoje, 1)
  const lancadosPorRecorrencia = new Map<string, Set<string>>()
  for (const l of lancamentosFuturos) {
    if (!l.recorrenciaId || !l.recorrenciaMes) continue
    const meses = lancadosPorRecorrencia.get(l.recorrenciaId) ?? new Set<string>()
    meses.add(l.recorrenciaMes)
    lancadosPorRecorrencia.set(l.recorrenciaId, meses)
  }

  return ciclos.map((ciclo) => {
    const de = ciclo.inicio > amanha ? ciclo.inicio : amanha
    const itens: Compromisso[] = []
    if (de <= ciclo.fim) {
      for (const l of lancamentosFuturos) {
        if (l.data < de || l.data > ciclo.fim) continue
        itens.push({
          id: l.id,
          tipo: l.tipo,
          origem: l.grupoParcelasId ? 'parcela' : 'agendado',
          descricao: l.descricao,
          categoriaId: l.categoriaId,
          valor: l.valor,
          data: l.data,
          rotulo: l.parcela ? `${l.parcela.numero}/${l.parcela.total}` : undefined,
        })
      }
      for (const r of recorrencias) {
        if (!r.ativa) continue
        const puladas = new Set(r.puladas ?? [])
        const lancados = lancadosPorRecorrencia.get(r.id)
        for (const o of ocorrencias(r, de, ciclo.fim)) {
          if (puladas.has(o.mes) || lancados?.has(o.mes)) continue
          itens.push({
            id: `${r.id}-${o.mes}`,
            tipo: r.metodo === 'credito' ? 'despesa' : r.tipo,
            origem: 'fixa',
            descricao: r.descricao,
            categoriaId: r.categoriaId,
            valor: r.valor,
            data: o.data,
          })
        }
      }
    }
    itens.sort((a, b) => a.data.localeCompare(b.data))
    return {
      ciclo,
      itens,
      despesas: itens.filter((i) => i.tipo === 'despesa').reduce((s, i) => s + i.valor, 0),
      receitas: itens.filter((i) => i.tipo === 'receita').reduce((s, i) => s + i.valor, 0),
    }
  })
}
