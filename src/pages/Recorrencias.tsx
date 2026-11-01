// Mais → Recorrências: despesas e receitas fixas.
import clsx from 'clsx'
import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { NOMES_METODO } from '@/components/EditorLancamento'
import { EditorRecorrencia } from '@/components/EditorRecorrencia'
import { useReferencias } from '@/components/ListaLancamentos'
import { Botao, Cabecalho, Cartao, IconeCategoria, TituloSecao, Vazio } from '@/components/ui'
import type { Recorrencia, Tipo } from '@/db/tipos'
import { useRecorrencias } from '@/hooks/recorrencias'
import { formatarReais } from '@/utils/dinheiro'

type Edicao = { recorrencia?: Recorrencia } | null

export function Recorrencias() {
  const recorrencias = useRecorrencias()
  const refs = useReferencias()
  const [edicao, setEdicao] = useState<Edicao>(null)

  const doTipo = (tipo: Tipo) =>
    (recorrencias ?? []).filter((r) => r.tipo === tipo).sort((a, b) => a.dia - b.dia)
  const totalAtivo = (tipo: Tipo) => doTipo(tipo).filter((r) => r.ativa).reduce((s, r) => s + r.valor, 0)

  function secao(tipo: Tipo) {
    const lista = doTipo(tipo)
    if (!lista.length || !refs) return null
    return (
      <>
        <TituloSecao extra={<span className="text-sm font-semibold">{formatarReais(totalAtivo(tipo))}/mês</span>}>
          {tipo === 'despesa' ? 'Despesas fixas' : 'Receitas fixas'}
        </TituloSecao>
        <Cartao className="divide-y divide-borda overflow-hidden">
          {lista.map((r) => {
            const c = refs.categorias.get(r.categoriaId)
            const onde = r.metodo === 'credito' ? refs.cartoes.get(r.cartaoId ?? '')?.nome : refs.contas.get(r.contaId ?? '')?.nome
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setEdicao({ recorrencia: r })}
                className={clsx('flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left active:bg-cartao-2', !r.ativa && 'opacity-60')}
              >
                <IconeCategoria icone={c?.icone ?? '❔'} cor={c?.cor ?? '#868e96'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.descricao}</span>
                  <span className="block truncate text-sm text-suave">
                    Todo dia {r.dia} · {NOMES_METODO[r.metodo]}
                    {onde ? ` · ${onde}` : ''}
                  </span>
                  {(r.confirmarAntes || !r.ativa) && (
                    <span className="mt-0.5 inline-block rounded-full bg-cartao-2 px-2 text-xs font-medium text-suave">
                      {!r.ativa ? 'Pausada' : 'Confirma antes'}
                    </span>
                  )}
                </span>
                <span className={clsx('font-semibold', tipo === 'receita' && 'text-receita')}>{formatarReais(r.valor)}</span>
                <ChevronRight className="size-5 text-suave" />
              </button>
            )
          })}
        </Cartao>
      </>
    )
  }

  return (
    <>
      <Cabecalho titulo="Recorrências" voltarPara="/mais" />
      <div className="mx-auto max-w-2xl px-4 pb-6 pt-4">
        <p className="text-sm text-suave">
          Contas que se repetem todo mês (assinaturas, aluguel, esporte, salário). O app lança sozinho no dia — ou
          pergunta antes, se você marcar "Confirmar antes de lançar".
        </p>
        {secao('despesa')}
        {secao('receita')}
        {recorrencias && !recorrencias.length && (
          <div className="mt-4">
            <Vazio>Nenhuma recorrência ainda. Dica: ao lançar um gasto, marque "Repetir todo mês".</Vazio>
          </div>
        )}
        <Botao variante="secundario" className="mt-4 w-full" onClick={() => setEdicao({})}>
          <Plus className="size-5" /> Nova recorrência
        </Botao>
      </div>
      {edicao && <EditorRecorrencia recorrencia={edicao.recorrencia} aoFechar={() => setEdicao(null)} />}
    </>
  )
}
