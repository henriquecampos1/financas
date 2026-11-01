// Monta os lançamentos de uma compra/entrada, gerando as parcelas quando é parcelada.
import { addMonths } from 'date-fns'
import type { Lancamento, Metodo, Tipo } from '@/db/tipos'
import { deISO, paraISO, type DataISO } from './datas'

/** O que o formulário preenche. `valor` é o total da compra; `parcelas` = 1 é à vista. */
export interface DadosLancamento {
  tipo: Tipo
  metodo: Metodo
  valor: number
  descricao: string
  categoriaId: string
  dataCompra: DataISO
  cartaoId?: string
  contaId?: string
  parcelas: number
  observacao: string
  tags: string[]
}

export const MAX_PARCELAS = 24

/** Divide o total em parcelas de centavos inteiros; a sobra fica na primeira (como nos bancos). */
export function dividirEmParcelas(total: number, quantidade: number): number[] {
  const n = Math.max(1, Math.trunc(quantidade))
  const base = Math.floor(total / n)
  const sobra = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? sobra : 0))
}

/** Data da parcela (indice 0 = primeira = data da compra). 31/01 + 1 mês → 28/02. */
export function dataDaParcela(dataCompra: DataISO, indice: number): DataISO {
  return paraISO(addMonths(deISO(dataCompra), indice))
}

/**
 * Lançamentos a gravar. Só o crédito parcela; nas outras formas de pagamento `parcelas` é ignorado.
 * `reaproveitar` mantém o id, o grupo e a data de criação quando se edita um lançamento existente.
 */
export function gerarLancamentos(
  dados: DadosLancamento,
  novoId: () => string,
  agora: number,
  reaproveitar?: { id: string; grupoParcelasId?: string; criadoEm: number },
): Lancamento[] {
  const credito = dados.metodo === 'credito'
  const quantidade = credito ? Math.min(MAX_PARCELAS, Math.max(1, dados.parcelas)) : 1
  const valores = dividirEmParcelas(dados.valor, quantidade)
  const grupo = quantidade > 1 ? (reaproveitar?.grupoParcelasId ?? novoId()) : undefined
  const observacao = dados.observacao.trim()

  return valores.map((valor, i) => ({
    id: i === 0 && reaproveitar ? reaproveitar.id : novoId(),
    tipo: credito ? 'despesa' : dados.tipo,
    metodo: dados.metodo,
    valor,
    descricao: dados.descricao.trim(),
    categoriaId: dados.categoriaId,
    data: dataDaParcela(dados.dataCompra, i),
    dataCompra: dados.dataCompra,
    ...(credito ? { cartaoId: dados.cartaoId } : { contaId: dados.contaId }),
    ...(grupo ? { parcela: { numero: i + 1, total: quantidade }, grupoParcelasId: grupo } : {}),
    ...(observacao ? { observacao } : {}),
    tags: dados.tags,
    criadoEm: reaproveitar?.criadoEm ?? agora,
  }))
}

/** Dados para o formulário a partir de um lançamento gravado (e das demais parcelas, se houver). */
export function dadosDoLancamento(lancamento: Lancamento, grupo: Lancamento[] = [lancamento]): DadosLancamento {
  const parcelas = grupo.length > 1 ? grupo : [lancamento]
  return {
    tipo: lancamento.tipo,
    metodo: lancamento.metodo,
    valor: parcelas.reduce((soma, l) => soma + l.valor, 0),
    descricao: lancamento.descricao,
    categoriaId: lancamento.categoriaId,
    dataCompra: lancamento.dataCompra,
    cartaoId: lancamento.cartaoId,
    contaId: lancamento.contaId,
    parcelas: lancamento.parcela?.total ?? 1,
    observacao: lancamento.observacao ?? '',
    tags: lancamento.tags,
  }
}

/** "#Viagem-Rio, trabalho  #viagem-rio" → ["viagem-rio", "trabalho"]. */
export function lerTags(texto: string): string[] {
  const tags = texto
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^#+/, '').trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(tags)]
}
