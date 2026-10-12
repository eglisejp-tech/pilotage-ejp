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
      {/* Hors de tout repère (header, main), avant « Aller au contenu » : à vérifier par l'audit F2
          avec la règle axe « region ». Aucun élément focalisable, l'ordre de tabulation reste. */}
      <BandeauHorsLigne />
      <RouterProvider router={routeur} />
    </QueryClientProvider>
  </StrictMode>,
)
