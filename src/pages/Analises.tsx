// Aba "Análises": gráficos e indicadores do ciclo (ou de um intervalo livre de datas).
// Carregada só quando aberta, porque a biblioteca de gráficos é grande.
import clsx from 'clsx'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo, useState, type ReactNode } from 'react'
import { FolhaLancamentos } from '@/components/FolhaLancamentos'
import {
  BarrasCiclos,
  BarrasEconomia,
  ChaveLinha,
  LinhaRitmo,
  Rosca,
  type ColunaEconomia,
  type FatiaVisual,
} from '@/components/Graficos'
import { NOMES_METODO } from '@/components/EditorLancamento'
import { useReferencias } from '@/components/ListaLancamentos'
import { SeletorCiclo } from '@/components/SeletorCiclo'
import { Cabecalho, Campo, Cartao, Entrada, Segmentado, Selecao, Vazio } from '@/components/ui'
import type { Metodo } from '@/db/tipos'
import { useAjustes } from '@/hooks/ajustes'
import { useCiclo } from '@/hooks/ciclo'
import { useItensDoPeriodo } from '@/hooks/dados'
import { usePlano, usePlanosEntre } from '@/hooks/plano'
import {
  OUTRAS,
  economiaPorCiclo,
  gastosPorCategoria,
  gastosPorCiclo,
  gastosPorMetodo,
  indicadores,
  juntarOutras,
  ritmoDoPeriodo,
  type Periodo,
} from '@/utils/analises'
import { cicloDaData, ciclosAte, dataNoCiclo, rotuloCiclo, rotuloCurtoCiclo } from '@/utils/ciclo'
import type { ItemCompetencia } from '@/utils/competencia'
import { dataCurta, deISO, hojeISO } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'

const COR_METODO: Record<Metodo, string> = {
  credito: 'var(--grafico-credito)',
  pix: 'var(--grafico-pix)',
  transferencia: 'var(--grafico-transferencia)',
  debito: 'var(--grafico-debito)',
  dinheiro: 'var(--grafico-dinheiro)',
}

function Bloco({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Cartao className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold">{titulo}</h2>
        {extra}
      </div>
      {children}
    </Cartao>
  )
}

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <Cartao className="p-3">
      <p className="text-xs text-suave">{rotulo}</p>
      <p className="text-lg font-semibold">{valor}</p>
      {detalhe && <p className="truncate text-xs text-suave">{detalhe}</p>}
    </Cartao>
  )
}

type Aberto = { titulo: string; itens: ItemCompetencia[] } | null

