// Campo de dinheiro: teclado numérico com vírgula, aceita "45", "45,9" e "1.234,56".
import clsx from 'clsx'
import { useState, type InputHTMLAttributes, type Ref } from 'react'
import { formatarNumero, lerReais } from '@/utils/dinheiro'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> & {
  /** Centavos (0 = vazio). */
  valor: number
  aoMudar: (centavos: number) => void
  tamanho?: 'normal' | 'grande'
  ref?: Ref<HTMLInputElement>
}

export function CampoValor({ valor, aoMudar, tamanho = 'normal', className, onBlur, ref, ...props }: Props) {
  const [texto, setTexto] = useState(valor ? formatarNumero(valor) : '')
  // Valor mudou por fora (ex.: "duplicar"): mostra o novo.
  const [ultimoValor, setUltimoValor] = useState(valor)
  if (valor !== ultimoValor) {
    setUltimoValor(valor)
    if ((lerReais(texto) ?? 0) !== valor) setTexto(valor ? formatarNumero(valor) : '')
  }

  const grande = tamanho === 'grande'
  return (
    <div
      className={clsx(
        'flex items-baseline gap-2 rounded-xl border border-borda bg-cartao px-3 focus-within:border-primaria focus-within:ring-2 focus-within:ring-primaria/30',
        grande ? 'py-2' : 'min-h-12',
        className,
      )}
    >
      <span className={clsx('font-semibold text-suave', grande ? 'text-2xl' : 'text-base')}>R$</span>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        value={texto}
        onChange={(e) => {
          const limpo = e.target.value.replace(/[^\d.,]/g, '')
          setTexto(limpo)
          const centavos = lerReais(limpo) ?? 0
          setUltimoValor(centavos)
          aoMudar(centavos)
        }}
        onBlur={(e) => {
          if (valor) setTexto(formatarNumero(valor))
          onBlur?.(e)
        }}
        className={clsx(
          'w-full min-w-0 bg-transparent font-bold text-texto placeholder:text-suave/50 focus:outline-none',
          grande ? 'py-1 text-4xl' : 'min-h-11 text-base',
        )}
        {...props}
      />
    </div>
  )
}
