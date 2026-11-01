// Início: recorrências "confirmar antes" que já chegaram — lançar ou pular com um toque.
import { Repeat } from 'lucide-react'
import { lancarOcorrencia, pularOcorrencia } from '@/db/recorrencias'
import { usePendentes } from '@/hooks/recorrencias'
import { dataCurta } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'
import { useReferencias } from './ListaLancamentos'
import { Botao, Cartao, IconeCategoria, TituloSecao } from './ui'

export function PendentesRecorrencia() {
  const pendentes = usePendentes()
  const refs = useReferencias()
  if (!pendentes?.length || !refs) return null
  return (
    <>
      <TituloSecao>
        <span className="inline-flex items-center gap-1.5">
          <Repeat className="size-4" /> Para confirmar ({pendentes.length})
        </span>
      </TituloSecao>
      <Cartao className="divide-y divide-borda overflow-hidden">
        {pendentes.map(({ recorrencia: r, ocorrencia: o }) => {
          const c = refs.categorias.get(r.categoriaId)
          return (
            <div key={`${r.id}-${o.mes}`} className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-3">
                <IconeCategoria icone={c?.icone ?? '❔'} cor={c?.cor ?? '#868e96'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.descricao}</span>
                  <span className="block text-sm text-suave">{dataCurta(o.data)}</span>
                </span>
                <span className={r.tipo === 'receita' ? 'font-semibold text-receita' : 'font-semibold'}>
                  {formatarReais(r.valor)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Botao variante="secundario" className="min-h-10" onClick={() => void pularOcorrencia(r.id, o.mes)}>
                  Pular este mês
                </Botao>
                <Botao className="min-h-10" onClick={() => void lancarOcorrencia(r, o)}>
                  Lançar
                </Botao>
              </div>
            </div>
          )
        })}
      </Cartao>
      <p className="mt-1 px-1 text-xs text-suave">Se o valor mudou, lance e depois toque no lançamento para corrigir.</p>
    </>
  )
}
