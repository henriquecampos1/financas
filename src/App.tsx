import { MotionConfig } from 'motion/react'
import { createHashRouter, Navigate, RouterProvider } from 'react-router'
import { Bloqueio } from '@/components/Bloqueio'
import { Layout } from '@/components/Layout'
import { TelaDeErro } from '@/components/TelaDeErro'
import { ProvedorAjustes } from '@/hooks/ajustes'
import { ProvedorCiclo } from '@/hooks/ciclo'
import { ProvedorPrivacidade } from '@/hooks/privacidade'
import { Ajustes } from '@/pages/Ajustes'
import { Backup } from '@/pages/Backup'
import { Categorias } from '@/pages/Categorias'
import { Compromissos } from '@/pages/Compromissos'
import { Contas } from '@/pages/Contas'
import { Fatura } from '@/pages/Fatura'
import { Inicio } from '@/pages/Inicio'
import { Mais } from '@/pages/Mais'
import { Metas } from '@/pages/Metas'
import { Plano } from '@/pages/Plano'
import { Recorrencias } from '@/pages/Recorrencias'
import { Seguranca } from '@/pages/Seguranca'
import { Transacoes } from '@/pages/Transacoes'

// Rotas com # (ex.: .../#/plano): funcionam no GitHub Pages sem configuração extra.
const router = createHashRouter([
  {
    path: '/',
    Component: Layout,
    ErrorBoundary: TelaDeErro,
    children: [
      { index: true, Component: Inicio },
      { path: 'transacoes', Component: Transacoes },
      { path: 'fatura/:cartaoId', Component: Fatura },
      { path: 'plano', Component: Plano },
      // Carregada sob demanda: a biblioteca de gráficos só baixa quando a aba é aberta.
      { path: 'analises', lazy: async () => ({ Component: (await import('@/pages/Analises')).Analises }) },
      { path: 'mais', Component: Mais },
      { path: 'categorias', Component: Categorias },
      { path: 'contas', Component: Contas },
      { path: 'recorrencias', Component: Recorrencias },
      { path: 'metas', Component: Metas },
      { path: 'compromissos', Component: Compromissos },
      { path: 'backup', Component: Backup },
      { path: 'seguranca', Component: Seguranca },
      { path: 'ajustes', Component: Ajustes },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export function App() {
  return (
    // Animações seguem a preferência do sistema ("Reduzir movimento" desliga as maiores).
    <MotionConfig reducedMotion="user">
      <ProvedorAjustes carregando={<div className="min-h-dvh bg-fundo" />}>
        <Bloqueio>
          <ProvedorPrivacidade>
            <ProvedorCiclo>
              <RouterProvider router={router} />
            </ProvedorCiclo>
          </ProvedorPrivacidade>
        </Bloqueio>
      </ProvedorAjustes>
    </MotionConfig>
  )
}
