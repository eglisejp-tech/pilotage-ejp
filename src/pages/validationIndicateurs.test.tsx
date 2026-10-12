import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/routes'
import {
  ATTENTES_EXEMPLE,
  DECISIONS_EXEMPLE,
  DEMANDES_EXEMPLE,
} from '@/features/indicateurs/validation/apercu/exemples'
import type { TypeCompte } from '@/lib/base'
import { clientRequetes } from '@/lib/requetes'
import { fauxSupabase } from '@/test/fauxSupabase'

// Bloc « À valider » de `/indicateurs` (lot L4), par les routes de l'application : EJP Tech lit la
// file avec le « Pourquoi » et décide par `valider_indicateur` ; l'administration de l'église lit
// l'attente sans bouton ni « Pourquoi », sans jamais lire `v_a_valider`, `validation` ni
// `demande_indicateur`.

const courant = vi.hoisted(() => ({ client: undefined as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: () => courant.client }))

type Options = {
  lignes?: Record<string, unknown[]>
  enEchec?: string[]
}

function connecte(type: TypeCompte, options: Options = {}) {
  const faux = fauxSupabase({
    utilisateur: { id: `u-${type}`, email: `${type}@exemple.test` },
    niveau: { currentLevel: 'aal2', nextLevel: 'aal2' },
    compte: {
      user_id: `u-${type}`,
      type,
      ministere_id: null,
      libelle: 'Compte',
      desactive_le: null,
    },
    facteursVerifies: ['f1'],
    lignes: {
      ministere: [
        {
          id: '10000000-0000-4000-8000-000000000011',
          code: null,
          nom: 'Kumi',
          desactive_le: null,
        },
        {
          id: '10000000-0000-4000-8000-000000000001',
          code: null,
          nom: 'Communication',
          desactive_le: null,
        },
        {
          id: '10000000-0000-4000-8000-000000000003',
          code: null,
          nom: 'Intégration',
          desactive_le: null,
        },
      ],
      indicateur: [
        ...ATTENTES_EXEMPLE.map((attente) => ({
          id: attente.indicateur_id,
          libelle: attente.libelle,
          definition: attente.definition,
          nature: attente.nature,
          ministere_id: attente.ministere_id,
          cree_le: attente.cree_le,
          etat: 'en_attente',
          origine: 'ministere',
        })),
      ],
      v_usage_indicateurs: ATTENTES_EXEMPLE.map((attente) => ({
        indicateur_id: attente.indicateur_id,
        attente_jours: attente.attente_jours,
      })),
      v_a_valider: [...DEMANDES_EXEMPLE],
      v_semaine: [],
      ...options.lignes,
    },
    enEchec: options.enEchec,
  })
  const rpc = vi.fn((nom: string, args: unknown) => {
    void nom
    void args
    return Promise.resolve({ data: null, error: null })
  })
  courant.client = { ...faux.client, rpc }
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

const ligne = (ministere: string) =>
  within(screen.getByRole('heading', { level: 3, name: ministere }).closest('article')!)

/** Le bloc, une fois la liste affichée. */
async function bloc() {
  const section = await screen.findByRole('region', { name: 'À valider' }, { timeout: 5000 })
  await screen.findByRole('heading', { level: 3, name: 'Kumi' }, { timeout: 5000 })
  return within(section)
}

describe('/indicateurs, bloc « À valider » pour EJP Tech', () => {
  it('lit la file avec le « Pourquoi », du plus ancien au plus récent, « en retard » avec le mot', async () => {
    const faux = connecte('admin_plateforme')
    afficher('/indicateurs')
    const lu = await bloc()
    expect(lu.getByText('3 ajouts en attente')).toBeInTheDocument()
    const noms = screen
      .getAllByRole('heading', { level: 3 })
      .map((titre) => titre.textContent ?? '')
    expect(noms).toEqual(['Kumi', 'Communication', 'Intégration'])
    expect(ligne('Kumi').getByText('Envoyé le 1 oct.')).toBeInTheDocument()
    expect(ligne('Kumi').getByText(/depuis 9 jours/)).toBeInTheDocument()
    expect(ligne('Kumi').getByText('en retard')).toBeInTheDocument()
    expect(ligne('Communication').queryByText('en retard')).toBeNull()
    expect(ligne('Kumi').getByText(/Suivre les demandes de l'équipe/)).toBeInTheDocument()
    expect(ligne('Kumi').getByText('2 valeurs déjà saisies')).toBeInTheDocument()
    expect(
      ligne('Kumi').getByText(/Nouvel indicateur\s*: «\s*Demandes reçues\s*» \(chaque mois\)/),
    ).toBeInTheDocument()
    expect(ligne('Communication').getByText(/\(à ce jour\)/)).toBeInTheDocument()
    expect(faux.tables).toContain('v_a_valider')
  })

  it('un « Pourquoi » masqué s’affiche tel quel, sans bouton de plus', async () => {
    connecte('admin_plateforme')
    afficher('/indicateurs')
    await bloc()
    expect(ligne('Intégration').getByText('[texte masqué par EJP Tech]')).toBeInTheDocument()
  })

  it('chaque ligne a « Valider » et « Refuser », nommés par l’indicateur et le ministère', async () => {
    connecte('admin_plateforme')
    afficher('/indicateurs')
    await bloc()
    expect(
      screen.getByRole('button', { name: /^Valider «\s*Demandes reçues\s*» de Kumi$/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^Refuser «\s*Demandes reçues\s*» de Kumi$/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Valider / })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /^Refuser / })).toHaveLength(3)
  })

  it('« Valider » décide en un clic, sans fenêtre, et l’annonce', async () => {
    const faux = connecte('admin_plateforme')
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(
      screen.getByRole('button', { name: /^Valider «\s*Demandes reçues\s*» de Kumi$/ }),
    )
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('valider_indicateur', {
        p_demande_id: '00000000-0000-4000-8000-0000000000a1',
        p_decision: 'valide',
        p_motif: null,
      }),
    )
    expect(await screen.findByText('Indicateur validé.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('« Refuser » ouvre une fenêtre qui demande un motif de 10 à 280 caractères', async () => {
    const faux = connecte('admin_plateforme')
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(
      screen.getByRole('button', { name: /^Refuser «\s*Demandes reçues\s*» de Kumi$/ }),
    )
    const fenetre = await screen.findByRole('dialog', {
      name: /Refuser «\s*Demandes reçues\s*» \?/,
    })
    const champ = within(fenetre).getByRole('textbox', { name: 'Pourquoi ce refus ?' })
    // Le rappel sur les données personnelles et le compteur sont sous le champ.
    expect(
      within(fenetre).getByText("N'écrivez aucun nom ni information personnelle."),
    ).toBeVisible()
    expect(within(fenetre).getByText('0 sur 280')).toBeInTheDocument()
    expect(
      within(fenetre).getByText(
        "L'indicateur sera retiré : ses valeurs ne s'afficheront plus. Kumi lira ce motif.",
      ),
    ).toBeInTheDocument()

    await userEvent.click(within(fenetre).getByRole('button', { name: 'Refuser' }))
    expect(
      await within(fenetre).findByText('Expliquez le refus (10 caractères au moins).'),
    ).toBeInTheDocument()
    await userEvent.type(champ, 'Neuf cara')
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Refuser' }))
    expect(
      await within(fenetre).findByText('Expliquez le refus (10 caractères au moins).'),
    ).toBeInTheDocument()
    expect(faux.rpc).not.toHaveBeenCalled()

    await userEvent.type(champ, 'h')
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Refuser' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('valider_indicateur', {
        p_demande_id: '00000000-0000-4000-8000-0000000000a1',
        p_decision: 'refuse',
        p_motif: 'Neuf carah',
      }),
    )
    expect(await screen.findByText('Indicateur refusé. Kumi verra le motif.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('le motif de plus de 280 caractères est refusé avant tout appel', async () => {
    const faux = connecte('admin_plateforme')
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(
      screen.getByRole('button', { name: /^Refuser «\s*Demandes reçues\s*» de Kumi$/ }),
    )
    const fenetre = await screen.findByRole('dialog')
    await userEvent.click(within(fenetre).getByRole('textbox'))
    await userEvent.paste('a'.repeat(281))
    expect(within(fenetre).getByText('281 sur 280')).toBeInTheDocument()
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Refuser' }))
    expect(await within(fenetre).findByText('Le motif dépasse 280 caractères.')).toBeInTheDocument()
    expect(faux.rpc).not.toHaveBeenCalled()
  })

  it('un refus du motif par la base se dit sous le champ, la fenêtre reste ouverte', async () => {
    const faux = connecte('admin_plateforme')
    faux.rpc.mockRejectedValueOnce({
      code: 'P0001',
      message: "N'écrivez aucun nom ni information personnelle.",
    })
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(
      screen.getByRole('button', { name: /^Refuser «\s*Demandes reçues\s*» de Kumi$/ }),
    )
    const fenetre = await screen.findByRole('dialog')
    await userEvent.type(within(fenetre).getByRole('textbox'), 'Merci de ne rien écrire ici.')
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Refuser' }))
    const message = await within(fenetre).findAllByText(
      "N'écrivez aucun nom ni information personnelle.",
    )
    // Le rappel fixe et le refus de la base : deux fois la même phrase, le second sous le champ.
    expect(message).toHaveLength(2)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('une connexion perdue garde le motif dans la fenêtre', async () => {
    const faux = connecte('admin_plateforme')
    faux.rpc.mockRejectedValueOnce(new Error('réseau'))
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(
      screen.getByRole('button', { name: /^Refuser «\s*Demandes reçues\s*» de Kumi$/ }),
    )
    const fenetre = await screen.findByRole('dialog')
    await userEvent.type(within(fenetre).getByRole('textbox'), 'Ce chiffre existe déjà ailleurs.')
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Refuser' }))
    expect(
      await within(fenetre).findByText(
        /La connexion a échoué\. Votre message est encore dans le formulaire/,
      ),
    ).toBeInTheDocument()
    expect(within(fenetre).getByRole('textbox')).toHaveValue('Ce chiffre existe déjà ailleurs.')
  })

  it('« Cette demande a déjà été décidée. » ferme la fenêtre et reste dit en haut du bloc', async () => {
    const faux = connecte('admin_plateforme')
    faux.rpc.mockRejectedValueOnce({
      code: 'P0001',
      message: 'Cette demande a déjà été décidée.',
    })
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(
      screen.getByRole('button', { name: /^Refuser «\s*Demandes reçues\s*» de Kumi$/ }),
    )
    const fenetre = await screen.findByRole('dialog')
    await userEvent.type(within(fenetre).getByRole('textbox'), 'Ce chiffre existe déjà ailleurs.')
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Refuser' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Cette demande a déjà été décidée.')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('« Valider » refusé par la base : le message se dit, le bouton reste utilisable', async () => {
    const faux = connecte('admin_plateforme')
    faux.rpc.mockRejectedValueOnce({
      code: 'P0001',
      message: "Cette demande a été retirée ou remplacée : il n'y a plus rien à décider.",
    })
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(
      screen.getByRole('button', { name: /^Valider «\s*Demandes reçues\s*» de Kumi$/ }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Cette demande a été retirée ou remplacée : il n'y a plus rien à décider.",
    )
  })

  it('rien à valider : le titre reste, avec « Rien à valider. »', async () => {
    connecte('admin_plateforme', { lignes: { v_a_valider: [] } })
    afficher('/indicateurs')
    const section = await screen.findByRole('region', { name: 'À valider' })
    expect(await within(section).findByText(/^Rien à valider\./)).toBeInTheDocument()
    expect(within(section).getByText('Aucun ajout en attente')).toBeInTheDocument()
    expect(within(section).queryByRole('button')).toBeNull()
  })

  it('une lecture qui échoue : « La connexion a échoué. Réessayez. » et « Réessayer »', async () => {
    connecte('admin_plateforme', { enEchec: ['v_a_valider'] })
    afficher('/indicateurs')
    const section = await screen.findByRole('region', { name: 'À valider' })
    expect(await within(section).findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
    expect(within(section).getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('les décisions des 30 derniers jours sont repliées, le motif d’un refus en citation', async () => {
    connecte('admin_plateforme', {
      lignes: {
        v_semaine: [{ aujourdhui: '2026-10-12' }],
        validation: DECISIONS_EXEMPLE.map((decision) => ({
          id: decision.validation_id,
          demande_id: `d-${decision.validation_id}`,
          ministere_id: '10000000-0000-4000-8000-000000000011',
          decision: decision.decision,
          motif: decision.motif,
          saisi_le: decision.saisi_le,
        })),
        demande_indicateur: DECISIONS_EXEMPLE.map((decision) => ({
          id: `d-${decision.validation_id}`,
          libelle: decision.libelle,
        })),
      },
    })
    afficher('/indicateurs')
    await bloc()
    const resume = await screen.findByText(/Décidées ces 30 derniers jours \(3\)/)
    expect(resume.closest('details')).not.toHaveAttribute('open')
    expect(
      screen.getByText(/Refusée le 5 oct\. : «\s*Ce chiffre existe déjà sur la fiche/),
    ).toBeInTheDocument()
  })
})

describe('/indicateurs, bloc « À valider » pour l’administration de l’église', () => {
  it('lit l’attente sans bouton, sans « Pourquoi » ni nombre de valeurs', async () => {
    const faux = connecte('admin_eglise')
    afficher('/indicateurs')
    const lu = await bloc()
    expect(lu.getByText('3 ajouts en attente')).toBeInTheDocument()
    expect(lu.getByText(/Ces ajouts attendent EJP Tech\. Vous les lisez ici/)).toBeInTheDocument()
    expect(lu.queryByRole('button')).toBeNull()
    expect(lu.queryByText(/Pourquoi/)).toBeNull()
    expect(lu.queryByText(/Suivre les demandes/)).toBeNull()
    expect(lu.queryByText(/valeurs? déjà saisies?/)).toBeNull()
    expect(ligne('Kumi').getByText(/depuis 9 jours/)).toBeInTheDocument()
    expect(ligne('Kumi').getByText('en retard')).toBeInTheDocument()
    expect(
      ligne('Kumi').getByText(/Nouvel indicateur\s*: «\s*Demandes reçues\s*»/),
    ).toBeInTheDocument()
    // Jamais la file d'EJP Tech, ni les décisions, ni une valeur.
    const tables = new Set(faux.tables)
    for (const interdite of ['v_a_valider', 'validation', 'demande_indicateur', 'mesure']) {
      expect(tables.has(interdite), interdite).toBe(false)
    }
  })

  it('rien à valider : le titre reste, sans bouton', async () => {
    connecte('admin_eglise', { lignes: { indicateur: [], v_usage_indicateurs: [] } })
    afficher('/indicateurs')
    const section = await screen.findByRole('region', { name: 'À valider' })
    expect(await within(section).findByText(/^Rien à valider\./)).toBeInTheDocument()
    expect(within(section).queryByRole('button')).toBeNull()
  })
})
