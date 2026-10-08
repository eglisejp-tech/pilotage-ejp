import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import { construireCetteSemaine } from '@/features/cette-semaine/construire'
import { lecturesExemple } from '@/features/cette-semaine/lecturesExemple'
import { accueil, ADRESSES_APPLICATION, titrePour } from '@/features/navigation/profils'
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

/** Session du profil et lignes du jeu d'exemple pour chaque lecture de « Cette semaine ». */
function installerVueDeLEglise(type: TypeCompte) {
  const lectures = lecturesExemple()
  return installer({
    ...scenarioDe(type),
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
      v_point_mention: lectures.points?.mentions ?? [],
    },
  })
}

/** Une rangée de `v_point` (ministère créateur « Communication »), ouverte ou traitée. */
function pointExemple(id: string, titre: string, statut: 'attente_decision' | 'traite') {
  const traite = statut === 'traite'
  return {
    id,
    ministere_id: 'min-a',
    titre,
    description: null,
    action_attendue: null,
    priorite: 'normale',
    echeance: null,
    cree_le: '2026-10-01T10:00:00+02:00',
    cree_par: 'compte-createur',
    statut,
    statut_le: '2026-10-01T10:00:00+02:00',
    traitement_id: traite ? `traitement-${id}` : null,
    traite_le: traite ? '2026-10-05T10:00:00+02:00' : null,
    traite_par: null,
    traite_commentaire: null,
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
  // Démonter d'abord, puis annuler les requêtes encore en vol : sinon une réponse du test
  // précédent (son compte, ses onglets) peut revenir dans le cache après le clear().
  cleanup()
  await clientRequetes.cancelQueries()
  clientRequetes.clear()
  effacerMotDePasseAChoisir()
  vi.clearAllMocks()
})

const navigation = () => screen.getAllByRole('navigation', { name: 'Navigation principale' })

