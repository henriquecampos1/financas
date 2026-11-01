// Filtros da lista de transações: categoria, forma, cartão/conta, tag e período livre.
import { X } from 'lucide-react'
import { useState } from 'react'
import type { Metodo } from '@/db/tipos'
import { useCategorias } from '@/hooks/categorias'
import { useCartoes, useContas, useTags } from '@/hooks/dados'
import type { ItemCompetencia } from '@/utils/competencia'
import { dataCurta, type DataISO } from '@/utils/datas'
import type { Area } from './EditorLancamento'
import { NOMES_METODO } from './EditorLancamento'
import { Botao, Campo, Entrada, Folha, Selecao, useFolha } from './ui'

export interface ValoresFiltro {
  categoriaId?: string
  metodo?: Metodo
  /** Cartão (crédito) ou conta (Pix/Débito). */
  origemId?: string
  tag?: string
  /** Intervalo livre; ausente = ciclo das setas. */
  periodo?: { inicio: DataISO; fim: DataISO }
}

export function filtrar(
  itens: ItemCompetencia[],
  area: Area,
  filtro: ValoresFiltro,
  busca: string,
  nomeDaCategoria: (id: string) => string = () => '',
): ItemCompetencia[] {
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  return itens.filter(({ lancamento: l }) => {
    if ((l.metodo === 'credito') !== (area === 'credito')) return false
    if (filtro.categoriaId && l.categoriaId !== filtro.categoriaId) return false
    if (filtro.metodo && l.metodo !== filtro.metodo) return false
    if (filtro.origemId && (area === 'credito' ? l.cartaoId : l.contaId) !== filtro.origemId) return false
    if (filtro.tag && !l.tags.includes(filtro.tag)) return false
    if (termo) {
      const texto = [l.descricao, l.observacao ?? '', nomeDaCategoria(l.categoriaId), ...l.tags]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
      if (!texto.includes(termo)) return false
    }
    return true
  })
}

export function quantosFiltros(f: ValoresFiltro): number {
  return [f.categoriaId, f.metodo, f.origemId, f.tag, f.periodo].filter(Boolean).length
}

/** Etiquetas dos filtros ativos, cada uma com um × para remover. */
export function FiltrosAtivos({
  area,
  filtro,
  aoMudar,
}: {
  area: Area
  filtro: ValoresFiltro
  aoMudar: (f: ValoresFiltro) => void
}) {
  const categorias = useCategorias()
  const cartoes = useCartoes()
  const contas = useContas()
  const etiquetas: { chave: keyof ValoresFiltro; texto: string }[] = []
  if (filtro.periodo)
    etiquetas.push({ chave: 'periodo', texto: `${dataCurta(filtro.periodo.inicio)} a ${dataCurta(filtro.periodo.fim)}` })
  if (filtro.categoriaId) {
    const c = categorias?.find((x) => x.id === filtro.categoriaId)
    etiquetas.push({ chave: 'categoriaId', texto: c ? `${c.icone} ${c.nome}` : 'Categoria' })
  }
  if (filtro.metodo) etiquetas.push({ chave: 'metodo', texto: NOMES_METODO[filtro.metodo] })
  if (filtro.origemId) {
    const lista = area === 'credito' ? cartoes : contas
    etiquetas.push({ chave: 'origemId', texto: lista?.find((x) => x.id === filtro.origemId)?.nome ?? '' })
  }
  if (filtro.tag) etiquetas.push({ chave: 'tag', texto: `#${filtro.tag}` })
  if (!etiquetas.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {etiquetas.map(({ chave, texto }) => (
        <button
          key={chave}
          type="button"
          onClick={() => aoMudar({ ...filtro, [chave]: undefined })}
          className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primaria/12 pl-3 pr-2 text-sm font-medium text-primaria"
          aria-label={`Remover filtro ${texto}`}
        >
          {texto} <X className="size-4" />
        </button>
      ))}
    </div>
  )
}

export function PainelFiltros({
  area,
  inicial,
  periodoPadrao,
  aoAplicar,
  aoFechar,
}: {
  area: Area
  inicial: ValoresFiltro
  periodoPadrao: { inicio: DataISO; fim: DataISO }
  aoAplicar: (f: ValoresFiltro) => void
  aoFechar: () => void
}) {
  const controle = useFolha(aoFechar)
  const categorias = useCategorias()
  const cartoes = useCartoes()
  const contas = useContas()
  const tags = useTags()
  const [f, setF] = useState(inicial)
  const origens = (area === 'credito' ? cartoes : contas) ?? []

  return (
    <Folha
      controle={controle}
      titulo="Filtros"
      rodape={
        <div className="grid grid-cols-2 gap-2">
          <Botao variante="secundario" onClick={() => setF({})}>
            Limpar
          </Botao>
          <Botao
            onClick={() => {
              aoAplicar(f)
              controle.fechar()
            }}
          >
            Aplicar
          </Botao>
        </div>
      }
    >
      <div className="space-y-4">
        <Campo rotulo="Categoria">
          <Selecao value={f.categoriaId ?? ''} onChange={(e) => setF({ ...f, categoriaId: e.target.value || undefined })}>
            <option value="">Todas</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.icone} {c.nome}
                {c.tipo === 'receita' ? ' (receita)' : ''}
              </option>
            ))}
          </Selecao>
        </Campo>
        {area === 'conta' && (
          <Campo rotulo="Forma">
            <Selecao
              value={f.metodo ?? ''}
              onChange={(e) => setF({ ...f, metodo: (e.target.value || undefined) as Metodo | undefined })}
            >
              <option value="">Todas</option>
              {(['pix', 'transferencia', 'debito', 'dinheiro'] as const).map((m) => (
                <option key={m} value={m}>
                  {NOMES_METODO[m]}
                </option>
              ))}
            </Selecao>
          </Campo>
        )}
        <Campo rotulo={area === 'credito' ? 'Cartão' : 'Conta'}>
          <Selecao value={f.origemId ?? ''} onChange={(e) => setF({ ...f, origemId: e.target.value || undefined })}>
            <option value="">Todos</option>
            {origens.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        {!!tags?.length && (
          <Campo rotulo="Tag">
            <Selecao value={f.tag ?? ''} onChange={(e) => setF({ ...f, tag: e.target.value || undefined })}>
              <option value="">Todas</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </Selecao>
          </Campo>
        )}
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-suave">Período</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-[var(--primaria)]"
              checked={!!f.periodo}
              onChange={(e) => setF({ ...f, periodo: e.target.checked ? (f.periodo ?? periodoPadrao) : undefined })}
            />
            Escolher datas (em vez do ciclo)
          </label>
          {f.periodo && (
            <div className="grid grid-cols-2 gap-2">
              <Campo rotulo="De">
                <Entrada
                  type="date"
                  value={f.periodo.inicio}
                  onChange={(e) => e.target.value && setF({ ...f, periodo: { ...f.periodo!, inicio: e.target.value } })}
                />
              </Campo>
              <Campo rotulo="Até">
                <Entrada
                  type="date"
                  value={f.periodo.fim}
                  onChange={(e) => e.target.value && setF({ ...f, periodo: { ...f.periodo!, fim: e.target.value } })}
                />
              </Campo>
            </div>
          )}
        </fieldset>
      </div>
    </Folha>
  )
}
