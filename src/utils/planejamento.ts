// Contas do planejamento: gasto × limite por categoria, total do ciclo e quanto dá para gastar por dia.
import type { Plano } from '@/db/tipos'
import { diasRestantes, type Ciclo } from './ciclo'
import type { ItemCompetencia } from './competencia'
import type { DataISO } from './datas'

/** Verde até 70% do limite, amarelo acima de 70% até 100%, vermelho acima de 100%. */
export type Faixa = 'ok' | 'atencao' | 'excedido'

/** Porcentagem a partir da qual a categoria aparece nos alertas do Início. */
export const LIMITE_ALERTA = 80

export function faixaDeUso(gasto: number, limite: number): Faixa {
  if (limite <= 0) return gasto > 0 ? 'excedido' : 'ok'
  if (gasto > limite) return 'excedido'
  if (gasto * 100 > limite * 70) return 'atencao'
  return 'ok'
}

/** Porcentagem usada, arredondada (sem limite e com gasto → 100). */
export function porcentagem(gasto: number, limite: number): number {
  if (limite <= 0) return gasto > 0 ? 100 : 0
  return Math.round((gasto / limite) * 100)
}

export interface LinhaPlano {
  categoriaId: string
  limite: number
  gasto: number
  /** limite − gasto (negativo = excedido). */
  disponivel: number
  porcentagem: number
  faixa: Faixa
}

export interface ResumoPlano {
  /** Soma dos limites. */
  planejado: number
  /** Todas as despesas do ciclo (com ou sem limite definido). */
  gasto: number
  /** Parte do gasto em categorias sem limite no plano. */
  gastoSemLimite: number
  disponivel: number
  porcentagem: number
  faixa: Faixa
  diasRestantes: number
  /** Disponível ÷ dias restantes (0 se não sobra nada ou o ciclo acabou). */
  porDia: number
  linhas: LinhaPlano[]
  /** Categorias com gasto mas sem limite no plano. */
  semLimite: { categoriaId: string; gasto: number }[]
  receitas: number
  /** Receitas − despesas até agora. */
  sobra: number
}

/** Gasto por categoria (só despesas). */
export function gastoPorCategoria(itens: ItemCompetencia[]): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const { lancamento, valor } of itens) {
    if (lancamento.tipo !== 'despesa') continue
    mapa.set(lancamento.categoriaId, (mapa.get(lancamento.categoriaId) ?? 0) + valor)
  }
  return mapa
}

export function calcularPlano(
  plano: Pick<Plano, 'limites'>,
  itens: ItemCompetencia[],
  ciclo: Ciclo,
  hoje: DataISO,
): ResumoPlano {
  const gastos = gastoPorCategoria(itens)
  const comLimite = new Set<string>()
  const linhas: LinhaPlano[] = plano.limites
    .filter((l) => l.limite > 0)
    .map(({ categoriaId, limite }) => {
      comLimite.add(categoriaId)
      const gasto = gastos.get(categoriaId) ?? 0
      return {
        categoriaId,
        limite,
        gasto,
        disponivel: limite - gasto,
        porcentagem: porcentagem(gasto, limite),
        faixa: faixaDeUso(gasto, limite),
      }
    })
  const semLimite = [...gastos]
    .filter(([id, gasto]) => !comLimite.has(id) && gasto > 0)
    .map(([categoriaId, gasto]) => ({ categoriaId, gasto }))
    .sort((a, b) => b.gasto - a.gasto)

  const planejado = linhas.reduce((s, l) => s + l.limite, 0)
  const gasto = [...gastos.values()].reduce((s, v) => s + v, 0)
  const gastoSemLimite = semLimite.reduce((s, l) => s + l.gasto, 0)
  const disponivel = planejado - gasto
  const dias = diasRestantes(ciclo, hoje)
  const receitas = itens.reduce((s, i) => s + (i.lancamento.tipo === 'receita' ? i.valor : 0), 0)

  return {
    planejado,
    gasto,
    gastoSemLimite,
    disponivel,
    porcentagem: porcentagem(gasto, planejado),
    faixa: faixaDeUso(gasto, planejado),
    diasRestantes: dias,
    porDia: dias > 0 && disponivel > 0 ? Math.floor(disponivel / dias) : 0,
    linhas,
    semLimite,
    receitas,
    sobra: receitas - gasto,
  }
}

/** Categorias que pedem atenção (≥ 80% do limite), da mais estourada para a menos. */
export function alertas(resumo: ResumoPlano): LinhaPlano[] {
  return resumo.linhas
    .filter((l) => l.porcentagem >= LIMITE_ALERTA)
    .sort((a, b) => b.porcentagem - a.porcentagem)
}
