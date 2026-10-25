import { AuthApiError } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import {
  changerDEspace,
  detacherLesAutresEspaces,
  fermerLesConnexionsOrphelines,
  noterCompteDeLEspace,
} from '@/features/espaces/actions'
import {
  definirMotDePasseAChoisir,
  effacerMotDePasseAChoisir,
} from '@/features/session/motDePasseAChoisir'
import type { TypeCompte } from '@/lib/base'
import { CLE_REGISTRE, lirePassageDEspace, lireRegistre } from '@/lib/espaces'
import type { Registre } from '@/lib/espaces'
import { rechargerA } from '@/lib/rechargement'
import { CLE_SESSION, clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'
import type { ScenarioSession } from '@/test/fauxSupabase'

// « Changer d'espace » (T73), de bout en bout dans l'application : un faux client Supabase par
// espace, comme la page réelle n'en crée qu'un, celui de l'espace actif à son chargement. Un
// rechargement de la page se simule en démontant l'application, puis en la rendant de nouveau.

const etat = vi.hoisted(() => ({
  /** Espace du client de la page : celui qui était actif à son chargement. */
  page: 'principal',
  clients: {} as Record<string, unknown>,
  /** Écritures en vol vers la base (compteur de `fetchAvecDelai`). */
  ecritures: 0,
}))

vi.mock('@/lib/supabase', () => {
  const cleDe = (espace: { cle: string | null }) => espace.cle ?? 'sb-127-auth-token'
  return {
    supabase: () => etat.clients[etat.page],
    idEspaceDuClient: () => etat.page,
    cleDuClient: () =>
      etat.page === 'principal'
        ? 'sb-127-auth-token'
        : `sb-pilotage-espace-${etat.page}-auth-token`,
    cleDeStockageDe: cleDe,
    ecrituresEnVol: () => etat.ecritures,
    clientDeLEspaceInactif: (espace: { id: string }) => etat.clients[espace.id],
  }
})
vi.mock('@/lib/rechargement', () => ({ rechargerA: vi.fn() }))

const ID_PLATEFORME = '20000000-0000-4000-8000-000000000005'
const ID_TECH = '20000000-0000-4000-8000-000000000014'
const CLE_TECH = 'sb-pilotage-espace-tech0001-auth-token'

function scenario(type: TypeCompte, id: string, libelle: string): ScenarioSession {
  return {
    utilisateur: { id, email: `${type}@exemple.test` },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: id,
      type,
      ministere_id: type === 'ministere' ? 'm-tech' : null,
      libelle,
      desactive_le: null,
    },
    facteursVerifies: ['f1'],
  }
}

/** Le faux client d'un espace, avec `auth.dispose` (client temporaire d'un espace inactif). */
function installer(id: string, session: ScenarioSession) {
  const faux = fauxSupabase(session)
  const auth = Object.assign(faux.auth, { dispose: vi.fn(() => Promise.resolve()) })
  etat.clients[id] = { ...faux.client, auth }
  return { ...faux, auth }
}

const plateforme = (session: Partial<ScenarioSession> = {}) =>
  installer('principal', {
    ...scenario('admin_plateforme', ID_PLATEFORME, 'EJP Tech, compte 1'),
    ...session,
  })
const tech = (session: Partial<ScenarioSession> = {}) =>
  installer('tech0001', { ...scenario('ministere', ID_TECH, 'Ministère Tech'), ...session })

/** EJP Tech a ses deux comptes ouverts sur l'appareil (T48). */
function deuxComptes(actif: 'principal' | 'tech0001') {
  const registre: Registre = {
    actif,
    espaces: [
      {
        id: 'principal',
        cle: null,
        utilisateur: ID_PLATEFORME,
        libelle: 'EJP Tech, compte 1',
        type: 'admin_plateforme',
      },
      {
        id: 'tech0001',
        cle: CLE_TECH,
        utilisateur: ID_TECH,
        libelle: 'Ministère Tech',
        type: 'ministere',
      },
    ],
  }
  window.localStorage.setItem(CLE_REGISTRE, JSON.stringify(registre))
}

/** Chargement de la page : le client est celui de l'espace actif à cet instant. */
function charger(adresse = '/') {
  etat.page = lireRegistre().actif
  const routeur = createMemoryRouter(routes, { initialEntries: [adresse] })
  render(
    <QueryClientProvider client={clientRequetes}>
      <RouterProvider router={routeur} />
    </QueryClientProvider>,
  )
  return routeur
}

