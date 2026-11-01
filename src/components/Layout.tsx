import clsx from 'clsx'
import { ArrowLeftRight, ChartPie, Ellipsis, House, Plus, Target } from 'lucide-react'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import { useRef, useState } from 'react'
import { NavLink, ScrollRestoration, useLocation, useOutlet } from 'react-router'
import { ProvedorEditor, useEditor } from '@/hooks/editor'
import { useGeradorRecorrencias } from '@/hooks/recorrencias'
import { MOLA } from './ui'

const ABAS = [
  { para: '/', texto: 'Início', Icone: House },
  { para: '/transacoes', texto: 'Transações', Icone: ArrowLeftRight },
  { para: '/plano', texto: 'Plano', Icone: Target },
  { para: '/analises', texto: 'Análises', Icone: ChartPie },
  { para: '/mais', texto: 'Mais', Icone: Ellipsis },
]

/** Telas abertas a partir de uma aba (ficam "por cima" dela, como no iPhone). */
const SUBPAGINAS: Record<string, string[]> = {
  '/transacoes': ['/fatura'],
  '/mais': ['/categorias', '/ajustes', '/contas', '/recorrencias', '/metas', '/compromissos', '/backup', '/seguranca'],
}

function posicao(caminho: string): { aba: number; profundidade: number } {
  for (const [i, { para }] of ABAS.entries()) {
    if (SUBPAGINAS[para]?.some((p) => caminho.startsWith(p))) return { aba: i, profundidade: 1 }
  }
  const aba = ABAS.findIndex(({ para }) => (para === '/' ? caminho === '/' : caminho.startsWith(para)))
  return { aba: aba < 0 ? 0 : aba, profundidade: 0 }
}

type Direcao = 'direita' | 'esquerda' | 'empurrar' | 'voltar'

// Troca de aba: a página nova desliza um pouco do lado da aba e aparece; a antiga some.
// Subpágina: entra da direita por cima (empurrar) e sai para a direita (voltar), como no iPhone.
// A que sai some rápido (sem as duas telas ficarem sobrepostas); a que entra assenta com mola.
const SAIDA = { x: { type: 'spring', stiffness: 420, damping: 40 }, opacity: { duration: 0.09, ease: 'easeOut' } } as const
const ENTRADA = { x: MOLA, opacity: { duration: 0.2, delay: 0.04, ease: 'easeOut' } } as const

const PAGINA: Variants = {
  entrar: (d: Direcao) =>
    d === 'empurrar' ? { x: '32%', opacity: 0 } : d === 'voltar' ? { x: '-14%', opacity: 0 } : { x: d === 'direita' ? 24 : -24, opacity: 0 },
  centro: { x: 0, opacity: 1, transition: ENTRADA },
  sair: (d: Direcao) => ({
    ...(d === 'empurrar' ? { x: '-14%' } : d === 'voltar' ? { x: '32%' } : { x: d === 'direita' ? -24 : 24 }),
    opacity: 0,
    transition: SAIDA,
  }),
}

/** Guarda a página como estava, para ela poder sair animando enquanto a nova entra. */
function PaginaCongelada() {
  const pagina = useOutlet()
  const [congelada] = useState(pagina)
  return congelada
}

function BarraDeAbas({ ativa }: { ativa: number }) {
  const { escolher } = useEditor()
  return (
    <nav aria-label="Navegação principal" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-safe pl-safe pr-safe">
      <div className="pointer-events-auto mx-auto mb-2 flex max-w-xl items-center gap-2 px-3">
        <div className="vidro flex min-w-0 flex-1 items-center rounded-[28px] p-1 shadow-flutuante">
          {ABAS.map(({ para, texto, Icone }, i) => {
            const ativo = i === ativa
            return (
              <NavLink
                key={para}
                to={para}
                end={para === '/'}
                aria-current={ativo ? 'page' : undefined}
                className={clsx(
                  'relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[24px] text-[10px] font-semibold tracking-tight transition-colors duration-200 active:scale-95',
                  ativo ? 'text-primaria' : 'text-suave',
                )}
              >
                {ativo && (
                  <motion.span layoutId="aba-ativa" transition={MOLA} className="absolute inset-0 rounded-[24px] bg-primaria/12" />
                )}
                <Icone className="relative size-[22px]" strokeWidth={ativo ? 2.3 : 1.9} />
                <span className="relative max-w-full truncate px-0.5">{texto}</span>
              </NavLink>
            )
          })}
        </div>
        <motion.button
          type="button"
          onClick={escolher}
          aria-label="Novo lançamento"
          whileTap={{ scale: 0.88 }}
          transition={MOLA}
          className="flex size-[62px] shrink-0 items-center justify-center rounded-full bg-primaria text-primaria-texto shadow-flutuante"
          style={{ backgroundImage: 'linear-gradient(145deg, rgb(255 255 255 / 0.22), transparent 55%)' }}
        >
          <Plus className="size-7" strokeWidth={2.6} />
        </motion.button>
      </div>
    </nav>
  )
}

export function Layout() {
  useGeradorRecorrencias()
  const { pathname } = useLocation()
  const atual = posicao(pathname)
  const anterior = useRef(atual)
  const direcao = useRef<Direcao>('direita')
  if (anterior.current.aba !== atual.aba || anterior.current.profundidade !== atual.profundidade) {
    if (atual.profundidade > anterior.current.profundidade) direcao.current = 'empurrar'
    else if (atual.profundidade < anterior.current.profundidade) direcao.current = 'voltar'
    else direcao.current = atual.aba >= anterior.current.aba ? 'direita' : 'esquerda'
    anterior.current = atual
  }

  return (
    <ProvedorEditor>
      <div className="relative min-h-dvh overflow-x-clip pl-safe pr-safe">
        <AnimatePresence mode="popLayout" initial={false} custom={direcao.current}>
          <motion.main
            key={pathname}
            custom={direcao.current}
            variants={PAGINA}
            initial="entrar"
            animate="centro"
            exit="sair"
            className="min-h-dvh bg-fundo pb-[calc(env(safe-area-inset-bottom)+7rem)]"
          >
            <PaginaCongelada />
          </motion.main>
        </AnimatePresence>
        <ScrollRestoration />
        <BarraDeAbas ativa={atual.aba} />
      </div>
    </ProvedorEditor>
  )
}
