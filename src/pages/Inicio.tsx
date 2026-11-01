import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ChevronRight, DatabaseBackup, Target } from 'lucide-react'
import { Link } from 'react-router'
import { BarraProgresso, COR_TEXTO } from '@/components/BarrasPlano'
import { NOMES_METODO } from '@/components/EditorLancamento'
import { PendentesRecorrencia } from '@/components/PendentesRecorrencia'
import { LinhaLancamento, useReferencias } from '@/components/ListaLancamentos'
import { CartaoFatura, useResumoCartoes } from '@/components/ResumoCartoes'
import { SeletorCiclo } from '@/components/SeletorCiclo'
import { Cabecalho, Cartao, TituloSecao, Vazio } from '@/components/ui'
import { useAjustes } from '@/hooks/ajustes'
import { useCiclo } from '@/hooks/ciclo'
import { useContas, useItensDoPeriodo, useUltimos } from '@/hooks/dados'
import { db } from '@/db/banco'
import { useResumoPlano } from '@/hooks/plano'
import { DIAS_LEMBRETE_BACKUP, diasDesdeBackup } from '@/utils/backup'
import { alertas } from '@/utils/planejamento'
import { diasNoCiclo, diasRestantes } from '@/utils/ciclo'
import { totais } from '@/utils/competencia'
import { dataCurta, hojeISO } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'

