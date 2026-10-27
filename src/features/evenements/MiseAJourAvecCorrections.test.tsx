import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { PanneauEvenement } from '@/features/evenements/PanneauEvenement'
import type { ContenuPanneauEvenement } from '@/features/evenements/PanneauEvenement'
import {
  ligneAncienNom,
  ligneRetireLe,
  TEXTES_CORRECTIONS,
} from '@/features/evenements/textesCorrections'

// Panneau de l'événement du porteur et d'EJP Tech (T78, lot 1 ; conception
// calendrier-evenements.md, 8.2) : corriger le nom, modifier les mentions, retirer, chaque action
// impossible avec sa raison, la fenêtre de retrait, et les états d'un événement retiré.

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const COORDINATION = '10000000-0000-4000-8000-000000000002'
const FIJ = '10000000-0000-4000-8000-000000000003'
const ANCIEN = '10000000-0000-4000-8000-000000000004'

const MINISTERES = [
  { id: COMMUNICATION, code: null, nom: 'Communication', desactive_le: null },
  { id: COORDINATION, code: 'coordination', nom: 'Coordination', desactive_le: null },
  { id: FIJ, code: 'fij', nom: 'FIJ', desactive_le: null },
  { id: ANCIEN, code: null, nom: 'Ancien ministère', desactive_le: '2026-09-01T10:00:00Z' },
]

function contenu(
  date: string,
  surcharge: Partial<Extract<ContenuPanneauEvenement, { etat: 'mise_a_jour' }>> = {},
) {
  const corrections = {
    titrePrecedent: null,
    titreCorrigeLe: null,
    porteurId: COMMUNICATION,
    mentionIds: [COORDINATION],
    ministeres: MINISTERES,
    etatFinal: null,
    corrigerNom: vi.fn(() => Promise.resolve()),
    modifierMentions: vi.fn(() => Promise.resolve()),
    retirer: vi.fn(() => Promise.resolve()),
  }
  const valeur: ContenuPanneauEvenement = {
    etat: 'mise_a_jour',
    evenementId: 'e1',
    aujourdhui: '2026-10-26',
    titre: 'Soirée de lounge',
    mentions: ['Coordination'],
    actuel: {
      date,
      statut: 'valide',
      heurePrevue: null,
      heureDebut: null,
      aConfirmer: false,
    },
    envoyer: vi.fn(() => Promise.resolve()),
    corrections,
    ...surcharge,
  }
  return { valeur, corrections }
}

function afficher(valeur: ContenuPanneauEvenement) {
  return render(
    <MemoryRouter>
      <PanneauEvenement contenu={valeur} onFermer={() => undefined} />
    </MemoryRouter>,
  )
}

