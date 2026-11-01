// Mais → Compromissos futuros: parcelas e contas fixas dos próximos ciclos × renda prevista.
import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { BarraProgresso } from '@/components/BarrasPlano'
import { useReferencias } from '@/components/ListaLancamentos'
import { Cabecalho, Cartao, IconeCategoria, Vazio } from '@/components/ui'
import { db } from '@/db/banco'
import { useAjustes } from '@/hooks/ajustes'
import { usePlanosEntre } from '@/hooks/plano'
import { useRecorrencias } from '@/hooks/recorrencias'
import { cicloAtual, dataNoCiclo, deslocarCiclo, rotuloCiclo } from '@/utils/ciclo'
import { compromissosFuturos } from '@/utils/compromissos'
import { dataCurta, hojeISO } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'
import { faixaDeUso, porcentagem } from '@/utils/planejamento'

const QUANTOS_CICLOS = 6

export function Compromissos() {
  const { diaInicioCiclo } = useAjustes()
  const hoje = hojeISO()
  const atual = cicloAtual(diaInicioCiclo, hoje)
  const ciclos = Array.from({ length: QUANTOS_CICLOS }, (_, i) => deslocarCiclo(atual, i, diaInicioCiclo))
  const futuros = useLiveQuery(() => db.lancamentos.where('data').above(hoje).toArray(), [hoje])
  const recorrencias = useRecorrencias()
  const planos = usePlanosEntre(ciclos[0].inicio, ciclos.at(-1)!.fim)
  const refs = useReferencias()
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set([atual.inicio]))

  if (!futuros || !recorrencias || !refs) return <Cabecalho titulo="Compromissos futuros" voltarPara="/mais" />

  const lista = compromissosFuturos(ciclos, futuros, recorrencias, hoje)
  const alternar = (chave: string) =>
    setAbertos((s) => {
      const novo = new Set(s)
      if (novo.has(chave)) novo.delete(chave)
      else novo.add(chave)
      return novo
    })

  return (
    <>
      <Cabecalho titulo="Compromissos futuros" voltarPara="/mais" />
      <div className="mx-auto max-w-2xl space-y-3 px-4 pb-6 pt-4">
        <p className="text-sm text-suave">
          Parcelas do cartão e contas fixas que ainda vão cair, ciclo a ciclo, comparadas com a renda prevista (a do
          planejamento ou, sem ele, as receitas fixas).
        </p>
        {lista.map(({ ciclo, itens, despesas, receitas }, i) => {
          const plano = planos?.find((p) => dataNoCiclo(p.inicio, ciclo))
          const renda = plano?.rendaPrevista || receitas
          const pct = porcentagem(despesas, renda)
          const aberto = abertos.has(ciclo.inicio)
          return (
            <Cartao key={ciclo.inicio} className="overflow-hidden">
              <button
                type="button"
                onClick={() => alternar(ciclo.inicio)}
                aria-expanded={aberto}
                className="block w-full space-y-2 p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{i === 0 ? 'Resto deste ciclo' : rotuloCiclo(ciclo)}</span>
                    {i === 0 && <span className="block text-xs text-suave">até {dataCurta(ciclo.fim)}</span>}
                  </span>
                  <span className="text-right">
                    <span className="block font-bold">{formatarReais(despesas)}</span>
                    <span className="block text-xs text-suave">comprometido</span>
                  </span>
                  <ChevronDown className={clsx('size-5 text-suave transition', aberto && 'rotate-180')} />
                </div>
                {renda > 0 ? (
                  <>
                    <BarraProgresso porcentagem={pct} faixa={faixaDeUso(despesas, renda)} />
                    <p className="text-xs text-suave">
                      {pct}% da renda prevista de {formatarReais(renda)} · sobra {formatarReais(renda - despesas)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-suave">Sem renda prevista para comparar.</p>
                )}
              </button>
              {aberto && (
                <div className="divide-y divide-borda border-t border-borda">
                  {itens.length ? (
                    itens.map((c) => {
                      const cat = refs.categorias.get(c.categoriaId)
                      return (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-2">
                          <IconeCategoria icone={cat?.icone ?? '❔'} cor={cat?.cor ?? '#868e96'} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-medium">{c.descricao || cat?.nome}</span>
                              <span
                                className={clsx(
                                  'shrink-0 rounded-md px-1.5 text-xs font-semibold',
                                  c.origem === 'parcela' ? 'bg-credito/12 text-credito' : 'bg-cartao-2 text-suave',
                                )}
                              >
                                {c.rotulo ?? (c.origem === 'fixa' ? 'fixa' : 'agendado')}
                              </span>
                            </span>
                            <span className="block text-xs text-suave">{dataCurta(c.data)}</span>
                          </span>
                          <span className={clsx('font-semibold', c.tipo === 'receita' && 'text-receita')}>
                            {c.tipo === 'receita' ? '+' : '−'}
                            {formatarReais(c.valor)}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-4">
                      <Vazio>Nada comprometido.</Vazio>
                    </div>
                  )}
                </div>
              )}
            </Cartao>
          )
        })}
      </div>
    </>
  )
}
