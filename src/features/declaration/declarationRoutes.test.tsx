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

  it('nouvelle journée (T63) : la question revient, le prénom de la veille proposé, un seul appui', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Marie', du_jour: false },
    })
    const routeur = afficher('/points')
    expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
    expect(routeur.state.location.search).toBe('?retour=%2Fpoints')
    expect(
      screen.getByText('Ce compte est partagé. Confirmez votre prénom, ou changez-le.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Votre prénom' })).toHaveValue('Marie')
    expect(screen.queryByRole('button', { name: 'Annuler' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('declarer_intervenant', {
        p_prenom: 'Marie',
        p_motif: 'rappel',
      }),
    )
  })

  it('nouvelle journée : la personne peut changer le prénom proposé (une autre personne : changement)', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Marie', du_jour: false },
    })
    afficher('/')
    const champ = await screen.findByRole('textbox', { name: 'Votre prénom' })
    await userEvent.clear(champ)
    await userEvent.type(champ, 'Paul')
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('declarer_intervenant', {
        p_prenom: 'Paul',
        p_motif: 'changement',
      }),
    )
  })

  it('prénom effacé par EJP Tech : la question revient, champ vide', async () => {
    installer('ministere', { declaration: { id: 4, prenom: '[prénom effacé]' } })
    afficher('/')
    expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Votre prénom' })).toHaveValue('')
  })

  it('ministère déclaré : « Vous : Marie » et « Ce n’est pas moi » dans l’en-tête', async () => {
    installer('ministere', {
      declaration: { id: 4, prenom: 'Marie D.' },
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
      declaration: { id: 4, prenom: 'Marie D.' },
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

// Conditions acceptées par chaque personne d'un compte partagé (T61) : le prénom d'abord, puis les
// conditions de cette personne, avec « Ce n'est pas moi ».
describe('conditions par personne (T61)', () => {
  const conditions = "Conditions d'utilisation"

  it('rien n’est fait : le prénom d’abord, sans lire l’acceptation', async () => {
    const faux = installer('ministere', { declaration: null, conditionsAcceptees: false })
    const routeur = afficher('/points')
    expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/qui-utilise')
    expect(faux.questions).not.toHaveBeenCalled()
    expect(faux.from).not.toHaveBeenCalledWith('acceptation_conditions')
  })

  it('prénom donné, conditions pas encore acceptées : l’écran nomme la personne, puis elle accepte', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Paul' },
      conditionsAcceptees: false,
    })
    const routeur = afficher('/journal')
    expect(await screen.findByRole('heading', { level: 1, name: conditions })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/conditions-a-accepter')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.getByText('Vous : Paul').closest('p')).toHaveTextContent(
      'Chaque personne du compte accepte elle-même. Vous : Paul',
    )
    expect(screen.getByRole('link', { name: "Ce n'est pas moi" })).toHaveAttribute(
      'href',
      '/qui-utilise?changer=1&retour=%2Fjournal',
    )
    // La base répond oui ou non pour Paul ; aucune table d'acceptation n'est lue.
    expect(faux.questions).toHaveBeenCalledWith('conditions_acceptees', {
      p_version: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown,
    })
    expect(faux.from).not.toHaveBeenCalledWith('acceptation_personne')
    expect(faux.from).not.toHaveBeenCalledWith('acceptation_conditions')

    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Accepter et continuer' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('accepter_conditions', {
        p_version: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown,
      }),
    )
  })

  it('« Ce n’est pas moi » avant d’accepter : la nouvelle personne dit son prénom, puis revient aux conditions', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Paul' },
      conditionsAcceptees: false,
    })
    const routeur = afficher('/conditions-a-accepter?retour=%2Fjournal')
    await userEvent.click(await screen.findByRole('link', { name: "Ce n'est pas moi" }))
    expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/qui-utilise')
    expect(screen.getByRole('textbox', { name: 'Votre prénom' })).toHaveValue('')

    await userEvent.type(screen.getByRole('textbox', { name: 'Votre prénom' }), 'Léa')
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('declarer_intervenant', {
        p_prenom: 'Léa',
        p_motif: 'changement',
      }),
    )
    // Elle n'a pas accepté (la base le dit) : les conditions, à son nom, avec la page à retrouver.
    expect(await screen.findByRole('heading', { level: 1, name: conditions })).toBeInTheDocument()
    await waitFor(() => expect(routeur.state.location.pathname).toBe('/conditions-a-accepter'))
    expect(routeur.state.location.search).toBe('?retour=%2Fjournal')
    expect(await screen.findByText('Vous : Léa')).toBeInTheDocument()
    expect(faux.rpc).not.toHaveBeenCalledWith('accepter_conditions', expect.anything())
  })

  it('nouvelle journée et nouvelle version (T63) : prénom confirmé, puis les conditions, un seul passage', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Marie', du_jour: false },
      conditionsAcceptees: false,
    })
    const routeur = afficher('/journal')
    expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
    expect(faux.questions).not.toHaveBeenCalled()
    // Un seul appui confirme le prénom proposé.
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('declarer_intervenant', {
        p_prenom: 'Marie',
        p_motif: 'rappel',
      }),
    )
    // Puis, sans repasser par l'outil, les conditions de Marie.
    expect(await screen.findByRole('heading', { level: 1, name: conditions })).toBeInTheDocument()
    await waitFor(() => expect(routeur.state.location.pathname).toBe('/conditions-a-accepter'))
    expect(routeur.state.location.search).toBe('?retour=%2Fjournal')
    expect(screen.getByText('Vous : Marie')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('« Annuler » ramène aux conditions, sans rien écrire', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Paul' },
      conditionsAcceptees: false,
    })
    const routeur = afficher('/qui-utilise?changer=1&retour=%2Fjournal')
    await userEvent.click(await screen.findByRole('button', { name: 'Annuler' }))
    expect(await screen.findByRole('heading', { level: 1, name: conditions })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/conditions-a-accepter')
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('la personne a déjà accepté (sur cet appareil ou un autre) : l’outil, sans l’écran', async () => {
    installer('ministere', {
      declaration: { id: 4, prenom: 'Marie D.' },
      conditionsAcceptees: true,
      lignes: { v_semaine: [] },
    })
    const routeur = afficher('/journal')
    await waitFor(() => expect(routeur.state.location.pathname).toBe('/journal'))
    expect(screen.queryByRole('heading', { level: 1, name: conditions })).not.toBeInTheDocument()
  })

  it('compte non partagé : l’écran des conditions sans prénom ni « Ce n’est pas moi »', async () => {
    const faux = installer('berger', { declaration: null, conditionsAcceptees: false })
    afficher('/journal')
    expect(await screen.findByRole('heading', { level: 1, name: conditions })).toBeInTheDocument()
    expect(screen.queryByText(/^Vous :/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: "Ce n'est pas moi" })).not.toBeInTheDocument()
    expect(faux.from).toHaveBeenCalledWith('acceptation_conditions')
    expect(faux.questions).not.toHaveBeenCalled()
  })

  it('« Ce n’est pas moi » depuis l’outil : la nouvelle personne dit son prénom, accepte, puis retrouve sa page', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Marie' },
      prenomsAyantAccepte: ['Marie'],
      lignes: { v_semaine: [] },
    })
    const routeur = afficher('/qui-utilise?changer=1&retour=%2Fjournal')
    expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'Votre prénom' }), 'Léa')
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    // Léa n'a pas accepté : les conditions à son nom, la page quittée gardée.
    expect(await screen.findByRole('heading', { level: 1, name: conditions })).toBeInTheDocument()
    await waitFor(() => expect(routeur.state.location.pathname).toBe('/conditions-a-accepter'))
    expect(routeur.state.location.search).toBe('?retour=%2Fjournal')
    expect(await screen.findByText('Vous : Léa')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Accepter et continuer' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('accepter_conditions', {
        p_version: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown,
      }),
    )
    await waitFor(() => expect(routeur.state.location.pathname).toBe('/journal'))
  })

  it('deux onglets : « Ce n’est pas moi » dans l’autre, rien n’est accepté au nom de la mauvaise personne', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Marie' },
      prenomsAyantAccepte: [],
    })
    afficher('/conditions-a-accepter?retour=%2Fjournal')
    expect(await screen.findByText('Vous : Marie')).toBeInTheDocument()
    // Dans un autre onglet de la même session, Paul se déclare.
    faux.declarerAilleurs('Paul')
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Accepter et continuer' }))
    // L'écran se relit au nom de Paul, sans rien écrire.
    expect(await screen.findByText('Vous : Paul')).toBeInTheDocument()
    expect(faux.rpc).not.toHaveBeenCalledWith('accepter_conditions', expect.anything())
    expect(screen.getByRole('button', { name: 'Accepter et continuer' })).toBeEnabled()
  })

  it('refus de la base (prénom effacé entre-temps) : la session relue, le prénom est redemandé', async () => {
    const faux = installer('ministere', {
      declaration: { id: 4, prenom: 'Marie' },
      prenomsAyantAccepte: [],
    })
    const routeur = afficher('/conditions-a-accepter?retour=%2Fjournal')
    expect(await screen.findByText('Vous : Marie')).toBeInTheDocument()
    faux.rpc.mockImplementationOnce(() => {
      // EJP Tech a effacé le prénom : la base refuse, et la déclaration ne vaut plus.
      faux.declarerAilleurs('[prénom effacé]')
      return Promise.resolve({
        data: null,
        error: { message: "Indiquez d'abord votre prénom.", code: '42501' },
      })
    })
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Accepter et continuer' }))
    expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/qui-utilise')
    expect(screen.getByRole('textbox', { name: 'Votre prénom' })).toHaveValue('')
  })
})
