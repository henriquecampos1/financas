// Componentes básicos de interface: alvos de toque grandes, cantos arredondados e animações com mola.
import clsx from 'clsx'
import { ChevronLeft, X } from 'lucide-react'
import { motion, useDragControls } from 'motion/react'
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

/** Mola padrão do app: rápida, sem "quicar" demais. */
export const MOLA = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const

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
        'tocavel inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold disabled:opacity-50',
        variante === 'primario' && 'bg-primaria text-primaria-texto shadow-[0_6px_16px_-6px_var(--primaria)]',
        variante === 'credito' && 'bg-credito text-primaria-texto shadow-[0_6px_16px_-6px_var(--credito)]',
        variante === 'secundario' && 'bg-cartao text-texto shadow-cartao',
        variante === 'perigo' && 'bg-perigo/10 text-perigo',
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
        'tocavel inline-flex size-11 shrink-0 items-center justify-center rounded-full text-suave hover:bg-cartao-2 disabled:opacity-30',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const classeCampo =
  'w-full min-h-[52px] rounded-2xl border border-borda bg-cartao px-4 text-texto placeholder:text-suave/60 transition focus:border-primaria focus:outline-none focus:ring-4 focus:ring-primaria/15'

export function Campo({ rotulo, children, dica }: { rotulo: string; children: ReactNode; dica?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] font-medium text-suave">{rotulo}</span>
      {children}
      {dica && <span className="mt-1.5 block px-1 text-xs text-suave">{dica}</span>}
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
  return <select className={clsx(classeCampo, 'appearance-none bg-[length:16px] pr-10', className)} style={{ backgroundImage: SETA, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }} {...props} />
}

