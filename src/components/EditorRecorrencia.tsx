// Criar/editar uma despesa ou receita fixa que se repete todo mês.
import { Check, Trash } from 'lucide-react'
import { useState } from 'react'
import { criarRecorrencia, editarRecorrencia, excluirRecorrencia, type DadosRecorrencia } from '@/db/recorrencias'
import type { Metodo, Recorrencia } from '@/db/tipos'
import { useCategorias } from '@/hooks/categorias'
import { useCartoes, useContas } from '@/hooks/dados'
import { hojeISO } from '@/utils/datas'
import { formatarReais } from '@/utils/dinheiro'
import { ocorrencias } from '@/utils/recorrencias'
import { CampoValor } from './CampoValor'
import { NOMES_METODO } from './EditorLancamento'
import { Botao, Campo, Entrada, Folha, Segmentado, Selecao, useFolha } from './ui'

const DIAS = Array.from({ length: 31 }, (_, i) => i + 1)
const METODOS: Metodo[] = ['credito', 'pix', 'transferencia', 'debito', 'dinheiro']

export function EditorRecorrencia({ recorrencia, aoFechar }: { recorrencia?: Recorrencia; aoFechar: () => void }) {
  const controle = useFolha(aoFechar)
  const categorias = useCategorias()
  const cartoes = useCartoes()
  const contas = useContas()
  const [d, setD] = useState<DadosRecorrencia>(
    recorrencia ?? {
      tipo: 'despesa',
      metodo: 'pix',
      valor: 0,
      descricao: '',
      categoriaId: '',
      dia: Number(hojeISO().slice(8, 10)),
      inicio: hojeISO(),
      confirmarAntes: false,
      ativa: true,
      tags: [],
    },
  )
  const [erro, setErro] = useState('')
  const mudar = (p: Partial<DadosRecorrencia>) => {
    setD((atual) => ({ ...atual, ...p }))
    setErro('')
  }

  const credito = d.metodo === 'credito'
  const tipo = credito ? 'despesa' : d.tipo
  const categoriasDoTipo = (categorias ?? []).filter((c) => c.tipo === tipo && (!c.arquivada || c.id === d.categoriaId))
  const origens = ((credito ? cartoes : contas) ?? []).filter((o) => !('arquivado' in o ? o.arquivado : o.arquivada))
  const proxima = ocorrencias(d, hojeISO(), '9999-12-31')[0]

  async function salvar() {
    if (d.valor <= 0) return setErro('Digite o valor.')
    if (!d.descricao.trim()) return setErro('Dê um nome (ex.: Netflix, Aluguel, Salário).')
    if (!categoriasDoTipo.some((c) => c.id === d.categoriaId)) return setErro('Escolha a categoria.')
    const origemId = credito ? d.cartaoId : d.contaId
    if (!origemId || !origens.some((o) => o.id === origemId)) return setErro(credito ? 'Escolha o cartão.' : 'Escolha a conta.')
    const dados: DadosRecorrencia = {
      ...d,
      tipo,
      cartaoId: credito ? d.cartaoId : undefined,
      contaId: credito ? undefined : d.contaId,
      fim: d.fim || undefined,
    }
    if (recorrencia) await editarRecorrencia(recorrencia.id, dados)
    else await criarRecorrencia(dados)
    controle.fechar()
  }

  async function excluir() {
    if (!recorrencia) return
    if (!window.confirm(`Excluir a recorrência "${recorrencia.descricao}"? Os lançamentos já feitos por ela continuam.`)) return
    await excluirRecorrencia(recorrencia.id)
    controle.fechar()
  }

  return (
    <Folha
      controle={controle}
      titulo={recorrencia ? 'Editar recorrência' : 'Nova recorrência'}
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
        {!credito && (
          <Segmentado
            rotulo="Tipo"
            valor={d.tipo}
            aoMudar={(t) => mudar({ tipo: t, categoriaId: '' })}
            opcoes={[
              { valor: 'despesa', texto: 'Despesa fixa' },
              { valor: 'receita', texto: 'Receita fixa' },
            ]}
          />
        )}
        <Campo rotulo="Nome">
          <Entrada
            value={d.descricao}
            maxLength={60}
            autoFocus={!recorrencia}
            placeholder={tipo === 'receita' ? 'Ex.: Salário' : 'Ex.: Netflix, Aluguel, Futebol'}
            onChange={(e) => mudar({ descricao: e.target.value })}
          />
        </Campo>
        <Campo rotulo="Valor">
          <CampoValor valor={d.valor} aoMudar={(valor) => mudar({ valor })} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Forma">
            <Selecao value={d.metodo} onChange={(e) => mudar({ metodo: e.target.value as Metodo })}>
              {METODOS.filter((m) => m !== 'credito' || d.tipo === 'despesa').map((m) => (
                <option key={m} value={m}>
                  {NOMES_METODO[m]}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo={credito ? 'Cartão' : 'Conta'}>
            <Selecao
              value={(credito ? d.cartaoId : d.contaId) ?? ''}
              onChange={(e) => mudar(credito ? { cartaoId: e.target.value } : { contaId: e.target.value })}
            >
              <option value="">Escolha…</option>
              {origens.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
        </div>
        <Campo rotulo="Categoria">
          <Selecao value={d.categoriaId} onChange={(e) => mudar({ categoriaId: e.target.value })}>
            <option value="">Escolha…</option>
            {categoriasDoTipo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icone} {c.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Todo dia">
            <Selecao value={d.dia} onChange={(e) => mudar({ dia: Number(e.target.value) })}>
              {DIAS.map((dia) => (
                <option key={dia} value={dia}>
                  {dia}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="A partir de">
            <Entrada type="date" value={d.inicio} onChange={(e) => e.target.value && mudar({ inicio: e.target.value })} />
          </Campo>
        </div>
        <Campo rotulo="Termina em (opcional)" dica="Deixe em branco se não tem data para acabar.">
          <Entrada type="date" value={d.fim ?? ''} min={d.inicio} onChange={(e) => mudar({ fim: e.target.value || undefined })} />
        </Campo>
        <label className="flex items-start gap-3 rounded-2xl border border-borda bg-cartao p-3">
          <input
            type="checkbox"
            className="mt-0.5 size-5 accent-[var(--primaria)]"
            checked={d.confirmarAntes}
            onChange={(e) => mudar({ confirmarAntes: e.target.checked })}
          />
          <span>
            <span className="block font-medium">Confirmar antes de lançar</span>
            <span className="block text-sm text-suave">
              Bom para valores que mudam (luz, água). Sem isso, o app lança sozinho no dia.
            </span>
          </span>
        </label>
        {recorrencia && (
          <label className="flex items-center gap-3 rounded-2xl border border-borda bg-cartao p-3">
            <input
              type="checkbox"
              className="size-5 accent-[var(--primaria)]"
              checked={d.ativa}
              onChange={(e) => mudar({ ativa: e.target.checked })}
            />
            <span className="font-medium">Ativa (desmarque para pausar)</span>
          </label>
        )}
        {proxima && d.valor > 0 && (
          <p className="rounded-xl bg-cartao-2 p-3 text-sm text-suave">
            Próximo lançamento: <strong className="text-texto">{formatarReais(d.valor)}</strong> em{' '}
            {proxima.data.split('-').reverse().join('/')}.
          </p>
        )}
        {recorrencia && (
          <Botao variante="perigo" className="w-full" onClick={() => void excluir()}>
            <Trash className="size-5" /> Excluir recorrência
          </Botao>
        )}
      </div>
    </Folha>
  )
}
