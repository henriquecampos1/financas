// Bloqueio por PIN: tela cheia com teclado numérico ao abrir o app (e ao voltar depois de 1 minuto fora).
import clsx from 'clsx'
import { Delete, Lock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { apagarTudo } from '@/db/ajustes'
import { useAjustes } from '@/hooks/ajustes'
import { conferirPin } from '@/utils/pin'
import { Botao } from './ui'

/** Tempo fora do app que faz pedir o PIN de novo. */
const BLOQUEAR_APOS_MS = 60_000

function TelaBloqueio({
  guardado,
  tamanho,
  aoDesbloquear,
}: {
  guardado: string
  tamanho: number
  aoDesbloquear: () => void
}) {
  const [digitos, setDigitos] = useState('')
  const [errado, setErrado] = useState(false)
  const [esqueci, setEsqueci] = useState(false)
  const conferindo = useRef(false)

  const digitar = useCallback(
    async (d: string) => {
      if (conferindo.current) return
      const novo = (digitos + d).slice(0, tamanho)
      setDigitos(novo)
      setErrado(false)
      if (novo.length < tamanho) return
      conferindo.current = true
      const certo = await conferirPin(novo, guardado)
      conferindo.current = false
      if (certo) return aoDesbloquear()
      setErrado(true)
      setTimeout(() => setDigitos(''), 350)
    },
    [digitos, tamanho, guardado, aoDesbloquear],
  )

  // Teclado físico (computador).
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) void digitar(e.key)
      else if (e.key === 'Backspace') setDigitos((s) => s.slice(0, -1))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [digitar])

  async function apagar() {
    const resposta = window.prompt('Isso apaga TODOS os dados deste aparelho. Para confirmar, digite APAGAR:')
    if (resposta?.trim().toUpperCase() !== 'APAGAR') return
    await apagarTudo()
    location.reload()
  }

  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'apagar']
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-fundo px-6 pb-safe pt-safe">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primaria/12 text-primaria">
        <Lock className="size-7" />
      </span>
      <p className="text-lg font-semibold">{errado ? 'PIN incorreto' : 'Digite seu PIN'}</p>
      <div className={clsx('flex gap-3', errado && 'animar-tremer')} aria-live="polite" aria-label={`${digitos.length} de ${tamanho} dígitos`}>
        {Array.from({ length: tamanho }, (_, i) => (
          <span
            key={i}
            className={clsx(
              'size-4 rounded-full border-2 transition',
              errado ? 'border-perigo bg-perigo' : i < digitos.length ? 'border-primaria bg-primaria' : 'border-borda',
            )}
          />
        ))}
      </div>
      <div className="grid w-full max-w-72 grid-cols-3 gap-3">
        {teclas.map((t, i) =>
          t === '' ? (
            <span key={i} />
          ) : t === 'apagar' ? (
            <button
              key={i}
              type="button"
              aria-label="Apagar dígito"
              onClick={() => setDigitos((s) => s.slice(0, -1))}
              className="flex aspect-square items-center justify-center rounded-full text-suave active:bg-cartao-2"
            >
              <Delete className="size-7" />
            </button>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => void digitar(t)}
              className="flex aspect-square items-center justify-center rounded-full bg-cartao text-2xl font-semibold shadow-sm active:bg-cartao-2"
            >
              {t}
            </button>
          ),
        )}
      </div>
      {esqueci ? (
        <div className="max-w-80 space-y-2 text-center text-sm text-suave">
          <p>
            Sem o PIN não dá para entrar. A saída é apagar os dados deste aparelho e depois restaurar um backup em Mais →
            Backup.
          </p>
          <Botao variante="perigo" className="w-full" onClick={() => void apagar()}>
            Apagar tudo e recomeçar
          </Botao>
        </div>
      ) : (
        <button type="button" onClick={() => setEsqueci(true)} className="min-h-11 text-sm font-semibold text-primaria">
          Esqueci o PIN
        </button>
      )}
    </div>
  )
}

/** Mostra o app por baixo e a tela de bloqueio por cima enquanto o PIN não for digitado. */
export function Bloqueio({ children }: { children: ReactNode }) {
  const { pinHash, pinTamanho } = useAjustes()
  // Abre bloqueado se já havia PIN; ao criar um PIN agora, não bloqueia na hora.
  const [bloqueado, setBloqueado] = useState(() => !!pinHash)
  const escondidoEm = useRef<number | null>(null)

  useEffect(() => {
    const aoMudar = () => {
      if (document.visibilityState === 'hidden') escondidoEm.current = Date.now()
      else if (pinHash && escondidoEm.current && Date.now() - escondidoEm.current > BLOQUEAR_APOS_MS) setBloqueado(true)
    }
    document.addEventListener('visibilitychange', aoMudar)
    return () => document.removeEventListener('visibilitychange', aoMudar)
  }, [pinHash])

  return (
    <>
      <div aria-hidden={!!pinHash && bloqueado} className={clsx(pinHash && bloqueado && 'invisible')}>
        {children}
      </div>
      {pinHash && bloqueado && (
        <TelaBloqueio guardado={pinHash} tamanho={pinTamanho ?? 4} aoDesbloquear={() => setBloqueado(false)} />
      )}
    </>
  )
}
