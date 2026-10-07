import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import {
  LONGUEUR_DESCRIPTION_POINT,
  LONGUEUR_TITRE_POINT,
  MESSAGES_POINT,
} from '@/data/pointsEcriture'
import { FormulaireNouveauPoint } from '@/features/nouveau-point/FormulaireNouveauPoint'
import type { NouveauPoint } from '@/features/nouveau-point/schemas'
import { RAPPEL_DONNEES_PERSONNELLES } from '@/features/saisie/textes'

const MINISTERES = [
  { id: '10000000-0000-4000-8000-000000000002', nom: 'Coordination' },
  { id: '10000000-0000-4000-8000-000000000005', nom: 'Intégration' },
]

function afficher(
  envoyer: (point: NouveauPoint) => Promise<void> = () => Promise.resolve(),
  ministeres = MINISTERES,
) {
  render(
    <MemoryRouter>
      <FormulaireNouveauPoint
        aujourdhui="2026-10-06"
        ministereId="10000000-0000-4000-8000-000000000001"
        ministeres={ministeres}
        envoyer={envoyer}
      />
    </MemoryRouter>,
  )
}

const bouton = () => screen.getByRole('button', { name: 'Créer le point' })
const titre = () => screen.getByLabelText('Titre')

/** Titre et, au besoin, les autres champs d'un point valide. */
async function remplir(echeance?: string) {
  const utilisateur = userEvent.setup()
  await utilisateur.type(titre(), '  Salle pour la soirée de louange ')
  await utilisateur.type(
    screen.getByLabelText('Ce qui se passe (facultatif)'),
    'La salle du 10 octobre n’est pas confirmée.',
  )
  await utilisateur.click(screen.getByRole('radio', { name: 'Haute' }))
  await utilisateur.type(screen.getByLabelText('Ce qui est attendu (facultatif)'), 'Confirmer')
  if (echeance) await utilisateur.type(screen.getByLabelText('Échéance (facultatif)'), echeance)
  await utilisateur.click(screen.getByRole('checkbox', { name: 'Coordination' }))
  return utilisateur
}

