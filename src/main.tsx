import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { pedirArmazenamentoPersistente } from './db/armazenamento'
import './index.css'

// Guarda o app no aparelho para funcionar sem internet; atualiza sozinho quando houver versão nova.
registerSW({ immediate: true })
// Reduz o risco de o iOS apagar os dados do app.
void pedirArmazenamentoPersistente()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
