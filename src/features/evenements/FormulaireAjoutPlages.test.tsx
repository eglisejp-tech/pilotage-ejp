import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { FormulaireAjoutEvenement } from '@/features/evenements/FormulaireAjoutEvenement'
import type { AjoutEvenement, AjoutSerie } from '@/features/evenements/schemas'
import { TEXTES_PLAGES } from '@/features/evenements/textesPlages'

// « Ajouter un événement » à trois cases (T78, lot 2 ; conception calendrier-evenements.md,
// sections 5.5, 7 (S1, S6) et 8.1). Jour de Paris : lundi 26 octobre 2026.

const COORDINATION = '10000000-0000-4000-8000-000000000002'
const FIJ = '10000000-0000-4000-8000-000000000003'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function afficher(
  envoyer: (evenement: AjoutEvenement, numero: string) => Promise<void> = () => Promise.resolve(),
  envoyerSerie: (serie: AjoutSerie, numero: string) => Promise<void> = () => Promise.resolve(),
) {
  render(
    <MemoryRouter>
      <FormulaireAjoutEvenement
        aujourdhui="2026-10-26"
        ministereId={COORDINATION}
        ministeres={[{ id: FIJ, nom: 'FIJ' }]}
        envoyer={envoyer}
        envoyerSerie={envoyerSerie}
      />
    </MemoryRouter>,
  )
}

async function remplirLeReste(utilisateur: ReturnType<typeof userEvent.setup>, nom: string) {
  await utilisateur.type(screen.getByLabelText("Nom de l'événement"), nom)
  await utilisateur.click(screen.getByRole('radio', { name: 'Validé' }))
  await utilisateur.click(screen.getByRole('checkbox', { name: 'FIJ' }))
}