/** Boutons et liens d'action qu'EJP Tech ne doit jamais voir (T29, lecture seule). */
const BOUTONS_D_ACTION =
  /Marquer traité|Changer le statut|Saisir|Enregistrer|Ajouter|Déclarer|Modifier|Mettre à jour/

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

  it("aal2 sans acceptation de la version courante : l'écran des conditions, ni onglets ni données, puis l'acceptation", async () => {
    const faux = installer({ ...scenarioDe('ministere'), conditionsAcceptees: false })
    const routeur = afficher('/points?vue=traites')
    expect(
      await screen.findByRole('heading', { level: 1, name: "Conditions d'utilisation" }),
    ).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/conditions-a-accepter')
    expect(routeur.state.location.search).toBe('?retour=%2Fpoints%3Fvue%3Dtraites')
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(faux.tables).toEqual(['compte'])

    // Case décochée : message, aucune écriture.
    await userEvent.click(screen.getByRole('button', { name: 'Accepter et continuer' }))
    expect(await screen.findByText('Cochez la case pour continuer.')).toBeInTheDocument()
    expect(faux.rpc).not.toHaveBeenCalled()

    // Case cochée : la fonction de la base est appelée avec la version courante.
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Accepter et continuer' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('accepter_conditions', { p_version: '2026-10-08' }),
    )
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
      ['Cette semaine', 'Ministères et comptes', 'Sessions', 'Indicateurs', 'Journal'],
    ],
    [
      'admin_plateforme',
      'Modération',
      ['Modération', 'Indicateurs', 'Cette semaine', 'Journal technique'],
    ],
  ])(
    '%s en aal2 : son accueil, ses onglets seulement, son libellé',
    async (type, titre, onglets) => {
      connecte(type)
      const routeur = afficher(accueil(type))
      // Le titre de l'onglet, pas le h1 : sur « / », le h1 est la phrase de la semaine.
      await waitFor(() => expect(document.title).toBe(`${titre}, Pilotage EJP`))
      await screen.findAllByRole('navigation', { name: 'Navigation principale' })
      expect(routeur.state.location.pathname).toBe(
        type === 'admin_plateforme' ? '/moderation' : '/',
      )
      // La session du test précédent peut rester affichée un instant sous charge (même titre
      // « Cette semaine » pour le berger et le ministère) : on attend les onglets du profil.
      await waitFor(() => {
        for (const nav of navigation()) {
          expect(
            within(nav)
              .getAllByRole('link')
              .map((lien) => lien.textContent),
          ).toEqual(onglets)
        }
      })
      expect(within(navigation()[0]!).getByRole('link', { name: titre })).toHaveAttribute(
        'aria-current',
        'page',
      )
      expect(document.body.textContent).toContain(LIBELLES[type])
      if (type === 'admin_plateforme') {
        // Lots E8 et L6 : le bloc « Signalements » puis la file « Champs libres à relire ».
        expect(
          await screen.findByRole('heading', { level: 2, name: 'Champs libres à relire' }),
        ).toBeInTheDocument()
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
    installerVueDeLEglise('berger')
    afficher('/')
    const attendu = construireCetteSemaine(lecturesExemple(), { profil: 'berger' }, null)
    const phrase = attendu.phrase.map((morceau) => morceau.texte).join('')
    expect(await screen.findByRole('heading', { level: 1, name: phrase })).toBeInTheDocument()
    expect(document.title).toBe('Cette semaine, Pilotage EJP')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'À décider' })).toBeInTheDocument()
  })

  it('EJP Tech sur « / » : la vue du berger, en lecture seule, sans aucun bouton d’action (T29)', async () => {
    const faux = installerVueDeLEglise('admin_plateforme')
    const routeur = afficher('/')
    const berger = construireCetteSemaine(lecturesExemple(), { profil: 'berger' }, null)
    const phrase = berger.phrase.map((morceau) => morceau.texte).join('')
    expect(await screen.findByRole('heading', { level: 1, name: phrase })).toBeInTheDocument()
    expect(routeur.state.location.pathname).toBe('/')
    expect(document.title).toBe('Cette semaine, Pilotage EJP')
    expect(within(navigation()[0]!).getByRole('link', { name: 'Cette semaine' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    // Les points sont lus, comme pour le berger.
    expect(faux.tables).toEqual(expect.arrayContaining(['v_point', 'v_point_mention']))
    const aDecider = screen.getByRole('region', { name: 'À décider' })
    expect(within(aDecider).getAllByRole('heading', { level: 3 })).toHaveLength(3)
    // Étape 5 : « Marquer traité » ne doit jamais apparaître pour EJP Tech.
    expect(within(aDecider).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: BOUTONS_D_ACTION })).toBeNull()
    expect(screen.queryByRole('link', { name: BOUTONS_D_ACTION })).toBeNull()
  })

  // Garde des étapes 4 et 5 : ces écrans s'ouvrent à EJP Tech pour la lecture (LECTEURS), mais
  // leurs boutons d'action suivent estDecideur ou le lien du ministère au point, jamais ce droit.
  // La fiche d'un ministère (`/ministeres/:id`) n'est pas ici : son identifiant doit être un uuid
  // et elle lit une quinzaine de vues. Sa lecture seule pour EJP Tech est testée sur la vraie
  // fiche dans `src/pages/fiche.test.tsx`.
  it.each([
    ['/ministeres', 'Ministères'],
    ['/points?vue=ouverts', "Points d'attention"],
  ])(
    'EJP Tech sur %s : écran de lecture du berger, sans « Marquer traité », « Changer le statut » ni saisie (T29)',
    async (adresse, titre) => {
      // Lot E2 : la liste lit le jour de Paris ; sans lui, elle afficherait « Réessayer ».
      installer({
        ...scenarioDe('admin_plateforme'),
        lignes: {
          v_semaine: [
            { aujourdhui: '2026-10-07', dimanche: '2026-10-04', lundi: '2026-09-28', numero: 40 },
          ],
          // Écran 05 : un point ouvert et un point traité, pour que le test lise de vraies rangées.
          ministere: [
            { id: 'min-a', code: null, nom: 'Communication', desactive_le: null },
            { id: 'min-b', code: null, nom: 'Intégration', desactive_le: null },
          ],
          v_point: [
            pointExemple('point-ouvert', 'Salle pour la soirée', 'attente_decision'),
            pointExemple('point-traite', 'Micros à remplacer', 'traite'),
          ],
          v_point_mention: [{ point_id: 'point-ouvert', ministere_id: 'min-b' }],
        },
      })
      const routeur = afficher(adresse)
      expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument()
      // Les rangées de l'écran 05 sont chargées avant de chercher des boutons : sans cette
      // attente, le test ne contrôlerait que l'écran de chargement.
      if (adresse.startsWith('/points')) {
        expect(await screen.findAllByRole('article')).toHaveLength(1)
        expect(screen.getByRole('region', { name: 'Traités récemment' })).toHaveTextContent(
          'Micros à remplacer',
        )
      }
      expect(routeur.state.location.pathname).toBe(adresse.split('?')[0])
      expect(screen.queryByRole('button', { name: BOUTONS_D_ACTION })).toBeNull()
      expect(screen.queryByRole('link', { name: BOUTONS_D_ACTION })).toBeNull()
      // Les boutons « ? » des aides (« Aide : Filtrer par ministère ») informent, ils n'agissent pas.
      expect(
        within(screen.getByRole('main')).queryByRole('button', { name: /^(?!Aide : )/ }),
      ).toBeNull()
    },
  )

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
    // La page s'affiche avant la fin de la lecture de la session : le lien vise « / », puis
    // l'accueil du compte une fois la session connue.
    await waitFor(() =>
      expect(screen.getByRole('link', { name: "Revenir à l'accueil" })).toHaveAttribute(
        'href',
        '/moderation',
      ),
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
    // Qui voit les données : EJP Tech lit tout, en lecture (T29).
    expect(
      screen.getByText(/EJP Tech voit l'ensemble en lecture, pour administrer l'outil/),
    ).toBeInTheDocument()
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

const TOUS_LES_PROFILS = Object.keys(LIBELLES) as TypeCompte[]

/** Adresse réelle d'un motif (« /ministeres/:id » : l'identifiant d'un autre ministère). */
const exempleDe = (motif: string) => motif.replace(':id', 'm-autre')

/** Chaque adresse de l'application avec chaque profil qui n'y a pas droit. */
const ADRESSES_REFUSEES = ADRESSES_APPLICATION.flatMap((adresse) =>
  TOUS_LES_PROFILS.filter((profil) => !adresse.profils.includes(profil)).map(
    (profil) => [adresse.chemin, profil] as const,
  ),
)

// Adresses de l'étape 4 dont la page est encore l'amorce de W0 (« Cet écran arrive à l'étape 4. »).
// Le lot qui remplace une page retire son adresse de cette liste et teste sa vraie page.
const ADRESSES_AMORCES = [
  '/ma-fiche',
  '/ministeres',
  '/ministeres/:id',
  '/saisir/dimanche',
  '/saisir/mois',
  '/saisir/session/:id',
  '/saisir/fij',
  '/saisir/fij-statistiques',
  '/saisir/evenement',
  '/saisir/evenement/:id',
  '/saisir/reunion',
  '/signaler',
]
// Adresses dont le lot a remplacé l'amorce : leurs vraies pages sont testées à part (lot E5 :
// `src/pages/PageSaisieEvenement.test.tsx`). Elles restent dans la liste des douze déclarées.
const ADRESSES_REMPLACEES = ['/saisir/evenement', '/saisir/evenement/:id', '/saisir/reunion']
const AMORCES_PAR_PROFIL = ADRESSES_APPLICATION.filter(
  (adresse) =>
    ADRESSES_AMORCES.includes(adresse.chemin) && !ADRESSES_REMPLACEES.includes(adresse.chemin),
).flatMap((adresse) => adresse.profils.map((profil) => [adresse.chemin, profil] as const))

describe("adresses de l'étape 4", () => {
  it('déclare les douze adresses de saisie et de fiche, chacune avec une page amorce', () => {
    expect(ADRESSES_AMORCES).toHaveLength(12)
    for (const motif of ADRESSES_AMORCES) {
      expect(
        ADRESSES_APPLICATION.some((adresse) => adresse.chemin === motif),
        motif,
      ).toBe(true)
    }
  })

  it.each(ADRESSES_REFUSEES)(
    '%s refusée au profil %s : page non disponible, aucune requête au-delà du compte',
    async (motif, profil) => {
      const faux = connecte(profil)
      afficher(exempleDe(motif))
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeInTheDocument()
      expect(screen.getByText('Elle est réservée à un autre profil.')).toBeInTheDocument()
      expect(faux.tables).toEqual(['compte'])
    },
  )

  // Pages que le lot E4 a remplacées : leurs vraies pages sont testées dans
  // `src/pages/saisiesSessionFij.test.tsx`. Le filtre est ici, et non dans `AMORCES_PAR_PROFIL`,
  // pour ne pas toucher les mêmes lignes que les autres lots (une page remplacée par lot).
  const PAGES_REMPLACEES_PAR_E4 = ['/saisir/session/:id', '/saisir/fij', '/saisir/fij-statistiques']
  // Pages que le lot E3 a remplacées : testées dans `src/pages/saisiesChiffres.test.tsx`.
  const PAGES_REMPLACEES_PAR_E3 = ['/saisir/dimanche', '/saisir/mois']
  // Pages que le lot E2 a remplacées : testées dans `src/pages/fiche.test.tsx`.
  const PAGES_REMPLACEES_PAR_E2 = ['/ma-fiche', '/ministeres', '/ministeres/:id']
  // Page que le lot E8 a remplacée (« Signaler une difficulté ») : testée plus bas et dans
  // `src/pages/PageSignalement.test.tsx`.
  const PAGES_REMPLACEES_PAR_E8 = ['/signaler']
  it.each(
    AMORCES_PAR_PROFIL.filter(([motif]) => !PAGES_REMPLACEES_PAR_E4.includes(motif))
      .filter(([motif]) => !PAGES_REMPLACEES_PAR_E3.includes(motif))
      .filter(([motif]) => !PAGES_REMPLACEES_PAR_E2.includes(motif))
      .filter(([motif]) => !PAGES_REMPLACEES_PAR_E8.includes(motif)),
  )(
    '%s ouverte au profil %s : la page amorce, sans aucune requête de données',
    async (motif, profil) => {
      const faux = connecte(profil)
      const routeur = afficher(exempleDe(motif))
      expect(await screen.findByText("Cet écran arrive à l'étape 4.")).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(routeur.state.location.pathname).toBe(exempleDe(motif))
      expect(faux.tables).toEqual(['compte'])
    },
  )

  it('EJP Tech sur une saisie : la page non disponible, jamais un bouton de saisie (T29)', async () => {
    connecte('admin_plateforme')
    afficher('/saisir/dimanche')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "Cette page n'est pas disponible avec votre compte.",
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: BOUTONS_D_ACTION })).toBeNull()
  })

  it('le berger sur /signaler : la page non disponible (seuls le ministère et EJP Tech lisent un signalement)', async () => {
    const faux = connecte('berger')
    afficher('/signaler?ecran=saisie_evenement')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "Cette page n'est pas disponible avec votre compte.",
      }),
    ).toBeInTheDocument()
    expect(faux.tables).toEqual(['compte'])
  })

  it('/moderation : le titre de l’écran, puis le bloc « Signalements » lu dans v_signalement (lot E8)', async () => {
    const faux = installer({
      ...scenarioDe('admin_plateforme'),
      lignes: {
        v_signalement: [
          {
            id: '43000000-0000-4000-8000-000000000001',
            ministere_id: 'm-communication',
            ministere_nom: 'Communication',
            ecran: 'saisie_evenement',
            texte: 'Le formulaire refuse la date de notre soirée de louange.',
            saisi_le: '2026-10-02T18:40:00+02:00',
            suivi_id: null,
            commentaire: null,
            clos_le: null,
            ouvert: true,
            clos_recent: false,
          },
        ],
      },
    })
    afficher('/moderation')
    expect(await screen.findByText('Communication')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Modération')
    expect(screen.getByRole('heading', { level: 2, name: 'Signalements' })).toBeInTheDocument()
    expect(screen.getByText('1 signalement ouvert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clore le signalement' })).toBeInTheDocument()
    // Lot L6 : la file « Champs libres à relire », vide ici, sous le bloc.
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Champs libres à relire' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Aucun texte à relire.')).toBeInTheDocument()
    await waitFor(() =>
      expect(faux.tables).toEqual(
        expect.arrayContaining([
          'compte',
          'ministere',
          'v_a_valider',
          'v_signalement',
          'v_textes_a_relire',
        ]),
      ),
    )
    // Jamais de lecture directe de la table de modération ni du journal.
    expect(faux.tables).not.toContain('moderation')
    expect(faux.tables).not.toContain('journal')
    // Aucune demande en attente : pas d'en-tête sur les indicateurs.
    expect(screen.queryByText(/votre validation/)).not.toBeInTheDocument()
  })

  it('/moderation : « N indicateurs attendent votre validation » et son lien, la file lue dans v_textes_a_relire (lot L6)', async () => {
    installer({
      ...scenarioDe('admin_plateforme'),
      lignes: {
        v_a_valider: [
          { indicateur_id: 'i1', attente_jours: 4 },
          { indicateur_id: 'i1', attente_jours: 2 },
          { indicateur_id: 'i2', attente_jours: 1 },
        ],
        ministere: [{ id: 'm-social', code: null, nom: 'Social', desactive_le: null }],
        v_textes_a_relire: [
          {
            cible: 'point_attention',
            cible_id: '44000000-0000-4000-8000-000000000001',
            ministere_id: 'm-social',
            auteur_libelle: 'Ministère Social',
            ecrit_le: '2026-09-29T18:03:00+02:00',
            champs: { titre: 'Affiche et flyer de l’accueil du 15 octobre.' },
            etat: 'a_relire',
            decision_le: null,
            motif: null,
            indicateur_libelle: null,
            mois: null,
          },
        ],
      },
    })
    afficher('/moderation')
    expect(
      await screen.findByText(
        '2 indicateurs attendent votre validation, le plus ancien depuis 4 jours.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ouvrir les indicateurs à valider' })).toHaveAttribute(
      'href',
      '/indicateurs#a-valider',
    )
    const ligne = await screen.findByRole('article', { name: "Point d'attention, Social" })
    expect(within(ligne).getByRole('button', { name: 'Rien à signaler' })).toBeInTheDocument()
    expect(within(ligne).getByRole('button', { name: 'Masquer le texte' })).toBeInTheDocument()
    expect(screen.getByText('1 texte en attente')).toBeInTheDocument()
  })

  it('un ministère sur /signaler : le formulaire, l’écran prérempli, ses seuls signalements lus', async () => {
    const faux = connecte('ministere')
    afficher('/signaler?ecran=saisie_reunion')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Signaler une difficulté' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Écran concerné : Prochaine réunion')).toBeInTheDocument()
    expect(screen.getByText(/^EJP Tech lit votre signalement\./)).toBeInTheDocument()
    await waitFor(() => expect(faux.tables).toEqual(['compte', 'v_signalement']))
    expect(faux.eq).toHaveBeenCalledWith('ministere_id', 'm-communication')
  })

  it.each<TypeCompte>(['berger', 'conseil', 'admin_eglise'])(
    '%s sur /moderation : page non disponible, aucune lecture de signalement',
    async (profil) => {
      const faux = connecte(profil)
      afficher('/moderation')
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeInTheDocument()
      expect(screen.queryByText('Signalements')).toBeNull()
      expect(faux.tables).not.toContain('v_signalement')
    },
  )

  it.each([
    // Lot E2 : la fiche de Social lue par son ministère (ni « moins de 3 » ni « masqué »).
    ['/apercu/fiche', 4],
    ['/apercu/saisies', 4],
    ['/apercu/evenements', 3],
    ['/apercu/nouveau-point', 3],
  ])('l’aperçu %s : %i aides, sans aucune requête au serveur', (adresse, nombreDAides) => {
    const faux = installer({})
    afficher(`${adresse}?profil=ministere`)
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(nombreDAides)
    expect(faux.from).not.toHaveBeenCalled()
  })
})

