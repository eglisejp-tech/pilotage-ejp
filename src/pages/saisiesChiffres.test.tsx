import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import {
  CATEGORIES_EXEMPLE,
  INDICATEURS_DIMANCHE,
  indicateursMoisExemple,
  MESURES_A_CE_JOUR,
} from '@/features/saisie-chiffres/apercu/exemples'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'

// Les deux pages du lot E3 (/saisir/dimanche, /saisir/mois) avec le faux client. Le faux client ne
// filtre pas : chaque test donne les lignes telles que la base les rendrait. Les profils autres
// que le ministère sont refusés sans requête (routes.test.tsx, et ici pour EJP Tech).

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."
const ATTENTE = { timeout: 4000 }
const SEMAINE = {
  aujourdhui: '2026-09-29',
  dimanche: '2026-09-27',
  lundi: '2026-09-21',
  numero: 39,
}

function connecte(
  type: TypeCompte,
  lignes: Record<string, unknown[]> = {},
  enEchec: string[] = [],
) {
  const faux = fauxSupabase({
    utilisateur: { id: 'u-1', email: 'compte@exemple.test' },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: 'u-1',
      type,
      ministere_id: type === 'ministere' ? 'ministere-exemple' : null,
      libelle: type === 'ministere' ? 'Ministère Communication' : 'EJP Tech, compte 1',
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

describe('/saisir/dimanche', () => {
  it('le ministère : le dimanche de référence, ses champs, quatre aides', async () => {
    const faux = connecte('ministere', {
      v_semaine: [SEMAINE],
      indicateur: INDICATEURS_DIMANCHE,
      v_mesure_periode: MESURES_A_CE_JOUR,
    })
    afficher('/saisir/dimanche')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dimanche 27 septembre' }, ATTENTE),
    ).toBeInTheDocument()
    expect(screen.getByText('Chiffres du dimanche')).toBeInTheDocument()
    expect(
      screen.getByLabelText('STARs au service ce dimanche', { exact: true }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(4)
    expect(new Set(faux.tables)).toEqual(
      new Set(['compte', 'v_semaine', 'indicateur', 'v_mesure_periode']),
    )
  })

  it('une date qui n’est pas un dimanche : aucun résultat, retour au dimanche de référence', async () => {
    connecte('ministere', { v_semaine: [SEMAINE], indicateur: INDICATEURS_DIMANCHE })
    afficher('/saisir/dimanche?date=2026-09-28')
    expect(
      await screen.findByText(
        "Ce dimanche ne se saisit pas : choisissez un dimanche passé ou aujourd'hui.",
        undefined,
        ATTENTE,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saisir le dimanche 27 sept.' })).toHaveAttribute(
      'href',
      '/saisir/dimanche?date=2026-09-27',
    )
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toBeInTheDocument()
  })

  it('une lecture en échec : « La connexion a échoué. Réessayez. » et « Réessayer »', async () => {
    connecte('ministere', { indicateur: INDICATEURS_DIMANCHE }, ['v_semaine'])
    afficher('/saisir/dimanche')
    expect(
      await screen.findByText('La connexion a échoué. Réessayez.', undefined, { timeout: 6000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})

describe('/saisir/mois', () => {
  it('le ministère : le dernier mois fini non saisi, ses champs et la grille', async () => {
    const faux = connecte('ministere', {
      v_semaine: [SEMAINE],
      indicateur: indicateursMoisExemple(true),
      categorie_sensible: CATEGORIES_EXEMPLE,
    })
    afficher('/saisir/mois')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Août 2026' }, ATTENTE),
    ).toBeInTheDocument()
    expect(screen.getByText('Chiffres du mois')).toBeInTheDocument()
    expect(screen.getByLabelText('Malaise', { exact: true })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(4)
    // Le mois n'a pas de total saisi : ni répartition ni précision à lire.
    expect(faux.tables).not.toContain('ventilation_sensible')
    expect(faux.tables).not.toContain('precision_sensible')
  })

  it('le mois en cours d’un sensible s’ouvre (P45), marqué « en cours »', async () => {
    connecte('ministere', {
      v_semaine: [SEMAINE],
      indicateur: indicateursMoisExemple(true),
      categorie_sensible: CATEGORIES_EXEMPLE,
    })
    afficher('/saisir/mois?mois=2026-09')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Septembre 2026, en cours' }, ATTENTE),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Bénéficiaires (passages)', { exact: true })).toBeInTheDocument()
  })

  it('un mois futur dans l’adresse : son message, et le mois proposé', async () => {
    connecte('ministere', { v_semaine: [SEMAINE], indicateur: indicateursMoisExemple(true) })
    afficher('/saisir/mois?mois=2026-11')
    expect(
      await screen.findByText("Ce mois n'est pas encore commencé.", undefined, ATTENTE),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saisir août 2026' })).toHaveAttribute(
      'href',
      '/saisir/mois?mois=2026-08',
    )
  })

  it('sans indicateur du mois : « Votre ministère n’a pas d’indicateur du mois. » et « Revenir à ma fiche »', async () => {
    connecte('ministere', { v_semaine: [SEMAINE], indicateur: INDICATEURS_DIMANCHE })
    afficher('/saisir/mois')
    expect(
      await screen.findByText("Votre ministère n'a pas d'indicateur du mois.", undefined, ATTENTE),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir à ma fiche' })).toHaveAttribute(
      'href',
      '/ma-fiche',
    )
    expect(screen.queryByRole('button', { name: /^Enregistrer/ })).toBeNull()
  })
})

describe('EJP Tech lit tout et ne saisit rien (T29)', () => {
  it.each(['/saisir/dimanche', '/saisir/mois?mois=2026-09'])(
    '%s : la page non disponible, aucune requête au-delà du compte, aucun bouton de saisie',
    async (adresse) => {
      const faux = connecte('admin_plateforme')
      afficher(adresse)
      expect(
        await screen.findByRole('heading', { level: 1, name: NON_DISPONIBLE }, ATTENTE),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Enregistrer/ })).toBeNull()
      expect(faux.tables).toEqual(['compte'])
    },
  )
})
