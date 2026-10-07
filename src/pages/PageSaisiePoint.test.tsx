import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'
import type { ScenarioSession } from '@/test/fauxSupabase'

// Page « Nouveau point d'attention » (lot P2), par les routes de l'application : chaque profil,
// chaque état de lecture, et un envoi complet par `creer_point` (le seul appel d'écriture).

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const COORDINATION = '10000000-0000-4000-8000-000000000002'
const POINT = '30000000-0000-4000-8000-000000000001'

const MINISTERES = [
  { id: COMMUNICATION, code: null, nom: 'Communication', desactive_le: null },
  { id: COORDINATION, code: 'coordination', nom: 'Coordination', desactive_le: null },
  {
    id: '10000000-0000-4000-8000-000000000005',
    code: null,
    nom: 'Intégration',
    desactive_le: null,
  },
  {
    id: '10000000-0000-4000-8000-000000000009',
    code: null,
    nom: 'Ancien ministère',
    desactive_le: '2026-09-01T10:00:00Z',
  },
]

const SEMAINE = {
  aujourdhui: '2026-10-06',
  dimanche: '2026-10-04',
  lundi: '2026-09-28',
  numero: 40,
}

function connecte(type: TypeCompte, lignes: ScenarioSession['lignes'] = {}, enEchec?: string[]) {
  const faux = fauxSupabase({
    utilisateur: { id: `u-${type}`, email: `${type}@exemple.test` },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: `u-${type}`,
      type,
      ministere_id: type === 'ministere' ? COMMUNICATION : null,
      libelle: type === 'ministere' ? 'Ministère Communication' : 'Berger',
      desactive_le: null,
    },
    facteursVerifies: ['f1'],
    lignes: { v_semaine: [SEMAINE], ministere: MINISTERES, ...lignes },
    enEchec,
  })
  const rpc = vi.fn<(nom: string, args: unknown) => Promise<{ data: string; error: null }>>(() =>
    Promise.resolve({ data: POINT, error: null }),
  )
  courant.client = { ...faux.client, rpc }
  return { ...faux, rpc }
}

function afficher(adresse: string) {
  return render(
    <QueryClientProvider client={clientRequetes}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [adresse] })} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  clientRequetes.clear()
  vi.clearAllMocks()
})

describe('/saisir/point (maquette 10)', () => {
  it('ministère : le formulaire, les autres ministères actifs à mentionner, jamais lui-même', async () => {
    const faux = connecte('ministere')
    afficher('/saisir/point')
    expect(await screen.findByRole('checkbox', { name: 'Coordination' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Nouveau point d'attention")
    expect(document.title).toBe("Nouveau point d'attention, Pilotage EJP")
    // Ni lui-même, ni un ministère désactivé.
    expect(
      screen
        .getAllByRole('checkbox')
        .map((caseACocher) => caseACocher.closest('label')?.textContent),
    ).toEqual(['Coordination', 'Intégration'])
    expect(screen.getByLabelText('Échéance (facultatif)')).toHaveAttribute('min', '2026-10-06')
    expect(
      within(screen.getByRole('heading', { level: 1 }).parentElement as HTMLElement).getByText(
        'Ministère Communication',
      ),
    ).toBeInTheDocument()
    expect(new Set(faux.tables)).toEqual(new Set(['compte', 'v_semaine', 'ministere']))
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('envoi : un seul appel à creer_point avec ses six arguments, « Point créé. »', async () => {
    const faux = connecte('ministere')
    afficher('/saisir/point')
    const utilisateur = userEvent.setup()
    await utilisateur.type(await screen.findByLabelText('Titre'), 'Salle pour la soirée')
    await utilisateur.click(screen.getByRole('radio', { name: 'Urgente' }))
    await utilisateur.type(screen.getByLabelText('Échéance (facultatif)'), '2026-10-12')
    await utilisateur.click(screen.getByRole('checkbox', { name: 'Intégration' }))
    await utilisateur.click(screen.getByRole('button', { name: 'Créer le point' }))
    expect(await screen.findByText('Point créé.')).toBeInTheDocument()
    expect(faux.rpc).toHaveBeenCalledTimes(1)
    expect(faux.rpc).toHaveBeenCalledWith('creer_point', {
      p_titre: 'Salle pour la soirée',
      p_description: null,
      p_action_attendue: null,
      p_priorite: 'urgente',
      p_echeance: '2026-10-12',
      p_mentions: ['10000000-0000-4000-8000-000000000005'],
    })
    // Jamais d'écriture directe dans une table.
    expect(faux.tables.filter((table) => table.startsWith('point'))).toEqual([])
  })

  it('lecture en échec : problème passager avec « Réessayer », sans formulaire', async () => {
    connecte('ministere', {}, ['v_semaine'])
    afficher('/saisir/point')
    // Une lecture en échec est retentée une fois (clientRequetes) avant le problème passager.
    expect(await screen.findByRole('alert', undefined, { timeout: 4000 })).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Créer le point' })).toBeNull()
  })

  it.each(['berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const)(
    '%s : la page non disponible, sans aucune requête de données ni bouton de création',
    async (type) => {
      const faux = connecte(type)
      afficher('/saisir/point')
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: "Cette page n'est pas disponible avec votre compte.",
        }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Créer le point' })).toBeNull()
      expect(faux.tables.every((table) => table === 'compte')).toBe(true)
      expect(faux.rpc).not.toHaveBeenCalled()
    },
  )
})
