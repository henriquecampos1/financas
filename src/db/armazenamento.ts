// Pede ao navegador que não apague os dados sozinho (o iOS pode limpar sites pouco usados).

export interface EstadoArmazenamento {
  /** null quando o navegador não informa. */
  protegido: boolean | null
  /** Bytes usados (estimativa), quando disponível. */
  usado?: number
}

export async function pedirArmazenamentoPersistente(): Promise<boolean | null> {
  const storage = navigator.storage
  if (!storage?.persist) return null
  try {
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    return null
  }
}

export async function lerEstadoArmazenamento(): Promise<EstadoArmazenamento> {
  const storage = navigator.storage
  if (!storage) return { protegido: null }
  try {
    const [protegido, estimativa] = await Promise.all([
      storage.persisted ? storage.persisted() : Promise.resolve(null),
      storage.estimate ? storage.estimate() : Promise.resolve(undefined),
    ])
    return { protegido, usado: estimativa?.usage }
  } catch {
    return { protegido: null }
  }
}
