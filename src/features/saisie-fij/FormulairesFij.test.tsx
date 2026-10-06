import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import {
  CARTE_EXEMPLE,
  DIMANCHE_EXEMPLE,
  statistiquesExemple,
} from '@/features/saisie-fij/apercu/exemplesE4'
import { FormulaireCarteFij } from '@/features/saisie-fij/FormulaireCarteFij'
import { FormulaireStatistiquesFij } from '@/features/saisie-fij/FormulaireStatistiquesFij'
import type { SaisieCarteFij, SaisieStatistiquesFij } from '@/features/saisie-fij/schemas'

function afficherCarte(
  carte: typeof CARTE_EXEMPLE,
  enregistrer: (valeurs: SaisieCarteFij) => Promise<void> = () => Promise.resolve(),
) {
  render(
    <MemoryRouter>
      <FormulaireCarteFij carte={carte} enregistrer={enregistrer} />
    </MemoryRouter>,
  )
}

function afficherStatistiques(
  statistiques = statistiquesExemple(),
  enregistrer: (saisie: SaisieStatistiquesFij) => Promise<void> = () => Promise.resolve(),
) {
  render(
    <MemoryRouter>
      <FormulaireStatistiquesFij
        dimancheReference={DIMANCHE_EXEMPLE}
        statistiques={statistiques}
        enregistrer={enregistrer}
      />
    </MemoryRouter>,
  )
}

describe('FormulaireCarteFij', () => {
  it('8 champs préremplis, « Total : 29 FIJ », une aide, le lien de signalement', () => {
    afficherCarte(CARTE_EXEMPLE)
    expect(screen.getAllByRole('textbox')).toHaveLength(8)
    expect(screen.getByLabelText('75 Paris')).toHaveValue('4')
    expect(screen.getByText('Total : 29 FIJ')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_fij',
    )
  })

  it('le total suit la saisie, avec sa complétude quand un département manque', async () => {
    const utilisateur = userEvent.setup()
    afficherCarte(CARTE_EXEMPLE)
    await utilisateur.clear(screen.getByLabelText('77 Seine-et-Marne'))
    expect(screen.getByText('Total : 26 FIJ, 7 dép. sur 8')).toBeInTheDocument()
  })

  it('premier envoi : champs vides, chacun demandé avant l’envoi', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = vi.fn(() => Promise.resolve())
    afficherCarte([], enregistrer)
    expect(
      screen.getByText("Aucune carte enregistrée pour l'instant : saisissez les 8 départements."),
    ).toBeInTheDocument()
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer la carte' }))
    expect(screen.getAllByText('Saisissez un nombre, 0 si aucun.')).toHaveLength(8)
    expect(screen.getByLabelText('75 Paris')).toHaveFocus()
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it('envoie les 8 départements en un envoi, puis « Carte des FIJ enregistrée. »', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = vi.fn((valeurs: SaisieCarteFij) => {
      expect(valeurs).toHaveLength(8)
      return Promise.resolve()
    })
    afficherCarte(CARTE_EXEMPLE, enregistrer)
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer la carte' }))
    expect(enregistrer).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Carte des FIJ enregistrée.')).toBeInTheDocument()
  })

  it('un refus de la base s’affiche sous le bouton, les valeurs restent', async () => {
    const utilisateur = userEvent.setup()
    afficherCarte(CARTE_EXEMPLE, () =>
      Promise.reject({ code: '42501', message: 'new row violates row-level security policy' }),
    )
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer la carte' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Cet élément n'existe pas ou vous n'y avez pas accès.",
    )
    expect(screen.getByLabelText('75 Paris')).toHaveValue('4')
  })
})

describe('FormulaireStatistiquesFij', () => {
  it('4 rubriques de 8 départements, une section chacune, avec leur total en direct', () => {
    afficherStatistiques()
    const sections = screen.getAllByRole('group')
    expect(sections.map((section) => section.querySelector('legend')?.textContent)).toEqual([
      'Présents au culte EJP',
      'Présents à la réunion FIJ',
      "Présents à l'évangélisation",
      'Membres du mardi',
    ])
    for (const section of sections) {
      expect(within(section).getAllByRole('textbox')).toHaveLength(8)
    }
    expect(
      within(sections[0] as HTMLElement).getByText('Total : 48, 6 dép. sur 8'),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Aide : / })).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Signaler une difficulté' })).toHaveAttribute(
      'href',
      '/signaler?ecran=saisie_fij_statistiques',
    )
  })

  it('changer de semaine reprend ce qui est enregistré pour elle', async () => {
    const utilisateur = userEvent.setup()
    afficherStatistiques()
    const premiere = () => screen.getAllByRole('group')[0] as HTMLElement
    expect(within(premiere()).getByLabelText('77 Seine-et-Marne')).toHaveValue('')
    await utilisateur.selectOptions(screen.getByLabelText('Semaine'), '2026-09-20')
    expect(within(premiere()).getByLabelText('77 Seine-et-Marne')).not.toHaveValue('')
    expect(within(premiere()).getByText(/8 dép\. sur 8/)).toBeInTheDocument()
  })

  it('aucune valeur : « Saisissez au moins une valeur. », sans envoi', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = vi.fn(() => Promise.resolve())
    afficherStatistiques(statistiquesExemple('premier-usage'), enregistrer)
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer les chiffres' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Saisissez au moins une valeur.')
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it('n’envoie que les départements saisis, en un appel, puis le message de la semaine', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = vi.fn(() => Promise.resolve())
    afficherStatistiques(statistiquesExemple('premier-usage'), enregistrer)
    const premiere = screen.getAllByRole('group')[0] as HTMLElement
    await utilisateur.type(within(premiere).getByLabelText('75 Paris'), '12')
    await utilisateur.type(within(premiere).getByLabelText('93 Seine-Saint-Denis'), '0')
    expect(within(premiere).getByText('Total : 12, 2 dép. sur 8')).toBeInTheDocument()
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer les chiffres' }))
    expect(enregistrer).toHaveBeenCalledWith({
      dimanche: '2026-09-27',
      valeurs: [
        { rubrique: 'culte_ejp', departement: '75', valeur: 12 },
        { rubrique: 'culte_ejp', departement: '93', valeur: 0 },
      ],
    })
    expect(
      await screen.findByText('Chiffres par département de la semaine 39 enregistrés.'),
    ).toBeInTheDocument()
  })

  it('refuse une valeur hors bornes sous son champ', async () => {
    const utilisateur = userEvent.setup()
    const enregistrer = vi.fn(() => Promise.resolve())
    afficherStatistiques(statistiquesExemple('premier-usage'), enregistrer)
    const champ = within(screen.getAllByRole('group')[1] as HTMLElement).getByLabelText(
      '91 Essonne',
    )
    await utilisateur.type(champ, '10000')
    await utilisateur.click(screen.getByRole('button', { name: 'Enregistrer les chiffres' }))
    expect(screen.getByText('Entre 0 et 9 999.')).toBeInTheDocument()
    expect(champ).toHaveFocus()
    expect(enregistrer).not.toHaveBeenCalled()
  })
})
