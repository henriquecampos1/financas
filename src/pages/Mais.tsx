import clsx from 'clsx'
import {
  CalendarClock,
  ChevronRight,
  DatabaseBackup,
  Landmark,
  Lock,
  PiggyBank,
  Repeat,
  Settings,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Cabecalho, Cartao, TituloSecao } from '@/components/ui'

interface Item {
  texto: string
  descricao: string
  Icone: LucideIcon
  para?: string
  /** Etapa em que a função chega (item ainda desativado). */
  etapa?: number
}

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Organização',
    itens: [
      { texto: 'Categorias', descricao: 'Criar, editar, reordenar e arquivar', Icone: Tags, para: '/categorias' },
      { texto: 'Contas e cartões', descricao: 'Bancos, carteira, limites e faturas', Icone: Landmark, para: '/contas' },
    ],
  },
  {
    titulo: 'Controle',
    itens: [
      { texto: 'Recorrências', descricao: 'Assinaturas, aluguel, esporte, salário', Icone: Repeat, para: '/recorrencias' },
      { texto: 'Metas e caixinhas', descricao: 'Guardar dinheiro para um objetivo', Icone: PiggyBank, para: '/metas' },
      { texto: 'Compromissos futuros', descricao: 'Parcelas e fixas dos próximos ciclos', Icone: CalendarClock, para: '/compromissos' },
      { texto: 'Backup', descricao: 'Salvar, restaurar e exportar para Excel', Icone: DatabaseBackup, para: '/backup' },
      { texto: 'Bloqueio por PIN', descricao: 'Pedir um código ao abrir', Icone: Lock, para: '/seguranca' },
    ],
  },
  {
    titulo: 'App',
    itens: [{ texto: 'Ajustes', descricao: 'Ciclo, parcelamento, armazenamento', Icone: Settings, para: '/ajustes' }],
  },
]

function Linha({ item }: { item: Item }) {
  const conteudo = (
    <>
      <span
        className={clsx(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          item.para ? 'bg-primaria/12 text-primaria' : 'bg-cartao-2 text-suave',
        )}
      >
        <item.Icone className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{item.texto}</span>
        <span className="block truncate text-sm text-suave">{item.descricao}</span>
      </span>
      {item.para ? (
        <ChevronRight className="size-5 text-suave" />
      ) : (
        <span className="rounded-full bg-cartao-2 px-2 py-0.5 text-xs font-semibold text-suave">Etapa {item.etapa}</span>
      )}
    </>
  )
  const classe = 'flex min-h-16 items-center gap-3 px-4 py-2'
  return item.para ? (
    <Link to={item.para} className={clsx(classe, 'active:bg-cartao-2')}>
      {conteudo}
    </Link>
  ) : (
    <div className={clsx(classe, 'opacity-60')} aria-disabled>
      {conteudo}
    </div>
  )
}

export function Mais() {
  return (
    <>
      <Cabecalho titulo="Mais" />
      <div className="mx-auto max-w-2xl px-4 pb-4">
        {GRUPOS.map((g) => (
          <section key={g.titulo}>
            <TituloSecao>{g.titulo}</TituloSecao>
            <Cartao className="divide-y divide-borda overflow-hidden">
              {g.itens.map((item) => (
                <Linha key={item.texto} item={item} />
              ))}
            </Cartao>
          </section>
        ))}
      </div>
    </>
  )
}