// Adresses des étapes 5 et 6 posées par le lot C0, chacune avec sa page amorce (« Cet écran arrive
// à l'étape 5. »). Le lot qui remplace une page retire son adresse de cette liste et teste sa vraie
// page à part. Leurs refus (page non disponible, aucune requête) sont déjà couverts par
// `ADRESSES_REFUSEES`, qui parcourt toute la table des adresses.
const ADRESSES_AMORCES_C0 = ['/points', '/journal', '/journal-technique', '/ma-fiche/indicateurs']
const AMORCES_C0_PAR_PROFIL = ADRESSES_APPLICATION.filter((adresse) =>
  ADRESSES_AMORCES_C0.includes(adresse.chemin),
).flatMap((adresse) => adresse.profils.map((profil) => [adresse, profil] as const))

// Page que le lot P3 a remplacée (écran 05 et « Mes points ») : testée dans
// `src/pages/PagePoints.test.tsx` et `src/features/points/`.
const PAGES_REMPLACEES_PAR_P3 = ['/points']

describe('adresses des étapes 5 et 6 (lot C0)', () => {
  it('déclare chaque adresse amorce dans la table des adresses', () => {
    for (const motif of ADRESSES_AMORCES_C0) {
      expect(
        ADRESSES_APPLICATION.some((adresse) => adresse.chemin === motif),
        motif,
      ).toBe(true)
    }
  })

  it.each(
    AMORCES_C0_PAR_PROFIL.filter(
      ([adresse]) => !PAGES_REMPLACEES_PAR_P3.includes(adresse.chemin),
    ).map(([adresse, profil]) => [adresse.chemin, profil, adresse]),
  )(
    '%s ouverte au profil %s : la page amorce de son étape, sans aucune requête de données',
    async (motif, profil, adresse) => {
      const faux = connecte(profil)
      const routeur = afficher(exempleDe(motif))
      expect(
        await screen.findByText(`Cet écran arrive à l'étape ${adresse.etape}.`),
      ).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        titrePour(adresse, profil),
      )
      expect(routeur.state.location.pathname).toBe(exempleDe(motif))
      expect(faux.tables).toEqual(['compte'])
    },
  )

  it.each<TypeCompte>(['admin_eglise', 'admin_plateforme'])(
    '%s : l’onglet « Indicateurs » est l’onglet courant sur /indicateurs',
    async (profil) => {
      connecte(profil)
      afficher('/indicateurs')
      // Lot L3a : la vraie page (testée à part dans `indicateursConfiguration.test.tsx`).
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Indicateurs' }),
      ).toBeInTheDocument()
      await waitFor(() =>
        expect(within(navigation()[0]!).getByRole('link', { name: 'Indicateurs' })).toHaveAttribute(
          'aria-current',
          'page',
        ),
      )
    },
  )
})

