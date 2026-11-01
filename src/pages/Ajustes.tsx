import clsx from 'clsx'
import { ShieldAlert, ShieldCheck, Sparkles, Trash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { carregarDemonstracao } from '@/db/demo'
import { Botao, Cabecalho, Campo, Cartao, Selecao, TituloSecao } from '@/components/ui'
import { apagarTudo, salvarAjustes } from '@/db/ajustes'
import {
  lerEstadoArmazenamento,
  pedirArmazenamentoPersistente,
  type EstadoArmazenamento,
} from '@/db/armazenamento'
import type { ModoParcelas } from '@/db/tipos'
import { useAjustes } from '@/hooks/ajustes'
import { cicloAtual, cicloDoMes, deslocarCiclo, rotuloCiclo } from '@/utils/ciclo'

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1)

const MODOS: { valor: ModoParcelas; titulo: string; descricao: string }[] = [
  {
    valor: 'por-parcela',
    titulo: 'Cada parcela no ciclo em que cai',
    descricao: 'Uma compra de R$ 600 em 3x conta R$ 200 neste ciclo, R$ 200 no próximo e R$ 200 no seguinte.',
  },
  {
    valor: 'total-na-compra',
    titulo: 'Valor total no ciclo da compra',
    descricao: 'A mesma compra conta os R$ 600 inteiros no ciclo em que foi feita.',
  },
]

function SecaoCiclo() {
  const { diaInicioCiclo } = useAjustes()
  const atual = cicloAtual(diaInicioCiclo)
  const proximo = deslocarCiclo(atual, 1, diaInicioCiclo)
  // Mostra como fica fevereiro quando o dia escolhido não existe em todo mês.
  const anoExemplo = new Date().getFullYear() + 1
  const fevereiro = cicloDoMes(anoExemplo, 1, diaInicioCiclo)

  return (
    <Cartao className="space-y-4 p-4">
      <Campo
        rotulo="Dia de início do ciclo"
        dica="O ciclo vai deste dia até a véspera dele no mês seguinte. Ex.: dia 15 → de 15/01 a 14/02."
      >
        <Selecao
          value={diaInicioCiclo}
          onChange={(e) => void salvarAjustes({ diaInicioCiclo: Number(e.target.value) })}
        >
          {DIAS.map((d) => (
            <option key={d} value={d}>
              Dia {d}
            </option>
          ))}
        </Selecao>
      </Campo>
      <dl className="space-y-1 rounded-xl bg-cartao-2 p-3 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-suave">Ciclo atual</dt>
          <dd className="font-semibold">{rotuloCiclo(atual)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-suave">Próximo</dt>
          <dd className="font-semibold">{rotuloCiclo(proximo)}</dd>
        </div>
        {diaInicioCiclo >= 29 && (
          <div className="flex justify-between gap-2">
            <dt className="text-suave">Fevereiro/{anoExemplo}</dt>
            <dd className="font-semibold">{rotuloCiclo(fevereiro)}</dd>
          </div>
        )}
      </dl>
      {diaInicioCiclo >= 29 && (
        <p className="text-xs text-suave">
          Nos meses sem o dia {diaInicioCiclo}, o ciclo começa no último dia do mês.
        </p>
      )}
    </Cartao>
  )
}

function SecaoParcelas() {
  const { modoParcelas } = useAjustes()
  return (
    <div role="radiogroup" aria-label="Como contar compras parceladas" className="space-y-2">
      {MODOS.map((m) => {
        const ativo = m.valor === modoParcelas
        return (
          <button
            key={m.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => void salvarAjustes({ modoParcelas: m.valor })}
            className={clsx(
              'tocavel flex w-full items-start gap-3 rounded-3xl bg-cartao p-4 text-left shadow-cartao',
              ativo && 'ring-2 ring-primaria',
            )}
          >
            <span
              className={clsx(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                ativo ? 'border-primaria' : 'border-borda',
              )}
            >
              {ativo && <span className="size-2.5 rounded-full bg-primaria" />}
            </span>
            <span>
              <span className="block font-semibold">
                {m.titulo}
                {m.valor === 'por-parcela' && <span className="font-normal text-suave"> (padrão)</span>}
              </span>
              <span className="mt-1 block text-sm text-suave">{m.descricao}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function formatarBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function SecaoArmazenamento() {
  const [estado, setEstado] = useState<EstadoArmazenamento | null>(null)
  useEffect(() => {
    void lerEstadoArmazenamento().then(setEstado)
  }, [])

  async function pedir() {
    await pedirArmazenamentoPersistente()
    setEstado(await lerEstadoArmazenamento())
  }

  if (!estado) return null
  const protegido = estado.protegido === true
  return (
    <Cartao className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        {protegido ? (
          <ShieldCheck className="size-6 shrink-0 text-sucesso" />
        ) : (
          <ShieldAlert className="size-6 shrink-0 text-alerta" />
        )}
        <div className="text-sm">
          <p className="font-semibold">
            {protegido ? 'Dados protegidos contra limpeza automática' : 'Proteção contra limpeza não confirmada'}
          </p>
          <p className="mt-1 text-suave">
            Tudo fica guardado só neste aparelho
            {estado.usado !== undefined && ` (${formatarBytes(estado.usado)} usados)`}.{' '}
            {protegido
              ? 'Mesmo assim, faça backups de vez em quando.'
              : 'No iPhone, instalar o app na Tela de Início ajuda a manter os dados. Faça backups de vez em quando.'}
          </p>
        </div>
      </div>
      {!protegido && estado.protegido !== null && (
        <Botao variante="secundario" className="w-full" onClick={() => void pedir()}>
          Pedir proteção novamente
        </Botao>
      )}
    </Cartao>
  )
}

export function Ajustes() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(false)

  async function demonstracao() {
    if (
      !window.confirm(
        'Adicionar contas, cartões e uns 3 meses de lançamentos de exemplo? Eles se misturam com o que você já lançou; para tirar depois, use "Apagar tudo".',
      )
    )
      return
    setCarregando(true)
    try {
      await carregarDemonstracao()
      navigate('/')
    } finally {
      setCarregando(false)
    }
  }

  async function apagar() {
    if (!window.confirm('Apagar TODOS os dados deste aparelho? Lançamentos, cartões, planos e metas somem.')) return
    if (!window.confirm('Tem certeza? Isso não pode ser desfeito. Se quiser guardar algo, faça um backup antes.')) return
    await apagarTudo()
    location.reload()
  }

  return (
    <>
      <Cabecalho titulo="Ajustes" voltarPara="/mais" />
      <div className="mx-auto max-w-2xl px-4 pb-6">
        <TituloSecao>Ciclo financeiro</TituloSecao>
        <SecaoCiclo />

        <TituloSecao>Compras parceladas no planejamento</TituloSecao>
        <SecaoParcelas />

        <TituloSecao>Armazenamento</TituloSecao>
        <SecaoArmazenamento />

        <TituloSecao>Testar o app</TituloSecao>
        <Botao variante="secundario" className="w-full" disabled={carregando} onClick={() => void demonstracao()}>
          <Sparkles className="size-5" /> {carregando ? 'Carregando…' : 'Carregar dados de demonstração'}
        </Botao>

        <TituloSecao>Zona de perigo</TituloSecao>
        <Botao variante="perigo" className="w-full" onClick={() => void apagar()}>
          <Trash className="size-5" /> Apagar tudo
        </Botao>

        <p className="mt-8 text-center text-xs text-suave">Minhas Finanças · versão {__VERSAO__}</p>
      </div>
    </>
  )
}