describe('« Nouveau point d’attention » (maquette 10)', () => {
  it('champs dans l’ordre de la maquette, trois aides, rappel une seule fois sous le titre', () => {
    afficher()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(3)
    for (const nom of [
      'Aide : Priorité',
      'Aide : Ce qui est attendu (facultatif)',
      'Aide : Échéance (facultatif)',
    ]) {
      expect(screen.getByRole('button', { name: nom })).toBeInTheDocument()
    }
    expect(screen.getAllByText(RAPPEL_DONNEES_PERSONNELLES)).toHaveLength(1)
    expect(titre()).toHaveAccessibleDescription(RAPPEL_DONNEES_PERSONNELLES)
    // Les champs, de haut en bas (le titre porte le rappel, pas la description).
    const champs = [...document.querySelectorAll('input, textarea')].map(
      (champ) => champ.id || (champ as HTMLInputElement).value,
    )
    expect(champs).toEqual([
      'point-titre',
      'point-description',
      'normale',
      'haute',
      'urgente',
      'point-attendu',
      'point-echeance',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000005',
    ])
    expect(screen.getByLabelText('Échéance (facultatif)')).toHaveAttribute('min', '2026-10-06')
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=autre',
    )
  })

  it('priorité : trois vrais boutons radio, « Normale » au départ', () => {
    afficher()
    const groupe = screen.getByRole('group', { name: 'Priorité' })
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Normale' })).toBeChecked()
    expect(groupe).toBeInTheDocument()
  })

  it('mentions : les autres ministères, la note visible et la ligne sur la création', () => {
    afficher()
    expect(
      screen
        .getAllByRole('checkbox')
        .map((caseACocher) => caseACocher.closest('label')?.textContent),
    ).toEqual(['Coordination', 'Intégration'])
    const groupe = screen.getByRole('group', { name: 'Mentionner un ministère (facultatif)' })
    expect(groupe).toHaveAccessibleDescription(
      'Le ministère mentionné verra ce point, et seulement ce point. Il pourra le marquer traité en expliquant ce qui a été fait. Le berger et le conseil voient tous les points. Les mentions se choisissent à la création et ne changent plus.',
    )
  })

  it('un ministère coché reçoit un « ✓ » en plus du fond', async () => {
    afficher()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Coordination' }))
    expect(screen.getByRole('checkbox', { name: 'Coordination' })).toBeChecked()
    expect(screen.getByText('✓')).toHaveAttribute('aria-hidden', 'true')
  })

  it('aucun autre ministère actif : une phrase, sans case ni note', () => {
    afficher(undefined, [])
    expect(screen.getByText('Aucun autre ministère actif à mentionner.')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByText(/Le ministère mentionné verra ce point/)).toBeNull()
  })

  it('formulaire vide : « Donnez un titre au point. » sous le titre, rien n’est envoyé', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(envoyer)
    await userEvent.click(bouton())
    const message = await screen.findByText(MESSAGES_POINT.refus.titre)
    expect(titre()).toHaveAttribute('aria-invalid', 'true')
    expect(titre()).toHaveAccessibleDescription(
      `${RAPPEL_DONNEES_PERSONNELLES} ${message.textContent}`,
    )
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('compteurs : « 51 sur 280 » sous « Ce qui se passe », « 62 sur 80 » à partir de 60 caractères', async () => {
    afficher()
    const utilisateur = userEvent.setup()
    expect(screen.getByText('0 sur 280')).toBeInTheDocument()
    await utilisateur.type(screen.getByLabelText('Ce qui se passe (facultatif)'), 'a'.repeat(51))
    expect(screen.getByText('51 sur 280')).toBeInTheDocument()
    expect(screen.queryByText(/sur 80/)).toBeNull()
    await utilisateur.type(titre(), 'b'.repeat(62))
    expect(screen.getByText('62 sur 80')).toBeInTheDocument()
  })

  it('compteurs : les maximums sont ceux du point (titre, description), pas ceux d’un autre écran', async () => {
    afficher()
    const utilisateur = userEvent.setup()
    await utilisateur.type(screen.getByLabelText('Ce qui se passe (facultatif)'), 'a')
    await utilisateur.type(titre(), 'b'.repeat(60))
    expect(screen.getByText(`1 sur ${LONGUEUR_DESCRIPTION_POINT}`)).toBeInTheDocument()
    expect(screen.getByText(`60 sur ${LONGUEUR_TITRE_POINT}`)).toBeInTheDocument()
  })

  it('échéance passée : refusée avant l’envoi, sous le champ, avec le message de la base', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(envoyer)
    await remplir('2026-10-05')
    await userEvent.click(bouton())
    const message = await screen.findByText(MESSAGES_POINT.refus.echeancePassee)
    expect(screen.getByLabelText('Échéance (facultatif)')).toHaveAccessibleDescription(
      message.textContent ?? '',
    )
    expect(titre()).toHaveValue('  Salle pour la soirée de louange ')
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('échéance en toutes lettres sous le champ, pour vérifier le jour', async () => {
    afficher()
    await userEvent.type(screen.getByLabelText('Échéance (facultatif)'), '2026-10-10')
    expect(screen.getByText('samedi 10 octobre 2026')).toBeInTheDocument()
  })

  it('envoi : valeurs nettoyées, « Point créé. », formulaire vidé, priorité redevenue « Normale »', async () => {
    const envoyer = vi.fn<(point: NouveauPoint) => Promise<void>>(() => Promise.resolve())
    afficher(envoyer)
    await remplir('2026-10-10')
    await userEvent.click(bouton())
    expect(await screen.findByText('Point créé.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledTimes(1)
    expect(envoyer).toHaveBeenCalledWith({
      titre: 'Salle pour la soirée de louange',
      description: 'La salle du 10 octobre n’est pas confirmée.',
      priorite: 'haute',
      attendu: 'Confirmer',
      echeance: '2026-10-10',
      mentions: ['10000000-0000-4000-8000-000000000002'],
    })
    expect(titre()).toHaveValue('')
    expect(screen.getByRole('radio', { name: 'Normale' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Coordination' })).not.toBeChecked()
  })

  it('titre seul : description, attendu et échéance partent à null, sans mention', async () => {
    const envoyer = vi.fn<(point: NouveauPoint) => Promise<void>>(() => Promise.resolve())
    afficher(envoyer)
    await userEvent.type(titre(), 'Un point')
    await userEvent.click(bouton())
    expect(await screen.findByText('Point créé.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith({
      titre: 'Un point',
      description: null,
      priorite: 'normale',
      attendu: null,
      echeance: null,
      mentions: [],
    })
  })

  it('double clic pendant l’envoi : un seul envoi', async () => {
    let finir: () => void = () => undefined
    const envoyer = vi.fn<(point: NouveauPoint) => Promise<void>>(
      () =>
        new Promise<void>((fin) => {
          finir = fin
        }),
    )
    afficher(envoyer)
    await userEvent.type(titre(), 'Un point')
    await userEvent.click(bouton())
    expect(await screen.findByRole('button', { name: 'Envoi en cours' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Envoi en cours' }))
    finir()
    expect(await screen.findByText('Point créé.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledTimes(1)
  })

  it('refus de la base sur l’échéance : sous le champ, valeurs gardées, focus sur le champ', async () => {
    afficher(() => Promise.reject({ code: 'P0001', message: MESSAGES_POINT.refus.echeancePassee }))
    await remplir('2026-10-06')
    await userEvent.click(bouton())
    expect(await screen.findByText(MESSAGES_POINT.refus.echeancePassee)).toBeInTheDocument()
    expect(titre()).toHaveValue('  Salle pour la soirée de louange ')
    expect(screen.getByLabelText('Échéance (facultatif)')).toHaveFocus()
  })

  it('autre refus de la base : tel quel sous le bouton ; connexion perdue : valeurs gardées', async () => {
    const envoyer = vi
      .fn<(point: NouveauPoint) => Promise<void>>()
      .mockRejectedValueOnce({ code: 'P0001', message: 'Autre refus.' })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    afficher(envoyer)
    await remplir()
    await userEvent.click(bouton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Autre refus.')
    await userEvent.click(bouton())
    expect(await screen.findByText(/La connexion a échoué/)).toHaveTextContent(
      'La connexion a échoué. Votre point est encore dans le formulaire : réessayez.',
    )
    expect(titre()).toHaveValue('  Salle pour la soirée de louange ')
    expect(screen.getByRole('radio', { name: 'Haute' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Coordination' })).toBeChecked()
    expect(bouton()).not.toHaveAttribute('aria-disabled')
  })
})
