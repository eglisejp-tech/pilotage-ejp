import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '@/app/routes'
import { BandeauHorsLigne } from '@/components/etats/BandeauHorsLigne'
import { clientRequetes } from '@/lib/requetes'
import './index.css'

const racine = document.getElementById('root')
if (!racine) {
  throw new Error("L'élément #root est introuvable dans index.html.")
}

const routeur = createBrowserRouter(routes)

createRoot(racine).render(
  <StrictMode>
    <QueryClientProvider client={clientRequetes}>
      <BandeauHorsLigne />
      <RouterProvider router={routeur} />
    </QueryClientProvider>
  </StrictMode>,
)
