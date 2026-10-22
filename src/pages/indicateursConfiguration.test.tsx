import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import {
  ID_COMMUNICATION,
  ID_KUMI,
  lecturesExemple,
} from '@/features/indicateurs/configuration/apercu/exemples'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'

// Écrans `/indicateurs` et `/indicateurs/:id` (lot L3a), par les routes de l'application : les
// lectures, la création des prévus par `creer_indicateurs_prevus`, la garde du profil. Seuls
// l'administration de l'église et EJP Tech ont ces pages ; les autres profils ne lisent rien.

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const PAGE_NON_DISPONIBLE = 'Page non disponible'
const ID_INCONNU = '10000000-0000-4000-8000-0000000000ff'

function connecte(type: TypeCompte, enEchec: string[] = []) {
  const lectures = lecturesExemple()
  const faux = fauxSupabase({
    utilisateur: { id: `u-${type}`, email: `${type}@exemple.test` },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: `u-${type}`,
      type,
      ministere_id: type === 'ministere' ? ID_COMMUNICATION : null,
      libelle: 'Compte',
      desactive_le: null,
    },
    facteursVerifies: ['f1'],
    lignes: {
      ministere: [...lectures.ministeres],
      indicateur: [...lectures.indicateurs],
      v_usage_indicateurs: [...lectures.usage],
      v_catalogue: [...lectures.catalogue],
      v_journal: [...lectures.changements],
    },
    enEchec,
  })
  const rpc = vi.fn((nom: string, args: unknown) => {
    void nom
    void args
    return Promise.resolve({ data: 6, error: null })
  })
  courant.client = faux.clientAvecRpc(rpc)
  return { ...faux, rpc }
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

const TABLES_DE_CONFIGURATION = [
  'ministere',
  'indicateur',
  'v_usage_indicateurs',
  'v_catalogue',
  'v_journal',
]

describe.each<TypeCompte>(['admin_eglise', 'admin_plateforme'])('/indicateurs, %s', (profil) => {
  it('lit les définitions, l’usage, le catalogue et le journal, jamais une valeur', async () => {
    const faux = connecte(profil)
    afficher('/indicateurs')
    const tableau = await screen.findByRole('table', { name: 'Indicateurs' })
    expect(within(tableau).getByRole('link', { name: 'Kumi' })).toBeInTheDocument()
    expect(document.title).toBe('Indicateurs, Pilotage EJP')
    const lues = new Set(faux.tables)
    for (const table of TABLES_DE_CONFIGURATION) expect(lues.has(table), table).toBe(true)
    for (const interdite of ['mesure', 'v_mesure_periode', 'v_indicateur_suivi', 'v_calcul']) {
      expect(lues.has(interdite), interdite).toBe(false)
    }
  })

  it('un identifiant mal formé : « Ce ministère est introuvable. », aucune lecture de plus', async () => {
    const faux = connecte(profil)
    afficher('/indicateurs/pas-un-identifiant')
    expect(await screen.findByText('Ce ministère est introuvable.')).toBeInTheDocument()
    expect(faux.tables).toEqual(['compte'])
  })

  it('un identifiant bien formé mais inconnu : la même phrase, et le retour aux indicateurs', async () => {
    connecte(profil)
    afficher(`/indicateurs/${ID_INCONNU}`)
    expect(await screen.findByText('Ce ministère est introuvable.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir aux indicateurs' })).toBeInTheDocument()
  })

  it('une lecture qui échoue : bandeau « La connexion a échoué. Réessayez. »', async () => {
    connecte(profil, ['v_catalogue'])
    afficher('/indicateurs')
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})

// EJP Tech configure seul les indicateurs (décision T60).
describe('/indicateurs, admin_plateforme : la configuration', () => {
  const profil: TypeCompte = 'admin_plateforme'

  it('« Créer » appelle creer_indicateurs_prevus avec le modèle du ministère, puis dit « 6 indicateurs prévus créés. »', async () => {
    const faux = connecte(profil)
    afficher('/indicateurs')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Créer les 6 indicateurs prévus de Kumi' }),
    )
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('creer_indicateurs_prevus', {
        p_ministere_id: ID_KUMI,
        p_modele: 'kumi',
      }),
    )
    expect(faux.rpc).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('6 indicateurs prévus créés.')).toBeInTheDocument()
  })

  it('un ministère ouvre son écran : le bloc des prévus et son bouton', async () => {
    connecte(profil)
    afficher(`/indicateurs/${ID_KUMI}`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Indicateurs de Kumi' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Créer ces 6 indicateurs' })).toBeInTheDocument()
  })

  it('un refus de la base reste sous le bouton, et ne suit pas le navigateur vers un autre ministère', async () => {
    const faux = connecte(profil)
    faux.rpc.mockRejectedValueOnce({
      code: 'P0001',
      message:
        'La fiche a déjà « Publications » : retirez-le avant de créer les indicateurs prévus.',
    })
    const routeur = afficher(`/indicateurs/${ID_KUMI}`)
    const bouton = await screen.findByRole('button', { name: 'Créer ces 6 indicateurs' })
    await userEvent.click(bouton)
    const alerte = await screen.findByRole('alert')
    expect(alerte).toHaveTextContent('La fiche a déjà « Publications »')
    expect(bouton.compareDocumentPosition(alerte) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    await routeur.navigate(`/indicateurs/${ID_COMMUNICATION}`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Indicateurs de Communication' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

// L'administration de l'église lit les deux écrans, sans aucun bouton (décision T60).
describe('/indicateurs, admin_eglise : la lecture seule', () => {
  const LECTURE = 'EJP Tech crée, corrige et retire les indicateurs. Adressez-lui vos demandes.'

  it('la liste : la phrase de lecture, aucun « Créer », aucun appel', async () => {
    const faux = connecte('admin_eglise')
    afficher('/indicateurs')
    const tableau = await screen.findByRole('table', { name: 'Indicateurs' })
    expect(screen.getByText(LECTURE)).toBeInTheDocument()
    expect(within(tableau).getByText('6 à créer')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Créer/ })).toBeNull()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un ministère : la phrase de lecture, ni bloc des prévus ni bouton d’ajout', async () => {
    const faux = connecte('admin_eglise')
    afficher(`/indicateurs/${ID_KUMI}`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Indicateurs de Kumi' }),
    ).toBeInTheDocument()
    expect(screen.getByText(LECTURE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Créer|Ajouter/ })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Indicateurs prévus' })).toBeNull()
    expect(faux.rpc).not.toHaveBeenCalled()
  })
})

describe.each<TypeCompte>(['ministere', 'berger', 'conseil'])('%s', (profil) => {
  it.each(['/indicateurs', `/indicateurs/${ID_KUMI}`])(
    '%s : page non disponible, aucune requête au-delà du compte',
    async (adresse) => {
      const faux = connecte(profil)
      afficher(adresse)
      expect(
        await screen.findByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
      ).toBeInTheDocument()
      expect(faux.tables).toEqual(['compte'])
      expect(faux.rpc).not.toHaveBeenCalled()
    },
  )
})
