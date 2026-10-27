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
  heurePrevue: null,
  heureDebut: null,
  aConfirmer: false,
}

/** Un événement à confirmer, sans heure. */
const A_CONFIRMER = (date: string): EtatEvenement => ({
  date,
  statut: 'attente_validation',
  heurePrevue: null,
  heureDebut: null,
  aConfirmer: true,
})

/** Un événement passé (aujourd'hui : 6 oct.), prévu à 19 h, Terminé sans heure de début. */
const TERMINE_SANS_DEBUT: EtatEvenement = {
  date: '2026-10-03',
  statut: 'termine',
  heurePrevue: 1140,
  heureDebut: null,
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
    afficher(A_CONFIRMER('2026-10-01'))
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
    afficher(A_CONFIRMER('2026-10-08'))
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
    afficher(A_CONFIRMER('2026-10-01'), envoyer)
    await userEvent.click(screen.getByRole('radio', { name: 'Terminé' }))
    await userEvent.click(bouton())
    expect(await screen.findByText('Événement mis à jour.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith({
      date: '2026-10-01',
      statut: 'termine',
      heure_prevue: null,
      heure_debut: null,
      date_fin: null,
      heure_fin: null,
    })
    // L'état enregistré change : la ligne « à confirmer » disparaît.
    expect(screen.queryByText(TEXTES_EVENEMENT.aConfirmer)).toBeNull()
  })

  it('nouvelle date passée : refusée avant l’envoi, sous le champ, avec le lien', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(undefined, envoyer)
    await changerDate('2026-10-05')
    await userEvent.click(bouton())
    // Une seule phrase de date passée, comme à l'ajout (T66, t140 et m125).
    const message = await screen.findByText(/Cette date est passée/)
    expect(message).toHaveTextContent(
      "Cette date est passée. Choisissez aujourd'hui ou une date à venir. Vous ne pouvez pas choisir de date ? Signaler une difficulté",
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
    const message = await screen.findByText(/Cette date est passée/)
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

describe("« Mettre à jour l'événement » : heures (T68)", () => {
  const champHeurePrevue = () => screen.getByLabelText('Heure prévue (facultatif)')
  const champHeureDebut = () => screen.queryByLabelText('Heure de début (facultatif)')

  async function saisirHeure(champ: HTMLElement, heure: string) {
    const utilisateur = userEvent.setup()
    await utilisateur.clear(champ)
    if (heure !== '') await utilisateur.type(champ, heure)
  }

  it('l’heure prévue est préremplie ; pas d’heure de début avant Terminé', () => {
    afficher({ ...EN_PREPARATION, heurePrevue: 1140 })
    expect(champHeurePrevue()).toHaveValue('19:00')
    expect(champHeurePrevue()).toHaveAttribute('type', 'time')
    expect(champHeureDebut()).toBeNull()
  })

  it('Terminé à une date passée : « Heure de début (facultatif) » paraît, avec son indication', async () => {
    afficher({ ...TERMINE_SANS_DEBUT, statut: 'valide' })
    expect(champHeureDebut()).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: 'Terminé' }))
    const champ = champHeureDebut()
    expect(champ).not.toBeNull()
    expect(champ).toHaveAccessibleDescription(
      "Une heure enregistrée se corrige, elle ne s'efface pas.",
    )
  })

  it('le champ qui paraît est annoncé (région polie), le focus reste sur « Terminé »', async () => {
    afficher({ ...TERMINE_SANS_DEBUT, statut: 'valide' })
    const annonce = document.querySelector('[data-annonce-heure-debut]')
    expect(annonce).toHaveAttribute('aria-live', 'polite')
    expect(annonce).toBeEmptyDOMElement()
    const termine = screen.getByRole('radio', { name: 'Terminé' })
    await userEvent.click(termine)
    expect(annonce).toHaveTextContent('Le champ « Heure de début » apparaît sous le statut.')
    expect(termine).toHaveFocus()
    await userEvent.click(screen.getByRole('radio', { name: 'Annulé' }))
    expect(annonce).toBeEmptyDOMElement()
  })

  it('Terminé déjà enregistré : le champ est là dès l’ouverture, sans annonce', () => {
    afficher(TERMINE_SANS_DEBUT)
    expect(champHeureDebut()).not.toBeNull()
    expect(document.querySelector('[data-annonce-heure-debut]')).toBeEmptyDOMElement()
  })

  it('Terminé à une date à venir : pas d’heure de début (la base la refuserait)', async () => {
    afficher()
    await userEvent.click(screen.getByRole('radio', { name: 'Terminé' }))
    expect(champHeureDebut()).toBeNull()
  })

  it('l’heure de début part en minutes, l’heure prévue préremplie aussi', async () => {
    const envoyer = vi.fn<(miseAJour: MiseAJourEvenement) => Promise<void>>(() => Promise.resolve())
    afficher(TERMINE_SANS_DEBUT, envoyer)
    const champ = champHeureDebut()
    expect(champ).toHaveValue('')
    await saisirHeure(champ as HTMLElement, '19:12')
    await userEvent.click(bouton())
    expect(await screen.findByText('Événement mis à jour.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith({
      date: '2026-10-03',
      statut: 'termine',
      heure_prevue: 1140,
      heure_debut: 1152,
      date_fin: null,
      heure_fin: null,
    })
    // L'état enregistré fait foi : un second appui ne renvoie rien.
    expect(champHeureDebut()).toHaveValue('19:12')
  })

  it('seule l’heure prévue change : la mise à jour part', async () => {
    const envoyer = vi.fn<(miseAJour: MiseAJourEvenement) => Promise<void>>(() => Promise.resolve())
    afficher({ ...EN_PREPARATION, heurePrevue: 1140 }, envoyer)
    await saisirHeure(champHeurePrevue(), '19:30')
    await userEvent.click(bouton())
    expect(await screen.findByText('Événement mis à jour.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith({
      date: '2026-10-10',
      statut: 'preparation',
      heure_prevue: 1170,
      heure_debut: null,
      date_fin: null,
      heure_fin: null,
    })
  })

  it('heure prévue vidée : l’heure enregistrée reste, donc rien n’a changé (m134)', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher({ ...EN_PREPARATION, heurePrevue: 1140 }, envoyer)
    await saisirHeure(champHeurePrevue(), '')
    await userEvent.click(bouton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Ce statut et cette date sont déjà enregistrés. Changez l'un des deux.",
    )
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('heure de début cachée (statut changé) : elle ne part pas', async () => {
    const envoyer = vi.fn<(miseAJour: MiseAJourEvenement) => Promise<void>>(() => Promise.resolve())
    afficher({ ...TERMINE_SANS_DEBUT, heureDebut: 1152 }, envoyer)
    expect(champHeureDebut()).toHaveValue('19:12')
    await userEvent.click(screen.getByRole('radio', { name: 'Annulé' }))
    expect(champHeureDebut()).toBeNull()
    await userEvent.click(bouton())
    expect(await screen.findByText('Événement mis à jour.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'annule', heure_debut: null }),
    )
  })

  it('refus de la base sur l’heure de début (E1) : sous le champ quand il est affiché', async () => {
    afficher(TERMINE_SANS_DEBUT, () =>
      Promise.reject({ code: 'P0001', message: MESSAGES_BASE.heureDebutAVenir }),
    )
    const champ = champHeureDebut() as HTMLElement
    await saisirHeure(champ, '19:12')
    await userEvent.click(bouton())
    expect(
      await screen.findByText("L'heure de début se saisit le jour de l'événement ou après."),
    ).toBeInTheDocument()
    expect(champHeureDebut()).toHaveAttribute('aria-invalid', 'true')
    expect(champHeureDebut()).toHaveValue('19:12')
  })

  it('refus de la base sur l’heure de début, champ caché : sous le bouton', async () => {
    // Terminé avec une heure, reporté à une date à venir : la base reprend l'heure et refuse (E1).
    afficher({ ...TERMINE_SANS_DEBUT, heureDebut: 1152 }, () =>
      Promise.reject({ code: 'P0001', message: MESSAGES_BASE.heureDebutAVenir }),
    )
    await changerDate('2026-10-17')
    expect(champHeureDebut()).toBeNull()
    await userEvent.click(bouton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "L'heure de début se saisit le jour de l'événement ou après.",
    )
  })

  it('refus de la base sur l’heure prévue (E3) : la phrase du guide, sous le champ', async () => {
    afficher(EN_PREPARATION, () =>
      Promise.reject({ code: 'P0001', message: MESSAGES_BASE.heurePrevueInvalide }),
    )
    await saisirHeure(champHeurePrevue(), '19:00')
    await userEvent.click(bouton())
    expect(await screen.findByText('Choisissez une heure valide.')).toBeInTheDocument()
    expect(champHeurePrevue()).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText(/invalide/)).toBeNull()
  })
})
