import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { FormulaireMiseAJourEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import type { EtatEvenement } from '@/features/evenements/FormulaireMiseAJourEvenement'
import type { MiseAJourEvenement } from '@/features/evenements/schemas'
import { MESSAGES_BASE, TEXTES_EVENEMENT } from '@/features/evenements/textes'
import { RAPPEL_DONNEES_PERSONNELLES } from '@/features/saisie/textes'

const EN_PREPARATION: EtatEvenement = {
  date: '2026-10-10',
  statut: 'preparation',
  aConfirmer: false,
}

function afficher(
  actuel: EtatEvenement = EN_PREPARATION,
  envoyer: (miseAJour: MiseAJourEvenement) => Promise<void> = () => Promise.resolve(),
  mentions: readonly string[] = ['Coordination', 'Intégration'],
) {
  render(
    <MemoryRouter>
      <FormulaireMiseAJourEvenement
        aujourdhui="2026-10-06"
        titre="Soirée de louange"
        mentions={mentions}
        actuel={actuel}
        envoyer={envoyer}
      />
    </MemoryRouter>,
  )
}

const bouton = () => screen.getByRole('button', { name: 'Enregistrer la mise à jour' })
const champDate = () => screen.getByLabelText('Date')

async function changerDate(date: string) {
  const utilisateur = userEvent.setup()
  await utilisateur.clear(champDate())
  await utilisateur.type(champDate(), date)
  return utilisateur
}

describe("« Mettre à jour l'événement » (dérivé de 11)", () => {
  it('nom et mentions en lecture seule, date et statut préremplis, une aide, aucun rappel', () => {
    afficher()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('Soirée de louange')).toBeInTheDocument()
    // T66 (t138) : la phrase sur les mentions figées quitte la mise à jour.
    expect(
      screen.getByText('Ministères mentionnés : Coordination et Intégration.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(champDate()).toHaveValue('2026-10-10')
    expect(screen.getByRole('radio', { name: 'En préparation' })).toBeChecked()
    // Une aide (statut) ; « Report » paraît seulement avec une nouvelle date.
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Aide : Statut' })).toBeInTheDocument()
    // Aucun champ libre : pas de rappel sur les données personnelles.
    expect(screen.queryByText(RAPPEL_DONNEES_PERSONNELLES)).toBeNull()
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_evenement',
    )
  })

  it('sans mention : « Aucun ministère mentionné. »', () => {
    afficher(undefined, undefined, [])
    expect(screen.getByText(/^Aucun ministère mentionné\./)).toBeInTheDocument()
  })

  it('nouvelle date : la ligne « Report : du ... au ... », sans bulle (T66, t139)', async () => {
    afficher()
    await changerDate('2026-10-17')
    expect(screen.getByText('Report : du sam. 10 oct. au sam. 17 oct.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(1)
  })

  it('la ligne « Report » décrit le champ date', async () => {
    afficher()
    await changerDate('2026-10-17')
    expect(champDate()).toHaveAccessibleDescription('Report : du sam. 10 oct. au sam. 17 oct.')
  })

  it('la date choisie s’écrit en toutes lettres sous le champ', async () => {
    afficher()
    expect(screen.getByText('samedi 10 octobre 2026')).toBeInTheDocument()
    await changerDate('2026-10-17')
    expect(screen.getByText('samedi 17 octobre 2026')).toBeInTheDocument()
  })

  it('date actuelle passée : le champ n’est pas invalide à l’ouverture (plancher sur la date actuelle)', () => {
    afficher({ date: '2026-10-01', statut: 'attente_validation', aConfirmer: true })
    expect(champDate()).toHaveAttribute('min', '2026-10-01')
    expect(champDate()).toBeValid()
  })

  it('après une réussite, le bouton reste inactif tant que le formulaire n’a pas changé', async () => {
    const envoyer = vi.fn<(miseAJour: MiseAJourEvenement) => Promise<void>>(() => Promise.resolve())
    afficher(undefined, envoyer)
    await userEvent.click(screen.getByRole('radio', { name: 'Validé' }))
    await userEvent.click(bouton())
    expect(await screen.findByText('Événement mis à jour.')).toBeInTheDocument()
    expect(bouton()).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(bouton())
    expect(envoyer).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('radio', { name: 'Terminé' }))
    expect(bouton()).not.toHaveAttribute('aria-disabled')
  })

  it('événement à confirmer : la ligne au-dessus du statut, lue avec le groupe', () => {
    afficher({ date: '2026-10-08', statut: 'attente_validation', aConfirmer: true })
    const groupe = screen.getByRole('group', { name: 'Statut' })
    expect(within(groupe).getByText(TEXTES_EVENEMENT.aConfirmer)).toBeInTheDocument()
    expect(groupe).toHaveAccessibleDescription(TEXTES_EVENEMENT.aConfirmer)
  })

  it('événement qui n’est pas à confirmer : pas de ligne au-dessus du statut', () => {
    afficher()
    expect(screen.queryByText(TEXTES_EVENEMENT.aConfirmer)).toBeNull()
  })

  it('date passée inchangée : le statut se reporte quand même (T37)', async () => {
    const envoyer = vi.fn<(miseAJour: MiseAJourEvenement) => Promise<void>>(() => Promise.resolve())
    afficher({ date: '2026-10-01', statut: 'attente_validation', aConfirmer: true }, envoyer)
    await userEvent.click(screen.getByRole('radio', { name: 'Terminé' }))
    await userEvent.click(bouton())
    expect(await screen.findByText('Événement mis à jour.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith({ date: '2026-10-01', statut: 'termine' })
    // L'état enregistré change : la ligne « à confirmer » disparaît.
    expect(screen.queryByText(TEXTES_EVENEMENT.aConfirmer)).toBeNull()
  })

  it('nouvelle date passée : refusée avant l’envoi, sous le champ, avec le lien', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(undefined, envoyer)
    await changerDate('2026-10-05')
    await userEvent.click(bouton())
    const message = await screen.findByText(/La nouvelle date doit être/)
    expect(message).toHaveTextContent(
      "La nouvelle date doit être aujourd'hui ou plus tard. Vous ne pouvez pas choisir de date ? Signaler une difficulté",
    )
    expect(within(message).getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_evenement',
    )
    expect(champDate()).toHaveAttribute('aria-invalid', 'true')
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('refus de la base sur la date : sous le champ date, avec le lien, valeurs gardées', async () => {
    afficher(undefined, () =>
      Promise.reject({ code: 'P0001', message: MESSAGES_BASE.datePasseeMiseAJour }),
    )
    await changerDate('2026-10-07')
    await userEvent.click(bouton())
    const message = await screen.findByText(/La nouvelle date doit être/)
    expect(
      within(message).getByRole('link', { name: 'Signaler une difficulté' }),
    ).toBeInTheDocument()
    expect(champDate()).toHaveValue('2026-10-07')
    expect(champDate()).toHaveFocus()
  })

  it('ligne identique : dite avant l’envoi, sous le bouton, sans lien (m134)', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(undefined, envoyer)
    await userEvent.click(bouton())
    const alerte = await screen.findByRole('alert')
    expect(alerte).toHaveTextContent(
      "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
    )
    expect(within(alerte).queryByRole('link')).toBeNull()
    expect(envoyer).not.toHaveBeenCalled()
    expect(screen.queryByText('Événement mis à jour.')).toBeNull()
    // Aucune erreur sous le champ date.
    expect(champDate()).not.toHaveAttribute('aria-invalid')
  })

  it('ligne identique refusée par la base (lecture en retard) : la même phrase, traduite', async () => {
    const envoyer = vi.fn(() =>
      Promise.reject({ code: 'P0001', message: MESSAGES_BASE.ligneIdentique }),
    )
    afficher(undefined, envoyer)
    await changerDate('2026-10-17')
    await userEvent.click(bouton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
    )
    expect(screen.queryByText(/Rien n'a changé/)).toBeNull()
  })

  it('un second appui après une réussite n’envoie rien, et le dit (m134)', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(undefined, envoyer)
    await changerDate('2026-10-17')
    await userEvent.click(bouton())
    expect(await screen.findByText('Événement mis à jour.')).toBeInTheDocument()
    await userEvent.click(bouton())
    expect(envoyer).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
    )
  })

  it('connexion perdue : erreur de formulaire, valeurs gardées', async () => {
    afficher(undefined, () => Promise.reject(new TypeError('Failed to fetch')))
    await changerDate('2026-10-17')
    await userEvent.click(screen.getByRole('radio', { name: 'Validé' }))
    await userEvent.click(bouton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Votre saisie est encore dans le formulaire : réessayez.',
    )
    expect(champDate()).toHaveValue('2026-10-17')
    expect(screen.getByRole('radio', { name: 'Validé' })).toBeChecked()
  })
})
