// Mais → Contas e cartões.
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { EditorCartao, EditorConta } from '@/components/EditoresConta'
import { BarraLimite } from '@/components/ResumoCartoes'
import { Botao, Cabecalho, Cartao, TituloSecao, Vazio } from '@/components/ui'
import type { Cartao as TipoCartao, Conta } from '@/db/tipos'
import { useCartoes, useContas, useLimitesUsados, useSaldosDasContas } from '@/hooks/dados'
import { formatarReais } from '@/utils/dinheiro'

type Edicao = { tipo: 'conta'; conta?: Conta } | { tipo: 'cartao'; cartao?: TipoCartao } | null

export function Contas() {
  const contas = useContas()
  const cartoes = useCartoes()
  const saldos = useSaldosDasContas()
  const usados = useLimitesUsados()
  const [edicao, setEdicao] = useState<Edicao>(null)
  const [verArquivados, setVerArquivados] = useState(false)

  const cartoesVisiveis = (cartoes ?? []).filter((c) => verArquivados || !c.arquivado)
  const contasVisiveis = (contas ?? []).filter((c) => verArquivados || !c.arquivada)
  const arquivados = (cartoes ?? []).filter((c) => c.arquivado).length + (contas ?? []).filter((c) => c.arquivada).length
  const totalContas = (contas ?? []).filter((c) => !c.arquivada).reduce((s, c) => s + (saldos?.get(c.id) ?? 0), 0)

  return (
    <>
      <Cabecalho titulo="Contas e cartões" voltarPara="/mais" />
      <div className="mx-auto max-w-2xl px-4 pb-6">
        <TituloSecao extra={contas && contas.length > 0 && <span className="text-sm font-semibold">{formatarReais(totalContas)}</span>}>
          Contas
        </TituloSecao>
        {contasVisiveis.length ? (
          <Cartao className="divide-y divide-borda overflow-hidden">
            {contasVisiveis.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setEdicao({ tipo: 'conta', conta: c })}
                className="flex min-h-16 w-full items-center gap-3 px-4 text-left active:bg-cartao-2"
              >
                <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} aria-hidden />
                <span className={clsx('min-w-0 flex-1 truncate font-medium', c.arquivada && 'text-suave')}>
                  {c.nome}
                  {c.arquivada && ' (arquivada)'}
                </span>
                <span className="font-semibold">{formatarReais(saldos?.get(c.id) ?? c.saldoInicial)}</span>
                <ChevronRight className="size-5 text-suave" />
              </button>
            ))}
          </Cartao>
        ) : (
          contas && <Vazio>Cadastre as contas onde seu dinheiro fica: Nubank, Itaú, Carteira...</Vazio>
        )}
        <Botao variante="secundario" className="mt-3 w-full" onClick={() => setEdicao({ tipo: 'conta' })}>
          <Plus className="size-5" /> Nova conta
        </Botao>

        <TituloSecao>Cartões de crédito</TituloSecao>
        {cartoesVisiveis.length ? (
          <div className="space-y-3">
            {cartoesVisiveis.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setEdicao({ tipo: 'cartao', cartao: c })}
                className="block w-full overflow-hidden rounded-2xl border border-borda bg-cartao text-left active:scale-[0.99]"
              >
                <div className="h-1.5" style={{ backgroundColor: c.cor }} aria-hidden />
                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <span className={clsx('min-w-0 flex-1 truncate font-semibold', c.arquivado && 'text-suave')}>
                      {c.nome}
                      {c.arquivado && ' (arquivado)'}
                    </span>
                    <ChevronRight className="size-5 text-suave" />
                  </div>
                  <p className="text-sm text-suave">
                    Fecha dia {c.diaFechamento} · vence dia {c.diaVencimento}
                  </p>
                  {c.limite > 0 ? (
                    <BarraLimite usado={usados?.get(c.id) ?? 0} limite={c.limite} />
                  ) : (
                    <p className="text-xs text-suave">Limite não informado</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          cartoes && <Vazio>Cadastre seus cartões para lançar compras no crédito e acompanhar as faturas.</Vazio>
        )}
        <Botao variante="secundario" className="mt-3 w-full" onClick={() => setEdicao({ tipo: 'cartao' })}>
          <Plus className="size-5" /> Novo cartão
        </Botao>

        {arquivados > 0 && (
          <Botao variante="fantasma" className="mt-6 w-full" onClick={() => setVerArquivados((v) => !v)}>
            {verArquivados ? 'Esconder arquivados' : `Mostrar arquivados (${arquivados})`}
            <ChevronDown className={clsx('size-4 transition', verArquivados && 'rotate-180')} />
          </Botao>
        )}
      </div>

      {edicao?.tipo === 'conta' && <EditorConta conta={edicao.conta} aoFechar={() => setEdicao(null)} />}
      {edicao?.tipo === 'cartao' && <EditorCartao cartao={edicao.cartao} aoFechar={() => setEdicao(null)} />}
    </>
  )
}