describe('« Ajouter un événement » : Quand ? (T78, lot 2)', () => {
  it('S1, le cas réel : Coordination saisit chaque lundi du 2 nov. au 14 déc., de 19 h à 21 h', async () => {
    const envoyerSerie = vi.fn<(serie: AjoutSerie, numero: string) => Promise<void>>(() =>
      Promise.resolve(),
    )
    afficher(undefined, envoyerSerie)
    const utilisateur = userEvent.setup()
    await utilisateur.click(screen.getByRole('radio', { name: 'Se répète' }))
    expect(screen.getByText(TEXTES_PLAGES.noteRepete)).toBeInTheDocument()
    await utilisateur.type(screen.getByLabelText('Première date'), '2026-11-02')
    // Le jour de la première date est coché d'avance.
    expect(screen.getByRole('checkbox', { name: 'lundi' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'mardi' })).not.toBeChecked()
    await utilisateur.type(screen.getByLabelText('Dernière date'), '2026-12-14')
    await utilisateur.type(screen.getByLabelText('Heure prévue (facultatif)'), '19:00')
    await utilisateur.type(screen.getByLabelText('Heure de fin (facultatif)'), '21:00')
    await remplirLeReste(utilisateur, 'Réunion des responsables')
    expect(
      screen.getByText(
        '7 dates : lun. 2 nov., lun. 9 nov., lun. 16 nov., lun. 23 nov., lun. 30 nov., lun. 7 déc., lun. 14 déc.',
      ),
    ).toBeInTheDocument()
    await utilisateur.click(
      screen.getByRole('button', { name: 'Ajouter 7 événements au calendrier' }),
    )
    expect(await screen.findByText('7 événements ajoutés au calendrier.')).toBeInTheDocument()
    expect(envoyerSerie).toHaveBeenCalledWith(
      {
        dates: [
          '2026-11-02',
          '2026-11-09',
          '2026-11-16',
          '2026-11-23',
          '2026-11-30',
          '2026-12-07',
          '2026-12-14',
        ],
        titre: 'Réunion des responsables',
        statut: 'valide',
        mentions: [FIJ],
        heure_prevue: 1140,
        heure_fin: 1260,
      },
      expect.stringMatching(UUID),
    )
    // Formulaire vidé, de retour à « Un jour ».
    expect(screen.getByRole('radio', { name: 'Un jour' })).toBeChecked()
    expect(screen.getByLabelText('Date')).toHaveValue('')
  })

  it('« Un jour » coché d’avance, sans phrase ; les deux autres cases disent leur règle', async () => {
    afficher()
    expect(screen.getByRole('group', { name: 'Quand ?' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Un jour' })).toBeChecked()
    expect(screen.queryByText(TEXTES_PLAGES.notePlusieursJours)).toBeNull()
    expect(screen.queryByLabelText('Dernier jour')).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: 'Plusieurs jours' }))
    expect(screen.getByText(TEXTES_PLAGES.notePlusieursJours)).toBeInTheDocument()
    expect(screen.getByLabelText('Premier jour')).toBeInTheDocument()
    expect(screen.getByLabelText('Dernier jour')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Jours de la semaine' })).toBeNull()
  })

  it('S6 : le camp, du sam. 31 oct. au lun. 2 nov., de 10 h à 17 h, part en un seul événement', async () => {
    const envoyer = vi.fn<(evenement: AjoutEvenement, numero: string) => Promise<void>>(() =>
      Promise.resolve(),
    )
    afficher(envoyer)
    const utilisateur = userEvent.setup()
    await utilisateur.click(screen.getByRole('radio', { name: 'Plusieurs jours' }))
    await utilisateur.type(screen.getByLabelText('Premier jour'), '2026-10-31')
    await utilisateur.type(screen.getByLabelText('Dernier jour'), '2026-11-02')
    await utilisateur.type(screen.getByLabelText('Heure prévue (facultatif)'), '10:00')
    await utilisateur.type(screen.getByLabelText('Heure de fin (facultatif)'), '17:00')
    await remplirLeReste(utilisateur, 'Camp de Toussaint')
    await utilisateur.click(screen.getByRole('button', { name: 'Ajouter au calendrier' }))
    expect(await screen.findByText('Événement ajouté au calendrier.')).toBeInTheDocument()
    expect(envoyer).toHaveBeenCalledWith(
      {
        date: '2026-10-31',
        date_fin: '2026-11-02',
        titre: 'Camp de Toussaint',
        statut: 'valide',
        mentions: [FIJ],
        heure_prevue: 600,
        heure_fin: 1020,
      },
      expect.stringMatching(UUID),
    )
  })

  it('plusieurs jours : dernier jour vide, avant le premier, ou plus de 31 jours', async () => {
    const envoyer = vi.fn(() => Promise.resolve())
    afficher(envoyer)
    const utilisateur = userEvent.setup()
    await utilisateur.click(screen.getByRole('radio', { name: 'Plusieurs jours' }))
    await utilisateur.type(screen.getByLabelText('Premier jour'), '2026-10-31')
    await remplirLeReste(utilisateur, 'Camp')
    const bouton = screen.getByRole('button', { name: 'Ajouter au calendrier' })
    await utilisateur.click(bouton)
    expect(await screen.findByText('Choisissez le dernier jour.')).toBeInTheDocument()
    await utilisateur.type(screen.getByLabelText('Dernier jour'), '2026-10-30')
    await utilisateur.click(bouton)
    expect(await screen.findByText('Le dernier jour doit suivre le premier.')).toBeInTheDocument()
    await utilisateur.clear(screen.getByLabelText('Dernier jour'))
    await utilisateur.type(screen.getByLabelText('Dernier jour'), '2026-12-01')
    await utilisateur.click(bouton)
    expect(
      await screen.findByText(
        'Un événement dure 31 jours au plus. Pour des dates séparées, choisissez Se répète.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Dernier jour')).toHaveAttribute('aria-invalid', 'true')
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('série : aucun jour coché, aucune date trouvée, une seule date, plus de 31 dates, 12 mois', async () => {
    const envoyerSerie = vi.fn(() => Promise.resolve())
    afficher(undefined, envoyerSerie)
    const utilisateur = userEvent.setup()
    await utilisateur.click(screen.getByRole('radio', { name: 'Se répète' }))
    await utilisateur.type(screen.getByLabelText('Première date'), '2026-11-03')
    await utilisateur.type(screen.getByLabelText('Dernière date'), '2026-11-04')
    await remplirLeReste(utilisateur, 'Réunion')
    const bouton = () => screen.getByRole('button', { name: /^Ajouter.* au calendrier$/ })
    // Mardi coché d'avance ; le décocher ne laisse aucun jour.
    await utilisateur.click(screen.getByRole('checkbox', { name: 'mardi' }))
    await utilisateur.click(bouton())
    expect(
      await screen.findByText('Choisissez au moins un jour de la semaine.'),
    ).toBeInTheDocument()
    await utilisateur.click(screen.getByRole('checkbox', { name: 'lundi' }))
    await utilisateur.click(bouton())
    expect(
      await screen.findByText('Aucune date ne correspond. Changez les jours ou les dates.'),
    ).toBeInTheDocument()
    await utilisateur.click(screen.getByRole('checkbox', { name: 'mardi' }))
    await utilisateur.click(bouton())
    expect(
      await screen.findByText(
        'Une série compte au moins deux dates. Pour une seule date, choisissez Un jour.',
      ),
    ).toBeInTheDocument()
    for (const jour of ['mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche', 'lundi'])
      await utilisateur.click(screen.getByRole('checkbox', { name: jour }))
    await utilisateur.clear(screen.getByLabelText('Dernière date'))
    await utilisateur.type(screen.getByLabelText('Dernière date'), '2026-12-31')
    await utilisateur.click(bouton())
    expect(
      await screen.findByText('Une série compte 31 dates au plus. Raccourcissez la période.'),
    ).toBeInTheDocument()
    await utilisateur.clear(screen.getByLabelText('Dernière date'))
    await utilisateur.type(screen.getByLabelText('Dernière date'), '2027-11-04')
    await utilisateur.click(bouton())
    expect(await screen.findByText('Une série tient sur 12 mois au plus.')).toBeInTheDocument()
    expect(envoyerSerie).not.toHaveBeenCalled()
  })
})
