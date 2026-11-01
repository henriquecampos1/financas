// Todo valor em dinheiro é guardado em centavos (número inteiro): R$ 1.234,56 → 123456.

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const numero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 123456 → "R$ 1.234,56" (com espaço comum, não o espaço especial do Intl). */
export function formatarReais(centavos: number): string {
  return moeda.format(centavos / 100).replace(/\s/g, ' ')
}

const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

/** Valor curto para gráficos: 23790 → "R$ 238"; 173793 → "R$ 1,7 mil"; 1250000 → "R$ 12,5 mil". */
export function formatarCompacto(centavos: number): string {
  const reais = centavos / 100
  if (Math.abs(reais) < 1000) return `R$ ${Math.round(reais)}`
  return `R$ ${compacto.format(reais).replace(/\s/g, ' ')}`
}

/** 123456 → "1.234,56" (sem o símbolo; para campos de edição). */
export function formatarNumero(centavos: number): string {
  return numero.format(centavos / 100)
}

/**
 * Texto digitado → centavos. Aceita "1.234,56", "1234,5", "R$ 80", "12.50" e "1.234".
 * Vazio ou inválido → null. Valores negativos não são aceitos.
 */
export function lerReais(texto: string): number | null {
  let limpo = texto.replace(/R\$|\s/g, '')
  if (!limpo) return null
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+\.\d{1,2}$/.test(limpo)) {
    // "12.50": um ponto só com 1 ou 2 casas é separador decimal.
  } else {
    limpo = limpo.replace(/\./g, '')
  }
  const partes = /^(\d+)(?:\.(\d*))?$/.exec(limpo)
  if (!partes) return null
  const inteiro = Number(partes[1])
  const fracao = (partes[2] ?? '').padEnd(3, '0')
  const centavos = Number(fracao.slice(0, 2)) + (Number(fracao[2]) >= 5 ? 1 : 0)
  return inteiro * 100 + centavos
}

/**
 * Campo "estilo banco": os dígitos digitados preenchem da direita para a esquerda.
 * "1" → 1 (R$ 0,01); "1234" → 1234 (R$ 12,34). Ignora tudo que não é dígito.
 */
export function centavosDosDigitos(texto: string): number {
  const digitos = texto.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11)
  return digitos ? Number(digitos) : 0
}

/** Soma de centavos (atalho legível). */
export function somar(valores: number[]): number {
  return valores.reduce((a, b) => a + b, 0)
}
