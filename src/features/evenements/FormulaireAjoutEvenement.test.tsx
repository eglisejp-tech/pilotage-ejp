import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { FormulaireAjoutEvenement } from '@/features/evenements/FormulaireAjoutEvenement'
import type { AjoutEvenement } from '@/features/evenements/schemas'
import { MESSAGES_BASE } from '@/features/evenements/textes'
import { RAPPEL_DONNEES_PERSONNELLES } from '@/features/saisie/textes'

const MINISTERES = [
  { id: '10000000-0000-4000-8000-000000000002', nom: 'Coordination' },
  { id: '10000000-0000-4000-8000-000000000005', nom: 'Intégration' },
]

function afficher(
  envoyer: (evenement: AjoutEvenement) => Promise<void> = () => Promise.resolve(),
  ministeres = MINISTERES,
) {
  render(
    <MemoryRouter>
      <FormulaireAjoutEvenement
        aujourdhui="2026-10-06"
        ministereId="10000000-0000-4000-8000-000000000001"
        ministeres={ministeres}
        envoyer={envoyer}
      />
    </MemoryRouter>,
  )
}

async function remplir(date: string) {
  const utilisateur = userEvent.setup()
  await utilisateur.type(screen.getByLabelText('Date'), date)
  await utilisateur.type(screen.getByLabelText("Nom de l'événement"), '  Soirée de louange ')
  await utilisateur.click(screen.getByRole('radio', { name: 'En attente de validation' }))
  await utilisateur.click(screen.getByRole('checkbox', { name: 'Coordination' }))
  return utilisateur
}

const bouton = () => screen.getByRole('button', { name: 'Ajouter au calendrier' })

describe('« Ajouter un événement » (maquette 11)', () => {
  it('champs, trois aides, rappel une seule fois sous le nom, note des mentions et lien', () => {
    afficher()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Aide : Date' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aide : Statut' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aide : Ministères mentionnés' })).toBeInTheDocument()
    expect(screen.getAllByText(RAPPEL_DONNEES_PERSONNELLES)).toHaveLength(1)
    expect(screen.getByLabelText("Nom de l'événement")).toHaveAccessibleDescription(
      RAPPEL_DONNEES_PERSONNELLES,
    )
    expect(screen.getByRole('group', { name: 'Statut' })).toHaveAccessibleDescription(
      "La validation se fait en dehors de l'outil. Ici, on reporte seulement le statut.",
    )
    expect(
      screen.getByText('Le ministère mentionné verra cet événement, et seulement cet événement.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Les mentions se choisissent à la création et ne changent plus.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveAttribute('min', '2026-10-06')
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_evenement',
    )
  })

  it('aucun autre ministère actif : une phrase, sans aide ni case', () => {
    afficher(undefined, [])
    expect(screen.getByText('Aucun autre ministère actif à mentionner.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(2)
  })

  it('formulaire vide : un message sous chaque champ obligatoire, rien n’est envoyé', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(envoyer)
    await userEvent.click(bouton())
    expect(await screen.findByText('Choisissez une date.')).toBeInTheDocument()
    expect(screen.getByText("Donnez un nom à l'événement.")).toBeInTheDocument()
    expect(screen.getByText('Choisissez un statut.')).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveAttribute('aria-invalid', 'true')
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('date passée : refusée avant l’envoi, sous le champ, avec le lien « Signaler une difficulté »', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(envoyer)
    await remplir('2026-10-05')
    await userEvent.click(bouton())
    const message = await screen.findByText(/Cette date est passée\./)
    expect(message).toHaveTextContent(
      "Cette date est passée. Choisissez aujourd'hui ou une date à venir. Vous ne pouvez pas choisir de date ? Signaler une difficulté",
    )
    expect(within(message).getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_evenement',
    )
    expect(screen.getByLabelText('Date')).toHaveAccessibleDescription(message.textContent ?? '')
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('envoi : valeurs nettoyées, message de réussite, formulaire vidé', async () => {
    const envoyer = vi.fn<(evenement: AjoutEvenement) => Promise<void>>(() => Promise.resolve())
    afficher(envoyer)
    await remplir('2026-10-10')
    await userEvent.click(bouton())
    expect(await screen.findByText('Événement ajouté au calendrier.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith({
      date: '2026-10-10',
      titre: 'Soirée de louange',
      statut: 'attente_validation',
      mentions: ['10000000-0000-4000-8000-000000000002'],
    })
    expect(screen.getByLabelText("Nom de l'événement")).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: 'Coordination' })).not.toBeChecked()
  })

  it('refus de la base sur la date : sous le champ, avec le lien, valeurs gardées', async () => {
    afficher(() => Promise.reject({ code: 'P0001', message: MESSAGES_BASE.datePasseeAjout }))
    await remplir('2026-10-06')
    await userEvent.click(bouton())
    const message = await screen.findByText(/Cette date est passée\./)
    expect(
      within(message).getByRole('link', { name: 'Signaler une difficulté' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Nom de l'événement")).toHaveValue('  Soirée de louange ')
    expect(screen.getByLabelText('Date')).toHaveFocus()
  })

  it('autre refus de la base : tel quel sous le bouton ; connexion perdue : valeurs gardées', async () => {
    const envoyer = vi
      .fn<(evenement: AjoutEvenement) => Promise<void>>()
      .mockRejectedValueOnce({ code: 'P0001', message: 'Ce ministère ne peut pas être mentionné.' })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    afficher(envoyer)
    await remplir('2026-10-10')
    await userEvent.click(bouton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce ministère ne peut pas être mentionné.',
    )
    await userEvent.click(bouton())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La connexion a échoué. Votre message est encore dans le formulaire : réessayez.',
    )
    expect(screen.getByLabelText("Nom de l'événement")).toHaveValue('  Soirée de louange ')
    expect(screen.getByRole('radio', { name: 'En attente de validation' })).toBeChecked()
  })

  it('mentions facultatives : le titre du groupe le dit, l’aide garde son nom', () => {
    afficher()
    expect(screen.getByRole('group', { name: 'Ministères mentionnés (facultatif)' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Aide : Ministères mentionnés' })).toBeVisible()
  })

  it('la date choisie s’écrit en toutes lettres sous le champ', async () => {
    afficher()
    await userEvent.type(screen.getByLabelText('Date'), '2026-10-10')
    expect(screen.getByText('samedi 10 octobre 2026')).toBeInTheDocument()
  })

  it('statut manquant : l’erreur est reliée à chaque bouton radio', async () => {
    afficher()
    await userEvent.type(screen.getByLabelText('Date'), '2026-10-10')
    await userEvent.type(screen.getByLabelText("Nom de l'événement"), 'Soirée')
    await userEvent.click(bouton())
    const erreur = await screen.findByText('Choisissez un statut.')
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-invalid', 'true')
      expect(radio).toHaveAccessibleDescription(
        expect.stringContaining(erreur.textContent ?? 'absent'),
      )
    }
  })

  it('aides au clavier : Entrée ouvre, Échap ferme, le focus reste sur le bouton', async () => {
    afficher()
    const utilisateur = userEvent.setup()
    const aide = screen.getByRole('button', { name: 'Aide : Date' })
    aide.focus()
    await utilisateur.keyboard('{Enter}')
    expect(aide).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByText(
        "Seuls le jour et le nom s'enregistrent : l'outil ne garde ni l'heure ni le lieu.",
      ),
    ).toBeInTheDocument()
    await utilisateur.keyboard('{Escape}')
    expect(aide).toHaveAttribute('aria-expanded', 'false')
    expect(aide).toHaveFocus()
  })
})
