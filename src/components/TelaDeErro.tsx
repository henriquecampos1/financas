// Tela mostrada se alguma parte do app quebrar: explica em português e deixa recarregar,
// em vez da tela padrão "Unexpected Application Error".
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useRouteError } from 'react-router'
import { Botao } from './ui'

export function TelaDeErro() {
  const erro = useRouteError()
  const detalhe = erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro)
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-fundo px-6 pb-safe pt-safe text-center">
      <span className="flex size-16 items-center justify-center rounded-[20px] bg-alerta/12 text-alerta">
        <TriangleAlert className="size-8" />
      </span>
      <h1 className="text-xl font-bold">Algo deu errado</h1>
      <p className="max-w-80 text-sm text-suave">
        Seus dados continuam guardados no aparelho. Recarregue o app; se o erro se repetir, mande um print desta tela
        com os detalhes abaixo.
      </p>
      <Botao className="w-full max-w-72" onClick={() => location.reload()}>
        <RefreshCw className="size-5" /> Recarregar o app
      </Botao>
      <a href="#/" onClick={() => setTimeout(() => location.reload(), 0)} className="min-h-11 text-sm font-semibold text-primaria">
        Voltar ao início
      </a>
      <details className="w-full max-w-80 text-left">
        <summary className="cursor-pointer text-xs text-suave">Detalhes técnicos</summary>
        <pre className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-cartao-2 p-3 text-xs">{detalhe}</pre>
      </details>
    </div>
  )
}
