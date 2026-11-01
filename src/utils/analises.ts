// Contas das análises: gastos por categoria e por forma de pagamento, comparação entre ciclos,
// gasto acumulado × ritmo ideal e indicadores (maior gasto, média diária, projeção).
import { differenceInCalendarDays } from 'date-fns'
import type { Metodo } from '@/db/tipos'
import { dataNoCiclo, type Ciclo } from './ciclo'
import type { ItemCompetencia } from './competencia'
import { deISO, somarDias, type DataISO } from './datas'

export interface Periodo {
  inicio: DataISO
  fim: DataISO
}

export interface Fatia<Chave extends string = string> {
  chave: Chave
  valor: number
  /** Porcentagem do total (0 a 100, com 1 casa). */
  porcentagem: number
}

function despesas(itens: ItemCompetencia[]): ItemCompetencia[] {
  return itens.filter((i) => i.lancamento.tipo === 'despesa')
}

function emFatias<Chave extends string>(mapa: Map<Chave, number>): Fatia<Chave>[] {
  const total = [...mapa.values()].reduce((s, v) => s + v, 0)
  return [...mapa]
    .filter(([, valor]) => valor > 0)
    .map(([chave, valor]) => ({ chave, valor, porcentagem: total ? Math.round((valor / total) * 1000) / 10 : 0 }))
}

/** Gasto por categoria, do maior para o menor. */
export function gastosPorCategoria(itens: ItemCompetencia[]): Fatia[] {
  const mapa = new Map<string, number>()
  for (const i of despesas(itens)) mapa.set(i.lancamento.categoriaId, (mapa.get(i.lancamento.categoriaId) ?? 0) + i.valor)
  return emFatias(mapa).sort((a, b) => b.valor - a.valor)
}

export const OUTRAS = '__outras__'

/**
 * Para o gráfico de rosca: as `maximo` maiores fatias e o resto somado em "Outras"
 * (mais fatias que isso viram cores difíceis de distinguir).
 */
export function juntarOutras(fatias: Fatia[], maximo = 6): Fatia[] {
  if (fatias.length <= maximo + 1) return fatias
  const resto = fatias.slice(maximo)
  return [
    ...fatias.slice(0, maximo),
    {
      chave: OUTRAS,
      valor: resto.reduce((s, f) => s + f.valor, 0),
      porcentagem: Math.round(resto.reduce((s, f) => s + f.porcentagem, 0) * 10) / 10,
    },
  ]
}

/** Ordem fixa das formas de pagamento (a cor de cada uma nunca muda). */
export const ORDEM_METODOS: Metodo[] = ['credito', 'pix', 'transferencia', 'debito', 'dinheiro']

/** Gasto por forma de pagamento, sempre na ordem fixa. */
export function gastosPorMetodo(itens: ItemCompetencia[]): Fatia<Metodo>[] {
  const mapa = new Map<Metodo, number>(ORDEM_METODOS.map((m) => [m, 0]))
  for (const i of despesas(itens)) mapa.set(i.lancamento.metodo, (mapa.get(i.lancamento.metodo) ?? 0) + i.valor)
  return emFatias(mapa)
}

/** Total gasto em cada ciclo (opcionalmente só de uma categoria). */
export function gastosPorCiclo(
  itens: ItemCompetencia[],
  ciclos: Ciclo[],
  categoriaId?: string,
): { ciclo: Ciclo; valor: number }[] {
  return ciclos.map((ciclo) => ({
    ciclo,
    valor: despesas(itens)
      .filter((i) => dataNoCiclo(i.data, ciclo) && (!categoriaId || i.lancamento.categoriaId === categoriaId))
      .reduce((s, i) => s + i.valor, 0),
  }))
}

/**
 * Marcas "redondas" para o eixo de valores (em centavos): passos de 1, 2, 2,5 ou 5 × 10ⁿ reais,
 * com cerca de `quantas` divisões, passando pelo zero e cobrindo do menor ao maior valor.
 */
export function marcasDoEixo(maiorCentavos: number, quantas = 4, menorCentavos = 0): number[] {
  const menor = Math.min(0, menorCentavos) / 100
  // Tudo zerado: um eixo de 0 a R$ 1 só para o gráfico não ficar sem escala.
  const maior = Math.max(0, maiorCentavos) / 100 || (menor < 0 ? 0 : 1)
  const bruto = Math.max(1, maior - menor) / quantas
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto)!
  const primeiro = Math.floor(menor / passo)
  const ultimo = Math.max(primeiro + 1, Math.ceil(maior / passo))
  return Array.from({ length: ultimo - primeiro + 1 }, (_, i) => Math.round((primeiro + i) * passo * 100) + 0)
}

