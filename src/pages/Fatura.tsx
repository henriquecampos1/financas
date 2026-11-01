// Fatura de um cartão: barras por mês, valor, pagamentos (inclusive antecipados), limite e compras.
import clsx from 'clsx'
import { Check, ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { CampoValor } from '@/components/CampoValor'
import { EditorCartao } from '@/components/EditoresConta'
import { GraficoFaturas } from '@/components/GraficoFaturas'
import { ListaPorDia, useReferencias } from '@/components/ListaLancamentos'
import { BarraLimite, fundoDoCartao } from '@/components/ResumoCartoes'
import { Botao, BotaoIcone, Cabecalho, Campo, Cartao, Entrada, Folha, MOLA, Selecao, TituloSecao, Vazio, useFolha } from '@/components/ui'
import { excluirPagamento, registrarPagamento } from '@/db/lancamentos'
import type { Cartao as TipoCartao } from '@/db/tipos'
import { useCartoes, useContas, useLancamentosDoCartao, usePagamentosDoCartao } from '@/hooks/dados'
import { paraCompetencia } from '@/utils/competencia'
import { dataCurta, hojeISO } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'
import {
  deslocarFatura,
  ehAntecipado,
  faturaDaData,
  faturaDoLancamento,
  faturaPorChave,
  limiteUsado,
  resumirFatura,
  rotuloFatura,
  TEXTO_SITUACAO,
  totaisPorFatura,
  type Fatura as TipoFatura,
} from '@/utils/fatura'

/** Faturas mostradas nas barras: duas antes da atual até nove depois (e sempre a escolhida). */
function faturasDoGrafico(atual: TipoFatura, escolhida: TipoFatura, cartao: TipoCartao): TipoFatura[] {
  const distancia = (f: TipoFatura) => {
    const [a1, m1] = f.chave.split('-').map(Number)
    const [a2, m2] = atual.chave.split('-').map(Number)
    return (a1 - a2) * 12 + (m1 - m2)
  }
  const de = Math.min(-2, distancia(escolhida) - 2)
  const ate = Math.max(9, distancia(escolhida) + 2)
  return Array.from({ length: ate - de + 1 }, (_, i) => deslocarFatura(atual, de + i, cartao))
}

function RegistrarPagamento({
  cartao,
  fatura,
  restante,
  antecipar,
  aoFechar,
}: {
  cartao: TipoCartao
  fatura: TipoFatura
  restante: number
  /** A fatura ainda não fechou: é uma antecipação. */
  antecipar: boolean
  aoFechar: () => void
}) {
  const controle = useFolha(aoFechar)
  const contas = useContas()
  const [valor, setValor] = useState(antecipar ? 0 : restante)
  const hoje = hojeISO()
  const [data, setData] = useState(hoje)
  const [contaId, setContaId] = useState('')
  const [erro, setErro] = useState('')
  // Pagamento com data a partir do fechamento deixa de ser antecipação.
  const viraAntecipacao = data < fatura.fechamento

  async function salvar() {
    if (valor <= 0) return setErro('Digite o valor pago.')
    await registrarPagamento({ cartaoId: cartao.id, fatura: fatura.chave, valor, data, contaId: contaId || undefined })
    controle.fechar()
  }

  return (
    <Folha
      controle={controle}
      titulo={`${antecipar ? 'Antecipar pagamento' : 'Pagar fatura'} de ${rotuloFatura(fatura)}`}
      rodape={
        <>
          {erro && <p className="text-center text-sm font-semibold text-perigo">{erro}</p>}
          <Botao variante="credito" className="w-full" onClick={() => void salvar()}>
            <Check className="size-5" /> {antecipar ? 'Registrar antecipação' : 'Registrar pagamento'}
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <Campo
          rotulo={antecipar ? 'Valor antecipado' : 'Valor pago'}
          dica={restante > 0 ? `A fatura está em ${formatarReais(restante)} até agora.` : undefined}
        >
          <CampoValor valor={valor} aoMudar={setValor} autoFocus={antecipar} />
        </Campo>
        {restante > 0 && valor !== restante && (
          <Botao variante="fantasma" className="-mt-2 min-h-10 px-0" onClick={() => setValor(restante)}>
            Usar o valor total ({formatarReais(restante)})
          </Botao>
        )}
        <Campo rotulo="Data do pagamento">
          <Entrada type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
        </Campo>
        <Campo rotulo="Pago com a conta" dica="O valor sai do saldo desta conta.">
          <Selecao value={contaId} onChange={(e) => setContaId(e.target.value)}>
            <option value="">Não informar</option>
            {(contas ?? [])
              .filter((c) => !c.arquivada)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
          </Selecao>
        </Campo>
        <p className="rounded-xl bg-cartao-2 p-3 text-sm text-suave">
          {viraAntecipacao ? (
            <>
              <strong className="text-texto">Antecipação:</strong> o valor da fatura diminui e o limite é liberado. As
              compras continuam contando como gasto no ciclo em que foram feitas — o pagamento não é um gasto novo.
            </>
          ) : (
            <>
              O pagamento da fatura não conta como gasto novo: as compras já entraram no planejamento na data em que
              foram feitas. Ele só marca a fatura como paga e libera o limite.
            </>
          )}
        </p>
      </div>
    </Folha>
  )
}

export function Fatura() {
  const { cartaoId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const cartoes = useCartoes()
  const contas = useContas()
  const lancamentos = useLancamentosDoCartao(cartaoId)
  const pagamentos = usePagamentosDoCartao(cartaoId)
  const refs = useReferencias()
  const [pagando, setPagando] = useState(false)
  const [editando, setEditando] = useState(false)
  const cartao = cartoes?.find((c) => c.id === cartaoId)
  const hoje = hojeISO()

  const dados = useMemo(() => {
    if (!cartao || !lancamentos || !pagamentos) return undefined
    const atual = faturaDaData(hoje, cartao)
    const chave = params.get('f') ?? atual.chave
    const fatura = faturaPorChave(chave, cartao)
    const totais = totaisPorFatura(lancamentos, cartao)
    return {
      atual,
      resumo: resumirFatura(fatura, totais, pagamentos, hoje),
      grafico: faturasDoGrafico(atual, fatura, cartao).map((f) => resumirFatura(f, totais, pagamentos, hoje)),
      itens: paraCompetencia(
        lancamentos.filter((l) => faturaDoLancamento(l, cartao).chave === chave),
        'por-parcela',
      ),
      pagamentosDaFatura: pagamentos.filter((p) => p.fatura === chave).sort((a, b) => a.data.localeCompare(b.data)),
      usado: limiteUsado(lancamentos, pagamentos),
    }
  }, [cartao, lancamentos, pagamentos, params, hoje])

  if (cartoes && !cartao) {
    return (
      <>
        <Cabecalho titulo="Fatura" voltarPara="/transacoes" />
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <Vazio>Cartão não encontrado.</Vazio>
        </div>
      </>
    )
  }
  if (!cartao || !dados || !refs) return <Cabecalho titulo="Fatura" voltarPara="/transacoes" />

  const { fatura, compras, antecipado, valor, pago, restante, situacao } = dados.resumo
  const antecipar = hoje < fatura.fechamento
  const irPara = (f: TipoFatura) => setParams({ f: f.chave }, { replace: true })
  const outros = cartoes!.filter((c) => !c.arquivado)

  return (
    <>
      <Cabecalho
        titulo={cartao.nome}
        voltarPara="/transacoes"
        acoes={
          <BotaoIcone rotulo="Editar cartão" onClick={() => setEditando(true)}>
            <Pencil className="size-5" />
          </BotaoIcone>
        }
      >
        <div className="flex items-center gap-1 rounded-2xl bg-cartao p-1 shadow-cartao">
          <BotaoIcone rotulo="Fatura anterior" onClick={() => irPara(deslocarFatura(fatura, -1, cartao))} className="size-10 text-texto">
            <ChevronLeft className="size-5" strokeWidth={2.4} />
          </BotaoIcone>
          <p className="min-w-0 flex-1 text-center text-[15px] font-semibold">Fatura de {rotuloFatura(fatura)}</p>
          <BotaoIcone rotulo="Próxima fatura" onClick={() => irPara(deslocarFatura(fatura, 1, cartao))} className="size-10 text-texto">
            <ChevronRight className="size-5" strokeWidth={2.4} />
          </BotaoIcone>
        </div>
      </Cabecalho>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {outros.length > 1 && (
          <div className="sem-barra -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {outros.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/fatura/${c.id}`, { replace: true })}
                className={clsx(
                  'tocavel inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold',
                  c.id === cartao.id ? 'bg-credito/12 text-credito ring-2 ring-credito' : 'bg-cartao shadow-cartao',
                )}
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: c.cor }} aria-hidden />
                {c.nome}
              </button>
            ))}
          </div>
        )}

        <GraficoFaturas
          resumos={dados.grafico}
          selecionada={fatura.chave}
          atual={dados.atual.chave}
          aoEscolher={(r) => irPara(r.fatura)}
        />

        {/* Resumo da fatura desenhado como o próprio cartão. */}
        <motion.div
          key={fatura.chave}
          initial={{ opacity: 0.4, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={MOLA}
          className="relative overflow-hidden rounded-[28px] p-5 text-white shadow-flutuante"
          style={fundoDoCartao(cartao.cor)}
        >
          <span className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-white/10" aria-hidden />
          <span className="pointer-events-none absolute -bottom-24 -left-10 size-48 rounded-full bg-black/10" aria-hidden />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-white/80">Valor da fatura</p>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{TEXTO_SITUACAO[situacao]}</span>
            </div>
            <div>
              <p className="text-[36px] font-bold leading-none tracking-tight">{formatarReais(valor)}</p>
              {antecipado > 0 && (
                <p className="numeros mt-2 text-xs text-white/85">
                  Compras {formatarReais(compras)} − antecipado {formatarReais(antecipado)}
                </p>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <dt className="text-white/70">Compras de</dt>
                <dd className="text-sm font-semibold">
                  {dataCurta(fatura.inicio).slice(0, 5)} a {dataCurta(fatura.fim).slice(0, 5)}
                </dd>
              </div>
              <div>
                <dt className="text-white/70">Fecha / vence</dt>
                <dd className="text-sm font-semibold">
                  {dataCurta(fatura.fechamento).slice(0, 5)} / {dataCurta(fatura.vencimento).slice(0, 5)}
                </dd>
              </div>
            </dl>
            <BarraLimite usado={dados.usado} limite={cartao.limite} clara />
          </div>
        </motion.div>

        {(restante > 0 || antecipar) && (
          <Botao variante="credito" className="w-full" onClick={() => setPagando(true)}>
            {antecipar ? 'Antecipar pagamento' : 'Registrar pagamento'}
          </Botao>
        )}

        {(pago > antecipado || dados.pagamentosDaFatura.length > 0) && (
        <Cartao className="space-y-3 p-4">
          {pago > antecipado && (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-suave">Pago após fechar</dt>
                <dd className="font-medium text-sucesso">{formatarReais(pago - antecipado)}</dd>
              </div>
              <div>
                <dt className="text-suave">{restante >= 0 ? 'Falta pagar' : 'Pago a mais'}</dt>
                <dd className="font-medium">{formatarReais(Math.abs(restante))}</dd>
              </div>
            </dl>
          )}

          {dados.pagamentosDaFatura.length > 0 && (
            <ul className="divide-y divide-borda rounded-xl bg-cartao-2">
              {dados.pagamentosDaFatura.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-1 pl-3 pr-1 text-sm">
                  <span className="flex-1">
                    {ehAntecipado(p, fatura) ? 'Antecipação' : 'Pagamento'} em {dataCurta(p.data)}
                    {p.contaId && ` · ${contas?.find((c) => c.id === p.contaId)?.nome ?? ''}`}
                  </span>
                  <strong>{formatarReais(p.valor)}</strong>
                  <BotaoIcone
                    rotulo="Excluir pagamento"
                    className="size-9"
                    onClick={() => {
                      if (window.confirm(`Excluir o pagamento de ${formatarReais(p.valor)}?`)) void excluirPagamento(p.id)
                    }}
                  >
                    <X className="size-4" />
                  </BotaoIcone>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
        )}

        <TituloSecao>Compras nesta fatura</TituloSecao>
        {dados.itens.length ? (
          <ListaPorDia itens={dados.itens} refs={refs} />
        ) : (
          <Vazio>Nenhuma compra nesta fatura.</Vazio>
        )}
        <p className="pb-4 text-center text-xs text-suave">
          As próximas faturas já incluem as parcelas que vão cair nelas.
        </p>
      </div>

      {pagando && (
        <RegistrarPagamento
          cartao={cartao}
          fatura={fatura}
          restante={restante}
          antecipar={antecipar}
          aoFechar={() => setPagando(false)}
        />
      )}
      {editando && <EditorCartao cartao={cartao} aoFechar={() => setEditando(false)} />}
    </>
  )
}
