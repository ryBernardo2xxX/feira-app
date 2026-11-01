import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { repo } from './dados/repo'
import App from './App'
import './estilos/style.css'
import './estilos/menu.css'

registerSW({ immediate: true })
repo
  .iniciar()
  .then(() =>
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <HashRouter>
          <App />
        </HashRouter>
      </StrictMode>,
    ),
  )
  .catch((e) => {
    console.error(e)
    document.body.textContent =
      'Não foi possível abrir os dados locais. Os dados da versão anterior continuam salvos no aparelho.'
  })
