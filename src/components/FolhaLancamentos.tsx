// Painel com uma lista de lançamentos (ao tocar numa categoria do plano ou numa fatia de gráfico).
import type { ItemCompetencia } from '@/utils/competencia'
import { formatarReais } from '@/utils/dinheiro'
import { ListaPorDia, useReferencias } from './ListaLancamentos'
import { Folha, Vazio, useFolha } from './ui'

export function FolhaLancamentos({
  titulo,
  itens,
  aoFechar,
}: {
  titulo: string
  itens: ItemCompetencia[]
  aoFechar: () => void
}) {
  const controle = useFolha(aoFechar)
  const refs = useReferencias()
  const total = itens.reduce((s, i) => s + (i.lancamento.tipo === 'despesa' ? i.valor : -i.valor), 0)
  return (
    <Folha controle={controle} titulo={titulo}>
      {refs &&
        (itens.length ? (
          <>
            <p className="mb-3 text-sm text-suave">
              {itens.length} lançamento{itens.length === 1 ? '' : 's'} · total{' '}
              <strong className="text-texto">{formatarReais(total)}</strong>
            </p>
            <ListaPorDia itens={itens} refs={refs} />
          </>
        ) : (
          <Vazio>Nenhum lançamento.</Vazio>
        ))}
    </Folha>
  )
}
