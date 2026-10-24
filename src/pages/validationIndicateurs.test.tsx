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

/** Les lectures des décisions des 30 derniers jours (EJP Tech), avec le jour de Paris de `v_semaine`. */
const AVEC_DECISIONS: Record<string, unknown[]> = {
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
}

/** La demande retirée par Communication avant la décision : son « Pourquoi » se masque ici. */
const DEMANDE_RETIREE = '00000000-0000-4000-8000-0000000000f9'

/**
 * Les retraits faits par les ministères des 30 derniers jours (T62) : une demande retirée par
 * Communication, avec son motif et le « Pourquoi » de la demande, et un ajout validé retiré par
 * Intégration, au motif masqué.
 */
const AVEC_RETRAITS: Record<string, unknown[]> = {
  v_semaine: [{ aujourdhui: '2026-10-12' }],
  demande_indicateur: [
    {
      id: DEMANDE_RETIREE,
      indicateur_id: DEMANDES_EXEMPLE[1]!.indicateur_id,
      pourquoi: 'Voir combien de projets restent ouverts chaque mois.',
    },
  ],
  retrait_indicateur: [
    {
      id: '00000000-0000-4000-8000-0000000000f1',
      indicateur_id: DEMANDES_EXEMPLE[1]!.indicateur_id,
      ministere_id: '10000000-0000-4000-8000-000000000001',
      etat_avant: 'en_attente',
      motif: 'Nous suivons déjà ces projets dans un autre chiffre.',
      saisi_le: '2026-10-09T17:30:00+02:00',
    },
    {
      id: '00000000-0000-4000-8000-0000000000f2',
      indicateur_id: DEMANDES_EXEMPLE[2]!.indicateur_id,
      ministere_id: '10000000-0000-4000-8000-000000000003',
      etat_avant: 'actif',
      motif: '[texte masqué par EJP Tech]',
      saisi_le: '2026-10-02T12:15:00+02:00',
    },
  ],
}

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
    expect(lu.getByText('3 indicateurs à valider')).toBeInTheDocument()
    const noms = screen
      .getAllByRole('heading', { level: 3 })
      .map((titre) => titre.textContent ?? '')
    expect(noms).toEqual(['Kumi', 'Communication', 'Intégration'])
    expect(ligne('Kumi').getByText('Envoyé le 1er oct.')).toBeInTheDocument()
    expect(ligne('Kumi').getByText(/depuis 9 jours/)).toBeInTheDocument()
    expect(ligne('Kumi').getByText('en retard')).toBeInTheDocument()
    expect(ligne('Communication').queryByText('en retard')).toBeNull()
    expect(ligne('Kumi').getByText(/Suivre les demandes de l'équipe/)).toBeInTheDocument()
    expect(ligne('Kumi').getByText('2 chiffres déjà saisis')).toBeInTheDocument()
    expect(
      ligne('Kumi').getByText(/Nouvel indicateur\s*: «\s*Demandes reçues\s*» \(chaque mois\)/),
    ).toBeInTheDocument()
    expect(ligne('Communication').getByText(/\(à ce jour\)/)).toBeInTheDocument()
    expect(faux.tables).toContain('v_a_valider')
  })

  it('un « Pourquoi » masqué s’affiche « [texte masqué] », sans bouton de plus', async () => {
    connecte('admin_plateforme')
    afficher('/indicateurs')
    await bloc()
    expect(ligne('Intégration').getByText('[texte masqué]')).toBeInTheDocument()
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

  it('pendant l’envoi, « Valider » dit « Validation en cours » et ne renvoie rien (m231)', async () => {
    const faux = connecte('admin_plateforme')
    afficher('/indicateurs')
    await bloc()
    let repondre: (() => void) | undefined
    faux.rpc.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          repondre = () => resolve({ data: null, error: null })
        }),
    )
    const valider = screen.getByRole('button', {
      name: /^Valider «\s*Demandes reçues\s*» de Kumi$/,
    })
    await userEvent.click(valider)
    expect(valider).toHaveTextContent(/^Validation en cours$/)
    expect(valider).toHaveAccessibleName('Validation en cours')
    expect(valider).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(valider)
    expect(faux.rpc).toHaveBeenCalledTimes(1)
    // Pendant la validation, les autres décisions de la ligne se disent inactives et n'ouvrent rien.
    const ligne = valider.closest('article')
    if (ligne === null) throw new Error('ligne introuvable')
    for (const nom of [/^Refuser «\s*Demandes reçues\s*» de Kumi$/, /^Masquer le texte$/]) {
      const autre = within(ligne).getByRole('button', { name: nom })
      expect(autre).toHaveAttribute('aria-disabled', 'true')
      await userEvent.click(autre)
    }
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    repondre?.()
    expect(await screen.findByText('Indicateur validé.')).toBeInTheDocument()
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
    // m231 : la réussite dit ce qui a été fait ; la fenêtre a dit qui lira le motif.
    expect(await screen.findByText('Indicateur refusé.')).toBeInTheDocument()
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
    expect(
      await within(fenetre).findByText('Raccourcissez le motif : 280 caractères au plus.'),
    ).toBeInTheDocument()
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
    // Le rappel fixe, puis le refus de la base sous le champ : ce qu'elle détecte (T66, m268).
    expect(
      await within(fenetre).findByText(
        'Retirez de votre texte les emails, liens, numéros et noms de personnes.',
      ),
    ).toBeInTheDocument()
    expect(
      within(fenetre).getByText("N'écrivez aucun nom ni information personnelle."),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('une connexion perdue garde le motif dans la fenêtre', async () => {
    const faux = connecte('admin_plateforme')
    faux.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'))
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
        /La connexion a échoué\. Votre saisie est encore dans le formulaire/,
      ),
    ).toBeInTheDocument()
    expect(within(fenetre).getByRole('textbox')).toHaveValue('Ce chiffre existe déjà ailleurs.')
  })

  it('un refus inattendu garde la fenêtre ouverte et le motif, avec la phrase de repli', async () => {
    const faux = connecte('admin_plateforme')
    faux.rpc.mockRejectedValueOnce({ code: '23505', message: 'duplicate key value' })
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
        "L'enregistrement n'a pas abouti, votre saisie est gardée. Réessayez, et si le problème revient, prévenez EJP Tech.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(fenetre).getByRole('textbox')).toHaveValue('Ce chiffre existe déjà ailleurs.')
  })

  it('une connexion expirée pendant « Refuser » : la fenêtre reste ouverte, le motif gardé', async () => {
    const faux = connecte('admin_plateforme')
    faux.rpc.mockRejectedValueOnce({ code: '42501', message: 'Double authentification requise.' })
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(
      screen.getByRole('button', { name: /^Refuser «\s*Demandes reçues\s*» de Kumi$/ }),
    )
    const fenetre = await screen.findByRole('dialog')
    await userEvent.type(within(fenetre).getByRole('textbox'), 'Ce chiffre existe déjà ailleurs.')
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Refuser' }))
    expect(
      await within(fenetre).findByText('Votre connexion a expiré. Reconnectez-vous.'),
    ).toBeInTheDocument()
    expect(within(fenetre).getByRole('textbox')).toHaveValue('Ce chiffre existe déjà ailleurs.')
  })

  it('« Valider » et un refus inattendu : « L’action n’a pas abouti » sous la ligne, qui reste', async () => {
    const faux = connecte('admin_plateforme')
    faux.rpc.mockRejectedValueOnce({ code: '23505', message: 'duplicate key value' })
    afficher('/indicateurs')
    await bloc()
    const valider = screen.getByRole('button', {
      name: /^Valider «\s*Demandes reçues\s*» de Kumi$/,
    })
    await userEvent.click(valider)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "L'action n'a pas abouti. Réessayez, et si le problème revient, prévenez EJP Tech.",
    )
    expect(valider).toBeInTheDocument()
    expect(valider).not.toHaveAttribute('aria-disabled')
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
    // Formule « changé entre-temps » (T66, m235).
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette demande a déjà reçu une réponse. Rechargez la page.',
    )
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
      'Cette demande a été retirée ou remplacée. Rechargez la page.',
    )
  })

  it('rien à valider : le titre reste, avec « Rien à valider. »', async () => {
    connecte('admin_plateforme', { lignes: { v_a_valider: [] } })
    afficher('/indicateurs')
    const section = await screen.findByRole('region', { name: 'À valider' })
    expect(await within(section).findByText(/^Rien à valider\./)).toBeInTheDocument()
    expect(within(section).getByText('Aucun indicateur à valider')).toBeInTheDocument()
    expect(within(section).queryByRole('button')).toBeNull()
    // L'introduction dirait le contraire de « Rien à valider. » : elle n'est pas là.
    expect(within(section).queryByText(/Les ministères envoient leurs ajouts ici/)).toBeNull()
  })

  it('avec des ajouts en attente, l’introduction explique quoi faire', async () => {
    connecte('admin_plateforme')
    afficher('/indicateurs')
    const lu = await bloc()
    expect(lu.getByText(/Les ministères envoient leurs ajouts ici/)).toBeInTheDocument()
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

  it('les décisions des 30 derniers jours sont repliées, le titre souligné, le motif d’un refus en citation', async () => {
    connecte('admin_plateforme', { lignes: AVEC_DECISIONS })
    afficher('/indicateurs')
    await bloc()
    const resume = await screen.findByText(/Décidées ces 30 derniers jours \(3\)/)
    expect(resume.closest('details')).not.toHaveAttribute('open')
    expect(resume).toHaveClass('underline')
    expect(
      screen.getByText(/Refusée le 5 oct\. : «\s*Ce chiffre existe déjà sur la fiche/),
    ).toBeInTheDocument()
  })

  it('une lecture des décisions qui échoue : le bandeau et « Réessayer », la file reste lisible', async () => {
    connecte('admin_plateforme', { lignes: AVEC_DECISIONS, enEchec: ['validation'] })
    afficher('/indicateurs')
    const lu = await bloc()
    const alerte = await lu.findByRole('alert', {}, { timeout: 5000 })
    expect(alerte).toHaveTextContent('La connexion a échoué. Réessayez.')
    expect(lu.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(lu.queryByText(/Décidées ces 30 derniers jours/)).toBeNull()
    expect(lu.getByText('3 indicateurs à valider')).toBeInTheDocument()
  })

  it('la file qui ne se lit pas : le bandeau seul, aucun compte de décisions à côté', async () => {
    connecte('admin_plateforme', { lignes: AVEC_DECISIONS, enEchec: ['v_a_valider'] })
    afficher('/indicateurs')
    const section = await screen.findByRole('region', { name: 'À valider' })
    expect(await within(section).findByRole('alert', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(within(section).queryByText(/Décidées ces 30 derniers jours/)).toBeNull()
  })

  it('« Masquer le texte » sous le « Pourquoi » : motif dans une liste, puis le texte est relu', async () => {
    const faux = connecte('admin_plateforme')
    afficher('/indicateurs')
    await bloc()
    // Kumi et Communication ont un « Pourquoi » à masquer ; celui d'Intégration l'est déjà.
    expect(screen.getAllByRole('button', { name: 'Masquer le texte' })).toHaveLength(2)
    expect(ligne('Intégration').queryByRole('button', { name: 'Masquer le texte' })).toBeNull()
    await userEvent.click(ligne('Kumi').getByRole('button', { name: 'Masquer le texte' }))
    const fenetre = await screen.findByRole('dialog', { name: 'Masquer ce texte ?' })
    expect(within(fenetre).getByText('Indicateur à valider, Kumi')).toBeInTheDocument()
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Masquer le texte' }))
    expect(
      await within(fenetre).findByText('Choisissez un motif dans la liste.'),
    ).toBeInTheDocument()
    await userEvent.click(within(fenetre).getByRole('radio', { name: "Nom d'une personne" }))
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Masquer le texte' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('masquer_texte', {
        p_cible: 'demande_indicateur',
        p_cible_id: '00000000-0000-4000-8000-0000000000a1',
        p_champ: 'pourquoi',
        p_motif: 'nom_personne',
      }),
    )
    expect(await screen.findByText('Texte masqué.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('« Masquer le texte » sous le motif d’un refus décidé, jamais sous un motif déjà masqué', async () => {
    const faux = connecte('admin_plateforme', { lignes: AVEC_DECISIONS })
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(await screen.findByText(/Décidées ces 30 derniers jours \(3\)/))
    const decidees = within(screen.getByText(/Décidées ces 30 derniers jours/).closest('details')!)
    // Un seul motif lisible (« Activités réalisées ») : l'autre est déjà masqué, la validation n'en a pas.
    const boutons = decidees.getAllByRole('button', { name: 'Masquer le texte' })
    expect(boutons).toHaveLength(1)
    await userEvent.click(boutons[0]!)
    const fenetre = await screen.findByRole('dialog', { name: 'Masquer ce texte ?' })
    expect(within(fenetre).getByText('Indicateur refusé, Kumi')).toBeInTheDocument()
    await userEvent.click(
      within(fenetre).getByRole('radio', { name: 'Autre information personnelle' }),
    )
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Masquer le texte' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('masquer_texte', {
        p_cible: 'validation',
        p_cible_id: '00000000-0000-4000-8000-0000000000c2',
        p_champ: 'motif',
        p_motif: 'autre',
      }),
    )
  })

  it('T62 : les retraits des ministères, repliés, avec le ministère, le jour et le motif', async () => {
    connecte('admin_plateforme', { lignes: AVEC_RETRAITS })
    afficher('/indicateurs')
    await bloc()
    const resume = await screen.findByText(/Retirés par les ministères ces 30 derniers jours \(2\)/)
    expect(resume.closest('details')).not.toHaveAttribute('open')
    expect(resume).toHaveClass('underline')
    await userEvent.click(resume)
    const retraits = within(resume.closest('details')!)
    expect(retraits.getByText(/«\s*Projets en cours\s*»/)).toBeInTheDocument()
    expect(
      retraits.getByText(
        /^Demande retirée le 9 oct\. : «\s*Nous suivons déjà ces projets dans un autre chiffre\.\s*»$/,
      ),
    ).toBeInTheDocument()
    expect(retraits.getByText(/^Retiré le 2 oct\. :/)).toBeInTheDocument()
    // Le plus récent d'abord.
    const noms = retraits
      .getAllByText(/^(Communication|Intégration)$/)
      .map((nom) => nom.textContent)
    expect(noms).toEqual(['Communication', 'Intégration'])
  })

  it('T62 : « Masquer le texte » sous le motif d’un retrait, jamais sous un motif déjà masqué', async () => {
    const faux = connecte('admin_plateforme', { lignes: AVEC_RETRAITS })
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(
      await screen.findByText(/Retirés par les ministères ces 30 derniers jours \(2\)/),
    )
    const retraits = within(
      screen.getByText(/Retirés par les ministères ces 30 derniers jours/).closest('details')!,
    )
    // Le motif de Communication et le « Pourquoi » de sa demande retirée ; rien sous le motif
    // masqué d'Intégration, dont l'ajout validé n'a plus de « Pourquoi » à montrer.
    const boutons = retraits.getAllByRole('button', { name: 'Masquer le texte' })
    expect(boutons).toHaveLength(2)
    expect(boutons[0]).toHaveAccessibleDescription(
      /Communication.*Demande retirée le 9 oct\. : «\s*Nous suivons déjà/,
    )
    await userEvent.click(boutons[0]!)
    const fenetre = await screen.findByRole('dialog', { name: 'Masquer ce texte ?' })
    expect(
      within(fenetre).getByText('Indicateur retiré par son ministère, Communication'),
    ).toBeInTheDocument()
    await userEvent.click(within(fenetre).getByRole('radio', { name: "Nom d'une personne" }))
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Masquer le texte' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('masquer_texte', {
        p_cible: 'retrait_indicateur',
        p_cible_id: '00000000-0000-4000-8000-0000000000f1',
        p_champ: 'motif',
        p_motif: 'nom_personne',
      }),
    )
  })

  it('T62 : une demande retirée avant la décision garde son « Pourquoi », qu’EJP Tech masque ici', async () => {
    const faux = connecte('admin_plateforme', { lignes: AVEC_RETRAITS })
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(
      await screen.findByText(/Retirés par les ministères ces 30 derniers jours \(2\)/),
    )
    const retraits = within(
      screen.getByText(/Retirés par les ministères ces 30 derniers jours/).closest('details')!,
    )
    expect(
      retraits.getByText(
        /^Pourquoi : «\s*Voir combien de projets restent ouverts chaque mois\.\s*»$/,
      ),
    ).toBeInTheDocument()
    // Un seul « Pourquoi » : l'ajout validé d'Intégration n'en montre pas.
    expect(retraits.getAllByText(/^Pourquoi :/)).toHaveLength(1)
    const bouton = retraits.getAllByRole('button', { name: 'Masquer le texte' })[1]!
    expect(bouton).toHaveAccessibleDescription(/Communication.*Pourquoi : «\s*Voir combien/)
    await userEvent.click(bouton)
    const fenetre = await screen.findByRole('dialog', { name: 'Masquer ce texte ?' })
    expect(
      within(fenetre).getByText('Demande retirée par son ministère, Communication'),
    ).toBeInTheDocument()
    await userEvent.click(within(fenetre).getByRole('radio', { name: /^Coordonnées/ }))
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Masquer le texte' }))
    await waitFor(() =>
      expect(faux.rpc).toHaveBeenCalledWith('masquer_texte', {
        p_cible: 'demande_indicateur',
        p_cible_id: DEMANDE_RETIREE,
        p_champ: 'pourquoi',
        p_motif: 'coordonnees',
      }),
    )
  })

  it('T62 : une lecture des retraits qui échoue : le bandeau et « Réessayer », le reste lisible', async () => {
    connecte('admin_plateforme', { lignes: AVEC_DECISIONS, enEchec: ['retrait_indicateur'] })
    afficher('/indicateurs')
    await bloc()
    expect(await screen.findByText(/Décidées ces 30 derniers jours \(3\)/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.queryByText(/Retirés par les ministères/)).toBeNull()
  })

  it('un refus de la base au masquage se dit dans la fenêtre, qui reste ouverte', async () => {
    const faux = connecte('admin_plateforme')
    faux.rpc.mockRejectedValueOnce({
      code: 'P0001',
      message: 'Texte introuvable, vide ou déjà masqué.',
    })
    afficher('/indicateurs')
    await bloc()
    await userEvent.click(ligne('Kumi').getByRole('button', { name: 'Masquer le texte' }))
    const fenetre = await screen.findByRole('dialog', { name: 'Masquer ce texte ?' })
    await userEvent.click(
      within(fenetre).getByRole('radio', { name: 'Autre information personnelle' }),
    )
    await userEvent.click(within(fenetre).getByRole('button', { name: 'Masquer le texte' }))
    // Le refus de la base, traduit (m220).
    expect(
      await within(fenetre).findByText('Ce texte est déjà masqué ou vide. Rechargez la page.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('/indicateurs, bloc « À valider » pour l’administration de l’église', () => {
  it('lit l’attente sans bouton, sans « Pourquoi » ni nombre de valeurs', async () => {
    const faux = connecte('admin_eglise')
    afficher('/indicateurs')
    const lu = await bloc()
    expect(lu.getByText('3 indicateurs à valider')).toBeInTheDocument()
    expect(lu.getByText(/Ces ajouts attendent EJP Tech\. Vous les lisez ici/)).toBeInTheDocument()
    expect(lu.queryByRole('button')).toBeNull()
    expect(lu.queryByText(/Pourquoi/)).toBeNull()
    expect(lu.queryByText(/Suivre les demandes/)).toBeNull()
    expect(lu.queryByText(/chiffres? déjà saisis?/)).toBeNull()
    expect(ligne('Kumi').getByText(/depuis 9 jours/)).toBeInTheDocument()
    expect(ligne('Kumi').getByText('en retard')).toBeInTheDocument()
    expect(
      ligne('Kumi').getByText(/Nouvel indicateur\s*: «\s*Demandes reçues\s*»/),
    ).toBeInTheDocument()
    // Jamais la file d'EJP Tech, ni les décisions, ni les retraits des ministères (T62), ni une
    // valeur.
    const tables = new Set(faux.tables)
    for (const interdite of [
      'v_a_valider',
      'validation',
      'demande_indicateur',
      'retrait_indicateur',
      'mesure',
    ]) {
      expect(tables.has(interdite), interdite).toBe(false)
    }
  })

  it('rien à valider : le titre reste, sans bouton ni introduction', async () => {
    connecte('admin_eglise', { lignes: { indicateur: [], v_usage_indicateurs: [] } })
    afficher('/indicateurs')
    const section = await screen.findByRole('region', { name: 'À valider' })
    expect(await within(section).findByText(/^Rien à valider\./)).toBeInTheDocument()
    expect(within(section).queryByRole('button')).toBeNull()
    expect(within(section).queryByText(/Ces ajouts attendent EJP Tech/)).toBeNull()
  })

  it('ne relit pas ce que le tableau de l’écran a déjà lu : une lecture de chaque table', async () => {
    const faux = connecte('admin_eglise')
    afficher('/indicateurs')
    await bloc()
    const lectures = (table: string) => faux.tables.filter((lue) => lue === table).length
    expect(lectures('indicateur')).toBe(1)
    expect(lectures('v_usage_indicateurs')).toBe(1)
  })

  it('si le tableau ne se lit pas, l’écran dit l’erreur une seule fois, sans bloc à côté', async () => {
    connecte('admin_eglise', { enEchec: ['v_usage_indicateurs'] })
    afficher('/indicateurs')
    expect(await screen.findByRole('alert', {}, { timeout: 5000 })).toHaveTextContent(
      'La connexion a échoué. Réessayez.',
    )
    expect(screen.queryByRole('region', { name: 'À valider' })).toBeNull()
  })
})
