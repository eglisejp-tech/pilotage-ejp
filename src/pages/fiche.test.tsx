import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import {
  COMMUNS_EXEMPLE,
  DERNIERES_SAISIES_EXEMPLE,
  lecturesExempleFiche,
  SOCIAL,
  TABLEAU_EXEMPLE,
} from '@/features/fiche/apercu/exemplesFiche'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'
import { effacerMotDePasseAChoisir } from '@/features/session/motDePasseAChoisir'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'

// Pages du lot E2 (`/ma-fiche`, `/ministeres`, `/ministeres/:id`) avec le faux client : les
// lignes rendues par chaque vue sont celles de l'aperçu, telles que la base les rendrait pour le
// profil. Le faux client n'applique pas les filtres : chaque vue rend toutes ses lignes.

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

afterEach(() => {
  clientRequetes.clear()
  effacerMotDePasseAChoisir()
  vi.clearAllMocks()
})

const SEMAINE = {
  aujourdhui: '2026-10-07',
  dimanche: '2026-10-04',
  lundi: '2026-09-28',
  numero: 40,
}

function lignesFiche(profil: ProfilFiche): Record<string, unknown[]> {
  const l = lecturesExempleFiche(profil, false)
  return {
    v_semaine: [SEMAINE],
    ministere: [l.ministere, ...l.ministeres.filter((m) => m.id !== SOCIAL)],
    v_tableau_ministeres: TABLEAU_EXEMPLE.filter((t) => t.ministere_id === SOCIAL),
    indicateur: COMMUNS_EXEMPLE,
    v_mesure_periode: l.mesuresCommuns,
    v_commun_fiche: l.libellesCommuns,
    v_total_dimanche: l.totauxDimanche,
    v_total_a_ce_jour: l.totauxACeJour,
    v_indicateur_suivi: l.suivi,
    v_calcul: l.calculs,
    v_indicateur_serie: l.series,
    categorie_sensible: l.categories,
    v_ventilation_sensible: l.repartitions,
    v_precision_sensible: l.precisions,
    v_point: l.points.points,
    point_mention: l.points.mentions,
    v_journal: DERNIERES_SAISIES_EXEMPLE,
  }
}

