// Aba "Plano": planejamento do ciclo com barras de progresso por categoria.
import clsx from 'clsx'
import { CopyPlus, Pencil, Target } from 'lucide-react'
import { useState } from 'react'
import { AnelProgresso, BarraProgresso, COR_TEXTO, LinhaCategoriaPlano } from '@/components/BarrasPlano'
import { EditorPlano } from '@/components/EditorPlano'
import { FolhaLancamentos } from '@/components/FolhaLancamentos'
import { useReferencias } from '@/components/ListaLancamentos'
import { SeletorCiclo } from '@/components/SeletorCiclo'
import { Botao, BotaoIcone, Cabecalho, Cartao, IconeCategoria, TituloSecao, Vazio } from '@/components/ui'
import { copiarPlanoAnterior } from '@/db/planos'
import { useCiclo } from '@/hooks/ciclo'
import { usePlanoAnterior, useResumoPlano } from '@/hooks/plano'
import { diasNoCiclo, rotuloCiclo } from '@/utils/ciclo'
import { dataCurta } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'
import type { ResumoPlano } from '@/utils/planejamento'

function ResumoGeral({ resumo }: { resumo: ResumoPlano }) {
  const { ciclo, ehAtual, deslocamento } = useCiclo()
  const total = diasNoCiclo(ciclo)
  // Marca na barra: quanto do ciclo já passou (o "ritmo ideal").
  const marca = ehAtual ? Math.round(((total - resumo.diasRestantes + 1) / total) * 100) : undefined
  const excedido = resumo.disponivel < 0

  return (
    <Cartao className="space-y-5 p-5">
      <div className="flex items-center gap-5">
        <AnelProgresso porcentagem={resumo.porcentagem} faixa={resumo.faixa} tamanho={92} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-suave">{excedido ? 'Passou do planejado' : 'Ainda disponível'}</p>
          <p className={clsx('text-[28px] font-bold leading-tight tracking-tight', excedido && 'text-perigo')}>
            {formatarReais(Math.abs(resumo.disponivel))}
          </p>
          <p className="numeros text-[13px] text-suave">
            {formatarReais(resumo.gasto)} gastos de {formatarReais(resumo.planejado)}
          </p>
        </div>
      </div>
      <div>
        <BarraProgresso porcentagem={resumo.porcentagem} faixa={resumo.faixa} grossa marca={marca} />
        <div className="mt-1.5 flex justify-between text-xs text-suave">
          <span className={clsx('font-semibold', COR_TEXTO[resumo.faixa])}>{resumo.porcentagem}% usado</span>
          {marca !== undefined && <span>{marca}% do ciclo já passou</span>}
        </div>
      </div>
      {resumo.gastoSemLimite > 0 && (
        <p className="text-xs text-suave">
          O gasto inclui {formatarReais(resumo.gastoSemLimite)} em categorias sem limite.
        </p>
      )}
      <div className={clsx('rounded-2xl p-4', ehAtual && resumo.porDia > 0 ? 'bg-primaria/10' : 'bg-cartao-2')}>
        {ehAtual ? (
          resumo.porDia > 0 ? (
            <>
              <p className="text-[13px] text-suave">
                Faltam {resumo.diasRestantes} dia{resumo.diasRestantes === 1 ? '' : 's'}. Você pode gastar
              </p>
              <p className="text-[24px] font-bold tracking-tight text-primaria">{formatarReais(resumo.porDia)} por dia</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-perigo">
              O planejado acabou. Faltam {resumo.diasRestantes} dia{resumo.diasRestantes === 1 ? '' : 's'} no ciclo.
            </p>
          )
        ) : deslocamento < 0 ? (
          <p className="text-sm text-suave">Ciclo encerrado em {dataCurta(ciclo.fim)}.</p>
        ) : (
          <p className="text-sm text-suave">
            Ciclo começa em {dataCurta(ciclo.inicio)}: {formatarReais(Math.max(0, resumo.disponivel))} disponíveis
            para {total} dias.
          </p>
        )}
      </div>
    </Cartao>
  )
}

function RendaEMeta({ renda, meta, resumo }: { renda: number; meta: number; resumo: ResumoPlano }) {
  if (!renda && !meta) return null
  const guardado = resumo.sobra
  return (
    <Cartao className="grid grid-cols-2 gap-3 p-4 text-sm">
      <div>
        <p className="text-suave">Renda prevista</p>
        <p className="font-semibold">{formatarReais(renda)}</p>
        <p className="text-xs text-suave">Recebido: {formatarReais(resumo.receitas)}</p>
      </div>
      <div>
        <p className="text-suave">Meta de economia</p>
        <p className="font-semibold">{formatarReais(meta)}</p>
        <p className={clsx('text-xs', guardado >= meta ? 'text-sucesso' : 'text-suave')}>
          Sobra até agora: {formatarReais(guardado)}
        </p>
      </div>
      {renda > 0 && resumo.planejado > renda - meta && (
        <p className="col-span-2 rounded-lg bg-alerta/10 px-2 py-1.5 text-xs font-medium text-alerta">
          O planejado passa {formatarReais(resumo.planejado - (renda - meta))} do que sobra depois da meta.
        </p>
      )}
    </Cartao>
  )
}

