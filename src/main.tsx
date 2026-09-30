import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '@/app/routes'
import './index.css'

const racine = document.getElementById('root')
if (!racine) {
  throw new Error("L'élément #root est introuvable dans index.html.")
}

const routeur = createBrowserRouter(routes)

createRoot(racine).render(
  <StrictMode>
    <RouterProvider router={routeur} />
  </StrictMode>,
)
