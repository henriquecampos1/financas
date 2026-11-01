import clsx from 'clsx'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  CreditCard,
  DatabaseBackup,
  Eye,
  EyeOff,
  PiggyBank,
  Target,
  Zap,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { AnelProgresso, COR_TEXTO } from '@/components/BarrasPlano'
import { NOMES_METODO } from '@/components/EditorLancamento'
import { LinhaLancamento, useReferencias } from '@/components/ListaLancamentos'
import { PendentesRecorrencia } from '@/components/PendentesRecorrencia'
import { CartaoFatura, useResumoCartoes } from '@/components/ResumoCartoes'
import { SeletorCiclo } from '@/components/SeletorCiclo'
import { Cabecalho, Cartao, IconeCategoria, MOLA, TituloSecao, Vazio } from '@/components/ui'
import { ValorAnimado, ValorPrivado } from '@/components/Valor'
import { db } from '@/db/banco'
import { useAjustes } from '@/hooks/ajustes'
import { useCiclo } from '@/hooks/ciclo'
import { useContas, useItensDoPeriodo, useUltimos } from '@/hooks/dados'
import { useEditor } from '@/hooks/editor'
import { useResumoPlano } from '@/hooks/plano'
import { usePrivacidade } from '@/hooks/privacidade'
import { DIAS_LEMBRETE_BACKUP, diasDesdeBackup } from '@/utils/backup'
import { diasNoCiclo, diasRestantes } from '@/utils/ciclo'
import { totais } from '@/utils/competencia'
import { dataCurta, hojeISO } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'
import { alertas } from '@/utils/planejamento'
import { prepararTeclado } from '@/utils/teclado'