// Lot L1 : la vraie page /comptes (retirée des amorces de C0), branchée sur ses lectures.
describe('/comptes, écran 13 (lot L1)', () => {
  it('admin_eglise en aal2 : titre, onglet courant, ses quatre lectures et aucun appel de fonction', async () => {
    const faux = installer({
      ...scenarioDe('admin_eglise'),
      lignes: {
        v_etat_comptes: [
          {
            user_id: 'u-com',
            type: 'ministere',
            libelle: 'Ministère Communication',
            ministere_id: 'm-communication',
            email: 'communication@exemple.test',
            desactive_le: null,
            etat: 'activee',
          },
          {
            user_id: 'u-admin_eglise',
            type: 'admin_eglise',
            libelle: "Administration de l'église",
            ministere_id: null,
            email: 'admin_eglise@exemple.test',
            desactive_le: null,
            etat: 'activee',
          },
        ],
        ministere: [
          { id: 'm-communication', code: null, nom: 'Communication', desactive_le: null },
        ],
        indicateur: [{ ministere_id: 'm-communication' }, { ministere_id: 'm-communication' }],
      },
    })
    const invoke = vi.fn()
    courant.client = { ...faux.client, functions: { invoke } }
    afficher('/comptes')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ministères et comptes' }),
    ).toBeInTheDocument()
    const ministeres = await screen.findByRole('region', { name: 'Ministères' })
    await waitFor(() => expect(ministeres).toHaveTextContent('communication@exemple.test'))
    expect(
      within(ministeres).getByRole('link', { name: '2 indicateurs pour Communication' }),
    ).toHaveAttribute('href', '/indicateurs/m-communication')
    // Le compte de l'administration n'apparaît pas sur l'écran.
    expect(screen.getByRole('main')).not.toHaveTextContent('admin_eglise@exemple.test')
    expect(
      within(navigation()[0]!).getByRole('link', { name: 'Ministères et comptes' }),
    ).toHaveAttribute('aria-current', 'page')
    expect([...new Set(faux.tables)].sort()).toEqual([
      'compte',
      'indicateur',
      'ministere',
      'v_etat_comptes',
    ])
    expect(invoke).not.toHaveBeenCalled()
  })
})