/** Rechargement après un passage : la page précédente disparaît, la suivante se charge. */
async function recharger(adresse = '/') {
  cleanup()
  await clientRequetes.cancelQueries()
  return charger(adresse)
}

/** « / » pour EJP Tech : la vue de l'église (T29), lue dans le titre de l'onglet. */
async function attendreVueDeLEglise() {
  await waitFor(() => expect(document.title).toBe('Cette semaine, Pilotage EJP'))
}

/** « Changer d'espace » de l'en-tête (dans le menu pour EJP Tech, T60). */
async function ouvrirChangerDEspace() {
  const menu = screen.queryAllByRole('button', { name: 'Ouvrir le menu' })[0]
  if (menu) await userEvent.click(menu)
  const bouton = screen
    .getAllByRole('button', { name: "Changer d'espace" })
    .find((candidat) => candidat.closest('[hidden]') === null)
  if (!bouton) throw new Error("« Changer d'espace » introuvable.")
  await userEvent.click(bouton)
  const panneau = document.getElementById(bouton.getAttribute('aria-controls') ?? '')
  if (!panneau) throw new Error('Panneau introuvable.')
  return within(panneau)
}

beforeEach(() => {
  etat.clients = {}
  etat.ecritures = 0
  etat.page = 'principal'
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(async () => {
  cleanup()
  await clientRequetes.cancelQueries()
  clientRequetes.clear()
  effacerMotDePasseAChoisir()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe("Changer d'espace (T73)", () => {
  it("passe d'un compte à l'autre en un appui : cache vidé, page rechargée, sans reconnexion", async () => {
    deuxComptes('principal')
    const comptePlateforme = plateforme()
    const compteTech = tech()
    charger('/')
    await attendreVueDeLEglise()
    clientRequetes.setQueryData(['donnee-de-la-plateforme'], 'lue par EJP Tech')

    const panneau = await ouvrirChangerDEspace()
    expect(panneau.getByRole('list', { name: 'Comptes ouverts sur cet appareil' })).toBeVisible()
    expect(
      panneau
        .getByRole('list', { name: 'Comptes ouverts sur cet appareil' })
        .querySelector('[aria-current]'),
    ).toHaveTextContent('EJP Tech, compte 1 (espace actif)')
    const viderCache = vi.spyOn(clientRequetes, 'clear')
    await userEvent.click(panneau.getByRole('button', { name: 'Passer à Ministère Tech' }))

    expect(rechargerA).toHaveBeenCalledWith('/')
    expect(lireRegistre().actif).toBe('tech0001')
    // Rien du compte précédent ne reste en mémoire : le cache est vidé avant le rechargement. Dans
    // le test, la page n'est pas vraiment rechargée (rechargerA est simulé) : l'écran encore
    // affiché recrée aussitôt ses requêtes, plus ou moins vite selon la machine. On contrôle donc
    // le vidage, son ordre et la donnée du compte précédent, pas un cache vide.
    expect(viderCache).toHaveBeenCalledOnce()
    expect(viderCache.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(rechargerA).mock.invocationCallOrder.at(-1) ?? 0,
    )
    expect(clientRequetes.getQueryData(['donnee-de-la-plateforme'])).toBeUndefined()
    viderCache.mockRestore()
    expect(comptePlateforme.auth.signOut).not.toHaveBeenCalled()
    // L'ouverture de 2,5 s (T67) ne rejoue pas : ce n'est pas une ouverture de l'outil.
    expect(lirePassageDEspace()).toBe(true)

    await recharger('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ma semaine' })).toBeVisible()
    expect(screen.getAllByText('Ministère Tech').length).toBeGreaterThan(0)
    expect(compteTech.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(clientRequetes.getQueryData(['donnee-de-la-plateforme'])).toBeUndefined()
  })

  it('prénom (T63) : un espace de ministère sans déclaration du jour demande qui utilise l’outil', async () => {
    deuxComptes('principal')
    plateforme()
    tech({ declaration: { id: 1, prenom: 'Marie', du_jour: false } })
    await changerDEspace('tech0001')
    const routeur = await recharger('/')
    expect(
      await screen.findByRole('heading', { level: 1, name: "Qui utilise l'outil ?" }),
    ).toBeVisible()
    expect(routeur.state.location.pathname).toBe('/qui-utilise')
  })

  it('conditions (T61) : la personne de l’espace de ministère accepte elle-même', async () => {
    deuxComptes('principal')
    plateforme()
    tech({ conditionsAcceptees: false })
    await changerDEspace('tech0001')
    const routeur = await recharger('/')
    await waitFor(() => expect(routeur.state.location.pathname).toBe('/conditions-a-accepter'))
  })

  it("connexion expirée d'un seul compte : lui seul se reconnecte, l'autre reste à un appui", async () => {
    deuxComptes('tech0001')
    const comptePlateforme = plateforme()
    const compteTech = tech()
    compteTech.auth.mfa.getAuthenticatorAssuranceLevel.mockRejectedValue(
      new AuthApiError('Session not found', 403, 'session_not_found'),
    )
    charger('/')
    expect(
      await screen.findByText('Votre connexion à Ministère Tech a expiré. Reconnectez-vous.'),
    ).toBeVisible()
    expect(compteTech.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(comptePlateforme.auth.signOut).not.toHaveBeenCalled()

    // Revenir à l'autre compte ferme l'espace expiré : la liste ne garde que des comptes ouverts.
    await userEvent.click(screen.getByRole('button', { name: 'Revenir à EJP Tech, compte 1' }))
    // La page se recharge sur l'accueil de ce compte : la modération pour EJP Tech.
    expect(rechargerA).toHaveBeenCalledWith('/moderation')
    expect(lireRegistre().espaces.map(({ id }) => id)).toEqual(['principal'])
    expect(lireRegistre().actif).toBe('principal')
  })

  it('« Se déconnecter » ferme tous les comptes de l’appareil', async () => {
    deuxComptes('tech0001')
    const comptePlateforme = plateforme()
    const compteTech = tech()
    window.localStorage.setItem('sb-127-auth-token', '{"jeton":"de la plateforme"}')
    charger('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ma semaine' })).toBeVisible()
    compteTech.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })

    await userEvent.click(screen.getAllByRole('button', { name: 'Se déconnecter' })[0]!)
    await waitFor(() => expect(compteTech.auth.signOut).toHaveBeenCalledWith({ scope: 'local' }))
    expect(comptePlateforme.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(comptePlateforme.auth.dispose).toHaveBeenCalled()
    expect(window.localStorage.getItem('sb-127-auth-token')).toBeNull()
    // Seul l'espace actif reste, sans compte : la prochaine connexion se fera dans sa clé.
    expect(lireRegistre()).toEqual({
      actif: 'tech0001',
      espaces: [{ id: 'tech0001', cle: CLE_TECH }],
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Pilotage EJP' })).toBeVisible()
    expect(screen.queryByRole('button', { name: /Revenir à/ })).not.toBeInTheDocument()
  })

  it('« Retirer ce compte » ne ferme que la connexion de l’espace actif', async () => {
    deuxComptes('tech0001')
    const comptePlateforme = plateforme()
    const compteTech = tech()
    charger('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Ma semaine' })).toBeVisible()
    const panneau = await ouvrirChangerDEspace()
    expect(panneau.getByText('« Se déconnecter » ferme les 2 comptes.')).toBeVisible()
    await userEvent.click(panneau.getByRole('button', { name: 'Retirer ce compte' }))

    expect(compteTech.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(comptePlateforme.auth.signOut).not.toHaveBeenCalled()
    expect(lireRegistre().espaces.map(({ id }) => id)).toEqual(['principal'])
    expect(rechargerA).toHaveBeenCalledWith('/moderation')
  })

  it('« Ajouter un compte » ouvre la connexion d’un nouvel espace, et le retour reste possible', async () => {
    plateforme()
    charger('/')
    await attendreVueDeLEglise()
    const panneau = await ouvrirChangerDEspace()
    expect(panneau.queryByRole('button', { name: 'Retirer ce compte' })).not.toBeInTheDocument()
    await userEvent.click(panneau.getByRole('button', { name: 'Ajouter un compte' }))

    expect(rechargerA).toHaveBeenCalledWith('/connexion')
    const registre = lireRegistre()
    expect(registre.espaces).toHaveLength(2)
    expect(registre.espaces[0]).toMatchObject({ id: 'principal', libelle: 'EJP Tech, compte 1' })
    const nouveau = registre.espaces[1]!
    expect(registre.actif).toBe(nouveau.id)
    expect(nouveau.cle).toMatch(/^sb-pilotage-espace-[a-z0-9]+-auth-token$/)

    installer(nouveau.id, {})
    await recharger('/connexion')
    expect(
      await screen.findByText(
        'Connectez-vous avec le compte à ajouter. Vos autres comptes restent ouverts.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Revenir à EJP Tech, compte 1' })).toBeVisible()
  })

  it('une écriture en vol : le passage attend sa fin, pour que sa réussite s’affiche', async () => {
    deuxComptes('principal')
    // Les écritures passent par des appels directs à la base, comptés par fetchAvecDelai.
    etat.ecritures = 1
    await expect(changerDEspace('tech0001')).resolves.toEqual({
      erreur: 'Un enregistrement est en cours. Réessayez dans un instant.',
    })
    expect(lireRegistre().actif).toBe('principal')
    expect(rechargerA).not.toHaveBeenCalled()
  })

  it('un autre onglet change d’espace pendant une écriture : le rechargement attend sa fin', async () => {
    deuxComptes('principal')
    plateforme()
    charger('/')
    await attendreVueDeLEglise()
    etat.ecritures = 1
    deuxComptes('tech0001')
    window.dispatchEvent(new StorageEvent('storage', { key: CLE_REGISTRE }))
    await new Promise((resoudre) => setTimeout(resoudre, 300))
    expect(rechargerA).not.toHaveBeenCalled()
    etat.ecritures = 0
    await waitFor(() => expect(rechargerA).toHaveBeenCalledWith('/'))
  })

  it('l’étape « mot de passe à choisir » ne suit pas la personne dans un autre espace', async () => {
    deuxComptes('tech0001')
    etat.page = 'tech0001'
    plateforme()
    tech()
    definirMotDePasseAChoisir('recuperation')
    await changerDEspace('principal')
    expect(window.sessionStorage.getItem('pilotage-ejp.mot-de-passe-a-choisir')).toBeNull()
  })

  it('un compte ouvert une deuxième fois ferme son ancien espace (aucun doublon)', async () => {
    deuxComptes('tech0001')
    const comptePlateforme = plateforme()
    tech()
    etat.page = 'tech0001'
    noterCompteDeLEspace(ID_PLATEFORME, {
      id: ID_PLATEFORME,
      type: 'admin_plateforme',
      ministereId: null,
      libelle: 'EJP Tech, compte 1',
      actif: true,
    })
    // L'ancien espace ne quitte la liste qu'une fois sa connexion fermée.
    await waitFor(() =>
      expect(lireRegistre().espaces).toEqual([
        {
          id: 'tech0001',
          cle: CLE_TECH,
          utilisateur: ID_PLATEFORME,
          libelle: 'EJP Tech, compte 1',
          type: 'admin_plateforme',
        },
      ]),
    )
    expect(comptePlateforme.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('une connexion orpheline (hors de la liste) se ferme au chargement et à « Se déconnecter »', async () => {
    deuxComptes('principal')
    plateforme()
    const orpheline = installer('orphe0001', scenario('conseil', ID_TECH, 'Conseil, compte 1'))
    const cle = 'sb-pilotage-espace-orphe0001-auth-token'
    window.localStorage.setItem(cle, '{"jeton":"oublié"}')
    window.localStorage.setItem(`${cle}-flow-abc-code-verifier`, 'verificateur')
    await fermerLesConnexionsOrphelines()
    expect(orpheline.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(orpheline.auth.dispose).toHaveBeenCalled()
    expect(window.localStorage.getItem(cle)).toBeNull()
    expect(window.localStorage.getItem(`${cle}-flow-abc-code-verifier`)).toBeNull()

    // Et « Se déconnecter » en ferme une autre, apparue entre-temps.
    orpheline.auth.signOut.mockClear()
    window.localStorage.setItem(cle, '{"jeton":"oublié"}')
    expect(detacherLesAutresEspaces().map(({ id }) => id)).toEqual(['tech0001', 'orphe0001'])
  })

  it('un autre onglet change d’espace : celui-ci le suit', async () => {
    deuxComptes('principal')
    plateforme()
    charger('/')
    await attendreVueDeLEglise()
    deuxComptes('tech0001')
    window.dispatchEvent(new StorageEvent('storage', { key: CLE_REGISTRE }))
    await waitFor(() => expect(rechargerA).toHaveBeenCalledWith('/'))
    expect(clientRequetes.getQueryData(CLE_SESSION)).toBeUndefined()
  })
})