describe('panneau du porteur, avant la date (T78)', () => {
  it('« Corriger le nom », « Modifier les mentions », et en bas « Retirer l’événement »', () => {
    afficher(contenu('2026-10-26').valeur)
    expect(screen.getByText('Soirée de lounge')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Corriger le nom' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifier les mentions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Retirer l'événement" })).toBeInTheDocument()
    // Une seule action qui attire l'œil : « Enregistrer la mise à jour ».
    expect(screen.getByRole('button', { name: 'Enregistrer la mise à jour' })).toBeInTheDocument()
    expect(screen.queryByText(/^Ancien nom/)).toBeNull()
  })

  it('un nom corrigé : « Ancien nom : Soirée de lounge, corrigé le 26 oct. »', () => {
    const { valeur } = contenu('2026-10-26', { titre: 'Soirée de louange' })
    if (valeur.etat !== 'mise_a_jour' || !valeur.corrections) throw new Error('contenu')
    afficher({
      ...valeur,
      corrections: {
        ...valeur.corrections,
        titrePrecedent: 'Soirée de lounge',
        titreCorrigeLe: '2026-10-26',
      },
    })
    expect(screen.getByText('Soirée de louange')).toBeInTheDocument()
    expect(
      screen.getByText('Ancien nom : Soirée de lounge, corrigé le 26 oct.'),
    ).toBeInTheDocument()
  })

  it('corriger le nom : prérempli, même nom refusé avant l’envoi, nouveau nom envoyé sans espaces', async () => {
    const utilisateur = userEvent.setup()
    const { valeur, corrections } = contenu('2026-10-26')
    afficher(valeur)
    await utilisateur.click(screen.getByRole('button', { name: 'Corriger le nom' }))
    const fenetre = screen.getByRole('dialog', { name: 'Corriger le nom' })
    const champ = within(fenetre).getByLabelText("Nom de l'événement")
    expect(champ).toHaveValue('Soirée de lounge')
    await utilisateur.click(within(fenetre).getByRole('button', { name: 'Enregistrer le nom' }))
    expect(within(fenetre).getByText(TEXTES_CORRECTIONS.nomDejaEnregistre)).toBeInTheDocument()
    expect(corrections.corrigerNom).not.toHaveBeenCalled()
    await utilisateur.clear(champ)
    await utilisateur.click(within(fenetre).getByRole('button', { name: 'Enregistrer le nom' }))
    expect(champ).toHaveAccessibleDescription(
      expect.stringContaining("Donnez un nom à l'événement."),
    )
    await utilisateur.type(champ, '  Soirée de louange  ')
    await utilisateur.click(within(fenetre).getByRole('button', { name: 'Enregistrer le nom' }))
    expect(corrections.corrigerNom).toHaveBeenCalledWith('Soirée de louange')
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Corriger le nom' })).toBeNull(),
    )
    expect(screen.getByText('Nom corrigé.')).toBeInTheDocument()
  })

  it('modifier les mentions : les actuelles cochées, jamais le porteur, la liste voulue envoyée', async () => {
    const utilisateur = userEvent.setup()
    const { valeur, corrections } = contenu('2026-10-26')
    afficher(valeur)
    await utilisateur.click(screen.getByRole('button', { name: 'Modifier les mentions' }))
    const fenetre = screen.getByRole('dialog', { name: 'Modifier les mentions' })
    expect(within(fenetre).queryByRole('checkbox', { name: /Communication/ })).toBeNull()
    expect(within(fenetre).queryByRole('checkbox', { name: /Ancien ministère/ })).toBeNull()
    expect(within(fenetre).getByRole('checkbox', { name: /Coordination/ })).toBeChecked()
    await utilisateur.click(
      within(fenetre).getByRole('button', { name: 'Enregistrer les mentions' }),
    )
    expect(
      within(fenetre).getByText(TEXTES_CORRECTIONS.mentionsDejaEnregistrees),
    ).toBeInTheDocument()
    await utilisateur.click(within(fenetre).getByRole('checkbox', { name: /Coordination/ }))
    await utilisateur.click(within(fenetre).getByRole('checkbox', { name: /FIJ/ }))
    await utilisateur.click(
      within(fenetre).getByRole('button', { name: 'Enregistrer les mentions' }),
    )
    expect(corrections.modifierMentions).toHaveBeenCalledWith([FIJ])
    await waitFor(() => expect(screen.getByText('Mentions enregistrées.')).toBeInTheDocument())
  })

  it('retirer : la fenêtre dit ce que fait le retrait ; « Garder l’événement » ne retire rien', async () => {
    const utilisateur = userEvent.setup()
    const { valeur, corrections } = contenu('2026-10-26')
    afficher(valeur)
    await utilisateur.click(screen.getByRole('button', { name: "Retirer l'événement" }))
    const fenetre = screen.getByRole('alertdialog', { name: 'Retirer cet événement ?' })
    expect(fenetre).toHaveAccessibleDescription(TEXTES_CORRECTIONS.texteRetrait)
    await utilisateur.click(within(fenetre).getByRole('button', { name: "Garder l'événement" }))
    expect(corrections.retirer).not.toHaveBeenCalled()
    await utilisateur.click(screen.getByRole('button', { name: "Retirer l'événement" }))
    await utilisateur.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: "Retirer l'événement" }),
    )
    expect(corrections.retirer).toHaveBeenCalledTimes(1)
  })

  it('retirer : un refus de la base se dit dans la fenêtre, traduit', async () => {
    const utilisateur = userEvent.setup()
    const { valeur } = contenu('2026-10-26')
    if (valeur.etat !== 'mise_a_jour' || !valeur.corrections) throw new Error('contenu')
    afficher({
      ...valeur,
      corrections: {
        ...valeur.corrections,
        retirer: () =>
          Promise.reject({ code: 'P0001', message: 'Un événement passé se retire par EJP Tech.' }),
      },
    })
    await utilisateur.click(screen.getByRole('button', { name: "Retirer l'événement" }))
    await utilisateur.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: "Retirer l'événement" }),
    )
    expect(
      await screen.findByText(
        "Un événement passé se retire par EJP Tech. S'il a été créé par erreur, signalez-le.",
      ),
    ).toBeInTheDocument()
  })
})

