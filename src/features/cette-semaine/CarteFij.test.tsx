import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { niveauTeinte } from './carte'
import { CarteFij } from './CarteFij'
import { exempleCetteSemaine } from './exemple'

const { carte } = exempleCetteSemaine('berger')

describe('niveauTeinte', () => {
  it('va de la teinte la plus claire à la plus foncée, de la plus petite valeur à la plus grande', () => {
    expect([2, 3, 4, 5, 6].map((valeur) => niveauTeinte(valeur, 2, 6))).toEqual([0, 1, 2, 3, 4])
  })

  it('donne la teinte du milieu à des valeurs égales, la plus claire à zéro', () => {
    expect(niveauTeinte(3, 3, 3)).toBe(2)
    expect(niveauTeinte(0, 0, 0)).toBe(0)
  })
})

describe('CarteFij', () => {
  it('est une liste des 8 départements, lisible sans la carte', () => {
    render(<CarteFij carte={carte} />)
    const region = screen.getByRole('region', { name: 'FIJ en Île-de-France' })
    const departements = within(region).getAllByRole('listitem')
    expect(departements).toHaveLength(8)
    expect(departements[0]).toHaveTextContent('Paris (75) : 4 FIJ')
    expect(within(region).getByText('29 FIJ')).toBeInTheDocument()
  })

  it('place chaque carré comme sur la carte et le fonce selon son nombre de FIJ', () => {
    render(<CarteFij carte={carte} />)
    const carre = (nom: string) => screen.getByText(nom).closest('li')
    expect(carre("Val-d'Oise (95) : 2 FIJ")).toHaveClass('col-start-3', 'row-start-1', 'bg-fij-1')
    expect(carre('Seine-Saint-Denis (93) : 6 FIJ')).toHaveClass(
      'col-start-4',
      'row-start-2',
      'bg-fij-5',
      'text-papier',
    )
    expect(carre('Essonne (91) : 3 FIJ')).toHaveClass('col-start-2', 'row-start-3', 'text-encre')
  })

  it("annonce la carte tant que FIJ n'a rien saisi", () => {
    render(<CarteFij carte={null} />)
    expect(
      screen.getByText("La carte s'affichera quand FIJ aura saisi ses chiffres."),
    ).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})