function SaldoDoCiclo() {
  const { ciclo, ehAtual, deslocamento } = useCiclo()
  const { diaInicioCiclo } = useAjustes()
  const itens = useItensDoPeriodo(ciclo.inicio, ciclo.fim)
  const { receitas, despesas, saldo } = totais(itens ?? [])

  const total = diasNoCiclo(ciclo)
  const restantes = diasRestantes(ciclo, hojeISO())
  const passados = total - restantes
  // A barra conta o dia de hoje como já em andamento ("Dia 1 de 30" já mostra um pedacinho).
  const decorridos = ehAtual ? passados + 1 : deslocamento < 0 ? total : 0
  const porcentagem = Math.round((decorridos / total) * 100)

  let situacao: string
  if (!ehAtual && deslocamento < 0) situacao = 'Ciclo encerrado'
  else if (!ehAtual) situacao = `Começa em ${dataCurta(ciclo.inicio)}`
  else situacao = `Dia ${passados + 1} de ${total} · ${restantes === 1 ? 'último dia' : `faltam ${restantes} dias`}`

  return (
    <Cartao className="p-4">
      <p className="text-sm text-suave">Saldo do ciclo</p>
      <p className={clsx('text-3xl font-bold', saldo < 0 && 'text-despesa')}>{itens ? formatarReais(saldo) : '…'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-xl bg-cartao-2 p-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-receita/15 text-receita">
            <ArrowDownLeft className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-suave">Receitas</span>
            <span className="block truncate font-semibold">{formatarReais(receitas)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-cartao-2 p-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-despesa/15 text-despesa">
            <ArrowUpRight className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-suave">Despesas</span>
            <span className="block truncate font-semibold">{formatarReais(despesas)}</span>
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{situacao}</span>
        <span className="text-xs text-suave">
          {dataCurta(ciclo.inicio).slice(0, 5)} a {dataCurta(ciclo.fim).slice(0, 5)}
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-cartao-2"
        role="progressbar"
        aria-label="Dias do ciclo já passados"
        aria-valuenow={porcentagem}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-primaria transition-all" style={{ width: `${porcentagem}%` }} />
      </div>
      <p className="mt-2 text-xs text-suave">
        Seu ciclo começa todo dia {diaInicioCiclo}.{' '}
        <Link to="/ajustes" className="font-semibold text-primaria">
          Mudar
        </Link>
      </p>
    </Cartao>
  )
}

function FaturasAtuais() {
  const resumos = useResumoCartoes()
  if (!resumos?.length) return null
  return (
    <>
      <TituloSecao>Faturas dos cartões</TituloSecao>
      <div className="space-y-3">
        {resumos.map((r) => (
          <CartaoFatura key={r.cartao.id} resumo={r} />
        ))}
      </div>
    </>
  )
}

/** Prévia dos gastos fora do cartão (Pix, transferência, débito e dinheiro) no ciclo. */
function GastosPixDebito() {
  const { ciclo } = useCiclo()
  const itens = useItensDoPeriodo(ciclo.inicio, ciclo.fim)
  const contas = useContas()
  if (!itens || !contas) return null

  const gastos = itens.filter((i) => i.lancamento.tipo === 'despesa' && i.lancamento.metodo !== 'credito')
  const total = gastos.reduce((s, i) => s + i.valor, 0)
  const porMetodo = (['pix', 'transferencia', 'debito', 'dinheiro'] as const)
    .map((m) => ({ metodo: m, valor: gastos.filter((i) => i.lancamento.metodo === m).reduce((s, i) => s + i.valor, 0) }))
    .filter((m) => m.valor > 0)
  const porConta = contas
    .map((c) => ({ conta: c, valor: gastos.filter((i) => i.lancamento.contaId === c.id).reduce((s, i) => s + i.valor, 0) }))
    .filter((c) => c.valor > 0)
    .sort((a, b) => b.valor - a.valor)

  return (
    <>
      <TituloSecao>Pix, débito e dinheiro</TituloSecao>
      <Link
        to="/transacoes?aba=conta"
        className="block overflow-hidden rounded-2xl border border-borda bg-cartao transition active:scale-[0.99]"
      >
        <div className="h-1.5 bg-primaria" aria-hidden />
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 font-semibold">Gastos fora do cartão</span>
            <ChevronRight className="size-5 text-suave" />
          </div>
          <div>
            <p className="text-xs text-suave">Neste ciclo</p>
            <p className="text-2xl font-bold">{formatarReais(total)}</p>
            <p className="text-xs text-suave">
              {gastos.length} lançamento{gastos.length === 1 ? '' : 's'}
            </p>
          </div>
          {porMetodo.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {porMetodo.map((m) => (
                <span key={m.metodo} className="rounded-full bg-cartao-2 px-2.5 py-1 text-xs">
                  <span className="text-suave">{NOMES_METODO[m.metodo]}</span>{' '}
                  <strong className="font-semibold">{formatarReais(m.valor)}</strong>
                </span>
              ))}
            </div>
          )}
          {porConta.length > 0 && (
            <ul className="space-y-1 border-t border-borda pt-2 text-sm">
              {porConta.map(({ conta, valor }) => (
                <li key={conta.id} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: conta.cor }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-suave">{conta.nome}</span>
                  <span className="font-medium">{formatarReais(valor)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
    </>
  )
}

function UltimosLancamentos() {
  const ultimos = useUltimos(5)
  const refs = useReferencias()
  if (!ultimos || !refs) return null
  return (
    <>
      <TituloSecao
        extra={
          ultimos.length > 0 && (
            <Link to="/transacoes" className="text-sm font-semibold text-primaria">
              Ver todos
            </Link>
          )
        }
      >
        Últimos lançamentos
      </TituloSecao>
      {ultimos.length ? (
        <Cartao className="divide-y divide-borda overflow-hidden">
          {ultimos.map((item) => (
            <LinhaLancamento key={item.id} item={item} refs={refs} />
          ))}
        </Cartao>
      ) : (
        <Vazio>Nenhum lançamento ainda. Toque no + para lançar o primeiro.</Vazio>
      )}
    </>
  )
}

function ResumoDoPlano() {
  const { ciclo, ehAtual } = useCiclo()
  const dados = useResumoPlano(ciclo)
  const refs = useReferencias()
  if (!dados || !refs) return null

  if (!dados.plano || !dados.resumo)
    return (
      <>
        <TituloSecao>Planejamento</TituloSecao>
        <Link
          to="/plano"
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-dashed border-borda font-semibold text-primaria"
        >
          <Target className="size-5" /> Criar planejamento deste ciclo
        </Link>
      </>
    )

  const r = dados.resumo
  const avisos = alertas(r)
  return (
    <>
      <TituloSecao
        extra={
          <Link to="/plano" className="text-sm font-semibold text-primaria">
            Ver plano
          </Link>
        }
      >
        Planejamento
      </TituloSecao>
      <Link to="/plano" className="block">
        <Cartao className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm">
              <strong>{formatarReais(r.gasto)}</strong> <span className="text-suave">de {formatarReais(r.planejado)}</span>
            </p>
            <p className={clsx('text-sm font-bold', COR_TEXTO[r.faixa])}>{r.porcentagem}%</p>
          </div>
          <BarraProgresso porcentagem={r.porcentagem} faixa={r.faixa} grossa />
          {ehAtual && (
            <p className="text-sm text-suave">
              {r.porDia > 0 ? (
                <>
                  Pode gastar <strong className="text-primaria">{formatarReais(r.porDia)}/dia</strong> nos próximos{' '}
                  {r.diasRestantes} dia{r.diasRestantes === 1 ? '' : 's'}
                </>
              ) : (
                <span className="font-semibold text-perigo">O planejado do ciclo acabou</span>
              )}
            </p>
          )}
        </Cartao>
      </Link>
      {avisos.length > 0 && (
        <Cartao className="mt-3 divide-y divide-borda overflow-hidden">
          {avisos.map((l) => {
            const c = refs.categorias.get(l.categoriaId)
            return (
              <Link key={l.categoriaId} to="/plano" className="flex min-h-14 items-center gap-3 px-4 py-2">
                <AlertTriangle className={clsx('size-5 shrink-0', COR_TEXTO[l.faixa])} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {c?.icone} {c?.nome ?? 'Categoria'}
                  </span>
                  <span className="block text-xs text-suave">
                    {l.disponivel < 0
                      ? `Excedido em ${formatarReais(-l.disponivel)}`
                      : `Restam ${formatarReais(l.disponivel)} de ${formatarReais(l.limite)}`}
                  </span>
                </span>
                <span className={clsx('font-bold', COR_TEXTO[l.faixa])}>{l.porcentagem}%</span>
              </Link>
            )
          })}
        </Cartao>
      )}
    </>
  )
}

/** Lembrete de backup quando já há dados e o último backup tem mais de 15 dias (ou nunca foi feito). */
function LembreteBackup() {
  const { ultimoBackup } = useAjustes()
  const temDados = useLiveQuery(async () => (await db.lancamentos.count()) > 0)
  const dias = diasDesdeBackup(ultimoBackup)
  if (!temDados || (dias !== undefined && dias <= DIAS_LEMBRETE_BACKUP)) return null
  return (
    <Link
      to="/backup"
      className="mb-3 flex items-center gap-3 rounded-2xl border border-alerta/40 bg-alerta/10 px-4 py-3 text-sm"
    >
      <DatabaseBackup className="size-5 shrink-0 text-alerta" />
      <span className="flex-1">
        <strong className="block">{dias === undefined ? 'Faça seu primeiro backup' : `Faz ${dias} dias sem backup`}</strong>
        <span className="text-suave">Os dados ficam só neste aparelho. Toque para salvar uma cópia.</span>
      </span>
      <ChevronRight className="size-5 text-suave" />
    </Link>
  )
}

export function Inicio() {
  return (
    <>
      <Cabecalho titulo="Início">
        <SeletorCiclo />
      </Cabecalho>
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <LembreteBackup />
        <SaldoDoCiclo />
        <PendentesRecorrencia />
        <ResumoDoPlano />
        <FaturasAtuais />
        <GastosPixDebito />
        <UltimosLancamentos />
      </div>
    </>
  )
}
