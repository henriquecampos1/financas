import clsx from 'clsx'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { EditorCategoria } from '@/components/EditorCategoria'
import { Botao, BotaoIcone, Cabecalho, Cartao, IconeCategoria, Segmentado, TituloSecao, Vazio } from '@/components/ui'
import { moverCategoria } from '@/db/categorias'
import type { Categoria, Tipo } from '@/db/tipos'
import { useCategorias } from '@/hooks/categorias'

type Edicao = { categoria?: Categoria } | null

function ListaCategorias({
  lista,
  reordenando,
  destaque,
  aoTocar,
  aoMover,
}: {
  lista: Categoria[]
  reordenando: boolean
  destaque: string | null
  aoTocar: (c: Categoria) => void
  aoMover: (c: Categoria, direcao: -1 | 1) => void
}) {
  return (
    <Cartao className="divide-y divide-borda overflow-hidden">
      {lista.map((c, i) => (
        <div key={c.id} className={clsx('flex items-center gap-1 pr-2', destaque === c.id && 'animar-destaque')}>
          <button
            type="button"
            onClick={() => aoTocar(c)}
            disabled={reordenando}
            className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 text-left disabled:opacity-100"
          >
            <IconeCategoria icone={c.icone} cor={c.cor} />
            <span className={clsx('min-w-0 flex-1 truncate font-medium', c.arquivada && 'text-suave')}>{c.nome}</span>
            {!reordenando && <ChevronRight className="size-5 text-suave" />}
          </button>
          {reordenando && (
            <>
              <BotaoIcone rotulo={`Subir ${c.nome}`} disabled={i === 0} onClick={() => aoMover(c, -1)}>
                <ArrowUp className="size-5" />
              </BotaoIcone>
              <BotaoIcone rotulo={`Descer ${c.nome}`} disabled={i === lista.length - 1} onClick={() => aoMover(c, 1)}>
                <ArrowDown className="size-5" />
              </BotaoIcone>
            </>
          )}
        </div>
      ))}
    </Cartao>
  )
}

export function Categorias() {
  const todas = useCategorias()
  const [tipo, setTipo] = useState<Tipo>('despesa')
  const [reordenando, setReordenando] = useState(false)
  const [verArquivadas, setVerArquivadas] = useState(false)
  const [edicao, setEdicao] = useState<Edicao>(null)
  const [destaque, setDestaque] = useState<string | null>(null)

  const doTipo = (todas ?? []).filter((c) => c.tipo === tipo)
  const ativas = doTipo.filter((c) => !c.arquivada)
  const arquivadas = doTipo.filter((c) => c.arquivada)

  function mover(c: Categoria, direcao: -1 | 1) {
    setDestaque(null)
    void moverCategoria(c.id, direcao).then(() => setDestaque(c.id))
  }

  return (
    <>
      <Cabecalho
        titulo="Categorias"
        voltarPara="/mais"
        acoes={
          <Botao variante="fantasma" className="-mr-3" onClick={() => setReordenando((r) => !r)}>
            {reordenando ? 'Concluir' : 'Reordenar'}
          </Botao>
        }
      >
        <Segmentado
          rotulo="Tipo de categoria"
          valor={tipo}
          aoMudar={setTipo}
          opcoes={[
            { valor: 'despesa', texto: 'Despesas' },
            { valor: 'receita', texto: 'Receitas' },
          ]}
        />
      </Cabecalho>

      <div className="mx-auto max-w-2xl px-4 pt-4">
        {!reordenando && (
          <p className="mb-3 text-sm text-suave">
            Crie categorias para separar o que quiser acompanhar (ex.: Esportes, ou Gasolina e Uber/Estacionamento no
            lugar de Transporte). Cada uma pode ter seu limite no planejamento.
          </p>
        )}
        {todas && !ativas.length ? (
          <Vazio>Nenhuma categoria ativa deste tipo.</Vazio>
        ) : (
          <ListaCategorias
            lista={ativas}
            reordenando={reordenando}
            destaque={destaque}
            aoTocar={(categoria) => setEdicao({ categoria })}
            aoMover={mover}
          />
        )}

        {!reordenando && (
          <Botao variante="secundario" className="mt-4 w-full" onClick={() => setEdicao({})}>
            <Plus className="size-5" /> Nova categoria
          </Botao>
        )}

        {arquivadas.length > 0 && (
          <>
            <TituloSecao
              extra={
                <Botao variante="fantasma" className="min-h-10 px-2 text-sm" onClick={() => setVerArquivadas((v) => !v)}>
                  {verArquivadas ? 'Esconder' : 'Mostrar'}
                  <ChevronDown className={clsx('size-4 transition', verArquivadas && 'rotate-180')} />
                </Botao>
              }
            >
              Arquivadas ({arquivadas.length})
            </TituloSecao>
            {verArquivadas && (
              <ListaCategorias
                lista={arquivadas}
                reordenando={reordenando}
                destaque={destaque}
                aoTocar={(categoria) => setEdicao({ categoria })}
                aoMover={mover}
              />
            )}
          </>
        )}

        <p className="mt-6 text-center text-xs text-suave">
          Toque numa categoria para mudar nome, emoji e cor, arquivar ou excluir.
        </p>
      </div>

      {edicao && <EditorCategoria categoria={edicao.categoria} tipoNova={tipo} aoFechar={() => setEdicao(null)} />}
    </>
  )
}