// Lot L2 : la vraie page /sessions (retirée des amorces de C0), branchée sur ses lectures.
describe('/sessions, écran 14 (lot L2)', () => {
  it('admin_eglise en aal2 : titre, onglet courant, ses trois lectures et aucune écriture', async () => {
    const faux = installer({
      ...scenarioDe('admin_eglise'),
      lignes: {
        v_session_completude: [
          {
            session_id: 's-1',
            type: 'batir',
            date: '2026-10-03',
            intitule: null,
            a_eu_lieu: true,
            nb_attendus: 8,
            nb_saisis: 6,
            manquants: ['Social', 'Intégration'],
          },
        ],
        ministere: [
          { id: 'm-communication', code: null, nom: 'Communication', desactive_le: null },
        ],
        v_semaine: [
          { aujourdhui: '2026-10-07', dimanche: '2026-10-04', lundi: '2026-09-28', numero: 40 },
        ],
      },
    })
    afficher('/sessions')
    expect(await screen.findByRole('heading', { level: 1, name: 'Sessions' })).toBeInTheDocument()
    const liste = await screen.findByRole('region', { name: 'Sessions déclarées' })
    await waitFor(() => expect(liste).toHaveTextContent('Manquent : Intégration et Social'))
    expect(within(navigation()[0]!).getByRole('link', { name: 'Sessions' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect([...new Set(faux.tables)].sort()).toEqual([
      'compte',
      'ministere',
      'v_semaine',
      'v_session_completude',
    ])
  })
})
