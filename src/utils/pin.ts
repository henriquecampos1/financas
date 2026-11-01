// PIN de bloqueio: guardamos só um resumo (SHA-256 com "sal" aleatório), nunca o PIN em si.

export function pinValido(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

async function sha256(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** "sal:resumo" para guardar nos ajustes. */
export async function resumirPin(pin: string): Promise<string> {
  const sal = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${sal}:${await sha256(`${sal}:${pin}`)}`
}

export async function conferirPin(pin: string, guardado: string): Promise<boolean> {
  const [sal, resumo] = guardado.split(':')
  if (!sal || !resumo) return false
  return (await sha256(`${sal}:${pin}`)) === resumo
}
