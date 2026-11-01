import clsx from 'clsx'
import { ArrowLeftRight, ChartPie, Ellipsis, House, Plus, Target } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { ProvedorEditor, useEditor } from '@/hooks/editor'
import { useGeradorRecorrencias } from '@/hooks/recorrencias'

const ABAS = [
  { para: '/', texto: 'Início', Icone: House },
  { para: '/transacoes', texto: 'Transações', Icone: ArrowLeftRight },
  { para: '/plano', texto: 'Plano', Icone: Target },
  { para: '/analises', texto: 'Análises', Icone: ChartPie },
  { para: '/mais', texto: 'Mais', Icone: Ellipsis },
]

/** Páginas abertas a partir de outra aba (a aba de origem fica acesa nelas). */
const PAGINAS_DA_ABA: Record<string, string[]> = {
  '/transacoes': ['/transacoes', '/fatura'],
  '/mais': ['/mais', '/categorias', '/ajustes', '/contas', '/recorrencias', '/metas', '/compromissos', '/backup', '/seguranca'],
}

/** Telas onde aparece o botão "+". */
const COM_BOTAO_NOVO = ['/', '/transacoes', '/fatura']

function indiceDaAba(caminho: string): number {
  const i = ABAS.findIndex(({ para }) =>
    para === '/' ? caminho === '/' : (PAGINAS_DA_ABA[para] ?? [para]).some((p) => caminho.startsWith(p)),
  )
  return i < 0 ? 0 : i
}

function BotaoNovo() {
  const { escolher } = useEditor()
  return (
    <button
      type="button"
      onClick={escolher}
      aria-label="Novo lançamento"
      className="fixed right-4 z-40 flex size-16 items-center justify-center rounded-full bg-primaria text-primaria-texto shadow-lg shadow-black/25 transition active:scale-95"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
    >
      <Plus className="size-8" strokeWidth={2.5} />
    </button>
  )
}

export function Layout() {
  useGeradorRecorrencias()
  const { pathname } = useLocation()
  const indice = indiceDaAba(pathname)
  const indiceAnterior = useRef(indice)
  const direcao = indice >= indiceAnterior.current ? 'direita' : 'esquerda'
  useEffect(() => {
    indiceAnterior.current = indice
  }, [indice])
  const comBotaoNovo = COM_BOTAO_NOVO.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)))

  return (
    <ProvedorEditor>
      <div className="min-h-dvh overflow-x-clip pl-safe pr-safe">
        {/* A chave muda a cada página: a nova entra deslizando do lado da aba escolhida. */}
        <main key={pathname} className={clsx('pb-36', `animar-pagina-${direcao}`)}>
          <Outlet />
        </main>
        <ScrollRestoration />

        {comBotaoNovo && <BotaoNovo />}

        <nav
          aria-label="Navegação principal"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-cartao/95 pb-safe backdrop-blur"
        >
          <div className="mx-auto grid max-w-2xl grid-cols-5">
            {ABAS.map(({ para, texto, Icone }, i) => (
              <NavLink
                key={para}
                to={para}
                end={para === '/'}
                className={clsx(
                  'flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors duration-200',
                  i === indice ? 'text-primaria' : 'text-suave',
                )}
              >
                <Icone className="size-6" strokeWidth={i === indice ? 2.4 : 2} />
                <span className="whitespace-nowrap">{texto}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </ProvedorEditor>
  )
}
