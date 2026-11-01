// Planejamento de cada ciclo: limites por categoria, renda prevista e meta de economia.
import type { Ciclo } from '@/utils/ciclo'
import { db, novoId, type BancoFinancas } from './banco'
import type { Plano } from './tipos'

export type DadosPlano = Pick<Plano, 'limites' | 'rendaPrevista' | 'metaEconomia'>

/**
 * Plano do ciclo. Procura pelo início exato e, se o dia de início do ciclo tiver mudado depois,
 * aceita um plano que comece dentro do ciclo.
 */
export async function planoDoCiclo(ciclo: Ciclo, banco: BancoFinancas = db): Promise<Plano | undefined> {
  const exato = await banco.planos.where('inicio').equals(ciclo.inicio).first()
  if (exato) return exato
  return banco.planos.where('inicio').between(ciclo.inicio, ciclo.fim, true, true).first()
}

/** Plano mais recente que começa antes deste ciclo (para copiar). */
export async function planoAnterior(ciclo: Ciclo, banco: BancoFinancas = db): Promise<Plano | undefined> {
  return banco.planos.where('inicio').below(ciclo.inicio).last()
}

/** Cria ou atualiza o plano do ciclo. Limites zerados são descartados. */
export async function salvarPlano(ciclo: Ciclo, dados: DadosPlano, banco: BancoFinancas = db): Promise<string> {
  return banco.transaction('rw', banco.planos, async () => {
    const existente = await planoDoCiclo(ciclo, banco)
    const plano: Plano = {
      id: existente?.id ?? novoId(),
      inicio: ciclo.inicio,
      fim: ciclo.fim,
      limites: dados.limites.filter((l) => l.limite > 0),
      rendaPrevista: Math.max(0, dados.rendaPrevista),
      metaEconomia: Math.max(0, dados.metaEconomia),
    }
    await banco.planos.put(plano)
    return plano.id
  })
}

/** Copia limites, renda e meta do plano anterior para este ciclo. Devolve false se não houver de onde copiar. */
export async function copiarPlanoAnterior(ciclo: Ciclo, banco: BancoFinancas = db): Promise<boolean> {
  const origem = await planoAnterior(ciclo, banco)
  if (!origem) return false
  await salvarPlano(ciclo, { limites: origem.limites, rendaPrevista: origem.rendaPrevista, metaEconomia: origem.metaEconomia }, banco)
  return true
}

export async function excluirPlano(id: string, banco: BancoFinancas = db) {
  await banco.planos.delete(id)
}
