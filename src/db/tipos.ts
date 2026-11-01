// Modelo de dados. Valores em dinheiro sempre em centavos (inteiros); datas em "aaaa-mm-dd".
import type { DataISO } from '@/utils/datas'

export type Tipo = 'despesa' | 'receita'
export type Metodo = 'credito' | 'pix' | 'transferencia' | 'debito' | 'dinheiro'

export interface Categoria {
  id: string
  nome: string
  /** Um emoji. */
  icone: string
  /** Cor em hexadecimal (#rrggbb). */
  cor: string
  tipo: Tipo
  arquivada: boolean
  /** Posição na lista (menor primeiro). */
  ordem: number
}

export interface Cartao {
  id: string
  nome: string
  cor: string
  limite: number
  /** Dia do mês em que a fatura fecha. */
  diaFechamento: number
  /** Dia do mês em que a fatura vence. */
  diaVencimento: number
  arquivado: boolean
  ordem: number
}

export interface Conta {
  id: string
  /** Ex.: Nubank, Itaú, Carteira. */
  nome: string
  cor: string
  saldoInicial: number
  arquivada: boolean
  ordem: number
}

export interface Lancamento {
  id: string
  tipo: Tipo
  metodo: Metodo
  /** Sempre positivo; o `tipo` diz se entra ou sai. */
  valor: number
  descricao: string
  categoriaId: string
  /** Data em que o lançamento conta (para parcelas, a data da parcela). */
  data: DataISO
  /** Data da compra; igual a `data` quando não é parcelado. */
  dataCompra: DataISO
  /** Crédito: cartão usado. */
  cartaoId?: string
  /** Pix, transferência, débito ou dinheiro: conta usada. */
  contaId?: string
  parcela?: { numero: number; total: number }
  /** Liga as parcelas de uma mesma compra. */
  grupoParcelasId?: string
  /** Lançamento gerado por uma recorrência. */
  recorrenciaId?: string
  /** Mês da recorrência a que este lançamento corresponde ("aaaa-mm"). */
  recorrenciaMes?: string
  observacao?: string
  tags: string[]
  criadoEm: number
}

/** Pagamento de fatura: é só uma transferência, não conta de novo como despesa. */
export interface PagamentoFatura {
  id: string
  cartaoId: string
  /** Mês de vencimento da fatura ("aaaa-mm"). */
  fatura: string
  valor: number
  data: DataISO
  contaId?: string
}

export interface LimiteCategoria {
  categoriaId: string
  limite: number
}

export interface Plano {
  id: string
  /** Primeiro dia do ciclo do plano. */
  inicio: DataISO
  /** Último dia do ciclo do plano. */
  fim: DataISO
  limites: LimiteCategoria[]
  rendaPrevista: number
  metaEconomia: number
}

export interface Aporte {
  id: string
  data: DataISO
  /** Positivo para aporte, negativo para retirada. */
  valor: number
  observacao?: string
}

/** Meta / caixinha de economia. O valor atual é a soma dos aportes. */
export interface Meta {
  id: string
  nome: string
  icone: string
  cor: string
  valorAlvo: number
  prazo?: DataISO
  aportes: Aporte[]
  criadaEm: number
}

/** Despesa ou receita fixa (assinatura, aluguel, salário), lançada a cada ciclo. */
export interface Recorrencia {
  id: string
  tipo: Tipo
  metodo: Metodo
  valor: number
  descricao: string
  categoriaId: string
  cartaoId?: string
  contaId?: string
  /** Dia do mês em que acontece. */
  dia: number
  inicio: DataISO
  fim?: DataISO
  /** Pede confirmação antes de lançar, em vez de lançar sozinha. */
  confirmarAntes: boolean
  ativa: boolean
  tags: string[]
  /** Meses ("aaaa-mm") pulados ou cujo lançamento foi excluído: não são gerados de novo. */
  puladas?: string[]
}

/**
 * Como compras parceladas entram no planejamento:
 * - 'por-parcela': cada parcela conta no ciclo em que cai (padrão);
 * - 'total-na-compra': o valor total conta no ciclo da compra.
 */
export type ModoParcelas = 'por-parcela' | 'total-na-compra'

export interface Ajustes {
  id: 'app'
  /** Dia do mês em que o ciclo começa (1 a 31). */
  diaInicioCiclo: number
  modoParcelas: ModoParcelas
  /** Quando foi feito o último backup (milissegundos). */
  ultimoBackup?: number
  /** PIN de bloqueio ("sal:resumo SHA-256"), se ativado. */
  pinHash?: string
  /** Quantos dígitos o PIN tem (para a tela de bloqueio conferir assim que completar). */
  pinTamanho?: number
}
