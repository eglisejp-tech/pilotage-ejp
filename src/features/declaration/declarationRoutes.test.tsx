import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'
import type { ScenarioSession } from '@/test/fauxSupabase'

// « Qui utilise l'outil ? » (T56) par les routes de l'application : la garde, l'écran, l'appel à
// la base, puis « Vous : Marie » et « Ce n'est pas moi » dans l'en-tête d'un compte de ministère.

// Sous la charge de toute la suite, une lecture simulée peut dépasser la seconde par défaut.
configure({ asyncUtilTimeout: 5000 })

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const LIBELLES: Record<TypeCompte, string> = {
  ministere: 'Ministère Communication',
  berger: 'Berger',
  conseil: 'Conseil, compte 1',
  admin_eglise: "Administration de l'église",
  admin_plateforme: 'EJP Tech, compte 1',
}

function installer(type: TypeCompte, scenario: Partial<ScenarioSession> = {}) {
  const faux = fauxSupabase({
    utilisateur: { id: `u-${type}`, email: `${type}@exemple.test` },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: `u-${type}`,
      type,
      ministere_id: type === 'ministere' ? 'm-communication' : null,
      libelle: LIBELLES[type],
      desactive_le: null,
    },
    facteursVerifies: ['f1'],
    ...scenario,
  })
  courant.client = faux.client
  return faux
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
  vi.clearAllMocks()
})

const titre = "Qui utilise l'outil ?"

describe('« Qui utilise l’outil ? » (T56)', () => {
  it('ministère sans déclaration : l’écran, ni onglets ni données, puis la déclaration', async () => {
    const faux = installer('ministere', { declaration: null })
    const routeur = afficher('/points?vue=traites')
    expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/qui-utilise')
    expect(routeur.state.location.search).toBe('?retour=%2Fpoints%3Fvue%3Dtraites')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(faux.tables).toEqual(['compte'])

    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    expect(await screen.findByText('Indiquez votre prénom.')).toBeInTheDocument()
    expect(faux.rpc).not.toHaveBeenCalled()

    await userEvent.type(screen.getByRole('textbox', { name: 'Votre prénom' }), 'Marie D.')
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('declarer_intervenant', {
        p_prenom: 'Marie D.',
        p_motif: 'connexion',
      }),
    )
  })

  it('déclaration de plus de 7 jours : la question revient, motif « rappel »', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Marie', age_secondes: 8 * 86_400 },
    })
    afficher('/')
    expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'Votre prénom' }), 'Paul')
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('declarer_intervenant', {
        p_prenom: 'Paul',
        p_motif: 'rappel',
      }),
    )
  })

  it('ministère déclaré : « Vous : Marie » et « Ce n’est pas moi » dans l’en-tête', async () => {
    installer('ministere', {
      declaration: { id: 4, prenom: 'Marie D.', age_secondes: 60 },
      lignes: { v_semaine: [] },
    })
    afficher('/journal')
    // Sous la charge de toute la suite, la session et la page peuvent dépasser la seconde.
    const entete = await screen.findByRole('banner', {}, { timeout: 5000 })
    await waitFor(
      () => expect(within(entete).getAllByText('Vous : Marie D.').length).toBeGreaterThan(0),
      { timeout: 5000 },
    )
    const liens = within(entete).getAllByRole('link', { name: "Ce n'est pas moi", hidden: true })
    for (const lien of liens) {
      expect(lien).toHaveAttribute('href', '/qui-utilise?changer=1&retour=%2Fjournal')
    }
  })

  it('« Ce n’est pas moi » : l’écran, champ vide, « Annuler », puis motif « changement »', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Marie D.', age_secondes: 60 },
      lignes: { v_semaine: [] },
    })
    const routeur = afficher('/qui-utilise?changer=1&retour=%2Fjournal')
    expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Votre prénom' })).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument()

    await userEvent.type(screen.getByRole('textbox', { name: 'Votre prénom' }), 'Paul')
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('declarer_intervenant', {
        p_prenom: 'Paul',
        p_motif: 'changement',
      }),
    )
    await waitFor(() => expect(routeur.state.location.pathname).toBe('/journal'))
  })

  describe('refus de declarer_intervenant, par la table de traduction (m270, m271)', () => {
    async function declarerMarie(erreur: { code: string; message: string }) {
      const faux = installer('ministere', { declaration: null })
      faux.rpc.mockResolvedValueOnce({ data: null, error: erreur })
      afficher('/')
      expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
      await userEvent.type(screen.getByRole('textbox', { name: 'Votre prénom' }), 'Marie')
      await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    }

    it('session inconnue (42501) : se reconnecter, pas « La connexion a échoué »', async () => {
      await declarerMarie({ code: '42501', message: 'Session inconnue : reconnectez-vous.' })
      expect(
        await screen.findByText('Votre connexion a expiré. Reconnectez-vous.'),
      ).toBeInTheDocument()
      expect(screen.queryByText(/La connexion a échoué/)).toBeNull()
    })

    it('compte désactivé (42501) : contacter EJP Tech', async () => {
      await declarerMarie({ code: '42501', message: 'Compte inactif ou inconnu.' })
      expect(
        await screen.findByText('Ce compte est désactivé. Contactez EJP Tech.'),
      ).toBeInTheDocument()
    })

    it('prénom refusé par la base (P0001) : sous le champ, qui prend le focus', async () => {
      await declarerMarie({
        code: 'P0001',
        message: 'Écrivez seulement votre prénom, en lettres.',
      })
      const champ = screen.getByRole('textbox', { name: 'Votre prénom' })
      await waitFor(() =>
        expect(champ).toHaveAccessibleDescription(
          expect.stringContaining('Écrivez seulement votre prénom, en lettres.'),
        ),
      )
      expect(champ).toHaveAttribute('aria-invalid', 'true')
      expect(champ).toHaveFocus()
      expect(screen.queryByText(/La connexion a échoué/)).toBeNull()
    })

    it('un refus inattendu : le repli, pas la phrase de connexion', async () => {
      await declarerMarie({ code: '23505', message: 'duplicate key value' })
      expect(
        await screen.findByText(
          "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech.",
        ),
      ).toBeInTheDocument()
    })

    it('une coupure (code vide de postgrest-js) : « La connexion a échoué. Réessayez. »', async () => {
      await declarerMarie({ code: '', message: 'TypeError: Failed to fetch' })
      expect(await screen.findByText('La connexion a échoué. Réessayez.')).toBeInTheDocument()
    })
  })

  it.each(['berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const)(
    '%s : jamais l’écran, ni « Vous : » ni « Ce n’est pas moi »',
    async (type) => {
      const faux = installer(type, { declaration: null })
      const routeur = afficher('/qui-utilise?changer=1')
      await waitFor(() => expect(routeur.state.location.pathname).not.toBe('/qui-utilise'))
      const entete = await screen.findByRole('banner')
      expect(within(entete).queryByText(/^Vous :/)).not.toBeInTheDocument()
      expect(
        within(entete).queryByRole('link', { name: "Ce n'est pas moi", hidden: true }),
      ).not.toBeInTheDocument()
      expect(faux.from).not.toHaveBeenCalledWith('v_ma_declaration')
    },
  )
})
