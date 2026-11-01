// Aba "Transações": divisões Crédito e Pix/Débito, com busca e filtros.
import clsx from 'clsx'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { Area } from '@/components/EditorLancamento'
import { FiltrosAtivos, PainelFiltros, filtrar, quantosFiltros, type ValoresFiltro } from '@/components/Filtros'
import { ListaPorDia, useReferencias } from '@/components/ListaLancamentos'
import { CartaoFatura, useResumoCartoes } from '@/components/ResumoCartoes'
import { SeletorCiclo } from '@/components/SeletorCiclo'
import { BotaoIcone, Cabecalho, Entrada, Segmentado, Vazio } from '@/components/ui'
import { useCiclo } from '@/hooks/ciclo'
import { useContas, useItensDoPeriodo, useSaldosDasContas } from '@/hooks/dados'
import { totais } from '@/utils/competencia'
import { formatarReais } from '@/utils/dinheiro'

function FaixaCartoes() {
  const resumos = useResumoCartoes()
  if (!resumos) return null
  if (!resumos.length)
    return (
      <Link
        to="/contas"
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-borda font-semibold text-credito"
      >
        <Plus className="size-5" /> Cadastrar cartão de crédito
      </Link>
    )
  return (
    <div className="-mx-4 flex snap-x items-start gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {resumos.map((r) => (
        <CartaoFatura key={r.cartao.id} resumo={r} className="w-72 shrink-0 snap-start" />
      ))}
    </div>
  )
}

function FaixaContas({ selecionada, aoEscolher }: { selecionada?: string; aoEscolher: (id?: string) => void }) {
  const contas = useContas()
  const saldos = useSaldosDasContas()
  const ativas = (contas ?? []).filter((c) => !c.arquivada)
  if (!contas) return null
  if (!ativas.length)
    return (
      <Link
        to="/contas"
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-borda font-semibold text-primaria"
      >
        <Plus className="size-5" /> Cadastrar conta (Nubank, Itaú, Carteira...)
      </Link>
    )
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {ativas.map((c) => {
        const ativa = selecionada === c.id
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={ativa}
            onClick={() => aoEscolher(ativa ? undefined : c.id)}
            className={clsx(
              'min-w-36 shrink-0 rounded-2xl border bg-cartao px-4 py-2 text-left transition',
              ativa ? 'border-primaria ring-2 ring-primaria/30' : 'border-borda',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: c.cor }} aria-hidden />
              {c.nome}
            </span>
            <span className="block font-bold">{formatarReais(saldos?.get(c.id) ?? c.saldoInicial)}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Transacoes() {
  const [params, setParams] = useSearchParams()
  const area: Area = params.get('aba') === 'conta' ? 'conta' : 'credito'
  const { ciclo } = useCiclo()
  const [filtro, setFiltro] = useState<ValoresFiltro>({})
  const [busca, setBusca] = useState('')
  const [painel, setPainel] = useState(false)
  const refs = useReferencias()

  const periodo = filtro.periodo ?? ciclo
  const itens = useItensDoPeriodo(periodo.inicio, periodo.fim)
  const filtrados =
    itens && refs ? filtrar(itens, area, filtro, busca, (id) => refs.categorias.get(id)?.nome ?? '') : undefined
  const soma = totais(filtrados ?? [])
  const ativos = quantosFiltros(filtro)

  function trocarArea(nova: Area) {
    // Filtros de cartão/conta e forma não valem na outra divisão.
    setFiltro((f) => ({ ...f, origemId: undefined, metodo: undefined }))
    setParams(nova === 'conta' ? { aba: 'conta' } : {}, { replace: true })
  }

  return (
    <>
      <Cabecalho titulo="Transações">
        <div className="space-y-2">
          <Segmentado
            rotulo="Divisão"
            valor={area}
            aoMudar={trocarArea}
            opcoes={[
              { valor: 'credito', texto: 'Crédito' },
              { valor: 'conta', texto: 'Pix / Débito' },
            ]}
          />
          {!filtro.periodo && <SeletorCiclo />}
        </div>
      </Cabecalho>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {area === 'credito' ? (
          <FaixaCartoes />
        ) : (
          <FaixaContas selecionada={filtro.origemId} aoEscolher={(origemId) => setFiltro({ ...filtro, origemId })} />
        )}

        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-suave" />
            <Entrada
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar descrição, categoria, tag"
              aria-label="Buscar"
              className="pl-10"
            />
          </label>
          <BotaoIcone
            rotulo="Filtros"
            onClick={() => setPainel(true)}
            className={clsx('relative size-12 border border-borda bg-cartao', ativos && 'text-primaria')}
          >
            <SlidersHorizontal className="size-5" />
            {ativos > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primaria text-xs font-bold text-primaria-texto">
                {ativos}
              </span>
            )}
          </BotaoIcone>
        </div>
        <FiltrosAtivos area={area} filtro={filtro} aoMudar={setFiltro} />

        {filtrados && (
          <div className="flex items-baseline justify-between gap-2 px-1 text-sm">
            <span className="text-suave">
              {filtrados.length} lançamento{filtrados.length === 1 ? '' : 's'}
            </span>
            {area === 'credito' ? (
              <span>
                Total <strong>{formatarReais(soma.despesas)}</strong>
              </span>
            ) : (
              <span className="flex gap-3">
                <span className="text-receita">+{formatarReais(soma.receitas)}</span>
                <span>−{formatarReais(soma.despesas)}</span>
              </span>
            )}
          </div>
        )}

        {filtrados && refs && (filtrados.length ? (
          <ListaPorDia itens={filtrados} refs={refs} />
        ) : (
          <Vazio>
            {busca || ativos
              ? 'Nada encontrado com essa busca ou filtros.'
              : 'Nenhum lançamento neste período. Toque no + para lançar.'}
          </Vazio>
        ))}
      </div>

      {painel && (
        <PainelFiltros
          area={area}
          inicial={filtro}
          periodoPadrao={ciclo}
          aoAplicar={setFiltro}
          aoFechar={() => setPainel(false)}
        />
      )}
    </>
  )
}
