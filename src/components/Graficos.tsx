// Gráficos das análises (Recharts). Cores dos marcos vêm da categoria/forma; textos usam as cores de texto.
import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { marcasDoEixo, type PontoRitmo } from '@/utils/analises'
import { deISO } from '@/utils/datas'
import { formatarCompacto, formatarReais } from '@/utils/dinheiro'
import { format } from 'date-fns'

const EIXO = { fill: 'var(--suave)', fontSize: 11 }

/** Eixo de valores sem o "R$" (o título já diz que é dinheiro): "0", "500", "1,5 mil". */
function rotuloEixo(centavos: number): string {
  return formatarCompacto(centavos).replace('R$ ', '')
}

/** Propriedades comuns do eixo de valores, com marcas redondas. */
function eixoValores(maior: number, menor = 0) {
  const ticks = marcasDoEixo(maior, 4, menor)
  return {
    tick: EIXO,
    tickLine: false,
    axisLine: false,
    width: 44,
    ticks,
    domain: [ticks[0], ticks.at(-1)!] as [number, number],
    tickFormatter: rotuloEixo,
  }
}

/** Caixa de dica: o valor em destaque, o nome depois, com um traço da cor da série. */
function CaixaDica({ titulo, linhas }: { titulo?: string; linhas: { cor: string; nome: string; valor: number; tracejado?: boolean }[] }) {
  return (
    <div className="rounded-xl border border-borda bg-cartao px-3 py-2 text-sm shadow-lg">
      {titulo && <p className="mb-1 text-xs text-suave">{titulo}</p>}
      {linhas.map((l) => (
        <p key={l.nome} className="flex items-center gap-2">
          <svg width="14" height="4" aria-hidden>
            <line x1="1" y1="2" x2="13" y2="2" stroke={l.cor} strokeWidth="3" strokeLinecap="round" strokeDasharray={l.tracejado ? '3 3' : undefined} />
          </svg>
          <strong className="text-texto">{formatarReais(l.valor)}</strong>
          <span className="text-suave">{l.nome}</span>
        </p>
      ))}
    </div>
  )
}

export interface FatiaVisual {
  chave: string
  nome: string
  /** Emoji opcional antes do nome na legenda. */
  icone?: string
  cor: string
  valor: number
  porcentagem: number
}

/**
 * Rosca com o total no meio e, embaixo, a legenda completa (nome, valor e %), que também serve de
 * tabela: cada linha é tocável e abre os lançamentos daquela fatia.
 */
