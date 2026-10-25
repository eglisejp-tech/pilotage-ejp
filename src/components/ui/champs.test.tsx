import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Champ } from '@/components/ui/Champ'
import { ListeDeroulante } from '@/components/ui/ListeDeroulante'
import { ZoneDeTexte } from '@/components/ui/ZoneDeTexte'

describe('Champ, ZoneDeTexte et ListeDeroulante (proposition 13)', () => {
  it('le champ : 52 px, bordure encre, texte de 16 px au moins (text-texte)', () => {
    render(<Champ aria-label="Titre" />)
    const champ = screen.getByRole('textbox', { name: 'Titre' })
    expect(champ).toHaveClass('h-13', 'border-encre', 'bg-papier', 'text-texte', 'font-normal')
    expect(champ).not.toHaveClass('text-[15px]')
  })

  it('la zone de texte suit le même modèle, sa hauteur suit ses lignes', () => {
    render(<ZoneDeTexte aria-label="Précision" rows={3} />)
    const zone = screen.getByRole('textbox', { name: 'Précision' })
    expect(zone).toHaveClass('h-auto', 'border-encre', 'text-texte')
    expect(zone).not.toHaveClass('h-13')
  })

  it('la liste : un vrai select nommé, sans dessin du système, avec la flèche dessinée', async () => {
    const choix = vi.fn()
    render(
      <label>
        Action
        <ListeDeroulante taille="filtre" onChange={(e) => choix(e.target.value)} className="w-full">
          <option value="">Toutes les actions</option>
          <option value="saisie">Saisie</option>
        </ListeDeroulante>
      </label>,
    )
    const liste = screen.getByRole('combobox', { name: 'Action' })
    expect(liste).toHaveClass('appearance-none', 'h-cible', 'text-texte', 'pr-10')
    expect(liste.parentElement).toHaveClass('relative', 'w-full')
    expect(liste.parentElement?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    await userEvent.selectOptions(liste, 'saisie')
    expect(choix).toHaveBeenCalledWith('saisie')
  })
})
