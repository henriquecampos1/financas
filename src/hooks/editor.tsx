// Abre o formulário de lançamento de qualquer tela: botão "+", tocar num lançamento, duplicar.
import { ArrowDownLeft, CreditCard, Zap } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { EditorLancamento, type Area } from '@/components/EditorLancamento'
import { Folha, useFolha } from '@/components/ui'
import { dadosParaEditar } from '@/db/lancamentos'
import type { Lancamento, Metodo } from '@/db/tipos'
import { hojeISO } from '@/utils/datas'
import type { DadosLancamento } from '@/utils/parcelas'
import { lembrar, prepararTeclado } from '@/utils/teclado'

type Pedido =
  | { id: number; modo: 'escolher' }
  | { id: number; modo: 'novo'; area: Area; dados: DadosLancamento }
  | { id: number; modo: 'editar'; area: Area; dados: DadosLancamento; original: Lancamento }

interface Editor {
  /** Botão "+": pergunta "Crédito ou Pix/Transferência?". */
  escolher: () => void
  novo: (area: Area, base?: Partial<DadosLancamento>) => void
  editar: (lancamento: Lancamento) => void
}

const ContextoEditor = createContext<Editor | null>(null)

function dadosNovos(area: Area, base?: Partial<DadosLancamento>): DadosLancamento {
  const metodoLembrado = lembrar('ultimoMetodo') as Metodo | undefined
  return {
    tipo: 'despesa',
    metodo: area === 'credito' ? 'credito' : metodoLembrado && metodoLembrado !== 'credito' ? metodoLembrado : 'pix',
    valor: 0,
    descricao: '',
    categoriaId: '',
    dataCompra: hojeISO(),
    cartaoId: lembrar('ultimoCartao'),
    contaId: lembrar('ultimaConta'),
    parcelas: 1,
    observacao: '',
    tags: [],
    ...base,
  }
}

function EscolhaArea({
  aoEscolher,
  aoFechar,
}: {
  aoEscolher: (a: Area, base?: Partial<DadosLancamento>) => void
  aoFechar: () => void
}) {
  const controle = useFolha(aoFechar)
  const opcoes: { area: Area; base?: Partial<DadosLancamento>; titulo: string; descricao: string; Icone: typeof Zap; classe: string }[] = [
    {
      area: 'credito',
      titulo: 'Cartão de crédito',
      descricao: 'Compra à vista ou parcelada',
      Icone: CreditCard,
      classe: 'bg-credito/12 text-credito',
    },
    {
      area: 'conta',
      titulo: 'Pix, transferência ou débito',
      descricao: 'Também dinheiro',
      Icone: Zap,
      classe: 'bg-primaria/12 text-primaria',
    },
    {
      area: 'conta',
      base: { tipo: 'receita', metodo: 'transferencia' },
      titulo: 'Receita (entrada)',
      descricao: 'Salário, renda extra, rendimentos',
      Icone: ArrowDownLeft,
      classe: 'bg-receita/12 text-receita',
    },
  ]
  return (
    <Folha controle={controle} titulo="Novo lançamento">
      <div className="space-y-3 pb-safe">
        {opcoes.map(({ area, base, titulo, descricao, Icone, classe }) => (
          <button
            key={titulo}
            type="button"
            onClick={() => {
              prepararTeclado()
              aoEscolher(area, base)
            }}
            className="tocavel flex w-full items-center gap-4 rounded-3xl bg-cartao p-4 text-left shadow-cartao"
          >
            <span className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${classe}`}>
              <Icone className="size-7" />
            </span>
            <span>
              <span className="block text-lg font-bold">{titulo}</span>
              <span className="block text-sm text-suave">{descricao}</span>
            </span>
          </button>
        ))}
      </div>
    </Folha>
  )
}

export function ProvedorEditor({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const contador = useRef(0)
  const proximoId = () => ++contador.current

  const novo = useCallback((area: Area, base?: Partial<DadosLancamento>) => {
    setPedido({ id: proximoId(), modo: 'novo', area, dados: dadosNovos(area, base) })
  }, [])

  const editor = useMemo<Editor>(
    () => ({
      escolher: () => setPedido({ id: proximoId(), modo: 'escolher' }),
      novo,
      editar: (original) => {
        void dadosParaEditar(original).then((dados) =>
          setPedido({
            id: proximoId(),
            modo: 'editar',
            area: original.metodo === 'credito' ? 'credito' : 'conta',
            dados,
            original,
          }),
        )
      },
    }),
    [novo],
  )

  // Fecha só o pedido que terminou de fechar (duplicar troca o pedido antes da animação acabar).
  const fechar = (id: number) => () => setPedido((p) => (p?.id === id ? null : p))

  return (
    <ContextoEditor.Provider value={editor}>
      {children}
      {pedido?.modo === 'escolher' && <EscolhaArea aoEscolher={novo} aoFechar={fechar(pedido.id)} />}
      {pedido && pedido.modo !== 'escolher' && (
        <EditorLancamento
          key={pedido.id}
          area={pedido.area}
          inicial={pedido.dados}
          original={pedido.modo === 'editar' ? pedido.original : undefined}
          aoFechar={fechar(pedido.id)}
          aoDuplicar={(dados) => novo(pedido.area, { ...dados, dataCompra: hojeISO() })}
        />
      )}
    </ContextoEditor.Provider>
  )
}

export function useEditor(): Editor {
  const editor = useContext(ContextoEditor)
  if (!editor) throw new Error('useEditor fora do ProvedorEditor')
  return editor
}
