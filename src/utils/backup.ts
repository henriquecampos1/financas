// Formato do arquivo de backup (JSON) e exportação dos lançamentos para planilha (CSV do Excel).
import type { Cartao, Categoria, Conta, Lancamento } from '@/db/tipos'
import { dataCurta } from './datas'

export const TABELAS = [
  'categorias',
  'cartoes',
  'contas',
  'lancamentos',
  'pagamentosFatura',
  'planos',
  'metas',
  'recorrencias',
  'ajustes',
] as const

export type Tabela = (typeof TABELAS)[number]

export interface ArquivoBackup {
  app: 'minhas-financas'
  versao: 1
  exportadoEm: string
  dados: Record<Tabela, unknown[]>
}

export function montarBackup(dados: Record<Tabela, unknown[]>, agora = new Date()): ArquivoBackup {
  return { app: 'minhas-financas', versao: 1, exportadoEm: agora.toISOString(), dados }
}

/** Confere se o conteúdo é um backup deste app. Lança erro com mensagem em português se não for. */
export function validarBackup(conteudo: unknown): ArquivoBackup {
  const b = conteudo as Partial<ArquivoBackup> | null
  if (!b || typeof b !== 'object' || b.app !== 'minhas-financas')
    throw new Error('Este arquivo não é um backup do Minhas Finanças.')
  if (b.versao !== 1) throw new Error('Este backup é de uma versão do app que esta não reconhece.')
  if (!b.dados || typeof b.dados !== 'object') throw new Error('O backup está incompleto.')
  for (const t of TABELAS) {
    const lista = (b.dados as Record<string, unknown>)[t]
    if (!Array.isArray(lista)) throw new Error('O backup está incompleto.')
    if (lista.some((item) => !item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string'))
      throw new Error('O backup tem itens danificados.')
  }
  return b as ArquivoBackup
}

/** Nome do arquivo: financas-backup-2026-11-01.json */
export function nomeDoArquivo(prefixo: string, extensao: string, agora = new Date()): string {
  const d = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
  return `${prefixo}-${d}.${extensao}`
}

/** Dias desde o último backup (undefined = nunca fez). */
export function diasDesdeBackup(ultimo: number | undefined, agora = Date.now()): number | undefined {
  if (!ultimo) return undefined
  return Math.floor((agora - ultimo) / 86_400_000)
}

export const DIAS_LEMBRETE_BACKUP = 15

function celula(valor: string): string {
  return /[;"\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor
}

/** 123456 → "1234,56"; despesas saem negativas, para a soma no Excel dar o saldo. */
function valorCSV(l: Lancamento): string {
  const sinal = l.tipo === 'despesa' ? -1 : 1
  return ((sinal * l.valor) / 100).toFixed(2).replace('.', ',')
}

const NOME_METODO: Record<Lancamento['metodo'], string> = {
  credito: 'Crédito',
  pix: 'Pix',
  transferencia: 'Transferência',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
}

/**
 * Planilha dos lançamentos no formato do Excel em português: separador ";", vírgula decimal
 * e marca UTF-8 no início (para os acentos aparecerem certos).
 */
export function gerarCSV(
  lancamentos: Lancamento[],
  refs: { categorias: Map<string, Categoria>; cartoes: Map<string, Cartao>; contas: Map<string, Conta> },
): string {
  const cabecalho = ['Data', 'Data da compra', 'Tipo', 'Forma', 'Descrição', 'Categoria', 'Cartão/Conta', 'Parcela', 'Valor (R$)', 'Tags', 'Observação']
  const linhas = [...lancamentos]
    .sort((a, b) => a.data.localeCompare(b.data) || a.criadoEm - b.criadoEm)
    .map((l) =>
      [
        dataCurta(l.data),
        dataCurta(l.dataCompra),
        l.tipo === 'despesa' ? 'Despesa' : 'Receita',
        NOME_METODO[l.metodo],
        l.descricao,
        refs.categorias.get(l.categoriaId)?.nome ?? '',
        (l.metodo === 'credito' ? refs.cartoes.get(l.cartaoId ?? '') : refs.contas.get(l.contaId ?? ''))?.nome ?? '',
        l.parcela ? `${l.parcela.numero}/${l.parcela.total}` : '',
        valorCSV(l),
        l.tags.map((t) => `#${t}`).join(' '),
        l.observacao ?? '',
      ]
        .map(celula)
        .join(';'),
    )
  return `﻿${[cabecalho.join(';'), ...linhas].join('\r\n')}\r\n`
}
