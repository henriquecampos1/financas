// Dados que o app já traz na primeira abertura (e depois de "Apagar tudo").
import type { Ajustes, Categoria } from './tipos'

export const AJUSTES_PADRAO: Ajustes = {
  id: 'app',
  diaInicioCiclo: 1,
  modoParcelas: 'por-parcela',
}

/** Cores sugeridas para categorias, cartões e contas (legíveis nos dois temas). */
export const PALETA = [
  '#e8590c',
  '#f08c00',
  '#2f9e44',
  '#66a80f',
  '#0c8599',
  '#1c7ed6',
  '#364fc7',
  '#5f3dc4',
  '#ae3ec9',
  '#d6336c',
  '#e03131',
  '#868e96',
]

/** Emojis sugeridos no editor de categoria. */
export const EMOJIS_SUGERIDOS = [
  '🍽️', '🛒', '🚗', '⛽', '🚌', '🎉', '🛍️', '💊',
  '🏥', '🏠', '💡', '📺', '📚', '🎓', '✈️', '🏖️',
  '🐶', '👶', '💇', '👕', '🎮', '🍺', '☕', '🍕',
  '🏋️', '🎁', '📱', '💻', '🔧', '🧾', '💳', '🏦',
  '💰', '💼', '📈', '💵', '🪙', '❤️', '⭐', '📦',
  '⚽', '🎾', '🚴', '🚕', '🅿️', '🛠️', '💅', '🧹',
]

type CategoriaPadrao = Omit<Categoria, 'ordem' | 'arquivada'>

const DESPESAS: CategoriaPadrao[] = [
  { id: 'cat-alimentacao', nome: 'Alimentação', icone: '🍽️', cor: '#e8590c', tipo: 'despesa' },
  { id: 'cat-mercado', nome: 'Mercado', icone: '🛒', cor: '#2f9e44', tipo: 'despesa' },
  { id: 'cat-transporte', nome: 'Transporte', icone: '🚗', cor: '#1c7ed6', tipo: 'despesa' },
  { id: 'cat-lazer', nome: 'Lazer', icone: '🎉', cor: '#ae3ec9', tipo: 'despesa' },
  { id: 'cat-compras', nome: 'Compras', icone: '🛍️', cor: '#d6336c', tipo: 'despesa' },
  { id: 'cat-saude', nome: 'Saúde', icone: '💊', cor: '#e03131', tipo: 'despesa' },
  { id: 'cat-moradia', nome: 'Moradia', icone: '🏠', cor: '#f08c00', tipo: 'despesa' },
  { id: 'cat-assinaturas', nome: 'Assinaturas', icone: '📺', cor: '#5f3dc4', tipo: 'despesa' },
  { id: 'cat-educacao', nome: 'Educação', icone: '📚', cor: '#0c8599', tipo: 'despesa' },
  { id: 'cat-outros', nome: 'Outros', icone: '📦', cor: '#868e96', tipo: 'despesa' },
]

const RECEITAS: CategoriaPadrao[] = [
  { id: 'cat-salario', nome: 'Salário', icone: '💰', cor: '#2f9e44', tipo: 'receita' },
  { id: 'cat-renda-extra', nome: 'Renda extra', icone: '💼', cor: '#1c7ed6', tipo: 'receita' },
  { id: 'cat-rendimentos', nome: 'Rendimentos', icone: '📈', cor: '#0c8599', tipo: 'receita' },
  { id: 'cat-outras-receitas', nome: 'Outras receitas', icone: '💵', cor: '#868e96', tipo: 'receita' },
]

export function categoriasPadrao(): Categoria[] {
  return [...DESPESAS, ...RECEITAS].map((c, i) => ({ ...c, arquivada: false, ordem: i }))
}