export interface EconomiaCiclo {
  ciclo: Ciclo
  receitas: number
  despesas: number
  /** Receitas − despesas: quanto sobrou para guardar/investir (negativo = gastou mais do que recebeu). */
  economia: number
}

/** Quanto sobrou em cada ciclo (compras no crédito contam no ciclo da compra). */
export function economiaPorCiclo(itens: ItemCompetencia[], ciclos: Ciclo[]): EconomiaCiclo[] {
  return ciclos.map((ciclo) => {
    let receitas = 0
    let despesas = 0
    for (const i of itens) {
      if (!dataNoCiclo(i.data, ciclo)) continue
      if (i.lancamento.tipo === 'receita') receitas += i.valor
      else despesas += i.valor
    }
    return { ciclo, receitas, despesas, economia: receitas - despesas }
  })
}

export function diasDoPeriodo(p: Periodo): number {
  return differenceInCalendarDays(deISO(p.fim), deISO(p.inicio)) + 1
}

/** Dias do período já vividos até hoje (inclusive). */
export function diasDecorridos(p: Periodo, hoje: DataISO): number {
  if (hoje < p.inicio) return 0
  if (hoje > p.fim) return diasDoPeriodo(p)
  return differenceInCalendarDays(deISO(hoje), deISO(p.inicio)) + 1
}

export interface PontoRitmo {
  data: DataISO
  /** Número do dia no período (1, 2, 3...). */
  dia: number
  /** Gasto acumulado até o dia; null nos dias que ainda não chegaram. */
  acumulado: number | null
  /** Onde o gasto deveria estar, num ritmo constante até o planejado; null sem planejamento. */
  ideal: number | null
}

/** Gasto acumulado dia a dia × ritmo ideal (planejado distribuído igualmente pelos dias). */
export function ritmoDoPeriodo(
  itens: ItemCompetencia[],
  p: Periodo,
  hoje: DataISO,
  planejado?: number,
): PontoRitmo[] {
  const total = diasDoPeriodo(p)
  const porDia = new Map<DataISO, number>()
  for (const i of despesas(itens)) porDia.set(i.data, (porDia.get(i.data) ?? 0) + i.valor)
  const pontos: PontoRitmo[] = []
  let acumulado = 0
  for (let dia = 1; dia <= total; dia++) {
    const data = somarDias(p.inicio, dia - 1)
    acumulado += porDia.get(data) ?? 0
    pontos.push({
      data,
      dia,
      acumulado: data <= hoje ? acumulado : null,
      ideal: planejado ? Math.round((planejado * dia) / total) : null,
    })
  }
  return pontos
}

export interface Indicadores {
  total: number
  /** Maior gasto do período (uma compra parcelada conta pelo valor que entra no período). */
  maior?: ItemCompetencia
  /** Total ÷ dias já vividos do período. */
  mediaDiaria: number
  /** Gasto previsto até o fim, mantendo o ritmo atual; só quando o período está em andamento. */
  projecao?: number
}

export function indicadores(itens: ItemCompetencia[], p: Periodo, hoje: DataISO): Indicadores {
  const gastos = despesas(itens)
  const total = gastos.reduce((s, i) => s + i.valor, 0)
  const maior = gastos.reduce<ItemCompetencia | undefined>((m, i) => (!m || i.valor > m.valor ? i : m), undefined)
  const vividos = diasDecorridos(p, hoje)
  const emAndamento = hoje >= p.inicio && hoje < p.fim
  // Lançamentos com data futura (parcelas que ainda vão cair) não entram no ritmo de hoje.
  const ateHoje = gastos.filter((i) => i.data <= hoje).reduce((s, i) => s + i.valor, 0)
  const futuros = total - ateHoje
  return {
    total,
    maior,
    mediaDiaria: vividos ? Math.round((emAndamento ? ateHoje : total) / vividos) : 0,
    projecao: emAndamento && vividos ? Math.round((ateHoje / vividos) * diasDoPeriodo(p)) + futuros : undefined,
  }
}
