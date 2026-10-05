import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { simulerLargeur } from '@/test/largeur'
import { ChiffresEglise } from './ChiffresEglise'
import { exempleCetteSemaine } from './exemple'
import type { LigneChiffre } from './types'

const { chiffres, noteChiffres } = exempleCetteSemaine('berger')
const titre = "Les chiffres de l'église"

function afficher(lignes: LigneChiffre[] = chiffres) {
  render(<ChiffresEglise titre={titre} lignes={lignes} note={noteChiffres} />)
  return screen.getByRole('region', { name: titre })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChiffresEglise', () => {
  it('est un tableau à en-têtes de lignes et de colonnes', () => {
    const region = afficher()
    const tableau = within(region).getByRole('table', { name: titre })
    expect(
      within(tableau)
        .getAllByRole('columnheader')
        .map((entete) => entete.textContent),
    ).toEqual(['Chiffre', 'Valeur', 'Écart', 'Courbe', 'Date', 'Ministères ayant saisi'])
    expect(
      within(tableau)
        .getAllByRole('rowheader')
        .map((ligne) => ligne.textContent),
    ).toEqual([
      'STARs au service',
      'STARs actifs',
      'STARs présents en FIJ',
      'FIJ en Île-de-France',
      "Présents à Bâtir l'Église",
      'Présents à Anti-Dispersion',
    ])
  })

  it('donne à chaque chiffre sa valeur, son écart expliqué, sa courbe en texte, sa date et sa complétude', () => {
    const region = afficher()
    const service = within(region).getByRole('row', { name: /^STARs au service/ })
    expect(service).toHaveTextContent('52')
    expect(service).toHaveTextContent(
      '+3 par rapport à dimanche dernier, pour les 6 ministères qui ont saisi les deux fois',
    )
    expect(
      within(service).getByRole('img', {
        name: /^Dix derniers dimanches : 52, 57, 53, 56, 54, 56, 50, 54, 55, 52/,
      }),
    ).toBeInTheDocument()
    expect(within(service).getByText('Dimanche 27 sept.')).toBeInTheDocument()
    expect(within(service).getByText('6 sur 8')).toHaveClass('text-attention')

    const actifs = within(region).getByRole('row', { name: /^STARs actifs/ })
    expect(within(actifs).getByText('À ce jour, 1 valeur de plus de 30 jours')).toHaveClass(
      'text-attention',
    )
    expect(within(actifs).getByText('8 sur 8')).toHaveClass('text-encre-3')
    expect(within(region).getByRole('row', { name: /^STARs présents en FIJ/ })).toHaveTextContent(
      '77%',
    )
    expect(within(region).getByText(noteChiffres)).toBeInTheDocument()
  })

  it("écrit « Pas encore de saisie » à la place d'une valeur absente", () => {
    const [premiere] = chiffres
    afficher([{ ...premiere!, valeur: { etat: 'vide' }, ecart: null, courbe: null }])
    expect(screen.getByText('Pas encore de saisie')).toBeInTheDocument()
  })

  it('devient une liste sur téléphone : libellé, date et complétude, puis valeur et écart', () => {
    simulerLargeur(390)
    const region = afficher()
    expect(within(region).queryByRole('table')).not.toBeInTheDocument()
    const lignes = within(region).getAllByRole('listitem')
    expect(lignes).toHaveLength(6)
    expect(lignes[0]).toHaveTextContent('STARs au serviceDim. 27 sept., 6 sur 8')
    expect(
      within(lignes[0]!).getByRole('img', { name: /^Dix derniers dimanches/ }),
    ).toHaveAttribute('width', '72')
    expect(lignes[4]).toHaveTextContent('Sam. 26 sept., 6 sur 8')
  })
})
