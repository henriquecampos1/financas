// Lista de lançamentos agrupada por dia. Tocar num item abre o formulário de edição.
import clsx from 'clsx'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo } from 'react'
import type { Cartao, Categoria, Conta } from '@/db/tipos'
import { useCategorias } from '@/hooks/categorias'
import { useCartoes, useContas } from '@/hooks/dados'
import { useEditor } from '@/hooks/editor'
import { agruparPorDia, type ItemCompetencia } from '@/utils/competencia'
import { deISO, primeiraMaiuscula, type DataISO } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'
import { NOMES_METODO } from './EditorLancamento'
import { IconeCategoria } from './ui'

function rotuloDia(data: DataISO): string {
  const d = deISO(data)
  if (isToday(d)) return 'Hoje'
  if (isYesterday(d)) return 'Ontem'
  const formato = d.getFullYear() === new Date().getFullYear() ? "EEEE, d 'de' MMMM" : "EEEE, d 'de' MMMM 'de' yyyy"
  return primeiraMaiuscula(format(d, formato, { locale: ptBR }))
}

export interface Referencias {
  categorias: Map<string, Categoria>
  cartoes: Map<string, Cartao>
  contas: Map<string, Conta>
}

/** Mapas de categorias, cartões e contas por id (para mostrar nomes e cores). */
export function useReferencias(): Referencias | undefined {
  const categorias = useCategorias()
  const cartoes = useCartoes()
  const contas = useContas()
  return useMemo(() => {
    if (!categorias || !cartoes || !contas) return undefined
    return {
      categorias: new Map(categorias.map((c) => [c.id, c])),
      cartoes: new Map(cartoes.map((c) => [c.id, c])),
      contas: new Map(contas.map((c) => [c.id, c])),
    }
  }, [categorias, cartoes, contas])
}

export function LinhaLancamento({ item, refs }: { item: ItemCompetencia; refs: Referencias }) {
  const { editar } = useEditor()
  const l = item.lancamento
  const categoria = refs.categorias.get(l.categoriaId)
  const onde = l.metodo === 'credito' ? refs.cartoes.get(l.cartaoId ?? '')?.nome : refs.contas.get(l.contaId ?? '')?.nome
  const detalhes = [
    categoria?.nome ?? 'Sem categoria',
    l.metodo === 'credito' ? onde : [NOMES_METODO[l.metodo], onde].filter(Boolean).join(' · '),
  ].filter(Boolean)
  const receita = l.tipo === 'receita'

  return (
    <button
      type="button"
      onClick={() => editar(l)}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-cartao-2"
    >
      <IconeCategoria icone={categoria?.icone ?? '❔'} cor={categoria?.cor ?? '#868e96'} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{l.descricao || categoria?.nome || 'Lançamento'}</span>
          {item.rotuloParcela && (
            <span className="shrink-0 rounded-md bg-credito/12 px-1.5 text-xs font-semibold text-credito">
              {item.rotuloParcela}
            </span>
          )}
        </span>
        <span className="block truncate text-sm text-suave">
          {detalhes.join(' · ')}
          {l.tags.length > 0 && <span className="text-primaria"> {l.tags.map((t) => `#${t}`).join(' ')}</span>}
        </span>
      </span>
      <span className={clsx('shrink-0 text-right font-semibold', receita ? 'text-receita' : 'text-texto')}>
        {receita ? '+' : '−'}
        {formatarReais(item.valor)}
      </span>
    </button>
  )
}

export function ListaPorDia({ itens, refs }: { itens: ItemCompetencia[]; refs: Referencias }) {
  const dias = useMemo(() => agruparPorDia(itens), [itens])
  return (
    <div className="space-y-4">
      {dias.map((dia) => (
        <section key={dia.data}>
          <div className="mb-1 flex items-baseline justify-between px-1">
            <h3 className="text-sm font-semibold text-suave">{rotuloDia(dia.data)}</h3>
            <span className="text-xs text-suave">{formatarReais(dia.saldo)}</span>
          </div>
          <div className="divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-cartao">
            {dia.itens.map((item) => (
              <LinhaLancamento key={item.id} item={item} refs={refs} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
