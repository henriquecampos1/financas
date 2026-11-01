// Criar/editar o planejamento de um ciclo: renda prevista, meta de economia e limite por categoria.
import clsx from 'clsx'
import { Check, CopyPlus, Plus, Trash } from 'lucide-react'
import { useMemo, useState } from 'react'
import { excluirPlano, salvarPlano } from '@/db/planos'
import type { Plano } from '@/db/tipos'
import { useAjustes } from '@/hooks/ajustes'
import { useCategorias } from '@/hooks/categorias'
import { useItensDoPeriodo } from '@/hooks/dados'
import { usePlanoAnterior } from '@/hooks/plano'
import { deslocarCiclo, rotuloCiclo, type Ciclo } from '@/utils/ciclo'
import { formatarReais } from '@/utils/dinheiro'
import { gastoPorCategoria } from '@/utils/planejamento'
import { CampoValor } from './CampoValor'
import { EditorCategoria } from './EditorCategoria'
import { Botao, Campo, Folha, IconeCategoria, TituloSecao, useFolha } from './ui'

export function EditorPlano({ ciclo, plano, aoFechar }: { ciclo: Ciclo; plano: Plano | null; aoFechar: () => void }) {
  const controle = useFolha(aoFechar)
  const { diaInicioCiclo } = useAjustes()
  const categorias = useCategorias()
  const anterior = usePlanoAnterior(ciclo)
  const cicloAnterior = deslocarCiclo(ciclo, -1, diaInicioCiclo)
  const itensAnteriores = useItensDoPeriodo(cicloAnterior.inicio, cicloAnterior.fim)
  const gastoAnterior = useMemo(() => gastoPorCategoria(itensAnteriores ?? []), [itensAnteriores])

  const [renda, setRenda] = useState(plano?.rendaPrevista ?? 0)
  const [meta, setMeta] = useState(plano?.metaEconomia ?? 0)
  const [limites, setLimites] = useState<Record<string, number>>(() =>
    Object.fromEntries((plano?.limites ?? []).map((l) => [l.categoriaId, l.limite])),
  )
  // Muda a chave dos campos ao copiar, para eles mostrarem os valores novos.
  const [versao, setVersao] = useState(0)
  const [criandoCategoria, setCriandoCategoria] = useState(false)

  const lista = (categorias ?? []).filter((c) => c.tipo === 'despesa' && (!c.arquivada || limites[c.id]))
  const planejado = Object.values(limites).reduce((s, v) => s + v, 0)
  const podeGastar = renda - meta
  const diferenca = podeGastar - planejado

  function copiarAnterior() {
    if (!anterior) return
    setRenda(anterior.rendaPrevista)
    setMeta(anterior.metaEconomia)
    setLimites(Object.fromEntries(anterior.limites.map((l) => [l.categoriaId, l.limite])))
    setVersao((v) => v + 1)
  }

  function usarGastosAnteriores() {
    setLimites(Object.fromEntries([...gastoAnterior].map(([id, v]) => [id, Math.ceil(v / 1000) * 1000])))
    setVersao((v) => v + 1)
  }

  async function salvar() {
    await salvarPlano(ciclo, {
      rendaPrevista: renda,
      metaEconomia: meta,
      limites: Object.entries(limites).map(([categoriaId, limite]) => ({ categoriaId, limite })),
    })
    controle.fechar()
  }

  async function excluir() {
    if (!plano || !window.confirm('Excluir o planejamento deste ciclo? Os lançamentos não são afetados.')) return
    await excluirPlano(plano.id)
    controle.fechar()
  }

  return (
    <Folha
      controle={controle}
      titulo={plano ? 'Editar planejamento' : 'Novo planejamento'}
      rodape={
        <>
          <div className="space-y-0.5 text-sm">
            <p className="flex justify-between">
              <span className="text-suave">Total planejado</span>
              <strong>{formatarReais(planejado)}</strong>
            </p>
            {renda > 0 && (
              <p className={clsx('flex justify-between', diferenca < 0 ? 'text-perigo' : 'text-sucesso')}>
                <span>{diferenca < 0 ? 'Passa do que sobra para gastar' : 'Ainda sobra para planejar'}</span>
                <strong>{formatarReais(Math.abs(diferenca))}</strong>
              </p>
            )}
          </div>
          <Botao className="w-full" onClick={() => void salvar()}>
            <Check className="size-5" /> Salvar planejamento
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-suave">Ciclo de {rotuloCiclo(ciclo)}</p>

        {(anterior || gastoAnterior.size > 0) && (
          <div className="grid gap-2">
            {anterior && (
              <Botao variante="secundario" onClick={copiarAnterior}>
                <CopyPlus className="size-5" /> Copiar do plano anterior ({rotuloCiclo(anterior)})
              </Botao>
            )}
            {gastoAnterior.size > 0 && (
              <Botao variante="fantasma" className="min-h-10" onClick={usarGastosAnteriores}>
                Usar os gastos do ciclo anterior como limites
              </Botao>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Renda prevista">
            <CampoValor key={`renda-${versao}`} valor={renda} aoMudar={setRenda} />
          </Campo>
          <Campo rotulo="Meta de economia">
            <CampoValor key={`meta-${versao}`} valor={meta} aoMudar={setMeta} />
          </Campo>
        </div>
        {renda > 0 && (
          <p className="rounded-xl bg-cartao-2 p-3 text-sm text-suave">
            Para guardar {formatarReais(meta)}, você pode gastar até{' '}
            <strong className="text-texto">{formatarReais(Math.max(0, podeGastar))}</strong> neste ciclo.
          </p>
        )}

        <TituloSecao>Limite por categoria</TituloSecao>
        <div className="divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-cartao">
          {lista.map((c) => {
            const gastoNoAnterior = gastoAnterior.get(c.id)
            return (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                <IconeCategoria icone={c.icone} cor={c.cor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nome}</p>
                  <p className="truncate text-xs text-suave">
                    {gastoNoAnterior ? `Antes: ${formatarReais(gastoNoAnterior)}` : 'Antes: R$ 0'}
                  </p>
                </div>
                <CampoValor
                  key={`${c.id}-${versao}`}
                  className="w-32 shrink-0"
                  valor={limites[c.id] ?? 0}
                  aoMudar={(v) => setLimites((l) => ({ ...l, [c.id]: v }))}
                  aria-label={`Limite de ${c.nome}`}
                />
              </div>
            )
          })}
        </div>
        <Botao variante="secundario" className="w-full" onClick={() => setCriandoCategoria(true)}>
          <Plus className="size-5" /> Nova categoria
        </Botao>
        <p className="text-xs text-suave">
          "Antes" é quanto você gastou na categoria no ciclo anterior. Deixe em branco as categorias que não quer
          limitar. Para separar gastos (ex.: Esportes, ou Gasolina e Uber em vez de Transporte), crie categorias
          novas.
        </p>

        {plano && (
          <Botao variante="perigo" className="w-full" onClick={() => void excluir()}>
            <Trash className="size-5" /> Excluir planejamento
          </Botao>
        )}
      </div>
      {/* Abre por cima (a Folha é desenhada direto no <body>). */}
      {criandoCategoria && <EditorCategoria tipoNova="despesa" aoFechar={() => setCriandoCategoria(false)} />}
    </Folha>
  )
}
