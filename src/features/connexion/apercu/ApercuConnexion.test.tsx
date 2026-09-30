import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'

function afficher(adresse: string) {
  const routeur = createMemoryRouter(routes, { initialEntries: [adresse] })
  render(<RouterProvider router={routeur} />)
  return { routeur, utilisateur: userEvent.setup() }
}

describe('aperçu des écrans de connexion (développement)', () => {
  it('est déclaré en développement, sans la mise en page des écrans connectés', () => {
    expect(import.meta.env.DEV).toBe(true)
    afficher('/apercu/connexion')
    expect(screen.getByRole('heading', { level: 1, name: 'Pilotage EJP' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: "Réglages de l'aperçu" })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Pilotage EJP' })).not.toBeInTheDocument()
  })

  it("lit l'écran et l'état dans l'adresse", () => {
    afficher('/apercu/connexion?ecran=code&etat=erreur-code')
    expect(screen.getByRole('heading', { level: 1, name: 'Code de vérification' })).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Ce code ne correspond pas.')
  })

  it("change d'écran depuis la barre de réglages et garde le choix dans l'adresse", async () => {
    const { routeur, utilisateur } = afficher('/apercu/connexion')
    await utilisateur.selectOptions(screen.getByLabelText('Écran'), 'activation')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Activer la double authentification' }),
    ).toBeInTheDocument()
    expect(routeur.state.location.search).toBe('?ecran=activation')

    await utilisateur.click(screen.getByLabelText('Compte de ministère'))
    expect(screen.queryByText('Compte partagé.')).not.toBeInTheDocument()
    expect(screen.getByText('Conseil, compte 3')).toBeInTheDocument()
  })

  it('signale les actions simulées, sans appel au serveur', async () => {
    const { utilisateur } = afficher('/apercu/connexion?ecran=compte-desactive')
    await utilisateur.click(screen.getByRole('link', { name: 'Revenir à la connexion' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Pilotage EJP' })).toBeInTheDocument()
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer avec Google' }))
    expect(screen.getByText(/Dernière action simulée/)).toHaveTextContent(
      'onGoogle, redirection vers Google.',
    )
  })
})
