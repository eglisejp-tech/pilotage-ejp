import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { SerieDeLEvenement } from '@/features/evenements/MiseAJourAvecCorrections'
import { PanneauEvenement } from '@/features/evenements/PanneauEvenement'
import type { ContenuPanneauEvenement } from '@/features/evenements/PanneauEvenement'
import { TEXTES_CORRECTIONS } from '@/features/evenements/textesCorrections'
import { datesQuiRestent, reussiteRetraitSerie } from '@/features/evenements/textesPlages'

// Panneau d'une date d'une série et d'un événement sur plusieurs jours (T78, lot 2 ; conception
// calendrier-evenements.md, 6.4, 7 (S8) et 8.2). Jour de Paris : lundi 26 octobre 2026.

const COMMUNICATION = '10000000-0000-4000-8000-000000000001'
const COORDINATION = '10000000-0000-4000-8000-000000000002'

const MINISTERES = [
  { id: COMMUNICATION, code: null, nom: 'Communication', desactive_le: null },
  { id: COORDINATION, code: 'coordination', nom: 'Coordination', desactive_le: null },
]

function contenu(options: { date?: string; dateFin?: string | null; serie?: SerieDeLEvenement }) {
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
    serie: options.serie ?? null,
  }
  const valeur: ContenuPanneauEvenement = {
    etat: 'mise_a_jour',
    evenementId: 'e1',
    aujourdhui: '2026-10-26',
    titre: 'Réunion des responsables',
    mentions: ['Coordination'],
    actuel: {
      date: options.date ?? '2026-11-02',
      dateFin: options.dateFin ?? null,
      statut: 'valide',
      heurePrevue: 1140,
      heureDebut: null,
      heureFin: 1260,
      aConfirmer: false,
    },
    envoyer: vi.fn(() => Promise.resolve()),
    corrections,
  }
  return { valeur, corrections }
}

function serie(surcharge: Partial<SerieDeLEvenement> = {}): SerieDeLEvenement {
  return {
    nombre: 7,
    aVenir: 7,
    retirables: 7,
    termineesOuAnnulees: 0,
    passees: 0,
    corrigerNom: vi.fn(() => Promise.resolve()),
    modifierMentions: vi.fn(() => Promise.resolve()),
    retirer: vi.fn(() => Promise.resolve()),
    ...surcharge,
  }
}

function afficher(valeur: ContenuPanneauEvenement) {
  render(
    <MemoryRouter>
      <PanneauEvenement contenu={valeur} onFermer={() => undefined} />
    </MemoryRouter>,
  )
}

