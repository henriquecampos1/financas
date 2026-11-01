// Exportar e restaurar todos os dados do app.
import { TABELAS, montarBackup, validarBackup, type ArquivoBackup, type Tabela } from '@/utils/backup'
import { db, type BancoFinancas } from './banco'

export async function exportarBackup(banco: BancoFinancas = db): Promise<ArquivoBackup> {
  return banco.transaction('r', TABELAS.map((t) => banco.table(t)), async () => {
    const dados = {} as Record<Tabela, unknown[]>
    for (const t of TABELAS) dados[t] = await banco.table(t).toArray()
    return montarBackup(dados)
  })
}

/** Troca TODOS os dados do aparelho pelos do backup (confere o arquivo antes de apagar qualquer coisa). */
export async function importarBackup(conteudo: unknown, banco: BancoFinancas = db): Promise<ArquivoBackup> {
  const backup = validarBackup(conteudo)
  await banco.transaction('rw', TABELAS.map((t) => banco.table(t)), async () => {
    for (const t of TABELAS) {
      await banco.table(t).clear()
      await banco.table(t).bulkAdd(backup.dados[t])
    }
  })
  return backup
}
