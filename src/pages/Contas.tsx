// Mais → Contas e cartões.
import { ChevronDown, ChevronRight, Plus, Wifi } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { EditorCartao, EditorConta } from '@/components/EditoresConta'
import { BarraLimite, fundoDoCartao } from '@/components/ResumoCartoes'
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
                className="flex min-h-[68px] w-full items-center gap-3 px-4 text-left transition-colors active:bg-cartao-2"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: c.cor }}
                  aria-hidden
                >
                  {c.nome.charAt(0).toUpperCase()}
                </span>
                <span className={clsx('min-w-0 flex-1 truncate font-semibold', c.arquivada && 'text-suave')}>
                  {c.nome}
                  {c.arquivada && ' (arquivada)'}
                </span>
                <span className="numeros font-semibold">{formatarReais(saldos?.get(c.id) ?? c.saldoInicial)}</span>
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
                className={clsx(
                  'tocavel relative block w-full overflow-hidden rounded-[26px] p-5 text-left text-white shadow-flutuante',
                  c.arquivado && 'opacity-60',
                )}
                style={fundoDoCartao(c.cor)}
              >
                <span className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-white/10" aria-hidden />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-lg font-semibold">
                      {c.nome}
                      {c.arquivado && ' (arquivado)'}
                    </span>
                    <Wifi className="size-5 rotate-90 text-white/80" aria-hidden />
                  </div>
                  <p className="text-sm text-white/80">
                    Fecha dia {c.diaFechamento} · vence dia {c.diaVencimento}
                  </p>
                  {c.limite > 0 ? (
                    <BarraLimite usado={usados?.get(c.id) ?? 0} limite={c.limite} clara />
                  ) : (
                    <p className="text-xs text-white/75">Limite não informado</p>
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
