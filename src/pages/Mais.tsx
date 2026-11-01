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
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Cabecalho, Cartao, MOLA, TituloSecao } from '@/components/ui'

interface Item {
  texto: string
  descricao: string
  Icone: LucideIcon
  /** Cor do quadradinho do ícone (como nos Ajustes do iPhone). */
  cor: string
  para: string
}

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Organização',
    itens: [
      { texto: 'Categorias', descricao: 'Criar, editar, reordenar e arquivar', Icone: Tags, cor: '#f08c00', para: '/categorias' },
      { texto: 'Contas e cartões', descricao: 'Bancos, carteira, limites e faturas', Icone: Landmark, cor: '#1c7ed6', para: '/contas' },
    ],
  },
  {
    titulo: 'Controle',
    itens: [
      { texto: 'Recorrências', descricao: 'Assinaturas, aluguel, esporte, salário', Icone: Repeat, cor: '#7048e8', para: '/recorrencias' },
      { texto: 'Metas e caixinhas', descricao: 'Guardar dinheiro para um objetivo', Icone: PiggyBank, cor: '#d6336c', para: '/metas' },
      { texto: 'Compromissos futuros', descricao: 'Parcelas e fixas dos próximos ciclos', Icone: CalendarClock, cor: '#0c8599', para: '/compromissos' },
    ],
  },
  {
    titulo: 'App',
    itens: [
      { texto: 'Backup', descricao: 'Salvar, restaurar e exportar para Excel', Icone: DatabaseBackup, cor: '#2f9e44', para: '/backup' },
      { texto: 'Bloqueio por PIN', descricao: 'Pedir um código ao abrir', Icone: Lock, cor: '#495057', para: '/seguranca' },
      { texto: 'Ajustes', descricao: 'Ciclo, parcelamento, armazenamento', Icone: Settings, cor: '#868e96', para: '/ajustes' },
    ],
  },
]

export function Mais() {
  let ordem = 0
  return (
    <>
      <Cabecalho titulo="Mais" />
      <div className="mx-auto max-w-2xl px-4 pb-4">
        {GRUPOS.map((g) => (
          <section key={g.titulo}>
            <TituloSecao>{g.titulo}</TituloSecao>
            <Cartao className="divide-y divide-borda overflow-hidden">
              {g.itens.map(({ texto, descricao, Icone, cor, para }) => (
                <motion.div
                  key={para}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...MOLA, delay: 0.03 * ordem++ }}
                >
                  <Link to={para} className="flex min-h-[68px] items-center gap-3.5 px-4 py-2 transition-colors active:bg-cartao-2">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: cor }}>
                      <Icone className="size-[21px]" strokeWidth={2.1} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{texto}</span>
                      <span className="block truncate text-[13px] text-suave">{descricao}</span>
                    </span>
                    <ChevronRight className="size-5 text-suave/70" />
                  </Link>
                </motion.div>
              ))}
            </Cartao>
          </section>
        ))}
        <p className="mt-8 text-center text-xs text-suave">Minhas Finanças · seus dados ficam só neste aparelho</p>
      </div>
    </>
  )
}