export function Analises() {
  const { diaInicioCiclo } = useAjustes()
  const { ciclo } = useCiclo()
  const [modo, setModo] = useState<'ciclo' | 'livre'>('ciclo')
  const [livre, setLivre] = useState<Periodo>(ciclo)
  const [categoriaCiclos, setCategoriaCiclos] = useState('')
  const [verTabela, setVerTabela] = useState(false)
  const [tabelaEconomia, setTabelaEconomia] = useState(false)
  const [aberto, setAberto] = useState<Aberto>(null)
  const refs = useReferencias()
  const hoje = hojeISO()

  const periodo = modo === 'ciclo' ? ciclo : livre
  const itens = useItensDoPeriodo(periodo.inicio, periodo.fim)
  const plano = usePlano(ciclo)

  // Últimos 12 ciclos, terminando no ciclo escolhido (ou no que contém o fim do intervalo livre):
  // os 12 para a economia, os 6 últimos para a comparação de gastos.
  const ciclos12 = useMemo(
    () => ciclosAte(modo === 'ciclo' ? ciclo : cicloDaData(livre.fim, diaInicioCiclo), 12, diaInicioCiclo),
    [modo, ciclo, livre.fim, diaInicioCiclo],
  )
  const ciclos = ciclos12.slice(-6)
  const itensCiclos = useItensDoPeriodo(ciclos12[0].inicio, ciclos12[11].fim)
  const planos = usePlanosEntre(ciclos12[0].inicio, ciclos12[11].fim)

  if (!itens || !refs || !itensCiclos) return <Cabecalho titulo="Análises" />

  const ind = indicadores(itens, periodo, hoje)
  const despesas = itens.filter((i) => i.lancamento.tipo === 'despesa')

  const porCategoria = gastosPorCategoria(itens)
  const visualCategoria = (chave: string, valor: number, porcentagem: number): FatiaVisual => {
    if (chave === OUTRAS) return { chave, nome: 'Outras', cor: 'var(--grafico-outras)', valor, porcentagem }
    const c = refs.categorias.get(chave)
    return { chave, nome: c?.nome ?? 'Sem categoria', icone: c?.icone, cor: c?.cor ?? '#868e96', valor, porcentagem }
  }
  const fatiasCategoria = juntarOutras(porCategoria).map((f) => visualCategoria(f.chave, f.valor, f.porcentagem))
  const legendaCategoria = porCategoria.map((f) => visualCategoria(f.chave, f.valor, f.porcentagem))
  const pequenas = new Set(porCategoria.slice(fatiasCategoria.length - 1).map((f) => f.chave))

  const fatiasMetodo: FatiaVisual[] = gastosPorMetodo(itens).map((f) => ({
    chave: f.chave,
    nome: NOMES_METODO[f.chave],
    cor: COR_METODO[f.chave],
    valor: f.valor,
    porcentagem: f.porcentagem,
  }))

  const categoriaEscolhida = categoriaCiclos ? refs.categorias.get(categoriaCiclos) : undefined
  const colunas = gastosPorCiclo(itensCiclos, ciclos, categoriaCiclos || undefined).map(({ ciclo: c, valor }, i) => ({
    chave: c.inicio,
    rotulo: rotuloCurtoCiclo(c),
    detalhe: rotuloCiclo(c),
    valor,
    destaque: i === ciclos.length - 1,
  }))
  const mediaCiclos = Math.round(colunas.slice(0, -1).reduce((s, c) => s + c.valor, 0) / Math.max(1, colunas.length - 1))

  // Economia: some com os ciclos antes do primeiro lançamento (mas mostra pelo menos 6).
  const economias = economiaPorCiclo(itensCiclos, ciclos12)
  const primeiroComDados = economias.findIndex((e) => e.receitas || e.despesas)
  const colunasEconomia: ColunaEconomia[] = economias
    .slice(Math.min(primeiroComDados < 0 ? 6 : primeiroComDados, 6))
    .map((e) => ({
      chave: e.ciclo.inicio,
      rotulo: format(deISO(e.ciclo.inicio), 'MMM', { locale: ptBR }),
      detalhe: rotuloCiclo(e.ciclo),
      receitas: e.receitas,
      despesas: e.despesas,
      economia: e.economia,
      meta: planos?.find((p) => dataNoCiclo(p.inicio, e.ciclo))?.metaEconomia || undefined,
      emAndamento: hoje <= e.ciclo.fim,
    }))
  // Ciclos já encerrados e com algum lançamento (os vazios não entram na média).
  const fechados = colunasEconomia.filter((c) => !c.emAndamento && (c.receitas || c.despesas))
  const totalEconomizado = fechados.reduce((s, c) => s + c.economia, 0)
  const cicloAberto = colunasEconomia.find((c) => c.emAndamento && c.chave <= hoje)

  const planejado = modo === 'ciclo' && plano ? plano.limites.reduce((s, l) => s + l.limite, 0) : undefined
  const pontos = ritmoDoPeriodo(itens, periodo, hoje, planejado)
  const categoriasDespesa = [...refs.categorias.values()].filter((c) => c.tipo === 'despesa')

  function abrirCategoria(chave: string) {
    const daFatia = (id: string) => (chave === OUTRAS ? pequenas.has(id) : id === chave)
    const titulo = chave === OUTRAS ? 'Outras categorias' : (() => {
      const c = refs!.categorias.get(chave)
      return c ? `${c.icone} ${c.nome}` : 'Lançamentos'
    })()
    setAberto({ titulo, itens: despesas.filter((i) => daFatia(i.lancamento.categoriaId)) })
  }

  return (
    <>
      <Cabecalho titulo="Análises">
        <div className="space-y-2">
          <Segmentado
            rotulo="Período"
            valor={modo}
            aoMudar={(m) => {
              if (m === 'livre') setLivre(ciclo)
              setModo(m)
            }}
            opcoes={[
              { valor: 'ciclo', texto: 'Ciclo' },
              { valor: 'livre', texto: 'Escolher datas' },
            ]}
          />
          {modo === 'ciclo' ? (
            <SeletorCiclo />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Campo rotulo="De">
                <Entrada
                  type="date"
                  value={livre.inicio}
                  max={livre.fim}
                  onChange={(e) => e.target.value && setLivre({ ...livre, inicio: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Até">
                <Entrada
                  type="date"
                  value={livre.fim}
                  min={livre.inicio}
                  onChange={(e) => e.target.value && setLivre({ ...livre, fim: e.target.value })}
                />
              </Campo>
            </div>
          )}
        </div>
      </Cabecalho>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Indicador rotulo="Total gasto" valor={formatarReais(ind.total)} detalhe={`${despesas.length} lançamentos`} />
          <Indicador rotulo="Média por dia" valor={formatarReais(ind.mediaDiaria)} detalhe="até hoje" />
          <Indicador
            rotulo="Maior gasto"
            valor={ind.maior ? formatarReais(ind.maior.valor) : '—'}
            detalhe={
              ind.maior
                ? `${ind.maior.lancamento.descricao || refs.categorias.get(ind.maior.lancamento.categoriaId)?.nome || ''} · ${dataCurta(ind.maior.data).slice(0, 5)}`
                : undefined
            }
          />
          {ind.projecao !== undefined ? (
            <Indicador
              rotulo="Projeção até o fim"
              valor={formatarReais(ind.projecao)}
              detalhe={
                planejado
                  ? ind.projecao > planejado
                    ? `passa ${formatarReais(ind.projecao - planejado)} do plano`
                    : `${formatarReais(planejado - ind.projecao)} abaixo do plano`
                  : 'no ritmo atual'
              }
            />
          ) : (
            <Indicador
              rotulo="Receitas"
              valor={formatarReais(itens.reduce((s, i) => s + (i.lancamento.tipo === 'receita' ? i.valor : 0), 0))}
              detalhe="no período"
            />
          )}
        </div>

        <Bloco
          titulo="Quanto economizei"
          extra={
            <button type="button" onClick={() => setTabelaEconomia((v) => !v)} className="min-h-10 text-sm font-semibold text-primaria">
              {tabelaEconomia ? 'Ver gráfico' : 'Ver tabela'}
            </button>
          }
        >
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-suave">
                Total em {fechados.length} ciclo{fechados.length === 1 ? '' : 's'} fechado{fechados.length === 1 ? '' : 's'}
              </p>
              <p className={clsx('text-xl font-bold', totalEconomizado < 0 ? 'text-despesa' : 'text-receita')}>
                {formatarReais(totalEconomizado)}
              </p>
              <p className="text-xs text-suave">
                média {formatarReais(fechados.length ? Math.round(totalEconomizado / fechados.length) : 0)} por ciclo
              </p>
            </div>
            {cicloAberto && (
              <div>
                <p className="text-xs text-suave">Ciclo atual, até agora</p>
                <p className={clsx('text-xl font-bold', cicloAberto.economia < 0 ? 'text-despesa' : 'text-texto')}>
                  {formatarReais(cicloAberto.economia)}
                </p>
                {cicloAberto.meta ? <p className="text-xs text-suave">meta {formatarReais(cicloAberto.meta)}</p> : null}
              </div>
            )}
          </div>
          {tabelaEconomia ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-suave">
                  <th className="pb-1 font-medium">Ciclo</th>
                  <th className="pb-1 text-right font-medium">Economia</th>
                  <th className="pb-1 text-right font-medium">Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {[...colunasEconomia].reverse().map((c) => (
                  <tr key={c.chave}>
                    <td className="py-2">
                      {c.detalhe}
                      {c.emAndamento && <span className="block text-xs text-suave">em andamento</span>}
                    </td>
                    <td className={clsx('py-2 text-right font-semibold tabular-nums', c.economia < 0 ? 'text-despesa' : 'text-receita')}>
                      {formatarReais(c.economia)}
                    </td>
                    <td className="py-2 text-right text-suave tabular-nums">
                      {c.meta ? (
                        <>
                          {formatarReais(c.meta)}
                          {!c.emAndamento && <span aria-label={c.economia >= c.meta ? 'meta atingida' : 'meta não atingida'}>{c.economia >= c.meta ? ' ✓' : ' ✗'}</span>}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <BarrasEconomia colunas={colunasEconomia} />
          )}
          <p className="mt-2 text-xs text-suave">
            Economia = receitas − despesas do ciclo (compras no crédito contam no ciclo da compra). Se você investe a
            sobra, é quanto foi para os investimentos. O ciclo em andamento aparece mais claro.
          </p>
        </Bloco>

        {!despesas.length ? (
          <Vazio>Nenhum gasto neste período.</Vazio>
        ) : (
          <>
            <Bloco titulo="Gastos por categoria">
              <Rosca
                fatias={fatiasCategoria}
                legenda={legendaCategoria}
                total={ind.total}
                aoTocar={abrirCategoria}
              />
            </Bloco>

            <Bloco titulo="Por forma de pagamento">
              <Rosca
                fatias={fatiasMetodo}
                total={ind.total}
                aoTocar={(metodo) =>
                  setAberto({
                    titulo: NOMES_METODO[metodo as Metodo],
                    itens: despesas.filter((i) => i.lancamento.metodo === metodo),
                  })
                }
              />
            </Bloco>
          </>
        )}

        <Bloco
          titulo="Últimos 6 ciclos"
          extra={
            <button type="button" onClick={() => setVerTabela((v) => !v)} className="min-h-10 text-sm font-semibold text-primaria">
              {verTabela ? 'Ver gráfico' : 'Ver tabela'}
            </button>
          }
        >
          <Selecao value={categoriaCiclos} onChange={(e) => setCategoriaCiclos(e.target.value)} aria-label="O que comparar">
            <option value="">Todas as despesas</option>
            {categoriasDespesa.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icone} {c.nome}
              </option>
            ))}
          </Selecao>
          {verTabela ? (
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-borda">
                {[...colunas].reverse().map((c) => (
                  <tr key={c.chave} className={c.destaque ? 'font-semibold' : undefined}>
                    <td className="py-2">{c.detalhe}</td>
                    <td className="py-2 text-right tabular-nums">{formatarReais(c.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mt-3">
              <BarrasCiclos colunas={colunas} cor={categoriaEscolhida?.cor ?? 'var(--primaria)'} />
            </div>
          )}
          <p className="mt-2 text-xs text-suave">
            Média dos 5 ciclos anteriores: <strong className="text-texto">{formatarReais(mediaCiclos)}</strong>
            {colunas.at(-1)!.valor > mediaCiclos && mediaCiclos > 0
              ? ` · o último está ${Math.round((colunas.at(-1)!.valor / mediaCiclos - 1) * 100)}% acima`
              : ''}
          </p>
        </Bloco>

        <Bloco titulo={modo === 'ciclo' ? 'Ritmo do ciclo' : 'Gasto acumulado'}>
          <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1">
            <ChaveLinha cor="var(--primaria)">Gasto acumulado</ChaveLinha>
            {planejado ? (
              <ChaveLinha cor="var(--suave)" tracejado>
                Ritmo ideal (planejado: {formatarReais(planejado)})
              </ChaveLinha>
            ) : null}
          </div>
          <LinhaRitmo pontos={pontos} />
          {modo === 'ciclo' && !planejado && (
            <p className="mt-2 text-xs text-suave">Crie um planejamento para comparar com o ritmo ideal.</p>
          )}
        </Bloco>
        <p className="pb-2 text-center text-xs text-suave">Toque numa categoria ou forma de pagamento para ver os lançamentos.</p>
      </div>

      {aberto && <FolhaLancamentos titulo={aberto.titulo} itens={aberto.itens} aoFechar={() => setAberto(null)} />}
    </>
  )
}
