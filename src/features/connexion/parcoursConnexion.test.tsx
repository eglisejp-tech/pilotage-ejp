import { AuthApiError } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import { messagesConnexion } from '@/features/connexion/messages'
import { effacerAnnonceSuivante } from '@/features/connexion/reussiteEnAttente'
import {
  definirMotDePasseAChoisir,
  effacerMotDePasseAChoisir,
} from '@/features/session/motDePasseAChoisir'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'
import type { ScenarioSession } from '@/test/fauxSupabase'

// Chaîne de connexion avec les vraies routes et un faux client : un QR code en échec se
// réessaie (m044), le mot de passe enregistré et la double authentification activée sont
// confirmés sur l'écran suivant (m037, m045), le code après « Mot de passe oublié » annonce la
// suite (m051), et le retour de Google n'affiche jamais le formulaire pendant l'échange (m010).

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

function installer(scenario: ScenarioSession) {
  const faux = fauxSupabase(scenario)
  courant.client = faux.client
  return faux
}

/** Un ministère en aal1, sans facteur (activation) ou avec un facteur vérifié (code). */
function ministere(facteurs: string[], conditionsAcceptees = true): ScenarioSession {
  return {
    utilisateur: { id: 'u-ministere', email: 'communication@exemple.test' },
    niveau: { currentLevel: 'aal1', nextLevel: facteurs.length > 0 ? 'aal2' : 'aal1' },
    compte: {
      user_id: 'u-ministere',
      type: 'ministere',
      ministere_id: 'm-communication',
      libelle: 'Ministère Communication',
      desactive_le: null,
    },
    facteursVerifies: facteurs,
    conditionsAcceptees,
  }
}

function afficher(adresse: string) {
  const routeur = createMemoryRouter(routes, { initialEntries: [adresse] })
  render(
    <QueryClientProvider client={clientRequetes}>
      <RouterProvider router={routeur} />
    </QueryClientProvider>,
  )
  return routeur
}

afterEach(async () => {
  cleanup()
  await clientRequetes.cancelQueries()
  clientRequetes.clear()
  effacerMotDePasseAChoisir()
  effacerAnnonceSuivante()
  vi.clearAllMocks()
})