// Seta do <select> (cinza neutro, funciona nos dois temas).
const SETA = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238f95a3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`

/** Seletor em pílulas: a pílula escolhida desliza até a opção tocada. */
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
  const grupo = useId()
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex gap-1 rounded-2xl bg-cartao-2 p-1">
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
              'relative min-h-10 flex-1 rounded-xl px-2 text-sm font-semibold transition-colors duration-200',
              ativo ? 'text-texto' : 'text-suave',
            )}
          >
            {ativo && (
              <motion.span
                layoutId={`pilula-${grupo}`}
                transition={MOLA}
                className="absolute inset-0 rounded-xl bg-cartao shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
              />
            )}
            <span className="relative">{o.texto}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('rounded-3xl bg-cartao shadow-cartao', className)}>{children}</div>
}

export function TituloSecao({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between gap-2 px-1">
      <h2 className="text-[19px] font-bold tracking-tight">{children}</h2>
      {extra}
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-3xl border border-dashed border-borda px-5 py-7 text-center text-sm text-suave">{children}</p>
  )
}

/** Ícone da categoria: emoji num quadradinho arredondado com a cor dela bem clarinha. */
export function IconeCategoria({ icone, cor, tamanho = 'md' }: { icone: string; cor: string; tamanho?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'flex shrink-0 items-center justify-center',
        tamanho === 'md' ? 'size-11 rounded-[14px] text-[22px]' : 'size-16 rounded-[20px] text-[32px]',
      )}
      style={{ backgroundColor: `color-mix(in srgb, ${cor} 16%, transparent)` }}
    >
      {icone}
    </span>
  )
}

/**
 * Topo das páginas no estilo do iPhone: título grande que, ao rolar, encolhe para a barra de cima.
 * `children` (ex.: seletor de ciclo) fica preso logo abaixo da barra.
 */
export function Cabecalho({
  titulo,
  subtitulo,
  voltarPara,
  acoes,
  children,
}: {
  titulo: string
  /** Linha pequena acima do título grande (ex.: a data de hoje). */
  subtitulo?: ReactNode
  /** Mostra a seta de voltar; este endereço é usado quando não há tela anterior (ex.: "/mais"). */
  voltarPara?: string
  acoes?: ReactNode
  /** Conteúdo preso abaixo da barra (ex.: seletor de ciclo). */
  children?: ReactNode
}) {
  const navigate = useNavigate()
  const { key } = useLocation()
  const barra = useRef<HTMLElement>(null)
  const sentinela = useRef<HTMLDivElement>(null)
  const [compacto, setCompacto] = useState(false)
  // Volta para a tela anterior; se a página foi a primeira aberta, vai para `voltarPara`.
  const voltar = () => (key !== 'default' ? navigate(-1) : navigate(voltarPara!, { replace: true }))

  useEffect(() => {
    const el = sentinela.current
    if (!el) return
    // Compacta quando o fim do título grande passa por baixo da barra (altura real, com o notch).
    const altura = barra.current?.offsetHeight ?? 48
    const obs = new IntersectionObserver(([e]) => setCompacto(!e.isIntersecting), {
      rootMargin: `-${altura}px 0px 0px 0px`,
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const fundoPreso = 'bg-[var(--vidro-topo)] [-webkit-backdrop-filter:saturate(180%)_blur(20px)] [backdrop-filter:saturate(180%)_blur(20px)]'
  return (
    <>
      <header
        ref={barra}
        className={clsx(
          'sticky top-0 z-30 pt-safe transition-[background-color,box-shadow] duration-300',
          compacto && fundoPreso,
          compacto && !children && 'shadow-[0_1px_0_var(--borda)]',
        )}
      >
        <div className="mx-auto flex h-12 max-w-2xl items-center gap-1 px-2">
          <div className="flex w-24 justify-start">
            {voltarPara && (
              <BotaoIcone rotulo="Voltar" className="text-primaria!" onClick={voltar}>
                <ChevronLeft className="size-7" strokeWidth={2.25} />
              </BotaoIcone>
            )}
          </div>
          <motion.p
            aria-hidden
            initial={false}
            animate={{ opacity: compacto ? 1 : 0, y: compacto ? 0 : 6 }}
            transition={{ duration: 0.2 }}
            className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold"
          >
            {titulo}
          </motion.p>
          <div className="flex w-24 items-center justify-end">{acoes}</div>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-5 pb-2">
        {subtitulo && <p className="text-[13px] font-semibold uppercase tracking-wide text-suave">{subtitulo}</p>}
        <h1 className="text-[32px] font-bold leading-tight tracking-tight">{titulo}</h1>
        <div ref={sentinela} className="h-px" />
      </div>
      {children && (
        <div
          className={clsx(
            'sticky z-20 transition-[background-color,box-shadow] duration-300',
            'top-[calc(env(safe-area-inset-top)+3rem)]',
            compacto && fundoPreso,
            compacto && 'shadow-[0_1px_0_var(--borda)]',
          )}
        >
          <div className="mx-auto max-w-2xl px-4 pb-2.5 pt-1">{children}</div>
        </div>
      )}
    </>
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
    const t = setTimeout(aoTerminarSaida, 450)
    return () => clearTimeout(t)
  }, [saindo, aoTerminarSaida])
  return { saindo, fechar, aoTerminarSaida }
}

function useTelaGrande(): boolean {
  const [grande] = useState(() => window.matchMedia?.('(min-width: 768px)').matches ?? false)
  return grande
}

/**
 * Painel que sobe de baixo no celular (com mola, e fecha arrastando para baixo pela alça)
 * e vira janela centralizada no computador.
 */
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
  const arraste = useDragControls()
  const grande = useTelaGrande()

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

  const fora = grande ? { opacity: 0, scale: 0.96, y: 16 } : { y: '100%' }
  const dentro = grande ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }

  // Desenhada direto no <body>: fica por cima de tudo (menu, páginas animadas).
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <motion.div
        className="absolute inset-0 bg-black/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: saindo ? 0 : 1 }}
        transition={{ duration: saindo ? 0.2 : 0.3 }}
        onClick={fechar}
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        initial={fora}
        animate={saindo ? fora : dentro}
        transition={saindo ? { duration: 0.24, ease: [0.4, 0, 1, 1] } : { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
        onAnimationComplete={() => saindo && aoTerminarSaida()}
        drag={grande ? false : 'y'}
        dragControls={arraste}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.85 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 650) fechar()
        }}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-fundo shadow-2xl md:max-w-xl md:rounded-[28px]"
      >
        {/* Alça + título: arrastar daqui para baixo fecha o painel. */}
        <div onPointerDown={(e) => !grande && arraste.start(e)} className="shrink-0 cursor-grab touch-none">
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-suave/30 md:hidden" aria-hidden />
          <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-2">
            <h2 id={idTitulo} className="text-lg font-bold tracking-tight">
              {titulo}
            </h2>
            <BotaoIcone rotulo="Fechar" className="-mr-2 bg-cartao-2" onClick={fechar}>
              <X className="size-5" strokeWidth={2.5} />
            </BotaoIcone>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">{children}</div>
        {rodape && <div className="border-t border-borda px-5 pb-safe pt-3 [&>*]:mb-3">{rodape}</div>}
      </motion.div>
    </div>,
    document.body,
  )
}
