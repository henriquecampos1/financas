// Criar e editar contas (Nubank, Itaú, Carteira...) e cartões de crédito.
import { Archive, ArchiveArrowUp, Check, Trash } from 'lucide-react'
import { useState } from 'react'
import {
  EmUsoError,
  criarCartao,
  criarConta,
  editarCartao,
  editarConta,
  excluirCartao,
  excluirConta,
  usosDaConta,
  usosDoCartao,
} from '@/db/contas'
import { PALETA } from '@/db/padroes'
import type { Cartao, Conta } from '@/db/tipos'
import { faturaDaData, rotuloFatura } from '@/utils/fatura'
import { dataCurta, hojeISO } from '@/utils/datas'
import { CampoValor } from './CampoValor'
import { Botao, Campo, Entrada, Folha, Selecao, useFolha } from './ui'

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1)

function SeletorCor({ cor, aoMudar }: { cor: string; aoMudar: (c: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-suave">Cor</legend>
      <div className="grid grid-cols-6 gap-2">
        {PALETA.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Cor ${c}`}
            aria-pressed={cor === c}
            onClick={() => aoMudar(c)}
            className="flex aspect-square items-center justify-center rounded-full transition active:scale-95"
            style={{ backgroundColor: c }}
          >
            {cor === c && <Check className="size-6 text-white" strokeWidth={3} />}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** Arquivar / excluir: só exclui se não tiver lançamentos. */
function AcoesArquivo({
  arquivado,
  aoArquivar,
  aoExcluir,
}: {
  arquivado: boolean
  aoArquivar: () => void
  aoExcluir: () => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 border-t border-borda pt-4">
      <Botao variante="secundario" onClick={aoArquivar}>
        {arquivado ? <ArchiveArrowUp className="size-5" /> : <Archive className="size-5" />}
        {arquivado ? 'Desarquivar' : 'Arquivar'}
      </Botao>
      <Botao variante="perigo" onClick={aoExcluir}>
        <Trash className="size-5" /> Excluir
      </Botao>
    </div>
  )
}

export function EditorConta({
  conta,
  aoFechar,
  aoCriar,
}: {
  conta?: Conta
  aoFechar: () => void
  aoCriar?: (id: string) => void
}) {
  const controle = useFolha(aoFechar)
  const [nome, setNome] = useState(conta?.nome ?? '')
  const [cor, setCor] = useState(conta?.cor ?? PALETA[7])
  const [saldoInicial, setSaldoInicial] = useState(conta?.saldoInicial ?? 0)
  const [erro, setErro] = useState('')

  async function salvar() {
    if (!nome.trim()) return setErro('Dê um nome para a conta (ex.: Nubank, Itaú, Carteira).')
    if (conta) await editarConta(conta.id, { nome, cor, saldoInicial })
    else aoCriar?.(await criarConta({ nome, cor, saldoInicial }))
    controle.fechar()
  }

  async function excluir() {
    if (!conta) return
    if ((await usosDaConta(conta.id)) > 0) {
      window.alert('Esta conta tem lançamentos e não pode ser excluída. Você pode arquivá-la: ela some das listas, mas o histórico continua.')
      return
    }
    if (!window.confirm(`Excluir a conta "${conta.nome}"?`)) return
    try {
      await excluirConta(conta.id)
      controle.fechar()
    } catch (e) {
      if (e instanceof EmUsoError) window.alert(e.message)
      else throw e
    }
  }

  return (
    <Folha
      controle={controle}
      titulo={conta ? 'Editar conta' : 'Nova conta'}
      rodape={
        <Botao className="w-full" onClick={() => void salvar()}>
          <Check className="size-5" /> Salvar
        </Botao>
      }
    >
      <div className="space-y-5">
        <Campo rotulo="Nome">
          <Entrada
            value={nome}
            autoFocus={!conta}
            maxLength={30}
            placeholder="Ex.: Nubank, Itaú, Carteira"
            onChange={(e) => {
              setNome(e.target.value)
              setErro('')
            }}
          />
        </Campo>
        {erro && <p className="text-sm font-medium text-perigo">{erro}</p>}
        <Campo rotulo="Saldo inicial" dica="Quanto havia na conta quando você começou a usar o app.">
          <CampoValor valor={saldoInicial} aoMudar={setSaldoInicial} />
        </Campo>
        <SeletorCor cor={cor} aoMudar={setCor} />
        {conta && (
          <AcoesArquivo
            arquivado={conta.arquivada}
            aoArquivar={() => void editarConta(conta.id, { arquivada: !conta.arquivada }).then(controle.fechar)}
            aoExcluir={() => void excluir()}
          />
        )}
      </div>
    </Folha>
  )
}

export function EditorCartao({
  cartao,
  aoFechar,
  aoCriar,
}: {
  cartao?: Cartao
  aoFechar: () => void
  aoCriar?: (id: string) => void
}) {
  const controle = useFolha(aoFechar)
  const [nome, setNome] = useState(cartao?.nome ?? '')
  const [cor, setCor] = useState(cartao?.cor ?? PALETA[7])
  const [limite, setLimite] = useState(cartao?.limite ?? 0)
  const [diaFechamento, setDiaFechamento] = useState(cartao?.diaFechamento ?? 1)
  const [diaVencimento, setDiaVencimento] = useState(cartao?.diaVencimento ?? 8)
  const [erro, setErro] = useState('')

  const faturaHoje = faturaDaData(hojeISO(), { diaFechamento, diaVencimento })

  async function salvar() {
    if (!nome.trim()) return setErro('Dê um nome para o cartão.')
    const dados = { nome, cor, limite, diaFechamento, diaVencimento }
    if (cartao) await editarCartao(cartao.id, dados)
    else aoCriar?.(await criarCartao(dados))
    controle.fechar()
  }

  async function excluir() {
    if (!cartao) return
    if ((await usosDoCartao(cartao.id)) > 0) {
      window.alert('Este cartão tem lançamentos e não pode ser excluído. Você pode arquivá-lo: ele some das listas, mas o histórico continua.')
      return
    }
    if (!window.confirm(`Excluir o cartão "${cartao.nome}"?`)) return
    await excluirCartao(cartao.id)
    controle.fechar()
  }

  return (
    <Folha
      controle={controle}
      titulo={cartao ? 'Editar cartão' : 'Novo cartão de crédito'}
      rodape={
        <Botao className="w-full" onClick={() => void salvar()}>
          <Check className="size-5" /> Salvar
        </Botao>
      }
    >
      <div className="space-y-5">
        <Campo rotulo="Nome">
          <Entrada
            value={nome}
            autoFocus={!cartao}
            maxLength={30}
            placeholder="Ex.: Nubank, Itaú Visa"
            onChange={(e) => {
              setNome(e.target.value)
              setErro('')
            }}
          />
        </Campo>
        {erro && <p className="text-sm font-medium text-perigo">{erro}</p>}
        <Campo rotulo="Limite">
          <CampoValor valor={limite} aoMudar={setLimite} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Dia do fechamento">
            <Selecao value={diaFechamento} onChange={(e) => setDiaFechamento(Number(e.target.value))}>
              {DIAS.map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Dia do vencimento">
            <Selecao value={diaVencimento} onChange={(e) => setDiaVencimento(Number(e.target.value))}>
              {DIAS.map((d) => (
                <option key={d} value={d}>
                  Dia {d}
                </option>
              ))}
            </Selecao>
          </Campo>
        </div>
        <p className="rounded-xl bg-cartao-2 p-3 text-sm text-suave">
          Compras a partir do dia {diaFechamento} entram na fatura seguinte. Hoje, uma compra entraria na fatura de{' '}
          <strong className="text-texto">{rotuloFatura(faturaHoje)}</strong>, que fecha em {dataCurta(faturaHoje.fechamento)}{' '}
          e vence em {dataCurta(faturaHoje.vencimento)}.
        </p>
        <SeletorCor cor={cor} aoMudar={setCor} />
        {cartao && (
          <AcoesArquivo
            arquivado={cartao.arquivado}
            aoArquivar={() => void editarCartao(cartao.id, { arquivado: !cartao.arquivado }).then(controle.fechar)}
            aoExcluir={() => void excluir()}
          />
        )}
      </div>
    </Folha>
  )
}