function installer(
  type: TypeCompte,
  lignes: Record<string, unknown[]> = {},
  enEchec: string[] = [],
) {
  const faux = fauxSupabase({
    utilisateur: { id: `u-${type}`, email: `${type}@exemple.test` },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: `u-${type}`,
      type,
      ministere_id: type === 'ministere' ? SOCIAL : null,
      libelle: type === 'ministere' ? 'Ministère Social' : 'Compte',
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

/** Toute la suite tourne en parallèle : la fiche lit une quinzaine de vues avant de s'afficher. */
const ATTENTE = { timeout: 5000 }

const ACTIONS = /Marquer traité|Changer le statut|Saisir|Enregistrer|Ajouter|Modifier|Mettre à jour/

describe('/ma-fiche', () => {
  it('le ministère lit sa fiche, avec ses boutons de saisie et ses valeurs exactes', async () => {
    const faux = installer('ministere', lignesFiche('ministere'))
    afficher('/ma-fiche')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Social' }, ATTENTE),
    ).toBeInTheDocument()
    expect(document.title).toBe('Ma fiche, Pilotage EJP')
    expect(screen.getByRole('link', { name: 'Saisir les chiffres du dimanche' })).toBeVisible()
    expect(screen.queryByText('moins de 3')).toBeNull()
    expect(await screen.findByText('STARs au service : 10', {}, ATTENTE)).toBeInTheDocument()
    expect(faux.tables).toEqual(
      expect.arrayContaining(['v_ventilation_sensible', 'v_precision_sensible', 'v_journal']),
    )
  })

  it('une lecture en échec : le bandeau « Réessayer », jamais une page blanche', async () => {
    installer('ministere', lignesFiche('ministere'), ['v_indicateur_suivi'])
    afficher('/ma-fiche')
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('les points en échec : leur bloc propose « Réessayer », le reste de la fiche reste lu', async () => {
    installer('ministere', lignesFiche('ministere'), ['v_point'])
    afficher('/ma-fiche')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Social' }, ATTENTE),
    ).toBeInTheDocument()
    const points = await screen.findByRole('region', { name: "Points d'attention" }, ATTENTE)
    expect(within(points).getByRole('alert')).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(within(points).getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.getByText('Octobre en cours : 7')).toBeInTheDocument()
  })

  it('le détail des sensibles en échec : « Réessayer » sous les chiffres, sans les précisions', async () => {
    installer('ministere', lignesFiche('ministere'), ['v_precision_sensible'])
    afficher('/ma-fiche')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Social' }, ATTENTE),
    ).toBeInTheDocument()
    const chiffres = await screen.findByRole('region', { name: 'Les chiffres du ministère' })
    expect(within(chiffres).getByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
    expect(within(chiffres).getByText('Octobre en cours : 7')).toBeInTheDocument()
    expect(within(chiffres).queryByText(/^Précision d/)).toBeNull()
  })
})

describe('/ministeres/:id', () => {
  it('EJP Tech lit la fiche sans aucun bouton d’action (T29)', async () => {
    installer('admin_plateforme', lignesFiche('admin_plateforme'))
    afficher(`/ministeres/${SOCIAL}`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Social' }, ATTENTE),
    ).toBeInTheDocument()
    expect(document.title).toBe('Fiche du ministère, Pilotage EJP')
    expect(screen.getAllByText('moins de 3')[0]).toBeVisible()
    const main = screen.getByRole('main')
    expect(within(main).queryByRole('link', { name: ACTIONS })).toBeNull()
    for (const bouton of within(main).queryAllByRole('button')) {
      expect(bouton.getAttribute('aria-label')).toMatch(/^Aide : /)
    }
  })

  it('un identifiant inconnu : « Ce ministère n’existe pas ou n’est plus actif. »', async () => {
    installer('berger', { ...lignesFiche('berger'), ministere: [] })
    afficher('/ministeres/10000000-0000-4000-8000-000000000099')
    expect(
      await screen.findByText("Ce ministère n'existe pas ou n'est plus actif.", {}, ATTENTE),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir aux ministères' })).toHaveAttribute(
      'href',
      '/ministeres',
    )
  })

  it('un identifiant mal formé : la fiche introuvable, sans aucune requête de données', async () => {
    const faux = installer('conseil')
    afficher('/ministeres/pas-un-identifiant')
    expect(
      await screen.findByText("Ce ministère n'existe pas ou n'est plus actif.", {}, ATTENTE),
    ).toBeInTheDocument()
    expect(faux.tables).toEqual(['compte'])
  })

  it('un ministère désactivé : introuvable', async () => {
    const lignes = lignesFiche('berger')
    installer('berger', {
      ...lignes,
      ministere: [
        {
          ...lecturesExempleFiche('berger', false).ministere,
          desactive_le: '2026-09-01T10:00:00Z',
        },
      ],
    })
    afficher(`/ministeres/${SOCIAL}`)
    expect(
      await screen.findByText("Ce ministère n'existe pas ou n'est plus actif.", {}, ATTENTE),
    ).toBeInTheDocument()
  })
})

describe('/ministeres', () => {
  it('le berger lit la liste, chaque nom ouvre la fiche, description sous le nom', async () => {
    installer('berger', { v_semaine: [SEMAINE], v_tableau_ministeres: TABLEAU_EXEMPLE })
    afficher('/ministeres')
    expect(
      await screen.findByText(/Du moins récent au plus récent/, {}, ATTENTE),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Communication' })).toHaveAttribute(
      'href',
      '/ministeres/10000000-0000-4000-8000-000000000001',
    )
    expect(screen.getByText('Visuels, réseaux sociaux et captations des cultes.')).toBeVisible()
    const lignes = screen.getAllByRole('row').slice(1)
    expect(lignes.map((ligne) => within(ligne).getByRole('link').textContent)).toEqual([
      'Coordination',
      'Social',
      'Intégration',
      'Communication',
    ])
  })

  it('aucun ministère actif : la phrase de premier usage, sans tableau vide', async () => {
    installer('conseil', { v_semaine: [SEMAINE], v_tableau_ministeres: [] })
    afficher('/ministeres')
    expect(
      await screen.findByText(
        "Aucun ministère actif. L'administration de l'église crée les ministères.",
        {},
        ATTENTE,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('problème passager : bandeau et « Réessayer »', async () => {
    installer('admin_plateforme', { v_semaine: [SEMAINE] }, ['v_tableau_ministeres'])
    afficher('/ministeres')
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
  })
})
