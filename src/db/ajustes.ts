import { resumirPin } from '@/utils/pin'
import { db, type BancoFinancas } from './banco'
import { AJUSTES_PADRAO } from './padroes'
import type { Ajustes } from './tipos'

export async function lerAjustes(banco: BancoFinancas = db): Promise<Ajustes> {
  return { ...AJUSTES_PADRAO, ...(await banco.ajustes.get('app')) }
}

export async function salvarAjustes(mudancas: Partial<Omit<Ajustes, 'id'>>, banco: BancoFinancas = db) {
  await banco.transaction('rw', banco.ajustes, async () => {
    const atual = await lerAjustes(banco)
    await banco.ajustes.put({ ...atual, ...mudancas, id: 'app' })
  })
}

export async function definirPin(pin: string, banco: BancoFinancas = db) {
  await salvarAjustes({ pinHash: await resumirPin(pin), pinTamanho: pin.length }, banco)
}

export async function removerPin(banco: BancoFinancas = db) {
  await salvarAjustes({ pinHash: undefined, pinTamanho: undefined }, banco)
}

/** Apaga todos os dados do aparelho. Na próxima abertura o banco volta com as categorias padrão. */
export async function apagarTudo(banco: BancoFinancas = db) {
  await banco.delete()
}
