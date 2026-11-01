// O iPhone só abre o teclado se o foco acontecer durante o toque do usuário. Como o formulário
// abre depois (com animação), focamos um campo invisível no toque e o formulário "herda" o
// teclado ao focar o campo de valor. Chame no clique do botão que abre o formulário.
export function prepararTeclado(modo: 'decimal' | 'text' = 'decimal') {
  const temporario = document.createElement('input')
  temporario.setAttribute('inputmode', modo)
  temporario.setAttribute('aria-hidden', 'true')
  temporario.tabIndex = -1
  temporario.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;'
  document.body.appendChild(temporario)
  temporario.focus()
  setTimeout(() => temporario.remove(), 1500)
}

/** Lembra pequenas escolhas (último cartão, última conta) só neste aparelho. */
export function lembrar(chave: string, valor?: string): string | undefined {
  try {
    if (valor === undefined) return localStorage.getItem(`financas:${chave}`) ?? undefined
    localStorage.setItem(`financas:${chave}`, valor)
  } catch {
    // Sem acesso ao armazenamento (modo privado): só não lembra.
  }
  return valor
}
