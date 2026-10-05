import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import { construireCetteSemaine } from '@/features/cette-semaine/construire'
import { lecturesExemple } from '@/features/cette-semaine/lecturesExemple'
import { effacerMotDePasseAChoisir } from '@/features/session/motDePasseAChoisir'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'
import type { ScenarioSession } from '@/test/fauxSupabase'

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({
  // Une erreur à la place du client simule une configuration absente (createClient refusé).
  supabase: () => {
    if (courant.client instanceof Error) throw courant.client
    return courant.client
  },
}))

function installer(scenario: ScenarioSession) {
  const faux = fauxSupabase(scenario)
  courant.client = faux.client
  return faux
}

const LIBELLES: Record<TypeCompte, string> = {
  ministere: 'Ministère Communication',
  berger: 'Berger',
  conseil: 'Conseil, compte 1',
  admin_eglise: "Administration de l'église",
  admin_plateforme: 'EJP Tech, compte 1',
}

function connecte(type: TypeCompte, niveau: 'aal1' | 'aal2' = 'aal2', facteurs: string[] = ['f1']) {
  return installer(scenarioDe(type, niveau, facteurs))
}

function scenarioDe(
  type: TypeCompte,
  niveau: 'aal1' | 'aal2' = 'aal2',
  facteurs: string[] = ['f1'],
): ScenarioSession {
  return {
    utilisateur: { id: `u-${type}`, email: `${type}@exemple.test` },
    niveau: { currentLevel: niveau, nextLevel: facteurs.length > 0 ? 'aal2' : 'aal1' },
    compte: {
      user_id: `u-${type}`,
      type,
      ministere_id: type === 'ministere' ? 'm-communication' : null,
      libelle: LIBELLES[type],
      desactive_le: null,
    },
    facteursVerifies: facteurs,
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

afterEach(() => {
  clientRequetes.clear()
  effacerMotDePasseAChoisir()
  vi.clearAllMocks()
})

const navigation = () => screen.getAllByRole('navigation', { name: 'Navigation principale' })

describe('routes', () => {
  it("sans session : l'accueil renvoie vers la connexion, sans aucune requête de données", async () => {
    const faux = installer({})
    const routeur = afficher('/points?vue=traites')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pilotage EJP' }),
    ).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/connexion')
    expect(routeur.state.location.search).toBe('?retour=%2Fpoints%3Fvue%3Dtraites')
    expect(faux.from).not.toHaveBeenCalled()
  })

  it('aal1 sans facteur : activation, ni onglets ni données', async () => {
    const faux = connecte('ministere', 'aal1', [])
    const routeur = afficher('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Activer la double authentification' }),
    ).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/double-authentification')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.getByText(/Compte partagé/)).toBeInTheDocument()
    // Seule sa propre ligne de compte est lue (exception aal1).
    expect(faux.tables).toEqual(['compte'])
    await waitFor(() => expect(faux.auth.mfa.enroll).toHaveBeenCalledTimes(1))
    expect(faux.auth.mfa.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      issuer: 'Pilotage EJP',
      friendlyName: 'Pilotage EJP',
    })
  })

  it("aal1 avec un facteur : l'écran de code, puis l'adresse demandée après vérification", async () => {
    const faux = connecte('berger', 'aal1')
    const routeur = afficher('/journal')
    const champ = await screen.findByLabelText('Code à 6 chiffres')
    expect(routeur.state.location.search).toBe('?retour=%2Fjournal')

    // Le code vérifié fait passer la session en aal2.
    faux.auth.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    })
    await userEvent.type(champ, '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Vérifier' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Journal' })).toBeInTheDocument()
    expect(faux.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'f1',
      code: '123456',
    })
    expect(routeur.state.location.pathname).toBe('/journal')
  })

  it.each<[TypeCompte, string, string[]]>([
    ['ministere', 'Cette semaine', ['Cette semaine', 'Ma fiche', 'Mes points', 'Mon journal']],
    ['berger', 'Cette semaine', ['Cette semaine', 'Ministères', "Points d'attention", 'Journal']],
    ['conseil', 'Cette semaine', ['Cette semaine', 'Ministères', "Points d'attention", 'Journal']],
    [
      'admin_eglise',
      'Cette semaine',
      ['Cette semaine', 'Ministères et comptes', 'Sessions', 'Journal'],
    ],
    ['admin_plateforme', 'Modération', ['Modération', 'Journal technique']],
  ])(
    '%s en aal2 : son accueil, ses onglets seulement, son libellé',
    async (type, titre, onglets) => {
      connecte(type)
      const routeur = afficher('/')
      // Le titre de l'onglet, pas le h1 : sur « / », le h1 est la phrase de la semaine.
      await waitFor(() => expect(document.title).toBe(`${titre}, Pilotage EJP`))
      await screen.findAllByRole('navigation', { name: 'Navigation principale' })
      expect(routeur.state.location.pathname).toBe(
        type === 'admin_plateforme' ? '/moderation' : '/',
      )
      for (const nav of navigation()) {
        expect(
          within(nav)
            .getAllByRole('link')
            .map((lien) => lien.textContent),
        ).toEqual(onglets)
      }
      expect(within(navigation()[0]!).getByRole('link', { name: titre })).toHaveAttribute(
        'aria-current',
        'page',
      )
      expect(document.body.textContent).toContain(LIBELLES[type])
      if (type === 'admin_plateforme') {
        expect(screen.getByText(/Cet écran arrive à l'étape/)).toBeInTheDocument()
      } else {
        // « Cette semaine » est construit (étape 3) : plus de page d'attente.
        expect(screen.queryByText(/Cet écran arrive à l'étape/)).not.toBeInTheDocument()
      }
    },
  )

  it('« Cette semaine » sans ligne de v_semaine : bandeau « Réessayer », jamais une page blanche', async () => {
    connecte('berger')
    afficher('/')
    await waitFor(() => expect(document.title).toBe('Cette semaine, Pilotage EJP'))
    expect(screen.getByRole('heading', { level: 1, name: 'Cette semaine' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('« Cette semaine » du berger : les vues lues, construites et affichées (jeu d’exemple)', async () => {
    const lectures = lecturesExemple()
    installer({
      ...scenarioDe('berger'),
      lignes: {
        v_semaine: [lectures.semaine],
        indicateur: lectures.indicateurs,
        v_total_dimanche: lectures.totauxDimanche,
        v_ecart_dimanche: lectures.ecartsDimanche,
        v_total_a_ce_jour: lectures.totauxACeJour,
        v_pourcentage_fij: lectures.pourcentageFij ? [lectures.pourcentageFij] : [],
        v_carte_fij: lectures.carteFij,
        v_session_completude: lectures.sessions,
        v_ecart_session: lectures.ecartsSessions,
        v_participation_courante: lectures.participations,
        v_tableau_ministeres: lectures.tableauMinisteres,
        ministere: lectures.ministeres,
        v_point: lectures.points?.points ?? [],
        point_mention: lectures.points?.mentions ?? [],
      },
    })
    afficher('/')
    const attendu = construireCetteSemaine(lecturesExemple(), { profil: 'berger' }, null)
    const phrase = attendu.phrase.map((morceau) => morceau.texte).join('')
    expect(await screen.findByRole('heading', { level: 1, name: phrase })).toBeInTheDocument()
    expect(document.title).toBe('Cette semaine, Pilotage EJP')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'À décider' })).toBeInTheDocument()
  })

  it("adresse d'un autre profil : message neutre, et aucune requête au-delà du compte", async () => {
    const faux = connecte('ministere')
    afficher('/comptes')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "Cette page n'est pas disponible avec votre compte.",
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Elle est réservée à un autre profil.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Revenir à l'accueil" })).toHaveAttribute('href', '/')
    expect(faux.tables).toEqual(['compte'])
  })

  it('un ministère qui ouvre sa propre fiche va vers « Ma fiche »', async () => {
    connecte('ministere')
    const routeur = afficher('/ministeres/m-communication')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ma fiche' })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/ma-fiche')
  })

  it('adresse inconnue, connecté en aal2 : page introuvable, phrase et retour à son accueil', async () => {
    connecte('admin_plateforme')
    afficher('/nimportequoi')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page introuvable' }),
    ).toBeInTheDocument()
    expect(screen.getByText("L'adresse est incomplète ou n'existe plus.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Revenir à l'accueil" })).toHaveAttribute(
      'href',
      '/moderation',
    )
    expect(document.title).toBe('Page introuvable, Pilotage EJP')
  })

  it("adresse inconnue, sans session : la connexion, avec l'adresse demandée", async () => {
    const faux = installer({})
    const routeur = afficher('/nimportequoi')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pilotage EJP' }),
    ).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/connexion')
    expect(routeur.state.location.search).toBe('?retour=%2Fnimportequoi')
    expect(faux.from).not.toHaveBeenCalled()
  })

  it("serveur injoignable : l'écran d'erreur de session, jamais un chargement sans fin", async () => {
    const faux = installer({})
    faux.auth.getSession.mockRejectedValue(new TypeError('Failed to fetch'))
    afficher('/nimportequoi')
    expect(
      await screen.findByRole('button', { name: 'Réessayer' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
  })

  it("configuration absente : l'écran d'erreur de session, jamais un chargement sans fin", async () => {
    courant.client = new Error('VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY manquent.')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    afficher('/nimportequoi')
    expect(
      await screen.findByRole('button', { name: 'Réessayer' }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('compte désactivé : message, puis déconnexion locale', async () => {
    const faux = installer({
      utilisateur: { id: 'u1', email: 'social@exemple.test' },
      compte: {
        user_id: 'u1',
        type: 'ministere',
        ministere_id: 'm1',
        libelle: 'Ministère Social',
        desactive_le: '2026-09-01T10:00:00Z',
      },
    })
    afficher('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Compte désactivé' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(faux.auth.signOut).toHaveBeenCalledWith({ scope: 'local' }))
  })

  it('« Se déconnecter » ferme la session de cet appareil seulement', async () => {
    const faux = connecte('conseil')
    afficher('/')
    await waitFor(() => expect(document.title).toBe('Cette semaine, Pilotage EJP'))
    faux.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    await userEvent.click(screen.getAllByRole('button', { name: 'Se déconnecter' })[0]!)
    expect(faux.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pilotage EJP' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('la page Confidentialité se lit sans connexion', () => {
    installer({})
    afficher('/confidentialite')
    expect(screen.getByRole('heading', { level: 1, name: 'Confidentialité' })).toBeInTheDocument()
  })

  it("la page Conditions d'utilisation se lit sans connexion", () => {
    installer({})
    afficher('/conditions')
    expect(
      screen.getByRole('heading', { level: 1, name: "Conditions d'utilisation" }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Confidentialité' })).toHaveAttribute(
      'href',
      '/confidentialite',
    )
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
