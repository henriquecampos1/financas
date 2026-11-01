// Formulário rápido de lançamento: crédito (com parcelas) ou Pix/transferência/débito/dinheiro.
import clsx from 'clsx'
import { Check, Copy, Plus, Trash } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { excluirLancamento, salvarLancamento } from '@/db/lancamentos'
import { repetirTodoMes } from '@/db/recorrencias'
import type { Lancamento, Metodo } from '@/db/tipos'
import { useCategorias } from '@/hooks/categorias'
import { useCartoes, useContas, useTags } from '@/hooks/dados'
import { dataCurta } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'
import { faturaDaData, rotuloFatura } from '@/utils/fatura'
import { dividirEmParcelas, lerTags, MAX_PARCELAS, type DadosLancamento } from '@/utils/parcelas'
import { lembrar } from '@/utils/teclado'
import { CampoValor } from './CampoValor'
import { EditorCategoria } from './EditorCategoria'
import { EditorCartao, EditorConta } from './EditoresConta'
import { AreaTexto, Botao, Campo, Entrada, Folha, IconeCategoria, Segmentado, Selecao, useFolha } from './ui'

export type Area = 'credito' | 'conta'

export const NOMES_METODO: Record<Metodo, string> = {
  credito: 'Crédito',
  pix: 'Pix',
  transferencia: 'Transferência',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
}

const METODOS_CONTA: { valor: Exclude<Metodo, 'credito'>; texto: string }[] = [
  { valor: 'pix', texto: 'Pix' },
  { valor: 'transferencia', texto: 'Transf.' },
  { valor: 'debito', texto: 'Débito' },
  { valor: 'dinheiro', texto: 'Dinheiro' },
]

/** Botões de escolha com bolinha de cor (cartões e contas). */
function Escolhas({
  opcoes,
  valor,
  aoMudar,
  rotulo,
  extra,
}: {
  opcoes: { id: string; nome: string; cor: string }[]
  valor?: string
  aoMudar: (id: string) => void
  rotulo: string
  extra?: ReactNode
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = o.id === valor
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aoMudar(o.id)}
            className={clsx(
              'tocavel inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-medium',
              ativo ? 'bg-primaria/12 text-texto ring-2 ring-primaria' : 'bg-cartao shadow-cartao',
            )}
          >
            <span className="size-3 rounded-full" style={{ backgroundColor: o.cor }} aria-hidden />
            {o.nome}
          </button>
        )
      })}
      {extra}
    </div>
  )
}

