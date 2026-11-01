// Mais → Backup: salvar tudo num arquivo, restaurar, e exportar os lançamentos para o Excel.
import { DatabaseBackup, FileSpreadsheet, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useReferencias } from '@/components/ListaLancamentos'
import { Botao, Cabecalho, Cartao, TituloSecao } from '@/components/ui'
import { salvarAjustes } from '@/db/ajustes'
import { db } from '@/db/banco'
import { exportarBackup, importarBackup } from '@/db/backup'
import { useAjustes } from '@/hooks/ajustes'
import { salvarArquivo } from '@/utils/arquivo'
import { DIAS_LEMBRETE_BACKUP, diasDesdeBackup, gerarCSV, nomeDoArquivo } from '@/utils/backup'

export function textoUltimoBackup(ultimo?: number): string {
  const dias = diasDesdeBackup(ultimo)
  if (dias === undefined) return 'Você ainda não fez nenhum backup.'
  if (dias === 0) return 'Último backup: hoje.'
  if (dias === 1) return 'Último backup: ontem.'
  return `Último backup: há ${dias} dias.`
}

export function Backup() {
  const { ultimoBackup } = useAjustes()
  const refs = useReferencias()
  const entrada = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const atrasado = (diasDesdeBackup(ultimoBackup) ?? Infinity) > DIAS_LEMBRETE_BACKUP

  async function salvarBackup() {
    setOcupado(true)
    try {
      const backup = await exportarBackup()
      const ok = await salvarArquivo(nomeDoArquivo('financas-backup', 'json'), JSON.stringify(backup), 'application/json')
      if (ok) {
        await salvarAjustes({ ultimoBackup: Date.now() })
        setAviso({ tipo: 'ok', texto: 'Backup salvo. Guarde o arquivo num lugar seguro (iCloud Drive, e-mail...).' })
      }
    } finally {
      setOcupado(false)
    }
  }

  async function exportarCSV() {
    if (!refs) return
    const lancamentos = await db.lancamentos.toArray()
    await salvarArquivo(nomeDoArquivo('financas-lancamentos', 'csv'), gerarCSV(lancamentos, refs), 'text/csv;charset=utf-8')
  }

  async function restaurar(arquivo: File) {
    setAviso(null)
    try {
      const conteudo = JSON.parse(await arquivo.text())
      const dados = (conteudo?.dados ?? {}) as Record<string, unknown[]>
      const quando = conteudo?.exportadoEm ? new Date(conteudo.exportadoEm).toLocaleString('pt-BR') : 'data desconhecida'
      if (
        !window.confirm(
          `Restaurar o backup de ${quando} (${dados.lancamentos?.length ?? 0} lançamentos)? TODOS os dados atuais deste aparelho serão substituídos.`,
        )
      )
        return
      await importarBackup(conteudo)
      setAviso({ tipo: 'ok', texto: 'Backup restaurado.' })
    } catch (e) {
      setAviso({
        tipo: 'erro',
        texto: e instanceof SyntaxError ? 'Não consegui ler o arquivo. Ele é um backup (.json) do app?' : (e as Error).message,
      })
    } finally {
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <>
      <Cabecalho titulo="Backup" voltarPara="/mais" />
      <div className="mx-auto max-w-2xl px-4 pb-6 pt-4">
        <Cartao className="space-y-3 p-4">
          <p className={atrasado ? 'font-semibold text-alerta' : 'font-semibold'}>{textoUltimoBackup(ultimoBackup)}</p>
          <p className="text-sm text-suave">
            Os dados ficam só neste aparelho. Se o celular for trocado, perdido ou o app for apagado, só o backup traz tudo
            de volta. Faça pelo menos a cada {DIAS_LEMBRETE_BACKUP} dias.
          </p>
          <Botao className="w-full" disabled={ocupado} onClick={() => void salvarBackup()}>
            <DatabaseBackup className="size-5" /> Salvar backup
          </Botao>
          <p className="text-xs text-suave">
            No iPhone, escolha "Salvar em Arquivos" (de preferência no iCloud Drive) na tela que abrir.
          </p>
        </Cartao>

        {aviso && (
          <p
            role="status"
            className={`mt-3 rounded-xl p-3 text-sm font-medium ${aviso.tipo === 'ok' ? 'bg-sucesso/10 text-sucesso' : 'bg-perigo/10 text-perigo'}`}
          >
            {aviso.texto}
          </p>
        )}

        <TituloSecao>Planilha</TituloSecao>
        <Cartao className="space-y-3 p-4">
          <p className="text-sm text-suave">
            Todos os lançamentos num arquivo que abre no Excel (despesas com sinal de menos, para a soma dar o saldo).
          </p>
          <Botao variante="secundario" className="w-full" onClick={() => void exportarCSV()}>
            <FileSpreadsheet className="size-5" /> Exportar para Excel (CSV)
          </Botao>
        </Cartao>

        <TituloSecao>Restaurar</TituloSecao>
        <Cartao className="space-y-3 p-4">
          <p className="text-sm text-suave">
            Traz de volta um backup salvo antes. <strong className="text-texto">Substitui tudo</strong> o que está no
            aparelho agora.
          </p>
          <input
            ref={entrada}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              if (arquivo) void restaurar(arquivo)
            }}
          />
          <Botao variante="secundario" className="w-full" onClick={() => entrada.current?.click()}>
            <Upload className="size-5" /> Escolher arquivo de backup
          </Botao>
        </Cartao>
      </div>
    </>
  )
}
