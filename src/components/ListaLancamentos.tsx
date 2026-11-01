// Lista de lançamentos agrupada por dia. Tocar num item abre o formulário de edição.
import clsx from 'clsx'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, type ReactNode } from 'react'
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
      className="flex min-h-[68px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-cartao-2"
    >
      <IconeCategoria icone={categoria?.icone ?? '❔'} cor={categoria?.cor ?? '#868e96'} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{l.descricao || categoria?.nome || 'Lançamento'}</span>
          {item.rotuloParcela && (
            <span className="shrink-0 rounded-full bg-credito/12 px-2 py-px text-[11px] font-bold text-credito">
              {item.rotuloParcela}
            </span>
          )}
        </span>
        <span className="block truncate text-[13px] text-suave">
          {detalhes.join(' · ')}
          {l.tags.length > 0 && <span className="text-primaria"> {l.tags.map((t) => `#${t}`).join(' ')}</span>}
        </span>
      </span>
      <span className={clsx('numeros shrink-0 text-right font-semibold', receita ? 'text-receita' : 'text-texto')}>
        {receita ? '+' : '−'}
        {formatarReais(item.valor)}
      </span>
    </button>
  )
}

/** Linha que entra "abrindo" (ao lançar) e sai "fechando" (ao excluir). */
function LinhaAnimada({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ height: { type: 'spring', stiffness: 380, damping: 36 }, opacity: { duration: 0.2 } }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  )
}

export function ListaPorDia({ itens, refs }: { itens: ItemCompetencia[]; refs: Referencias }) {
  const dias = useMemo(() => agruparPorDia(itens), [itens])
  return (
    <div className="space-y-5">
      <AnimatePresence initial={false}>
        {dias.map((dia) => (
          <motion.section
            key={dia.data}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="text-[15px] font-semibold">{rotuloDia(dia.data)}</h3>
              <span className="numeros text-xs font-medium text-suave">{formatarReais(dia.saldo)}</span>
            </div>
            <div className="divide-y divide-borda overflow-hidden rounded-3xl bg-cartao shadow-cartao">
              <AnimatePresence initial={false}>
                {dia.itens.map((item) => (
                  <LinhaAnimada key={item.id}>
                    <LinhaLancamento item={item} refs={refs} />
                  </LinhaAnimada>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        ))}
      </AnimatePresence>
    </div>
  )
}
