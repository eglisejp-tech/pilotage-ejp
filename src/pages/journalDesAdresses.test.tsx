import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within, configure } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import { COMMUNS_EXEMPLE, LIGNES_EXEMPLE } from '@/features/journal/apercu/exemplesJournal'
import { effacerMotDePasseAChoisir } from '@/features/session/motDePasseAChoisir'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'

// Sous la charge de toute la suite, une lecture simulée peut dépasser la seconde par défaut.
configure({ asyncUtilTimeout: 5000 })

// Le journal et le journal technique par les vraies adresses de l'application (lot L5) : la page
// choisie par `PageApplication`, avec un faux client Supabase. Les parcours complets (filtres,
// 50 lignes de plus) sont dans `VueJournal.test.tsx` et `e2e/journal.spec.ts`.

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const LIBELLES: Record<TypeCompte, string> = {
  ministere: 'Ministère Communication',
  berger: 'Berger',
  conseil: 'Conseil, compte 1',
  admin_eglise: "Administration de l'église",
  admin_plateforme: 'EJP Tech, compte 1',
}

function connecter(type: TypeCompte) {
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
    lignes: {
      v_semaine: [
        { aujourdhui: '2026-10-01', dimanche: '2026-09-27', lundi: '2026-09-21', numero: 39 },
      ],
      indicateur: COMMUNS_EXEMPLE,
      ministere: [{ id: 'min-jeunesse', code: null, nom: 'Jeunesse', desactive_le: null }],
      v_journal: LIGNES_EXEMPLE.slice(0, 3),
    },
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
  effacerMotDePasseAChoisir()
  vi.clearAllMocks()
})

describe('le journal par les adresses de l’application', () => {
  it('EJP Tech : /journal-technique, « Journal technique », en lecture seule', async () => {
    const faux = connecter('admin_plateforme')
    afficher('/journal-technique')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Journal technique' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Lignes du journal' })).toBeInTheDocument()
    expect(faux.tables).toContain('v_journal')
    const contenu = screen.getByRole('main')
    expect(
      within(contenu).queryByRole('button', { name: /Enregistrer|Saisir|Ajouter|Modifier/ }),
    ).toBeNull()
    expect(
      within(screen.getAllByRole('navigation', { name: 'Navigation principale' })[0]!).getByRole(
        'link',
        { name: 'Journal technique' },
      ),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('EJP Tech n’ouvre pas /journal : page non disponible, aucune lecture du journal', async () => {
    const faux = connecter('admin_plateforme')
    afficher('/journal')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "Cette page n'est pas disponible avec votre compte.",
      }),
    ).toBeInTheDocument()
    expect(faux.tables).not.toContain('v_journal')
  })

  it('le berger n’ouvre pas /journal-technique', async () => {
    const faux = connecter('berger')
    afficher('/journal-technique')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "Cette page n'est pas disponible avec votre compte.",
      }),
    ).toBeInTheDocument()
    expect(faux.tables).not.toContain('v_journal')
  })

  it('le ministère : « Mon journal », sans filtre Compte, sans lecture des comptes', async () => {
    const faux = connecter('ministere')
    afficher('/journal')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mon journal' }),
    ).toBeInTheDocument()
    await screen.findByRole('list', { name: 'Lignes du journal' })
    expect(screen.queryByRole('combobox', { name: 'Compte' })).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Action' })).toBeInTheDocument()
    expect(faux.tables.filter((table) => table === 'compte')).toHaveLength(1)
  })

  it('le berger : « Journal », avec le filtre Compte et le ministère de l’adresse', async () => {
    connecter('berger')
    afficher('/journal?ministere=min-jeunesse')
    expect(await screen.findByRole('heading', { level: 1, name: 'Journal' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Compte' })).toBeInTheDocument()
    expect(await screen.findByText('Ministère : Jeunesse')).toBeInTheDocument()
  })
})
