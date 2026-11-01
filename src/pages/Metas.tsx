// Mais → Metas e caixinhas: guardar dinheiro para um objetivo, com prazo e sugestão por mês.
import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronRight, Minus, Pencil, Plus, Trash, X } from 'lucide-react'
import { useState } from 'react'
import { BarraProgresso } from '@/components/BarrasPlano'
import { CampoValor } from '@/components/CampoValor'
import { Botao, BotaoIcone, Cabecalho, Campo, Cartao, Entrada, Folha, IconeCategoria, TituloSecao, Vazio, useFolha } from '@/components/ui'
import { db } from '@/db/banco'
import { criarMeta, editarMeta, excluirAporte, excluirMeta, registrarAporte } from '@/db/metas'
import { EMOJIS_SUGERIDOS, PALETA } from '@/db/padroes'
import type { Meta } from '@/db/tipos'
import { useAjustes } from '@/hooks/ajustes'
import { useItensDoPeriodo } from '@/hooks/dados'
import { cicloAtual, deslocarCiclo } from '@/utils/ciclo'
import { totais } from '@/utils/competencia'
import { dataCurta, hojeISO } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'
import { mesesAtePrazo, progressoMeta, sugestaoMensal, valorGuardado } from '@/utils/metas'

const EMOJIS_META = ['🎯', '🏖️', '✈️', '🏠', '🚗', '💍', '🎓', '💻', '📱', '🛟', '👶', '🐶', '🎁', '📈', '💰', '⭐']

function textoPrazo(meta: Meta, hoje: string): string {
  const falta = meta.valorAlvo - valorGuardado(meta)
  if (falta <= 0) return 'Meta atingida! 🎉'
  if (!meta.prazo) return `Faltam ${formatarReais(falta)}`
  const sugestao = sugestaoMensal(meta, hoje)
  if (sugestao === undefined) return `O prazo (${dataCurta(meta.prazo)}) já passou · faltam ${formatarReais(falta)}`
  const meses = mesesAtePrazo(hoje, meta.prazo)
  return `Guarde ${formatarReais(sugestao)} por mês (${meses} ${meses === 1 ? 'mês' : 'meses'} até ${dataCurta(meta.prazo)})`
}