describe('une date d’une série (T78, lot 2)', () => {
  it('S8 : « Retirer l’événement », « Toute la série » : la série part, pas l’événement seul', async () => {
    const laSerie = serie()
    const { valeur, corrections } = contenu({ serie: laSerie })
    afficher(valeur)
    expect(screen.getByText("Fait partie d'une série de 7 dates.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: TEXTES_CORRECTIONS.retirer }))
    const fenetre = screen.getByRole('alertdialog')
    expect(within(fenetre).getByRole('radio', { name: 'Cet événement seulement' })).toBeChecked()
    await userEvent.click(
      within(fenetre).getByRole('radio', { name: 'Toute la série (les 7 dates à venir)' }),
    )
    await userEvent.click(within(fenetre).getByRole('button', { name: TEXTES_CORRECTIONS.retirer }))
    expect(laSerie.retirer).toHaveBeenCalledTimes(1)
    expect(corrections.retirer).not.toHaveBeenCalled()
  })

  it('S8, des dates déjà terminées ou annulées : la fenêtre dit qu’elles restent, avant de confirmer (27 oct. 2026)', async () => {
    const laSerie = serie({ retirables: 4, termineesOuAnnulees: 3 })
    afficher(contenu({ serie: laSerie }).valeur)
    await userEvent.click(screen.getByRole('button', { name: TEXTES_CORRECTIONS.retirer }))
    const fenetre = screen.getByRole('alertdialog')
    const note = '3 dates déjà terminées ou annulées restent.'
    // « Cet événement seulement » : rien à dire sur la série.
    expect(within(fenetre).queryByText(note)).toBeNull()
    await userEvent.click(
      within(fenetre).getByRole('radio', { name: 'Toute la série (les 4 dates à venir)' }),
    )
    expect(within(fenetre).getByText(note)).toBeInTheDocument()
    await userEvent.click(within(fenetre).getByRole('button', { name: TEXTES_CORRECTIONS.retirer }))
    expect(laSerie.retirer).toHaveBeenCalledTimes(1)
  })

  it('les dates qui restent : terminées ou annulées, passées, ou les deux ; aucune : rien', () => {
    expect(datesQuiRestent(3, 0)).toBe('3 dates déjà terminées ou annulées restent.')
    expect(datesQuiRestent(1, 0)).toBe('1 date déjà terminée ou annulée reste.')
    expect(datesQuiRestent(0, 2)).toBe('2 dates passées restent.')
    expect(datesQuiRestent(0, 1)).toBe('1 date passée reste.')
    expect(datesQuiRestent(1, 1)).toBe('1 date déjà terminée ou annulée et 1 date passée restent.')
    expect(datesQuiRestent(0, 0)).toBeNull()
  })

  it('la réussite du retrait de la série dit les dates retirées et celles qui restent', () => {
    const phrase = '4 dates retirées du calendrier. 3 dates déjà terminées ou annulées restent.'
    expect(reussiteRetraitSerie(4, '3 dates déjà terminées ou annulées restent.')).toBe(phrase)
    expect(reussiteRetraitSerie(1, null)).toBe('1 date retirée du calendrier.')
    afficher({ etat: 'retire', le: null, aLInstant: true, message: phrase, mode: 'mise_a_jour' })
    expect(screen.getByRole('status')).toHaveTextContent(phrase)
  })

  it('« Corriger le nom », « Toute la série » : le nouveau nom part pour la série', async () => {
    const laSerie = serie()
    const { valeur, corrections } = contenu({ serie: laSerie })
    afficher(valeur)
    await userEvent.click(screen.getByRole('button', { name: TEXTES_CORRECTIONS.corrigerNom }))
    const fenetre = screen.getByRole('dialog', { name: 'Corriger le nom' })
    await userEvent.click(within(fenetre).getByRole('radio', { name: 'Toute la série' }))
    const champ = within(fenetre).getByLabelText("Nom de l'événement")
    await userEvent.clear(champ)
    await userEvent.type(champ, 'Réunion des responsables (lundi)')
    await userEvent.click(
      within(fenetre).getByRole('button', { name: TEXTES_CORRECTIONS.boutonNom }),
    )
    expect(laSerie.corrigerNom).toHaveBeenCalledWith('Réunion des responsables (lundi)')
    expect(corrections.corrigerNom).not.toHaveBeenCalled()
  })

  it('« Modifier les mentions », « Toute la série » : les dates à venir, même liste comprise', async () => {
    const laSerie = serie({ aVenir: 5 })
    const { valeur } = contenu({ serie: laSerie })
    afficher(valeur)
    await userEvent.click(screen.getByRole('button', { name: TEXTES_CORRECTIONS.modifierMentions }))
    const fenetre = screen.getByRole('dialog', { name: 'Modifier les mentions' })
    await userEvent.click(
      within(fenetre).getByRole('radio', { name: 'Toute la série (les 5 dates à venir)' }),
    )
    await userEvent.click(
      within(fenetre).getByRole('button', { name: TEXTES_CORRECTIONS.boutonMentions }),
    )
    expect(laSerie.modifierMentions).toHaveBeenCalledWith([COORDINATION])
  })

  it('un événement hors série : ni ligne de série ni choix dans les fenêtres', async () => {
    afficher(contenu({}).valeur)
    expect(screen.queryByText(/Fait partie d'une série/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: TEXTES_CORRECTIONS.retirer }))
    expect(within(screen.getByRole('alertdialog')).queryByRole('radio')).toBeNull()
  })
})

describe('un événement sur plusieurs jours (T78, lot 2)', () => {
  it('commencé hier, fini demain : premier et dernier jour, mentions et retrait encore possibles', () => {
    afficher(contenu({ date: '2026-10-25', dateFin: '2026-10-27' }).valeur)
    expect(screen.getByLabelText('Premier jour')).toHaveValue('2026-10-25')
    expect(screen.getByLabelText('Dernier jour')).toHaveValue('2026-10-27')
    expect(screen.getByLabelText('Heure de fin (facultatif)')).toHaveValue('21:00')
    expect(screen.getByRole('button', { name: TEXTES_CORRECTIONS.modifierMentions })).toBeEnabled()
    expect(screen.getByRole('button', { name: TEXTES_CORRECTIONS.retirer })).toBeInTheDocument()
  })

  it('un report du premier jour décale le dernier : la durée reste', async () => {
    const { valeur } = contenu({ date: '2026-10-31', dateFin: '2026-11-02' })
    afficher(valeur)
    const premier = screen.getByLabelText('Premier jour')
    await userEvent.clear(premier)
    await userEvent.type(premier, '2026-11-07')
    expect(screen.getByLabelText('Dernier jour')).toHaveValue('2026-11-09')
  })
})