describe('panneau du porteur, après la date (T78)', () => {
  it('les mentions et le retrait restent visibles avec leur raison, et le lien de signalement', () => {
    afficher(contenu('2026-10-25').valeur)
    expect(screen.queryByRole('button', { name: 'Modifier les mentions' })).toBeNull()
    expect(screen.getByText(TEXTES_CORRECTIONS.mentionsFigees)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "Retirer l'événement" })).toBeNull()
    expect(screen.getByText(/^Un événement passé se retire par EJP Tech\./)).toBeInTheDocument()
    // Un seul lien « Signaler une difficulté » : celui de la raison (T78, 27 octobre 2026).
    expect(screen.getAllByRole('link', { name: 'Signaler une difficulté' })).toHaveLength(1)
    // Le nom se corrige à tout moment, tant que l'événement n'est pas retiré (Q5).
    expect(screen.getByRole('button', { name: 'Corriger le nom' })).toBeInTheDocument()
  })
})

// Décision de la personne responsable du 27 octobre 2026 : une fois « Terminé » ou « Annulé »
// enregistré, le porteur ne retire plus l'événement (son retard sortirait de la ponctualité) ;
// EJP Tech le retire, à la demande du ministère par un signalement.
describe('panneau du porteur, après un état final (T78)', () => {
  /** Le panneau d'un événement dont le dernier état est `statut`, à la date `date`. */
  function avecStatut(date: string, statut: 'termine' | 'annule' | 'preparation') {
    const { valeur } = contenu(date)
    if (valeur.etat !== 'mise_a_jour') throw new Error('contenu')
    return { ...valeur, actuel: { ...valeur.actuel, statut } }
  }

  it('« Terminé » le jour même : la raison sous le bouton, un seul lien de signalement', () => {
    afficher(avecStatut('2026-10-26', 'termine'))
    expect(screen.queryByRole('button', { name: "Retirer l'événement" })).toBeNull()
    expect(
      screen.getByText('Cet événement est terminé : pour le retirer, signalez-le à EJP Tech.'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Signaler une difficulté' })).toHaveLength(1)
    // Les mentions suivent la date seule : le jour même, elles changent encore.
    expect(screen.getByRole('button', { name: 'Modifier les mentions' })).toBeInTheDocument()
  })

  it('« Annulé » avant la date : la raison de l’annulation', () => {
    afficher(avecStatut('2026-10-30', 'annule'))
    expect(screen.queryByRole('button', { name: "Retirer l'événement" })).toBeNull()
    expect(
      screen.getByText('Cet événement est annulé : pour le retirer, signalez-le à EJP Tech.'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Signaler une difficulté' })).toHaveLength(1)
  })

  it('un « Terminé » enregistré puis remplacé compte encore (la base le lit dans l’historique)', () => {
    const valeur = avecStatut('2026-10-30', 'preparation')
    if (!valeur.corrections) throw new Error('contenu')
    afficher({ ...valeur, corrections: { ...valeur.corrections, etatFinal: 'termine' } })
    expect(screen.queryByRole('button', { name: "Retirer l'événement" })).toBeNull()
    expect(
      screen.getByText('Cet événement est terminé : pour le retirer, signalez-le à EJP Tech.'),
    ).toBeInTheDocument()
  })

  it('après la date et terminé : la raison de l’état final passe avant celle de la date', () => {
    afficher(avecStatut('2026-10-25', 'termine'))
    expect(
      screen.getByText('Cet événement est terminé : pour le retirer, signalez-le à EJP Tech.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Un événement passé/)).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Signaler une difficulté' })).toHaveLength(1)
  })

  it('avant tout état final : le bouton, sans raison, et le lien du formulaire seulement', () => {
    afficher(avecStatut('2026-10-30', 'preparation'))
    expect(screen.getByRole('button', { name: "Retirer l'événement" })).toBeInTheDocument()
    expect(screen.queryByText(/pour le retirer, signalez-le/)).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Signaler une difficulté' })).toHaveLength(1)
  })

  it('le refus de la base, si l’état a changé entre-temps, se dit traduit dans la fenêtre', async () => {
    const utilisateur = userEvent.setup()
    const { valeur } = contenu('2026-10-26')
    if (valeur.etat !== 'mise_a_jour' || !valeur.corrections) throw new Error('contenu')
    afficher({
      ...valeur,
      corrections: {
        ...valeur.corrections,
        retirer: () =>
          Promise.reject({ code: 'P0001', message: 'Un événement annulé se retire par EJP Tech.' }),
      },
    })
    await utilisateur.click(screen.getByRole('button', { name: "Retirer l'événement" }))
    await utilisateur.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: "Retirer l'événement" }),
    )
    expect(
      await screen.findByText(
        'Cet événement est annulé : pour le retirer, signalez-le à EJP Tech.',
      ),
    ).toBeInTheDocument()
  })
})

