import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { FormulaireReunion } from '@/features/evenements/FormulaireReunion'
import type { Reunion, ValeursReunion } from '@/features/evenements/schemas'
import { RAPPEL_DONNEES_PERSONNELLES } from '@/features/saisie/textes'

function afficher(
  prochaine: ValeursReunion | null = null,
  envoyer: (reunion: Reunion) => Promise<void> = () => Promise.resolve(),
) {
  render(
    <MemoryRouter>
      <FormulaireReunion aujourdhui="2026-10-06" prochaine={prochaine} envoyer={envoyer} />
    </MemoryRouter>,
  )
}

const bouton = () => screen.getByRole('button', { name: 'Enregistrer la réunion' })

describe('« Prochaine réunion » (dérivé de 11)', () => {
  it('champs, deux aides, rappel une seule fois sous l’objet, lien « Signaler une difficulté »', () => {
    afficher()
    expect(screen.getByLabelText('Date')).toHaveValue('')
    expect(screen.getByLabelText('Date')).toHaveAttribute('min', '2026-10-06')
    expect(screen.getByLabelText('Heure (facultatif)')).toHaveValue('')
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Aide : Date' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Aide : Décision attendue (facultatif)' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(RAPPEL_DONNEES_PERSONNELLES)).toHaveLength(1)
    expect(screen.getByLabelText('Objet (facultatif)')).toHaveAccessibleDescription(
      RAPPEL_DONNEES_PERSONNELLES,
    )
    expect(screen.getByLabelText('Décision attendue (facultatif)')).not.toHaveAccessibleDescription(
      RAPPEL_DONNEES_PERSONNELLES,
    )
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_reunion',
    )
  })

  it('« Modifier » : le formulaire reprend la réunion déclarée', () => {
    afficher({
      date: '2026-10-12',
      heure: '20:00',
      objet: 'Préparer la soirée de louange',
      decision: 'Choisir la salle',
    })
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-12')
    expect(screen.getByLabelText('Heure (facultatif)')).toHaveValue('20:00')
    expect(screen.getByLabelText('Objet (facultatif)')).toHaveValue('Préparer la soirée de louange')
    expect(screen.getByLabelText('Décision attendue (facultatif)')).toHaveValue('Choisir la salle')
  })

  it('date vide ou passée : refusée sous le champ, sans lien, rien n’est envoyé', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(null, envoyer)
    await userEvent.click(bouton())
    expect(await screen.findByText('Choisissez une date.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Date'), '2026-10-05')
    await userEvent.click(bouton())
    const message = await screen.findByText(
      "Cette date est passée. Choisissez aujourd'hui ou une date à venir.",
    )
    expect(within(message).queryByRole('link')).toBeNull()
    expect(screen.getByLabelText('Date')).toHaveAccessibleDescription(message.textContent ?? '')
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('compteur à partir de 60 caractères, 80 au plus', async () => {
    afficher()
    const objet = screen.getByLabelText('Objet (facultatif)')
    await userEvent.type(objet, 'a'.repeat(59))
    expect(screen.queryByText(/sur 80/)).toBeNull()
    await userEvent.type(objet, 'a'.repeat(22))
    expect(screen.getByText('81 sur 80')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Date'), '2026-10-12')
    await userEvent.click(bouton())
    expect(await screen.findByText("L'objet fait 80 caractères au plus.")).toBeInTheDocument()
  })

  it('envoi : facultatifs vides à null, message de réussite, valeurs gardées', async () => {
    const envoyer = vi.fn<(reunion: Reunion) => Promise<void>>(() => Promise.resolve())
    afficher(null, envoyer)
    await userEvent.type(screen.getByLabelText('Date'), '2026-10-06')
    await userEvent.type(screen.getByLabelText('Objet (facultatif)'), ' Bilan du trimestre ')
    await userEvent.click(bouton())
    expect(await screen.findByText('Réunion enregistrée.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith({
      date: '2026-10-06',
      heure: null,
      objet: 'Bilan du trimestre',
      decision: null,
    })
    expect(screen.getByLabelText('Objet (facultatif)')).toHaveValue('Bilan du trimestre')
  })

  it('connexion perdue : erreur de formulaire sous le bouton, valeurs gardées', async () => {
    afficher(null, () => Promise.reject(new TypeError('Failed to fetch')))
    await userEvent.type(screen.getByLabelText('Date'), '2026-10-12')
    await userEvent.type(screen.getByLabelText('Décision attendue (facultatif)'), 'Choisir')
    await userEvent.click(bouton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Votre message est encore dans le formulaire : réessayez.',
    )
    expect(screen.getByLabelText('Décision attendue (facultatif)')).toHaveValue('Choisir')
  })
})
