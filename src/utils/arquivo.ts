// Entregar um arquivo gerado pelo app. No celular abre a folha de compartilhar do sistema
// (no iPhone: "Salvar em Arquivos", iCloud, WhatsApp...); no computador, baixa direto.

/** true = entregue; false = a pessoa cancelou. */
export async function salvarArquivo(nome: string, conteudo: string, tipo: string): Promise<boolean> {
  const arquivo = new File([conteudo], nome, { type: tipo })
  const toque = window.matchMedia?.('(pointer: coarse)').matches
  if (toque && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nome })
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      // Outro erro ao compartilhar: tenta o download comum.
    }
  }
  const url = URL.createObjectURL(arquivo)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}
