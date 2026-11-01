// Mais → Bloqueio por PIN: ativar, trocar ou desativar.
import { Lock, LockOpen } from 'lucide-react'
import { useState } from 'react'
import { Botao, Cabecalho, Campo, Cartao, Entrada } from '@/components/ui'
import { definirPin, removerPin } from '@/db/ajustes'
import { useAjustes } from '@/hooks/ajustes'
import { conferirPin, pinValido } from '@/utils/pin'

type Modo = 'ativar' | 'trocar' | 'desativar' | null

function CampoPin({ rotulo, valor, aoMudar, autoFocus }: { rotulo: string; valor: string; aoMudar: (v: string) => void; autoFocus?: boolean }) {
  return (
    <Campo rotulo={rotulo}>
      <Entrada
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={6}
        autoFocus={autoFocus}
        value={valor}
        onChange={(e) => aoMudar(e.target.value.replace(/\D/g, ''))}
        className="text-center text-2xl tracking-[0.5em]"
      />
    </Campo>
  )
}

export function Seguranca() {
  const { pinHash } = useAjustes()
  const [modo, setModo] = useState<Modo>(null)
  const [atual, setAtual] = useState('')
  const [novo, setNovo] = useState('')
  const [repetido, setRepetido] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  function abrir(m: Modo) {
    setModo(m)
    setAtual('')
    setNovo('')
    setRepetido('')
    setErro('')
    setAviso('')
  }

  async function confirmar() {
    if (modo !== 'ativar' && !(pinHash && (await conferirPin(atual, pinHash)))) return setErro('O PIN atual está errado.')
    if (modo === 'desativar') {
      await removerPin()
      abrir(null)
      return setAviso('Bloqueio desativado.')
    }
    if (!pinValido(novo)) return setErro('O PIN precisa ter de 4 a 6 números.')
    if (novo !== repetido) return setErro('Os dois PINs não são iguais.')
    await definirPin(novo)
    abrir(null)
    setAviso(modo === 'ativar' ? 'PIN ativado. Ele será pedido ao abrir o app.' : 'PIN trocado.')
  }

  return (
    <>
      <Cabecalho titulo="Bloqueio por PIN" voltarPara="/mais" />
      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-6 pt-4">
        <Cartao className="flex items-start gap-3 p-4">
          {pinHash ? <Lock className="size-6 shrink-0 text-sucesso" /> : <LockOpen className="size-6 shrink-0 text-suave" />}
          <div className="text-sm">
            <p className="font-semibold">{pinHash ? 'PIN ativado' : 'Sem PIN'}</p>
            <p className="mt-1 text-suave">
              {pinHash
                ? 'O app pede o PIN ao abrir e quando você volta para ele depois de 1 minuto fora.'
                : 'Ative para que ninguém veja suas finanças se pegar o celular desbloqueado.'}{' '}
              O PIN protege a entrada no app; não há como recuperá-lo, então guarde-o bem (e mantenha backups).
            </p>
          </div>
        </Cartao>

        {aviso && <p className="rounded-xl bg-sucesso/10 p-3 text-sm font-medium text-sucesso">{aviso}</p>}

        {modo ? (
          <Cartao className="space-y-4 p-4">
            {modo !== 'ativar' && <CampoPin rotulo="PIN atual" valor={atual} aoMudar={setAtual} autoFocus />}
            {modo !== 'desativar' && (
              <>
                <CampoPin rotulo="Novo PIN (4 a 6 números)" valor={novo} aoMudar={setNovo} autoFocus={modo === 'ativar'} />
                <CampoPin rotulo="Repita o novo PIN" valor={repetido} aoMudar={setRepetido} />
              </>
            )}
            {erro && <p className="text-sm font-semibold text-perigo">{erro}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Botao variante="secundario" onClick={() => abrir(null)}>
                Cancelar
              </Botao>
              <Botao variante={modo === 'desativar' ? 'perigo' : 'primario'} onClick={() => void confirmar()}>
                Confirmar
              </Botao>
            </div>
          </Cartao>
        ) : pinHash ? (
          <div className="grid grid-cols-2 gap-2">
            <Botao variante="secundario" onClick={() => abrir('trocar')}>
              Trocar PIN
            </Botao>
            <Botao variante="perigo" onClick={() => abrir('desativar')}>
              Desativar
            </Botao>
          </div>
        ) : (
          <Botao className="w-full" onClick={() => abrir('ativar')}>
            <Lock className="size-5" /> Ativar PIN
          </Botao>
        )}
      </div>
    </>
  )
}
