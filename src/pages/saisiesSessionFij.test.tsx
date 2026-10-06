import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import { lecturesExemple } from '@/features/cette-semaine/lecturesExemple'
import { CARTE_EXEMPLE, statistiquesExemple } from '@/features/saisie-fij/apercu/exemplesE4'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'

// Les trois pages du lot E4 (/saisir/session/:id, /saisir/fij, /saisir/fij-statistiques) avec le
// faux client : le profil « ministère » est vérifié par PageApplication (les autres profils sont
// refusés dans routes.test.tsx) ; les deux saisies FIJ sont réservées au ministère `fij`.

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."
/**
 * `clientRequetes` refait une lecture en échec une fois, après une seconde ; le premier rendu des
 * routes peut aussi dépasser une seconde quand toute la suite tourne.
 */
const ATTENTE_ECHEC = { timeout: 4000 }

function connecteMinistere(lignes: Record<string, unknown[]> = {}, enEchec: string[] = []) {
  const faux = fauxSupabase({
    utilisateur: { id: 'u-ministere', email: 'ministere@exemple.test' },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: 'u-ministere',
      type: 'ministere',
      ministere_id: 'm-1',
      libelle: 'Ministère Communication',
      desactive_le: null,
    },
    facteursVerifies: ['f1'],
    lignes,
    enEchec,
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

afterEach(() => {
  clientRequetes.clear()
  vi.clearAllMocks()
})

const SESSION = {
  session_id: 's1',
  type: 'batir',
  date: '2026-09-26',
  intitule: null,
  a_eu_lieu: true,
  nb_attendus: 8,
  nb_saisis: 6,
  total_saisi: 60,
  total: 58,
  manquants: ['Coordination', 'Intégration'],
}

describe('/saisir/fij et /saisir/fij-statistiques', () => {
  it.each(['/saisir/fij', '/saisir/fij-statistiques'])(
    '%s pour un autre ministère que fij : la page non disponible, après la seule lecture du code',
    async (adresse) => {
      const faux = connecteMinistere({ ministere: [{ code: 'communication' }] })
      afficher(adresse)
      expect(
        await screen.findByRole('heading', { level: 1, name: NON_DISPONIBLE }, ATTENTE_ECHEC),
      ).toBeInTheDocument()
      expect(faux.tables).toEqual(['compte', 'ministere'])
    },
  )

  it('la carte des FIJ pour le ministère fij : 8 champs préremplis, « Total : 29 FIJ »', async () => {
    connecteMinistere({ ministere: [{ code: 'fij' }], v_carte_fij: CARTE_EXEMPLE })
    afficher('/saisir/fij')
    expect(await screen.findByText('Total : 29 FIJ', {}, ATTENTE_ECHEC)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Carte des FIJ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enregistrer la carte' })).toBeInTheDocument()
  })

  it('les chiffres par département pour le ministère fij : la semaine de référence', async () => {
    connecteMinistere({
      ministere: [{ code: 'fij' }],
      v_semaine: [lecturesExemple().semaine],
      v_fij_statistique: statistiquesExemple(),
    })
    afficher('/saisir/fij-statistiques')
    expect(
      await screen.findByRole('button', { name: 'Enregistrer les chiffres' }, ATTENTE_ECHEC),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('group')).toHaveLength(4)
  })

  it('lecture du code en échec : le problème passager, avec « Réessayer »', async () => {
    connecteMinistere({}, ['ministere'])
    afficher('/saisir/fij')
    expect(await screen.findByRole('alert', {}, ATTENTE_ECHEC)).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})

describe('/saisir/session/:id', () => {
  it('« Choisir la session » sans session passée : en attente de l’administration', async () => {
    connecteMinistere()
    afficher('/saisir/session/choisir')
    expect(
      await screen.findByText('Aucune session à saisir.', {}, ATTENTE_ECHEC),
    ).toBeInTheDocument()
    expect(
      screen.getByText("L'administration de l'église déclare les sessions."),
    ).toBeInTheDocument()
  })

  it('une session passée : le formulaire de la maquette 09, titré par la session', async () => {
    connecteMinistere({ v_session_completude: [SESSION] })
    afficher('/saisir/session/s1')
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: "Bâtir l'Église, samedi 26 septembre" },
        ATTENTE_ECHEC,
      ),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Enregistrer la présence' }, ATTENTE_ECHEC),
    ).toBeInTheDocument()
    expect(screen.getByText('Coordination et Intégration')).toBeInTheDocument()
  })

  it('une session future : aucune saisie avant son jour', async () => {
    connecteMinistere({ v_session_completude: [{ ...SESSION, a_eu_lieu: false }] })
    afficher('/saisir/session/s1')
    expect(
      await screen.findByText(
        "Cette session n'a pas encore eu lieu. Sa saisie ouvrira le jour de la session.",
        {},
        ATTENTE_ECHEC,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enregistrer la présence' })).toBeNull()
  })

  it('une session inconnue : aucun résultat, et le choix d’une autre session', async () => {
    connecteMinistere()
    afficher('/saisir/session/inconnue')
    expect(
      await screen.findByText(
        "Cette session n'existe pas ou n'est plus proposée.",
        {},
        ATTENTE_ECHEC,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Choisir une autre session' })).toHaveAttribute(
      'href',
      '/saisir/session/choisir',
    )
  })

  it('lecture en échec : le problème passager', async () => {
    connecteMinistere({}, ['v_session_completude'])
    afficher('/saisir/session/s1')
    expect(await screen.findByRole('alert', {}, ATTENTE_ECHEC)).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
  })
})