describe('événement retiré et panneau d’EJP Tech (T78)', () => {
  it('ancien lien : « Cet événement a été retiré le 26 oct. » ; juste après : « Événement retiré du calendrier. »', () => {
    const { unmount } = afficher({
      etat: 'retire',
      le: '2026-10-26',
      aLInstant: false,
      mode: 'mise_a_jour',
    })
    expect(screen.getByText('Cet événement a été retiré le 26 oct.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revenir à ma fiche' })).toBeInTheDocument()
    unmount()
    afficher({ etat: 'retire', le: null, aLInstant: true, mode: 'mise_a_jour' })
    expect(screen.getByRole('status')).toHaveTextContent('Événement retiré du calendrier.')
  })

  it('EJP Tech : l’événement en lecture, sa fenêtre de retrait, le retour aux ministères', async () => {
    const utilisateur = userEvent.setup()
    const retirer = vi.fn(() => Promise.resolve())
    afficher({
      etat: 'consultation',
      evenementId: 'e1',
      titre: 'Réunion des responsables',
      titrePrecedent: null,
      titreCorrigeLe: null,
      date: '2026-10-20',
      statut: 'valide',
      nomPorteur: 'Coordination',
      mentions: ['FIJ'],
      retirer,
    })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Événement')
    expect(screen.getByText('Coordination')).toBeInTheDocument()
    expect(screen.getByText('Validé')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Corriger|Modifier|Enregistrer/ })).toBeNull()
    await utilisateur.click(screen.getByRole('button', { name: "Retirer l'événement" }))
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(
      TEXTES_CORRECTIONS.texteRetraitEjpTech,
    )
  })
})

describe('textes des corrections (T78)', () => {
  it('le point final n’est jamais doublé après un mois abrégé', () => {
    expect(ligneAncienNom('Soirée de lounge', '2026-10-26')).toBe(
      'Ancien nom : Soirée de lounge, corrigé le 26 oct.',
    )
    expect(ligneAncienNom('Soirée de lounge', '2026-03-02')).toBe(
      'Ancien nom : Soirée de lounge, corrigé le 2 mars.',
    )
    expect(ligneRetireLe('2026-10-01')).toBe('Cet événement a été retiré le 1er oct.')
    expect(ligneRetireLe(null)).toBe('Cet événement a été retiré.')
  })

  it('aucun tiret cadratin ni demi-cadratin', () => {
    const tirets = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)
    for (const texte of Object.values(TEXTES_CORRECTIONS)) expect(texte).not.toMatch(tirets)
  })
})