export function Rosca({
  fatias,
  legenda,
  total,
  aoTocar,
  rotuloCentro = 'Total',
}: {
  /** Fatias desenhadas (já com "Outras", se houver). */
  fatias: FatiaVisual[]
  /** Linhas da legenda (pode ter todas as categorias, sem juntar). */
  legenda?: FatiaVisual[]
  total: number
  aoTocar: (chave: string) => void
  rotuloCentro?: string
}) {
  return (
    <div>
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={fatias}
              dataKey="valor"
              nameKey="nome"
              innerRadius="62%"
              outerRadius="92%"
              startAngle={90}
              endAngle={-270}
              stroke="var(--cartao)"
              strokeWidth={2}
              onClick={(setor) => {
                const chave = (setor.payload as FatiaVisual | undefined)?.chave
                if (chave) aoTocar(chave)
              }}
              className="cursor-pointer outline-none"
            >
              {fatias.map((f) => (
                <Cell key={f.chave} fill={f.cor} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const f = payload?.[0]?.payload as FatiaVisual | undefined
                if (!active || !f) return null
                return <CaixaDica linhas={[{ cor: f.cor, nome: `${f.nome} · ${f.porcentagem.toLocaleString('pt-BR')}%`, valor: f.valor }]} />
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-suave">{rotuloCentro}</span>
          <span className="text-lg font-bold">{formatarReais(total)}</span>
        </div>
      </div>
      <ul className="mt-2 divide-y divide-borda">
        {(legenda ?? fatias).map((f) => (
          <li key={f.chave}>
            <button
              type="button"
              onClick={() => aoTocar(f.chave)}
              className="flex min-h-11 w-full items-center gap-3 py-1 text-left active:bg-cartao-2"
            >
              <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: f.cor }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm">
                {f.icone && `${f.icone} `}
                {f.nome}
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatarReais(f.valor)}</span>
              <span className="w-12 text-right text-xs text-suave tabular-nums">{f.porcentagem.toLocaleString('pt-BR')}%</span>
              <ChevronRight className="size-4 text-suave" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface ColunaCiclo {
  chave: string
  rotulo: string
  /** Rótulo longo para a dica (datas do ciclo). */
  detalhe: string
  valor: number
  destaque: boolean
}

/** Colunas dos últimos ciclos: o ciclo escolhido em destaque, os outros apagados. */
export function BarrasCiclos({ colunas, cor }: { colunas: ColunaCiclo[]; cor: string }) {
  // Só o ciclo em destaque leva o valor escrito em cima; os outros ficam na dica e na tabela.
  // Espaços que não quebram: o Recharts limita o texto à largura da barra e quebraria "R$ 1,7 mil".
  const dados = colunas.map((c) => ({
    ...c,
    rotuloValor: c.destaque && c.valor ? formatarCompacto(c.valor).replace(/ /g, ' ') : '',
  }))
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 22, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--borda)" />
          <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={{ stroke: 'var(--borda)' }} />
          <YAxis {...eixoValores(Math.max(...colunas.map((c) => c.valor)))} />
          <Tooltip
            cursor={{ fill: 'var(--cartao-2)' }}
            content={({ active, payload }) => {
              const c = payload?.[0]?.payload as ColunaCiclo | undefined
              if (!active || !c) return null
              return <CaixaDica titulo={c.detalhe} linhas={[{ cor, nome: 'gasto', valor: c.valor }]} />
            }}
          />
          <Bar dataKey="valor" maxBarSize={24} radius={[4, 4, 0, 0]}>
            {colunas.map((c) => (
              <Cell key={c.chave} fill={cor} fillOpacity={c.destaque ? 1 : 0.35} />
            ))}
            <LabelList dataKey="rotuloValor" position="top" offset={6} fill="var(--texto)" fontSize={11} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface ColunaEconomia {
  chave: string
  rotulo: string
  detalhe: string
  receitas: number
  despesas: number
  economia: number
  meta?: number
  emAndamento: boolean
}

/**
 * Economia por ciclo: barra para cima (verde) quando sobrou dinheiro, para baixo (vermelha) quando
 * gastou mais do que recebeu. O ciclo em andamento fica mais claro (o valor ainda vai mudar).
 */
export function BarrasEconomia({ colunas }: { colunas: ColunaEconomia[] }) {
  const valores = colunas.map((c) => c.economia)
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={colunas} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--borda)" />
          <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={false} interval={0} />
          <YAxis {...eixoValores(Math.max(0, ...valores), Math.min(0, ...valores))} />
          <ReferenceLine y={0} stroke="var(--suave)" strokeOpacity={0.6} />
          <Tooltip
            cursor={{ fill: 'var(--cartao-2)' }}
            content={({ active, payload }) => {
              const c = payload?.[0]?.payload as ColunaEconomia | undefined
              if (!active || !c) return null
              const linhas = [
                { cor: c.economia >= 0 ? 'var(--receita)' : 'var(--despesa)', nome: c.economia >= 0 ? 'economizado' : 'gastou a mais', valor: Math.abs(c.economia) },
                { cor: 'var(--receita)', nome: 'receitas', valor: c.receitas },
                { cor: 'var(--despesa)', nome: 'despesas', valor: c.despesas },
              ]
              if (c.meta) linhas.push({ cor: 'var(--suave)', nome: 'meta', valor: c.meta })
              return <CaixaDica titulo={`${c.detalhe}${c.emAndamento ? ' (em andamento)' : ''}`} linhas={linhas} />
            }}
          />
          <Bar dataKey="economia" maxBarSize={20} radius={[4, 4, 0, 0]}>
            {colunas.map((c) => (
              <Cell
                key={c.chave}
                fill={c.economia >= 0 ? 'var(--receita)' : 'var(--despesa)'}
                fillOpacity={c.emAndamento ? 0.45 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Chave da legenda com traço (linha cheia ou tracejada). */
export function ChaveLinha({ cor, tracejado, children }: { cor: string; tracejado?: boolean; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-suave">
      <svg width="18" height="4" aria-hidden>
        <line x1="1" y1="2" x2="17" y2="2" stroke={cor} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={tracejado ? '4 3' : undefined} />
      </svg>
      {children}
    </span>
  )
}

/** Gasto acumulado no período × ritmo ideal do planejamento (linha tracejada). */
export function LinhaRitmo({ pontos, className }: { pontos: PontoRitmo[]; className?: string }) {
  const temIdeal = pontos.some((p) => p.ideal !== null)
  const ultimo = [...pontos].reverse().find((p) => p.acumulado !== null)
  return (
    <div className={clsx('h-56', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={pontos} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--borda)" />
          <XAxis
            dataKey="data"
            tick={EIXO}
            tickLine={false}
            axisLine={{ stroke: 'var(--borda)' }}
            tickFormatter={(d: string) => format(deISO(d), 'dd/MM')}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis {...eixoValores(Math.max(...pontos.map((p) => Math.max(p.acumulado ?? 0, p.ideal ?? 0))))} />
          <Tooltip
            cursor={{ stroke: 'var(--suave)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as PontoRitmo | undefined
              if (!active || !p) return null
              const linhas = []
              if (p.acumulado !== null) linhas.push({ cor: 'var(--primaria)', nome: 'gasto acumulado', valor: p.acumulado })
              if (p.ideal !== null) linhas.push({ cor: 'var(--suave)', nome: 'ritmo ideal', valor: p.ideal, tracejado: true })
              return <CaixaDica titulo={format(deISO(p.data), 'dd/MM/yyyy')} linhas={linhas} />
            }}
          />
          {temIdeal && (
            <Line
              type="linear"
              dataKey="ideal"
              stroke="var(--suave)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="acumulado"
            stroke="var(--primaria)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            connectNulls={false}
            dot={(props: { cx?: number; cy?: number; payload?: PontoRitmo; index?: number }) =>
              props.payload && ultimo && props.payload.data === ultimo.data ? (
                <circle key={props.index} cx={props.cx} cy={props.cy} r={5} fill="var(--primaria)" stroke="var(--cartao)" strokeWidth={2} />
              ) : (
                <g key={props.index} />
              )
            }
            activeDot={{ r: 5, fill: 'var(--primaria)', stroke: 'var(--cartao)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
