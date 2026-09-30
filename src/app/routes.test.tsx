import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'

function afficher(adresse: string) {
  const routeur = createMemoryRouter(routes, { initialEntries: [adresse] })
  render(<RouterProvider router={routeur} />)
}

describe('routes', () => {
  it("affiche l'en-tête et l'accueil « Cette semaine »", () => {
    afficher('/')
    expect(screen.getByRole('link', { name: 'Pilotage EJP' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('heading', { level: 1, name: 'Cette semaine' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenu')
  })

  it('affiche la page introuvable pour une adresse inconnue', () => {
    afficher('/adresse-inconnue')
    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Revenir à l'accueil" })).toHaveAttribute('href', '/')
  })

  it("affiche l'aperçu de « Cette semaine » en développement, selon le profil demandé", () => {
    afficher('/apercu/cette-semaine?profil=admin_eglise')
    expect(screen.getByRole('link', { name: "Administration de l'église" })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      "52 STARs au service dimanche. Deux ministères n'ont pas encore saisi.",
    )
    expect(screen.queryByRole('heading', { name: 'À décider' })).not.toBeInTheDocument()
  })
})