function EditorMeta({ meta, aoFechar }: { meta?: Meta; aoFechar: () => void }) {
  const controle = useFolha(aoFechar)
  const [nome, setNome] = useState(meta?.nome ?? '')
  const [icone, setIcone] = useState(meta?.icone ?? '🎯')
  const [cor, setCor] = useState(meta?.cor ?? PALETA[4])
  const [valorAlvo, setValorAlvo] = useState(meta?.valorAlvo ?? 0)
  const [prazo, setPrazo] = useState(meta?.prazo ?? '')
  const [inicial, setInicial] = useState(0)
  const [erro, setErro] = useState('')

  async function salvar() {
    if (!nome.trim()) return setErro('Dê um nome para a meta.')
    if (valorAlvo <= 0) return setErro('Digite quanto você quer juntar.')
    const dados = { nome, icone, cor, valorAlvo, prazo: prazo || undefined }
    if (meta) await editarMeta(meta.id, dados)
    else await criarMeta(dados, inicial, hojeISO())
    controle.fechar()
  }

  return (
    <Folha
      controle={controle}
      titulo={meta ? 'Editar meta' : 'Nova meta'}
      rodape={
        <>
          {erro && <p className="text-center text-sm font-semibold text-perigo">{erro}</p>}
          <Botao className="w-full" onClick={() => void salvar()}>
            <Check className="size-5" /> Salvar
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <IconeCategoria icone={icone} cor={cor} tamanho="lg" />
          <div className="min-w-0 flex-1">
            <Campo rotulo="Nome">
              <Entrada value={nome} autoFocus={!meta} maxLength={40} placeholder="Ex.: Viagem, Reserva de emergência" onChange={(e) => setNome(e.target.value)} />
            </Campo>
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1">
          {[...new Set([...EMOJIS_META, ...EMOJIS_SUGERIDOS.slice(0, 16)])].slice(0, 24).map((e) => (
            <button
              key={e}
              type="button"
              aria-label={`Ícone ${e}`}
              aria-pressed={icone === e}
              onClick={() => setIcone(e)}
              className={clsx('flex aspect-square items-center justify-center rounded-xl text-2xl', icone === e ? 'bg-primaria/15 ring-2 ring-primaria' : 'active:bg-cartao-2')}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-2">
          {PALETA.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Cor ${c}`}
              aria-pressed={cor === c}
              onClick={() => setCor(c)}
              className="flex aspect-square items-center justify-center rounded-full"
              style={{ backgroundColor: c }}
            >
              {cor === c && <Check className="size-6 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
        <Campo rotulo="Quanto quer juntar">
          <CampoValor valor={valorAlvo} aoMudar={setValorAlvo} />
        </Campo>
        <Campo rotulo="Prazo (opcional)" dica="Com prazo, o app calcula quanto guardar por mês.">
          <Entrada type="date" value={prazo} min={hojeISO()} onChange={(e) => setPrazo(e.target.value)} />
        </Campo>
        {!meta && (
          <Campo rotulo="Já tem algum valor guardado? (opcional)">
            <CampoValor valor={inicial} aoMudar={setInicial} />
          </Campo>
        )}
      </div>
    </Folha>
  )
}

function DetalheMeta({ meta, aoFechar, aoEditar }: { meta: Meta; aoFechar: () => void; aoEditar: () => void }) {
  const controle = useFolha(aoFechar)
  const hoje = hojeISO()
  const [movimento, setMovimento] = useState<'guardar' | 'retirar' | null>(null)
  const [valor, setValor] = useState(0)
  const [data, setData] = useState(hoje)
  const guardado = valorGuardado(meta)
  const pct = progressoMeta(meta)

  async function confirmar() {
    if (valor <= 0 || !movimento) return
    await registrarAporte(meta.id, { data, valor: movimento === 'guardar' ? valor : -valor })
    setMovimento(null)
    setValor(0)
  }

  async function excluir() {
    if (!window.confirm(`Excluir a meta "${meta.nome}" e todo o histórico dela?`)) return
    await excluirMeta(meta.id)
    controle.fechar()
  }

  return (
    <Folha controle={controle} titulo={`${meta.icone} ${meta.nome}`}>
      <div className="space-y-4">
        <Cartao className="space-y-2 p-4">
          <p className="text-sm text-suave">Guardado</p>
          <p className="text-3xl font-bold">{formatarReais(guardado)}</p>
          <BarraProgresso porcentagem={pct} faixa="ok" grossa />
          <p className="text-sm text-suave">
            {pct}% de {formatarReais(meta.valorAlvo)}
          </p>
          <p className="text-sm font-medium">{textoPrazo(meta, hoje)}</p>
        </Cartao>

        {movimento ? (
          <Cartao className="space-y-3 p-4">
            <p className="font-semibold">{movimento === 'guardar' ? 'Guardar dinheiro' : 'Retirar dinheiro'}</p>
            <CampoValor valor={valor} aoMudar={setValor} autoFocus />
            <Entrada type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} aria-label="Data" />
            <div className="grid grid-cols-2 gap-2">
              <Botao variante="secundario" onClick={() => setMovimento(null)}>
                Cancelar
              </Botao>
              <Botao onClick={() => void confirmar()}>Confirmar</Botao>
            </div>
          </Cartao>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Botao variante="secundario" onClick={() => setMovimento('retirar')}>
              <Minus className="size-5" /> Retirar
            </Botao>
            <Botao onClick={() => setMovimento('guardar')}>
              <Plus className="size-5" /> Guardar
            </Botao>
          </div>
        )}

        <TituloSecao>Histórico</TituloSecao>
        {meta.aportes.length ? (
          <Cartao className="divide-y divide-borda overflow-hidden">
            {[...meta.aportes].reverse().map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1 pl-4 pr-1">
                <span className="flex-1 text-sm">
                  {dataCurta(a.data)}
                  {a.observacao && <span className="text-suave"> · {a.observacao}</span>}
                </span>
                <strong className={a.valor < 0 ? 'text-despesa' : 'text-receita'}>
                  {a.valor < 0 ? '−' : '+'}
                  {formatarReais(Math.abs(a.valor))}
                </strong>
                <BotaoIcone
                  rotulo="Excluir movimento"
                  className="size-9"
                  onClick={() => {
                    if (window.confirm('Excluir este movimento?')) void excluirAporte(meta.id, a.id)
                  }}
                >
                  <X className="size-4" />
                </BotaoIcone>
              </div>
            ))}
          </Cartao>
        ) : (
          <Vazio>Nada guardado ainda.</Vazio>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-borda pt-4">
          <Botao variante="secundario" onClick={aoEditar}>
            <Pencil className="size-5" /> Editar
          </Botao>
          <Botao variante="perigo" onClick={() => void excluir()}>
            <Trash className="size-5" /> Excluir
          </Botao>
        </div>
      </div>
    </Folha>
  )
}

export function Metas() {
  const metas = useLiveQuery(() => db.metas.orderBy('id').toArray())
  const { diaInicioCiclo } = useAjustes()
  const anterior = deslocarCiclo(cicloAtual(diaInicioCiclo), -1, diaInicioCiclo)
  const itensAnterior = useItensDoPeriodo(anterior.inicio, anterior.fim)
  const [aberta, setAberta] = useState<string | null>(null)
  const [editando, setEditando] = useState<{ meta?: Meta } | null>(null)
  const hoje = hojeISO()
  const metaAberta = metas?.find((m) => m.id === aberta)
  const sobraAnterior = itensAnterior ? totais(itensAnterior).saldo : 0
  const ordenadas = [...(metas ?? [])].sort((a, b) => a.criadaEm - b.criadaEm)

  return (
    <>
      <Cabecalho titulo="Metas e caixinhas" voltarPara="/mais" />
      <div className="mx-auto max-w-2xl space-y-3 px-4 pb-6 pt-4">
        {sobraAnterior > 0 && (
          <p className="rounded-xl bg-receita/10 p-3 text-sm">
            No último ciclo fechado você economizou <strong>{formatarReais(sobraAnterior)}</strong>. Que tal guardar em
            uma meta?
          </p>
        )}
        {metas && !metas.length && <Vazio>Crie uma meta para juntar dinheiro: viagem, reserva de emergência, carro...</Vazio>}
        {ordenadas.map((m) => {
          const pct = progressoMeta(m)
          return (
            <button key={m.id} type="button" onClick={() => setAberta(m.id)} className="block w-full text-left">
              <Cartao className="space-y-2 p-4 active:bg-cartao-2">
                <div className="flex items-center gap-3">
                  <IconeCategoria icone={m.icone} cor={m.cor} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{m.nome}</p>
                    <p className="text-sm text-suave">
                      {formatarReais(valorGuardado(m))} de {formatarReais(m.valorAlvo)}
                    </p>
                  </div>
                  <span className="font-bold">{pct}%</span>
                  <ChevronRight className="size-5 text-suave" />
                </div>
                <BarraProgresso porcentagem={pct} faixa="ok" />
                <p className="text-xs text-suave">{textoPrazo(m, hoje)}</p>
              </Cartao>
            </button>
          )
        })}
        <Botao variante="secundario" className="w-full" onClick={() => setEditando({})}>
          <Plus className="size-5" /> Nova meta
        </Botao>
      </div>

      {metaAberta && !editando && (
        <DetalheMeta meta={metaAberta} aoFechar={() => setAberta(null)} aoEditar={() => setEditando({ meta: metaAberta })} />
      )}
      {editando && <EditorMeta meta={editando.meta} aoFechar={() => setEditando(null)} />}
    </>
  )
}