describe('chaîne de connexion', () => {
  it('QR code en échec : le cadre le dit et « Réessayer » relance la préparation (m044)', async () => {
    const faux = installer(ministere([]))
    faux.auth.mfa.enroll.mockResolvedValueOnce({
      data: null,
      error: { message: 'Failed to fetch', name: 'AuthRetryableFetchError', status: 0 },
    } as never)
    afficher('/double-authentification')

    const alerte = await screen.findByRole('alert')
    expect(alerte).toHaveTextContent("Le QR code n'a pas pu s'afficher. Réessayez.")
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    // Le bandeau du code n'est plus utilisé pour cet échec.
    expect(screen.getAllByRole('alert')).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(
      await screen.findByRole('img', { name: "QR code d'activation de Pilotage EJP" }),
    ).toBeInTheDocument()
    expect(faux.auth.mfa.enroll).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each([
    ['trop de tentatives', 429, 'over_request_rate_limit', messagesConnexion.tropDeTentatives],
    ['compte désactivé', 403, 'user_banned', messagesConnexion.compteDesactive],
    ['connexion expirée', 403, 'session_not_found', messagesConnexion.connexionExpiree],
  ])(
    'QR code refusé (%s) : le message précis dans le cadre, sans « Réessayer » (m044)',
    async (_cas, statut, code, message) => {
      const faux = installer(ministere([]))
      faux.auth.mfa.enroll.mockResolvedValueOnce({
        data: null,
        error: new AuthApiError('refus', statut, code),
      } as never)
      afficher('/double-authentification')

      const alerte = await screen.findByRole('alert')
      expect(alerte).toHaveTextContent(message)
      expect(screen.queryByText("Le QR code n'a pas pu s'afficher. Réessayez.")).toBeNull()
      expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull()
      expect(screen.getAllByRole('alert')).toHaveLength(1)
      expect(faux.auth.mfa.enroll).toHaveBeenCalledTimes(1)
    },
  )

  it('premier code accepté : « Double authentification activée. » sur l’écran suivant (m045)', async () => {
    const faux = installer(ministere([], false))
    afficher('/double-authentification')
    await screen.findByRole('img', { name: "QR code d'activation de Pilotage EJP" })

    faux.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    })
    await userEvent.type(
      screen.getByLabelText("Saisissez le code affiché par l'application."),
      '123456',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Activer la double authentification' }),
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: "Conditions d'utilisation" }),
    ).toBeInTheDocument()
    const message = await screen.findByText('Double authentification activée.')
    expect(message.closest('[role="status"]')).not.toBeNull()
  })

  it('mot de passe choisi après une invitation : « Mot de passe enregistré. » sur l’activation (m037)', async () => {
    const faux = installer(ministere([]))
    definirMotDePasseAChoisir('invitation')
    afficher('/acces/mot-de-passe')

    await userEvent.type(
      await screen.findByLabelText('Mot de passe'),
      'une phrase facile à retenir',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Activer la double authentification' }),
    ).toBeInTheDocument()
    expect(faux.auth.updateUser).toHaveBeenCalledWith({ password: 'une phrase facile à retenir' })
    const message = await screen.findByText('Mot de passe enregistré.')
    expect(message.closest('[role="status"]')).not.toBeNull()
  })

  it('mot de passe choisi après « Mot de passe oublié » : « Mot de passe enregistré. » sur « Qui utilise l’outil ? » (m037, T56)', async () => {
    // Compte de ministère en aal2, conditions acceptées, sans déclaration sur cette session :
    // l'écran qui suit le mot de passe est celui de la déclaration.
    installer({
      ...ministere(['f1']),
      niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
      declaration: null,
    })
    definirMotDePasseAChoisir('recuperation')
    afficher('/acces/mot-de-passe')

    await userEvent.type(
      await screen.findByLabelText('Nouveau mot de passe'),
      'une phrase facile à retenir',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le mot de passe' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: "Qui utilise l'outil ?" }),
    ).toBeInTheDocument()
    const message = await screen.findByText('Mot de passe enregistré.')
    expect(message.closest('[role="status"]')).not.toBeNull()
  })

  it('code demandé après « Mot de passe oublié » : la suite est annoncée (m051)', async () => {
    installer(ministere(['f1']))
    definirMotDePasseAChoisir('recuperation')
    afficher('/double-authentification')
    expect(await screen.findByLabelText('Code à 6 chiffres')).toBeInTheDocument()
    expect(
      screen.getByText('Vous choisirez ensuite votre nouveau mot de passe.'),
    ).toBeInTheDocument()
  })

  it('code demandé à une connexion ordinaire : pas de phrase sur le mot de passe (m051)', async () => {
    installer(ministere(['f1']))
    afficher('/double-authentification')
    expect(await screen.findByLabelText('Code à 6 chiffres')).toBeInTheDocument()
    expect(screen.queryByText(/nouveau mot de passe/)).not.toBeInTheDocument()
  })

  it("retour de Google : « Chargement de Pilotage EJP » pendant l'échange du code, jamais le formulaire (m010)", async () => {
    // auth-js attend la fin de l'échange PKCE avant de répondre à getSession (initializePromise) :
    // tant qu'il dure, la garde de /connexion n'affiche que son écran de chargement.
    const faux = installer({})
    faux.auth.getSession.mockReturnValue(new Promise(() => {}) as never)
    afficher('/connexion?code=0b6d1c4e')

    expect(await screen.findByText('Chargement de Pilotage EJP')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Se connecter' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continuer avec Google' })).not.toBeInTheDocument()
  })
})