export function EditorLancamento({
  area,
  inicial,
  original,
  aoFechar,
  aoDuplicar,
}: {
  area: Area
  inicial: DadosLancamento
  /** Lançamento sendo editado (ausente = novo). */
  original?: Lancamento
  aoFechar: () => void
  aoDuplicar: (dados: DadosLancamento) => void
}) {
  const controle = useFolha(aoFechar)
  const categorias = useCategorias()
  const cartoes = useCartoes()
  const contas = useContas()
  const tagsUsadas = useTags()
  const [dados, setDados] = useState(inicial)
  const [textoTags, setTextoTags] = useState(inicial.tags.map((t) => `#${t}`).join(' '))
  const [erro, setErro] = useState('')
  const [criando, setCriando] = useState<'cartao' | 'conta' | 'categoria' | null>(null)
  const campoValor = useRef<HTMLInputElement>(null)

  const credito = area === 'credito'
  const mudar = (parcial: Partial<DadosLancamento>) => {
    setDados((d) => ({ ...d, ...parcial }))
    setErro('')
  }

  // Abre já com o cursor no valor (o teclado vem junto no iPhone; ver prepararTeclado).
  useEffect(() => {
    if (!original) campoValor.current?.focus({ preventScroll: true })
  }, [original])

  const categoriasDoTipo = (categorias ?? []).filter(
    (c) => c.tipo === dados.tipo && (!c.arquivada || c.id === dados.categoriaId),
  )
  const cartoesAtivos = (cartoes ?? []).filter((c) => !c.arquivado || c.id === dados.cartaoId)
  const contasAtivas = (contas ?? []).filter((c) => !c.arquivada || c.id === dados.contaId)
  const cartao = cartoes?.find((c) => c.id === dados.cartaoId)

  // Sem cartão/conta lembrado (ou se ele foi arquivado/excluído), já escolhe o primeiro da lista.
  const primeiroCartao = cartoesAtivos.find((c) => !c.arquivado)?.id
  const primeiraConta = contasAtivas.find((c) => !c.arquivada)?.id
  useEffect(() => {
    setDados((d) => {
      const cartaoOk = !cartoes || cartoes.some((c) => c.id === d.cartaoId && !c.arquivado)
      const contaOk = !contas || contas.some((c) => c.id === d.contaId && !c.arquivada)
      if (original || (cartaoOk && contaOk)) return d
      return {
        ...d,
        cartaoId: cartaoOk ? d.cartaoId : primeiroCartao,
        contaId: contaOk ? d.contaId : primeiraConta,
      }
    })
  }, [cartoes, contas, primeiroCartao, primeiraConta, original])
  const tagsAtuais = lerTags(textoTags)
  const sugestoes = (tagsUsadas ?? []).filter((t) => !tagsAtuais.includes(t)).slice(0, 8)
  const parcelas = credito ? dados.parcelas : 1
  const valoresParcelas = dividirEmParcelas(dados.valor, parcelas)
  // "Repetir todo mês" só ao criar, e não faz sentido junto com parcelas.
  const podeRepetir = !original && parcelas === 1
  const [repetir, setRepetir] = useState(false)

  async function salvar() {
    if (dados.valor <= 0) return setErro('Digite o valor.')
    if (!dados.categoriaId || !categoriasDoTipo.some((c) => c.id === dados.categoriaId))
      return setErro('Escolha uma categoria.')
    if (credito && !dados.cartaoId) return setErro('Escolha o cartão.')
    if (!credito && !dados.contaId) return setErro('Escolha a conta.')
    if (!dados.dataCompra) return setErro('Escolha a data.')
    const gravados = await salvarLancamento({ ...dados, tags: tagsAtuais }, original)
    if (podeRepetir && repetir) await repetirTodoMes(gravados[0])
    if (credito) lembrar('ultimoCartao', dados.cartaoId)
    else {
      lembrar('ultimaConta', dados.contaId)
      // A forma de uma receita (ex.: transferência do salário) não vira o padrão dos gastos.
      if (dados.tipo === 'despesa') lembrar('ultimoMetodo', dados.metodo)
    }
    controle.fechar()
  }

  async function excluir() {
    if (!original) return
    const texto = original.parcela
      ? `Excluir a compra "${original.descricao || 'sem descrição'}" inteira (${original.parcela.total} parcelas)?`
      : 'Excluir este lançamento?'
    if (!window.confirm(texto)) return
    await excluirLancamento(original)
    controle.fechar()
  }

  let titulo: string
  if (original) titulo = 'Editar lançamento'
  else if (credito) titulo = 'Compra no crédito'
  else titulo = dados.tipo === 'receita' ? 'Nova receita' : 'Nova despesa'

  return (
    <>
      <Folha
        controle={controle}
        titulo={titulo}
        rodape={
          <>
            {erro && (
              <p role="alert" className="text-center text-sm font-semibold text-perigo">
                {erro}
              </p>
            )}
            <Botao variante={credito ? 'credito' : 'primario'} className="w-full" onClick={() => void salvar()}>
              <Check className="size-5" /> Salvar
            </Botao>
          </>
        }
      >
        <div className="space-y-5">
          {!credito && (
            <Segmentado
              rotulo="Tipo"
              valor={dados.tipo}
              aoMudar={(tipo) => mudar({ tipo, categoriaId: '' })}
              opcoes={[
                { valor: 'despesa', texto: 'Despesa (saída)' },
                { valor: 'receita', texto: 'Receita (entrada)' },
              ]}
            />
          )}

          <div>
            <CampoValor
              ref={campoValor}
              tamanho="grande"
              valor={dados.valor}
              aoMudar={(valor) => mudar({ valor })}
              aria-label={credito && parcelas > 1 ? 'Valor total da compra' : 'Valor'}
              enterKeyHint="next"
            />
            {credito && parcelas > 1 && dados.valor > 0 && (
              <p className="mt-1 text-sm text-suave">
                Total em {parcelas}x de {formatarReais(valoresParcelas[1])}
                {valoresParcelas[0] !== valoresParcelas[1] && ` (1ª de ${formatarReais(valoresParcelas[0])})`}
              </p>
            )}
          </div>

          <Campo rotulo="Descrição">
            <Entrada
              value={dados.descricao}
              maxLength={60}
              placeholder={credito ? 'Ex.: Farmácia, Uber, Notebook' : 'Ex.: Aluguel, Salário, Feira'}
              enterKeyHint="done"
              autoCapitalize="sentences"
              onChange={(e) => mudar({ descricao: e.target.value })}
            />
          </Campo>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-suave">Categoria</legend>
            <div className="grid grid-cols-4 gap-2">
              {categoriasDoTipo.map((c) => {
                const ativo = c.id === dados.categoriaId
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={c.nome}
                    aria-pressed={ativo}
                    onClick={() => mudar({ categoriaId: c.id })}
                    className={clsx(
                      'tocavel flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-[20px] px-1 py-2',
                      ativo ? 'bg-primaria/10 ring-2 ring-primaria' : 'bg-cartao shadow-cartao',
                    )}
                  >
                    <IconeCategoria icone={c.icone} cor={c.cor} />
                    <span className="w-full truncate text-center text-xs font-medium">{c.nome}</span>
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setCriando('categoria')}
                className="tocavel flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-[20px] border border-dashed border-borda px-1 py-2 text-primaria"
              >
                <span className="flex size-11 items-center justify-center rounded-[14px] bg-primaria/12">
                  <Plus className="size-5" />
                </span>
                <span className="text-xs font-semibold">Nova</span>
              </button>
            </div>
          </fieldset>

          {credito ? (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-suave">Cartão</legend>
                {cartoesAtivos.length ? (
                  <Escolhas
                    rotulo="Cartão"
                    opcoes={cartoesAtivos}
                    valor={dados.cartaoId}
                    aoMudar={(cartaoId) => mudar({ cartaoId })}
                    extra={
                      <Botao variante="fantasma" className="min-h-11 px-3" onClick={() => setCriando('cartao')}>
                        <Plus className="size-4" /> Novo
                      </Botao>
                    }
                  />
                ) : (
                  <Botao variante="secundario" className="w-full" onClick={() => setCriando('cartao')}>
                    <Plus className="size-5" /> Cadastrar meu primeiro cartão
                  </Botao>
                )}
              </fieldset>

              <Campo rotulo="Parcelas">
                <Selecao value={dados.parcelas} onChange={(e) => mudar({ parcelas: Number(e.target.value) })}>
                  {Array.from({ length: MAX_PARCELAS }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n === 1
                        ? 'À vista (1x)'
                        : `${n}x${dados.valor ? ` de ${formatarReais(dividirEmParcelas(dados.valor, n)[1])}` : ''}`}
                    </option>
                  ))}
                </Selecao>
              </Campo>
            </>
          ) : (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-suave">Forma</legend>
                <Segmentado
                  rotulo="Forma de pagamento"
                  valor={dados.metodo as Exclude<Metodo, 'credito'>}
                  aoMudar={(metodo) => mudar({ metodo })}
                  opcoes={METODOS_CONTA}
                />
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-suave">Conta</legend>
                {contasAtivas.length ? (
                  <Escolhas
                    rotulo="Conta"
                    opcoes={contasAtivas}
                    valor={dados.contaId}
                    aoMudar={(contaId) => mudar({ contaId })}
                    extra={
                      <Botao variante="fantasma" className="min-h-11 px-3" onClick={() => setCriando('conta')}>
                        <Plus className="size-4" /> Nova
                      </Botao>
                    }
                  />
                ) : (
                  <Botao variante="secundario" className="w-full" onClick={() => setCriando('conta')}>
                    <Plus className="size-5" /> Cadastrar minha primeira conta
                  </Botao>
                )}
              </fieldset>
            </>
          )}

          <Campo
            rotulo={credito ? 'Data da compra' : 'Data'}
            dica={
              credito && cartao && dados.dataCompra
                ? (() => {
                    const f = faturaDaData(dados.dataCompra, cartao)
                    return `${parcelas > 1 ? '1ª parcela na fatura' : 'Entra na fatura'} de ${rotuloFatura(f)} (vence ${dataCurta(f.vencimento)}).`
                  })()
                : undefined
            }
          >
            <Entrada
              type="date"
              value={dados.dataCompra}
              onChange={(e) => e.target.value && mudar({ dataCompra: e.target.value })}
            />
          </Campo>

          {podeRepetir && (
            <label className="flex items-start gap-3 rounded-2xl bg-cartao p-4 shadow-cartao">
              <input
                type="checkbox"
                className="mt-0.5 size-5 accent-[var(--primaria)]"
                checked={repetir}
                onChange={(e) => setRepetir(e.target.checked)}
              />
              <span>
                <span className="block font-medium">Repetir todo mês</span>
                <span className="block text-sm text-suave">
                  {repetir && dados.dataCompra
                    ? `Lança sozinho todo dia ${Number(dados.dataCompra.slice(8, 10))}. Dá para mudar em Mais → Recorrências.`
                    : 'Para contas fixas: assinatura, aluguel, esporte, salário.'}
                </span>
              </span>
            </label>
          )}
          {original?.recorrenciaId && (
            <p className="rounded-xl bg-cartao-2 p-3 text-sm text-suave">
              Este lançamento veio de uma recorrência. Mudar aqui vale só para este mês; para os próximos, edite em
              Mais → Recorrências.
            </p>
          )}

          <Campo rotulo="Observação">
            <AreaTexto
              rows={2}
              value={dados.observacao}
              maxLength={300}
              placeholder="Opcional"
              onChange={(e) => mudar({ observacao: e.target.value })}
            />
          </Campo>

          <div>
            <Campo rotulo="Tags">
              <Entrada
                value={textoTags}
                placeholder="Ex.: #viagem-rio #trabalho"
                autoCapitalize="none"
                autoCorrect="off"
                onChange={(e) => setTextoTags(e.target.value)}
              />
            </Campo>
            {sugestoes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {sugestoes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTextoTags((txt) => `${txt.trim()} #${t} `.trimStart())}
                    className="min-h-9 rounded-full bg-cartao-2 px-3 text-sm font-medium text-suave"
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {original && (
            <div className="grid grid-cols-2 gap-2 border-t border-borda pt-4">
              <Botao variante="secundario" onClick={() => aoDuplicar({ ...dados, tags: tagsAtuais })}>
                <Copy className="size-5" /> Duplicar
              </Botao>
              <Botao variante="perigo" onClick={() => void excluir()}>
                <Trash className="size-5" /> Excluir
              </Botao>
            </div>
          )}
        </div>
      </Folha>

      {criando === 'cartao' && (
        <EditorCartao aoFechar={() => setCriando(null)} aoCriar={(cartaoId) => mudar({ cartaoId })} />
      )}
      {criando === 'conta' && (
        <EditorConta aoFechar={() => setCriando(null)} aoCriar={(contaId) => mudar({ contaId })} />
      )}
      {criando === 'categoria' && (
        <EditorCategoria
          tipoNova={dados.tipo}
          aoFechar={() => setCriando(null)}
          aoCriar={(categoriaId) => mudar({ categoriaId })}
        />
      )}
    </>
  )
}
