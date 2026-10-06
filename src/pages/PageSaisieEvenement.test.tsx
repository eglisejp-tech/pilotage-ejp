import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'
import type { ScenarioSession } from '@/test/fauxSupabase'

// Pages de saisie d'événement et de réunion (lot E5), par les routes de l'application : chaque
// profil, chaque état de lecture. Les envois sont testés avec les formulaires et `src/data`.

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

const COMMUNICATION = 'm-communication'
const COORDINATION = 'm-coordination'
const EVENEMENT = '42000000-0000-4000-8000-000000000001'

const MINISTERES = [
  { id: COMMUNICATION, code: null, nom: 'Communication', desactive_le: null },
  { id: COORDINATION, code: 'coordination', nom: 'Coordination', desactive_le: null },
  { id: 'm-integration', code: null, nom: 'Intégration', desactive_le: null },
  { id: 'm-ancien', code: null, nom: 'Ancien ministère', desactive_le: '2026-09-01T10:00:00Z' },
]

const SEMAINE = {
  aujourdhui: '2026-10-06',
  dimanche: '2026-10-04',
  lundi: '2026-09-28',
  numero: 40,
}

function evenement(ministereId: string) {
  return {
    id: EVENEMENT,
    ministere_id: ministereId,
    titre: 'Réunion des responsables',
    date: '2026-09-26',
    statut: 'attente_validation',
    a_confirmer: true,
    reporte_du: '2026-09-24',
  }
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
  courant.client = faux.client
  return faux
}

function afficher(adresse: string) {
  render(
    <QueryClientProvider client={clientRequetes}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [adresse] })} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  clientRequetes.clear()
  vi.clearAllMocks()
})

const PAGE_NON_DISPONIBLE = "Cette page n'est pas disponible avec votre compte."

describe('/saisir/evenement (ajout, maquette 11)', () => {
  it('ministère : le formulaire, les autres ministères actifs à mentionner, jamais lui-même', async () => {
    const faux = connecte('ministere')
    afficher('/saisir/evenement')
    expect(await screen.findByRole('checkbox', { name: 'Coordination' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ajouter un événement')
    expect(document.title).toBe('Ajouter un événement, Pilotage EJP')
    expect(
      screen
        .getAllByRole('checkbox')
        .map((caseACocher) => caseACocher.closest('label')?.textContent),
    ).toEqual(['Coordination', 'Intégration'])
    expect(screen.getByLabelText('Date')).toHaveAttribute('min', '2026-10-06')
    expect(screen.getByRole('button', { name: 'Ajouter au calendrier' })).toBeInTheDocument()
    expect(new Set(faux.tables)).toEqual(new Set(['compte', 'v_semaine', 'ministere']))
  })

  it('lecture en échec : problème passager avec « Réessayer », sans formulaire', async () => {
    connecte('ministere', {}, ['v_semaine'])
    afficher('/saisir/evenement')
    // Une lecture en échec est retentée une fois (clientRequetes) avant le problème passager.
    expect(await screen.findByRole('alert', undefined, { timeout: 4000 })).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ajouter au calendrier' })).toBeNull()
  })

  it.each(['berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const)(
    '%s : la page non disponible, sans aucune requête de données ni bouton de saisie',
    async (type) => {
      const faux = connecte(type)
      for (const adresse of ['/saisir/evenement', `/saisir/evenement/${EVENEMENT}`]) {
        afficher(adresse)
        expect(
          await screen.findByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Ajouter|Enregistrer/ })).toBeNull()
        document.body.innerHTML = ''
      }
      expect(faux.tables.every((table) => table === 'compte')).toBe(true)
    },
  )
})

describe('/saisir/evenement/:id (mise à jour)', () => {
  it('porteur : nom et mentions en lecture seule, date et statut préremplis, ligne « à confirmer »', async () => {
    connecte('ministere', {
      v_evenement: [evenement(COMMUNICATION)],
      evenement_mention: [{ evenement_id: EVENEMENT, ministere_id: COORDINATION }],
    })
    afficher(`/saisir/evenement/${EVENEMENT}`)
    expect(
      await screen.findByRole('button', { name: 'Enregistrer la mise à jour' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent("Mettre à jour l'événement")
    expect(screen.getByText('Réunion des responsables')).toBeInTheDocument()
    expect(screen.getByText(/^Ministères mentionnés : Coordination\./)).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveValue('2026-09-26')
    expect(screen.getByRole('radio', { name: 'En attente de validation' })).toBeChecked()
    expect(screen.getByText(/^Cet événement attend toujours sa validation\./)).toBeInTheDocument()
  })

  it('ministère mentionné : « Seul Coordination met à jour cet événement. », sans formulaire ni lecture des mentions', async () => {
    const faux = connecte('ministere', { v_evenement: [evenement(COORDINATION)] })
    afficher(`/saisir/evenement/${EVENEMENT}`)
    expect(
      await screen.findByText('Seul Coordination met à jour cet événement.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir à ma fiche' })).toHaveAttribute(
      'href',
      '/ma-fiche',
    )
    expect(screen.queryByRole('radio')).toBeNull()
    expect(faux.tables).not.toContain('evenement_mention')
  })

  it('événement illisible (autre ministère) : « Cet élément n’existe pas ou vous n’y avez pas accès. »', async () => {
    connecte('ministere', { v_evenement: [] })
    afficher(`/saisir/evenement/${EVENEMENT}`)
    expect(
      await screen.findByText("Cet élément n'existe pas ou vous n'y avez pas accès."),
    ).toBeInTheDocument()
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('identifiant qui n’en est pas un : le même message, sans aucune requête de données', async () => {
    const faux = connecte('ministere')
    afficher('/saisir/evenement/pas-un-identifiant')
    expect(
      await screen.findByText("Cet élément n'existe pas ou vous n'y avez pas accès."),
    ).toBeInTheDocument()
    expect(faux.tables.every((table) => table === 'compte')).toBe(true)
  })
})

describe('/saisir/reunion', () => {
  it('ministère sans réunion à venir : le formulaire vide (« Renseigner »)', async () => {
    connecte('ministere', { v_prochaine_reunion: [] })
    afficher('/saisir/reunion')
    expect(
      await screen.findByRole('button', { name: 'Enregistrer la réunion' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Prochaine réunion')
    expect(screen.getByLabelText('Date')).toHaveValue('')
  })

  it('réunion déclarée : le formulaire prérempli (« Modifier »), texte masqué non repris', async () => {
    connecte('ministere', {
      v_prochaine_reunion: [
        {
          id: 'r-1',
          ministere_id: COMMUNICATION,
          date: '2026-10-12',
          heure: '20:00:00',
          objet: '[texte masqué par EJP Tech]',
          decision_attendue: 'Choisir la salle',
        },
      ],
    })
    afficher('/saisir/reunion')
    expect(await screen.findByLabelText('Heure (facultatif)')).toHaveValue('20:00')
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-12')
    expect(screen.getByLabelText('Objet (facultatif)')).toHaveValue('')
    expect(screen.getByLabelText('Décision attendue (facultatif)')).toHaveValue('Choisir la salle')
  })

  it.each(['berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const)(
    '%s : la page non disponible, sans aucune requête de données',
    async (type) => {
      const faux = connecte(type)
      afficher('/saisir/reunion')
      expect(
        await screen.findByRole('heading', { level: 1, name: PAGE_NON_DISPONIBLE }),
      ).toBeInTheDocument()
      expect(faux.tables.every((table) => table === 'compte')).toBe(true)
    },
  )
})
