// Criar ou editar uma categoria: nome, emoji, cor; arquivar; excluir (ou mover os lançamentos).
import clsx from 'clsx'
import { Archive, ArchiveArrowUp, Check, Trash } from 'lucide-react'
import { useState } from 'react'
import {
  arquivarCategoria,
  contarUsos,
  criarCategoria,
  editarCategoria,
  excluirCategoria,
} from '@/db/categorias'
import { EMOJIS_SUGERIDOS, PALETA } from '@/db/padroes'
import type { Categoria, Tipo } from '@/db/tipos'
import { useCategorias } from '@/hooks/categorias'
import { Botao, Campo, Entrada, Folha, IconeCategoria, Selecao, useFolha } from './ui'

/** Primeiro "caractere visível" do texto (um emoji pode ter vários códigos). */
function primeiroEmoji(texto: string): string {
  const segmentos = new Intl.Segmenter('pt', { granularity: 'grapheme' }).segment(texto.trim())
  for (const { segment } of segmentos) return segment
  return ''
}

export function EditorCategoria({
  categoria,
  tipoNova,
  aoFechar,
  aoCriar,
}: {
  /** Categoria a editar; ausente = nova. */
  categoria?: Categoria
  tipoNova: Tipo
  aoFechar: () => void
  /** Chamado com o id da categoria recém-criada (ex.: para já deixá-la escolhida no lançamento). */
  aoCriar?: (id: string) => void
}) {
  const controle = useFolha(aoFechar)
  const todas = useCategorias()
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [icone, setIcone] = useState(categoria?.icone ?? '📦')
  const [cor, setCor] = useState(categoria?.cor ?? PALETA[0])
  const [emojiDigitado, setEmojiDigitado] = useState('')
  const [erro, setErro] = useState('')
  // Exclusão de categoria em uso: quantos lançamentos e para onde mover.
  const [emUso, setEmUso] = useState<number | null>(null)
  const [destino, setDestino] = useState('')

  const tipo = categoria?.tipo ?? tipoNova
  const outras = (todas ?? []).filter((c) => c.tipo === tipo && c.id !== categoria?.id && !c.arquivada)

  async function salvar() {
    if (!nome.trim()) {
      setErro('Dê um nome para a categoria.')
      return
    }
    if (categoria) await editarCategoria(categoria.id, { nome, icone, cor })
    else aoCriar?.(await criarCategoria({ nome, icone, cor, tipo }))
    controle.fechar()
  }

  async function alternarArquivo() {
    if (!categoria) return
    await arquivarCategoria(categoria.id, !categoria.arquivada)
    controle.fechar()
  }

  async function pedirExclusao() {
    if (!categoria) return
    const usos = await contarUsos(categoria.id)
    if (usos > 0) {
      setEmUso(usos)
      setDestino(outras[0]?.id ?? '')
      return
    }
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"?`)) return
    await excluirCategoria(categoria.id)
    controle.fechar()
  }

  async function moverEExcluir() {
    if (!categoria || !destino) return
    const nomeDestino = outras.find((c) => c.id === destino)?.nome
    if (!window.confirm(`Mover ${emUso} lançamento(s) para "${nomeDestino}" e excluir "${categoria.nome}"?`)) return
    await excluirCategoria(categoria.id, destino)
    controle.fechar()
  }

  return (
    <Folha
      controle={controle}
      titulo={categoria ? 'Editar categoria' : tipo === 'despesa' ? 'Nova categoria de despesa' : 'Nova categoria de receita'}
      rodape={
        emUso === null && (
          <Botao className="w-full" onClick={() => void salvar()}>
            <Check className="size-5" /> Salvar
          </Botao>
        )
      }
    >
      {emUso !== null && categoria ? (
        <div className="space-y-4">
          <p>
            <strong>{categoria.nome}</strong> tem {emUso} lançamento{emUso > 1 ? 's' : ''} e não pode ser excluída
            direto. Escolha uma opção:
          </p>
          <div className="space-y-2 rounded-3xl bg-cartao p-4 shadow-cartao">
            <p className="font-semibold">Arquivar</p>
            <p className="text-sm text-suave">
              Some das listas para novos lançamentos, mas o histórico continua com ela.
            </p>
            <Botao variante="secundario" className="w-full" onClick={() => void alternarArquivo()}>
              <Archive className="size-5" /> Arquivar
            </Botao>
          </div>
          <div className="space-y-2 rounded-3xl bg-cartao p-4 shadow-cartao">
            <p className="font-semibold">Mover os lançamentos e excluir</p>
            {outras.length ? (
              <>
                <Campo rotulo="Mover para">
                  <Selecao value={destino} onChange={(e) => setDestino(e.target.value)}>
                    {outras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icone} {c.nome}
                      </option>
                    ))}
                  </Selecao>
                </Campo>
                <Botao variante="perigo" className="w-full" onClick={() => void moverEExcluir()}>
                  <Trash className="size-5" /> Mover e excluir
                </Botao>
              </>
            ) : (
              <p className="text-sm text-suave">Não há outra categoria deste tipo para receber os lançamentos.</p>
            )}
          </div>
          <Botao variante="fantasma" className="w-full" onClick={() => setEmUso(null)}>
            Voltar
          </Botao>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <IconeCategoria icone={icone} cor={cor} tamanho="lg" />
            <div className="min-w-0 flex-1">
              <Campo rotulo="Nome">
                <Entrada
                  value={nome}
                  autoFocus={!categoria}
                  maxLength={40}
                  placeholder="Ex.: Pets"
                  enterKeyHint="done"
                  onChange={(e) => {
                    setNome(e.target.value)
                    setErro('')
                  }}
                />
              </Campo>
            </div>
          </div>
          {erro && <p className="text-sm font-medium text-perigo">{erro}</p>}

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-suave">Ícone</legend>
            <div className="grid grid-cols-8 gap-1">
              {EMOJIS_SUGERIDOS.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Ícone ${e}`}
                  aria-pressed={icone === e}
                  onClick={() => setIcone(e)}
                  className={clsx(
                    'flex aspect-square items-center justify-center rounded-xl text-2xl transition',
                    icone === e ? 'bg-primaria/15 ring-2 ring-primaria' : 'active:bg-cartao-2',
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <Entrada
                value={emojiDigitado}
                placeholder="Ou digite outro emoji aqui"
                aria-label="Outro emoji"
                onChange={(e) => {
                  setEmojiDigitado(e.target.value)
                  const emoji = primeiroEmoji(e.target.value)
                  if (emoji) setIcone(emoji)
                }}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-suave">Cor</legend>
            <div className="grid grid-cols-6 gap-2">
              {PALETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  aria-pressed={cor === c}
                  onClick={() => setCor(c)}
                  className="flex aspect-square items-center justify-center rounded-full transition active:scale-95"
                  style={{ backgroundColor: c }}
                >
                  {cor === c && <Check className="size-6 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </fieldset>

          {categoria && (
            <div className="grid grid-cols-2 gap-2 border-t border-borda pt-4">
              <Botao variante="secundario" onClick={() => void alternarArquivo()}>
                {categoria.arquivada ? (
                  <>
                    <ArchiveArrowUp className="size-5" /> Desarquivar
                  </>
                ) : (
                  <>
                    <Archive className="size-5" /> Arquivar
                  </>
                )}
              </Botao>
              <Botao variante="perigo" onClick={() => void pedirExclusao()}>
                <Trash className="size-5" /> Excluir
              </Botao>
            </div>
          )}
        </div>
      )}
    </Folha>
  )
}