export function Plano() {
  const { ciclo } = useCiclo()
  const dados = useResumoPlano(ciclo)
  const anterior = usePlanoAnterior(ciclo)
  const refs = useReferencias()
  const [editando, setEditando] = useState(false)
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null)

  return (
    <>
      <Cabecalho
        titulo="Planejamento"
        acoes={
          dados?.plano && (
            <BotaoIcone rotulo="Editar planejamento" onClick={() => setEditando(true)}>
              <Pencil className="size-5" />
            </BotaoIcone>
          )
        }
      >
        <SeletorCiclo />
      </Cabecalho>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {dados && !dados.plano && (
          <Cartao className="flex flex-col items-center gap-3 p-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primaria/12 text-primaria">
              <Target className="size-7" />
            </span>
            <p className="text-lg font-bold">Nenhum planejamento para este ciclo</p>
            <p className="text-sm text-suave">
              Defina quanto quer gastar em cada categoria e acompanhe as barras enchendo a cada lançamento.
            </p>
            <Botao className="w-full" onClick={() => setEditando(true)}>
              Criar planejamento
            </Botao>
            {anterior && (
              <Botao variante="secundario" className="w-full" onClick={() => void copiarPlanoAnterior(ciclo)}>
                <CopyPlus className="size-5" /> Copiar do plano anterior
              </Botao>
            )}
            {anterior && <p className="text-xs text-suave">Plano anterior: {rotuloCiclo(anterior)}</p>}
          </Cartao>
        )}

        {dados?.plano && dados.resumo && refs && (
          <>
            <ResumoGeral resumo={dados.resumo} />
            <RendaEMeta renda={dados.plano.rendaPrevista} meta={dados.plano.metaEconomia} resumo={dados.resumo} />

            <TituloSecao>Por categoria</TituloSecao>
            {dados.resumo.linhas.length ? (
              <Cartao className="divide-y divide-borda overflow-hidden">
                {[...dados.resumo.linhas]
                  .sort((a, b) => (refs.categorias.get(a.categoriaId)?.ordem ?? 0) - (refs.categorias.get(b.categoriaId)?.ordem ?? 0))
                  .map((linha) => (
                    <LinhaCategoriaPlano
                      key={linha.categoriaId}
                      linha={linha}
                      categoria={refs.categorias.get(linha.categoriaId)}
                      aoTocar={() => setCategoriaAberta(linha.categoriaId)}
                    />
                  ))}
              </Cartao>
            ) : (
              <Vazio>Nenhum limite definido. Toque no lápis para editar.</Vazio>
            )}

            {dados.resumo.semLimite.length > 0 && (
              <>
                <TituloSecao>Gastos sem limite</TituloSecao>
                <Cartao className="divide-y divide-borda overflow-hidden">
                  {dados.resumo.semLimite.map(({ categoriaId, gasto }) => {
                    const c = refs.categorias.get(categoriaId)
                    return (
                      <button
                        key={categoriaId}
                        type="button"
                        onClick={() => setCategoriaAberta(categoriaId)}
                        className="flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-cartao-2"
                      >
                        <IconeCategoria icone={c?.icone ?? '❔'} cor={c?.cor ?? '#868e96'} />
                        <span className="min-w-0 flex-1 truncate font-medium">{c?.nome ?? 'Categoria excluída'}</span>
                        <span className="font-semibold">{formatarReais(gasto)}</span>
                      </button>
                    )
                  })}
                </Cartao>
              </>
            )}
            <p className="pb-2 text-center text-xs text-suave">
              Toque numa categoria para ver os lançamentos dela neste ciclo.
            </p>
          </>
        )}
      </div>

      {editando && dados && <EditorPlano ciclo={ciclo} plano={dados.plano} aoFechar={() => setEditando(false)} />}
      {categoriaAberta && dados && (
        <FolhaLancamentos
          titulo={(() => {
            const c = refs?.categorias.get(categoriaAberta)
            return c ? `${c.icone} ${c.nome}` : 'Lançamentos'
          })()}
          itens={dados.itens.filter(
            (i) => i.lancamento.categoriaId === categoriaAberta && i.lancamento.tipo === 'despesa',
          )}
          aoFechar={() => setCategoriaAberta(null)}
        />
      )}
    </>
  )
}