function saudacao(hora: number): string {
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Cartão principal: saldo do ciclo em destaque, receitas, despesas e quanto do ciclo já passou. */
function SaldoDoCiclo() {
  const { ciclo, ehAtual, deslocamento } = useCiclo()
  const { oculto, alternar } = usePrivacidade()
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
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={MOLA}
      className="relative overflow-hidden rounded-[28px] p-5 text-white shadow-flutuante"
      style={{
        background: 'radial-gradient(130% 120% at 100% 0%, var(--heroi-3) 0%, var(--heroi-2) 42%, var(--heroi-1) 100%)',
      }}
    >
      {/* Luz no canto e um brilho que passa uma vez ao abrir. */}
      <span className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/12 blur-2xl" aria-hidden />
      <span
        className="animar-brilho pointer-events-none absolute -inset-y-10 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/14 to-transparent"
        aria-hidden
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white/80">Saldo do ciclo</p>
          <button
            type="button"
            onClick={alternar}
            aria-label={oculto ? 'Mostrar valores' : 'Esconder valores'}
            className="tocavel -mr-1 flex size-9 items-center justify-center rounded-full bg-white/15 text-white"
          >
            {oculto ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
        <ValorAnimado centavos={saldo} className="mt-1 block text-[40px] font-bold leading-none tracking-tight" />

        <div className="mt-5 grid grid-cols-2 gap-2">
          {[
            { rotulo: 'Receitas', valor: receitas, Icone: ArrowDownLeft },
            { rotulo: 'Despesas', valor: despesas, Icone: ArrowUpRight },
          ].map(({ rotulo, valor, Icone }) => (
            <div key={rotulo} className="rounded-2xl bg-white/12 px-3 py-2.5 backdrop-blur-sm">
              <span className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                <Icone className="size-4" strokeWidth={2.4} /> {rotulo}
              </span>
              <ValorPrivado centavos={valor} className="mt-0.5 block truncate text-[17px] font-semibold" />
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-baseline justify-between gap-2 text-xs font-medium text-white/85">
          <span>{situacao}</span>
          <span>
            {dataCurta(ciclo.inicio).slice(0, 5)} – {dataCurta(ciclo.fim).slice(0, 5)}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="Dias do ciclo já passados" aria-valuenow={porcentagem}>
          <motion.div
            className="h-full rounded-full bg-white"
            initial={{ width: 0 }}
            animate={{ width: `${porcentagem}%` }}
            transition={{ type: 'spring', stiffness: 110, damping: 22 }}
          />
        </div>
      </div>
    </motion.div>
  )
}

/** Atalhos redondos logo abaixo do saldo (como nos apps de banco). */
function Atalhos() {
  const { novo } = useEditor()
  const navigate = useNavigate()
  const atalhos = [
    { texto: 'Crédito', Icone: CreditCard, classe: 'text-credito', acao: () => (prepararTeclado(), novo('credito')) },
    { texto: 'Pix e débito', Icone: Zap, classe: 'text-primaria', acao: () => (prepararTeclado(), novo('conta')) },
    {
      texto: 'Receita',
      Icone: ArrowDownLeft,
      classe: 'text-receita',
      acao: () => (prepararTeclado(), novo('conta', { tipo: 'receita', metodo: 'transferencia' })),
    },
    { texto: 'Metas', Icone: PiggyBank, classe: 'text-[#d6336c] dark:text-[#f783ac]', acao: () => navigate('/metas') },
  ]
  return (
    <div className="mt-5 grid grid-cols-4 gap-2">
      {atalhos.map(({ texto, Icone, classe, acao }, i) => (
        <motion.button
          key={texto}
          type="button"
          onClick={acao}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...MOLA, delay: 0.05 + i * 0.04 }}
          whileTap={{ scale: 0.92 }}
          className="flex flex-col items-center gap-1.5"
        >
          <span className={clsx('flex size-[58px] items-center justify-center rounded-[20px] bg-cartao shadow-cartao', classe)}>
            <Icone className="size-6" strokeWidth={2.1} />
          </span>
          <span className="text-xs font-medium">{texto}</span>
        </motion.button>
      ))}
    </div>
  )
}

function FaturasAtuais() {
  const resumos = useResumoCartoes()
  if (!resumos?.length) return null
  return (
    <>
      <TituloSecao
        extra={
          <Link to="/transacoes" className="text-sm font-semibold text-primaria">
            Ver todas
          </Link>
        }
      >
        Faturas
      </TituloSecao>
      <div className="sem-barra -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {resumos.map((r) => (
          <CartaoFatura
            key={r.cartao.id}
            resumo={r}
            className={clsx('shrink-0 snap-center', resumos.length > 1 ? 'w-[86%]' : 'w-full')}
          />
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
      <Link to="/transacoes?aba=conta" className="tocavel block">
        <Cartao className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-[14px] bg-primaria/12 text-primaria">
              <Zap className="size-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-suave">Gastos fora do cartão</p>
              <ValorPrivado centavos={total} className="block text-[24px] font-bold leading-tight tracking-tight" />
            </div>
            <ChevronRight className="size-5 text-suave" />
          </div>

          {porConta.length > 0 && (
            <div>
              {/* Barra dividida por conta, na cor de cada uma. */}
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                {porConta.map(({ conta, valor }) => (
                  <motion.span
                    key={conta.id}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ backgroundColor: conta.cor }}
                    initial={{ flexGrow: 0 }}
                    animate={{ flexGrow: valor }}
                    transition={{ type: 'spring', stiffness: 110, damping: 22 }}
                  />
                ))}
              </div>
              <ul className="numeros mt-3 space-y-1.5 text-sm">
                {porConta.map(({ conta, valor }) => (
                  <li key={conta.id} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: conta.cor }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-suave">{conta.nome}</span>
                    <ValorPrivado centavos={valor} className="font-medium" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {porMetodo.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-borda pt-3">
              {porMetodo.map((m) => (
                <span key={m.metodo} className="rounded-full bg-cartao-2 px-2.5 py-1 text-xs">
                  <span className="text-suave">{NOMES_METODO[m.metodo]}</span>{' '}
                  <ValorPrivado centavos={m.valor} className="font-semibold" />
                </span>
              ))}
            </div>
          )}
          {!gastos.length && <p className="text-sm text-suave">Nenhum gasto fora do cartão neste ciclo.</p>}
        </Cartao>
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
          className="tocavel flex min-h-16 items-center justify-center gap-2 rounded-3xl border border-dashed border-borda font-semibold text-primaria"
        >
          <Target className="size-5" /> Criar o planejamento deste ciclo
        </Link>
      </>
    )

  const r = dados.resumo
  const avisos = alertas(r)
  return (
    <>
      <TituloSecao>Planejamento</TituloSecao>
      <Link to="/plano" className="tocavel block">
        <Cartao className="flex items-center gap-4 p-4">
          <AnelProgresso porcentagem={r.porcentagem} faixa={r.faixa} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-suave">Gasto no ciclo</p>
            <p className="numeros truncate">
              <ValorPrivado centavos={r.gasto} className="text-[17px] font-bold" />{' '}
              <span className="text-sm text-suave">de {formatarReais(r.planejado)}</span>
            </p>
            {ehAtual && (
              <p className="mt-0.5 text-[13px]">
                {r.porDia > 0 ? (
                  <>
                    Pode gastar <strong className="text-primaria">{formatarReais(r.porDia)}/dia</strong>
                  </>
                ) : (
                  <span className="font-semibold text-perigo">O planejado do ciclo acabou</span>
                )}
              </p>
            )}
          </div>
          <ChevronRight className="size-5 text-suave" />
        </Cartao>
      </Link>
      {avisos.length > 0 && (
        <Cartao className="mt-3 divide-y divide-borda overflow-hidden">
          {avisos.map((l) => {
            const c = refs.categorias.get(l.categoriaId)
            return (
              <Link key={l.categoriaId} to="/plano" className="flex min-h-16 items-center gap-3 px-4 py-2 active:bg-cartao-2">
                <IconeCategoria icone={c?.icone ?? '❔'} cor={c?.cor ?? '#868e96'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c?.nome ?? 'Categoria'}</span>
                  <span className={clsx('numeros block text-[13px]', l.disponivel < 0 ? 'text-perigo' : 'text-suave')}>
                    {l.disponivel < 0
                      ? `Excedido em ${formatarReais(-l.disponivel)}`
                      : `Restam ${formatarReais(l.disponivel)} de ${formatarReais(l.limite)}`}
                  </span>
                </span>
                <span
                  className={clsx(
                    'rounded-full px-2.5 py-1 text-xs font-bold',
                    COR_TEXTO[l.faixa],
                    l.faixa === 'excedido' ? 'bg-perigo/10' : 'bg-alerta/10',
                  )}
                >
                  {l.porcentagem}%
                </span>
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
    <Link to="/backup" className="tocavel mt-4 flex items-center gap-3 rounded-3xl bg-alerta/10 p-4 text-sm">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-alerta/15 text-alerta">
        <DatabaseBackup className="size-5" />
      </span>
      <span className="flex-1">
        <strong className="block">{dias === undefined ? 'Faça seu primeiro backup' : `Faz ${dias} dias sem backup`}</strong>
        <span className="text-suave">Os dados ficam só neste aparelho. Toque para salvar uma cópia.</span>
      </span>
      <ChevronRight className="size-5 text-suave" />
    </Link>
  )
}

export function Inicio() {
  const agora = new Date()
  return (
    <>
      <Cabecalho titulo={saudacao(agora.getHours())} subtitulo={format(agora, "EEEE, d 'de' MMMM", { locale: ptBR })}>
        <SeletorCiclo />
      </Cabecalho>
      <div className="mx-auto max-w-2xl px-4 pt-3">
        <SaldoDoCiclo />
        <Atalhos />
        <LembreteBackup />
        <PendentesRecorrencia />
        <ResumoDoPlano />
        <FaturasAtuais />
        <GastosPixDebito />
        <UltimosLancamentos />
      </div>
    </>
  )
}
