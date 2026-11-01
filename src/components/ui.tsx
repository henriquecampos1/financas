// Componentes básicos de interface, com alvos de toque grandes.
import clsx from 'clsx'
import { ChevronLeft, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'

type Variante = 'primario' | 'credito' | 'secundario' | 'perigo' | 'fantasma'

export function Botao({
  variante = 'primario',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold transition active:scale-[0.98] disabled:opacity-50',
        variante === 'primario' && 'bg-primaria text-primaria-texto',
        variante === 'credito' && 'bg-credito text-primaria-texto',
        variante === 'secundario' && 'border border-borda bg-cartao text-texto',
        variante === 'perigo' && 'border border-borda bg-cartao text-perigo',
        variante === 'fantasma' && 'text-primaria',
        className,
      )}
      {...props}
    />
  )
}

export function BotaoIcone({
  rotulo,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className={clsx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-suave transition hover:bg-cartao-2 active:scale-95 disabled:opacity-30',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const classeCampo =
  'w-full min-h-12 rounded-xl border border-borda bg-cartao px-3 text-texto placeholder:text-suave/70 focus:border-primaria focus:outline-none focus:ring-2 focus:ring-primaria/30'

export function Campo({ rotulo, children, dica }: { rotulo: string; children: ReactNode; dica?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-suave">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-suave">{dica}</span>}
    </label>
  )
}

export function Entrada({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(classeCampo, className)} {...props} />
}

export function AreaTexto({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(classeCampo, 'py-3', className)} rows={3} {...props} />
}

export function Selecao({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(classeCampo, 'pr-8', className)} {...props} />
}

export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
}: {
  opcoes: { valor: T; texto: string }[]
  valor: T
  aoMudar: (v: T) => void
  rotulo: string
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex gap-1 rounded-xl bg-cartao-2 p-1">
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aoMudar(o.valor)}
            className={clsx(
              'min-h-11 flex-1 rounded-lg px-2 text-sm font-semibold transition',
              ativo ? 'bg-cartao text-texto shadow-sm' : 'text-suave',
            )}
          >
            {o.texto}
          </button>
        )
      })}
    </div>
  )
}

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('rounded-2xl border border-borda bg-cartao', className)}>{children}</div>
}

export function TituloSecao({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wide text-suave">{children}</h2>
      {extra}
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-borda px-4 py-6 text-center text-sm text-suave">{children}</p>
}

/** Bolinha colorida com o emoji da categoria. */
export function IconeCategoria({ icone, cor, tamanho = 'md' }: { icone: string; cor: string; tamanho?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-full',
        tamanho === 'md' ? 'size-10 text-xl' : 'size-14 text-3xl',
      )}
      style={{ backgroundColor: `${cor}2e`, boxShadow: `inset 0 0 0 2px ${cor}` }}
    >
      {icone}
    </span>
  )
}

/** Barra de topo das páginas, com espaço para o notch do iPhone. */
export function Cabecalho({
  titulo,
  voltarPara,
  acoes,
  children,
}: {
  titulo: string
  /** Mostra a seta de voltar; este endereço é usado quando não há tela anterior (ex.: "/mais"). */
  voltarPara?: string
  acoes?: ReactNode
  /** Conteúdo extra abaixo do título (ex.: seletor de ciclo). */
  children?: ReactNode
}) {
  const navigate = useNavigate()
  const { key } = useLocation()
  // Volta para a tela anterior; se a página foi a primeira aberta, vai para `voltarPara`.
  const voltar = () => (key !== 'default' ? navigate(-1) : navigate(voltarPara!, { replace: true }))
  return (
    <header className="sticky top-0 z-30 border-b border-borda bg-fundo/90 pt-safe backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-1 px-4 py-2">
        {voltarPara && (
          <BotaoIcone rotulo="Voltar" className="-ml-3" onClick={voltar}>
            <ChevronLeft className="size-7" />
          </BotaoIcone>
        )}
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">{titulo}</h1>
        {acoes}
      </div>
      {children && <div className="mx-auto max-w-2xl px-4 pb-2">{children}</div>}
    </header>
  )
}

export interface ControleFolha {
  saindo: boolean
  /** Fecha com animação (use também depois de salvar). */
  fechar: () => void
  aoTerminarSaida: () => void
}

/** Controla a abertura/fechamento animado de uma Folha. `aoFechar` roda quando a animação termina. */
export function useFolha(aoFechar: () => void): ControleFolha {
  const [saindo, setSaindo] = useState(false)
  const terminou = useRef(false)
  const fechar = useCallback(() => setSaindo(true), [])
  const aoTerminarSaida = useCallback(() => {
    if (terminou.current) return
    terminou.current = true
    aoFechar()
  }, [aoFechar])
  // Se a animação não chegar ao fim (aba em segundo plano, por exemplo), fecha mesmo assim.
  useEffect(() => {
    if (!saindo) return
    const t = setTimeout(aoTerminarSaida, 400)
    return () => clearTimeout(t)
  }, [saindo, aoTerminarSaida])
  return { saindo, fechar, aoTerminarSaida }
}

/** Painel que sobe de baixo no celular e vira janela no computador. */
export function Folha({
  controle,
  titulo,
  children,
  rodape,
}: {
  controle: ControleFolha
  titulo: string
  children: ReactNode
  rodape?: ReactNode
}) {
  const idTitulo = useId()
  const { saindo, fechar, aoTerminarSaida } = controle

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    const overflowAntes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', tecla)
    return () => {
      document.body.style.overflow = overflowAntes
      window.removeEventListener('keydown', tecla)
    }
  }, [fechar])

  // Renderizada direto no <body>: fica por cima de tudo (menu, páginas animadas).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div
        className={clsx('absolute inset-0 bg-black/50', saindo ? 'fundo-sair' : 'fundo-entrar')}
        onClick={fechar}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onAnimationEnd={(e) => {
          if (saindo && e.target === e.currentTarget) aoTerminarSaida()
        }}
        className={clsx(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-fundo shadow-2xl md:max-w-xl md:rounded-3xl',
          saindo ? 'folha-sair' : 'folha-entrar',
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-borda md:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-2 border-b border-borda px-4 py-2">
          <h2 id={idTitulo} className="text-lg font-bold">
            {titulo}
          </h2>
          <BotaoIcone rotulo="Fechar" onClick={fechar}>
            <X className="size-6" />
          </BotaoIcone>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {rodape && <div className="border-t border-borda px-4 pb-safe pt-3 [&>*]:mb-3">{rodape}</div>}
      </div>
    </div>,
    document.body,
  )
}
